# HANDOFF: crash squad release (round 2)

Worktree /home/sprite/wt-crash-squad, branch crash-squad. Coordination: /home/sprite/COORD-crash-squad.md.

## Fix
body-world-regions.js snapNow/snapDrop made a full-size copy of the 3D canvas on every world exit. iOS Safari caps total canvas memory, so a few exits or pull-ins could crash/reload the page. Now the copy is small and freed at once.
Commits on branch: ec3e62c (fix + soak harness tools/soak/), 6bb0121 (probe tracks GPU bytes, geometry orphans, hung page).

## Release steps (tick as done)
- [x] Rebase on origin/main (7a79b20, build 20261019-141244 at start)
- [x] Full test suite clean
- [x] DECISIONS.md entry
- [x] news JSON EN/DE/ES
- [x] commit
- [x] scripts/release.sh (under its lock)
- [x] scripts/wait-ci.cjs
- [x] scripts/verify-live.cjs
- [x] /home/sprite/BUGHUNT/LEDGER.md entry
- [ ] optional: soak on live, iphone13 webkit
- [ ] voice note script + checklist

## Status log
- branch already on origin/main 7a79b20; suite 1543/1543; new tests 4/4 fail on old code; news /home/sprite/news-crash-squad.json; commit 5412d83. Releasing (log /tmp/cs-release.log)
- 1st release attempt 12:19 UTC blocked: 2 flaky test fails (ui-joystick-fade garbled source read under load 27, water-six-cups); both pass on rerun. Retrying.
- 2nd attempt: DECISIONS append conflict with old-design purge 4; resolved keeping both, rebased on 55615f5 (20261019-142359). Retrying.
- RELEASED 20261019-142709 (main 08585b5), tests 1554/1554, CI success (wait-ci), verify-live OK, live body-world-regions.js has MAX_PX. LEDGER CS-001 added.
- Soak on LIVE 20261019-142709, webkit iPhone 13, plan cycles:10,galaxy:1,auto:3, stopped after 621 s (machine load ~25 on 8 cores, software GL ~12 fps, one cycle ~5 min; the 'heart: browser closed' line at 621 s is my stop, not a crash). Logs /home/sprite/cs-soak-live.log + .jsonl.
  SUMMARY: crashed false, loads 1, hung 0, errors [], verdict problems []. Exit copy measured live 541x922 (= the 500k px cap). Canvas memory 4.2 MB start -> 2.5 after the exit -> 2.3 MB.
  Reached only 1 full world cycle (brain); galaxy/autopilot NOT reached.
  Unconfirmed follow-ups: (a) brain: 6 s joystick drags never steered her out, harness used the World map (likely slow GL); (b) lung: 'never got inside' ~4 min, region current()='lung' but flight state 'idle', flew null: load or a real stuck state? Re-run on a quiet machine: node tools/soak/crash-soak.cjs --url https://therealetm.github.io/lowispike/ --engine webkit --plan cycles:6,galaxy:2,auto:5 --check
- [x] voice note script + checklist in task result. DONE.
