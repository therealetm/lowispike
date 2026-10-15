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
 /* Oct 16 (E-man's wallpaper: a sun in the middle, worlds on orbits around it): you sit in the middle row, the centre of the system. */
 const last=rows>2?Math.floor(rows/2):rows-1,even=cols%2===0,mid=Math.floor(cols/2);
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

/* Galaxy bots (Oct 16, 2026, E-man: "make up individual persons, individual levels of their Mistys, individual birth dates").
   Made-up companions so the galaxy is never a wall of the same few names: every bot is one person with its own first name,
   its own companion name, a birth date (so a star sign and an age), a level and the evolution stage that level reaches.
   Deterministic (same galaxy on every phone), never stored on the server, always marked as a bot in their profile. */
const BOT_PEOPLE=['Amara','Jonas','Sofía','Kenji','Priya','Mateo','Ingrid','Tobias','Leilani','Yusuf','Clara','Dario','Noor','Elif','Rafael','Hana','Malik','Freya','Diego','Aiko','Bastian','Zara','Luca','Mirela','Oskar','Valentina','Kofi','Inés','Samir','Greta'];
const BOT_MATES=['Pip','Nimbus','Juniper','Ember','Sprout','Quill','Mochi','Brisa','Tumble','Fennel','Lumi','Kiwi','Pebble','Saffron','Wisp','Biscuit','Coral','Tansy','Rune','Basil','Nori','Clover','Zephyr','Marlo','Sorrel','Puck','Indigo','Olive','Tiko','Hazel'];
const BOT_LINES=[['16:8 fasting, day 12','16:8 Fasten, Tag 12','Ayuno 16:8, día 12'],['Swapping white rice for lentils','Tausche weißen Reis gegen Linsen','Cambio arroz blanco por lentejas'],['Walk after every dinner','Nach jedem Abendessen ein Spaziergang','Paseo después de cada cena'],['Two litres before noon','Zwei Liter vor Mittag','Dos litros antes del mediodía'],['Learning to love bitter greens','Lerne bittere Blätter zu mögen','Aprendo a amar las verduras amargas'],['Morning stretch, then oats','Morgens dehnen, dann Hafer','Estiramiento y luego avena'],['Cooking more beans this month','Diesen Monat mehr Bohnen','Este mes más legumbres'],['First 18 hour fast done','Erstes 18-Stunden-Fasten geschafft','Primer ayuno de 18 horas hecho'],['Stairs instead of the lift','Treppe statt Aufzug','Escaleras en vez del ascensor'],['Less sugar in my coffee','Weniger Zucker im Kaffee','Menos azúcar en el café'],['Dancing in the kitchen counts','Tanzen in der Küche zählt','Bailar en la cocina cuenta'],['Veggies first, then the rest','Erst Gemüse, dann der Rest','Primero verduras, luego lo demás']];
const SIGNS=[['Capricorn',1,19,'earth','#8fb39a','#c9b38a'],['Aquarius',2,18,'air','#8fd3ff','#b9a8ff'],['Pisces',3,20,'water','#8ad7d2','#b8b0ff'],['Aries',4,19,'fire','#ff9f7a','#ffd27a'],['Taurus',5,20,'earth','#9fd59a','#e6c7a0'],['Gemini',6,20,'air','#ffe28a','#9fd8ff'],['Cancer',7,22,'water','#a8d8ff','#e0c8ff'],['Leo',8,22,'fire','#ffb35c','#ffe08a'],['Virgo',9,22,'earth','#b5d6a0','#d8c9a8'],['Libra',10,22,'air','#f6b8d8','#b8c8ff'],['Scorpio',11,21,'water','#7fb8c9','#c08ad8'],['Sagittarius',12,21,'fire','#ff8f8f','#ffc58a'],['Capricorn',12,31,'earth','#8fb39a','#c9b38a']];
const TYPES16=['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
function signOf(month,day){for(const s of SIGNS)if(month<s[1]||(month===s[1]&&day<=s[2]))return s;return SIGNS[0];}
function stageForLevel(lv){lv=+lv||1;return lv<3?0:lv<7?1:lv<13?2:lv<20?3:lv<30?4:5;}
function ageOn(bday,now){const b=new Date(bday+'T12:00:00'),n=new Date(+now||Date.now());let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a;}
function bots(opts){
 opts=opts||{};const now=+opts.now||Date.now(),r=rng(hash('lowi-galaxy-bots-v1')),out=[],levels=[1,2,4,5,8,9,11,14,16,18,21,23,26,29,31,34,38,42];
 const mates=BOT_MATES.slice();for(let i=mates.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[mates[i],mates[j]]=[mates[j],mates[i]];}
 BOT_PEOPLE.forEach((n,i)=>{
  const y=1958+Math.floor(r()*48),mo=1+Math.floor(r()*12),d=1+Math.floor(r()*28),bday=y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const sg=signOf(mo,d),lv=levels[(i*7+Math.floor(r()*3))%levels.length]+Math.floor(r()*2),stage=stageForLevel(lv);
  const xp=Math.round(lv*lv*12+r()*80),since=now-Math.round((10+r()*400)*864e5);
  out.push({uid:'bot:'+n.normalize('NFD').replace(/[^a-z]/gi,'').toLowerCase(),bot:true,n,mate:mates[i],bday,age:ageOn(bday,now),sign:sg[0],el:sg[3],pal:{a:sg[4],b:sg[5]},type:TYPES16[Math.floor(r()*16)],lv,stage,xp,since,line:BOT_LINES[i%BOT_LINES.length],seed:hash(n)%65536});
 });
 return out;
}
/* One name, one body: duplicates of a name (several test accounts, an old device session) collapse into the most recently
   active one, then the highest level. Your own name is yours alone. Bots whose name is taken by a real person step aside. */
function uniqueNames(list,ownName,lastTs){const own=String(ownName||'').trim().toLocaleLowerCase(),best=new Map();
 for(const p of list||[]){if(!p||!p.uid)continue;const k=String(p.n||'').trim().toLocaleLowerCase();if(!k||(own&&k===own))continue;const cur=best.get(k);
  const score=q=>[+(lastTs&&lastTs.get(q.uid))||0,+q.lv||0];if(!cur){best.set(k,p);continue;}const a=score(p),b=score(cur);if(a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1]))best.set(k,p);}
 return [...best.values()];}
