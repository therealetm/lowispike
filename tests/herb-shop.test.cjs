'use strict';
// Herb shop (Oct 15): seasonal drops, 8-hour shelf, one free gift a day, ownership in the wardrobe core, honest pay-what-you-want preview.
process.env.TZ='Europe/Berlin';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const T=require('../herb-tamagotchi-core.js'),K=require('../herb-shop-core.js');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
T.registerExtras(K.SEASONAL);
const at=s=>new Date(s).getTime();

test('seasonal pieces stay known for old saves, but nothing can be worn any more (Oct 15)',()=>{
 T.setOwned(['maple','mistscarf','acorn']);
 assert.ok(T.cosmetic('maple'),'seasonal piece is still known, so old saves parse');
 assert.equal(T.owns('maple',0),true,'what he had stays his in the data');
 assert.equal(T.toggleEquip({},'maple',0),null);
 assert.deepEqual(T.cleanEquipment({hat:'maple',neck:'mistscarf',pot:'acorn'},0),T.BASE_EQUIPMENT);
 T.setOwned([]);
});

test('shop UI (Oct 15): no shelf, no outfit gift, one small daily gift spot with a fact and no XP, Ko-fi stays reachable',()=>{
 const s=src('herb-shop.js'),css=src('herb-shop.css');
 assert.match(s,/function entryHTML\(\)\{return'';\}/,'no shop entry button anywhere');
 assert.ok(s.includes("V.view='plus'"),'opening always shows the voluntary support view');
 assert.ok(s.includes("lowispike.gift.v1")&&s.includes("data-shop','gift'"),'one gift spot');
 assert.ok(!/addXP|awardXP|LowiXP/.test(s.slice(s.indexOf('Kometa\'s daily gift'))),'the gift gives no XP');
 assert.ok(s.includes("open('plus')"),'Ko-fi door inside the gift card');
 assert.ok(/#whHud > \.hs-gift \{[^}]*width: 44px/.test(css),'small spot');
 assert.ok(/prefers-reduced-motion[^}]*hs-gift-core/.test(css));
});

test('drop windows: autumn runs in October, winter wraps over new year, spring shows the next drop',()=>{
 const oct=K.activeDrop(at('2026-10-15T01:00:00+02:00'));assert.equal(oct.drop.id,'autumn');
 assert.equal(new Date(oct.end).getMonth(),11,'autumn ends at the start of 1 Dec');
 assert.equal(K.activeDrop(at('2027-01-10T12:00:00+01:00')).drop.id,'winter');
 assert.equal(K.activeDrop(at('2026-12-31T23:00:00+01:00')).drop.id,'winter');
 assert.equal(K.activeDrop(at('2026-05-01T12:00:00+02:00')),null);
 const nx=K.nextDrop(at('2026-05-01T12:00:00+02:00'));assert.equal(nx.drop.id,'autumn');assert.equal(new Date(nx.start).getDate(),22);
});

test('shelf: 4 pieces, new picks every 8 hours, stable inside a window, none owned, at most one premium',()=>{
 T.setOwned([]);const st=K.blank(),t=at('2026-10-15T09:00:00+02:00');
 const a=K.shelf(T,st,t,300,'u1'),b=K.shelf(T,st,t+3*36e5,300,'u1'),c=K.shelf(T,st,t+8*36e5,300,'u1');
 assert.equal(a.items.length,4);assert.deepEqual(a.items.map(x=>x.id),b.items.map(x=>x.id),'same window, same shelf');
 assert.equal(new Date(a.next).getHours(),16);assert.notEqual(a.key,c.key);
 assert.ok(a.items.filter(x=>x.premium).length<=1);assert.ok(a.items.some(x=>x.season==='autumn'),'a drop piece is on the shelf while the drop runs');
 for(const x of a.items)assert.ok(x.premium||!T.owns(x.id,300),'nothing you already own: '+x.id);
 const late=K.shelfWindow(at('2026-10-15T20:00:00+02:00'));assert.equal(new Date(late.next).getDate(),16);assert.equal(new Date(late.next).getHours(),0);
});

test('one free gift per day: claim once, it is yours for good, tomorrow brings another',()=>{
 T.setOwned([]);let st=K.blank();const d1=at('2026-10-15T10:00:00+02:00');
 const offer=K.freeOffer(T,st,d1,0,'u1');assert.ok(offer&&!offer.premium);
 assert.equal(K.freeOffer(T,st,d1+5*36e5,0,'u1').id,offer.id,'same offer all day');
 st=K.claimFree(T,st,d1,0,'u1');assert.ok(st.owned.includes(offer.id));assert.equal(K.claimFree(T,st,d1+36e5,0,'u1'),null,'only one per day');
 T.setOwned(st.owned);assert.equal(T.owns(offer.id,0),true);
 const d2=d1+864e5,o2=K.freeOffer(T,st,d2,0,'u1');assert.ok(o2&&o2.id!==offer.id);
 const st2=K.claimFree(T,st,d2,0,'u1');assert.equal(st2.owned.length,2);T.setOwned([]);
});

