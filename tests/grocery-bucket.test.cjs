'use strict';
/* grocery-1 (Oct 23 2026, Seven via the Maya 7 handover): after a product scan, "Add to bucket" or "Skip", saved per day.
   grocery-bucket-core.js (pure), grocery-bucket.js (card row), hook in index.html scActsHTML. No prices yet (grocery-2). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../grocery-bucket-core.js');

const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };
const T0 = new Date(2026, 9, 23, 10, 0).getTime();

test('add keeps a product in today\'s bucket once (same barcode = one line), remove takes it out', () => {
    let s = { days: {} };
    s = C.add(s, { barcode: '4001234567890', name: 'Oat drink', brand: 'X', verdict: 'better', img: 'https://img/x.jpg' }, T0);
    s = C.add(s, { barcode: '4001234567890', name: 'Oat drink', verdict: 'better' }, T0 + 1000);
    s = C.add(s, { name: 'Loose apples', verdict: 'ok' }, T0 + 2000);
    const t = C.today(s, T0);
    assert.equal(t.length, 2);
    assert.equal(t[0].k, 'bc:4001234567890');
    assert.equal(t[1].k, 'nm:loose apples|');
    assert.ok(C.has(s, { barcode: '4001234567890' }, T0));
    s = C.remove(s, 'bc:4001234567890', C.dayKey(T0));
    assert.equal(C.today(s, T0).length, 1);
    assert.ok(!C.has(s, { barcode: '4001234567890' }, T0));
});

test('saved per day: tomorrow starts empty, old days are pruned after two weeks', () => {
    let s = C.add({ days: {} }, { barcode: '123', name: 'A' }, T0);
    assert.equal(C.today(s, T0 + 864e5).length, 0, 'next day is a fresh bucket');
    assert.equal(C.today(s, T0).length, 1, 'the earlier day is kept');
    s = C.add(s, { barcode: '456', name: 'B' }, T0 + 20 * 864e5);
    assert.ok(!s.days[C.dayKey(T0)], 'a day older than 14 days is dropped');
});

test('no prices are stored or invented; only https images; unknown verdict stays unknown; nothing without a name or barcode', () => {
    const it = C.item({ barcode: '1', name: 'A', price: 2.99, img: 'http://x', verdict: 'weird' }, T0);
    assert.ok(!('price' in it));
    assert.equal(it.img, '');
    assert.equal(it.verdict, 'unknown');
    assert.equal(C.today(C.add({ days: {} }, {}, T0), T0).length, 0);
    assert.ok(!/price|€|\$/i.test(read('grocery-bucket.js').replace(/\/\*[\s\S]*?\*\//g, '')), 'card row shows no price');
});

test('load/save round trip and broken storage never throws', () => {
    const st = mem();
    assert.deepEqual(C.load(st), { days: {} });
    C.save(C.add({ days: {} }, { barcode: '9', name: 'Z' }, Date.now()), st);
    assert.equal(C.today(C.load(st)).length, 1);
    st.setItem(C.KEY, '{broken');
    assert.deepEqual(C.load(st), { days: {} });
});

test('words in en/de/es', () => {
    for (const k of Object.keys(C.TX)) assert.equal(C.TX[k].length, 3, k);
    assert.equal(C.tx('add', 0), 'Add to bucket');
    assert.equal(C.tx('skip', 1), 'Überspringen');
    assert.equal(C.tx('countN', 2, 3), '3 productos hoy');
});

test('wired in: product check card asks LowiBucket (not the Log meal scan), files loaded and cached offline, brand colours only', () => {
    const html = read('index.html');
    assert.match(html, /const gb = !logging && window\.LowiBucket \? LowiBucket\.rowHTML\(p\) : "";/);
    assert.match(html, /<script src="grocery-bucket-core\.js\?v=[^"]+"><\/script>\s*<script src="grocery-bucket\.js\?v=/);
    assert.match(html, /<link rel="stylesheet" href="grocery-bucket\.css\?v=/);
    const sw = read('sw.js');
    for (const f of ['grocery-bucket-core.js', 'grocery-bucket.js', 'grocery-bucket.css']) assert.ok(sw.includes('"' + f + '"'), f + ' in sw.js');
    const css = read('grocery-bucket.css');
    assert.ok(!/#(4458d0|8b5cf6|7c3aed|a855f7|22c55e|10b981|34c759)/i.test(css), 'no violet or green');
});
