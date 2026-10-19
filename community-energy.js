/* LOWiSPIKE Community energy hits (Oct 16, Emmanuel: "like Beyblades / billiard balls: they collide and go flying, bing bing bing,
   until everyone stops rolling"). A small blue glass joystick in the right corner of the Community galaxy aims YOUR companion:
   while you pull, it turns into a pointed energy form facing the aim; let go and the energy burst flies. A companion it hits gets
   knocked and rolls like a billiard ball, bouncing off the others until everything stops, and stays where it stopped (Oct 19, see
   table()). A hit is never damage: it sends that person energy (a "+energy" sparkle, and for real members a
   short "⚡ <you> sent you energy" line, at most once per person every few minutes).
   Pure parts (aim, physics, rate limit) are exported for tests; the UI only runs in the page. No physics while idle. */
(function(root){
'use strict';
/* ---------- pure core ---------- */
const PING_GAP=5*60e3,PING_WINDOW=10*60e3,PING_MAX=6;
const DEAD=.22;
/* joystick vector -> aim. R = how far the knob can travel (px). Below the dead zone nothing fires. */
function aim(dx,dy,R){dx=+dx||0;dy=+dy||0;R=Math.max(1,+R||40);const len=Math.hypot(dx,dy),k=len>R?R/len:1,power=Math.min(1,len/R);
 return {ang:Math.atan2(dy,dx),power,ok:power>=DEAD,kx:dx*k,ky:dy*k};}
/* energy pings: one per person per PING_GAP, and at most PING_MAX people in PING_WINDOW */
function canPing(st,uid,now){if(!uid)return {ok:false,why:'nobody'};const sent=(st&&st.sent)||{},last=+sent[uid]||0;now=+now||Date.now();
 if(last&&now-last<PING_GAP)return {ok:false,why:'recent',wait:PING_GAP-(now-last)};
 let n=0;for(const k in sent)if(now-(+sent[k]||0)<PING_WINDOW)n++;
 if(n>=PING_MAX)return {ok:false,why:'busy'};return {ok:true,why:''};}
function notePing(st,uid,now){now=+now||Date.now();const sent={};const old=(st&&st.sent)||{};for(const k in old){const t=+old[k]||0;if(now-t<PING_WINDOW*3)sent[k]=t;}sent[uid]=now;return {sent};}
function tune(reduced){return reduced?{speed:.45,range:.5,friction:4.2,roll:60,settle:.15}:{speed:1,range:1,friction:1.25,roll:34,settle:.45};}
/* The billiard table: circles at fixed home spots with an offset each. World units = map units.
   Oct 16 (Emmanuel: "if there were 1,000 people all shooting energy balls, we all see it simultaneously"): several balls fly at
   once (capped), and every shot is decided by the phone that fired it. The shooter's phone casts the ray once (predict) and sends
   one compact event {who, angle, power, target, time to impact, timestamp}; every phone then flies that ball from the shooter's own
   companion to the same target and lands it at the same moment, catching up for network delay. Physics runs on a fixed 1/120 s
   step so every phone integrates the same way. */
const STEP=1/120,MAX_BALLS=24,MAX_AGE=1500;
/* Oct 19 (E-man: "we were both playing, shooting each other, and then it crashed ... in the community section"): a two-person
   shoot-out kept the screen at full load for minutes on end. Every frame re-laid out the whole map (place(): every companion,
   bubble and stream line, about 8 ms a frame even in a small galaxy) on top of the live 3D world, and the hit effects list had no
   ceiling, so a slow frame made the next one slower. Now: at most MAX_FX effects (oldest sparks go first), the map follows the
   balls at most every PLACE_MS, and once frames run slow (SLOW_DT) balls are drawn without canvas blur and hits make fewer sparks. */
const MAX_FX=160,PLACE_MS=33,SLOW_DT=1/30;
function capFx(list,max){max=max==null?MAX_FX:max;if(list.length<=max)return list;let over=list.length-max;const out=[];
 for(const f of list){if(over>0&&f.k==='spark'){over--;continue;}out.push(f);}return out.length>max?out.slice(out.length-max):out;}
function placeDue(last,now,force){return !!force||!(last>0)||now-last>=PLACE_MS||now<last;}
/* Oct 19 (Emmanuel, playing on his iPhone: "whenever I shoot them ... they just go back to where they were. That's not fun ... It
   doesn't feel like a real billiard ... I shoot them away. They shouldn't be coming back. They should be hitting other people."):
   a knocked companion now stays exactly where it stops rolling, like a billiard ball. Gone: the 'back' phase that eased everyone
   home after a shot, and the soft wall that pulled a companion back towards its own spot (and the hard stop 240 px from it). It can
   roll anywhere on the table and knocks into whoever it meets (chain hits); only the edge of the map bounces it back in. Where it
   lands is kept as a map position (land), so it stays put when the layout moves its pin, when it drops off the map for a moment
   and when the phone leaves Community or reloads (the page saves land, see snap()/restore()). The table only works while something
   moves: busy() means a ball is flying or a companion is rolling, never just "someone is off their spot". */
function table(opts){
 const T=Object.assign(tune(opts&&opts.reduced),opts&&opts.tune||{});const bodies=new Map(),land=new Map();let shots=[],mode='idle',still=0,bound=1e9,acc=0,pend=[],catching=false;
 const MAX_LAND=400;
 function remember(b){if(b.ox||b.oy)land.set(b.uid,{x:b.hx+b.ox,y:b.hy+b.oy});else land.delete(b.uid);if(land.size>MAX_LAND){for(const k of land.keys()){if(land.size<=MAX_LAND)break;if(!bodies.has(k))land.delete(k);}}}
 function sync(spots,radius){const seen=new Set();if(radius!=null)bound=(+radius||0)+90;
  for(const s of spots||[]){if(!s||!s.uid)continue;seen.add(s.uid);const hx=+s.x||0,hy=+s.y||0;let b=bodies.get(s.uid);
   if(!b){b={uid:s.uid,ox:0,oy:0,vx:0,vy:0,knock:false,hx,hy};bodies.set(s.uid,b);const l=land.get(s.uid);if(l){b.ox=l.x-hx;b.oy=l.y-hy;}}
   /* the pin moved (crowd size band changed): a companion that was knocked keeps its place on the map instead of jumping with it */
   else if((b.ox||b.oy)&&(b.hx!==hx||b.hy!==hy)){b.ox+=b.hx-hx;b.oy+=b.hy-hy;}
   b.hx=hx;b.hy=hy;b.r=Math.max(6,+s.r||20);b.me=!!s.me;if(b.me&&(b.ox||b.oy))b.knock=true;}
  for(const k of [...bodies.keys()])if(!seen.has(k)){const b=bodies.get(k);if(b.ox||b.oy)land.set(k,{x:b.hx+b.ox,y:b.hy+b.oy});bodies.delete(k);}}
 const pinned=b=>b.me&&!b.knock;
 const speedOf=b=>Math.hypot(b.vx,b.vy);
 const shotSpeed=power=>(620+620*power)*T.speed,shotRange=power=>(150+520*power)*T.range;
 /* the shooter's phone: which companion does this aim hit first (bodies where they stand now), and after how many ms */
 function predict(from,ang,power,startR){power=Math.max(0,Math.min(1,+power||0));const dx=Math.cos(ang),dy=Math.sin(ang),r0=+startR||0,sx=from.x+dx*r0,sy=from.y+dy*r0,range=shotRange(power),sp=shotSpeed(power);
  let best=null,bd=1e9;for(const b of bodies.values()){if(b.uid===(from.uid||'')||b.me)continue;const cx=b.hx+b.ox,cy=b.hy+b.oy,R=b.r+9,fx=sx-cx,fy=sy-cy,B=2*(fx*dx+fy*dy),C=fx*fx+fy*fy-R*R,disc=B*B-4*C;if(disc<0)continue;
   const t=C<=0?0:(-B-Math.sqrt(disc))/2;if(t>=0&&t<=range&&t<bd){bd=t;best=b;}}
  return best?{to:best.uid,ht:Math.max(16,Math.round(bd/sp*1000))}:{to:'',ht:0};}
 function admit(s){if(shots.length>=MAX_BALLS){if(!s.own)return false;const i=shots.findIndex(x=>!x.own);shots.splice(i>=0?i:0,1);}shots.push(s);mode='free';still=0;return true;}
 /* o: {id, to, ht (ms to impact), remote, age (ms already flown), ghost}. With a target the ball flies from `from` straight to that
    companion and lands after ht ms on every phone; without one it is a miss that flies its range and fizzles, hitting nobody. */
 function fire(from,ang,power,startR,o){o=o||{};power=Math.max(0,Math.min(1,+power||0));const r0=+startR||0;let dx=Math.cos(ang),dy=Math.sin(ang);
  const s={id:o.id||'',x:0,y:0,dx,dy,sp:shotSpeed(power),power,left:shotRange(power),r:9,trail:[],by:from.uid||'',own:!o.remote,remote:!!o.remote,to:'',until:0,gone:0,ghost:!!o.ghost};
  const b=o.to?bodies.get(o.to):null;
  if(b&&b.uid!==s.by){const cx=b.hx+b.ox,cy=b.hy+b.oy,ddx=cx-from.x,ddy=cy-from.y,d=Math.hypot(ddx,ddy)||1;dx=ddx/d;dy=ddy/d;s.dx=dx;s.dy=dy;
   const reach=Math.max(1,d-r0-b.r-s.r);if(+o.ht>0)s.sp=Math.max(120,Math.min(6000,reach/(o.ht/1000)));s.to=b.uid;s.until=reach;s.left=reach+60;}
  else if(o.to||o.remote)s.ghost=true;
  s.x=from.x+dx*r0;s.y=from.y+dy*r0;s.x0=s.x;s.y0=s.y;
  if(!admit(s))return null;
  let a=Math.min(MAX_AGE,Math.max(0,+o.age||0))/1000;catching=true;while(a>1e-9&&shots.includes(s)){const h=Math.min(STEP,a);advance(s,h,pend);a-=h;}catching=false;
  return s;}
 function kickBody(s,b,hx,hy,ev){const kick=(260+640*s.power)*T.speed;if(b.me)b.knock=true;b.vx+=s.dx*kick;b.vy+=s.dy*kick;ev.push({type:'hit',uid:b.uid,x:hx,y:hy,power:s.power,by:s.by,own:s.own,id:s.id,late:catching,fx:s.x0,fy:s.y0});drop(s);mode='free';still=0;}
 function drop(s){const i=shots.indexOf(s);if(i>=0)shots.splice(i,1);}
 function advance(s,dt,ev){const prev={x:s.x,y:s.y},go=Math.min(s.left,s.sp*dt);s.x+=s.dx*go;s.y+=s.dy*go;s.left-=go;s.gone+=go;s.trail.push(prev);if(s.trail.length>12)s.trail.shift();
  if(s.to){if(s.gone>=s.until-1e-6){const b=bodies.get(s.to);if(b){const over=s.gone-s.until;s.x-=s.dx*over;s.y-=s.dy*over;kickBody(s,b,s.x,s.y,ev);}else{ev.push({type:'fizzle',x:s.x,y:s.y});drop(s);}}return;}
  if(!s.ghost){let best=null,bt=2;for(const b of bodies.values()){if(b.me||b.uid===s.by)continue;const cx=b.hx+b.ox,cy=b.hy+b.oy,R=b.r+s.r,fx=prev.x-cx,fy=prev.y-cy,ex=s.x-prev.x,ey=s.y-prev.y,A=ex*ex+ey*ey;if(!A)continue;
    const B=2*(fx*ex+fy*ey),C=fx*fx+fy*fy-R*R,disc=B*B-4*A*C;if(disc<0)continue;const t=(-B-Math.sqrt(disc))/(2*A);const tt=C<=0?0:t;if(tt>=0&&tt<=1&&tt<bt){bt=tt;best=b;}}
   if(best){kickBody(s,best,prev.x+(s.x-prev.x)*bt,prev.y+(s.y-prev.y)*bt,ev);return;}}
  if(s.left<=.01){ev.push({type:'fizzle',x:s.x,y:s.y});drop(s);}}
 function collide(a,b){if(pinned(a)&&pinned(b))return false;const ax=a.hx+a.ox,ay=a.hy+a.oy,bx=b.hx+b.ox,by=b.hy+b.oy,dx=bx-ax,dy=by-ay,d=Math.hypot(dx,dy),min=a.r+b.r;
  if(!(d<min)||d<1e-6)return false;const moving=speedOf(a)>1||speedOf(b)>1;if(!moving)return false;
  const nx=dx/d,ny=dy/d,rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny,ima=pinned(a)?0:1,imb=pinned(b)?0:1,im=ima+imb;if(!im)return false;
  const over=min-d;a.ox-=nx*over*ima/im;a.oy-=ny*over*ima/im;b.ox+=nx*over*imb/im;b.oy+=ny*over*imb/im;
  if(rv>=0)return true;const e=.92,j=-(1+e)*rv/im;a.vx-=j*nx*ima;a.vy-=j*ny*ima;b.vx+=j*nx*imb;b.vy+=j*ny*imb;return true;}
 function sub(dt,ev){
  for(const s of shots.slice())advance(s,dt,ev);
  if(mode==='free'){
   for(const b of bodies.values()){if(pinned(b)){b.vx=b.vy=0;continue;}b.ox+=b.vx*dt;b.oy+=b.vy*dt;const s=speedOf(b);
    if(s>0){const ns=Math.max(0,s*Math.exp(-T.friction*dt)-T.roll*dt),k=ns/s;b.vx*=k;b.vy*=k;}
    /* the only wall is the edge of the map (no pull back towards its own spot any more): it bounces back in, like a cushion */
    const px=b.hx+b.ox,py=b.hy+b.oy,pd=Math.hypot(px,py);if(pd>bound){const nx=px/pd,ny=py/pd,out=b.vx*nx+b.vy*ny;if(out>0){b.vx-=1.6*out*nx;b.vy-=1.6*out*ny;}b.ox-=nx*(pd-bound);b.oy-=ny*(pd-bound);}}
   const list=[...bodies.values()];for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(collide(list[i],list[j])&&(speedOf(list[i])>40||speedOf(list[j])>40))ev.push({type:'bump',a:list[i].uid,b:list[j].uid});
   let max=0;for(const b of list)max=Math.max(max,speedOf(b));
   /* everything stopped: everyone stays exactly where they are */
   if(!shots.length&&max<6){still+=dt;if(still>=T.settle){mode='idle';still=0;for(const b of list){b.vx=b.vy=0;remember(b);}}}else still=0;}
 }
 /* fixed 1/120 s steps (carrying the remainder), so a 30 fps and a 120 fps phone integrate the same path */
 function step(dt){const ev=pend;pend=[];acc+=Math.max(0,Math.min(.25,+dt||0));while(acc>=STEP-1e-9){sub(STEP,ev);acc-=STEP;}
  /* one bump sound/flash per pair per frame is plenty */
  const seen=new Set();return ev.filter(e=>{if(e.type!=='bump')return true;const k=e.a<e.b?e.a+'|'+e.b:e.b+'|'+e.a;if(seen.has(k))return false;seen.add(k);return true;});}
 function offset(uid){const b=bodies.get(uid);return b&&(b.ox||b.oy)?{x:b.ox,y:b.oy}:null;}
 function busy(){return !!(shots.length||pend.length||mode==='free');}
 /* everyone back on their own spot (tests, a fresh table); the page never calls this during play */
 function reset(){shots=[];pend=[];acc=0;mode='idle';still=0;land.clear();for(const b of bodies.values()){b.ox=b.oy=b.vx=b.vy=0;b.knock=false;}}
 /* Community went out of sight mid-roll: stop the balls and the rolling, but leave everyone where they are */
 function halt(){shots=[];pend=[];acc=0;mode='idle';still=0;for(const b of bodies.values()){b.vx=b.vy=0;remember(b);}}
 /* where knocked companions rest, as map positions, for the page to keep across a reload */
 function snap(){const out={};for(const [k,v] of land)out[k]=[Math.round(v.x),Math.round(v.y)];for(const b of bodies.values())if(b.ox||b.oy)out[b.uid]=[Math.round(b.hx+b.ox),Math.round(b.hy+b.oy)];else delete out[b.uid];return out;}
 function restore(o){if(!o||typeof o!=='object')return;let n=0;for(const k in o){const v=o[k];if(n>=MAX_LAND||!Array.isArray(v)||!isFinite(v[0])||!isFinite(v[1])||k.length>80)continue;n++;land.set(k,{x:+v[0],y:+v[1]});
   const b=bodies.get(k);if(b&&!b.vx&&!b.vy){b.ox=+v[0]-b.hx;b.oy=+v[1]-b.hy;if(b.me)b.knock=true;}}}
 function pos(uid){const b=bodies.get(uid);return b?{x:b.hx+b.ox,y:b.hy+b.oy,r:b.r,me:b.me}:null;}
 return {sync,fire,predict,step,offset,busy,reset,halt,snap,restore,has:uid=>bodies.has(uid),landed:uid=>land.has(uid),pos,shot:()=>shots[0]||null,shots:()=>shots.slice(),mode:()=>mode,bodies:()=>[...bodies.values()].map(b=>({...b})),tune:T};
}
/* ---------- real-time sync helpers (pure) ---------- */
/* token bucket per player: at most max shots in win ms and never closer than gap ms */
function bucket(st,now,max,win,gap){now=+now||Date.now();const ts=((st&&st.ts)||[]).filter(t=>now-t<win);const last=ts.length?ts[ts.length-1]:0;
 if(ts.length>=max||(last&&now-last<gap))return {ok:false,st:{ts}};ts.push(now);return {ok:true,st:{ts}};}
const SEND={max:4,win:2000,gap:250},RECV={max:6,win:2000,gap:120},INBOX={max:40,win:1000,gap:0};
/* one compact shot event (about 120 bytes): who fired, angle, power, target, ms to impact, sender time */
function pack(s){const r=(v,n)=>+(+v||0).toFixed(n);return {v:1,id:String(s.id||'').slice(0,24),by:String(s.by||'').slice(0,64),a:r(s.a,3),p:r(Math.max(0,Math.min(1,s.p)),2),to:String(s.to||'').slice(0,64),ht:Math.max(0,Math.min(5000,Math.round(+s.ht||0))),t:Math.round(+s.t||0)};}
function unpack(m){if(!m||typeof m!=='object'||m.v!==1)return null;const id=typeof m.id==='string'?m.id:'',by=typeof m.by==='string'?m.by:'';
 if(!id||!by||id.length>24||by.length>64||!isFinite(m.a)||!isFinite(m.p)||!isFinite(m.t))return null;
 return {id,by,a:Math.max(-7,Math.min(7,+m.a)),p:Math.max(0,Math.min(1,+m.p)),to:typeof m.to==='string'&&m.to.length<=64?m.to:'',ht:Math.max(0,Math.min(5000,+m.ht||0)),t:+m.t};}
/* how long ago (ms) a shot was fired, from the sender's timestamp. Phone clocks are network-synced, so the plain difference is used
   while it is believable (-1.5 s .. +4 s); a phone with a wrong clock falls back to its own smallest seen delay (base) as zero. */
function shotAge(t,now,base){const d=(+now||Date.now())-(+t||0);
 if(d>-1500&&d<4000)return {age:Math.max(0,Math.min(MAX_AGE,d)),stale:d>=MAX_AGE*2};
 if(base==null||!isFinite(base))return {age:60,stale:false};const k=d-base;return {age:Math.max(0,Math.min(MAX_AGE,k+60)),stale:k>MAX_AGE*2};}
const api={aim,canPing,notePing,table,tune,bucket,pack,unpack,shotAge,PING_GAP,PING_WINDOW,PING_MAX,DEAD,STEP,MAX_BALLS,MAX_AGE,SEND,RECV,INBOX,MAX_FX,PLACE_MS,SLOW_DT,capFx,placeDue};
if(typeof module==='object'&&module.exports){module.exports=api;return;}
root.LowiEnergyCore=api;

/* ---------- page UI ---------- */
const W=root,D=W.document;if(!D||W.LowiEnergy)return;
const KEY='lowi.energy.v1';
const COPY={joy:['Energy hit: drag to aim your companion, let go to send energy','Energie-Stoß: ziehen zum Zielen, loslassen um Energie zu senden','Golpe de energía: arrastra para apuntar, suelta para enviar energía'],
 plus:['+energy','+Energie','+energía'],sent:['Energy sent to {n}','Energie an {n} gesendet','Energía enviada a {n}'],
 soon:['{n} already got your energy. Again in a few minutes.','{n} hat deine Energie schon. In ein paar Minuten wieder.','{n} ya recibió tu energía. De nuevo en unos minutos.']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k,n){return String(COPY[k][lang()]||COPY[k][0]).replace('{n}',n||'');}
const reduced=()=>!!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches);
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){return {};}}
function store(st){try{localStorage.setItem(KEY,JSON.stringify(st));}catch(e){}}
let gal=null,joy=null,knob=null,fx=null,ctx=null,live=null,tb=null,tbReduced=null,raf=0,lastT=0,drag=null,aimNow=null,fxList=[],lastPlace=0,slow=false,dpr=1;
/* real-time sync state: my send bucket, per-shooter buckets, the inbox cap, ids already seen, each sender's smallest clock delta */
let sendSt={},inboxSt={},recvSt=new Map(),seenIds=new Map(),bases=new Map(),stats={sent:0,got:0,shown:0,dropped:0,lat:[]};
const map=()=>W.LowiCgMap;
function geom(){const m=map();return m&&m.geom?m.geom():null;}
function scr(g,p){return {x:g.cx+(p.x-g.cam.x)*g.cam.z,y:g.cy+(p.y-g.cam.y)*g.cam.z};}
function meSpot(g){return g&&g.spots.find(s=>s.me);}
/* Oct 19: where knocked companions came to rest survives leaving Community and a reload (per account on this phone) */
const LAND_KEY='lowi.energy.land.v1';
function landKey(){const c=W.LOWI_CLOUD_X,st=c&&c.state?c.state():null;return LAND_KEY+':'+((st&&st.uid)||'me');}
function loadLand(){try{const o=JSON.parse(localStorage.getItem(landKey())||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}}
function saveLand(){if(!tb)return;try{const o=tb.snap();if(Object.keys(o).length)localStorage.setItem(landKey(),JSON.stringify(o));else localStorage.removeItem(landKey());}catch(e){}}
/* closing the app or switching away mid-roll keeps where everyone is at that moment, not the last time everything stopped */
try{W.addEventListener('pagehide',saveLand);D.addEventListener('visibilitychange',()=>{if(D.visibilityState==='hidden')saveLand();});}catch(e){}
function ensureTable(){const r=reduced();if(!tb||tbReduced!==r){const old=tb?tb.snap():null;tb=table({reduced:r});tbReduced=r;tb.restore(old||loadLand());}return tb;}
function visible(){return !!(gal&&gal.isConnected&&gal.offsetParent!==null&&!D.hidden&&gal.clientWidth>0);}
function mount(g){if(!g||!g.appendChild)return;if(gal===g&&joy&&joy.isConnected)return;gal=g;
 fx=D.createElement('canvas');fx.className='ce-fx';fx.setAttribute('aria-hidden','true');g.appendChild(fx);ctx=fx.getContext&&fx.getContext('2d');
 joy=D.createElement('div');joy.className='ce-joy';joy.id='ceJoy';joy.setAttribute('role','button');joy.setAttribute('tabindex','0');joy.setAttribute('data-sfx','none');joy.setAttribute('aria-label',tr('joy'));
 joy.innerHTML='<span class="ce-ring" aria-hidden="true"></span><span class="ce-knob" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" focusable="false"><path d="M13 3 6 13.5h5L10 21l7-10.5h-5z" fill="currentColor"/></svg></span>';
 knob=joy.querySelector('.ce-knob');g.appendChild(joy);
 live=D.createElement('span');live.className='sr-only ce-live';live.setAttribute('aria-live','polite');g.appendChild(live);
 wire();}
function knobR(){return Math.max(26,(joy.clientWidth||72)*.42);}
function centre(){const r=joy.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}
function wire(){
 const stop=e=>{e.stopPropagation();};
 joy.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.stopPropagation();if(drag)return;
  drag={id:e.pointerId,c:centre()};try{joy.setPointerCapture(e.pointerId);}catch(x){}joy.classList.add('on');move(e);kick();});
 joy.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;e.preventDefault();e.stopPropagation();move(e);});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;e.stopPropagation();const a=aimNow;drag=null;aimNow=null;joy.classList.remove('on');knob.style.transform='';setAim(null);
  if(e.type==='pointerup'&&a&&a.ok)fireAt(a.ang,a.power);kick();};
 joy.addEventListener('pointerup',end);joy.addEventListener('pointercancel',end);joy.addEventListener('lostpointercapture',end);
 ['click','dblclick','touchstart','touchmove','touchend','mousedown','contextmenu'].forEach(t=>joy.addEventListener(t,e=>{stop(e);if(t==='contextmenu'||t==='dblclick')e.preventDefault();},{passive:false}));
 joy.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();e.stopPropagation();const g=geom(),me=meSpot(g);if(!g||!me)return;
  const t=ensureTable();t.sync(g.spots,g.radius);const at=t.pos(me.uid)||me;
  let best=null,bd=1e9;for(const s0 of g.spots){if(s0.me)continue;const s=t.pos(s0.uid)||s0,d=Math.hypot(s.x-at.x,s.y-at.y);if(d<bd){bd=d;best=s;}}if(best)fireAt(Math.atan2(best.y-at.y,best.x-at.x),.7);});
}
function move(e){const a=aim(e.clientX-drag.c.x,e.clientY-drag.c.y,knobR());aimNow=a;knob.style.transform='translate('+a.kx.toFixed(1)+'px,'+a.ky.toFixed(1)+'px)';joy.classList.toggle('armed',a.ok);setAim(a.ok?a:null);}
function meEl(){return gal&&gal.querySelector('.cg-body.me');}
function setAim(a){const el=meEl();if(el){el.classList.toggle('ce-aim',!!a);if(a)el.style.setProperty('--ce-p',a.power.toFixed(2));}}
function myUid(me){const c=W.LOWI_CLOUD_X,st=c&&c.state?c.state():null;return (st&&st.uid)||(me&&me.uid!=='me'?me.uid:'');}
function rid(){return Date.now().toString(36).slice(-6)+Math.random().toString(36).slice(2,8);}
/* no forced layout here: in a crowd many companions flash in the same frame */
function flash(el){if(!el)return;el.classList.remove('ce-shot');requestAnimationFrame(()=>{el.classList.add('ce-shot');setTimeout(()=>el.classList.remove('ce-shot'),420);});}
function bodyEl(uid){return gal&&gal.querySelector('.cg-body[data-uid="'+(W.CSS&&CSS.escape?CSS.escape(uid):uid)+'"]');}
function fireAt(ang,power){const g=geom(),me=meSpot(g);if(!g||!me)return;const now=Date.now(),b=bucket(sendSt,now,SEND.max,SEND.win,SEND.gap);sendSt=b.st;if(!b.ok)return;
 const t=ensureTable();t.sync(g.spots,g.radius);const at=t.pos(me.uid)||me,from={x:at.x,y:at.y,uid:me.uid},r0=me.r*.9,pr=t.predict(from,ang,power,r0),id=rid();
 t.fire(from,ang,power,r0,{id,to:pr.to,ht:pr.ht});
 /* one compact event on the Community's shared realtime channel; every other phone flies the same ball from my companion */
 const by=myUid(me),c=W.LOWI_CLOUD_X;if(by&&c&&c.energyShot){try{if(c.energyShot(pack({id,by,a:ang,p:power,to:pr.to,ht:pr.ht,t:now})))stats.sent++;}catch(e){}}
 try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}flash(meEl());kick();}
