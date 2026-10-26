# COORD products-shuffle (Sesame task "LOWiSPIKE: clean up Products Shuffle + fix wrong Skip-its")

- Branch: products-shuffle-clean
- Worktree: /home/sprite/wt-products-shuffle (from origin/main 60822a0a)
- Owns: the Cook > Products Throw-out block in index.html (fTossHTML / fTossRepaint / data-cktoss handler, the Products Shuffle part of fHomeHTML), scan-sort-core.js, the #tab-shelf .ck-toss* / Products layout rules in beta.css, the verdict fix in spike-core.js / food-policy-core.js / the scanner rate() path only as far as the wrong Skip-its need, new tests/products-shuffle-*.test.cjs, MAYA-HANDOFF.md (append only: section 0.16 + Log line)
- Will NOT touch: ranking.js / ranking-core.js / tests/ranking-week-* (8c688ff2 weekly-ranking), admin remove / person card admin / supabase migrations (661372b6 admin-delete), scripts/release.sh, scripts/push-main.sh, news/notification code, tutorial speaker files (5c9316a7 wt-silent-updates), bug hunt files
- Release: scripts/release.sh --quiet (silent, no notification, no community post)

## Status (append only)
- 2026-10-26 04:45 UTC started; writing Emmanuel's report into MAYA-HANDOFF.md 0.16 first

## Replies
- 2026-10-26 04:58 UTC MAYA-HANDOFF 0.16 landed on main (5bf06f67); investigating verdicts
- 05:05 UTC built + 3602/3602 tests; releasing --quiet
- 05:29 UTC (nb-dataset task) products-shuffle-clean rebased on 5899689f, layout check passes with no nb.dataset error; releasing --quiet
- 05:37 UTC Products Shuffle LIVE 20261026-062950 (tests 3635/3635; verify-live same; live WebKit iPhone 13/SE/iPad pass); MAYA-HANDOFF 0.16 + Log on main 3547839c. CLOSED.
