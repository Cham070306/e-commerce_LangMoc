"""Repair source theme-decoration images using the saved product HTML; preserve crawl snapshot."""
import concurrent.futures,hashlib,json
from pathlib import Path
from html.parser import HTMLParser
class ProductImageParser(HTMLParser):
 def __init__(self):super().__init__();self.url=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=="img" and "wp-post-image" in a.get("class",""):self.url=a.get("data-large_image") or a.get("src")
from cache_product_images import cache
fixture_path=Path('frontend/mock/catalog.json');fixture=json.loads(fixture_path.read_text());manifest_path=Path('data/catalog/image-cache.json');manifest=json.loads(manifest_path.read_text());byid={r['product_id']:r for r in manifest['images']};jobs=[];fixes={}
for p in fixture['products']:
 old=byid[p['id']]
 if '/wp-content/themes/' not in old.get('source_url',''):continue
 raw=Path('data/catalog/raw/products/suyenlam-'+hashlib.sha256(p['source_url'].encode()).hexdigest()[:12]+'.html')
 parser=ProductImageParser();parser.feed(raw.read_text());url=parser.url
 if not url:continue
 p=dict(p,images=[{'url':url,'alt':p['name'],'sort_order':0}]);jobs.append(p);fixes[p['id']]=p['images']
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
 for result in ex.map(cache,jobs):byid[result['product_id']]=result;print('Repaired',result['product_id'],bool(result['local_url']),flush=True)
manifest['images']=list(byid.values());manifest['available']=sum(bool(x['local_url']) for x in byid.values());manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');Path('data/catalog/image-source-repairs.json').write_text(json.dumps(fixes,ensure_ascii=False,indent=2)+'\n');print('DONE',len(jobs))
