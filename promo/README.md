# LOWiSPIKE promo video (Reels/TikTok) + Quick tour source

- `h/rec2.cjs` records each scene frame-by-frame in WebKit iPhone 13 (390x664 viewport, 3x) with fake data from `h/seed.cjs` (account "Alex", companion "Nova", made-up Community posts; network to Supabase is stubbed by `h/route.cjs`, nothing writes to the real DB). `h/runall.sh` runs the queue. Output: `frames/<scene>-<lang>/f00001.jpg… + meta.json` (not committed, re-record).
- `caps-en.json` = scene timing + captions synced to `vo-en.mp3` (VO offset 0.25 s). `python3 mkspec.py en && python3 compose.py en` renders `out/promo-en-video.mp4` (1080x1920, 30 fps; phone frame + 47pt status bar, zooms, tap ripples, captions in the 170–440 px band, chips, end card).
- `python3 music.py 45` makes the royalty-free music bed; mix + mux commands are in the 0.38 handoff section.
- Final English cut: `out/LOWiSPIKE-promo-en.mp4` (45.0 s, H.264 High 1080x1920 30 fps, AAC 48 kHz, -14 LUFS, faststart).