/* a shot from someone else in the Community (lowi:energy-shot from the shared channel) */
function remote(raw){const m=unpack(raw);if(!m)return false;const now=Date.now();
 if(seenIds.has(m.id))return false;seenIds.set(m.id,now);if(seenIds.size>400){for(const [k,v] of seenIds){if(now-v>10e3||seenIds.size>300)seenIds.delete(k);else break;}}
 const ib=bucket(inboxSt,now,INBOX.max,INBOX.win,0);inboxSt=ib.st;if(!ib.ok){stats.dropped++;return false;}
 const rb=bucket(recvSt.get(m.by),now,RECV.max,RECV.win,RECV.gap);recvSt.set(m.by,rb.st);if(!rb.ok){stats.dropped++;return false;}
 if(recvSt.size>2000)recvSt.clear();
 const d=now-m.t,base=bases.has(m.by)?Math.min(bases.get(m.by),d):d;bases.set(m.by,base);const ag=shotAge(m.t,now,base);stats.got++;stats.lat.push(Math.round(d));if(stats.lat.length>500)stats.lat.shift();
 if(ag.stale||!visible()){stats.dropped++;return false;}
 const g=geom(),me=meSpot(g);if(!g)return false;if(m.by===myUid(me))return false;
 const t=ensureTable();t.sync(g.spots,g.radius);const sp=g.spots.find(x=>x.uid===m.by);if(!sp){stats.dropped++;return false;}
 const at=t.pos(m.by)||sp,to=me&&m.to&&m.to===myUid(me)?me.uid:m.to;
 const s=t.fire({x:at.x,y:at.y,uid:m.by},m.a,m.p,sp.r*.9,{id:m.id,to,ht:m.ht,remote:true,age:ag.age});if(!s){stats.dropped++;return false;}
 stats.shown++;flash(bodyEl(m.by));kick();return true;}
