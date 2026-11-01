"""Recover product pages that use h2 rather than h1 from the existing HTML cache."""
import json,hashlib,uuid
from datetime import datetime,timezone
from pathlib import Path
from bs4 import BeautifulSoup
p=Path('data/catalog/tiemgomviet.json')
if not p.exists():raise SystemExit('Wait for crawl to finish')
d=json.loads(p.read_text());recovered=[];remaining=[]
for e in d['report']['errors']:
 if e['stage']!='product' or 'missing product title' not in e['error']:remaining.append(e);continue
 u=e['url'];raw=Path('data/catalog/raw/products')/('tiemgomviet-'+hashlib.sha256(u.encode()).hexdigest()[:12]+'.html');s=BeautifulSoup(raw.read_text(),'html.parser');h=s.select_one('h2.product-name')
 if not h:remaining.append(e);continue
 name=h.get_text(' ',strip=True);images=[]
 for im in s.select('.product-view img, .product-img-box img, .woocommerce-product-gallery img'):
  v=im.get('data-zoom-image') or im.get('data-large_image') or im.get('src')
  if v and v.startswith('http') and v not in images:images.append(v)
 if not images:
  og=s.select_one('meta[property="og:image"]')
  if og:images=[og.get('content')]
 desc=s.select_one('#tab-description, .std')
 r={'id':str(uuid.uuid5(uuid.NAMESPACE_URL,u)),'slug':u.rstrip('/').split('/')[-1],'name':name,'category':'Gốm sứ','category_id':str(uuid.uuid5(uuid.NAMESPACE_URL,'langmoc/category/Gốm sứ')),'sku':None,'price_vnd':None,'sale_price_vnd':None,'current_price_vnd':None,'currency':None,'description':desc.get_text(' ',strip=True) if desc else '', 'attributes':{},'images':[{'url':v,'alt':name,'sort_order':i} for i,v in enumerate(images)],'source_name':'tiemgomviet','source_url':u,'collected_at':datetime.fromtimestamp(raw.stat().st_mtime,timezone.utc).isoformat(),'source_availability':None,'review_flags':['origin_not_verified'],'image_rights':'not_verified','is_demo':True}
 recovered.append(r)
d['data']+=recovered;d['report']['saved_products']=len(d['data']);d['report']['errors']=remaining;d['report']['recovered_h2_titles']=len(recovered);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('Recovered',len(recovered))
