/* Oct 28 2026 (Emmanuel, voice message about Community > Raum: "mach daraus das Billard-Spiel ... Scheiss auf dieses Rauszoomen und
   Reinzoomen ... so halt Billardtisch ... habt ihr die Kugeln drauf ... Es soll wie ein Billard-Spiel funktionieren, aber halt mit
   Energy Blasts ... ob du offline bist oder nicht, das juckt mich doch nicht. Ich moechte sehen, dass du da rumrollst, dass wenn du
   online kommst, du merkst, dass du nicht mehr an der selben Position bist").
   The Room is a Billardtisch now: one fixed table that always fits the screen (no endless map, no zoom, no "Neues Bild" bubbles).
   Everyone in the Room is a ball with their companion on it. Pull back anywhere on the table and let go: an energy blast leaves
   your ball, the first ball it touches takes the hit and it is billiards from there (room-table-core.js).
   Shared and persisted: the shooter's phone computes the whole shot at once (deterministic), writes where every moved ball came to
   rest to public.companion_rest (table coordinates, online or offline does not matter) and broadcasts the shot with its start
   positions; every other phone in the Room replays the same shot and sees the same roll. Phones that were away read the rows when
   they open the Room; your own ball rolls from where you last saw it to where it was knocked, with a note who knocked it.
   Oct 28 2026, later (Emmanuel, call: "I want the energy blast to also ... jump out of the wall ... just like billiard ... if I'm at
   the wall, shoot it at the wall, it should bounce me off ... I want everyone to fight for being in the middle ... every hour of you
   being in the middle, you get points"): the blast ricochets off the cushions and can bounce back into you (room-table-core.js);
   the aiming guide shows the bounce. The middle ring: whoever's ball sits inside it closest to the centre holds it (gold ring).
   Holding it pays MID_XP (+10) for every full hour, at most MID_CAP (8) hours a day, through award() with one eventId per hold
   and hour (never twice). The hour is measured on the SERVER's clock (the Date header of a Supabase request, carried on with the
   monotonic performance.now(), so changing the phone's clock does nothing) and a hold only goes on across a gap if your ball sat
   on the very same spot (nobody moved it). No timer, no schedule: the app looks when the Room loads its rows or a shot ends,
   and pays the hours that became due. Server-side checking would need new SQL (no Supabase access from here): the cap and the
   fair-play triggers bound what a tampered phone can get. */
