# COORD: product card reorder (task 'LOWiSPIKE: product card reorder (Details open, cheaper stores up)', 17:43 CEST)
Branch: product-card-order  Worktree: /home/sprite/wt-product-card  Base: origin/main 30479ae (20261019-172632)
## Owns
- index.html: ONLY simpleCardHTML() (the scanned-product spike card, ~line 14241) and its SC_TX block
- spike-catch.css: card layout rules only (.sc-*), bottom padding so nothing hides behind the close X
- NEW tests/product-card-order.test.cjs
## Will not touch
tutorial*.js/css, tutorial-steps.js, tutorial-auto.js, community-energy.js, community-chat*, finishOb()
## Status
- 17:45 started
- 17:55 committed, suite 1674/1674, releasing
- 18:12 release 20261019-175128 NOT landed: GitHub Actions/Pages incident (CI queued >15 min). Will re-run release.sh after tutorial-auto's release lands.
- 18:18 LANDED main 3110dfa = 20261019-175128; waiting for Pages deploy (GitHub incident)

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
- 18:41 LIVE 20261019-175128 verified: probe order/open/X clear on iphone13, ipadP, ipadL x EN/DE/ES. Files free again.
