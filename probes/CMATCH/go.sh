#!/bin/bash
cd /home/sprite/CMATCH
nohup node /home/sprite/NEWUSER/srv.cjs /home/sprite/wt-companion-match 8877 > srv.log 2>&1 &
sleep 1
sed -i 's#8833#8877#' runflows.sh
rm -f flow-*.out flows.done
nohup ./runflows.sh > /dev/null 2>&1 &