(function(W){'use strict';
if(!W||!W.document)return;
const D=W.document,C=W.LowiTableCore;if(!C)return;
const T=C.T;
const COPY={
  table:['Pool table: everyone in the Room','Billardtisch: alle im Raum','Mesa de billar: todos en la sala'],
  stick:['Aim stick: pull back, let go to shoot','Zielstick: zurückziehen, loslassen zum Stoßen','Palanca de tiro: tira hacia atrás y suelta para tirar'],
  board:['Scoreboard','Punktetafel','Marcador'],
  sbMid:['Middle','Mitte','Centro'],
  sbNobody:['Nobody yet','Noch niemand','Nadie aún'],
  sbYouFor:['You · {t}','Du · {t}','Tú · {t}'],
  sbDay:['You today','Du heute','Tú hoy'],
  sbDayV:['{h}/{c} h · +{x} XP','{h}/{c} Std · +{x} XP','{h}/{c} h · +{x} XP'],
  sbRoom:['Players','Spieler','Jugadores'],
  sbRoomV:['{n} in the room','{n} im Raum','{n} en la sala'],
  /* Nov 6 2026 tables of 24: the line names your table; the invite brings a friend to it when it has room */
  sbTableV:['{n} at table {t}','{n} an Tisch {t}','{n} en la mesa {t}'],
  invite:['Invite to my table','An meinen Tisch einladen','Invitar a mi mesa'],
  inviteText:['Come and play at my table in LOWiSPIKE','Komm an meinen Tisch in LOWiSPIKE','Ven a jugar a mi mesa en LOWiSPIKE'],
  inviteCopied:['Link copied','Link kopiert','Enlace copiado'],
  sbMin:['{m} min','{m} Min','{m} min'],
  sbHour:['{h} h {m} min','{h} Std {m} Min','{h} h {m} min'],
  pushed:['{n} knocked you away while you were gone','{n} hat dich weggestoßen, während du weg warst','{n} te empujó mientras no estabas'],
  pushedAnon:['Someone knocked you away while you were gone','Jemand hat dich weggestoßen, während du weg warst','Alguien te empujó mientras no estabas'],
  hitYou:['{n} knocked you','{n} hat dich getroffen','{n} te golpeó'],
  you:['You','Du','Tú'],
  ball:['{n}: tap to write to them','{n}: tippen, um ihr oder ihm zu schreiben','{n}: toca para escribirle'],
  meBall:['You: tap to write to everyone','Du: tippen, um allen zu schreiben','Tú: toca para escribir a todos'],
  shot:['Energy blast at {n}','Energy Blast auf {n}','Energy blast a {n}'],
  miss:['Energy blast into the cushion','Energy Blast in die Bande','Energy blast a la banda'],
  selfHit:['Your blast bounced back and knocked you','Dein Blast ist abgeprallt und hat dich weggestoßen','Tu blast rebotó y te empujó'],
  midYou:['Your middle · +{x} XP in {m} min','Deine Mitte · +{x} XP in {m} min','Tu centro · +{x} XP en {m} min'],
  midHold:['Your middle','Deine Mitte','Tu centro'],
  midCap:['Your middle · 8 h paid today','Deine Mitte · heute 8 Std bezahlt','Tu centro · hoy 8 h cobradas'],
  midOther:['Middle: {n}','Mitte: {n}','Centro: {n}'],
  /* Nov 7 2026: how long the holder has been in the middle and what that hold has earned */
  midOtherFor:['Middle: {n} · {t} · +{x} XP','Mitte: {n} · {t} · +{x} XP','Centro: {n} · {t} · +{x} XP'],
  sbHeld:['{t} · +{x} XP','{t} · +{x} XP','{t} · +{x} XP'],
  midFree:['Middle · 1 h = +{x} XP','Mitte · 1 Std = +{x} XP','Centro · 1 h = +{x} XP'],
  someone:['Someone','Jemand','Alguien'],
  midXp:['1 hour in the middle of the pool table','1 Stunde in der Mitte vom Billardtisch','1 hora en el centro de la mesa de billar']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k,n,o){let s=String(COPY[k][lang()]||COPY[k][0]).replace('{n}',n==null?'':n);if(o)for(const q in o)s=s.split('{'+q+'}').join(String(o[q]));return s;}
const reduced=()=>!!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const realUid=u=>typeof u==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u);
const OFF_KEY='lowi:rt-off',SEEN_KEY='lowi:rt-seen';
let off=false;try{off=localStorage.getItem(OFF_KEY)==='1';}catch(e){}

const rest=C.table();          /* where every ball rests (the shared truth on this phone) */
let play=null,playEnd=null;    /* a shot being animated: its own table, and the rest positions it must end on */
let gal=null,wrap=null,felt=null,fx=null,ctx=null,ballsEl=null,toastEl=null,liveEl=null,stickEl=null,midEl=null,boardEl=null;
let scale=.3,dpr=1,fw=0,fh=0,raf=0,acc=0,lastT=0;
let people=[],peopleKey='',me='',sel='';
let tableNo=0,members=null;   /* Nov 6 2026 tables of 24: your table and its members (null = no tables yet, everyone) */
const els=new Map(),arts=new Map(),trails=new Map(),sparks=[];
const hold=new Map();          /* uid -> time until which a database row must not move this ball (a shot just wrote it) */
const seenIds=new Set();
let aim=null,down=null,tween=null,lastLoad=0,loading=null,loaded=false,pendingNote=null,pollT=0;
const stats={shots:0,remote:0,loads:0,rowsIn:0,rowsOut:0,rowErr:0,frames:0,jsMs:0,slow:0,maxDt:0,notes:0,lastShot:null,lastRemote:null};

function mapApi(){return W.LowiCgMap||null;}
function cloud(){return W.LOWI_CLOUD_X||null;}
function myUid(){try{const m=mapApi(),u=m&&m.me?m.me():'';if(u)return u;const c=cloud(),st=c&&c.state?c.state():null;return (st&&st.uid)||'';}catch(e){return '';}}
function active(){return !off;}
function visible(){return !!(wrap&&wrap.isConnected&&gal&&gal.offsetParent!==null&&!D.hidden&&gal.clientWidth>0);}
function nameOf(uid){const p=people.find(x=>x.uid===uid);return p?(p.me?tr('you'):p.label):'';}

/* ---------- DOM ---------- */
function build(g){gal=g;g.classList.add('rt-on');
  wrap=D.createElement('div');wrap.className='rt-wrap';
  wrap.innerHTML='<div class="rt-rail"><div class="rt-felt" role="group"><canvas class="rt-fx" aria-hidden="true"></canvas><div class="rt-mid"></div><div class="rt-balls"></div></div>'+
    '<span class="rt-pocket p1" aria-hidden="true"></span><span class="rt-pocket p2" aria-hidden="true"></span><span class="rt-pocket p3" aria-hidden="true"></span><span class="rt-pocket p4" aria-hidden="true"></span><span class="rt-pocket p5" aria-hidden="true"></span><span class="rt-pocket p6" aria-hidden="true"></span></div>'+
    '<div class="rt-toast" role="status" aria-live="polite"></div>'+
    '<div class="rt-stick" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i class="rt-pull" aria-hidden="true"></i><i class="rt-well" aria-hidden="true"></i>'+
      '<span class="rt-knob" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="6.2"/><path d="M12 2.8v4M12 17.2v4M2.8 12h4M17.2 12h4"/><circle cx="12" cy="12" r="1.6" class="rt-dot"/></svg></span></div>'+
    '<div class="rt-board" role="group"><div class="rt-row rt-r-mid"><span class="rt-k"><i class="rt-ring" aria-hidden="true"></i><span class="rt-kt"></span></span><b class="rt-v"></b></div>'+
      '<div class="rt-row rt-r-day"><span class="rt-k"><span class="rt-kt"></span></span><b class="rt-v"></b></div><div class="rt-row rt-r-n"><span class="rt-k"><span class="rt-kt"></span></span><b class="rt-v"></b></div>'+
      '<button type="button" class="rt-inv" hidden></button></div>'+
    '<span class="sr-only rt-live" aria-live="polite"></span>';
  felt=wrap.querySelector('.rt-felt');fx=wrap.querySelector('.rt-fx');ctx=fx.getContext&&fx.getContext('2d');ballsEl=wrap.querySelector('.rt-balls');
  toastEl=wrap.querySelector('.rt-toast');stickEl=wrap.querySelector('.rt-stick');liveEl=wrap.querySelector('.rt-live');midEl=wrap.querySelector('.rt-mid');boardEl=wrap.querySelector('.rt-board');
  felt.setAttribute('aria-label',tr('table'));stickEl.setAttribute('aria-label',tr('stick'));boardEl.setAttribute('aria-label',tr('board'));boardT='';
  const inv=boardEl.querySelector('.rt-inv');if(inv)inv.addEventListener('click',e=>{e.stopPropagation();invite();});
  g.appendChild(wrap);els.clear();wire();layout();
  try{if(W.ResizeObserver){const ro=new ResizeObserver(()=>{layout();render();});ro.observe(g);}}catch(e){}}
function layout(){if(!wrap||!gal)return;const gw=gal.clientWidth,gh=gal.clientHeight;if(!gw||!gh)return;
  /* 5 Nov 2026, later (Emmanuel: "Look at where the billiard is, look at where the joystick is ... Just redesign it ... a nice billiard
     that's centered, the joystick ... reachable, big enough ... there's so much space there ... put something there like a
     scoreboard"): one control row (aim stick + scoreboard) just above the round back button, the table centred in all the space
     above it, both ways (room-table-core.js roomLayout). */
  const L=C.roomLayout({gw,gh,backTop:backTop(gh)}),rail=L.rail;scale=L.scale;fw=L.fw;fh=L.fh;
  const r=wrap.querySelector('.rt-rail');r.style.cssText='left:'+L.table.left+'px;top:'+L.table.top+'px;width:'+L.table.width+'px;height:'+L.table.height+'px;--rail:'+rail+'px';
  felt.style.cssText='left:'+rail+'px;top:'+rail+'px;width:'+fw+'px;height:'+fh+'px';
  wrap.style.setProperty('--d',Math.round(2*T.R*scale)+'px');
  dpr=Math.min(2,W.devicePixelRatio||1);fx.width=Math.round(fw*dpr);fx.height=Math.round(fh*dpr);fx.style.width=fw+'px';fx.style.height=fh+'px';
  toastEl.style.top=(L.table.top+rail+8)+'px';
  if(stickEl)stickEl.style.cssText='left:'+L.stick.left+'px;top:'+L.stick.top+'px;width:'+L.stick.size+'px;height:'+L.stick.size+'px';
  if(boardEl)boardEl.style.cssText=L.board?'left:'+L.board.left+'px;top:'+L.board.top+'px;width:'+L.board.width+'px;height:'+L.board.height+'px':'display:none';
  board();}
/* the round back button at the bottom centre (bottom-close.js #lwBX): its top edge in the table's box, measured so every safe area
   and phone works; null when it is not showing or not down there */
/* Nov 7 2026 (Emmanuel, screenshot: "why is the billiard getting smaller when the thing opens?"): a card at the bottom (the evening
   "Deine Blase" invite) lifts the round back button above it for a while (bottom-close.js --bx-lift); the table is laid out against
   the button's resting place, so it no longer shrinks while such a card is open */
function backTop(gh){try{const x=D.getElementById('lwBX'),g=gal.getBoundingClientRect();if(!x||!x.classList.contains('on'))return null;const b=x.getBoundingClientRect();
  const lift=parseFloat(getComputedStyle(x).getPropertyValue('--bx-lift'))||0,top=b.top+Math.max(0,lift);
  return b.height&&top>g.top+gh*.4&&top<g.bottom+40?top-g.top:null;}catch(e){return null;}}
/* the scoreboard: the fight for the middle at a glance, only from what the table already knows (no new data): who holds the middle
   (you: for how long, on the server's clock), your paid middle hours today (+MID_XP each, at most MID_CAP) and how many are in the
   Room. Written only when a line changes. */
let boardT='';
/* Nov 7 2026: since when each ball rests where it is (server ms: the row's updated_at, or the end of a shot seen here) */
const restAt=new Map();
function heldFor(uid){const t=restAt.get(uid),now=isFinite(srvNow())?srvNow():Date.now();return t&&isFinite(t)&&now>=t?now-t:NaN;}
function dur(ms){const m=Math.max(0,Math.floor(ms/60000));return m<60?tr('sbMin',null,{m}):tr('sbHour',null,{h:Math.floor(m/60),m:m%60});}
function board(){if(!boardEl)return;const mh=midShown,o=midLoad(),now=srvNow(),st=o.st;
  const mid=mh&&mh===me?(st&&st.u===me&&isFinite(now)&&isFinite(st.since)?tr('sbYouFor',null,{t:dur(now-st.since)}):tr('you')):mh?(nameOf(mh)||tr('someone')):tr('sbNobody');
  /* Nov 7 2026: someone else holds it: how long, and the points that hold has made (yours: the line above already says how long) */
  const hf=mh&&mh!==me?heldFor(mh):(mh===me&&st&&st.u===me&&isFinite(now)&&isFinite(st.since)?now-st.since:NaN);
  const held=isFinite(hf)?tr('sbHeld',null,{t:dur(hf),x:C.midPoints(hf)}):'';
  const h=isFinite(now)&&o.d===dayOf(now)?Math.min(T.MID_CAP,o.n|0):0;
  const rows=[[tr('sbMid'),mid],[tr('sbDay'),tr('sbDayV',null,{h,c:T.MID_CAP,x:h*T.MID_XP})],[tr('sbRoom'),tableNo?tr('sbTableV',people.length,{t:tableNo}):tr('sbRoomV',people.length)]];
  const key=JSON.stringify(rows)+held+(mh===me?'m':mh?'o':'')+(tableNo?'t':'');if(key===boardT)return;boardT=key;
  const inv=boardEl.querySelector('.rt-inv');if(inv){inv.hidden=!tableNo;inv.textContent=tr('invite');}
  ['.rt-r-mid','.rt-r-day','.rt-r-n'].forEach((q,i)=>{const el=boardEl.querySelector(q),k=el&&el.querySelector('.rt-kt'),v=el&&el.querySelector('.rt-v');if(k)k.textContent=rows[i][0];if(v)v.textContent=rows[i][1];});
  /* the holder's name may be cut, the time and points never: they get their own line under it */
  const mv=boardEl.querySelector('.rt-r-mid .rt-v');if(mv){let h=mv.querySelector('.rt-vt');if(held&&mh!==me){if(!h){h=D.createElement('small');h.className='rt-vt';mv.appendChild(h);}h.textContent=held;}else if(h)h.remove();}
  boardEl.classList.toggle('held',!!mh);boardEl.classList.toggle('mine',!!mh&&mh===me);}
function stickAim(dx,dy,r){const k=Math.max(90,Math.min(170,fw*.42))/Math.max(1,r);return C.aim(dx*k,dy*k,Math.max(90,Math.min(170,fw*.42)));}
function ballEl(p){let el=els.get(p.uid);if(el&&el.isConnected)return el;
  el=D.createElement('button');el.type='button';el.className='rt-ball'+(p.me?' me':'');el.dataset.uid=p.uid;el.setAttribute('data-sfx','none');
  let art=arts.get(p.uid);if(art==null){const m=mapApi();art=(m&&m.art)?m.art(p.me?(me||'me'):p.uid,'bt'+(arts.size+1)):'';arts.set(p.uid,art);}
  const ini=Array.from(String(p.label||'?').trim())[0]||'?';
  el.innerHTML='<span class="rt-orb" style="--c:'+esc(p.c||'#9cc')+'"><span class="rt-art">'+(art||'<span class="rt-ini">'+esc(ini)+'</span>')+'</span><span class="rt-gloss" aria-hidden="true"></span></span><span class="rt-name">'+esc(p.me?tr('you'):p.label)+'</span>';
  el.setAttribute('aria-label',p.me?tr('meBall'):tr('ball',p.label));ballsEl.appendChild(el);els.set(p.uid,el);return el;}

/* ---------- people on the table ---------- */
function sync(){const m=mapApi();if(!m||!m.people)return;let list=[];try{list=m.people()||[];}catch(e){list=[];}
  list=C.atTable(list,members);   /* Nov 6 2026: only your table's balls (everyone while there are no tables yet) */
  me=myUid();if(!me&&!list.some(p=>p.me))list.unshift({uid:'me',me:true,n:'',label:tr('you'),c:'#9cdac7'});
  try{sel=m.selected?m.selected()||'':'';}catch(e){sel='';}
  const key=list.map(p=>p.uid+':'+p.label).join('|');
  if(key!==peopleKey){peopleKey=key;people=list;const ids=list.map(p=>p.uid);
    /* new balls: saved position, else their spot from the uid */
    const have={};for(const b of rest.balls())have[b.uid]={x:b.x,y:b.y};const missing=ids.filter(u=>!have[u]);
    if(missing.length){const fixed={};for(const u in have)if(ids.indexOf(u)>=0)fixed[u]=have[u];const sp=C.homeSpots(missing,fixed);for(const u of missing){const s=saved.get(u)||sp[u];rest.set(u,s.x,s.y);}}
    rest.keep(ids);rest.relax(20);
    for(const [u,el] of els)if(ids.indexOf(u)<0){el.remove();els.delete(u);}
    for(const p of list)ballEl(p);}
  for(const [u,el] of els){el.classList.toggle('sel',!!sel&&u===sel);const p=people.find(x=>x.uid===u);if(p&&!p.me)el.setAttribute('aria-pressed',String(u===sel));}
  render();}

/* ---------- drawing ---------- */
function posOf(uid){if(tween&&tween.uid===uid){return tween.at;}if(play){const b=play.find(uid);if(b)return b;}return rest.find(uid);}
function render(){if(!wrap)return;const d=2*T.R*scale;const mh=play?midShown:(midShown=C.midHolder(rest.balls()));
  for(const [u,el] of els){const b=posOf(u);if(!b){el.style.display='none';continue;}if(el.style.display==='none')el.style.display='';
    if(el._mid!==(u===mh)){el._mid=u===mh;el.classList.toggle('mid',el._mid);}
    const x=b.x*scale-d/2,y=b.y*scale-d/2;const tf='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';if(el._tf!==tf){el.style.transform=tf;el._tf=tf;}
    const sp=Math.round((b.spin||0)*114.6)/114.6;if(el._sp!==sp){const a=el.firstChild&&el.firstChild.firstChild;if(a)a.style.transform='rotate('+(sp*57.2958).toFixed(1)+'deg)';el._sp=sp;}}
  midLine(mh);if(!play&&!tween)board();draw();}
function midLine(mh){if(!midEl)return;let t;
  if(mh&&mh===me&&realUid(me)&&midInfo.u===me&&midInfo.at&&performance.now()-midInfo.at<20*60000){t=midInfo.cap?tr('midCap'):tr('midYou',null,{x:T.MID_XP,m:Math.max(1,Math.ceil((midInfo.next-(performance.now()-midInfo.at))/60000))});}
  else if(mh&&mh===me)t=tr('midHold');
  else if(mh){const hf=heldFor(mh);t=isFinite(hf)?tr('midOtherFor',nameOf(mh)||tr('someone'),{t:dur(hf),x:C.midPoints(hf)}):tr('midOther',nameOf(mh)||tr('someone'));}else t=tr('midFree',null,{x:T.MID_XP});
  if(midEl._t!==t){midEl._t=t;midEl.textContent=t;}midEl.classList.toggle('on',!!mh);
  /* the line sits on the felt right under the ring */
  const l=Math.round(T.MID_X*scale)+'px',tp=Math.round((T.MID_Y+T.MID_R)*scale+3)+'px';if(midEl.style.left!==l)midEl.style.left=l;if(midEl.style.top!==tp)midEl.style.top=tp;}
function draw(){if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,fw,fh);const k=scale,now=performance.now();
  /* the middle: a ring round the centre; gold while someone holds it */
  {const mh=midShown,mx=T.MID_X*k,my=T.MID_Y*k,mr=T.MID_R*k;ctx.save();ctx.beginPath();ctx.arc(mx,my,mr,0,Math.PI*2);
    ctx.fillStyle=mh?(mh===me?'rgba(255,214,120,.17)':'rgba(255,214,120,.10)'):'rgba(143,231,255,.06)';ctx.fill();
    ctx.setLineDash([4,5]);ctx.lineWidth=1.5;ctx.strokeStyle=mh?'rgba(255,214,120,.75)':'rgba(143,231,255,.38)';ctx.stroke();ctx.setLineDash([]);ctx.restore();}
  /* trails behind rolling balls */
  for(const [u,tr0] of trails){if(!tr0.length){trails.delete(u);continue;}ctx.lineCap='round';
    for(let i=1;i<tr0.length;i++){const a=tr0[i-1],b=tr0[i],age=(now-b.t)/650;if(age>=1)continue;ctx.strokeStyle='rgba(120,210,255,'+(.42*(1-age)*(i/tr0.length)).toFixed(3)+')';ctx.lineWidth=Math.max(1.5,T.R*k*.7*(i/tr0.length));ctx.beginPath();ctx.moveTo(a.x*k,a.y*k);ctx.lineTo(b.x*k,b.y*k);ctx.stroke();}
    while(tr0.length&&now-tr0[0].t>650)tr0.shift();}
  /* aiming: power ring round your ball, dotted guide to the first ball the blast will touch, a ghost where it touches */
  const mb=rest.find(me||'me');
  if(aim&&aim.p>0&&mb&&!play){const x=mb.x*k,y=mb.y*k,R=T.R*k,g=C.guidePath(rest.balls(),mb.uid,mb.x+aim.dx*(T.R+T.BR+1),mb.y+aim.dy*(T.R+T.BR+1),aim.dx,aim.dy,2);
    /* the dotted guide follows the ricochet: up to two cushions, to the first ball it touches (your own ball too, after a cushion) */
    ctx.save();ctx.strokeStyle='rgba(140,220,255,.85)';ctx.lineWidth=2;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(x+aim.dx*(R+4),y+aim.dy*(R+4));for(let i=1;i<g.pts.length;i++)ctx.lineTo(g.pts[i].x*k,g.pts[i].y*k);ctx.stroke();ctx.setLineDash([]);
    for(let i=1;i<g.pts.length-(g.uid?1:0);i++){ctx.fillStyle='rgba(140,220,255,.7)';ctx.beginPath();ctx.arc(g.pts[i].x*k,g.pts[i].y*k,2.5,0,Math.PI*2);ctx.fill();}
    if(g.uid){const L=g.pts.length,a0=g.pts[L-2]||g.pts[0],gx=g.x-a0.x,gy=g.y-a0.y,gl=Math.hypot(gx,gy)||1,ux=gx/gl,uy=gy/gl;ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(g.x*k,g.y*k,T.BR*k+2,0,Math.PI*2);ctx.stroke();const hb=rest.find(g.uid);if(hb){ctx.strokeStyle=g.self?'rgba(255,170,90,.95)':'rgba(255,214,120,.8)';ctx.beginPath();ctx.moveTo(hb.x*k,hb.y*k);ctx.lineTo((hb.x+ux*T.R*2.2)*k,(hb.y+uy*T.R*2.2)*k);ctx.stroke();}}
    ctx.strokeStyle='rgba(255,'+Math.round(230-120*aim.p)+','+Math.round(120-90*aim.p)+',.95)';ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(x,y,R+5,-Math.PI/2,-Math.PI/2+Math.PI*2*aim.p);ctx.stroke();
    /* the energy form, pointed the way it will fly */
    const a=Math.atan2(aim.dy,aim.dx),tip=R*(1.5+aim.p*.9);ctx.translate(x,y);ctx.rotate(a);const gr=ctx.createLinearGradient(R*.6,0,tip,0);gr.addColorStop(0,'rgba(90,200,255,.0)');gr.addColorStop(1,'rgba(200,245,255,.95)');
    ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(R*.75,-R*.42);ctx.lineTo(tip,0);ctx.lineTo(R*.75,R*.42);ctx.closePath();ctx.fill();ctx.restore();}
  /* the blast in flight */
  const bl=play&&play.blast();if(bl){const x=bl.x*k,y=bl.y*k,r=Math.max(3.5,T.BR*k*1.3);ctx.save();const g2=ctx.createRadialGradient(x,y,0,x,y,r*3);g2.addColorStop(0,'rgba(255,255,255,1)');g2.addColorStop(.3,'rgba(120,220,255,.9)');g2.addColorStop(1,'rgba(40,120,255,0)');
    ctx.fillStyle=g2;ctx.beginPath();ctx.arc(x,y,r*3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(140,225,255,.6)';ctx.lineWidth=r*1.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-bl.ux*r*7,y-bl.uy*r*7);ctx.stroke();ctx.restore();}
  /* sparks where something hit */
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i],age=(now-s.t)/s.life;if(age>=1){sparks.splice(i,1);continue;}const r=s.r*(0.4+age*1.4);ctx.strokeStyle='rgba('+s.c+','+(1-age).toFixed(3)+')';ctx.lineWidth=2*(1-age)+.5;ctx.beginPath();ctx.arc(s.x*k,s.y*k,r,0,Math.PI*2);ctx.stroke();}}
function spark(x,y,c,r,life){if(reduced())return;sparks.push({x,y,c:c||'160,230,255',r:r||T.R*scale*.9,t:performance.now(),life:life||420});if(sparks.length>30)sparks.shift();}
function trailAdd(b,now){if(reduced())return;let t=trails.get(b.uid);if(!t){t=[];trails.set(b.uid,t);}const l=t[t.length-1];if(!l||Math.abs(l.x-b.x)+Math.abs(l.y-b.y)>6){t.push({x:b.x,y:b.y,t:now});if(t.length>18)t.shift();}}

