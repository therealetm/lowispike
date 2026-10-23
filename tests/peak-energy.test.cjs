/* Oct 19 (E-man, fresh account): "I just started and my companion already looks tired and I'm at fifty percent ... at least when
   they begin, let them see themselves at a hundred percent ... really fast, really strong, the world should be moving ... when
   their power goes down, they notice." New accounts start full (welcome energy that fades out over the first day), and how
   energy FEELS (world pace, flight speed, peak look) is one shared curve. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(root, f), 'utf8');
const S = require('../sun-meter.js');
global.LowiWorldHealth = require('../world-health-core.js');
const M = require('../world-mood-core.js');
const X = require('../misty-scale.js');
const F = require('../misty-flight.js');

const H = 36e5;
const START = new Date(2026, 9, 19, 14, 30, 0).getTime();
const planted = { eventId: 'herb-first:planted', ts: START, points: 5, label: 'First spark' };
const fresh = (now, extra) => Object.assign({ now, logs: [], ledger: [planted], water: 0 }, extra || {});

test('a brand-new account starts at 100%: thriving, not the tired resting 15%', () => {
    const en = S.energy(fresh(START + 5 * 60e3));
    assert.strictEqual(en.value, 1);
    assert.strictEqual(en.tier, 'thriving');
    assert.strictEqual(en.welcome, 1);
    assert.ok(en.canTravel);
    assert.ok(Math.abs(en.real - S.ENERGY.base) < 1e-9, 'what was really tracked is still known (nothing yet = resting base)');
    /* the same account without the welcome would have been the old tired start */
    assert.strictEqual(S.energy({ now: START + 60e3, logs: [], ledger: [], water: 0 }).tier, 'tired');
});

test('full for the first 12 hours, then it eases out over 12 more and never comes back', () => {
    const v = h => S.energy(fresh(START + h * H)).value;
    assert.strictEqual(v(0.5), 1); assert.strictEqual(v(11.9), 1); assert.strictEqual(v(12), 1);
    const mid = v(18);
    assert.ok(mid > 0.5 && mid < 0.65, 'half way through the fade: ' + mid);
    let last = 1;
    for (let h = 12; h <= 24; h += 0.5) { const x = v(h); assert.ok(x <= last + 1e-12, 'never rises while fading at ' + h + 'h'); last = x; }
    assert.ok(Math.abs(v(24) - S.ENERGY.base) < 1e-9, 'after 24 h only what is tracked is left');
    assert.ok(Math.abs(v(24 * 7) - S.ENERGY.base) < 1e-9, 'no reset days later');
    assert.strictEqual(S.welcomeK(START, START + 25 * H), 0);
    assert.strictEqual(S.welcomeK(0, START), 0);
});

test('tracking still counts while the welcome fades: every glass raises her', () => {
    const now = START + 18 * H;
    const dry = S.energy(fresh(now)).value, wet = S.energy(fresh(now, { water: 2 })).value;
    assert.ok(wet > dry + 0.03, dry + ' -> ' + wet);
    assert.ok(wet <= 1);
});

test('existing accounts never get it: any older ledger entry or meal log, or no planting at all', () => {
    const now = START + H;
    const old = { eventId: 'water:1', ts: START - 3 * 24 * H, points: 2 };
    assert.strictEqual(S.energy(fresh(now, { ledger: [old, planted] })).welcome, 0, 'older ledger history');
    assert.strictEqual(S.energy(fresh(now, { logs: [{ day: '2026-10-12', t: 'Soup', r: 'ja' }] })).welcome, 0, 'older day-only meal log');
    assert.strictEqual(S.energy(fresh(now, { logs: [{ ts: START - 5 * H, t: 'Soup', r: 'ja' }] })).welcome, 0, 'older timed meal log');
    assert.strictEqual(S.energy({ now, logs: [], ledger: [], water: 0 }).welcome, 0, 'no planting entry');
    assert.strictEqual(S.energy({ now, logs: [], ledger: [{ eventId: 'herb-first:planted', ts: START - 3 * 24 * H }], water: 0 }).welcome, 0, 'planted days ago');
    /* things logged the same hour or after the planting are part of the new account */
    assert.strictEqual(S.energy(fresh(now, { ledger: [{ eventId: 'gate:x', ts: START - 10 * 60e3 }, planted, { eventId: 'water:2', ts: START + 60e3 }] })).welcome, 1);
});

test('it survives reload, sign-in and another device: derived from the synced ledger only, no new stored key', () => {
    const state = JSON.parse(JSON.stringify({ ledger: [planted], logs: [] }));
    assert.strictEqual(S.energy({ now: START + 2 * H, logs: state.logs, ledger: state.ledger, water: 0 }).value, 1);
    const s = src('sun-meter.js');
    assert.ok(/herb-first:planted/.test(s) && !/localStorage\.setItem\([^)]*welcome/i.test(s), 'no separate welcome storage');
    assert.ok(/eventId:\s*'herb-first:planted'/.test(src('herb-start.js')), 'herb-start.js still writes the planting entry');
});

