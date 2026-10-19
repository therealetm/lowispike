'use strict';
/* Oct 16 (Emmanuel: "if there were like 1,000 people and we're all shooting energy balls, we all see it simultaneously"):
   energy balls go over the Community's shared realtime channel as compact shot events, and every phone flies the same ball. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../community-energy.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
/* the map is drawn around the viewer: you sit at (0,0), everyone else keeps a fixed spot. So A and B see different layouts. */
const viewA=()=>[{uid:'A',me:true,x:0,y:0,r:27},{uid:'B',x:-240,y:120,r:23},{uid:'C',x:300,y:0,r:23},{uid:'D',x:360,y:40,r:23}];
const viewB=()=>[{uid:'B',me:true,x:0,y:0,r:27},{uid:'A',x:120,y:-260,r:23},{uid:'C',x:300,y:0,r:23},{uid:'D',x:360,y:40,r:23}];
function hitStep(t,max){for(let i=0;i<max;i++){const ev=t.step(1/60);const h=ev.find(e=>e.type==='hit');if(h)return {i,h};}return null;}

test('the shooter decides: one event, and the friend sees the same ball from the shooter\'s companion hit the same person at the same moment',()=>{
  const a=E.table();a.sync(viewA(),600);const from={x:0,y:0,uid:'A'},pr=a.predict(from,0,1,24);
  assert.equal(pr.to,'C');assert.ok(pr.ht>0);
  a.fire(from,0,1,24,{id:'s1',to:pr.to,ht:pr.ht});
  const msg=E.pack({id:'s1',by:'A',a:0,p:1,to:pr.to,ht:pr.ht,t:1e12});assert.ok(JSON.stringify(msg).length<160,'compact event');
  const m=E.unpack(JSON.parse(JSON.stringify(msg)));
  const b=E.table();b.sync(viewB(),600);const at=b.pos('A');const s=b.fire({x:at.x,y:at.y,uid:'A'},m.a,m.p,23*.9,{id:m.id,to:m.to,ht:m.ht,remote:true,age:0});
  assert.ok(s&&s.remote);const dx=s.x-at.x,dy=s.y-at.y;assert.ok(Math.hypot(dx,dy)<23,'it leaves from A\'s own companion on B\'s map');
  const ha=hitStep(a,120),hb=hitStep(b,120);assert.ok(ha&&hb);assert.equal(ha.h.uid,'C');assert.equal(hb.h.uid,'C');
  assert.ok(Math.abs(ha.i-hb.i)<=1,'same frame: '+ha.i+' vs '+hb.i);assert.equal(ha.h.own,true);assert.equal(hb.h.own,false,'only the shooter sends the energy line');
  assert.ok(b.offset('C'),'C is knocked on the friend\'s screen too');
});

test('network delay is caught up: a shot received 100 ms late is already 100 ms along and lands on time',()=>{
  const a=E.table();a.sync(viewA(),600);const from={x:0,y:0,uid:'A'},pr=a.predict(from,0,.8,24);a.fire(from,0,.8,24,{id:'s2',to:pr.to,ht:pr.ht});
  for(let i=0;i<12;i++)a.step(1/120*1.0000001);const sa=a.shots()[0];
  const b=E.table();b.sync(viewB(),600);const at=b.pos('A');b.fire({x:at.x,y:at.y,uid:'A'},0,.8,23*.9,{id:'s2',to:pr.to,ht:pr.ht,remote:true,age:100});const sb=b.shots()[0];
  assert.ok(Math.abs(sa.gone/sa.until-sb.gone/sb.until)<.03,'same share of the way: '+(sa.gone/sa.until).toFixed(3)+' vs '+(sb.gone/sb.until).toFixed(3));
  const late=E.table();late.sync(viewB(),600);late.fire({x:at.x,y:at.y,uid:'A'},0,.8,23*.9,{to:'C',ht:pr.ht,remote:true,age:pr.ht+50});
  assert.ok(late.step(1/60).some(e=>e.type==='hit'&&e.uid==='C'&&e.late===true&&isFinite(e.fx)),'arrives after impact: the hit still shows at once, with a streak from the shooter');
});

test('a miss is a miss everywhere, and a shot at me knocks my companion on my own screen, then it settles home',()=>{
  const b=E.table();b.sync(viewB(),600);const at=b.pos('A');b.fire({x:at.x,y:at.y,uid:'A'},Math.PI/2,1,20,{id:'m',remote:true});
  let ev=[];for(let i=0;i<120;i++)ev.push(...b.step(1/60));assert.ok(!ev.some(e=>e.type==='hit'));assert.ok(ev.some(e=>e.type==='fizzle'));
  const t=E.table();t.sync(viewB(),600);t.fire({x:at.x,y:at.y,uid:'A'},0,1,20,{id:'me',to:'B',ht:300,remote:true});
  ev=[];for(let i=0;i<40;i++)ev.push(...t.step(1/60));assert.ok(ev.some(e=>e.type==='hit'&&e.uid==='B'));assert.ok(t.offset('B'),'my companion takes the hit');
  for(let i=0;i<900;i++)t.step(1/60);assert.equal(t.busy(),false);assert.equal(t.offset('B'),null);
  const own=E.table();own.sync(viewB(),600);own.fire({x:0,y:0,uid:'B'},0,1,24);for(let i=0;i<200;i++)own.step(1/60);assert.equal(own.offset('B'),null,'my own shot never moves me');
});

