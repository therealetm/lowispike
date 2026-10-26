const L=require('/home/sprite/lowispike/playtest/food-audit-lib.cjs');
(async()=>{const H=await L.open({root:'/home/sprite/lowispike',lang:'de',locale:'de-DE',out:'/home/sprite/ASO/shots',tag:'de'});
await H.shot('home'); console.log(JSON.stringify(await H.dump(60),null,1)); console.log(await H.text()); console.log(H.errs.slice(0,5)); await H.close();})().catch(e=>{console.error(e);process.exit(1)});
