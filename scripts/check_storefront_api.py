"""Read-only smoke test against a running Vite mock server."""
import json,sys,urllib.request,urllib.error
from pathlib import Path
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5173').rstrip('/')+'/api/v1'
def get(path):
 with urllib.request.urlopen(base+path,timeout=10) as r:return json.load(r)
assert len(get('/categories')['data'])==4
p=get('/products?limit=12');assert p['meta']['total']==449 and len(p['data'])==12
assert get('/products?q=non&category_id=e9010000-invalid')['meta']['total']==0
assert get('/products?q=non&limit=100')['meta']['total']>=7
catalog=json.loads((Path(__file__).resolve().parents[1]/'frontend/mock/catalog.json').read_text());pid=next(iter(catalog['reviews']));product=next(x for x in catalog['products'] if x['id']==pid)
assert get('/products/'+product['slug'])['data']['id']==pid
assert get('/products/'+pid+'/reviews')['summary']['review_count']==2
for path,status in [('/products/missing-slug',404),('/products?min_price=100&max_price=10',400),('/products?_demo=error',503)]:
 try:get(path);raise AssertionError(path)
 except urllib.error.HTTPError as e:assert e.code==status
print('PASS: GET categories/products/detail/reviews, pagination=12/449, search, HTTP 400/404/503')
