#!/usr/bin/env python3
"""Plain dark iOS startup images (Oct 21 2026, launch white flash fix).

iOS shows apple-touch-startup-image while a home-screen web app loads, and plain white when none matches the device.
Emmanuel wants no splash, so these are the brand background colour only: no logo, no wordmark, no Misty.
Writes startup/launch-<w>x<h>.png and prints the <link> tags for index.html <head>.
Run: python3 tools/brand/make-startup-images.py
"""
import os
from PIL import Image

BG = (0x03, 0x05, 0x0a)  # #03050a, the same as theme-color, manifest background_color and the first paint
# (css width, css height, device pixel ratio, ipad)
DEVICES = [
    (320, 568, 2, False),   # iPhone SE (1st gen), iPod touch
    (375, 667, 2, False),   # iPhone 6/7/8, SE (2nd/3rd gen)
    (414, 736, 3, False),   # iPhone 6/7/8 Plus
    (375, 812, 3, False),   # iPhone X/XS/11 Pro/12 mini/13 mini
    (414, 896, 2, False),   # iPhone XR/11
    (414, 896, 3, False),   # iPhone XS Max/11 Pro Max
    (390, 844, 3, False),   # iPhone 12/13/14, 12/13 Pro, 16e
    (428, 926, 3, False),   # iPhone 12/13 Pro Max, 14 Plus
    (393, 852, 3, False),   # iPhone 14 Pro, 15, 15 Pro, 16
    (430, 932, 3, False),   # iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus
    (402, 874, 3, False),   # iPhone 16 Pro, 17, 17 Pro
    (440, 956, 3, False),   # iPhone 16 Pro Max, 17 Pro Max
    (420, 912, 3, False),   # iPhone Air
    (768, 1024, 2, True),   # iPad 9.7", iPad mini 2-5
    (744, 1133, 2, True),   # iPad mini 6/7
    (810, 1080, 2, True),   # iPad 10.2"
    (820, 1180, 2, True),   # iPad Air 4/5, iPad 10/11
    (834, 1112, 2, True),   # iPad Air 3, iPad Pro 10.5"
    (834, 1194, 2, True),   # iPad Pro 11"
    (834, 1210, 2, True),   # iPad Pro 11" (M4)
    (1024, 1366, 2, True),  # iPad Pro 12.9"
    (1032, 1376, 2, True),  # iPad Pro 13" (M4), iPad Air 13"
]

def main():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
    out = os.path.join(root, 'startup')
    os.makedirs(out, exist_ok=True)
    links = []
    for w, h, r, ipad in DEVICES:
        shapes = [('portrait', w * r, h * r)] + ([('landscape', h * r, w * r)] if ipad else [])
        for orient, pw, ph in shapes:
            name = 'startup/launch-%dx%d.png' % (pw, ph)
            Image.new('RGB', (pw, ph), BG).save(os.path.join(root, name), optimize=True)
            links.append('<link rel="apple-touch-startup-image" media="(device-width: %dpx) and (device-height: %dpx) and '
                         '(-webkit-device-pixel-ratio: %d) and (orientation: %s)" href="%s">' % (w, h, r, orient, name))
    print('\n'.join(links))

if __name__ == '__main__':
    main()
