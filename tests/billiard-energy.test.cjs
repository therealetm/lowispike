'use strict';
/* Oct 19 (Emmanuel, playing Community on his iPhone): "whenever I shoot them ... they just go back to where they were. That's not fun
   ... It doesn't feel like a real billiard ... I shoot them away. They shouldn't be coming back. They should be hitting other people."
   A knocked companion stays where it stops rolling, carries on into others (chain hits), and the table does no work at rest. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../community-energy.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function run(t,sec,dt=1/60){const ev=[];for(let i=0;i<sec/dt;i++)ev.push(...t.step(dt));return ev;}
function settle(t){let n=0;while(t.busy()&&n<60*60){t.step(1/60);n++;}return n;}
const row=()=>[{uid:'me',me:true,x:0,y:0,r:27},{uid:'a',x:200,y:0,r:23},{uid:'b',x:260,y:0,r:23},{uid:'c',x:0,y:300,r:23}];

test('shot away, it stays away: no drifting back to its old spot, even a minute later',()=>{
  for(const reduced of [false,true]){const t=E.table({reduced});t.sync(row(),700);t.fire({x:0,y:0,uid:'me'},0,1,27);
    settle(t);assert.equal(t.busy(),false);const p=t.pos('b');assert.ok(p.x>260+40,'b really moved (reduced '+reduced+'): '+p.x);
    run(t,60);assert.deepEqual(t.pos('b'),p,'still exactly where it stopped');assert.ok(t.offset('b'));}
});

test('billiards: the knocked one hands its speed on to the one it hits, and that one carries on',()=>{
  const t=E.table();t.sync(row(),700);t.fire({x:0,y:0,uid:'me'},0,1,27);const ev=run(t,4);
  assert.ok(ev.some(e=>e.type==='hit'&&e.uid==='a'));assert.ok(ev.some(e=>e.type==='bump'&&[e.a,e.b].sort().join()==='a,b'));
  const a=t.pos('a'),b=t.pos('b');assert.ok(b.x-260>(a.x-200)*3,'b rolls much further than a, like a cue ball stopping: a '+a.x.toFixed(0)+', b '+b.x.toFixed(0));
});

test('a companion resting off its spot can be hit again where it is now, and knocks the next one on',()=>{
  const t=E.table();t.sync([{uid:'me',me:true,x:0,y:0,r:27},{uid:'a',x:120,y:0,r:23},{uid:'d',x:600,y:0,r:23}],800);
  t.fire({x:0,y:0,uid:'me'},0,.35,27);settle(t);const a1=t.pos('a');assert.ok(a1.x>140,'a moved first: '+a1.x);assert.equal(t.offset('d'),null);
  const pr=t.predict({x:0,y:0,uid:'me'},0,1,27);assert.equal(pr.to,'a','the aim finds a where it rests now');
  t.fire({x:0,y:0,uid:'me'},0,1,27,{to:pr.to,ht:pr.ht});const ev=run(t,4);settle(t);
  assert.ok(ev.some(e=>e.type==='bump'&&[e.a,e.b].sort().join()==='a,d'),'a rolls into d');assert.ok(t.offset('d'),'d got knocked and stays knocked');
});

test('at rest the table does nothing (no endless animation loop just because people are off their spots)',()=>{
  const t=E.table();t.sync(row(),700);t.fire({x:0,y:0,uid:'me'},0,1,27);const n=settle(t);
  assert.ok(n<60*8,'settles in a few seconds: '+n+' frames');assert.equal(t.busy(),false);assert.ok(t.offset('a')||t.offset('b'));
  assert.equal(t.mode(),'idle');
});

test('where they landed survives the pin moving, dropping off the map for a while, a new table (reload) and a hidden Community',()=>{
  const t=E.table();t.sync(row(),700);t.fire({x:0,y:0,uid:'me'},0,1,27);settle(t);const b=t.pos('b');
  t.sync(row().map(s=>s.uid==='b'?{...s,x:250,y:20}:s),700);assert.deepEqual({x:t.pos('b').x,y:t.pos('b').y},{x:b.x,y:b.y},'pin moved, b did not jump');
  t.sync(row().filter(s=>s.uid!=='b'),700);assert.equal(t.pos('b'),null);t.sync(row(),700);
  assert.ok(Math.abs(t.pos('b').x-b.x)<1e-6&&Math.abs(t.pos('b').y-b.y)<1e-6,'back on the map where it was');
  const saved=JSON.parse(JSON.stringify(t.snap()));assert.deepEqual(saved.b,[Math.round(b.x),Math.round(b.y)]);assert.equal(saved.c,undefined,'untouched ones are not stored');
  const fresh=E.table();fresh.restore(saved);fresh.sync(row(),700);assert.equal(Math.round(fresh.pos('b').x),Math.round(b.x),'after a reload too');
  const h=E.table();h.sync(row(),700);h.fire({x:0,y:0,uid:'me'},0,1,27);run(h,.2);const mid=h.pos('a');h.halt();assert.equal(h.busy(),false);assert.deepEqual(h.pos('a'),mid,'leaving Community mid-roll freezes, never resets');
  fresh.restore({x:'bad',y:[1],z:[NaN,1]});fresh.restore(null);assert.equal(fresh.pos('x'),null);
});

test('me: knocked by a friend I stay where I land, I am not a wall for others any more, and my next shot leaves from there',()=>{
  const t=E.table();t.sync([{uid:'B',me:true,x:0,y:0,r:27},{uid:'A',x:120,y:-260,r:23}],700);
  t.fire({x:120,y:-260,uid:'A'},0,1,20,{id:'s',to:'B',ht:250,remote:true});settle(t);const me=t.pos('B');assert.ok(Math.hypot(me.x,me.y)>20,'I was knocked');
  run(t,30);assert.deepEqual(t.pos('B'),me);t.sync([{uid:'B',me:true,x:0,y:0,r:27},{uid:'A',x:120,y:-260,r:23}],700);assert.deepEqual(t.pos('B'),me);
  const js=read('community-energy.js');assert.match(js,/const at=t\.pos\(me\.uid\)\|\|me,from=\{x:at\.x,y:at\.y,uid:me\.uid\}/,'my shot starts at my companion, wherever it is');
});

test('wiring: hidden Community halts instead of resetting, resting spots are saved and drawn after a reload, YOU follow too',()=>{
  const js=read('community-energy.js'),chat=read('community-chat.js');
  assert.doesNotMatch(js,/mode='back'|T\.ret|maxOff/,'no ease-back phase, no home tether');
  assert.match(js,/if\(!visible\(\)\)\{if\(tb\)\{tb\.halt\(\);saveLand\(\);\}/);assert.doesNotMatch(js.slice(js.indexOf('function frame(')),/tb\.reset\(\)/);
  assert.match(js,/if\(was&&!nowBusy\)saveLand\(\);/,'saved once when everything stops, not every frame');
  assert.match(js,/tb\.restore\(old\|\|loadLand\(\)\)/);assert.match(js,/function offset\(uid\)\{if\(!tb\|\|\(!tb\.has\(uid\)&&tb\.landed\(uid\)\)\)/);
  assert.match(chat,/const me=gx\.me&&epos\(gx\.spot\.get\(gx\.me\.uid\),gx\.me\.uid\)/);
});
