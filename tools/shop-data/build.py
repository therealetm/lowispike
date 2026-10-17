#!/usr/bin/env python3
"""LOWiSPIKE store lists: builds data/shop/<chain>.json from real retailer and open data (Oct 17, 2026).

The app is a static GitHub Pages site, so no API key ever ships to the phone. This script runs on a dev machine,
fetches the product ranges, keeps only food with a nutrition label, and writes compact JSON the app loads.

Sources
  salling  Salling Group's own online range (Bilka ToGo, the same group and own brands as Foetex), read through the
           public product search the shop's website uses. Label nutrition per 100 g comes from the retailer.
           Needs SALLING_SEARCH_KEY (the public search-only key the website ships) in the environment.
  off:<x>  Open Food Facts (open database, ODbL): products shoppers tagged as sold at chain <x> in Germany.

Usage: python3 tools/shop-data/build.py salling | off edeka | off-all | stores
"""
import json, os, re, sys, time, urllib.request, urllib.parse, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'data', 'shop')
UA = 'LOWiSPIKE/1.0 (https://therealetm.github.io/lowispike/; store lists)'
os.makedirs(OUT, exist_ok=True)


def req(url, data=None, headers=None, tries=4):
    h = {'User-Agent': UA}
    h.update(headers or {})
    for i in range(tries):
        try:
            r = urllib.request.Request(url, data=data, headers=h)
            with urllib.request.urlopen(r, timeout=60) as f:
                return json.loads(f.read().decode('utf-8'))
        except Exception as e:  # noqa
            if i == tries - 1:
                raise
            time.sleep(2 + 3 * i)


def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r'(\d+(?:[.,]\d+)?)', str(v))
    return float(m.group(1).replace(',', '.')) if m else None


def r1(v):
    return None if v is None else round(v, 1)


# ---------------- Salling Group (Bilka ToGo range) ----------------
S_APP = 'F9VBJLR1BK'
S_INDEX = 'prod_BILKATOGO_PRODUCTS'
S_FOOD = ['Kolonial', 'Drikkevarer', 'Slik & snacks', 'Mejeri & køl', 'Mad fra hele verden', 'Brød & kager', 'Frost',
          'Frugt & grønt', 'Kød & fisk']
S_SKIP_L1 = ['Drikkevarer > Vin', 'Drikkevarer > Øl', 'Drikkevarer > Spiritus & likør', 'Drikkevarer > Cider & ready to drink',
             'Kolonial > Kaffe, te & kakao']
S_FIELDS = ['name', 'brand', 'gtin', 'netcontent', 'unitsOfMeasure', 'consumerFacingHierarchy', 'infos', 'price', 'images']


def s_query(key, body):
    url = 'https://%s-dsn.algolia.net/1/indexes/%s/query' % (S_APP, S_INDEX)
    return req(url, json.dumps(body).encode(), {'X-Algolia-Application-Id': S_APP, 'X-Algolia-API-Key': key,
                                                  'Content-Type': 'application/json'})


S_NUT = [('kulhydrat', 'c'), ('sukkerart', 's'), ('kostfib', 'f'), ('fibre', 'f'), ('protein', 'p'), ('mættede', None),
         ('fedt', 'fat')]


def s_nutrition(infos):
    out = {}
    for blk in infos or []:
        if blk.get('code') != 'nutritional_100':
            continue
        for it in blk.get('items') or []:
            t = (it.get('title') or '').lower()
            v = it.get('value') or ''
            if t.startswith('næringsindhold'):
                out['unit'] = 'ml' if 'ml' in v.lower() else 'g'
                continue
            if t.startswith('energi') and 'kcal' in v.lower():
                out['kcal'] = num(v)
                continue
            for kw, k in S_NUT:
                if kw in t:
                    if k and k not in out:
                        out[k] = num(v)
                    break
    return out


def s_ingredients(infos):
    for blk in infos or []:
        if blk.get('code') == 'ingredients':
            for it in blk.get('items') or []:
                return (it.get('value') or '')[:400]
    return ''


