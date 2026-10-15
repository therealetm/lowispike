# LOWiSPIKE release guide

## Production model

- Repository: `therealetm/lowispike`
- Production branch: `main`
- Live URL: <https://therealetm.github.io/lowispike/>
- Hosting: GitHub Pages configured at repository level.
- `.github/workflows/keepalive.yml` only pings the free Supabase backend every three days; it is not the application deployment workflow.

`main` is live. Use a branch and pull request for non-trivial work unless the user explicitly asks to ship directly.

## Build identifiers

A behavioral/assets release uses one sortable build identifier, currently formatted like `YYYYMMDD-HHMMSS`. Keep these locations synchronized:

1. Build metadata in `index.html`.
2. `version.json` → `build`.
3. `sw.js` → `SHELL_BUILD` and the `CACHE` suffix.
4. `apple-ui.js` → herb dynamic-loader cache-busting version when a dynamically loaded herb asset changed.

If a new external runtime asset is needed offline, add it to `sw.js` `STATIC` and the appropriate network-first asset list. A documentation-only commit does not need a new application build identifier.

## Preflight

1. Read the root documentation and confirm the requested scope.
2. Fetch the remote `main` SHA and compare it with the working base.
3. Inspect the working tree. Preserve unrelated changes and assets.
4. Freeze scope: no opportunistic redesigns after verification starts.
5. Run:

```bash
node --test tests/*.test.cjs
git diff --check
```

6. Perform the relevant fixture/browser matrix from `TESTING.md`.
7. Confirm version strings are aligned if this is an app release.

## Publishing safely

1. Create the commit from the verified base.
2. Update the remote branch with the previously observed head SHA as a lease.
3. If the lease fails, fetch the new head and reconcile. Never force over unknown work.
4. Wait for the repository's Pages deployment for that commit to succeed.
5. Fetch the live page with cache busting and verify its embedded build identifier.
6. Fetch live `version.json` and confirm the same build.
7. Open the live app once in a clean browser context and once with an existing service worker when the change affects caching or updates.

## Update-system invariants

- The loaded HTML is authoritative for which build is active.
- `version.json` announces availability; it must never relabel stale cached HTML as updated.
- Refresh is user-triggered. Do not create automatic refresh loops.
- A success notice appears only after the newly loaded HTML reaches the requested build.
- A failed refresh has a bounded cooldown and must not hide a different later build.
- Success and “new version” notices never overlap.

These behaviors are enforced by `tests/update.test.cjs` and must remain covered.

## Service-worker hazards

- Navigation is network-first with cached shell fallback.
- Runtime feature files are network-first and fall back to the current named cache.
- Changing code without changing the cache/build version can leave installed PWAs on a mixed release.
- Removing a cached filename can break offline use; add the replacement before removal and test an upgraded existing install.
- The push handler imports herb core files. Keep them valid in both window and worker contexts.

## Rollback

Prefer a new revert commit on `main`; do not rewrite public history. A rollback is itself a new build when runtime files or cache contents change, so advance the build identifier and cache name. Verify Pages and the served build exactly as for a forward release.

## Release report template

```text
Commit: <full SHA>
Build: <identifier or “documentation only”>
Live URL: https://therealetm.github.io/lowispike/
Automated: <command and result>
Browser/fixture: <viewports and result>
Physical device: <device/OS/result or “not performed”>
Pages: <success and served-build verification>
Known limitations: <none or exact list>
```


## Spirit build 20261014-162100

The Spirit assets (`spirit-core.js`, `spirit.js`, `spirit.css`) are part of the ordered loader and network-first/offline asset lists. The 50-test suite and whitespace checks pass. Publishing uses Git data API blobs/tree/commit plus a leased `main` ref when shell Git has no write credentials. Each blob SHA is checked against the local `git hash-object` result before moving the ref. Premium checkout and physical-device/production-account checks are explicitly unverified.

## Community branch integration boundary (2026-10-15)

The Community chat branch adds four assets to both service-worker lists without advancing build metadata. It is not a release. The release owner must reconcile current Home changes, apply/review the backend prerequisites in staging, complete live account/RLS/privacy/moderation and browser/device checks, then advance the shared build/cache/version IDs together. Do not merge this branch as evidence of production acceptance; see `COMMUNITY_CHAT.md`.