D.addEventListener('lowi:energy-shot',e=>{try{remote(e.detail);}catch(x){}});
function kick(){if(raf)return;lastT=0;raf=requestAnimationFrame(frame);}
function size(){const w=gal.clientWidth,h=gal.clientHeight;dpr=Math.min(2,W.devicePixelRatio||1);if(fx.width!==Math.round(w*dpr)||fx.height!==Math.round(h*dpr)){fx.width=Math.round(w*dpr);fx.height=Math.round(h*dpr);}return {w,h};}
function frame(now){raf=0;if(!visible()){if(tb){tb.halt();saveLand();}fxList=[];if(ctx&&fx)ctx.clearRect(0,0,fx.width,fx.height);const m=map();if(m&&m.place)m.place();return;}
 const dt=lastT?Math.min(.25,(now-lastT)/1000):1/60;lastT=now;const g=geom();const t=ensureTable();if(g)t.sync(g.spots,g.radius);
 slow=dt>SLOW_DT;const was=t.busy(),ev=t.step(dt);for(const e of ev)onEvent(e,g);fxList=capFx(fxList);
 const nowBusy=t.busy();if((was||nowBusy)&&placeDue(lastPlace,now,!nowBusy)){lastPlace=now;const m=map();if(m&&m.place)m.place();}
 if(was&&!nowBusy)saveLand();
 draw(g,now,dt);
 if(t.busy()||drag||fxList.length)raf=requestAnimationFrame(frame);else if(ctx)ctx.clearRect(0,0,fx.width,fx.height);}