function withBots(people,botList,ownName){const taken=new Set((people||[]).map(p=>String(p.n||'').trim().toLocaleLowerCase()));if(ownName)taken.add(String(ownName).trim().toLocaleLowerCase());return (botList||[]).filter(b=>!taken.has(b.n.toLocaleLowerCase()));}
/* A bot's short answer, picked from what you wrote and who they are. Local only: nothing is posted to the room. */
function botReply(b,text,lang){const l=lang===1||lang===2?lang:0,t=String(text||'').toLocaleLowerCase(),C=['Spark','Bud','Sprite','Drifter','Guardian','Radiant'],form=[C,['Funke','Knospe','Flitzer','Gleiter','Hüter','Strahler'],['Chispa','Brote','Duende','Viajero','Guardián','Radiante']][l][b.stage];
 const pick=(arr)=>arr[hash(t+b.uid)%arr.length][l];
 if(/fast|fasten|ayun/.test(t))return pick([['Fasting here too. '+b.mate+' glows brighter after 14 hours.','Ich faste auch. '+b.mate+' leuchtet nach 14 Stunden heller.','Yo también ayuno. '+b.mate+' brilla más tras 14 horas.'],['My trick: lots of water and a walk when it gets hard.','Mein Trick: viel Wasser und ein Spaziergang, wenn es schwer wird.','Mi truco: mucha agua y un paseo cuando cuesta.']]);
 if(/water|wasser|agua|drink|trink|beb/.test(t))return pick([['Glass number five for me today. '+b.mate+' loves it.','Für mich heute Glas Nummer fünf. '+b.mate+' liebt es.','Hoy voy por el quinto vaso. A '+b.mate+' le encanta.']]);
 if(/level|stage|stufe|nivel|misty|grow|wachs|crec/.test(t))return pick([[b.mate+' is a '+form+' now, level '+b.lv+'. How far is yours?',b.mate+' ist jetzt ein '+form+', Level '+b.lv+'. Wie weit ist deins?',b.mate+' ya es '+form+', nivel '+b.lv+'. ¿Y el tuyo?']]);
 if(/\?$/.test(t.trim()))return pick([['Good question. I would try it for a week and see how you feel.','Gute Frage. Ich würde es eine Woche testen und schauen, wie es dir geht.','Buena pregunta. Yo lo probaría una semana y vería cómo te sientes.'],['Hmm, I think small steps work best for me.','Hmm, bei mir klappen kleine Schritte am besten.','Hmm, a mí me funcionan mejor los pasos pequeños.']]);
 if(/^(hi|hey|hello|hallo|hola|moin|servus|yo)\b/.test(t)||t.length<8)return pick([['Hey! I am '+b.n+', and this is '+b.mate+'. '+b.line[0]+'.','Hey! Ich bin '+b.n+', und das ist '+b.mate+'. '+b.line[1]+'.','¡Hola! Soy '+b.n+' y este es '+b.mate+'. '+b.line[2]+'.']]);
 return pick([['Love that. '+b.mate+' just did a little spin.','Schön! '+b.mate+' hat gerade eine kleine Drehung gemacht.','¡Me encanta! '+b.mate+' acaba de dar una vuelta.'],['Same here, one day at a time.','Geht mir auch so, Tag für Tag.','Igual por aquí, día a día.'],['Thanks for the message! '+b.line[0]+', that is my thing right now.','Danke für die Nachricht! '+b.line[1]+', das ist gerade mein Ding.','¡Gracias por el mensaje! '+b.line[2]+', eso es lo mío ahora.']]);}
