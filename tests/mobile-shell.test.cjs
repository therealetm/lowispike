'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const part=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function shuffleFixture(reduced=false){
 const listeners={},timers=[],pick={innerHTML:''},strip={style:{},innerHTML:'',offsetWidth:180,addEventListener:(e,f)=>listeners[e]=f};
 const classes=new Set(),stage={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},offsetWidth:180};let reveals=0;
 const foods=[{id:'a',buy:true,img:'a.jpg'},{id:'b',buy:true,img:'b.jpg'}],ctx={Math,JSON,navigator:{},R5:{},r5save(){},fPick:()=>foods[1],fPool:()=>foods,fRevealHTML:()=>{reveals++;return 'result';},r5$:s=>({'#r5Stage':stage,'#r5Strip':strip,'#r5Pick':pick,'#r5Go span':{}}[s]),setTimeout:f=>timers.push(f)};
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