/* ---------- the loop: fixed 120 Hz table steps, drawn every frame, only while something moves ---------- */
function kick(){watch();if(raf)return;raf=requestAnimationFrame(frame);}
/* a phone that stops drawing frames (Low Power, a stalled WebView, a headless engine) must not leave a shot hanging half-way:
   if no frame came for 1.2 s while a shot plays, it jumps to where it ends (the same end every phone computes) */
let wdT=0,wdF=-1;function watch(){if(wdT)return;wdF=stats.frames;wdT=setTimeout(()=>{wdT=0;if(!play)return;
  if(stats.frames===wdF){if(play.moving())play.settle();finishPlay();render();}else watch();},1200);}
function frame(ts){raf=0;const j0=performance.now();const fresh=!lastT,dt=fresh?1/60:Math.min(.1,(ts-lastT)/1000);lastT=ts;stats.frames++;if(!fresh){if(dt>stats.maxDt)stats.maxDt=dt;if(dt>1/40)stats.slow++;}
  const now=performance.now();
  if(play){acc+=dt;let n=0;while(acc>=T.DT&&n<16){const nh=play.hits().length;play.step();n++;acc-=T.DT;
      const hs=play.hits();for(let i=nh;i<hs.length;i++){const h=hs[i];if(h.k==='blast'){const b=play.find(h.uid);if(b)spark(b.x,b.y,'255,236,150',T.R*scale*1.4,520);onBlastHit(h.uid);}else if(h.k==='ball'&&h.v>250){const a=play.find(h.a),b=play.find(h.b);if(a&&b)spark((a.x+b.x)/2,(a.y+b.y)/2,'200,240,255',T.R*scale*.6,300);}else if(h.k==='fizzle')spark(h.x,h.y,'120,200,255',T.R*scale,380);else if(h.k==='cushion')spark(h.x,h.y,'170,235,255',T.R*scale*.55,300);}
      if(!play.moving())break;}
    if(n>=16)acc=0;
    for(const b of play.balls())if(b.vx||b.vy)trailAdd(b,now);
    /* a phone that draws far too slowly (or was stuck) does not hold the table hostage: after 25 s on the clock the shot jumps to where it ends */
    if(play&&!play.moving()||play&&play.steps()>T.MAXSTEPS||play&&Date.now()-(play._t0||Date.now())>25000){if(play.moving())play.settle();finishPlay();}}
  if(tween){const t=Math.min(1,(now-tween.t0)/tween.ms),e=1-Math.pow(1-t,3);tween.at={x:tween.a.x+(tween.b.x-tween.a.x)*e,y:tween.a.y+(tween.b.y-tween.a.y)*e,spin:tween.spin*e};trailAdd({uid:tween.uid,x:tween.at.x,y:tween.at.y},now);if(t>=1){tween=null;}}
  render();stats.jsMs+=performance.now()-j0;
  if(play||tween||aim||sparks.length||trails.size)kick();else lastT=0;}
