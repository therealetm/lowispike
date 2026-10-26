const L=require('/home/sprite/lowispike/playtest/food-audit-lib.cjs');
(async()=>{const H=await L.open({root:'/home/sprite/lowispike',lang:'de',locale:'de-DE',out:'/home/sprite/ASO/shots',tag:'de',init:require('./seed.js')});
await H.shot('home2'); console.log(JSON.stringify(await H.dump(12)));
await H.tap('[data-orbit=fuel]');await H.sleep(1200);
await H.tap('[data-id=log]');await H.sleep(2000);await H.shot('log');
console.log('log',await H.text()); console.log(JSON.stringify(await H.dump(50),null,1));
await H.close();})().catch(e=>{console.error(e);process.exit(1)});
