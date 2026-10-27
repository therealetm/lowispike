#!/usr/bin/env python3
# Builds the German gallery page from inventory.json (self-contained, base64 thumbnails).
import json, base64, io, html, sys
from PIL import Image

D = '/home/sprite/inv-shots/'
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/sprite/lowispike-alle-oberflaechen.html'
inv = json.load(open(D + 'inventory.json'))
items = inv['items']
areas = inv['areas']
order = ['H', 'C', 'F', 'M', 'S', 'W', 'G', 'SL', 'P', 'T', 'X']
cache = {}

def thumb(fn, w, q):
    k = (fn, w, q)
    if k in cache:
        return cache[k]
    im = Image.open(D + fn).convert('RGB')
    h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=q, optimize=True, progressive=True)
    s = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
    cache[k] = (s, w, h)
    return cache[k]

def img(fn, w, q, cls=''):
    s, ww, hh = thumb(fn, w, q)
    c = f' class="{cls}"' if cls else ''
    return f'<img{c} src="{s}" width="{ww}" height="{hh}" loading="lazy" alt="">'

e = html.escape
parts = []
for a in order:
    its = [i for i in items if i['area'] == a]
    if not its:
        continue
    parts.append(f'<h2 id="{a.lower()}">{e(areas[a])} <span class="cnt">{len(its)}</span></h2>')
    if a == 'X':
        parts.append('<p class="kicker">Diese Seiten gibt es noch im Code, aber kein Tippen in der App führt hin. Sie öffnen sich nur per Code. Gute Kandidaten zum Löschen.</p>')
    parts.append('<div class="shots">')
    for i in its:
        wide = ' wide' if i.get('ipad') else ''
        p = [f'<figure class="it{wide}" id="{e(i["nr"])}">']
        p.append(f'<figcaption><span class="nr">{e(i["nr"])}</span><b>{e(i["name"])}</b>')
        if a == 'X':
            ra = areas.get(i.get('realArea', ''), '')
            code = ', '.join(i.get('code') or [])
            p.append(f'<small>Gehört zu: {e(ra)}</small><small class="code">{e(code)}</small>')
        else:
            p.append(f'<small>{e(i["path"])}</small>')
        p.append('</figcaption><div class="pics">')
        p.append(img(i['files'][0], 360, 55, 'ph'))
        for f in i.get('ipad') or []:
            p.append(img(f, 720, 55, 'pad'))
        p.append('</div>')
        extra = [] if i['nr'] == 'H-01' else i['files'][1:4]
        if extra:
            n = len(i['files']) - 1
            p.append(f'<details><summary>Weitere Zustände ({len(extra)})</summary><div class="more">')
            for f in extra:
                p.append(img(f, 200, 45))
            p.append('</div></details>')
        p.append('</figure>')
        parts.append(''.join(p))
    parts.append('</div>')

nav = ''.join(f'<a href="#{a.lower()}">{e(areas[a])}</a>' for a in order if inv['counts'].get(a))
total = inv['total']
nx = inv['counts'].get('X', 0)

page = f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Alle Oberflächen</title>
<style>
h2 .cnt{{font-family:var(--mono);font-size:.7em;color:var(--muted);margin-left:.3em}}
.shots{{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin:12px 0 28px}}
.it{{margin:0;background:var(--card);border:1px solid var(--rule);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px;scroll-margin-top:12px}}
.it.wide{{grid-column:1/-1}}
.it figcaption{{display:flex;flex-direction:column;gap:2px;font-family:var(--sans);color:var(--ink)}}
.it figcaption b{{font-size:.95em;line-height:1.25}}
.it figcaption small{{color:var(--muted);font-size:.78em;line-height:1.3}}
.it .nr{{font-family:var(--mono);font-size:.8em;font-weight:700;color:var(--ink);border:1px solid var(--rule);border-radius:6px;padding:1px 6px;align-self:flex-start}}
.it .code{{font-family:var(--mono);word-break:break-all}}
.pics{{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}}
.pics img{{display:block;height:auto;border-radius:8px;border:1px solid var(--rule)}}
.pics img.ph{{width:100%;max-width:240px}}
.it.wide .pics img.ph{{width:calc(35% - 5px);min-width:150px}}
.pics img.pad{{flex:1;min-width:0;width:60%}}
.it details summary{{font-family:var(--sans);font-size:.8em;color:var(--muted);cursor:pointer}}
.more{{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;margin-top:6px}}
.more img{{width:100%;height:auto;border-radius:6px;border:1px solid var(--rule)}}
</style>
</head>
<body><div class="wrap">
<h1>LOWiSPIKE: alle Oberflächen</h1>
<p class="kicker">Screenshot-Übersicht, iPhone 390×844, dunkel, Deutsch</p>
<p class="updated">Erstellt 27. Okt. 2026, 22:55</p>
<p class="lede">{total} Oberflächen in der App, davon {nx} nur noch per Code erreichbar. Antworte einfach mit Nummern: H-03 weg, C-07 ändern, F-05 angleichen.</p>
<ul>
<li>Erst der Weg per Tippen, dann das Bild. Breite Karten zeigen zusätzlich das iPad, wo es anders aussieht.</li>
<li>„Weitere Zustände“ zeigt dieselbe Seite über andere Wege oder in anderem Zustand.</li>
</ul>
<nav class="jump">{nav}</nav>
{''.join(parts)}
<div class="sources"><b>Quelle</b><ul><li><a href="https://therealetm.github.io/lowispike/">LOWiSPIKE</a>, jede Seite automatisch durchgeklickt am 27. Okt. 2026; die nicht erreichbaren Seiten direkt aus dem Code geöffnet</li></ul></div>
</div></body></html>
'''
open(OUT, 'w').write(page)
print(OUT, len(page))
