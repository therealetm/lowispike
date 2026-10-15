// Fasting start edit: fix when the running fast started, without ending it, restarting it or paying points twice.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../fast-edit-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('fast-edit.js'), css = read('fast-edit.css'), loader = read('apple-ui.js'), sw = read('sw.js'), html = read('index.html');
const H = 36e5, M = 6e4;
const NOW = new Date(2026, 9, 15, 12, 0, 0).getTime();

test('start is the later of last and the end of the last logged fast (same rule as LowiFastStop.startOf)', () => {
    assert.strictEqual(C.startOf({ last: NOW - 5 * H }), NOW - 5 * H);
    assert.strictEqual(C.startOf({ last: NOW - 9 * H, hist: [{ s: NOW - 30 * H, e: NOW - 8 * H }] }), NOW - 8 * H);
    assert.strictEqual(C.startOf({}), 0);
});

test('local date + time parts round-trip on the device clock', () => {
    const t = new Date(2026, 9, 14, 19, 45).getTime();
    assert.deepStrictEqual(C.parts(t), { date: '2026-10-14', time: '19:45' });
    assert.strictEqual(C.fromParts('2026-10-14', '19:45'), t);
    assert.strictEqual(C.fromParts('2026-10-14', '7:05'), new Date(2026, 9, 14, 7, 5).getTime());
    assert.ok(Number.isNaN(C.fromParts('', '19:45')));
    assert.ok(Number.isNaN(C.fromParts('2026-10-14', '')));
    assert.ok(Number.isNaN(C.fromParts('2026-02-30', '10:00')));
    assert.ok(Number.isNaN(C.fromParts('2026-10-14', '24:10')));
});

test('future, too old, overlapping and empty starts are refused; a real earlier start is fine', () => {
    const s = { last: NOW - 2 * H, hist: [{ s: NOW - 40 * H, e: NOW - 20 * H, h: 20, xp: 50 }], awarded: NOW - 40 * H };
    assert.strictEqual(C.validate(NOW + 5 * M, s, NOW).err, 'future');
    assert.strictEqual(C.validate(NOW - 21 * H, s, NOW).err, 'overlap');
    assert.strictEqual(C.validate(NaN, s, NOW).err, 'invalid');
    assert.strictEqual(C.validate(NOW - 2 * H, s, NOW).err, 'same');
    assert.strictEqual(C.validate(NOW - 8 * 24 * H, { last: NOW - H }, NOW).err, 'old');
    const ok = C.validate(NOW - 14 * H, s, NOW);
    assert.ok(ok.ok); assert.strictEqual(ok.t, NOW - 14 * H);
    assert.ok(C.validate(NOW, { last: NOW - 3 * H }, NOW).ok, 'right now is allowed');
    assert.ok(C.validate(NOW - 20 * H, s, NOW).ok, 'exactly when the last fast ended is allowed');
});

test('bounds: never before the last logged fast, never in the future, at most 7 days back', () => {
    const b = C.bounds({ last: NOW - H, hist: [{ s: NOW - 30 * H, e: NOW - 10 * H }] }, NOW + 20000);
    assert.strictEqual(b.min, NOW - 10 * H); assert.strictEqual(b.max, NOW);
    const b2 = C.bounds({ last: NOW - H }, NOW);
    assert.strictEqual(b2.min, NOW - 7 * 24 * H);
});

