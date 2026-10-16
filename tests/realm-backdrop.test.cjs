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

test('Scan camera: allowed starts at once; otherwise the world shows first and the glass card asks after about a second', () => {
    assert.deepEqual(C.gate('granted'), { act: 'start', delay: 0 });
    for (const p of ['prompt', '', undefined, 'weird']) assert.deepEqual(C.gate(p), { act: 'ask', delay: C.ASK_DELAY });
    assert.deepEqual(C.gate('denied'), { act: 'start', delay: C.ASK_DELAY }, 'denied: the normal start shows the existing camera-off card');
    assert.ok(C.ASK_DELAY >= 800 && C.ASK_DELAY <= 1300, 'about one second');
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

test('loaded once, after Scan\'s glass styles, with the same picture files as Community (precached by community-spirit)', () => {
    const html = read('index.html');
    const iSg = html.indexOf('<script src="scan-glass.js'), iCss = html.indexOf('<link rel="stylesheet" id="rwCss" href="realm-backdrop.css?v='),
        iCore = html.indexOf('<script src="realm-backdrop-core.js?v='), iJs = html.indexOf('<script src="realm-backdrop.js?v=');
    assert.ok(iSg > 0 && iCss > iSg && iCore > iCss && iJs > iCore, 'css, then rules, then the module');
    assert.equal(html.split('realm-backdrop.js?v=').length, 2, 'loaded once');
    assert.equal(C.IMAGE, 'spirit/metabolic-spirit-world');
    assert.ok(read('community-spirit.js').includes("IMG = '" + C.IMAGE + "'"), 'the same picture as Community');
    for (const f of ['metabolic-spirit-world.webp', 'metabolic-spirit-world-phone.webp', 'metabolic-spirit-world.jpg', 'metabolic-spirit-world-phone.jpg']) assert.ok(fs.existsSync(path.join(root, 'spirit', f)), f);
    const js = read('realm-backdrop.js');
    for (const s of ['-phone.webp', '.webp', '-phone.jpg', '.jpg', 'max-aspect-ratio: 3/4', 'object-fit'].slice(0, 5)) assert.ok(js.includes(s), s);
});

test('the layer never takes a touch, never covers Today, and looks exactly like Community\'s (same crop, same veil)', () => {
    const css = read('realm-backdrop.css'), cs = read('community-spirit.css'), bare = noComments(css);
    assert.match(css, /\.rw-layer \{ position: absolute; inset: 0; overflow: hidden; pointer-events: none !important;/);
    assert.match(css, /\.rw-layer \* \{ pointer-events: none !important; \}/);
    assert.match(css, /object-fit: cover; object-position: 50% 50%;/);
    assert.ok(/\.rw-pan \{ position: absolute; inset: -22px;/.test(css) && /\.cg-spirit-pan \{ position: absolute; inset: -22px;/.test(cs), 'same overscan as Community');
    const veil = s => (s.match(/rgba\(3,8,20,[.\d]+\)/g) || []).join(' ');
    assert.equal(veil(css), veil(cs), 'the very same veil (dark and light theme) as Community');
    assert.ok(!/#tab-home|\.wh-|#bw3Back|cgField|cg-body|#cgSpirit|#tab-foryou/.test(bare), 'touches neither Today, the live world, nor Community');
    /* animations are transform/opacity only (mobile performance) */
    for (const kf of bare.match(/@keyframes \w+ \{[\s\S]*?\}\s*\}/g) || []) {
        const props = (kf.replace(/^@keyframes \w+ \{/, '').match(/[a-z-]+(?=\s*:)/g) || []);
        for (const p of props) assert.ok(['opacity', 'transform'].includes(p), kf.slice(0, 30) + ' animates ' + p);
    }
    assert.match(css, /\.rw-layer\.rw-still \*, #app > #rwBack\.rw-under \* \{ animation-play-state: paused !important; \}/, 'nothing moves while hidden or under the camera');
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(rm.includes('.rw-layer .rw-pan { animation: none !important; transform: none !important;') && rm.includes('.rw-layer .rw-motes { display: none; }') && rm.includes('rw-arrive { animation: none !important; }'));
    assert.ok(css.includes('prefers-reduced-transparency: reduce'));
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
        querySelector: sel => sel === '#main > .tab.active' ? main.children.find(c => c.classList.contains('tab') && c.classList.contains('active')) || null : null,
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
    const el = new env.El('div'); el.className = 'b3-cam'; const v = new env.El('video'); el.appendChild(v); env.app.appendChild(el); return { el, v };
}

test('Scan, camera not yet allowed: living world first, the glass card about a second later, the camera only after the tap', async () => {
    const env = dom(); const { R, timers } = load(env, 'prompt');
    const { el, v } = scanner(env); let started = 0, asked = 0;
    const p = R.gate(el, { start: () => started++, ask: () => asked++, open: () => true });
    assert.ok(el.firstChild.classList.contains('rw-cam'), 'the world is the bottom layer of the camera screen');
    assert.ok(el.classList.contains('rw-scan') && el.dataset.rw === 'world');
    await tick(); await tick();
    assert.equal(asked + started, 0, 'nothing yet: only the world');
    const t = timers.find(x => x.ms >= 800 && x.ms <= 1000); assert.ok(t, 'waits about a second'); t.f();
    assert.equal(await p, 'ask'); assert.equal(asked, 1); assert.equal(started, 0, 'the system prompt waits for the tap on the glass card');
    assert.ok(el.classList.contains('rw-asked'));
    /* the feed fades in over the world only once a frame plays, and the world comes back when it stops */
    v.videoWidth = 1280; v.fire('playing'); assert.ok(el.classList.contains('rw-feed'));
    v.fire('emptied'); assert.ok(!el.classList.contains('rw-feed'));
    R.gate(el, {}); assert.equal(el.children.filter(c => c.classList.contains('rw-cam')).length, 1, 'dressed once');
});

test('Scan, camera already allowed: starts at once, the world stays until the feed plays', async () => {
    const env = dom(); const { R } = load(env, 'granted');
    const { el } = scanner(env); let started = 0, asked = 0;
    assert.equal(await R.gate(el, { start: () => started++, ask: () => asked++, open: () => true }), 'start');
    assert.equal(started, 1); assert.equal(asked, 0); assert.ok(!el.classList.contains('rw-feed'));
});

test('Scan: closed or typing before the second is up does nothing; no Permissions API or an error falls back to asking', async () => {
    for (const perm of ['prompt', 'denied']) {
        const env = dom(); const { R, timers } = load(env, perm); const { el } = scanner(env); let n = 0;
        const p = R.gate(el, { start: () => n++, ask: () => n++, open: () => false });
        await tick(); await tick(); timers.filter(x => x.ms >= 800).forEach(x => x.f());
        assert.match(await p, /:closed$/); assert.equal(n, 0, perm);
    }
    for (const perm of [undefined, new Error('camera not a permission name')]) {
        const env = dom(); const { R, timers } = load(env, perm); const { el } = scanner(env); let asked = 0;
        const p = R.gate(el, { ask: () => asked++, open: () => true });
        await tick(); await tick(); timers.filter(x => x.ms >= 800 && x.ms <= 1000).forEach(x => x.f());
        assert.equal(await p, 'ask'); assert.equal(asked, 1);
    }
});

test('index.html only asks the gate when to start: the barcode scanner, lookup and fallbacks are unchanged', () => {
    const html = read('index.html');
    const open = html.slice(html.indexOf('function openScanner(mode){'), html.indexOf('function msg(text, kind){'));
    assert.ok(open.includes('if (window.LowiRealmBack && LowiRealmBack.gate) LowiRealmBack.gate(el, {start: startCam, ask: () => msgState("ask"), open: () => !!(CAM && CAM.el === el && !CAM.done && !CAM.stream && !el.dataset.st && !el.classList.contains("typing"))});'));
    assert.ok(open.includes('else if (window.LowiSpirit || localStorage.getItem(CAMOK) === "1") startCam(); else msgState("ask");'), 'the old start stays as the fallback');
    assert.ok(open.indexOf('if (mode === "type")') < open.indexOf('LowiRealmBack.gate') && open.indexOf('getUserMedia) { msgState("nocam")') < open.indexOf('LowiRealmBack.gate'), 'typing a code and no-camera are untouched');
    /* the reading itself */
    for (const s of ['function validCode(c){', 'function zxReader(){', 'async function nativeDetector(){', 'case "camallow": startCam(); break;', 'localStorage.setItem(CAMOK, "1"); mine.stream = stream;'])
        assert.ok(html.includes(s), s);
    assert.equal(html.split('LowiRealmBack.gate(el').length, 2, 'one call site in index.html');
});
