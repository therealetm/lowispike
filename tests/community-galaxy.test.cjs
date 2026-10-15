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
