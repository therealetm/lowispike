'use strict';
/* Oct 16, 2026: Cook, Move and the visible Scan background are the same Metabolic Spirit World as the expanded Community world
   (realm-backdrop*.js/css). Today/Home stays as it is. Scan opens on the living world, the glass camera card follows after about a
   second, and the camera feed fades in over the world; the barcode scanner itself is unchanged. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../realm-backdrop-core.js');
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('the realm shows on Cook, Move and Scan only; never on Today; never during the Home <-> Community warp', () => {
    for (const id of ['tab-shelf', 'tab-move', 'tab-scan']) {
        assert.equal(C.want({ active: id }), true, id);
        assert.equal(C.want({ active: id, zoom: true }), false, id + ' during the warp');
    }
    assert.equal(C.want({ active: 'tab-home' }), false, 'Today keeps Misty\'s own world');
    assert.equal(C.want({ active: 'tab-home', sliding: ['tab-shelf'] }), false, 'not even while Cook peeks in from the side');
    assert.equal(C.want({ active: 'tab-foryou' }), false, 'Community has its own copy of the picture inside its page');
    assert.equal(C.want({ active: 'tab-foryou', sliding: ['tab-shelf'] }), true, 'stays under a Cook page that is still sliding away');
    assert.equal(C.want({ active: 'tab-foryou', sliding: ['tab-home'] }), false);
    assert.equal(C.want({}), false); assert.equal(C.want(), false);
});

test('how it comes and goes: from Today it arrives from further away, from Community it is already there, to Today it fades', () => {
    assert.equal(C.change('tab-home', 'tab-shelf', true), 'arrive');
    assert.equal(C.change('tab-foryou', 'tab-move', true), 'instant', 'same picture as Community: no flash between them');
    assert.equal(C.change('', 'tab-move', true), 'fade');
    assert.equal(C.change('tab-shelf', 'tab-home', false), 'fade', 'Misty\'s world shows through');
    assert.equal(C.change('tab-shelf', 'tab-foryou', false), 'instant', 'hidden behind Community\'s own picture');
    assert.ok(C.FAR > 1 && C.FAR < 1.18 + 1e-9, 'never farther than the Community warp itself');
    assert.ok(C.ARRIVE_MS >= 300 && C.ARRIVE_MS <= 900 && C.LEAVE_MS >= 200 && C.LEAVE_MS <= 700);
});

test('Scan camera: no in-app camera card and no delay; iOS asks on its own', () => {
    assert.equal(C.gate, undefined, 'no gate'); assert.equal(C.ASK_DELAY, undefined, 'no one-second wait');
    assert.ok(!/ask|Allow camera|permissions/i.test(read('realm-backdrop.js').replace(/\/\*[\s\S]*?\*\//g, '')), 'no asking, no Permissions API');
});

test('motes: same places every launch, inside the screen, in the picture\'s colours, few on phones and none with reduced motion', () => {
    const a = C.motes(16, 11), b = C.motes(16, 11);
    assert.deepEqual(a, b);
    assert.notDeepEqual(C.motes(16, 12), a);
    assert.equal(a.length, 16);
    for (const m of a) {
        assert.ok(m.x >= 4 && m.x <= 96 && m.y >= 8 && m.y <= 92);
        assert.ok(m.s >= 2 && m.s <= 5.5 && m.dur >= 14 && m.dur <= 30 && m.delay <= 0 && m.dy > 0);
        assert.ok(C.HUES.includes(m.hue) && m.a > 0 && m.a <= 0.9);
    }
    assert.equal(C.motes(500).length, 40, 'capped');
    assert.equal(C.moteCount(390, 844, true), 0);
    assert.ok(C.moteCount(375, 667, false) <= C.moteCount(390, 844, false) && C.moteCount(390, 844, false) < C.moteCount(1180, 820, false));
    assert.ok(C.moteCount(1366, 1024, false) <= 24, 'iPad stays light');
});

test('loaded once, after Scan\'s glass styles, and no picture: the live 3D world shows through', () => {
    const html = read('index.html');
    const iSg = html.indexOf('<script src="scan-glass.js'), iCss = html.indexOf('<link rel="stylesheet" id="rwCss" href="realm-backdrop.css?v='),
        iCore = html.indexOf('<script src="realm-backdrop-core.js?v='), iJs = html.indexOf('<script src="realm-backdrop.js?v=');
    assert.ok(iSg > 0 && iCss > iSg && iCore > iCss && iJs > iCore, 'css, then rules, then the module');
    assert.equal(html.split('realm-backdrop.js?v=').length, 2, 'loaded once');
    assert.equal(C.IMAGE, undefined);
    const js = read('realm-backdrop.js');
    assert.ok(!/<picture|<img|\.webp|\.jpg|metabolic-spirit-world/.test(js), 'no wallpaper picture');
    for (const f of ['realm-backdrop.css', 'realm-backdrop-core.js', 'realm-backdrop.js']) assert.ok(read('sw.js').includes('"' + f + '"'), f + ' precached');
});

test('the layer never takes a touch, never covers Today, and is see-through over the live world', () => {
    const css = read('realm-backdrop.css'), cs = read('community-spirit.css'), bare = noComments(css);
    assert.match(css, /\.rw-layer \{ position: absolute; inset: 0; overflow: hidden; pointer-events: none !important;/);
    assert.match(css, /\.rw-layer \* \{ pointer-events: none !important; \}/);
    assert.match(css, /\.rw-layer \{ position: absolute; inset: 0; overflow: hidden; pointer-events: none !important; touch-action: none; background: transparent;/);
    assert.ok(css.includes('.rw-layer .rw-veil {'), 'a readability veil');
    assert.ok(!/#tab-home|\.wh-|#bw3Back|cgField|cg-body|#cgSpirit|#tab-foryou/.test(bare), 'touches neither Today, the live world, nor Community');
    /* animations are transform/opacity only (mobile performance) */
    for (const kf of bare.match(/@keyframes \w+ \{[\s\S]*?\}\s*\}/g) || []) {
        const props = (kf.replace(/^@keyframes \w+ \{/, '').match(/[a-z-]+(?=\s*:)/g) || []);
        for (const p of props) assert.ok(['opacity', 'transform'].includes(p), kf.slice(0, 30) + ' animates ' + p);
    }
    assert.match(css, /\.rw-layer\.rw-still \*, #app > #rwBack\.rw-under \* \{ animation-play-state: paused !important; \}/, 'nothing moves while hidden or under the camera');
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(rm.includes('.rw-layer .rw-motes { display: none; }') && rm.includes('rw-arrive { animation: none !important; }'));
    /* fills the whole screen: in #app (the whole screen, also on iPad), not in the 680px page column */
    assert.ok(/#app > #rwBack\.rw-back \{ z-index: 0;/.test(css));
});

/* ---------- a small DOM, enough for the module ---------- */
function dom() {
    const all = [];
    class CL { constructor(e) { this.e = e; this.s = new Set(); } add(...c) { c.forEach(x => this.s.add(x)); } remove(...c) { c.forEach(x => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f) { const on = f === undefined ? !this.s.has(c) : !!f; if (on) this.s.add(c); else this.s.delete(c); return on; } toString() { return [...this.s].join(' '); } }
    class El {
        constructor(tag) { this.tag = tag; this.children = []; this.parentElement = null; this.classList = new CL(this); this.dataset = {}; this.style = {}; this.attrs = {}; this.id = ''; this._h = ''; this.listeners = {}; all.push(this); }
        set className(v) { this.classList.s = new Set(String(v).split(/\s+/).filter(Boolean)); } get className() { return this.classList.toString(); }
        set innerHTML(v) { this._h = v; } get innerHTML() { return this._h; }
        setAttribute(k, v) { this.attrs[k] = v; }
        get firstChild() { return this.children[0] || null; } get firstElementChild() { return this.firstChild; }
        get nextElementSibling() { const p = this.parentElement; if (!p) return null; return p.children[p.children.indexOf(this) + 1] || null; }
        get isConnected() { let e = this; while (e.parentElement) e = e.parentElement; return e.tag === 'html'; }
        insertBefore(n, ref) { if (n.parentElement) n.parentElement.children.splice(n.parentElement.children.indexOf(n), 1); const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(n); else this.children.splice(i, 0, n); n.parentElement = this; return n; }
        appendChild(n) { return this.insertBefore(n, null); }
        addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
        fire(t) { (this.listeners[t] || []).forEach(f => f()); }
        querySelector(sel) { if (sel === ':scope > .rw-cam') return this.children.find(c => c.classList.contains('rw-cam')) || null; if (sel === 'video') return this.children.find(c => c.tag === 'video') || null; return null; }
    }
    const html = new El('html'), body = new El('body'), app = new El('div'), main = new El('div');
    html.appendChild(body); body.appendChild(app); app.id = 'app'; main.id = 'main';
    const bw3 = new El('div'); bw3.id = 'bw3Back'; app.appendChild(main);
    const tabs = {}; for (const t of ['home', 'shelf', 'move', 'scan', 'foryou']) { const e = new El('div'); e.id = 'tab-' + t; e.className = 'tab'; main.appendChild(e); tabs[t] = e; }
    tabs.home.classList.add('active');
    const D = {
        documentElement: html, readyState: 'complete', hidden: false,
        createElement: t => new El(t), addEventListener() { },
        getElementById: id => all.find(e => e.id === id && e.isConnected) || null,
        querySelector: sel => sel === '#main > .tab.active' ? main.children.find(c => c.classList.contains('tab') && c.classList.contains('active')) || null : sel === '#b3Cam.rw-feed' ? all.find(e => e.id === 'b3Cam' && e.isConnected && e.classList.contains('rw-feed')) || null : null,
        querySelectorAll: () => ({ forEach: f => main.children.filter(c => ['lg-out', 'lg-in', 'lg-peek'].some(k => c.classList.contains(k))).forEach(f) })
    };
    return { D, El, html, app, main, bw3, tabs };
}
function load(env, perm) {
    const timers = [];
    const W = { document: env.D, innerWidth: 390, innerHeight: 844, matchMedia: () => ({ matches: false }), navigator: {} };
    if (perm !== undefined) W.navigator.permissions = { query: () => perm instanceof Error ? Promise.reject(perm) : Promise.resolve({ state: perm }) };
    const ctx = { window: W, globalThis: W, MutationObserver: undefined, setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout() { }, Promise, Date };
    vm.runInNewContext(read('realm-backdrop-core.js'), ctx);
    vm.runInNewContext(read('realm-backdrop.js'), ctx);
    return { W, timers, R: W.LowiRealmBack };
}
const tick = () => new Promise(r => setImmediate(r));

test('the wallpaper sits right under the pages, above the live world, and follows the active page', () => {
    const env = dom(); const { R } = load(env);
    const back = R.layer();
    assert.ok(back && back.id === 'rwBack' && back.nextElementSibling === env.main, 'directly under #main');
    assert.ok(back.classList.contains('rw-still') && !back.classList.contains('rw-show'), 'Today: hidden and still');
    /* the live world is added later, right before #main: the wallpaper moves above it */
    env.app.insertBefore(env.bw3, env.main); R.sync();
    assert.ok(env.app.children.indexOf(env.bw3) < env.app.children.indexOf(back) && back.nextElementSibling === env.main);
    const go = t => { Object.values(env.tabs).forEach(e => e.classList.remove('active')); env.tabs[t].classList.add('active'); R.sync(); };
    go('shelf'); assert.ok(back.classList.contains('rw-show') && back.classList.contains('rw-arrive'), 'from Today it arrives');
    assert.ok(env.html.classList.contains('rw-page'));
    go('move'); assert.ok(back.classList.contains('rw-show'));
    go('scan'); assert.ok(back.classList.contains('rw-show'));
    go('foryou'); assert.ok(!back.classList.contains('rw-show') && back.classList.contains('rw-instant'));
    go('move'); assert.ok(back.classList.contains('rw-show') && back.classList.contains('rw-instant'), 'Community -> Move: no flash');
    env.html.classList.add('b3-camon'); R.sync(); assert.ok(back.classList.contains('rw-under'), 'paused under the camera');
    env.html.classList.remove('b3-camon'); R.sync(); assert.ok(!back.classList.contains('rw-under'));
    go('home'); assert.ok(!back.classList.contains('rw-show') && back.classList.contains('rw-fade'), 'back to Today it fades');
    assert.ok(!env.html.classList.contains('rw-page'));
    go('shelf'); env.html.classList.add('gx-out'); R.sync(); assert.ok(!back.classList.contains('rw-show'), 'out of the way of the warp');
});

function scanner(env) {
    const el = new env.El('div'); el.className = 'b3-cam'; el.id = 'b3Cam'; const v = new env.El('video'); el.appendChild(v); env.app.appendChild(el); return { el, v };
}

test('Scan opens in the same living world as Cook and Move: see-through camera screen, wallpaper and pulled-out world under it', () => {
    const env = dom(); const { R } = load(env); const back = R.layer();
    env.app.insertBefore(env.bw3, env.main); R.sync();
    /* Today lies under the camera: the camera screen still counts as Scan */
    const { el, v } = scanner(env); env.html.classList.add('b3-camon'); R.dress(el);
    assert.ok(el.classList.contains('rw-scan'));
    assert.ok(!el.children.some(c => c.classList.contains('rw-cam')), 'no copy of the layer inside: the real one shows through');
    assert.ok(env.html.classList.contains('rw-scanworld'), 'body-world-3d.js pulls the live world out for it');
    assert.ok(back.classList.contains('rw-show') && back.classList.contains('rw-arrive'), 'from Today the world arrives, as on Cook');
    assert.ok(!back.classList.contains('rw-under'), 'alive until the feed covers it');
    /* the feed fades in over the world only once a frame plays, and the world comes back when it stops */
    v.fire('playing'); assert.ok(!el.classList.contains('rw-feed'), 'no frame yet');
    v.videoWidth = 1280; v.fire('playing'); assert.ok(el.classList.contains('rw-feed')); assert.ok(back.classList.contains('rw-under'), 'paused under the feed');
    v.fire('emptied'); assert.ok(!el.classList.contains('rw-feed') && !back.classList.contains('rw-under'));
    R.dress(el); assert.equal(v.listeners.playing.length, 1, 'dressed once');
    /* closing goes back to Today with a fade */
    el.parentElement.children.splice(el.parentElement.children.indexOf(el), 1); el.parentElement = null;
    env.html.classList.remove('b3-camon'); R.sync();
    assert.ok(!env.html.classList.contains('rw-scanworld') && !back.classList.contains('rw-show') && back.classList.contains('rw-fade'));
});

test('Scan over Community or Cook: the same world stays, no flash', () => {
    const env = dom(); const { R } = load(env); const back = R.layer();
    const go = t => { Object.values(env.tabs).forEach(e => e.classList.remove('active')); env.tabs[t].classList.add('active'); R.sync(); };
    go('shelf'); const { el } = scanner(env); env.html.classList.add('b3-camon'); R.dress(el);
    assert.ok(back.classList.contains('rw-show') && env.html.classList.contains('rw-scanworld'));
    env.html.classList.remove('b3-camon'); el.parentElement.children.pop(); el.parentElement = null; go('foryou');
    const s2 = scanner(env); env.html.classList.add('b3-camon'); R.dress(s2.el);
    assert.ok(back.classList.contains('rw-show') && back.classList.contains('rw-instant'), 'Community -> Scan: instant');
});

test('index.html asks for the camera as Scan opens: no in-app card, iOS prompt only; reading, lookup and fallbacks unchanged', () => {
    const html = read('index.html');
    const open = html.slice(html.indexOf('function openScanner(mode){'), html.indexOf('function msg(text, kind){'));
    assert.ok(open.includes('if (window.LowiRealmBack && LowiRealmBack.dress) LowiRealmBack.dress(el);\n  startCam();'), 'straight to the camera');
    assert.ok(!/msgState\("ask"\)|camAsk|camAllow|s === "ask"/.test(html), 'the "Let LOWiSPIKE use the camera" card is gone');
    assert.ok(!/CAMOK\) === "1"\) startCam\(\); else/.test(html), 'no remembered-permission gate either');
    assert.ok(open.indexOf('if (mode === "type")') < open.indexOf('startCam();') && open.indexOf('getUserMedia) { msgState("nocam")') < open.indexOf('LowiRealmBack.dress'), 'typing a code and no-camera are untouched');
    for (const s of ['function validCode(c){', 'function zxReader(){', 'async function nativeDetector(){', 'case "camallow": startCam(); break;', 'localStorage.setItem(CAMOK, "1"); mine.stream = stream;'])
        assert.ok(html.includes(s), s);
    assert.equal(html.split('LowiRealmBack.dress(el)').length, 2, 'one call site in index.html');
});