/* The line between two bodies: one gentle curve, the same one the sky draws, so a label can sit exactly on its middle. */
function curveOf(a,b){const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,bend=Math.min(60,len*.22);return {a,b,c:{x:mx-dy/len*bend,y:my+dx/len*bend-bend*.35}};}
function pointOn(q,t){const u=1-t;return {x:u*u*q.a.x+2*u*t*q.c.x+t*t*q.b.x,y:u*u*q.a.y+2*u*t*q.c.y+t*t*q.b.y};}
function midOf(a,b){return pointOn(curveOf(a,b),.5);}

/* Sky: stars, two soft nebulae and the stream lines between bodies. Draws nothing without a real canvas. */
function sky(canvas,opts){
 const ctx=canvas&&canvas.getContext&&canvas.getContext('2d');if(!ctx)return null;
 const reduce=()=>!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
 let w=0,h=0,dpr=1,stars=[],lines=[],orbits=null,raf=0,last=0,running=false,light=false,seed=hash('lowi-galaxy');
 function size(){const r=canvas.getBoundingClientRect?canvas.getBoundingClientRect():{width:0,height:0};const nw=Math.round(r.width),nh=Math.round(r.height);dpr=Math.min(2,root.devicePixelRatio||1);if(nw===w&&nh===h&&canvas.width===Math.round(nw*dpr))return;w=nw;h=nh;canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));const r2=rng(seed),count=Math.round(Math.min(220,w*h/2600));stars=[];for(let i=0;i<count;i++)stars.push({x:r2()*w,y:r2()*h,r:r2()<.12?1.6:r2()*1.1+.35,p:r2()*6.28,s:.4+r2()*1.4});}
 const curve=curveOf,at=pointOn;
 function draw(now){
  size();if(!w||!h)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const still=reduce(),t=now/1000;
  /* Oct 16: deep space like E-man's iOS wallpaper: pure black, faint stars, a glowing sun behind you and thin grey orbit rings
     that pass through every other world, so each companion sits on its own orbit. */
  const O=orbits&&isFinite(orbits.cx)&&isFinite(orbits.cy)?orbits:null;
  if(O){const R0=Math.max(40,Math.min(w,h)*.16),g=ctx.createRadialGradient(O.cx,O.cy,0,O.cx,O.cy,R0*2.6);g.addColorStop(0,'rgba(255,244,214,.55)');g.addColorStop(.18,'rgba(255,214,150,.22)');g.addColorStop(.45,'rgba(120,150,255,.07)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
   const seen=[];ctx.lineWidth=.8;ctx.strokeStyle='rgba(235,235,245,.16)';
   for(const r of (O.r||[]).slice().sort((a,b)=>a-b)){if(!(r>8)||seen.some(q=>Math.abs(q-r)<10))continue;seen.push(r);ctx.beginPath();ctx.arc(O.cx,O.cy,r,0,6.283);ctx.stroke();}}
  for(const s of stars){const tw=still?.8:.55+.45*Math.sin(t*s.s+s.p);ctx.globalAlpha=.8*tw;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.283);ctx.fill();}
  ctx.globalAlpha=1;
  for(const L of lines){const q=curve(L.a,L.b),alpha=Math.max(.15,L.alpha||1);
   const grad=ctx.createLinearGradient(q.a.x,q.a.y,q.b.x,q.b.y);grad.addColorStop(0,L.from||'#9cdac7');grad.addColorStop(1,L.to||'#ffd27a');
   ctx.lineCap='round';ctx.strokeStyle=grad;
   for(const [lw,ga] of [[L.sel?9:7,.16],[L.sel?3.2:2.2,.9]]){ctx.globalAlpha=alpha*ga;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(q.a.x,q.a.y);ctx.quadraticCurveTo(q.c.x,q.c.y,q.b.x,q.b.y);ctx.stroke();}
   const n=still?0:(L.sel?4:3);for(let k=0;k<n;k++){const p=at(q,((t*(L.sel?.42:.3))+k/n)%1);ctx.globalAlpha=alpha;ctx.fillStyle=light?'#fff':'#fffbe8';ctx.shadowColor=L.to||'#ffd27a';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,L.sel?3.2:2.5,0,6.283);ctx.fill();ctx.shadowBlur=0;}
   if(still){const p=at(q,.82);ctx.globalAlpha=alpha;ctx.fillStyle=L.to||'#ffd27a';ctx.beginPath();ctx.arc(p.x,p.y,3,0,6.283);ctx.fill();}
   if(L.arrow){const len=Math.hypot(q.b.x-q.a.x,q.b.y-q.a.y)||1,te=Math.max(.5,1-((+L.rb||26)+6)/len),p=at(q,te),pb=at(q,te-.03),ang=Math.atan2(p.y-pb.y,p.x-pb.x),s=L.sel?11:9;
    ctx.globalAlpha=alpha;ctx.fillStyle=L.to||'#ffd27a';ctx.beginPath();ctx.moveTo(p.x+Math.cos(ang)*s*.6,p.y+Math.sin(ang)*s*.6);ctx.lineTo(p.x+Math.cos(ang+2.5)*s,p.y+Math.sin(ang+2.5)*s);ctx.lineTo(p.x+Math.cos(ang-2.5)*s,p.y+Math.sin(ang-2.5)*s);ctx.closePath();ctx.fill();}
  }
  ctx.globalAlpha=1;
 }
 function loop(now){raf=0;if(!running)return;if(now-last>=33){last=now;draw(now);}raf=(root.requestAnimationFrame||setTimeout)(loop,16);}
 return {
  set(next,isLight,orb){lines=Array.isArray(next)?next:[];light=!!isLight;orbits=orb||null;if(!running||reduce())draw(performance.now?performance.now():Date.now());},
  start(){if(running)return;running=true;if(reduce()){draw(0);running=false;return;}raf=(root.requestAnimationFrame||setTimeout)(loop,16);},
  stop(){running=false;if(raf&&root.cancelAnimationFrame)root.cancelAnimationFrame(raf);raf=0;},
  resize(){w=0;h=0;draw(performance.now?performance.now():Date.now());},
  running:()=>running
 };
}
const api={hash,grid,layout,sizes,pickMode,nameIndex,mentionOf,targetOf,bubbleText,direct,fade,sky,bots,uniqueNames,withBots,botReply,stageForLevel,ageOn,signOf,curveOf,pointOn,midOf};
if(typeof module==='object'&&module.exports)module.exports=api;
root.LowiGalaxy=api;
})(typeof window!=='undefined'?window:globalThis);