test('apply changes only last (+ a startEdit note): history, rewards, water and goal stay exactly as they were', () => {
    const s = { last: NOW - 2 * H, target: 16, water: { d: '2026-10-15', n: 3 }, hist: [{ s: NOW - 40 * H, e: NOW - 20 * H, h: 20, g: 16, ok: true, xp: 50 }], awarded: NOW - 40 * H };
    const before = JSON.stringify(s);
    const r = C.apply(s, NOW - 15 * H, NOW);
    assert.ok(r.ok);
    assert.strictEqual(JSON.stringify(s), before, 'input not mutated');
    assert.strictEqual(r.state.last, NOW - 15 * H);
    assert.deepStrictEqual(r.state.hist, s.hist); assert.strictEqual(r.state.awarded, s.awarded);
    assert.deepStrictEqual(r.state.water, s.water); assert.strictEqual(r.state.target, 16);
    assert.deepStrictEqual(r.state.startEdit, { at: NOW, from: NOW - 2 * H, to: NOW - 15 * H });
    assert.strictEqual(C.startOf(r.state), NOW - 15 * H, 'the running fast now counts from the new start');
    // the corrected fast is still unpaid: awarded points at the old fast's start, which can never equal the new start
    assert.notStrictEqual(r.state.awarded, C.startOf(r.state));
    const bad = C.apply(s, NOW + H, NOW);
    assert.strictEqual(bad.ok, false); assert.strictEqual(bad.state, s);
});

test('the fasting sheet shows the edit button next to "since", with a fallback when the file has not loaded', () => {
    assert.ok(html.includes('LowiFastEdit.sinceRow(w("since", {t:at(start)}))'));
    assert.ok(html.includes("'<span class=\"fst-since\">' + esc(w(\"since\", {t:at(start)})) + '</span>'"));
    assert.ok(/window\.LowiFastStop = \{[^}]*\bpaint\b/.test(html), 'LowiFastStop.paint is exported for the repaint');
});

test('card: date + time inputs prefilled, save / cancel, escape and scrim cancel, no XP anywhere', () => {
    for (const s of ['type="date" id="feDate"', 'type="time" id="feTime"', 'data-fse="save"', 'data-fse="cancel"', "e.key === 'Escape'", 'lowi:fast-start'])
        assert.ok(js.includes(s), s);
    assert.ok(!/LowiXP|\.award\(|grant\(|addXP|xp\(/.test(js), 'the edit never awards XP');
    assert.ok(!/data-fe=/.test(js), 'does not use data-fe (taken by the food chooser)');
    assert.ok(js.includes('fresh.last = r.state.last; fresh.startEdit = r.state.startEdit;'), 'only last + startEdit are written');
    for (const l of ['en:', 'de:', 'es:']) assert.ok(js.includes(l), l);
    assert.ok(css.includes('prefers-reduced-motion') && css.includes('data-theme="light"'));
});

test('loaded after the arrival cards and cached by the service worker', () => {
    assert.ok(loader.includes("'arrival-cards.js','fast-edit-core.js','fast-edit.js'"));
    const n = f => sw.split('"' + f + '"').length - 1;
    assert.strictEqual(n('fast-edit-core.js'), 2); assert.strictEqual(n('fast-edit.js'), 2); assert.strictEqual(n('fast-edit.css'), 2);
});

test('Home: a real button on the water bubble rim opens the same card; the bubble itself is not rebuilt', () => {
    assert.ok(js.includes("pill = D.createElement('button')"), 'a real button');
    assert.ok(js.includes("f.insertAdjacentElement('afterend', pill)"), 'a sibling of #spFast, never inside the bubble button');
    assert.ok(js.includes("pill.setAttribute('data-fse', 'open')"), 'opens the same LowiFastEdit card');
    assert.ok(!/getElementById\('spFast'\)\.(innerHTML|appendChild)/.test(js), 'bubble content untouched');
    assert.ok(css.includes('.fe-bub') && css.includes('.fe-bub.fe-tiny'));
    for (const l of ["startAt: 'Start {t}'", "since: 'seit {t}'", "since: 'desde {t}'"]) assert.ok(js.includes(l), l);
});

test('tap XP is off for the edit button, the Home pill and the card', () => {
    assert.ok(js.includes(`class="fe-chip" data-fse="open" data-xtp="off"`));
    assert.ok(js.includes("pill.setAttribute('data-xtp', 'off')") && js.includes("ov.setAttribute('data-xtp', 'off')"));
});
