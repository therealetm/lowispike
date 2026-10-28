'use strict';
/* Oct 24 2026 (Emmanuel, German Home screenshot of every secondary bubble at once: "some of them have repetitive two words in them",
   "some even have words that are way too long and big", "this also has to be minimal"; then: "Kochen" and "Rezepte" say the same
   thing, Schlucke should be sips, "like 10 sips", not milliliters, and every bubble one word so they look the same).
   Runs the real home-blooms-v2.js page part in a small fake window (node:vm) with every bloom's sources present, in EN / DE / ES:
   - every orb's bold line is ONE word (or one number with its unit held together by a non-breaking space);
   - a small second line only where it is a number (the step ranges, ten sips), never a second word, never ml;
   - no word repeats across a bloom's orbs ("letzte Nacht" x3, "Kochen" + "Rezepte");
   - one bloom = one type size (fitLabels applies the smallest size to all of them).
   Browser check: tools/check-bloom-labels.cjs (Chromium, German, every bloom at phone and iPad sizes). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'home-blooms-v2.js'), 'utf8');
const SLEEP = require('../home-settings-sleep-v2.js');
const MOVE = require('../move-estimate-core.js');
const K = require('../spirit-core.js');

function el(tag) {
    const attrs = {};
    const e = {
        tagName: String(tag || 'div').toUpperCase(), dataset: {}, style: { setProperty() { } }, classList: { add() { }, remove() { }, contains: () => false, toggle() { } },
        innerHTML: '', hidden: false, offsetWidth: 1, setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return k in attrs ? attrs[k] : null; },
        addEventListener() { }, removeEventListener() { }, querySelector() { return null; }, querySelectorAll() { return []; }, contains(x) { return x === e; },
        closest() { return null; }, appendChild(c) { return c; }, remove() { }, click() { }, focus() { },
        getBoundingClientRect() { return { left: 20, top: 380, width: 76, height: 76, right: 96, bottom: 456 }; }
    };
    return e;
}

function page(lang) {
    const D = el('html');
    Object.assign(D, {
        head: el('head'), body: el('body'), documentElement: Object.assign(el('html'), { lang }), currentScript: null,
        createElement: t => el(t), getElementById: () => null, querySelector: () => null, activeElement: null, dispatchEvent() { }
    });
    const W = {
        document: D, innerWidth: 390, innerHeight: 844, console, Date, Math, JSON, String, Array, Object, isFinite, setTimeout: f => { f(); return 0; }, clearTimeout() { },
        matchMedia: () => ({ matches: true }), CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
        addEventListener() { }, removeEventListener() { }, dispatchEvent() { }, localStorage: { getItem: () => null, setItem() { } }, navigator: {}
    };
    W.window = W;
    W.LowiSpirit = { meal() { }, water() { }, refresh() { } };
    W.LowiSpiritCore = K;
    W.LowiStorePicks = { open() { } };
    W.LowiHost = { go() { } };
    W.LowiMoveEstimateCore = MOVE;
    W.LowiMoveBubble = { pick() { }, view: () => null };
    W.LowiHomeSettingsSleepV2 = Object.assign({}, SLEEP, { sleep: { set() { }, today: () => null } });
    vm.createContext(W);
    vm.runInContext(SRC, W);
    const real = W.LowiHomeBloomsV2;
    real.mount(D);
    return k => JSON.parse(JSON.stringify(real.actions(k)));
}

const LANGS = ['en', 'de', 'es'];
/* Oct 28 2026 (same ring everywhere): Fuel is the Einkaufen bubble and brings no orbs (tests/ring-same-everywhere.test.cjs) */
const KINDS = ['water', 'move', 'sleep'];

test('every secondary bubble shows one word (or one number) in EN / DE / ES', () => {
    for (const lang of LANGS) {
        const actions = page(lang);
        for (const k of KINDS) {
            const A = actions(k);
            assert.ok(A.length >= 3, lang + ' ' + k + ' has its three orbs');
            for (const a of A) {
                /* a normal space would let the label break into two lines that read like two words */
                assert.ok(!/[ \t\n]/.test(a.label), lang + ' ' + k + ' ' + a.id + ' is one word: "' + a.label + '"');
                assert.ok(a.label.replace(/\u00a0/g, ' ').length <= 10, lang + ' ' + k + ' ' + a.id + ' short enough to stay big: ' + a.label);
            }
        }
    }
});

test('the small second line is a number only (steps, ten sips), never a second word and never ml', () => {
    for (const lang of LANGS) {
        const actions = page(lang);
        for (const k of KINDS) for (const a of actions(k)) {
            if (!a.sub) continue;
            /* Oct 24 (bottle size picker): Bottle's small line is its size in litres, a number with its unit symbol ("0,75 l") */
            if (k === 'water' && a.id === 'bottle') { assert.match(a.sub, /^\d+([.,]\d+)?\u00a0l$/, lang + ' bottle size: "' + a.sub + '"'); continue; }
            assert.match(a.sub, /^[<>\u00d7]?\d+k?(\u2013\d+k)?\+?$/, lang + ' ' + k + ' ' + a.id + ' subline is a number: "' + a.sub + '"');
            assert.doesNotMatch(a.sub, /ml/i, 'no milliliters on a bubble');
        }
        /* Fuel and Sleep have no subline at all ("Rezepte", "was kaufen?", "letzte Nacht" x3 are gone) */
        for (const k of ['sleep']) actions(k).forEach(a => assert.ok(!a.sub, lang + ' ' + k + ' ' + a.id + ' has no second line'));
        /* Water: Sips carries ten, Bottle its size (Oct 24, no size picked = 0.75 l); Glass no number. Oct 28: no Size orb any more
           (a long press on Bottle changes the size, tests/water-bottle-hold.test.cjs) */
        const w = actions('water');
        assert.deepStrictEqual(w.map(a => a.sub || ''), ['\u00d710', '', lang === 'en' ? '0.75\u00a0l' : '0,75\u00a0l'], lang + ' water sublines');
    }
});

