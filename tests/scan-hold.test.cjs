'use strict';
/* Hold Scan = every bubble at once (Oct 24 2026, Emmanuel: holding the Scan button on Home opens all the secondary bubbles at once;
   a normal tap on Scan keeps opening Scan, and a recognised hold must not also fire the tap. The tutorial taught an old gesture,
   two fingers on the companion; it now teaches hold Scan, in EN/DE/ES).
   - scanPress: the pure rule (hold = still for SCAN_HOLD_MS, a drift over SCAN_DRIFT px is a drag, anything shorter is a tap)
   - bloom-ring.js mounted on a small fake page, driven like a finger: tap opens Scan only; hold opens every bubble and swallows the
     click (and the iOS touchend) so Scan does not open; a drag does nothing; nothing off Home; hold again closes; a tap right
     after a hold still opens Scan; other buttons are untouched; no long-press menu on Scan
   - the tutorial: a Hold Scan card in every language, no card teaches a two-finger tap on the companion any more */
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

test('scanPress: still for SCAN_HOLD_MS is a hold, a drift is a drag, shorter is a tap', () => {
    const R = require('../bloom-ring.js');
    assert.ok(R.SCAN_HOLD_MS >= 350 && R.SCAN_HOLD_MS <= 700, 'a hold is about half a second (' + R.SCAN_HOLD_MS + ')');
    assert.strictEqual(R.scanPress({ held: 120, moved: 2 }), 'tap');
    assert.strictEqual(R.scanPress({ held: R.SCAN_HOLD_MS - 1, moved: 0 }), 'tap', 'just short of the hold is still a tap');
    assert.strictEqual(R.scanPress({ held: R.SCAN_HOLD_MS, moved: 4 }), 'hold');
    assert.strictEqual(R.scanPress({ held: 2000, moved: R.SCAN_DRIFT }), 'hold', 'a little wobble is still a hold');
    assert.strictEqual(R.scanPress({ held: 2000, moved: R.SCAN_DRIFT + 1 }), 'drag', 'a finger that slides away is not a hold');
    assert.strictEqual(R.scanPress({}), 'tap');
});

/* Oct 24 2026 (Emmanuel: "very simple: long press on Scan opens all those secondary bubbles"): the old two-finger tap on Misty is
   removed, not kept as a hidden duplicate. Pinch zoom on the world, Misty's own hold (stats) and double tap stay elsewhere. */
