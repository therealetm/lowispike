'use strict';
/* Oct 20 2026 food audit (journey C, simulated iPhone, product server unreachable): Shop > Scan in the shop > type a barcode
   said "We don't know this product yet" (DE: "Dieses Produkt kennen wir noch nicht"). The product may be well known; the
   phone just got no answer (weak signal in the shop, the 11 s time out), and navigator.onLine stays true on iPhones then.
   Now a lookup with no answer says "I couldn't check this one right now" and offers Try again; a real 404 still says unknown. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('the strings exist in every language', () => {
    const C = require(path.join(ROOT, 'shop-scan-core.js'));
    for (const li of [0, 1, 2]) for (const k of ['noReachT', 'retry', 'unknownT', 'offlineT']) { const v = C.tx(k, li); assert.ok(v && v !== k, k + ' ' + li); }
    assert.notStrictEqual(C.tx('noReachT', 0), C.tx('unknownT', 0));
});

test('no answer is not "unknown product"; only notFound is', () => {
    const s = src('shop-scan.js');
    const f = s.slice(s.indexOf('async function found('), s.indexOf('function verdictHTML('));
    assert.match(f, /if \(!p\) \{ unknown\(el, code, navigator\.onLine === false \? 'offline' : 'noreach'\); return; \}/);
    assert.match(f, /if \(p\.notFound\) \{ unknown\(el, code, false\); return; \}/);
    const u = s.slice(s.indexOf('function unknown('), s.indexOf('let found_ = []'));
    assert.match(u, /offline === 'noreach' \? 'noReachT'/);
    assert.match(u, /data-ss="retry"/, 'a Try again button when the lookup got no answer');
    assert.match(s, /k === 'retry'\) \{ if \(b\.dataset\.code\) found\(b\.dataset\.code, el\); \}/, 'Try again looks the same barcode up again');
});
