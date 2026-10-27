#!/usr/bin/env python3
"""Self-made sound for the 2D test: soft piano bed, rain in the car, phone buzz, companion pop + dive, UI taps,
shuffle ticks and a reveal chime. Dialogue on top, music ducked under every line. Reads plan.json."""
import json, wave, numpy as np
SR = 48000
D = '/home/sprite/PROMO6/'
P = json.load(open(D + 'plan.json')); TL = json.load(open(D + 'timeline.json'))
T = P['total']; N = int(SR * T)
rng = np.random.default_rng(3)

def rd(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    if w.getnchannels() == 2: a = a.reshape(-1, 2).mean(1)
    assert w.getframerate() == SR; return a

def add(buf, sig, t0, g=1.0):
    i = int(SR * t0)
    if i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += g * sig[:j - i]

def lp(x, a):  # one-pole low-pass
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)): s += a * (x[i] - s); y[i] = s
    return y

# ---------- music: soft piano, I-V-vi-IV in C, 76 bpm ----------
mus = np.zeros(N)
m = lambda k: 440 * 2 ** ((k - 69) / 12)
def note(f, t0, dur, amp):
    n = int(SR * dur); t = np.arange(n) / SR
    env = np.minimum(1, t / 0.008) * np.exp(-t * 2.2)
    s = sum(a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (0.6 * h)) for h, a in [(1, 1), (2, 0.42), (3, 0.18), (4, 0.08)])
    add(mus, amp * env * s, t0)
chords = [[48, 55, 64, 67], [43, 55, 62, 67], [45, 57, 60, 64], [41, 53, 60, 65]]
arp = [0, 2, 3, 2, 1, 2, 3, 2]; beat = 60 / 76; t = 0.0; c = 0
while t < T:
    ch = chords[c % 4]
    note(m(ch[0] - 12 if ch[0] > 45 else ch[0]), t, 4 * beat * 1.4, 0.16)
    for b, k in enumerate(arp): note(m(ch[k] + 12), t + b * beat / 2, beat * 2.2, 0.075 if b % 2 else 0.1)
    t += 4 * beat; c += 1
rev = mus.copy()
for d, g in [(0.083, 0.32), (0.131, 0.25), (0.197, 0.19), (0.29, 0.13), (0.41, 0.08)]:
    k = int(SR * d); rev[k:] += g * mus[:-k]
mus = rev / (np.abs(rev).max() + 1e-9)
fi, fo = int(SR * 0.8), int(SR * 1.2); mus[:fi] *= np.linspace(0, 1, fi); mus[-fo:] *= np.linspace(1, 0, fo)

# ---------- dialogue ----------
vo = np.zeros(N); duck = np.zeros(N)
for who, fn, t0 in TL['lines']:
    a = rd(D + 'vo/' + fn); add(vo, a, t0, 1.0)
    i, j = int(SR * (t0 - 0.12)), min(N, int(SR * (t0 + len(a) / SR + 0.15))); duck[max(0, i):j] = 1
k = int(SR * 0.15); duck = np.convolve(duck, np.ones(k) / k, 'same')
music_gain = 0.22 * (1 - 0.6 * duck)

# ---------- sound effects ----------
fx = np.zeros(N)
cut = P['cut']
# rain on the car roof / glass, only in the car scene
r = rng.standard_normal(int(SR * cut)); r = lp(r, 0.18) - lp(r, 0.02)
drops = np.zeros_like(r)
for _ in range(int(cut * 22)):
    i = rng.integers(0, len(r) - 800); n = 600; tt = np.arange(n) / SR
    drops[i:i + n] += rng.uniform(0.2, 0.6) * np.sin(2 * np.pi * rng.uniform(1800, 3800) * tt) * np.exp(-tt * 260)
rain = (r * 0.5 + drops * 0.35); rain /= np.abs(rain).max() + 1e-9
fe = int(SR * 0.4); rain[-fe:] *= np.linspace(1, 0, fe)
add(fx, rain, 0, 0.10)
# phone buzz (two short buzzes)
for b in P['buzz']:
    for o in (0.0, 0.22):
        n = int(SR * 0.16); tt = np.arange(n) / SR
        s = np.sign(np.sin(2 * np.pi * 150 * tt)) * 0.5 + np.sin(2 * np.pi * 300 * tt) * 0.3
        s = lp(s, 0.25) * np.minimum(1, tt / 0.01) * np.minimum(1, (tt[-1] - tt) / 0.02)
        add(fx, s, b + o, 0.32)
# companion pop: rising bloop + sparkle
for p in P['pop']:
    n = int(SR * 0.28); tt = np.arange(n) / SR; f = 320 + 900 * (tt / tt[-1]) ** 0.6
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
    add(fx, s, p, 0.30)
    for q, fq in enumerate([1568, 2093, 2637, 3136]):
        n2 = int(SR * 0.5); t2 = np.arange(n2) / SR
        add(fx, np.sin(2 * np.pi * fq * t2) * np.exp(-t2 * 8), p + 0.06 + q * 0.05, 0.05)
# companion dives back in: falling bloop
for p in P['dive']:
    n = int(SR * 0.3); tt = np.arange(n) / SR; f = 1100 - 800 * (tt / tt[-1]) ** 0.8
    add(fx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7), p, 0.26)
# soft whoosh into the app
n = int(SR * 0.45); w = lp(rng.standard_normal(n), 0.08); w *= np.sin(np.linspace(0, np.pi, n)) ** 2
add(fx, w / (np.abs(w).max() + 1e-9), cut - 0.25, 0.16)
# UI taps
for tp in P['taps']:
    n = int(SR * 0.05); tt = np.arange(n) / SR
    add(fx, (np.sin(2 * np.pi * 1900 * tt) + 0.4 * rng.standard_normal(n) * np.exp(-tt * 300)) * np.exp(-tt * 120), tp, 0.18)
# shuffle reel ticks, slowing down, then the reveal chime
if P.get('spin'):
    s0, s1 = P['spin']; tt = s0; gap = 0.045
    while tt < s1 - 0.05:
        n = int(SR * 0.025); x = np.arange(n) / SR
        add(fx, np.sin(2 * np.pi * 2600 * x) * np.exp(-x * 220), tt, 0.10)
        tt += gap; gap *= 1.09
    for q, fq in enumerate([784, 988, 1175, 1568]):
        n2 = int(SR * 0.9); x = np.arange(n2) / SR
        add(fx, (np.sin(2 * np.pi * fq * x) + 0.3 * np.sin(4 * np.pi * fq * x)) * np.exp(-x * 4), s1 + q * 0.06, 0.07)

mix = mus * music_gain + vo * 0.95 + fx
mix /= max(1.0, np.abs(mix).max() / 0.95)
st = np.stack([mix, mix], 1)
w = wave.open(D + 'mix.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes()); w.close()
print('mix', T, 'peak', float(np.abs(mix).max()))
