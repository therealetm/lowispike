const L=require('/home/sprite/lowispike/playtest/food-audit-lib.cjs');
(async()=>{const H=await L.open({root:'/home/sprite/lowispike',lang:'de',locale:'de-DE',out:'/home/sprite/ASO/shots',tag:'de',init:require('./seed.js')});
await H.tap('[data-orbit=fuel]');await H.sleep(1200);
await H.tap('[data-id=log]');await H.sleep(1800);
await H.tap('[data-slot=meal]');await H.sleep(1500);await H.shot('log2');
console.log(JSON.stringify(await H.dump(50),null,1));
const inp=await H.page.$('input:visible, textarea:visible'); if(inp){await inp.fill('Hähnchen mit Brokkoli und Reis');await H.sleep(2500);await H.shot('log3');console.log(await H.text());console.log(JSON.stringify(await H.dump(50),null,1));}
await H.close();})().catch(e=>{console.error(e);process.exit(1)});
