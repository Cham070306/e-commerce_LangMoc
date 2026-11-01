"""Offline normalization/QA of saved public product pages; no network requests."""
import csv,json,re,hashlib
from pathlib import Path
from bs4 import BeautifulSoup
OUT=Path('data/catalog')
def txt(el):return el.get_text(' ',strip=True) if el else ''
def price(v):
 if not v:return None
 s=re.sub(r'[^0-9.,]','',str(v));s=re.sub(r'[.,]00$','',s);s=re.sub(r'\D','',s)
 return int(s) if s and int(s)>0 else None
rows=[];reports=[]
for key in ['suyenlam','tiemgomviet','maries','craftlink','minhphong','balothocam']:
 path=OUT/(key+'.json')
 if not path.exists():continue
 doc=json.loads(path.read_text());reports.append(doc['report'])
 for r in doc['data']:
  raw=OUT/'raw/products'/(key+'-'+hashlib.sha256(r['source_url'].encode()).hexdigest()[:12]+'.html')
  s=BeautifulSoup(raw.read_text(),'html.parser')
  # Scope visible prices to the main product, excluding recommendations/footer.
  scope=s.select_one('.summary.entry-summary, .product-info.summary, .details-pro, .details-product .details-pro, .product-info-main, .product-detail-main, .product-shop, .block-product-info')
  if scope:
   block=scope.select_one('.price.product-page-price, p.price, .price-box, .product-price, .pro-price, .price-box')
   if block:
    ins=block.select_one('ins .amount, ins, .special-price .price, .pro-price, .product-price')
    old=block.select_one('del .amount, del, .old-price .price, .compare-price, .pro-price-del')
    amounts=block.select('.woocommerce-Price-amount')
    if ins:current=price(txt(ins))
    elif amounts:current=price(txt(amounts[0]))
    else:current=price(txt(block))
    if 'liên hệ' in txt(block).lower():current=None
    r['source_price_text']=txt(block)
    r['current_price_vnd']=current
    r['price_vnd']=price(txt(old)) if old else current
    r['sale_price_vnd']=current if old and current and r['price_vnd'] and current<r['price_vnd'] else None
    if len(amounts)>1 and not old and not ins:
     r['price_range_vnd']={'min':min(x for x in [price(txt(a)) for a in amounts] if x),'max':max(x for x in [price(txt(a)) for a in amounts] if x)}
   elif key=='minhphong':
    block=s.select_one('.price-box');v=price(txt(block));r.update(current_price_vnd=v,price_vnd=v,sale_price_vnd=None,source_price_text=txt(block))
  if key=='minhphong':
   block=s.select_one('.details-pro .price-box') or s.select_one('.price-box');v=price(txt(block));r.update(current_price_vnd=v,price_vnd=v,sale_price_vnd=None,source_price_text=txt(block))
  r['source_display_name']={'suyenlam':'Gốm sứ Yên Lam','tiemgomviet':'Tiệm Gốm Việt','maries':'Maries','craftlink':'Craft Link','minhphong':'Khăn Minh Phong','balothocam':'Balo Thổ Cẩm'}[key]
  r['currency']='VND' if r['current_price_vnd'] is not None else None
  # Keep visual descriptions as image URLs if the source has no prose.
  description=s.select_one('#tab-description, #block-tab-infor, .product_getcontent, .product-description, #product_tabs_description .std')
  r['description_image_urls']=[]
  if description:
   for im in description.select('img[src]'):
    if im['src'].startswith('http') and im['src'] not in r['description_image_urls']:r['description_image_urls'].append(im['src'])
  r['review_flags']=[x for x in r['review_flags'] if x!='price_not_published_or_not_extracted']
  if r['current_price_vnd'] is None:r['review_flags'].append('price_not_published_or_not_extracted')
  if not r['description']:r['review_flags'].append('no_text_description')
  if r.get('price_range_vnd'):r['review_flags'].append('variant_price_range')
  if r['current_price_vnd'] and r['current_price_vnd']>100000000:r['review_flags'].append('verify_high_price')
  if r['current_price_vnd'] and r['current_price_vnd']<1000:r['review_flags'].append('verify_low_price')
  r['review_flags']=sorted(set(r['review_flags']))
  rows.append(r)
 doc['data']=[r for r in rows if r['source_name']==key];path.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+'\n')
rows.sort(key=lambda r:(r['source_name'],r['name']))
assert len({r['id'] for r in rows})==len(rows),'duplicate source URL'
assert all(r['name'] and r['source_url'].startswith('https://') for r in rows)
assert all(r['current_price_vnd'] is None or isinstance(r['current_price_vnd'],int) and r['current_price_vnd']>0 for r in rows)
result={'data':rows,'meta':{'page':1,'limit':len(rows),'total':len(rows)},'sources':reports}
(OUT/'products.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
fields=['id','name','category','sku','price_vnd','sale_price_vnd','current_price_vnd','currency','source_price_text','description','source_name','source_url','collected_at','image_url','attributes','review_flags']
with (OUT/'products.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for r in rows:
  d={k:r.get(k) for k in fields};d['image_url']=r['images'][0]['url'] if r['images'] else '';d['attributes']=json.dumps(r['attributes'],ensure_ascii=False);d['review_flags']='; '.join(r['review_flags']);w.writerow(d)
qa={'total':len(rows),'with_price':sum(r['current_price_vnd'] is not None for r in rows),'with_images':sum(bool(r['images']) for r in rows),'with_description':sum(bool(r['description']) for r in rows),'sources':{x['source']:x['saved_products'] for x in reports},'checks':['unique_source_ids','nonempty_names','positive_integer_or_null_prices'],'flag_counts':{flag:sum(flag in r['review_flags'] for r in rows) for flag in sorted({f for r in rows for f in r['review_flags']})}}
(OUT/'quality-report.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n');print(json.dumps(qa,ensure_ascii=False,indent=2))
