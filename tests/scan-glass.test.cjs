'use strict';
/* Oct 16: Scan in the same Liquid Glass design as every other tab (E-man: "when I click on the scan, the scan looks very
   different to everything else ... has to be fixed and aligned"). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html'), css = read('scan-glass.css'), js = read('scan-glass.js'), sw = read('sw.js'), lg = read('liquid-glass.css');

test('the Scan sheet and glue load after the Liquid Glass layer, with the shell build, and are cached offline', () => {
    const build = (html.match(/name="lowi-build" content="([0-9-]+)"/) || [])[1];
    assert.ok(build);
    assert.ok(html.includes('id="sgCss" href="scan-glass.css?v=' + build + '"'));
    assert.ok(html.includes('<script src="scan-glass.js?v=' + build + '"></script>'));
    assert.ok(html.indexOf('id="sgCss"') > html.indexOf('id="lgCss"'));
    assert.ok(sw.includes('"scan-glass.css"') && sw.includes('"scan-glass.js"'));
    assert.ok(js.includes("getElementById('sgCss')"), 'kept after the Liquid Glass sheet once that one moves to the end');
});

test('the camera uses the shared tokens: Misty blue accents, glass controls, system font, no gold or red laser', () => {
    assert.ok(/\.b3-frame i\[class\^=c\] \{ border-color: var\(--lg-blue-2\)/.test(css), 'blue viewfinder corners');
    assert.ok(/\.b3-laser \{ background: linear-gradient\(90deg, transparent, var\(--lg-blue-2\), transparent\)/.test(css), 'blue scan line');
    assert.ok(/:is\(\.b3-cx, \.b3-torch\) \{[^}]*backdrop-filter: var\(--lg-blur\)/.test(css), 'glass X and torch');
    assert.ok(/\.b3-go \{ background: var\(--lg-blue\)/.test(css), 'blue Go');
    assert.ok(/\.b3-cact\[aria-pressed=true\] \{ background: rgba\(10, 132, 255/.test(css), 'the chosen action is blue');
    assert.ok(/\.b3-cbox \{[^}]*backdrop-filter: var\(--lg-blur\)/.test(css), 'messages are a glass card');
    assert.ok(/\.b3-cam \.b3-cbot \{[^}]*rgba\(28, 28, 34, \.42\)[^}]*blur\(28px\) saturate\(190%\)/.test(css), 'the panel is the dock material');
    assert.ok(/\.b3-ctitle \{ font-family: var\(--lg-font\)/.test(css));
    assert.ok(/var\(--lg-space\)/.test(css), 'black space behind the camera, like the other pages');
    assert.ok(!/#e9cb88|#cba45e|#f3dfaa|#cfac69|#b98d45|233, ?203, ?136|#ff5a4a/i.test(css), 'no old gold or red');
    /* the tokens it relies on exist in the shared layer */
    for (const v of ['--lg-blue:', '--lg-blue-2:', '--lg-blur:', '--lg-edge:', '--lg-space:', '--lg-font:', '--lg-ink-2:', '--lg-r:'])
        assert.ok(lg.includes(v), v);
});

