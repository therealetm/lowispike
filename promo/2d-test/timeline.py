"""PROMO6 timeline: where each spoken line sits, and a per-frame mouth-open value from each line's real audio (30 fps)."""
import json, wave, numpy as np
FPS = 30
VO = '/home/sprite/PROMO6/vo/'
# (who, file, start time in the video, caption sentences with (from, to) inside the file)
LINES = [
    ('connie', 'c1.wav', 0.35, [("I'm starving.", 0.0, 1.40)]),
    ('connie', 'c2.wav', 1.75, [("And healthy food is so expensive.", 0.0, 2.30)]),
    ('comp', 'comp.wav', 5.70, [("Hey, don't worry about it.", 0.0, 1.15), ("Let's find you dinner.", 1.25, 2.25)]),
]
DUR = 12.0
N = int(DUR * FPS)

def load(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a, w.getframerate()

mouth = {'connie': np.zeros(N), 'comp': np.zeros(N)}
caps = []
for who, f, t0, sents in LINES:
    a, sr = load(VO + f)
    hop = sr // FPS
    rms = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
    if rms.max() > 0: rms = rms / np.percentile(rms[rms > 0.01], 90) if (rms > 0.01).any() else rms
    rms = np.clip(rms, 0, 1.2)
    k = int(round(t0 * FPS))
    for i, v in enumerate(rms):
        if 0 <= k + i < N: mouth[who][k + i] = max(mouth[who][k + i], float(v))
    for txt, s0, s1 in sents:
        caps.append({'who': who, 'text': txt, 't0': round(t0 + s0 + 0.03, 3), 't1': round(t0 + s1 + 0.12, 3)})
# light smoothing so the mouth does not flicker frame to frame
for k in mouth:
    m = mouth[k]; sm = m.copy()
    for i in range(1, N): sm[i] = max(m[i], sm[i - 1] * 0.55)
    mouth[k] = [round(float(x), 3) for x in sm]
json.dump({'fps': FPS, 'dur': DUR, 'n': N, 'mouth': mouth, 'caps': caps, 'lines': [(w, f, t0) for w, f, t0, _ in LINES]}, open('/home/sprite/PROMO6/timeline.json', 'w'))
print(json.dumps(caps, indent=1))
for k in mouth: print(k, 'talking frames', sum(1 for x in mouth[k] if x > 0.15))
