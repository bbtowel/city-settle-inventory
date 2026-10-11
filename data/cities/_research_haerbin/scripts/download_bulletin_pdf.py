"""Re-download the Harbin 2024 bulletin PDF in BINARY mode."""
import urllib.request, ssl

url = 'https://www.harbin.gov.cn/haerbin/c104569/202506/1063449/files/2024%E5%B9%B4%E5%93%88%E5%B0%94%E6%BB%A8%E5%B8%82%E5%9B%BD%E6%B0%91%E7%BB%8F%E6%B5%8E%E5%92%8C%E7%A4%BE%E4%BC%9A%E5%8F%91%E5%B1%95%E7%BB%9F%E8%AE%A1%E5%85%AC%E6%8A%A5.pdf'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0'})
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
r = urllib.request.urlopen(req, timeout=30, context=ctx)
data = r.read()
print('downloaded bytes:', len(data))
with open('/tmp/hrb2024_bulletin.pdf', 'wb') as f:
    f.write(data)
print('header:', data[:20])
print('tail:', data[-20:])