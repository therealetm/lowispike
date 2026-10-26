const pw=require('/tmp/pw/node_modules/playwright');
const fs=require('fs');
const files=process.argv.slice(2);
(async()=>{const b=await pw.chromium.launch({args:['--allow-file-access-from-files']});
for(const f of files){const W=+(process.env.W||1290),H=+(process.env.H||2796);
 const pg=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
 await pg.goto('file://'+f,{waitUntil:'networkidle',timeout:60000});await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(400);
 const info=await pg.evaluate(()=>{const o=[];document.querySelectorAll('.chip,h1,.sub,.phone-wrap,.eyebrow').forEach(e=>{const r=e.getBoundingClientRect();o.push(e.className+' '+Math.round(r.left)+','+Math.round(r.top)+' '+Math.round(r.width)+'x'+Math.round(r.height)+(r.right>innerWidth+1||r.left<-1||r.bottom>innerHeight+1?' OVERFLOW':''))});o.push('font:'+document.fonts.check('800 40px "Plus Jakarta Sans"'));return o;});
 const out=f.replace(/\.html$/,'.png').replace('/html/','/out/');fs.mkdirSync(require('path').dirname(out),{recursive:true});
 await pg.screenshot({path:out});console.log(out);console.log(info.join('\n'));await pg.close();}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
