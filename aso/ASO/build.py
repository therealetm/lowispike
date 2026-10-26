#!/usr/bin/env python3
# Builds the LOWiSPIKE App Store concept panels as HTML (rendered to PNG by render.cjs).
import json, os
A = '/home/sprite/ASO'
R = '/home/sprite/lowispike'
os.makedirs(A + '/html', exist_ok=True)

CSS = r"""
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=block');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1290px;height:2796px;overflow:hidden}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0A1033;position:relative;
 background:linear-gradient(172deg,#F5F9FF 0%,#EEF3FF 40%,#F4EFFF 100%);-webkit-font-smoothing:antialiased}
.blob{position:absolute;border-radius:50%;filter:blur(110px);opacity:.75;z-index:0}
.b1{width:900px;height:900px;right:-330px;top:520px;background:radial-gradient(circle,#7DE8FF 0%,rgba(125,232,255,0) 70%)}
.b2{width:1000px;height:1000px;left:-420px;top:1500px;background:radial-gradient(circle,#B9A2FF 0%,rgba(185,162,255,0) 70%)}
.b3{width:520px;height:520px;right:40px;bottom:-160px;background:radial-gradient(circle,#FFC7E8 0%,rgba(255,199,232,0) 70%);opacity:.55}
.stars{position:absolute;inset:0;z-index:0;background-image:
 radial-gradient(2.4px 2.4px at 140px 190px,#9AA7FF 60%,transparent 61%),radial-gradient(2px 2px at 1110px 140px,#7FD8F0 60%,transparent 61%),
 radial-gradient(3px 3px at 1180px 760px,#A996FF 60%,transparent 61%),radial-gradient(2px 2px at 90px 980px,#7FD8F0 60%,transparent 61%),
 radial-gradient(2.6px 2.6px at 1210px 1500px,#9AA7FF 60%,transparent 61%),radial-gradient(2px 2px at 70px 2120px,#A996FF 60%,transparent 61%);opacity:.8}
.top{position:absolute;left:0;right:0;top:150px;z-index:3;text-align:center;padding:0 90px}
.eyebrow{display:inline-flex;align-items:center;gap:16px;padding:14px 30px 14px 16px;border-radius:999px;background:rgba(255,255,255,.72);
 border:2px solid rgba(255,255,255,.95);box-shadow:0 10px 40px rgba(76,70,180,.12);font-weight:700;font-size:30px;letter-spacing:.14em;color:#4B4FA8;text-transform:uppercase}
.eyebrow img{width:52px;height:52px;border-radius:14px}
h1{margin-top:44px;font-size:112px;line-height:1.03;font-weight:800;letter-spacing:-.035em;color:#0A1033}
h1 em{font-style:normal;background:linear-gradient(100deg,#00AFD6 0%,#5B6CFF 55%,#9A5CFF 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{margin:36px auto 0;max-width:1060px;font-size:44px;line-height:1.36;font-weight:500;color:#4A5378}
.phone-wrap{position:absolute;left:50%;transform:translateX(-50%);z-index:2}
.halo{position:absolute;inset:-70px;border-radius:200px;background:conic-gradient(from 200deg,#6FE3FF,#8C7BFF,#E59BFF,#6FE3FF);filter:blur(80px);opacity:.55;z-index:-1}
.phone{position:relative;border-radius:128px;padding:22px;background:linear-gradient(145deg,#2A2F45,#0B0E1A 45%,#1C2133);
 box-shadow:0 0 0 3px #3A4060 inset,0 60px 120px rgba(20,24,70,.35),0 20px 40px rgba(20,24,70,.25)}
.screen{position:relative;border-radius:106px;overflow:hidden;background:#05060d}
.screen img{display:block;width:100%}
.island{position:absolute;top:30px;left:50%;transform:translateX(-50%);width:250px;height:72px;border-radius:40px;background:#000;z-index:4}
.chip{position:absolute;z-index:5;background:rgba(255,255,255,.82);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
 border:2px solid rgba(255,255,255,.98);border-radius:44px;box-shadow:0 30px 70px rgba(36,40,120,.20),0 0 0 1px rgba(110,120,255,.10);
 padding:30px 36px;display:flex;align-items:center;gap:26px}
.chip .k{font-size:24px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#6B72A0}
.chip .v{font-size:38px;font-weight:700;line-height:1.2;color:#0A1033;margin-top:6px}
.chip .s{font-size:26px;font-weight:500;color:#6B72A0;margin-top:6px}
.dot{flex:0 0 auto;width:72px;height:72px;border-radius:50%;display:grid;place-items:center;font-size:34px;font-weight:800;color:#fff}
.d-cyan{background:radial-gradient(circle at 35% 30%,#B8F6FF,#26C6E8 55%,#1595C8);box-shadow:0 0 30px rgba(38,198,232,.6)}
.d-violet{background:radial-gradient(circle at 35% 30%,#E2D8FF,#8B6BFF 55%,#5B3FE0);box-shadow:0 0 30px rgba(139,107,255,.55)}
.d-amber{background:radial-gradient(circle at 35% 30%,#FFE8B8,#FF9D3D 55%,#E86A1A);box-shadow:0 0 30px rgba(255,157,61,.55)}
.d-green{background:radial-gradient(circle at 35% 30%,#D4FFE4,#2FCB7B 55%,#159A58);box-shadow:0 0 30px rgba(47,203,123,.5)}
.thumb{flex:0 0 auto;width:150px;height:150px;border-radius:30px;object-fit:cover;box-shadow:0 10px 24px rgba(0,0,0,.15)}
.concept{position:absolute;z-index:6;left:50%;bottom:36px;transform:translateX(-50%);font-size:22px;font-weight:600;letter-spacing:.16em;
 text-transform:uppercase;color:rgba(75,79,168,.55)}
.arrow{color:#8B6BFF;font-weight:800;margin:0 6px}
"""

