/* LOWiSPIKE Community energy hits (Oct 16, Emmanuel: "like Beyblades / billiard balls: they collide and go flying, bing bing bing,
   until everyone stops rolling"). A small blue glass joystick in the right corner of the Community galaxy aims YOUR companion:
   while you pull, it turns into a pointed energy form facing the aim; let go and the energy burst flies. A companion it hits gets
   knocked and rolls like a billiard ball, bouncing off the others until everything stops, then everyone drifts back to their own
   spot so the map stays readable. A hit is never damage: it sends that person energy (a "+energy" sparkle, and for real members a
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
function tune(reduced){return reduced?{speed:.45,range:.5,friction:4.2,roll:60,ret:7,settle:.15,maxOff:90}:{speed:1,range:1,friction:1.25,roll:34,ret:2.6,settle:.45,maxOff:240};}
/* The billiard table: circles at fixed home spots with an offset each. World units = map units. */
function table(opts){
 const T=Object.assign(tune(opts&&opts.reduced),opts&&opts.tune||{});const bodies=new Map();let shot=null,mode='home',still=0,bound=1e9;
 function sync(spots,radius){const seen=new Set();if(radius!=null)bound=(+radius||0)+90;
  for(const s of spots||[]){if(!s||!s.uid)continue;seen.add(s.uid);let b=bodies.get(s.uid);if(!b){b={uid:s.uid,ox:0,oy:0,vx:0,vy:0};bodies.set(s.uid,b);}b.hx=+s.x||0;b.hy=+s.y||0;b.r=Math.max(6,+s.r||20);b.me=!!s.me;}
  for(const k of [...bodies.keys()])if(!seen.has(k))bodies.delete(k);}
 function fire(from,ang,power,startR){power=Math.max(0,Math.min(1,+power||0));const sp=(620+620*power)*T.speed,dx=Math.cos(ang),dy=Math.sin(ang),r0=+startR||0;
  shot={x:from.x+dx*r0,y:from.y+dy*r0,dx,dy,sp,power,left:(150+520*power)*T.range,r:9,trail:[],by:from.uid||''};if(mode==='home')mode='free';still=0;return shot;}
 function speedOf(b){return Math.hypot(b.vx,b.vy);}
 function collide(a,b){if(a.me&&b.me)return;const ax=a.hx+a.ox,ay=a.hy+a.oy,bx=b.hx+b.ox,by=b.hy+b.oy,dx=bx-ax,dy=by-ay,d=Math.hypot(dx,dy),min=a.r+b.r;
  if(!(d<min)||d<1e-6)return false;const moving=speedOf(a)>1||speedOf(b)>1;if(!moving)return false;
  const nx=dx/d,ny=dy/d,rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny,ima=a.me?0:1,imb=b.me?0:1,im=ima+imb;if(!im)return false;
  const over=min-d;a.ox-=nx*over*ima/im;a.oy-=ny*over*ima/im;b.ox+=nx*over*imb/im;b.oy+=ny*over*imb/im;
  if(rv>=0)return true;const e=.92,j=-(1+e)*rv/im;a.vx-=j*nx*ima;a.vy-=j*ny*ima;b.vx+=j*nx*imb;b.vy+=j*ny*imb;return true;}
 function sub(dt,ev){
  if(shot){const prev={x:shot.x,y:shot.y},go=Math.min(shot.left,shot.sp*dt);shot.x+=shot.dx*go;shot.y+=shot.dy*go;shot.left-=go;shot.trail.push(prev);if(shot.trail.length>12)shot.trail.shift();
   let best=null,bt=2;for(const b of bodies.values()){if(b.me)continue;const cx=b.hx+b.ox,cy=b.hy+b.oy,R=b.r+shot.r,fx=prev.x-cx,fy=prev.y-cy,ex=shot.x-prev.x,ey=shot.y-prev.y,A=ex*ex+ey*ey;if(!A)continue;
    const B=2*(fx*ex+fy*ey),C=fx*fx+fy*fy-R*R,disc=B*B-4*A*C;if(disc<0)continue;const t=(-B-Math.sqrt(disc))/(2*A);const tt=C<=0?0:t;if(tt>=0&&tt<=1&&tt<bt){bt=tt;best=b;}}
   if(best){const hx=prev.x+(shot.x-prev.x)*bt,hy=prev.y+(shot.y-prev.y)*bt,kick=(260+640*shot.power)*T.speed;best.vx+=shot.dx*kick;best.vy+=shot.dy*kick;ev.push({type:'hit',uid:best.uid,x:hx,y:hy,power:shot.power,by:shot.by});shot=null;mode='free';still=0;}
   else if(shot.left<=.01){ev.push({type:'fizzle',x:shot.x,y:shot.y});shot=null;}}
  if(mode==='free'){
   for(const b of bodies.values()){if(b.me){b.vx=b.vy=0;continue;}b.ox+=b.vx*dt;b.oy+=b.vy*dt;const s=speedOf(b);
    if(s>0){const ns=Math.max(0,s*Math.exp(-T.friction*dt)-T.roll*dt),k=ns/s;b.vx*=k;b.vy*=k;}
    /* gentle bounds: a soft wall a little way from home, and the edge of the map */
    const od=Math.hypot(b.ox,b.oy),soft=T.maxOff*.55;if(od>soft){const pull=(od-soft)*14*dt;b.vx-=b.ox/od*pull;b.vy-=b.oy/od*pull;}if(od>T.maxOff){const nx=b.ox/od,ny=b.oy/od,out=b.vx*nx+b.vy*ny;if(out>0){b.vx-=1.5*out*nx;b.vy-=1.5*out*ny;}b.ox=nx*T.maxOff;b.oy=ny*T.maxOff;}
    const px=b.hx+b.ox,py=b.hy+b.oy,pd=Math.hypot(px,py);if(pd>bound){const nx=px/pd,ny=py/pd,out=b.vx*nx+b.vy*ny;if(out>0){b.vx-=1.6*out*nx;b.vy-=1.6*out*ny;}b.ox-=nx*(pd-bound);b.oy-=ny*(pd-bound);}}
   const list=[...bodies.values()];for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(collide(list[i],list[j])&&(speedOf(list[i])>40||speedOf(list[j])>40))ev.push({type:'bump',a:list[i].uid,b:list[j].uid});
   let max=0;for(const b of list)max=Math.max(max,speedOf(b));
   if(!shot&&max<6){still+=dt;if(still>=T.settle){mode='back';for(const b of list){b.vx=b.vy=0;}}}else still=0;}
  else if(mode==='back'){const k=Math.exp(-T.ret*dt);let left=0;for(const b of bodies.values()){b.ox*=k;b.oy*=k;if(Math.hypot(b.ox,b.oy)<.4){b.ox=0;b.oy=0;}else left++;}if(!left&&!shot)mode='home';}
 }
 function step(dt){const ev=[];dt=Math.max(0,Math.min(.1,+dt||0));let n=Math.max(1,Math.ceil(dt/(1/120)));const h=dt/n;while(n--)sub(h,ev);
  /* one bump sound/flash per pair per frame is plenty */
  const seen=new Set();return ev.filter(e=>{if(e.type!=='bump')return true;const k=e.a<e.b?e.a+'|'+e.b:e.b+'|'+e.a;if(seen.has(k))return false;seen.add(k);return true;});}
 function offset(uid){const b=bodies.get(uid);return b&&(b.ox||b.oy)?{x:b.ox,y:b.oy}:null;}
 function busy(){if(shot||mode!=='home')return true;for(const b of bodies.values())if(b.ox||b.oy||b.vx||b.vy)return true;return false;}
 function reset(){shot=null;mode='home';still=0;for(const b of bodies.values()){b.ox=b.oy=b.vx=b.vy=0;}}
 function pos(uid){const b=bodies.get(uid);return b?{x:b.hx+b.ox,y:b.hy+b.oy,r:b.r,me:b.me}:null;}
 return {sync,fire,step,offset,busy,reset,pos,shot:()=>shot,mode:()=>mode,bodies:()=>[...bodies.values()].map(b=>({...b})),tune:T};
}
const api={aim,canPing,notePing,table,tune,PING_GAP,PING_WINDOW,PING_MAX,DEAD};
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
let gal=null,joy=null,knob=null,fx=null,ctx=null,live=null,tb=null,tbReduced=null,raf=0,lastT=0,drag=null,aimNow=null,fxList=[],dpr=1;
const map=()=>W.LowiCgMap;
function geom(){const m=map();return m&&m.geom?m.geom():null;}
function scr(g,p){return {x:g.cx+(p.x-g.cam.x)*g.cam.z,y:g.cy+(p.y-g.cam.y)*g.cam.z};}
function meSpot(g){return g&&g.spots.find(s=>s.me);}
function ensureTable(){const r=reduced();if(!tb||tbReduced!==r){tb=table({reduced:r});tbReduced=r;}return tb;}
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
  let best=null,bd=1e9;for(const s of g.spots){if(s.me)continue;const d=Math.hypot(s.x-me.x,s.y-me.y);if(d<bd){bd=d;best=s;}}if(best)fireAt(Math.atan2(best.y-me.y,best.x-me.x),.7);});
}
function move(e){const a=aim(e.clientX-drag.c.x,e.clientY-drag.c.y,knobR());aimNow=a;knob.style.transform='translate('+a.kx.toFixed(1)+'px,'+a.ky.toFixed(1)+'px)';joy.classList.toggle('armed',a.ok);setAim(a.ok?a:null);}
function meEl(){return gal&&gal.querySelector('.cg-body.me');}
function setAim(a){const el=meEl();if(el){el.classList.toggle('ce-aim',!!a);if(a)el.style.setProperty('--ce-p',a.power.toFixed(2));}}
function fireAt(ang,power){const g=geom(),me=meSpot(g);if(!g||!me)return;const t=ensureTable();t.sync(g.spots,g.radius);t.fire({x:me.x,y:me.y,uid:me.uid},ang,power,me.r*.9);
 try{if(navigator.vibrate)navigator.vibrate(12);}catch(e){}const el=meEl();if(el){el.classList.remove('ce-shot');void el.offsetWidth;el.classList.add('ce-shot');setTimeout(()=>el.classList.remove('ce-shot'),420);}kick();}
