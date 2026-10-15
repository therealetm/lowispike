/* LOWiSPIKE Community spirit galaxy: pure layout and "who is this message for" rules, plus the calm sky/stream canvas.
   The view glue (DOM, composer, privacy, transport) stays in community-chat.js. No network, no storage here. */
(function(root){
'use strict';
function hash(s){let h=2166136261;for(const c of String(s||''))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h>>>0;}
function rng(seed){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x>>>=0;x^=x>>>17;x^=x<<5;x>>>=0;return (x%100000)/100000;};}

/* Cells: each member owns one cell, so a bubble never covers another member. You sit in the middle of the bottom row.
   'top' = bubble above the body (roomy screens); 'side' = bubble beside it (short phone screens fit twice as many spirits). */
function grid(w,h,mode){
 w=Math.max(200,+w||360);h=Math.max(160,+h||420);
 const big=w>=640&&h>=520,tab=w>=640,tiny=w<350,side=mode==='side';
 const minW=side?(tab?240:tiny?140:168):(big?178:tiny?148:124),minH=side?(tab?96:tiny?70:76):(big?150:tiny?108:112);
 const cols=Math.max(side?1:2,Math.min(side?5:(big?7:4),Math.floor(w/minW))),rows=Math.max(2,Math.min(side?9:5,Math.floor(h/minH)));
 const cw=w/cols,ch=h/rows,cells=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)cells.push({r,c,x:c*cw,y:r*ch,w:cw,h:ch});
 const last=rows-1,even=cols%2===0,mid=Math.floor(cols/2);
 const meBlocks=cols===1?[last]:side?[last*cols+Math.floor((cols-1)/2)]:even?[last*cols+mid-1,last*cols+mid]:[last*cols+mid];
 return {w,h,cols,rows,cw,ch,big,tab,tiny,side,cells,meBlocks};
}
function sizes(g){return {body:g.big?60:g.tab?56:g.tiny?42:46,me:g.big?70:g.tab?64:g.tiny?48:54,name:g.tab?16:15};}
function pickMode(w,h){const t=grid(w,h,'top'),s=grid(w,h,'side'),n=g=>g.cells.length-g.meBlocks.length,roomy=t.ch>=sizes(t).body+80;return roomy&&n(t)>=n(s)?'top':'side';}
/* layout(): members = [{uid, ...}] in priority order (newest talkers first). Returns positions in stage pixels. */
function layout(members,w,h,meId,opts){
 const mode=(opts&&opts.mode)||pickMode(w,h),g=grid(w,h,mode),S=sizes(g),top=opts&&opts.reserveTop&&g.rows>2?g.cols:0,free=g.cells.map((c,i)=>i).filter(i=>i>=top&&!g.meBlocks.includes(i)),n=free.length,taken=new Set(),out=[];
 const meCell=g.meBlocks.length===2?{x:g.cells[g.meBlocks[0]].x,y:g.cells[g.meBlocks[0]].y,w:g.cw*2,h:g.ch,r:g.rows-1,c:g.cells[g.meBlocks[0]].c}:g.cells[g.meBlocks[0]];
 out.push(place({uid:meId||'me',me:true},meCell,S.me,S,true,g));
 for(const m of members){if(out.length>n)break;if(!m||!m.uid||m.uid===meId)continue;
  let k=hash(m.uid)%n;for(let t=0;t<n&&taken.has(k);t++)k=(k+1)%n;if(taken.has(k))break;taken.add(k);
  out.push(place(m,g.cells[free[k]],S.body,S,false,g));}
 return {grid:g,mode,sizes:S,spots:out,capacity:n};
}
function place(m,cell,body,S,me,g){
 const r=rng(hash(m.uid)+7);
 if(g&&g.side){
  const dir=me?'l':((cell.r+cell.c)%2?'r':'l'),jx=me?0:Math.round(r()*10),jy=me?0:Math.round((r()-.5)*6);
  const x=me&&cell.w>=300?cell.x+cell.w/2-60:dir==='l'?cell.x+10+body/2+jx:cell.x+cell.w-10-body/2-jx;
  const cy=cell.y+cell.h/2-(S.name+4)/2+jy;
  const left=dir==='l'?x+body/2+12:cell.x+6,right=dir==='l'?cell.x+cell.w-6:x-body/2-12,bw=Math.max(0,Math.min(me?240:210,right-left)),max=Math.max(0,cell.h-8);
  return {uid:m.uid,me:!!me,x:Math.round(x),y:Math.round(cy),size:body,cell,bub:{mode:dir,left:Math.round(dir==='l'?left:right-bw),right:Math.round(right),width:Math.round(bw),cy:Math.round(Math.max(cell.y+4+Math.min(max,44)/2,Math.min(cy,cell.y+cell.h-4-Math.min(max,44)/2))),max:Math.round(max),lines:bw<70?0:Math.max(0,Math.min(3,Math.floor((max-14)/14)))}};
 }
 const slack=Math.max(0,cell.w-body-16);
 const x=cell.x+cell.w/2+(me?0:(r()-.5)*slack*.55),jy=me?0:Math.round(r()*3);
 const cy=cell.y+cell.h-S.name-6-body/2-jy;
 const bubTop=cell.y+4,bubBottom=cy-body/2-10,bubMax=Math.max(0,bubBottom-bubTop);
 const bw=Math.min(cell.w-12,me?260:210),bl=Math.max(cell.x+6,Math.min(x-bw/2,cell.x+cell.w-6-bw));
 return {uid:m.uid,me:!!me,x:Math.round(x),y:Math.round(cy),size:body,cell,bub:{mode:'top',left:Math.round(bl),width:Math.round(bw),bottom:Math.round(bubBottom),max:Math.round(bubMax),lines:Math.max(0,Math.min(3,Math.floor((bubMax-14)/14)))}};
}

