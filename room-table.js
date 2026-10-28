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
   they open the Room; your own ball rolls from where you last saw it to where it was knocked, with a note who knocked it. */
(function(W){'use strict';
if(!W||!W.document)return;
const D=W.document,C=W.LowiTableCore;if(!C)return;
const T=C.T;
const COPY={
  table:['Pool table: everyone in the Room','Billardtisch: alle im Raum','Mesa de billar: todos en la sala'],
  hint:['Pull back on the table, let go: energy blast','Auf dem Tisch zurückziehen, loslassen: Energy Blast','Tira hacia atrás en la mesa y suelta: energy blast'],
  pushed:['{n} knocked you away while you were gone','{n} hat dich weggestoßen, während du weg warst','{n} te empujó mientras no estabas'],
  pushedAnon:['Someone knocked you away while you were gone','Jemand hat dich weggestoßen, während du weg warst','Alguien te empujó mientras no estabas'],
  hitYou:['{n} knocked you','{n} hat dich getroffen','{n} te golpeó'],
  you:['You','Du','Tú'],
  ball:['{n}: tap to write to them','{n}: tippen, um ihr oder ihm zu schreiben','{n}: toca para escribirle'],
  meBall:['You: tap to write to everyone','Du: tippen, um allen zu schreiben','Tú: toca para escribir a todos'],
  shot:['Energy blast at {n}','Energy Blast auf {n}','Energy blast a {n}'],
  miss:['Energy blast into the cushion','Energy Blast in die Bande','Energy blast a la banda']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k,n){return String(COPY[k][lang()]||COPY[k][0]).replace('{n}',n==null?'':n);}
const reduced=()=>!!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const realUid=u=>typeof u==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u);
const OFF_KEY='lowi:rt-off',SEEN_KEY='lowi:rt-seen';
let off=false;try{off=localStorage.getItem(OFF_KEY)==='1';}catch(e){}

const rest=C.table();          /* where every ball rests (the shared truth on this phone) */
let play=null,playEnd=null;    /* a shot being animated: its own table, and the rest positions it must end on */
let gal=null,wrap=null,felt=null,fx=null,ctx=null,ballsEl=null,toastEl=null,liveEl=null,hintEl=null;
let scale=.3,dpr=1,fw=0,fh=0,raf=0,acc=0,lastT=0;
let people=[],peopleKey='',me='',sel='';
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
  wrap.innerHTML='<div class="rt-rail"><div class="rt-felt" role="group"><span class="rt-spot" aria-hidden="true"></span><span class="rt-mark" aria-hidden="true">LOWiSPIKE</span><canvas class="rt-fx" aria-hidden="true"></canvas><div class="rt-balls"></div></div>'+
    '<span class="rt-pocket p1" aria-hidden="true"></span><span class="rt-pocket p2" aria-hidden="true"></span><span class="rt-pocket p3" aria-hidden="true"></span><span class="rt-pocket p4" aria-hidden="true"></span><span class="rt-pocket p5" aria-hidden="true"></span><span class="rt-pocket p6" aria-hidden="true"></span></div>'+
    '<div class="rt-toast" role="status" aria-live="polite"></div><div class="rt-hint" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" focusable="false"><path d="M13 3 6 13.5h5L10 21l7-10.5h-5z" fill="currentColor"/></svg><span></span></div><span class="sr-only rt-live" aria-live="polite"></span>';
  felt=wrap.querySelector('.rt-felt');fx=wrap.querySelector('.rt-fx');ctx=fx.getContext&&fx.getContext('2d');ballsEl=wrap.querySelector('.rt-balls');
  toastEl=wrap.querySelector('.rt-toast');hintEl=wrap.querySelector('.rt-hint');liveEl=wrap.querySelector('.rt-live');
  felt.setAttribute('aria-label',tr('table'));hintEl.querySelector('span').textContent=tr('hint');
  g.appendChild(wrap);els.clear();wire();layout();
  try{if(W.ResizeObserver){const ro=new ResizeObserver(()=>{layout();render();});ro.observe(g);}}catch(e){}}
