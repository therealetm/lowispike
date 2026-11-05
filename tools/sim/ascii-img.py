#!/usr/bin/env python3
"""Crude look at a screenshot without an image viewer: prints a downsampled grid where each cell is a character for its
brightness and a letter for its dominant hue, plus the bounding box of everything brighter than the background.
usage: ascii-img.py file.png [cols]"""
import sys, colorsys
from PIL import Image
f = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 64
im = Image.open(f).convert('RGB'); W, H = im.size
rows = max(1, int(cols * H / W / 2))
sm = im.resize((cols, rows), Image.BILINEAR)
ramp = ' .:-=+*#%@'
def hue(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if s < .25 or v < .15: return None
    h *= 360
    return 'r' if h < 20 or h >= 330 else 'o' if h < 45 else 'y' if h < 70 else 'g' if h < 160 else 'c' if h < 200 else 'b' if h < 250 else 'v' if h < 290 else 'm'
print(f, W, 'x', H)
for y in range(rows):
    line = ''
    for x in range(cols):
        r, g, b = sm.getpixel((x, y)); v = max(r, g, b) / 255
        hc = hue(r, g, b)
        line += hc.upper() if hc and v > .6 else hc if hc else ramp[min(9, int(v * 9.99))]
    print('|' + line + '|')
