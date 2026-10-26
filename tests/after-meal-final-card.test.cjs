/* Bug hunt round 29 (Oct 26 2026): the after-meal card's closing card ("Secret achievement unlocked" for 9 s, or "Done" for 4.5 s)
   stayed on top of a sheet or another page opened while it showed. finish() stops the card's loop, and the loop was the only thing
   that hid the card for a sheet; the card sits at z-index 2147480800, so on a simulated iPhone it covered the bottom of Gap for the
   full 9 s. Now the closing card hides while something blocks it and comes back when that closes, until its timer removes it.
   Runs the real paintFinal / remove from after-meal-checklist.js against tiny stand-ins. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'after-meal-checklist.js'), 'utf8');

function fnText(name) {
    const i = src.indexOf('    function ' + name + '(');
    assert.ok(i >= 0, name + ' exists');
    let j = src.indexOf('{', i), depth = 0, k = j;
    for (; k < src.length; k++) { const c = src[k]; if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) break; } }
    return src.slice(i, k + 1);
}

function harness() {
    const timers = []; let now = 0, seq = 0;
    const add = (fn, ms, every) => { const id = ++seq; timers.push({ id, fn, at: now + ms, every: every ? ms : 0 }); return id; };
    const clear = id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); };
    const advance = ms => { const end = now + ms; for (;;) { timers.sort((a, b) => a.at - b.at); const t = timers[0]; if (!t || t.at > end) break; now = t.at; if (t.every) t.at += t.every; else timers.shift(); t.fn(); } now = end; };
    const st = { blocker: '' };
    const card = { hidden: false, isConnected: true, innerHTML: '', cls: new Set(['pmc']), classList: null, remove() { this.isConnected = false; } };
    card.classList = { add: c => card.cls.add(c), remove: c => card.cls.delete(c), contains: c => card.cls.has(c) };
    /* hideT / finT are declared by the card's own `let` line, so the real initial values are used */
    const lets = (src.match(/\n    let P = null[^\n]*/) || [''])[0].replace(/^\n\s*/, '').replace(/P = null, el = null,/, '');
    const body = 'let el = card; ' + lets + '\n' + fnText('remove') + '\n' + fnText('paintFinal') +
        '\nreturn { paintFinal, remove, el: () => el };';
    const make = new Function('card', 'blocked', 's', 'esc', 'ICON', 'C', 'prog', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'foldT', body);
    const api = make(card, () => !!st.blocker, k => k, x => String(x), { star: '*', x: 'x', tick: 'v' }, { ACH: { xp: 20 } }, () => '4/4',
        (f, ms) => add(f, ms, false), clear, (f, ms) => add(f, ms, true), clear, 0);
    return { api, card, st, advance, timers };
}

test('the closing achievement card steps aside for a sheet opened while it shows, and comes back when it closes', () => {
    const h = harness();
    h.api.paintFinal(true);
    assert.ok(h.card.cls.has('fin'));
    assert.strictEqual(h.card.hidden, false, 'shown on a free screen');
    h.advance(1000); h.st.blocker = 'gvSheet'; h.advance(400);
    assert.strictEqual(h.card.hidden, true, 'Gap opened 1 s in: the card is not left on top of it');
    h.advance(3000);
    assert.strictEqual(h.card.hidden, true, 'still out of the way while Gap stays open');
    h.st.blocker = ''; h.advance(400);
    assert.strictEqual(h.card.hidden, false, 'Gap closed before the 9 s were up: the achievement shows again');
    h.advance(5000);
    assert.strictEqual(h.card.isConnected, false, 'removed by its own timer after 9 s');
    assert.strictEqual(h.timers.length, 0, 'no watcher left running after the card is gone');
});

test('the plain "Done" card also waits behind another page, and the x leaves no watcher behind', () => {
    const h = harness();
    h.st.blocker = 'tab:foryou';
    h.api.paintFinal(false);
    assert.strictEqual(h.card.hidden, true, 'painted while Community is open: it does not draw over Community');
    h.st.blocker = ''; h.advance(300);
    assert.strictEqual(h.card.hidden, false, 'back on Home inside its 4.5 s: shown');
    h.api.remove();
    assert.strictEqual(h.card.isConnected, false);
    assert.strictEqual(h.timers.length, 0, 'closing it with the x stops the watcher and the hide timer');
});
