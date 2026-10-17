#!/usr/bin/env bash
# Lands the current HEAD on main the only way the main ruleset allows: the exact commit must
# already have passed "Release check and tests". So: push it to a throwaway ci/ branch, wait
# for CI to pass on that commit, then fast-forward main to it (plain push, never force) and
# delete the ci/ branch. GitHub Pages then deploys from the CI run on main, after its tests.
#
#   scripts/push-main.sh [label]     (run while holding /tmp/lowispike-release.lock)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
SHA=$(git rev-parse HEAD)
BR="ci/${1:-push}-$(date -u +%Y%m%d%H%M%S)"
git push -q origin "HEAD:refs/heads/$BR"
echo "pushed $SHA to $BR, waiting for CI"
set +e; node scripts/wait-ci.cjs "$SHA" --timeout 900; RC=$?; set -e
if [ "$RC" != 0 ]; then
  git push -q origin --delete "$BR" || true
  echo "BLOCKER: CI did not pass on $SHA (exit $RC); main was not touched"; exit 5
fi
git push origin HEAD:main   # refused unless it fast-forwards, so it can never overwrite another release
git push -q origin --delete "$BR" || true
echo "main is now $SHA"
