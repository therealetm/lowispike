/* LOWiSPIKE Community room, realtime part. ONE room for everyone (Oct 24 2026, Emmanuel: "we just have one chat ... Nuke
   everything that has to do with being able to open multiple rooms"). Pure rules: community-rooms-core.js.
   One realtime channel, 'lowi-room-all': presence (who is here), the energy-ball broadcast (the chat game) and chat INSERTs for
   room 'all'. No room list, no directory channel, no knock / let-in, no moving people between rooms. Nothing personal goes into
   presence: account id (already public in chat) and join time.
   index.html calls LowiRooms.start(hooks) once the cloud is live; hooks = {client, uid, name, onInsert, onEnergy, onSwitch, onStatus}. */
(function(W){
'use strict';
const C=W.LowiRoomsCore,D=W.document;if(!C||!D)return;
let hooks=null,sb=null,me='',at=0,chan=null,status='idle',members=[],epoch=0;
const cap=()=>C.DRAW;
function emit(type,extra){try{D.dispatchEvent(new CustomEvent('lowi:room',{detail:Object.assign({type,room:C.ROOM,n:1,count:members.length},extra||{})}));}catch(e){}}
function subscribe(ch,onAgain){return new Promise(res=>{let done=false;const t=setTimeout(()=>{if(!done){done=true;res(false);}},9000);
 ch.subscribe(s=>{if(s==='SUBSCRIBED'){if(!done){done=true;clearTimeout(t);res(true);}else if(onAgain)onAgain();}else if(!done&&(s==='CHANNEL_ERROR'||s==='TIMED_OUT'||s==='CLOSED')){done=true;clearTimeout(t);res(false);}if(hooks&&hooks.onStatus&&ch===chan)hooks.onStatus(s);});});}
function drop(ch){if(!ch)return;try{ch.untrack&&ch.untrack();}catch(e){}try{sb.removeChannel(ch);}catch(e){}}
async function join(){const my=++epoch;const old=chan;chan=null;members=[];if(old)drop(old);
 at=Date.now();status='joining';emit('joining');
 const ch=sb.channel(C.channelName(),{config:{presence:{key:me},broadcast:{self:false}}});
 ch.on('presence',{event:'sync'},()=>{if(ch===chan)onSync();})
  .on('broadcast',{event:'energy'},m=>{if(ch===chan&&hooks.onEnergy)hooks.onEnergy(m&&m.payload);})
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'room=eq.'+C.ROOM},p=>{if(ch===chan&&hooks.onInsert)hooks.onInsert(p&&p.new);});
 chan=ch;try{hooks.onSwitch&&hooks.onSwitch(C.ROOM);}catch(e){}
 const ok=await subscribe(ch,()=>{if(ch===chan)track();});if(my!==epoch)return false;
 if(!ok){status='offline';emit('offline');return false;}
 await track();status='in';emit('joined');return true;}
async function track(){if(!chan)return;try{await chan.track({at});}catch(e){}}
function onSync(){if(!chan)return;members=C.flatten(chan.presenceState());emit('members');}
function sendEnergy(p){if(!chan||status!=='in'||!p)return false;try{Promise.resolve(chan.send({type:'broadcast',event:'energy',payload:p})).catch(()=>{});return true;}catch(e){return false;}}
async function start(h){if(!h||!h.client||!h.uid)return false;const id=h.uid();if(!id)return false;if(me===id&&chan)return true;stop();hooks=h;me=id;sb=await h.client();return join();}
function stop(){epoch++;if(chan)drop(chan);chan=null;members=[];status='idle';emit('left');}
W.LowiRooms={start,stop,sendEnergy,
 room:()=>C.ROOM,num:()=>1,active:()=>status==='in'&&!!chan,status:()=>status,cap,
 members:()=>members.map(m=>m.k),has:uid=>members.some(m=>m.k===uid),
 _debug:()=>({room:C.ROOM,status,members:members.length})};
})(typeof window==='object'?window:globalThis);
