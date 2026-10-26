const L=require('./lib.cjs'),fs=require('fs');const {route}=require('./probe.cjs');
const which=(process.argv[2]||'home').split(',');
const J={
 async home(H){await H.sleep(2500);},
 async gap(H){await H.tap('[data-orbit=gap]');await H.sleep(3500);},
 async fuel(H){await H.tap('[data-orbit=fuel]');await H.sleep(2500);},
 async scanres(H,p){await H.tap('[data-orbit=scan]');await H.sleep(2500);await p.tap('#b3Bc');await p.keyboard.type('3017620422003');await p.keyboard.press('Enter');await H.sleep(7000);},
 async photo(H,p){await p.evaluate(()=>window.LowiSpirit&&LowiSpirit.photo&&LowiSpirit.photo());await H.sleep(2500);const i=await p.$('.sp-file-in');if(i)await i.setInputFiles(__dirname+'/data/rind.jpg');await p.waitForSelector('.sp-ai.fai-done, .sp-ai.fai-off, .sp-ai.fai-err',{timeout:30000}).catch(()=>console.log('photo wait timeout'));await H.sleep(2500);},
 async cook(H){await H.tap('[data-orbit=fuel]');await H.sleep(1200);await H.tap('#hb2Bloom [data-id="cook"]');await H.sleep(3500);},
 async swipe(H){await H.tap('[data-orbit=fuel]');await H.sleep(1200);await H.tap('#hb2Bloom [data-id="cook"]');await H.sleep(3000);await H.tap('[data-ck=view][data-v=swipe]');await H.sleep(3000);},
 async shop(H){await H.tap('[data-orbit=fuel]');await H.sleep(1200);await H.tap('#hb2Bloom [data-id="shop"]');await H.sleep(3500);},
 async comm(H){await H.tap('[data-orbit=settings]');await H.sleep(3000);},
 async rank(H){await H.tap('[data-orbit=settings]');await H.sleep(2500);await H.tap('[data-rm=rank]');await H.sleep(3000);},
 async card(H,p){await p.evaluate(()=>window.LowiCompanion&&LowiCompanion.open&&LowiCompanion.open());await H.sleep(3000);},
 async move(H){await H.tap('[data-orbit=move]');await H.sleep(2500);},
 async water(H){await H.tap('[data-orbit=water]');await H.sleep(2500);},
};
(async()=>{
for(const n of which){ if(!J[n]){console.log('no',n);continue;}
 const H=await L.open({root:'/home/sprite/lowispike',lang:'de',locale:'de-DE',engine:'webkit',device:'iPhone 14 Pro Max',clock:process.env.CLOCK||'2026-10-25T09:40:00+01:00',init:require('./seed.js'),route});const p=H.page;
 await p.setViewportSize({width:430,height:932});await H.sleep(2500);
  try{await J[n](H,p);}catch(e){console.log('STEPERR',n,String(e).slice(0,200));}
  await p.screenshot({path:__dirname+'/shots/'+(process.env.PFX||'c')+'-'+n+'.png',timeout:60000}).then(()=>console.log('SHOT',n)).catch(e=>console.log('SHOTERR',n,String(e).slice(0,200)));
  if(process.env.TXT){console.log('== '+n+'\n'+(await H.text()).slice(0,1600));}
  console.log('ERRS',JSON.stringify(H.errs.slice(0,4)));
  await H.close();
}
process.exit(0);})().catch(e=>{console.error(e);process.exit(1)});