function kick(){if(raf)return;lastT=0;raf=requestAnimationFrame(frame);}
function size(){const w=gal.clientWidth,h=gal.clientHeight;dpr=Math.min(2,W.devicePixelRatio||1);if(fx.width!==Math.round(w*dpr)||fx.height!==Math.round(h*dpr)){fx.width=Math.round(w*dpr);fx.height=Math.round(h*dpr);}return {w,h};}
function frame(now){raf=0;if(!visible()){if(tb)tb.reset();fxList=[];if(ctx&&fx)ctx.clearRect(0,0,fx.width,fx.height);const m=map();if(m&&m.place)m.place();return;}
 const dt=lastT?Math.min(.1,(now-lastT)/1000):1/60;lastT=now;const g=geom();const t=ensureTable();if(g)t.sync(g.spots,g.radius);
 const was=t.busy(),ev=t.step(dt);for(const e of ev)onEvent(e,g);
 if(was||t.busy()){const m=map();if(m&&m.place)m.place();}
 draw(g,now,dt);
 if(t.busy()||drag||fxList.length)raf=requestAnimationFrame(frame);else if(ctx)ctx.clearRect(0,0,fx.width,fx.height);}
function onEvent(e,g){if(!g)return;
 if(e.type==='hit'){const p=scr(g,{x:e.x,y:e.y});fxList.push({k:'ring',x:e.x,y:e.y,t:0,life:reduced()?.35:.7});if(!reduced())for(let i=0;i<12;i++){const a=Math.random()*6.283,s=60+Math.random()*160;fxList.push({k:'spark',x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:0,life:.5+Math.random()*.4});}
  plus(e.uid,g);ping(e.uid);}
 else if(e.type==='bump'){const A=tb.pos(e.a),B=tb.pos(e.b);if(A&&B&&!reduced())fxList.push({k:'ring',x:(A.x+B.x)/2,y:(A.y+B.y)/2,t:0,life:.35,small:1});}
 else if(e.type==='fizzle')fxList.push({k:'ring',x:e.x,y:e.y,t:0,life:.4,small:1});}
