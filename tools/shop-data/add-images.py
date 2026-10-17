#!/usr/bin/env python3
"""Add real product photos to data/shop/<chain>.json (Oct 18, 2026).

E-man in Lidl Flensburg: "a little window next to best. Just like Amazon, so we can actually see ... an image of the product.
So when we're grocery shopping, we know exactly what to go for."

For every product barcode already in a range file this asks Open Food Facts (the source of the German lists, ODbL) for the
front photo that shoppers uploaded, 100 barcodes per request, and stores it in a new column `im`. Nothing is guessed:
products without an uploaded front photo get null and the app says "No photo yet".

`im` is compact: the image URL OFF returned, minus https://images.openfoodfacts.org/images/products/ and minus
".200.jpg". When the folder is the usual barcode split (405/648/937/0888) only the file part is kept ("front_de.3").
The app turns it back into the exact URL OFF returned (.200.jpg small, .400.jpg large; both come from the same API answer,
image_front_small_url and image_front_url, and the script checks they share that base).

Usage: python3 tools/shop-data/add-images.py [chain ...]   (default: every range file)
"""
import json, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from build import req, OUT  # noqa: E402

PREFIX = 'https://images.openfoodfacts.org/images/products/'
CHAINS = ['lidl', 'aldi', 'edeka', 'rewe', 'kaufland', 'netto', 'penny', 'famila', 'salling']


def folder(code):
    c = str(code)
    if len(c) > 8 and c.isdigit():
        return '%s/%s/%s/%s' % (c[0:3], c[3:6], c[6:9], c[9:])
    return c


def compact(code, small, large):
    """OFF urls -> im, or None when they do not follow the shared .200/.400 pattern (then no photo is shown)."""
    if not small or not small.startswith(PREFIX) or not small.endswith('.200.jpg'):
        return None
    base = small[len(PREFIX):-len('.200.jpg')]
    if large and large != PREFIX + base + '.400.jpg':
        return None
    f = folder(code) + '/'
    if base.startswith(f) and '/' not in base[len(f):]:
        return base[len(f):]
    return base


def expand(code, im, size=200):
    if not im:
        return None
    base = im if '/' in im else folder(code) + '/' + im
    return PREFIX + base + '.%d.jpg' % size


def lookup(codes):
    out = {}
    for i in range(0, len(codes), 100):
        chunk = codes[i:i + 100]
        q = 'code:(' + ' OR '.join(chunk) + ')'
        url = 'https://search.openfoodfacts.org/search?' + urllib.parse.urlencode(
            {'q': q, 'page_size': 100, 'fields': 'code,image_front_small_url,image_front_url'})
        d = req(url)
        for h in d.get('hits') or []:
            c = h.get('code')
            if c in chunk:
                out[c] = compact(c, h.get('image_front_small_url'), h.get('image_front_url'))
        time.sleep(0.25)
    return out


def run(chain):
    path = os.path.join(OUT, chain + '.json')
    with open(path) as f:
        d = json.load(f)
    cols = d['cols']
    gi = cols.index('g')
    if 'im' not in cols:
        cols.append('im')
        for r in d['rows']:
            r.append(None)
    ii = cols.index('im')
    codes = sorted({str(r[gi]) for r in d['rows'] if r[gi] and str(r[gi]).isdigit()})
    found = lookup(codes)
    n = 0
    for r in d['rows']:
        im = found.get(str(r[gi]))
        r[ii] = im
        n += 1 if im else 0
    d['images'] = {
        'source': 'Open Food Facts front photos uploaded by shoppers (ODbL / CC BY-SA), matched by barcode',
        'base': PREFIX, 'withPhoto': n, 'built': time.strftime('%Y-%m-%d'),
    }
    if chain == 'salling':
        d['images']['note'] = 'Photos are from Open Food Facts for the same barcode, not from Salling Group.'
    with open(path, 'w') as f:
        json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
    print(chain, '%d of %d products have a photo' % (n, len(d['rows'])), file=sys.stderr)


if __name__ == '__main__':
    for c in (sys.argv[1:] or CHAINS):
        run(c)
