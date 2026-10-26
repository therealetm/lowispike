#!/usr/bin/env bash
# Land the MAYA-HANDOFF docs commit on main: hold the release lock, rebase on origin/main, push-main.sh. Retry on refusal.
cd /home/sprite/wt-maya-handoff || exit 1
for i in 1 2 3 4 5 6; do
  echo "== attempt $i $(date +%H:%M:%S)"
  (
    flock 9
    echo "lock taken $(date +%H:%M:%S)"
    git fetch -q origin && git rebase -q origin/main || { echo REBASE_FAIL; git rebase --abort; exit 3; }
    scripts/push-main.sh maya-handoff
  ) 9>/tmp/lowispike-release.lock
  rc=$?
  echo "rc=$rc $(date +%H:%M:%S)"
  [ $rc = 0 ] && { echo LANDED; git log --oneline -1; exit 0; }
  [ $rc = 3 ] && exit 3
  sleep 20
done
echo GAVE_UP
