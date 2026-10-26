# COORD: three meal photos a day + meal photo sharing + meal photo reminders (PHOTOCAP worker)

Task: LOWiSPIKE three food photos per person daily (forked task, 2026-10-19 16:05 CEST)
Branch: photo-cap-3  Worktree: /home/sprite/wt-photo-cap  Base: origin/main

## Owns
- supabase/functions/food-photo/index.ts (durable 3/day cap, GET allowance)
- food-photo-ai.js (allowance, limit messages, share button under the Snap result)
- NEW meal-photo.js (+ meal-photo.css): blood sugar estimate, meal card, share, reminder flow
- index.html: For You composer (C.meal, AI read button), slideHTML/postHTML meal card, publish meta, N1 reminder sheet row, script include
- sw.js STATIC entries for the new files
- NEW tests/meal-photo*.test.cjs

## Will not touch
mealForm / typed meal logging (stays unlimited), worlds, companion, energy, fasting.

## Status
- code done, tests pass (1 new file), food-photo v2 deployed ~16:2x CEST, releasing
- 16:35 CEST (PHOTOCAP round 2, fresh task): RELEASED in build 20261019-162849 (main 2336a83), CI green (run 39269474901). Live food-photo GET -> {ok,configured,limit:3}, i.e. v2 with the durable cap is what's on Supabase.
  SNAPFIX: please branch/rebase from origin/main (>= 2336a83) and, when you redeploy food-photo, deploy the file from main with your gemini() change merged in, so DAY_MAX=3, tally()/store() and the limit/left fields stay. I am NOT redeploying food-photo again; I only run live checks (one test guest user, 4 POSTs) and add a probe under BUGHUNT/playtest. I don't touch spirit.js, scan-screens.css or token()/analyse().
- 16:50 CEST DONE. Live server check with a fresh guest user (3392f841-e134-486b-a72f-a9dc25b91b13, left in auth.users): GET left 3 -> POST 200 left 2/1/0 -> 4th POST 429 limit; count survives a token refresh. Live app probe BUGHUNT/playtest/probe-photocap.cjs (mocked function with a counter) PASS on build 20261019-163105: iphone13 en/de/es, ipadL en/es, ipadP de/en, incl. OTHER_DEVICE=1 (server 429 drives the message). Files live = repo.
  Known nits (not fixed, files free): es 'Te quedan 1 de 3' should be 'Te queda 1 de 3' (meal-photo.js STR.es.left); changing tz in requests can stretch to max 6 in any 24 h (ROLL_MAX), by design.
  PHOTOCAP releases its claim on food-photo-ai.js / meal-photo.js / index.ts. SNAPFIX: all yours, just keep the cap when you redeploy.

## Note from CHATROOM worker (16:12 CEST, user decision on the call)
Emmanuel agreed: when a meal photo is shared to the community, the person SEES the AI analysis FIRST (review step) and can
correct the estimated ingredients / portions and choose what becomes public, and only then posts. Not post-then-reveal.
Also: never say a photo measures glucose; at most a likely blood sugar response.
I (CHATROOM, COORD-chat-room.md) only restyle the Community Chat room view (community-chat.js thread + new community-room.css);
I do not touch the For You composer, feed, meal cards or food-photo files.

## Note from SNAPFIX worker (task "Snap food photo stopped working", 16:30 CEST) - COORD-snap-fix.md
Emmanuel's iPad shows "I couldn't read this photo". I am fixing: food-photo-ai.js token()/analyse() robustness (token wait no longer
eats the 30 s budget, one retry, honest error codes/messages: key/ai down/network/limit), and the iPad layout of the photo sheet
(spirit.js photoSheet markup + scan-screens.css). Server: only gemini() error classification + Gemini timeout in index.ts.
I branch from origin/main and will REBASE ON YOUR WORK if you release first; I will not deploy food-photo over your v2 without
merging your durable 3/day cap. If I release first, the conflicts for you are the STR lines and the analyse() fetch line.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
