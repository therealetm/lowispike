const L=require('./lib.cjs');const {route}=require('./route.cjs');
(async()=>{const lang=process.env.LANG2||'en';const CLK=process.env.CLOCK||'2026-10-27T19:30:00+01:00';
const H=await L.open({root:'/home/sprite/PROMO/app',lang,locale:lang==='de'?'de-DE':'en-US',engine:'webkit',device:'iPhone 13',clock:CLK,init:require('./seed.cjs')(lang,Date.parse(CLK)),route,out:'/home/sprite/PROMO/shots',tag:'p'});const p=H.page;
await H.sleep(2500);
const steps=(process.env.STEPS||'').split(';').filter(Boolean);
for(const s of steps){ try{ await eval('(async()=>{'+s+'})()'); }catch(e){console.log('ERR',s.slice(0,60),String(e).slice(0,160));} }
await H.shot(process.env.N||'home');
if(process.env.DUMP) console.log((await H.dump(70)).join('\n'));
if(process.env.TXT) console.log((await H.text()).slice(0,2500));
console.log('ERRS',JSON.stringify(H.errs.slice(0,5)));
await H.close();process.exit(0);})().catch(e=>{console.error(e);process.exit(1)});
