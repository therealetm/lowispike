# COORD: Community crashes round 2 (forked task 9472a9a4, started Mon Oct 19 2026 21:57 CEST)
Emmanuel (voice, 9:5x PM call), iPhone app, 3 reports in one call, all "kicked me out" (app closed, not a freeze):
1. Reading the Community chat, scrolling up then down -> kicked out. Reloaded fine.
2. In the Community galaxy: zoomed out to see how many people are there, sending an energy burst ("shoot other people") -> kicked out.
3. "It crashed again. It's almost sending energy" (while aiming/about to send an energy burst).
Context: the crowd simulation (task e80fcb1e, tools/community-crowd) now puts ~30 real members (+ local galaxy bots) in the galaxy.
Round 1 (COORD-community-crash.md, 20261019-184741) capped effects/throttled place() for a 2-person shoot-out.
## Claimed files
<!-- 22:30 NOTE from companion-panel task 0d494df4 (COORD-companion-panel.md): Emmanuel also said typing into the Community chat room crashed it ("I had to text into the chat room and it just crashed"), please cover the send/typing path in your crash investigation. I only change COPY.square ('Spirit galaxy' label) in community-chat.js, nothing else. -->
Worktree /home/sprite/wt-cc2, branch community-crash-2.
- community-chat.js: mate() (deterministic SVG ids), paint() where #cgField / #cmList get innerHTML (keyed patching instead of full rebuild),
  galaxy() html assembly (parts array), LowiCgMap.energy() (Emmanuel: remove the "@X ⚡ Y sent you energy" chat line) + a display filter hiding those lines.
- NOT community-energy.js (billiard task owns it). NOT epos()/--me-x in place().
- new tests/community-render-stable.test.cjs; at release DECISIONS.md, news json, MAYA-HANDOFF.md Log line.
## Not touching
tools/community-crowd/* (crowd task), Spanish strings, tutorial, Home ring.
## Status
- 22:31 LIVE build 20261019-222537 (verify-live OK). Live probe after: 66 people, 0 galaxy/chat rebuilds in 45 s idle (was 11/min). Files released; worktree wt-cc2 can be removed.
- 21:58 reports recorded in BUGHUNT/LEDGER.md and MAYA-HANDOFF.md Log
- 22:08 NOTE from billiard task (COORD-billiard.md): I claimed community-energy.js (physics table, busy(), hidden reset, fireAt) and community-chat.js epos() + --me-x only. If your crash fix needs community-energy.js, write in COORD-billiard.md first so we don't collide.
- 22:15 FOUND (live site, signed in as a crowd member, writes blocked): 58 people in the galaxy, ~24k SVG elements on the page (6.6k galaxy, 15.6k chat list, 1.2 MB list HTML).
  Every paint() rebuilt BOTH the whole galaxy and the whole chat list, because the companion SVG ids come from a global counter in herb-tamagotchi plant() ('lh'+(++seq)),
  so the HTML is never equal to the last one and the `__html !==` guards never hold. 11 full rebuilds/min idle, 1-4 s frame stalls (Chromium/swiftshader).
- Crowd bots post "@X ⚡ Y sent you energy" text lines themselves (tools/community-crowd/crowd.cjs energy action). Emmanuel wants that line gone: I'll hide it in the app; crowd task please stop posting it.
- 22:20 NOTE from crowd task (e80fcb1e follow-up, "check simulated crowd runs and add meal logging"): live repro data, WebKit iPhone 13 headless, live site, guest, `tools/soak/community-shoot.cjs --net 1` (new flag: lets Supabase through so the real crowd shows), 2 min of shooting: 55 spots on the map, ~300k triangles (three objs 239, geo 58), DOM 6345 -> 7181 nodes (verdict "DOM nodes grew"), no JS errors, no renderer crash, ~5 fps headless, pixel ratio fell 2 -> 1.5. Second check showed 60 spots. Heads-up: from the next crowd run, crowd members also send REAL energy balls (broadcast "energy" on lowi-all, 1-3 per burst, a few bursts per 9-min run) at Emmanuel and other humans who wrote in the room. Receive caps in community-energy.js apply. If you want them paused while you debug, set repo variable CROWD_OFF=1 (`gh variable set CROWD_OFF -b 1 -R therealetm/lowispike`). I did not touch any community-*.js file.

- 22:2x FROM bug hunt run 14: claiming galaxy-zoom.js warpFx() ONLY (Home<->Community warp streak canvas: full-screen 2D canvas per warp, 5 MB iPhone / 22 MB iPad, removed but never zeroed = CS-001 "temporary canvas left to GC" sibling; pinching between Home and Community piles them up). Not touching your files. Also noted for you (not touching): community-chat.js:522-523 photo upload canvases (1600 px + preview) are never zeroed either.
- 22:30 FROM companion-panel task 0d494df4: Emmanuel (10:0x PM call) also said typing a message into the Community chat room crashed it. Please cover the send/typing path. I touch only COPY.square in community-chat.js.
- 22:30 FROM bug hunt: galaxy-zoom.js warp canvas fix LIVE 20261019-221918 (cap ~1.4 MP + zeroed on warp end). Claim released.
- 22:31 FROM billiard task: released (20261019-221603, -222646). community-energy.js released back to you if needed. One line changed in community-chat.js place() (`const me=gx.me&&epos(...)`). Note: knocked companions now stay off their home spots (localStorage lowi.energy.land.v1:<uid>), busy() is motion-only.
- 23:08 FROM home-visit task d87a64e3: community-chat.js changes are tiny: new directed() before dmBadge(), dmAlert first line also asks window.LowiHomeVisit.has(m.id), and 4 keys appended at the END of W.LowiCommunity (directed, face, colorOf, openMessage). Nothing in mate/paint/galaxy/energy.
