"""Cache verified public product images locally; retain original bytes and source mapping."""
import concurrent.futures,hashlib,json,threading,time,urllib.request,urllib.parse
from pathlib import Path
from io import BytesIO
from PIL import Image
source=json.loads(Path('frontend/mock/catalog.json').read_text());out=Path('frontend/public/images/products');out.mkdir(parents=True,exist_ok=True)
locks={};guard=threading.Lock()
def cache(p):
 errors=[]
 for img in p['images'][:4]:
  url=img['url'];host=urllib.request.urlparse(url).netloc if hasattr(urllib.request,'urlparse') else url.split('/')[2]
  with guard:lock=locks.setdefault(host,threading.Semaphore(2))
  try:
   with lock:
    req=urllib.request.Request(urllib.parse.quote(url,safe=':/?&=%'),headers={'User-Agent':'LangMocAcademicCatalog/1.0','Accept':'image/*'})
    with urllib.request.urlopen(req,timeout=18) as r:
     blob=r.read(20*1024*1024+1)
    time.sleep(.12)
   if len(blob)>20*1024*1024:raise ValueError('Image exceeds 20MB')
   im=Image.open(BytesIO(blob));width,height=im.size;fmt=im.format;im.verify()
   if width<100 or height<100:raise ValueError('Image too small')
   ext={'JPEG':'.jpg','PNG':'.png','WEBP':'.webp','GIF':'.gif'}.get(fmt)
   if not ext:raise ValueError('Unsupported format '+str(fmt))
   name=hashlib.sha256(url.encode()).hexdigest()[:20]+ext;(out/name).write_bytes(blob)
   return {'product_id':p['id'],'source_url':url,'local_url':'/images/products/'+name,'width':width,'height':height,'bytes':len(blob),'errors':errors}
  except Exception as e:errors.append({'url':url,'error':str(e)})
 return {'product_id':p['id'],'local_url':None,'errors':errors}
if __name__=='__main__':
 rows=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
  for r in pool.map(cache,source['products']):
   rows.append(r)
   if len(rows)%25==0:print('Checked',len(rows),'cached',sum(bool(x['local_url']) for x in rows),flush=True)
 Path('data/catalog/image-cache.json').write_text(json.dumps({'images':rows,'checked':len(rows),'available':sum(bool(x['local_url']) for x in rows)},ensure_ascii=False,indent=2)+'\n')
 print('DONE',len(rows),'available',sum(bool(x['local_url']) for x in rows),flush=True)
