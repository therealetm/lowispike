'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../herb-tamagotchi-core.js'),K=require('../herb-core.js'),fs=require('node:fs'),vm=require('node:vm');
const now=new Date(2026,9,14,12).getTime(),fresh=xp=>({xp,ledger:[],logs:[],user:{bday:'1994-03-09',mbti:'INFP'}});
test('six thresholds remain exact and a large XP jump retains only the highest form',()=>{
 assert.deepEqual([0,100,300,700,1500,3000].map(x=>T.model(fresh(x),{createdAt:now},now).index),[0,1,2,3,4,5]);
 assert.equal(T.model(fresh(95),{createdAt:now},now).index,0);assert.equal(T.model(fresh(100),{createdAt:now},now).index,1);
 assert.equal(T.model(fresh(0),{highestStage:5,createdAt:now},now).index,5);
});
test('all twelve signs have distinct palettes, constellation shapes and name ideas',()=>{
 const ps=T.ZODIAC.map(s=>T.profile({}, {starSign:s[0]}));
 assert.equal(new Set(ps.map(p=>p.palette.a+p.palette.b)).size,12);assert.equal(new Set(ps.map(p=>JSON.stringify(p.constellation))).size,12);
 assert.deepEqual(T.profile({}, {starSign:'Pisces'}).names,['Misty','Bubbles','Nori']);
});
test('night, sunrise, midday and cozy evening change mood and voice',()=>{
 const m=h=>T.model(fresh(95),{createdAt:now-1000},new Date(2026,9,14,h).getTime());
 assert.equal(m(7).period,'morning');assert.equal(m(12).period,'day');assert.equal(m(19).period,'evening');assert.equal(m(23).mood,'sleepy');
 assert.match(T.nextLine('home',[],{model:m(23)}),/Goodnight|After eleven|Night/i);
 assert.notEqual(T.nextLine('home',[],{model:m(7)}),T.nextLine('home',[],{model:m(12)}));
});
test('six tap expressions and rapid tapping dizziness are available without XP',()=>{
 const seen=[1,2,3,4,5,6].map(c=>T.tapReaction(c,[],now));assert.equal(new Set(seen).size,6);
 assert.equal(T.tapReaction(8,Array.from({length:8},(_,i)=>now-i*100),now),'dizzy');
 assert.equal(T.tapReaction(8,[now-2000],now),'wave');
});
test('every completed care action maps to its own animation',()=>{
 assert.deepEqual(['Meal logged','Swap chosen','Move session','Product scanned','Recipe finished'].map(label=>T.careKind({label})),['water','sunlight','dance','vitamin','bloom']);
});
test('wilting is gentle and one completed action restores the glow with no XP deduction',()=>{
 const s=fresh(700),p={createdAt:now-49*3600000};assert.equal(T.model(s,p,now).dim,true);
 s.ledger.push({ts:now,amt:5,label:'Product scanned',src:'herb-care:vitamin'});assert.equal(T.model(s,p,now).dim,false);assert.equal(s.xp,700);
 const original=JSON.stringify(s);T.model(s,p,now);assert.equal(JSON.stringify(s),original);
});
test('needs follow completed actions and do not ask for an already logged meal first',()=>{
 const s=fresh(700);assert.equal(T.model(s,{createdAt:now},now).need,'water');s.logs.push({ts:now});assert.equal(T.model(s,{createdAt:now},now).need,'sunlight');
 s.ledger.push({ts:now,amt:10,label:'Swap chosen'});assert.equal(T.model(s,{createdAt:now},now).need,'dance');
});
test('voice does not repeat across pages, moods, time periods and reactions',()=>{
 const used=[],m=T.model(fresh(95),{createdAt:now},now);
 for(let round=0;round<8;round++)for(const page of ['home','foryou','scan','shelf','move','profile'])for(const moment of [undefined,'tap','water','sunlight','dance','vitamin','bloom','cheer','evolution']){
  const x=T.nextLine(page,used,{model:m,moment});if(x){assert(!used.includes(x));used.push(x);}
 }
 assert(used.length>=60);
 assert(T.nextLine('home',[],{model:{...m,profile:T.profile({}, {starSign:'Aries'})}}).length<100);
 assert.doesNotMatch(T.nextLine('home',[],{model:m}),/Floating in our little sunbeam/);
});
test('cosmetic locks use earned XP and do not change the score',()=>{
 assert.equal(T.cosmeticAllowed('glass',95),false);assert.equal(T.cosmeticAllowed('glass',100),true);assert.equal(T.cosmeticAllowed('crown',699),false);
 assert.equal(T.nextUnlock(100).id,'daisy');assert.equal(T.unlocked(3000).length,14);assert.equal(K.stage(100).xp,100);
});
test('reminders are capped per local day, reject night and honor the local timezone',()=>{
 const t=h=>Date.UTC(2026,9,14,h);
 assert.equal(T.reminderWindow(t(5),'Europe/Berlin').allowed,false);assert.equal(T.reminderWindow(t(6),'Europe/Berlin').allowed,true);
 const morning=T.reminderWindow(t(6),'Europe/Berlin');assert.equal(T.reminderWindow(t(12),'Europe/Berlin',morning.day).allowed,false);
 assert.equal(T.reminderWindow(t(19),'Europe/Berlin').allowed,false);assert.equal(T.reminderWindow(t(23),'Europe/Berlin').allowed,false);
 assert.equal(T.reminderWindow(t(6),'Not/AZone').allowed,false);
 assert.match(T.reminder({lang:'en',sign:'Pisces',need:'water'}),/meal log/);
});
test('UI, service worker and fixture scripts parse without external libraries',()=>{
 for(const f of ['herb-config.js','herb-core.js','herb-tamagotchi-core.js','herb-tamagotchi.js','tests/herb-fixture.js','sw.js'])new vm.Script(fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8'));
});
