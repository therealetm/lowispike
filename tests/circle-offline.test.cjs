'use strict';
/* 24 Oct 2026, handoff (Emmanuel): offline companions in the Circle Room + the room opens zoomed out.
   - Friends and members of this room whose person is offline still show on the map, resting (faded, a moon, "offline"), never a bot.
   - A resting companion has no live actions: tapping it opens the profile card ("Resting · offline", no Chat), no talk line, and it is
     not on the energy table (cannot be aimed at, hit or knocked by a chain).
   - Resting companions only take the seats left over after everyone who is here, so the shared room frame of the people who are here
     (energy blasts, Oct 24 diagnosis) is exactly what it was.
   - Entering the room starts zoomed out on everyone (mapFit). */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const G=require('../community-galaxy.js');
const js=read('community-chat.js'),en=read('community-energy.js'),css=read('community-galaxy.css');
const ui=read('tests/community-chat-ui.test.cjs');
const fixture=new Function('require','assert','fs','vm','path','__dirname','K',ui.slice(ui.indexOf('function fixture(){'),ui.indexOf('\ntest('))+'\nreturn fixture;')(require,assert,fs,vm,path,path.join(__dirname),require('../community-chat-core.js'));

const ids=(p,n)=>Array.from({length:n},(_,i)=>({uid:p+i+'-'+(i*7919%97),n:p+i}));

test('resting members never move anyone who is here: online seats are identical with and without them',()=>{
 for(const [on,off] of [[3,5],[10,24],[30,24],[40,10],[1,24]]){
  const here=ids('on',on),rest=ids('off',off).map(p=>({...p,off:true}));
  const a=G.mapLayout(here,'me-uid'),b=G.mapLayout(here.concat(rest),'me-uid');
  const pos=L=>new Map(L.spots.filter(s=>!s.off).map(s=>[s.uid,s.x+','+s.y]));
  assert.deepEqual([...pos(b)],[...pos(a)],on+' here, '+off+' resting: same seats');
  assert.equal(b.cx,a.cx);assert.equal(b.cy,a.cy);assert.equal(b.pool,a.pool,'the pool of the people who are here is unchanged');
  const r=b.spots.filter(s=>s.off);assert.equal(r.length,off,'every resting member gets a seat');
  assert.ok(r.every(s=>!s.me),'you are never resting');
  const seen=new Set(b.spots.map(s=>s.x+','+s.y));assert.equal(seen.size,b.spots.length,'no two companions share a seat');
  assert.ok(b.radius>=a.radius);
 }
});

test('resting seats do not depend on the order they are passed in',()=>{
 const here=ids('h',6),rest=ids('r',12).map(p=>({...p,off:true}));
 const a=G.mapLayout(here.concat(rest),'me'),b=G.mapLayout(rest.slice().reverse().concat(here.slice().reverse()),'me');
 const m=L=>JSON.stringify(L.spots.slice().sort((x,y)=>x.uid<y.uid?-1:1));assert.equal(m(a),m(b));
});

test('the room opens zoomed out on everyone: mapFit frames all seats, never closer than a step back from the normal zoom',()=>{
 for(const [n,w,h] of [[2,390,700],[12,390,700],[40,390,700],[60,1024,700],[25,820,1100]]){
  const L=G.mapLayout(ids('p',n),'me'),Z=G.mapZooms(L.radius,w,h),pad={x:48,top:92,bottom:150},c=G.mapFit(L.spots,L.radius,w,h,pad);
  assert.ok(c.z<=Z.z0*.82+1e-9,'zoomed out from the normal zoom ('+n+')');assert.ok(c.z>=Z.zmin-1e-9,'within the zoom limits');
  const cc=G.mapClamp(c,L.radius,w,h,{x:L.cx,y:L.cy});
  if(c.z>Z.zmin+1e-6){for(const s of L.spots){const x=w/2+(s.x-cc.x)*cc.z,y=h*.5+(s.y-cc.y)*cc.z;
   assert.ok(x>=pad.x-2&&x<=w-pad.x+2&&y>=pad.top-2&&y<=h-pad.bottom+2,'seat '+s.uid+' on screen in the free area ('+n+' at '+w+'x'+h+')');}}
 }
 assert.deepEqual(Object.keys(G.mapFit([],0,390,700)).sort(),['x','y','z']);
});

function roomFixture(){
 const f=fixture();const now=Date.now();
 const msgs=[{id:'m1',uid:'b',by:'Same name',t:'Hi all',ts:now-60e3},{id:'m2',uid:'w',by:'Wren',t:'old hello',ts:now-5*3600e3},{id:'m3',uid:'botx',by:'Lumo',t:'beep',ts:now-4*3600e3},{id:'m4',uid:'blk',by:'Blocked',t:'x',ts:now-3*3600e3}];
 f.host.messages=()=>msgs.slice();
 const ppl=[{uid:'b',n:'Same name'},{uid:'w',n:'Wren'},{uid:'fr',n:'Frieda'},{uid:'botx',n:'Lumo',bot:true},{uid:'blk',n:'Blocked'},{uid:'el',n:'Elsewhere'}];
 f.host.people=()=>ppl.slice();
 let members=['a','b'];
 f.win.LowiRooms={active:()=>true,room:()=>'room-3',members:()=>members.slice(),status:()=>'in',cap:()=>30,num:()=>3,knocks:()=>[],has:u=>members.includes(u),
  rooms:()=>[{n:3,c:2,u:['a','b'],t:Date.now()},{n:5,c:1,u:['el'],t:Date.now()}]};
 f.win.LowiCellRoom={friends:()=>[{uid:'fr',n:'Frieda'},{uid:'el',n:'Elsewhere'},{uid:'botx',n:'Lumo'}]};
 f.win.LowiBotAccounts={isBot:u=>String(u&&u.uid||u)==='botx',humans:l=>l};
 f.storage['lowi.community.prefs.v1:a']=JSON.stringify({blocks:{blk:{blocked:true,name:'Blocked'}}});
 f.scope('a');
 return {f,set(m){members=m;f.win.LowiCommunity.refresh();f.flush();},field:()=>String(f.nodes.cgField.innerHTML||'')};
}
const body=(html,uid)=>{const m=html.match(new RegExp('<button[^>]*class="cg-body[^"]*"[^>]*data-uid="'+uid+'"[^>]*>|<button[^>]*data-uid="'+uid+'"[^>]*class="cg-body[^"]*"[^>]*>'));return m?m[0]:'';};