function onEvent(e,g){if(!g)return;
 if(e.type==='hit'){const p=scr(g,{x:e.x,y:e.y});if(e.late&&isFinite(e.fx))fxList.push({k:'streak',x:e.x,y:e.y,fx:e.fx,fy:e.fy,t:0,life:.35});fxList.push({k:'ring',x:e.x,y:e.y,t:0,life:reduced()?.35:.7});if(!reduced())for(let i=0,n=slow?4:12;i<n;i++){const a=Math.random()*6.283,s=60+Math.random()*160;fxList.push({k:'spark',x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:0,life:.5+Math.random()*.4});}
  plus(e.uid,g);if(e.own)ping(e.uid);}
 else if(e.type==='bump'){const A=tb.pos(e.a),B=tb.pos(e.b);if(A&&B&&!reduced())fxList.push({k:'ring',x:(A.x+B.x)/2,y:(A.y+B.y)/2,t:0,life:.35,small:1});}
 else if(e.type==='fizzle')fxList.push({k:'ring',x:e.x,y:e.y,t:0,life:.4,small:1});}
function plus(uid,g){const s=tb.pos(uid);if(!s||gal.querySelectorAll('.ce-plus').length>=8)return;const p=scr(g,s),el=D.createElement('span');el.className='ce-plus';el.setAttribute('aria-hidden','true');el.innerHTML='<b>⚡</b>'+tr('plus');
 el.style.left=Math.round(p.x)+'px';el.style.top=Math.round(p.y-(s.r*g.cam.z)-8)+'px';gal.appendChild(el);setTimeout(()=>el.remove(),reduced()?900:1500);}
