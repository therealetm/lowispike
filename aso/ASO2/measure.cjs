const {chromium}=require('/tmp/pw/node_modules/playwright');
(async()=>{const b=await chromium.launch();
for(let i=1;i<=6;i++){const p=await b.newPage({viewport:{width:430,height:932}});await p.goto('file:///home/sprite/ASO2/html/shot'+i+'.html');await p.waitForTimeout(300);
console.log(i,JSON.stringify(await p.evaluate(()=>['.k','.h','.s','.ph'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return s+':'+(r.top|0)+'-'+(r.bottom|0)}))));await p.close();}
const p=await b.newPage({viewport:{width:393,height:852}});await p.goto('file:///home/sprite/ASO2/html/page.html');await p.waitForTimeout(300);
console.log('page',JSON.stringify(await p.evaluate(()=>['.t','.st','.get','.iap','.info','.cell:nth-child(4) .cap'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return s+':'+(r.left|0)+','+(r.top|0)+'-'+(r.right|0)+','+(r.bottom|0)+' sw'+e.scrollWidth+'/'+e.clientWidth}))));
await b.close();})();
