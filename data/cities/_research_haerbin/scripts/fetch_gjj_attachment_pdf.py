"""Download 2275 attachment PDF (binary!) and extract text."""
import urllib.request, ssl, io

url = 'https://bh.hrbgjj.org.cn/u/cms/www/202411/2110054161fh.pdf'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 Chrome/125.0.0.0'})
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
data = urllib.request.urlopen(req, timeout=30, context=ctx).read()
print('bytes:', len(data), 'header:', data[:8])
with open('/tmp/hrb_2275.pdf', 'wb') as f:
    f.write(data)

import pdfplumber
with pdfplumber.open(io.BytesIO(data)) as pdf:
    full = '\n'.join((p.extract_text() or '') for p in pdf.pages)
print('chars:', len(full))
print(full[:2500])