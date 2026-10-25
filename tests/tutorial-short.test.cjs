/* tests/tutorial-short.test.cjs: the short auto-demo tour (Oct 25 2026). Emmanuel: at most 12 cards, one short sentence each, a brown
   finger shows each gesture on the real control and the real page opens, it moves on by itself with the speaker off, Scan shows a
   pretend verdict without the camera question, and after the first finished tour Misty flies once (per account) to the edge. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = require('../tutorial-steps.js');
const LANGS = ['en', 'de', 'es'];
const code = f => read(f).replace(/\/\*[\s\S]*?\*\//g, '');

test('the base tour is the short one: these cards, in this order, never more than MAX_BASE (12)', () => {
    assert.strictEqual(S.MAX_BASE, 12);
    assert.deepStrictEqual(S.plan({}).map(s => s.id), ['hello', 'gap', 'fuel', 'water', 'move', 'sleep', 'scan', 'community', 'settings', 'fly', 'done']);
    assert.deepStrictEqual(S.plan({ claimReady: true }).map(s => s.id)[0], 'claim', 'a standard-Misty account first claims its own companion');
    assert.ok(S.plan({ claimReady: true }).length <= S.MAX_BASE);
});

test('every base card is one short sentence with a title, in English, German and Spanish', () => {
    for (const s of S.plan({ claimReady: true })) for (const l of LANGS) {
        assert.ok(s.title[l] && s.title[l].length <= 32, s.id + '/' + l + ' title');
        assert.ok(s.text[l].length <= 120, s.id + '/' + l + ' too long: ' + s.text[l]);
        assert.ok((s.text[l].match(/[.!?](\s|$)/g) || []).length <= 1, s.id + '/' + l + ' more than one sentence: ' + s.text[l]);
    }
});

test('What\'s New cards stay out of the base tour', () => {
    assert.ok(S.STEPS.some(s => s.area === 'new'));
    for (const s of S.plan({ claimReady: true })) assert.notStrictEqual(s.area, 'new', s.id);
    assert.ok(!S.plan({ claimReady: true }).some(s => /^new-/.test(s.id)));
});

test('every demo opens a page tutorial.js knows how to open AND close', () => {
    /* routes are either a literal { stage, go, back } or made by the bloom(k) factory, which itself has stage, go and back */
    const js = read('tutorial.js');
    assert.match(js, /const bloom = k => \(\{ stage: '[^']+', go: [\s\S]*?back: /, 'the bloom route factory has a stage, go and back');
    for (const s of S.base().filter(x => x.demo && x.demo.open)) {
        const lit = new RegExp("'" + s.demo.open + "': \\{ stage: '[^']*', go[:(][\\s\\S]*?back[:(]").test(js);
        const fac = new RegExp("'" + s.demo.open + "': bloom\\('[a-z]+'\\)").test(js);
        assert.ok(lit || fac, s.id + ': route ' + s.demo.open + ' has a stage, go and back');
    }
});

test('the finger is the medium-dark brown hand and only draws: no storage, no clicks, no camera', () => {
    assert.match(read('tutorial-demo.css'), /--lt-skin: #8d5524; --lt-skin-shade: #6a3b17;/);
    const d = code('tutorial-demo.js');
    assert.ok(!/localStorage|\.click\(\)|dispatchEvent|getUserMedia|mediaDevices/.test(d));
    assert.match(d, /scanOpen/);
});

test('auto-advance never waits for a voice that never plays: the reading timer starts on its own and the tour moves on', () => {
    const js = read('tutorial.js');
    assert.match(js, /function readMs\(s\)/);
    assert.match(js, /readDone = at; demoGo\(\);/);
    assert.ok(!/voiceEnd[\s\S]{0,80}then\(demoGo\)/.test(js), 'demoGo is not chained to the clip ending');
});

test('the card gets fully out of the way of the page it opened: the sheet is capped below it, blooms get the free band', () => {
    const js = read('tutorial.js');
    assert.match(js, /function sized\(el, px\)/);
    assert.match(js, /el\.style\.setProperty\('max-height', sizedPx \+ 'px', 'important'\)/, 'inline important beats the r2 sheets\' own max-height');
    assert.match(js, /over \* \(centred \? 2 : 1\)/, 'a centred sheet loses the overlap twice');
    assert.match(js, /function stageBoxes\(\)/);
    assert.match(js, /where = \(vh - sab - bot\) > \(top - sat\) \? 'bottom' : 'top';/);
    assert.match(read('tutorial-demo.css'), /\.lt-tour\.lt-staged \.lt-card \{ z-index: 4; transition: none; animation: lt-fade \.22s ease \.45s both; \}/, 'no slide across the page; fades in after it opened');
});

test('a sheet that is already closing does not hide the next card (the You sheet takes 4.6 s to animate out)', () => {
    const js = read('tutorial.js');
    assert.match(js, /const closing = el => \{ try \{ return !!\(el\.closest\('\.r2-ov\.off'\)/);
    assert.match(js, /mine = el => !!\(el\.closest\(OWN\) \|\| \(stg && el\.closest\(stg\)\) \|\| closing\(el\)\)/);
});

test('the first flight: once per account (a synced key), real autopilot to a cell world, the edge and home on the currents; any touch hands back', () => {
    const f = read('tutorial-flight.js');
    assert.match(f, /KEY = 'lowispike\.first-flight\.v1'/);
    assert.ok(require('../account-sync-core.js').synced('lowispike.first-flight.v1'), 'lowispike.* is synced, so the iPad does not fly again');
    assert.match(f, /pointerdown/, 'any touch takes control');
    assert.match(f, /cell/i); assert.match(f, /edge/i); assert.match(f, /current/i);
    /* loaded by tutorial.js (like tutorial-auto/voice/show/resume), so index.html's versioned script list stays untouched */
    assert.match(read('tutorial.js'), /\['tutorial-demo\.js', 'tutorial-flight\.js'\]\.forEach\(f => \{ if \(!D\.querySelector\('script\[src\^="' \+ f/);
});

test('the short tour ships offline and its voice clips are recorded for every base card', () => {
    const sw = read('sw.js');
    for (const f of ['tutorial-demo.js', 'tutorial-demo.css', 'tutorial-flight.js', 'tutorial-img/scan-sample.webp']) assert.ok(sw.includes('"' + f + '"'), f + ' cached');
    for (const s of S.plan({ claimReady: true })) for (const l of LANGS) {
        const dir = fs.readdirSync(path.join(ROOT, 'tutorial-voice', l));
        assert.ok(dir.some(x => x === s.id + '.mp3' || x.startsWith(s.id + '~')), s.id + '/' + l + ' clip');
    }
});
