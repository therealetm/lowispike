/* LOWiSPIKE cell room + friends tree UI (Oct 15). Finch-style home for the living cell and a friends tree.
   Room: RETIRED Oct 15 (user: "remove the window, plasma cushion and all that stuff, we go the Pokémon route").
   The room code below stays only so old saves (lowispike.room.v1) still parse; nothing opens it any more.
   Friends tree: opens from Community (button next to Milestones, and a row in the Milestones sheet). Real people only:
   an invite link, or people who are in the Community room while signed in. No contact sync, no health data. */
(function(root){'use strict';
const D=root.document,K=root.LowiCellRoomCore;if(!D||!K||root.LowiCellRoom)return;
const WC=()=>root.LowiHerbTamagotchiCore||null;
const mq=root.matchMedia?root.matchMedia('(prefers-reduced-motion: reduce)'):null,reduced=()=>!!(mq&&mq.matches);
const li=()=>{try{const l=String(root.LowiLang&&LowiLang.get?LowiLang.get():(D.documentElement.lang||'de')).slice(0,2);return l==='de'?1:l==='es'?2:0;}catch(e){return 1;}};
const L=(e,d,s)=>[e,d,s][li()];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nm=o=>o&&o.names?(o.names[li()]||o.names[0]):'';
const read=(k,clean)=>{try{return clean(JSON.parse(localStorage.getItem(k)||'null'));}catch(e){return clean(null);}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify({...v,ts:Date.now()}));}catch(e){}};
function herb(){try{return root.LowiHerbTamagotchi.current();}catch(e){return null;}}
function xpNow(){const h=herb();return h&&h.m?+h.m.xp||0:0;}
/* BH-006: the companion's name = own companion's name, else a name the user typed, else Misty; never the old herb auto name ("Moss Leaf") */
function companionName() { const w = typeof window !== 'undefined' ? window : globalThis; const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(w.LowiHerbIdentity && w.LowiHerbIdentity.autoName && w.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const B = w.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pick(c && c.name); } } catch (e) { } if (!n) try { const t = w.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = w.LowiR2, s = R && R.S && R.S(); n = typed(s && s.herb && s.herb.name); } catch (e) { } return n || 'Misty'; }
function cellName(){return companionName();}
function myUid(){try{return root.LOWI_CLOUD&&LOWI_CLOUD.uid?String(LOWI_CLOUD.uid()||''):'';}catch(e){return'';}}
function myName(){try{return String((root.LowiHost&&LowiHost.user()||{}).name||'');}catch(e){return'';}}
function live(){try{return!!(root.LOWI_CLOUD&&LOWI_CLOUD.live&&LOWI_CLOUD.live());}catch(e){return false;}}
/* people you can add (Oct 23, Emmanuel: "da sehe ich mein Name so echt oft ... und so verschiedene Botsnamen"): real accounts
   only. Server-flagged bot accounts (bot-accounts.js) and hidden test accounts are left out, and Emmanuel's own extra
   accounts never show: for him none of them, for everyone else one entry (ranking-core.js isOwner / OWNER.main). */
function roomPeople(){if(!live())return[];try{const bots=new Set((root.LOWI_BOTS||[]).map(b=>b.n)),B=root.LowiBotAccounts,H=root.LowiHiddenAccounts,R=root.LowiRankingCore,me=myUid();
 const own=p=>!!(R&&R.isOwner&&R.isOwner(p)),iAmOwner=!!(R&&R.OWNER&&R.OWNER.ids&&R.OWNER.ids.includes(me));
 const list=(LOWI_CLOUD.people()||[]).filter(p=>p&&p.uid&&p.n&&!bots.has(p.n)&&p.uid!==me&&!(B&&B.isBot(p))&&!(H&&H.isHidden(p)));
 const out=[],seenOwner=[];for(const p of list){if(own(p)){if(iAmOwner)continue;seenOwner.push(p);continue;}out.push(p);}
 if(seenOwner.length){const keep=seenOwner.find(p=>R.OWNER&&p.uid===R.OWNER.main)||seenOwner[0];out.push(keep);}
 return out;}catch(e){return[];}}
/* 23 Oct 2026 (Emmanuel: the add-friend list showed the same names again and again): one entry per name in the list you pick from,
   the same rule as the Ranking (care-board-core roster): the account with the higher level, then more XP, stays. Only the list is
   shorter; nobody is removed and every account stays findable by its id (personOf still sees all of them). */
function onePerName(list){const best=new Map(),order=[];for(const p of list||[]){const k=String((p&&p.n)||'').trim().toLocaleLowerCase();if(!k)continue;const cur=best.get(k);
 if(!cur){best.set(k,p);order.push(k);continue;}const lv=+p.lv||0,cl=+cur.lv||0;if(lv>cl||(lv===cl&&(+p.xp||0)>(+cur.xp||0)))best.set(k,p);}
 return order.map(k=>best.get(k));}