function nameOf(uid){const b=gal&&gal.querySelector('.cg-body[data-uid="'+(W.CSS&&CSS.escape?CSS.escape(uid):uid)+'"]');return b?(b.getAttribute('data-name')||''):'';}
function ping(uid){const m=map(),n=nameOf(uid);if(!m||!m.energy)return;const st=load(),c=canPing(st,uid,Date.now());
 if(!c.ok){if(c.why==='recent'&&live)live.textContent=tr('soon',n);return;}
 let r='';try{r=m.energy(uid);}catch(e){r='';}
 if(r==='sent'){store(notePing(st,uid,Date.now()));if(live)live.textContent=tr('sent',n);}}
function draw(g,now,fdt){if(!ctx||!g)return;const {w,h}=size();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const z=g.cam.z,red=reduced();
 /* aiming: your companion becomes a pointed energy form facing the aim, with a faint aim line as long as the throw */
 const me=meSpot(g);
 if(aimNow&&aimNow.ok&&me){const p=scr(g,me),r=me.r*z+6,a=aimNow.ang,pw=aimNow.power,tip=r*(1.55+pw*.9),th=1.05;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);
  const len=(150+520*pw)*(red?.5:1)*z;ctx.setLineDash([3,9]);ctx.lineCap='round';ctx.lineWidth=2.4;const lg=ctx.createLinearGradient(tip,0,tip+len,0);lg.addColorStop(0,'rgba(170,230,255,.55)');lg.addColorStop(1,'rgba(170,230,255,0)');ctx.strokeStyle=lg;ctx.beginPath();ctx.moveTo(tip+4,0);ctx.lineTo(tip+len,0);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(0,0,r,th,6.283-th);ctx.lineTo(tip,0);ctx.closePath();
  const gr=ctx.createRadialGradient(r*.2,0,0,0,0,tip);gr.addColorStop(0,'rgba(235,250,255,.85)');gr.addColorStop(.45,'rgba(120,210,255,.55)');gr.addColorStop(1,'rgba(40,120,255,.15)');
  ctx.shadowColor='rgba(110,200,255,.9)';ctx.shadowBlur=18+pw*14;ctx.fillStyle=gr;ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=1.4;ctx.strokeStyle='rgba(225,248,255,.8)';ctx.stroke();
  const fl=red?0:Math.sin(now/90)*2;ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(tip-6+fl,0,2.2+pw*1.4,0,6.283);ctx.fill();ctx.restore();}
 /* the bursts in flight: mine and everyone else's (capped at MAX_BALLS). In a crowd (more than 6 at once) each ball is drawn the cheap
    way: a short trail and a soft halo instead of a canvas shadow blur, so the frame rate holds. */
 const flying=tb?tb.shots():[],cheap=flying.length>6||slow;
 for(const sh of flying){const tr=cheap?sh.trail.slice(-4):sh.trail,pts=tr.concat([{x:sh.x,y:sh.y}]).map(q=>scr(g,q));ctx.lineCap='round';
  for(let i=1;i<pts.length;i++){const k=i/pts.length;ctx.globalAlpha=k*.7;ctx.strokeStyle='rgba(120,210,255,1)';ctx.lineWidth=2+k*7;ctx.beginPath();ctx.moveTo(pts[i-1].x,pts[i-1].y);ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();}
  const hd=pts[pts.length-1],rr=6+sh.power*3;ctx.globalAlpha=1;
  if(cheap){ctx.fillStyle='rgba(110,200,255,.35)';ctx.beginPath();ctx.arc(hd.x,hd.y,rr*2,0,6.283);ctx.fill();ctx.fillStyle='#effbff';ctx.beginPath();ctx.arc(hd.x,hd.y,rr,0,6.283);ctx.fill();}
  else{ctx.shadowColor='rgba(110,200,255,1)';ctx.shadowBlur=20;ctx.fillStyle='#effbff';ctx.beginPath();ctx.arc(hd.x,hd.y,rr,0,6.283);ctx.fill();ctx.shadowBlur=0;}}
 /* hit rings and sparks */
 const dt=fdt||1/60;fxList=fxList.filter(f=>{f.t+=dt;if(f.t>=f.life)return false;const k=f.t/f.life,p=scr(g,f);
  if(f.k==='streak'){const q=scr(g,{x:f.fx,y:f.fy}),gr=ctx.createLinearGradient(q.x,q.y,p.x,p.y);gr.addColorStop(0,'rgba(120,210,255,0)');gr.addColorStop(1,'rgba(235,250,255,'+(1-k).toFixed(2)+')');ctx.globalAlpha=1;ctx.lineCap='round';ctx.strokeStyle=gr;ctx.lineWidth=6*(1-k)+1.5;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(p.x,p.y);ctx.stroke();}
  else if(f.k==='ring'){ctx.globalAlpha=(1-k)*(f.small?.5:.9);ctx.strokeStyle='rgba(160,225,255,1)';ctx.lineWidth=f.small?1.5:3*(1-k)+1;ctx.beginPath();ctx.arc(p.x,p.y,(f.small?8:14)+k*(f.small?22:58),0,6.283);ctx.stroke();}
  else{f.x+=f.vx*dt/z;f.y+=f.vy*dt/z;f.vx*=.93;f.vy*=.93;ctx.globalAlpha=1-k;ctx.fillStyle=k<.3?'#ffffff':'rgba(140,215,255,1)';ctx.beginPath();ctx.arc(p.x,p.y,2.2*(1-k)+.6,0,6.283);ctx.fill();}
  return true;});ctx.globalAlpha=1;}