function layout(){if(!wrap||!gal)return;const gw=gal.clientWidth,gh=gal.clientHeight;if(!gw||!gh)return;
  /* leave the bottom strip for the Freundesbaum button and the hint, and a rail round the felt */
  const rail=Math.max(7,Math.min(14,Math.round(gw*.028))),bottom=gh>420?52:42,top=6;
  const aw=gw-2*rail-8,ah=gh-top-bottom-2*rail;scale=Math.max(.12,Math.min(aw/T.W,ah/T.H));
  fw=Math.round(T.W*scale);fh=Math.round(T.H*scale);const left=Math.round((gw-fw)/2-rail),tp=top;
  const r=wrap.querySelector('.rt-rail');r.style.cssText='left:'+left+'px;top:'+tp+'px;width:'+(fw+2*rail)+'px;height:'+(fh+2*rail)+'px;--rail:'+rail+'px';
  felt.style.cssText='left:'+rail+'px;top:'+rail+'px;width:'+fw+'px;height:'+fh+'px';
  wrap.style.setProperty('--d',Math.round(2*T.R*scale)+'px');
  dpr=Math.min(2,W.devicePixelRatio||1);fx.width=Math.round(fw*dpr);fx.height=Math.round(fh*dpr);fx.style.width=fw+'px';fx.style.height=fh+'px';
  toastEl.style.top=(tp+rail+8)+'px';}
function ballEl(p){let el=els.get(p.uid);if(el&&el.isConnected)return el;
  el=D.createElement('button');el.type='button';el.className='rt-ball'+(p.me?' me':'');el.dataset.uid=p.uid;el.setAttribute('data-sfx','none');
  let art=arts.get(p.uid);if(art==null){const m=mapApi();art=(m&&m.art)?m.art(p.me?(me||'me'):p.uid,'bt'+(arts.size+1)):'';arts.set(p.uid,art);}
  const ini=Array.from(String(p.label||'?').trim())[0]||'?';
  el.innerHTML='<span class="rt-orb" style="--c:'+esc(p.c||'#9cc')+'"><span class="rt-art">'+(art||'<span class="rt-ini">'+esc(ini)+'</span>')+'</span><span class="rt-gloss" aria-hidden="true"></span></span><span class="rt-name">'+esc(p.me?tr('you'):p.label)+'</span>';
  el.setAttribute('aria-label',p.me?tr('meBall'):tr('ball',p.label));ballsEl.appendChild(el);els.set(p.uid,el);return el;}

