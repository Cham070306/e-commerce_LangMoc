"""One-shot public catalog snapshot. Python 3 + beautifulsoup4.
Sequential per host, 1s pause, robots-aware, bounded listing discovery; no login/cart/API writes.
"""
import csv,json,re,time,uuid,hashlib,concurrent.futures,urllib.request,urllib.parse,urllib.robotparser
from datetime import datetime,timezone
from pathlib import Path
from bs4 import BeautifulSoup
OUT=Path('data/catalog'); RAW=OUT/'raw/products'; RAW.mkdir(parents=True,exist_ok=True)
AGENT='LangMocAcademicCatalog/1.0'
SOURCES=[('suyenlam','https://www.gomsuyenlam.vn/','Gốm sứ'),('tiemgomviet','https://tiemgomviet.com/product-category/cua-hang/','Gốm sứ'),('maries','https://madebymaries.com/product-tag/non-la/','Nón lá'),('craftlink','https://craftlink.com.vn/vi/danh-muc-san-pham/phu-kien-thoi-trang/tui-tho-cam/','Thổ cẩm'),('minhphong','https://khanminhphong.com/vai-tho-cam-dan-toc-1','Thổ cẩm'),('balothocam','https://balothocam.com/','Thổ cẩm')]
def clean(x):return re.sub(r'\s+',' ',BeautifulSoup(str(x or ''),'html.parser').get_text(' ',strip=True)).strip()
def canon(u):
 p=urllib.parse.urlsplit(u);return urllib.parse.urlunsplit((p.scheme,p.netloc,p.path,'',''))
def money(x):
 if x is None:return None
 if isinstance(x,(int,float)):return round(x) if x>0 else None
 s=re.sub(r'[^\d.,]','',str(x))
 if not s:return None
 if re.search(r'[.,]\d{2}$',s):s=s[:-3]
 s=re.sub(r'\D','',s)
 return int(s) if s and int(s)>0 else None
