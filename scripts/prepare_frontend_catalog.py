import json,uuid,re
from pathlib import Path
src=json.loads(Path('data/catalog/products.json').read_text())['data'];products=[];categories=[]
for name in ['Gốm sứ','Mây tre đan','Thổ cẩm','Nón lá']:
 cid=str(uuid.uuid5(uuid.NAMESPACE_URL,'langmoc/category/'+name));slugs={'Gốm sứ':'gom-su','Mây tre đan':'may-tre-dan','Thổ cẩm':'tho-cam','Nón lá':'non-la'}
 categories.append({'id':cid,'name':name,'slug':slugs[name],'product_count':sum(r['category_id']==cid for r in src)})
for r in src:
 products.append({k:r.get(k) for k in ['id','sku','price_vnd','sale_price_vnd','current_price_vnd','description','attributes','images','source_url','collected_at','is_demo','price_range_vnd','description_image_urls']}|{'name':r['name'],'slug':r['slug']+'-'+r['id'][:8],'category_id':r['category_id'],'category_name':r['category'],'source_name':r.get('source_display_name',r['source_name']),'origin':r['attributes'].get('origin')})
# Prefer original/full images already present in the harvested gallery; avoid thumbnail duplicates.
for product in products:
 groups={}
 for im in product['images']:
  url=im['url'];key=re.sub(r'_(?:compact|small|medium|large|master|\d+x\d+)\.', '.', url)
  key=re.sub(r'-\d+x\d+(?=\.[a-zA-Z]+(?:\?|$))','',key)
  score=3 if '_master.' in url else 0 if re.search(r'_(compact|small|medium)\.|-\d+x\d+\.',url) else 2
  if key not in groups or score>groups[key][0]:groups[key]=(score,im)
 product['images']=[dict(im,sort_order=i) for i,(_,im) in enumerate(groups.values())]
# Repair decoration-image selections without changing archived crawl records.
repair_path=Path('data/catalog/image-source-repairs.json')
if repair_path.exists():
 repairs=json.loads(repair_path.read_text())
 for product in products:
  product['images']=[im for im in product['images'] if '/wp-content/themes/' not in im['url'] and '/wp-content/plugins/' not in im['url']]
  if product['id'] in repairs:product['images']=repairs[product['id']]+product['images']
# Use validated local primary images. Keep the original crawl untouched.
cache_path=Path('data/catalog/image-cache.json')
if cache_path.exists():
 cache={r['product_id']:r for r in json.loads(cache_path.read_text())['images']}
 kept=[]
 for product in products:
  entry=cache.get(product['id'])
  if not entry or not entry.get('local_url'):continue
  if not Path('frontend/public'+entry['local_url']).exists():continue
  primary={'url':entry['local_url'],'source_url':entry['source_url'],'alt':product['name'],'sort_order':0}
  product['images']=[primary]+[dict(im,sort_order=i+1) for i,im in enumerate(product['images']) if im['url']!=entry['source_url']]
  kept.append(product)
 products=kept
 for cat in categories:cat['product_count']=sum(p['category_id']==cat['id'] for p in products)
# User-approved illustrative prices for records with no source price.
# These are design fixtures, not verified market valuations; archived source stays intact.
for product in products:
 if product['current_price_vnd'] is not None:continue
 name=product['name'].casefold()
 rules=[('balo',350000),('túi',220000),('ví',120000),('khăn',180000),('vải',150000),('bộ',450000),('bình',280000),('lọ',240000),('đĩa',120000),('chén',65000),('bát',85000),('ly',95000),('cốc',95000),('nón',180000)]
 price=next((value for word,value in rules if word in name),150000 if product['category_name']=='Gốm sứ' else 220000)
 product.update(price_vnd=price,current_price_vnd=price,sale_price_vnd=None,price_range_vnd=None,price_is_demo=True)
# Synthetic fixtures are separate and explicitly marked, never scraped customer reviews.
review_product=next(p for p in products if p['sale_price_vnd'] is not None)
reviews={review_product['id']:[{'id':str(uuid.uuid5(uuid.NAMESPACE_URL,'langmoc/review/demo/'+str(i))),'rating':v,'author_name':'Khách demo '+str(i+1),'body':t,'created_at':'2026-10-14T10:00:00Z','status':'visible','is_demo':True} for i,(v,t) in enumerate([(5,'Dữ liệu đánh giá minh họa để kiểm tra bố cục nội dung dài và số sao. Không phải nhận xét từ khách mua thật.'),(4,'Mẫu đánh giá dùng trong bài học phần; giúp kiểm tra cách hiển thị phản hồi trên điện thoại.')])]}
Path('frontend/mock/catalog.json').write_text(json.dumps({'categories':categories,'products':products,'reviews':reviews},ensure_ascii=False)+'\n')
print('Prepared',len(products),'products; demo review product:',review_product['slug'])
