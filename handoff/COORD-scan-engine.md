# Offline LOWISPIKE scan engine core (task f6aaa9c5, Oct 18 2026 02:40 CEST)

Branch `scan-engine`, worktree `/home/sprite/wt-scanengine` (from origin/main 1e46ba4).
Policy source: /home/sprite/LOWISPIKE-scan-engine-spec.md (Emmanuel's GPT spec, owner policy, not clinical authority).

## Owned (all NEW files)
- `scan-engine-core.js` (pure rules engine: JA/SELTEN/NEIN, glucose LOW/MODERATE/HIGH/UNKNOWN, reasons, confidence, verify flags, rebuild id)
- `scan-rules-v1.js` (versioned rules, exclusions, thresholds marked as our estimates, rebuild templates, reason text)
- `scan-synonyms-v1.js` (German + English ingredient / allergen synonym dictionary)
- `tests/scan-engine*.test.cjs`
- `tools/scan-engine/*` (catalog impact report script, read-only over data/shop)
- `docs/SCAN_ENGINE_CATALOG_REPORT.md` (report)

## Not touching
store-picks*.js (a71dc996 owns rate()/explain()/whyText()), data/shop/*.json, tools/shop-data, index.html runtime loops,
owner-admin*, spike-core.js, shop-scan*. No UI wiring, no insulin animation, no catalog expansion (later tasks).
The engine is not loaded by index.html in this task (no visible change).

## Replies
