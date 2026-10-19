/* Herb-first start + starter plan: pure rules, no DOM.
   - 4 short, optional questions at the start. Every one can be skipped.
   - "What makes this hard?" is asked later, only after that friction shows up in the app's own data.
   - The plan is 3 or 4 editable next actions. Each one only points at an existing module action
     (scan, meal log, water, move, fasting, macros). Whether it's done is read from that module, never stored here.
   No health diagnoses are ever asked. */
(function(root){
'use strict';
const LANGS=['en','de','es'];
const L=l=>LANGS.includes(l)?l:'en';
const t3=(en,de,es)=>({en,de,es});
const fmt=(s,o)=>String(s).replace(/\{(\w+)\}/g,(m,k)=>o&&o[k]!=null?o[k]:'');

/* --- the first questions: high value, optional --- */
const QUESTIONS=[
 {id:'hard',over:t3('CRAVINGS','HEISSHUNGER','ANTOJOS'),q:t3('When are your cravings strongest?','Wann ist dein Hei\u00dfhunger am st\u00e4rksten?','\u00bfCu\u00e1ndo son m\u00e1s fuertes tus antojos?'),
  sub:t3('Everyone has a time like that. It just helps us plan around it.','Hat jeder. Es hilft uns nur, besser f\u00fcr dich zu planen.','Todos tenemos un momento as\u00ed. Solo nos ayuda a planificar contigo.'),
  opts:[['morning',t3('In the morning','Morgens','Por la ma\u00f1ana')],['afternoon',t3('In the afternoon','Nachmittags','Por la tarde')],['evening',t3('In the evening','Abends','Por la noche')],['late',t3('Late at night','Sp\u00e4t in der Nacht','De madrugada')],['varies',t3('It changes','Ganz unterschiedlich','Depende del d\u00eda')]]},
 {id:'active',over:t3('MOVING','BEWEGUNG','MOVIMIENTO'),q:t3('How active are you right now?','Wie aktiv bist du gerade?','\u00bfQu\u00e9 tan activo eres ahora?'),
  opts:[['sit',t3('Mostly sitting','Meist im Sitzen','Casi siempre sentado')],['walk',t3('Some walking','Etwas zu Fu\u00df','Camino algo')],['active',t3('Active most days','Fast t\u00e4glich aktiv','Activo casi todos los d\u00edas')]]},
 {id:'fast',over:t3('FASTING','FASTEN','AYUNO'),q:t3('Do you fast?','Fastest du?','\u00bfHaces ayuno?'),
  opts:[['never',t3('Never tried','Noch nie','Nunca lo prob\u00e9')],['f12',t3('Sometimes, about 12 h','Manchmal, etwa 12 h','A veces, unas 12 h')],['f16',t3('Regularly, 16 h','Regelm\u00e4\u00dfig, 16 h','Con regularidad, 16 h')],['long',t3('Longer than 16 h','L\u00e4nger als 16 h','M\u00e1s de 16 h')]]},
 {id:'pace',over:t3('YOUR PACE','DEIN TEMPO','TU RITMO'),q:t3('How many next steps at once?','Wie viele n\u00e4chste Schritte auf einmal?','\u00bfCu\u00e1ntos pasos a la vez?'),
  opts:[['3',t3('3. Keep it calm','3. Ganz entspannt','3. Con calma')],['4',t3('4. I want a bit more','4. Gern etwas mehr','4. Quiero un poco m\u00e1s')]]}
];

/* --- asked only once that friction shows up --- */
const FRICTION={
 eat:{over:t3('AFTER THAT SPIKE','NACH DEM SPIKE','TRAS ESE PICO'),q:t3('That meal spiked. What makes eating hard?','Das Essen hat gespiked. Was macht dir das Essen schwer?','Esa comida dispar\u00f3 el az\u00facar. \u00bfQu\u00e9 te lo pone dif\u00edcil?'),
  opts:[['night',t3('Late-night snacking','Sp\u00e4tes Snacken','Picar de noche')],['stress',t3('Stress or boredom','Stress oder Langeweile','Estr\u00e9s o aburrimiento')],['drinks',t3('Sweet drinks','S\u00fc\u00dfe Getr\u00e4nke','Bebidas dulces')],['skip',t3('Skipping meals, then a lot','Mahlzeiten auslassen, dann viel','Saltar comidas y luego mucho')],['out',t3('Eating out','Ausw\u00e4rts essen','Comer fuera')]]},
 move:{over:t3('MOVING','BEWEGUNG','MOVIMIENTO'),q:t3('Moving didn\u2019t happen yesterday. What got in the way?','Gestern war keine Bewegung drin. Was kam dazwischen?','Ayer no hubo movimiento. \u00bfQu\u00e9 lo impidi\u00f3?'),
  opts:[['tired',t3('Too tired','Zu m\u00fcde','Demasiado cansado')],['time',t3('No time','Keine Zeit','Sin tiempo')],['body',t3('My body makes it hard','Mein K\u00f6rper macht es schwer','Mi cuerpo lo hace dif\u00edcil')],['judged',t3('Feeling watched','Gef\u00fchl, beobachtet zu werden','Sentirme observado')],['fun',t3('It\u2019s boring','Es ist langweilig','Es aburrido')]]},
 fast:{over:t3('FASTING','FASTEN','AYUNO'),q:t3('Your last fast ended early. What made it hard?','Dein letztes Fasten endete fr\u00fcher. Was war schwer?','Tu \u00faltimo ayuno termin\u00f3 antes. \u00bfQu\u00e9 fue dif\u00edcil?'),
  opts:[['hungry',t3('Too hungry','Zu hungrig','Demasiada hambre')],['social',t3('Plans with others','Pl\u00e4ne mit anderen','Planes con otros')],['forgot',t3('Forgot I was fasting','Vergessen, dass ich faste','Olvid\u00e9 que ayunaba')],['energy',t3('Low energy','Wenig Energie','Poca energ\u00eda')]]}
};

/* --- the actions: each one names the module it opens and the module fact that marks it done --- */
const ACTIONS={
 scan:{ic:'scan',mod:'scan',t:t3('Scan before you eat','Scannen, bevor du isst','Escanea antes de comer')},
 meal:{ic:'plate',mod:'meal',t:t3('Log your first meal','Erste Mahlzeit eintragen','Registra tu primera comida')},
 meals3:{ic:'plate',mod:'meal',t:t3('Log 3 meals today','3 Mahlzeiten eintragen','Registra 3 comidas hoy')},
 water:{ic:'water',mod:'water',t:t3('Fill your water: {goal} cups','Wasser voll machen: {goal} Gl\u00e4ser','Completa tu agua: {goal} vasos')},
 move:{ic:'move',mod:'move',t:t3('Move a little, any amount','Ein bisschen bewegen, egal wie viel','Mu\u00e9vete un poco, lo que sea')},
 fast12:{ic:'hourglass',mod:'fast',h:12,t:t3('Fast 12 hours overnight','12 Stunden \u00fcber Nacht fasten','Ayuna 12 horas de noche')},
 fast14:{ic:'hourglass',mod:'fast',h:14,t:t3('Fast 14 hours','14 Stunden fasten','Ayuna 14 horas')},
 fast16:{ic:'hourglass',mod:'fast',h:16,t:t3('Keep your 16-hour fast','Dein 16-Stunden-Fasten halten','Mant\u00e9n tu ayuno de 16 horas')},
 macros:{ic:'star',mod:'macros',t:t3('Reach one macro goal','Ein Makro-Ziel erreichen','Alcanza una meta de macros')}
};
const WHY={
 scanEvening:t3('Your cravings are strongest in the evening. A quick scan before dinner shows the spike before it happens.','Abends ist dein Hei\u00dfhunger am st\u00e4rksten. Ein kurzer Scan vor dem Abendessen zeigt den Spike, bevor er passiert.','Por la noche tus antojos son m\u00e1s fuertes. Un escaneo antes de cenar muestra el pico antes de que pase.'),
 scanLate:t3('Late at night your cravings are strongest. Scanning first gives you one second to choose.','Sp\u00e4t nachts ist dein Hei\u00dfhunger am st\u00e4rksten. Erst scannen gibt dir eine Sekunde zum Entscheiden.','De madrugada tus antojos son m\u00e1s fuertes. Escanear primero te da un segundo para decidir.'),
 scanAfternoon:t3('Your cravings peak in the afternoon. Scan your snack and see if it spikes.','Nachmittags ist dein Hei\u00dfhunger am st\u00e4rksten. Scann deinen Snack und sieh, ob er spiked.','Por la tarde tus antojos son m\u00e1s fuertes. Escanea tu snack y mira si dispara.'),
 scanStart:t3('Scanning is the fastest way to learn what spikes you. One a day is enough.','Scannen ist der schnellste Weg zu lernen, was bei dir spiked. Einer am Tag reicht.','Escanear es la forma m\u00e1s r\u00e1pida de saber qu\u00e9 te dispara. Uno al d\u00eda basta.'),
 mealMorning:t3('Your cravings are strongest in the morning. Logging the first meal sets up the whole day.','Morgens ist dein Hei\u00dfhunger am st\u00e4rksten. Die erste Mahlzeit einzutragen setzt den Ton f\u00fcr den Tag.','Por la ma\u00f1ana tus antojos son m\u00e1s fuertes. Registrar la primera comida marca el d\u00eda.'),
 moveSit:t3('You sit most of the day. Any movement counts, even two minutes.','Du sitzt den Gro\u00dfteil des Tages. Jede Bewegung z\u00e4hlt, auch zwei Minuten.','Pasas sentado casi todo el d\u00eda. Cualquier movimiento cuenta, incluso dos minutos.'),
 moveWalk:t3('You already walk some. A short walk after a meal flattens the spike.','Du gehst schon etwas. Ein kurzer Gang nach dem Essen macht den Spike flacher.','Ya caminas algo. Un paseo corto tras comer aplana el pico.'),
 moveActive:t3('You move most days. Keep the streak and let Misty feel it.','Du bewegst dich fast t\u00e4glich. Halte die Serie und lass Misty es sp\u00fcren.','Te mueves casi a diario. Mant\u00e9n la racha y que Misty lo sienta.'),
 moveBase:t3('Movement after eating is the easiest way to soften a spike.','Bewegung nach dem Essen ist der einfachste Weg, einen Spike abzufedern.','Moverte tras comer es la forma m\u00e1s f\u00e1cil de suavizar un pico.'),
 fastNever:t3('You haven\u2019t fasted yet. 12 hours overnight is mostly sleep.','Du hast noch nie gefastet. 12 Stunden \u00fcber Nacht sind fast nur Schlaf.','A\u00fan no has ayunado. 12 horas de noche son casi todo sue\u00f1o.'),
 fastStep:t3('You do about 12 hours. Two more is a small, real step.','Du schaffst etwa 12 Stunden. Zwei mehr sind ein kleiner, echter Schritt.','Haces unas 12 horas. Dos m\u00e1s es un paso peque\u00f1o y real.'),
 fastKeep:t3('You already fast 16 hours. The goal is to keep it steady.','Du fastest schon 16 Stunden. Ziel ist, es stabil zu halten.','Ya ayunas 16 horas. La meta es mantenerlo estable.'),
 fastWater:t3('You fast long. Water keeps it safe and steady.','Du fastest lange. Wasser h\u00e4lt es sicher und stabil.','Ayunas mucho. El agua lo mantiene seguro y estable.'),
 waterBase:t3('Water is the easiest win of the day, and it fills Misty up too.','Wasser ist der leichteste Gewinn des Tages, und er l\u00e4dt auch Misty auf.','El agua es la victoria m\u00e1s f\u00e1cil del d\u00eda, y tambi\u00e9n recarga a Misty.'),
 macrosBase:t3('Protein and fiber keep you full and flatten spikes.','Eiwei\u00df und Ballaststoffe machen satt und flachen Spikes ab.','La prote\u00edna y la fibra sacian y aplanan los picos.'),
 eatNight:t3('Late-night snacking is your friction. Scan first, then decide.','Sp\u00e4tes Snacken ist deine H\u00fcrde. Erst scannen, dann entscheiden.','Picar de noche es tu obst\u00e1culo. Escanea primero y luego decide.'),
 eatStress:t3('Stress or boredom eating: a scan is a pause before the bite.','Essen aus Stress oder Langeweile: Ein Scan ist eine Pause vor dem Bissen.','Comer por estr\u00e9s o aburrimiento: escanear es una pausa antes del bocado.'),
 eatDrinks:t3('Sweet drinks are your friction. Every glass of water is one less.','S\u00fc\u00dfe Getr\u00e4nke sind deine H\u00fcrde. Jedes Glas Wasser ist eins weniger.','Las bebidas dulces son tu obst\u00e1culo. Cada vaso de agua es uno menos.'),
 eatSkip:t3('Skipping meals leads to big ones. Log three and keep it even.','Mahlzeiten auslassen f\u00fchrt zu gro\u00dfen. Trag drei ein und halt es gleichm\u00e4\u00dfig.','Saltar comidas lleva a comer mucho. Registra tres y mantenlo parejo.'),
 eatOut:t3('Eating out is your friction. Scan the menu dish before you order.','Ausw\u00e4rts essen ist deine H\u00fcrde. Scann das Gericht, bevor du bestellst.','Comer fuera es tu obst\u00e1culo. Escanea el plato antes de pedir.'),
 moveTiny:t3('Tired days count too. Two minutes of moving still wakes Misty up.','M\u00fcde Tage z\u00e4hlen auch. Zwei Minuten Bewegung wecken Misty trotzdem.','Los d\u00edas cansados tambi\u00e9n cuentan. Dos minutos de movimiento despiertan a Misty.'),
 moveTime:t3('No time? Walk ten minutes right after one meal. No extra slot needed.','Keine Zeit? Geh direkt nach einer Mahlzeit zehn Minuten. Kein extra Termin n\u00f6tig.','\u00bfSin tiempo? Camina diez minutos justo tras una comida. Sin hueco extra.'),
 moveBody:t3('Gentle counts. Pick sessions in Move that are kind to your joints.','Sanft z\u00e4hlt. Move hat Einheiten, die gelenkschonend sind.','Lo suave cuenta. Move tiene sesiones amables con tus articulaciones.'),
 moveHome:t3('Move at home, nobody watching. A session in Move works in your living room.','Beweg dich zu Hause, ohne Zuschauer. Eine Move-Einheit klappt im Wohnzimmer.','Mu\u00e9vete en casa, sin nadie mirando. Una sesi\u00f3n de Move funciona en tu sal\u00f3n.'),
 moveFun:t3('Boring is the enemy. Try a different session in Move each day.','Langeweile ist der Feind. Probier jeden Tag eine andere Move-Einheit.','El aburrimiento es el enemigo. Prueba una sesi\u00f3n distinta en Move cada d\u00eda.'),
 fastDown:t3('Your last fast ended early. A shorter goal you hit beats a long one you don\u2019t.','Dein letztes Fasten endete fr\u00fcher. Ein k\u00fcrzeres Ziel, das du schaffst, schl\u00e4gt ein langes, das du nicht schaffst.','Tu \u00faltimo ayuno termin\u00f3 antes. Una meta corta que cumples vale m\u00e1s que una larga que no.'),
 fastRemind:t3('You forgot you were fasting. The timer on Today shows when it ends.','Du hast vergessen, dass du fastest. Der Timer auf Heute zeigt, wann es endet.','Olvidaste que ayunabas. El temporizador en Hoy muestra cu\u00e1ndo termina.'),
 picked:t3('You picked this one yourself.','Das hast du selbst ausgesucht.','Lo elegiste t\u00fa.')
};

function clean(answers){const out={};answers=answers&&typeof answers==='object'?answers:{};
 for(const q of QUESTIONS){const v=answers[q.id];if(q.opts.some(o=>o[0]===v))out[q.id]=v;}return out;}
function size(a){return clean(a).pace==='4'?4:3;}

/* answers -> 3 or 4 actions [{id, why}] */
function buildPlan(answers){const a=clean(answers),out=[],add=(id,why)=>{if(ACTIONS[id]&&!out.some(x=>x.id===id))out.push({id,why});};
 const h=a.hard;
 if(h==='morning')add('meal','mealMorning');else add('scan',h==='evening'?'scanEvening':h==='late'?'scanLate':h==='afternoon'?'scanAfternoon':'scanStart');
 add('move',a.active==='sit'?'moveSit':a.active==='walk'?'moveWalk':a.active==='active'?'moveActive':'moveBase');
 if(a.fast==='never')add('fast12','fastNever');else if(a.fast==='f12')add('fast14','fastStep');else if(a.fast==='f16')add('fast16','fastKeep');else if(a.fast==='long')add('water','fastWater');else add('water','waterBase');
 add('water','waterBase');add('macros','macrosBase');add('scan','scanStart');
 return out.slice(0,size(a));}
function newPlan(answers,now){const a=clean(answers);return{v:2,answers:a,actions:buildPlan(a),asked:{},created:now||Date.now(),hidden:false};}

/* editing: swap one action for another one that isn't in the plan yet; add or remove within 3..4 */
function alternatives(plan){const used=(plan&&plan.actions||[]).map(x=>x.id);return Object.keys(ACTIONS).filter(id=>!used.includes(id)&&!(ACTIONS[id].mod==='fast'&&used.some(u=>ACTIONS[u]&&ACTIONS[u].mod==='fast')));}
function replace(plan,i,id){if(!plan||!plan.actions[i]||!ACTIONS[id])return plan;if(plan.actions.some((x,k)=>k!==i&&x.id===id))return plan;plan.actions[i]={id,why:'picked'};return plan;}
function addAction(plan,id){if(!plan||plan.actions.length>=4||!ACTIONS[id]||!alternatives(plan).includes(id))return plan;plan.actions.push({id,why:'picked'});return plan;}
function removeAction(plan,i){if(!plan||plan.actions.length<=3||!plan.actions[i])return plan;plan.actions.splice(i,1);return plan;}

/* module facts -> done. facts come from the live modules: {water, waterGoal, meals, moved, scanned, macros:[{earned}], fastH, fastBestTodayH} */
function isDone(id,f){const a=ACTIONS[id];f=f||{};if(!a)return false;
 switch(a.mod){
  case 'scan':return !!f.scanned;
  case 'meal':return id==='meals3'?(+f.meals||0)>=3:(+f.meals||0)>=1;
  case 'water':return (+f.water||0)>=(+f.waterGoal||6);
  case 'move':return !!f.moved;
  case 'fast':return Math.max(+f.fastH||0,+f.fastBestTodayH||0)>=a.h;
  case 'macros':return (f.macros||[]).some(m=>m&&m.earned);
 }return false;}

/* friction detection from module data: which deferred question is due right now (one at a time) */
function frictionDue(plan,f){if(!plan||!plan.actions)return null;const asked=plan.asked||{};f=f||{};
 if(!asked.eat&&f.spikeRecent)return 'eat';
 if(!asked.move&&f.planAgeDays>=1&&f.movedYesterday===false&&plan.actions.some(x=>x.id==='move'))return 'move';
 if(!asked.fast&&f.fastShortRecent&&plan.actions.some(x=>ACTIONS[x.id]&&ACTIONS[x.id].mod==='fast'))return 'fast';
 return null;}
function setAt(plan,mod,id,why){const i=plan.actions.findIndex(x=>ACTIONS[x.id]&&ACTIONS[x.id].mod===mod);
 if(i>=0){if(!plan.actions.some((x,k)=>k!==i&&x.id===id))plan.actions[i]={id,why};}
 else if(plan.actions.length<4&&!plan.actions.some(x=>x.id===id))plan.actions.push({id,why});
 else if(!plan.actions.some(x=>x.id===id)){const j=plan.actions.length-1;plan.actions[j]={id,why};}
 return plan;}
/* the answer adapts the plan; null = 'not now' (it isn't asked again) */
function answerFriction(plan,key,v){if(!plan||!FRICTION[key])return plan;plan.asked=plan.asked||{};plan.asked[key]=v||'skip';if(!v)return plan;
 if(key==='eat'){
  if(v==='night')setAt(plan,'scan','scan','eatNight');else if(v==='stress')setAt(plan,'scan','scan','eatStress');
  else if(v==='drinks')setAt(plan,'water','water','eatDrinks');else if(v==='skip')setAt(plan,'meal','meals3','eatSkip');else if(v==='out')setAt(plan,'scan','scan','eatOut');}
 if(key==='move'){const w={tired:'moveTiny',time:'moveTime',body:'moveBody',judged:'moveHome',fun:'moveFun'}[v];if(w)setAt(plan,'move','move',w);}
 if(key==='fast'){const i=plan.actions.findIndex(x=>ACTIONS[x.id]&&ACTIONS[x.id].mod==='fast');
  if(i>=0){const cur=plan.actions[i].id;
   if(v==='forgot')plan.actions[i]={id:cur,why:'fastRemind'};
   else{const down={fast16:'fast14',fast14:'fast12',fast12:'fast12'}[cur];plan.actions[i]={id:down,why:'fastDown'};if(v==='hungry'||v==='energy'){if(!plan.actions.some(x=>x.id==='water')){if(plan.actions.length<4)plan.actions.push({id:'water',why:'fastWater'});}}}}}
 return plan;}

function actionText(id,lang,vars){const a=ACTIONS[id];return a?fmt(a.t[L(lang)],vars):'';}
function whyText(key,lang){const w=WHY[key]||WHY.picked;return w[L(lang)];}
function questionText(q,lang){lang=L(lang);return{id:q.id,over:q.over[lang],q:q.q[lang],sub:q.sub?q.sub[lang]:'',opts:q.opts.map(o=>({v:o[0],t:o[1][lang]}))};}
function frictionText(key,lang){const q=FRICTION[key];return q?questionText(Object.assign({id:key},q),lang):null;}

/* --- herb-first: name suggestions from the shipped herb identity pool --- */
function namePool(core){const F=core&&core.FIRST?Object.values(core.FIRST):['Misty','Nova','Sage','Pip','Lumi','Moss'];
 const S=core&&core.SECOND?Object.values(core.SECOND):['Moon','Star','Leaf','Spark','Dew','Glow'];
 const out=[];for(const f of F)for(const s of S)if(out.indexOf(f+' '+s)<0)out.push(f+' '+s);return out;}
function suggestName(core,seed,avoid){const pool=namePool(core);if(!pool.length)return 'Minti Leaf';
 let i=Math.abs(Math.floor(Number(seed)||0))%pool.length;for(let k=0;k<pool.length&&avoid&&pool[i]===avoid;k++)i=(i+7)%pool.length;return pool[i];}
function cleanName(v,max){return String(v==null?'':v).replace(/[<>\u0000-\u001f]/g,'').replace(/\s+/g,' ').trim().slice(0,max||24);}

/* Oct 19 (new-user walkthrough): the fasting goal follows the "Do you fast?" answer. A first-timer who said "never" was told
   "fast 12 hours overnight" by the plan but the Gap bubble counted toward 16 h. never -> 12, 12 h -> 14 (one step up), 16 h -> 16,
   longer -> 18. No answer (skipped) -> null: the fasting timer keeps its own default. */
function fastTarget(ans){const v=ans&&ans.fast;return {never:12,f12:14,f16:16,long:18}[v]||null;}

const api={fastTarget,QUESTIONS,FRICTION,ACTIONS,WHY,clean,size,buildPlan,newPlan,alternatives,replace,addAction,removeAction,isDone,frictionDue,answerFriction,actionText,whyText,questionText,frictionText,namePool,suggestName,cleanName,L,fmt};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiStarterCore=api;
})(typeof window!=='undefined'?window:globalThis);
