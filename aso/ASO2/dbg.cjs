const L=require('./lib.cjs');const {route}=require('./probe.cjs');
(async()=>{const H=await L.open({root:'/home/sprite/lowispike',lang:'de',locale:'de-DE',engine:'webkit',device:'iPhone 14 Pro Max',clock:'2026-10-25T09:40:00+01:00',init:require('./seed.js'),route});const p=H.page;
await p.setViewportSize({width:430,height:932});await H.sleep(2500);
await H.tap('[data-orbit=gap]');
for(const t of [500,1500,3500,6000]){await H.sleep(t===500?500:t-500);
console.log(t,JSON.stringify(await p.evaluate(()=>{const out=[];const walk=document.querySelectorAll('body *');for(const e of walk){if(e.children.length===0&&/Essenspause/.test(e.textContent)){let x=e,chain=[];while(x&&x!==document.body){const cs=getComputedStyle(x);chain.push((x.id||x.className||x.tagName).toString().slice(0,30)+':'+cs.opacity+'/'+cs.visibility+'/'+cs.display+'/'+(cs.transform||'').slice(0,40));x=x.parentElement;}const r=e.getBoundingClientRect();out.push({r:[r.x|0,r.y|0,r.width|0],chain:chain.slice(0,8)});}}return out.slice(0,2);})))}
await p.screenshot({path:'shots/dbg-gap.png'});
await H.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
