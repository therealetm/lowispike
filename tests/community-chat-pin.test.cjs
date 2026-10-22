'use strict';
/* 22 Oct (Emmanuel, iPhone): the fake "Pinned Message — Welcome to the galaxy" bar is gone; the admin pins a real message from its
   menu (Pin / Unpin), one pin per room, stored as a marker message in the room so everyone sees it; tapping the bar goes to the
   message; non-admins never get Pin or Unpin. Fixture adapted from community-room.test.cjs with a tiny in-memory messages table. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const K=require('../community-chat-core.js');
const js=fs.readFileSync(path.join(__dirname,'../community-chat.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../community-tg.css'),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,5));
function fixture({owner=false,rows=[]}={}){
 const nodes={},events={},rafs=[],classes=new Set(),storage={};let actor='';
 const db=rows.map(r=>({room:'all',reply_to:null,...r}));const load=()=>db.map(r=>({id:r.id,uid:r.user_id,by:r.who,t:r.body,ts:Date.parse(r.created_at),rx:{},re:null}));let store=[],rx=[];
 function node(id){return nodes[id]||(nodes[id]={id,dataset:{},style:{setProperty(k,v){this[k]=v;}},classList:{add(){},remove(){}},value:'',innerHTML:'',textContent:'',scrollTop:0,scrollHeight:500,clientHeight:300,attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},hasAttribute(k){return k in this.attrs;},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getBoundingClientRect:()=>(String(id).startsWith('cm-')?{top:600,height:40}:{top:180,height:300}),scrollIntoView(){this.scrolled=(this.scrolled||0)+1;},focus(){doc.activeElement=this;}});}
 const el=node('cmPaneChat');el.querySelector=s=>node(s.startsWith('#')?s.slice(1):s);const input=node('cmInput');input.closest=()=>null;
 const doc={hidden:false,activeElement:null,documentElement:{classList:{toggle(k,v){if(v)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)}},getElementById:id=>id==='cmPaneChat'?el:id==='tabbar'?null:(id.startsWith('cm-')&&!store.some(m=>'cm-'+m.id===id)?null:node(id)),querySelector:()=>null,createElement:()=>node('new'),addEventListener:(e,f)=>(events[e]=events[e]||[]).push(f)};
 function from(table){const q={op:'select',f:[],lk:null,one:false,row:null};
  for(const m of ['order','limit','abortSignal','in'])q[m]=()=>q;
  q.select=()=>q;q.eq=(k,v)=>{q.f.push([k,v]);return q;};q.match=o=>{for(const k in o)q.f.push([k,o[k]]);return q;};q.like=(k,p)=>{q.lk=[k,p.replace(/%$/,'')];return q;};
  q.insert=r=>{q.op='insert';q.row=r;return q;};q.delete=()=>{q.op='delete';return q;};q.single=q.maybeSingle=()=>{q.one=true;return q;};
  q.then=(a,b)=>Promise.resolve().then(()=>{if(table!=='messages')return {data:[],error:null};
   const hit=r=>q.f.every(([k,v])=>r[k]===v)&&(!q.lk||String(r[q.lk[0]]||'').startsWith(q.lk[1]));let data;
   if(q.op==='insert'){const r={...q.row,created_at:new Date(Date.now()+db.length).toISOString()};db.push(r);data=r;}
   else if(q.op==='delete'){data=db.filter(hit);for(const r of data)db.splice(db.indexOf(r),1);}
   else{data=db.filter(hit).sort((x,y)=>String(y.created_at).localeCompare(String(x.created_at)));if(q.one)data=data[0]||null;}
   return {data,error:null};}).then(a,b);return q;}
 const host={state:()=>({uid:actor,chatRealtime:'SUBSCRIBED'}),messages:()=>store,reactions:()=>rx,client:async()=>({from}),replace(ms,r){store=ms.slice();rx=r||[];},upsert(m){store=store.filter(x=>x.id!==m.id).concat(m).sort((a,b)=>a.ts-b.ts);},remove(id){store=store.filter(x=>x.id!==id);},setReactions(r){rx=r;},people:()=>[],identity:()=>({n:'Fixture A',t:'INFP',s:'Pisces',bday:'1990-03-01',w:70}),bubble:()=>'<span>b</span>',sheet(){},active:()=>true,install(){},typeLabel:()=>'Mediator',color:()=>'#9fd8ff'};
 const win={document:doc,LowiChatCore:K,LowiCommunityHost:host,LowiOwnerAdmin:{isOwner:()=>owner},innerWidth:390,innerHeight:844,visualViewport:{height:844,offsetTop:0,addEventListener(){}},addEventListener(){}};
 const ctx={...win,window:win,document:doc,globalThis:win,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=String(v),removeItem:k=>{delete storage[k];}},navigator:{onLine:true},crypto:require('node:crypto').webcrypto,AbortController,setTimeout,clearTimeout,setInterval(){},requestAnimationFrame:f=>{rafs.push(f);return rafs.length;},console};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../community-galaxy.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../community-chat-cloud.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../community-chat.js'),'utf8'),ctx);
 const flush=()=>{for(let n=0;n<8&&rafs.length;n++)rafs.splice(0).forEach(f=>f());};flush();
 const f={win,nodes,el,db,host,flush,
  async settle(){for(let i=0;i<12;i++){await tick();flush();}},
  async scope(id){actor=id;win.LowiCommunity.refresh();await f.settle();store=load();win.LowiCommunity.refresh();await f.settle();},
  click(data){const b={dataset:data,closest:()=>null};for(const h of events.click||[])h({target:{closest:()=>b},preventDefault(){},stopPropagation(){}});flush();},
  menu(id){f.click({chat:'more',id});const m=store.find(x=>x.id===id);return win.LowiCommunity.messageHTML(m,store);}};
 return f;
}
const now=Date.now(),iso=t=>new Date(t).toISOString();
const base=[{id:'m1',user_id:'b',who:'Bea',body:'First real message',created_at:iso(now-3e5)},{id:'m2',user_id:'c',who:'Cy',body:'Second one',created_at:iso(now-2e5)}];

test('core: pin markers parse strictly, newest marker wins, unpin clears, markers never show as chat lines',()=>{
 const b=K.pinBody('m1','  Hello   world ');assert.equal(b,'\u{1F4CC}\u2060pin:m1 Hello world');
 assert.deepEqual({...K.pinOf(b)},{unpin:false,id:'m1',text:'Hello world'});
 assert.equal(K.pinOf('📌 pin:m1 typed by hand'),null,'a typed look-alike is just text');assert.equal(K.pinBody('bad id!','x'),'');
 const ms=[{id:'a',uid:'o',t:K.pinBody('m1','one'),ts:1},{id:'b',uid:'o',t:K.pinBody('m2','two'),ts:2}];
 assert.equal(K.pinned(ms).id,'m2','one pin per room: the newest replaces the old');
 assert.equal(K.pinned(ms.concat({id:'c',uid:'o',t:K.unpinBody(),ts:3})),null);assert.equal(K.pinned([]),null);
 assert.deepEqual(K.visible(ms.concat({id:'m1',uid:'b',t:'hi',ts:0}),[],[],'x').map(m=>m.id),['m1']);
});

test('nothing pinned: the bar stays hidden and the room starts right under back + members',async()=>{
 const f=fixture({owner:true,rows:base});await f.scope('o');f.click({chat:'history'});await f.settle();
 assert.equal(f.nodes.crPin.hidden,true);assert.equal(f.nodes.crPin.innerHTML,'');assert.equal(f.el.dataset.pinned,undefined);
 assert.match(css,/\[data-room\]:not\(\[data-pinned\]\)\{--cr-top:60px\}/,'no empty gap for a bar that is not there');
 assert.match(css,/\.cr-pin\[hidden\]\{display:none!important\}/);
});

test('admin pins from the message menu, a new pin replaces the old, the bar goes to the message, Unpin clears it for everyone',async()=>{
 const f=fixture({owner:true,rows:base});await f.scope('o');f.click({chat:'history'});await f.settle();
 const menu=f.menu('m1');assert.match(menu,/data-chat="pin-msg"[^>]*data-id="m1"[^>]*>Pin</);
 f.click({chat:'pin-msg',id:'m1'});await f.settle();
 const marks=()=>f.db.filter(r=>K.pinOf(r.body));
 assert.equal(marks().length,1);assert.equal(marks()[0].body,K.pinBody('m1','First real message'));assert.equal(marks()[0].user_id,'o');
 assert.equal(f.nodes.crPin.hidden,false);assert.equal(f.el.dataset.pinned,'1');
 assert.match(f.nodes.crPin.innerHTML,/data-chat="pin-go"[^>]*data-id="m1"[\s\S]*cr-pinl">Pinned Message<[\s\S]*cr-pint">First real message</);
 assert.match(f.nodes.crPin.innerHTML,/data-chat="unpin"[^>]*>Unpin</,'the admin gets Unpin on the bar');
 assert.match(f.menu('m1'),/data-chat="unpin"[^>]*>Unpin</,'the pinned message offers Unpin in its menu');
 assert.doesNotMatch(f.nodes.cmList?f.nodes.cmList.innerHTML:'',/pin:m1/,'the marker never shows as a chat line');
 f.click({chat:'pin-go',id:'m1'});assert.notEqual(f.nodes.cmList.scrollTop,0,'tapping the bar scrolls the list to the pinned message');
 f.click({chat:'pin-msg',id:'m2'});await f.settle();
 assert.equal(marks().length,1,'one pin per room: the old marker is removed');assert.match(f.nodes.crPin.innerHTML,/data-id="m2"[\s\S]*Second one/);
 f.click({chat:'unpin'});await f.settle();
 assert.deepEqual(marks().map(r=>r.body),[K.unpinBody()],'unpin is one newest marker, so every phone drops the bar live');
 assert.equal(f.nodes.crPin.hidden,true);assert.equal(f.el.dataset.pinned,undefined);
});

test('non-admins see the pin but never Pin or Unpin, and cannot pin by typing a marker',async()=>{
 const rows=base.concat({id:'p1',user_id:'o',who:'Admin',body:K.pinBody('m2','Second one'),created_at:iso(now-1e5)});
 const f=fixture({owner:false,rows});await f.scope('u');f.click({chat:'history'});await f.settle();
 assert.equal(f.nodes.crPin.hidden,false);assert.match(f.nodes.crPin.innerHTML,/Second one/);assert.doesNotMatch(f.nodes.crPin.innerHTML,/data-chat="unpin"/);
 assert.doesNotMatch(f.menu('m1'),/pin-msg|data-chat="unpin"/);
 f.click({chat:'pin-msg',id:'m1'});f.click({chat:'unpin'});await f.settle();
 assert.deepEqual(f.db.filter(r=>K.pinOf(r.body)).map(r=>r.id),['p1'],'nothing changes without the admin');
 const mem={},sent=[],ses=K.session({scope:'u',storage:{getItem:k=>mem[k]||null,setItem:(k,v)=>mem[k]=v},id:()=>'mx',send:async m=>{sent.push(m);return m;},changed(){}});
 ses.setDraft(K.pinBody('m1','forged'));await assert.rejects(ses.submit('U'),/reserved/);assert.equal(sent.length,0,'typed text never becomes a pin marker');
});

test('markup and strings: the centre pill and the fake welcome pin are gone; Pin/Unpin in English, German and Spanish',()=>{
 assert.doesNotMatch(js,/class="cr-id"|class="cr-ic"|Welcome to the galaxy|pinOpen/);
 for(const k of ['pinMsg','unpinMsg','pinGo','pinFailed','pinGone'])assert.match(js,new RegExp('[ ,]'+k+":\\['[^']+','[^']+','[^']+'\\]"),k);
 assert.match(js,/pinMsg:\['Pin','Anheften','Fijar'\],unpinMsg:\['Unpin','Loslösen','Desfijar'\]/);
});
