import sys, subprocess, numpy as np
from faster_whisper import WhisperModel
m=WhisperModel(sys.argv[1],device="cpu",compute_type="int8")
for f in sys.argv[2:]:
    raw=subprocess.run(["ffmpeg","-v","quiet","-i",f,"-f","s16le","-ac","1","-ar","16000","-"],capture_output=True).stdout
    a=np.frombuffer(raw,np.int16).astype(np.float32)/32768
    segs,info=m.transcribe(a,beam_size=1)
    print(f, info.language, round(info.language_probability,2), "|", " ".join(s.text.strip() for s in segs), flush=True)
