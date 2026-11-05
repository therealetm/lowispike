#!/usr/bin/env python3
"""Reads fx-px.cjs output. Per aura and surface: where the aura layer's lit pixels are, in membrane radii (1.00 = membrane;
Home with the 3D world on: 1.08 x the bubble's half width, card 48 px, preview 45 px), and the share of the effect lying over
Misty's own drawn body.  usage: fx-px.py dir [dpr=3]"""
import sys, json
import numpy as np
from PIL import Image
d = sys.argv[1]; dpr = float(sys.argv[2]) if len(sys.argv) > 2 else 3
def ld(p):
    try: return np.asarray(Image.open(p).convert('RGB')).astype(int)
    except Exception: return None
def stat(name, info, mem):
    fx, body = ld(f'{d}/{name}-fx.png'), ld(f'{d}/{name}-body.png')
    if fx is None: return 'missing'
    b, c = info['box'], info['clip']
    cx = (b['x'] + b['w'] / 2 - c['x']) * dpr; cy = (b['y'] + b['h'] / 2 - c['y']) * dpr
    lit = fx.max(axis=2) > 40
    ys, xs = np.nonzero(lit)
    if not len(xs): return 'nothing drawn'
    r = np.hypot(xs - cx, ys - cy) / (mem * dpr)
    over = 0.0
    if body is not None and body.shape == fx.shape:
        bm = body.max(axis=2) > 28
        over = 100 * (lit & bm).sum() / max(1, lit.sum())
    rb = np.percentile(np.hypot(*(np.nonzero(body.max(axis=2) > 28)[::-1] - np.array([[cx], [cy]]))), 99.5) / (mem * dpr) if body is not None and (body.max(axis=2) > 28).any() else 0
    return f'[in her reach: median {np.median(r)/rb if rb else 0:.2f} p5 {np.percentile(r,5)/rb if rb else 0:.2f}] inside {100*(r<.92).mean():3.0f}%  on {100*((r>=.92)&(r<=1.12)).mean():3.0f}%  outside {100*(r>1.12).mean():3.0f}% | median {np.median(r):.2f} p5 {np.percentile(r,5):.2f} p95 {np.percentile(r,95):.2f} | over her body {over:4.1f}%'
for m in json.load(open(d + '/meta.json')):
    if m.get('home'):
        mem = m['home']['box']['w'] / 2 * (1.08 if m['live'] else 1)
        print(f"{m['id']:9s} HOME    {stat('home-' + m['id'], m['home'], mem)}")
    if m.get('card'): print(f"{'':9s} CARD    {stat('card-' + m['id'], m['card'], 48)}")
    if m.get('preview'): print(f"{m['id']:9s} PREVIEW {stat('pv-' + m['id'], m['preview'], 45)}")
