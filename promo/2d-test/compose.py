#!/usr/bin/env python3
"""Join the 2D cartoon (cart/) and the real app recording (rec/) into out/frames at 1080x1920, 30 fps,
with tap circles drawn where the real taps happened. Writes plan.json for audio.py."""
import json, os, shutil
from PIL import Image, ImageDraw
D = '/home/sprite/PROMO6/'
FPS = 30
R = json.load(open(D + 'rec/meta.json'))
TL = json.load(open(D + 'timeline.json'))
OUT = D + 'out/frames/'; shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
cart = sorted(x for x in os.listdir(D + 'cart') if x.endswith('.png'))
APP_START = int(os.environ.get('APP_START', 6))        # skip the first home frames (the cartoon already pushed into the phone)
reveal_end = R['revealAt'] + int(os.environ.get('AFTER', 82))
app = list(range(APP_START, min(R['frames'], reveal_end)))
dpr = R['meta']['dpr']

n = 0
for fn in cart:
    os.symlink(D + 'cart/' + fn, OUT + f'{n:05d}.png'); n += 1
cut = n / FPS
tap_frames = {t['f']: t for t in R['taps']}
taps_out = []
for k, f in enumerate(app):
    im = Image.open(D + f'rec/f{f:04d}.png').convert('RGB')
    sx, sy = 1080 / im.width, 1920 / im.height
    im = im.resize((1080, 1920), Image.LANCZOS)
    # tap circle: appears on the tap frame, ripples out over 0.45 s
    ov = Image.new('RGBA', im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for tf, t in tap_frames.items():
        age = f - tf
        if 0 <= age < 14:
            x, y = t['x'] * dpr * sx, t['y'] * dpr * sy; q = age / 14
            r0 = 34 + 10 * min(1, age / 3); a = int(200 * (1 - q) if age > 2 else 200)
            d.ellipse([x - r0, y - r0, x + r0, y + r0], fill=(255, 255, 255, int(a * 0.45)), outline=(255, 255, 255, a), width=6)
            r1 = 34 + 90 * q; d.ellipse([x - r1, y - r1, x + r1, y + r1], outline=(255, 255, 255, int(150 * (1 - q))), width=4)
            if age == 0: taps_out.append(cut + k / FPS)
    im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
    im.save(OUT + f'{n:05d}.png', compress_level=1); n += 1
total = n / FPS
reveal_t = cut + (R['revealAt'] - APP_START) / FPS
plan = {'total': round(total + 0.25, 3), 'cut': round(cut, 3), 'buzz': [4.05], 'pop': [5.1], 'dive': [7.96],
        'taps': [round(x, 3) for x in taps_out], 'spin': [round(reveal_t, 3), round(reveal_t + float(os.environ.get('SPIN', 1.45)), 3)], 'frames': n}
json.dump(plan, open(D + 'plan.json', 'w'), indent=1)
print(json.dumps(plan))
