'use strict';
/* Oct 21, 2026 (Eman, on the Cook screen: "The What can I buy emergency button already exists in the homepage, right? Does it make
   sense to also have it in there again? If not, remove it."). "What can I buy here?" has exactly one entry point in the whole app:
   the Shop orb in Home's Fuel bubble (home-blooms-v2.js). Cook, the shopping list, the cart and the Meals sheets carry no card. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const { list } = require('../scripts/site-files.cjs');
const code = list(root).filter(f => /\.(js|html|css)$/.test(f) && !f.startsWith('data/')).map(f => ({ f, s: fs.readFileSync(path.join(root, f), 'utf8') }));

test('the panel is opened from exactly one place in the app: Home\'s Fuel bubble Shop orb', () => {
    const calls = [];
    code.forEach(({ f, s }) => { const m = s.match(/LowiStorePicks\.open\(/g); if (m) m.forEach(() => calls.push(f)); });
    /* Oct 28 slim structure, batch 3: a tap on Fuel opens the nutrition hub (gap-view.js), whose "Einkaufen" button is the tap
       path now; the Fuel bloom's Shop orb stays in code for open('fuel') callers */
    assert.deepEqual(calls, ['gap-view.js', 'home-blooms-v2.js'], 'LowiStorePicks.open( callers: ' + calls.join(', '));
    const hb = code.find(x => x.f === 'home-blooms-v2.js').s;
    assert.match(hb, /kind === 'fuel'[\s\S]{0,400}id: 'shop'[\s\S]{0,300}LowiStorePicks\.open\('home-bloom'\)/, 'the Shop orb sits in the Fuel bubble');
});

test('no injected "What can I buy here?" card anywhere, Cook included', () => {
    code.forEach(({ f, s }) => {
        assert.doesNotMatch(s, /stp-sos["' ]|\.stp-sos\s*[{:,]|stp-sos-dot|data-stp-open|sosHTML/, f + ' still has the emergency card');
    });
    const sp = code.find(x => x.f === 'store-picks.js').s;
    assert.doesNotMatch(sp, /#csHub|\.ss-entry|wme-log|MutationObserver/, 'store-picks.js no longer decorates other screens');
    assert.doesNotMatch(sp, /sosHTML/, 'no card markup is exported');
});

test('the words "What can I buy here?" only live in the panel itself, never in Cook or the tutorial', () => {
    const re = /What can I buy here\?|Was kann ich hier kaufen\?|¿Qué puedo comprar aquí\?/;
    const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
    const hits = code.filter(({ s }) => re.test(noComments(s))).map(x => x.f);
    assert.deepEqual(hits, ['store-picks.js'], 'unexpected: ' + hits.join(', '));
    const html = code.find(x => x.f === 'index.html').s;
    const hub = html.slice(html.indexOf('id="csHub"'), html.indexOf('id="csHub"') + 600);
    assert.ok(hub.length > 0 && !re.test(hub), 'the Cook hub has Cook it / Shop it only');
    assert.doesNotMatch(code.find(x => x.f === 'tutorial-steps.js').s, re, 'no tutorial step points at a Cook card');
});
