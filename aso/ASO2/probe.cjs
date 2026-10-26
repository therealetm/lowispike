const L=require('./lib.cjs'),fs=require('fs');
const NUT=fs.readFileSync(__dirname+'/data/nutella.json','utf8'), AI=fs.readFileSync(__dirname+'/data/rind-ai.json','utf8');
const H0={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'};
const route=(q,u)=>{ if(/openfoodfacts/.test(u.host)) return {status:200,contentType:'application/json',body:NUT};
 if(/functions\/v1\/food-photo/.test(u.pathname)){ if(q.method()==='OPTIONS') return {status:200,headers:H0,body:'ok'}; if(q.method()==='GET') return {status:200,headers:H0,body:JSON.stringify({ok:true,configured:true,limit:3,left:2})}; return {status:200,headers:H0,body:AI}; }
 return null;};
module.exports={route};
if(require.main===module)(async()=>{const H=await L.open({root:'/home/sprite/lowispike',lang:'de',locale:'de-DE',engine:'webkit',device:'iPhone 14 Pro Max',clock:'2026-10-25T09:40:00+01:00',init:require('./seed.js'),route});const p=H.page;
await H.reload(); await H.sleep(4000);
console.log(await p.evaluate(()=>({look:window.LowiCompanion&&LowiCompanion.look(),now:new Date().toString(),vw:innerWidth,vh:innerHeight,dpr:devicePixelRatio})));
console.log((await H.text()).slice(0,1500));
await p.screenshot({path:'shots/p-home.png'});
await H.close();process.exit(0);})().catch(e=>{console.error(e);process.exit(1)});
