const L=require('/home/sprite/lowispike/playtest/food-audit-lib.cjs');
const PRODUCT={status:1,code:'4012345678901',product:{code:'4012345678901',product_name:'Erdbeer-Fruchtjoghurt',brands:'Musterbrand',quantity:'500 g',nutriments:{'energy-kcal_100g':98,sugars_100g:13.5,carbohydrates_100g:14.2,proteins_100g:3.4,fat_100g:2.9,fiber_100g:0.3,salt_100g:0.1},nova_group:4,ingredients_text:'Joghurt, Zucker, Erdbeeren 8%, Glukose-Fruktose-Sirup, Aroma'}};
const route=(q,u)=>/openfoodfacts/.test(u.host)?{status:200,contentType:'application/json',body:JSON.stringify(PRODUCT)}:null;
const which=(process.argv[2]||'').split(',');
const J={
 async scanres(H,p){await H.tap('[data-orbit=scan]');await H.sleep(2500);await p.tap('#b3Bc');await p.keyboard.type('4012345678901');await p.keyboard.press('Enter');await H.sleep(7000);},
 async swipe(H){await H.tap('[data-orbit=fuel]');await H.sleep(1200);await H.tap('#hb2Bloom [data-id="cook"]');await H.sleep(3000);await H.tap('[data-ck=view][data-v=swipe]');await H.sleep(3000);},
 async recipes(H){await H.tap('[data-orbit=fuel]');await H.sleep(1200);await H.tap('#hb2Bloom [data-id="cook"]');await H.sleep(3000);await H.tap('[data-g2c-open=all]');await H.sleep(3000);},
 async cook(H){await H.tap('[data-orbit=fuel]');await H.sleep(1200);await H.tap('#hb2Bloom [data-id="cook"]');await H.sleep(3500);},
 async shop(H){await H.tap('[data-orbit=fuel]');await H.sleep(1200);await H.tap('#hb2Bloom [data-id="shop"]');await H.sleep(3500);},
 async home(H){await H.sleep(1500);},
 async fuel(H){await H.tap('[data-orbit=fuel]');await H.sleep(1800);},
 async gap(H){await H.tap('[data-orbit=gap]');await H.sleep(2500);},
 async log(H,p){await H.tap('[data-orbit=fuel]');await H.sleep(1200);await H.tap('#hb2Bloom [data-id="log"]');await H.sleep(1800);await H.tap('[data-slot=meal]');await H.sleep(1500);const i=await p.$('input:visible');if(i){await i.fill(process.env.MEAL||'Lachs mit Gemüse');await H.sleep(2500);}},
 async fy(H){await H.tap('[data-orbit=settings]');await H.sleep(2500);await H.tap('[data-rm=fy]');await H.sleep(3000);},
 async rank(H){await H.tap('[data-orbit=settings]');await H.sleep(2500);await H.tap('[data-rm=rank]');await H.sleep(3000);},
 async room(H){await H.tap('[data-orbit=settings]');await H.sleep(2500);await H.tap('[data-rm=room]');await H.sleep(3000);},
 async comm(H){await H.tap('[data-orbit=settings]');await H.sleep(3000);},
 async move(H){await H.tap('[data-orbit=move]');await H.sleep(2500);},
 async water(H){await H.tap('[data-orbit=water]');await H.sleep(2500);},
};
(async()=>{const H=await L.open({root:'/home/sprite/lowispike',lang:process.env.LG||'de',locale:'de-DE',engine:process.env.ENG||'webkit',out:'/home/sprite/ASO/shots',tag:'de',init:require('./seed.js'),route});const p=H.page;
await p.setViewportSize({width:390,height:844});await H.reload();
let first=true;
for(const n of which){ if(!J[n]){console.log('no',n);continue;} if(!first) await H.reload(); first=false;
  try{await J[n](H,p);}catch(e){console.log('STEPERR',n,String(e).slice(0,200));}
  await p.screenshot({path:'/home/sprite/ASO/shots/'+(process.env.PFX||'c')+'-'+n+'.png',timeout:60000}).then(()=>console.log('SHOT',n)).catch(e=>console.log('SHOTERR',n,String(e).slice(0,200)));
  if(process.env.TXT){console.log('== '+n+'\n'+(await H.text()).slice(0,1400));console.log(JSON.stringify((await H.dump(60)).filter(x=>!x.startsWith('(covered)'))));}
}
await H.close();process.exit(0);})().catch(e=>{console.error(e);process.exit(1)});
