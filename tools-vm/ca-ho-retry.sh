#!/usr/bin/env bash
# cart-ask handoff docs: rebase on main and land via push-main.sh, retrying when another docs push wins the race
cd /home/sprite/wt-cart-ask || exit 9
for i in 1 2 3 4 5; do
  git fetch -q origin && git rebase -q origin/main || { git rebase --abort; echo "rebase failed"; exit 3; }
  if flock -w 900 /tmp/lowispike-release.lock scripts/push-main.sh handoff; then echo "LANDED on try $i"; exit 0; fi
  echo "try $i lost the race"; sleep 5
done
exit 1
