const L=require('/home/sprite/lowispike/playtest/food-audit-lib.cjs');
(async()=>{const H=await L.open({root:'/home/sprite/lowispike',lang:'de',locale:'de-DE',out:'/home/sprite/ASO/shots',tag:'de',init:require('./seed.js')});
const steps=[['scan','[data-orbit=scan]'],['gap','[data-orbit=gap]'],['comm','[data-orbit=settings]'],['misty','#spBubble']];
for(const [n,s] of steps){await H.tap(s);await H.sleep(2500);await H.shot(n);console.log('=====',n,(await H.text()).slice(0,900));console.log(JSON.stringify((await H.dump(60)).filter(x=>!x.startsWith('(covered)')),null,0));await H.reload();}
await H.close();})().catch(e=>{console.error(e);process.exit(1)});
