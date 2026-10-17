import urllib.request, concurrent.futures, json
from pathlib import Path
from bs4 import BeautifulSoup
urls=['https://www.gomsuyenlam.vn/','https://tiemgomviet.com/product-category/cua-hang/','https://madebymaries.com/product-tag/non-la/','https://craftlink.com.vn/vi/danh-muc-san-pham/phu-kien-thoi-trang/tui-tho-cam/','https://khanminhphong.com/vai-tho-cam-dan-toc-1','https://balothocam.com/']
def f(u):
 try:
  r=urllib.request.urlopen(u,timeout=30);html=r.read().decode(errors='replace');s=BeautifulSoup(html,'html.parser');host=r.url.split('/')[2];Path('data/catalog/raw/'+host+'.html').write_text(html)
  links=[{'text':a.get_text(' ',strip=True)[:80],'href':a.get('href')} for a in s.select('a[href]')]
  print(json.dumps({'url':u,'status':r.status,'title':s.title.get_text() if s.title else '', 'links':links[:180],'schemas':[x.get_text()[:1000] for x in s.select('script[type="application/ld+json"]')]},ensure_ascii=False))
 except Exception as e:print(json.dumps({'url':u,'error':str(e)}))
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:list(ex.map(f,urls))
