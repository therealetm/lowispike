#!/bin/bash
# runs a named subset of roots: run2.sh "r1 r2 ..."  (PAR, DEPTH, BUDGET_S from env)
cd "$(dirname "$0")"
PAR=${PAR:-3}; DEPTH=${DEPTH:-3}
export IA_ROOT=/home/sprite/lowispike/wt-inventory OUT=${OUT:-/home/sprite/inv-shots} BUDGET_S=${BUDGET_S:-420}
mkdir -p $OUT/logs
for r in $1; do
  while [ $(jobs -r | wc -l) -ge $PAR ]; do sleep 5; done
  ROOT="$(node -e "console.log(JSON.stringify(require('./roots.json')['$r']))")" node crawl.cjs $r $DEPTH > $OUT/logs/$r.log 2>&1 &
  sleep 8
done
wait
echo DONE > $OUT/logs/DONE-$2
