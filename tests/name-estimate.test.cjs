/* Scanner by name (Oct 23, 2026): a product or food name gives the normal verdict, from the app's own food rules.
   Emmanuel: "If the app knows the name, it should still give an analysis. Typing Trauben or Erdbeere should give an
   analysis too." Later: his Maduritos (plantain chips) came out friendly; they must be Spike.
   rate() here is the Master Knowledge v3 policy (LowiFoodPolicy.rateName), the same one LowiDex.rateName holds in the app. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const N = require(path.join(root, 'name-estimate-core.js'));
const P = require(path.join(root, 'food-policy-core.js'));
const MAP = { JA: 'ok', SELTEN: 'better', NEIN: 'spike' };
const rate = q => { const r = P.rateName(q); return r && MAP[r.verdict] ? { verdict: MAP[r.verdict], why: ['policy'] } : null; };
const v = (name, opts) => { const r = N.estimate(name, Object.assign({ rate }, opts || {})); return r && r.verdict; };

test('Emmanuel\'s cases: Trauben = Spike, Erdbeeren = okay, Tafeltrauben = Spike, Plantain Chips = Spike', () => {
    assert.equal(v('Trauben'), 'spike');
    assert.equal(v('Erdbeeren'), 'ok');
    assert.equal(v('Tafeltrauben'), 'spike');
    assert.equal(v('Tafel-Trauben kernlos, Klasse I'), 'spike', 'the product he scanned (Eurogroup Italia, 8033803727241)');
    assert.equal(v('Plantain Chips'), 'spike');
});

test('singular, other languages and plantain names give the same verdict', () => {
    for (const n of ['Traube', 'Weintrauben', 'grapes', 'uvas']) assert.equal(v(n), 'spike', n);
    for (const n of ['Erdbeere', 'strawberries', 'fresas', 'Erdbeeren 500g Spanien']) assert.equal(v(n), 'ok', n);
    for (const n of ['Maduritos', 'Chifles', 'Tostones', 'Kochbanane']) assert.equal(v(n), 'spike', n);
});

test('a name check is always an estimate, medium confidence at best, and unknown names stay unknown', () => {
    const r = N.estimate('Trauben', { rate });
    assert.equal(r.est, true);
    assert.ok(['medium', 'low'].includes(r.nameEst.conf));
    assert.equal(N.estimate('xyzzy qwrt', { rate }), null);
    assert.equal(N.estimate('Trauben', {}), null, 'no rules, no guess');
    assert.equal(N.estimate('a', { rate }), null, 'too short');
});

test('strictest word wins: a friendly word never turns a spike word green', () => {
    const fake = q => ({ salat: { verdict: 'ok' }, croutons: { verdict: 'spike' } })[String(q).toLowerCase()] || null;
    assert.equal(N.estimate('Salat Croutons', { rate: fake }).verdict, 'spike');
    assert.equal(N.estimate('Croutons Salat', { rate: fake }).verdict, 'spike');
});

test('shop words and the brand are ignored, cherry tomatoes are tomatoes', () => {
    assert.equal(N.clean('Tafel-Trauben kernlos, Klasse I 500g', ''), 'trauben');
    assert.equal(N.clean('Milka Erdbeeren', 'Milka'), 'erdbeeren');
    assert.match(N.phrase('Cherry Rispentomaten'), /tomaten/);
});

test('the camera name field and the Analyze button are wired in the app, texts in EN, DE and ES', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.match(html, /name-estimate-core\.js/);
    assert.match(html, /LowiNameEstimate/);
    for (const k of ['analyse', 'analyseShort', 'typeName', 'typeHint', 'nodata', 'swap'])
        for (const l of ['en', 'de', 'es']) assert.ok(N.STR[l][k] && N.STR[l][k].trim(), l + ' ' + k);
});