def build_salling():
    key = os.environ.get('SALLING_SEARCH_KEY')
    if not key:
        sys.exit('set SALLING_SEARCH_KEY')
    facets = s_query(key, {'query': '', 'hitsPerPage': 0, 'facets': ['consumerFacingHierarchy.lvl1', 'consumerFacingHierarchy.lvl2'],
                           'maxValuesPerFacet': 1000})['facets']
    l1 = [k for k in facets['consumerFacingHierarchy.lvl1'] if k.split(' > ')[0] in S_FOOD and k not in S_SKIP_L1]
    seen, prods, nolabel = set(), [], 0
    for cat in sorted(l1):
        n = facets['consumerFacingHierarchy.lvl1'][cat]
        groups = [('consumerFacingHierarchy.lvl1', cat)]
        if n > 950:
            groups = [('consumerFacingHierarchy.lvl2', k) for k in facets['consumerFacingHierarchy.lvl2'] if k.startswith(cat + ' > ')]
        for fac, val in groups:
            page = 0
            while True:
                d = s_query(key, {'query': '', 'hitsPerPage': 1000, 'page': page, 'facetFilters': [[fac + ':' + val]],
                                  'attributesToRetrieve': S_FIELDS, 'attributesToHighlight': []})
                for h in d.get('hits', []):
                    oid = h.get('objectID')
                    if oid in seen:
                        continue
                    seen.add(oid)
                    nu = s_nutrition(h.get('infos'))
                    if nu.get('c') is None:
                        nolabel += 1
                        nu = {}
                    path = ((h.get('consumerFacingHierarchy') or {}).get('lvl2') or [cat])[0]
                    prods.append({
                        'n': (h.get('name') or '').strip(), 'b': (h.get('brand') or '').strip(), 'k': path,
                        'c': r1(nu.get('c')), 's': r1(nu.get('s')), 'f': r1(nu.get('f')), 'p': r1(nu.get('p')),
                        'fat': r1(nu.get('fat')), 'kcal': r1(nu.get('kcal')), 'u': nu.get('unit') or ('ml' if (h.get('unitsOfMeasure') or '').lower() in ('l', 'cl', 'ml') else 'g'),
                        'q': (h.get('netcontent') or '').strip(), 'g': h.get('gtin') or '', 'pr': h.get('price') or 0,
                        'i': s_ingredients(h.get('infos'))[:160],
                    })
                page += 1
                if page >= d.get('nbPages', 0):
                    break
        print(cat, len(prods), file=sys.stderr)
    write('salling', {
        'chain': 'salling', 'name': 'Føtex · Bilka · Netto (Salling Group)', 'country': 'DK',
        'source': 'Salling Group online range (Bilka ToGo), label nutrition from the retailer',
        'sourceUrl': 'https://www.bilkatogo.dk/',
        'scope': 'chain',
        'note': 'Føtex and Bilka are both Salling Group and share most brands (Salling, Princip, Gestus, Levevis, Salling Øko). Store-by-store stock is not public, so this is the group range, not the shelf of one shop.',
        'noLabel': nolabel,
    }, prods)


# ---------------- Open Food Facts (German chains) ----------------
OFF_CHAINS = {
    'edeka': ('EDEKA', 'edeka'), 'rewe': ('REWE', 'rewe'), 'lidl': ('Lidl', 'lidl'), 'aldi': ('Aldi', 'aldi'),
    'kaufland': ('Kaufland', 'kaufland'), 'netto': ('Netto Marken-Discount', 'netto'), 'penny': ('Penny', 'penny'),
    'famila': ('famila', 'famila'),
}
OFF_FIELDS = 'code,product_name,product_name_de,product_name_en,brands,nutriments,categories_tags,quantity,stores'


def off_cat(tags):
    tags = tags or []
    # keep a few telling tags, most specific last
    keep = [t.split(':', 1)[-1] for t in tags if t.startswith('en:')]
    return '|'.join(keep[-6:])


def build_off(chain, max_pages=60):
    name, store = OFF_CHAINS[chain]
    q = 'stores:%s AND countries_tags:"en:germany"' % store
    prods, seen, page = [], set(), 1
    while page <= max_pages:
        url = 'https://search.openfoodfacts.org/search?' + urllib.parse.urlencode(
            {'q': q, 'page_size': 100, 'page': page, 'fields': OFF_FIELDS, 'sort_by': '-unique_scans_n'})
        d = req(url)
        hits = d.get('hits') or []
        for h in hits:
            code = h.get('code')
            if not code or code in seen:
                continue
            seen.add(code)
            n = h.get('nutriments') or {}
            c = n.get('carbohydrates_100g')
            nm = (h.get('product_name_de') or h.get('product_name') or h.get('product_name_en') or '').strip()
            if c is None or not nm:
                continue
            br = h.get('brands') or ''
            if isinstance(br, list):
                br = ', '.join(x.strip() for x in br)
            prods.append({
                'n': nm[:90], 'b': br.split(',')[0].strip()[:40], 'k': off_cat(h.get('categories_tags')),
                'c': r1(num(c)), 's': r1(num(n.get('sugars_100g'))), 'f': r1(num(n.get('fiber_100g'))),
                'p': r1(num(n.get('proteins_100g'))), 'fat': r1(num(n.get('fat_100g'))), 'kcal': r1(num(n.get('energy-kcal_100g'))),
                'u': 'ml' if re.search(r'\d\s*(ml|cl|l)\b', (h.get('quantity') or '').lower()) else 'g',
                'q': (h.get('quantity') or '')[:20], 'g': code,
            })
        if page >= (d.get('page_count') or 0) or not hits:
            break
        page += 1
        time.sleep(0.4)
    print(chain, len(prods), file=sys.stderr)
    write(chain, {
        'chain': chain, 'name': name, 'country': 'DE',
        'source': 'Open Food Facts: products shoppers tagged as sold at %s in Germany' % name,
        'sourceUrl': 'https://world.openfoodfacts.org/store/' + store,
        'scope': 'chain',
        'note': 'Open Food Facts is filled in by shoppers, so the list is real products with real labels, but not the full range and not one shop\'s shelf.',
    }, prods)


