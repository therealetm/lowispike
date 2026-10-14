# Spirit release evidence

Build: `20261014-162100`

- Automated: `node --test tests/*.test.cjs` — 50 passed, 0 failed.
- Syntax: new Spirit runtime and fixture scripts parse.
- Whitespace: `git diff --check` passed.
- Existing stages, canonical XP ledger, evolution, cosmetics, tap/dizzy reactions, check-ins and meal regression tests still pass.
- Native meal/capture/water duplicate-replay and macro-goal tests pass.
- Browser fixture: pending live verification.
- GitHub Pages and served build: pending publication.
- Physical device, camera permission/scanning, 60-fps measurement: not performed.
- Production uploaded posts/avatar recovery: not verified against a signed-in account. The merge and save fixes retain existing media; no backend deletion or migration was made.
- Premium checkout: unavailable; the codebase has only a free-account gate and no payment provider.

The entire original acceptance checklist is not yet proven complete.