function finishPlay(){if(!play)return;const end=playEnd||play.snapshot();for(const b of play.balls()){const r=rest.find(b.uid);if(r)r.spin=b.spin;}
  for(const r of end){if(rest.find(r[0]))rest.set(r[0],r[1],r[2]);saved.set(r[0],{x:r[1],y:r[2]});}
  play=null;playEnd=null;acc=0;rest.relax(10);const mb=rest.find(me);if(mb)seen(mb.x,mb.y);midCheck();}

/* ---------- shooting ---------- */
function rid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function fire(dx,dy,p){const by=me||'me';if(!rest.find(by))return false;if(play){play.settle();finishPlay();}tween=null;
  const start=rest.snapshot();rest.load(start);const res=C.simulate(start,by,dx,dy,p);if(!res)return false;
  play=C.table();play.load(start);for(const b of play.balls()){const r=rest.find(b.uid);if(r)b.spin=r.spin||0;}play.shoot(by,dx,dy,p);play._mine=true;play._t0=Date.now();playEnd=res.final;acc=0;
  const id=rid(),now=Date.now();stats.shots++;stats.lastShot={id,hit:res.hit,self:!!res.self,cushions:res.cushions|0,moved:res.moved.length,steps:res.steps};seenIds.add(id);
  for(const r of res.moved)hold.set(r[0],now+20000);
  {const sn=isFinite(srvNow())?srvNow():now;for(const r of res.moved)restAt.set(r[0],sn);}   /* a moved ball starts resting again */
  /* everyone else in the Room replays it from the same start */
  try{const c=cloud();if(c&&c.energyShot&&realUid(by))c.energyShot(C.pack({id,by,n:(people.find(x=>x.me)||{}).n||'',t:now,dx,dy,p,s:start,f:res.final}));}catch(e){}
  /* and where everyone came to rest is saved, also for the ones who are not here */
  persist(res.moved);
  if(liveEl)liveEl.textContent=res.self?tr('selfHit'):res.hit?tr('shot',nameOf(res.hit)):tr('miss');
  try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}
  kick();return res;}
