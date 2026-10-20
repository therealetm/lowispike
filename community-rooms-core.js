/* LOWiSPIKE support rooms, pure rules (20 Oct 2026, Emmanuel: "if we have 1,000 people in there it doesn't work ... make it
   like Discord where people get rooms assigned randomly, support system rooms ... and you can ask to enter someone else's room").
   Everyone is placed in a small room with a cap. Each room has its own chat and its own chat game (energy balls). Room 1 keeps
   the old id 'all', so older installed apps and the crowd keep talking there; further rooms are r2, r3, ...
   A new room opens only when every open room is full; a room nobody is in is simply closed (no channel, nothing to clean).
   No network, no DOM here: community-rooms.js does the realtime part. */
(function(root){
'use strict';
/* CAP: people per room. Set from the load test (tools/sim/rooms-load.cjs, playtest/ROOMS-LOAD-20261020.md), not a guess:
   at 30, each phone gets ~3.3 live items/s at 100 and at 1000 people online (one shared room: 11.6 and 116.5/s), and the galaxy
   draws at most ~30 bodies. */
const CAP=30,GUESTS=4,MAX_ROOMS=999;
function roomId(n){n=Math.floor(+n||1);return n<=1?'all':'r'+Math.min(MAX_ROOMS,n);}
function roomNum(id){if(id==='all'||id==null||id==='')return 1;const m=/^r(\d{1,3})$/.exec(String(id));return m?Math.max(1,+m[1]):0;}
function validRoom(id){return roomNum(id)>0;}
function channelName(id){return 'lowi-room-'+(validRoom(id)?id:'all');}
/* Directory entries (one per room, published by that room's lead): {n, c, u:[uids], t}. Several leads for a moment = keep the
   newest per room. Returns Map n -> {n, c, u}. */
function directory(entries){const out=new Map();for(const e of entries||[]){if(!e)continue;const n=Math.floor(+e.n||0);if(n<1||n>MAX_ROOMS)continue;const c=Math.max(0,Math.floor(+e.c||0)),u=Array.isArray(e.u)?e.u.filter(x=>typeof x==='string').slice(0,CAP+GUESTS):[],t=+e.t||0;
 const cur=out.get(n);if(!cur||t>cur.t||(t===cur.t&&c>cur.c))out.set(n,{n,c,u,t});}return out;}
/* Where a newcomer goes: a random open room that has space (more than one seat left, so friends arriving together fit);
   when every open room is full, the lowest room number that is not open (a new room). rnd = () => [0,1). */
function choose(dir,cap,rnd){cap=cap||CAP;rnd=rnd||Math.random;const open=[...(dir instanceof Map?dir.values():directory(dir).values())].filter(r=>r.c>0);
 const roomy=open.filter(r=>r.c<cap);if(roomy.length)return roomy[Math.floor(rnd()*roomy.length)%roomy.length].n;
 const used=new Set(open.map(r=>r.n));for(let n=1;n<=MAX_ROOMS;n++)if(!used.has(n))return n;return MAX_ROOMS;}
/* After being moved on: rooms that just turned me away count as full for a while, and when no open room has space the movers
   spread over as many new rooms as they need (excess = how many were over the cap), so a burst of arrivals settles in a few
   rounds instead of everyone piling into the same next room. */
function chooseAfterMove(dir,cap,tried,excess,rnd){cap=cap||CAP;rnd=rnd||Math.random;const m=new Map(dir instanceof Map?dir:directory(dir));for(const n of tried||[])m.set(n,{n,c:Math.max(cap,(m.get(n)||{}).c||0),u:[],t:0});
 const open=[...m.values()].filter(r=>r.c>0),roomy=open.filter(r=>r.c<cap);if(roomy.length)return roomy[Math.floor(rnd()*roomy.length)%roomy.length].n;
 const used=new Set(open.map(r=>r.n)),fresh=[],k=Math.max(1,Math.ceil((+excess||1)/cap));for(let n=1;n<=MAX_ROOMS&&fresh.length<k;n++)if(!used.has(n))fresh.push(n);
 return fresh.length?fresh[Math.floor(rnd()*fresh.length)%fresh.length]:MAX_ROOMS;}
/* Who must move on when a room went over its cap because several people joined at the same moment. Everybody's phone sees
   the same presence list and sorts it the same way (join time, then id), so they all agree. The first `cap` regular members
   stay; up to GUESTS people let in by someone who is still present stay too. members = [{k, at, guestOf}]. */
function seated(members,cap){cap=cap||CAP;const list=(members||[]).filter(m=>m&&m.k).slice().sort((a,b)=>(+a.at||0)-(+b.at||0)||(a.k<b.k?-1:a.k>b.k?1:0));
 const seen=new Set(),uniq=list.filter(m=>seen.has(m.k)?false:(seen.add(m.k),true)),keys=new Set(uniq.map(m=>m.k));
 const stay=new Set();let regular=0,guests=0;
 for(const m of uniq){if(m.guestOf&&keys.has(m.guestOf)&&m.guestOf!==m.k){if(guests<GUESTS){guests++;stay.add(m.k);}continue;}if(regular<cap){regular++;stay.add(m.k);}}
 return stay;}
function mustLeave(members,me,cap){const s=seated(members,cap);return !!me&&(members||[]).some(m=>m&&m.k===me)&&!s.has(me);}
/* The lead publishes the room in the directory: the earliest present member (same order as seated()). */
function lead(members){const list=(members||[]).filter(m=>m&&m.k).slice().sort((a,b)=>(+a.at||0)-(+b.at||0)||(a.k<b.k?-1:a.k>b.k?1:0));return list.length?list[0].k:'';}
/* Joining a person: direct when their room has space, else knock (they can let you in as a guest). */
function findPerson(dir,uid){if(!uid)return null;for(const r of (dir instanceof Map?dir.values():directory(dir).values()))if(r.u.indexOf(uid)>=0)return r;return null;}
function joinMode(room,cap,guestCount){cap=cap||CAP;if(!room)return 'gone';if(room.c<cap)return 'join';return (guestCount||0)<GUESTS?'knock':'full';}
/* Presence payloads carry nothing personal: the account id (already public in chat), join time, and who let you in. */
function flatten(state){const out=[];for(const k in state||{}){const arr=state[k]||[];const p=arr[arr.length-1]||{};out.push({k,at:+p.at||0,guestOf:typeof p.g==='string'?p.g:''});}return out;}
const api={CAP,GUESTS,MAX_ROOMS,roomId,roomNum,validRoom,channelName,directory,choose,chooseAfterMove,seated,mustLeave,lead,findPerson,joinMode,flatten};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiRoomsCore=api;
})(typeof window==='object'?window:globalThis);
