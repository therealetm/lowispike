# Bloom labels break only between words (Lisa's "Flasch / e")

Task id: 80fa2ca8-80ac-4835-a0ad-08bfc87f5bb6
Branch: bloom-labels-20261024 (from origin/main a14da1f)
Worktree: /home/sprite/wt-bloom-labels
Started: Oct 24 2026, ~01:40 CEST (Oct 23 16:40 PDT)

## Owned
- home-blooms-v2.css (only the `.hb2-tx b` label rule)
- home-blooms-v2.js (label fit helper + calls after the bloom is appended)
- tests/bloom-labels.test.cjs (new)
- tests/bloom-labels-live.cjs (new)
- version.json / sw.js build bump + What's New note, only via scripts/release.sh

## Not touching
- Ranking, Care board, friends list, anything of the real-humans-only release (task f0056859-1899-4d03-bdf6-5b2dbcad4338)
- Every other wt-* worktree, every other COORD topic

## Replies
- Oct 24 ~01:55 CEST DONE: released 20261024-014255 (67057b7), CI green on ci/ branch and main, live files matched, tests 2817/2817. Handoff log line landed as 2eb5fdc. Branch bloom-labels-20261024 pushed. Files released, nothing owned any more.