test('the German bubbles are the words Emmanuel saw, made minimal', () => {
    const actions = page('de');
    assert.deepStrictEqual(actions('fuel'), [], 'no Einkaufen / Kochen / Mahlzeit orbs any more');
    assert.deepStrictEqual(actions('water').map(a => a.label), ['Sips', 'Glas', 'Flasche']); /* Oct 28: Gr\u00f6\u00dfe gone, long press on Flasche */
    assert.deepStrictEqual(actions('move').map(a => a.label), ['Locker', 'Stetig', 'Episch']);
    assert.deepStrictEqual(actions('move').map(a => a.sub), ['<5k', '5k\u201310k', '10k+']);
    assert.deepStrictEqual(actions('sleep').map(a => a.label.replace(/\u00a0/g, ' ')), ['<6 Std.', '6\u20137 Std.', '7 Std.+']);
});

test('no word repeats inside a bloom (no "letzte Nacht" three times, no Kochen + Rezepte)', () => {
    for (const lang of LANGS) {
        const actions = page(lang);
        for (const k of KINDS) {
            const words = [];
            actions(k).forEach(a => [a.label, a.sub || ''].join(' ').split(/[\s\u00a0]+/).filter(w => /\p{L}{3,}/u.test(w)).forEach(w => words.push(w.toLowerCase())));
            const dup = words.filter((w, i) => words.indexOf(w) !== i);
            /* the unit of the sleep ranges (h / Std.) is allowed: it is the number's unit, not a repeated word */
            assert.deepStrictEqual(dup.filter(w => !/^std\.?\+?$/.test(w)), [], lang + ' ' + k + ' repeats ' + dup.join(', '));
        }
    }
});

test('the full meaning stays for screen readers (aria-label), so nothing is lost by the shorter words', () => {
    const de = page('de');
    const aria = k => de(k).map(a => a.aria || '');
    assert.deepStrictEqual(aria('fuel'), []);
    assert.ok(aria('sleep').every(s => /letzte Nacht/.test(s)));
    assert.ok(aria('water')[0].includes('10 Schlucke'));
    assert.ok(aria('water').every(s => !/ml/.test(s)), 'no ml read out either');
});

test('Sips is ten sips: half a cup, honest XP, and the undo names it "10 sips"', () => {
    assert.strictEqual(K.waterAmount('sips'), 0.5);
    assert.strictEqual(K.waterXpDue(0.5, 0), 0, 'ten sips alone earn no XP yet');
    assert.strictEqual(K.waterXpDue(1, 0), 1, 'twenty sips complete a cup');
    const wh = fs.readFileSync(path.join(ROOT, 'world-home.js'), 'utf8');
    assert.ok(wh.includes("a === 0.5 ? T('10 sips', '10 Sips', '10 sorbos')"), 'undo toast says 10 sips');
    assert.ok(wh.includes("a === 0.25 ? T('a few sips', 'ein paar Schlucke', 'unos sorbos')"), 'old entries still undo by name');
    const steps = fs.readFileSync(path.join(ROOT, 'tutorial-steps.js'), 'utf8');
    assert.ok(steps.includes('10 sips, a glass') && steps.includes('10 Sips, ein Glas') && steps.includes('10 sorbos, un vaso'), 'the tutorial says ten sips too');
});

test('German says "Sips" where it names the water bubble (Emmanuel, Oct 24: "Sips", not "Schlucke")', () => {
    const sp = fs.readFileSync(path.join(ROOT, 'spirit.js'), 'utf8');
    assert.ok(sp.includes("'Zehn Sips, ungefähr. Jeder Sip füllt mich auf!'"), 'the companion reply says Sips');
    const show = fs.readFileSync(path.join(ROOT, 'tutorial-show.js'), 'utf8');
    assert.ok(show.includes("sips: 'Sips'") && !show.includes("sips: 'Schlucke'"), 'the tutorial water card shows Sips');
    const steps = fs.readFileSync(path.join(ROOT, 'tutorial-steps.js'), 'utf8');
    assert.ok(!steps.includes('10 Schlucke'), 'no 10 Schlucke left in the tour');
    assert.ok(!SRC.includes("T('Sips', 'Schlucke'"), 'the bubble label is Sips in German');
});

test('one bloom, one type size: fitLabels gives every orb the size the longest word needs', () => {
    const fit = SRC.slice(SRC.indexOf('function fitLabels('), SRC.indexOf('}', SRC.indexOf('bs.forEach(x =>')) + 2);
    assert.match(fit, /common = Math\.min\(common, size\)/);
    assert.match(fit, /bs\.forEach\(x => \{ if \(common < x\.base\) x\.b\.style\.fontSize = common \+ 'px'; \}\)/);
    assert.match(fit, /split\(\/\[ \\t\\n\]\+\/\)/, 'a non-breaking space keeps "6\u20137 Std." measured as one piece');
});
