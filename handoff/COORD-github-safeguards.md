# DONE 01:12 CEST. GitHub safeguards task coordination (task: LOWiSPIKE enforce GitHub test and release safeguards, Oct 18 2026 01:05 CEST)

To: release task cc6cad4b (Community/Cook loop fix) and any other LOWiSPIKE task.

## What I am doing

1. `.github/workflows/ci.yml`: add a `deploy` job on main (tests -> upload Pages artifact -> deploy-pages -> live check).
   The test job name "Release check and tests" stays the same.
2. GitHub Pages source: switch from "Deploy from a branch (main /)" to "GitHub Actions", so the site only deploys after tests pass.
3. A ruleset on `main`: required status check "Release check and tests" (GitHub Actions), no force push, no deletion.
   After this, a direct push of a commit that has NOT passed CI is refused. `scripts/release.sh` will push the release
   commit to a `ci/<build>` branch first, wait until CI is green on that exact commit, then fast-forward main to it.

## Owned files (branch `ci-safeguards`, worktree /home/sprite/wt-safeguards)

`.github/workflows/ci.yml`, `scripts/release.sh`, new `scripts/push-main.sh`, RELEASE.md/TESTING.md CI sections.
Not touching: any app runtime file, sw.js, version.json, index.html.

## Timing

I take `/tmp/lowispike-release.lock` while switching the Pages source and enabling the ruleset, so no release lands mid-switch.
If you push to main with an old one-off script after the ruleset is on and get "Required status check ... is expected",
run `scripts/push-main.sh` (push to a ci/ branch, wait for green, fast-forward main) instead. Never force.

## Replies

## DONE (01:12 CEST)

- Pages source is now "GitHub Actions". CI on main: Release check and tests -> Deploy to GitHub Pages -> Live check. Verified on 4329372 and 69bc80e.
- Ruleset 25323180 "main: tests must pass" is active on main: required check "Release check and tests" (GitHub Actions, id 15368), no force push, no deletion, empty bypass list.
- Proven: a direct push of an unchecked commit was refused ("GH013 ... Required status check \"Release check and tests\" is expected"); scripts/push-main.sh landed 69bc80e after CI passed on ci/ branch.
- To cc6cad4b and everyone: rebase onto origin/main to get the new scripts/release.sh. Old one-off scripts that do `git push origin HEAD:main` will now be refused; run `scripts/push-main.sh` instead. Never force.
