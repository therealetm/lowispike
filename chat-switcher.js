/* LOWiSPIKE room switcher (chat redesign, 24 Oct 2026; handoff "Make Circle chats use the same clean chat presentation as
   the main chat, with a convenient room switcher").
   One slim glass strip of round chips: Community chat first, then every Circle you are in (newest message first, a mint dot
   when someone wrote since you last looked), then "Circles" to browse or create one. The same strip sits at the top of the
   community chat (only once you are in at least one Circle, so nobody gets an empty bar) and under the header of every
   Circle chat, so switching is one tap from either side.
   Reads only: your own circles (owner or member) and their newest messages; it writes nothing. Unread = a message from
   someone else newer than the last time you had that circle open (localStorage lowi.chatSeen, this device only).
   Look: chat-switcher.css. Rules: tests/chat-switcher.test.cjs. Circle chat: user-rooms.js. */
(function(W,D){
'use strict';
const T={community:['Community','Community','Comunidad'],circles:['Circles','Circles','Círculos'],label:['Switch chat','Chat wechseln','Cambiar chat'],
 new:['new message','neue Nachricht','mensaje nuevo']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k){return (T[k]||[k])[lang()]||T[k][0];}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SEEN='lowi.chatSeen';
function seenMap(){try{const o=JSON.parse(localStorage.getItem(SEEN)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
/* remember the newest message time you saw in a chat (only ever moves forward) */
function markSeen(key,ts){if(!key)return;const t=Date.parse(ts||'')||Date.now(),m=seenMap();if((m[key]||0)>=t)return;m[key]=t;
 try{const ks=Object.keys(m);if(ks.length>80)ks.sort((a,b)=>m[a]-m[b]).slice(0,ks.length-80).forEach(k=>{delete m[k];});localStorage.setItem(SEEN,JSON.stringify(m));}catch(e){}}
/* pure: which circles have something new for me */
function unread(c,seen,me){const l=c&&c.last;if(!l||!l.ts||l.user_id===me)return false;return (Date.parse(l.ts)||0)>((seen&&seen[c.id])||0);}
/* pure: my circles (owner or member, never a pending ask), newest activity first, then newest made */
function mine(rooms,members,lasts,me){if(!me)return [];const inn=new Set((members||[]).filter(m=>m&&m.user_id===me&&m.status==='member').map(m=>m.room_id));
 const L=(rooms||[]).filter(r=>r&&(r.owner_id===me||inn.has(r.id))).map(r=>({id:r.id,name:r.name||'',icon:r.icon||'',created_at:r.created_at||'',last:(lasts&&lasts[r.id])||null}));
 const t=c=>Date.parse((c.last&&c.last.ts)||c.created_at||'')||0;return L.sort((a,b)=>t(b)-t(a));}
/* pure: the strip. current = 'community' or a circle id; extra = a circle you are only reading along in (shown while open) */
function strip(list,current,opts){opts=opts||{};const seen=opts.seen||{},me=opts.me||'',L=(list||[]).slice();
 if(opts.extra&&!L.some(c=>c.id===opts.extra.id))L.unshift(opts.extra);
 const chip=(key,ic,name,on,dot,cls)=>'<button type="button" class="cs-chip'+(cls?' '+cls:'')+'" data-cs="'+esc(key)+'"'+(on?' aria-current="page"':'')+' title="'+esc(name)+'"'
  +(dot?' aria-label="'+esc(name+', '+tr('new'))+'"':'')+'><i aria-hidden="true">'+esc(ic)+'</i><b>'+esc(name)+'</b>'+(dot?'<s class="cs-dot" aria-hidden="true"></s>':'')+'</button>';
 let h='<nav class="cs-strip" aria-label="'+esc(tr('label'))+'" data-noi18n><div class="cs-row">'+chip('community','\u{1F4AC}',tr('community'),current==='community',false,'cs-home');
 for(const c of L)h+=chip(c.id,c.icon||'\u25CE',c.name,current===c.id,current!==c.id&&unread(c,seen,me));
 return h+chip('all','\u2726',tr('circles'),current==='all',false,'cs-all')+'</div></nav>';}
const api={T,markSeen,seenMap,unread,mine,strip};
if(typeof module!=='undefined'&&module.exports){module.exports=api;}
if(!W||!D||!D.createElement)return;
/* ---------- browser: data + community-chat mount ---------- */
const X=()=>W.LOWI_CLOUD_X||null;
function me(){try{const x=X();return (x&&x.state().uid)||'';}catch(e){return '';}}
async function q(p){const r=await Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),12000))]);if(r&&r.error)throw r.error;return r?r.data:null;}
let list=[],loadedAt=0,loading=null;
async function refresh(){const id=me();if(!id){list=[];return list;}if(loading)return loading;
 loading=(async()=>{try{const x=X();if(!x||!x.client)return list;const c=await x.client();
  const [own,mem]=await Promise.all([q(c.from('user_rooms').select('id,owner_id,name,icon,created_at').eq('owner_id',id).limit(50)),q(c.from('user_room_members').select('room_id,user_id,status').eq('user_id',id).limit(200))]);
  const ids=[...new Set((mem||[]).filter(m=>m.status==='member').map(m=>m.room_id))].filter(r=>!(own||[]).some(o=>o.id===r));
  const more=ids.length?(await q(c.from('user_rooms').select('id,owner_id,name,icon,created_at').in('id',ids.slice(0,60))))||[]:[];
  const rooms=(own||[]).concat(more),lasts={};
  if(rooms.length){const ms=(await q(c.from('messages').select('id,user_id,body,created_at,room').in('room',rooms.map(r=>'u:'+r.id)).order('created_at',{ascending:false}).limit(150)))||[];
   for(const m of ms){const rid=String(m.room||'').slice(2);if(!lasts[rid])lasts[rid]={ts:m.created_at,user_id:m.user_id};}}
  list=mine(rooms,mem,lasts,id);loadedAt=Date.now();}catch(e){}return list;})();
 try{return await loading;}finally{loading=null;}}
