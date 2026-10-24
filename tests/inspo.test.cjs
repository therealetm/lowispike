'use strict';
// Nibblo, the For You food bot (inspo-core.js / foryou.js). 24 Oct 2026: the bot lives in For You only.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const I=require('../inspo-core.js');
const SP=require('../store-picks-core.js');
const B=require('../companion-birth-core.js');

function at(y,m,d,h,mi){return new Date(y,m-1,d,h,mi||0,0,0).getTime();}

test('name is Nibblo everywhere, the same in every language, with a Bot tag',()=>{
  assert.equal(I.NAME,'Nibblo');
  for(const l of I.LANGS){const c=I.card({lang:l,now:at(2026,10,24,12)});assert.equal(c.by,'Nibblo');assert.equal(c.label.bot,'Bot');assert.match(c.label.aria,/Nibblo/);}
  for(const f of ['inspo-core.js','foryou.js','foryou-core.js','foryou.css']){
    const s=read(f);
    assert.doesNotMatch(s,/Gusto/,f+' must not use the old name');
    assert.doesNotMatch(s.replace(/"Sprouty" clashed[^\n]*/,''),/Sprouty/,f+' must not use Sprouty');
    assert.doesNotMatch(s,/Misty/,f+' must not call the companion Misty');
  }
});

test('Nibblo does not clash with any companion name the app can hand out',()=>{
  const pools=[].concat(...Object.values(B.NAMES),B.FRIENDLY,B.MORE_NAMES).map(n=>n.toLowerCase());
  const me=I.NAME.toLowerCase();
  const lev=(a,b)=>{const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t;}}return d[b.length];};
  for(const n of pools){
    assert.ok(!me.startsWith(n)&&!n.startsWith(me),'prefix clash with companion name '+n);
    assert.ok(lev(me,n)>2,'too close to companion name '+n);
  }
  assert.ok(lev('sprouty','sprout')<=2,'the clash check would have caught Sprouty');
  // "Sprouty" was rejected because "Sprout" is a default companion name.
  assert.ok(B.FRIENDLY.includes('Sprout'));
});

test('one card a day, dated 07:00, flipping at 07:00 and not at midnight',()=>{
  const a=I.card({now:at(2026,10,24,6,59)}),b=I.card({now:at(2026,10,24,7,0)}),c=I.card({now:at(2026,10,24,23,59)}),d=I.card({now:at(2026,10,25,3,0)});
  assert.equal(a.day,'2026-10-23');assert.equal(b.day,'2026-10-24');assert.equal(c.id,b.id);assert.equal(d.day,'2026-10-24');
  assert.equal(new Date(b.ts).getHours(),7);
});

test('day numbers stay continuous across the 25 October clock change',()=>{
  const n=['2026-10-24','2026-10-25','2026-10-26','2026-03-29','2026-03-30'].map(I.dayNum);
  assert.equal(n[1]-n[0],1);assert.equal(n[2]-n[1],1);assert.equal(n[4]-n[3],1);
});

test('swaps walk the whole library before repeating; Gold Rush only every other day',()=>{
  const seen=new Set();const gold=new Set();let goldDays=0;
  for(let i=0;i<I.SWAPS.length;i++){const k=new Date(2026,0,1+i);const key=k.getFullYear()+'-'+String(k.getMonth()+1).padStart(2,'0')+'-'+String(k.getDate()).padStart(2,'0');seen.add(I.swapFor(key).k);}
  assert.equal(seen.size,I.SWAPS.length);
  for(let i=0;i<I.GOLD.length*2;i++){const k=new Date(2026,0,1+i);const key=k.getFullYear()+'-'+String(k.getMonth()+1).padStart(2,'0')+'-'+String(k.getDate()).padStart(2,'0');const g=I.goldFor(key);if(g){goldDays++;gold.add(g.g);}}
  assert.equal(goldDays,I.GOLD.length);assert.equal(gold.size,I.GOLD.length);
  for(let i=0;i<10;i++){const k=new Date(2026,9,20+i);const key=k.getFullYear()+'-'+String(k.getMonth()+1).padStart(2,'0')+'-'+String(k.getDate()).padStart(2,'0');const k2=new Date(2026,9,21+i);const key2=k2.getFullYear()+'-'+String(k2.getMonth()+1).padStart(2,'0')+'-'+String(k2.getDate()).padStart(2,'0');assert.notEqual(!!I.goldFor(key),!!I.goldFor(key2));}
});

test('every swap points at a real Recipe Book recipe with the app\'s own names and emoji',()=>{
  const html=read('index.html');
  for(const s of I.SWAPS){
    assert.ok(html.includes('n:"'+s.r+'", e:"'+s.e+'"'),'recipe '+s.r+' with '+s.e);
    assert.equal(s.to[0],s.r);
    assert.ok(html.includes(JSON.stringify(s.to)),'translations for '+s.r);
    for(const arr of [s.from,s.to,s.why])assert.equal(arr.length,3);
  }
});

