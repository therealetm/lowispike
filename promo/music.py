# Light, original background bed (made here from scratch, so no rights issues): soft pad + pluck arpeggio + gentle kick.
import numpy as np, wave, sys
SR=44100; BPM=112; beat=60/BPM; DUR=float(sys.argv[1]) if len(sys.argv)>1 else 48
N=int(SR*DUR); out=np.zeros(N)
t_all=np.arange(N)/SR
def note(f): return 440*2**((f-69)/12)
# I-V-vi-IV in C major, one chord per bar (4 beats)
chords=[[60,64,67,72],[55,59,62,67],[57,60,64,69],[53,57,60,65]]
bar=4*beat
def env(n,a,d):
    t=np.arange(n)/SR; e=np.minimum(1,t/a)*np.exp(-t/d); return e
# pad
for b in range(int(DUR/bar)+1):
    s=int(b*bar*SR); n=int(bar*SR*1.05); n=min(n,N-s)
    if n<=0: break
    t=np.arange(n)/SR; ch=chords[b%4]; w=np.zeros(n)
    for m in ch:
        f=note(m-12)
        for det in (-0.12,0.12):
            w+=np.sin(2*np.pi*f*(1+det/100)*t)+0.25*np.sin(2*np.pi*2*f*t)
    a=np.minimum(1,t/0.35)*np.minimum(1,(n/SR-t)/0.35)
    out[s:s+n]+=0.018*w*a
# pluck arpeggio, eighth notes
pat=[0,1,2,3,2,1,2,3]
for i in range(int(DUR/(beat/2))):
    s=int(i*beat/2*SR); b=int((i*beat/2)//bar); ch=chords[b%4]
    m=ch[pat[i%8]]+12; n=int(0.5*SR); n=min(n,N-s)
    if n<=0: break
    t=np.arange(n)/SR; f=note(m)
    w=(np.sin(2*np.pi*f*t)+0.3*np.sin(2*np.pi*2*f*t)+0.1*np.sin(2*np.pi*3*f*t))*np.exp(-t/0.16)*np.minimum(1,t/0.004)
    out[s:s+n]+=0.05*w
# soft kick on beats, light hat on offbeats
rng=np.random.default_rng(1)
for i in range(int(DUR/beat)):
    s=int(i*beat*SR); n=min(int(0.25*SR),N-s)
    if n<=0: break
    t=np.arange(n)/SR; f=55+70*np.exp(-t/0.03)
    out[s:s+n]+=0.16*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/0.09)
    s2=int((i+0.5)*beat*SR); n2=min(int(0.05*SR),N-s2)
    if n2>0:
        hh=rng.standard_normal(n2); hh=np.diff(np.concatenate([[0],hh])); out[s2:s2+n2]+=0.012*hh*np.exp(-np.arange(n2)/SR/0.012)
# fade in/out
fi=int(0.6*SR); fo=int(2.5*SR)
out[:fi]*=np.linspace(0,1,fi); out[-fo:]*=np.linspace(1,0,fo)
out=out/np.max(np.abs(out))*0.8
st=np.stack([out,np.roll(out,int(0.012*SR))],1)
wv=wave.open('/home/sprite/PROMO/music.wav','wb'); wv.setnchannels(2); wv.setsampwidth(2); wv.setframerate(SR)
wv.writeframes((st*32767).astype(np.int16).tobytes()); wv.close(); print('music ok',DUR)
