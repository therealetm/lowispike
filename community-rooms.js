/* LOWiSPIKE support rooms, realtime part (20 Oct 2026). Pure rules live in community-rooms-core.js.
   One realtime channel per room, 'lowi-room-<id>': presence (who is here), the energy-ball broadcast (the chat game), knock /
   let-in, and chat INSERTs filtered to this room. A tiny directory channel 'lowi-rooms' holds one entry per open room, published
   by that room's lead (its earliest member), so a newcomer reads every room's head count with one subscription and leaves it
   again. Nothing personal goes into presence: account id (already public in chat), join time, who let you in.
   index.html calls LowiRooms.start(hooks) once the cloud is live; hooks = {client, uid, name, onInsert, onEnergy, onSwitch, onStatus}. */
(function(W){
'use strict';
const C=W.LowiRoomsCore,D=W.document;if(!C||!D)return;
const SS='lowi.room.v1',DIR='lowi-rooms';
let hooks=null,sb=null,me='',room='',at=0,guestOf='',chan=null,dirChan=null,status='idle',members=[],dir=new Map(),dirAt=0,knocks=[],leading=false,epoch=0,moving=false,pubT=0,leaveCheckT=0,guestsHere=0;
const cap=()=>{const v=+(W.LOWI_ROOM_CAP||0);return v>=2&&v<=200?v:C.CAP;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function emit(type,extra){try{D.dispatchEvent(new CustomEvent('lowi:room',{detail:Object.assign({type,room,n:C.roomNum(room),count:members.length},extra||{})}));}catch(e){}}
function subscribe(ch,onAgain){return new Promise(res=>{let done=false;const t=setTimeout(()=>{if(!done){done=true;res(false);}},9000);
 ch.subscribe(s=>{if(s==='SUBSCRIBED'){if(!done){done=true;clearTimeout(t);res(true);}else if(onAgain)onAgain();}else if(!done&&(s==='CHANNEL_ERROR'||s==='TIMED_OUT'||s==='CLOSED')){done=true;clearTimeout(t);res(false);}if(hooks&&hooks.onStatus&&ch===chan)hooks.onStatus(s);});});}
function drop(ch){if(!ch)return;try{ch.untrack&&ch.untrack();}catch(e){}try{sb.removeChannel(ch);}catch(e){}}
/* Read the directory: subscribe without tracking, take the first presence list that has entries (an empty list can come first),
   or give up after 1.6 s (no room open anywhere). Readers leave at once so the directory never carries everyone. */
async function readDirectory(){if(!sb)return new Map();if(leading&&dirChan){dir=C.directory(entries(dirChan));dirAt=Date.now();return dir;}
 const ch=sb.channel(DIR,{config:{presence:{key:'r-'+me}}});let got=null;
 ch.on('presence',{event:'sync'},()=>{const e=entries(ch);if(e.length)got=e;});
 const ok=await subscribe(ch);if(ok){for(let i=0;i<16&&!got;i++)await wait(100);}
 drop(ch);dir=C.directory(got||[]);dirAt=Date.now();return dir;}
function entries(ch){const st=ch.presenceState?ch.presenceState():{},out=[];for(const k in st)for(const p of st[k]||[])if(p&&p.n)out.push(p);return out;}
async function join(n,opts){opts=opts||{};const my=++epoch;moving=true;const old=chan;chan=null;members=[];if(old)drop(old);
 room=C.roomId(n);at=Date.now();guestOf=opts.guestOf||'';status='joining';emit('joining');
 const ch=sb.channel(C.channelName(room),{config:{presence:{key:me},broadcast:{self:false}}});
 ch.on('presence',{event:'sync'},()=>{if(ch===chan)onSync();})
  .on('broadcast',{event:'energy'},m=>{if(ch===chan&&hooks.onEnergy)hooks.onEnergy(m&&m.payload);})
  .on('broadcast',{event:'knock'},m=>{if(ch===chan)onKnock(m&&m.payload);})
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'room=eq.'+room},p=>{if(ch===chan&&hooks.onInsert)hooks.onInsert(p&&p.new);});
 chan=ch;try{hooks.onSwitch&&hooks.onSwitch(room);}catch(e){}
 const ok=await subscribe(ch,()=>{if(ch===chan)track();});if(my!==epoch)return false;
 if(!ok){status='offline';moving=false;emit('offline');return false;}
 await track();status='in';moving=false;try{sessionStorage.setItem(SS,JSON.stringify({room,uid:me,t:Date.now()}));}catch(e){}
 emit('joined');clearTimeout(leaveCheckT);leaveCheckT=setTimeout(onSync,2500);return true;}
async function track(){if(!chan)return;try{await chan.track({at,g:guestOf||undefined});}catch(e){}}
function onSync(){if(!chan)return;members=C.flatten(chan.presenceState());guestsHere=members.filter(m=>m.guestOf).length;
 if(status==='in'&&!moving&&C.mustLeave(members,me,cap())){moving=true;const was=C.roomNum(room),excess=members.length-cap();setTimeout(()=>reassign(was,excess),150+Math.random()*700);return;}
 const lead=C.lead(members)===me;if(lead)publishSoon();else if(leading)unlead();emit('members');}
/* The lead keeps its room's entry in the directory current (debounced; one update per second at most). */
function publishSoon(){clearTimeout(pubT);pubT=setTimeout(publish,600);}
async function publish(){if(!chan||status!=='in')return;const entry={n:C.roomNum(room),c:members.length,g:guestsHere,u:members.map(m=>m.k).slice(0,cap()+C.GUESTS),t:Date.now()};
 if(!dirChan){const ch=sb.channel(DIR,{config:{presence:{key:'l-'+me}}});dirChan=ch;leading=true;const ok=await subscribe(ch,()=>{if(ch===dirChan&&leading)publish();});if(!ok||ch!==dirChan)return;}
 try{await dirChan.track(entry);}catch(e){}}
function unlead(){leading=false;const ch=dirChan;dirChan=null;drop(ch);}
let tried=new Map();
async function reassign(fromN,excess){const now=Date.now();tried.set(fromN,now);for(const [n,t] of tried)if(now-t>60e3)tried.delete(n);
 const d=await readDirectory();return join(C.chooseAfterMove(d,cap(),[...tried.keys()],excess));}
async function assign(){let saved=null;try{saved=JSON.parse(sessionStorage.getItem(SS)||'null');}catch(e){}
 if(saved&&saved.uid===me&&C.validRoom(saved.room)&&Date.now()-(+saved.t||0)<20*60e3)return join(C.roomNum(saved.room));
 const d=await readDirectory();return join(C.choose(d,cap()));}
/* Knock / let in: the knock goes to the person's room channel; their phone shows "<name> would like to join your room". */
function onKnock(p){if(!p||p.to!==me||typeof p.from!=='string'||p.from===me)return;if(p.type==='knock'){knocks=knocks.filter(k=>k.from!==p.from).concat([{from:p.from,name:String(p.name||'').slice(0,40),t:Date.now()}]).slice(-5);emit('knock',{from:p.from,name:String(p.name||'').slice(0,40)});}}
async function letIn(uid){const k=knocks.find(x=>x.from===uid);knocks=knocks.filter(x=>x.from!==uid);if(!chan||!k)return false;
 try{await chan.send({type:'broadcast',event:'knock',payload:{type:'letin',to:uid,from:me,n:C.roomNum(room)}});}catch(e){return false;}emit('knocks');return true;}
function dismiss(uid){knocks=knocks.filter(x=>x.from!==uid);emit('knocks');}
async function joinPerson(uid){if(!sb||!uid||uid===me)return {ok:false,why:'nobody'};const d=await readDirectory(),r=C.findPerson(d,uid);
 if(r&&r.n===C.roomNum(room))return {ok:true,why:'here'};const mode=C.joinMode(r,cap(),r&&r.g);
 if(mode==='join'){await join(r.n);return {ok:true,why:'joined',n:r.n};}
 if(mode!=='knock')return {ok:false,why:mode};
 const target=C.roomId(r.n),ch=sb.channel(C.channelName(target)+'',{config:{broadcast:{self:false}}});let answer=null;
 ch.on('broadcast',{event:'knock'},m=>{const p=m&&m.payload;if(p&&p.type==='letin'&&p.to===me&&p.from===uid)answer=p;});
 const ok=await subscribe(ch);if(!ok){drop(ch);return {ok:false,why:'offline'};}
 const name=(hooks.name&&hooks.name())||'';try{await ch.send({type:'broadcast',event:'knock',payload:{type:'knock',to:uid,from:me,name}});}catch(e){}
 emit('knocking',{to:uid});for(let i=0;i<600&&!answer;i++)await wait(100);drop(ch);
 if(!answer){emit('knock-timeout',{to:uid});return {ok:false,why:'no-answer'};}await join(r.n,{guestOf:uid});return {ok:true,why:'let-in',n:r.n};}
async function joinRoom(n){n=Math.floor(+n||0);if(!sb||n<1)return {ok:false};if(n===C.roomNum(room))return {ok:true,why:'here'};const d=await readDirectory(),r=d.get(n);
 if(r&&r.c>=cap())return {ok:false,why:'full'};await join(n);return {ok:true,why:'joined',n};}
function sendEnergy(p){if(!chan||status!=='in'||!p)return false;try{Promise.resolve(chan.send({type:'broadcast',event:'energy',payload:p})).catch(()=>{});return true;}catch(e){return false;}}
async function start(h){if(!h||!h.client||!h.uid)return false;const id=h.uid();if(!id)return false;if(me===id&&chan)return true;stop();hooks=h;me=id;sb=await h.client();return assign();}
function stop(){epoch++;tried=new Map();clearTimeout(pubT);clearTimeout(leaveCheckT);if(chan)drop(chan);chan=null;unlead();members=[];room='';status='idle';knocks=[];moving=false;emit('left');}
function rooms(){return [...dir.values()].sort((a,b)=>a.n-b.n);}
W.LowiRooms={start,stop,joinPerson,joinRoom,letIn,dismiss,sendEnergy,readDirectory,rooms,
 room:()=>room||'all',num:()=>C.roomNum(room||'all'),active:()=>status==='in'&&!!chan,status:()=>status,cap,
 members:()=>members.map(m=>m.k),has:uid=>members.some(m=>m.k===uid),knocks:()=>knocks.slice(),
 _debug:()=>({room,status,members:members.length,leading,dir:rooms()})};
})(typeof window==='object'?window:globalThis);
