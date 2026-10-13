'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const K=require('../herb-core.js'),B=require('../body-core.js'),C=require('../herb-config.js');
const now=new Date('2026-10-13T12:00:00Z').getTime(),H=3600000,DAY=24*H;
const fresh=()=>({xp:95,ledger:[],logs:[],saved:[{n:'Keep my swap'}],health:{weight:'107'},user:{name:'Tester',bday:'1994-03-12'}});
for(const [xp,index] of [[0,0],[99,0],[100,1],[299,1],[300,2],[699,2],[700,3],[1499,3],[1500,4],[2999,4],[3000,5],[100000,5]])assert.equal(K.stage(xp).index,index);
assert.equal(K.stage(4000).next,null);assert.equal(K.stage(-1).xp,0);assert.equal(K.stage(120,4).index,4);assert.equal(K.stage(120,4).left,2880);
let s=fresh();let g=K.sync(s,now);assert.equal(g.index,0);assert.equal(g.dim,false);assert.equal(s.xp,95);
s.xp=3200;g=K.sync(s,now);assert.equal(g.index,5);assert(g.evolved);assert.equal(s.xp,3200);s.xp=500;assert.equal(K.sync(s,now).index,5);assert.equal(s.xp,500);
s=fresh();s.ledger=[{amt:15,ts:now-4*DAY,label:'Meal checked'}];s.xp=700;assert(K.sync(s,now).dim);s.logs.push({id:'recent',ts:now-1000,t:'A meal'});assert(!K.sync(s,now).dim);assert.equal(s.xp,700);assert.equal(s.herb.stageIndex,3);
assert.equal(K.flavor({}).palette.suggestion,'Minti');assert.equal(K.flavor({bday:'invalid',mbti:'???'}).mbti,'');assert.equal(K.zodiac('2026-02-30'),null);
assert.equal(K.flavor({bday:'1994-03-12',mbti:'INTJ'}).zodiac.element,'water');assert.equal(K.flavor({bday:'1994-03-12',mbti:'INTJ'},false).zodiac,null);
assert(K.hasReward([{eventId:'one'}],'one'));assert(!K.hasReward([{eventId:'one'}],'two'));
s=fresh();B.ensure(s);assert(s.health.body);assert(!s.body);const xp=s.xp;
assert.equal(B.summary(s,{},now).hunger,null);assert.equal(B.summary(s,{},now).energy,null);assert.equal(B.summary(s,{},now).bmi,null);
s.health.heightCm=180;assert.equal(B.bmi(s,now),33);s.user.bday='2010-03-12';assert.equal(B.bmi(s,now),null);s.user.bday='1994-03-12';
assert.throws(()=>B.sleep(s,{bed:now,wake:now-H},now));assert.throws(()=>B.sleep(s,{bed:now,wake:now+H},now));
B.sleep(s,{bed:now-12*H,wake:now-4*H},now);B.sleep(s,{bed:now-12*H,wake:now-4*H},now);assert.equal(s.health.body.sleep.length,1);assert.equal(B.summary(s,{},now).sleepHours,8);
B.trackWeight(s,now);assert.equal(s.health.body.weights.length,0);s.health.weight='106';B.trackWeight(s,now);B.trackWeight(s,now);assert.equal(s.health.body.weights.length,1);
s.logs.push({id:'current',ts:now-H,t:'Chicken fried rice',day:B.day(now),r:'ja'});
const input={energy:2,hungry:true,sleepy:true,ts:now};B.observe(s,{},input,now);B.observe(s,{},input,now);assert.equal(s.health.body.observations.length,1);assert.equal(s.xp,xp);assert.equal(B.summary(s,{},now).hunger,null);
assert.throws(()=>B.observe(s,{}, {energy:8},now));assert.throws(()=>B.observe(s,{}, {energy:3,ts:now+H},now));assert.throws(()=>B.observe(s,{}, {},now));
// One meal/day, many repeated reports still contributes one timing sample.
s=fresh();for(let day=1;day<=3;day++){
  const at=now-day*DAY-H;s.logs.push({id:'meal'+day,ts:at,t:'Chicken fried rice',day:B.day(at)});
  for(let minutes=100;minutes<=110;minutes+=5)B.observe(s,{}, {energy:2,hungry:true,ts:at+minutes*60000},now);
}
s.logs.push({id:'current',ts:now-H,t:'Chicken fried rice',day:B.day(now)});let q=B.summary(s,{},now);
assert.equal(q.hunger.n,3);assert.equal(q.dip.n,3);assert(q.hunger.from>=now-H);assert(q.hunger.to>q.hunger.from);
assert.equal(q.insights[0].n,3);assert.equal(q.insights[0].energy,2);assert.equal(q.insights[0].moved,false);
assert.equal(B.summary(s,{sessions:[{ts:now-20*60000,moved:600}]},now).hunger,null); // different activity context
s.logs[s.logs.length-1].t='A different meal';assert.equal(B.summary(s,{},now).hunger,null);
s=fresh();const same=now-2*DAY; s.logs.push({id:'same',ts:same,t:'Same meal'});for(let i=0;i<5;i++)B.observe(s,{}, {hungry:true,ts:same+(90+i)*60000},now);s.logs.push({id:'current',ts:now-H,t:'Same meal'});assert.equal(B.summary(s,{},now).hunger,null);
// Independent wake days; timestamps, rather than astrology or a food rating, drive sleep windows.
s=fresh();for(let d=1;d<=3;d++){const wake=now-d*DAY-4*H;B.sleep(s,{bed:wake-8*H,wake},now);B.observe(s,{}, {sleepy:true,ts:wake+12*H},now);}B.sleep(s,{bed:now-12*H,wake:now-4*H},now);assert.equal(B.summary(s,{},now).sleepy.n,3);
s.logs.push({id:'undated',ts:null,day:B.day(now),t:'Previously ticked meal'});q=B.summary(s,{steps:{[B.day(now)]:2345},sessions:[{ts:now-H,moved:300,name:'Walk'}]},now);assert.equal(q.steps,2345);assert.equal(q.movementMins,5);assert(q.events.some(x=>x.id==='undated'&&x.ts===null));assert.equal(q.meal,null);
s=JSON.parse(JSON.stringify(s));assert.equal(B.summary(s,{},now).sleepy.n,3);assert.equal(s.xp,95);assert.equal(s.saved[0].n,'Keep my swap');
// Exercise the actual app award, meal-log and bridge functions, including a refresh/replay.
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),ctx={console,Date,Set,CustomEvent:function(n){this.type=n;},setTimeout:()=>0,window:{dispatchEvent(){}},S:fresh(),TAB:'home',ICO:{x:'',chk:''},persisted:'',questDone:()=>{},renderAll:()=>{},renderProfile:()=>{},closeSheet:()=>{},resizeImage:()=>{},today:()=>B.day(Date.now()),uid:()=> 'meal-one',levelOf:()=>({L:1}),toast:()=>{},$$:()=>[],$:()=>({classList:{remove(){}}}),save(){ctx.persisted=JSON.stringify(ctx.S);},recById:id=>({id,n:'Planned eggs',r:'ja',e:'🥚'}),CUR:{title:'Eggs',lvl:'low',r:'ja',emoji:'🥚'}};
vm.createContext(ctx);ctx.window=ctx;ctx.dispatchEvent=()=>{};for(const f of ['herb-config.js','herb-core.js','body-core.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const start=html.indexOf('function award(amt'),end=html.indexOf('/* Zodiac from birthday */',start);vm.runInContext(html.slice(start,end),ctx);
const hostStart=html.indexOf('window.LowiHost = {'),hostEnd=html.indexOf('\n};',hostStart)+3;vm.runInContext(html.slice(hostStart,hostEnd),ctx);
const bridge=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('window.LowiVitalsBridge ='));vm.runInContext(bridge[1],ctx);ctx.LowiVitalsBridge.initialize();
assert.equal(ctx.S.xp,95);ctx.LowiHost.award('move:session',null,{amt:10,perDay:3,eventId:'session-one',label:'Move session'});assert.equal(ctx.S.xp,105);
ctx.LowiHost.award('move:session',null,{amt:10,perDay:3,eventId:'session-one',label:'Move session'});assert.equal(ctx.S.xp,105);ctx.S=JSON.parse(ctx.persisted);ctx.LowiHost.award('move:session',null,{amt:10,perDay:3,eventId:'session-one',label:'Move session'});assert.equal(ctx.S.xp,105);
const mealStart=html.indexOf('function logDone()'),mealEnd=html.indexOf('function toggleTrig()',mealStart);vm.runInContext(html.slice(mealStart,mealEnd),ctx);ctx.logDone();ctx.logDone();assert.equal(ctx.S.logs.length,1);assert.equal(ctx.S.xp,120);
ctx.S.td={day:ctx.today(),plan:['rb_eggs'],ate:{}};ctx.LowiVitalsBridge.planMeal(0,true);ctx.LowiVitalsBridge.planMeal(0,true);assert.equal(ctx.S.logs.length,2);assert.equal(ctx.S.xp,135);ctx.LowiVitalsBridge.planMeal(0,false);ctx.LowiVitalsBridge.planMeal(0,true);assert.equal(ctx.S.xp,135);assert.equal(ctx.S.herb.stageIndex,1);
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(!/src=|application\//i.test(m[1]))new vm.Script(m[2]);}
for(const f of ['herb-config.js','herb-core.js','body-core.js','body-companion.js','sw.js'])new vm.Script(fs.readFileSync(path.join(root,f),'utf8'));
console.log('Herb/body focused checks passed: six thresholds, multi-stage evolution, no XP loss or stage regression, cosmetic defaults, dim/recovery, private health persistence, independent observation windows, unknown timestamps, sleep/weight/BMI, native meal/plan rewards and duplicate-event replay across refresh.');
