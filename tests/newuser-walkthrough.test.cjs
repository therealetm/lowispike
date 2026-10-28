'use strict';
/* Oct 19 new-user walkthrough (fresh profile, WebKit iPhone 13 + iPad): what a first-timer met that did not make sense. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../starter-core.js');

test('starter plan: the fasting goal follows the "Do you fast?" answer (never -> 12 h, 12 h -> 14, 16 h -> 16, longer -> 18)', () => {
    assert.equal(typeof C.fastTarget, 'function');
    assert.equal(C.fastTarget({ fast: 'never' }), 12);
    assert.equal(C.fastTarget({ fast: 'f12' }), 14);
    assert.equal(C.fastTarget({ fast: 'f16' }), 16);
    assert.equal(C.fastTarget({ fast: 'long' }), 18);
    assert.equal(C.fastTarget({}), null, 'skipped question keeps the timer default');
    assert.equal(C.fastTarget(null), null);
    /* every answer the plan can give maps to a target the Gap timer offers */
    const q = C.QUESTIONS.find(x => x.id === 'fast'); assert(q, 'fast question');
    const opts = (q.opts || q.options || []).map(o => o.v || o.id || o.value || o).filter(v => typeof v === 'string');
    for (const v of opts) if (v !== 'skip') assert([12, 14, 16, 18].includes(C.fastTarget({ fast: v })), v);
    /* and the plan's first fasting step agrees with the goal: "never" starts at 12 h */
    const html = read('index.html'); assert(/OPTS\s*=\s*\[[^\]]*12[^\]]*14[^\]]*16[^\]]*18/.test(html), 'Gap timer offers 12/14/16/18');
});

test('starter plan wiring: finishing the plan writes that goal into the Gap timer and repaints it', () => {
    const hs = read('herb-start.js');
    const i = hs.indexOf("if(a==='done')"); assert(i > 0);
    const done = hs.slice(i, i + 700);
    assert(/C\.fastTarget\(IV\.answers\)/.test(done), 'uses the answer');
    assert(/lowi_fast_v1/.test(done) && /\.target\s*=\s*ft/.test(done), 'writes target');
    assert(/LowiFast\.refresh\(\)/.test(done), 'repaints the Gap bubble');
});

test('onboarding names the bubbles the way the ring does: Fuel (not Meals), Gap for fasting, in EN/DE/ES', () => {
    const hs = read('herb-start.js');
    assert(!/like Meals or Move/.test(hs), 'old EN copy');
    /* Oct 21 (TikTok advice, simpler conversion): the how-you-play list left the start; the app teaches the bubbles itself */
    assert(!/play:\[/.test(hs), 'no how-you-play step before the account');
    assert(!/como Comidas o/.test(hs));
    assert(/'Fuel \(meals\)'/.test(hs) && /'Gap \(fasting\)'/.test(hs));
    assert(/'Pause \(Fasten\)'/.test(hs) && /'Pausa \(ayuno\)'/.test(hs));
    assert(!/'Shop & scan','Meals'/.test(hs));
    /* the ring labels those words point at */
    const css = read('home-orbit-v2.css');
    /* Oct 28 2026: the ring's Fuel bubble is the way into Einkaufen, so its label is Shopping / Einkaufen / Compras */
    for (const w of ['Shopping', 'Einkaufen', 'Compras', 'Gap', 'Pause', 'Pausa']) assert(css.includes("'" + w + "'"), w);
});

test('VoiceOver hears the Fuel bubble by its ring name, not "Meals"', () => {
    const sh = read('sym-home.js');
    assert(/const label = \(\) => T\('Fuel', 'Essen', 'Comida'\)/.test(sh));
    assert(!/T\('Meals', 'Essen', 'Comidas'\)/.test(sh));
});

test('first-timer hint "Drag to look around" docks to the top or bottom on the ring instead of never showing', () => {
    const wh = read('world-home.js');
    const i = wh.indexOf('const OBS ='); assert(i > 0, 'one obstacle list');
    const blk = wh.slice(i, i + 2200);
    assert(/\[data-orbit\]/.test(blk) && /#whPad/.test(blk), 'checks the ring bubbles and the joystick');
    assert(/wh-dock/.test(blk) && /innerHeight - hh - 28/.test(blk), 'tries top and bottom spots');
    assert(/if \(blk\) \{ h\.classList\.remove\('wh-dock'\)/.test(blk), 'still hides when neither spot is clear');
    assert(/\.wh-hint\.wh-say\.wh-dock::after\s*\{\s*display:\s*none/.test(read('world-home.css')), 'docked hint has no tail');
});

test('onboarding on short screens (Safari with toolbars): Misty and her speech bubble fit the scene, nothing spills over the back button', () => {
    const css = read('herb-start.css');
    const tail = css.slice(css.lastIndexOf('Oct 19 new-user walkthrough'));
    assert(/@media \(max-height:700px\)\{[^}]*\.hs-scene:not\(\.sm\)\{max-height:none/.test(tail), 'scene takes the free height');
    assert(/\.hs-misty:not\(\.mini\)\{--hs-m:min\(36vw,132px\)\}/.test(tail), 'Misty really shrinks at <=700px');
    assert(/@media \(max-height:600px\)/.test(tail));
    /* the later redesign rule that used to win must come before the fix */
    assert(css.indexOf('.hs-misty{--hs-m:min(46vw,184px)') < css.lastIndexOf('--hs-m:min(36vw,132px)'));
});

test('a build that goes live during setup waits: no "I\'ve got something new" update bubble over the birthday step or the starter plan', () => {
    const html = read('index.html');
    const m = html.match(/const setupBusy = \(\) => ([^;]+);/); assert(m, 'setupBusy() exists in the g1 update code');
    for (const k of ['gate-up', '#r2ob', '.hs-ivov.on']) assert(m[1].includes(k), 'setup includes ' + k);
    const i = html.indexOf('function decorate(){ const d = $("#lcUpd")'); assert(i > 0);
    const body = html.slice(i, html.indexOf('\n}\n', i));
    const hold = body.indexOf('if (setupBusy())'), show = body.indexOf('obShow({kind:"update"');
    assert(hold > 0 && show > hold, 'the hold comes before the update bubble is shown');
    assert(/if \(setupBusy\(\)\) \{ updHeld = true;[^}]*return; \}/.test(body), 'held update returns without showing or marking news seen');
    assert(/setInterval\(\(\) => \{ if \(updHeld && !document\.hidden && !setupBusy\(\)\) redeco\(\); \}, 1500\)/.test(html), 'a held update shows once setup closes');
});
