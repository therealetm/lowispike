'use strict';
/* Bug hunt run 55 (P-SAVE-SHAPE siblings of BH-053): many small loaders read their own saved key with
   `JSON.parse(localStorage.getItem(k)) || {}`. That only replaces a MISSING value: a key saved as a number or a text (42, "hello")
   comes back as that number / text, and the first write to it (s.water = {}, a.last = day) throws in strict code.
   Live 20261027-020733, probe-corrupt.cjs num/str: the fasting timer store lowi_fast_v1 threw in index.html st() (Gap card
   and LOWI_FAST.startOf) and lis-push.js days() threw at init. Fix: every such loader keeps the parsed value only when it is
   an object, else starts from {}. Lists and good objects are kept as they were. */
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function parseCalls(src) {
    /* every JSON.parse( ... ) call with balanced parentheses, plus the text right after it */
    const out = []; let i = 0;
    for (;;) {
        const j = src.indexOf('JSON.parse(', i); if (j < 0) break;
        let k = j + 11, depth = 1, q = null;
        while (k < src.length && depth) {
            const c = src[k];
            if (q) { if (c === '\\') k++; else if (c === q) q = null; }
            else if (c === '"' || c === "'" || c === '`') q = c;
            else if (c === '(') depth++; else if (c === ')') depth--;
            k++;
        }
        out.push({ call: src.slice(j, k), after: src.slice(k, k + 12), line: src.slice(0, j).split('\n').length });
        i = k;
    }
    return out;
}

test('no loader reads a saved key with `JSON.parse(...) || {}` (a number or text save would survive and throw on write)', () => {
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.js')).concat(['index.html']);
    const bad = [];
    for (const f of files) {
        const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
        for (const c of parseCalls(src)) if (/getItem|localStorage/.test(c.call) && /^\s*\|\|\s*\{\s*\}/.test(c.after)) bad.push(f + ':' + c.line);
    }
    assert.deepStrictEqual(bad, [], 'unguarded object loaders');
});

function sandbox(raw, key) {
    const store = {}; if (raw !== undefined) store[key] = raw;
    const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        console, Date, KEY: key };
    vm.createContext(ctx);
    return { ctx, store };
}

function cutLine(src, start) {
    const a = src.indexOf(start); assert.ok(a >= 0, 'found ' + start);
    const b = src.indexOf('\nfunction put(', a); assert.ok(b > a, 'found put after ' + start);
    return src.slice(a, b);
}

test('fasting timer store (index.html LOWI_FAST st()) saved as a number or text: no throw, a usable object', () => {
    const a = html.indexOf('function st(){ let s; try { s = '); assert.ok(a > 0);
    const src = cutLine(html, html.slice(a, a + 40));
    assert.ok(/s\.hist/.test(src), 'this is the fasting store loader');
    for (const raw of ['42', '"hello"', 'true']) {
        const { ctx } = sandbox(raw, 'lowi_fast_v1');
        let s; assert.doesNotThrow(() => { s = vm.runInContext('"use strict";\n' + src + '\nst()', ctx); }, raw + ' must not throw');
        assert.strictEqual(typeof s, 'object'); assert.strictEqual(typeof s.water, 'object'); assert.ok(Array.isArray(s.hist));
    }
    const good = { last: 1793000000000, water: { '2026-10-27': 3 }, hist: [{ a: 1 }] };
    const { ctx } = sandbox(JSON.stringify(good), 'lowi_fast_v1');
    const s = vm.runInContext('"use strict";\n' + src + '\nst()', ctx);
    assert.strictEqual(s.last, good.last); assert.strictEqual(s.water['2026-10-27'], 3); assert.strictEqual(s.hist.length, 1);
});

test('Gap card store (index.html second st()) saved as a number: no throw', () => {
    const a = html.indexOf('function st(){ let s; try { s = ', html.indexOf('nofake (Oct 19): never invents a last meal')); assert.ok(a > 0);
    const b = html.indexOf('return s; }', a) + 'return s; }'.length;
    const src = html.slice(a, b);
    const { ctx } = sandbox('42', 'lowi_fast_v1');
    let s; assert.doesNotThrow(() => { s = vm.runInContext('"use strict";\n' + src + '\nst()', ctx); });
    assert.strictEqual(typeof s.water, 'object');
});

test('push ask counter (lis-push.js js() + days()) saved as text: no throw, counts the day', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lis-push.js'), 'utf8');
    const js = src.match(/const js = k => \{[^\n]*\};/); assert.ok(js, 'js helper');
    const put = src.match(/const put = \(k, o\) => \{[^\n]*\};/); assert.ok(put, 'put helper');
    const days = src.match(/function days\(\)\{[^\n]*\}/); assert.ok(days, 'days()');
    const { ctx, store } = sandbox('"hello"', 'lowi.pushAsk');
    let n; assert.doesNotThrow(() => { n = vm.runInContext('"use strict";\nconst AKEY = "lowi.pushAsk";\n' + js[0] + '\n' + put[0] + '\n' + days[0] + '\ndays()', ctx); });
    assert.strictEqual(n, 1); assert.strictEqual(typeof JSON.parse(store['lowi.pushAsk']), 'object');
});

test('evening catch-up store (evening-catchup.js get) saved as a number: open/save get a usable object, a good one is kept', () => {
    const src = fs.readFileSync(path.join(ROOT, 'evening-catchup.js'), 'utf8');
    const get = src.match(/const get = \(k, d\) => \{[^\n]*\};/); assert.ok(get, 'get helper');
    for (const raw of ['42', '"hello"']) {
        const { ctx } = sandbox(raw, 'lowi.catchup.v1');
        let ok; assert.doesNotThrow(() => { ok = vm.runInContext('"use strict";\n' + get[0] + '\nconst stt = get("lowi.catchup.v1", {}) || {}; stt.seen = "2026-10-27"; stt.seen', ctx); }, raw + ' must not throw on write');
        assert.strictEqual(ok, '2026-10-27');
    }
    const { ctx } = sandbox(JSON.stringify({ done: '2026-10-26' }), 'lowi.catchup.v1');
    assert.strictEqual(vm.runInContext(get[0] + '\nget("lowi.catchup.v1", {}).done', ctx), '2026-10-26');
    const d = sandbox(JSON.stringify({ day: 'x', picks: [] }), 'd');
    assert.strictEqual(vm.runInContext(get[0] + '\nget("d", null).day', d.ctx), 'x', 'a null default still returns the saved draft');
});