PHONE_W = 880  # outer width incl. bezel

def phone(img, top, w=PHONE_W):
    sw = w - 44
    return f'''<div class="phone-wrap" style="top:{top}px;width:{w}px"><div class="halo"></div><div class="phone"><div class="screen">
<div class="island"></div><img src="file://{img}"></div></div></div>'''

def chip(x, y, w, inner, side='left'):
    pos = f'left:{x}px' if side == 'left' else f'right:{x}px'
    return f'<div class="chip" style="{pos};top:{y}px;width:{w}px">{inner}</div>'

def dot(cls, sym=''):
    return f'<div class="dot {cls}">{sym}</div>'

def txt(k, v, s=''):
    return f'<div><div class="k">{k}</div><div class="v">{v}</div>' + (f'<div class="s">{s}</div>' if s else '') + '</div>'

ICON = R + '/icon-512.png'
SH = A + '/shots/'
FY = R + '/fy-img/'

P = [
 dict(id='01-misty', eyebrow='Dein Begleiter', h1='Gesund essen<br>wird ein <em>Spiel</em>.',
      sub='Kümmere dich um Misty: Echte Mahlzeiten, Wasser und Bewegung geben ihr Energie.',
      img=SH + 't-home.png', top=850,
      chips=[chip(40, 1390, 470, dot('d-cyan', '') + txt('Wasser', '5 / 6 Gläser'), 'left'),
             chip(40, 1970, 520, dot('d-violet', '') + txt('Essenspause', '4 h 41 min', 'seit der letzten Mahlzeit'), 'right')]),
 dict(id='02-scan', eyebrow='Barcode-Scan', h1='Spikes erkennen,<br><em>bevor</em> du zugreifst.',
      sub='Scannen und sehen, wie stark ein Produkt deinen Blutzucker treffen könnte, mit einer besseren Wahl.',
      img=SH + 't-scanres.png', top=850,
      chips=[chip(30, 1260, 560, dot('d-amber', '!') + txt('Spike-Schätzung', 'Höhere Wirkung', '13,5 g Zucker pro 100 g'), 'right'),
             chip(30, 1980, 580, dot('d-green', '✓') + txt('Bessere Wahl', 'Griechischer Naturjoghurt oder Quark mit Beeren'), 'left')]),
 dict(id='03-essenspause', eyebrow='Essenspause', h1='Deine Pause,<br><em>Stunde</em> für Stunde.',
      sub='Sieh, was nach dem Essen typischerweise in deinem Körper passiert, mit Tipps gegen Spikes.',
      img=SH + 't-gap.png', top=850,
      chips=[chip(30, 1300, 560, dot('d-violet', '') + txt('Seit deiner letzten Mahlzeit', '4 h 41 min'), 'left'),
             chip(30, 1960, 600, dot('d-cyan', '') + txt('Ab etwa 4 Std.', 'Insulin niedrig', 'Typisch, nicht gemessen'), 'right')]),
 dict(id='04-rezepte', eyebrow='Kochen', h1='Swipe dich zum<br>nächsten <em>Rezept</em>.',
      sub='Heute kochen, bald kochen oder nie wieder: Rezepte aus dem LOWiSPIKE E-Book.',
      img=SH + 't-swipe.png', top=850,
      chips=[chip(30, 1330, 600, f'<img class="thumb" src="file://{FY}rb_smoked_salmon_cucumber_bites.webp">' + txt('Snack · 10 min', 'Räucherlachs-Gurken-Happen'), 'right'),
             chip(40, 2020, 470, dot('d-violet', '38') + txt('E-Book', 'Rezepte zum Swipen'), 'left')]),
 dict(id='05-tausch', eyebrow='Für dich', h1='Jeden Tag ein<br>cleverer <em>Tausch</em>.',
      sub='Lust auf Tiramisu? Dein Feed zeigt dir eine Idee ohne zugesetzten Zucker.',
      img=SH + 't-fy.png', top=850,
      chips=[chip(30, 1390, 610, f'<img class="thumb" src="file://{FY}rb_espresso_cottage_cream_cups.webp">' + txt('Tausch des Tages', 'Espresso-Hüttenkäse-Cremebecher', 'statt Tiramisu'), 'left'),
             chip(30, 2060, 520, dot('d-amber', '') + txt('Lust auf Nachos?', 'Blumenkohl-Nacho-Blech'), 'right')]),
 dict(id='06-einkaufen', eyebrow='Einkaufen', h1='Einkaufen ohne<br><em>Zuckerfallen</em>.',
      sub='Im Laden scannen, die Einkaufsliste dabeihaben und geprüfte Snacks entdecken.',
      img=SH + 't-shop.png', top=850,
      chips=[chip(30, 1350, 520, dot('d-green', '17') + txt('Seller Zone', 'Geprüfte Snacks'), 'right'),
             chip(40, 2000, 520, dot('d-cyan', '') + txt('Im Laden', 'Produkte scannen'), 'left')]),
]

for p in P:
    html = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="stars"></div>
<div class="top"><div class="eyebrow"><img src="file://{ICON}">{p['eyebrow']}</div><h1>{p['h1']}</h1><div class="sub">{p['sub']}</div></div>
{phone(p['img'], p['top'])}
{''.join(p['chips'])}
<div class="concept">LOWiSPIKE · Designkonzept</div>
</body></html>'''
    open(f"{A}/html/{p['id']}.html", 'w').write(html)
json.dump([p['id'] for p in P], open(A + '/html/panels.json', 'w'))
print('ok', len(P))
