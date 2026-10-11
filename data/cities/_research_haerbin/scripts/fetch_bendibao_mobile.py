"""so.com link redirects expired/400. Instead fetch bendibao article via its search: heb.bendibao.com uses /live/<id>. Try known bendibao page pattern via so.com data-url we already have: http://heb.bendibao.com/live/201493/41351.shtm — it was JS-rendered (len 124). Bendibao mobile version m.heb.bendibao.com might be static."""
import sys, re
sys.path.insert(0, '/tmp')
from hrb_fetch import fetch, strip_html

for u in ['http://m.heb.bendibao.com/live/201493/41351.shtm',
          'http://heb.bendibao.com/live/201493/41351.shtm?m=1']:
    s, ct, body = fetch(u, timeout=15)
    text = strip_html(body) if s == 200 else ''
    print(f'{u} -> ({s}) len={len(text)}')
    if s == 200 and len(text) > 500:
        with open('/tmp/hrb_bd_full.txt', 'w') as f:
            f.write(text)
        for kw in ['158', '产假', '第四十六条']:
            mm = re.search(re.escape(kw) + r'[^。]{0,150}', text)
            if mm:
                print(f'  [{kw}]', mm.group(0)[:230].replace('\n', ' '))