'use strict';
/* Oct 27 2026, Emmanuel (voice, two screenshots of the German catch-up): "update this section ... the recap. Cuz the UI looks bad.
   Even the end. It's just everything is so big and bulky. And not iOS 17 aesthetic. And some buttons we can't even see nor click
   on it." His end screen showed "★ 49 Punkte" in the bar over a "59 Punkte" total, the companion's words sitting on "Neu anfangen",
   and "Sweet potato with beef stew" in English on the German screen. These tests hold the fixes; the real layout check (boxes,
   tap at centre, nothing covered at iPhone / SE / iPad) is tools/catchup-ios17/probe.cjs and tests/evening-catchup-live.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../evening-catchup-core.js');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'evening-catchup.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'evening-catchup.css'), 'utf8');
const rule = sel => { const m = css.match(new RegExp('(^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m ? m[2] : ''; };

function fnSrc(name) {
    const start = js.indexOf('    function ' + name + '(');
    assert.ok(start > 0, name + ' not found');
    const end = js.indexOf('\n    }\n', start);
    return js.slice(start, end + 6);
}

test('the bar shows the same points as the read-back total (the 49 vs 59 bug)', () => {
    const picks = [
        { slot: 'breakfast', label: 'Joghurt mit Beeren', data: { t: 'Joghurt mit Beeren', lvl: 'low' } },
        { slot: 'lunch', label: 'Phở', data: { t: 'Phở', lvl: 'high' } },
        { slot: 'dinner', label: 'Sweet potato with beef stew', data: { t: 'Sweet potato with beef stew', lvl: 'low' } },
        { slot: 'water', cups: 4 }
    ];
    const day = C.dayKey(Date.now());
    const make = view => new Function('C', 'st', 'S', 'today', 'ctx', fnSrc('points') + '\nreturn points();')(C, { view, picks, earned: 61 }, () => ({ ledger: [] }), () => day, () => ({}));
    const pv = C.preview(picks, {});
    assert.ok(C.bonusDue(picks, [], day), 'fixture earns the whole-day bonus');
    const total = C.total(pv, true);
    assert.equal(make('review'), total, 'bar on the read-back = total with the bonus');
    assert.equal(make('review') - make('choices'), C.BONUS.xp, 'while picking, the bonus is not counted yet');
    assert.equal(make('finish'), 61, 'on the finish the bar shows the points really earned');
    // the read-back total uses the very same sum
    assert.match(fnSrc('viewReview'), /const bonus = C\.bonusDue\(st\.picks, S\(\)\.ledger \|\| \[\], today\(\)\), sum = C\.total\(pv, bonus\);/);
    assert.match(fnSrc('points'), /C\.total\(C\.preview\(st\.picks, ctx\(\)\), st\.view === 'review' && C\.bonusDue\(st\.picks, S\(\)\.ledger \|\| \[\], today\(\)\)\)/);
    assert.match(fnSrc('viewFinish'), /st\.earned = \+earned \|\| 0/);
});

test('the companion and its words can never sit on a button: one column in normal flow, buttons in their own foot', () => {
    // the overlay is a flex column: top bar, stage, companion row, foot, in that order, all direct children
    assert.match(rule('.ec-ov'), /display: flex; flex-direction: column/);
    const open = fnSrc('open');
    const order = ['class="ec-top"', 'class="ec-stage"', 'class="ec-palrow"', 'class="ec-foot"'].map(s => open.indexOf(s));
    assert.ok(order.every(i => i > 0), 'all four parts are built');
    assert.deepEqual([...order].sort((a, b) => a - b), order, 'top, stage, companion row, foot in that order');
    assert.match(open, /<div class="ec-palrow"><div class="ec-pal"[^>]*>' \+ companionHTML\(\) \+ '<\/div><p class="ec-say"[^>]*><\/p><\/div>/, 'the companion and its words live inside the row');
    // none of them is lifted out of the flow
    for (const sel of ['.ec-palrow', '.ec-pal', '.ec-say', '.ec-foot', '.ec-stage', '.ec-top']) {
        const r = rule(sel);
        assert.ok(r, sel + ' has a rule');
        assert.doesNotMatch(r, /position: (absolute|fixed)/, sel + ' must stay in the flow');
    }
    assert.doesNotMatch(css, /\.ec-(say|pal)[^{]*\{[^}]*position: (absolute|fixed)/, 'no other rule lifts the companion or its words');
    assert.match(rule('.ec-palrow'), /pointer-events: none/, 'the row never eats a tap');
    assert.match(rule('.ec-foot'), /flex: none/);
    assert.match(rule('.ec-stage'), /flex: 1 1 auto;[^}]*min-height: 0; overflow-y: auto/, 'a long read-back scrolls inside the stage');
    // the read-back puts Save and Start over in the foot, never in the scrolling stage
    const rv = fnSrc('viewReview');
    const stageHtml = rv.slice(rv.indexOf("stage('<div class=\"ec-rv\">"), rv.indexOf("'review',\n", rv.indexOf("stage('<div class=\"ec-rv\">")));
    assert.ok(stageHtml.length > 50);
    assert.doesNotMatch(stageHtml, /data-ec="(save|again)"/, 'Save / Start over are not in the stage');
    const footHtml = rv.slice(rv.indexOf("'review',\n", rv.indexOf("stage('<div class=\"ec-rv\">")));
    assert.match(footHtml, /data-ec="save"/); assert.match(footHtml, /data-ec="again"/);
    assert.match(fnSrc('stage'), /ft\.innerHTML = foot \|\| ''; ft\.classList\.toggle\('on', !!foot\)/);
});

test('no row cut off under the bar: the stage centres with auto margins, not justify-content: center', () => {
    const r = rule('.ec-stage');
    assert.match(r, /justify-content: flex-start/);
    assert.match(css, /\.ec-stage > :first-child \{ margin-top: auto; \}/);
    assert.match(css, /\.ec-stage > :last-child \{ margin-bottom: auto; \}/);
    assert.match(fnSrc('stage'), /s\.scrollTop = 0;/);
});

test('iOS 17 sizes: compact bar, 44pt targets, nothing oversized, one-line rows', () => {
    assert.match(rule('.ec-top'), /min-height: 44px/);
    assert.match(rule('.ec-pts'), /height: 30px;[^}]*font-size: 15px/);
    assert.match(rule('.ec-x'), /width: 44px; height: 44px/);
    assert.match(rule('.ec-big'), /min-height: 50px;[^}]*font-size: 17px; font-weight: 600/);
    assert.match(rule('.ec-soft'), /min-height: 44px;[^}]*font-size: 17px/);
    assert.match(rule('.ec-opt'), /min-height: 52px;[^}]*font-size: 17px/);
    const bub = +(rule('.ec-bubble').match(/width: (\d+)px/) || [])[1];
    assert.ok(bub >= 100 && bub <= 160, 'step bubble is compact: ' + bub);
    assert.match(rule('.ec-bname'), /font-size: 28px/);
    assert.match(rule('.ec-l-w'), /font-size: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap/);
    assert.match(rule('.ec-list li'), /min-height: 52px/);
    // the old bulky sizes are gone
    assert.doesNotMatch(css, /min-height: (72|76)px/);
    assert.doesNotMatch(css, /font-size: (40|46|48|52)px/);
    // the app's deep blue glass over the world, not the separate purple sky
    assert.doesNotMatch(css, /\.ec-sky/);
    assert.doesNotMatch(js, /ec-sky/);
    assert.match(rule('.ec-ov'), /backdrop-filter: blur\(26px\)/);
    assert.match(rule('.ec-big'), /background: #0a84ff/, 'primary uses the app accent blue');
    // Reduce Motion
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('meal names follow the app language when the whole name is known; her own words stay', () => {
    assert.equal(C.mealName('Sweet potato with beef stew', 'de'), 'Süßkartoffel mit Rindereintopf');
    assert.equal(C.mealName('Sweet potato with beef stew', 'es'), 'Boniato con estofado de ternera');
    assert.equal(C.mealName('Joghurt mit Beeren', 'en'), 'Yogurt with berries');
    assert.equal(C.mealName('Joghurt mit Beeren', 'de'), 'Joghurt mit Beeren');
    assert.equal(C.mealName('Chicken, rice and broccoli', 'de'), 'Hähnchen, Reis und Brokkoli');
    assert.equal(C.mealName('Phở', 'de'), 'Phở');
    assert.equal(C.mealName('Phở with beef', 'de'), 'Phở with beef', 'one unknown part: left exactly as typed');
    assert.equal(C.mealName('my grandma soup', 'de'), 'my grandma soup');
    assert.equal(C.mealName('', 'de'), '');
    // the read-back line uses it; drinks and walks keep their own words
    const rows = C.summary([{ slot: 'dinner', label: 'Sweet potato with beef stew', data: { t: 'Sweet potato with beef stew' } }], 'de');
    assert.equal(rows[0].what, 'Süßkartoffel mit Rindereintopf');
    // her usual meal on the choices screen too
    assert.match(fs.readFileSync(path.join(root, 'evening-catchup-core.js'), 'utf8'), /label: mealName\(u\.t, l\)/);
    // every table row has all three languages
    C.DISHES.forEach(r => { assert.equal(r.length, 3); r.forEach(n => assert.ok(n && n.trim() === n)); });
});

test('the step number sits in the bar, the bar dots finish on the read-back, Total is translated', () => {
    assert.match(fnSrc('paintTop'), /C\.fill\(t\(\)\.step, \{ i: st\.i \+ 1, n \}\)/);
    assert.doesNotMatch(fnSrc('viewBubble'), /ec-step"/);
    ['en', 'de', 'es'].forEach(l => assert.ok(C.tx(l).total, 'total in ' + l));
    assert.equal(C.tx('de').total, 'Gesamt');
    assert.equal(C.tx('de').spike, 'wahrscheinlich Blutzuckerspitze');
});