function html(current,extra){return strip(list,current,{seen:seenMap(),me:me(),extra});}
/* the community chat: the strip floats over the top of the thread, but only once you are in a Circle */
function mountCommunity(){const th=D.getElementById('cgThread');if(!th)return;let s=th.querySelector(':scope > .cs-strip');
 if(!list.length){if(s)s.remove();th.removeAttribute('data-cs');return;}
 const h=html('community');if(s&&s.__h===h)return;const x=s?s.querySelector('.cs-row').scrollLeft:0;
 const tmp=D.createElement('div');tmp.innerHTML=h;const n=tmp.firstChild;n.__h=h;if(s)s.replaceWith(n);else th.insertBefore(n,th.firstChild);n.querySelector('.cs-row').scrollLeft=x;th.setAttribute('data-cs','');}
function chatVisible(){const th=D.getElementById('cgThread');return !!(th&&th.offsetParent&&!D.hidden);}
function tick(force){if(!chatVisible()&&!force)return;if(force||Date.now()-loadedAt>20000)refresh().then(mountCommunity);else mountCommunity();}
function toCommunity(){const R=W.LowiUserRooms;if(R&&R.isOpen())R.close();
 try{if(!chatVisible()){if(typeof W.goTab==='function')W.goTab('foryou');const t=D.querySelector('.rm-tab[data-rm="chat"]');if(t)t.click();if(W.LowiCommunity&&W.LowiCommunity.thread)W.LowiCommunity.thread(true);}}catch(e){}
 setTimeout(()=>tick(true),300);}
function go(key){const R=W.LowiUserRooms;if(key==='community')return toCommunity();if(!R)return;if(key==='all')return R.open();R.open(key);}
D.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cs]');if(!b)return;e.preventDefault();e.stopPropagation();
 if(b.getAttribute('aria-current')==='page'&&b.dataset.cs!=='all')return;go(b.dataset.cs);},true);
setInterval(()=>tick(false),2500);D.addEventListener('visibilitychange',()=>{if(!D.hidden)tick(false);});
W.LowiChatSwitch=Object.assign({},api,{refresh,html,go,list:()=>list.slice(),mountCommunity,tick});
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
