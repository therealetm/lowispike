# Connie promo renderer: 1080x1920, 30 fps. Moving cartoon from clay stills: camera moves, mouth flaps from the dialogue,
# an animated keyed companion sprite (bob, squash, blink, talk, glow), particles, real app screens inside the phones.
import numpy as np, json, sys, os, math, glob
from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageChops
sys.path.insert(0, '/home/sprite/PROMO4')
from tl import *
W, H = 1080, 1920
D = '/home/sprite/PROMO4/'; ART = D + 'art/'; FR = '/home/sprite/PROMO/frames/'
TJ = json.load(open(D + 'timing.json')); MOUTH = TJ['mouth']; CAPS = sorted(TJ['caps'])
for _i in range(len(CAPS) - 1): CAPS[_i][1] = min(CAPS[_i][1], CAPS[_i + 1][0])
FB = '/home/sprite/ASO2/fonts/inter/extras/ttf/'
font = lambda n, s: ImageFont.truetype(FB + n, s)
BIC = Image.BICUBIC
rng = np.random.default_rng(3)

def clamp(x, a, b): return max(a, min(b, x))
def lerp(a, b, u): return a + (b - a) * u
def ease(u): u = clamp(u, 0, 1); return u * u * (3 - 2 * u)
def eob(u):  # ease out back
    u = clamp(u, 0, 1); c = 1.9; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2
def seg(t, a, b): return clamp((t - a) / (b - a), 0, 1)

# ---------- assets ----------
_cache = {}
def up(name):
    k = 'up:' + name
    if k not in _cache:
        im = Image.open(ART + name + '.jpg').convert('RGB')
        im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 55, 2))
        _cache[k] = im
    return _cache[k]
def spot_mask(a, b, hot, r=75):
    A = np.asarray(Image.open(ART + a + '.jpg').convert('RGB')).astype(int); B = np.asarray(Image.open(ART + b + '.jpg').convert('RGB')).astype(int)
    m = (np.abs(A - B).sum(2) > 45).astype(np.uint8) * 255; z = np.zeros_like(m); x, y = hot
    z[max(0, y - r):y + r, max(0, x - r):x + r] = m[max(0, y - r):y + r, max(0, x - r):x + r]
    im = Image.fromarray(z).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(5))
    return im.resize((im.width * 2, im.height * 2), BIC)
def variant(base, var, hot, r=75):
    k = 'var:' + base + var
    if k not in _cache:
        m = spot_mask(base, var, hot, r); _cache[k] = Image.composite(up(var), up(base), m)
    return _cache[k]
def green(name):
    k = 'g:' + name
    if k not in _cache:
        A = np.asarray(Image.open(ART + name + '.jpg').convert('RGB')).astype(int)
        g = ((A[..., 1] > 120) & (A[..., 1] - A[..., 0] > 45) & (A[..., 1] - A[..., 2] > 45)).astype(np.uint8) * 255
        im = Image.fromarray(g).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))
        _cache[k] = im.resize((im.width * 2, im.height * 2), BIC)
    return _cache[k]

# companion sprite (keyed from pure green)
def key_star(name):
    A = np.asarray(Image.open(ART + name + '.jpg').convert('RGB')).astype(float)
    R, G, B = A[..., 0], A[..., 1], A[..., 2]; mx = np.maximum(R, B)
    a = 1 - np.clip((G - mx - 35) / 70, 0, 1)
    G2 = np.where(G > mx + 8, mx + 8, G); A[..., 1] = G2
    return np.dstack([A, a * 255]).astype(np.uint8)
def build_star():
    base = key_star('star'); talk = key_star('star_talk'); blink = key_star('star_blink')
    al = base[..., 3] > 20; ys, xs = np.nonzero(al); bb = (xs.min() - 12, ys.min() - 12, xs.max() + 12, ys.max() + 12)
    def mix(v):
        d = (np.abs(v[..., :3].astype(int) - base[..., :3].astype(int)).sum(2) > 50).astype(np.uint8) * 255
        m = np.asarray(Image.fromarray(d).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(4))).astype(float)[..., None] / 255
        out = base.astype(float) * (1 - m) + v.astype(float) * m; return Image.fromarray(out.astype(np.uint8), 'RGBA').crop(bb)
    S = {'base': Image.fromarray(base, 'RGBA').crop(bb), 'talk': mix(talk), 'blink': mix(blink)}
    w, h = S['base'].size; pad = int(h * 0.6)
    a = Image.new('L', (w + 2 * pad, h + 2 * pad), 0); a.paste(S['base'].split()[3], (pad, pad))
    g1 = a.filter(ImageFilter.GaussianBlur(h * 0.10)); g2 = a.filter(ImageFilter.GaussianBlur(h * 0.30))
    g = ImageChops.add(g1.point(lambda v: v * 0.9), g2.point(lambda v: v * 0.8))
    glow = Image.merge('RGB', [g.point(lambda v: v * 1.0), g.point(lambda v: v * 0.55), g.point(lambda v: v * 0.16)])
    return S, glow, pad
