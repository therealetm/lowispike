'use strict';
/* Oct 28 2026 slim structure (S-02 deleted): holding Scan no longer opens the "Alle Blasen" overview (the ring already shows every
   bubble, a second way to the same bubbles). Before (Oct 24) a hold opened every bubble; now a hold is just a tap: it opens the one
   scanner, nothing is swallowed. The tutorial no longer teaches it; still no two-finger tap on the companion. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* load bloom-ring.js with its browser mount exported (a window without a document: nothing mounts by itself) */
function loadRing() {
    const had = Object.prototype.hasOwnProperty.call(global, 'window'), old = global.window;
    global.window = {};
    try { delete require.cache[require.resolve('../bloom-ring.js')]; return require('../bloom-ring.js'); }
    finally { if (had) global.window = old; else delete global.window; delete require.cache[require.resolve('../bloom-ring.js')]; }
}

function page() {
    const L = { win: {}, doc: {} }, add = store => (type, fn) => { (store[type] = store[type] || []).push(fn); };
    let now = 0, tid = 0, timers = [];
    const set = new Set(['o8', 'wh-home']);
    const H = { classList: { contains: c => set.has(c), add: c => set.add(c), remove: c => set.delete(c), toggle: (c, on) => { if (on) set.add(c); else set.delete(c); } } };
    const el = (orbit) => { const cls = new Set(); const e = { orbit, cls, classList: { toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); }, contains: c => cls.has(c) } };
        e.closest = sel => (sel.includes('data-orbit="' + orbit + '"') || (orbit === 'scan' && sel.includes('o8-scan'))) ? e : null; return e; };
    const scan = el('scan'), water = el('water'), empty = { closest: () => null };
    const misty = { id: 'spBubble', closest: sel => (sel.includes('spBubble') ? misty : null), getBoundingClientRect: () => ({ left: 145, top: 372, width: 100, height: 100 }) };
    const D = { documentElement: H, getElementById: id => (id === 'brCss' ? {} : id === 'spBubble' ? misty : null), querySelector: () => null, querySelectorAll: () => [], addEventListener: add(L.doc), head: { appendChild() { } } };
    const st = { all: false, opens: 0, closes: 0, scanOpened: 0, waterTapped: 0 };
    const W = {
        document: D, addEventListener: add(L.win), navigator: {},
        setTimeout: (fn, ms) => { const id = ++tid; timers.push({ id, fn, at: now + ms }); return id; },
        clearTimeout: id => { timers = timers.filter(t => t.id !== id); },
        LowiHomeBloomsV2: { openAll() { st.all = true; st.opens++; return true; }, isAll: () => st.all, close() { st.all = false; st.closes++; } }
    };
    const ev = (type, target, x, y) => ({ type, target, clientX: x || 100, clientY: y || 100, button: 0, isPrimary: true, cancelable: true, timeStamp: 1000 + now,
        prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = true; } });
    /* a browser's order: window capture, then document capture, then the button's own handler (home-orbit-v2.js tap -> open) */
    const fire = (type, target, x, y, extra) => {
        const e = Object.assign(ev(type, target, x, y), extra || {});
        for (const fn of (L.win[type] || [])) { if (e.stopped) break; fn(e); }
        for (const fn of (L.doc[type] || [])) { if (e.stopped) break; fn(e); }
        if (type === 'click' && !e.stopped) { if (target === scan) st.scanOpened++; if (target === water) st.waterTapped++; }
        return e;
    };
    const wait = ms => { now += ms; let due; while ((due = timers.filter(t => t.at <= now)).length) { timers = timers.filter(t => t.at > now); due.forEach(t => t.fn()); } };
    /* a finger: down, stay ms, up (touchend, then the click unless the touchend was cancelled, as on iOS) */
    const press = (target, ms, drift) => {
        fire('pointerdown', target, 100, 100);
        if (drift) fire('pointermove', target, 100 + drift, 100);
        wait(ms);
        fire('pointerup', target, 100 + (drift || 0), 100);
        const te = fire('touchend', target);
        const click = (drift && drift > 12) || te.prevented ? null : fire('click', target);
        return { touchendCancelled: te.prevented, click };
    };
    /* a busy page: time passes but no timer gets to run */
    const stall = ms => { now += ms; };
    return { W, D, H: set, st, scan, water, misty, empty, fire, wait, stall, press };
}
function mounted() { const R = loadRing(), p = page(); assert.strictEqual(typeof R.mount, 'function', 'mount is exported in a browser'); R.mount(p.W); return { R, p }; }

