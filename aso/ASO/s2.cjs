const L=require('/home/sprite/lowispike/playtest/food-audit-lib.cjs');
(async()=>{const H=await L.open({root:'/home/sprite/lowispike',lang:'de',locale:'de-DE',out:'/home/sprite/ASO/shots',tag:'de'});
for(let i=0;i<4;i++){await H.tap('[data-orbit=water]');await H.sleep(700);}
console.log('after water',JSON.stringify(await H.dump(40)));
await H.page.keyboard.press('Escape').catch(()=>{});await H.sleep(800);
await H.tap('[data-orbit=fuel]');await H.sleep(1500);await H.shot('fuel');
console.log('fuel',JSON.stringify(await H.dump(60),null,1));
await H.close();})().catch(e=>{console.error(e);process.exit(1)});