STAR = None
def star_assets():
    global STAR
    if STAR is None: STAR = build_star()
    return STAR

def paste(fr, im, x, y):  # alpha paste with clipping, fr RGB
    x, y = int(round(x)), int(round(y)); w, h = im.size
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return
    c = im.crop((x0 - x, y0 - y, x1 - x, y1 - y)); fr.paste(c, (x0, y0), c)
def add(fr, im, x, y, g=1.0):  # additive RGB
    x, y = int(round(x)), int(round(y)); w, h = im.size
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return
    c = im.crop((x0 - x, y0 - y, x1 - x, y1 - y))
    if g != 1.0: c = c.point(lambda v: min(255, int(v * g)))
    fr.paste(ImageChops.add(fr.crop((x0, y0, x1, y1)), c), (x0, y0))

def draw_star(fr, cx, cy, h, state='base', sx=1.0, sy=1.0, rot=0.0, glow=1.0, alpha=1.0):
    if h < 4 or alpha <= 0: return
    S, GL, pad = star_assets(); im = S[state]; w0, h0 = im.size; s = h / h0
    gw, gh = GL.size; gimg = GL.resize((max(2, int(gw * s * sx)), max(2, int(gh * s * sy))), Image.BILINEAR)
    add(fr, gimg, cx - gimg.width / 2, cy - gimg.height / 2, 0.85 * glow * alpha)
    sp = im.resize((max(2, int(w0 * s * sx)), max(2, int(h0 * s * sy))), BIC)
    if rot: sp = sp.rotate(rot, BIC, expand=True)
    if alpha < 1: sp.putalpha(sp.split()[3].point(lambda v: int(v * alpha)))
    paste(fr, sp, cx - sp.width / 2, cy - sp.height / 2)

def blinking(t, ph=0.0): return ((t + ph) % 3.1) < 0.12
def mouth_open(spk, t, thr=0.05):
    f = int(t * FPS); a = MOUTH[spk]; return 0 <= f < len(a) and a[f] > thr
def star_state(t, ph=0.0):
    if mouth_open('star', t): return 'talk'
    return 'blink' if blinking(t, ph) else 'base'

# ---------- camera ----------
class Cam:
    def __init__(s, img, cx, cy, z, rot=0.0):
        s.img = img; iw, ih = img.size; s0 = max(W / iw, H / ih); s.k = s0 * z
        hw, hh = W / 2 / s.k, H / 2 / s.k
        s.cx = clamp(cx, hw, iw - hw); s.cy = clamp(cy, hh, ih - hh); s.rot = rot
    def to_out(s, x, y): return ((x - s.cx) * s.k + W / 2, (y - s.cy) * s.k + H / 2)
    def coeffs(s): a = 1 / s.k; return (a, 0, s.cx - W / 2 * a, 0, a, s.cy - H / 2 * a)
    def render(s, img=None):
        im = (img or s.img).transform((W, H), Image.AFFINE, s.coeffs(), resample=BIC)
        return im
    def mask(s, m): return m.transform((W, H), Image.AFFINE, s.coeffs(), resample=Image.BILINEAR)
def shake(t, amp, f=1.0):
    return (amp * (math.sin(t * 7.3 * f) * 0.6 + math.sin(t * 13.1 * f + 1) * 0.4), amp * (math.sin(t * 6.1 * f + 2) * 0.6 + math.sin(t * 11.7 * f) * 0.4))

# ---------- app screens ----------
def frames(d): return sorted(glob.glob(FR + d + '/*.jpg'))
SEQ = {}
def screen(name, u=0.0, a=0, b=0):
    if name in ('gift', 'recap', 'mirror'):
        p = {'gift': D + 'screens/gift3.png', 'recap': D + 'screens/recap5.png', 'mirror': D + 'screens/mirror2.png'}[name]
    else:
        if name not in SEQ: SEQ[name] = frames(name + '-en')
        L = SEQ[name]; i = int(lerp(a, b, clamp(u, 0, 1))); p = L[clamp(i, 0, len(L) - 1)]
    k = 'scr:' + p
    if k not in _cache:
        if len([x for x in _cache if isinstance(x, str) and x.startswith('scr:')]) > 40:
            for x in [x for x in _cache if isinstance(x, str) and x.startswith('scr:')][:20]: del _cache[x]
        _cache[k] = Image.open(p).convert('RGB')
    return _cache[k]