function plus(uid,g){const s=tb.pos(uid);if(!s)return;const p=scr(g,s),el=D.createElement('span');el.className='ce-plus';el.setAttribute('aria-hidden','true');el.innerHTML='<b>⚡</b>'+tr('plus');
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
 /* the burst in flight */
 const sh=tb&&tb.shot();
 if(sh){const pts=sh.trail.concat([{x:sh.x,y:sh.y}]).map(q=>scr(g,q));ctx.lineCap='round';
  for(let i=1;i<pts.length;i++){const k=i/pts.length;ctx.globalAlpha=k*.7;ctx.strokeStyle='rgba(120,210,255,1)';ctx.lineWidth=2+k*7;ctx.beginPath();ctx.moveTo(pts[i-1].x,pts[i-1].y);ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();}
  const hd=pts[pts.length-1];ctx.globalAlpha=1;ctx.shadowColor='rgba(110,200,255,1)';ctx.shadowBlur=20;ctx.fillStyle='#effbff';ctx.beginPath();ctx.arc(hd.x,hd.y,6+sh.power*3,0,6.283);ctx.fill();ctx.shadowBlur=0;}
 /* hit rings and sparks */
 const dt=fdt||1/60;fxList=fxList.filter(f=>{f.t+=dt;if(f.t>=f.life)return false;const k=f.t/f.life,p=scr(g,f);
  if(f.k==='ring'){ctx.globalAlpha=(1-k)*(f.small?.5:.9);ctx.strokeStyle='rgba(160,225,255,1)';ctx.lineWidth=f.small?1.5:3*(1-k)+1;ctx.beginPath();ctx.arc(p.x,p.y,(f.small?8:14)+k*(f.small?22:58),0,6.283);ctx.stroke();}
  else{f.x+=f.vx*dt/z;f.y+=f.vy*dt/z;f.vx*=.93;f.vy*=.93;ctx.globalAlpha=1-k;ctx.fillStyle=k<.3?'#ffffff':'rgba(140,215,255,1)';ctx.beginPath();ctx.arc(p.x,p.y,2.2*(1-k)+.6,0,6.283);ctx.fill();}
  return true;});ctx.globalAlpha=1;}
/* where the joystick sits, in galaxy px, so speech bubbles and names keep clear of it */
function keepOut(g){if(!joy||!joy.isConnected||!g||joy.offsetParent===null)return null;const a=joy.getBoundingClientRect(),b=g.getBoundingClientRect();if(!a.width)return null;return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2,s:a.width+12};}
function offset(uid){return tb?tb.offset(uid):null;}
W.LowiEnergy={mount,offset,keepOut,fire:fireAt,busy:()=>!!(tb&&tb.busy()),state:()=>tb?{mode:tb.mode(),shot:!!tb.shot(),bodies:tb.bodies().filter(b=>b.ox||b.oy||b.vx||b.vy).map(b=>({uid:b.uid,ox:Math.round(b.ox),oy:Math.round(b.oy),vx:Math.round(b.vx),vy:Math.round(b.vy)}))}:null,core:api};
})(typeof window==='object'?window:globalThis);
