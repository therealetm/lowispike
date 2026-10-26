cd /home/sprite/PROMO/h
run(){ timeout 1500 node rec2.cjs $1 $2 > r2-$1-$2.log 2>&1; }
(run home en; run gap en; run home2 de) &
(run photo en; run move en; run home2 es) &
(run card en; run shop en) &
(COMM=1 run comm en; run cook en) &
wait; echo ALLDONE > r2-done.txt
