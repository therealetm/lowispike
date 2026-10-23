/* Oct 16, 2026 (handoff task 10): a glass companion per region, facts in a Misty-style bubble, no XP, no microbe buddies. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../region-pals-core.js');
const A = require('../arrival-core.js');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const js = read('region-pals.js'), css = read('region-pals.css'), cards = read('arrival-cards.js'), loader = read('apple-ui.js'), sw = read('sw.js'), regions = read('body-world-regions.js');

test('every region has its own companion; the bloodstream stays Misty\'s', () => {
    const ids = (regions.match(/\{ id: '([a-z]+)', hue:/g) || []).map(s => s.match(/'([a-z]+)'/)[1]);
    assert.ok(ids.length >= 7);
    for (const id of ids) assert.ok(C.PALS[id], 'companion for ' + id);
    assert.strictEqual(C.pid('hub'), null); assert.strictEqual(C.pid('blood'), null);
    assert.strictEqual(C.pid('lungs'), 'lung'); assert.strictEqual(C.pid('Muscles'), 'muscle');
    const shapes = C.IDS.map(id => C.PALS[id].shape); assert.strictEqual(new Set(shapes).size, shapes.length, 'each looks different');
    for (const s of shapes) assert.ok(js.includes(s + ": '<"), 'drawn: ' + s);
    for (const id of C.IDS) { const p = C.PALS[id]; for (const k of ['name', 'kind']) assert.strictEqual(p[k].length, 3, id + ' ' + k); assert.ok(/^\d+,\d+,\d+$/.test(p.rgb)); }
});

test('guides, not pets: no XP, no collection, no microbe buddies, Misty untouched', () => {
    assert.strictEqual(C.awardsXp, false);
    for (const src of [strip(js), strip(read('region-pals-core.js')).replace('awardsXp: false', '')]) {
        assert.ok(!/LowiXp|xpAward|award\(|ledger|addXp|LowiXP/i.test(src), 'no XP calls');
        /* Oct 18, 2026: the one thing stored is which guides you have met (lowi.guides.v1), so each says hello only once.
           Still nothing collected, and no other storage. */
        assert.ok(!/collect\w*\(/.test(src), 'nothing collected');
        assert.ok(!/localStorage/.test(src.replace(/localStorage\.(getItem|setItem)\(MEM_KEY/g, '')), 'nothing stored but the meeting memory');
    }
    const all = JSON.stringify(C.PALS).toLowerCase() + JSON.stringify(C.COPY).toLowerCase();
    for (const w of ['microbe', 'mikrobe', 'microbio', 'bacteri', 'buddy', 'buddies', 'xp']) assert.ok(!all.includes(w), w);
    assert.ok(/villus/.test(C.PALS.gut.kind[0]), 'the gut guide is a villus of the gut wall');
    assert.ok(!/misty/i.test(JSON.stringify(C.PALS)), 'Misty is not one of them');
});

test('what it says: greeting, the reviewed place facts, today line; tap walks the list', () => {
    for (const id of C.IDS) for (const li of [0, 1, 2]) {
        const L = C.lines(id, li, A, 'Today line');
        assert.ok(L[0].includes(C.pal(id, li).name), 'greets with its name');
        assert.strictEqual(L.length, 1 + A.PLACES[id].f.length + C.MORE[id].length + 1, 'greeting, arrival facts, the guide\'s own facts (cell-guide), today');
        C.MORE[id].forEach((f, k) => assert.strictEqual(L[1 + A.PLACES[id].f.length + k], f[li]));
        A.PLACES[id].f.forEach((f, k) => assert.strictEqual(L[1 + k], f[li], 'facts straight from arrival-core'));
        assert.strictEqual(L[L.length - 1], 'Today line');
    }
    assert.deepStrictEqual(C.lines('hub', 0, A), []);
    assert.strictEqual(C.lines('brain', 'en', null).length, 1 + C.MORE.brain.length, 'works without the facts module');
    for (const k of Object.keys(C.COPY)) assert.strictEqual(C.COPY[k].length, 3, k);
    const copy = JSON.stringify(C.COPY).toLowerCase();
    for (const w of ['cure', 'heal', 'heil', 'treat', 'diagnos', 'medic', 'prevent']) assert.ok(!copy.includes(w), w);
    assert.ok(/function next\(user\) \{ if \(st\.el\) sayLine\(st\.shown && st\.cur && st\.cur\.kind === 'fact' \? st\.i \+ 1 : nextUnseen\(\), !!user\); \}/.test(js), 'tap = next line (or the first one it has not said yet)');
});

