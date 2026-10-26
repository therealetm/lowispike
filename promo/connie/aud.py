# Audio for the Connie promo: dialogue placement, self-made soft piano, SFX, ducking. All synthesized here (no samples, no rights issues).
import numpy as np, wave, json, subprocess, sys
sys.path.insert(0, '/home/sprite/PROMO4')
from tl import *
SR = 48000
N = int(TOTAL * SR)
rng = np.random.default_rng(7)

def rd(f):
    w = wave.open(f); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768; return a
def env_rms(a, win=480):
    return np.sqrt(np.convolve(a * a, np.ones(win) / win, 'same'))
def trim(a, th=0.012, pad=0.05):
    e = env_rms(a); i = np.nonzero(e > th)[0]; s = max(0, i[0] - int(pad * SR)); t = min(len(a), i[-1] + int(pad * SR)); return a[s:t]
def fade(a, ms=8):
    n = int(ms * SR / 1000); r = np.linspace(0, 1, n); a = a.copy(); a[:n] *= r; a[-n:] *= r[::-1]; return a

# ---------- dialogue ----------
clips = {}
for key, spk, st, caps in LINES:
    a = rd(f'/home/sprite/PROMO4/vo/{key}.wav')
    if key == 'stranger7':  # close the long pause after "Oh!" (measured: speech 0.19-0.47 s, then 1.58 s on)
        a = np.concatenate([a[:int(0.55 * SR)], np.zeros(int(0.12 * SR)), a[int(1.52 * SR):]])
    a = fade(trim(a))
    rms = np.sqrt((a[env_rms(a) > 0.012] ** 2).mean()); a = a * (0.12 / rms)
    pk = np.abs(a).max()
    if pk > 0.95: a = np.tanh(a / 0.95 * 1.2) * 0.95 / np.tanh(1.2)
    clips[key] = a

dlg = np.zeros(N); info = []; prev_end = 0
for key, spk, st, caps in LINES:
    a = clips[key]; s = int(st * SR); dlg[s:s + len(a)] += a
    d = len(a) / SR; info.append({'key': key, 'spk': spk, 'start': st, 'end': st + d, 'caps': caps})
    print(f'{key:10s} {st:5.2f}-{st + d:5.2f} ({d:.2f}s)', 'OVERLAP' if st < prev_end else '')
    prev_end = st + d

# caption timing by character share
capt = []
for it in info:
    tot = sum(len(c) for c in it['caps']); t = it['start']; dur = it['end'] - it['start']
    for j, c in enumerate(it['caps']):
        d = dur * len(c) / tot; capt.append([round(t, 3), round(t + d + (0.35 if j == len(it['caps']) - 1 else 0.0), 3), c]); t += d
for a, b, c in EXTRA_CAPS: capt.append([a, b, c])

# per-frame mouth envelope per speaker
nf = int(TOTAL * FPS); mouth = {k: [0.0] * nf for k in ('connie', 'star', 'stranger')}
for it in info:
    a = clips[it['key']]; s0 = int(it['start'] * SR)
    for f in range(int(it['start'] * FPS), min(nf, int(it['end'] * FPS) + 1)):
        i0 = int(f / FPS * SR) - s0; seg = a[max(0, i0 - 400): max(0, i0 + 1200)]
        if len(seg): mouth[it['spk']][f] = float(np.sqrt((seg ** 2).mean()))
json.dump({'lines': info, 'caps': capt, 'mouth': mouth}, open('/home/sprite/PROMO4/timing.json', 'w'))