const giftAt=new Map();
function onBlastHit(uid){if(!play)return;
  /* a direct hit on a real member from your own shot still sends them energy (the same checks and limits as before) */
  if(play._mine&&uid!==me&&realUid(uid)){const t=giftAt.get(uid)||0,now=Date.now();if(now-t>60000){giftAt.set(uid,now);try{const m=mapApi();if(m&&m.energy&&m.energy(uid)==='sent'&&W.LowiEnergy&&W.LowiEnergy.gift)W.LowiEnergy.gift(uid);}catch(e){}}}
  if(uid===me&&play._by&&play._by!==me)toast(tr('hitYou',play._byName||nameOf(play._by)||'?'),2600);}
function remote(raw){const m=C.unpack(raw);if(!m)return false;if(m.by===me||seenIds.has(m.id))return false;if(members&&!members.has(m.by))return false;   /* a shot at another table */seenIds.add(m.id);if(seenIds.size>200)seenIds.delete(seenIds.values().next().value);
  stats.remote++;stats.lastRemote={id:m.id,by:m.by,n:m.s.length};if(play){play.settle();finishPlay();}tween=null;
  const res=C.simulate(m.s,m.by,m.dx,m.dy,m.p,m.legacy);const end=(m.f&&m.f.length)?m.f:(res?res.final:m.s);
  play=C.table();play.load(m.s);play._t0=Date.now();play._by=m.by;play._byName=m.n;if(!play.shoot(m.by,m.dx,m.dy,m.p,m.legacy)){play=null;for(const r of end){if(rest.find(r[0]))rest.set(r[0],r[1],r[2]);saved.set(r[0],{x:r[1],y:r[2]});}render();return true;}
  playEnd=end;acc=0;const now=Date.now();for(const r of end)hold.set(r[0],now+20000);
  {const sn=isFinite(srvNow())?srvNow():now,was={};for(const q of m.s||[])was[q[0]]=q;for(const r of end){const q=was[r[0]];if(!q||Math.abs(q[1]-r[1])>1||Math.abs(q[2]-r[2])>1)restAt.set(r[0],sn);}}
  if(!visible()){play.settle();finishPlay();render();return true;}kick();return true;}

