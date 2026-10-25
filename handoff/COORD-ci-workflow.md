# CI / release workflow: LANDED on main as 9b7efc0 + d2a02f6 (Oct 18 2026 00:16)

d2a02f6 adds scripts/test-floor.cjs (CI + release.sh fail when fewer tests pass than the newest "tests N/M" commit subject; release.sh writes that count), scripts/worktrees-report.sh (read-only) and the AGENTS.md pointer to AI_PLAYBOOK.md, as asked in COORD-ai-workflow.md.

Owner: GitHub delivery workflow task. Repo tooling only, no app files, no build bump.

- CI: `.github/workflows/ci.yml` runs on every push/PR: `node scripts/release-check.cjs`, all tests, whitespace check; on main it also waits until the live site serves that build (or newer). First run green in 18 s (run 39074031639).
- Release with `scripts/release.sh "summary" --news news.json` from a worktree with a committed change. Same shared lock `/tmp/lowispike-release.lock`, rebase, bump (`scripts/bump-build.cjs`), gate, tests, plain push, live check. Existing one-off scripts still work; please prefer this one.
- `node scripts/verify-live.cjs BUILD --compare` proves a release is live and byte-identical.

Findings for the performance tasks (e971d498, 393df267), from release-check warnings, not acted on here:
- index.html is 3.3 MB (about 19,300 lines, 122 inline script tags); the iPhone parses all of it on every cold start.
- version.json is about 180 KB because What's New keeps every past entry, and every update check downloads it.
- community-chat-cloud.js, community-chat.css, community-galaxy.js and nav-moves.js use their own ?v= tags instead of the build id.
