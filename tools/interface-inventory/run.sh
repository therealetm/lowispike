#!/bin/bash
# runs every root through crawl.cjs, $PAR at a time, in the background
cd "$(dirname "$0")"
PAR=${PAR:-4}; DEPTH=${DEPTH:-4}
export IA_ROOT=/home/sprite/lowispike/wt-inventory OUT=${OUT:-/home/sprite/inv-shots} BUDGET_S=${BUDGET_S:-1500}
mkdir -p $OUT/logs
for r in $(node -e "console.log(Object.keys(require('./roots.json')).join(' '))"); do
  while [ $(jobs -r | wc -l) -ge $PAR ]; do sleep 5; done
  ROOT="$(node -e "console.log(JSON.stringify(require('./roots.json')['$r']))")" node crawl.cjs $r $DEPTH > $OUT/logs/$r.log 2>&1 &
  sleep 3
done
wait
echo ALLDONE > $OUT/logs/ALLDONE
