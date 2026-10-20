// galaxy-audit G-1 (Oct 20 2026). Holding Misty opens her card while the finger is still down; the click that follows the lift was
// hit-tested on whatever lay under the finger by then: the card's dimmed backdrop (so the card closed itself again) or a spot inside
// the card. Reproduced in Chromium with real touch (playtest/GALAXY-AUDIT-20261020.md, probe p8): R2.close called from the
// r2-scrim click 30 ms after the finger lifted. Not checked on a physical iPhone.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'world-home.js'), 'utf8');

function extract(name) {
    const i = src.indexOf('function ' + name + '('); assert.ok(i > 0, name + ' exists');
    let d = 0, j = src.indexOf('{', i);
    for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
}

function boot() {
    const L = { pointerdown: [], pointermove: [], pointerup: [], pointercancel: [], click: [], contextmenu: [] };
    const timers = []; let now = 0;
    const D = {
        addEventListener: (n, f) => { (L[n] = L[n] || []).push(f); },
        removeEventListener: (n, f) => { L[n] = (L[n] || []).filter(g => g !== f); }
    };
    const ctx = {
        D, H: { classList: { contains: c => c === 'wh-on' } }, st: {}, navigator: {}, Math,
        opened: 0, openMisty() { ctx.opened++; },
        setTimeout: (f, ms) => { timers.push({ f, at: now + ms }); return timers.length; }, clearTimeout: id => { if (id && timers[id - 1]) timers[id - 1].f = null; }
    };
    vm.runInNewContext(extract('wireMistyHold') + '; wireMistyHold();', ctx);
    const advance = ms => { now += ms; timers.forEach(t => { if (t.f && t.at <= now) { const f = t.f; t.f = null; f(); } }); };
    const misty = { closest: s => (s === '#spBubble' ? misty : null) };
    const fire = (n, e) => { const ev = Object.assign({ pointerId: 1, clientX: 100, clientY: 100, stopped: false, prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = true; } }, e); for (const f of [...(L[n] || [])]) { f(ev); if (ev.stopped) break; } return ev; };
    return { ctx, fire, advance, misty, L };
}

test('a hold that opened the card swallows the click of that lift, wherever it lands (backdrop, inside the card)', () => {
    for (const holdMs of [700, 1500, 3000]) {
        const b = boot();
        b.fire('pointerdown', { target: b.misty });
        b.advance(holdMs);
        assert.strictEqual(b.ctx.opened, 1, 'the card opened after the hold');
        b.fire('pointerup', { target: b.misty });
        const click = b.fire('click', { target: { closest: () => null, className: 'r2-scrim' } });
        assert.ok(click.stopped && click.prevented, 'the lift click never reaches the backdrop (held ' + holdMs + ' ms)');
        const next = b.fire('click', { target: { closest: () => null } });
        assert.ok(!next.stopped, 'only that one click is swallowed');
        assert.strictEqual(b.ctx.st.lpOpened, false);
    }
});

test('a short tap is not swallowed and does not open the card; a lift with no click un-arms after 1 s', () => {
    const b = boot();
    b.fire('pointerdown', { target: b.misty }); b.advance(120); b.fire('pointerup', { target: b.misty });
    assert.strictEqual(b.ctx.opened, 0);
    assert.ok(!b.fire('click', { target: b.misty }).stopped, 'a tap still pets Misty');
    const c = boot();
    c.fire('pointerdown', { target: c.misty }); c.advance(800); c.fire('pointerup', { target: c.misty });
    c.advance(600);
    assert.strictEqual(c.L.click.length, 1, 'still armed 600 ms after the lift');
    c.advance(500);
    assert.strictEqual(c.L.click.length, 0, 'the swallow listener is gone when no click came (iOS may send none)');
    assert.ok(!c.fire('click', { target: { closest: () => null } }).stopped, 'a later real tap goes through');
});

test('moving the finger cancels the hold, and a cancelled touch leaves nothing armed', () => {
    const b = boot();
    b.fire('pointerdown', { target: b.misty }); b.fire('pointermove', { clientX: 130, clientY: 100 }); b.advance(800);
    assert.strictEqual(b.ctx.opened, 0);
    const c = boot();
    c.fire('pointerdown', { target: c.misty }); c.advance(800); c.fire('pointercancel', {});
    assert.strictEqual(c.ctx.st.lpOpened, false); assert.strictEqual(c.L.click.length, 0);
});
