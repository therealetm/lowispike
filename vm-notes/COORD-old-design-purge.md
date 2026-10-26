# COORD: old-design purge (old logos, old companion art, dead UI) (Oct 19 2026)

Task: "LOWiSPIKE old-design purge: old logos, old companion art, dead UI" (started Mon 19 Oct 13:23 CEST).
Emmanuel: "Any old UI should be deleted, any old design. I'm seeing that some still have old logos or old companion design."
Worktree /home/sprite/wt-old-design-purge, branch old-design-purge, off origin/main 3eec91b (live build 20261019-130951).

## Claimed files (will be updated as the inventory finishes)
- icon-*.png, manifest.webmanifest, lowispike.html, image/SVG assets under the repo root and data/
- Legacy-art spots only (old logo / old companion art / dead UI paths) in: index.html, sw.js STATIC list, companion*.js/css,
  community-*.js/css (avatars only), herb-*.js/css (old 2D art only), top-bar.*, updates.css
- Round 3 (Oct 19 ~14:10 CEST): cell-room.js + cell-room.css (friend/room cell art only), companion.js (friendSVG/swap), community-chat.js (mate() art only)
- tests/oct19-old-design-*.test.cjs (new), playtest/probe-friend-forms.cjs (new), playtest/probe-old-design*.cjs (new)
- At release: DECISIONS.md (append), What's New, build bump via scripts/release.sh under the lock

## Not touching
misty-explore.js, galaxy-bubbles.js, misty-galaxy.js, body-world-regions.js, misty-flight.js (crash squad), onboarding / first-run
flow files (new-user walkthrough), region-pals*, praise.js, home-blooms-v2.* (bug hunt), misty-pad*.
Other agents: if you find old art/logos, add a line under Findings.

## Findings from others

## Status
- [x] inventory + round 1 committed (icons, launch screen, #onboard removed, Community own orb, daily ritual fallback, body-companion deleted); LIVE 20261019-134704
- [x] round 2 (friends tree mine spot = real Misty: cell-room.js mineSVG, companion.js; herb-tamagotchi.js curArt for room/dock/level-up) LIVE 20261019-135912
- [x] round 3: friends = current glass cell (friendSVG/friendCell), room = real Misty, LIVE 20261019-141244 (1,539)
- [x] round 4: home-orbit-v2.js fit() + home-orbit-v2.css short-landscape Misty size: ring stays on for phones on their side. LIVE 20261019-142359 (1,550). ALL FILES RELEASED (task done).

## For the new-user walkthrough task
- First-run gate: the pre-birth mystery bubble (`LowiBirthCompanion.mysterySVG`, class lc-mystery) draws a seedling sprout (`lc-seedling`) inside it. That is the old herb idea; Misty is a glass cell now. Left untouched by me because it is your flow.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
