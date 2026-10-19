const L=require('../lib.cjs');(async()=>{const view=process.argv[2]||'iphone13';const h=await L.open({view,url:process.argv[3]||'https://therealetm.github.io/lowispike/',settle:8000});
await h.page.emulateMedia({reducedMotion:'reduce'});await L.sleep(800);
const out={};
for(const k of ['settings','sleep']){const c=await L.center(h,'[data-orbit="'+k+'"]');await L.tap(h,c.x,c.y);
for(const t of [300,1300,3000]){await L.sleep(t===300?300:t===1300?1000:1700);
out[k+t]=await h.page.evaluate(()=>{const els=[...document.querySelectorAll('.ss2-page,.ss2-panel,.ss2-sheet,[class*="ss2-"][role=dialog],.ss2-pop')];return {html:document.documentElement.className.split(' ').filter(c=>/ss2/.test(c)).join(' '),els:els.map(e=>{const chain=[];let n=e;while(n&&n.nodeType===1){const s=getComputedStyle(n);if(+s.opacity<0.99||s.visibility!=='visible'||s.display==='none')chain.push((n.className&&n.className.baseVal!=null?n.className.baseVal:n.className).toString().slice(0,40)+' op='+s.opacity+' vis='+s.visibility+' d='+s.display+' anim='+s.animationName);n=n.parentElement;}const r=e.getBoundingClientRect();return e.className.toString().slice(0,50)+' '+Math.round(r.width)+'x'+Math.round(r.height)+' '+JSON.stringify(chain)})}});}
await h.page.screenshot({path:__dirname+'/qrm-'+view+'-'+k+'.png'});
for(let i=0;i<3;i++){await h.page.keyboard.press('Escape');await L.sleep(300);} await L.sleep(800);}
console.log(JSON.stringify(out,null,1));await h.browser.close();})();