test('offline friends and room members rest on the map; bots, people in another room and people who are here are not resting',()=>{
 const r=roomFixture(),h=r.field();
 assert.match(body(h,'fr'),/resting/,'an offline friend rests on the map');
 assert.match(body(h,'w'),/resting/,'someone who wrote in this room and is offline rests on the map');
 assert.match(body(h,'fr'),/data-chat="person-off"/,'tapping a resting companion is not a live talk line');
 assert.match(body(h,'fr'),/aria-label="Frieda · offline, their companion is resting/);
 assert.doesNotMatch(body(h,'fr'),/aria-pressed/);
 assert.match(h,/class="cg-resttag">offline</);assert.match(h,/class="cg-zz"/);
 assert.doesNotMatch(body(h,'b'),/resting/,'someone who is here is not resting');
 assert.equal(body(h,'botx'),'','a bot never shows up as a resting member');
 assert.equal(body(h,'el'),'','a friend who is online in another room is not shown as offline');
 r.set(['a','b','fr']);
 assert.doesNotMatch(body(r.field(),'fr'),/resting/,'when the friend comes online they are a normal companion again');
 assert.match(body(r.field(),'fr'),/data-chat="person"/);
});

test('blocked people never rest on the map, and without the live room nobody is marked offline',()=>{
 const r=roomFixture();
 assert.match(body(r.field(),'w'),/resting/,'the fixture does show offline members');
 assert.equal(body(r.field(),'blk'),'','someone you blocked never rests on your map');
 r.f.win.LowiRooms.active=()=>false;r.f.win.LowiCommunity.refresh();r.f.flush();
 assert.doesNotMatch(r.field(),/cg-body[^"]*resting/,'without the live room nothing knows who is online, so nothing is marked offline');
});

test('tapping a resting companion opens the profile card: "Resting · offline", no Chat action, the reason in words',()=>{
 const r=roomFixture();
 r.f.click({chat:'person-off',uid:'fr',name:'Frieda'});
 const s=String(r.f.sheets[r.f.sheets.length-1]||'');
 assert.match(s,/cp-live cp-rest[^>]*><i[^>]*><\/i><span>Resting · offline/);
 assert.doesNotMatch(s,/data-chat="select-close"/,'no live Chat line to someone offline');
 assert.match(s,/Frieda is offline right now, so their companion is resting here/);
 assert.doesNotMatch(r.f.nodes.cgTo.innerHTML||'',/Frieda/,'nobody got selected as a talk target');
});

test('resting companions are off the energy table and never auto-aimed',()=>{
 assert.match(en,/function syncT\(t,g\)\{t\.sync\(g\.spots\.filter\(s=>!s\.off\)/);
 assert.match(en,/if\(s0\.me\|\|s0\.off\)continue;/);
 assert.match(js,/spots:gx\.map\.spots\.filter\(s=>gx\.spot\.has\(s\.uid\)\)\.map\(s=>\(\{uid:s\.uid,me:!!s\.me,off:!!s\.off,/);
 /* a knocked companion whose person then goes offline stays where it landed */
 assert.match(en,/if\(s&&s\.off&&l\)return \{x:l\.x\+\(g\.rcx\|\|0\)-s\.x,y:l\.y\+\(g\.rcy\|\|0\)-s\.y\};/);
});

test('camera: opens on mapFit, follows the crowd only until your first touch, and the double-tap reset is unchanged',()=>{
 assert.match(js,/if\(!cam\)\{cam=camFit\(gx,v\);camFitN=nSp;\}/);
 assert.match(js,/gal\.addEventListener\('pointerdown',e=>\{camAuto=false;/);
 assert.match(js,/gal\.addEventListener\('wheel',e=>\{camAuto=false;/);
 assert.match(js,/enterAt=Date\.now\(\);cam=null;camAuto=true;camFitN=-1;/);
 assert.match(js,/camTo\(cam\.z>=Z\.zmax\*\.98\?\{x:0,y:0,z:Z\.z0\}/);
});

test('resting look: faded, still, and the strings exist in English, German and Spanish',()=>{
 assert.match(css,/\.cg-body\.resting\{opacity:\.6\}/);
 assert.match(css,/\.cg-body\.resting \.cg-orb \*\{animation:none !important\}/);
 assert.match(js,/restTag:\['Resting · offline','Ruht · offline','Descansa · sin conexión'\]/);
 assert.match(js,/restShort:\['offline','offline','desconectado'\]/);
 assert.doesNotMatch(js.slice(js.indexOf('restTag:'),js.indexOf('restTag:')+900),/Misty/,'the companion is never called Misty');
});
