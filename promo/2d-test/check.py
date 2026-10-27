#!/usr/bin/env python3
"""Per-frame measurement checks for the 2D cartoon part (reads cart/states.json written by render.cjs).
Boxes are [x, y, w, h] in 1080x1920 video pixels."""
import json, sys
d = json.load(open('/home/sprite/PROMO6/cart/states.json'))
TL = json.load(open('/home/sprite/PROMO6/timeline.json'))
S = d['states']
W, H = 1080, 1920
fails = []

def ov(a, b, pad=0):
    if not a or not b: return False
    return a[0] - pad < b[0] + b[2] and b[0] - pad < a[0] + a[2] and a[1] - pad < b[1] + b[3] and b[1] - pad < a[1] + a[3]

def inside(a, b, pad=0):
    return a[0] >= b[0] - pad and a[1] >= b[1] - pad and a[0] + a[2] <= b[0] + b[2] + pad and a[1] + a[3] <= b[1] + b[3] + pad

def centre(b): return (b[0] + b[2] / 2, b[1] + b[3] / 2)

def speaking(who, t):
    for w, fn, t0 in TL['lines']:
        pass
    return any(c['who'] == who and c['t0'] - 0.05 <= t <= c['t1'] + 0.05 for c in TL['caps'])

prev = None
first_comp = None
for s in S:
    f, t = s['f'], s['t']
    def bad(m): fails.append(f'f{f:03d} t={t:.2f}: {m}')
    # hands: exactly one pair, left always on the wheel
    if s['handsVisible'] != 2 or len(s['handBoxes']) != 2: bad(f"hands visible = {s['handsVisible']}")
    if s['hands']['left'] != 'wheel': bad('left hand left the wheel')
    # phone and right hand agree
    if s['phone'] == 'in right hand':
        if s['hands']['right'] != 'phone': bad('phone in hand but right hand not holding it')
        elif not ov(s['handBoxes'][1], s['phoneBox'], pad=12): bad('right hand not touching phone')
    if s['hands']['right'] == 'phone' and s['phone'] != 'in right hand': bad('right hand holds phone that is not there')
    # face: mouth inside the face, below both eyes
    fb, mb = s['faceBox'], s['mouthBox']
    if not inside(mb, fb, pad=4): bad('mouth outside face')
    for e in s['eyeBoxes']:
        if mb[1] < e[1] + e[3] * 0.6: bad('mouth not below eyes')
        if not inside(e, s['headBox'], pad=4): bad('eye outside head')
    mx = centre(mb)[0]; fx = centre(fb)[0]
    if abs(mx - fx) > fb[2] * 0.22: bad(f'mouth off-centre by {mx-fx:.0f}px')
    # mouth only moves while Connie speaks
    if s['mv'] > 0.25 and not speaking('connie', t): bad(f"Connie's mouth moving (mv {s['mv']}) while she isn't speaking")
    # caption: one line, whole sentence, inside frame, never over the face/head
    if s['cap']:
        cb = s['capBox']
        if not cb: bad('caption without box')
        else:
            if cb[3] > 110: bad('caption taller than one line')
            if cb[0] < 40 or cb[0] + cb[2] > W - 40: bad('caption outside safe area')
            if ov(cb, s['faceBox'], pad=24): bad('caption covers face')
            if s['headBox'][1] > 0 and ov(cb, s['headBox'], pad=8): bad('caption covers head')
        if not s['cap'].endswith(('.', '!', '?')): bad('caption not a whole sentence')
    # companion
    if isinstance(s['comp'], dict):
        c = s.get('compBox')
        if first_comp is None:
            first_comp = f
            if s['phone'] != 'in right hand': bad('companion appears before phone is in hand')
            # must emerge from the phone
            if not ov(c, s['phoneBox'], pad=60): bad('companion does not start at the phone')
        # face is an oval: test the companion's real box against the ellipse inscribed in faceBox
        fb = s['faceBox']; ex, ey = fb[0] + fb[2] / 2, fb[1] + fb[3] / 2; ra, rb = fb[2] / 2, fb[3] / 2
        nx = min(max(ex, c[0]), c[0] + c[2]); ny = min(max(ey, c[1]), c[1] + c[3])
        if ((nx - ex) / ra) ** 2 + ((ny - ey) / rb) ** 2 < 1.0: bad('companion covers face')
        if c[1] + c[3] < fb[1] and c[0] < fb[0] + fb[2] and c[0] + c[2] > fb[0]: bad('companion flies above face')
        if c[0] < 0 or c[0] + c[2] > W or c[1] < 0 or c[1] + c[3] > H: bad('companion leaves frame')
        if s['cap'] and s['capBox'] and ov(c, s['capBox']): bad('companion under caption')
    # continuity: no big jumps between frames (head)
    if prev is not None:
        dx = abs(centre(s['headBox'])[0] - centre(prev['headBox'])[0]); dy = abs(centre(s['headBox'])[1] - centre(prev['headBox'])[1])
        if (dx > 40 or dy > 40) and t < 8.0: bad(f'head jumps {dx:.0f},{dy:.0f}px')
    prev = s

# caption timing: never two captions at once
C = TL['caps']
for a, b in zip(C, C[1:]):
    if b['t0'] < a['t1']: fails.append(f"caption overlap: '{a['text']}' ends {a['t1']} after '{b['text']}' starts {b['t0']}")

print(f'frames checked: {len(S)}; companion first seen frame {first_comp}; failures: {len(fails)}')
for m in fails[:60]: print(' ', m)
sys.exit(1 if fails else 0)
