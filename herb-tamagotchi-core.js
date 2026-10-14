/* Living herb: presentation and care state derived from the app's single XP ledger. */
(function(root){
'use strict';
const C=typeof module==='object'&&module.exports?require('./herb-config.js'):root.LOWI_HERB_CONFIG;
const K=typeof module==='object'&&module.exports?require('./herb-core.js'):root.LowiHerbCore;
const ZODIAC=[['Aries','♈','fire'],['Taurus','♉','earth'],['Gemini','♊','air'],['Cancer','♋','water'],['Leo','♌','fire'],['Virgo','♍','earth'],['Libra','♎','air'],['Scorpio','♏','water'],['Sagittarius','♐','fire'],['Capricorn','♑','earth'],['Aquarius','♒','air'],['Pisces','♓','water']];
const MBTI=['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
const LOOKS={
 Aries:['#ffba70','#ff7992','Ember','Roo','Flare'],Taurus:['#b8e78a','#edc598','Clover','Mochi','Fern'],
 Gemini:['#b7ecff','#c7a1ff','Pip','Twigi','Echo'],Cancer:['#a8e8eb','#ffc6dc','Pearl','Luna','Shell'],
 Leo:['#ffde83','#ffa874','Sunny','Miso','Sol'],Virgo:['#9fe1b6','#d7e9a6','Sage','Basil','Bean'],
 Libra:['#ffd1e5','#b6d4ff','Peach','Petal','Lumi'],Scorpio:['#b1a7ff','#fa93cb','Plum','Nyx','Inky'],
 Sagittarius:['#c4abff','#ffcf83','Nova','Zippy','Comet'],Capricorn:['#94d7bf','#dfc18c','Moss','Pebble','Chai'],
 Aquarius:['#90e8ff','#aeb4ff','Pixel','Orbit','Zuzu'],Pisces:['#80e5d8','#b8b0ff','Misty','Bubbles','Nori']
};
const CONSTELLATIONS={
 Aries:[[34,80],[76,58],[120,73],[149,98]],Taurus:[[27,98],[70,65],[118,107],[168,68],[214,34],[167,68],[219,111]],
 Gemini:[[53,33],[78,98],[64,147],[78,98],[114,133],[164,46],[155,103],[190,147]],
 Cancer:[[41,92],[110,68],[135,35],[110,68],[152,126],[219,107]],
 Leo:[[37,108],[78,46],[126,32],[148,62],[115,86],[78,46],[72,140],[182,132],[218,100]],
 Virgo:[[31,85],[88,47],[140,79],[210,48],[140,79],[161,135],[108,153],[88,47]],
 Libra:[[40,71],[116,35],[196,77],[162,136],[79,133],[40,71]],
 Scorpio:[[40,39],[77,58],[95,98],[135,121],[176,155],[213,145],[218,118],[196,112]],
 Sagittarius:[[47,73],[106,51],[159,79],[188,47],[159,79],[131,139],[86,123],[47,73]],
 Capricorn:[[33,61],[122,90],[218,45],[180,127],[112,152],[33,61]],
 Aquarius:[[34,63],[72,39],[114,71],[141,46],[114,71],[157,112],[214,145],[191,169]],
 Pisces:[[24,73],[44,48],[75,63],[69,99],[37,102],[24,73],[107,116],[148,141],[174,93],[207,80],[224,104],[213,129],[183,130],[174,93]]
};
const COSMETICS=[
 {id:'ceramic',kind:'pot',xp:0,name:'Moon ceramic',icon:'◡'},
 {id:'glass',kind:'pot',xp:100,name:'Dewdrop glass',icon:'◇'},
 {id:'bow',kind:'hat',xp:300,name:'Little leaf bow',icon:'⋈'},
 {id:'sunset',kind:'glow',xp:500,name:'Peach sunset',icon:'☀'},
 {id:'crown',kind:'hat',xp:700,name:'Sprout crown',icon:'♛'},
 {id:'stars',kind:'effect',xp:1000,name:'Stardust trail',icon:'✧'},
 {id:'porcelain',kind:'pot',xp:1500,name:'Blossom porcelain',icon:'✿'},
 {id:'aurora',kind:'glow',xp:2200,name:'Aurora glow',icon:'☄'},
 {id:'halo',kind:'effect',xp:3000,name:'Celestial halo',icon:'◎'}
];
function period(now){const h=new Date(now||Date.now()).getHours();return h>=23||h<5?'night':h<11?'morning':h<17?'day':'evening';}
function careKind(e){const s=String(e&&((e.src||'')+' '+(e.label||''))||'').toLowerCase();
 if(/recipe|cook|gekocht/.test(s))return'bloom';if(/swap|swaflo|tausch/.test(s))return'sunlight';
 if(/meal|logged|ate|essen/.test(s))return'water';if(/move|walk|step|workout|exercise|beweg/.test(s))return'dance';
 if(/scan|barcode|product|caught|catch|find/.test(s))return'vitamin';if(/quest|check.?in|glow|fast|e1:/.test(s))return'cheer';return null;}
function profile(user,prefs){user=user||{};prefs=prefs||{};let z=ZODIAC.find(z=>z[0]===prefs.starSign);
 if(!z){const b=K.zodiac(user.bday);if(b)z=[b.name,b.symbol,b.element];}
 let personality=String(prefs.personality||user.mbti||user.personality||'').toUpperCase();if(!MBTI.includes(personality))personality='';
 const l=z?LOOKS[z[0]]:['#9de6b8','#c7b0ff','Minti','Pip','Clover'];
 return{sign:z?{name:z[0],symbol:z[1],element:z[2]}:null,personality,palette:{a:l[0],b:l[1],suggestion:l[2]},names:l.slice(2),constellation:z?CONSTELLATIONS[z[0]]:CONSTELLATIONS.Pisces,voice:personality&&personality[2]==='T'?'practical':'warm'};}
function recentXP(s){return(s&&Array.isArray(s.ledger)?s.ledger:[]).filter(e=>e&&+e.amt>0).slice().sort((a,b)=>(+b.ts||0)-(+a.ts||0)).slice(0,8).map(e=>({amt:+e.amt,label:String(e.label||e.src||'XP'),src:String(e.src||''),ts:+e.ts||0}));}
function latestHealthy(s,p,now){const at=+now||Date.now(),xs=[];
 (s&&Array.isArray(s.ledger)?s.ledger:[]).forEach(e=>{if((K.meaningful(e)||careKind(e))&&+e.amt>0&&+e.ts>0&&+e.ts<=at)xs.push(+e.ts);});
 (s&&Array.isArray(s.logs)?s.logs:[]).forEach(e=>{if(e&&+e.ts>0&&+e.ts<=at)xs.push(+e.ts);});
 if(p&&+p.lastActionAt>0&&+p.lastActionAt<=at)xs.push(+p.lastActionAt);
 return xs.length?Math.max(...xs):+(p&&p.createdAt)||at;}
function need(s,p,now){const day=new Date(now||Date.now()).toDateString(),done=new Set();
 (s.ledger||[]).forEach(e=>{if(new Date(+e.ts).toDateString()===day)done.add(careKind(e));});
 (p.care||[]).forEach(e=>{if(new Date(+e.at).toDateString()===day)done.add(e.kind);});
 if((s.logs||[]).some(e=>new Date(+e.ts).toDateString()===day))done.add('water');
 return['water','sunlight','dance','vitamin','bloom'].find(k=>!done.has(k))||'cheer';}
function model(s,p,now){s=s||{xp:0,ledger:[],logs:[],user:{}};p=p||{};now=+now||Date.now();
 const retained=Math.max(+p.highestStage||0,+(s.herb&&s.herb.stageIndex)||0),g=K.stage(s.xp,retained),pr=profile(s.user,p),last=latestHealthy(s,p,now),time=period(now),dim=now-last>=C.gentleDimAfterHours*3600000;
 return{...g,profile:pr,dim,period:time,mood:dim?'droopy':time==='night'?'sleepy':g.progress>.8?'excited':'happy',need:need(s,p,now),lastActionAt:last,recent:recentXP(s)};}
const lines={
 home:['My leaves have a tiny happy dance queued up.','I saved you the sunny spot. Come sit.','A leaf grew while you were doing your thing.'],
 foryou:['Ooh, other humans have snack ideas. I am listening.','Borrow an idea. I will borrow the sunshine.'],
 scan:['My detective leaves are ready. What is on that label?','A tiny food mystery? Hand me my imaginary magnifying glass.'],
 shelf:['You pick dinner. I will be the tiny kitchen supervisor.','Same craving, new ingredients. I call dibs on the windowsill.'],
 move:['I have no legs, so you will have to dance for both of us.','Take me on a little walk. I travel in spirit.'],
 profile:['A new pot? For me? You should not have. Actually, you should.','This constellation is our little signature.']
};
const wiltLines=['I had a leafy little nap. One small action and I perk right up.','Missed your face. No rush; I kept all our leaves.','A meal log would be lovely. I am feeling a bit floppy.'];
const MOMENTS={
 morning:['Morning, sunshine. My leaves are still stretching.','The first light is ours. Tiny yawn, big leaf.','I woke up with serious windowsill energy.'],
 day:['Sunbeam secured. I am photosynthesizing dramatically.','Look at that glow. I have been practicing.','My lunch break is mostly standing in sunshine.'],
 evening:['Cozy leaf hours. What are we cooking?','A little evening sway. You did enough to come say hi.','The window is getting golden. I saved your spot.'],
 night:['Goodnight. I am closing my little eyes; see you in the sunlight.','After eleven? Blanket mode. We can grow tomorrow.','Shhh. Dreaming of very large leaves. Night, human.'],
 tap:['Hehe! That tickles my chlorophyll.','One leaf wave, just for you.','Tiny sparkle delivery! Signed, your herb.','You found my curious face. What are we doing?','Yes, I am this cute on purpose.','Boop accepted. Very professional gardening.','Wait, I need to fix my leaves. There.','I think we make a pretty good little team.'],
 dizzy:['Whoa, my leaves are doing cartwheels. Give me a breath!','Tiny herb, big spin. Let me sit for a second.'],
 water:['Ahhh. Meal logged, leaves refreshed.','One tiny watering dance for that meal.'],
 sunlight:['That swap? A little sunbeam for me.','New ingredients, same dinner dream. Sunny leaves!'],
 dance:['You moved. I wiggled. Excellent teamwork.','Leaf disco! I have been waiting for this.'],
 vitamin:['Label found. Vitamin sparkles incoming.','Detective work looks good on us.'],
 bloom:['You finished cooking. I brought the flowers.','Dinner is done? Allow me one dramatic bloom.'],
 cheer:['I felt that little win. Look at us go.','A sparkle for you. And a tiny proud face for me.'],
 evolution:['Wait... I think I am outgrowing this pot.','New leaves, same little weirdo. That is me.']
};
const PREFIX={Aries:['Let us go!','Big sprout energy.'],Taurus:['Soft leaves, comfy pot.','A cozy little win.'],Gemini:['Plot twist: leaves.','I have two new ideas.'],Cancer:['Your little cozy corner is ready.','I kept our spot warm.'],Leo:['Ta-da, human.','Spotlight on these leaves.'],Virgo:['Tiny plan, lovely leaves.','A neat little win.'],Libra:['We look lovely together.','A little balance, a little sparkle.'],Scorpio:['Secret leaf magic.','Our little glow stays between us.'],Sagittarius:['Adventure leaves, ready.','Where to next, human?'],Capricorn:['One little step, one lovely leaf.','Steady sprout energy.'],Aquarius:['Unusual herb idea incoming.','Space leaves, reporting in.'],Pisces:['Floating in our little sunbeam.','A tiny daydream for us.']};
function nextLine(page,used,opts){used=used||[];opts=opts||{};const m=opts.model||{},pr=m.profile||opts.profile||{},p=opts.period||m.period||'day';
 let base=opts.dim||m.dim?wiltLines:opts.moment?MOMENTS[opts.moment]||MOMENTS.cheer:(page==='home'||page==='room')?MOMENTS[p]:lines[page]||lines.home;
 const candidates=base.slice();if(page==='home'&&m.next&&p!=='night'&&!m.dim)candidates.unshift(Math.ceil(m.left)+' XP until '+m.next.name[0]+'. I can almost feel the new leaves.');
 const prefixes=PREFIX[pr.sign&&pr.sign.name]||['Tiny leaf, big feelings.','A little glow for us.'];
 if(pr.sign)candidates.unshift(...base.map(b=>prefixes[0]+' '+b));
 for(const prefix of prefixes)for(const b of base)candidates.push(prefix+' '+b);
 if(pr.voice==='practical')for(const b of base)candidates.push('One small step. '+b);
 return candidates.find(x=>!used.includes(x))||null;}
function tapReaction(count,times,now){const fast=(times||[]).filter(t=>now-t<1800);return fast.length>=8?'dizzy':['giggle','wave','sparkle','curious','proud','bounce'][Math.max(0,count-1)%6];}
function unlocked(xp){return COSMETICS.filter(x=>+xp>=x.xp);}
function nextUnlock(xp){return COSMETICS.find(x=>+xp<x.xp)||null;}
function cosmeticAllowed(id,xp){return COSMETICS.some(c=>c.id===id&&+xp>=c.xp);}
function reminderWindow(now,tz,lastDay){let parts;try{parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz||undefined,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));}catch(e){return{allowed:false};}
 const v=Object.fromEntries(parts.map(p=>[p.type,p.value])),day=v.year+'-'+v.month+'-'+v.day,hour=+v.hour;return{day,hour,allowed:hour>=8&&hour<21&&lastDay!==day};}
function reminder(config){const sign=config.sign,action=config.need||'water',lang=config.lang||'en';
 const msg={en:{water:'One meal log and I get my tiny watering dance. Come say hi?',sunlight:'Psst, pick one ingredient swap. I saved us a sunbeam.',dance:'A little movement? I will do the leaf dance with you.',vitamin:'One label to explore? My detective leaves are ready.',bloom:'Fancy finishing a recipe? I brought the tiny flowers.',cheer:'One little check-in? Your sunny spot is waiting.'},de:{water:'Ein Essenseintrag und ich tanze im Regen. Kommst du kurz vorbei?',sunlight:'Psst, ein Zutatentausch? Unser Sonnenplatz ist frei.',dance:'Ein bisschen Bewegung? Ich tanze mit meinen Blättern mit.',vitamin:'Ein Etikett entdecken? Meine Detektivblätter sind bereit.',bloom:'Ein Rezept fertig kochen? Die Blümchen sind schon bereit.',cheer:'Ein kleiner Check-in? Dein Sonnenplatz wartet.'},es:{water:'¿Registras una comida? Mi baile bajo la lluvia está listo.',sunlight:'¿Un cambio de ingredientes? Nos guardé un rayo de sol.',dance:'¿Un poco de movimiento? Bailaré contigo.',vitamin:'¿Exploramos una etiqueta? Mis hojas detectives están listas.',bloom:'¿Terminas una receta? Traje las florecitas.',cheer:'¿Un pequeño registro? Tu rincón soleado te espera.'}};
 const prefix=lang==='en'?(sign==='Aries'?'Let us go! ':sign==='Pisces'?'A tiny daydream: ':''):'';return prefix+(msg[lang]||msg.en)[action];}
const api={model,profile,recentXP,latestHealthy,nextLine,lines,wiltLines,ZODIAC,MBTI,LOOKS,CONSTELLATIONS,COSMETICS,period,careKind,need,tapReaction,unlocked,nextUnlock,cosmeticAllowed,reminderWindow,reminder};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiHerbTamagotchiCore=api;
})(typeof window!=='undefined'?window:globalThis);

