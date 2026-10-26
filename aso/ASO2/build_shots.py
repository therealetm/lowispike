import base64, json, os, sys
from PIL import Image
sys.path.insert(0, '/home/sprite/ASO2')
from statusbar import statusbar
D = '/home/sprite/ASO2'
FONT = f'{D}/fonts/inter/InterVariable.ttf'

SHOTS = json.load(open(f'{D}/captions.json'))

def b64(p, mime='image/png'):
    return f'data:{mime};base64,' + base64.b64encode(open(p, 'rb').read()).decode()

def topcolor(p):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    px = [im.getpixel((x, 6)) for x in range(0, w, max(1, w // 40))]
    r = sum(c[0] for c in px) // len(px); g = sum(c[1] for c in px) // len(px); b = sum(c[2] for c in px) // len(px)
    return (r, g, b)

CSS = f"""@font-face{{font-family:Inter;src:url('{b64(FONT,'font/ttf')}') format('truetype');font-weight:100 900}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:430px;height:932px;overflow:hidden;font-family:Inter;-webkit-font-smoothing:antialiased}}
"""

def page(s):
    shot = f"{D}/shots/{s['file']}"
    r, g, b = topcolor(shot)
    dark = (r * 299 + g * 587 + b * 114) / 1000 < 140
    sb = statusbar('#fff' if dark else '#000', '9:41', 430)
    return f"""<!doctype html><html><head><meta charset=utf-8><style>{CSS}
body{{background:linear-gradient(165deg,#efeaff 0%,#e4f6f3 55%,#d9f2ee 100%)}}
.k{{position:absolute;left:0;right:0;top:66px;text-align:center;font:700 13px Inter;letter-spacing:2.2px;color:#6f5cf0}}
.h{{position:absolute;left:26px;right:26px;top:90px;text-align:center;font:800 33px/38px Inter;letter-spacing:-1px;color:#141433}}
.s{{position:absolute;left:38px;right:38px;top:{176 if s.get('two',True) else 138}px;text-align:center;font:500 16px/22px Inter;letter-spacing:-.2px;color:#55557a}}
.ph{{position:absolute;left:50%;top:{246 if s.get('two',True) else 208}px;width:{430*0.8+24}px;margin-left:-{(430*0.8+24)/2}px;height:1000px;border-radius:62px;background:#0d0d12;padding:12px;
 box-shadow:0 0 0 1.5px #3a3a44 inset,0 30px 60px rgba(40,30,110,.22)}}
.sc{{width:430px;height:986px;transform:scale(.8);transform-origin:0 0;border-radius:62px;overflow:hidden;position:relative;background:rgb({r},{g},{b})}}
.sc img{{position:absolute;left:0;top:54px;width:430px;height:932px;display:block}}
.isl{{position:absolute}}
</style></head><body>
<div class=k>{s['kicker']}</div><div class=h>{s['head']}</div><div class=s>{s['sub']}</div>
<div class=ph><div class=sc>{sb}<img src="{b64(shot)}"></div></div>
</body></html>"""

os.makedirs(f'{D}/html', exist_ok=True)
for i, s in enumerate(SHOTS, 1):
    open(f'{D}/html/shot{i}.html', 'w').write(page(s))
print('ok', len(SHOTS))
