#!/bin/bash
cd /home/sprite/wt-admin-delete
for spec in "$@"; do e=${spec%:*}; l=${spec#*:}
  SB=/home/sprite/bin/sbw.sh timeout 700 node tools/admin-delete/check.cjs $e $l https://therealetm.github.io/lowispike/ > /home/sprite/ad-live-$e-$l.log 2>&1
  ids=$(grep -m1 '^IDS ' /home/sprite/ad-live-$e-$l.log | cut -d' ' -f2-)
  [ -n "$ids" ] && tools/admin-delete/cleanup.sh $ids >> /home/sprite/ad-live-$e-$l.log 2>&1
done
