# LOWiSPIKE

LOWiSPIKE is a mobile-first health and food game delivered as a static progressive web app. It combines meal and product checking, recipe adaptation, movement, fasting, daily quests, community features, and one living herb companion whose growth reflects real actions in the app.

Live app: <https://therealetm.github.io/lowispike/>

## Start here

Every engineer or AI must read these documents before changing code, in this order:

1. [`AGENTS.md`](AGENTS.md) — operating rules and non-negotiable invariants.
2. [`CONTEXT.md`](CONTEXT.md) — product purpose, audience, language, and experience direction.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — complete runtime and source ownership map.
4. [`SCREEN_MAP.md`](SCREEN_MAP.md) — screens, sheets, entry points, and user flows.
5. [`DATA_CONTRACTS.md`](DATA_CONTRACTS.md) — storage, events, globals, cloud tables, privacy, and XP rules.
6. [`TESTING.md`](TESTING.md) — automated and visual verification matrix.
7. [`RELEASE.md`](RELEASE.md) — versioning, service worker, GitHub Pages, and rollback.
8. [`DECISIONS.md`](DECISIONS.md) — append-only decisions and their reasons.
9. [`TICKETS.md`](TICKETS.md) — ordered work that is proposed or approved.

If documentation and code disagree, stop, inspect the tests and deployed app, and resolve the discrepancy. Do not silently choose one. Update the documentation in the same change.

## Development

There is no bundler or framework build. `index.html` is the app entry point and contains most legacy application code and CSS. External JavaScript and CSS files add bounded features around it.

Run the full automated suite:

```bash
node --test tests/*.test.cjs
git diff --check
```

Open these directly for visual QA:

- `tests/mobile-layout-qa.html` — Today, Scan, Cook, and Move at an iPhone viewport.
- `tests/herb-visual-qa.html` — all herb stages and companion states.
- `tests/herb-iphone.html` — focused companion phone fixture.

For gesture, sheet, spring, translucency, or motion changes, read `.agents/skills/apple-design/SKILL.md` before implementation.

## Architectural warning

`index.html` is approximately 3.27 MB and contains a chain of ordered inline modules. Their order and shared globals are part of the runtime contract. Do not reformat, reorder, or broadly rewrite it during a focused fix. Locate the owning module in `ARCHITECTURE.md`, patch the narrowest boundary, and add a regression test.

`vendor/`, generated image assets, recipe step images, and unrelated user assets are not refactoring targets.

