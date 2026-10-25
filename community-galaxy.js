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
const BOT_KEEP=['Mateo','Jonas','Samir'];
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
 /* Oct 17, 2026, E-man: "in the community I only want three bots", one low, one medium, one at the highest level.
    The full set is still generated first so the three keep the same birth date, companion and look on every phone. */
 return out.filter(b=>BOT_KEEP.includes(b.n));
}
/* One name, one body: duplicates of a name (several test accounts, an old device session) collapse into the most recently
   active one, then the highest level. Your own name is yours alone. Bots whose name is taken by a real person step aside. */
function uniqueNames(list,ownName,lastTs){const own=String(ownName||'').trim().toLocaleLowerCase(),best=new Map();
 for(const p of list||[]){if(!p||!p.uid)continue;const k=String(p.n||'').trim().toLocaleLowerCase();if(!k||(own&&k===own))continue;const cur=best.get(k);
  const score=q=>[+(lastTs&&lastTs.get(q.uid))||0,+q.lv||0];if(!cur){best.set(k,p);continue;}const a=score(p),b=score(cur);if(a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1]))best.set(k,p);}
 return [...best.values()];}
/* Oct 25, 2026 (Emmanuel: "remove the bots from the galaxy; every real companion stays parked there like a car, even offline").
   The Room galaxy's members, built only from data every device shares (the profiles list), never from what one phone saw:
   - no made-up bots (uid "bot:..."), no account the server flags as a bot or test (isBot, by flag or id, never by name), no hidden id, no blank name;
   - one entry per name (the same person signed in twice), the winner picked by online-now, then level, xp, id, so every phone picks the same one;
   - online is only a glow (p.on), never a reason to be in or out.
   o: {isBot(uid), isHidden(uid), online(uid), me:{uid,n,...}}. Returns {layout, shown}: layout seats everyone (blocked people and
   people sharing your own name too) so seats come from the full room and are the same on every phone; shown is what your screen draws. */
function roomMembers(people,o){o=o||{};const isBot=o.isBot||(()=>false),isHidden=o.isHidden||(()=>false),online=o.online||(()=>false),blocked=o.blocked||(()=>false);
 const me=o.me&&o.me.uid?o.me:null,best=new Map(),anyOn=new Set(),first=new Map();
 /* the same name signed in on several accounts: the one that is online right now wins (presence is the same on every phone), then
    level, xp, id; the group glows when any of its accounts is online */
 const rank=q=>[online(q.uid)?1:0,+q.lv||0,+q.xp||0];
 for(const p of people||[]){if(!p||!p.uid)continue;const uid=String(p.uid),n=String(p.n||'').trim();
  if(!n||/^bot:/.test(uid)||p.bot||p.test||isBot(uid)||isHidden(uid))continue;const k=n.toLocaleLowerCase(),cur=best.get(k);
  if(online(uid))anyOn.add(k);
  /* Oct 25: the group's seat in the join-ordered rows is the day its first account joined, whichever account is shown */
  {const j=+p.j;if(isFinite(j)&&j>0&&(!first.has(k)||j<first.get(k)))first.set(k,j);}
  if(!cur){best.set(k,p);continue;}const a=rank(p),b=rank(cur);
  if(a[0]>b[0]||(a[0]===b[0]&&(a[1]>b[1]||(a[1]===b[1]&&(a[2]>b[2]||(a[2]===b[2]&&uid<String(cur.uid)))))))best.set(k,p);}
 const all=[...best.values()].filter(p=>!me||p.uid!==me.uid).map(p=>{const k=String(p.n).trim().toLocaleLowerCase(),o2={on:anyOn.has(k)};if(first.has(k))o2.j=first.get(k);return Object.assign({},p,o2);});
 all.sort((a,b)=>String(a.uid)<String(b.uid)?-1:1);
 const own=me?String(me.n||'').trim().toLocaleLowerCase():'',mine=me?Object.assign({},me,{me:true,on:true}):null;
 const layout=mine?all.concat([mine]):all;
 const shown=all.filter(p=>!blocked(p.uid)&&!(own&&String(p.n||'').trim().toLocaleLowerCase()===own));
 return {layout,shown:mine?shown.concat([mine]):shown};}
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
/* Oct 25 heat (COORD-heat-battery.md: phones got hot because things kept redrawing with nobody touching them). How often the Room
   draws when nobody touches the screen: the "page" tiers of power-saver.js. 0 = every frame (as before). */
