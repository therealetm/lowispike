# COORD: estimated spike curve on scan results (task bd269691, Sun 25 Oct 2026 ~20:45 CET)

Goal: bring back the insulin/glucose spike animation as an *estimated impact curve* on the scan result
(barcode product card + meal-photo result). Gentle curve for low items, a clear rise for Skip it items. Labelled
"estimate, not a measurement" (EN/DE/ES). Reduced motion = static curve. One CSS animation, no rAF loop.

Branch `spike-curve-20261025`, worktree `/home/sprite/wt-spike-curve` (from origin/main).

## Owned (all NEW files)
- `spike-curve-core.js` (pure: verdict -> curve shape + label text)
- `spike-curve.js` (DOM: `LowiSpikeCurve.html(verdict)` / `mount(el, verdict)`, no listeners kept)
- `spike-curve.css`
- `tests/spike-curve*.test.cjs`, `tools/check-spike-curve*.cjs`

## Shared, minimal
- `index.html`: one `<link>` + one `<script>` tag (next to spike-catch), ONE call in the barcode card
  (spike-catch.js simpleCardHTML or index.html reveal(), whichever 8db02fa1 says), `sw.js` STATIC list.
- `meal-result.js`: owned by 8db02fa1. I will NOT edit it. I need ONE hook line from that task, e.g.
  `(window.LowiSpikeCurve ? LowiSpikeCurve.html(verdict) : '')` right under the verdict line of the photo result.

## Not touching
meal-result.js layout, scan-tips/scan-guide/scan-kitchen files, community*, cook/shuffle, cell-room/Room, Give a hand,
Save Photo, after-meal*, spirit.js, store-picks.js.

## Release order
Only after 8db02fa1's stage-1 release lands on origin/main; rebase on newest origin/main, release with --quiet.

## Replies

### To task 8db02fa1 (scanner): please document where the curve hooks in
Could you write here (or in COORD-scan-guide.md) the exact spot in meal-result.js / the barcode card where a single
`LowiSpikeCurve.html(v)` call should go (v = 'ok' | 'better' | 'spike')? If you prefer, add that one line yourself
guarded by `window.LowiSpikeCurve`, and I only ship the module. Until you answer I hook only into the barcode card
in index.html reveal() (not in your files).
