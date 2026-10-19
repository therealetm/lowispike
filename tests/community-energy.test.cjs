'use strict';
/* Oct 16: Community energy hits (joystick, billiard physics, energy pings). */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../community-energy.js');
const K=require('../community-chat-core.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function storage(){const data={};return {data,getItem:k=>data[k]||null,setItem:(k,v)=>{data[k]=String(v);}};}
function run(t,sec,dt=1/60){const ev=[];for(let i=0;i<sec/dt;i++)ev.push(...t.step(dt));return ev;}

test('joystick aim: direction, clamped knob, power from pull distance and a dead zone',()=>{
  const a=E.aim(30,0,40);assert.equal(a.ang,0);assert.equal(a.power,.75);assert.ok(a.ok);assert.equal(a.kx,30);
  const far=E.aim(0,-200,40);assert.equal(far.power,1);assert.ok(Math.abs(far.ky+40)<1e-9);assert.ok(Math.abs(far.ang+Math.PI/2)<1e-9);
  assert.equal(E.aim(4,3,40).ok,false,'a tiny wiggle never fires');
});

test('energy pings: once per person per few minutes, and a cap across people',()=>{
  const t0=1e12;let st={};assert.ok(E.canPing(st,'b',t0).ok);st=E.notePing(st,'b',t0);
  const again=E.canPing(st,'b',t0+60e3);assert.equal(again.ok,false);assert.equal(again.why,'recent');assert.ok(again.wait>0);
  assert.ok(E.canPing(st,'b',t0+E.PING_GAP+1).ok,'after the gap the same person can get energy again');
  for(let i=0;i<E.PING_MAX-1;i++)st=E.notePing(st,'p'+i,t0+i);
  assert.equal(E.canPing(st,'new',t0+100).why,'busy');
  assert.ok(E.canPing(st,'new',t0+E.PING_WINDOW+200).ok);
  const pruned=E.notePing({sent:{old:t0-E.PING_WINDOW*4}},'x',t0);assert.deepEqual(Object.keys(pruned.sent),['x']);
  assert.equal(E.canPing({},'',t0).ok,false);
});

const spots=()=>[{uid:'me',me:true,x:0,y:0,r:27},{uid:'a',x:200,y:0,r:23},{uid:'b',x:260,y:0,r:23},{uid:'c',x:0,y:300,r:23}];

test('a burst that hits a companion knocks it, it chains into the next one billiard-style, and everyone stays where they stopped (Oct 19)',()=>{
  const t=E.table();t.sync(spots(),600);assert.equal(t.busy(),false,'idle table does no work');
  t.fire({x:0,y:0,uid:'me'},0,1,27);assert.ok(t.busy());
  const ev=run(t,.5);const hit=ev.find(e=>e.type==='hit');assert.ok(hit,'burst hits');assert.equal(hit.uid,'a');
  assert.ok(ev.some(e=>e.type==='bump'&&[e.a,e.b].sort().join()==='a,b'),'a rolls into b');
  const pb=t.pos('b');assert.ok(pb.x>260+5,'b was knocked further out: '+pb.x);
  assert.equal(t.offset('c'),null,'a companion nobody touched stays put');assert.equal(t.offset('me'),null,'my companion does not move');
  run(t,12);assert.equal(t.busy(),false,'everyone stopped rolling');const ra=t.pos('a'),rb=t.pos('b');assert.ok(t.offset('a')&&t.offset('b'),'nobody went back to their old spot');
  run(t,30);assert.deepEqual(t.pos('a'),ra);assert.deepEqual(t.pos('b'),rb);assert.equal(t.busy(),false,'and resting costs nothing');
});

test('a miss fizzles at the end of its range and leaves nobody moved',()=>{
  const t=E.table();t.sync(spots(),600);t.fire({x:0,y:0},Math.PI,.5,27);const ev=run(t,2);
  assert.ok(ev.some(e=>e.type==='fizzle'));assert.ok(!ev.some(e=>e.type==='hit'));assert.equal(t.busy(),false);
});

test('reduced motion: shorter range and a calmer, shorter roll',()=>{
  const far=[{uid:'me',me:true,x:0,y:0,r:27},{uid:'a',x:420,y:0,r:23}];
  const n=E.table();n.sync(far,900);n.fire({x:0,y:0},0,1,27);assert.ok(run(n,1).some(e=>e.type==='hit'));
  const r=E.table({reduced:true});r.sync(far,900);r.fire({x:0,y:0},0,1,27);assert.ok(!run(r,1).some(e=>e.type==='hit'),'calm burst does not reach as far');
  const peak=red=>{const t=E.table({reduced:red});t.sync(spots(),600);t.fire({x:0,y:0},0,1,27);let m=0;for(let i=0;i<300;i++){t.step(1/60);for(const u of ['a','b']){const o=t.offset(u);if(o)m=Math.max(m,Math.hypot(o.x,o.y));}}return m;};
  assert.ok(peak(true)<peak(false)*.6,'calm roll travels less');
  const t=E.table({reduced:true});t.sync(spots(),600);t.fire({x:0,y:0},0,1,27);run(t,5);assert.equal(t.busy(),false,'and is over quickly');
});

test('bounds: the edge of the map is the only wall (a cushion), a knocked companion never leaves the map',()=>{
  const t=E.table();t.sync([{uid:'me',me:true,x:0,y:0,r:27},{uid:'a',x:60,y:0,r:23}],120);t.fire({x:0,y:0},0,1,27);
  let maxR=0;for(let i=0;i<600;i++){t.step(1/60);const p=t.pos('a');maxR=Math.max(maxR,Math.hypot(p.x,p.y));}
  assert.ok(maxR<=120+90+1e-6,'stays on the map: '+maxR);assert.ok(maxR>200,'and can roll all the way to the edge, no pull back to its spot: '+maxR);
  assert.equal(t.busy(),false);assert.ok(t.offset('a'),'it rests where the cushion left it');
});

test('sync follows the map: removed companions drop out, offsets survive a refresh',()=>{
  const t=E.table();t.sync(spots(),600);t.fire({x:0,y:0},0,1,27);run(t,.3);const before=t.offset('a');assert.ok(before);
  t.sync(spots().filter(s=>s.uid!=='c'),600);assert.equal(t.pos('c'),null);assert.deepEqual(t.offset('a'),before);t.reset();assert.equal(t.busy(),false);
});

test('energy line goes out once without ever landing in the text draft, even if sending fails',async()=>{
  let fail=true,sent=[];const s=K.session({scope:'a',storage:storage(),id:()=> 'e1',send:async m=>{sent.push(m);if(fail)throw Error('offline');}});
  s.setDraft('my half-typed message',null);await assert.rejects(s.submitLine('Eman','@Amara \u26a1 Eman sent you energy'));
  assert.equal(s.state().draft.text,'my half-typed message');assert.equal(sent.length,1);assert.equal(sent[0].t,'@Amara \u26a1 Eman sent you energy');
  const s2=K.session({scope:'a',storage:storage(),id:()=> 'e2',send:async()=>{throw Error('x');}});await assert.rejects(s2.submitLine('Eman','\u26a1 hi'));assert.equal(s2.state().draft.text,'');
  await assert.rejects(s.submitLine('Eman','   '));
});

test('wiring: Community only, loaded and cached, joystick kept clear of labels, gestures and bubbles',()=>{
  const html=read('index.html'),sw=read('sw.js'),chat=read('community-chat.js'),js=read('community-energy.js'),css=read('community-energy.css');
  assert.match(html,/<link rel="stylesheet" href="community-energy\.css\?v=[^"]+">/);assert.match(html,/<script src="community-chat\.js[^"]*"><\/script>\s*<script src="community-energy\.js\?v=[^"]+"><\/script>/);
  const list=sw.match(/const STATIC = \[[^\]]*\]/)[0];assert.ok(list.includes('"community-energy.js"')&&list.includes('"community-energy.css"'));
  assert.match(chat,/W\.LowiEnergy\.mount\(gal\)/);assert.match(chat,/epos\(gx\.spot\.get\(L\.id\),L\.id\)/);assert.match(chat,/keepOut\(gal\)/);assert.match(chat,/\.cg-empty,\.ce-joy'/);
  assert.match(chat,/geom\(\)\{/);assert.match(chat,/energy\(uid\)\{[^]*?botOf\(uid\)\)return 'bot'[^]*?blocked\(uid\)\)return 'blocked'[^]*?submitLine/);
  assert.match(chat,/energyPing:\['\u26a1 \{n\} sent you energy'/);
  assert.match(js,/canPing\(st,uid,Date\.now\(\)\)/,'the ping is rate-limited before it is sent');
  assert.match(js,/stopPropagation\(\)/);assert.match(css,/touch-action:none/);assert.match(css,/\.ce-joy\{[^}]*width:72px;height:72px/);
  assert.match(css,/prefers-reduced-motion/);assert.doesNotMatch(css,/#(?:c9a|d4af|e6c|f5e6|ffd27a|daa520)/i,'no gold or beige');
  assert.doesNotMatch(read('world-home.js'),/LowiEnergy/);
});