const IDLE_T={ACTIVE:3000,REST:30000,DEEP:90000},IDLE_FPS={calm:20,rest:10,deep:5};
function idleGap(ms){const f=ms<IDLE_T.ACTIVE?0:ms>=IDLE_T.DEEP?IDLE_FPS.deep:ms>=IDLE_T.REST?IDLE_FPS.rest:IDLE_FPS.calm;return f?1000/f:0;}
/* the app-wide power saver (window.LowiPower, power-saver.js) decides when it is there, so every loop slows the same way (it also
   knows battery saver and flights); without it the Room keeps its own touch clock with the same tiers */
function idlePacer(R){
 const now=()=>R.performance&&R.performance.now?R.performance.now():Date.now();let lastIn=now(),moveAt=0;const subs=[];
 const poke=()=>{lastIn=now();subs.forEach(fn=>{try{fn();}catch(e){}});};
 if(R.addEventListener){['pointerdown','touchstart','keydown','wheel'].forEach(t=>R.addEventListener(t,poke,{capture:true,passive:true}));
  ['pointermove','scroll'].forEach(t=>R.addEventListener(t,()=>{const n=now();if(n-moveAt>250){moveAt=n;poke();}},{capture:true,passive:true}));}
 return {gap(){const P=R.LowiPower;if(P&&typeof P.interval==='function'){try{const v=+P.interval(true);if(isFinite(v)&&v>=0)return v;}catch(e){}}return idleGap(now()-lastIn);},
  onPoke(fn){subs.push(fn);}};
}
/* the companions' cgBob loops (community-galaxy.css) while slowed: held by the Room and moved on at its own pace (real time, the same
   ease), handed back to the browser at the next touch or when the Room closes. Any other animation is left alone. */