test('camera states wear Misty\'s blue glass: blue Try again, type the number offered, no frame or light without a camera', () => {
    const html = read('index.html'), css = read('scan-glass.css');
    const ms = html.slice(html.indexOf('function msgState(s){'), html.indexOf('function msgState(s){') + 3000);
    for (const st of ['"denied"', '"camerr"', '"nocam"', '"starting"']) assert.ok(ms.includes('s === ' + st), st);
    assert.equal((ms.match(/b3-cbox b3-cglass/g) || []).length, 4, 'all four camera states in the glass');
    assert.equal((ms.match(/class="b3-cbtn pri" data-b3="camallow"/g) || []).length, 2, 'blue Try again when blocked or failed');
    assert.ok(ms.includes('data-b3="camtype"') && html.includes('case "camtype":'), 'typing the number is offered');
    assert.ok(!/r2-btn ghost" data-b3="camallow"/.test(html), 'the grey Try again is gone');
    assert.ok(/camDenied: \["The camera is off"/.test(html) && !/Camera is blocked/.test(html));
    assert.ok(/\.b3-cbox\.b3-cglass \{[^}]*var\(--wh-glass-wide\)[^}]*var\(--wh-glass-rim\)[^}]*var\(--wh-glass-sh\)/.test(css), 'Daily Quest / weather pill glass tokens');
    assert.ok(/\.b3-cbtn\.pri \{[^}]*#0a84ff/.test(css), 'blue button');
    assert.ok(/\[data-st=denied\], \[data-st=nocam\], \[data-st=camerr\]\) \.b3-frame \{ opacity: 0/.test(css), 'no frame corners without a camera');
    assert.ok(/\.b3-cam:not\(\.live\) \.b3-torch \{ visibility: hidden/.test(css), 'no light button without a camera');
    assert.ok(/camErrState\(e\)\{[^\n]*"camerr"/.test(html), 'other camera errors get their own friendly state');
});

test('Scan is the lit tab while the camera is open, and the page under it hides behind the see-through camera', () => {
    const sg = read('scan-glass.css'), rb = read('realm-backdrop.css'), bw = read('body-world-3d.js');
    /* Oct 21: menu bar removed, check dropped */
    /* Oct 21: menu bar removed, check dropped */
    assert.ok(/html\.rw-scanworld \.b3-cam\.rw-scan \{ background: transparent !important/.test(rb));
    assert.ok(/html\.rw-scanworld #app #main > (?::not\(#tabbar\))?:not\(\.lg-in\):not\(\.lg-peek\):not\(\.lg-out\) \{ visibility: hidden/.test(rb), 'the page under hides, swipes stay');
    assert.ok(bw.includes("if (H.classList.contains('rw-scanworld')) return true;") && bw.includes("H.classList.contains('rw-scanworld') ? { id: 'tab-scan' } : t0"), 'the live 3D world pulls out for Scan');
    assert.ok(read('body-world-3d.css').includes('html.wb-on.rw-scanworld #bw3Back::after'), 'no reading veil: it looks like Community');
    assert.ok(!/metabolic-spirit-world|\.webp|\.jpg/.test(rb), 'never the flat picture');
});
