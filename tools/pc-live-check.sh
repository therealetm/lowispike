#!/usr/bin/env bash
# waits for build >= $1 on the live site, then runs the product card probe in all views/languages
B="$1"; OUT=/home/sprite/pc-live-results.txt; : > "$OUT"
for i in $(seq 1 240); do
  b=$(curl -s "https://therealetm.github.io/lowispike/version.json?x=$RANDOM" | python3 -c 'import json,sys;print(json.load(sys.stdin)["build"])' 2>/dev/null)
  [ "$b" \> "$B" ] || [ "$b" = "$B" ] && break; sleep 30
done
echo "LIVE BUILD $b $(date +%T)" >> "$OUT"
cd /home/sprite/wt-product-card
for v in iphone13 ipadP ipadL; do for l in en de es; do
  r=$(timeout 240 node tools/probe-product-card.cjs $v https://therealetm.github.io/lowispike/ $l /tmp/pclive 2>&1 | tail -1)
  echo "$v $l $r" >> "$OUT"
done; done
echo DONE >> "$OUT"