/* ---------- input: tap a ball = write to them; pull back anywhere = aim; let go = blast ---------- */
function local(e){const r=felt.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function wire(){
  felt.addEventListener('pointerdown',e=>{if(e.button>0)return;e.stopPropagation();const p=local(e),t=e.target&&e.target.closest?e.target.closest('.rt-ball'):null;
    down={id:e.pointerId,x:p.x,y:p.y,t:performance.now(),uid:t?t.dataset.uid:''};try{felt.setPointerCapture(e.pointerId);}catch(x){}if(e.cancelable)e.preventDefault();});
  felt.addEventListener('pointermove',e=>{if(!down||e.pointerId!==down.id)return;e.stopPropagation();const p=local(e),dx=p.x-down.x,dy=p.y-down.y;
    if(!aim&&Math.hypot(dx,dy)<10)return;const a=C.aim(dx,dy,Math.max(90,Math.min(170,fw*.42)));aim=a?{dx:a.dx,dy:a.dy,p:a.p}:null;kick();});
  const up=(e,cancel)=>{if(!down||e.pointerId!==down.id)return;e.stopPropagation();const d=down;down=null;try{felt.releasePointerCapture(e.pointerId);}catch(x){}
    if(aim){const a=aim;aim=null;if(!cancel&&a.p>=.08)fire(a.dx,a.dy,a.p);kick();return;}
    if(!cancel&&d.uid&&performance.now()-d.t<700)tap(d.uid);};
  felt.addEventListener('pointerup',e=>up(e,false));felt.addEventListener('pointercancel',e=>up(e,true));
  let stk=null;const knob=stickEl.querySelector('.rt-knob');
  const stickShow=(dx,dy)=>{knob.style.transform=dx||dy?'translate('+dx+'px,'+dy+'px)':'';stickEl.classList.toggle('on',!!stk);stickEl.setAttribute('aria-valuenow',String(aim?Math.round(aim.p*100):0));
    /* the rim fills with the shot's power while you pull (the same power as the ring round your ball) */
    stickEl.style.setProperty('--p',aim&&stk?Math.max(0,Math.min(1,aim.p)).toFixed(3):'0');};
  const stickEnd=(e,cancel)=>{if(!stk||(e&&e.pointerId!=null&&e.pointerId!==stk.id))return;if(e&&e.stopPropagation)e.stopPropagation();const id=stk.id;stk=null;
    try{stickEl.releasePointerCapture(id);}catch(x){}const a=aim;aim=null;stickShow(0,0);if(a&&!cancel&&a.p>=.08)fire(a.dx,a.dy,a.p);kick();};
  stickEl.addEventListener('pointerdown',e=>{if(e.button>0||stk||down)return;e.stopPropagation();const b=stickEl.getBoundingClientRect();
    stk={id:e.pointerId,cx:b.left+b.width/2,cy:b.top+b.height/2,r:Math.max(24,b.width*.9)};stk.k=b.width*.3/stk.r; /* full pull: the knob is at the base's edge, it follows the thumb 1:1 in direction */aim=null;try{stickEl.setPointerCapture(e.pointerId);}catch(x){}if(e.cancelable)e.preventDefault();stickShow(0,0);});
  stickEl.addEventListener('pointermove',e=>{if(!stk||e.pointerId!==stk.id)return;e.stopPropagation();let dx=e.clientX-stk.cx,dy=e.clientY-stk.cy;const d=Math.hypot(dx,dy);
    if(d<4){aim=null;stickShow(0,0);kick();return;}if(d>stk.r){dx*=stk.r/d;dy*=stk.r/d;}const a=stickAim(dx,dy,stk.r);aim=a?{dx:a.dx,dy:a.dy,p:a.p}:null;
    stickShow(Math.round(dx*stk.k),Math.round(dy*stk.k));kick();});
  stickEl.addEventListener('pointerup',e=>stickEnd(e,false));stickEl.addEventListener('pointercancel',e=>stickEnd(e,true));
  stickEl.addEventListener('lostpointercapture',e=>stickEnd(e,true));
  for(const ev of ['touchstart','touchmove','dblclick'])stickEl.addEventListener(ev,e=>{e.stopPropagation();if(ev!=='touchstart'&&e.cancelable)e.preventDefault();},{passive:false});
  D.addEventListener('visibilitychange',()=>{if(D.visibilityState==='hidden')stickEnd(null,true);});W.addEventListener('pagehide',()=>stickEnd(null,true));W.addEventListener('blur',()=>stickEnd(null,true));
  /* keyboard / switch control: Enter on a ball picks it */
  felt.addEventListener('click',e=>{if(e.detail!==0)return;const t=e.target&&e.target.closest?e.target.closest('.rt-ball'):null;if(t)tap(t.dataset.uid);});
  for(const ev of ['touchstart','touchmove','wheel','gesturestart','dblclick'])felt.addEventListener(ev,e=>{e.stopPropagation();if(ev!=='touchstart'&&e.cancelable)e.preventDefault();},{passive:false});}
/* 5 Nov 2026 (owner: "remove the old chat button and 'Write to the galaxy' from the Billiard page, the main Chat has it"): the
   message field is hidden on the Circle page (community-rooms.css), so "tap to write to them" opens the Chat tab with that person
   picked (your own ball: everyone), and back returns to the table. Where the field still shows, a tap only picks, as before. */
function fieldHidden(){const c=D.querySelector('#cmPaneChat .cm-compose');if(!c)return false;try{return W.getComputedStyle(c).display==='none';}catch(e){return false;}}
function toChat(){const U=W.LowiRoomsUI;if(U&&typeof U.setTab==='function'){try{U.setTab(true);}catch(e){}}}
function tap(uid){const m=mapApi();if(!m||!m.pick)return;const p=people.find(x=>x.uid===uid);if(!p)return;const go=fieldHidden();
  if(p.me||(uid===sel&&!go))m.pick(me||'me');else m.pick(uid,p.n||p.label);try{sel=m.selected?m.selected()||'':'';}catch(e){}for(const [u,el] of els)el.classList.toggle('sel',!!sel&&u===sel);
  if(go)toChat();}

/* ---------- shared positions: public.companion_rest ---------- */
const saved=new Map();         /* uid -> {x,y} last known rest position from the database or a shot */
/* the database allows one phone to move at most 60 companions a minute; a refused batch waits and goes again (newest spot per ball),
   and those balls stay where this phone put them meanwhile */
const pending=new Map();let retryT=0;
function persist(rows){for(const r of rows||[])if(realUid(r[0]))pending.set(r[0],[r[0],r[1],r[2]]);return flush();}
function flush(){if(!pending.size)return Promise.resolve(true);const batch=[...pending.values()].slice(0,40);const list=batch.map(r=>Object.assign({user_id:r[0]},C.enc(r[1],r[2])));
  stats.rowsOut+=list.length;const again=()=>{const t=Date.now();for(const r of batch)hold.set(r[0],Math.max(hold.get(r[0])||0,t+90000));if(!retryT){retryT=setTimeout(()=>{retryT=0;flush();},30000);if(retryT&&retryT.unref)retryT.unref();}return false;};
  try{const c=cloud();if(!c||!c.client)return Promise.resolve(false);
    return Promise.resolve(c.client()).then(sb=>sb&&sb.from('companion_rest').upsert(list,{onConflict:'user_id'})).then(r=>{if(!r||r.error){stats.rowErr++;return again();}
      for(const b of batch){const cur=pending.get(b[0]);if(cur&&cur[1]===b[1]&&cur[2]===b[2])pending.delete(b[0]);}if(pending.size)return flush();return true;}).catch(()=>{stats.rowErr++;return again();});}catch(e){return Promise.resolve(false);}}
function loadRows(force){const now=Date.now();if(loading)return loading;if(!force&&now-lastLoad<4000)return Promise.resolve(false);lastLoad=now;
  let c=null,st=null;try{c=cloud();st=c&&c.state?c.state():null;}catch(e){}if(!c||!c.client||!st||!st.uid)return Promise.resolve(false);
  loading=Promise.resolve(c.client()).then(sb=>sb&&sb.from('companion_rest').select('user_id,rx,ry,moved_by,updated_at').order('updated_at',{ascending:false}).limit(400)).then(r=>{loading=null;
    if(!r||r.error||!Array.isArray(r.data))return false;stats.loads++;const t=Date.now();let mine=null,n=0;
    for(const x of r.data){if(!x||!x.user_id)continue;const p=C.dec(x.rx,x.ry);if(!p)continue;n++;if(x.user_id===me)mine={p,by:x.moved_by,at:x.updated_at};
      {const ra=Date.parse(x.updated_at||'');if(isFinite(ra)&&!((hold.get(x.user_id)||0)>t))restAt.set(x.user_id,ra);}
      if((hold.get(x.user_id)||0)>t)continue;saved.set(x.user_id,p);if(!play&&!(tween&&tween.uid===x.user_id)&&rest.find(x.user_id))rest.set(x.user_id,p.x,p.y);}
    stats.rowsIn=n;if(!play)rest.relax(10);
    /* your ball has no table spot yet: save the one it has, so everyone sees you in the same place */
    if(!mine&&realUid(me)&&rest.find(me)){const b=rest.find(me);persist([[me,b.x,b.y]]);}
    else if(mine)noticeMoved(mine);
    loaded=true;render();midCheck();return true;}).catch(()=>{loading=null;return false;});return loading;}
function seenGet(){try{const o=JSON.parse(localStorage.getItem(SEEN_KEY)||'null');return o&&o.u===me?o:null;}catch(e){return null;}}
function seen(x,y){if(!realUid(me))return;try{localStorage.setItem(SEEN_KEY,JSON.stringify({u:me,x:Math.round(x),y:Math.round(y),t:Date.now()}));}catch(e){}}
/* "du merkst": you were knocked while you were away: your ball rolls from where you last saw it to where it is now, and a note
   says who did it */
function noticeMoved(mine){const s=seenGet(),p=mine.p;if(!s){seen(p.x,p.y);return;}const dist=Math.hypot(s.x-p.x,s.y-p.y);
  if(dist<30||mine.by===me){seen(p.x,p.y);return;}pendingNote={from:{x:s.x,y:s.y},to:p,by:mine.by};showNote();}
function showNote(){if(!pendingNote||!visible()||play)return;const n=pendingNote;pendingNote=null;stats.notes++;const nm=nameOf(n.by);
  toast(nm&&n.by!==me?tr('pushed',nm):tr('pushedAnon'),4200);
  if(!reduced()){const d=Math.hypot(n.to.x-n.from.x,n.to.y-n.from.y);tween={uid:me,a:n.from,b:n.to,at:{x:n.from.x,y:n.from.y,spin:0},t0:performance.now()+250,ms:Math.max(700,Math.min(1800,d*1.4)),spin:(n.to.x>=n.from.x?1:-1)*d/T.R};kick();}
  seen(n.to.x,n.to.y);}
let toastT=0;function toast(text,ms){if(!toastEl)return;toastEl.textContent=text;toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>{toastEl.classList.remove('on');},ms||3000);}