test('the old two-finger tap on Misty no longer opens the bubbles', () => {
    const { R, p } = mounted();
    const t1 = { identifier: 1, clientX: 180, clientY: 420 }, t2 = { identifier: 2, clientX: 210, clientY: 420 };
    p.fire('touchstart', p.misty, 180, 420, { touches: [t1] });
    p.wait(30);
    p.fire('touchstart', p.misty, 210, 420, { touches: [t1, t2] });
    p.wait(120);
    p.fire('touchend', p.misty, 180, 420, { touches: [t1] });
    const end = p.fire('touchend', p.misty, 210, 420, { touches: [] });
    p.wait(1000);
    assert.strictEqual(p.st.opens, 0, 'two fingers on Misty open nothing');
    assert.strictEqual(end.prevented, false, 'and her own tap / double tap are not blocked');
    assert.strictEqual(R.isTwoFingerTap, undefined, 'the two-finger decision is gone');
    assert.strictEqual(R.TAP, undefined, 'its timing table too');
    const br = read('bloom-ring.js');
    assert.doesNotMatch(br, /addEventListener\('touchstart'/, 'no touch-story listener left for it');
    assert.doesNotMatch(br, /function onMisty\(/, 'no Misty hit test for it');
});

test('a normal tap on Scan opens Scan and nothing else', () => {
    const { p } = mounted();
    const r = p.press(p.scan, 150);
    assert.strictEqual(p.st.scanOpened, 1, 'Scan opened');
    assert.strictEqual(p.st.opens, 0, 'no bubbles opened');
    assert.strictEqual(r.touchendCancelled, false, 'the tap\'s click is not blocked');
});

test('holding Scan opens every bubble and does NOT also open Scan', () => {
    const { R, p } = mounted();
    p.fire('pointerdown', p.scan);
    assert.ok(p.scan.cls.has('br-scan-holding'), 'a light cue while the finger is down');
    p.wait(R.SCAN_HOLD_MS - 20);
    assert.strictEqual(p.st.opens, 0, 'nothing before the hold time');
    p.wait(40);
    assert.strictEqual(p.st.opens, 1, 'every bubble opens while the finger is still down');
    assert.ok(p.st.all, 'the all-bubbles circle is open');
    assert.ok(!p.scan.cls.has('br-scan-holding'), 'the cue goes once it fired');
    p.fire('pointerup', p.scan);
    const te = p.fire('touchend', p.scan);
    assert.ok(te.prevented, 'iOS: the touchend after a hold is cancelled, so no click follows');
    const click = p.fire('click', p.scan);
    assert.ok(click.stopped && click.prevented, 'a click that still comes is swallowed');
    assert.strictEqual(p.st.scanOpened, 0, 'Scan did not open');
    assert.ok(p.st.all, 'the swallowed click did not close the bubbles either');
});

test('a busy page: the timer had no chance, but the finger stayed down long enough, so it is still a hold and never Scan', () => {
    const { R, p } = mounted();
    p.fire('pointerdown', p.scan);
    p.stall(R.SCAN_HOLD_MS + 150);
    p.fire('pointerup', p.scan);
    assert.strictEqual(p.st.opens, 1, 'every bubble opens on lift');
    const te = p.fire('touchend', p.scan); assert.ok(te.prevented);
    const c = p.fire('click', p.scan); assert.ok(c.stopped);
    assert.strictEqual(p.st.scanOpened, 0, 'Scan did not open');
    p.wait(1000);
    assert.strictEqual(p.st.opens, 1, 'the late timer does not fire a second time');
    assert.ok(p.st.all, 'still open');
});

test('a busy page and a quick tap: still a tap', () => {
    const { p } = mounted();
    p.fire('pointerdown', p.scan); p.stall(150); p.fire('pointerup', p.scan); p.fire('touchend', p.scan); p.fire('click', p.scan);
    p.wait(1000);
    assert.strictEqual(p.st.scanOpened, 1); assert.strictEqual(p.st.opens, 0, 'no late hold after the lift');
});

test('a hold that slides away is a drag: nothing opens', () => {
    const { R, p } = mounted();
    p.press(p.scan, R.SCAN_HOLD_MS + 300, 30);
    assert.strictEqual(p.st.opens, 0);
    assert.strictEqual(p.st.scanOpened, 0);
});

test('after a hold, the next quick tap opens Scan again', () => {
    const { R, p } = mounted();
    p.press(p.scan, R.SCAN_HOLD_MS + 100);
    assert.strictEqual(p.st.opens, 1); assert.strictEqual(p.st.scanOpened, 0);
    p.press(p.scan, 120);
    assert.strictEqual(p.st.scanOpened, 1, 'the tap after a hold is a real tap');
});

test('hold again closes the circle (same toggle as the two-finger shortcut)', () => {
    const { R, p } = mounted();
    p.press(p.scan, R.SCAN_HOLD_MS + 50);
    p.press(p.scan, R.SCAN_HOLD_MS + 50);
    assert.strictEqual(p.st.closes, 1); assert.ok(!p.st.all);
    assert.strictEqual(p.st.scanOpened, 0, 'neither hold opened Scan');
});

test('only on Home: a hold while Home is away does nothing', () => {
    const { R, p } = mounted();
    p.H.add('wh-away');
    p.press(p.scan, R.SCAN_HOLD_MS + 200);
    assert.strictEqual(p.st.opens, 0, 'no bubbles away from Home');
});

test('other buttons are untouched: holding Water never opens every bubble, its tap still lands', () => {
    const { R, p } = mounted();
    p.press(p.water, R.SCAN_HOLD_MS + 200);
    assert.strictEqual(p.st.opens, 0);
    p.press(p.water, 100);
    assert.strictEqual(p.st.waterTapped, 2, 'Water got both its clicks (the hold is Water\'s own, handled in world-home.js)');
});

test('no long-press menu or callout on Scan', () => {
    const { p } = mounted();
    assert.ok(p.fire('contextmenu', p.scan).prevented, 'contextmenu on Scan is cancelled');
    assert.ok(!p.fire('contextmenu', p.empty).prevented, 'elsewhere it is left alone');
    assert.match(read('bloom-ring.css'), /\[data-orbit="scan"\]\.br-scan-holding/, 'the hold cue is styled');
});

test('wiring: the hold lives in bloom-ring.js, before every click handler, and opens every bubble', () => {
    const br = read('bloom-ring.js');
    assert.match(br, /D\.addEventListener\('pointerdown', onScanDown, true\)/);
    assert.match(br, /W\.addEventListener\('click', onScanClick, true\)/, 'the window sees the click first');
    assert.match(br, /D\.addEventListener\('touchend', onScanTouchEnd, \{ capture: true, passive: false \}\)/, 'iOS: no synthetic click after a hold');
    assert.match(br, /closest\('#whHud \[data-orbit="scan"\]'\)/, 'only the Home Scan button');
    assert.match(read('home-orbit-v2.js'), /if \(key === 'scan'\) \{ open\('scan'\); return; \}/, 'a tap on Scan still opens Scan');
});

const T = require('../tutorial-steps.js');
const TWO_ON_ME = { en: /(tap|touch) me with two fingers/i, de: /mit zwei Fingern gleichzeitig an/i, es: /(tócame|toca a \w+) con dos dedos/i };

test('tutorial: Hold Scan is its What\'s New card in EN/DE/ES (a quick tap still opens Scan); the base Scan card shows a pretend Scan, never the camera', () => {
    const s = T.STEPS.find(x => x.id === 'new-scan-hold');
    assert.ok(s, 'there is a Hold Scan card');
    assert.strictEqual(s.area, 'new', 'What\'s New only: the short base tour never shows it (Oct 25 2026)');
    assert.deepStrictEqual(s.covers, ['scan-hold-all']);
    assert.strictEqual(s.later, 'hold', 'Scan is tried after the tour (a slip would open the camera during it)');
    assert.ok(s.target.includes('#whHud .o8-scan'), 'it points at Scan');
    assert.match(s.text.en, /hold Scan for a moment/i); assert.match(s.text.en, /every bubble opens at once/i); assert.match(s.text.en, /quick tap still opens Scan/i);
    assert.match(s.text.de, /Halt Scan kurz gedrückt/); assert.match(s.text.de, /alle Bubbles auf einmal/); assert.match(s.text.de, /Kurz tippen öffnet weiter Scan/);
    assert.match(s.text.es, /mantén pulsado Scan/i); assert.match(s.text.es, /todas las burbujas a la vez/i); assert.match(s.text.es, /toque rápido sigue abriendo Scan/i);
    for (const l of ['en', 'de', 'es']) assert.match(s.text[l], T.LATER_MARK[l], 'says after the tour (' + l + ')');
    const b = T.STEPS.find(x => x.id === 'scan');
    assert.ok(b && b.area !== 'new' && b.demo && b.demo.open === 'scan-demo', 'the base Scan card opens the pretend Scan');
    assert.ok(!T.base().some(x => x.id === 'new-scan-hold'), 'not in the base tour');
    const g = T.GESTURES.find(x => x.id === 'scan-hold');
    assert.ok(g && g.how === 'hold' && g.src.includes('bloom-ring.js'), 'listed as a hold gesture in bloom-ring.js');
});

test('tutorial: no card teaches a two-finger tap on the companion any more, in any language', () => {
    assert.ok(!T.STEPS.some(s => s.id === 'misty-two'), 'the Two fingers card is gone');
    assert.ok(!T.GESTURES.some(g => g.id === 'misty-two'), 'no gesture misty-two to teach');
    for (const s of T.STEPS) for (const l of ['en', 'de', 'es']) {
        assert.doesNotMatch(s.text[l], TWO_ON_ME[l], s.id + '.' + l + ' teaches two fingers on the companion');
        assert.doesNotMatch(s.title[l], /^(Two fingers|Zwei Finger|Dos dedos)$/i, s.id + '.' + l + ' title');
    }
});

test('What\'s New: the new-scan-hold card is in part new and reads in every language', () => {
    const s = T.STEPS.find(x => x.id === 'new-scan-hold');
    assert.ok(s && s.area === 'new', 'in part new');
    assert.match(s.text.en, /hold Scan/i); assert.match(s.text.de, /Halt Scan/); assert.match(s.text.es, /mantén pulsado Scan/i);
    assert.ok(T.VERSION >= 20, 'tutorial VERSION bumped');
});
