/* Nov 5 2026 aura fit (owner on iPhone: "the aura I bought looks nothing like the preview, it sits inside the bubble", "can't even
   turn off the aura", "Misty has her own circle and then still a bubble around it"). Guards the fixes so they do not come back. */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('world-home.js'), css = R('world-home.css'), hub = R('misty-hub.js'), hubCss = R('misty-hub.css'), me = R('community-me.js'), mm = R('mirror-move.css');

test('Misty on her card does not use the class mirror-move.css moves 122px down', () => {
    assert.ok(/\.mh-misty\s*\{[^}]*top:[^;]*122px/.test(mm), 'premise: mirror-move.css owns .mh-misty');
    assert.ok(!/classList\.add\('mh-misty'\)/.test(hub));
    assert.ok(hub.includes("classList.add('mh-art-misty')"));
});

test('the aura list knows what you own (no "Morning dew: Active" beside the aura you bought)', () => {
    assert.ok(js.includes('items = C.auraItems(xp, auraId(), w)'));
    global.window = global; require('../world-home-core.js');
    const C = global.LowiWorldHomeCore;
    /* with the wallet the bought aura is the one worn, and no free glow says it is */
    assert.strictEqual(C.shopItems(5657, 'prism', { own: ['prism'] }).find(i => i.id === 'prism').status, 'on');
    assert.ok(!C.auraItems(5657, 'prism', { own: ['prism'] }).some(i => i.status === 'on'));
    /* without it (the old call) the bought aura fell back to Morning dew */
    assert.strictEqual(C.auraItems(5657, 'prism').find(i => i.id === 'dew').status, 'on');
});

test('one aura geometry: the band hugs her measured outline on Home and on card, sheet and preview', () => {
    assert.ok(js.includes('function measureReach()'));
    assert.ok(js.includes("H.style.setProperty('--wh-rb'") && js.includes("H.style.setProperty('--wh-rs'"));
    assert.ok(css.includes('html.wh-home #spHome #spBubble > .wh-fx { inset: calc(50% - var(--wh-rb, .75) * 69.35%); }'));
    assert.ok(css.includes('.wh-ms-stage .wh-fx { inset: calc(50% - var(--m) * var(--wh-rs, .85) * .5687); }'));
    assert.ok(hubCss.includes('.mh-art > .wh-fx { inset: calc(50% - var(--m) * var(--wh-rs, .85) * .5687); }'));
    /* Home no longer clips it at the bubble's edge */
    assert.ok(css.includes('html.wh-home #spHome #spBubble:has(> .wh-fx) { overflow: visible !important; }'));
    /* no ring of its own and galaxy is no longer a star field over her body */
    assert.ok(!/wh-fx-rim/.test(css + js + hub));
    assert.ok(!/\.wh-fx-galaxy\s*\{[^}]*inset:\s*16%/.test(css));
});

test('the shop preview stays visible inside her card', () => {
    assert.ok(hubCss.includes('.mh-sec .wh-ms-stage:not(.wh-pv-stage)'));
    assert.ok(!hubCss.includes('.mh-sec .wh-ms-stage, .mh-sec .wh-ms-id'));
});

test('no glass ring around Misty without the 3D world (Still galaxy): her cell wall is her one circle', () => {
    assert.ok(css.includes('html.wh-home:not(.wh-world-live) #spHome #spBubble { border-color: transparent !important; background: none !important; box-shadow: none !important; }'));
});

test('Settings > Aura switches it off and on, and wearing an aura turns it back on', () => {
    assert.ok(js.includes("const AURA_OFF_KEY = 'lowispike.aura.off'"));
    assert.ok(/auraOn, setAuraOn/.test(js));
    assert.ok(js.includes('const a = off ? C.aura(\'\') : C.aura(auraId());'));
    assert.ok(js.includes("const fx = off ? '' : (a.fx || '');"));
    assert.ok(js.includes('localStorage.removeItem(AURA_OFF_KEY); } catch (e) { }   /* wearing one'));
    assert.ok(/ids: \['sky', 'galaxyStill', 'aura',/.test(me)); /* Nov 5 2026 (test changed, why): the look row 'sky' replaced 'theme' */
    assert.ok(me.includes('data-cme="aura"') && me.includes("if (id === 'aura') { const Wh = root.LowiWorldHome; if (Wh && Wh.setAuraOn) Wh.setAuraOn(!Wh.auraOn());"));
    assert.ok(css.includes('html[data-wh-aura-off] .wh-fx:not(.wh-pv-stage .wh-fx) { display: none; }'));
});