/* ---------- the middle: points for every full hour you hold it ---------- */
const MID_KEY='lowi:rt-mid';let midShown=null,midInfo={u:'',at:0,next:T.HOUR,cap:false};
let clk=null,clkP=null;
/* the server's clock: the Date header of a tiny Supabase read, carried on with performance.now() (the phone's own clock is never used) */
function srvNow(){return clk?clk.srv+(performance.now()-clk.perf):NaN;}
function syncClock(){if(clkP)return clkP;const cfg=W.LOWI_CFG;if(!cfg||!cfg.url||!cfg.key||!W.fetch)return Promise.resolve(false);const t0=performance.now();
  clkP=W.fetch(cfg.url+'/rest/v1/companion_rest?select=user_id&limit=1',{headers:{apikey:cfg.key},cache:'no-store'}).then(r=>{const d=Date.parse((r&&r.headers&&r.headers.get('date'))||''),t1=performance.now();clkP=null;
    if(!isFinite(d)||t1-t0>15000)return false;const est=d+500+(t1-t0)/2,cur=srvNow();/* never step the clock back a hair (whole-second header) */clk={srv:isFinite(cur)&&est<cur&&cur-est<2000?cur:est,perf:t1,at:t1};stats.clock=new Date(d).toISOString();return true;}).catch(()=>{clkP=null;return false;});return clkP;}
