'use strict';
/* 24 Oct 2026, Emmanuel: "I opened the chat room, and now it says 'Emmanuel ist beigetreten 👋', as if I just entered the
   chat new. Remove that completely ... nuke that feature completely." The room drew a "X joined" line with a Wave button
   from live presence (who is connected right now). It was never stored; it fired when the room's presence list was still
   empty at the moment the chat opened (join() clears it and refreshes before the first sync), so everyone already there
   counted as new a moment later. The feature is gone in every language: no strings, no code, no styles, and opening a chat
   or presence changing never adds a line or sends anything. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const js=read('community-chat.js'),tg=read('community-tg.css');
const ui=read('tests/community-chat-ui.test.cjs');
const fixture=new Function('require','assert','fs','vm','path','__dirname','K',ui.slice(ui.indexOf('function fixture(){'),ui.indexOf('\ntest('))+'\nreturn fixture;')(require,assert,fs,vm,path,path.join(__dirname),require('../community-chat-core.js'));
const JOIN=/joined|beigetreten|se uni(ó|eron)|Winken|Saludar|data-chat="wave"|cr-sys|cr-wave/i;

test('no join line strings, code or styles are left in the chat',()=>{
 assert.doesNotMatch(js,/roomJoined|roomJoinedMany|roomWave/,'no join / wave strings');
 assert.doesNotMatch(js,/beigetreten|se unió|se unieron|\{n\} joined/,'no join wording in any language');
 assert.doesNotMatch(js,/joinTrack|joinPills|joinSeen|a==='wave'/,'no presence watcher, pill renderer or Wave handler');
 assert.doesNotMatch(tg,/\.cr-sys|\.cr-syst|\.cr-wave/,'no styles for the old system pill');
});

function roomFixture(lang){
 const f=fixture();if(lang)f.storage['lowispike.lang']=lang;
 const msgs=[{id:'m1',uid:'b',by:'Same name',t:'Hi all',ts:Date.now()-60e3,rx:{}}];
 let sent=0;f.host.messages=()=>msgs.slice();const up=f.host.upsert;f.host.upsert=m=>{sent++;return up(m);};
 let members=[];f.win.LowiRooms={active:()=>true,room:()=>'room-3',members:()=>members.slice(),status:()=>'in',cap:()=>30,num:()=>3,knocks:()=>[],has:u=>members.includes(u)};
 const t=f.doc.getElementById('cgThread');t.removeAttribute=function(k){delete this.attrs[k];};
 f.scope('a');
 return {f,setMembers(m){members=m;f.win.LowiCommunity.refresh();f.flush();},sent:()=>sent,html:()=>String(f.nodes.cmList.innerHTML||'')};
}
for(const lang of ['en','de','es'])test('opening a room while its presence list is still empty, then people show up, adds no join line ('+lang+')',()=>{
 const r=roomFixture(lang);
 r.f.win.LowiCommunity.thread(true);r.f.flush();
 assert.doesNotMatch(r.html(),JOIN);
 r.setMembers(['a','b','c']);r.setMembers(['a','b','c','d']);
 assert.doesNotMatch(r.html(),JOIN,'presence changes never draw a joined line');
 assert.match(r.html(),/Hi all/,'the real messages still show');
 assert.equal(r.sent(),0,'opening a chat never sends anything');
 r.f.win.LowiCommunity.thread(false);r.f.flush();r.f.win.LowiCommunity.thread(true);r.f.flush();
 assert.doesNotMatch(r.html(),JOIN);assert.equal(r.sent(),0,'re-opening the room adds nothing either');
});