test('feel(): heavy and slow when resting, alive at the peak, flat with Reduce Motion', () => {
    const r = S.feel(S.ENERGY.base), m = S.feel(0.6), p = S.feel(1);
    assert.ok(Math.abs(r.pace - 0.8) < 1e-3 && r.peak === 0);
    assert.ok(Math.abs(m.pace - 1) < 1e-3 && m.peak === 0);
    assert.ok(Math.abs(p.pace - 1.6) < 1e-3 && p.peak === 1);
    assert.strictEqual(S.feel(0.82).peak, 0, 'peak only above ~82%');
    let last = 0; for (let k = 0; k <= 1.0001; k += 0.02) { const f = S.feel(k); assert.ok(f.pace >= last - 1e-9); last = f.pace; }
    assert.strictEqual(S.feel(1, true).pace, 1); assert.strictEqual(S.feel(0.1, true).pace, 1);
});

test('flight: up to 30% faster at the peak, exactly as heavy as before below it', () => {
    const old = { out: k => 1.5 + 2.7 * k, exit: k => 0.8 + 1.3 * k, in: k => 0.55 + 1.05 * k };
    for (const w of ['out', 'exit', 'in']) for (const k of [0, 0.15, 0.4, 0.6, 0.82]) assert.ok(Math.abs(F.speed(k, w) - old[w](k)) < 1e-9, w + ' ' + k);
    assert.ok(Math.abs(F.speed(1, 'out') - old.out(1) * 1.3) < 1e-9);
    assert.ok(Math.abs(F.speed(1, 'exit') - old.exit(1) * 1.25) < 1e-9);
    assert.ok(F.speed(1, 'out') / F.speed(0.15, 'out') > 2.8, 'peak vs resting is a felt difference');
});

test('the half-energy weak exit / entry rule is untouched (new users at 100% are never trapped)', () => {
    const h = src('misty-hunt.js');
    assert.ok(/const tries = energy => \{ const e = \+energy; if \(!isFinite\(e\)\) return 0; return e >= 0\.5 \? 0 : e >= 0\.3 \? 1 : 2; \};/.test(h));
    assert.ok(S.energy(fresh(START + H)).value >= 0.5);
});

test('her energy card says where the full start comes from and that it fades; no "resting" line meanwhile', () => {
    const deps = { energy: S.energy, ENERGY: S.ENERGY, mood: M, wh: global.LowiWorldHealth, state: {} };
    const inp = fresh(Date.now() - H, { ledger: [Object.assign({}, planted, { ts: Date.now() - H })] });
    const p = X.plan(inp, deps), h = X.cardHTML(p, null, { lang: 'en', name: 'Ana', E: S.ENERGY });
    assert.strictEqual(p.value, 1);
    assert.ok(/ms-welcome/.test(h) && /Ana starts out full: welcome energy/.test(h) && /next 23 h/.test(h), h);
    assert.ok(!/Nothing tracked yet today/.test(h));
    const later = fresh(Date.now(), { ledger: [Object.assign({}, planted, { ts: Date.now() - 30 * H })] });
    const h2 = X.cardHTML(X.plan(later, deps), null, { lang: 'en', name: 'Ana', E: S.ENERGY });
    assert.ok(!/ms-welcome/.test(h2) && /Nothing tracked yet today/.test(h2));
    const de = X.cardHTML(p, null, { lang: 'de', name: 'Ana', E: S.ENERGY });
    assert.ok(/Willkommensenergie/.test(de));
});

test('wiring: Home publishes one eased feel; the world and Misty\'s bumps move at the same energy pace', () => {
    const wh = src('world-home.js'), sc = src('body-world-3d-scene.js'), bp = src('misty-bump.js'), fl = src('misty-flight.js');
    assert.ok(/LS\.feel\(A\.vigor, reduced\(\)\)/.test(wh) && /W\.LowiVigorFeel = F/.test(wh), 'world-home publishes the feel from her vigor');
    assert.ok(/const ef = energyFeel\(\), wdt = dt \* worldSpeed\(\) \* ef\.pace;/.test(sc), 'world time runs at the energy pace');
    assert.ok(/Math\.min\(1\.8, Math\.max\(0\.6/.test(sc) && /Math\.min\(1\.8, Math\.max\(0\.6/.test(bp), 'same clamp in both');
    assert.ok(/\* energyPace\(\)/.test(bp), 'bump prediction uses the same pace');
    assert.ok(!/shaftMat/.test(sc), 'Oct 23: the light shafts are deleted with the old Home layers');
    assert.ok(!/new T\.(Mesh|Points|PointLight|SpotLight)\b[^;]*pk/.test(sc), 'peak look adds no new objects');
    assert.ok(/const pk = ctx\.reduced \? 0 : peakOf\(k\)/.test(fl), 'no extra sparkle with Reduce Motion');
});
