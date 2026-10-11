"""so.com rate-limited too. Pause then single so.com query. Also direct-fetch known law aggregators for 条例 full text."""
import sys, re, time
sys.path.insert(0, '/tmp')
from hrb_fetch import fetch, strip_html

# Direct aggregator URLs for 黑龙江省人口与计划生育条例 (2021修订)
urls = [
    ('华律网搜索', 'https://www.66law.cn/tiaoli/'),
    ('东方法律', 'http://www.dffyw.com/fagui/'),
]
# Better: use so.com once after sleep
time.sleep(20)
url = 'https://www.so.com/s?q=' + '%E9%BB%91%E9%BE%99%E6%B1%9F%E7%9C%81%E4%BA%BA%E5%8F%A3%E4%B8%8E%E8%AE%A1%E5%88%92%E7%94%9F%E8%82%B2%E6%9D%A1%E4%BE%8B%20%E7%AC%AC%E5%9B%9B%E5%8D%81%E5%85%AD%E6%9D%A1%20%E4%BA%A7%E5%81%87'
s, ct, body = fetch(url, timeout=20)
print(f'so.com ({s}) len={len(body)}')
if s == 200:
    for m in re.finditer(r'<h3[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', body, re.S):
        u = m.group(1)
        t = re.sub(r'<[^>]+>', '', m.group(2)).strip()
        print(f'{t[:70]} -> {u[:200]}')