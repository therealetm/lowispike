'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'swaflo.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function fixture(lang='en',pref={}){
  const values=new Map([['lowi.swaflo.prefs',JSON.stringify(pref)]]),listeners={},calls=[];
  const input={scrollIntoView:o=>calls.push(['scroll',o.block]),focus:o=>calls.push(['focus',o.preventScroll])};
  const document={documentElement:{lang},readyState:'loading',addEventListener:(k,f)=>listeners[k]=f,querySelectorAll:()=>[],getElementById:()=>null,querySelector:()=>input};
  const ctx={document,LowiSwafloCore:require('../swaflo-core.js'),localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},
    LowiHost:{go:t=>calls.push(['go',t])},LOWI_SHELF:{open:t=>calls.push(['open',t])},LowiDex:{load:()=>Promise.resolve()},
    LowiR2:{toast:m=>calls.push(['toast',m]),sheet:()=>calls.push(['sheet'])},setTimeout};
  ctx.window=ctx;vm.runInNewContext(source,ctx);
  return {ctx,calls,ui:()=>ctx.LowiSwaflo.toolbarHTML(),click:dataset=>{const button={dataset,closest:()=>null};listeners.click({target:{closest:()=>button},preventDefault(){}});}};
}
test('food action explains its purpose and uses the current preparation mode',()=>{
  const f=fixture();assert.match(f.ui(),/Food swaps/);assert.match(f.ui(),/>Find swaps ›<\/button>/);assert.doesNotMatch(f.ui(),/>Swaflo/);
  f.click({sf:'mode',mode:'buy'});assert.match(f.ui(),/>Find products ›<\/button>/);assert.match(f.ui(),/data-mode="buy" aria-pressed="true"/);
});
test('meal and snack controls choose explicit values, including repeated selections',()=>{
  const f=fixture();f.click({sf:'snack',snack:'true'});f.click({sf:'snack',snack:'true'});assert.equal(f.ctx.LowiSwaflo.prefs().snack,true);
  assert.match(f.ui(),/data-snack="true" aria-pressed="true"/);f.click({sf:'snack',snack:'false'});assert.equal(f.ctx.LowiSwaflo.prefs().snack,false);
});
test('legacy entry opens Cook and focuses its input without an isolated sheet',()=>{
  const f=fixture();f.click({sf:'open'});assert.deepEqual(f.calls,[['go','shelf'],['open','kochen'],['scroll','center'],['focus',true]]);
});
test('new controls are translated for German and Spanish',()=>{
  assert.match(fixture('de').ui(),/Zutatentausch/);assert.match(fixture('de').ui(),/Zutaten tauschen/);assert.match(fixture('es',{mode:'buy'}).ui(),/Buscar productos/);
});
test('saved swaps retain recipe access without inserting a food creation button into profile',()=>{
  const start=html.indexOf('function savedHTMLNew()'),end=html.indexOf('\ntry { window.savedHTML',start);assert(start>=0&&end>start);
  const ctx={S:{saved:[{n:'Pasta',e:'',swaflo:{recipe:{id:'sf_noodles'}}}]},T:s=>s,esc:s=>String(s)};
  vm.runInNewContext(html.slice(start,end),ctx);const rendered=ctx.savedHTMLNew();assert.doesNotMatch(rendered,/data-sf="open"/);assert.match(rendered,/data-sf="saved" data-id="sf_noodles"/);
});
