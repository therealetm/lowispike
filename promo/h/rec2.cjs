/* Frame-stepped recording of one promo scene (the WebKit renderer here is too slow for real-time video):
   the page clock is paused and moved 1/30 s per frame, every CSS/Web animation is paused and moved by the same step, then a
   full-resolution screenshot is taken. So every frame is exactly what the app shows at that moment, at a smooth 30 fps.
   Live app code (origin/main checkout), simulated iPhone 13 in WebKit, FAKE demo account, every write to the internet blocked.
   node rec2.cjs <scene> [lang] -> /home/sprite/PROMO/frames/<scene>-<lang>/f00001.jpg ... + meta.json */
const L=require('./lib.cjs');const {route}=require('./route.cjs');const fs=require('fs');
const scene=process.argv[2], lang=process.argv[3]||'en';process.env.LANG2=lang;
const CLK=process.env.CLOCK||'2026-10-27T19:30:00+01:00';const FPS=30, STEP=1000/FPS;
const DIR='/home/sprite/PROMO/frames/'+scene+'-'+lang;fs.rmSync(DIR,{recursive:true,force:true});fs.mkdirSync(DIR,{recursive:true});
(async()=>{
const H=await L.open({root:'/home/sprite/PROMO/app',lang,locale:{de:'de-DE',es:'es-ES'}[lang]||'en-US',engine:'webkit',device:'iPhone 13',clock:CLK,init:require('./seed.cjs')(lang,Date.parse(CLK)),route,out:'/home/sprite/PROMO/shots',tag:'r2'});
const p=H.page;const M={marks:{},taps:[],fps:FPS};let n=0;
await H.sleep(1500);
const ft=await p.evaluate(()=>Date.now());await p.clock.pauseAt(ft+500);
await p.evaluate(()=>{window.__promoStep=ms=>{for(const a of document.getAnimations()){try{const e=a.effect&&a.effect.getComputedTiming?a.effect.getComputedTiming():null;const end=e&&isFinite(e.endTime)?e.endTime:Infinity;const ct=(a.currentTime||0)+ms;if(a.playState==='finished')continue;if(ct>=end&&a.playbackRate>0){a.finish();}else{a.pause();a.currentTime=ct;}}catch(err){}}};});
const frame=async()=>{await p.clock.runFor(Math.round(STEP*(n+1))-Math.round(STEP*n));await p.evaluate(ms=>window.__promoStep&&window.__promoStep(ms),STEP).catch(()=>{});n++;await p.screenshot({path:DIR+'/f'+String(n).padStart(5,'0')+'.jpg',type:'jpeg',quality:90});};
const run=async sec=>{const k=Math.round(sec*FPS);for(let i=0;i<k;i++)await frame();};
const mark=k=>{M.marks[k]=n;};
const box=async sel=>{const el=await p.$(sel);return el&&await el.boundingBox().catch(()=>null);};
const tap=async(sel,force)=>{const b=await box(sel);if(b)M.taps.push({f:n,x:b.x+b.width/2,y:b.y+b.height/2});if(force)await p.tap(sel,{force:true,timeout:8000});else await H.tap(sel);};
const wait=async(fn,maxSec)=>{for(let i=0;i<(maxSec||10)*FPS;i++){if(await p.evaluate(fn).catch(()=>false))return true;await frame();}return false;};
const type=async(s,per)=>{for(const ch of s){await p.keyboard.type(ch);await run(per||0.07);}};
const slow=async(sel,dy,sec)=>{const k=Math.round(sec*FPS);const y0=await p.evaluate(s=>{const e=document.querySelector(s);return e?e.scrollTop:0;},sel);for(let i=1;i<=k;i++){const t=i/k,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;await p.evaluate(([s,y])=>{const el=document.querySelector(s);if(el)el.scrollTop=y;},[sel,y0+dy*e]);await frame();}};
const S={
 async home(){ mark('go'); await run(6); },
 async home2(){ mark('go'); await run(2.2); },
 async scan(){ mark('go'); await run(0.5); await tap('[data-orbit=scan]'); await run(1.2); mark('open'); await tap('#b3Bc',true); await run(0.2); mark('typing'); await type('3017620422003',0.05); await p.keyboard.press('Enter'); mark('enter'); await wait(()=>/Higher|H\u00f6her|Alto/.test(document.body.innerText),12); mark('result'); await run(4); },
 async photo(){ mark('go'); await p.evaluate(()=>LowiSpirit.photo()); await run(1.0); mark('pick'); await (await p.$('.sp-file-in')).setInputFiles('/home/sprite/PROMO/meal.jpg'); await wait(()=>!!document.querySelector('.sp-ai.fai-done, .sp-ai.fai-off, .sp-ai.fai-err'),20); mark('result'); await run(4); },
 async card(){ mark('go'); await p.evaluate(()=>LowiCompanion.open()); await run(1.6); mark('open'); await slow('.cf-scroll',260,0.9); await run(0.6); mark('forms'); await slow('.cf-scroll',560,1.6); await run(1.2); },
 async cook(){ mark('go'); await run(0.3); await tap('[data-orbit=fuel]'); await run(0.8); await tap('#hb2Bloom [data-id="cook"]',true); await run(1.4); await tap('[data-ck=view][data-v=swipe]',true); await run(1.0); mark('swipe'); await tap('[data-r5=swipe-right]',true); await run(0.9); await tap('[data-r5=swipe-up]',true); await run(0.9); await tap('[data-r5=swipe-right]',true); await run(1.0); },
 async shop(){ mark('go'); await run(0.3); await tap('[data-orbit=fuel]'); await run(0.8); await tap('#hb2Bloom [data-id="shop"]',true); await wait(()=>!!document.querySelector('input.mic-has'),10); await run(0.8); mark('open'); await tap('input.mic-has',true); await run(0.3); await tap('button.mic-btn',true).catch(()=>{}); await run(0.8); await p.focus('input.mic-has').catch(()=>{}); mark('type'); await type(lang==='de'?'Paprika':'bell pepper',0.06); await run(0.3); await tap('button.stp-pill:not(.stp-cartbtn)',true); mark('added'); await run(2.0); },
 async gap(){ mark('go'); await run(0.3); await tap('[data-orbit=gap]'); await run(0.5); mark('open'); await run(3); },
 async move(){ mark('go'); await run(0.3); mark('cele'); await p.evaluate(()=>LowiMoveFinish.celebrate({min:12,xp:210,complete:true})); await run(5.5); },
 async comm(){ mark('go'); await run(0.3); await tap('[data-orbit=settings]'); await run(1.6); const b=await p.evaluateHandle(()=>[...document.querySelectorAll('button,[role=tab]')].find(x=>/^\s*Chat\s*$/.test(x.textContent)&&x.getBoundingClientRect().width>0)); const el=b.asElement(); if(el){const bb=await el.boundingBox();M.taps.push({f:n,x:bb.x+bb.width/2,y:bb.y+bb.height/2});await el.tap({force:true});} await run(1.0); await wait(()=>/Sofia|Jonas/.test(document.body.innerText),8); mark('chat'); await run(3); }
};
try{ await S[scene](); }catch(e){ console.log('SCENE ERR',String(e).slice(0,300)); }
M.frames=n; M.errs=H.errs.slice(0,8); M.blocked=H.blocked;
fs.writeFileSync(DIR+'/meta.json',JSON.stringify(M,null,1));
await H.close();console.log(scene,lang,'frames',n,JSON.stringify(M.marks),'taps',M.taps.length,'errs',M.errs.length);process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
