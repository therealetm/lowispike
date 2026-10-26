#!/usr/bin/env bash
# lands a docs-only commit of the supermarket worktree on main, under the shared release lock
cd /home/sprite/wt-supermarket || exit 1
exec 9>/tmp/lowispike-release.lock
flock -w 1500 9 || { echo "lock timeout"; exit 7; }
echo "lock held $(date -u +%T)"
git fetch -q origin && git rebase -q origin/main || { echo "rebase failed"; git rebase --abort; exit 3; }
bash scripts/push-main.sh "${1:-handoff-supermarket}"
echo "exit $? $(date -u +%T)"
