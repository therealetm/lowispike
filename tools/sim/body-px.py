#!/usr/bin/env python3
"""Reads body-px.cjs output: for each form, the painted body's reach from the bubble centre (in bubble radii) at the
99.5th percentile and the max, its centroid offset, and the share of body pixels outside 1.0 R (clipped today) and outside
the 3D membrane at 1.08 R.  usage: body-px.py outdir [dpr=3]"""
import sys, json
import numpy as np
from PIL import Image
d = sys.argv[1]; dpr = float(sys.argv[2]) if len(sys.argv) > 2 else 3
for m in json.load(open(d + '/meta.json')):
    im = np.asarray(Image.open(f"{d}/body-{m['xp']}.png").convert('RGB')).astype(int)
    lit = im.max(axis=2) > 28
    ys, xs = np.nonzero(lit)
    if not len(xs): print(m['xp'], 'no pixels'); continue
    b = m['bubble']; c = m['clip']; R = b['w'] / 2
    cx = (b['x'] + R - c['x']) * dpr; cy = (b['y'] + R - c['y']) * dpr
    r = np.hypot(xs - cx, ys - cy) / (R * dpr)
    print(f"xp {m['xp']:>6} stage {m['st']}: reach max {r.max():.2f}R p99.5 {np.percentile(r, 99.5):.2f}R | centroid dx {(xs.mean()-cx)/(R*dpr):+.2f}R dy {(ys.mean()-cy)/(R*dpr):+.2f}R | bbox {(xs.min()-cx)/(R*dpr):+.2f}..{(xs.max()-cx)/(R*dpr):+.2f} x {(ys.min()-cy)/(R*dpr):+.2f}..{(ys.max()-cy)/(R*dpr):+.2f} | outside 1.0R {100*(r>1).mean():.2f}% outside 0.92R {100*(r>.92).mean():.2f}%")