# ---------------- shop locations (OpenStreetMap) ----------------
# brand -> (dataset, label). Danish Netto, Føtex and Bilka are all Salling Group and share one range file.
BRANDS = [
    (('Føtex', 'Foetex', 'Fötex'), 'salling', 'Føtex'), (('Bilka',), 'salling', 'Bilka'),
    (('Netto',), 'salling', 'Netto (DK)'), (('Aldi Nord', 'ALDI Nord', 'Aldi'), 'aldi', 'Aldi Nord'),
    (('Edeka', 'EDEKA', 'E center', 'Edeka Center'), 'edeka', 'EDEKA'), (('Lidl',), 'lidl', 'Lidl'),
    (('Rewe', 'REWE', 'Nahkauf'), 'rewe', 'REWE'), (('Netto Marken-Discount',), 'netto', 'Netto Marken-Discount'),
    (('Penny', 'PENNY'), 'penny', 'Penny'), (('famila',), 'famila', 'famila'), (('Kaufland',), 'kaufland', 'Kaufland'),
]


def build_stores(lat=54.79, lon=9.44, radius=60000):
    q = '[out:json][timeout:90];(nwr["shop"="supermarket"](around:%d,%f,%f););out center tags;' % (radius, lat, lon)
    d = req('https://overpass-api.de/api/interpreter', urllib.parse.urlencode({'data': q}).encode())
    out = []
    for e in d.get('elements', []):
        t = e.get('tags') or {}
        b = (t.get('brand') or t.get('name') or '').strip()
        hit = next((x for x in BRANDS if b in x[0]), None)
        if not hit:
            continue
        la = e.get('lat') or (e.get('center') or {}).get('lat')
        lo = e.get('lon') or (e.get('center') or {}).get('lon')
        # Danish Netto vs German Netto: the Salling one sits in Denmark (north of the border, about 54.81 N here)
        ds = hit[1]
        if hit[2] == 'Netto (DK)' and la < 54.805:
            ds, lbl = 'netto', 'Netto'
        else:
            lbl = hit[2]
        city = t.get('addr:city') or ''
        street = ((t.get('addr:street') or '') + ' ' + (t.get('addr:housenumber') or '')).strip()
        out.append({'id': '%s%d' % (e['type'][0], e['id']), 'chain': ds, 'brand': lbl, 'name': t.get('name') or lbl,
                    'addr': ', '.join(x for x in (street, city) if x), 'lat': round(la, 5), 'lon': round(lo, 5),
                    'dk': la >= 54.805 and ds == 'salling'})
    out.sort(key=lambda s: (s['chain'], s['lat']))
    with open(os.path.join(OUT, 'stores.json'), 'w') as f:
        json.dump({'source': 'OpenStreetMap contributors (ODbL), supermarkets within %d km of Flensburg' % (radius // 1000),
                   'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'), 'stores': out}, f,
                  ensure_ascii=False, separators=(',', ':'))
    print('stores', len(out), file=sys.stderr)


def write(chain, meta, prods):
    prods.sort(key=lambda x: (x['k'], x['n']))
    meta = dict(meta)
    meta['built'] = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
    meta['count'] = len(prods)
    meta['cols'] = ['n', 'b', 'k', 'c', 's', 'f', 'p', 'fat', 'kcal', 'u', 'q', 'g']
    meta['rows'] = [[p.get(k) for k in meta['cols']] for p in prods]
    with open(os.path.join(OUT, chain + '.json'), 'w') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == 'salling':
        build_salling()
    elif a[0] == 'stores':
        build_stores()
    elif a[0] == 'off':
        build_off(a[1])
    elif a[0] == 'off-all':
        for ch in OFF_CHAINS:
            try:
                build_off(ch)
            except Exception as e:
                print('FAILED', ch, e, file=sys.stderr)
