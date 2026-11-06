'use strict';
/* Nov 6 2026 design review point 7 (Emmanuel):
   - Supermarket: counters like "115 / 294" go; the screen only answers "What can I buy here?" (no count on a section heading, a
     category chip, the Left out heading, the Show more button, the line for a section where nothing passes, or in How the rating
     works)
   - Plan my week: past days disappear and Tonight is always on top (Thursday stood above Tonight); a week that is all behind you
     offers the next dinners
   - "Give a hand" / "Help out" is called Baskets / Körbe / Cestas everywhere; its tabs are Pay a basket / Korb bezahlen / Pagar una
     cesta and Share my basket / Korb teilen / Compartir mi cesta. The tutorial cards that name it say it too (clips re-recorded with
     tools/tutorial-voice/build.py, the approved voices).
   Browser walk (scratch, Chromium, local site, network blocked), recorded in DECISIONS.md. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SPC = require('../store-picks-core.js');
const WC = require('../week-basket-core.js');
const S = require('../tutorial-steps.js');
const sp = read('store-picks.js'), gb = read('gift-basket.js'), wb = read('week-basket.js');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('Supermarket: a section shows what you can buy, no counter anywhere on it', () => {
    const ctx = { C: SPC, open: {}, showFail: true, li: () => 1, T: (en, de) => de, esc: s => String(s), itemHTML: (it, f) => '<li' + (f ? ' class="out"' : '') + '>' + it.n + '</li>' };
    vm.createContext(ctx);
    vm.runInContext(fnSrc(sp, 'function groupHTML(g)') + '\n' + fnSrc(sp, 'function moreHTML(id, pg)'), ctx);
    const items = (n, p) => Array.from({ length: n }, (x, i) => ({ n: p + (i + 1) }));
    const h = ctx.groupHTML({ id: 'snacks', pass: items(115, 'Nuss '), fail: items(179, 'Chips '), unrated: 0 });
    assert.ok(h.startsWith('<section class="stp-group" id="stpg-snacks"><h4 class="stp-gh"><span aria-hidden="true">\u{1F95C}</span>Snacks &amp; Nüsse</h4>') ||
        h.startsWith('<section class="stp-group" id="stpg-snacks"><h4 class="stp-gh"><span aria-hidden="true">\u{1F95C}</span>Snacks & Nüsse</h4>'), h.slice(0, 160));
    const words = h.replace(/<li[^>]*>[^<]*<\/li>/g, '').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(words, /\d/, 'no number outside the products themselves: ' + words);
    assert.match(h, /<h5 class="stp-h5">Aussortiert<\/h5>/);
    assert.match(h, /data-stp-more="snacks" data-stp-ask="55">Mehr zeigen<\/button>/, 'a page at a time, the button says Show more');
    assert.equal((h.match(/<li>/g) || []).length, 15, 'the first page');
    const none = ctx.groupHTML({ id: 'snacks', pass: [], fail: items(3, 'Chips '), unrated: 0 });
    assert.match(none, /<p class="stp-none">Keins der Produkte hier besteht\.<\/p>/);
    assert.equal(ctx.groupHTML({ id: 'snacks', pass: [], fail: [], unrated: 0 }), '', 'an empty section is not drawn');
});

test('Supermarket: the category chips and How the rating works carry no counts either', () => {
    assert.match(sp, /split\(\/\[,&\]\| y \| und \/\)\[0\]\.trim\(\)\) \+ '<\/button>'\)\.join\(''\);/, 'a chip is its symbol and name');
    assert.ok(!/stp-sum|products pass|Produkten bestehen|without a label/.test(noComments(sp)), 'no "115 of 294 products pass" line');
    assert.match(sp, /'<details class="stp-how"><summary>' \+ esc\(T\('How the rating works', 'So wird bewertet', 'Cómo se valora'\)\) \+ '<\/summary><p>'/);
    assert.ok(!/\bfmt\b/.test(sp), 'no number formatting left in the Supermarket');
    assert.ok(!/\.stp-sum|\.stp-gh i|\.stp-chip i/.test(read('store-picks.css')), 'their styles went with them');
});

test('Plan my week: past days are gone, Tonight is on top', () => {
    const dl = WC.days('2026-11-05', 5); /* made on Thursday, five dinners */
    assert.deepEqual(WC.ahead(dl, '2026-11-06'), [1, 2, 3, 4], 'on Friday: Thursday is gone, Friday (Tonight) first');
    assert.deepEqual(WC.ahead(dl, '2026-11-05'), [0, 1, 2, 3, 4], 'the day it was made: all of it');
    assert.deepEqual(WC.ahead(dl, '2026-11-12'), [], 'a week behind you');
    assert.deepEqual(WC.ahead(null, '2026-11-06'), []);
    const wk = fnSrc(wb, 'function weekHTML(c)');
    assert.match(wk, /dl = C\.days\(S\.start, c\.dinners\.length\), up = C\.ahead\(dl, today\(\)\);/);
    assert.match(wk, /up\.map\(n => day\(c\.dinners\[n\], n\)\)/, 'each day keeps its place in the plan (Swap still swaps the right dinner)');
    assert.ok(!/c\.dinners\.map\(day\)/.test(wk), 'never every day of the plan');
    assert.match(wk, /'This week\\u2019s dinners are behind you\.', 'Die Abendessen dieser Woche sind vorbei\.', 'Las cenas de esta semana ya pasaron\.'/);
    assert.match(wk, /data-wb="new">' \+ T\('Plan the next dinners', 'N\\u00e4chste Abendessen planen', 'Planear las pr\\u00f3ximas cenas'\)/);
    assert.match(fnSrc(wb, 'function dayName(d)'), /if \(d\.date === today\(\)\) return T\('Tonight', 'Heute Abend', 'Esta noche'\);/);
});

