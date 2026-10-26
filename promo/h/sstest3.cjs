const L=require('./lib.cjs');const {route}=require('./route.cjs');
(async()=>{const CLK='2026-10-27T19:30:00+01:00';const eng=process.argv[2];
const H=await L.open({root:'/home/sprite/PROMO/app',lang:'en',locale:'en-US',engine:eng,device:'iPhone 13',clock:CLK,init:require('./seed.cjs')('en',Date.parse(CLK)),route,out:'/tmp',tag:'t'});const p=H.page;
console.log(await p.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>c.id+'.'+c.className+' '+c.width+'x'+c.height).join(' | ')));
const o={scale:'css',type:'jpeg',quality:85};
let t=Date.now(),n=0;while(Date.now()-t<3000){await p.screenshot(o);n++;}console.log('home',(n/3).toFixed(1));
await p.addStyleTag({content:'canvas{display:none!important}'});await H.sleep(500);
t=Date.now();n=0;while(Date.now()-t<3000){await p.screenshot(o);n++;}console.log('nocanvas',(n/3).toFixed(1));
await H.close();process.exit(0);})();