function myHue(){const h=herb();let x=200;try{const s=h&&h.m&&h.m.profile&&h.m.profile.sign&&h.m.profile.sign.name;if(s)x=(K.hue(s)%140)+160;}catch(e){}return x;}
const ICO={
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10v9h11v-9"/><circle cx="12" cy="14.5" r="2.2"/></svg>',
 tree:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-8"/><path d="M12 13 7 9M12 13l5-4M12 16l-4-2M12 16l4-2"/><circle cx="6" cy="7.5" r="2"/><circle cx="18" cy="7.5" r="2"/><circle cx="12" cy="5" r="2"/></svg>',
 bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
 plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>',
 heart:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.5s-7-4.3-8.9-8.6C1.9 8.9 3.8 5.5 7 5.5c1.9 0 3.3 1 4.1 2.4h1.8c.8-1.4 2.2-2.4 4.1-2.4 3.2 0 5.1 3.4 3.9 6.4-1.9 4.3-8.9 8.6-8.9 8.6Z"/></svg>',
 vibe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>'
};
/* ---------- art ---------- */
function cellSVG(key,h,o){o=o||{};const g='cr'+String(key).replace(/\W/g,'')+'_',h2=(h+40)%360,h3=(h+300)%360;
 return'<svg class="cr-cell'+(o.cls?' '+o.cls:'')+'" viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="'+g+'m" cx=".38" cy=".32" r=".78"><stop offset="0" stop-color="hsl('+h+',100%,97%)" stop-opacity=".92"/><stop offset=".55" stop-color="hsl('+h+',85%,72%)" stop-opacity=".38"/><stop offset="1" stop-color="hsl('+h2+',90%,64%)" stop-opacity=".8"/></radialGradient><radialGradient id="'+g+'n" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="hsl('+h3+',80%,72%)" stop-opacity=".55"/></radialGradient></defs>'+
 '<circle class="cr-halo" cx="60" cy="60" r="57" fill="hsl('+h+',95%,70%)" opacity=".16"/><path class="cr-mem" d="M60 8C89 7 112 31 111 60C111 90 88 112 60 112C31 113 8 90 9 60C9 31 31 8 60 8Z" fill="url(#'+g+'m)" stroke="hsl('+h+',100%,90%)" stroke-width="2.4" stroke-opacity=".85"/>'+
 '<path d="M36 19C46 13 60 12 72 15" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round"/><circle cx="60" cy="44" r="16" fill="url(#'+g+'n)" opacity=".55"/><circle cx="64" cy="40" r="4" fill="#fff" opacity=".5"/>'+
 '<ellipse cx="30" cy="80" rx="9" ry="4.4" fill="hsl('+h2+',95%,76%)" opacity=".6" transform="rotate(-28 30 80)"/><ellipse cx="92" cy="76" rx="7" ry="3.6" fill="hsl('+h3+',95%,80%)" opacity=".55" transform="rotate(30 92 76)"/><circle cx="88" cy="38" r="3.4" fill="#fff" opacity=".5"/><circle cx="27" cy="48" r="2.4" fill="#fff" opacity=".45"/><circle cx="78" cy="96" r="2.2" fill="#fff" opacity=".4"/>'+
 (o.face===false?'':'<g class="cr-face"><ellipse cx="47" cy="68" rx="4.6" ry="5.4" fill="#1d1b3a"/><ellipse cx="73" cy="68" rx="4.6" ry="5.4" fill="#1d1b3a"/><circle cx="48.6" cy="66" r="1.6" fill="#fff"/><circle cx="74.6" cy="66" r="1.6" fill="#fff"/><path d="M53 78q7 6 14 0" fill="none" stroke="#1d1b3a" stroke-width="2.4" stroke-linecap="round"/><circle cx="39" cy="76" r="4" fill="#ff8fb5" opacity=".45"/><circle cx="81" cy="76" r="4" fill="#ff8fb5" opacity=".45"/></g>')+'</svg>';}
/* Oct 19 old-design purge: your own spot on the friends tree is the real Misty (same cell as Home), not the Oct 15 cell drawing */
function mineSVG(){try{const T=root.LowiHerbTamagotchi,c=T&&T.current&&T.current();if(c&&T.plantHTML){const s=String(T.plantHTML(c.m,'node',c.p)||'');if(/^\s*<svg[^>]*class="/.test(s))return s.replace(/^(\s*<svg[^>]*class=")/,'$1cr-fc cr-own ');}}catch(e){}return cellSVG('me',myHue(),{cls:'cr-fc'});}
/* Oct 19 old-design purge, round 3: every friend (tree spot, picked card, More friends list, invite card) is the current glass cell, tinted to
   their hue; companion.js then puts their shared form on it. The Oct 15 cell drawing is only the fallback before companion.js loads. */