test('Baskets / Körbe / Cestas everywhere, with the tabs Pay a basket and Share my basket', () => {
    assert.match(sp, /\(G \? b\('gift', '\\u\{1F91D\}', T\('Baskets', 'Körbe', 'Cestas'\)\) : ''\)/, 'the Einkaufen tab');
    assert.match(sp, /out\.push\(\{ id: 'gift', label: T\('Baskets', 'Körbe', 'Cestas'\), sub: T\('Help pay', 'Mitbezahlen', 'Ayuda a pagar'\) \}\)/, 'the Einkaufen bubble\'s door');
    assert.match(gb, /<h3 id="gb-title">\\u\{1F91D\} ' \+ esc\(T\('Baskets', 'Körbe', 'Cestas'\)\) \+ '<\/h3>'/);
    assert.match(gb, /tabBtn\('give', T\('Pay a basket', 'Korb bezahlen', 'Pagar una cesta'\)\) \+ tabBtn\('mine', T\('Share my basket', 'Korb teilen', 'Compartir mi cesta'\)\)/);
    assert.match(gb, /T\('Share my basket', 'Korb teilen', 'Compartir mi cesta'\)\) \+ '<\/button>'/, 'the cart\'s share button says the same');
    const OLD = /Give a hand|Help out|Hilf mit|Echa una mano|I could use a hand|Ich brauche Hilfe|Necesito ayuda|unter Helfen|en Ayudar/;
    for (const [f, s] of [['store-picks.js', sp], ['gift-basket.js', gb], ['tutorial-show.js', read('tutorial-show.js')]])
        assert.doesNotMatch(noComments(s), OLD, f + ' still shows the old name');
    for (const st of S.STEPS) {
        const said = [st.title && st.title.en, st.title && st.title.de, st.title && st.title.es].concat(st.text ? [st.text.en, st.text.de, st.text.es] : []).join(' | ');
        assert.doesNotMatch(said, OLD, 'tutorial card ' + st.id);
    }
    assert.match(read('tutorial-show.js'), /help: 'Baskets'[\s\S]*help: 'Körbe'[\s\S]*help: 'Cestas'/);
    global.window = undefined;
    const V = require('../tutorial-voice-data.js');
    for (const l of ['en', 'de', 'es']) for (const k of ['fuel', 'new-give-hand', 'new-cart-swipe', 'new-cart-ask'])
        assert.match(V.clips[l][k].s, l === 'en' ? /Baskets/ : l === 'de' ? /Körbe/ : /Cestas/, l + ' ' + k + ' is said with the new name');
});
