#!/usr/bin/env bash
# One release path for every agent. Run it from a worktree whose branch holds the finished,
# committed change. It never force-pushes and never touches files you did not commit.
#
#   scripts/release.sh "Short summary of what users get" [--news news.json | --quiet] [--no-bump] [--no-verify]
#   --quiet: a bug fix with no What's New. EVERY release is silent (Oct 26, Emmanuel: "no more notification updates"):
#            no release ever asks phones to update, says "Update loaded", sends a push or posts to Community. "loud" in
#            version.json stays 20000101-000000 (bump-build.cjs writes it, release-check.cjs fails anything else).
#            There is deliberately no option that notifies or announces anything. Do not add one.
#
# Steps: shared lock -> fetch -> rebase on origin/main -> bump build (+ What's New) ->
# release-check -> full test suite -> whitespace check -> commit -> scripts/push-main.sh (CI must
# pass on the exact commit on a ci/ branch, then main fast-forwards; the main ruleset requires it) ->
# release lock freed -> wait until GitHub Pages (deployed by CI after its tests) serves the build.
set -euo pipefail
SUMMARY="${1:?usage: scripts/release.sh \"summary\" [--news news.json | --quiet] [--no-bump] [--no-verify]}"; shift
NEWS=""; BUMP=1; VERIFY=1; QUIET=""
while [ $# -gt 0 ]; do case "$1" in
  --news) NEWS="$(realpath "$2")"; shift 2;;
  --quiet) QUIET="--quiet"; shift;;
  --no-bump) BUMP=0; shift;;
  --no-verify) VERIFY=0; shift;;
  *) echo "unknown option $1"; exit 2;;
esac; done
if [ -n "$QUIET" ] && [ -n "$NEWS" ]; then echo "BLOCKER: a quiet release (silent bug fix) has no What's New: drop --news or --quiet"; exit 2; fi
cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain)" ]; then echo "BLOCKER: commit or stash your changes first:"; git status --short; exit 6; fi

exec 9>"${LOWISPIKE_RELEASE_LOCK:-/tmp/lowispike-release.lock}"
flock -w 1800 9 || { echo "BLOCKER: another release held the lock for 30 minutes"; exit 7; }
echo "lock held $(date -u +%T)"
git fetch -q origin
git rebase -q origin/main || { git rebase --abort; echo "BLOCKER: rebase conflict with origin/main"; exit 3; }
BASE=$(git rev-parse origin/main)

if [ "$BUMP" = 1 ]; then
  NEW=$(node scripts/bump-build.cjs ${NEWS:+--news "$NEWS"} $QUIET | tail -1)
else
  NEW=$(node -e "console.log(require('./version.json').build)")
fi
# Oct 21: the guide reads the news in the app's human voice (app-voice.js); record this release's news sentences. Best effort:
# without edge-tts or the network the release still goes out, and the guide reads the news with the device voice.
if [ "$BUMP" = 1 ] && [ -n "$NEWS" ] && [ -f tools/app-voice/build.py ]; then
  timeout 240 python3 tools/app-voice/build.py --news >/tmp/app-voice-news.log 2>&1 && tail -1 /tmp/app-voice-news.log \
    || echo "warning: news voice not recorded (see /tmp/app-voice-news.log); the guide reads it with the device voice"
fi
# Oct 24 2026: the tour's What's New card (a release with no tour step) is read by the recorded tutorial voice only, never the
# device voice. Record it in the approved voice (tools/tutorial-voice/build.py; TUTORIAL.md "Voice"). Without it
# tests/tutorial-voice-only.test.cjs fails below and the bump is undone: a news release does not go out with an unvoiced card.
if [ "$BUMP" = 1 ] && [ -n "$NEWS" ] && [ -f tools/tutorial-voice/build.py ]; then
  timeout 300 python3 tools/tutorial-voice/build.py >/tmp/tutorial-voice-news.log 2>&1 && tail -1 /tmp/tutorial-voice-news.log \
    || echo "warning: What's New card not recorded in the tutorial voice (see /tmp/tutorial-voice-news.log); the tests will block"
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
  [ -f app-voice-data.js ] && git add app-voice-data.js app-voice
  [ -f tutorial-voice-data.js ] && git add tutorial-voice-data.js tutorial-voice
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
