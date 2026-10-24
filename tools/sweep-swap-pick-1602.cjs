/* Code error sweep 16:02: for each typed food, print the typed-meal swap and the Recipe Book recipe the Scan Best swap links
   (old one-shared-word rule, then the 2+ shared words rule).  node tools/sweep-swap-pick-1602.cjs index.html popcorn fries ... */
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const block=m=>{const a=html.lastIndexOf('<script>',html.indexOf(m))+8;return html.slice(a,html.indexOf('</script>',a));};
const ctx={module:{exports:{}},console};vm.createContext(ctx);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1')+'\n'+block('/* LOWiSPIKE v2 rules engine'),ctx);
const {analyseMeal}=ctx.module.exports;
const a=html.indexOf('const RECIPE_BOOK = [');const b=html.indexOf('\n];',a);
const src=html.slice(a+'const RECIPE_BOOK = '.length,b+2);const g={W:{full:''}};let RB;for(let i=0;i<50;i++){try{RB=vm.runInNewContext(src,g);break;}catch(e){const mm=/(\w+) is not defined/.exec(e.message);if(!mm)throw e;g[mm[1]]='';}}
const words=process.argv.slice(3);
for(const q of words){const m=analyseMeal(q,{trig:[]});const sw=m&&m.ok&&m.swap;if(!sw){console.log(q,'| no swap');continue;}
 const st=String(sw.n).toLowerCase().split(/[^a-z]+/).filter(w=>w.length>=5).map(w=>w.replace(/ies$/,'y').replace(/s$/,''));
 const rb=sw.rb?('[named] '+sw.rb):(RB.find(r=>st.some(w=>String(r.n).toLowerCase().indexOf(w)>=0))||{}).n;
 console.log(q,'| r='+m.r,'| swap:',sw.n,'| rb:',rb||'-');}
// new rule
const stem=w=>w.replace(/ies$/,'y').replace(/s$/,''), ws=s=>String(s).toLowerCase().split(/[^a-z]+/).filter(w=>w.length>=5).map(stem);
console.log('--- new rule');
for(const q of words){const m=analyseMeal(q,{trig:[]});const sw=m&&m.ok&&m.swap;if(!sw||sw.rb)continue;
 const st=[...new Set(ws(sw.n))];let best=null,hit=1;for(const r of RB){const bw=ws(r.n),k=st.filter(w=>bw.indexOf(w)>=0).length;if(k>hit){hit=k;best=r;}}
 console.log(q,'| swap:',sw.n,'| new rb:',best?best.n:'-');}
