/* Oct 28 2026 (Emmanuel, voice message + Room screenshot: "Es soll wie ein Billard-Spiel funktionieren, aber halt mit Energy Blasts
   ... Scheiss auf dieses Rauszoomen und Reinzoomen ... ich moechte sehen, dass du da rumrollst, dass wenn du online kommst, du
   merkst, dass du nicht mehr an der selben Position bist"): the pure billiard physics of the Room's Billardtisch. No DOM, no clock,
   no randomness: the same start + the same shot gives the same rest positions on every phone (only + - * / and sqrt, fixed 120 Hz
   steps, balls always solved in uid order), so the shooter computes where everyone ends up, writes it, and every other phone
   replays the same shot from the same start and sees the same roll.
   Table units: a fixed 4:5 table W x H (1000 x 1250), the same on every screen; the UI only scales it.
   A shot: an energy blast leaves your ball in the aimed direction, flies straight, and the first ball it touches gets the blast's
   momentum (the cue strike). From there it is billiards: momentum, rolling friction, cushions with restitution, elastic
   ball-to-ball impulses with positional separation (chain reactions), and a sleep threshold so everything comes to rest. */
(function(W){'use strict';
const T={W:1000,H:1250,R:50,BR:14,HZ:120,DT:1/120,
  DAMP:.9935,      /* velocity kept per step (about 46% per second): the felt's drag */
  ROLL:150,        /* plus a constant rolling resistance in units/s^2, so a slow ball stops instead of creeping */
  WALL:.82,        /* cushion restitution */
  BALL:.94,        /* ball-to-ball restitution */
  SLEEP:6,         /* below this speed (units/s) a ball rests */
  BLAST:3200,      /* blast flight speed, units/s */
  VMIN:700,VMAX:3400,/* speed a direct hit gives, from the softest to the hardest shot */
  RECOIL:.06,      /* your ball is pushed back by this share of the hit speed */
  MAXSTEPS:120*25, /* hard cap: 25 s of table time */
  ENC:4000};       /* stored as 4000 + x / 4000 + y in public.companion_rest, so old room-coordinate rows are ignored */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function r1(v){return Math.round(v*10)/10;}
function hash(s){let h=2166136261;s=String(s||'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
/* A ball with no saved position gets a spot from its uid alone (the same spot on every phone): a cell of a loose grid picked by
   the uid's hash, probing on when the cell is taken (taken = by a ball placed earlier in uid order). */
function homeSpots(uids,fixed){const cols=7,rows=10,cw=T.W/cols,ch=T.H/rows,taken=new Set(),out={};
  const near=(x,y)=>{for(const k in fixed){const p=fixed[k];if(p&&Math.abs(p.x-x)<T.R*2.1&&Math.abs(p.y-y)<T.R*2.1)return true;}for(const k in out){const p=out[k];if(Math.abs(p.x-x)<T.R*2.1&&Math.abs(p.y-y)<T.R*2.1)return true;}return false;};
  const list=uids.slice().sort();
  for(const u of list){if(fixed&&fixed[u])continue;const h=hash(u);let c=h%(cols*rows),tries=0,x=0,y=0;
    for(;tries<cols*rows;tries++){const cc=(c+tries*13)%(cols*rows);if(taken.has(cc))continue;const cx=cc%cols,cy=(cc/cols)|0;
      x=clamp(cw*(cx+.5)+((h>>>8)%21-10)*1.5,T.R+2,T.W-T.R-2);y=clamp(ch*(cy+.5)+((h>>>16)%21-10)*1.5,T.R+2,T.H-T.R-2);
      if(!near(x,y)||tries===cols*rows-1){taken.add(cc);break;}}
    out[u]={x:r1(x),y:r1(y)};}
  return out;}
/* the table state: balls sorted by uid, each {uid,x,y,vx,vy,r,m,spin} */
function table(){const balls=[];let blast=null,steps=0,hit=null,hits=[];
  const find=uid=>{for(const b of balls)if(b.uid===uid)return b;return null;};
  function set(uid,x,y){let b=find(uid);x=clamp(+x||0,T.R,T.W-T.R);y=clamp(+y||0,T.R,T.H-T.R);
    if(!b){b={uid:String(uid),x,y,vx:0,vy:0,r:T.R,m:1,spin:0,moved:0};balls.push(b);balls.sort((a,c)=>a.uid<c.uid?-1:a.uid>c.uid?1:0);}else{b.x=x;b.y=y;b.vx=0;b.vy=0;}return b;}
  function remove(uid){const i=balls.findIndex(b=>b.uid===uid);if(i>=0)balls.splice(i,1);}
  function keep(uids){const k=new Set(uids);for(let i=balls.length-1;i>=0;i--)if(!k.has(balls[i].uid))balls.splice(i,1);}
  /* push overlapping balls apart (positions only), e.g. after loading positions two different shots wrote */
  function relax(n){for(let it=0;it<(n||30);it++){let moved=false;
    for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){const a=balls[i],b=balls[j];let dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy,min=a.r+b.r;
      if(d2>=min*min)continue;let d=Math.sqrt(d2);if(d<1e-6){dx=1;dy=0;d=1;}else{dx/=d;dy/=d;}const o=(min-d)/2+.01;a.x-=dx*o;a.y-=dy*o;b.x+=dx*o;b.y+=dy*o;moved=true;}
    for(const b of balls){b.x=clamp(b.x,b.r,T.W-b.r);b.y=clamp(b.y,b.r,T.H-b.r);}if(!moved)break;}}
  /* a shot: from the shooter's ball, direction (dx,dy) (any length), power 0..1 */
  function shoot(by,dx,dy,power){const me=find(by);if(!me||blast)return false;const L=Math.sqrt(dx*dx+dy*dy);if(!(L>1e-6))return false;
    const ux=dx/L,uy=dy/L,p=clamp(+power||0,0,1);blast={by,x:me.x+ux*(me.r+T.BR+1),y:me.y+uy*(me.r+T.BR+1),ux,uy,p,v:T.VMIN+(T.VMAX-T.VMIN)*p};hit=null;hits=[];steps=0;return true;}
  function wall(b){const e=T.WALL;if(b.x<b.r){b.x=b.r+(b.r-b.x)*e;if(b.vx<0){b.vx=-b.vx*e;hits.push({k:'wall',uid:b.uid,s:steps});}}else if(b.x>T.W-b.r){b.x=T.W-b.r-(b.x-(T.W-b.r))*e;if(b.vx>0){b.vx=-b.vx*e;hits.push({k:'wall',uid:b.uid,s:steps});}}
    if(b.y<b.r){b.y=b.r+(b.r-b.y)*e;if(b.vy<0){b.vy=-b.vy*e;hits.push({k:'wall',uid:b.uid,s:steps});}}else if(b.y>T.H-b.r){b.y=T.H-b.r-(b.y-(T.H-b.r))*e;if(b.vy>0){b.vy=-b.vy*e;hits.push({k:'wall',uid:b.uid,s:steps});}}
    b.x=clamp(b.x,b.r,T.W-b.r);b.y=clamp(b.y,b.r,T.H-b.r);}
  function step(){const dt=T.DT;steps++;
    /* the blast flies first; the first ball it touches takes its momentum */
    if(blast){blast.x+=blast.ux*T.BLAST*dt;blast.y+=blast.uy*T.BLAST*dt;let best=null,bd=1e18;
      for(const b of balls){if(b.uid===blast.by&&steps<4)continue;const dx=b.x-blast.x,dy=b.y-blast.y,d2=dx*dx+dy*dy,min=b.r+T.BR;if(d2<min*min&&d2<bd){bd=d2;best=b;}}
      if(best){best.vx+=blast.ux*blast.v;best.vy+=blast.uy*blast.v;hit={uid:best.uid,x:blast.x,y:blast.y,s:steps};hits.push({k:'blast',uid:best.uid,s:steps});
        if(best.uid!==blast.by){const me=find(blast.by);if(me){me.vx-=blast.ux*blast.v*T.RECOIL;me.vy-=blast.uy*blast.v*T.RECOIL;}}blast=null;}
      else if(blast.x<0||blast.x>T.W||blast.y<0||blast.y>T.H){hits.push({k:'fizzle',x:clamp(blast.x,0,T.W),y:clamp(blast.y,0,T.H),s:steps});blast=null;}}
    /* roll: friction, then move, then cushions */
    for(const b of balls){if(b.vx===0&&b.vy===0)continue;b.vx*=T.DAMP;b.vy*=T.DAMP;let s=Math.sqrt(b.vx*b.vx+b.vy*b.vy);const dec=T.ROLL*dt;
      if(s<=T.SLEEP||s<=dec){b.vx=0;b.vy=0;continue;}const k=(s-dec)/s;b.vx*=k;b.vy*=k;s-=dec;
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.moved+=s*dt;b.spin+=(b.vx>=0?1:-1)*s*dt/b.r;wall(b);}
    /* ball against ball: separate, then an elastic impulse along the line between the centres */
    for(let i=0;i<balls.length;i++){const a=balls[i];for(let j=i+1;j<balls.length;j++){const b=balls[j];let nx=b.x-a.x,ny=b.y-a.y;const min=a.r+b.r;
      if(nx>min||nx<-min||ny>min||ny<-min)continue;const d2=nx*nx+ny*ny;if(d2>=min*min)continue;let d=Math.sqrt(d2);if(d<1e-6){nx=1;ny=0;d=1;}else{nx/=d;ny/=d;}
      const im=1/a.m+1/b.m,o=(min-d)/im;a.x-=nx*o/a.m;a.y-=ny*o/a.m;b.x+=nx*o/b.m;b.y+=ny*o/b.m;
      const vn=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(vn<0){const jn=-(1+T.BALL)*vn/im;a.vx-=jn*nx/a.m;a.vy-=jn*ny/a.m;b.vx+=jn*nx/b.m;b.vy+=jn*ny/b.m;hits.push({k:'ball',a:a.uid,b:b.uid,s:steps,v:-vn});}
      wall(a);wall(b);}}}
  function moving(){if(blast)return true;for(const b of balls)if(b.vx!==0||b.vy!==0)return true;return false;}
  /* run until everything rests (or the cap); returns the number of steps */
  function settle(max){let n=0;const cap=max||T.MAXSTEPS;while(moving()&&n<cap){step();n++;}if(n>=cap)for(const b of balls){b.vx=0;b.vy=0;}if(n>=cap)blast=null;return n;}
  function snapshot(){return balls.map(b=>[b.uid,r1(b.x),r1(b.y)]);}
  function load(rows){for(const r of rows||[])if(r&&r[0]!=null&&isFinite(r[1])&&isFinite(r[2]))set(r[0],r[1],r[2]);}
  function energy(){let e=0;for(const b of balls)e+=.5*b.m*(b.vx*b.vx+b.vy*b.vy);return e;}
  function momentum(){let x=0,y=0;for(const b of balls){x+=b.m*b.vx;y+=b.m*b.vy;}return {x,y};}
  return {set,remove,keep,find,relax,shoot,step,settle,moving,snapshot,load,energy,momentum,balls:()=>balls,blast:()=>blast,hit:()=>hit,hits:()=>hits,steps:()=>steps,
    clearHits(){hits=[];}};}
/* The whole shot, computed at once from a start snapshot: where every ball rests, which ball the blast hit, and how many steps it
   took. The shooter runs this before anything moves on screen; a replaying phone gets the same answer. */
function simulate(start,by,dx,dy,power){const t=table();t.load(start);if(!t.shoot(by,dx,dy,power))return null;const n=t.settle();const s0=new Map((start||[]).map(r=>[String(r[0]),r]));
  const moved=t.snapshot().filter(r=>{const a=s0.get(r[0]);return !a||Math.abs(a[1]-r[1])>=.5||Math.abs(a[2]-r[2])>=.5;});
  const first=t.hits().find(h=>h.k==='blast');return {steps:n,final:t.snapshot(),moved,hit:first?first.uid:null,hits:t.hits().length};}
/* the shot as it travels between phones (realtime broadcast 'energy', v:2 so older builds ignore it) */
function pack(o){return {v:2,k:'bt',id:String(o.id||'').slice(0,40),by:String(o.by||''),n:String(o.n||'').slice(0,40),t:+o.t||0,dx:Math.round((+o.dx||0)*1e6)/1e6,dy:Math.round((+o.dy||0)*1e6)/1e6,p:Math.round(clamp(+o.p||0,0,1)*1000)/1000,s:(o.s||[]).slice(0,80),f:(o.f||[]).slice(0,80)};}
function unpack(m){if(!m||m.v!==2||m.k!=='bt'||!m.by||!Array.isArray(m.s))return null;const ok=r=>Array.isArray(r)&&r.length===3&&typeof r[0]==='string'&&isFinite(r[1])&&isFinite(r[2]);
  const s=m.s.filter(ok).slice(0,80),f=(Array.isArray(m.f)?m.f:[]).filter(ok).slice(0,80);if(!s.length||!isFinite(m.dx)||!isFinite(m.dy))return null;
  return {id:String(m.id||''),by:String(m.by),n:String(m.n||''),t:+m.t||0,dx:+m.dx,dy:+m.dy,p:clamp(+m.p||0,0,1),s,f};}
/* public.companion_rest rows <-> table positions */
function enc(x,y){return {rx:T.ENC+r1(clamp(x,0,T.W)),ry:T.ENC+r1(clamp(y,0,T.H))};}
function dec(rx,ry){rx=+rx;ry=+ry;if(!isFinite(rx)||!isFinite(ry))return null;const x=rx-T.ENC,y=ry-T.ENC;if(x<0||x>T.W||y<0||y>T.H)return null;return {x:r1(x),y:r1(y)};}
/* aiming: from where you drag to a direction (a slingshot: pull back, it flies the other way) and a power 0..1 */
function aim(dragX,dragY,full){const L=Math.sqrt(dragX*dragX+dragY*dragY);if(L<1e-6)return null;return {dx:-dragX/L,dy:-dragY/L,p:clamp(L/(full||140),0,1)};}
/* the guide line: where a blast from (x,y) in direction (dx,dy) first touches a ball (ray against circles), else the cushion */
function guide(balls,by,x,y,dx,dy){const L=Math.sqrt(dx*dx+dy*dy)||1;dx/=L;dy/=L;let best=null,bt=1e18;
  for(const b of balls){if(b.uid===by)continue;const R=b.r+T.BR,ox=x-b.x,oy=y-b.y,B=ox*dx+oy*dy,C=ox*ox+oy*oy-R*R,disc=B*B-C;if(disc<0)continue;const t=-B-Math.sqrt(disc);if(t>0&&t<bt){bt=t;best=b;}}
  if(best)return {uid:best.uid,x:x+dx*bt,y:y+dy*bt,t:bt};
  let tw=1e18;if(dx>0)tw=Math.min(tw,(T.W-x)/dx);if(dx<0)tw=Math.min(tw,-x/dx);if(dy>0)tw=Math.min(tw,(T.H-y)/dy);if(dy<0)tw=Math.min(tw,-y/dy);return {uid:null,x:x+dx*tw,y:y+dy*tw,t:tw};}
const api={T,table,simulate,homeSpots,pack,unpack,enc,dec,aim,guide,hash};
if(typeof module==='object'&&module.exports){module.exports=api;}
if(W)W.LowiTableCore=api;
})(typeof window==='object'?window:(typeof globalThis==='object'?globalThis:null));
