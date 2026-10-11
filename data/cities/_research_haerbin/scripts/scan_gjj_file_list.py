"""Where did base 80/100 come from? Check 高层次人才 doc 2252 PDF & scan index_3/4/5 pages for older 额度 docs."""
import sys, re, time
sys.path.insert(0, '/tmp')
from hrb_fetch import fetch, strip_html

seen = set()
for page in ['index_3.jhtml', 'index_4.jhtml', 'index_5.jhtml', 'index_6.jhtml']:
    s, ct, body = fetch(f'https://www.hrbgjj.org.cn/zxwj/{page}', timeout=20)
    if s != 200:
        print(f'{page}: {s}'); continue
    for m in re.finditer(r'href="([^"]*zxwj/(\d+)\.jhtml)"[^>]*>([^<]{6,80})<', body):
        num, title = m.group(2), m.group(3).strip()
        if num in seen: continue
        seen.add(num)
        print(f'{num}: {title}')
    time.sleep(1)