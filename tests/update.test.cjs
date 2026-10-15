'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const start=html.indexOf('const BUILD = (document.querySelector'),end=html.indexOf('function sw(){',start);
assert(start>=0&&end>start);
const source=html.slice(start,end);
const old='20261012-233911',latest='20261013-203600',future='20261014-080000';
function fixture(build,available,initial={}){
  const nodes=new Map(),local=new Map(Object.entries(initial.local||{})),session=new Map(Object.entries(initial.session||{})),timers=[],replaces=[],histories=[];
  const storage=(map,blocked)=>({getItem:k=>{if(blocked)throw Error('blocked');return map.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');map.set(k,String(v));},removeItem:k=>{if(blocked)throw Error('blocked');map.delete(k);}});
  const element=()=>{const cls=new Set();return {dataset:{},style:{},classList:{add:c=>cls.add(c),remove:c=>cls.delete(c),contains:c=>cls.has(c)},setAttribute(){},remove(){nodes.delete(this.id);}};};
  const events=[];
  const document={body:{},readyState:'complete',visibilityState:initial.visibility||'visible',dispatchEvent:e=>{events.push(e.detail);return true;},documentElement:{lang:'en',appendChild:n=>nodes.set(n.id,n)},createElement:element,querySelector:s=>s.includes('meta[')?{content:build}:null};
  const url=new URL(initial.url||'https://example.com/lowispike/?mode=biopunk#meal');
  const location={href:url.href,protocol:url.protocol,pathname:url.pathname,search:url.search,hash:url.hash,replace:u=>replaces.push(u)};
  let requests=0,current=available;
  const ctx=vm.createContext({document,location,navigator:initial.navigator||{},CustomEvent:class{constructor(t,o){this.type=t;this.detail=(o||{}).detail;}},clearTimeout:()=>{},window:{addEventListener(){}},localStorage:storage(local,initial.blocked),sessionStorage:storage(session,initial.blocked),
    history:{state:null,replaceState:(a,b,u)=>histories.push(u)},URL,Date,Promise,
    $:s=>nodes.get(s.slice(1))||null,getComputedStyle:()=>({fontFamily:'system-ui'}),setTimeout:(fn,ms)=>{timers.push(fn);return timers.length;},
    fetch:async()=>{requests++;return {ok:true,json:async()=>({build:current})};}});
  vm.runInContext(source,ctx);
  return {ctx,nodes,local,session,timers,replaces,histories,events,document,setAvailable:v=>{current=v;},requests:()=>requests,
    run:expression=>vm.runInContext(expression,ctx),flush:()=>{const pending=timers.splice(0);pending.forEach(f=>f());}};
}
test('current HTML never gets a new-version prompt',async()=>{
  const f=fixture(latest,latest);await f.run('checkUpdate(true)');assert(!f.nodes.has('lcUpd'));assert.equal(f.replaces.length,0);
});
test('an explicit refresh on stale HTML never reports success or auto-reloads',async()=>{
  const f=fixture(old,latest,{session:{'lowi.upd':latest,'lowi.updn':'2'},url:'https://example.com/lowispike/?mode=biopunk&v='+latest+'&r=123#meal'});
  f.run('afterUpdate()');f.flush();assert.equal(f.replaces.length,0);
  assert.equal(f.nodes.get('lcUpdOk').textContent,"✓ The update hasn't loaded yet. Close LOWiSPIKE completely and open it again.");
  assert(!f.session.has('lowi.upd'));assert(!f.session.has('lowi.updn'));
  assert.equal(f.histories[0],'/lowispike/?mode=biopunk#meal');
  await f.run('checkUpdate(true)');assert(!f.nodes.has('lcUpd'));
});
test('failed-refresh cooldown survives a page reload but does not hide a different release',async()=>{
  const f=fixture(old,latest,{local:{'lowi.upd.failed':JSON.stringify({build:latest,at:Date.now()})}});
  await f.run('checkUpdate(true)');assert(!f.nodes.has('lcUpd'));
  f.setAvailable(future);await f.run('checkUpdate(true)');assert.equal(f.nodes.get('lcUpd').dataset.build,future);
});
test('expired refresh failure can be retried later',async()=>{
  const f=fixture(old,latest,{local:{'lowi.upd.failed':JSON.stringify({build:latest,at:Date.now()-16*60000})}});
  await f.run('checkUpdate(true)');assert(f.nodes.has('lcUpd'));
});
test('success requires that the loaded HTML reaches the requested build',()=>{
  const f=fixture(latest,latest,{session:{'lowi.upd':latest},local:{'lowi.upd.failed':'{}'}});
  f.run('afterUpdate()');f.flush();assert.equal(f.nodes.get('lcUpdOk').textContent,'✓ Update loaded');
  assert(!f.local.has('lowi.upd.failed'));assert(!f.nodes.has('lcUpd'));assert.equal(f.replaces.length,0);
  f.nodes.delete('lcUpdOk');f.run('afterUpdate()');f.flush();assert(!f.nodes.has('lcUpdOk'));
});
test('update click preserves existing query parameters/hash and cannot double-refresh',async()=>{
  const f=fixture(old,latest);await f.run('checkUpdate(true)');await f.run('doUpdate()');await f.run('doUpdate()');
  assert.equal(f.replaces.length,1);const u=new URL(f.replaces[0],'https://example.com');
  assert.equal(u.searchParams.get('mode'),'biopunk');assert.equal(u.searchParams.get('v'),latest);assert(u.searchParams.has('r'));assert.equal(u.hash,'#meal');
});
test('query target works when session storage is unavailable; no automatic retries',()=>{
  const f=fixture(old,latest,{blocked:true,url:'https://example.com/lowispike/?v='+latest});
  f.run('afterUpdate()');f.flush();assert.equal(f.replaces.length,0);assert(f.nodes.get('lcUpdOk').textContent.includes("hasn't loaded"));
});
test('overlapping forced checks share one in-flight request',async()=>{
  const f=fixture(old,latest);await Promise.all([f.run('checkUpdate(true)'),f.run('checkUpdate(true)')]);assert.equal(f.requests(),1);
});
test('success notice and refresh prompt never overlap',async()=>{
  const f=fixture(latest,future,{session:{'lowi.upd':latest}});f.run('afterUpdate()');f.flush();assert(f.nodes.has('lcUpdOk'));
  await f.run('checkUpdate(true)');assert(f.nodes.has('lcUpd'));assert(!f.nodes.has('lcUpdOk'));
});
test('invalid manifest build creates neither a banner nor navigation',async()=>{
  const f=fixture(latest,'invalid');await f.run('checkUpdate(true)');assert.equal(f.nodes.size,0);assert.equal(f.replaces.length,0);
});
test('tap navigates at once even when the service worker never answers (iPhone freeze)',async()=>{
  const hang=()=>new Promise(()=>{});
  const f=fixture(old,latest,{navigator:{serviceWorker:{getRegistration:hang,ready:hang}}});await f.run('checkUpdate(true)');
  f.run('doUpdate()');assert.equal(f.replaces.length,1);assert.equal(f.events.at(-1).state,'busy');
  assert.equal(f.nodes.get('lcUpd').classList.contains('busy'),true);assert.equal(f.session.get('lowi.upd'),latest);
});
test('a load that stalls hands the button back with the restart hint, and the next tap tries again',async()=>{
  const f=fixture(old,latest);await f.run('checkUpdate(true)');f.run('doUpdate()');assert.equal(f.replaces.length,1);
  f.run('doUpdate()');assert.equal(f.replaces.length,1,'rapid second tap is ignored while loading');
  f.flush();const last=f.events.at(-1);assert.equal(last.state,'stalled');assert.equal(last.why,'slow');
  assert.equal(f.nodes.get('lcUpd').classList.contains('busy'),false);assert(!f.session.has('lowi.upd'));
  f.run('doUpdate()');assert.equal(f.replaces.length,2);assert.equal(f.events.at(-1).state,'busy');
  await f.run('checkUpdate(true)');assert.equal(f.requests(),1,'no checks while a load is pending');
});
test('the stall watchdog waits while the app is in the background',async()=>{
  const f=fixture(old,latest,{visibility:'hidden'});await f.run('checkUpdate(true)');f.run('doUpdate()');
  f.flush();assert.equal(f.events.at(-1).state,'busy');assert.equal(f.timers.length,1,'re-armed');
  f.document.visibilityState='visible';f.flush();assert.equal(f.events.at(-1).state,'stalled');
});
test('offline tap does not navigate to the old copy and says why',async()=>{
  const f=fixture(old,latest,{navigator:{onLine:false}});await f.run('checkUpdate(true)');f.run('doUpdate()');
  assert.equal(f.replaces.length,0);assert.deepEqual([f.events.at(-1).state,f.events.at(-1).why],['stalled','offline']);
  f.ctx.navigator.onLine=true;f.run('doUpdate()');assert.equal(f.replaces.length,1);
});
test('the orb can pass its build even when the hidden banner is gone; junk is ignored',()=>{
  const f=fixture(old,latest);f.run('doUpdate({type:"click"})');assert.equal(f.replaces.length,0);assert.equal(f.events.at(-1).state,'idle');
  f.run('doUpdate("'+latest+'")');assert.equal(f.replaces.length,1);assert.equal(new URL(f.replaces[0],'https://example.com').searchParams.get('v'),latest);
});
test('update path never clears storage or waits on the service worker',()=>{
  const body=source.slice(source.indexOf('function doUpdate('),source.indexOf('function updNote('));
  assert(!/getRegistration|\.update\(\)|localStorage\.clear|caches\.delete|unregister/.test(body));
});
test('HTML, service worker and manifest declare the same release',()=>{
  const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8'),version=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
  const header=html.match(/name="lowi-build" content="([^"]+)"/)[1];assert.equal(header,version.build);assert(worker.includes('SHELL_BUILD = "'+header+'"'));
  new vm.Script(worker);
});
test('worker preserves the version in the actual loaded HTML',async()=>{
  const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8'),handlers={},ctx=vm.createContext({self:{addEventListener:(name,f)=>handlers[name]=f,registration:{scope:'https://example.com/lowispike/'},location:{origin:'https://example.com'}},URL,Response});
  vm.runInContext(worker,ctx);ctx.input=new Response('<meta name="lowi-build" content="'+old+'">',{headers:{'content-type':'text/html'}});
  const result=await vm.runInContext('stampPage(input)',ctx);assert((await result.text()).includes(old));
});