function friendCell(key,h,o){o=o||{};try{const F=root.LowiCompanion&&root.LowiCompanion.friendSVG,s=F&&String(F(null,key)||'');if(s&&/^\s*<svg[^>]*class="[^>]*style="/.test(s))return s.replace(/^(\s*<svg[^>]*class=")/,'$1'+(o.cls||'cr-fc')+' cr-cur ').replace(/style="/,'style="--cr-hue:'+((((h|0)-200)%360+360)%360)+'deg;');}catch(e){}return cellSVG(key,h,o);}
function furnSVG(id,p){const g='crf'+p+id+'_';switch(id){
 case'window':return'<svg viewBox="0 0 100 78" aria-hidden="true"><defs><clipPath id="'+g+'c"><rect x="8" y="8" width="84" height="62" rx="22"/></clipPath><linearGradient id="'+g+'b" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#5a0f2e"/><stop offset="1" stop-color="#2a0718"/></linearGradient></defs><rect x="4" y="4" width="92" height="70" rx="26" fill="#ffd6e8" fill-opacity=".12" stroke="#ffc3dc" stroke-opacity=".7" stroke-width="2.4"/><g clip-path="url(#'+g+'c)"><rect x="0" y="0" width="100" height="78" fill="url(#'+g+'b)"/><g class="cr-flow">'+[[14,28],[40,46],[66,24],[90,50],[114,32],[140,48]].map((c,i)=>'<g transform="translate('+c[0]+' '+c[1]+') rotate('+(i*37%60-30)+')"><ellipse rx="10" ry="6.4" fill="#e2405f"/><ellipse rx="5" ry="2.8" fill="#a81d3e"/></g>').join('')+'</g><path d="M8 18q40 8 84-4" stroke="#fff" stroke-opacity=".14" stroke-width="6" fill="none"/></g><path d="M18 14q10-6 22-6" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
 case'cushion':return'<svg viewBox="0 0 120 48" aria-hidden="true"><defs><radialGradient id="'+g+'p" cx=".45" cy=".3" r=".8"><stop stop-color="#ffe3f6"/><stop offset=".6" stop-color="#c79bff"/><stop offset="1" stop-color="#7b5ad6"/></radialGradient></defs><ellipse cx="60" cy="40" rx="54" ry="6" fill="#000" opacity=".25"/><path d="M8 30C6 14 30 8 60 8s54 6 52 22c-1 10-24 14-52 14S9 40 8 30Z" fill="url(#'+g+'p)" stroke="#f3dcff" stroke-opacity=".7" stroke-width="1.6"/><path d="M24 18q36-10 72 0" stroke="#fff" stroke-opacity=".55" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="40" cy="28" r="1.8" fill="#fff" opacity=".6"/><circle cx="60" cy="30" r="1.8" fill="#fff" opacity=".6"/><circle cx="80" cy="28" r="1.8" fill="#fff" opacity=".6"/></svg>';
 case'lamp':return'<svg viewBox="0 0 60 100" aria-hidden="true"><circle class="cr-glow" cx="30" cy="26" r="26" fill="#ffb35c" opacity=".28"/><path d="M30 44v46" stroke="#ffd9a8" stroke-opacity=".6" stroke-width="2.4"/><ellipse cx="30" cy="92" rx="14" ry="4" fill="#ffd9a8" fill-opacity=".35" stroke="#ffd9a8" stroke-opacity=".6"/><path d="M10 26C10 14 20 8 30 8s20 6 20 18-9 18-20 18S10 38 10 26Z" fill="#ff9e57" fill-opacity=".85" stroke="#ffe0b8" stroke-width="1.8"/><path d="M15 26c3-6 5 6 8 0s5 6 8 0 5 6 8 0 4 6 6 0" fill="none" stroke="#fff3dd" stroke-width="1.8" stroke-linecap="round"/></svg>';
 case'lights':{let d='';for(let i=0;i<11;i++){const t=(i+.5)/11,x=200*t,y=4+30*t*(1-t)*4*.8;d+='<circle class="cr-bulb cr-b'+(i%3)+'" cx="'+x.toFixed(1)+'" cy="'+(y+3).toFixed(1)+'" r="3.6" fill="'+['#ffe6a2','#a7f3ff','#ffb3d9'][i%3]+'"/>';}
  return'<svg viewBox="0 0 200 34" aria-hidden="true"><path d="M0 4Q100 52 200 4" fill="none" stroke="#e6dcff" stroke-opacity=".55" stroke-width="1.4"/>'+d+'</svg>';}
 case'shelf':return'<svg viewBox="0 0 80 90" aria-hidden="true">'+[18,40,62].map((y,i)=>'<path d="M6 '+y+'q34 '+(14-i*2)+' 68 0" fill="none" stroke="'+['#9fe6ff','#c8b0ff','#ffc6e2'][i]+'" stroke-width="7" stroke-linecap="round" stroke-opacity=".75"/>').join('')+'<circle cx="22" cy="10" r="5" fill="#a7f3ff" opacity=".7"/><circle cx="56" cy="32" r="4.4" fill="#e2d4ff" opacity=".7"/><circle cx="30" cy="55" r="4" fill="#ffd0e6" opacity=".7"/><circle cx="62" cy="76" r="3.4" fill="#fff" opacity=".5"/></svg>';
 case'rug':return'<svg viewBox="0 0 200 40" aria-hidden="true"><defs><radialGradient id="'+g+'r"><stop stop-color="#9ff0ff" stop-opacity=".55"/><stop offset="1" stop-color="#7b6cff" stop-opacity=".15"/></radialGradient></defs><ellipse cx="100" cy="20" rx="96" ry="17" fill="url(#'+g+'r)" stroke="#c9f6ff" stroke-opacity=".5" stroke-width="1.4"/>'+[[60,18],[82,26],[100,14],[118,26],[140,18],[100,27],[40,22],[160,22]].map(c=>'<path d="M'+c[0]+' '+(c[1]-4)+'l3.5 2v4l-3.5 2-3.5-2v-4z" fill="none" stroke="#e8fbff" stroke-opacity=".6" stroke-width="1"/>').join('')+'</svg>';
 case'bubbles':return'<svg viewBox="0 0 40 90" aria-hidden="true">'+[[20,78,8],[12,56,5],[27,40,6],[16,22,4],[26,8,3]].map((c,i)=>'<circle class="cr-bub cr-u'+i+'" cx="'+c[0]+'" cy="'+c[1]+'" r="'+c[2]+'" fill="#bff4ff" fill-opacity=".18" stroke="#dffaff" stroke-opacity=".8" stroke-width="1.2"/>').join('')+'</svg>';
 }return'';}
function pieceArt(it,h){const wc=WC();if(!h||!wc)return'';try{return root.LowiHerbTamagotchi.plantHTML(h.m,'node',h.p,{preview:wc.previewEquip({},it.id,1e9),crop:it.kind,hidden:true});}catch(e){return'';}}
/* ---------- room ---------- */
const LINES={hello:[['My home. Put out whatever you like.','Mein Zuhause. Stell hin, was dir gefällt.','Mi casa. Pon lo que te guste.'],['It\'s cosy in here, right in your bloodstream.','Hier drin ist es gemütlich, mitten in deinem Blut.','Aquí dentro se está a gusto, justo en tu sangre.'],['Every piece you earn can live here too.','Jedes Teil, das du dir verdienst, kann hier auch wohnen.','Cada pieza que ganas también puede vivir aquí.']],
 put:[['Oh, that fits perfectly.','Oh, das passt perfekt.','Oh, eso queda perfecto.'],['I love it here.','Ich liebe es hier.','Me encanta aquí.'],['Look how it glows!','Schau, wie das leuchtet!','¡Mira cómo brilla!']],
 take:[['Back into storage. Your choice.','Zurück ins Lager. Du entscheidest.','De vuelta al almacén. Tú decides.'],['More room to float around.','Mehr Platz zum Schweben.','Más sitio para flotar.']]};
const pick=(k,seed)=>{const a=LINES[k];return a[Math.abs(seed)%a.length][li()];};
const R={ov:null,cat:'moebel',msg:'',back:null,ro:null,n:0};
function roomList(){return K.items(WC(),xpNow());}
function roomHTML(){const list=roomList(),st=read(K.RKEY,K.cleanRoom),vis=K.visible(st,list),h=herb(),name=cellName(),tint=K.roomTint(st,list);
 const by=id=>list.find(i=>i.id===id);let scene='';
 vis.map(by).filter(Boolean).sort((a,b)=>a.z-b.z).forEach(it=>{const pos='left:'+it.x+'%;top:'+it.y+'%;--w:'+it.w;
  if(it.src==='own')scene+='<div class="cr-f cr-f-'+it.id+'" style="'+pos+'">'+furnSVG(it.id,'s')+'</div>';
  else scene+='<div class="cr-ves'+(it.cat==='licht'?' cr-ves-l':'')+'" style="'+pos+'" title="'+esc(nm(it))+'"><span class="cr-ves-in">'+pieceArt(it,h)+'</span></div>';});
 const fx=(vis.includes('stars')?'<div class="cr-stars" aria-hidden="true">'+Array.from({length:14},(_,i)=>'<i style="left:'+((i*37)%96+2)+'%;top:'+((i*53)%80+6)+'%;animation-delay:'+(i*0.37).toFixed(2)+'s"></i>').join('')+'</div>':'')+(vis.includes('halo')?'<i class="cr-ring" aria-hidden="true"></i>':'');
 const cats=K.CATS.map(c=>'<button type="button" role="tab" id="crTab-'+c.id+'" aria-selected="'+(R.cat===c.id)+'" aria-controls="crItems" data-cr="cat" data-cat="'+c.id+'">'+esc(nm(c))+'<small>'+list.filter(i=>i.cat===c.id&&vis.includes(i.id)).length+'</small></button>').join('');
 const tiles=list.filter(i=>i.cat===R.cat).map(it=>{const on=vis.includes(it.id),lock=!it.owned,more=Math.max(0,Math.ceil(it.xp-xpNow()));
  const sub=lock?L('From '+it.xp+' XP','Ab '+it.xp+' XP','Desde '+it.xp+' XP'):on?L('Placed','Steht','Puesto'):L('Tap to place','Antippen','Toca para poner');
  return'<button type="button" class="cr-tile'+(on?' on':'')+(lock?' lock':'')+'" data-cr="toggle" data-id="'+it.id+'" aria-pressed="'+on+'" aria-label="'+esc(nm(it)+', '+(lock?L(more+' XP to go','noch '+more+' XP','faltan '+more+' XP'):on?L('placed','steht im Raum','puesto'):L('not placed','nicht aufgestellt','no puesto')))+'"><span class="cr-thumb">'+(it.src==='own'?furnSVG(it.id,'t'):pieceArt(it,h))+(on?'<span class="cr-tick">'+ICO.check+'</span>':lock?'<span class="cr-tick cr-lk">'+ICO.lock+'</span>':'')+'</span><b>'+esc(nm(it))+'</b><small>'+esc(sub)+'</small></button>';}).join('');
 const say=R.msg||pick('hello',Math.floor(Date.now()/36e5));
 return'<div class="cr-panel cr-room"><header class="cr-head"><button type="button" class="cr-x" data-cr="close" aria-label="'+esc(L('Close','Schließen','Cerrar'))+'">×</button><h2 id="crTitle">'+esc(L(name+'\'s home',name+'s Zuhause','Casa de '+name))+'</h2>'+(root.LowiHerbShop?'<button type="button" class="cr-shop" data-cr="shop">'+ICO.bag+'<span>'+esc(L('Shop','Laden','Tienda'))+'</span></button>':'<span></span>')+'</header>'+
  '<p class="cr-say" aria-live="polite"><b>'+esc(name)+'</b>'+esc(say)+'</p>'+
  '<div class="cr-scene"'+(tint?' style="--tint:'+tint+'"':'')+' role="img" aria-label="'+esc(L('Inside your cell, ','In deiner Zelle, ','Dentro de tu célula, ')+vis.length+L(' pieces placed',' Teile aufgestellt',' piezas puestas'))+'"><i class="cr-plasma" aria-hidden="true"></i>'+scene+'<div class="cr-me" style="left:50%;top:52%">'+mineSVG().replace('class="cr-fc ','class="cr-cell cr-fc ')+'</div>'+fx+'</div>'+
  '<div class="cr-tray"><div class="cr-tabs" role="tablist" aria-label="'+esc(L('Categories','Kategorien','Categorías'))+'">'+cats+'</div><div class="cr-items" id="crItems" role="tabpanel" aria-labelledby="crTab-'+R.cat+'">'+tiles+'</div></div></div>';}
function fit(){if(!R.ov)return;const s=R.ov.querySelector('.cr-scene');if(!s)return;const r=s.getBoundingClientRect();s.style.setProperty('--u',(Math.min(r.width,r.height)/100).toFixed(2)+'px');}
function paintRoom(focus){if(!R.ov)return;const it=R.ov.querySelector('.cr-items'),left=it?it.scrollLeft:0;R.ov.innerHTML=roomHTML();const ni=R.ov.querySelector('.cr-items');if(ni&&focus!=='tab')ni.scrollLeft=left;fit();
 const f=focus?R.ov.querySelector(focus==='tab'?'.cr-tabs [aria-selected="true"]':focus):null;(f||R.ov.querySelector('.cr-x')).focus({preventScroll:true});}
function overlay(cls,label){const ov=D.createElement('div');ov.className='cr-ov '+cls;ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby',label);ov.tabIndex=-1;if(reduced())ov.dataset.still='';D.body.appendChild(ov);return ov;}
function openRoom(){if(R.ov)return;closeTree(true);R.back=D.activeElement;R.msg='';R.ov=overlay('cr-ov-room','crTitle');paintRoom();
 try{R.ro=new ResizeObserver(fit);R.ro.observe(R.ov);}catch(e){root.addEventListener('resize',fit);}root.dispatchEvent(new CustomEvent('lowi:cellroom',{detail:{open:true}}));}
function closeRoom(){if(!R.ov)return;try{R.ro&&R.ro.disconnect();}catch(e){}R.ov.remove();R.ov=null;const b=R.back;if(b&&b.focus&&D.contains(b))b.focus({preventScroll:true});root.dispatchEvent(new CustomEvent('lowi:cellroom',{detail:{open:false}}));}
function toggleRoom(id){const list=roomList(),it=list.find(i=>i.id===id);if(!it)return;
 if(!it.owned){const more=Math.max(0,Math.ceil(it.xp-xpNow()));R.msg=it.src==='own'?L('Still '+more+' XP, then it\'s yours. XP is never spent.','Noch '+more+' XP, dann gehört es dir. XP wird nie ausgegeben.','Faltan '+more+' XP y será tuyo. Los XP nunca se gastan.'):L('Still '+more+' XP. The shop shows every way to get it.','Noch '+more+' XP. Im Laden siehst du jeden Weg dorthin.','Faltan '+more+' XP. En la tienda ves cada forma de conseguirlo.');paintRoom('[data-cr="toggle"][data-id="'+id+'"]');return;}
 const st=read(K.RKEY,K.cleanRoom),n=K.toggle(st,id,list);if(!n)return;write(K.RKEY,n);R.n++;R.msg=pick(n.placed.includes(id)?'put':'take',R.n);paintRoom('[data-cr="toggle"][data-id="'+id+'"]');}
/* ---------- friends tree ---------- */
const T={ov:null,sel:'',adding:false,q:'',msg:'',sure:false,back:null,invite:null};
const friends=()=>read(K.FKEY,K.cleanFriends);
function me(){return{uid:myUid(),n:myName(),c:cellName()};}
/* care comes from the microbe book (micro-book.js); its sheet opens above the tree and closes back to it */
const careOK=()=>!!(root.LowiCare&&LowiCare.open);
function careFor(uid){const f=friends().list.find(x=>x.uid===uid);if(!f||!careOK())return false;
 const ov=LowiCare.open({uid:f.uid,n:f.n,c:f.c},{top:true,onClose:u=>{if(!T.ov)return;paintTree('.cr-fcard .cr-care');}});return!!ov;}
function personOf(uid){return roomPeople().find(p=>p.uid===uid)||null;}
function treeHTML(){const fl=friends().list,onTree=fl.slice(0,K.TREE.spots.length),rest=fl.slice(K.TREE.spots.length),S=K.TREE.spots,M=K.TREE.me;
 const branch=([x,y],i)=>{const sx=50+(x-50)*.18,sy=Math.min(80,M[1]+12+(y>M[1]?6:0));return'<path d="M'+sx.toFixed(1)+' '+sy+'Q'+((sx+x)/2+(x<50?-4:4)).toFixed(1)+' '+((sy+y)/2-8).toFixed(1)+' '+x+' '+y+'" class="cr-br'+(onTree[i]?' on':'')+'"/>';};
 const svg='<svg class="cr-tsvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="crTrunk" x1="0" x2="0" y1="1" y2="0"><stop stop-color="#5b3fa8"/><stop offset="1" stop-color="#9fe6ff"/></linearGradient></defs><path d="M44 100C47 86 46 70 50 '+(M[1]+6)+'C54 70 53 86 56 100Z" fill="url(#crTrunk)" opacity=".75"/>'+S.map(branch).join('')+
  [[30,40],[70,40],[40,24],[60,24],[18,64],[82,64],[50,22]].map((c,i)=>'<circle cx="'+c[0]+'" cy="'+c[1]+'" r="1.1" class="cr-leaf cr-l'+(i%3)+'"/>').join('')+'</svg>';
 const spot=(f,i)=>{const [x,y]=S[i];if(!f)return'<button type="button" class="cr-spot cr-empty" style="left:'+x+'%;top:'+y+'%" data-cr="addOpen" aria-label="'+esc(L('Add a friend','Freund hinzufügen','Añadir amigo'))+'">'+ICO.plus+'</button>';
  return'<button type="button" class="cr-spot'+(T.sel===f.uid?' sel':'')+'" style="left:'+x+'%;top:'+y+'%" data-cr="friend" data-uid="'+esc(f.uid)+'" data-care-uid="'+esc(f.uid)+'" aria-pressed="'+(T.sel===f.uid)+'" aria-label="'+esc((f.c||L('Cell','Zelle','Célula'))+', '+f.n)+'">'+friendCell('f'+i,K.hue(f.uid),{cls:'cr-fc'})+'<b>'+esc(f.c||L('Cell','Zelle','Célula'))+'</b><small>'+esc(f.n)+'</small></button>';};
 const meName=myName()||L('You','Du','Tú');
 let out='<div class="cr-panel cr-treep"><header class="cr-head"><button type="button" class="cr-x" data-cr="close" aria-label="'+esc(L('Close','Schließen','Cerrar'))+'">×</button><h2 id="crTreeTitle">'+esc(L('Friends tree','Freundesbaum','Árbol de amigos'))+'</h2><span class="cr-count">'+fl.length+'</span></header><div class="cr-scroll">'+
  '<div class="cr-tree">'+svg+S.map((_,i)=>spot(onTree[i],i)).join('')+'<div class="cr-spot cr-mine" style="left:'+M[0]+'%;top:'+M[1]+'%">'+mineSVG()+'<b>'+esc(cellName())+'</b><small>'+esc(meName)+'</small></div></div>';
 if(!fl.length)out+='<p class="cr-empty-t">'+esc(L('Your tree is still empty. Invite someone with your link or find people from the Community.','Dein Baum ist noch leer. Lade jemanden mit deinem Link ein oder finde Leute aus der Community.','Tu árbol aún está vacío. Invita a alguien con tu enlace o encuentra gente de la Comunidad.'))+'</p>';
 if(T.msg)out+='<p class="cr-note" role="status">'+esc(T.msg)+'</p>';
 const f=T.sel&&fl.find(x=>x.uid===T.sel);
 if(f){const p=personOf(f.uid);out+='<section class="cr-fcard" aria-label="'+esc(f.n)+'">'+friendCell('sel',K.hue(f.uid),{cls:'cr-fc'})+'<div><b>'+esc(f.n)+'</b><small>'+esc((f.c?f.c+' · ':'')+(p?L('Level ','Level ','Nivel ')+p.lv:f.src==='link'?L('added by invite link','per Einladungslink','añadido por enlace'):L('from the Community','aus der Community','de la Comunidad')))+'</small></div>'+
  (careOK()?'<button type="button" class="cr-btn cr-care" data-cr="care" data-uid="'+esc(f.uid)+'">'+ICO.heart+esc(L('Send something kind','Etwas Liebes senden','Enviar algo bonito'))+'</button>':'')+'<button type="button" class="cr-btn" data-cr="miles">'+ICO.vibe+esc(L('Milestones & good vibes','Meilensteine & gute Vibes','Logros y buenas vibras'))+'</button><button type="button" class="cr-link" data-cr="remove" data-uid="'+esc(f.uid)+'">'+esc(T.sure?L('Really remove?','Wirklich entfernen?','¿Quitar de verdad?'):L('Remove from tree','Aus dem Baum nehmen','Quitar del árbol'))+'</button></section>';}
 out+='<button type="button" class="cr-btn cr-go" data-cr="addOpen" aria-expanded="'+T.adding+'">'+ICO.plus+esc(L('Add friend','Freund hinzufügen','Añadir amigo'))+'</button>';
 if(T.adding)out+=addHTML(fl);
 out+='<p class="cr-priv">'+ICO.shield+'<span>'+esc(L('Others can\'t see your health data. The tree only shows names, cell names and levels.','Andere können deine Gesundheitsdaten nicht sehen. Im Baum stehen nur Namen, Zellnamen und Level.','Los demás no pueden ver tus datos de salud. El árbol solo muestra nombres, nombres de célula y niveles.'))+'</span></p>';
 if(rest.length)out+='<h3 class="cr-h3">'+esc(L('More friends','Weitere Freunde','Más amigos'))+'</h3><ul class="cr-rest">'+rest.map(x=>'<li><button type="button" data-cr="friend" data-uid="'+esc(x.uid)+'" data-care-uid="'+esc(x.uid)+'" aria-pressed="'+(T.sel===x.uid)+'">'+friendCell('r'+x.uid,K.hue(x.uid),{cls:'cr-fc',face:false})+'<span><b>'+esc(x.c||L('Cell','Zelle','Célula'))+'</b><small>'+esc(x.n)+'</small></span></button></li>').join('')+'</ul>';
 if(root.LowiExtras&&LowiExtras.openMiles)out+='<button type="button" class="cr-link cr-milesl" data-cr="miles">'+ICO.vibe+esc(L('Milestones & good vibes in the Community','Meilensteine & gute Vibes in der Community','Logros y buenas vibras en la Comunidad'))+'</button>';
 return out+'</div></div>';}
function addHTML(fl){const m=me(),url=K.inviteURL(root.location.origin+root.location.pathname,m),has=new Set(fl.map(x=>x.uid)),full=fl.length>=K.MAX_FRIENDS;
 let h='<section class="cr-add" aria-label="'+esc(L('Add friend','Freund hinzufügen','Añadir amigo'))+'"><h3 class="cr-h3">'+ICO.link+esc(L('Your invite link','Dein Einladungslink','Tu enlace de invitación'))+'</h3>';
 if(url)h+='<p class="cr-sub">'+esc(L('Whoever opens it can put your cell in their tree. Add them back so you see each other.','Wer ihn öffnet, kann deine Zelle in den eigenen Baum holen. Füg die Person auch hinzu, dann seht ihr euch gegenseitig.','Quien lo abra puede poner tu célula en su árbol. Añádela tú también para veros mutuamente.'))+'</p><div class="cr-inv"><input readonly value="'+esc(url)+'" aria-label="'+esc(L('Invite link','Einladungslink','Enlace de invitación'))+'"><button type="button" class="cr-btn" data-cr="share">'+esc(root.navigator&&navigator.share?L('Share','Teilen','Compartir'):L('Copy','Kopieren','Copiar'))+'</button></div>';
 else h+='<p class="cr-sub">'+esc(L('Sign in first so your link can find you. Your tree is saved with your account.','Melde dich zuerst an, damit dein Link dich findet. Dein Baum wird mit deinem Konto gespeichert.','Inicia sesión primero para que tu enlace te encuentre. Tu árbol se guarda con tu cuenta.'))+'</p>';
 h+='<h3 class="cr-h3">'+esc(L('From the Community','Aus der Community','De la Comunidad'))+'</h3>';
 const ppl=onePerName(roomPeople());
 if(!live())h+='<p class="cr-sub">'+esc(L('Signed in, you can add people from the Circle here.','Angemeldet kannst du hier Leute aus dem Circle hinzufügen.','Con sesión iniciada puedes añadir aquí a gente del Circle.'))+'</p>';
 else if(!ppl.length)h+='<p class="cr-sub">'+esc(L('Nobody else is in the Circle yet.','Noch niemand sonst ist im Circle.','Aún no hay nadie más en el Circle.'))+'</p>';
 else{const q=T.q.toLowerCase(),list=ppl.filter(p=>!q||p.n.toLowerCase().includes(q)).sort((a,b)=>(b.lv||0)-(a.lv||0)).slice(0,20);
  h+='<input class="cr-q" type="search" data-cr="q" value="'+esc(T.q)+'" placeholder="'+esc(L('Search by name','Nach Namen suchen','Buscar por nombre'))+'" aria-label="'+esc(L('Search by name','Nach Namen suchen','Buscar por nombre'))+'"><ul class="cr-ppl">'+list.map(p=>'<li><span><b>'+esc(p.n)+'</b><small>'+esc(L('Level ','Level ','Nivel ')+(p.lv||1))+'</small></span>'+(has.has(p.uid)?'<span class="cr-in">'+ICO.check+esc(L('In your tree','Im Baum','En tu árbol'))+'</span>':'<button type="button" class="cr-btn" data-cr="addP" data-uid="'+esc(p.uid)+'"'+(full?' disabled':'')+'>'+esc(L('Add','Hinzufügen','Añadir'))+'</button>')+'</li>').join('')+'</ul>';}
 if(full)h+='<p class="cr-sub">'+esc(L('Your tree holds '+K.MAX_FRIENDS+' friends.','Dein Baum hat Platz für '+K.MAX_FRIENDS+' Freunde.','Tu árbol tiene sitio para '+K.MAX_FRIENDS+' amigos.'))+'</p>';
 return h+'</section>';}
function paintTree(focus){if(!T.ov)return;const sc=T.ov.querySelector('.cr-scroll'),top=sc?sc.scrollTop:0;T.ov.innerHTML=treeHTML();const ns=T.ov.querySelector('.cr-scroll');if(ns)ns.scrollTop=top;
 const f=focus?T.ov.querySelector(focus):null;(f||T.ov.querySelector('.cr-x')).focus({preventScroll:true});}
function openTree(){if(T.ov)return;closeRoom();T.back=D.activeElement;T.sel='';T.adding=false;T.q='';T.msg='';T.sure=false;T.ov=overlay('cr-ov-tree','crTreeTitle');paintTree();}
function closeTree(silent){if(!T.ov)return;T.ov.remove();T.ov=null;if(!silent){const b=T.back;if(b&&b.focus&&D.contains(b))b.focus({preventScroll:true});}}
function addFriend(f,src){const n=K.addFriend(friends(),{...f,src},myUid(),Date.now());if(!n)return false;write(K.FKEY,n);return true;}
function share(){const url=K.inviteURL(root.location.origin+root.location.pathname,me());if(!url)return;
 const done=()=>{T.msg=L('Link copied.','Link kopiert.','Enlace copiado.');paintTree('[data-cr="share"]');};
 if(root.navigator&&navigator.share){navigator.share({title:'LOWiSPIKE',text:L('Put my cell in your friends tree on LOWiSPIKE.','Hol meine Zelle in deinen Freundesbaum bei LOWiSPIKE.','Pon mi célula en tu árbol de amigos en LOWiSPIKE.'),url}).catch(()=>{});return;}
 try{navigator.clipboard.writeText(url).then(done,()=>{const i=T.ov&&T.ov.querySelector('.cr-inv input');if(i){i.focus();i.select();}});}catch(e){const i=T.ov&&T.ov.querySelector('.cr-inv input');if(i){i.focus();i.select();}}}
/* invite link opened: ask first, never add silently */
const I={ov:null};
function inviteHTML(inv){return'<div class="cr-panel cr-invp"><button type="button" class="cr-x" data-cr="invNo" aria-label="'+esc(L('Close','Schließen','Cerrar'))+'">×</button>'+friendCell('inv',K.hue(inv.uid),{cls:'cr-fc cr-invc'})+'<h2 id="crInvTitle">'+esc(L(inv.n+' invites you to their friends tree',inv.n+' lädt dich in den Freundesbaum ein',inv.n+' te invita a su árbol de amigos'))+'</h2>'+(inv.c?'<p class="cr-sub">'+esc(L('Cell: ','Zelle: ','Célula: ')+inv.c)+'</p>':'')+
 '<p class="cr-priv">'+ICO.shield+'<span>'+esc(L('Only names, cell names and levels. No health data.','Nur Namen, Zellnamen und Level. Keine Gesundheitsdaten.','Solo nombres, nombres de célula y niveles. Sin datos de salud.'))+'</span></p><button type="button" class="cr-btn cr-go" data-cr="invYes">'+esc(L('Put in my tree','In meinen Baum','Añadir a mi árbol'))+'</button><button type="button" class="cr-link" data-cr="invNo">'+esc(L('Not now','Nicht jetzt','Ahora no'))+'</button></div>';}
function checkInvite(){const inv=K.parseInvite(root.location.search);if(!inv)return;
 try{const u=new URL(root.location.href);['friend','fn','fc'].forEach(k=>u.searchParams.delete(k));history.replaceState(history.state,'',u.pathname+u.search+u.hash);}catch(e){}
 setTimeout(()=>{if(inv.uid===myUid()||I.ov)return;T.invite=inv;I.ov=overlay('cr-ov-inv','crInvTitle');I.ov.innerHTML=inviteHTML(inv);const b=I.ov.querySelector('[data-cr="invYes"]');b&&b.focus({preventScroll:true});},2200);}
function closeInvite(){if(I.ov){I.ov.remove();I.ov=null;}}
/* ---------- entry points (friends tree only; the room door is gone since Oct 15) ---------- */
function btn(cls,act,label,icon,text){const b=D.createElement('button');b.type='button';b.className=cls;b.dataset.cr=act;b.setAttribute('aria-label',label);b.setAttribute('data-noi18n','');b.innerHTML=icon+(text?'<span>'+esc(text)+'</span>':'');return b;}
function inject(){
 const h1=D.querySelector('#tab-foryou .ls-phd .h1');if(h1&&!h1.querySelector('#crTreeBtn')){const b=btn('cr-treeb','tree',L('Friends tree','Freundesbaum','Árbol de amigos'),ICO.tree,'');b.id='crTreeBtn';h1.appendChild(b);}
 const fs=D.querySelector('.fx-sheet');if(fs&&!fs.querySelector('.cr-mrow')){const n=friends().list.length,b=btn('cr-mrow','tree',L('Friends tree','Freundesbaum','Árbol de amigos'),ICO.tree,L('Your friends tree','Dein Freundesbaum','Tu árbol de amigos')+(n?' · '+n:''));const sub=fs.querySelector('.fx-sub');sub?sub.after(b):fs.prepend(b);}}
let qd=0;const queue=()=>{if(qd)return;qd=requestAnimationFrame(()=>{qd=0;try{inject();}catch(e){}});};
/* ---------- events ---------- */
D.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-cr]');if(!b||b.tagName==='INPUT')return;const a=b.dataset.cr;
 /* Oct 15 (user): Misty's room (window, plasma cushion, decor) is retired. Old room buttons do nothing harmful. */
 if(a==='room'){e.preventDefault();e.stopPropagation();return;}
 if(a==='tree'&&!(T.ov&&T.ov.contains(b))){e.preventDefault();e.stopPropagation();try{if(D.querySelector('.fx-sheet')&&root.LowiHost&&LowiHost.closeSheet)LowiHost.closeSheet();}catch(x){}openTree();return;}
 if(I.ov&&I.ov.contains(b)){e.preventDefault();e.stopPropagation();const inv=T.invite;closeInvite();if(a==='invYes'&&inv){addFriend(inv,'link');openTree();T.sel=inv.uid;T.msg=L(inv.n+' is in your tree now.',inv.n+' ist jetzt in deinem Baum.',inv.n+' ya está en tu árbol.');paintTree();}return;}
 if(R.ov&&R.ov.contains(b)){e.preventDefault();e.stopPropagation();
  if(a==='close')closeRoom();
  else if(a==='cat'){R.cat=b.dataset.cat;R.msg='';paintRoom('tab');}
  else if(a==='toggle')toggleRoom(b.dataset.id);
  return;}
 if(T.ov&&T.ov.contains(b)){e.preventDefault();e.stopPropagation();
  if(a==='close')closeTree();
  else if(a==='addOpen'){T.adding=!T.adding||b.classList.contains('cr-empty');T.msg='';paintTree(T.adding?'.cr-add .cr-btn,.cr-add input':'.cr-go');if(T.adding){const s=T.ov.querySelector('.cr-add');s&&s.scrollIntoView&&s.scrollIntoView({block:'nearest',behavior:reduced()?'auto':'smooth'});}}
  else if(a==='friend'&&careOK()){T.sel=b.dataset.uid;T.sure=false;T.msg='';paintTree(null);careFor(T.sel);}
  else if(a==='care'){careFor(b.dataset.uid);}
  else if(a==='friend'){T.sel=T.sel===b.dataset.uid?'':b.dataset.uid;T.sure=false;T.msg='';paintTree(T.sel?'.cr-fcard .cr-btn':null);const c=T.ov.querySelector('.cr-fcard');c&&c.scrollIntoView&&c.scrollIntoView({block:'nearest',behavior:reduced()?'auto':'smooth'});}
  else if(a==='remove'){if(!T.sure){T.sure=true;paintTree('[data-cr="remove"]');}else{const f=friends().list.find(x=>x.uid===b.dataset.uid);write(K.FKEY,K.removeFriend(friends(),b.dataset.uid));T.sel='';T.sure=false;T.msg=f?L(f.n+' is no longer in your tree.',f.n+' ist nicht mehr in deinem Baum.',f.n+' ya no está en tu árbol.'):'';paintTree('.cr-go');}}
  else if(a==='addP'){const p=roomPeople().find(x=>x.uid===b.dataset.uid);if(p&&addFriend({uid:p.uid,n:p.n},'room')){T.sel=p.uid;T.msg=L(p.n+' is in your tree now.',p.n+' ist jetzt in deinem Baum.',p.n+' ya está en tu árbol.');}paintTree('.cr-fcard .cr-btn');}
  else if(a==='share')share();
  else if(a==='miles'){closeTree(true);try{root.LowiExtras.openMiles();}catch(x){}}
  return;}
},true);
D.addEventListener('input',e=>{const t=e.target;if(!T.ov||!T.ov.contains(t)||!t.dataset||t.dataset.cr!=='q')return;T.q=t.value.slice(0,40);const pos=t.selectionStart;paintTree('.cr-q');const n=T.ov.querySelector('.cr-q');if(n&&n.setSelectionRange)try{n.setSelectionRange(pos,pos);}catch(x){}},true);
D.addEventListener('keydown',e=>{const ov=I.ov||T.ov||R.ov;if(!ov)return;if(D.querySelector('.hs-ov'))return;
 const top=D.querySelector('.r2-ov.mb-ov-top:not(.off)');if(top){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();try{root.LowiR2.close(top);}catch(x){top.remove();}}return;}
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(I.ov)closeInvite();else if(T.ov)closeTree();else closeRoom();return;}
 if(e.key==='Tab'){const f=[...ov.querySelectorAll('button:not([disabled]),input')];if(!f.length)return;const i=f.indexOf(D.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus();}else if(i<0){e.preventDefault();f[0].focus();}e.stopImmediatePropagation();}},true);
