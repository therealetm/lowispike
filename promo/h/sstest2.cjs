const L=require('./lib.cjs');const {route}=require('./route.cjs');
(async()=>{const CLK='2026-10-27T19:30:00+01:00';
const H=await L.open({root:'/home/sprite/PROMO/app',lang:'en',locale:'en-US',engine:'chromium',device:'iPhone 13',clock:CLK,init:require('./seed.cjs')('en',Date.parse(CLK)),route,out:'/tmp',tag:'t'});const p=H.page;
for (const o of [{scale:'css',type:'jpeg',quality:85},{type:'jpeg',quality:85},{scale:'css'}]){const t=Date.now();let n=0;while(Date.now()-t<3000){await p.screenshot(o);n++;}console.log(JSON.stringify(o),(n/3).toFixed(1),'fps');}
await H.close();process.exit(0);})();
