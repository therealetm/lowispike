#!/usr/bin/env python3
"""Where each aura is drawn, measured: compares aura-fit.cjs screenshots of an aura against the plain one (dew) and prints,
per surface, how the changed pixels spread over rings measured in MEMBRANE radii (1.00 = the membrane): share inside the
membrane (<0.92), on it (0.92-1.10) and outside it (>1.10), and the radius holding the middle of the effect.
usage: aura-rings.py dir xp [dpr=2]"""
import sys, json
import numpy as np
from PIL import Image
d, xp = sys.argv[1], sys.argv[2]; dpr = float(sys.argv[3]) if len(sys.argv) > 3 else 2
geo = [g for g in json.load(open(d + '/geo.json')) if g.get('id') and str(g['xp']) == xp]
byid = {g['id']: g for g in geo}
def load(p):
    try: return np.asarray(Image.open(p).convert('RGB')).astype(int)
    except Exception: return None
def rings(a, b, cx, cy, mem):
    if a is None or b is None or a.shape != b.shape: return None
    ch = np.abs(a - b).sum(axis=2) > 60
    ys, xs = np.nonzero(ch)
    if not len(xs): return 'no visible change'
    r = np.hypot(xs / dpr - cx, ys / dpr - cy) / mem
    return f"inside {100*(r<.92).mean():4.0f}%  on membrane {100*((r>=.92)&(r<=1.1)).mean():4.0f}%  outside {100*(r>1.1).mean():4.0f}%  median {np.median(r):.2f}  p90 {np.percentile(r,90):.2f}  px {len(xs)}"
base = byid.get('dew')
for g in geo:
    if g['id'] == 'dew': continue
    b = g['bubble']; m = round(b['w'] * .45)
    mem = b['w'] / 2 * (1.08 if g.get('live') else 1.0)
    home = rings(load(f"{d}/home-{xp}-{g['id']}.png"), load(f"{d}/home-{xp}-dew.png"), b['w'] / 2 + min(m, b['x']), b['h'] / 2 + min(m, b['y']), mem)
    card = None
    if g.get('card') and base and base.get('card'):
        a = g['card']['art']; card = rings(load(f"{d}/card-{xp}-{g['id']}.png"), load(f"{d}/card-{xp}-dew.png"), a[2] / 2 + min(40, a[0]), a[3] / 2 + min(40, a[1]), 48)
    print(f"{g['id']:9s} fx={g['fx'] or '-':8s} HOME {home}\n{'':20s} CARD {card}")
