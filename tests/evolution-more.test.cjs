/* Oct 19 2026 night (Emmanuel, after reaching Legendary: "we need to add more evolutions ... it should really, truly evolve
   into something majestic looking"): ten forms. These tests pin the thresholds, that nobody loses earned progress, that each
   new form adds a new silhouette piece, that the shared look code accepts the new forms, and that evolving is XP only. */
const test = require('node:test');
const assert = require('node:assert');
const C = require('../companion-core.js');
const cfg = require('../herb-config.js');
const WH = require('../world-home-core.js');

const stages = (cfg.LOWI_HERB_CONFIG || cfg).stages || (global.LOWI_HERB_CONFIG || {}).stages;

test('ten forms: the first six thresholds are unchanged, four longer steps follow', () => {
  assert.deepStrictEqual(stages.map(s => s.xp), [0, 100, 300, 700, 1500, 3000, 4500, 7000, 10000, 14000]);
  stages.forEach(s => assert.strictEqual(s.name.length, 3, s.id + ' has en/de/es names'));
  for (let i = 6; i < 10; i++) assert.ok(stages[i].xp - stages[i - 1].xp >= 1500, 'each new step is a real step');
});

test('level names (world-home-core) use the same thresholds, so level and form never disagree', () => {
  const lv = [0, 100, 300, 700, 1500, 3000, 4500, 7000, 10000, 14000];
  lv.forEach((xp, i) => {
    const s = WH.stage(xp);
    assert.strictEqual(s.index, i, 'level index at ' + xp);
    assert.strictEqual(WH.stage(xp - 1).index, Math.max(0, i - 1));
  });
  assert.strictEqual(WH.stage(14000).next, null);
  assert.strictEqual(WH.stage(3000).next.n[0], 'Nova');
  assert.strictEqual(WH.stage(14000).cur.n[0], 'Majesty');
});

test('evolution never needs a food or the Collection: thresholds are XP numbers only', () => {
  stages.forEach(s => assert.deepStrictEqual(Object.keys(s).sort(), ['id', 'name', 'xp']));
});

test('genome keeps the personal identity across all ten forms, stage clamps to 0..9', () => {
  const prof = { birthday: '1990-05-12', mbti: 'ENFP', name: 'Nimbus' };
  const g5 = C.genome(prof, 5), g9 = C.genome(prof, 9);
  for (const k of ['el', 'sy', 'a', 'b', 'shape', 'eye']) if (k in g5) assert.deepStrictEqual(g9[k], g5[k], k + ' stays the same');
  assert.strictEqual(g9.st, 9);
  assert.strictEqual(C.clampStage(15), 9);
  assert.strictEqual(C.MAX_ST, 9);
});

test('shared look code: forms 7-10 round-trip, form 1-6 codes still decode', () => {
  const prof = { birthday: '1984-11-02' };
  for (let st = 0; st < 10; st++) {
    const g = C.genome(prof, st), code = C.encode(g), back = C.decode(code);
    assert.ok(back, 'decodes form ' + (st + 1));
    assert.strictEqual(back.st, st);
  }
});

function traitsAt(st, el) {
  const prof = { birthday: '1990-05-12' };
  const g = Object.assign(C.genome(prof, st), el ? { el } : {});
  const svg = C.miniSVG(g);
  return svg;
}

test('each new form adds a new silhouette piece on top of the last', () => {
  for (const el of C.ELS) {
    const s5 = traitsAt(5, el), s6 = traitsAt(6, el), s7 = traitsAt(7, el), s8 = traitsAt(8, el), s9 = traitsAt(9, el);
    assert.ok(!/cf-mane/.test(s5) && /cf-mane/.test(s6) && /cf-diadem/.test(s6), el + ': form 7 adds mane and crown');
    assert.ok(/cf-wing3/.test(s7) && (s7.match(/cf-tail/g) || []).length === 2 && !/cf-wing3/.test(s6), el + ': form 8 adds third wings and twin tails');
    assert.ok(/cf-flare/.test(s8) && /cf-horn2/.test(s8) && !/cf-flare/.test(s7), el + ': form 9 adds power spikes and inner horns');
    assert.ok(/cf-orbit-far/.test(s9) && /cf-orbit-near/.test(s9) && /cf-st9/.test(s9) && !/cf-orbit/.test(s8), el + ': form 10 adds the star ring and gold edges');
    assert.ok((s9.match(/class="cf-stone"/g) || []).length >= (s5.match(/class="cf-stone"/g) || []).length, 'stones never drop');
  }
});

test('forms 1-6 render exactly as before the extension (no new pieces leak backwards)', () => {
  for (let st = 0; st < 6; st++) {
    const s = traitsAt(st);
    assert.ok(!/cf-mane|cf-diadem|cf-wing3|cf-flare|cf-horn2|cf-orbit/.test(s), 'form ' + (st + 1));
  }
});

test('the evolution path lists all ten forms with names in every language', () => {
  for (const lang of ['en', 'de', 'es']) {
    const p = C.path(stages, 5200, 6, 'fire', lang);
    assert.strictEqual(p.length, 10);
    p.forEach(x => assert.ok(x.name && x.name.length > 2 && x.trait, lang + ' name'));
    assert.ok(p[6].current && p[5].reached && !p[7].reached && p[7].left === 1800, lang + ': current form and XP left');
    assert.ok(new Set(p.map(x => x.name)).size === 10, lang + ': ten different names');
  }
  assert.match(C.formName(9, 'fire', 'en'), /Majesty/);
  assert.match(C.formName(9, 'water', 'de'), /Majestät/);
});

test('frames grow with the forms so nothing is cut off', () => {
  for (let st = 6; st < 10; st++) assert.ok(C.POWER[st].frame > C.POWER[st - 1].frame, 'frame ' + st);
});
