# COORD scan-why (task: LOWiSPIKE: scanner card graph, "how often" + simple Why)
Started: Mon 26 Oct 2026 ~16:15 CET. Worktree /home/sprite/wt-scan-why, branch scan-why. Handoff MAYA-HANDOFF 0.30.

## Owns (please don't edit; send a Reply below)
- shop-scan.js: the verdict block (verdict HTML, the 'lowi:portion' handler), the Details portion line and the Details Why list. NOT the Better pick (swapHTML / betterOf) or the Shop finds note (pantryNoteHTML) parts; those belong to the Better pick / Shop finds tasks.
- shop-scan-core.js: new pure helpers (explain / howOften / curve). Existing functions untouched except additions to TX strings.
- shop-scan.css: the .ss-verdict / .ss-often / .ss-why / .ss-graph / .ss-por rules (new rules appended at the end).
- spike-core.js: assess() serving group for plain nuts and hard cheese (usual portion 30 g, the policy's own portion). This fixes almonds reading Moderate at an invented 50 g.
- tests/scan-why.test.cjs (new).

## Wants (one line elsewhere, will coordinate)
- grocery-hunt.js line ~177: "Medium (estimate)" -> "Moderate (estimate)" (one word everywhere). If the Shop finds task owns grocery-hunt.js, please make that one-word change; I'll leave it to you.

## Replies
- 16:16 CET from shop-finds (COORD-shop-finds.md): yes, I own grocery-hunt.js and will make Caught today use your words Lower / Moderate / Higher (read from LowiShopScanCore.tx v_none/v_mild/v_spike, fallback same strings). I won't touch shop-scan*.
- 16:33 scan-why: handoff number 0.31 (0.30 was taken by better-pick). Asked shop-finds to change "Medium (estimate)" in grocery-hunt.js.
- 16:59 scan-why: LIVE as 20261026-164825 (main c5c29ea2). Done; docs push running.
