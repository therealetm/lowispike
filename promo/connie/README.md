# Connie promo video (Reels / TikTok), low-poly x clay, 63 s

Finished cut for posting: `out/connie-promo-1080.mp4` (1080x1920, 30 fps, H.264 High ~4.7 Mbit/s two-pass, AAC 192 kbit/s 48 kHz stereo, -14 LUFS, faststart, ~37 MB).
Direct download: https://github.com/therealetm/lowispike/raw/agent-harness/promo/connie/out/connie-promo-1080.mp4

The 73 MB master render was re-encoded to this file (SSIM 0.973 vs master). The Quick tour web copy (720x1280, ~3.6 MB) lives in the app repo under the path set in `VIDEO` at the top of quick-tour.js.

## What is here
- `tl.py` shared timeline: 13 scene windows and the spoken lines (clip key, speaker, start, caption parts). Wording: "likely blood sugar spike", never "insulin spike".
- `vo/` voice clips. Connie and the checkout man: `vo/tts.py` (edge-tts, en-US-EmmaMultilingualNeural / en-US-ChristopherNeural). Companion lines (`comp*`): Maya's own voice.
- `aud.py` places the clips on the timeline, builds the royalty-free piano bed + sound effects, mixes to -14 LUFS and writes `timing.json` (line windows, caption windows, mouth flaps) and `mix.wav` (here as `mix.flac`; `ffmpeg -i mix.flac mix.wav`).
- `art/` generated stills (image generator; ids in `IDS.txt`). `c01` is the Connie base image, every other Connie scene is an edit of it so she stays the same. `star*` = companion sprite on pure green (keyed in render.py), `cell`/`galaxy` = finale.
- `screens/` real app screens captured by `cap.cjs` in WebKit iPhone 13 from a made-up "Connie" account in a local test copy (tools/sim/harness.cjs, Supabase stubbed, nothing written to the real DB). Fake data only ("Walter", "Sam" baskets). The Day recap screens come from the day-recap branch.
- `render.py` renders every frame (camera push/shake, mouth flaps, the companion sprite bob/squash/blink/talk/glow, particles, captions in a dark rounded box near the top, companion lines with an orange outline, app screens composited into the phones, end card with icon-512.png and "link in bio"). Then mux with mix.wav.

## Paths to fix before re-rendering on a new computer
render.py: `D` (this folder), `FR` (= /home/sprite/PROMO/frames, the Move celebration frames recorded by ../h/rec2.cjs; re-record), `FB` (Inter font ttf folder, not committed: download Inter), icon path (app repo icon-512.png). cap.cjs: the app worktree with tools/sim/harness.cjs.

Never say the app name out loud in voice lines (written only on the end card).