function bobPacer(R,box){
 const held=new Map();let scanAt=-1e9;
 const list=()=>{const b=box();if(!b||!b.getAnimations)return [];try{return b.getAnimations({subtree:true}).filter(a=>a&&a.animationName==='cgBob');}catch(e){return [];}};
 return {
  step(t){if(t-scanAt>=1000||!held.size){scanAt=t;for(const a of list())if(!held.has(a)&&a.playState==='running'){held.set(a,{ct:+a.currentTime||0,t0:t});try{a.pause();}catch(e){}}}
   held.forEach((v,a)=>{const tg=a.effect&&a.effect.target;if(!tg||tg.isConnected===false){held.delete(a);return;}try{a.currentTime=v.ct+(t-v.t0);}catch(e){}});},
  release(t){if(!held.size)return;held.forEach((v,a)=>{try{a.currentTime=v.ct+(t-v.t0);a.play();}catch(e){}});held.clear();}
 };
}
function sky(canvas,opts){
 const R=(opts&&opts.root)||root,pace=idlePacer(R),bobs=bobPacer(R,()=>(opts&&opts.bobs)||(canvas&&(canvas.closest&&canvas.closest('#cgGalaxy')||canvas.parentElement)));
 const ctx=canvas&&canvas.getContext&&canvas.getContext('2d');if(!ctx)return null;
 const reduce=()=>!!(R.matchMedia&&R.matchMedia('(prefers-reduced-motion: reduce)').matches);
 let w=0,h=0,dpr=1,stars=[],lines=[],orbits=null,raf=0,last=0,running=false,light=false,seed=hash('lowi-galaxy');
 function size(){const r=canvas.getBoundingClientRect?canvas.getBoundingClientRect():{width:0,height:0};const nw=Math.round(r.width),nh=Math.round(r.height);dpr=Math.min(2,R.devicePixelRatio||1);if(nw===w&&nh===h&&canvas.width===Math.round(nw*dpr))return;w=nw;h=nh;canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));const r2=rng(seed),count=Math.round(Math.min(140,w*h/3600));stars=[];for(let i=0;i<count;i++)stars.push({x:r2()*w,y:r2()*h,r:r2()<.12?1.6:r2()*1.1+.35,p:r2()*6.28,s:.4+r2()*1.4});}
 const curve=curveOf,at=pointOn;
 function draw(now){
  size();if(!w||!h)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const still=reduce(),t=now/1000;
  /* Oct 16, round 3 (E-man: "it's still the spirit world ... I'm not saying make it a galaxy ... within the metabolic health style"):
     no sun, no orbit rings, no stars. The same silvery dark-blue bloodstream as Home's world, seen from far out: Misty's mint glow
     behind you, cells and energy motes drifting slowly past. The companions float in it; the stream lines still carry the talk. */
  const O=orbits&&isFinite(orbits.cx)&&isFinite(orbits.cy)?orbits:null,cx=O?O.cx:w/2,cy=O?O.cy:h*.45,R=Math.hypot(w,h);
  /* Oct 16: with the live 3D world under the page (html.wb-on), this layer only draws the energy streams */
  const bare=!!(R.document&&R.document.documentElement&&R.document.documentElement.classList.contains('wb-on'));
  if(!bare){
  const bg=ctx.createRadialGradient(cx,cy,0,cx,cy,R*.75);bg.addColorStop(0,'#16305a');bg.addColorStop(.45,'#0a1834');bg.addColorStop(1,'#040811');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  /* Oct 25: the three drifting nebula blobs are gone too: a clean, still deep-blue room with Misty's mint glow behind you */
  {const R0=Math.max(40,Math.min(w,h)*.16),g=ctx.createRadialGradient(cx,cy,0,cx,cy,R0*2.4);g.addColorStop(0,'rgba(156,218,199,.34)');g.addColorStop(.3,'rgba(156,218,199,.12)');g.addColorStop(.6,'rgba(110,150,230,.05)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
  for(const s of stars){
   const dy=still?0:(t*(4+s.s*5))%(h+40),y=((s.y-dy)%(h+40)+h+40)%(h+40)-20,x=s.x+(still?0:Math.sin(t*.4*s.s+s.p)*6);
   /* Oct 25 (Emmanuel: "bugs from the circle leftovers"): no more cell discs with rims; every speck is a small soft mote */
   {const tw=still?.8:.55+.45*Math.sin(t*s.s+s.p);ctx.globalAlpha=.7*tw;ctx.fillStyle=s.p<1.2?'#ffd27a':'#bfeee0';ctx.beginPath();ctx.arc(x,y,s.r,0,6.283);ctx.fill();}}
  }
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
 /* Oct 25 heat: ~30 a second while someone touches the screen (as before); after 3 s without a touch the Room's own drawing and the
    companions' bobbing step at ~20 a second, after 30 s ~10, after 90 s ~5 (idlePacer). Time stays real, so it looks the same. While
    slowed it waits on a timer, not on every screen refresh; the next touch goes back to full speed in the next frame. */
 const nowMs=()=>R.performance&&R.performance.now?R.performance.now():Date.now();
 let tmo=0;
 function next(g){if(!running)return;if(g>0){tmo=R.setTimeout(()=>{tmo=0;loop(nowMs());},Math.max(8,g-(nowMs()-last)));}else raf=(R.requestAnimationFrame||R.setTimeout)(loop,16);}
 function loop(now){raf=0;if(!running)return;const g=pace.gap();
  if(now-last>=Math.max(33,g)-2){last=now;draw(now);if(g>0)bobs.step(nowMs());}
  if(!g)bobs.release(nowMs());next(g);}
 pace.onPoke(()=>{if(!running)return;bobs.release(nowMs());if(tmo){R.clearTimeout(tmo);tmo=0;raf=(R.requestAnimationFrame||R.setTimeout)(loop,16);}});
 return {
  set(next,isLight,orb){lines=Array.isArray(next)?next:[];light=!!isLight;orbits=orb||null;if(!running||reduce())draw(nowMs());},
  start(){if(running)return;running=true;if(reduce()){draw(0);running=false;return;}raf=(R.requestAnimationFrame||setTimeout)(loop,16);},
  stop(){running=false;if(raf&&R.cancelAnimationFrame)R.cancelAnimationFrame(raf);raf=0;if(tmo)R.clearTimeout(tmo);tmo=0;bobs.release(nowMs());},
  resize(){w=0;h=0;draw(nowMs());},
  running:()=>running
 };
}
/* Oct 16, round 5 (E-man: "like the Snapchat Map or Find My"): the Community map. Every person owns ONE fixed spot in a big
   world, like a pin on a map. The spot depends only on that person's id and on the crowd size in bands (48, 96, ...),
   never on who is selected, who spoke last, the screen size or the keyboard, so nothing moves when you tap or type.
   You sit at (0,0) (see Oct 24 below: the frame is shared and shifted). World units are screen pixels at zoom 1; the camera (pan + zoom) is separate. */
const MAP_C=86;
function mapPool(n){let p=48;while(p<(+n||0)*1.4)p*=2;return p;}
function mapSlot(i,c){c=c||MAP_C;const r=c*Math.sqrt(i+1.6),a=i*2.399963+0.6;return {x:r*Math.cos(a),y:r*Math.sin(a)};}
/* Oct 24 (E-man, energy blast from his iPad at his iPhone: "the companions don't sit the same and the blast goes another way on each
   device"): there is ONE room frame for everyone. You take a seat by your id hash exactly like everybody else, so every phone and
   tablet computes the same seats for the same people; the frame is then only SHIFTED so that you are at (0,0). A shift keeps
   every direction and distance the same, so an angle or a vector between two people means the same thing on every device.
   (cx,cy) is the room centre in this shifted frame and radius is measured from it: the camera limits and the cushion use it. */
/* Oct 25 (Emmanuel: "there's no structure ... the newest people are now at the top, and the oldest ... further down"): the room
   is ROWS ordered by when each person joined (profiles.joined_at, the same on every device). The longest-standing member takes
   the first seat of the bottom row, every later member the next seat, row by row upward, so the newest row is on top. A row
   fills from its middle outward and every other row sits half a seat over, like a honeycomb. A newcomer only ever takes the
   next free seat on the top row: nobody else moves (until the room grows into one more column, see mapCols). Someone with no
   known join date counts as the longest-standing (their order is by id hash). The frame is still shared and only SHIFTED so
   that you are at (0,0); (cx,cy) is the room's fixed anchor (the middle of the bottom row) and radius is measured from it. */
const ROW_DX=150,ROW_DY=128;
/* columns per row from the crowd size in bands, so a room stays a little taller than wide (portrait phones) */
function mapCols(n){return Math.max(2,Math.ceil(Math.sqrt((+n||0)/2.2)));}
function rowOff(k,K){const odd=K%2===1,step=Math.floor((k+(odd?1:0))/2);if(odd)return k===0?0:(k%2?step:-step);return k%2?(Math.floor(k/2)+.5):-(Math.floor(k/2)+.5);}
function mapLayout(members,meId,o){o=o||{};
 const jt=v=>{v=+v;return isFinite(v)&&v>0?v:0;},me=meId||'me',list=[{uid:me,me:true,j:jt(o.meJ)}],seen=new Set([me]);
 for(const m of members||[]){if(!m||!m.uid||seen.has(m.uid))continue;seen.add(m.uid);list.push(m);}
 /* oldest first, then id hash: who is first in the caller's list (selected, newest talker) can never change a seat */
 list.sort((a,b)=>jt(a.j)-jt(b.j)||hash(a.uid)-hash(b.uid)||(a.uid<b.uid?-1:a.uid>b.uid?1:0));
 /* Oct 25 (readability + fit): with o.view {w,h} a short, wide Room (iPhone SE) gets one more seat per row when that lets the
    fit zoom in further, so names keep room; rows stay in join order. Without o.view, or where it does not help, mapCols as before. */
 let K=mapCols(list.length);
 if(o.view&&o.view.w>0&&o.view.h>0){const n=list.length,vw=Math.max(200,o.view.w)-92,vh=Math.max(200,o.view.h)-92,z0=Math.max(.85,Math.min(1.25,Math.min(o.view.w,o.view.h)/400));
  const zOf=k=>Math.min(z0,vw/Math.max(1,(k-.5)*ROW_DX),vh/Math.max(1,(Math.ceil(n/k)-1)*ROW_DY));let bz=zOf(K)+1e-6;
  for(let k=K+1;k<=Math.min(n,K+3);k++){const z=zOf(k);if(z>bz+.02){bz=z;K=k;}}}
 const abs=new Map();
 list.forEach((m,i)=>{const row=Math.floor(i/K),k=i%K,r=rng(hash(m.uid)+11),jx=(r()-.5)*6,jy=(r()-.5)*6;/* Oct 25: a small wobble (was 14 px) so a name never just grazes the companion below it */
  abs.set(m.uid,{x:Math.round((rowOff(k,K)+(row%2?.25:-.25))*ROW_DX+jx),y:Math.round(-row*ROW_DY+jy)});});
 const a0=abs.get(me),spots=[{uid:me,me:true,x:0,y:0}];let R=0;
 for(const m of list){if(m.uid===me)continue;const a=abs.get(m.uid);spots.push({uid:m.uid,me:false,x:a.x-a0.x,y:a.y-a0.y});}
 for(const a of abs.values())R=Math.max(R,Math.hypot(a.x,a.y));
 return {spots,radius:Math.round(R),cols:K,cx:-a0.x,cy:-a0.y};
}
/* Oct 25: the camera that shows every given spot at once, with room for each name under its companion. Screen padding in px:
   sides fit half a name, the top half a companion, the bottom a companion plus its name. Never closer than the normal arrival
   zoom (two people are not blown up), never further out than the hard floor. */
function mapFit(spots,w,h,o){o=o||{};w=Math.max(200,+w||360);h=Math.max(200,+h||500);
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const s of spots||[]){if(!s)continue;x0=Math.min(x0,s.x);x1=Math.max(x1,s.x);y0=Math.min(y0,s.y);y1=Math.max(y1,s.y);}
 if(!isFinite(x0)){x0=x1=y0=y1=0;}
 const side=o.side!=null?o.side:46,top=o.top!=null?o.top:36,bot=o.bot!=null?o.bot:56,z0=Math.max(.85,Math.min(1.25,Math.min(w,h)/400));
 const fit=(l,r,t,b)=>{let z=Math.min((w-l-r)/Math.max(1,x1-x0),(h-t-b)/Math.max(1,y1-y0));z=Math.max(.18,Math.min(z0,z));
  return {x:(x0+x1)/2-((l+(w-r))/2-w/2)/z,y:(y0+y1)/2-((t+(h-b))/2-h/2)/z,z};};
 const base=fit(side,side,top,bot),AV=(Array.isArray(o.avoid)?o.avoid:[o.avoid]).filter(a=>a&&a.w>0&&a.h>0);
 if(!AV.length)return base;
 /* Oct 25 (live check: "Emmy" shrank to "E" next to You): the energy pad sits in a corner of the Room and mapLabels keeps names
    off it. The view tries leaving the pad's corner free (the bottom rows lifted above it, or the right column moved left of it,
    in steps) and runs the same label pass the page runs (page sizes: orb 46*f, 54 for you, 56/64 on a big screen, name up to
    size+30 wide, f from the zoom as in place()). It keeps the view that loses the fewest names to a letter, then the closest
    zoom; with nothing lost it stays the plain fit.
    Oct 25 (readability + fit, Emmanuel's iPhone: a companion "hidden behind the Friends tree button"): o.avoid may be a list
    (the energy pad and the Friends tree button). Each rectangle is kept free; a companion or its name under one, or outside
    the Room, counts as lost too. */
 const big=!!o.big,pads=[];
 /* a square (the pad) is one block for the label pass; a wide one (the Friends tree button) is a row of squares, not one huge square */
 AV.forEach((A,i)=>{const sq=Math.min(A.w,A.h),n=Math.max(1,Math.round(Math.max(A.w,A.h)/sq));for(let j=0;j<n;j++){const along=(j+.5)/n;pads.push({id:'__pad'+i+'_'+j,x:A.w>=A.h?A.x+A.w*along:A.x+A.w/2,y:A.w>=A.h?A.y+A.h/2:A.y+A.h*along,s:n===1?Math.max(A.w,A.h):sq,nw:0,bw:0,bh:0,bub:false});}});
 const hits=(b,A)=>Math.min(b.x+b.w,A.x+A.w)-Math.max(b.x,A.x)>1&&Math.min(b.y+b.h,A.y+A.h)-Math.max(b.y,A.y)>1;
 const lost=c=>{const ff=Math.max(.68,Math.min(1.2,Math.sqrt(c.z/z0))),fnn=Math.max(.8,ff),items=[];
  for(const q of spots||[]){if(!q)continue;const sz=(q.me?(big?64:54):(big?56:46));items.push({id:String(q.uid),x:w/2+(q.x-c.x)*c.z,y:h/2+(q.y-c.y)*c.z,s:sz*ff,nw:(sz+30)*fnn,bw:0,bh:0,bub:false});}
  const lab=mapLabels(items.concat(pads),{w,h});let k=0;
  for(const it of items){const orb={x:it.x-it.s/2,y:it.y-it.s/2,w:it.s,h:it.s},nm={x:it.x-it.nw/2,y:it.y+it.s/2+2,w:it.nw,h:13};
   if(lab.get(it.id).at!=='b'||AV.length>1&&(AV.some(A=>hits(orb,A)||hits(nm,A))||orb.y<-.5||nm.y+nm.h>h+.5||nm.x<-.5||nm.x+nm.w>w+.5))k++;}
  return k;};
 let best=base,bl=lost(base);if(!bl)return base;
 const f0=Math.max(.68,Math.min(1.2,Math.sqrt(base.z/z0))),fn0=Math.max(.8,f0),hw=((big?56:46)+30)*fn0/2+1,dn=((big?56:46)/2)*f0+21,up=((big?56:46)/2)*f0+2;
 let bMax=0,tMax=0,rMax=0,lMax=0;
 for(const A of AV){const ax0=A.x,ay0=A.y,ax1=A.x+A.w,ay1=A.y+A.h;
  if(ay0>h/2)bMax=Math.max(bMax,bot,h-ay0+dn);else tMax=Math.max(tMax,top,ay1+up);
  if(ax0>w/2)rMax=Math.max(rMax,side,w-ax0+hw);else if(AV.length===1||ax1<w/2)lMax=Math.max(lMax,side,ax1+hw);}
 const cand=[];
 for(const k of [.25,.5,.75,1]){
  const tt=tMax?top+(tMax-top)*k:top,bb=bMax?bot+(bMax-bot)*k:bot,ll=lMax?side+(lMax-side)*k:side,rr=rMax?side+(rMax-side)*k:side;
  cand.push([side,side,tt,bb],[ll,rr,top,bot]);if(AV.length>1)cand.push([ll,rr,tt,bb]);}
 /* with two corners taken (pad and Friends tree button) the bottom row may fit between them: the same zoom, moved sideways and up */
 if(AV.length>1)for(const k of [0,.25,.5,.75,1])for(const dx of [-90,-60,-40,-20,20,40,60,90]){const bb=bMax?bot+(bMax-bot)*k:bot;cand.push([Math.max(8,side+dx),Math.max(8,side-dx),top,bb]);}
 for(const m of cand){const c=fit(m[0],m[1],m[2],m[3]),l=lost(c);if(l<bl||(l===bl&&best!==base&&c.z>best.z)){best=c;bl=l;}}
 return best;}
/* Oct 25 (readability + fit: on iPhone SE / small Android the bottom row sat below the Room and behind the Friends tree button):
   the size the Room camera works with. prev = the last answer, w/h = the Room's size now, typing = the keyboard is up.
   While typing, or for a small chip row (To: name, up to 60 px), the camera keeps its size so the pins never slide; hb is what is
   visible. Any other change is taken, and for the first 2.5 s after the Room was first measured every change is taken (the
   composer and bar are still laying out: the old rule kept that first, taller size for good). */
function mapViewSize(prev,w,h,typing,now){now=+now||0;
 if(!prev||Math.abs(w-prev.w)>40)return {w,h,hb:h,t:now};
 if(typing)return {w:prev.w,h:prev.h,hb:h,t:prev.t};
 if(now-prev.t<2500||h>prev.h||prev.h-h>60)return {w,h,hb:h,t:prev.t};
 return {w:prev.w,h:prev.h,hb:h,t:prev.t};}
/* Camera limits for a w x h view: z0 = the zoom you arrive at, zmin shows everyone, zmax is a close look. */
/* fz (Oct 25): the fitted zoom (mapFit), so the furthest you can zoom out always still includes the view that shows everyone */
function mapZooms(radius,w,h,fz){w=Math.max(200,+w||360);h=Math.max(200,+h||500);const z0=Math.max(.85,Math.min(1.25,Math.min(w,h)/400)),fit=Math.min(w,h)/(2*((+radius||0)+90)),f2=+fz>0?+fz:Infinity;
 return {z0,zmin:Math.max(.18,Math.min(z0*.55,fit,f2)),zmax:z0*2.4};}
function mapClamp(cam,radius,w,h,c,fz){const Z=mapZooms(radius,w,h,fz),z=Math.max(Z.zmin,Math.min(Z.zmax,+cam.z||Z.z0)),lim=(+radius||0)+40,cx=c&&+c.x||0,cy=c&&+c.y||0;
 return {x:Math.max(cx-lim,Math.min(cx+lim,+cam.x||0)),y:Math.max(cy-lim,Math.min(cy+lim,+cam.y||0)),z};}
function overlaps(a,b){return a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;}
/* Labels on the map: items = [{id,x,y,s,nw,bw,bh,bub}] in screen px (x,y = orb centre, s = orb size, nw = name width,
   bw/bh = bubble size when it has one) in PRIORITY order. Orbs never move. A name hides when it would cover a higher
   priority orb or name; a bubble tries above, beside, below and shifted spots and takes the first that covers no orb,
   no shown name and no earlier bubble, else it shrinks to a dot. Returns Map id -> {name,at:"b"|"t"|"i"|"",bub:{x,y,side,tail}|null,dot}. */
function mapLabels(items,view){
 const W0=view.w,H0=view.h,pad=4,out=new Map(),orbs=[],names=[],bubs=[];
 const vis=it=>it.x>-it.s&&it.x<W0+it.s&&it.y>-it.s&&it.y<H0+it.s;
 for(const it of items){const s=it.s;orbs.push({id:it.id,x:it.x-s/2-2,y:it.y-s/2-2,w:s+4,h:s+4});}
 for(const it of items){const nm={id:it.id,x:it.x-it.nw/2,y:it.y+it.s/2+3,w:it.nw,h:16};
  const free=b=>!orbs.some(o=>o.id!==it.id&&overlaps(o,b))&&!names.some(n=>overlaps(n,b));
  /* Oct 25 (the "bubble with no name"): a name that would cover someone tries ABOVE its orb, then a one-letter tag
     under it; only when even that covers an orb does it hide (the name is still on the button for screen readers and on tap) */
  const up={id:it.id,x:nm.x,y:it.y-it.s/2-19,w:it.nw,h:16},ini={id:it.id,x:it.x-9,y:nm.y,w:18,h:16};
  let at='';if(vis(it)){if(free(nm)){at='b';names.push(nm);}else if(free(up)){at='t';names.push(up);}else if(free(ini)){at='i';names.push(ini);}}
  out.set(it.id,{name:at==='b'||at==='t',at,bub:null,dot:false});}
 for(const it of items){if(!it.bub)continue;const r=out.get(it.id);if(!vis(it))continue;
  const s=it.s,bw=it.bw,bh=it.bh,gap=9,ny=r.at==='b'||r.at==='i'?it.y+s/2+21:it.y+s/2+2;
  const cands=[['t',it.x-bw/2,it.y-s/2-gap-bh],['r',it.x+s/2+gap+2,it.y-bh/2-6],['l',it.x-s/2-gap-2-bw,it.y-bh/2-6],
   ['t',it.x-bw*.15,it.y-s/2-gap-bh],['t',it.x-bw*.85,it.y-s/2-gap-bh],['b',it.x-bw/2,ny+gap],['b',it.x-bw*.15,ny+gap],['b',it.x-bw*.85,ny+gap]];
  let got=null;
  for(const [side,x0,y0] of cands){let x=x0;if(side==='t'||side==='b')x=Math.max(pad,Math.min(W0-pad-bw,x));
   const box={x,y:y0,w:bw,h:bh};if(box.x<pad-.5||box.y<pad-.5||box.x+bw>W0-pad+.5||box.y+bh>H0-pad+.5)continue;
   if(orbs.some(o=>o.id!==it.id&&overlaps(o,box))||names.some(n=>overlaps(n,box))||bubs.some(b=>overlaps(b,box)))continue;
   got={x:Math.round(x),y:Math.round(y0),side,tail:Math.round(side==='t'||side==='b'?Math.max(14,Math.min(bw-14,it.x-x)):bh/2)};bubs.push(box);break;}
  if(got)r.bub=got;else r.dot=true;}
 return out;
}
const api={BOT_KEEP,idleGap,hash,mapPool,mapSlot,mapCols,mapLayout,mapFit,mapViewSize,mapZooms,mapClamp,mapLabels,grid,layout,sizes,pickMode,nameIndex,mentionOf,targetOf,bubbleText,direct,fade,sky,bots,uniqueNames,roomMembers,withBots,botReply,stageForLevel,ageOn,signOf,curveOf,pointOn,midOf};
if(typeof module==='object'&&module.exports)module.exports=api;
root.LowiGalaxy=api;
})(typeof window!=='undefined'?window:globalThis);