/* ---------- people on the table ---------- */
function sync(){const m=mapApi();if(!m||!m.people)return;let list=[];try{list=m.people()||[];}catch(e){list=[];}
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
function render(){if(!wrap)return;const d=2*T.R*scale;
  for(const [u,el] of els){const b=posOf(u);if(!b){el.style.display='none';continue;}if(el.style.display==='none')el.style.display='';
    const x=b.x*scale-d/2,y=b.y*scale-d/2;const tf='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';if(el._tf!==tf){el.style.transform=tf;el._tf=tf;}
    const sp=Math.round((b.spin||0)*114.6)/114.6;if(el._sp!==sp){const a=el.firstChild&&el.firstChild.firstChild;if(a)a.style.transform='rotate('+(sp*57.2958).toFixed(1)+'deg)';el._sp=sp;}}
  draw();}
function draw(){if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,fw,fh);const k=scale,now=performance.now();
  /* trails behind rolling balls */
  for(const [u,tr0] of trails){if(!tr0.length){trails.delete(u);continue;}ctx.lineCap='round';
    for(let i=1;i<tr0.length;i++){const a=tr0[i-1],b=tr0[i],age=(now-b.t)/650;if(age>=1)continue;ctx.strokeStyle='rgba(120,210,255,'+(.42*(1-age)*(i/tr0.length)).toFixed(3)+')';ctx.lineWidth=Math.max(1.5,T.R*k*.7*(i/tr0.length));ctx.beginPath();ctx.moveTo(a.x*k,a.y*k);ctx.lineTo(b.x*k,b.y*k);ctx.stroke();}
    while(tr0.length&&now-tr0[0].t>650)tr0.shift();}
  /* aiming: power ring round your ball, dotted guide to the first ball the blast will touch, a ghost where it touches */
  const mb=rest.find(me||'me');
  if(aim&&aim.p>0&&mb&&!play){const x=mb.x*k,y=mb.y*k,R=T.R*k,g=C.guide(rest.balls(),mb.uid,mb.x+aim.dx*(T.R+T.BR+1),mb.y+aim.dy*(T.R+T.BR+1),aim.dx,aim.dy);
    ctx.save();ctx.strokeStyle='rgba(140,220,255,.85)';ctx.lineWidth=2;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(x+aim.dx*(R+4),y+aim.dy*(R+4));ctx.lineTo(g.x*k,g.y*k);ctx.stroke();ctx.setLineDash([]);
    if(g.uid){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(g.x*k,g.y*k,T.BR*k+2,0,Math.PI*2);ctx.stroke();const hb=rest.find(g.uid);if(hb){const nx=hb.x-g.x,ny=hb.y-g.y,L=Math.hypot(nx,ny)||1;ctx.strokeStyle='rgba(255,214,120,.8)';ctx.beginPath();ctx.moveTo(hb.x*k,hb.y*k);ctx.lineTo((hb.x+aim.dx*T.R*2.2)*k,(hb.y+aim.dy*T.R*2.2)*k);ctx.stroke();void L;}}
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
function kick(){if(raf)return;raf=requestAnimationFrame(frame);}
function frame(ts){raf=0;const j0=performance.now();const fresh=!lastT,dt=fresh?1/60:Math.min(.1,(ts-lastT)/1000);lastT=ts;stats.frames++;if(!fresh){if(dt>stats.maxDt)stats.maxDt=dt;if(dt>1/40)stats.slow++;}
  const now=performance.now();
  if(play){acc+=dt;let n=0;while(acc>=T.DT&&n<16){const nh=play.hits().length;play.step();n++;acc-=T.DT;
      const hs=play.hits();for(let i=nh;i<hs.length;i++){const h=hs[i];if(h.k==='blast'){const b=play.find(h.uid);if(b)spark(b.x,b.y,'255,236,150',T.R*scale*1.4,520);onBlastHit(h.uid);}else if(h.k==='ball'&&h.v>250){const a=play.find(h.a),b=play.find(h.b);if(a&&b)spark((a.x+b.x)/2,(a.y+b.y)/2,'200,240,255',T.R*scale*.6,300);}else if(h.k==='fizzle')spark(h.x,h.y,'120,200,255',T.R*scale,380);}
      if(!play.moving())break;}
    if(n>=16)acc=0;
    for(const b of play.balls())if(b.vx||b.vy)trailAdd(b,now);
    if(!play.moving()||play.steps()>T.MAXSTEPS)finishPlay();}
  if(tween){const t=Math.min(1,(now-tween.t0)/tween.ms),e=1-Math.pow(1-t,3);tween.at={x:tween.a.x+(tween.b.x-tween.a.x)*e,y:tween.a.y+(tween.b.y-tween.a.y)*e,spin:tween.spin*e};trailAdd({uid:tween.uid,x:tween.at.x,y:tween.at.y},now);if(t>=1){tween=null;}}
  render();stats.jsMs+=performance.now()-j0;
  if(play||tween||aim||sparks.length||trails.size)kick();else lastT=0;}
function finishPlay(){if(!play)return;const end=playEnd||play.snapshot();for(const b of play.balls()){const r=rest.find(b.uid);if(r)r.spin=b.spin;}
  for(const r of end){if(rest.find(r[0]))rest.set(r[0],r[1],r[2]);saved.set(r[0],{x:r[1],y:r[2]});}
  play=null;playEnd=null;acc=0;rest.relax(10);const mb=rest.find(me);if(mb)seen(mb.x,mb.y);}

/* ---------- shooting ---------- */
function rid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function fire(dx,dy,p){const by=me||'me';if(!rest.find(by))return false;if(play){play.settle();finishPlay();}tween=null;
  const start=rest.snapshot();rest.load(start);const res=C.simulate(start,by,dx,dy,p);if(!res)return false;
  play=C.table();play.load(start);for(const b of play.balls()){const r=rest.find(b.uid);if(r)b.spin=r.spin||0;}play.shoot(by,dx,dy,p);play._mine=true;playEnd=res.final;acc=0;
  const id=rid(),now=Date.now();stats.shots++;stats.lastShot={id,hit:res.hit,moved:res.moved.length,steps:res.steps};seenIds.add(id);
  for(const r of res.moved)hold.set(r[0],now+20000);
  /* everyone else in the Room replays it from the same start */
  try{const c=cloud();if(c&&c.energyShot&&realUid(by))c.energyShot(C.pack({id,by,n:(people.find(x=>x.me)||{}).n||'',t:now,dx,dy,p,s:start,f:res.final}));}catch(e){}
  /* and where everyone came to rest is saved, also for the ones who are not here */
  persist(res.moved);
  if(liveEl)liveEl.textContent=res.hit?tr('shot',nameOf(res.hit)):tr('miss');
  try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}
  kick();return res;}
const giftAt=new Map();
function onBlastHit(uid){if(!play)return;
  /* a direct hit on a real member from your own shot still sends them energy (the same checks and limits as before) */
  if(play._mine&&uid!==me&&realUid(uid)){const t=giftAt.get(uid)||0,now=Date.now();if(now-t>60000){giftAt.set(uid,now);try{const m=mapApi();if(m&&m.energy&&m.energy(uid)==='sent'&&W.LowiEnergy&&W.LowiEnergy.gift)W.LowiEnergy.gift(uid);}catch(e){}}}
  if(uid===me&&play._by&&play._by!==me)toast(tr('hitYou',play._byName||nameOf(play._by)||'?'),2600);}
function remote(raw){const m=C.unpack(raw);if(!m)return false;if(m.by===me||seenIds.has(m.id))return false;seenIds.add(m.id);if(seenIds.size>200)seenIds.delete(seenIds.values().next().value);
  stats.remote++;stats.lastRemote={id:m.id,by:m.by,n:m.s.length};if(play){play.settle();finishPlay();}tween=null;
  const res=C.simulate(m.s,m.by,m.dx,m.dy,m.p);const end=(m.f&&m.f.length)?m.f:(res?res.final:m.s);
  play=C.table();play.load(m.s);play._by=m.by;play._byName=m.n;if(!play.shoot(m.by,m.dx,m.dy,m.p)){play=null;for(const r of end){if(rest.find(r[0]))rest.set(r[0],r[1],r[2]);saved.set(r[0],{x:r[1],y:r[2]});}render();return true;}
  playEnd=end;acc=0;const now=Date.now();for(const r of end)hold.set(r[0],now+20000);
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
  /* keyboard / switch control: Enter on a ball picks it */
  felt.addEventListener('click',e=>{if(e.detail!==0)return;const t=e.target&&e.target.closest?e.target.closest('.rt-ball'):null;if(t)tap(t.dataset.uid);});
  for(const ev of ['touchstart','touchmove','wheel','gesturestart','dblclick'])felt.addEventListener(ev,e=>{e.stopPropagation();if(ev!=='touchstart'&&e.cancelable)e.preventDefault();},{passive:false});}
function tap(uid){const m=mapApi();if(!m||!m.pick)return;const p=people.find(x=>x.uid===uid);if(!p)return;
  if(p.me||uid===sel)m.pick(me||'me');else m.pick(uid,p.n||p.label);try{sel=m.selected?m.selected()||'':'';}catch(e){}for(const [u,el] of els)el.classList.toggle('sel',!!sel&&u===sel);}

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
      if((hold.get(x.user_id)||0)>t)continue;saved.set(x.user_id,p);if(!play&&!(tween&&tween.uid===x.user_id)&&rest.find(x.user_id))rest.set(x.user_id,p.x,p.y);}
    stats.rowsIn=n;if(!play)rest.relax(10);
    /* your ball has no table spot yet: save the one it has, so everyone sees you in the same place */
    if(!mine&&realUid(me)&&rest.find(me)){const b=rest.find(me);persist([[me,b.x,b.y]]);}
    else if(mine)noticeMoved(mine);
    loaded=true;render();return true;}).catch(()=>{loading=null;return false;});return loading;}
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

