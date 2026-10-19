# HANDOFF: Ant-Man POV on the strings (release task, Oct 19 2026)

RELEASED as 20261019-095111. Branch `string-pov` in /home/sprite/wt-string-pov, rebased onto origin/main 46ceb69 (build 20261019-094129, guide bubble fix,
which includes the string tour + freeze fix of 20261019-091732).

## Done
- Rebased (index.html / sw.js conflicts were only build stamps; re-added the string-pov.js script tag + STATIC entry; DECISIONS
  entries kept side by side).
- Found + fixed on rebase: misty-explore cut strings for S.hs, which shrinks ~20x with the POV camera -> string ends inside the
  membrane push for her real size. Now `core.hsOf(S)` (S.hsG from misty-galaxy step, cleared on reset). Test added first (failed),
  tests/oct19-autopilot-strings.test.cjs regexes moved from S.hs to hsOf(S), same strictness.
- Full suite 1495/1495 (1484 on main + 11 string-pov).
- string-pov-live: Chromium 390x844 + 820x1180 all ok; WebKit iPhone 13 + iPad all ok (render 3.0 ms normal vs 2.1-2.3 ms POV).
- Autopilot probe (Chromium 390x844, 420 s, copy at /tmp/sp-probe with POV state): POV came in on all 9 rides, k reached 1 on each,
  no in/out within a ride, no pinned ride, no crash, 1 load. A frame stop at 342 s coincided with the bug hunt's release test run
  on the same machine (CPU/memory starvation); clean rerun in sp-probe3.log.
- news-string-pov.json (EN/DE/ES) in /home/sprite, DECISIONS.md entry committed.

## Next (if this stops early)
1. `cd /home/sprite/wt-string-pov && git fetch && git rebase origin/main`, rerun `node --test tests/*.test.cjs`.
2. `scripts/release.sh "<summary>" --news /home/sprite/news-string-pov.json` (under its lock, never force-push).
3. Check gh run list and live version.json.

## Traps
- Speed and the currents must stay on G.nd / galaxy-scale size, or she crawls along the string or the grip changes with the camera.
- The tour must plan with hsOf(S), never S.hs, in the galaxy.
- Don't run the full suite while a browser probe runs: it starves Chrome and shows up as a fake frame stop.
