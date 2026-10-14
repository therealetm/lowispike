'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const part=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function shuffleFixture(reduced=false){
 const listeners={},timers=[],pick={innerHTML:''},strip={style:{},innerHTML:'',offsetWidth:180,addEventListener:(e,f)=>listeners[e]=f};
 const classes=new Set(),stage={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},offsetWidth:180};let reveals=0;
 const foods=[{id:'a',buy:true,img:'a.jpg'},{id:'b',buy:true,img:'b.jpg'}],ctx={Math,JSON,navigator:{},R5:{},r5save(){},fPick:()=>foods[1],fPool:()=>foods,fSrcPool:()=>foods,fSaveLast(){},fSrc:()=>'products',fCatSel:()=>'all',ckEmptyHTML:()=>null,fCell:c=>'<div class="r5-cell"><img src="'+c.img+'"></div>',fRevealHTML:()=>{reveals++;return 'result';},r5$:s=>({'#r5Stage':stage,'#r5Strip':strip,'#r5Pick':pick,'#r5Go span':{}}[s]),setTimeout:f=>timers.push(f)};
 ctx.window=ctx;ctx.matchMedia=()=>({matches:reduced});ctx.LowiSwaflo={prefs:()=>({mode:'buy'}),pool:p=>p,saveBuy(){}};
 vm.runInNewContext('let fSpinning=false;'+part('function fShuffle(instant){','function fShowPick'),ctx);
 return {ctx,strip,pick,classes,timers,end:()=>listeners.transitionend(),reveals:()=>reveals};
}
test('Buy shuffles through both images and decelerates before revealing the result',()=>{const f=shuffleFixture();f.ctx.fShuffle();assert(f.classes.has('spin'));assert.match(f.strip.style.transition,/1\.35s cubic-bezier/);assert.equal((f.strip.innerHTML.match(/a.jpg/g)||[]).length,6);assert.equal((f.strip.innerHTML.match(/b.jpg/g)||[]).length,7);assert.equal(f.reveals(),0);f.end();assert.equal(f.reveals(),1);});
test('a previous spin timeout cannot finish a later spin',()=>{const f=shuffleFixture();f.ctx.fShuffle();f.end();f.ctx.fShuffle();f.timers[0]();assert.equal(f.reveals(),1);assert(f.classes.has('spin'));f.end();assert.equal(f.reveals(),2);});
test('reduced motion reveals once without reel animation',()=>{const f=shuffleFixture(true);f.ctx.fShuffle();assert.equal(f.reveals(),1);assert(!f.classes.has('spin'));});
test('Move prepares its compact content in the renderer, before the first paint',()=>{const render=part('function renderScreen(){','\nconst SAFETY =');assert.match(render,/s\.innerHTML[^]*LowiG2\.prepare\(s\)/);assert.match(html,/prepare:s => \{ hook\(\); rearrange/);});
test('Scan has a single capture card and reachable photo fallback; results open as detail sheets',()=>{const render=part("let captureMode = 'barcode';",'\nconst curTab =');assert.match(render,/data-mode="meal"/);assert.match(render,/b3-capture-go/);assert.match(render,/b3PhotoBtn/);assert.doesNotMatch(render,/b3-duo|b3PlateBtn|recent\.map/);assert.match(part('async function nameSearch(q){','\n/* ====================================================================='),/R2\.sheet/);});
test('tab navigation never requests a companion speech bubble',()=>{const s=fs.readFileSync(require('node:path').join(__dirname,'../herb-tamagotchi.js'),'utf8');const a=s.slice(s.indexOf('function refresh(force)'),s.indexOf('const cared='));assert.doesNotMatch(a,/effect\(|lineFor\(page/);assert.match(s,/dock\.dataset\.tmg='open'/);assert.doesNotMatch(s,/toast\.innerHTML=.*lh-action-creature/);});
test('all inline application scripts remain valid JavaScript',()=>{for(const [,attr,body]of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/src=|application\//.test(attr)&&body.trim())new vm.Script(body);}});
function sourceFixture(store={}){
 const book=[{id:'b1',n:'Pizza crisps',book:true,c:'snack',img:'p.png'},{id:'b2',n:'Tuna boats',book:true,c:'meal',img:'t.png'},{id:'b3',n:'Choc mousse',book:true,c:'dessert',img:'m.png'},{id:'b4',n:'Iced tea',book:true,c:'drink',img:'i.png'}];
 const com=[{id:'c1',n:'Salmon bowl',com:true,img:'s.jpg'},{id:'c2',n:'Omelette',com:true,img:''}];
 const caught=[{name:'Skyr',barcode:'1',verdict:'ok',img:'k.jpg'},{name:'Cola',barcode:'2',verdict:'spike',img:'c.jpg'},{name:'Chips',barcode:'3',verdict:'unknown',img:''},{name:'Skyr',barcode:'1',verdict:'ok'}];
 const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}};
 const ctx={localStorage:ls,JSON,String,Object,Set,R5:{never:[],last:''},r5save(){},R5IC:{shuffle:'',cards:''},esc:x=>x,fPool:()=>book.concat(com),FOOD_IMG:{},
  LowiDiscovery:{all:()=>caught,assess:p=>({category:p.verdict==='unknown'?'insufficient':'good'})},LowiLang:{get:()=>'de'}};
 ctx.window=ctx;
 vm.runInNewContext(part('const CKK = {','function fPool(){')+';this.api={fSrc,fCatSel,fView,fSrcPool,fProducts,fLast,fSaveLast,ckBarHTML,fCell,ckSyncSwaflo};',ctx);
 return {api:ctx.api,store};
}
test('Cook shuffles the eBook recipes by default',()=>{const {api}=sourceFixture();assert.equal(api.fSrc(),'book');assert.equal(api.fSrcPool().map(f=>f.id).join(),'b1,b2,b3,b4');assert.match(api.ckBarHTML(),/data-v="book" aria-pressed="true"/);});
test('Savory and Sweet narrow the eBook; Community keeps only meals with a photo',()=>{const f=sourceFixture({'lowi.cook.cat':'sweet'});assert.equal(f.api.fSrcPool().map(x=>x.id).join(),'b1,b3');f.store['lowi.cook.cat']='meal';assert.equal(f.api.fSrcPool().map(x=>x.id).join(),'b2');f.store['lowi.cook.src']='community';assert.equal(f.api.fSrcPool().map(x=>x.id).join(),'c1');});
test('Products shuffles caught products that will not spike, once each, through the buy reveal',()=>{const f=sourceFixture({'lowi.cook.src':'products'});const P=f.api.fSrcPool();assert.equal(JSON.stringify(P.map(x=>x.n)),JSON.stringify(['Skyr','Chips']));assert(P.every(x=>x.buy&&x.product&&/^sf-buy:/.test(x.id)));f.api.ckSyncSwaflo();assert.equal(JSON.parse(f.store['lowi.swaflo.prefs']).mode,'buy');});
test('each source remembers its own last pick and photo-less picks get a drawn placeholder, not an emoji',()=>{const f=sourceFixture();f.api.fSaveLast({id:'b2',book:true});f.store['lowi.cook.src']='community';assert.equal(f.api.fLast(),null);f.store['lowi.cook.src']='book';assert.equal(f.api.fLast().id,'b2');const c=f.api.fCell({n:'omelette'});assert.match(c,/ck-ph[^]*<svg[^]*<b>O<\/b>/);assert.doesNotMatch(c,/\p{Extended_Pictographic}/u);});
test('Swipe foods stays on the Cook screen and is never moved into a sheet',()=>{const g=part('const ORDER = ["swipe", "all"','</script>');assert.doesNotMatch(g,/g\.swipe = \[sw\]/);assert.match(g,/LowiFood\.setView\("swipe"\)/);assert.match(html,/html\[data-ckview="shuffle"\] #tab-shelf #r3kSwipe|data-ckview/);});