test('a normal tap on Scan opens Scan and nothing else', () => {
    const { p } = mounted();
    const r = p.press(p.scan, 150);
    assert.strictEqual(p.st.scanOpened, 1, 'Scan opened');
    assert.strictEqual(p.st.opens, 0, 'no bubbles opened');
    assert.strictEqual(r.touchendCancelled, false, 'the tap\'s click is not blocked');
});

test('S-02: holding Scan opens no bubble overview, the hold is just a tap that opens the one scanner', () => {
    const { R, p } = mounted();
    const r = p.press(p.scan, R.SCAN_HOLD_MS + 400);
    assert.strictEqual(p.st.opens, 0, 'no all-bubbles overview');
    assert.ok(!p.st.all);
    assert.strictEqual(r.touchendCancelled, false, 'nothing swallowed');
    assert.strictEqual(p.st.scanOpened, 1, 'Scan opened');
    assert.ok(!p.scan.cls.has('br-scan-holding'), 'no hold cue');
});

test('the old two-finger tap on Misty opens nothing either', () => {
    const { R, p } = mounted();
    const t1 = { identifier: 1, clientX: 180, clientY: 420 }, t2 = { identifier: 2, clientX: 210, clientY: 420 };
    p.fire('touchstart', p.misty, 180, 420, { touches: [t1] });
    p.fire('touchstart', p.misty, 210, 420, { touches: [t1, t2] });
    const end = p.fire('touchend', p.misty, 210, 420, { touches: [] });
    p.wait(1000);
    assert.strictEqual(p.st.opens, 0);
    assert.strictEqual(end.prevented, false);
    assert.strictEqual(R.isTwoFingerTap, undefined);
});

test('no long-press menu or callout on Scan', () => {
    const { p } = mounted();
    assert.ok(p.fire('contextmenu', p.scan).prevented, 'contextmenu on Scan is cancelled');
    assert.ok(!p.fire('contextmenu', p.empty).prevented, 'elsewhere it is left alone');
});

test('wiring: no hold listeners in bloom-ring.js, a tap on Scan still opens Scan', () => {
    const br = read('bloom-ring.js');
    assert.doesNotMatch(br, /D\.addEventListener\('pointerdown', onScanDown, true\)/);
    assert.doesNotMatch(br, /W\.addEventListener\('click', onScanClick, true\)/);
    assert.match(br, /S-02 deleted/);
    assert.match(read('home-orbit-v2.js'), /if \(key === 'scan'\) \{ open\('scan'\); return; \}/, 'a tap on Scan still opens Scan');
});

const T = require('../tutorial-steps.js');
const TWO_ON_ME = { en: /(tap|touch) me with two fingers/i, de: /mit zwei Fingern gleichzeitig an/i, es: /(tócame|toca a \w+) con dos dedos/i };

test('tutorial: no card teaches Hold Scan or a two-finger tap on the companion, in any language', () => {
    assert.ok(!T.STEPS.some(s => s.id === 'new-scan-hold'), 'the Hold Scan card is gone');
    assert.ok(!T.GESTURES.some(g => g.id === 'scan-hold'), 'no scan-hold gesture to teach');
    assert.ok(!T.STEPS.some(s => s.id === 'misty-two'), 'the Two fingers card is gone');
    for (const s of T.STEPS) for (const l of ['en', 'de', 'es']) {
        assert.doesNotMatch(s.text[l], TWO_ON_ME[l], s.id + '.' + l + ' teaches two fingers on the companion');
        assert.doesNotMatch(s.text[l], /hold Scan|Halt Scan|mantén pulsado Scan/i, s.id + '.' + l + ' teaches hold Scan');
    }
    const b = T.STEPS.find(x => x.id === 'scan');
    assert.ok(b && b.area !== 'new' && b.demo && b.demo.open === 'scan-demo', 'the base Scan card opens the pretend Scan');
});