test('seasonal claim needs a running drop and enough XP; XP is never spent',()=>{
 T.setOwned([]);const st=K.blank(),oct=at('2026-10-20T12:00:00+02:00');
 assert.equal(K.claim(T,st,'maple',oct,100),null,'not enough XP yet');
 const n=K.claim(T,st,'maple',oct,250);assert.deepEqual(n.owned,['maple']);
 assert.equal(K.claim(T,n,'maple',oct,250),null,'already yours');
 assert.equal(K.claim(T,st,'maple',at('2026-06-01T12:00:00+02:00'),9999),null,'outside the drop');
 assert.equal(K.claim(T,st,'snowclip',oct,9999),null,'other season');
 assert.equal(K.claim(T,st,'tidal',oct,1e9),null,'premium never');
 assert.ok(!/xp\s*-=|spend/i.test(src('herb-shop-core.js').replace(/never spent|XP is never spent|nunca se gastan|nie ausgegeben/g,'')),'no XP spending code');
});

test('state cleaning drops junk and keeps known fields',()=>{
 const s=K.clean({owned:['maple','maple','<x>',5],free:{day:'2026-10-15',id:'bow'},pwyw:999,remind:false});
 assert.deepEqual(s.owned,['maple']);assert.equal(s.free.id,'bow');assert.equal(s.pwyw,5);assert.equal(s.remind,false);
 assert.deepEqual(K.clean(null),K.blank());assert.equal(K.SKEY.indexOf('lowispike.'),0,'backed up with the account');
});

test('pay what you want: 0 is a real option, perks grow with the amount, trial timeline and reminder are honest',()=>{
 assert.equal(K.PWYW.amounts[0],0);
 assert.deepEqual(K.perks(0).map(p=>p.on),[true,false,false,false,false]);
 assert.deepEqual(K.perks(5).map(p=>p.on),[true,true,true,false,false]);
 const s=at('2026-10-15T10:00:00+02:00');
 assert.deepEqual(K.timeline(5,s,true).map(x=>[x.day,x.kind]),[[0,'start'],[5,'remind'],[7,'charge']]);
 assert.deepEqual(K.timeline(0,s,true).map(x=>x.kind),['start','free'],'nothing is charged at 0');
 assert.deepEqual(K.timeline(8,s,false).map(x=>x.kind),['start','charge']);
});

test('calm time labels instead of ticking countdowns',()=>{
 const now=at('2026-10-15T09:00:00+02:00');
 assert.match(K.when(at('2026-10-15T16:00:00+02:00'),now,1),/^um 16:00/);
 assert.equal(K.when(at('2026-10-16T00:00:00+02:00'),now,1),'morgen');
 assert.match(K.when(at('2026-11-30T23:00:00+01:00'),now,0),/^on 30 Nov/);
 assert.equal(typeof K.left,'undefined');
});

test('art: every seasonal piece draws a layer',()=>{
 for(const c of K.SEASONAL){const fn=K.ART[c.kind];assert.ok(fn,c.kind);const out=c.kind==='pot'?fn(c.id):fn(c.id,180,40);assert.match(out,/<g /,c.id);}
 assert.equal(K.ART.hat('nope',180,40),'');
});

test('wiring + honesty: loader, offline list, wardrobe entry, no urgency, no fake prices, nothing charged',()=>{
 const ui=src('herb-shop.js'),core=src('herb-shop-core.js'),css=src('herb-shop.css');
 assert.match(src('apple-ui.js'),/'herb-tamagotchi-core\.js','herb-shop-core\.js'/);assert.match(src('apple-ui.js'),/'spirit\.js','herb-shop\.js'/);
 for(const f of['herb-shop-core.js','herb-shop.js','herb-shop.css'])assert.ok(src('sw.js').split(f).length>=3,'sw lists '+f);
 assert.match(src('spirit.js'),/LowiHerbShop \? LowiHerbShop\.entryHTML\(\)/);
 assert.match(src('herb-tamagotchi.js'),/LowiShopArt\.hat\(id,y,r\)/);
 const all=ui+core;
 assert.ok(!/one[- ]time offer|einmaliges angebot|expires when|<s>|<del>|line-through|% off|rabatt\s*-?\d|\d+\s*%\s*(off|rabatt)/i.test(all+css),'no urgency, no struck prices');
 assert.ok(!/fetch\(|stripe|checkout|paymentrequest/i.test(ui),'no payment wiring');
 assert.match(ui,/target="_blank" rel="noopener" data-shop="kofi"/);assert.match(ui,/es wird nichts berechnet/);assert.match(ui,/Unterstützen schaltet nichts frei/);
 assert.ok(!/sad|traurig|vermisst dich|misses you|will wilt/i.test(all),'no emotional pressure from the herb');
 assert.match(css,/prefers-reduced-motion:reduce/);
});
