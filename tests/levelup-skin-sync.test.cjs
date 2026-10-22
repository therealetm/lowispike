'use strict';
/* Oct 22 2026 (Emmanuel): "on a different phone the person leveled up, but the level-up design of their companion is still old ... the old
   design needs to be nuked". The level-up card must paint the same cell skin as Home for every form, the flowery potted herb must be gone
   from every shipped file, and prefs saved by the old herb must move onto the current skin. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('herb-tamagotchi.js'), Core = require('../herb-tamagotchi-core.js');
const line = name => { const a = js.indexOf(name); assert.ok(a >= 0, name); return js.slice(a, js.indexOf('\n', a)); };

test('the level-up waits for the cell skin Home uses before it paints, instead of falling back to the old herb', () => {
    const evo = js.slice(js.indexOf('function evolve('), js.indexOf('function finishEvolution('));
    const wait = evo.indexOf('if(!skinReady()'), card = evo.indexOf("D.createElement('div')");
    assert.ok(wait > 0 && wait < card, 'evolve checks skinReady before it builds the card');
    assert.match(evo, /evoWait=setTimeout\(\(\)=>evolve\(current\(\)\.m,from\),250\)/, 'it retries with the fresh model');
    assert.match(evo, /evoSkinWaits<60/, 'it gives up waiting after about 15 s');
    const ctx = { window: {}, D: { getElementById: id => (ctx.spiritTag && id === 'tmg-spirit-js' ? {} : null) } };
    vm.createContext(ctx);
    vm.runInContext('var window=this.window,D=this.D;' + line('function skinReady(') + ';this.f=skinReady;', ctx);
    assert.equal(ctx.f(), false, 'nothing loaded yet');
    const base = () => 'HERB'; ctx.window.LowiHerbTamagotchi = { plantHTML: base };
    assert.equal(ctx.f(), false, 'raw base drawing is not the skin');
    const cell = () => 'CELL'; cell.cell = true; ctx.window.LowiHerbTamagotchi.plantHTML = cell;
    assert.equal(ctx.f(), false, 'cell-world alone: still waiting for world-home stage names');
    ctx.window.LowiWorldHomeCore = {};
    assert.equal(ctx.f(), true);
    ctx.spiritTag = true;
    assert.equal(ctx.f(), false, 'spirit.js is still loading');
    ctx.window.LowiSpirit = {};
    assert.equal(ctx.f(), true);
});

test('the level-up card paints the current skin for each of the ten forms, before and after', () => {
    assert.match(js, /function evoArt\(m,p\)\{return curArt\(m,'hero',p\);\}/);
    const ctx = { window: {}, plant: () => 'HERB', esc: s => String(s) }; vm.createContext(ctx);
    vm.runInContext('var window=this.window,plant=this.plant,esc=this.esc;' + line('function curArt(') + ';' + line('function orb(') + ';this.f=curArt;', ctx);
    const calls = [], skin = (m, size) => { calls.push([m.index, size]); return '<svg class="tmg-plant cw-cell" data-form="' + m.index + '"></svg>'; };
    skin.cell = true; skin.cf = true; ctx.window.LowiHerbTamagotchi = { plantHTML: skin };
    for (let i = 0; i < 10; i++) {
        const out = ctx.f({ index: i, profile: { palette: { a: '#111', b: '#222' } } }, 'hero', {});
        assert.match(out, new RegExp('cw-cell" data-form="' + i + '"'), 'form ' + (i + 1));
    }
    assert.deepEqual(calls.map(c => c[1]), Array(10).fill('hero'));
    ctx.window.LowiHerbTamagotchi = {};
    const ph = ctx.f({ index: 3, profile: { palette: { a: '#111', b: '#222' } } }, 'hero', {});
    assert.match(ph, /lh-orb/, 'without the skin: a neutral orb');
    assert.doesNotMatch(ph, /HERB|lh-pot|lh-leaf|lh-blossom/);
});

test('the old flowery herb is gone from every shipped file', () => {
    const files = fs.readdirSync(root).filter(f => /\.(js|css|html)$/.test(f));
    for (const f of files) {
        const s = read(f);
        assert.doesNotMatch(s, /lh-leaf|lh-blossom|lh-sway|lh-wave\b/, f + ' still has the old leaves/blossoms');
    }
    const plant = js.slice(js.indexOf('function plant('), js.indexOf('function badge('));
    assert.doesNotMatch(plant, /leaves|blooms|\bstem\b|id\+'leaf'|url\(#'\+id\+'leaf\)/, 'plant() builds no stem, leaves or blossoms');
    assert.match(plant, /<g class="lh-foliage">'\+\(crop\?'<ellipse class="lh-body"/, 'the old body is only drawn for wardrobe crops');
    assert.match(plant, /<g class="lh-pot">'\+\(crop\?'<path d="M88 247h84/, 'the old pot is only drawn for wardrobe crops');
    assert.doesNotMatch(js, /[^a-zA-Z.](?<!function )plant\((m|current\(\)\.m|\{\.\.\.m)/, 'nothing paints the base drawing directly');
    assert.doesNotMatch(js, /Flowers for you|leaf dance|Hello, new leaves|Little leaf room|Close herb home/);
    assert.doesNotMatch(read('spirit.js'), /querySelectorAll\('\.lh-leaf'\)|sp-fallen/);
});

test('prefs saved by the old herb migrate onto the current skin without a crash or a blank', () => {
    const src = line('const OLD_SKIN_KEYS=') + '\n' + js.slice(js.indexOf('function migrateSkin('), js.indexOf('\n/* Wardrobe (Oct 14)'));
    const ctx = { T: Core }; vm.createContext(ctx);
    vm.runInContext('var T=this.T;' + src + ';this.f=migrateSkin;', ctx);
    const old = { lastSeenStage: '5', highestStage: 14, evoFrom: 'bloom', herbSkin: 'flowery', potStyle: 'terracotta', design: 'herb-v1',
        equipment: { pot: 'terracotta-old', hat: 'flower-crown', glow: '', petals: 'pink' } };
    const p = ctx.f(old);
    assert.equal(p.lastSeenStage, 5); assert.equal(p.highestStage, 9); assert.equal('evoFrom' in p, false);
    for (const k of ['herbSkin', 'potStyle', 'design']) assert.equal(k in p, false, k);
    assert.deepEqual(Object.keys(p.equipment).sort(), Object.keys(Core.BASE_EQUIPMENT).sort());
    assert.equal(p.equipment.pot, 'ceramic'); assert.equal(p.equipment.hat, '');
    assert.equal(p.skinV, 2);
    const pending = ctx.f({ lastSeenStage: 2, evoFrom: '1', equipment: null });
    assert.equal(pending.evoFrom, 1, 'a real pending level-up survives and plays in the new skin');
    assert.equal(pending.equipment.pot, 'ceramic');
    const again = ctx.f(Object.assign({}, p, { lastSeenStage: 'x' }));
    assert.equal(again.lastSeenStage, 'x', 'runs once per device (skinV)');
    assert.match(js, /retireOutfit\(p\);migrateSkin\(p\);/, 'readPrefs runs it on every load');
});
