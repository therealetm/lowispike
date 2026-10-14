/* LOWiSPIKE herb shop core (Oct 15). Pure logic + seasonal art, no DOM.
   - Seasonal drops: dated windows (every year), each with three own pieces. Countdown = real end of the window.
   - Shelf: 4 pieces, new selection every 8 hours (00/08/16 local), seeded per user + window.
   - One free piece per local day: claiming it makes it yours for good, even before its XP.
   - XP is never spent. No prices, no discounts, no struck-through anything. Premium stays preview-only.
   Ownership lives in lowispike.shop.v1 (backed up with the other lowispike.* keys). */
(function(root){'use strict';
const SKEY='lowispike.shop.v1',H8=8*36e5,DAY=864e5;
const DROPS=[
 {id:'autumn',from:[9,22],to:[11,30],names:['Mist Moon drop','Herbstnebel-Drop','Drop Niebla de otoño'],tint:'#f0a35c',items:[
  {id:'maple',kind:'hat',xp:250,claim:true,season:'autumn',name:'Maple crown',names:['Maple crown','Ahornkrone','Corona de arce'],icon:'leaf'},
  {id:'mistscarf',kind:'neck',xp:600,claim:true,season:'autumn',name:'Mist scarf',names:['Mist scarf','Nebelschal','Bufanda de niebla'],icon:'fog'},
  {id:'acorn',kind:'pot',xp:1000,claim:true,season:'autumn',name:'Acorn pot',names:['Acorn pot','Eicheltopf','Maceta bellota'],icon:'pot'}]},
 {id:'winter',from:[12,1],to:[2,29],names:['Frost Spark drop','Frostfunken-Drop','Drop Chispa de escarcha'],tint:'#9fd8ff',items:[
  {id:'snowclip',kind:'hat',xp:250,claim:true,season:'winter',name:'Snowflake clip',names:['Snowflake clip','Schneeflocken-Spange','Pinza de copo'],icon:'snowflake'},
  {id:'frostscarf',kind:'neck',xp:600,claim:true,season:'winter',name:'Frost scarf',names:['Frost scarf','Frostschal','Bufanda de escarcha'],icon:'snow'},
  {id:'frostpot',kind:'pot',xp:1000,claim:true,season:'winter',name:'Frost glass pot',names:['Frost glass pot','Eisglastopf','Maceta de hielo'],icon:'pot'}]}
];
const SEASONAL=DROPS.reduce((a,d)=>a.concat(d.items),[]);
const pad=n=>String(n).padStart(2,'0');
function dayKey(now){const d=new Date(now);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function startOfDay(now){const d=new Date(now);d.setHours(0,0,0,0);return d.getTime();}
function lastDay(y,m){return new Date(y,m,0).getDate();}
/* The window of a drop that contains now (or the next one). Wraps over new year. */
function dropWindow(drop,now){const d=new Date(now),y=d.getFullYear();
 const make=(sy)=>{const ey=drop.to[0]<drop.from[0]?sy+1:sy,s=new Date(sy,drop.from[0]-1,drop.from[1]).getTime(),e=new Date(ey,drop.to[0]-1,Math.min(drop.to[1],lastDay(ey,drop.to[0])),23,59,59,999).getTime()+1;return{start:s,end:e};};
 for(const sy of[y-1,y,y+1]){const w=make(sy);if(now>=w.start&&now<w.end)return{...w,active:true};}
 let best=null;for(const sy of[y,y+1]){const w=make(sy);if(w.start>now&&(!best||w.start<best.start))best=w;}return{...best,active:false};}
function activeDrop(now){for(const d of DROPS){const w=dropWindow(d,now);if(w.active)return{drop:d,...w};}return null;}
function nextDrop(now){let best=null;for(const d of DROPS){const w=dropWindow(d,now);if(!w.active&&(!best||w.start<best.start))best={drop:d,...w};}return best;}
/* 8-hour shelf windows: 00-08, 08-16, 16-24 local time. */
function shelfWindow(now){const s=startOfDay(now),k=Math.min(2,Math.floor((now-s)/H8)),next=k<2?s+(k+1)*H8:startOfDay(s+DAY+36e5*3);return{key:dayKey(now)+'#'+k,k,next};}
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,seed){const r=rng(seed),a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function blank(){return{v:1,owned:[],free:null,offer:null,remind:true,notify:false,pwyw:5,support:'free',ts:0};}
function clean(s){const b=blank();if(!s||typeof s!=='object')return b;const ok=id=>typeof id==='string'&&/^[a-z]{2,20}$/.test(id);
 return{v:1,owned:Array.isArray(s.owned)?[...new Set(s.owned.filter(ok))]:[],free:s.free&&ok(s.free.id)&&typeof s.free.day==='string'?{day:s.free.day,id:s.free.id}:null,offer:s.offer&&ok(s.offer.id)&&typeof s.offer.day==='string'?{day:s.offer.day,id:s.offer.id}:null,
  remind:s.remind!==false,notify:s.notify===true,pwyw:PWYW.amounts.includes(+s.pwyw)?+s.pwyw:b.pwyw,support:KOFI.modes.includes(s.support)?s.support:b.support,ts:+s.ts||0};}
/* Catalog helpers need the wardrobe core (LowiHerbTamagotchiCore). */
function owns(core,state,id,xp){return core.owns?core.owns(id,xp):false;}
function ownedBy(core,state,xp){return id=>state.owned.includes(id)||owns(core,state,id,xp);}
/* Pieces the free gift can be: anything not yours yet, not premium; seasonal only while its drop runs. Lowest XP first, seeded pick among the first four. */
function freeOffer(core,state,now,xp,uid){const day=dayKey(now);if(state.offer&&state.offer.day===day){const c=core.cosmetic(state.offer.id);if(c&&!c.premium)return c;}
 const has=ownedBy(core,state,xp),drop=activeDrop(now),pool=core.COSMETICS.concat(drop?drop.drop.items:[]).filter(c=>!c.premium&&!has(c.id)).sort((a,b)=>a.xp-b.xp||a.id.localeCompare(b.id));
 if(!pool.length)return null;const pick=shuffle(pool.slice(0,4),hash((uid||'me')+'|free|'+day))[0];return pick;}
function freeClaimed(state,now){return!!(state.free&&state.free.day===dayKey(now));}
function claimFree(core,state,now,xp,uid){state=clean(state);if(freeClaimed(state,now))return null;const c=freeOffer(core,state,now,xp,uid);if(!c)return null;
 return{...state,owned:[...new Set(state.owned.concat(c.id))],free:{day:dayKey(now),id:c.id},offer:{day:dayKey(now),id:c.id},ts:now};}
/* A seasonal piece can be taken while its drop runs and your XP reaches it. */
function canClaim(core,state,id,now,xp){const drop=activeDrop(now),c=drop&&drop.drop.items.find(x=>x.id===id);return!!(c&&!state.owned.includes(id)&&+xp>=c.xp);}
function claim(core,state,id,now,xp){state=clean(state);if(!canClaim(core,state,id,now,xp))return null;return{...state,owned:state.owned.concat(id),ts:now};}
/* Shelf: 4 pieces you don't have yet, at most one premium preview, at least one seasonal while a drop runs. */
function shelf(core,state,now,xp,uid){const w=shelfWindow(now),has=ownedBy(core,state,xp),drop=activeDrop(now),seed=hash((uid||'me')+'|'+w.key);
 const offer=freeOffer(core,state,now,xp,uid),skip=id=>has(id)||(offer&&offer.id===id&&!freeClaimed(state,now));
 const seas=shuffle((drop?drop.drop.items:[]).filter(c=>!skip(c.id)),seed),reg=shuffle(core.COSMETICS.filter(c=>!skip(c.id)),seed+1),prem=shuffle(core.PREMIUM,seed+2);
 const out=[];if(seas.length)out.push(seas[0]);if(prem.length)out.push(prem[0]);
 for(const c of shuffle(reg.concat(seas.slice(1)),seed+3)){if(out.length>=4)break;out.push(c);}
 return{items:out.sort((a,b)=>(a.premium?1:0)-(b.premium?1:0)||(a.season?0:1)-(b.season?0:1)||a.xp-b.xp),next:w.next,key:w.key};}
/* Calm time labels instead of ticking countdowns (user, Oct 15: no countdown sales, no fake urgency):
   same day -> clock time, next day -> 'tomorrow', later -> a plain date. */
function when(t,now,li){li=li||0;const loc=['en-GB','de-DE','es-ES'][li],d=new Date(t),n=startOfDay(now),day=startOfDay(t);
 const clock=()=>{try{return d.toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit'});}catch(e){return pad(d.getHours())+':'+pad(d.getMinutes());}};
 const date=()=>{try{return d.toLocaleDateString(loc,{day:'numeric',month:'short'});}catch(e){return d.getDate()+'.'+(d.getMonth()+1)+'.';}};
 if(day===n)return['at ','um ','a las '][li]+clock();if(day===startOfDay(n+DAY+36e5*3))return['tomorrow','morgen','ma\u00f1ana'][li];return['on ','am ','el '][li]+date();}
/* Pay what you want = a voluntary tip to the creator on Ko-fi (Oct 15). The app never handles payment, sees no payment data
   and unlocks nothing for paying: no XP, no pieces. 0 € ('free') is a real choice. The Ko-fi page offers one-time and monthly;
   the amount is chosen on Ko-fi. Ko-fi's hosted card checkout (Stripe) and PayPal pages redirect the whole frame and Safari blocks
   third-party cookies in frames, so payment cannot finish inside an iframe on iOS: the app opens Ko-fi over itself with target=_blank
   (an in-app Safari sheet in the Home Screen app, a new tab in the browser) and welcomes the user back when they return. */
const KOFI={handle:'lowispike',url:'https://ko-fi.com/lowispike',modes:['free','once','month']};
function kofiUrl(){return KOFI.url;}
/* Legacy pay-what-you-want preview model (kept for stored state + tests; the screen no longer shows tiers, trials or perks). */
const PWYW={amounts:[0,3,5,8,12],trialDays:7,remindBefore:2,
 tiers:[
  {min:0,names:['Everything that matters: scan, log, fasting, your herb, the XP wardrobe, the shop and the daily gift','Alles Wichtige: Scan, Loggen, Fasten, dein Kraut, der XP-Kleiderschrank, der Laden und das Tagesgeschenk','Todo lo importante: escanear, registrar, ayuno, tu hierba, el armario con XP, la tienda y el regalo diario']},
  {min:3,names:['The premium wardrobe: Tidal glass, Forest cap, Opal glow, Comet orbit','Die Premium-Garderobe: Gezeitenglas, Waldhut, Opalglanz, Kometenbahn','El armario premium: Cristal de marea, Sombrero del bosque, Brillo de ópalo, Órbita de cometa']},
  {min:5,names:['Seasonal drops three days early and a second free gift each week','Saison-Drops drei Tage früher und ein zweites Gratis-Geschenk pro Woche','Drops de temporada tres días antes y un segundo regalo gratis cada semana']},
  {min:8,names:['A supporter mark on your Community profile and a say in what we build next','Ein Unterstützer-Zeichen im Community-Profil und Mitsprache, was wir als Nächstes bauen','Una marca de apoyo en tu perfil de Comunidad y voz en lo próximo que construimos']},
  {min:12,names:['You carry a free place for someone who pays 0 €','Du trägst einen kostenlosen Platz für jemanden, der 0 € zahlt','Sostienes una plaza gratis para alguien que paga 0 €']}]};
function perks(amount){return PWYW.tiers.map(t=>({...t,on:+amount>=t.min}));}
/* Trial timeline for an amount, from a start day. At 0 € nothing is ever charged. */
function timeline(amount,start,remind){const s=startOfDay(start||Date.now()),T=PWYW.trialDays,R=PWYW.remindBefore,a=+amount||0;const steps=[{day:0,at:s,kind:'start'}];
 if(a>0&&remind!==false)steps.push({day:T-R,at:s+(T-R)*DAY,kind:'remind'});steps.push({day:T,at:s+T*DAY,kind:a>0?'charge':'free',amount:a});return steps;}
/* Seasonal art: drawn like the wardrobe layers (body centre 130/faceY, rx=r, ry=r+9). */
const ART={
 hat(id,y,r){if(id==='maple'){const t=y-r-4;return'<g class="lh-acc lh-acc-maple">'+[-1,0,1].map(k=>{const x=130+k*r*.48,yy=t+Math.abs(k)*7,rot=k*24;return'<path transform="translate('+x.toFixed(1)+' '+yy.toFixed(1)+') rotate('+rot+')" d="M0 6L0 -2M0 -14l3 6 6-3-2 7 6 1-6 4 2 3-6-1-3 5-3-5-6 1 2-3-6-4 6-1-2-7 6 3Z" fill="'+(k?'#e9853f':'#f2b450')+'" stroke="#ffd9a6" stroke-width="1" stroke-linejoin="round"/>';}).join('')+'<path d="M'+(130-r*.7).toFixed(1)+' '+(t+9).toFixed(1)+'Q130 '+(t+15).toFixed(1)+' '+(130+r*.7).toFixed(1)+' '+(t+9).toFixed(1)+'" fill="none" stroke="#b8743a" stroke-width="2.2" stroke-linecap="round"/></g>';}
  if(id==='snowclip'){const x=130+r*.58,cy=y-r*.78;return'<g class="lh-acc lh-acc-snowclip" transform="translate('+x.toFixed(1)+' '+cy.toFixed(1)+')" stroke="#eaf7ff" stroke-width="2" stroke-linecap="round" fill="none">'+[0,60,120].map(a=>'<path transform="rotate('+a+')" d="M0 -9V9M-3 -6l3 2 3-2M-3 6l3-2 3 2"/>').join('')+'<circle r="2.2" fill="#9fd8ff" stroke="none"/></g>';}
  return'';},
 neck(id,y,r){const ry=r+9,cy=y+ry*.6,hw=r*.8;const band=(a,b,dash)=>'<path d="M'+(130-hw-3).toFixed(1)+' '+(cy-5).toFixed(1)+'Q130 '+(cy+5).toFixed(1)+' '+(130+hw+3).toFixed(1)+' '+(cy-5).toFixed(1)+'L'+(130+hw+2).toFixed(1)+' '+(cy+4).toFixed(1)+'Q130 '+(cy+14).toFixed(1)+' '+(130-hw-2).toFixed(1)+' '+(cy+4).toFixed(1)+'Z" fill="'+a+'" stroke="'+b+'" stroke-width="1.1"/><path d="M'+(130-hw*.5).toFixed(1)+' '+(cy+5).toFixed(1)+'l-4 19 9 2 3-20Z" fill="'+a+'" stroke="'+b+'" stroke-width="1"/><path d="M'+(130-hw).toFixed(1)+' '+cy.toFixed(1)+'Q130 '+(cy+9).toFixed(1)+' '+(130+hw).toFixed(1)+' '+cy.toFixed(1)+'" fill="none" stroke="#fff" stroke-width="1.3" stroke-dasharray="'+dash+'" opacity=".6"/>';
  if(id==='mistscarf')return'<g class="lh-acc lh-acc-mistscarf">'+band('#9d93c4','#e2dcff','6 3')+'</g>';
  if(id==='frostscarf')return'<g class="lh-acc lh-acc-frostscarf">'+band('#7fb8e6','#e3f4ff','1 4')+'</g>';
  return'';},
 pot(id){if(id==='acorn')return'<g class="lh-pot-fx"><path d="M89 251q41 -12 82 0l-2 7q-39 -9 -78 0Z" fill="#a8693a" stroke="#e9b27a" stroke-width="1"/>'+[96,108,120,132,144,156].map(x=>'<path d="M'+x+' 252l3 4 3-4" fill="none" stroke="#e9b27a" stroke-width="1" opacity=".7"/>').join('')+'<path d="M104 266q26 8 52 0" fill="none" stroke="#f3d3a8" stroke-width="1.6" stroke-linecap="round" opacity=".6"/></g>';
  if(id==='frostpot')return'<g class="lh-pot-fx" stroke="#f2fbff" stroke-linecap="round" fill="none" opacity=".85"><path d="M96 254l6 9M101 254l-2 5M162 254l-5 8M158 254l3 4" stroke-width="1.6"/>'+[[112,266],[148,264]].map(([x,yy])=>'<g transform="translate('+x+' '+yy+')" stroke-width="1.3"><path d="M0 -4V4M-3.5 -2l7 4M-3.5 2l7 -4"/></g>').join('')+'</g>';
  return'';}
};
const SHOPKEEPER={name:'Kometa',lines:{
 hello:[['Take your time. Nothing here costs XP, your XP stays yours.','Schau dich in Ruhe um. Hier kostet nichts XP, deine XP bleiben deine.','Mira con calma. Aquí nada cuesta XP, tus XP siguen siendo tuyos.'],
  ['I fly past every eight hours with a new shelf.','Alle acht Stunden flieg ich mit einem neuen Regal vorbei.','Cada ocho horas paso volando con una estantería nueva.'],
  ['Try anything on. Looking is always free.','Probier alles an. Anschauen ist immer gratis.','Pruébate lo que quieras. Mirar siempre es gratis.']],
 gift:[['One piece is a gift today. It is yours, no strings.','Ein Teil ist heute ein Geschenk. Es gehört dir, ohne Haken.','Hoy una pieza es un regalo. Es tuya, sin trampa.']],
 given:[['Gift delivered. A new one comes tomorrow.','Geschenk übergeben. Morgen bring ich ein neues.','Regalo entregado. Mañana traigo otro.']],
 drop:[['The season brought three new pieces. They return next year if you miss them.','Die Saison hat drei neue Teile gebracht. Verpasst du sie, kommen sie nächstes Jahr wieder.','La temporada trajo tres piezas nuevas. Si te las pierdes, vuelven el año que viene.']]}};
function line(kind,li,seed){const l=SHOPKEEPER.lines[kind]||SHOPKEEPER.lines.hello,x=l[Math.abs(seed|0)%l.length];return x[li||0];}
const api={KOFI,kofiUrl,SKEY,DROPS,SEASONAL,PWYW,ART,SHOPKEEPER,dayKey,dropWindow,activeDrop,nextDrop,shelfWindow,hash,shuffle,blank,clean,freeOffer,freeClaimed,claimFree,canClaim,claim,shelf,when,perks,timeline,line};
if(typeof module==='object'&&module.exports){module.exports=api;return;}
root.LowiHerbShopCore=api;root.LowiShopArt=ART;
/* Hydrate ownership into the wardrobe core before the first herb paint. */
try{const C=root.LowiHerbTamagotchiCore;if(C&&C.registerExtras){C.registerExtras(SEASONAL);let st=null;try{st=clean(JSON.parse(localStorage.getItem(SKEY)||'null'));}catch(e){st=blank();}C.setOwned(st.owned);}}catch(e){}
})(typeof window!=='undefined'?window:globalThis);
