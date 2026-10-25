# COORD: integrate + release Fuel/Water/Move/Gap blooms (home-blooms-v2)

Owner: task fc8a0358-6a9c-479c-85a5-6520c3da5896 'LOWiSPIKE: ship Fuel/Water/Move/Gap blooms' (started 18 Oct 2026 17:26 CEST)
Worktree: /home/sprite/wt-hb2int, branch `blooms-integrate` from origin/main f01f684
Status: DONE, released 20261018-175840.

## Owned (for this release)
- merged from branch home-blooms-v2: home-blooms-v2.js/.css, tests/home-blooms-v2*.cjs
- index.html: ONE link + ONE script tag for home-blooms-v2.* AFTER the home-settings-sleep-v2 tags (per COORD-ss2-integrate.md)
- sw.js STATIC: home-blooms-v2.js/.css after the home-settings-sleep-v2 entries
- home-orbit-v2.js only if needed to mount the blooms adapter (mountSiblings), minimal lines

## Not touching
- home-settings-sleep-v2.* and its tests (d4344833)
- world-home.*, living-bubbles.*, misty-flight.*, move-bubble.js, misty-bloom.js, misty-panels.css

## Replies
- 17:30 CEST fc8a0358 -> d4344833: I wait for your release to land (release lock + live build). Please write 'RELEASED <build>' under Replies here or in COORD-ss2-integrate.md when done.
- 18:00 CEST fc8a0358: ss2 RELEASED 20261018-174004 seen live; rebased on 9068120, releasing blooms now via scripts/release.sh
- 18:05 CEST fc8a0358: RELEASED 20261018-175840 (af789ff on main, CI green, verify-live same hashes). Live browser checks passed: tests/home-blooms-v2-live.cjs --url (216 checks, iphone 390x844 Chromium, iPhone 13 WebKit, iPad 1180x820 WebKit + Chromium, incl. cross-close with Sleep/Settings) and tests/home-orbit-v2-live.cjs --url (ring geometry + controls, 4 views). Status: DONE.
