#!/bin/bash
# Run regression workers one after another, each only when the shared VM has room (task 29188430).
# The VM restarted twice this morning under the load of several agents' browsers at once (09:26 and 09:33 CEST), so a
# worker starts only when MemAvailable > MINMB and fewer than MAXB browser processes run in total (all agents), and
# each worker gets a hard timeout. Usage: tools/regress/run-gated.sh "w1-chat-lifecycle.cjs --engine webkit" ...
cd "$(dirname "$0")/../.."
MINMB=${MINMB:-3500}; MAXB=${MAXB:-5}; MAXLOAD=${MAXLOAD:-18}
for w in "$@"; do
  n=$(echo "$w" | cut -d' ' -f1 | sed 's/\.cjs//')
  while :; do
    av=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
    # one count per browser launch: the WebKit MiniBrowser main process, the Chromium main process (no --type=)
    nb=$(( $(pgrep -fc 'minibrowser-wpe/bin/MiniBrowser' || true) + $(pgrep -fa 'chrome-headless-shell|chrome-linux/chrome' | grep -vc -- '--type=' || true) ))
    load=$(cut -d' ' -f1 /proc/loadavg)
    if [ "$av" -gt "$MINMB" ] && [ "$nb" -lt "$MAXB" ] && awk "BEGIN{exit !($load < $MAXLOAD)}"; then break; fi
    echo "$(date +%T) waiting for room: avail=${av}MB browsers=$nb load=$load ($n)"; sleep 20
  done
  echo "$(date +%T) start $w"
  nice -n 15 timeout 900 node tools/regress/$w > tools/regress/out/$n.stdout 2>&1
  echo "$(date +%T) end $w exit=$?"
done
