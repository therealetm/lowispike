'use strict';
/* Code error sweep 23 Oct 2026: on Move, open Milestones (a legacy #sheetwrap sheet via LowiHost.openSheet), then swipe back
   (Safari) or press the phone's back button: the sheet closed AND Move closed to Home, because nothing closed #sheetwrap on
   Escape (back sends Escape) so section-nav fell back to close(). Escape now closes #sheetwrap when it is the top layer, and
   never when another layer sits above it. Runs the real block from index.html. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function block() {
    const m = html.match(/\/\* sheetwrap-escape:[\s\S]*?\/\* \/sheetwrap-escape \*\//);
    assert.ok(m, 'index.html has the sheetwrap-escape block');
    return m[0];
}

function make({ above = false } = {}) {
    const cls = new Set(['open']);
    const wrap = { classList: { contains: c => cls.has(c), remove: c => cls.delete(c), add: c => cls.add(c) } };
    const L = { cap: [], bub: [] };
    const st = { closes: 0, queries: [] };
    const document = {
        getElementById: id => (id === 'sheetwrap' ? wrap : null),
        querySelector: q => { st.queries.push(q); return above ? {} : null; },
    };
    const ctx = {
        document,
        addEventListener: (t, f, cap) => { if (t === 'keydown') (cap ? L.cap : L.bub).push(f); },
        closeSheet: () => { st.closes++; cls.delete('open'); },
    };
    vm.createContext(ctx);
    vm.runInContext(block(), ctx);
    const key = (k, { prevented = false } = {}) => {
        const e = { key: k, defaultPrevented: prevented, preventDefault() { this.defaultPrevented = true; } };
        L.cap.forEach(f => f(e));
        if (prevented) e.defaultPrevented = true;
        L.bub.forEach(f => f(e));
        return e;
    };
    return { st, key, isOpen: () => cls.has('open') };
}

test('Escape closes the legacy sheet when it is the top layer (back no longer leaves Move)', () => {
    const t = make();
    const e = t.key('Escape');
    assert.strictEqual(t.isOpen(), false);
    assert.strictEqual(t.st.closes, 1);
    assert.strictEqual(e.defaultPrevented, true);
});

test('Escape leaves the legacy sheet alone while another layer sits above it', () => {
    const t = make({ above: true });
    t.key('Escape');
    assert.strictEqual(t.isOpen(), true);
    assert.strictEqual(t.st.closes, 0);
});

test('an Escape another handler already took does not close the sheet too', () => {
    const t = make();
    t.key('Escape', { prevented: true });
    assert.strictEqual(t.isOpen(), true);
});

test('other keys do nothing', () => {
    const t = make();
    t.key('Enter');
    assert.strictEqual(t.isOpen(), true);
    assert.strictEqual(t.st.queries.length, 0);
});

test('the layer check is taken in the capture phase, before any Escape handler closes its own layer', () => {
    const b = block();
    assert.match(b, /addEventListener\("keydown"[\s\S]*?\}, true\);/);
    assert.match(b, /\.r2-ov\.on:not\(\.off\)/);
});