root.addEventListener('lowi:shop',e=>{if(e.detail&&e.detail.open===false&&R.ov){R.msg='';paintRoom();}});
root.addEventListener('storage',e=>{if(e.key===K.RKEY&&R.ov)paintRoom();if(e.key===K.FKEY&&T.ov)paintTree();});
/* Oct 24: own id. index.html's community-room.css link is also id="crCss", so whenever that link was parsed first (Chromium) cell-room.css never loaded and the Friends tree came up unstyled, its Add friend button squeezed under the galaxy. */
if(!D.getElementById('cellRoomCss')){const l=D.createElement('link');l.id='cellRoomCss';l.rel='stylesheet';l.href='cell-room.css?v='+(((D.querySelector('meta[name="lowi-build"]')||{}).content)||'');D.head.appendChild(l);}
function boot(){if(!D.body){setTimeout(boot,50);return;}new MutationObserver(queue).observe(D.body,{childList:true,subtree:true});queue();checkInvite();}
boot();
/* openRoom is no longer exported: Misty's room is retired (Oct 15), so no screen offers a door to it. */
root.LowiCellRoom={onePerName,closeRoom,openTree,closeTree,people:()=>onePerName(roomPeople()),isOpen:()=>!!(R.ov||T.ov),friends:()=>friends().list.slice(),room:()=>read(K.RKEY,K.cleanRoom)};
})(window);