function midLoad(){try{const o=JSON.parse(localStorage.getItem(MID_KEY)||'null');if(o&&o.u===me)return o;}catch(e){}return {u:me,st:null,d:'',n:0};}
function midSave(o){try{localStorage.setItem(MID_KEY,JSON.stringify(o));}catch(e){}}
function dayOf(ms){const d=new Date(ms);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function midCheck(force){if(!realUid(me)||!loaded||play||typeof W.award!=='function')return Promise.resolve(false);
  const go=()=>{const now=srvNow();if(!isFinite(now)||play)return false;const mb=rest.find(me);if(!mb)return false;const holder=C.midHolder(rest.balls());
    const o=midLoad(),r=C.midTick(o.st,{u:me,holder,x:mb.x,y:mb.y,now});const d=dayOf(now);if(o.d!==d){o.d=d;o.n=0;}
    let got=0;for(const h of r.pay){if(o.n>=T.MID_CAP)break;let a=0;try{a=W.award(T.MID_XP,tr('midXp'),null,'tribe-room-mid','room-mid:'+me+':'+r.st.id+':'+h);}catch(e){a=0;}if(a){o.n++;got+=a;}}
    o.st=r.st;midSave(o);stats.mid={holder,held:r.held,pay:r.pay.length,got,today:o.n};
    midInfo={u:me,at:performance.now(),next:r.next,cap:o.n>=T.MID_CAP};midShown=holder;render();return true;};
  if(force||!clk||performance.now()-clk.at>60000)return syncClock().then(()=>go());return Promise.resolve(go());}

/* ---------- entry: community-chat.js place() hands the Room view over ---------- */
function mount(g){if(off||!g||!g.appendChild)return false;if(!mapApi()||!mapApi().people)return false;
  if(gal!==g||!wrap||!wrap.isConnected){if(wrap&&wrap.isConnected&&gal!==g)wrap.remove();build(g);}else if(!g.classList.contains('rt-on'))g.classList.add('rt-on');
  sync();seat();if(!loaded||Date.now()-lastLoad>15000)loadRows(!loaded);showNote();poll();
  /* the round back button slides in after the Room opens: measure the control row again once it has settled */
  for(const ms of [450,1300])setTimeout(()=>{if(wrap&&wrap.isConnected){layout();render();}},ms);return true;}
function poll(){if(pollT)return;pollT=setInterval(()=>{if(!visible()){return;}if(!play)loadRows();seat();showNote();board();},15000);if(pollT&&pollT.unref)pollT.unref();}

/* ---------- tables of 24 (Nov 6 2026, design review point 6, Emmanuel) ----------
   The Room asks the server for your seat (public.room_seat: your table, or the inviter's when you came with an invite and it has room,
   else the first table with a free seat, else a new one; 14 days away frees a seat) and shows only that table's members. Chat,
   ranking and everything else stay shared. Until the SQL (supabase/proposals/room_tables_20261106.sql) runs, the function is not
   there: one table for everyone, as before, and the app stops asking until it starts again. */
const INV_KEY='lowi.room.invite.v1';
let seatP=null,seatAt=0,seatOff=false;
try{const u=C.inviteFrom(W.location&&W.location.search);if(u){localStorage.setItem(INV_KEY,JSON.stringify({u,at:Date.now()}));
  try{const url=new URL(W.location.href);url.searchParams.delete('tisch');W.history.replaceState(W.history.state,'',url.pathname+url.search+url.hash);}catch(e){}}}catch(e){}
function inviter(){try{const o=JSON.parse(localStorage.getItem(INV_KEY)||'null');return o&&realUid(o.u)&&o.u!==me?o.u:null;}catch(e){return null;}}
function seat(){if(seatOff||seatP||!realUid(me)||Date.now()-seatAt<60000)return seatP||Promise.resolve(tableNo);const c=cloud();if(!c||!c.client)return Promise.resolve(tableNo);seatAt=Date.now();
  seatP=Promise.resolve(c.client()).then(sb=>{if(!sb||!sb.rpc)return 0;return sb.rpc('room_seat',{p_inviter:inviter()}).then(r=>{
      if(!r||r.error){if(r&&r.error&&/PGRST202|42883|404|not find|does not exist/i.test(String(r.error.code||'')+' '+String(r.error.message||'')))seatOff=true;return 0;}
      const t=+r.data;if(!(t>0))return 0;try{localStorage.removeItem(INV_KEY);}catch(e){}
      return sb.from('room_seats').select('user_id').eq('table_no',t).limit(200).then(q=>{if(!q||q.error)return 0;
        tableNo=t;members=new Set((q.data||[]).map(x=>x.user_id));members.add(me);peopleKey='';boardT='';sync();board();return t;});});})
    .catch(()=>0).then(t=>{seatP=null;return t;});
  return seatP;}
/* the invite: a link with your member id; whoever opens it and joins sits at your table when it has a free seat */
function invite(){if(!tableNo||!realUid(me))return;const url=W.location.origin+W.location.pathname+'?tisch='+me,text=tr('inviteText');
  try{if(navigator.share){navigator.share({title:'LOWiSPIKE',text,url}).catch(()=>{});return;}}catch(e){}
  try{navigator.clipboard.writeText(text+' '+url).then(()=>toast(tr('inviteCopied'),2200),()=>{});}catch(e){}}
try{D.addEventListener('lowi:energy-shot',e=>{try{remote(e.detail);}catch(x){}});
  D.addEventListener('visibilitychange',()=>{if(D.visibilityState==='visible'&&wrap){loadRows(true).then(()=>showNote());}});
  W.addEventListener('online',()=>{if(wrap)loadRows(true);});
  D.addEventListener('lowi:chat',e=>{const d=e&&e.detail;if(wrap&&d&&(d.type==='ready'||d.type==='reconnect'))loadRows(true);});}catch(e){}
W.LowiTable={mount,active,fire,remote,sync,load:loadRows,
  off(v){off=!!v;try{localStorage.setItem(OFF_KEY,off?'1':'0');}catch(e){}},
  state:()=>({on:!off,mounted:!!(wrap&&wrap.isConnected),scale,fw,fh,me,sel,play:!!play,tween:!!tween,people:people.length,
    balls:rest.balls().map(b=>({uid:b.uid,x:Math.round(b.x),y:Math.round(b.y)})),moving:play?play.balls().filter(b=>b.vx||b.vy).length:0}),
  mid:()=>({holder:C.midHolder(rest.balls()),info:{...midInfo},saved:midLoad(),srv:srvNow()}),midCheck,
  stats:()=>({...stats}),screen(uid){const b=posOf(uid);if(!b||!felt)return null;const r=felt.getBoundingClientRect();return {x:r.left+b.x*scale,y:r.top+b.y*scale,r:T.R*scale};},core:C};
})(typeof window==='object'?window:null);
