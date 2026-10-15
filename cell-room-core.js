/* LOWiSPIKE cell room + friends tree core (Oct 15). Pure logic, no DOM.
   - Room: the living cell's own space. Furniture is earned with XP (never spent); treasures and lights are the
     wardrobe/shop pieces the user owns, each floating in its own glowing vesicle. Only owned pieces can be placed.
   - Friends tree: real people only (invite link or the Community room). Stored per account in lowispike.friends.v1.
     Nothing about health is ever stored or shown: name, cell name, level only. */
(function(root){'use strict';
const RKEY='lowispike.room.v1',FKEY='lowispike.friends.v1',MAX_FRIENDS=12;
const CATS=[
 {id:'moebel',names:['Furniture','Möbel','Muebles']},
 {id:'licht',names:['Light','Licht','Luz'],kinds:['glow','effect']},
 {id:'schatz',names:['Treasures','Schätze','Tesoros'],kinds:['pot','hat','neck','face']}
];
/* Own furniture for the cell's space. x/y = centre in % of the scene, w = width in scene units (1 = 1% of the short side). */
const FURNITURE=[
 {id:'window',xp:0,x:20,y:19,w:30,z:1,names:['Vein window','Aderfenster','Ventana a la vena']},
 {id:'cushion',xp:0,x:50,y:83,w:44,z:2,names:['Plasma cushion','Plasmakissen','Cojín de plasma']},
 {id:'lamp',xp:0,x:12,y:58,w:17,z:3,names:['Mitochondria lamp','Mitochondrien-Lampe','Lámpara mitocondria']},
 {id:'lights',xp:150,x:50,y:6,w:78,z:1,names:['Ribosome lights','Ribosomen-Lichter','Luces de ribosomas']},
 {id:'shelf',xp:400,x:85,y:30,w:22,z:2,names:['Golgi shelf','Golgi-Regal','Estante Golgi']},
 {id:'rug',xp:800,x:50,y:92,w:76,z:0,names:['Crystal rug','Kristallteppich','Alfombra de cristal']},
 {id:'bubbles',xp:1200,x:89,y:70,w:14,z:3,names:['Oxygen bubbles','Sauerstoffblasen','Burbujas de oxígeno']}
];
/* Vesicle spots for wardrobe/shop pieces, kept clear of the cell in the middle (50,52). */
const SPOTS=[[29,37],[71,37],[25,70],[75,62],[50,24],[67,84],[33,85],[11,40],[89,49],[38,13],[63,13],[11,86],[89,88],[23,54],[78,19],[8,24],[92,12],[62,26],[37,27],[80,77]];
const TINT={sunset:'#ffb38a',aurora:'#7ef0c8',opal:'#d9c8ff'};
const ok=id=>typeof id==='string'&&/^[a-z]{2,20}$/.test(id);
function furniture(id){return FURNITURE.find(f=>f.id===id)||null;}
function catOf(kind){for(const c of CATS)if(c.kinds&&c.kinds.includes(kind))return c.id;return'schatz';}
/* All pieces the room can show, in a stable order. wc = LowiHerbTamagotchiCore (optional in tests). */
function items(wc,xp){xp=+xp||0;const out=FURNITURE.map(f=>({id:f.id,cat:'moebel',src:'own',xp:f.xp,names:f.names,owned:xp>=f.xp,x:f.x,y:f.y,w:f.w,z:f.z}));
 if(wc&&wc.COSMETICS){const pieces=wc.COSMETICS.concat((wc.EXTRAS||[]).filter(c=>wc.owns&&wc.owns(c.id,xp)));
  pieces.forEach((c,i)=>{if(!c||c.premium||!ok(c.id))return;const s=SPOTS[i%SPOTS.length];
   out.push({id:c.id,cat:catOf(c.kind),kind:c.kind,src:'wardrobe',xp:+c.xp||0,names:c.names||[c.name,c.name,c.name],owned:!!(wc.owns&&wc.owns(c.id,xp)),season:c.season||'',x:s[0],y:s[1],w:13,z:4,tint:TINT[c.id]||''});});}
 return out;}
function blankRoom(){return{v:1,placed:['window','cushion','lamp'],ts:0};}
function cleanRoom(s){const b=blankRoom();if(!s||typeof s!=='object'||!Array.isArray(s.placed))return b;return{v:1,placed:[...new Set(s.placed.filter(ok))].slice(0,40),ts:+s.ts||0};}
/* Placed pieces that are still owned (a restore or a new account can drop ownership). */
function visible(state,list){const own=new Set(list.filter(i=>i.owned).map(i=>i.id));return cleanRoom(state).placed.filter(id=>own.has(id));}
function toggle(state,id,list){const st=cleanRoom(state),it=list.find(i=>i.id===id);if(!it||!it.owned)return null;
 const placed=st.placed.includes(id)?st.placed.filter(x=>x!==id):st.placed.concat(id);return{...st,placed};}
function roomTint(state,list){const vis=visible(state,list);for(let i=vis.length-1;i>=0;i--){const it=list.find(x=>x.id===vis[i]);if(it&&it.tint)return it.tint;}return'';}
/* ---------- friends ---------- */
const cleanName=s=>String(s==null?'':s).replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,24);
const okUid=u=>typeof u==='string'&&/^[A-Za-z0-9_-]{6,64}$/.test(u);
function blankFriends(){return{v:1,list:[],ts:0};}
function cleanFriend(f){if(!f||!okUid(f.uid))return null;const n=cleanName(f.n);if(!n)return null;return{uid:f.uid,n,c:cleanName(f.c),src:f.src==='room'?'room':'link',since:+f.since||0};}
function cleanFriends(s){const b=blankFriends();if(!s||typeof s!=='object'||!Array.isArray(s.list))return b;const seen=new Set(),list=[];
 s.list.forEach(x=>{const f=cleanFriend(x);if(f&&!seen.has(f.uid)&&list.length<MAX_FRIENDS){seen.add(f.uid);list.push(f);}});return{v:1,list,ts:+s.ts||0};}
function addFriend(s,f,myUid,now){const st=cleanFriends(s),c=cleanFriend({...f,since:now||Date.now()});if(!c||(myUid&&c.uid===myUid))return null;
 const i=st.list.findIndex(x=>x.uid===c.uid);if(i>=0){const list=st.list.slice();list[i]={...list[i],n:c.n,c:c.c||list[i].c};return{...st,list};}
 if(st.list.length>=MAX_FRIENDS)return null;return{...st,list:st.list.concat(c)};}
function removeFriend(s,uid){const st=cleanFriends(s);return{...st,list:st.list.filter(x=>x.uid!==uid)};}
function parseInvite(search){try{const q=new URLSearchParams(String(search||'').replace(/^[?#]/,''));const uid=q.get('friend');if(!okUid(uid))return null;const n=cleanName(q.get('fn'));if(!n)return null;return{uid,n,c:cleanName(q.get('fc'))};}catch(e){return null;}}
function inviteURL(base,me){if(!me||!okUid(me.uid)||!cleanName(me.n))return'';const u=String(base||'').split('#')[0].split('?')[0];
 return u+'?friend='+encodeURIComponent(me.uid)+'&fn='+encodeURIComponent(cleanName(me.n))+(cleanName(me.c)?'&fc='+encodeURIComponent(cleanName(me.c)):'');}
/* Branch spots for the tree, centre = your own cell. */
const TREE={me:[50,47],spots:[[22,30],[78,30],[11,54],[89,54],[33,13],[67,13],[24,76],[76,76]]};
function hue(uid){let h=2166136261;const s=String(uid||'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0)%360;}
const api={RKEY,FKEY,MAX_FRIENDS,CATS,FURNITURE,SPOTS,TREE,furniture,catOf,items,blankRoom,cleanRoom,visible,toggle,roomTint,blankFriends,cleanFriends,addFriend,removeFriend,parseInvite,inviteURL,cleanName,hue};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LowiCellRoomCore=api;
})(typeof window!=='undefined'?window:globalThis);
