/* LOWiSPIKE Rooms, pure rules (OWNER-REQUESTS 6, Emmanuel 23 Oct 2026): "Anyone creates a room (Discord style, e.g. same illness
   or goal). Public: anyone can see and read. Join by request, only the creator approves, max 30 members (server enforced)."
   The server rules live in supabase/proposals/user_rooms_20261023.sql (applied 23 Oct): tables user_rooms + user_room_members,
   triggers for the 30 cap, pending asks, creator-only approval and members-only posting in messages room 'u:<id>'.
   These rules only shape what the app shows; the server is the one that says no. No network, no DOM here (user-rooms.js). */
(function(root){
'use strict';
const CAP=30,MAX_OWN=5,NAME_MIN=2,NAME_MAX=40,TOPIC_MAX=140,BODY_MAX=600;
const ICONS=['\u{1FAE7}','\u{1F4AA}','\u{1F957}','\u{1F9D8}','\u2764\uFE0F','\u{1FA7A}','\u{1F319}','\u{1F525}','\u{1F4A7}','\u{1F6B6}','\u{1F33F}','\u{1F9E0}'];
const squash=s=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
/* a room name: 2-40 characters after trimming, else '' (the Create button stays off) */
function cleanName(s){const t=squash(s);return t.length>=NAME_MIN&&t.length<=NAME_MAX?t:'';}
function cleanTopic(s){return squash(s).slice(0,TOPIC_MAX);}
function cleanBody(s){const t=String(s==null?'':s).replace(/\r/g,'').trim();return t.length&&t.length<=BODY_MAX?t:'';}
function icon(s){return ICONS.indexOf(s)>=0?s:ICONS[0];}
/* the messages table room id of a user room; never collides with the galaxy rooms ('all', 'r2'...) */
function chan(id){return 'u:'+String(id||'');}
function isChan(s){return /^u:[0-9a-f-]{36}$/i.test(String(s||''));}
/* your place in a room: owner, member, pending (asked), none */
function status(room,members,me){if(!room||!me)return 'none';if(room.owner_id===me)return 'owner';
 const m=(members||[]).find(x=>x&&x.room_id===room.id&&x.user_id===me);return m?(m.status==='member'?'member':'pending'):'none';}
const canWrite=st=>st==='owner'||st==='member';
/* rooms as the app lists them: yours and the ones you are in first, then the fullest, then the newest */
function list(rooms,members,me){const rank={owner:0,member:1,pending:2,none:3};
 return (rooms||[]).filter(r=>r&&r.id&&r.name).map(r=>{const ms=(members||[]).filter(x=>x&&x.room_id===r.id);const count=ms.filter(x=>x.status==='member').length,st=status(r,ms,me);
  return {id:r.id,name:String(r.name),topic:String(r.topic||''),icon:icon(r.icon),owner:r.owner_id,ownerName:String(r.owner_name||''),ts:Date.parse(r.created_at)||0,
   count,pending:ms.filter(x=>x.status==='pending').length,status:st,full:count>=CAP,canWrite:canWrite(st)};})
  .sort((a,b)=>rank[a.status]-rank[b.status]||b.count-a.count||b.ts-a.ts);}
/* inside one room: members (creator first), and the asks only the creator sees */
function inside(room,members,me){const ms=(members||[]).filter(x=>x&&room&&x.room_id===room.id);
 const people=ms.filter(x=>x.status==='member').sort((a,b)=>(a.user_id===room.owner_id?-1:0)-(b.user_id===room.owner_id?-1:0)||(Date.parse(a.created_at)||0)-(Date.parse(b.created_at)||0));
 const asks=room&&room.owner_id===me?ms.filter(x=>x.status==='pending'):[];return {people,asks,full:people.length>=CAP,count:people.length};}
/* what the main button in a room does */
function action(st,full){return st==='owner'||st==='member'?'write':st==='pending'?'asked':full?'full':'ask';}
function ownCount(rooms,me){return (rooms||[]).filter(r=>r&&r.owner_id===me).length;}
function canCreate(rooms,me){return !!me&&ownCount(rooms,me)<MAX_OWN;}
/* server answers -> a short reason the app can say */
function why(err){const m=String((err&&(err.message||err.msg))||err||'').toLowerCase();
 if(/room full|at most 30/.test(m))return 'full';if(/room limit|at most 5/.test(m))return 'limit';if(/only members/.test(m))return 'members';
 if(/does not exist|relation|schema cache|42p01|pgrst205/.test(m))return 'soon';if(/fetch|network|offline|timeout|abort/.test(m))return 'offline';return 'error';}
function initials(n){const p=squash(n).split(' ').filter(Boolean);return ((p[0]||'?')[0]+(p.length>1?p[p.length-1][0]:'')).toUpperCase();}
const api={CAP,MAX_OWN,NAME_MIN,NAME_MAX,TOPIC_MAX,BODY_MAX,ICONS,cleanName,cleanTopic,cleanBody,icon,chan,isChan,status,canWrite,list,inside,action,ownCount,canCreate,why,initials};
if(typeof module==='object'&&module.exports)module.exports=api;root.LowiUserRoomsCore=api;
})(typeof window!=='undefined'?window:globalThis);