/* ---------- entry: community-chat.js place() hands the Room view over ---------- */
function mount(g){if(off||!g||!g.appendChild)return false;if(!mapApi()||!mapApi().people)return false;
  if(gal!==g||!wrap||!wrap.isConnected){if(wrap&&wrap.isConnected&&gal!==g)wrap.remove();build(g);}else if(!g.classList.contains('rt-on'))g.classList.add('rt-on');
  sync();if(!loaded||Date.now()-lastLoad>15000)loadRows(!loaded);showNote();poll();return true;}
function poll(){if(pollT)return;pollT=setInterval(()=>{if(!visible()){return;}if(!play)loadRows();showNote();},15000);if(pollT&&pollT.unref)pollT.unref();}
try{D.addEventListener('lowi:energy-shot',e=>{try{remote(e.detail);}catch(x){}});
  D.addEventListener('visibilitychange',()=>{if(D.visibilityState==='visible'&&wrap){loadRows(true).then(()=>showNote());}});
  W.addEventListener('online',()=>{if(wrap)loadRows(true);});
  D.addEventListener('lowi:chat',e=>{const d=e&&e.detail;if(wrap&&d&&(d.type==='ready'||d.type==='reconnect'))loadRows(true);});}catch(e){}
W.LowiTable={mount,active,fire,remote,sync,load:loadRows,
  off(v){off=!!v;try{localStorage.setItem(OFF_KEY,off?'1':'0');}catch(e){}},
  state:()=>({on:!off,mounted:!!(wrap&&wrap.isConnected),scale,fw,fh,me,sel,play:!!play,tween:!!tween,people:people.length,
    balls:rest.balls().map(b=>({uid:b.uid,x:Math.round(b.x),y:Math.round(b.y)})),moving:play?play.balls().filter(b=>b.vx||b.vy).length:0}),
  stats:()=>({...stats}),screen(uid){const b=posOf(uid);if(!b||!felt)return null;const r=felt.getBoundingClientRect();return {x:r.left+b.x*scale,y:r.top+b.y*scale,r:T.R*scale};},core:C};
})(typeof window==='object'?window:null);
