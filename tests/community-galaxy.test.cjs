'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const G=require('../community-galaxy.js');
const members=[{uid:'a',n:'Me'},{uid:'b',n:'Bea'},{uid:'c',n:'Cy'},{uid:'d',n:'Dee'}];
for(const [w,h] of [[390,600],[1180,640],[320,460]]){
 test('galaxy layout '+w+'x'+h+': every body has its own spot inside the field, you are one of them',()=>{
  const L=G.layout(members,w,h,'a');const s=L.spots;
  assert.equal(s.length,4);assert.equal(s.filter(p=>p.me).length,1);assert.equal(s.find(p=>p.me).uid,'a');
  for(const p of s){assert.ok(p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h,'inside '+p.uid);}
  const cells=new Set(s.map(p=>p.cell.r+':'+p.cell.c));assert.equal(cells.size,4,'one cell per body');
 });
}
test('mentions and replies point a stream line at the right member, never at yourself',()=>{
 const idx=G.nameIndex(members);
 assert.deepEqual(G.mentionOf('@Bea nice',idx)&&G.mentionOf('@Bea nice',idx).uid,'b');
 assert.equal(G.mentionOf('@Beatrix hi',idx),null);
 const all=[{id:'1',uid:'b',by:'Bea',t:'hi'},{id:'2',uid:'c',by:'Cy',t:'yo',re:'1'},{id:'3',uid:'b',by:'Bea',t:'@Bea me'}];
 assert.equal(G.targetOf(all[1],all,idx).uid,'b');
 assert.equal(G.targetOf(all[2],all,idx),null);
 assert.equal(G.direct('hello','Bea'),'@Bea hello');assert.equal(G.direct('@bea hello','Bea'),'@bea hello');
});
/* Oct 16, round 5 (E-man: "tapping Joseph selected Bastian", "everyone changes places"): the map keeps every pin put */
test('map: each person keeps one spot whatever the order, selection or screen; you sit in the middle',()=>{
 const people=[];for(let i=0;i<31;i++)people.push({uid:'bot:'+i});
 const a=G.mapLayout(people,'me'),b=G.mapLayout([people[9],people[3],...people.filter((p,i)=>i!==9&&i!==3)],'me');
 assert.deepEqual(a.spots,b.spots,'picking or hearing from someone first moves nobody');
 assert.deepEqual(a.spots[0],{uid:'me',me:true,x:0,y:0});assert.equal(a.spots.length,32);
 let min=1e9;for(const p of a.spots)for(const q of a.spots)if(p!==q)min=Math.min(min,Math.hypot(p.x-q.x,p.y-q.y));
 assert.ok(min>=100,'people are spread out like pins, nearest pair '+Math.round(min));
 /* Oct 25 (Emmanuel: "the newest people at the top"): seats follow the join date, so the newcomer here joins after everyone */
 const c=G.mapLayout(people.concat([{uid:'new-person',j:Date.parse('2026-10-25T12:00:00Z')}]),'me');const moved=c.spots.filter(s=>{const o=a.spots.find(x=>x.uid===s.uid);return o&&(o.x!==s.x||o.y!==s.y);});
 assert.ok(moved.length<=2,'one new member moves at most one neighbour');
});
test('map labels: bubbles never cover another person or name; no room means a dot',()=>{
 const items=[{id:'me',x:180,y:300,s:54,nw:40,bw:150,bh:36,bub:true},{id:'a',x:180,y:212,s:46,nw:50,bw:150,bh:36,bub:true},{id:'b',x:268,y:300,s:46,nw:50,bw:150,bh:36,bub:true},{id:'c',x:92,y:300,s:46,nw:50,bw:150,bh:36,bub:true}];
 const L=G.mapLabels(items,{w:360,h:560});const boxes=[];
 for(const it of items){const r=L.get(it.id);if(!r.bub)continue;const box={x:r.bub.x,y:r.bub.y,w:it.bw,h:it.bh};boxes.push(box);
  for(const o of items){if(o.id===it.id)continue;const orb={x:o.x-o.s/2,y:o.y-o.s/2,w:o.s,h:o.s+20};assert.ok(!(box.x<orb.x+orb.w&&orb.x<box.x+box.w&&box.y<orb.y+orb.h&&orb.y<box.y+box.h),it.id+' bubble covers '+o.id);}
  assert.ok(box.x>=0&&box.x+box.w<=360&&box.y>=0&&box.y+box.h<=560,'inside the view');}
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const p=boxes[i],q=boxes[j];assert.ok(!(p.x<q.x+q.w&&q.x<p.x+p.w&&p.y<q.y+q.h&&q.y<p.y+p.h),'bubbles overlap');}
 assert.ok([...L.values()].every(r=>r.bub||r.dot));
});
test('map camera: zoom stays between seeing everyone and a close look',()=>{
 const Z=G.mapZooms(600,352,550);assert.ok(Z.zmin<Z.z0&&Z.z0<Z.zmax);assert.ok(Z.zmin<=352/(2*690)+1e-9);
 const c=G.mapClamp({x:9999,y:-9999,z:99},600,352,550);assert.equal(c.z,Z.zmax);assert.equal(c.x,640);assert.equal(c.y,-640);
});
