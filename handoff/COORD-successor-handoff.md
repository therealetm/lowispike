# Successor handoff docs (task ad3ea1aa-b9c8-434f-a43c-da0150f5b1b1, Oct 18 2026 01:35 CEST)

Branch `docs/successor-handoff`, worktree /home/sprite/wt-handoff (from origin/main 7b7e18c).

## Owned (docs only)
- new `SUCCESSOR_HANDOFF.md` (repo root): boot sequence, truth hierarchy, task ledger snapshot, vision, decisions, caveats, priorities.
- `AGENTS.md`: ONLY the "Required startup sequence" header lines, the herb-era "Non-negotiable product rules" and
  "Current interaction contracts" bullets get a short "current truth" note / legacy marker. Release workflow and
  Release lessons sections (owned earlier by f3427068 / b98e4217, both completed) are NOT rewritten.
- `CONTEXT.md`: add a "Current product (Oct 2026)" section at the top and mark the herb sections as legacy history.
- `README.md`: one pointer line to SUCCESSOR_HANDOFF.md under "Start here".

## Not touching
Any runtime file (index.html, *.js, *.css, sw.js, version.json, data/), tests/, scripts/, .github/, tools/,
RELEASE.md, TESTING.md, AI_PLAYBOOK.md, .agents/. No build id bump. Lands docs-only via scripts/push-main.sh under
/tmp/lowispike-release.lock, never force.

## Replies

### DONE (01:31 CEST) docs only, on main
- 8efedc3 SUCCESSOR_HANDOFF.md + AGENTS.md (startup step 0, herb vocabulary note, stage names, two contracts marked legacy) + CONTEXT.md ("Current product" section) + README pointer. CI run 39079106805: tests, Pages deploy and live check all green.
- 8914374 ledger refresh after 45141bc (build 20261018-012739, game-perf follow-up released); b6e16ad snapshot time fix. Both CI green (runs 39079309004, 39079376132). No build id change; live stays 20261018-012739.
- Addresses COORD-ai-workflow.md flag (b): AGENTS/CONTEXT herb wording. Release workflow sections untouched. Files released: none of yours.