def flatten(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from flatten(v)
 elif isinstance(x,list):
  for v in x:yield from flatten(v)
def scrape(src):
 key,start,category=src;host=urllib.parse.urlsplit(start).netloc;origin='https://'+host;errors=[];requests=0
 def get(u,cache=False):
  nonlocal requests
  if requests:time.sleep(1)
  requests+=1
  req=urllib.request.Request(u,headers={'User-Agent':AGENT,'Accept':'text/html,application/xhtml+xml'})
  with urllib.request.urlopen(req,timeout=30) as r:return r.read().decode('utf-8',errors='replace')
 rp=urllib.robotparser.RobotFileParser()
 try:
  robots=get(origin+'/robots.txt');rp.parse(robots.splitlines());(OUT/'raw'/f'{key}-robots.txt').write_text(robots)
 except Exception as e:
  return [],{'source':key,'error':'robots unavailable: '+str(e)}
 pending=[start];seen=set();products=[];listing_limit=30;product_limit=200
 while pending and len(seen)<listing_limit and len(products)<product_limit:
  u=pending.pop(0)
  if u in seen or not rp.can_fetch(AGENT,u):continue
  seen.add(u)
  try:
   cache=OUT/'raw'/f'{host}.html'
   html=cache.read_text() if u==start and cache.exists() else get(u)
   s=BeautifulSoup(html,'html.parser')
   for a in s.select('a[href]'):
    link=urllib.parse.urljoin(u,a['href']);parts=urllib.parse.urlsplit(link)
    if parts.netloc!=host or parts.query and not re.fullmatch(r'page=\d+',parts.query):continue
    path=parts.path
    isproduct=bool(re.search(r'/(?:product|products)/[^/]+/?$',path)) or key=='maries' and bool(re.search(r'/san-pham/[^/]+/?$',path))
    if key=='minhphong':isproduct=bool(a.find_parent(class_=re.compile('product-box|product-name')))
    if isproduct:
     link=canon(link)
     if link not in products:products.append(link)
    ispage='/page/' in path or bool(re.fullmatch(r'page=\d+',parts.query))
    iscat=(key in ['suyenlam','balothocam'] and ('/product-category/' in path or '/collections/' in path) and not re.search(r'/en/|/blogs/',path))
    if (ispage or iscat) and link not in seen and link not in pending:pending.append(link)
  except Exception as e:errors.append({'url':u,'stage':'listing','error':str(e)})
 rows=[]
 for i,u in enumerate(products[:product_limit]):
  if not rp.can_fetch(AGENT,u):continue
  try:
   html=get(u);s=BeautifulSoup(html,'html.parser');(RAW/(key+'-'+hashlib.sha256(u.encode()).hexdigest()[:12]+'.html')).write_text(html)
   nodes=[]
   for el in s.select('script[type="application/ld+json"]'):
    try:nodes+=list(flatten(json.loads(el.string or el.get_text())))
    except (ValueError,TypeError):pass
   schema=next((n for n in nodes if 'Product' in ([n.get('@type')] if isinstance(n.get('@type'),str) else n.get('@type',[]))),{})
   def textsel(*sels):
    for sel in sels:
     el=s.select_one(sel)
     if el and clean(el):return clean(el)
    return ''
   title=clean(schema.get('name')) or textsel('h1.product_title','h1.title-product','h1.title','h2.product-name','h1')
   if not title:raise ValueError('missing product title')
   summary=s.select_one('.summary') or s.select_one('.details-product') or s.select_one('.product-detail-main') or s
   offer=schema.get('offers',{});offer=offer[0] if isinstance(offer,list) and offer else offer
   if not isinstance(offer,dict):offer={}
   prices=summary.select('.price .woocommerce-Price-amount, .product-price, .pro-price, .special-price .price')
   current=money(offer.get('price') or offer.get('lowPrice'));currency=offer.get('priceCurrency')
   if current is None and prices:current=money(prices[-1].get_text())
   old=summary.select_one('del .amount, .old-price .price, .compare-price, .pro-price-del')
   regular=money(old.get_text()) if old else current
   if regular is not None and current is not None and regular<current:regular=current
   sale=current if current is not None and regular is not None and current<regular else None
   # Product-specific prose only, not page footer, related products or user reviews.
   desc=textsel('.woocommerce-product-details__short-description','.product-summary','.product-description .description-content','.product-description','#tab-description','.rte.product_getcontent','.product_getcontent') or clean(schema.get('description'))
   detail=s.select_one('#tab-description, .product-description, .product_getcontent, .product-detail-description')
   attributes={}
   for tr in s.select('.woocommerce-product-attributes tr, .shop_attributes tr, .product-attributes tr'):
    cells=tr.select('th,td')
    if len(cells)>=2:attributes[clean(cells[0])]=clean(cells[1])
   for label,pattern in [('material',r'(?:Chất liệu|Nguyên liệu|Material)\s*[:：]\s*([^\n]{3,160})'),('dimensions',r'(?:Kích thước|Kích cỡ|Dimensions|Size)\s*[:：]\s*([^\n]{3,160})'),('origin',r'(?:Xuất xứ|Nguồn gốc|Origin)\s*[:：]\s*([^\n]{3,160})')]:
    txt=(detail or summary).get_text('\n',strip=True);m=re.search(pattern,txt,re.I)
    if m:attributes[label]=m.group(1).strip()
   images=[]
   def addimg(v):
    if isinstance(v,dict):v=v.get('url') or v.get('contentUrl')
    if isinstance(v,str):
     v=urllib.parse.urljoin(u,v)
     if v.startswith('http') and v not in images:images.append(v)
   si=schema.get('image',[])
   for v in si if isinstance(si,list) else [si]:addimg(v)
   for im in s.select('.woocommerce-product-gallery img, .product-gallery img, .product-image-detail img, #sliderproduct img, .product-image-block img, .product-detail img'):
    addimg(im.get('data-large_image') or im.get('data-zoom-image') or im.get('data-src') or im.get('src'))
   if not images:
    og=s.select_one('meta[property="og:image"]')
    if og:addimg(og.get('content'))
   sku=clean(schema.get('sku')) or textsel('.sku','.product-sku') or None
   flags=[]
   if current is None:flags.append('price_not_published_or_not_extracted')
   if not images:flags.append('missing_image')
   if not attributes.get('origin'):flags.append('origin_not_verified')
   rows.append({'id':str(uuid.uuid5(uuid.NAMESPACE_URL,u)),'slug':urllib.parse.unquote(urllib.parse.urlsplit(u).path.strip('/').split('/')[-1]),'name':title,'category':category,'category_id':str(uuid.uuid5(uuid.NAMESPACE_URL,'langmoc/category/'+category)),'sku':sku,'price_vnd':regular,'sale_price_vnd':sale,'current_price_vnd':current,'currency':currency or ('VND' if current else None),'description':desc,'attributes':attributes,'images':[{'url':v,'alt':title,'sort_order':j} for j,v in enumerate(images)],'source_name':key,'source_url':u,'collected_at':datetime.now(timezone.utc).isoformat(),'source_availability':offer.get('availability'),'review_flags':flags,'image_rights':'not_verified','is_demo':True})
   if (i+1)%10==0:print(key,'products',i+1,flush=True)
  except Exception as e:errors.append({'url':u,'stage':'product','error':str(e)})
 report={'source':key,'start_url':start,'listing_pages':len(seen),'discovered_products':len(products),'saved_products':len(rows),'remaining_listing_pages':len(pending),'limits':{'listing_pages':listing_limit,'products':product_limit},'errors':errors}
 (OUT/(key+'.json')).write_text(json.dumps({'data':rows,'report':report},ensure_ascii=False,indent=2))
 print(key,'DONE',len(rows),'errors',len(errors),flush=True)
 return rows,report
if __name__=='__main__':
 rows=[];reports=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
  for data,report in ex.map(scrape,SOURCES):rows+=data;reports.append(report)
 rows.sort(key=lambda r:(r['source_name'],r['name']))
 (OUT/'products.json').write_text(json.dumps({'data':rows,'meta':{'page':1,'limit':len(rows),'total':len(rows)},'sources':reports},ensure_ascii=False,indent=2))
 with (OUT/'products.csv').open('w',encoding='utf-8-sig',newline='') as f:
  fields=['id','name','category','sku','price_vnd','sale_price_vnd','current_price_vnd','currency','description','source_name','source_url','collected_at','image_url','attributes','review_flags']
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
  for r in rows:
   d={k:r.get(k) for k in fields};d['image_url']=r['images'][0]['url'] if r['images'] else '';d['attributes']=json.dumps(r['attributes'],ensure_ascii=False);d['review_flags']='; '.join(r['review_flags']);w.writerow(d)
 print('TOTAL',len(rows),flush=True)
