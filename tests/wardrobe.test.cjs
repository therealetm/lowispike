'use strict';
// Herb wardrobe (Oct 14): earned-only equipment, preview of locked/premium items, persistence via the backed-up lowispike.* key.
const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../herb-tamagotchi-core.js'),fs=require('node:fs'),path=require('node:path');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('catalog is sorted by XP, every item has three names and a known slot',()=>{
 const xs=T.COSMETICS.map(c=>c.xp);assert.deepEqual(xs,[...xs].sort((a,b)=>a-b));
 const kinds=new Set(T.SLOTS.map(s=>s.kind));
 for(const c of T.COSMETICS.concat(T.PREMIUM)){assert.ok(kinds.has(c.kind),c.id);assert.equal(c.names.length,3,c.id);c.names.forEach(n=>assert.ok(n&&n.length>2,c.id));}
 assert.equal(new Set(T.COSMETICS.concat(T.PREMIUM).map(c=>c.id)).size,T.COSMETICS.length+T.PREMIUM.length);
 for(const s of T.SLOTS)assert.ok(T.COSMETICS.some(c=>c.kind===s.kind),'every slot has an earnable item: '+s.kind);
});

test('dress-up is retired (Oct 15): every saved outfit cleans to the plain look, the free pot stays',()=>{
 assert.equal(T.DRESSUP_RETIRED,true);
 assert.deepEqual(T.cleanEquipment(null,0),T.BASE_EQUIPMENT);
 assert.deepEqual(T.cleanEquipment({pot:'porcelain',hat:'crown',neck:'scarf',face:'glasses',glow:'aurora',effect:'comet'},800),T.BASE_EQUIPMENT);
 assert.deepEqual(T.cleanEquipment({pot:'acorn',hat:'maple',neck:'mistscarf'},1e9),T.BASE_EQUIPMENT,'old shop pieces never come back');
 assert.equal(T.cleanEquipment({pot:'tidal'},99999).pot,'ceramic');
});

test('toggleEquip refuses everything now that dress-up is retired',()=>{
 for(const id of ['bow','crown','glass','halo','maple','nope'])assert.equal(T.toggleEquip({},id,1e9),null,id);
 for(const p of T.PREMIUM)assert.equal(T.toggleEquip({},p.id,1e9),null,'premium never equips: '+p.id);
});

test('catalog data still parses for old saves; preview never puts a piece on Misty',()=>{
 const items=T.wardrobeItems(820,{hat:'crown'}),by=id=>items.find(c=>c.id===id);
 assert.ok(by('crown')&&by('bow'),'old catalog still readable');
 assert.equal(T.previewEquip({hat:'crown'},'mushroom',820).hat,'');
 assert.equal(T.cosmeticAllowed('comet',1e9),false);
});

test('renderer draws every item and the selection is saved to the backed-up key',()=>{
 const h=src('herb-tamagotchi.js');
 for(const id of ['bow','crown','daisy','beanie','mushroom'])assert.ok(h.includes("id==='"+id+"'"),'hat '+id);
 for(const id of ['scarf','pearls','glasses','tidal','porcelain','glass'])assert.ok(h.includes("id==='"+id+"'")||h.includes("id!=='"+id+"'"),'layer '+id);
 assert.ok(h.includes("e.glow==='opal'")&&h.includes("e.effect==='comet'"));
 assert.ok(h.includes('T.cleanEquipment(p.equipment,m.xp)'),'normal render cleans equipment');
 assert.ok(h.includes("WKEY='lowispike.wardrobe.v1'"),'lowispike.* keys are part of the account backup');
 assert.ok(h.includes('window.LOWI_CLOUD_X')&&h.includes('X.backupNow()'),'equip triggers a backup');
 const idx=src('index.html');assert.ok(idx.includes('if (k.indexOf("lowispike.") !== 0 || k === "lowispike.chat.v1") return;'),'cloud snapshot still takes lowispike.* keys');
 const sp=src('spirit.js');
 assert.ok(sp.includes('T.setEquipment(p, eq)'));assert.ok(sp.includes("role=\"tablist\"")&&sp.includes('aria-pressed'));
 assert.ok(!/buy|checkout|stripe|price/i.test(sp.slice(sp.indexOf('Wardrobe (Oct 14)'),sp.indexOf('function wdEquip'))),'no purchase flow is implied');
});
