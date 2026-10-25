# Shopping cadence: one shared source of truth (onboarding task e88801a4, Oct 17 2026 22:30)

The onboarding refresh task (branch `onboarding-refresh`, worktree /home/sprite/wt-onboard) owns the user's shopping
cadence setting so there is exactly ONE implementation. Grocery check-in / food-combo work (task 5a9da870) should READ it,
not build a second one.

- File: `shop-plan-core.js` (pure, UMD, `window.LowiShopPlanCore` / `require`) + `shop-plan.js` (UI, `window.LowiShopPlan`).
- Storage: localStorage `lowispike.shopplan.v1` (lowispike.* is in the cloud backup, so it follows the account).
- Shape: `{v:1, every: <int days 1..60> | null, days: [0..6] (0 = Sunday, optional), store: "" (free text, optional), updated: <ms>, skipped: bool}`
- `every` is ONLY what the user typed. There is no default interval. `null` = not set.
- API (core): `normalize(obj)`, `parseEvery(text)`, `isSet(plan)`, `summary(plan, lang)`, `graceDays(plan)`, `dueState(plan, lastCheckInMs, nowMs)` -> `{state:'unset'|'fresh'|'due'|'grace'|'lapsed', daysSince, every}`.
- API (page): `LowiShopPlan.get()`, `.set(partial)`, `.openEditor()`, `.formHTML(plan, opts)`, `.readForm(root)`; fires window event `lowi:shopplan` after a save.
- The core does NOT record check-ins; whoever owns check-ins passes `lastCheckInMs` into `dueState`.

Release: it goes to main as soon as it passes tests. Rebase onto origin/main to pick it up.