# ---------- music: soft piano, F major, 72 bpm ----------
mus = np.zeros(N + SR * 4)
def note(f, t0, dur, vel=0.2, bright=1.0):
    n = int((dur + 1.6) * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for k in range(1, 8):
        fk = f * k * (1 + 0.0004 * k * k)
        y += (vel / k ** (1.6 - 0.3 * bright)) * np.sin(2 * np.pi * fk * t + rng.random()) * np.exp(-t * (0.9 + 0.55 * k))
    att = np.minimum(1, t / 0.006); rel = np.where(t > dur, np.exp(-(t - dur) * 5), 1); y *= att * rel
    s = int(t0 * SR); e = min(len(mus), s + n); mus[s:e] += y[:e - s]
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
beat = 60 / 72
prog = [(53, [65, 69, 72, 77]), (50, [62, 65, 69, 74]), (46, [62, 65, 70, 74]), (48, [64, 67, 72, 76])]  # F Dm Bb C
t = 0.0; bar = 0
while t < TOTAL - 4.5:
    root, ch = prog[bar % 4]; lift = t > 50.0
    note(midi(root - 12), t, beat * 3.6, 0.16)
    note(midi(root), t + 0.02, beat * 3.6, 0.07)
    pat = [0, 2, 1, 3, 2, 1, 3, 2]
    for i, p in enumerate(pat):
        m = ch[p] + (12 if (lift and i % 2 == 1) else 0)
        note(midi(m), t + i * beat / 2, beat * 0.9, 0.055 + (0.02 if i == 0 else 0), 1.2 if lift else 1.0)
    if t > 22 and bar % 2 == 1: note(midi(ch[3] + 12), t + beat * 3, beat * 1.2, 0.04, 1.3)
    t += beat * 4; bar += 1
# final resolving chord at the end card
for m, v in [(41, 0.16), (53, 0.08), (65, 0.06), (69, 0.06), (72, 0.06), (77, 0.05), (81, 0.04)]: note(midi(m), 59.6, 3.0, v, 1.2)
mus = mus[:N]
# simple reverb: convolve with decaying noise
ir_n = int(1.3 * SR); ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 4.5); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
def conv(x, h):
    L = len(x) + len(h) - 1; n = 1 << (L - 1).bit_length(); return np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(h, n), n)[:len(x)]
mus = mus + 0.35 * conv(mus, ir)

# ---------- SFX ----------
sfx = np.zeros(N)
def put(y, t0, g=1.0):
    s = int(t0 * SR); e = min(N, s + len(y)); sfx[s:e] += g * y[:e - s]
def lp(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))
def bp(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * ((f > lo) & (f < hi)), len(x))
def tone(f0, f1, dur, g=0.3, decay=8):
    t = np.arange(int(dur * SR)) / SR; f = np.linspace(f0, f1, len(t)); return g * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * decay) * np.minimum(1, t / 0.003)
def pop(): return tone(260, 980, 0.16, 0.35, 18)
def sparkle(n=7, dur=0.7):
    y = np.zeros(int((dur + 0.6) * SR))
    for i in range(n):
        f = rng.choice([1568, 1760, 2093, 2349, 2637, 3136]); s = int(rng.random() * dur * SR); b = tone(f, f, 0.5, 0.07, 9); y[s:s + len(b)] += b
    return y
def whoosh(dur=0.5, g=0.25):
    n = int(dur * SR); x = rng.standard_normal(n); e = np.sin(np.linspace(0, np.pi, n)) ** 2; return g * bp(x, 400, 3500) * e
