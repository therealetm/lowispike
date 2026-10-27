'use strict';
/* BH-059 (P-CLOSE-UNDER-FINGER siblings of BH-033/040): a button that CLOSES its sheet and opens the next thing 260 ms later
   (the newer Community profile card: Pick my type, Chat, Send care, Add my birthday; plus many R2 sheets: Edit, DM, Post, Room ...)
   uncovered the page under the finger. Live Chromium 390 (probe BUGHUNT/playtest/probe-cp-dbl.cjs): the 2nd tap of a double tap
   on "Pick my type" / "Send care" pressed the chat / galaxy under the profile card 118-356 ms later.
   R2.close and closeSheet now spend the real tap whose click closed them (fresh-scrim quiet(): same spot, 400 ms). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const lineOf = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head + ' exists'); return src.slice(i, src.indexOf('\n', i)); };

function freshScrim(clock) {
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => clock.t }, addEventListener() {}, MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body: { nodeType: 1 }, addEventListener() {} }, Date });
    return W.LowiFreshScrim;
}
const click = (clock, x, y, o = {}) => ({ type: o.type || 'click', isTrusted: o.isTrusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: clock.t, target: { closest: () => null } });

test('R2.close spends the tap first thing after it finds the overlay', () => {
    const src = read('index.html'), i = src.indexOf('R2.close = function(ov, how){'); assert.ok(i > 0);
    const head = src.slice(i, i + 260);
    assert.ok(/if \(i < 0\) return;\s*closeSpent\(\);/.test(head), 'R2.close calls closeSpent() once it has an overlay to close');
});

test('closeSpent spends a real click (the same spot is quiet for 400 ms) and nothing else', () => {
    const src = read('index.html'), fn = lineOf(src, 'function closeSpent(){');
    const clock = { t: 1000 }, F = freshScrim(clock), win = { LowiFreshScrim: F, event: undefined };
    const ctx = { window: win, LowiFreshScrim: F }; vm.runInNewContext(fn + '\nthis.closeSpent = closeSpent;', ctx);
    win.event = click(clock, 200, 600); ctx.closeSpent(); win.event = undefined;
    clock.t = 1150; assert.strictEqual(F.quiet(click(clock, 203, 598)), true, 'the 2nd tap of the double tap is swallowed');
    assert.strictEqual(F.quiet(click(clock, 200, 300)), false, 'a tap elsewhere works');
    assert.strictEqual(F.quiet(click(clock, 200, 600, { detail: 0 })), false, 'a keyboard press works');
    clock.t = 1500; assert.strictEqual(F.quiet(click(clock, 200, 600)), false, 'a slower 2nd tap works');
    /* a close from a timer, a script click or a pointerup spends nothing */
    const clock2 = { t: 5000 }, F2 = freshScrim(clock2), win2 = { LowiFreshScrim: F2 }, ctx2 = { window: win2, LowiFreshScrim: F2 };
    vm.runInNewContext(fn + '\nthis.closeSpent = closeSpent;', ctx2);
    ctx2.closeSpent(); win2.event = click(clock2, 200, 600, { isTrusted: false }); ctx2.closeSpent(); win2.event = click(clock2, 200, 600, { type: 'pointerup' }); ctx2.closeSpent();
    clock2.t = 5100; assert.strictEqual(F2.quiet(click(clock2, 200, 600)), false, 'nothing was spent');
    delete win2.LowiFreshScrim; win2.event = click(clock2, 1, 1); assert.doesNotThrow(() => ctx2.closeSpent(), 'no fresh-scrim: no throw');
});

test('closeSheet spends the closing tap only when the sheet was open', () => {
    const src = read('index.html'), fn = lineOf(src, 'function closeSheet(){');
    const clock = { t: 1000 }, F = freshScrim(clock);
    const w = { cls: new Set(['open']), classList: { contains: c => w.cls.has(c), remove: c => w.cls.delete(c) } };
    const win = { LowiFreshScrim: F };
    const ctx = { window: win, LowiFreshScrim: F, $: s => s === '#sheetwrap' ? w : {} };
    vm.runInNewContext(fn + '\nthis.closeSheet = closeSheet;', ctx);
    win.event = click(clock, 100, 700); ctx.closeSheet(); win.event = undefined;
    assert.strictEqual(w.cls.has('open'), false, 'still closes');
    clock.t = 1200; assert.strictEqual(F.quiet(click(clock, 100, 700)), true, 'the 2nd tap under the finger is swallowed');
    const clock2 = { t: 9000 }, F2 = freshScrim(clock2); ctx.window = { LowiFreshScrim: F2, event: click(clock2, 100, 700) }; ctx.LowiFreshScrim = F2;
    vm.runInNewContext('this.closeSheet = ' + fn.replace('function closeSheet', 'function'), ctx);
    ctx.closeSheet(); clock2.t = 9100; assert.strictEqual(F2.quiet(click(clock2, 100, 700)), false, 'an already-closed sheet spends nothing');
});
