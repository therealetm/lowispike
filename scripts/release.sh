#!/usr/bin/env bash
# One release path for every agent. Run it from a worktree whose branch holds the finished,
# committed change. It never force-pushes and never touches files you did not commit.
#
#   scripts/release.sh "Short summary of what users get" [--news news.json] [--no-bump] [--no-verify]
#
# Steps: shared lock -> fetch -> rebase on origin/main -> bump build (+ What's New) ->
# release-check -> full test suite -> whitespace check -> commit -> scripts/push-main.sh (CI must
# pass on the exact commit on a ci/ branch, then main fast-forwards; the main ruleset requires it) ->
# release lock freed -> wait until GitHub Pages (deployed by CI after its tests) serves the build.
set -euo pipefail
SUMMARY="${1:?usage: scripts/release.sh \"summary\" [--news news.json] [--no-bump] [--no-verify]}"; shift
NEWS=""; BUMP=1; VERIFY=1
while [ $# -gt 0 ]; do case "$1" in
  --news) NEWS="$(realpath "$2")"; shift 2;;
  --no-bump) BUMP=0; shift;;
  --no-verify) VERIFY=0; shift;;
  *) echo "unknown option $1"; exit 2;;
esac; done
cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then echo "BLOCKER: commit or stash your changes first:"; git status --short; exit 6; fi

exec 9>"${LOWISPIKE_RELEASE_LOCK:-/tmp/lowispike-release.lock}"
flock -w 1800 9 || { echo "BLOCKER: another release held the lock for 30 minutes"; exit 7; }
echo "lock held $(date -u +%T)"
git fetch -q origin
git rebase -q origin/main || { git rebase --abort; echo "BLOCKER: rebase conflict with origin/main"; exit 3; }
BASE=$(git rev-parse origin/main)

if [ "$BUMP" = 1 ]; then
  NEW=$(node scripts/bump-build.cjs ${NEWS:+--news "$NEWS"} | tail -1)
else
  NEW=$(node -e "console.log(require('./version.json').build)")
fi
node scripts/release-check.cjs
LOG=$(mktemp /tmp/lowispike-tests.XXXX.log)
if ! node --test tests/*.test.cjs >"$LOG" 2>&1; then
  tail -40 "$LOG"; git checkout -- . ; echo "BLOCKER: tests failed, bump undone"; exit 4
fi
grep -E '^ℹ (tests|pass|fail)' "$LOG"
node scripts/test-floor.cjs "$LOG" --ref origin/main || { git checkout -- . ; echo "BLOCKER: test count dropped, bump undone"; exit 4; }
PASS=$(grep -oP '^ℹ pass \K\d+' "$LOG"); TOTAL=$(grep -oP '^ℹ tests \K\d+' "$LOG")
git diff --check "$BASE"

if [ -n "$(git status --porcelain)" ]; then
  git add index.html sw.js apple-ui.js version.json
  if ! git diff --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then echo "BLOCKER: unexpected files changed:"; git status --short; exit 6; fi
  git commit -qm "Release $NEW: $SUMMARY (tests $PASS/$TOTAL)"
fi
# CI has to pass on this exact commit before main accepts it (ruleset), and main only fast-forwards,
# so this can never land red code or overwrite someone else's release.
scripts/push-main.sh "$NEW" || { echo "BLOCKER: not landed; the commit stays on this branch"; exit 5; }
SHA=$(git rev-parse HEAD)
echo "pushed $SHA as $NEW"
exec 9>&-   # free the lock before the slow wait so other agents can release

if [ "$VERIFY" = 1 ]; then node scripts/verify-live.cjs "$NEW" --at-least --compare --timeout 900; fi