# car ambience
amb = lp(rng.standard_normal(int(9.6 * SR)), 180) * 0.05; amb *= np.minimum(1, np.arange(len(amb)) / SR / 0.8); amb[-SR // 3:] *= np.linspace(1, 0, SR // 3); put(amb, 0)
# phone glow + pop out
put(tone(500, 1500, 0.6, 0.06, 2), 5.0); put(pop(), 5.45); put(sparkle(9, 0.6), 5.5)
put(tone(700, 700, 0.12, 0.08, 20), 11.9); put(tone(900, 900, 0.12, 0.08, 20), 12.4)
# noisy aisle: babble-ish noise + scanner beeps, fading as the companion appears
n4 = int(5.8 * SR); bab = np.zeros(n4)
for v in range(10):
    x = bp(rng.standard_normal(n4), 250 + 40 * v, 2800); m = np.abs(np.sin(np.cumsum(rng.uniform(2, 7, n4)) * 2 * np.pi / SR)) ** 2
    bab += x * m
bab *= 0.06
for k in range(9): put(tone(2350, 2350, 0.09, 0.07, 6), 14.3 + rng.random() * 1.9)
t4 = np.arange(n4) / SR; g4 = np.where(t4 < 1.6, 1.0, np.clip(1 - (t4 - 1.6) / 1.4, 0.06, 1)); g4[-SR // 2:] *= np.linspace(1, 0, SR // 2)
put(bab * g4 * np.minimum(1, t4 / 0.1), 14.2); put(whoosh(0.4, 0.2), 14.15)
put(pop(), 15.85); put(sparkle(6, 0.4), 15.9)
# scan beep, card beep
put(tone(2600, 2600, 0.11, 0.12, 4), 20.25); put(tone(1900, 1900, 0.08, 0.1, 6), 25.1); put(tone(2500, 2500, 0.1, 0.1, 6), 25.25)
# give a hand
put(sparkle(5, 0.5), 29.6); put(pop(), 33.0)
# kitchen sizzle + flip whoosh
sz = bp(rng.standard_normal(int(5.2 * SR)), 2500, 9000) * 0.02 * (1 + (rng.random(int(5.2 * SR)) > 0.9985) * 6); sz[:SR // 4] *= np.linspace(0, 1, SR // 4); sz[-SR // 4:] *= np.linspace(1, 0, SR // 4); put(sz, 35.4)
put(whoosh(0.35, 0.18), 36.5); put(whoosh(0.35, 0.18), 38.6)
# workout boings
for k in range(5): put(tone(220, 420, 0.18, 0.08, 12), 45.9 + k * 0.82)
# points + power up
put(tone(1046, 1046, 0.6, 0.12, 3), 50.35); put(tone(1318, 1318, 0.6, 0.11, 3), 50.47); put(tone(1568, 1568, 0.9, 0.11, 2.5), 50.59); put(sparkle(10, 0.8), 50.6)
r = np.arange(int(2.2 * SR)) / SR; riser = 0.05 * np.sin(2 * np.pi * np.cumsum(300 + 900 * (r / 2.2) ** 2) / SR) * (r / 2.2); put(riser, 51.6); put(whoosh(1.2, 0.12), 52.6); put(sparkle(14, 1.0), 53.6)
# cell to galaxy, sleep, end
put(tone(150, 600, 1.2, 0.06, 1.5), 54.2); put(whoosh(0.8, 0.2), 55.9); put(sparkle(16, 1.4), 56.0)
put(tone(784, 784, 1.6, 0.06, 1.2), 59.7); put(tone(1175, 1175, 1.6, 0.05, 1.2), 59.75)

# ---------- mix: duck music under dialogue ----------
de = env_rms(dlg, 2400); duck = np.clip(de / 0.03, 0, 1); k = np.ones(int(0.25 * SR)) / int(0.25 * SR); duck = np.convolve(duck, k, 'same')
mg = 0.55 * (1 - 0.55 * duck)
mix = dlg + mg * mus + 0.8 * sfx
mix[-int(1.2 * SR):] *= np.linspace(1, 0, int(1.2 * SR)) ** 0.5
mix = np.tanh(mix * 1.1) / 1.1
out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
w = wave.open('/home/sprite/PROMO4/mix_raw.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes()); w.close()
# loudness for TikTok / Reels: -14 LUFS, true peak -1.5 dB (two-pass)
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', '/home/sprite/PROMO4/mix_raw.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
j = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
af = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '/home/sprite/PROMO4/mix_raw.wav', '-af', af, '-ar', '48000', '-ac', '1', '/home/sprite/PROMO4/mix_n.wav'], check=True)
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', '/home/sprite/PROMO4/mix_n.wav', '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(r[r.rindex(' I:'):].split()[1]); g = -14.0 - I
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', '/home/sprite/PROMO4/mix_n.wav', '-af', f'volume={g:.2f}dB,alimiter=limit=0.84:level=false,aresample=48000', '-ac', '2', '/home/sprite/PROMO4/mix.wav'], check=True)
print('gain', round(g, 2))
print('loudness in', j['input_i'], 'done')
