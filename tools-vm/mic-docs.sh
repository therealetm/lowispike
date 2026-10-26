#!/usr/bin/env bash
cd /home/sprite/wt-mic
exec 9>/tmp/lowispike-release.lock; flock -w 3600 9 || exit 7
git fetch -q origin && git rebase -q origin/main || { git rebase --abort; echo BLOCKER rebase; exit 3; }
scripts/push-main.sh "mic docs"
