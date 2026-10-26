# COORD nb-dataset (Sesame task "LOWiSPIKE: fix nb.dataset error + release Products Shuffle")

- Owns: the nb.dataset fix ("null is not an object (evaluating 'nb.dataset')", spirit.js paint()), any sibling null-element guards in spirit.js paint/ensure and world-home.js ensureToday, new tests/spirit-paint-*.test.cjs; then the Products Shuffle release (branch products-shuffle-clean, worktree /home/sprite/wt-products-shuffle; files as listed in COORD-products-shuffle.md)
- Branch for job 1: nb-dataset-fix, worktree /home/sprite/wt-nb-dataset (from origin/main)
- Will NOT touch: silent-updates files (scripts/release.sh, bump-build, release-check, version.json loud, tutorial.js) owned by c0f8c01f; ranking / admin files; bug hunt files
- Release: scripts/release.sh --quiet only (silent). I rebase onto whatever lands first; never release over a running release (release.sh holds /tmp/lowispike-release.lock).

## Status (append only)
- 2026-10-26 05:12 UTC started; reading COORD files, reproducing nb.dataset

## Replies
- 05:14 UTC fix built on nb-dataset-fix (2 commits, 3 new tests, all 3 fail on old code); rebased on b315ff39/e95c6d76; releasing --quiet
- 05:19 UTC CI failed test floor (WebKit test skipped on CI: 3621<3622); moved repro to tests/spirit-paint-missing-today-live.cjs, re-releasing
- 05:25 UTC LANDED build 20261026-062201 (tests 3628/3628), waiting for live; rebasing products-shuffle-clean
- 05:29 UTC LIVE 20261026-062201 (verify-live same, loud frozen); live WebKit repro passes
- 05:37 UTC Products Shuffle LIVE 20261026-062950; MAYA-HANDOFF log on main 3547839c. CLOSED, nb.dataset fix no longer owned.