def fill_green(fr, cam, gmask, scr, bright=0.95):
    m = cam.mask(gmask); bb = m.getbbox()
    if not bb: return None
    x0, y0, x1, y1 = bb; bw, bh = x1 - x0, y1 - y0; s = max(bw / scr.width, bh / scr.height)
    im = scr.resize((max(1, int(scr.width * s)), max(1, int(scr.height * s))), Image.LANCZOS)
    im = im.crop(((im.width - bw) // 2, 0, (im.width - bw) // 2 + bw, bh))
    if bright != 1: im = im.point(lambda v: int(v * bright))
    fr.paste(im, (x0, y0), m.crop(bb)); return bb
PHW = 600
def phone_mock(scr, w=PHW):
    b = int(w * 0.035); sw = w - 2 * b; sh = int(sw * scr.height / scr.width); h = sh + 2 * b; pad = 60; r = int(w * 0.13)
    k = ('mockbase', w, h)
    if k not in _cache:
        base = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
        sh_ = Image.new('L', base.size, 0); ImageDraw.Draw(sh_).rounded_rectangle((pad, pad + 24, pad + w, pad + h + 24), r, fill=150)
        base.putalpha(sh_.filter(ImageFilter.GaussianBlur(26)))
        d = ImageDraw.Draw(base); d.rounded_rectangle((pad, pad, pad + w, pad + h), r, fill=(18, 18, 24, 255), outline=(255, 170, 80, 255), width=3)
        sm = Image.new('L', (sw, sh), 0); ImageDraw.Draw(sm).rounded_rectangle((0, 0, sw - 1, sh - 1), r - b, fill=255)
        _cache[k] = (base, sm)
    base, sm = _cache[k]; out = base.copy(); out.paste(scr.resize((sw, sh), Image.LANCZOS), (pad + b, pad + b), sm); return out
def draw_phone(fr, scr, cx, cy, w):
    m = phone_mock(scr); s = w / PHW
    if abs(s - 1) > 0.01: m = m.resize((max(2, int(m.width * s)), max(2, int(m.height * s))), BIC)
    paste(fr, m, cx - m.width / 2, cy - m.height / 2)
def phone_pop(fr, t, a, b, scr, frm, to=(540, 1130), w1=PHW):
    # pop from the in-scene phone box frm=(x0,y0,x1,y1) up to the centre, hold, back down
    u = min(eob(seg(t, a, a + 0.38)), 1.0 + (eob(seg(t, a, a + 0.38)) - 1)) ; dn = ease(seg(t, b - 0.3, b))
    u = u * (1 - dn)
    if u <= 0.001: return
    fx, fy = (frm[0] + frm[2]) / 2, (frm[1] + frm[3]) / 2; fw = max(40, frm[2] - frm[0])
    draw_phone(fr, scr, lerp(fx, to[0], u), lerp(fy, to[1], u), lerp(fw, w1, u))

# ---------- particles / fx ----------
def blob(r, col=(255, 255, 255)):
    k = ('blob', r, col)
    if k not in _cache:
        n = int(r * 4) + 2; y, x = np.mgrid[0:n, 0:n] - n / 2; g = np.exp(-(x * x + y * y) / (2 * r * r))
        _cache[k] = Image.fromarray(np.dstack([g * c for c in col]).clip(0, 255).astype(np.uint8), 'RGB')
    return _cache[k]
def sparkle_img(r, col=(255, 236, 190)):
    k = ('spk', r, col)
    if k not in _cache:
        n = int(r * 2.4) | 1; y, x = np.mgrid[0:n, 0:n] - n // 2; ax, ay = np.abs(x) + 0.5, np.abs(y) + 0.5
        g = np.clip(np.maximum(np.exp(-ay / (r * 0.06)) * np.exp(-ax / (r * 0.45)), np.exp(-ax / (r * 0.06)) * np.exp(-ay / (r * 0.45))) + np.exp(-(x * x + y * y) / (r * r * 0.04)), 0, 1)
        _cache[k] = Image.fromarray(np.dstack([g * c for c in col]).astype(np.uint8), 'RGB')
    return _cache[k]
BOK = rng.random((40, 5))
def bokeh(fr, t, n=14, col=(255, 190, 140), g=0.35, drift=(12, -6)):
    for i in range(n):
        x0, y0, r, ph, sp = BOK[i]; x = (x0 * W + drift[0] * t * (0.5 + sp)) % (W + 200) - 100; y = (y0 * H + drift[1] * t * (0.5 + sp)) % (H + 200) - 100
        rr = int(18 + r * 40); b = blob(rr, col); tw = 0.6 + 0.4 * math.sin(t * (1 + sp) + ph * 6)
        add(fr, b, x - b.width / 2, y - b.height / 2, g * tw)
def sparkles(fr, t, t0, cx, cy, spread, n=10, dur=1.0, size=34, seed=1):
    if t < t0 or t > t0 + dur + 0.6: return
    r = np.random.default_rng(seed)
    for i in range(n):
        a = r.random() * 6.283; d = spread * (0.3 + 0.7 * r.random()); st = t0 + r.random() * dur * 0.6; life = 0.45 + r.random() * 0.4
        u = (t - st) / life
        if 0 <= u <= 1:
            s = math.sin(u * math.pi); im = sparkle_img(int(size * (0.6 + 0.6 * r.random()) * max(0.2, s)) + 3)
            x = cx + math.cos(a) * d * (0.6 + 0.4 * u); y = cy + math.sin(a) * d * (0.6 + 0.4 * u) - 30 * u
            add(fr, im, x - im.width / 2, y - im.height / 2, 1.0)
STEAM = rng.random((24, 4))
def steam(fr, t, cx, cy, spread=70, n=12, g=0.22, rise=260):
    for i in range(n):
        x0, ph, sp, r = STEAM[i]; life = 2.2 + sp; u = ((t + ph * life) % life) / life
        x = cx + (x0 - 0.5) * spread + 30 * math.sin(u * 5 + ph * 9); y = cy - u * rise
        b = blob(int(16 + 30 * u + r * 10)); add(fr, b, x - b.width / 2, y - b.height / 2, g * math.sin(u * math.pi))

VIG = None
def finish(fr, t, vig=0.38):
    global VIG
    if VIG is None:
        y, x = np.mgrid[0:H, 0:W]; d = np.sqrt(((x - W / 2) / (W * 0.62)) ** 2 + ((y - H / 2) / (H * 0.6)) ** 2); VIG = np.clip(1 - 0.55 * np.clip(d - 0.55, 0, 1) ** 1.4, 0, 1)
    a = np.asarray(fr).astype(np.float32); a *= (1 - vig + vig * VIG)[..., None]
    gr = np.random.default_rng(int(t * 1000)).normal(0, 3.2, (H // 2, W // 2)).astype(np.float32); a += np.repeat(np.repeat(gr, 2, 0), 2, 1)[..., None]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

# ---------- captions ----------
def cap_img(text, star=False):
    k = ('cap', text, star)
    if k not in _cache:
        fs = 54
        while True:
            f = font('Inter-Bold.ttf', fs); tw = f.getlength(text)
            if tw <= 900 or fs <= 36: break
            fs -= 2
        px, py = 34, 22; bw, bh = int(tw + 2 * px), int(fs * 1.25 + 2 * py)
        im = Image.new('RGBA', (bw + 8, bh + 8), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((4, 4, bw + 3, bh + 3), 28, fill=(16, 11, 30, 196), outline=(255, 165, 70, 235) if star else None, width=4 if star else 0)
        d.text((4 + px, 4 + py - fs * 0.04), text, font=f, fill=(255, 255, 255, 255))
        _cache[k] = im
    return _cache[k]
STAR_LINES = {it['key'] for it in TJ['lines'] if it['spk'] == 'star'}
def cap_is_star(text):
    for it in TJ['lines']:
        if text in it['caps']: return it['spk'] == 'star'
    return False
def captions(fr, t):
    for a, b, txt in CAPS:
        if a <= t < b:
            im = cap_img(txt, cap_is_star(txt)); u = eob(seg(t, a, a + 0.16)); s = 0.9 + 0.1 * u
            im2 = im.resize((max(2, int(im.width * s)), max(2, int(im.height * s))), BIC)
            if u < 1: im2.putalpha(im2.split()[3].point(lambda v: int(v * clamp(u, 0, 1))))
            paste(fr, im2, W / 2 - im2.width / 2, 300 - im2.height / 2)

# ---------- scenes ----------
S2X = lambda p: (p[0] * 2, p[1] * 2)  # 768-basis -> 2x source
CONNIE_HOT = {'c01': (396, 708), 'c05': (444, 564), 'c06': (396, 684), 'c09': (348, 708)}
def connie_img(name, t, var):
    open_ = mouth_open('connie', t)
    if name == 'c06':  # base is the open mouth, variant is closed
        return up('c06') if open_ else variant('c06', 'c06_closed', CONNIE_HOT['c06'])
    return variant(name, var, CONNIE_HOT[name]) if open_ else up(name)
def star_at(fr, cam, t, p, h768, ph=0.0, bob=7, extra_rot=0.0, sx=1, sy=1, glow=1.0, dy=0.0, alpha=1.0):
    x, y = cam.to_out(*S2X(p)); hh = h768 * 2 * cam.k
    b = math.sin(t * 2 * math.pi * 0.75 + ph) * bob; r = math.sin(t * 2.1 + ph) * 4 + extra_rot
    tk = 1 + (0.04 * math.sin(t * 40) if mouth_open('star', t) else 0)
    draw_star(fr, x, y + b + dy, hh, star_state(t, ph), sx * tk, sy / tk, r, glow, alpha)

def scene(t):
    sid = next(s for s in SCENES if s[1] <= t < s[2])[0] if t < TOTAL else 13
    st = next(s for s in SCENES if s[0] == sid)[1]; u = t - st
    fn = globals()['s%d' % sid]; return fn(t, u)

def s1(t, u):
    img = connie_img('c01', t, 'c01_talk'); z = lerp(1.0, 1.12, ease(u / 4.9)); dx, dy = shake(t, 5, 0.4)
    cam = Cam(img, lerp(768, 800, ease(u / 4.9)) + dx, lerp(1376, 1330, ease(u / 4.9)) + dy, z); fr = cam.render()
    m = cam.mask(green('c01')); fr.paste(Image.new('RGB', (W, H), (22, 22, 40)), (0, 0), m)
    bokeh(fr, t, 10, g=0.22); return fr, 0.4
def s2(t, u):
    cam = Cam(up('c01'), 950 + shake(t, 4, 0.4)[0], 1800, lerp(1.12, 1.22, ease(u / 4.7))); fr = cam.render()
    gl = 0.55 + 0.45 * math.sin(clamp(u / 0.55, 0, 1) * math.pi / 2)
    m = cam.mask(green('c01')); col = (int(255 * gl), int(200 * gl), int(140 * gl)); fr.paste(Image.new('RGB', (W, H), col), (0, 0), m)
    ph = S2X((690, 1033)); px, py = cam.to_out(*ph); add(fr, blob(110, (255, 170, 80)), px - 220, py - 220, 0.5 * gl)
    pop = 0.55
    if u > pop:
        k = eob(seg(u, pop, pop + 0.45)); path = seg(u, pop, pop + 0.45)
        tx, ty = lerp(690, 520, ease(path)), lerp(1033, 1075, ease(path)) - math.sin(path * math.pi) * 90
        sq = 1 + 0.25 * math.sin(clamp((u - pop) / 0.5, 0, 1) * math.pi * 2) * (1 - seg(u, pop, pop + 0.9))
        star_at(fr, cam, t, (tx, ty), 150 * k, 0.0, 7 * seg(u, pop + 0.5, pop + 1), 0, sq, 1 / sq, 1.0 + 0.6 * (1 - seg(u, pop, pop + 1)))
        sx_, sy_ = cam.to_out(*S2X((520, 1060))); sparkles(fr, t, st_(2) + pop, sx_, sy_, 170, 12, 0.6, 40, 2)
    bokeh(fr, t, 8, g=0.2); return fr, 0.4
def st_(sid): return next(s for s in SCENES if s[0] == sid)[1]
def s3(t, u):
    d = 4.6; e = ease(u / d); cam = Cam(up('c03'), lerp(768, 640, e), lerp(1300, 1700, e), lerp(1.04, 1.38, e)); fr = cam.render()
    fill_green(fr, cam, green('c03'), screen('cook', u / (d - 0.4), 118, 189))
    star_at(fr, cam, t, (143, 997), 150, 1.0); bokeh(fr, t, 8, g=0.18); return fr, 0.35
def s4(t, u):
    calm = seg(u, 1.7, 3.0); amp = 16 * (1 - calm) + 2; dx, dy = shake(t, amp, 2.2 - 1.6 * calm)
    z = lerp(1.12 + 0.035 * math.sin(u * 2 * math.pi * 3), lerp(1.18, 1.38, ease(seg(u, 1.7, 5.8))), calm)
    cam = Cam(up('c04'), lerp(768, 900, calm) + dx, lerp(1376, 1330, calm) + dy, z); fr = cam.render()
    if u < 0.16:  # whip in
        a = np.asarray(fr).astype(np.float32); k = int(60 * (1 - u / 0.16)) + 1
        a = sum(np.roll(a, i * 6, axis=1) for i in range(k)) / k; fr = Image.fromarray(a.astype(np.uint8))
    if calm > 0:  # the noise fades: soften and dim everything around her
        bl = fr.filter(ImageFilter.GaussianBlur(10 * calm)); y, x = np.mgrid[0:H:8, 0:W:8]
        cx, cy = cam.to_out(880, 1350); d = np.sqrt(((x - cx) / 520) ** 2 + ((y - cy) / 760) ** 2)
        m = Image.fromarray((np.clip(d - 0.55, 0, 1) * 255 * calm).astype(np.uint8)).resize((W, H), Image.BILINEAR)
        fr = Image.composite(bl.point(lambda v: int(v * (1 - 0.35 * calm))), fr, m)
    pop = 1.65
    if u > pop:
        k = eob(seg(u, pop, pop + 0.4)); rot = 0
        if 2.2 < u < 3.6: rot = 14 * ease(seg(u, 2.2, 2.5)) * (1 - ease(seg(u, 3.3, 3.6)))
        if u > 3.7: rot = -14 * ease(seg(u, 3.7, 4.0)) * (1 - ease(seg(u, 5.2, 5.5)))
        star_at(fr, cam, t, (488, 722), 132 * k, 2.0, 4, rot)
        sx_, sy_ = cam.to_out(*S2X((488, 722))); sparkles(fr, t, st_(4) + pop, sx_, sy_, 120, 8, 0.4, 34, 4)
    return fr, 0.4
def s5(t, u):
    img = connie_img('c05', t, 'c05_talk'); f = ease(seg(u, 2.2, 2.8))
    cam = Cam(img, lerp(1256, 888, f), lerp(1754, 1180, f), lerp(1.55, 1.25, f) + 0.03 * u / 5); fr = cam.render()
    bb = fill_green(fr, cam, green('c05'), screen('scan', seg(u, 0.3, 1.9), 80, 112))
    if bb: phone_pop(fr, t, st_(5) + 0.25, st_(5) + 2.45, screen('scan', seg(u, 0.3, 1.9), 80, 112), bb)
    return fr, 0.35
def s6(t, u):
    img = connie_img('c06', t, None); cam = Cam(img, 800, lerp(1420, 1380, ease(u / 4.4)), lerp(1.08, 1.32, ease(u / 4.4))); fr = cam.render()
    m = cam.mask(green('c06')); bb = m.getbbox()
    if bb:
        lcd = Image.new('RGB', (W, H), (14, 40, 30)); fr.paste(lcd, (0, 0), m)
        x0, y0, x1, y1 = bb; fs = max(10, int((x1 - x0) * 0.26)); d = ImageDraw.Draw(fr)
        d.text(((x0 + x1) / 2, (y0 + y1) / 2), '€31.40', font=font('Inter-Bold.ttf', fs), fill=(150, 255, 190), anchor='mm')
        sparkles(fr, t, st_(6) + 0.2, (x0 + x1) / 2, (y0 + y1) / 2, 140, 8, 0.5, 30, 6)
    return fr, 0.35
def s7(t, u):
    open_ = mouth_open('stranger', t); img = variant('c07', 'c07_talk', (564, 444)) if open_ else up('c07')
    f = ease(seg(u, 1.6, 2.2)); cam = Cam(img, lerp(560, 800, f), lerp(1900, 1250, f), lerp(1.5, 1.15, f) + 0.04 * u / 6); fr = cam.render()
    bb = fill_green(fr, cam, green('c07'), screen('gift'))
    if bb: phone_pop(fr, t, st_(7) + 0.1, st_(7) + 1.75, screen('gift'), bb)
    pop = 3.55
    if u > pop:
        k = eob(seg(u, pop, pop + 0.4)); star_at(fr, cam, t, (362, 350), 135 * k, 3.0, 8)
        sx_, sy_ = cam.to_out(*S2X((362, 350))); sparkles(fr, t, st_(7) + pop, sx_, sy_, 120, 8, 0.4, 32, 7)
    bokeh(fr, t, 6, g=0.15); return fr, 0.35
def s8(t, u):
    e = ease(u / 5.2); punch = 0.05 * math.exp(-max(0, u - 1.55) * 6) if u > 1.55 else 0
    cam = Cam(up('c08'), lerp(700, 860, e), lerp(1420, 1380, e), lerp(1.08, 1.2, e) + punch); fr = cam.render()
    sx_, sy_ = cam.to_out(*S2X((384, 860))); steam(fr, t, sx_, sy_, 160, 14, 0.2, 380)
    hop = 0
    if 1.5 < u < 2.1: v = (u - 1.5) / 0.6; hop = -math.sin(v * math.pi) * 70
    rot = 360 * ease(seg(u, 1.5, 2.1)) if u < 2.2 else 0
    star_at(fr, cam, t, (204, 1050), 150, 4.0, 6, rot, dy=hop * cam.k / 1.4)
    bokeh(fr, t, 6, (255, 200, 120), 0.14); return fr, 0.35
def s9(t, u):
    img = connie_img('c09', t, 'c09_talk'); f = ease(seg(u, 2.0, 2.6))
    cam = Cam(img, lerp(1300, 880, f), lerp(1540, 1420, f), lerp(1.5, 1.2, f) + 0.03 * u / 5); fr = cam.render()
    bb = fill_green(fr, cam, green('c09'), screen('recap'))
    if bb: phone_pop(fr, t, st_(9) + 0.1, st_(9) + 2.1, screen('recap'), bb)
    bokeh(fr, t, 8, (255, 190, 120), 0.18); return fr, 0.4
def s10(t, u):
    rep = math.sin(u * 2 * math.pi / 1.64) * 6
    cam = Cam(up('c10'), 820, lerp(1500, 1460, ease(u / 4.4)) + rep, lerp(1.06, 1.14, ease(u / 4.4))); fr = cam.render()
    fill_green(fr, cam, green('c10'), screen('mirror'))
    ph = (u % 0.82) / 0.82; hop = -abs(math.sin(ph * math.pi)) * 60; land = math.exp(-((ph) * 10)) + math.exp(-((1 - ph) * 10))
    sq = 1 + 0.18 * land
    star_at(fr, cam, t, (529, 1015), 150, 5.0, 0, 0, sq, 1 / sq, dy=hop * cam.k / 1.4)
    return fr, 0.35
def s11(t, u):
    k = 'bg11'
    if k not in _cache: _cache[k] = Cam(up('c10'), 820, 1460, 1.14).render().filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.45))
    fr = _cache[k].copy(); bokeh(fr, t, 16, (255, 170, 90), 0.3, (0, -40))
    out = ease(seg(u, 2.1, 2.5))
    if out < 1:
        s = eob(seg(u, 0, 0.35)) * (1 - out); scr = screen('move', seg(u, 0.1, 2.2), 31, 105)
        if s > 0.01: draw_phone(fr, scr, 540, 1150 + 300 * out, PHW * s)
    sparkles(fr, t, st_(11) + 0.5, 540, 1000, 330, 14, 0.8, 44, 11)
    if u > 1.6:  # power up
        v = seg(u, 1.6, 3.9); h = lerp(120, 560, ease(v)); y = lerp(1700, 1060, ease(seg(u, 1.6, 2.6)))
        gl = 1 + 2.4 * ease(v) + 0.4 * math.sin(u * 18) * v
        if v > 0.3:  # rays
            ry = Image.new('L', (900, 900), 0); d = ImageDraw.Draw(ry); a0 = u * 40
            for i in range(12):
                a = math.radians(a0 + i * 30); d.polygon([(450, 450), (450 + 460 * math.cos(a - 0.09), 450 + 460 * math.sin(a - 0.09)), (450 + 460 * math.cos(a + 0.09), 450 + 460 * math.sin(a + 0.09))], fill=int(110 * ease((v - 0.3) / 0.7)))
            ry = ry.filter(ImageFilter.GaussianBlur(14)); add(fr, Image.merge('RGB', [ry, ry.point(lambda q: q * 0.7), ry.point(lambda q: q * 0.3)]), 540 - 450, y - 450)
        draw_star(fr, 540, y + math.sin(u * 6) * 8, h, star_state(t, 1.0), 1, 1, math.sin(u * 3) * 6, gl)
        sparkles(fr, t, st_(11) + 3.0, 540, y, 380, 18, 1.0, 50, 12)
    fl = max(0, 1 - abs(u - 4.1) / 0.15)
    if fl > 0: fr = Image.blend(fr, Image.new('RGB', (W, H), (255, 240, 220)), fl * 0.85)
    return fr, 0.3
def s12(t, u):
    if u < 1.7:  # inside one cell
        cam = Cam(up('cell'), 768, 1376, lerp(1.0, 1.45, ease(u / 1.7))); fr = cam.render(); bokeh(fr, t, 12, (180, 140, 255), 0.25, (0, -20))
        h = lerp(90, 170, ease(u / 1.5)) + (500 * ease(seg(u, 1.45, 1.7))); draw_star(fr, 540, 1020, h, star_state(t, 2.0), 1, 1, 0, 1.3 + 1.5 * seg(u, 1.3, 1.7))
        fl = seg(u, 1.5, 1.7)
        if fl > 0: fr = Image.blend(fr, Image.new('RGB', (W, H), (255, 244, 230)), fl * 0.9)
        return fr, 0.35
    if u < 3.8:  # out into the galaxy
        v = u - 1.7; cam = Cam(up('galaxy'), 768 + 30 * math.sin(v), 1376, lerp(1.35, 1.05, ease(v / 2.1))); fr = cam.render()
        if v < 0.25: fr = Image.blend(Image.new('RGB', (W, H), (255, 244, 230)), fr, v / 0.25)
        bokeh(fr, t, 14, (200, 170, 255), 0.25, (0, -10))
        state = 'talk' if 0.5 < v < 1.0 else 'blink'
        draw_star(fr, 540, 1000 + math.sin(v * 3) * 14, 380 + 30 * math.sin(v * 2), state if v > 0.3 else 'base', 1, 1, math.sin(v * 1.5) * 10, 2.0)
        sparkles(fr, t, st_(12) + 1.7, 540, 1000, 460, 22, 1.8, 46, 13)
        if v > 1.85: fr = Image.blend(fr, Cam(up('c12s'), 768, 1376, 1.0).render(), ease((v - 1.85) / 0.25))
        return fr, 0.35
    v = u - 3.8; cam = Cam(up('c12s'), 768, lerp(1376, 1340, v / 1.6), lerp(1.0, 1.07, ease(v / 1.6))); fr = cam.render()
    bokeh(fr, t, 6, (150, 160, 255), 0.12, (0, -6)); return fr, 0.4
def s13(t, u):
    k = 'end'
    if k not in _cache:
        y = np.linspace(0, 1, H)[:, None]; c1 = np.array([28, 14, 54]); c2 = np.array([70, 30, 90])
        bg = (c1 + (c2 - c1) * (1 - np.abs(y - 0.45) * 1.8).clip(0, 1)[..., None]) * np.ones((1, W, 1))
        _cache[k] = Image.fromarray(bg.astype(np.uint8))
    fr = _cache[k].copy(); bokeh(fr, t, 16, (255, 170, 120), 0.25, (0, -18))
    a = ease(seg(u, 0, 0.35)); ic = Image.open('/home/sprite/lowispike/icon-512.png').convert('RGBA').resize((300, 300), Image.LANCZOS)
    m = Image.new('L', (300, 300), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 299, 299), 66, fill=int(255 * a)); ic.putalpha(ImageChops.multiply(ic.split()[3], m))
    s = 0.85 + 0.15 * eob(seg(u, 0, 0.45)); ic = ic.resize((int(300 * s), int(300 * s)), BIC); paste(fr, ic, 540 - ic.width / 2, 700 - ic.height / 2)
    d = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dd = ImageDraw.Draw(d)
    dd.text((540, 960), 'LOWiSPIKE', font=font('Inter-Black.ttf', 112), fill=(255, 255, 255, int(255 * a)), anchor='mm')
    b = ease(seg(u, 0.45, 0.8)); bw = 430; dd.rounded_rectangle((540 - bw / 2, 1080, 540 + bw / 2, 1180), 50, fill=(255, 150, 60, int(255 * b)))
    dd.text((540, 1131), 'link in bio', font=font('Inter-ExtraBold.ttf', 56), fill=(30, 14, 50, int(255 * b)), anchor='mm')
    fr.paste(d, (0, 0), d)
    draw_star(fr, 540 + 330, 520 + math.sin(u * 3) * 10, 130, 'blink' if blinking(u, 0.3) else 'base', 1, 1, math.sin(u * 2) * 8, 1.4, a)
    if u > 2.6: fr = Image.blend(fr, Image.new('RGB', (W, H), 0), ease((u - 2.6) / 0.4) * 0.6)
    return fr, 0.25

def render(fi):
    t = fi / FPS; fr, vig = scene(t); fr = fr.convert('RGB'); captions(fr, t); return finish(fr, t, vig)

if __name__ == '__main__':
    out = sys.argv[1]; a, b, step = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]) if len(sys.argv) > 4 else 1
    os.makedirs(out, exist_ok=True)
    for fi in range(a, b, step):
        render(fi).save(f'{out}/{fi:05d}.jpg', quality=93)
