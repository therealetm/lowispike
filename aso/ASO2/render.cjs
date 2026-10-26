const {chromium}=require('/tmp/pw/node_modules/playwright');
(async()=>{const b=await chromium.launch();
for(const a of process.argv.slice(2)){const [src,out,w,h]=a.split('|');
 const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:3});
 await p.goto('file://'+src);await p.waitForTimeout(600);await p.screenshot({path:out});await p.close();console.log('rendered',out);}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