test('every Gold Rush product matches the Shop data and the app\'s own Shop rating',()=>{
  const cache={};
  for(const g of I.GOLD){
    const d=cache[g.chain]||(cache[g.chain]=JSON.parse(read('data/shop/'+g.chain+'.json')));
    const p=SP.rows(d).find(r=>r.g===g.g);
    assert.ok(p,'product '+g.g+' at '+g.chain);
    assert.equal(d.name,g.store);
    for(const k of ['c','s','p'])assert.equal(Number(p[k]||0),g[k],g.n+' '+k);
    const r=SP.rate(p);
    assert.ok(r.pass&&r.best&&!r.sweetened,g.n+' must be a pass + best, not sweetened');
    assert.equal(SP.photo(p,200),g.photo);
    assert.ok(I.WHY[g.cat],'why text for '+g.cat);
    assert.doesNotMatch(g.n,/schoko|chocolate|wurst|schwein|speck|bacon/i);
  }
});

test('cards are complete in English, German and Spanish, with no leftover placeholders',()=>{
  for(const l of I.LANGS)for(let i=0;i<40;i++){
    const c=I.card({lang:l,now:at(2026,10,1+i%28,12)+Math.floor(i/28)*86400000*28});
    const txt=JSON.stringify(c);
    assert.doesNotMatch(txt,/\{[a-z]\}/,'placeholder left in '+l);
    assert.ok(c.intro&&c.swap.from&&c.swap.to&&c.swap.why);
    if(c.gold){assert.match(c.gold.nums,/100 g/);assert.ok(c.gold.why&&c.gold.src);if(l!=='en')assert.doesNotMatch(c.gold.nums,/\d\.\d/);}
  }
});


test('no poll, no push, no server post: the slides are built on the phone',()=>{
  const js=read('foryou.js')+read('inspo-core.js');
  assert.doesNotMatch(read('inspo-core.js'),/fetch\(|\.insert\(|\.channel\(|Notification|showNotification|\.send\(|publish/);
  assert.doesNotMatch(js,/showNotification|new Notification/);
  assert.doesNotMatch(read('foryou.js').slice(read('foryou.js').indexOf('function slideHTML'),read('foryou.js').indexOf('function fromCommunityShare')),/data-tr="(like|comment|post-menu)"|data-r5="profile"/,'no like, chat, menu or profile on the bot slide');
});

test('the bot only reaches For You: not in Chat, not in People, not in the companion directory',()=>{
  for(const f of ['community-chat.js','community-rooms-ui.js','community-room.js','people.js','people-core.js'].filter(f=>fs.existsSync(path.join(ROOT,f)))){
    const s=read(f);
    assert.doesNotMatch(s,/Nibblo|LowiInspo|inspoLines|inspoCard|lowi-inspo-bot/,f+' must not carry the bot');
  }
  assert.ok(!fs.existsSync(path.join(ROOT,'inspo.js')),'the old chat card renderer is gone');
  const html=read('index.html');
  assert.doesNotMatch(html,/inspo\.css|inspo\.js\?v=/);
  assert.match(html,/if \(p\.bot && window\.LowiForYou\) return LowiForYou\.slideHTML\(p,/);
  assert.match(html,/function feed\(\)\{ const all = feedAll\(\); return window\.LowiForYou \? LowiForYou\.feed\(all\)/);
});

test('For You shows today\'s slide and the four before it, newest first, each a different recipe with a photo',()=>{
  const html=read('index.html');
  const i=html.indexOf('const FOOD_IMG = ');const j=html.indexOf('};',i);const img=JSON.parse(html.slice(i+17,j+1));
  for(const now of [at(2026,10,24,13,55),at(2026,10,25,6,30),at(2026,12,31,23,0)]){
    const f=I.feed({now,lang:'de'});
    assert.equal(f.length,5);
    for(let k=1;k<f.length;k++)assert.ok(f[k-1].ts>f[k].ts,'newest first');
    assert.equal(new Set(f.map(p=>p.rec)).size,5,'five different recipes');
    assert.equal(new Set(f.map(p=>p.id)).size,5);
    for(const p of f){assert.equal(p.bot,true);assert.equal(p.who,'Nibblo');assert.ok(p.ts<=now+3600000);}
  }
  for(const s of I.SWAPS){
    const id=I.bookId(s.r);
    const file=I.fileImg(id);
    assert.ok(img[id]||file,'photo for '+s.r);
    if(file){assert.ok(fs.existsSync(path.join(ROOT,file)),file);assert.ok(fs.statSync(path.join(ROOT,file)).size<120000,file+' stays small');}
  }
});
