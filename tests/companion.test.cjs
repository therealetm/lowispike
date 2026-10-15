/* Oct 15: personalized companion evolution (Misty's form, reactions, calm glow, shared look). Core rules + wiring checks. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const C = require('../companion-core.js');
const src = fs.readFileSync(path.join(root, 'companion.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'companion.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const test = require('node:test');
const t = (name, fn) => test(name, fn);

const PROF = { sign: { element: 'water' }, personality: 'enfp', palette: {} };

t('genome takes element from the star sign and a clean personality type', () => {
  const g = C.genome(PROF, 2, 7);
  assert.strictEqual(g.el, 'water');
  assert.strictEqual(C.normType('enfp'), 'ENFP');
  assert.strictEqual(C.normType('xyz'), '');
  assert.strictEqual(C.genome({}, 0, 1).el, 'spirit');
});

t('shared look code round-trips and carries no birthday, sign name or type', () => {
  for (let st = 0; st < 6; st++) {
    const g = C.genome(PROF, st, 12345);
    const code = C.encode(g);
    assert.ok(code.length <= 240, code);
    assert.ok(!/enfp|pisces|cancer|scorpio|19\d\d|20\d\d-/i.test(code), code);
    const d = C.decode(code);
    assert.ok(d, code);
    assert.strictEqual(d.st, st);
    assert.strictEqual(d.el, g.el);
  }
  assert.strictEqual(C.decode('nonsense'), null);
  assert.strictEqual(C.decode(''), null);
});

t('six forms: markings from form 3, crown only at form 6', () => {
  const out = [];
  for (let st = 0; st < 6; st++) { const L = C.layers(C.genome(PROF, st, 9), C.CELL_R[st], { id: 't' + st }); out.push(L.back + L.front); }
  assert.ok(out.every(s => s.length > 0));
  for (let i = 1; i < 6; i++) assert.ok(out[i].length >= out[i - 1].length * 0.9, 'form ' + i + ' grows');
  assert.ok(!/cf-crown/.test(out[4]) && /cf-crown/.test(out[5]), 'crown at form 6 only');
  assert.strictEqual(C.clampStage(9), 5);
  assert.strictEqual(C.clampStage(-2), 0);
});

t('reactions: healthy cheers, sugary braces, unknown nothing', () => {
  assert.strictEqual(C.reaction('low'), 'cheer');
  assert.strictEqual(C.reaction('ok'), 'cheer');
  assert.strictEqual(C.reaction('high'), 'brace');
  assert.strictEqual(C.reaction('spike'), 'brace');
  assert.strictEqual(C.reaction('medium'), 'okay');
  assert.strictEqual(C.reaction('???'), '');
  const a = C.merge(null, 'brace', 1000);
  assert.strictEqual(C.merge(a, 'cheer', 1500), a, 'same meal reported twice keeps the stronger reaction');
  assert.strictEqual(C.merge(a, 'cheer', 5000).k, 'cheer');
});

t('calm glow rises with fasting hours and stays flat after 12 h', () => {
  assert.strictEqual(C.calm(0), 0);
  assert.strictEqual(C.calm(2), 0);
  assert.ok(C.calm(6) > 0 && C.calm(6) < 1);
  assert.strictEqual(C.calm(12), 1);
  assert.strictEqual(C.calm(15), 1);
  assert.strictEqual(C.calm(40), C.calm(12));
  const now = Date.UTC(2026, 9, 15, 12);
  assert.strictEqual(Math.round(C.fastHours({ last: now - 15 * 36e5 }, now)), 15);
  assert.strictEqual(C.fastHours({ last: now + 1000 }, now), null);
  assert.strictEqual(C.fastHours(null, now), null);
});

t('evolution path lists six forms with reached/current flags', () => {
  const stages = [0, 50, 150, 400, 900, 2000].map(xp => ({ xp }));
  const p = C.path(stages, 200, 2, 'fire', 'de');
  assert.strictEqual(p.length, 6);
  assert.ok(p[2].current && p[2].reached && !p[3].reached);
  assert.strictEqual(p[3].left, 200);
  assert.ok(p.every(s => s.name && s.trait));
});

t('companion awards no XP and is wired into the loader, service worker and scan', () => {
  assert.ok(!/\baward\s*\(/.test(src), 'no award() call in companion.js');
  assert.ok(/'companion-core\.js','companion\.js'/.test(ui), 'loader');
  for (const f of ['companion-core.js', 'companion.js', 'companion.css']) assert.ok(sw.split('"' + f + '"').length >= 3, 'sw lists ' + f);
  assert.ok(/lowi:scan-verdict/.test(html) && /lowi:scan-verdict/.test(src));
  assert.ok(/prefers-reduced-motion/.test(css), 'reduced motion respected');
  assert.ok(/Escape/.test(src));
});

t('the forms sheet is reachable from the herb path and the wardrobe sheet', () => {
  assert.ok(src.includes('.hq-root[data-view="path"]'), 'herb path host');
  assert.ok(src.includes("'#spWd'"), 'wardrobe sheet host');
  assert.ok(/data-cf', 'open'/.test(src));
});
