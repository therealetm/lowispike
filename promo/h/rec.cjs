/* Records one promo scene of the live app code in a simulated iPhone 13 (WebKit), fake demo account, every write blocked.
   node rec.cjs <scene> [lang]  -> /home/sprite/PROMO/clips/<scene>-<lang>.webm + .json (markers in seconds from video start) */
const L=require('./lib.cjs');const {route}=require('./route.cjs');const fs=require('fs'),path=require('path');
const scene=process.argv[2], lang=process.argv[3]||'en';process.env.LANG2=lang;
const CLK=process.env.CLOCK||'2026-10-27T19:30:00+01:00';
const OUT='/home/sprite/PROMO/clips', TMP=OUT+'/tmp-'+scene+'-'+lang;fs.mkdirSync(TMP,{recursive:true});
(async()=>{
const H=await L.open({root:'/home/sprite/PROMO/app',lang,locale:{de:'de-DE',es:'es-ES'}[lang]||'en-US',engine:'webkit',device:'iPhone 13',clock:CLK,init:require('./seed.cjs')(lang,Date.parse(CLK)),route,out:'/home/sprite/PROMO/shots',tag:'r',video:TMP});
const p=H.page, M={marks:{},taps:[]}; const now=()=> (Date.now()-H.t0)/1000;
const mark=n=>{M.marks[n]=now();};
const box=async sel=>{const el=typeof sel==='string'?await p.$(sel):sel;const b=el&&await el.boundingBox().catch(()=>null);return b;};
const tapM=async(sel,o)=>{const b=await box(sel);if(b)M.taps.push({t:now(),x:b.x+b.width/2,y:b.y+b.height/2});if(o&&o.force)await p.tap(sel,{force:true});else await H.tap(sel);};
const tapXY=async(x,y)=>{M.taps.push({t:now(),x,y});await p.touchscreen.tap(x,y);};
const slow=async(sel,dy,ms)=>{await p.evaluate(([s,dy,ms])=>new Promise(r=>{const el=document.querySelector(s);if(!el)return r();const y0=el.scrollTop,t0=performance.now();const f=t=>{const k=Math.min(1,(t-t0)/ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;el.scrollTop=y0+dy*e;if(k<1)requestAnimationFrame(f);else r();};requestAnimationFrame(f);}),[sel,dy,ms]);};
const scroller=async sel=>p.evaluate(s=>{const root=document.querySelector(s);if(!root)return null;const all=[root,...root.querySelectorAll('*')];const el=all.find(e=>{const cs=getComputedStyle(e);return /(auto|scroll)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+20;});if(!el)return null;el.setAttribute('data-promo-scroll','1');return '[data-promo-scroll]';},sel);
await H.sleep(1500);
const S={
 async home(){ mark('go'); await H.sleep(7000); },
 async scan(){ mark('go'); await H.sleep(700); await tapM('[data-orbit=scan]'); await H.sleep(1800); mark('typing'); await tapM('#b3Bc',{force:true}); await p.keyboard.type('3017620422003',{delay:35}); await p.keyboard.press('Enter'); await p.waitForFunction(()=>/Higher|Höher|Alto|Más alto/.test(document.body.innerText),null,{timeout:20000}).catch(()=>{}); mark('result'); await H.sleep(5000); },
 async photo(){ mark('go'); await p.evaluate(()=>LowiSpirit.photo()); await H.sleep(1500); mark('pick'); await (await p.$('.sp-file-in')).setInputFiles('/home/sprite/PROMO/meal.jpg'); await p.waitForSelector('.sp-ai.fai-done, .sp-ai.fai-off, .sp-ai.fai-err',{timeout:30000}).catch(()=>{}); mark('result'); await H.sleep(2200); await H.sleep(3500); },
 async card(){ mark('go'); await p.evaluate(()=>LowiCompanion.open()); await H.sleep(2600); mark('open'); await slow('.cf-scroll',260,1200); await H.sleep(900); await slow('.cf-scroll',520,2000); mark('scrolled'); await H.sleep(2500); },
 async cook(){ mark('go'); await H.sleep(500); await tapM('[data-orbit=fuel]'); await H.sleep(1100); await tapM('#hb2Bloom [data-id="cook"]',{force:true}); await H.sleep(2200); await tapM('[data-ck=view][data-v=swipe]',{force:true}); await H.sleep(1600); mark('swipe'); await tapM('[data-r5=swipe-right]',{force:true}); await H.sleep(1300); await tapM('[data-r5=swipe-up]',{force:true}); await H.sleep(1500); await tapM('[data-r5=swipe-right]',{force:true}); await H.sleep(2000); },
 async shop(){ mark('go'); await H.sleep(500); await tapM('[data-orbit=fuel]'); await H.sleep(1100); await tapM('#hb2Bloom [data-id="shop"]',{force:true}); await p.waitForSelector('input.mic-has',{timeout:20000}).catch(()=>{}); await H.sleep(800); mark('open'); await tapM('input.mic-has',{force:true}); await H.sleep(400); await tapM('button.mic-btn',{force:true}).catch(()=>{}); await H.sleep(900); await p.focus('input.mic-has').catch(()=>{}); mark('type'); await p.keyboard.type(lang==='de'?'Paprika':'bell pepper',{delay:70}); await H.sleep(500); await tapM('button.stp-pill:not(.stp-cartbtn)',{force:true}); await H.sleep(1200); mark('added'); await H.sleep(2500); },
 async gap(){ mark('go'); await H.sleep(500); await tapM('[data-orbit=gap]'); await H.sleep(1500); mark('open'); await H.sleep(3500); },
 async move(){ mark('go'); await H.sleep(600); mark('cele'); await p.evaluate(()=>LowiMoveFinish.celebrate({min:12,xp:210,complete:true})); await H.sleep(6500); },
 async comm(){ mark('go'); await H.sleep(500); await tapM('[data-orbit=settings]'); await H.sleep(2500); const ok=await H.tapText(/^(Chat)$/); await H.sleep(2500); mark('chat'); await H.sleep(4000); }
};
try{ await S[scene](); }catch(e){ console.log('SCENE ERR',String(e).slice(0,300)); }
M.end=now(); M.errs=H.errs.slice(0,8); M.blocked=H.blocked;
const v=p.video(); await H.ctx.close(); const vp=await v.path(); await H.close();
fs.renameSync(vp, path.join(OUT,scene+'-'+lang+'.webm')); fs.writeFileSync(path.join(OUT,scene+'-'+lang+'.json'),JSON.stringify(M,null,1));
console.log(scene,lang,JSON.stringify(M.marks),'taps',M.taps.length,'errs',M.errs.length);process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
