#!/usr/bin/env python3
"""Radial profile of a screenshot around a centre: per ring (in CSS px), mean brightness, mean saturation and the share of
strongly coloured pixels, so 'where is the aura drawn' can be measured instead of guessed.
usage: radial.py img.png cx cy [dpr=2] [step=6] [max=140]  (cx, cy in CSS px inside the image)
       radial.py a.png cx cy dpr step max --diff b.png   (what a differs from b, per ring: the effect alone)"""
import sys, math, colorsys
from PIL import Image
import numpy as np
a = sys.argv[1:]
diff = None
if '--diff' in a: i = a.index('--diff'); diff = a[i + 1]; a = a[:i] + a[i + 2:]
f, cx, cy = a[0], float(a[1]), float(a[2])
dpr = float(a[3]) if len(a) > 3 else 2; step = float(a[4]) if len(a) > 4 else 6; mx = float(a[5]) if len(a) > 5 else 140
im = np.asarray(Image.open(f).convert('RGB')).astype(float)
H, W, _ = im.shape
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot(xx / dpr - cx, yy / dpr - cy)
if diff:
    im2 = np.asarray(Image.open(diff).convert('RGB')).astype(float)
    d = np.abs(im - im2).sum(axis=2)
    print('ring_px  changed%  meanDelta')
    k = 0
    while k < mx:
        m = (r >= k) & (r < k + step)
        if m.sum(): print(f'{int(k):3d}-{int(k+step):3d}  {100*(d[m]>40).mean():6.1f}  {d[m].mean():6.1f}')
        k += step
    sys.exit()
mxc = im.max(axis=2); mnc = im.min(axis=2)
sat = np.where(mxc > 0, (mxc - mnc) / np.maximum(mxc, 1), 0)
print('ring_px  bright  sat  colourful%')
k = 0
while k < mx:
    m = (r >= k) & (r < k + step)
    if m.sum():
        col = ((sat > .45) & (mxc > 110))[m].mean() * 100
        print(f'{int(k):3d}-{int(k+step):3d}  {mxc[m].mean():6.1f}  {sat[m].mean():.2f}  {col:5.1f}')
    k += step
