/* LOWiSPIKE herb path core (Oct 15, 2026): evolution rule, special quests toward the next stage, food collection, own goals.
   Pure functions only (no DOM), shared by herb-quests.js and tests/herb-quests.test.cjs.
   Reads the existing XP total and ledger; every payout goes through the app's award() with an eventId, so nothing pays twice. */
(function(root){
'use strict';
const C=typeof module==='object'&&module.exports?require('./herb-config.js'):root.LOWI_HERB_CONFIG;
const MEAL_XP=15,QUEST_XP=10,SPECIAL_XP=25,MAX_GOALS=8;
const pad=n=>String(n).padStart(2,'0');
const dayKey=t=>{const d=new Date(+t||Date.now());return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const num=x=>Number.isFinite(+x)?Math.max(0,+x):0;
const L3=(a,i)=>a[i]||a[0];

/* ---------- evolution card: next stage, the rule, and how many more ---------- */
function evolution(xp){
  xp=num(xp);let index=0;C.stages.forEach((s,i)=>{if(xp>=s.xp)index=i;});
  const current=C.stages[index],next=C.stages[index+1]||null;
  if(!next)return{index,current,next:null,xp,left:0,progress:1,meals:0,quests:0,specials:0};
  const left=Math.max(0,next.xp-xp);
  return{index,current,next,xp,left,progress:Math.max(0,Math.min(1,(xp-current.xp)/(next.xp-current.xp))),meals:Math.ceil(left/MEAL_XP),quests:Math.ceil(left/QUEST_XP),specials:Math.ceil(left/SPECIAL_XP)};
}
/* when the current stage began: the first ledger moment the running total reached its threshold (legacy XP without a ledger counts from the start) */
function stageStart(s){
  const ev=evolution(s&&s.xp),led=((s&&s.ledger)||[]).filter(e=>e&&+e.amt>0&&+e.ts>0).slice().sort((a,b)=>a.ts-b.ts);
  const sum=led.reduce((a,e)=>a+ +e.amt,0);let run=num(s&&s.xp)-sum;if(run>=ev.current.xp)return 0;
  for(const e of led){run+= +e.amt;if(run>=ev.current.xp)return +e.ts;}
  return 0;
}

/* ---------- food collection: a fixed set of everyday foods, discovered by what the user really logs or scans ---------- */
const CATS={veg:['Vegetables','Gemüse','Verdura'],fruit:['Fruit','Obst','Fruta'],protein:['Protein','Eiweiß','Proteína'],fish:['Fish','Fisch','Pescado'],dairy:['Dairy','Milchprodukte','Lácteos'],grain:['Grains','Getreide','Cereales'],nut:['Nuts & seeds','Nüsse & Samen','Frutos secos'],drink:['Drinks','Getränke','Bebidas'],sweet:['Treats','Naschereien','Dulces']};
const FOODS=[
 ['broccoli','veg',['Broccoli','Brokkoli','Brócoli'],/brokkoli|broccoli|brocoli|brócoli/],
 ['spinach','veg',['Spinach','Spinat','Espinaca'],/spinat|spinach|espinaca/],
 ['avocado','veg',['Avocado','Avocado','Aguacate'],/avocado|aguacate|guacamole/],
 ['tomato','veg',['Tomato','Tomate','Tomate'],/tomat/],
 ['cucumber','veg',['Cucumber','Gurke','Pepino'],/gurke|cucumber|pepino/],
 ['pepper','veg',['Bell pepper','Paprika','Pimiento'],/paprika|bell pepper|pimiento/],
 ['salad','veg',['Salad','Salat','Ensalada'],/salat|salad|ensalada|lettuce|rucola|arugula/],
 ['zucchini','veg',['Zucchini','Zucchini','Calabacín'],/zucchini|courgette|calabac/],
 ['mushroom','veg',['Mushrooms','Pilze','Setas'],/pilz|champignon|mushroom|seta|hongo/],
 ['lentils','veg',['Lentils & beans','Linsen & Bohnen','Lentejas y alubias'],/linse|lentil|lenteja|bohne|bean|kichererbse|chickpea|garbanzo|hummus|alubia/],
 ['berries','fruit',['Berries','Beeren','Bayas'],/beere|berry|berries|frambues|fresa|arándano|arandano/],
 ['apple','fruit',['Apple','Apfel','Manzana'],/apfel|äpfel|apple|manzana/],
 ['banana','fruit',['Banana','Banane','Plátano'],/banan|plátano|platano/],
 ['citrus','fruit',['Citrus','Zitrus','Cítricos'],/orange|zitron|lemon|limette|lime|naranja|limón|limon|mandarin|grapefruit/],
 ['egg','protein',['Eggs','Eier','Huevos'],/\bei\b|eier|\begg|omelet|omelett|rührei|spiegelei|huevo|tortilla/],
 ['chicken','protein',['Chicken','Hähnchen','Pollo'],/hähnchen|haehnchen|huhn|chicken|pollo|hühner|pute|turkey|pavo/],
 ['beef','protein',['Beef','Rind','Ternera'],/rind|beef|steak|ternera|hack|burger/],
 ['tofu','protein',['Tofu & tempeh','Tofu & Tempeh','Tofu y tempeh'],/tofu|tempeh|seitan/],
 ['salmon','fish',['Salmon','Lachs','Salmón'],/lachs|salmon|salmón/],
 ['tuna','fish',['Tuna','Thunfisch','Atún'],/thunfisch|tuna|atún|atun/],
 ['shrimp','fish',['Seafood','Meeresfrüchte','Marisco'],/garnele|shrimp|prawn|gamba|marisco|krabbe|muschel/],
 ['yogurt','dairy',['Yogurt','Joghurt','Yogur'],/joghurt|jogurt|yogurt|yoghurt|yogur|skyr|quark/],
 ['cheese','dairy',['Cheese','Käse','Queso'],/käse|kaese|cheese|queso|feta|mozzarella|parmesan|halloumi/],
 ['milk','dairy',['Milk','Milch','Leche'],/milch|\bmilk|leche|kefir/],
 ['oats','grain',['Oats','Haferflocken','Avena'],/hafer|oat|avena|porridge|müsli|muesli/],
 ['rice','grain',['Rice','Reis','Arroz'],/reis|\brice|arroz|risotto|sushi/],
 ['bread','grain',['Wholegrain bread','Vollkornbrot','Pan integral'],/brot|bread|\bpan\b|toast|brötchen|sandwich|bagel/],
 ['pasta','grain',['Pasta','Nudeln','Pasta'],/nudel|pasta|spaghetti|penne|lasagn|noodle|fideo/],
 ['quinoa','grain',['Quinoa & buckwheat','Quinoa & Buchweizen','Quinoa y alforfón'],/quinoa|buchweizen|buckwheat|alforf/],
 ['almonds','nut',['Nuts','Nüsse','Frutos secos'],/nuss|nüsse|nut\b|nuts|almond|mandel|walnut|cashew|almendra|nuez|pistazie|pistachio/],
 ['seeds','nut',['Seeds','Samen & Kerne','Semillas'],/chia|leinsamen|flax|kerne|seeds|semilla|sesam/],
 ['water','drink',['Water','Wasser','Agua'],/wasser|\bwater|agua|sprudel/],
 ['tea','drink',['Tea','Tee','Té'],/\btee\b|\btea\b|\bté\b|matcha/],
 ['coffee','drink',['Coffee','Kaffee','Café'],/kaffee|coffee|café|cafe|espresso|cappuccino|latte/],
 ['chocolate','sweet',['Dark chocolate','Dunkle Schokolade','Chocolate negro'],/schoko|chocolate|kakao|cocoa|nutella/],
 ['icecream','sweet',['Ice cream','Eis','Helado'],/eiscreme|ice cream|helado|\bgelato|\beis\b/]
].map(([id,cat,names,re])=>({id,cat,names,re}));
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ');
function logText(l){return norm([l&&l.t,l&&l.name,l&&l.title].filter(Boolean).join(' '));}
/* discovered foods with the moment each was first logged; product scans in the dex count by their name */
function discover(logs,products){
  const first={};const look=(text,ts)=>{if(!text)return;for(const f of FOODS)if(f.re.test(text)&&(!first[f.id]||ts<first[f.id]))first[f.id]=ts||1;};
  (logs||[]).forEach(l=>look(logText(l),+(l&&l.ts)||1));
  (products||[]).forEach(p=>look(norm(p&&(p.name||p.title)),+(p&&(p.ts||p.at))||1));
  const found=FOODS.filter(f=>first[f.id]).map(f=>({id:f.id,ts:first[f.id]}));
  return{first,found,n:found.length,total:FOODS.length};
}
/* Oct 19 (design call): the Collection becomes a FOOD JOURNAL, a place to look back at the foods you logged or
   scanned and how those meals went. Nothing here gives XP or gates evolution (STEPS never read it).
   resultOf: the likely blood sugar response a meal log carries (lvl from the app's assessment, r = LOWiSPIKE yes/no). */
function resultOf(l){
  const v=String(l&&l.lvl||'').toLowerCase(),r=String(l&&l.r||'').toLowerCase();
  if(/^(high|spike|red|r|bad)$/.test(v)||(!v&&r==='nein'))return'spike';
  if(/^(mild|medium|mid|mittel|yellow|y|moderate)$/.test(v))return'mild';
  if(/^(low|green|g|good|none)$/.test(v)||(!v&&r==='ja'))return'low';
  return'';
}
/* one row per food you really logged or scanned, newest first: first/last time, how often, and the meals' results */
function journal(logs,products){
  const rows={};const row=f=>rows[f.id]||(rows[f.id]={id:f.id,cat:f.cat,names:f.names,first:0,last:0,times:0,scans:0,res:{low:0,mild:0,spike:0}});
  const seen=(r,ts)=>{ts=+ts||1;if(!r.first||ts<r.first)r.first=ts;if(ts>r.last)r.last=ts;};
  (logs||[]).forEach(l=>{const tx=logText(l);if(!tx)return;const res=resultOf(l);for(const f of FOODS)if(f.re.test(tx)){const r=row(f);r.times++;seen(r,l&&l.ts);if(res)r.res[res]++;}});
  (products||[]).forEach(p=>{const tx=norm(p&&(p.name||p.title));if(!tx)return;for(const f of FOODS)if(f.re.test(tx)){const r=row(f);r.scans++;seen(r,p&&(p.ts||p.at));}});
  return Object.values(rows).sort((a,b)=>b.last-a.last);
}
/* which foods one new log adds to the collection (for the "new in your collection" moment) */
function newFoods(before,after){return after.found.filter(f=>!before.first[f.id]).map(f=>f.id);}

/* ---------- event-backed action counts: read from the app's own stores (logs, ledger, fasting store, move store, dex). No second truth source. ---------- */
/* stores = {s, fast:lowi_fast_v1, move:lowispike.move.v1, posts:[...], products:[...]} ; counts actions with ts >= since (and < until) */
const isGreen=l=>/^(low|green|g|good)$/i.test(String(l&&l.lvl||''));
const srcOf=e=>((e&&e.src)||'')+' '+((e&&e.eventId)||'');
const isScan=l=>!!(l&&(l.via==='barcode'||l.code||/scan/i.test(l.via||'')));
function counts(st,since,until){
  st=st||{};const s=st.s||{};since=+since||0;until=+until||Infinity;const inR=t=>(+t||0)>=since&&(+t||0)<until;
  const logs=(s.logs||[]).filter(l=>l&&inR(l.ts)),led=(s.ledger||[]).filter(e=>e&&inR(e.ts));
  const fast=st.fast||{},mv=st.move||{};
  const wEvents=Object.values(fast.waterEvents||{}).filter(inR).length,wLedger=led.filter(e=>/(^|:)water\b/i.test(srcOf(e))).length;
  const sessions=(Array.isArray(mv.sessions)?mv.sessions:[]).filter(x=>x&&(+x.moved||0)>=60&&inR(x.ts||x.start||x.end||(x.day?new Date(x.day+'T12:00').getTime():0)));
  const moveLedger=led.filter(e=>/move|walk|step|mv:/i.test(srcOf(e))).length;
  const fasts=(Array.isArray(fast.hist)?fast.hist:[]).filter(h=>h&&(+h.h||0)>=12&&inR(h.e)).length;
  const checkins=led.filter(e=>/check.?in|streak/i.test(srcOf(e)+' '+(e.label||''))).length;
  const scans=logs.filter(isScan).length+(st.products||[]).filter(p=>p&&inR(p.ts||p.at)).length;
  const all=discover(s.logs,st.products);
  return{meal:logs.length,green:logs.filter(isGreen).length,water:Math.max(wEvents,wLedger),move:Math.max(sessions.length,moveLedger),scan:scans,fast:fasts,checkin:checkins,food:all.found.filter(f=>inR(f.ts)).length};
}
/* diversity: how many different kinds of action happened (cumulative, not days in a row) */
const KINDS=['meal','water','move','scan','fast','checkin'];
function variety(c){return KINDS.filter(k=>(c[k]||0)>0).length;}

/* ---------- special quests: 4 to 6 cumulative steps toward the next stage, each with a hint and a deep link ---------- */
const STEPS=[
 {id:'meal',from:0,go:'eat',goal:[2,4,6,8,10],t:['Log {n} meals','Trag {n} Mahlzeiten ein','Registra {n} comidas'],h:['Photo, barcode or a few words. Every meal counts, up to 8 a day for XP.','Foto, Barcode oder ein paar Worte. Jede Mahlzeit zählt, bis zu 8 am Tag mit XP.','Foto, código de barras o unas palabras. Cada comida cuenta, hasta 8 al día con XP.']},
 {id:'water',from:0,go:'water',goal:[3,5,8,10,12],t:['Drink {n} glasses of water','Trink {n} Gläser Wasser','Bebe {n} vasos de agua'],h:['Tap +1 glass on Home each time. Spread over several days is fine.','Tipp auf Home jedes Mal +1 Glas. Über mehrere Tage verteilt ist okay.','Toca +1 vaso en Inicio cada vez. Repartido en varios días está bien.']},
 {id:'scan',from:0,go:'scan',goal:[1,2,3,4,5],t1:['Scan 1 product','Scanne 1 Produkt','Escanea 1 producto'],t:['Scan {n} products','Scanne {n} Produkte','Escanea {n} productos'],h:['Scan before you buy or eat it. The herb tells you spike or not.','Scanne vor dem Kaufen oder Essen. Das Kraut sagt dir, Spike oder nicht.','Escanea antes de comprar o comer. Tu ser de luz te dice si te subirá el azúcar o no.']},
 {id:'variety',from:0,go:'next',goal:[3,3,4,4,5],t:['Use {n} different actions','Nutze {n} verschiedene Aktionen','Usa {n} acciones distintas'],h:['Meal, water, move, scan, fasting and check-in each count once. Mixing beats repeating.','Mahlzeit, Wasser, Bewegung, Scan, Fasten und Einchecken zählen je einmal. Abwechslung schlägt Wiederholung.','Comida, agua, movimiento, escaneo, ayuno y registro cuentan una vez cada uno. Variar gana a repetir.']},
 {id:'green',from:1,go:'scan',goal:[1,2,3,4,5],t1:['1 low-spike meal','1 Low-Spike-Mahlzeit','1 comida sin pico'],t:['{n} low-spike meals','{n} Low-Spike-Mahlzeiten','{n} comidas sin pico'],h:['Veggies and protein first, carbs last. Look for the green verdict.','Erst Gemüse und Eiweiß, Kohlenhydrate zum Schluss. Achte auf das grüne Urteil.','Primero verdura y proteína, carbohidratos al final. Busca el veredicto verde.']},
 {id:'move',from:2,go:'move',goal:[1,1,2,3,4],t1:['Move once','1× bewegen','Muévete una vez'],t:['Move {n} times','{n}× bewegen','Muévete {n} veces'],h:['Ten minutes is enough. A walk right after a meal flattens the spike the most.','Zehn Minuten reichen. Ein Spaziergang direkt nach dem Essen glättet den Spike am meisten.','Diez minutos bastan. Caminar justo después de comer es lo que más aplana el pico.']}
];
function specialQuests(st,lang){
  const li={en:0,de:1,es:2}[lang]||0,s=(st&&st.s)||{},ev=evolution(s.xp);if(!ev.next)return{stage:ev.current.id,next:null,steps:[],done:0};
  const since=stageStart(s),c=counts(st,since),led=s.ledger||[];c.variety=variety(c);
  const steps=STEPS.filter(x=>ev.index>=x.from).map(x=>{const goal=x.goal[Math.min(ev.index,x.goal.length-1)],n=Math.min(goal,c[x.id]||0),eventId='hq:'+ev.current.id+':'+x.id,claimed=led.some(e=>e.eventId===eventId);
    const go=x.go==='next'?({meal:'eat',water:'water',move:'move',scan:'scan',fast:'fast',checkin:'checkin'})[KINDS.find(k=>!(c[k]>0))||'meal']:x.go;
    return{id:x.id,goal,n,done:n>=goal,claimed,eventId,xp:SPECIAL_XP,go,title:L3(goal===1&&x.t1?x.t1:x.t,li).split('{n}').join(goal),hint:L3(x.h,li)};});
  return{stage:ev.current.id,next:ev.next,steps,done:steps.filter(x=>x.claimed).length};
}

/* ---------- weekly missions: one light layer, the user picks at most 2 per week ---------- */
const MISSION_XP=40,MAX_MISSIONS=2;
const MISSIONS=[
 {id:'green5',k:'green',n:5,go:'scan',t:['5 low-spike meals this week','5 Low-Spike-Mahlzeiten diese Woche','5 comidas sin pico esta semana']},
 {id:'water20',k:'water',n:20,go:'water',t:['20 glasses of water','20 Gläser Wasser','20 vasos de agua']},
 {id:'move4',k:'move',n:4,go:'move',t:['Move 4 times','4× bewegen','Muévete 4 veces']},
 {id:'scan5',k:'scan',n:5,go:'scan',t:['Scan 5 products','5 Produkte scannen','Escanea 5 productos']},
 {id:'fast3',k:'fast',n:3,go:'fast',t:['3 fasts of 12 h or more','3× mindestens 12 h fasten','3 ayunos de 12 h o más']},
 {id:'food3',k:'food',n:3,go:'eat',t:['Try 3 new foods','3 neue Lebensmittel probieren','Prueba 3 alimentos nuevos']}
];
function weekStart(now){const d=new Date(+now||Date.now());const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x.getTime();}
function weekKey(now){return dayKey(weekStart(now));}
function weekResetIn(now){now=+now||Date.now();const ms=weekStart(now)+7*864e5-now;const ws=new Date(weekStart(now));const next=new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()+7).getTime()-now;const d=Math.floor(next/864e5),h=Math.floor(next%864e5/36e5);return{ms:next||ms,d,h,text:(d?d+'d ':'')+h+'h'};}
function pickMission(state,id,now){const wk=weekKey(now);state=state&&state.week===wk?{week:wk,picks:(state.picks||[]).slice()}:{week:wk,picks:[]};
  if(!MISSIONS.some(m=>m.id===id))return{state,ok:false};const i=state.picks.indexOf(id);
  if(i>=0){state.picks.splice(i,1);return{state,ok:true,removed:true};}
  if(state.picks.length>=MAX_MISSIONS)return{state,ok:false,full:true};state.picks.push(id);return{state,ok:true};}
function missions(st,state,lang,now){
  const li={en:0,de:1,es:2}[lang]||0,wk=weekKey(now),picks=state&&state.week===wk?state.picks||[]:[],c=counts(st,weekStart(now)),led=((st&&st.s)||{}).ledger||[];
  return MISSIONS.map(m=>{const eventId='wm:'+wk+':'+m.id,n=Math.min(m.n,c[m.k]||0);return{id:m.id,goal:m.n,n,done:n>=m.n,picked:picks.indexOf(m.id)>=0,claimed:led.some(e=>e.eventId===eventId),eventId,xp:MISSION_XP,go:m.go,title:L3(m.t,li)};});
}

/* ---------- countdown to the local midnight reset ---------- */
function resetIn(now){now=now instanceof Date?now:new Date(+now||Date.now());const ms=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)-now;return{ms,h:Math.floor(ms/36e5),m:Math.floor(ms%36e5/6e4),text:Math.floor(ms/36e5)+':'+pad(Math.floor(ms%36e5/6e4))};}

/* ---------- own goals: every goal points at an existing action and reads its progress from that module (no manual tick, no extra XP) ---------- */
const ACTIONS=['eat','green','scan','water','fast','move','checkin','post'];
const CHIPS=[
 {id:'eat',t:['Plate','Teller','Plato'],c:[['eat',1,['Log my breakfast','Frühstück eintragen','Registrar mi desayuno']],['eat',3,['Log all 3 meals','Alle 3 Mahlzeiten eintragen','Registrar las 3 comidas']],['green',1,['One low-spike meal','Eine Low-Spike-Mahlzeit','Una comida sin pico']],['scan',1,['Scan a snack before eating it','Snack vorm Essen scannen','Escanear un snack antes de comerlo']]]},
 {id:'water',t:['Water & fasting','Wasser & Fasten','Agua y ayuno'],c:[['water',2,['2 glasses before noon','2 Gläser bis mittags','2 vasos antes del mediodía']],['water',6,['6 glasses today','6 Gläser heute','6 vasos hoy']],['fast',12,['12 h overnight fast','12 h über Nacht fasten','12 h de ayuno nocturno']],['fast',16,['16:8 fasting day','16:8-Fastentag','Día de ayuno 16:8']]]},
 {id:'move',t:['Move','Bewegen','Moverse'],c:[['move',10,['10-min walk after a meal','10 Min. gehen nach dem Essen','Caminar 10 min tras comer']],['move',5,['5 minutes of stretching','5 Minuten dehnen','5 minutos de estiramiento']],['move',20,['20 active minutes','20 aktive Minuten','20 minutos activos']],['move',30,['30-minute workout','30 Minuten Training','Entreno de 30 minutos']]]},
 {id:'mind',t:['Routine','Routine','Rutina'],c:[['checkin',1,['Morning check-in','Morgens einchecken','Registro por la mañana']],['green',2,['Veggies first, twice','Zweimal Gemüse zuerst','Verdura primero, dos veces']],['scan',2,['Check 2 products while shopping','2 Produkte beim Einkauf prüfen','Revisar 2 productos al comprar']],['post',1,['Share one win in Community','Einen Erfolg in der Community teilen','Compartir un logro en Comunidad']]]}
];
const cleanText=t=>String(t||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,60);
function addGoal(list,g,now){
  list=Array.isArray(list)?list.slice():[];g=g||{};const text=cleanText(g.text),action=ACTIONS.indexOf(g.action)>=0?g.action:'',n=Math.max(1,Math.min(999,Math.round(+g.n||1)));
  if(!action)return{list,goal:null,error:'action'};if(!text)return{list,goal:null,error:'empty'};
  if(list.filter(x=>!x.archived).length>=MAX_GOALS)return{list,goal:null,error:'full'};
  if(list.some(x=>!x.archived&&x.action===action&&x.n===n&&x.text.toLowerCase()===text.toLowerCase()))return{list,goal:null,error:'dup'};
  now=+now||Date.now();const goal={id:'g'+now.toString(36)+Math.random().toString(36).slice(2,6),action,n,text,daily:g.daily!==false,created:now,day:dayKey(now)};
  list.push(goal);return{list,goal,error:''};
}
function removeGoal(list,id){return(list||[]).filter(g=>g.id!==id);}
/* today's value for an action, from the app's stores */
function todayValue(action,st,now){
  st=st||{};const s=st.s||{},day=dayKey(now),f=st.fast||{},mv=st.move||{};const logs=(s.logs||[]).filter(l=>l&&(l.day||dayKey(l.ts))===day);
  if(action==='eat')return logs.length;if(action==='green')return logs.filter(isGreen).length;
  if(action==='scan')return logs.filter(isScan).length+(st.products||[]).filter(p=>p&&dayKey(p.ts||p.at||0)===day).length;
  if(action==='water')return +(f.water&&f.water[day])||0;
  if(action==='fast'){let h=f.last&&f.last<=(+now||Date.now())?((+now||Date.now())-f.last)/36e5:0;(Array.isArray(f.hist)?f.hist:[]).forEach(x=>{if(x&&x.e&&dayKey(x.e)===day)h=Math.max(h,+x.h||0);});return Math.floor(h);}
  if(action==='move')return Math.floor((Array.isArray(mv.sessions)?mv.sessions:[]).filter(x=>x&&x.day===day).reduce((a,x)=>a+(+x.moved||0),0)/60);
  if(action==='checkin')return s.streak&&s.streak.last===day?1:0;
  if(action==='post')return(st.posts||[]).some(p=>p&&p.ts&&dayKey(p.ts)===day)||(s.ledger||[]).some(e=>e&&e.day===day&&e.src==='tribe-post')?1:0;
  return 0;
}
/* goals shown today with live progress; a one-off goal stays until the day after it was reached */
function goalsToday(list,st,now){
  const day=dayKey(now);return(list||[]).filter(g=>g&&!g.archived&&(g.daily||!g.doneDay||g.doneDay===day)).map(g=>{const v=todayValue(g.action,st,now);return{...g,value:Math.min(v,g.n),done:v>=g.n};});
}
/* mark one-off goals reached today so they leave tomorrow (mutates and returns whether anything changed) */
function settleGoals(list,st,now){let ch=false;const day=dayKey(now);(list||[]).forEach(g=>{if(g&&!g.daily&&!g.doneDay&&todayValue(g.action,st,now)>=g.n){g.doneDay=day;ch=true;}});return ch;}

const api={MEAL_XP,QUEST_XP,SPECIAL_XP,MISSION_XP,MAX_MISSIONS,MAX_GOALS,FOODS,CATS,STEPS,MISSIONS,CHIPS,ACTIONS,KINDS,dayKey,evolution,stageStart,discover,newFoods,resultOf,journal,counts,variety,specialQuests,weekStart,weekKey,weekResetIn,pickMission,missions,resetIn,addGoal,removeGoal,todayValue,goalsToday,settleGoals,cleanText};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiHerbQuestsCore=api;
})(typeof window!=='undefined'?window:globalThis);
