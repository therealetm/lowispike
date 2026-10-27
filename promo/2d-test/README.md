# 2D promo test (Connie in the car, ~14 s) — sources

Test only. The full video waits for Emmanuel's yes.

- `out/connie-2d-test.mp4`: the test sent to Emmanuel (1080x1920, 30 fps, 14.2 s, 4.5 MB). `out/contact-sheet.jpg`: one frame every 0.25 s.
- Part 1, 0–8.4 s: 2D cartoon. `scene.html` + `scene.js` draw Connie as a code puppet (flat vector, bold outlines, dusk, rain, GROCERY store). `render.cjs` renders 252 frames (Playwright/Chromium) to `cart/` and writes per-frame measurements to `cart/states.json` (copy in `out/cartoon-states.json`).
- `check.py`: per-frame checks on those measurements: one pair of hands, left hand on the wheel, right hand really holding the phone, mouth inside the face and below the eyes, mouth only moves while Connie speaks, captions one line / whole sentence / never over the face, companion emerges from the phone, never covers the face oval, stays in frame, no caption overlaps in time. All 252 frames pass.
- The companion is the real one from the live app: `comp.cjs` captured it (background cut out, 30 fps). Stored here as VP9-with-alpha webm in `companion/`; unpack with `ffmpeg -c:v libvpx-vp9 -i companion/companion-rest.webm comp/rest-%04d.png` (same for talk, surprised).
- Part 2, 8.4–14.2 s: real screen recording of the live site (`rec.cjs`, uses `tools/sim/harness.cjs` on main): fake "Connie" account, every *.supabase.co call answered by the local mock cloud, nothing real read or written. Home → Fuel → Cook → Shuffle → Savory → Shuffle my food, Math.random seeded (SEED=7) so it lands on Zucchini Turkey Burger Melt.
- `compose.py` (APP_START=10 AFTER=100) joins both parts and draws the tap circles; writes `plan.json`. `audio.py` makes the self-made piano, rain, phone buzz, companion pop/dive, taps, shuffle ticks and chime, and mixes the voices in `vo/` with the music ducked under each line.
- Encode: `ffmpeg -framerate 30 -i out/frames/%05d.png -i mix.wav -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=0.25,format=yuv420p[v];[1:a]loudnorm=I=-14:TP=-1.5:LRA=11[a]" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 21 -c:a aac -b:a 160k -shortest -movflags +faststart out.mp4`

Never say the app name out loud in voice; say "your companion", never a fixed companion name.
