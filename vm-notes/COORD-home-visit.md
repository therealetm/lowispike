# COORD: companion visits on Home (forked task "LOWiSPIKE: incoming-message companion visits on Home", started Mon Oct 19 2026 22:17 CEST)
Emmanuel (10:1x PM call): a message to him shows up on Home as the sender's companion flying in from an outer bubble, entering his world like a hologram, then a text bubble. Only messages to him (mention / reply), same test as dmCheck().
Worktree /home/sprite/wt-home-visit, branch home-visit, off origin/main.

## Claimed files
- NEW home-visit.js, home-visit.css, tests/home-visit.test.cjs (all mine)
- community-chat.js: ONLY dmAlert() (one early hand-off line to window.LowiHomeVisit before the toast). NOT mate()/paint()/galaxy()/energy()/epos()/place()/COPY.
- index.html: ONLY one <script> tag for home-visit.js (next to the other late scripts); sw.js: add the two new files to the asset list.
- tutorial-steps.js: only if the release check needs it (probably a news `tutorial: {none: ...}` instead).
- At release: DECISIONS.md (append), news json, MAYA-HANDOFF.md item 23 + Log line.

## Not touching
community-energy.js (billiard), community-chat.js rendering/paint (crash task 9472a9a4), body-world-3d*.js / galaxy-bubbles.js (no WebGL changes: the visit is a light DOM/CSS overlay), galaxy-zoom.js (bug hunt), tools/community-crowd/* (crowd task), Spanish strings of other features.

## Status
- 22:25 started; item 23 + Log line written in MAYA-HANDOFF.md (pushing via push-main.sh before building)
- 22:33 item 23 on main (202407d) before building
- 22:58 home-visit.js/.css + community-chat.js hand-off (directed(), face, colorOf, openMessage; dmAlert asks LowiHomeVisit.has) + 13 unit tests passing
- 23:16 releasing (release.sh under lock)
- 23:30 LIVE build 20261019-224516; live checks 20/20 iPhone 13, 19/20 Android Chrome (mid-flight timing on slow box). Done; files released.
