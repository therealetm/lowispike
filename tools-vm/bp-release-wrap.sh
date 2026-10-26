#!/bin/bash
# Hold the shared release lock myself, rebase (auto-resolving only the build-stamp conflict), then run release.sh
# under a private lock name so it does not wait on the lock I already hold.
cd /home/sprite/wt-better-pick
exec 9>/tmp/lowispike-release.lock
flock -w 3000 9 || { echo "BLOCKER: lock wait"; exit 7; }
echo "outer lock held $(date -u +%T)"
git fetch -q origin
if ! git rebase -q origin/main; then
  bash /home/sprite/bp-fix-conflict.sh || { git rebase --abort; echo "BLOCKER: real conflict"; exit 3; }
fi
grep -q '<script src="better-pick-core.js' index.html || { echo "BLOCKER: core tag missing"; exit 3; }
LOWISPIKE_RELEASE_LOCK=/tmp/bp-private-release.lock scripts/release.sh "Better pick only suggests a better version of the same kind of food (almonds no longer get eggplant sauce)" --quiet
echo "EXIT $?"