test('moves with you: spring follow inside the safe area, relaxes home, still in reduced motion', () => {
    const M = C.FOLLOW.margin;
    for (const off of [[5, 5], [-5, -5], [1, -1], [0, 0]]) {
        const t = C.target(C.FOLLOW.home, off);
        assert.ok(t[0] >= M[0] && t[0] <= M[2] && t[1] >= M[1] && t[1] <= M[3], 'kept in view ' + off);
    }
    assert.ok(C.target(C.FOLLOW.home, [1, 0])[0] > C.FOLLOW.home[0], 'swims the way you drag');
    let p = [0.1, 0.7], v = [0, 0]; const tgt = C.target(C.FOLLOW.home, [0, 0]);
    for (let i = 0; i < 240; i++) { const r = C.step(p, v, tgt, 0, false); p = r.p; v = r.v; }
    assert.ok(Math.abs(p[0] - tgt[0]) < 0.01 && Math.abs(p[1] - tgt[1]) < 0.01, 'settles at its spot');
    const r = C.step([0.1, 0.7], [0, 0], tgt, 5, true); assert.deepStrictEqual(r.p, tgt); assert.deepStrictEqual(r.v, [0, 0]);
    let off = [1, -1]; for (let i = 0; i < 200; i++) off = C.relax(off); assert.deepStrictEqual(off, [0, 0], 'drifts back home after you let go');
    assert.ok(Math.abs(C.tilt([1, 0])) <= 18 && C.tilt([0, 0]) === 0);
    assert.ok(js.includes("'lowi:region-steer'") && js.includes('steer(vx, vy)'), 'hook for the steering module');
    assert.ok(js.includes("W.addEventListener('pointerdown', onDown, { passive: true, capture: true })"), 'follows drags without blocking the world drag');
    assert.ok(js.includes("W.removeEventListener('pointermove', onMove, true)"), 'stops listening when it leaves');
    assert.ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.rp-orb, \.rp-eye \{ animation: none; \}/.test(css));
    assert.ok(js.includes('if (!st.el || !st.el.isConnected || D.hidden) return;'), 'no frames while hidden or gone');
});

test('replaces the leftover info surfaces in regions; the cell ride keeps its card', () => {
    assert.ok(cards.includes('const palTakes = id =>'));
    assert.ok(cards.includes('if (!opts.force && !rideOpen() && palTakes(id)) return null;'), 'no gold card in a region with a companion');
    assert.ok(cards.includes("if (palTakes(id)) { if (cur && cur.where !== 'ride') close(); return; }"), 'region arrival closes any open card');
    assert.ok(!/function note\(/.test(cards), 'Oct 23: no Daily Quest line on Home at all (the old banner is deleted)');
    assert.ok(cards.includes('core: C, data }'), 'today line shared with the companion');
    assert.ok(/\.rp-on \.bwr-label \{ display: none !important; \}/.test(css), 'region label line hidden while the companion talks');
    assert.ok(/html\.gx-out \.rp-pal/.test(css) && js.includes('offView()'), 'never over the Community galaxy');
    assert.ok(!/camera|THREE|LowiWorld3D/.test(strip(js)), 'no camera or 3D scene changes');
});

test('bubble: Misty blue glass, readable, a real button with a label', () => {
    assert.ok(/\.rp-say \{[^}]*linear-gradient\(160deg, rgba\(60,140,240,\.42\), rgba\(14,40,104,\.82\)\)/.test(css), 'dark blue glass for white text');
    assert.ok(/\.rp-body \{[^}]*width: 64px; height: 64px/.test(css), 'touch target over 44 pt');
    assert.ok(js.includes('<button type="button" class="rp-body" aria-label="') && js.includes('role="status" aria-live="polite"'));
    assert.ok(/max-width: min\(260px, calc\(100vw - 40px\)\)/.test(css), 'fits small phones');
    assert.ok(!/#e8a33d|#f4cd7e|gold|purple/i.test(css));
});

test('wired: loader order and both service worker lists', () => {
    const files = loader.match(/const files=\[([^\]]+)\]/)[1];
    const at = f => files.indexOf("'" + f + "'");
    assert.ok(at('region-pals-core.js') >= 0 && at('region-pals-core.js') < at('region-pals.js') && at('region-pals.js') < at('arrival-cards.js'));
    const lines = sw.split('\n').filter(l => l.includes('"arrival-cards.js"'));
    assert.strictEqual(lines.length, 2);
    for (const l of lines) for (const f of ['region-pals-core.js', 'region-pals.js', 'region-pals.css']) assert.ok(l.includes('"' + f + '"'), f);
    assert.ok(js.includes("replace('region-pals.js', 'region-pals.css')"));
});
