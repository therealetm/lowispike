#!/bin/bash
cd /home/sprite/CMATCH; export URL=http://127.0.0.1:8877/
for a in "iphone13 1997-10-12 ''" "iphone13 1997-10-27 07:45" "chromium390 1997-10-03 ''" "ipadL 1990-03-30 ''"; do eval set -- $a; SHOT=shots/flow-$1-$2 timeout 400 node flow.cjs x $1 $2 "$3" > flow-$1-$2.out 2>&1; done
echo ALLDONE > flows.done