/* Who a message is for: a reply goes to the parent's author; otherwise the first @mention of a known name (longest name wins, spaces allowed). */
function nameIndex(list){const seen=new Map();for(const p of list||[]){const n=String(p&&p.n||'').trim();if(n&&p.uid&&!seen.has(n.toLocaleLowerCase()))seen.set(n.toLocaleLowerCase(),{uid:p.uid,n});}return [...seen.values()].sort((a,b)=>b.n.length-a.n.length);}
function mentionOf(text,index){const t=String(text||''),low=t.toLocaleLowerCase();let best=null;
 for(const p of index||[]){const key='@'+p.n.toLocaleLowerCase();let at=low.indexOf(key);while(at>=0){const after=t.charAt(at+key.length);if(!after||!/[\p{L}\p{N}_-]/u.test(after)){if(!best||at<best.at)best={at,uid:p.uid,n:p.n,len:key.length};break;}at=low.indexOf(key,at+1);}}
 return best;}
function targetOf(m,all,index){if(!m)return null;
 if(m.re){const p=(all||[]).find(x=>x&&x.id===m.re);if(p&&p.uid&&p.uid!==m.uid)return {uid:p.uid,n:p.by||'',via:'reply'};}
 const hit=mentionOf(m.t,index);return hit&&hit.uid!==m.uid?{uid:hit.uid,n:hit.n,via:'mention',at:hit.at,len:hit.len}:null;}
/* Text for the bubble: a leading "@Name " becomes the "to Name" label instead of repeating it. */
function bubbleText(m,target){const t=String(m&&m.t||'');if(target&&target.via==='mention'&&target.at===0)return t.slice(target.len).replace(/^[\s,:]+/,'')||t;return t;}
function direct(text,name){const t=String(text||'').trim(),n=String(name||'').trim();if(!n)return t;const tag='@'+n;return t.toLocaleLowerCase().startsWith(tag.toLocaleLowerCase())?t:tag+' '+t;}
/* Bubbles fade with age: fresh = full, a day old = soft, older than a week = gone (the body stays). */
function fade(ts,now){const age=Math.max(0,(now||Date.now())-(+ts||0)),M=60000;if(age<15*M)return 1;if(age<24*60*M)return +(1-(age-15*M)/(24*60*M-15*M)*.42).toFixed(2);if(age<7*24*60*M)return +(.58-(age-24*60*M)/(6*24*60*M)*.2).toFixed(2);return 0;}

