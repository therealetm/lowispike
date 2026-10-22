const assert=require('assert');
const C=require('../herb-config.js');
const K=require('../herb-core.js');
const T=require('../herb-tamagotchi-core.js');
const now=Date.now();
const base=(xp=0)=>({xp,ledger:[],logs:[],user:{}});
assert.deepEqual(C.stages.map(x=>x.xp),[0,100,300,700,1500,3000,5000,7500,10500,14000,17500,21200,25100,29200,33500,38000,42700,47600,52700,58000,63500,69200,75100,81200,87500]);
let m=T.model(base(0),{createdAt:now},now);assert.equal(m.index,0);assert.equal(m.current.id,'seedling');assert.equal(m.profile.sign,null);
m=T.model(base(100),{createdAt:now},now);assert.equal(m.index,1);assert.equal(m.current.id,'sprout');
m=T.model(base(3000),{createdAt:now},now);assert.equal(m.index,5);assert.equal(m.current.id,'legendary');
m=T.model(base(50),{createdAt:now,highestStage:5},now);assert.equal(m.index,5,'unlocked stage never regresses');
const old=base(700);old.ledger.push({ts:now-49*3600000,amt:10,src:'meal',label:'Logged meal'});m=T.model(old,{createdAt:now-7*86400000},now);assert.equal(m.dim,true,'49h inactive wilts');old.ledger.push({ts:now,amt:10,src:'move',label:'Walk'});m=T.model(old,{createdAt:now-7*86400000},now);assert.equal(m.dim,false,'one healthy action restores glow');
const z=T.profile({bday:'1990-08-05'},{starSign:'',personality:''});assert.equal(z.sign.name,'Leo');assert.ok(z.palette.a);
const explicit=T.profile({}, {starSign:'Virgo',personality:'INTJ'});assert.equal(explicit.sign.name,'Virgo');assert.equal(explicit.personality,'INTJ');
const used=[],first=[];for(const page of ['home','foryou','scan','shelf','move','profile']){const x=T.nextLine(page,used,{dim:false});assert.ok(x);assert.ok(!used.includes(x));used.push(x);first.push(x);}assert.equal(new Set(first).size,6,'each page has a different first line');
for(let i=0;i<6;i++){const x=T.nextLine('scan',used,{dim:false});if(x){assert.ok(!used.includes(x));used.push(x);}}
const rec=base(100);rec.ledger.push({ts:now,amt:20,src:'quest',label:'Daily quest'});m=T.model(rec,{createdAt:now},now);assert.equal(m.recent[0].label,'Daily quest');assert.equal(m.recent[0].amt,20);
console.log('herb-tamagotchi core tests passed');