test('many balls at once: capped, my own shot always shows, and a shooter never hits themselves',()=>{
  const t=E.table();t.sync(viewA(),600);
  for(let i=0;i<E.MAX_BALLS+10;i++)t.fire({x:-240,y:120,uid:'B'},i*.2,.5,20,{id:'r'+i,remote:true});
  assert.equal(t.shots().length,E.MAX_BALLS);assert.ok(t.fire({x:0,y:0,uid:'A'},0,1,24,{id:'mine'}));assert.equal(t.shots().length,E.MAX_BALLS);assert.ok(t.shots().some(s=>s.id==='mine'));
  assert.equal(t.predict({x:-240,y:120,uid:'B'},Math.atan2(-120,240),1,20).to==='B',false);
  for(let i=0;i<600;i++)t.step(1/60);assert.equal(t.shots().length,0);
});

test('rate limits: per player when sending and receiving, plus an inbox cap for big crowds',()=>{
  let st={},ok=0;for(let i=0;i<20;i++){const r=E.bucket(st,1e6+i*100,E.SEND.max,E.SEND.win,E.SEND.gap);st=r.st;if(r.ok)ok++;}
  assert.ok(ok<=E.SEND.max,'no more than '+E.SEND.max+' shots per 2 s: '+ok);
  assert.equal(E.bucket({ts:[1e6]},1e6+100,4,2000,250).ok,false,'too soon after the last');assert.ok(E.bucket({ts:[1e6]},1e6+3000,4,2000,250).ok);
  st={};ok=0;for(let i=0;i<1000;i++){const r=E.bucket(st,1e6+i,E.INBOX.max,E.INBOX.win,0);st=r.st;if(r.ok)ok++;}assert.equal(ok,E.INBOX.max);
});

test('events: garbage is ignored, sizes are bounded, and timestamps tolerate wrong phone clocks',()=>{
  for(const bad of [null,1,'x',{},{v:2,id:'a',by:'b',a:0,p:1,t:1},{v:1,id:'',by:'b',a:0,p:1,t:1},{v:1,id:'a',by:'b',a:'x',p:1,t:1},{v:1,id:'a'.repeat(30),by:'b',a:0,p:1,t:1}])assert.equal(E.unpack(bad),null);
  const m=E.unpack({v:1,id:'a',by:'b',a:99,p:5,to:7,ht:1e9,t:5});assert.equal(m.a,7);assert.equal(m.p,1);assert.equal(m.to,'');assert.equal(m.ht,5000);
  assert.deepEqual(E.shotAge(1000,1080),{age:80,stale:false});assert.equal(E.shotAge(1000,900).age,0,'a slightly fast sender clock is not negative');
  assert.equal(E.shotAge(1000,1000+3500).stale,true,'an old shot (reconnect) is not replayed');
  const skew=E.shotAge(0,600000+90,600000);assert.equal(skew.age,150);assert.equal(skew.stale,false);
});

test('wiring: the same shared realtime channel as chat, one compact event per shot, remote shots drawn and never pinging',()=>{
  const html=read('index.html'),js=read('community-energy.js');
  const sub=html.slice(html.indexOf('chan = sb.channel("lowi-all")'),html.indexOf('.subscribe(status => { chatRealtime'));
  assert.match(sub,/\.on\("broadcast", \{event:"energy"\}[^\n]*lowi:energy-shot/,'listens on lowi-all, no second subscription');
  assert.match(html,/energyShot\(p\)\{ if \(!chan \|\| chatRealtime !== "SUBSCRIBED"[^\n]*type:"broadcast", event:"energy"/);
  assert.match(js,/D\.addEventListener\('lowi:energy-shot'/);assert.match(js,/c\.energyShot\(pack\(\{id,by,a:ang,p:power,to:pr\.to,ht:pr\.ht,t:now\}\)\)/);
  assert.match(js,/if\(e\.own\)ping\(e\.uid\)/,'only the shooter sends the energy line');assert.match(js,/const flying=tb\?tb\.shots\(\):\[\],cheap=flying\.length>6(\|\|slow)?;/);assert.match(js,/for\(const sh of flying\)/);
  assert.match(js,/flash\(bodyEl\(m\.by\)\)/,'the shooter\'s own companion flashes on everyone\'s map');
});