/* Sky: stars, two soft nebulae and the stream lines between bodies. Draws nothing without a real canvas. */
function sky(canvas,opts){
 const ctx=canvas&&canvas.getContext&&canvas.getContext('2d');if(!ctx)return null;
 const reduce=()=>!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
 let w=0,h=0,dpr=1,stars=[],lines=[],raf=0,last=0,running=false,light=false,seed=hash('lowi-galaxy');
 function size(){const r=canvas.getBoundingClientRect?canvas.getBoundingClientRect():{width:0,height:0};const nw=Math.round(r.width),nh=Math.round(r.height);dpr=Math.min(2,root.devicePixelRatio||1);if(nw===w&&nh===h&&canvas.width===Math.round(nw*dpr))return;w=nw;h=nh;canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));const r2=rng(seed),count=Math.round(Math.min(220,w*h/2600));stars=[];for(let i=0;i<count;i++)stars.push({x:r2()*w,y:r2()*h,r:r2()<.12?1.6:r2()*1.1+.35,p:r2()*6.28,s:.4+r2()*1.4});}
 function curve(a,b){const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,bend=Math.min(60,len*.22);return {a,b,c:{x:mx-dy/len*bend,y:my+dx/len*bend-bend*.35}};}
 function at(q,t){const u=1-t;return {x:u*u*q.a.x+2*u*t*q.c.x+t*t*q.b.x,y:u*u*q.a.y+2*u*t*q.c.y+t*t*q.b.y};}
 function draw(now){
  size();if(!w||!h)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const still=reduce(),t=now/1000;
  const neb=[[.22,.28,.55,light?'rgba(255,170,210,.30)':'rgba(140,90,220,.26)'],[.8,.62,.6,light?'rgba(150,200,255,.34)':'rgba(60,150,200,.22)'],[.5,.95,.5,light?'rgba(255,220,170,.28)':'rgba(220,110,150,.16)']];
  for(const [nx,ny,nr,col] of neb){const g=ctx.createRadialGradient(nx*w,ny*h,0,nx*w,ny*h,nr*Math.max(w,h));g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
  for(const s of stars){const tw=still?.8:.55+.45*Math.sin(t*s.s+s.p);ctx.globalAlpha=(light?.45:.85)*tw;ctx.fillStyle=light?'#7d6bb0':'#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill();}
  ctx.globalAlpha=1;
  for(const L of lines){const q=curve(L.a,L.b),alpha=Math.max(.15,L.alpha||1);
   const grad=ctx.createLinearGradient(q.a.x,q.a.y,q.b.x,q.b.y);grad.addColorStop(0,L.from||'#9cdac7');grad.addColorStop(1,L.to||'#ffd27a');
   ctx.lineCap='round';ctx.strokeStyle=grad;
   for(const [lw,ga] of [[L.sel?9:7,.16],[L.sel?3.2:2.2,.9]]){ctx.globalAlpha=alpha*ga;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(q.a.x,q.a.y);ctx.quadraticCurveTo(q.c.x,q.c.y,q.b.x,q.b.y);ctx.stroke();}
   const n=still?0:(L.sel?4:3);for(let k=0;k<n;k++){const p=at(q,((t*(L.sel?.42:.3))+k/n)%1);ctx.globalAlpha=alpha;ctx.fillStyle=light?'#fff':'#fffbe8';ctx.shadowColor=L.to||'#ffd27a';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,L.sel?3.2:2.5,0,6.283);ctx.fill();ctx.shadowBlur=0;}
   if(still){const p=at(q,.82);ctx.globalAlpha=alpha;ctx.fillStyle=L.to||'#ffd27a';ctx.beginPath();ctx.arc(p.x,p.y,3,0,6.283);ctx.fill();}
  }
  ctx.globalAlpha=1;
 }
 function loop(now){raf=0;if(!running)return;if(now-last>=33){last=now;draw(now);}raf=(root.requestAnimationFrame||setTimeout)(loop,16);}
 return {
  set(next,isLight){lines=Array.isArray(next)?next:[];light=!!isLight;if(!running||reduce())draw(performance.now?performance.now():Date.now());},
  start(){if(running)return;running=true;if(reduce()){draw(0);running=false;return;}raf=(root.requestAnimationFrame||setTimeout)(loop,16);},
  stop(){running=false;if(raf&&root.cancelAnimationFrame)root.cancelAnimationFrame(raf);raf=0;},
  resize(){w=0;h=0;draw(performance.now?performance.now():Date.now());},
  running:()=>running
 };
}
const api={hash,grid,layout,sizes,pickMode,nameIndex,mentionOf,targetOf,bubbleText,direct,fade,sky};
if(typeof module==='object'&&module.exports)module.exports=api;
root.LowiGalaxy=api;
})(typeof window!=='undefined'?window:globalThis);
