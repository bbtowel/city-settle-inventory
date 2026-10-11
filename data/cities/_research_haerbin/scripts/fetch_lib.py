#!/usr/bin/env python3
"""Harbin research fetcher."""
import urllib.request, urllib.error, gzip, re, sys, time, json
from html import unescape

UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    })
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        data = r.read()
        if r.headers.get('Content-Encoding') == 'gzip':
            data = gzip.decompress(data)
        ct = r.headers.get('Content-Type','')
        enc = r.headers.get('charset') or 'utf-8'
        try:
            return r.status, ct, data.decode(enc, errors='replace')
        except LookupError:
            return r.status, ct, data.decode('utf-8', errors='replace')
    except urllib.error.HTTPError as e:
        return e.code, '', ''
    except Exception as e:
        return 0, '', str(e)

def extract_links(html, base=''):
    """Extract (text, href) pairs from html."""
    out = []
    for m in re.finditer(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.S):
        href = m.group(1)
        text = re.sub(r'<[^>]+>', '', m.group(2))
        text = re.sub(r'\s+', ' ', text).strip()
        text = unescape(text)
        if not text:
            continue
        if href.startswith('http'):
            url = href
        elif href.startswith('/'):
            url = base + href
        else:
            url = base + '/' + href
        out.append((text, url))
    return out

def strip_html(html):
    """Remove scripts/styles and tags, return plain text."""
    html = re.sub(r'<script\b.*?</script>', '', html, flags=re.S|re.I)
    html = re.sub(r'<style\b.*?</style>', '', html, flags=re.S|re.I)
    text = re.sub(r'<[^>]+>', ' ', html)
    text = unescape(text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

if __name__ == '__main__':
    # Print help or test
    if len(sys.argv) > 1:
        url = sys.argv[1]
        s, ct, body = fetch(url)
        print(f'status={s} ct={ct} len={len(body)}')
        if s == 200:
            text = strip_html(body)
            print(text[:3000])
    else:
        # Demo
        s, ct, body = fetch('https://www.harbin.gov.cn/')
        print('home status:', s, 'len:', len(body))
        links = extract_links(body, base='https://www.harbin.gov.cn')
        print('total links:', len(links))