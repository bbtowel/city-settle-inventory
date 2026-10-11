"""Extract full text from the clean Harbin 2024 bulletin PDF."""
import pdfplumber

PDF = '/tmp/hrb2024_bulletin.pdf'
with pdfplumber.open(PDF) as pdf:
    print(f'pages: {len(pdf.pages)}')
    out = []
    for i, page in enumerate(pdf.pages):
        t = page.extract_text() or ''
        out.append(f'--- page {i+1} ---\n{t}')
    full = '\n'.join(out)

with open('/tmp/hrb_bulletin_full.txt', 'w') as f:
    f.write(full)
print('total chars:', len(full))
print(full[:1200])