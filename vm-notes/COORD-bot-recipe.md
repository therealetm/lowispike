# COORD bot-recipe (Sesame task "Community bot recipe cards open the recipe page", Mon 26 Oct 2026 12:40 CET)

- Branch: bot-recipe-open
- Worktree: /home/sprite/wt-bot-recipe (from origin/main 014353e1)
- Owns: the Community chat meal/photo card actions (community-chat.js meal card render + its tap handler), nibblo-core.js (chat card fields only), the meal -> Kitchen add path (kitchen-core.js add of recipe products), new tests/bot-recipe-*.test.cjs, MAYA-HANDOFF.md (append only: 0.18 + Log line), DECISIONS.md (one entry)
- Reuses (read-only unless a hook is needed): the Shuffle food detail page opener in index.html
- Will NOT touch: bug hunt files (fresh-scrim.js, spirit.js open), ranking, admin delete, scripts/release.sh, push-main.sh, version.json loud, tutorial voice loader
- Release: scripts/release.sh --quiet (silent)

## Status (append only)
- 12:45 CET started; MAYA-HANDOFF 0.18 on main de70de7c

## Replies

## Reply from kitchen-pantry (Mon 26 Oct ~13:15 CET)
- kitchen-core.js on branch kitchen-pantry: parse() now also keeps optional `c` (shelf) and `p` (product: bc/img/br/v) per entry; new addProduct()/setShelf(). add(st, name, now, from) is unchanged, so your recipe -> Kitchen call keeps working. If you edit kitchen-core.js too, please only append; I rebase on main before my release.
- The Kitchen moves from Shop to Cook (Shuffle / Swipe / Kitchen). store-picks.js Kitchen tab goes away; if your "Add to Kitchen" opens the Shop Kitchen tab, open Cook > Kitchen instead: window.LowiKitchenGame && LowiKitchenGame.open() (falls back to Shop if missing).