test('the old gold camera styles are still what it overrides (so the overrides are needed and aimed right)', () => {
    assert.ok(/\.b3-frame i\[class\^=c\]\{[^}]*border:3px solid #e9cb88/.test(html));
    assert.ok(/\.b3-laser\{[^}]*#ff5a4a/.test(html));
    assert.ok(html.includes('id="b3Cam"') || /\.id\s*=\s*["']b3Cam["']/.test(html), 'the scanner layer is #b3Cam');
});

test('the dock stays over the camera and the panel ends above it', () => {
    assert.ok(/html\.lg\.sg-dock\.b3-camon #app #main \{ z-index: auto !important; \}/.test(css));
    assert.ok(/html\.lg\.sg-dock\.b3-camon #app #main #tabbar \{ z-index: 2147483001 !important; \}/.test(css));
    assert.ok(/\.b3-cam\.sg-docked \{ z-index: 2147483000;/.test(css));
    assert.ok(/\.sg-docked \.b3-cbot \{[^}]*bottom: calc\(var\(--sg-dock, 96px\) \+ 10px\)/.test(css));
    assert.ok(/\.sg-docked \.b3-cmsg \{ bottom: calc\(var\(--sg-dock, 96px\) \+ 250px\)/.test(css));
    assert.ok(/\.tb\.active:not\(\.scan\) \{ background: transparent/.test(css), 'Scan is the lit button while the camera is open');
});

/* ---- the glue, in a tiny fake DOM ---- */
function cls(init) {
    const s = new Set(init || []);
    let writes = 0;
    return { add: c => { s.add(c); writes++; }, remove: c => { s.delete(c); writes++; }, contains: c => s.has(c), toString: () => [...s].join(' '), get writes() { return writes; } };
}
function el(id, rect, extra) {
    const e = Object.assign({ id, children: [], parentElement: null, classList: cls(), dataset: {}, style: { props: {}, setProperty(k, v) { this.props[k] = v; } },
        getBoundingClientRect: () => rect || { left: 0, top: 0, width: 0, height: 0, bottom: 0 },
        appendChild(c) { if (c.parentElement) { const a = c.parentElement.children; a.splice(a.indexOf(c), 1); } c.parentElement = this; this.children.push(c); return c; },
        querySelector: () => null, closest: () => null }, extra || {});
    return e;
}
function world(opts) {
    const o = Object.assign({ lg: true, flat: true }, opts);
    const H = el('html'); H.classList = cls(o.lg ? ['lg'] : []);
    const body = el('body'); const app = el('app'); body.appendChild(app);
    const tabbar = el('tabbar', o.flat ? { left: 10, top: 744, width: 370, height: 68, bottom: 812 } : { left: 16, top: 16, width: 216, height: 768, bottom: 784 });
    tabbar.classList = cls();
    const listeners = {}, observers = [];
    const D = { documentElement: H, body, readyState: 'complete', querySelector: () => null,
        getElementById: id => ({ app, tabbar, b3Cam: D._cam || null, sgCss: null })[id] || null,
        addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); } };
    const ctx = { document: D, window: { addEventListener() {} }, requestAnimationFrame: f => f(), setTimeout: f => f(),
        getComputedStyle: () => ({ display: 'flex', visibility: 'visible' }),
        MutationObserver: class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} } };
    ctx.window = Object.assign(ctx.window, ctx);
    vm.runInNewContext(js, ctx);
    const flush = () => observers.forEach(m => m.cb([]));
    return { D, H, body, app, tabbar, listeners, flush, ctx };
}
function openCam(w) {
    let closed = 0;
    const x = { click() { closed++; w.H.classList.remove('b3-camon'); } };
    const cam = el('b3Cam', { left: 0, top: 0, width: 390, height: 844, bottom: 844 }, { querySelector: s => (s.includes('camclose') ? x : null) });
    w.D._cam = cam; w.body.appendChild(cam); w.H.classList.add('b3-camon'); w.flush();
    return { cam, closed: () => closed };
}

test('the full-screen scanner moves into the app shell, under the dock, and knows the space the dock takes', () => {
    const w = world();
    const { cam } = openCam(w);
    assert.strictEqual(cam.parentElement, w.app);
    assert.ok(cam.classList.contains('sg-docked'));
    assert.ok(w.H.classList.contains('sg-dock'));
    assert.ok(w.tabbar.classList.contains('no-page-swipe'), 'the dock does not page pages under the camera');
    assert.strictEqual(cam.style.props['--sg-dock'], '100px');
});

test('a tap on another tab closes the camera and lets the tab open; a tap on Scan keeps the camera', () => {
    const w = world();
    const c = openCam(w);
    const click = w.listeners.click[0];
    let stopped = 0;
    const tap = (isScan) => { const tb = { classList: cls(isScan ? ['tb', 'scan'] : ['tb']), dataset: { tab: isScan ? 'scan' : 'shelf' } };
        click({ target: { closest: () => tb }, preventDefault() {}, stopPropagation() { stopped++; } }); };
    tap(true);
    assert.strictEqual(c.closed(), 0); assert.strictEqual(stopped, 1);
    tap(false);
    assert.strictEqual(c.closed(), 1, 'closed through its own X');
    assert.strictEqual(stopped, 1, 'the tab tap goes on to open the tab');
    w.flush();
    assert.ok(!w.H.classList.contains('sg-dock'));
    assert.ok(!w.tabbar.classList.contains('no-page-swipe'));
});

test('it stays out of the way: no glass design, or the side dock on a wide screen, keeps the old full-screen layer', () => {
    for (const opts of [{ lg: false }, { flat: false }]) {
        const w = world(opts);
        const { cam } = openCam(w);
        assert.strictEqual(cam.parentElement, w.body);
        assert.ok(!w.H.classList.contains('sg-dock'));
    }
});

test('no observer loop: a class sync with nothing to change writes no class', () => {
    const w = world();
    const before = w.H.classList.writes;
    w.flush(); w.flush();
    assert.strictEqual(w.H.classList.writes, before);
    assert.ok(/if \(H\.classList\.contains\('sg-dock'\)\) H\.classList\.remove\('sg-dock'\)/.test(js));
});