/* where the joystick sits, in galaxy px, so speech bubbles and names keep clear of it */
function keepOut(g){if(!joy||!joy.isConnected||!g||joy.offsetParent===null)return null;const a=joy.getBoundingClientRect(),b=g.getBoundingClientRect();if(!a.width)return null;return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2,s:a.width+12};}
/* place() asks this for every companion it draws. After a reload (or someone coming back on the map) the table catches up once with
   the map, so a companion that was knocked earlier is drawn where it came to rest, not on its old spot. */
function offset(uid){if(!tb||(!tb.has(uid)&&tb.landed(uid))){const g=geom();if(!g)return null;ensureTable().sync(g.spots,g.radius);}return tb.offset(uid);}
W.LowiEnergy={mount,offset,keepOut,fire:fireAt,remote,stats:()=>({...stats,lat:stats.lat.slice()}),balls:()=>tb?tb.shots().map(x=>({id:x.id,by:x.by,to:x.to,x:Math.round(x.x),y:Math.round(x.y),remote:x.remote})):[],busy:()=>!!(tb&&tb.busy()),state:()=>tb?{mode:tb.mode(),shot:!!tb.shot(),balls:tb.shots().length,bodies:tb.bodies().filter(b=>b.ox||b.oy||b.vx||b.vy).map(b=>({uid:b.uid,ox:Math.round(b.ox),oy:Math.round(b.oy),vx:Math.round(b.vx),vy:Math.round(b.vy)}))}:null,core:api};
})(typeof window==='object'?window:globalThis);
