#!/bin/bash
# boot.sh PORT VIEW [ROOT]  -- starts a fresh-profile driver on PORT
cd /home/sprite/NEWUSER
for p in $(ps aux | grep "[d]rv\.cjs .* $1\$" | awk '{print $2}'); do kill -9 $p; done
for i in $(seq 10); do ss -ltn | grep -q ":$1 " || break; sleep 1; done
nohup node drv.cjs ${3:-/home/sprite/wt-newuser} $2 $1 > drv$1.log 2>&1 &
for i in $(seq 40); do grep -q ready drv$1.log 2>/dev/null && break; sleep 1; done
for f in snapfn.js audit.js tree.js; do ./d.sh $1 < $f; done; echo
