# LOWiSPIKE release guide

## Production model

- Repository: `therealetm/lowispike`
- Production branch: `main`
- Live URL: <https://therealetm.github.io/lowispike/>
- Hosting: GitHub Pages with source **GitHub Actions**. The `deploy` job in `.github/workflows/ci.yml` publishes `main` only after the `Release check and tests` job passed on that commit. Nothing deploys straight from the branch any more.
- Ruleset `main: tests must pass` (Settings > Rules): a commit may only land on `main` after the `Release check and tests` check (GitHub Actions) passed on that exact commit; force pushes and deleting `main` are blocked. Nobody is on the bypass list, the deploy key included.
- `.github/workflows/keepalive.yml` only pings the free Supabase backend every three days; it is not the application deployment workflow.
- `.github/workflows/ci.yml` runs `scripts/release-check.cjs`, the full test suite and a whitespace check on every push and pull request. On `main` it then deploys Pages (only if the checks passed) and its last job waits until the live site serves that build (or a newer one) and the shell files match the commit. A red CI run on `main` means something is wrong live: look before releasing more.

## Release tooling (use this, not a new one-off script)

```bash
# from a worktree whose branch holds the finished, committed change
scripts/release.sh "what users get, in one line" --news news.json
```

`news.json` is the What's New entry: `{"slug":"care-board","go":{"tab":"home"},"lead":{en,de,es},"steps":[...],"text":{"en":"..","de":"..","es":".."}}`. The script takes the shared lock `/tmp/lowispike-release.lock`, fetches, rebases on `origin/main` (stops on conflict), moves every build id to a fresh one later than both the repo and the live build (`scripts/bump-build.cjs`), runs `scripts/release-check.cjs` and all tests (undoes the bump on failure), checks whitespace, commits only the four build files, lands it with `scripts/push-main.sh` (pushes the commit to a `ci/` branch, waits with `scripts/wait-ci.cjs` until CI passed on it, then fast-forwards `main` without force), frees the lock and then waits for the live site (`scripts/verify-live.cjs --at-least --compare`). `--no-bump` releases a commit that already carries its build; `--no-verify` skips the wait.

Parts on their own: `node scripts/release-check.cjs` (gate, exit 1 on errors), `node scripts/bump-build.cjs --dry-run` (shows the next id), `node scripts/verify-live.cjs [BUILD] --compare` (is it live, do the bytes match).

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
2. Land it with `scripts/push-main.sh` while holding the lock. A plain `git push origin HEAD:main` of a commit that has not passed CI is refused by the ruleset ("Required status check ... is expected"); push-main first runs CI on a `ci/` branch, then does the plain fast-forward push, which is the lease: it can never overwrite another agent's release. Never use `--force`.
3. If the push is refused, fetch, rebase and run the checks again (`scripts/release.sh` does this under the lock).
4. Wait for the CI run on `main` (tests, then `Deploy to GitHub Pages`) to succeed.
5. Fetch the live page with cache busting and verify its embedded build identifier. Pages sends `Cache-Control: max-age=600`, so an unbusted fetch can show a build up to ten minutes old.
6. Fetch live `version.json` and confirm the same build. `scripts/verify-live.cjs` does 4 to 6 and compares the bytes.
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


## World-first Home build 20261015-173001
Recovered the supplied source patch against `dcfe82cd19f085ce230cba1e7b40c30791c80a60`, including the final uncommitted CSS/JS layer. Build metadata, service-worker cache and ordered-loader versions are synchronized. The user explicitly requested publication before further browser setup so they can review the app. Publication and live verification must be checked separately from the 445 passing automated tests.
## Community branch integration boundary (2026-10-15)

The Community chat branch adds four assets to both service-worker lists without advancing build metadata. It is not a release. The release owner must reconcile current Home changes, apply/review the backend prerequisites in staging, complete live account/RLS/privacy/moderation and browser/device checks, then advance the shared build/cache/version IDs together. Do not merge this branch as evidence of production acceptance; see `COMMUNITY_CHAT.md`.
