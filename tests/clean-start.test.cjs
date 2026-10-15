// Clean start: opening the app shows one calm launch screen, then the finished app in one step (no older screens flashing by),
// the companion files download together, and this build's versioned files come straight from the service worker cache.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), loader = read('apple-ui.js'), sw = read('sw.js');
const bootJs = (html.match(/<script id="lwBootJs">([\s\S]*?)<\/script>/) || [])[1] || '';
const bootCss = (html.match(/<style id="lwBootCss">([\s\S]*?)<\/style>/) || [])[1] || '';

/* A tiny DOM, enough for the inline launch-screen script. */
function fakeDom(opts) {
    opts = opts || {};
    const timers = [], listeners = {}, docListeners = {}, rafs = [];
    const cls = new Set();
    const mk = (tag) => {
        const el = { tagName: tag, id: '', children: [], parentNode: null, attrs: {}, _cls: new Set(), innerHTML: '', _l: {},
            setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
            removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; },
            addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); } };
        el.classList = { add: c => el._cls.add(c), remove: c => el._cls.delete(c), contains: c => el._cls.has(c) };
        return el;
    };
    const H = mk('HTML'); H.classList = { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) };
    const sheets = opts.sheets || [];
    let clock = 0, n = 0;
    const body = null;
    const document = { documentElement: H, body, readyState: opts.readyState || 'loading', createElement: mk,
        querySelectorAll: (q) => q.indexOf('tab-') >= 0 ? (opts.restless ? [{ scrollHeight: ++n, children: [], getBoundingClientRect: () => ({ width: 1, height: 1, right: 1, left: 0, bottom: 1, top: 0 }) }] : []) : sheets, addEventListener: (t, f) => { (docListeners[t] = docListeners[t] || []).push(f); } };
    const events = [];
    const win = { document, location: { search: opts.search || '' }, Date: { now: () => clock },
        performance: { now: () => 1234 }, innerWidth: 390, innerHeight: 844, getComputedStyle: () => ({ visibility: 'visible', opacity: '1' }),
        matchMedia: () => ({ matches: !!opts.still }),
        setTimeout: (f, ms) => { const x = { f, ms }; timers.push(x); return x; },
        clearTimeout: (x) => { const i = timers.indexOf(x); if (i >= 0) timers.splice(i, 1); },
        requestAnimationFrame: f => { rafs.push(f); return rafs.length; },
        addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
        dispatchEvent: e => events.push(e), CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; } };
    win.window = win;
    const flushRaf = () => { for (let i = 0; i < 4; i++) { const r = rafs.splice(0); r.forEach(f => f()); } };
    const fire = (t) => (docListeners[t] || []).forEach(f => f());
    const fireWin = (t) => (listeners[t] || []).forEach(f => f());
    const runTimers = (pred) => { const t = timers.filter(pred); t.forEach(x => { timers.splice(timers.indexOf(x), 1); x.f(); }); };
    const settle = () => { for (let i = 0; i < 20; i++) runTimers(t => t.ms === 60); flushRaf(); };
    const tick = ms => { clock += ms; };
    return { win, H, cls, timers, events, flushRaf, fire, fireWin, runTimers, settle, tick };
}
function boot(opts) { const d = fakeDom(opts); vm.runInNewContext(bootJs, d.win); return d; }

test('launch screen code sits in <head>, before any app markup can paint', () => {
    assert.ok(bootJs.length > 200 && bootCss.length > 200);
    const headEnd = html.indexOf('</head>'), body = html.search(/<body[\s>]/);
    const js = html.indexOf('<script id="lwBootJs">'), css = html.indexOf('<style id="lwBootCss">');
    assert.ok(css > 0 && js > css && js < headEnd && js < body, 'gate must be in head, before <body>');
    assert.ok(html.indexOf('data-theme-mode') < js, 'runs after the theme is known, so the launch screen matches light/dark');
    assert.strictEqual(html.split('id="lwBootJs"').length, 2, 'exactly one launch-screen script');
});

test('while starting, the app is hidden with opacity only (layout and measuring keep working) and the launch screen matches the theme', () => {
    assert.match(bootCss, /html\.lw-boot body,html\.lw-boot>:not\(head\):not\(body\):not\(#lwBoot\)\{opacity:0!important;pointer-events:none!important\}/);
    assert.doesNotMatch(bootCss, /display:none|visibility:hidden/);
    assert.match(bootCss, /#lwBoot\{position:fixed;inset:0;z-index:2147483646/);
    assert.match(bootCss, /#lwBoot\{[^}]*background:#03050a/);
    assert.match(bootCss, /html\[data-theme=light\] #lwBoot\{background:#f6f8fc/);
    assert.match(bootCss, /#lwBoot>\*\{opacity:0;animation:lwbIn \.35s ease \.25s forwards\}/, 'fast starts show only the calm background, no logo flash');
    assert.match(bootCss, /prefers-reduced-motion:reduce\)\{#lwBoot,#lwBoot>\*\{transition:none;animation:none;opacity:1\}/);
});

test('the app shows once the page and every companion file are in, after two frames', () => {
    const d = boot();
    assert.ok(d.cls.has('lw-boot'));
    const splash = d.H.children.find(c => c.id === 'lwBoot');
    assert.ok(splash && /LOW<i>i<\/i>SPIKE/.test(splash.innerHTML));
    const B = d.win.LowiBoot;
    B.loaded(); d.flushRaf();
    assert.ok(d.cls.has('lw-boot'), 'files alone are not enough while the page is still parsing');
    d.fire('DOMContentLoaded');
    assert.ok(d.cls.has('lw-boot'), 'waits for the page to be still, then two frames, so the first visible frame is the settled one');
    assert.ok(d.timers.some(t => t.ms === 60), 'checks the layout every 60 ms until it holds still');
    d.flushRaf(); assert.ok(d.cls.has('lw-boot'));
    d.settle();
    assert.ok(!d.cls.has('lw-boot'));
    assert.match(String(d.win.__LOWI_BOOT_Q), /still/);
    assert.strictEqual(d.win.__LOWI_BOOT_DONE, 'ready');
    assert.strictEqual(d.events[0].type, 'lowi:boot-ready');
    assert.ok(splash._cls.has('out'), 'launch screen fades away over the finished app');
    d.runTimers(t => t.ms === 260);
    assert.ok(!d.H.children.includes(splash), 'launch screen is removed afterwards');
    B.reveal('again'); assert.strictEqual(d.win.__LOWI_BOOT_DONE, 'ready'); assert.strictEqual(d.events.length, 1);
});

test('a page that keeps changing still opens after the 0.7 s stillness cap', () => {
    const d = boot({ readyState: 'complete', restless: true });
    d.win.LowiBoot.loaded();
    for (let i = 0; i < 6; i++) { d.tick(60); d.runTimers(t => t.ms === 60); }
    d.flushRaf(); assert.ok(d.cls.has('lw-boot'), 'still changing: keep waiting');
    for (let i = 0; i < 8; i++) { d.tick(60); d.runTimers(t => t.ms === 60); }
    d.flushRaf();
    assert.ok(!d.cls.has('lw-boot')); assert.match(String(d.win.__LOWI_BOOT_Q), /max/);
});

test('it can never trap you on the launch screen', () => {
    let d = boot();
    assert.ok(d.timers.some(t => t.ms === 8000), 'hard cap');
    d.runTimers(t => t.ms === 8000);
    assert.ok(!d.cls.has('lw-boot')); assert.strictEqual(d.win.__LOWI_BOOT_DONE, 'cap');
    d = boot();
    d.fireWin('load'); d.runTimers(t => t.ms === 300);
    assert.ok(!d.cls.has('lw-boot'), 'page fully loaded but the companion loader never reported: open anyway');
    assert.strictEqual(d.win.__LOWI_BOOT_DONE, 'load');
    d = boot({ search: '?noboot=1' });
    assert.ok(!d.cls.has('lw-boot') && !d.win.LowiBoot, '?noboot=1 skips the launch screen');
});

test('stylesheets still loading get a short moment, never more than 1.2 s', () => {
    const sheet = { sheet: null, _l: {}, addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); } };
    let d = boot({ readyState: 'interactive', sheets: [sheet] });
    d.win.LowiBoot.loaded(); d.flushRaf();
    assert.ok(d.cls.has('lw-boot'));
    sheet._l.load.forEach(f => f()); d.settle();
    assert.ok(!d.cls.has('lw-boot'));
    const stuck = { sheet: null, addEventListener() {} };
    d = boot({ readyState: 'complete', sheets: [stuck] });
    d.win.LowiBoot.loaded(); d.flushRaf();
    assert.ok(d.cls.has('lw-boot'));
    assert.ok(d.timers.some(t => t.ms === 1200));
    d.runTimers(t => t.ms === 1200); d.settle();
    assert.ok(!d.cls.has('lw-boot'));
});

test('reduced motion: the launch screen leaves at once, without a fade', () => {
    const d = boot({ still: true, readyState: 'complete' });
    d.win.LowiBoot.loaded(); d.settle();
    assert.ok(!d.cls.has('lw-boot'));
    assert.ok(!d.H.children.some(c => c.id === 'lwBoot'));
});

/* Run the companion loader against a fake document. */
function runLoader() {
    const start = loader.indexOf('(function loadHerb(attempt){'), end = loader.indexOf('})(0);', start) + 6;
    const src = loader.slice(start, end);
    const head = [], byId = {};
    let booted = 0;
    const D = { head: { appendChild: el => { head.push(el); if (el.id) byId[el.id] = el; return el; }, append: el => { head.push(el); if (el.id) byId[el.id] = el; } },
        getElementById: id => byId[id] || null, createElement: tag => ({ tagName: tag }) };
    const win = { LowiR2: {}, LowiBoot: { loaded: () => booted++ }, console: { warn() {} } };
    win.window = win;
    vm.runInNewContext('const D=doc;' + src, Object.assign(win, { doc: D, setTimeout }));
    return { head, win, booted: () => booted };
}

test('companion files all download at once and still run in list order', () => {
    assert.doesNotMatch(loader, /s\.onload=next/, 'no one-by-one download chain');
    const r = runLoader();
    const scripts = r.head.filter(e => e.tagName === 'script');
    const files = JSON.parse(loader.match(/const files=(\[[^\]]*\])/)[1].replace(/'/g, '"'));
    assert.strictEqual(scripts.length, files.length, 'every file is requested right away');
    assert.deepStrictEqual(scripts.map(s => s.src.split('?')[0]), files, 'in list order');
    assert.ok(scripts.every(s => s.async === false), 'async=false keeps execution in list order');
    const v = loader.match(/const v='(\d{8}-\d{6})'/)[1];
    assert.ok(scripts.every(s => s.src.endsWith('?v=' + v)));
    assert.strictEqual(r.booted(), 0);
    scripts.slice(0, -1).forEach(s => s.onload());
    assert.strictEqual(r.booted(), 0, 'not before the last one');
    scripts[scripts.length - 1].onerror();
    assert.strictEqual(r.booted(), 1, 'a failed file still lets the app open');
});

test('the loader also reports when the app shell never appears', () => {
    assert.match(loader, /if\(!window\.LowiR2\)\{if\(\(attempt\|\|0\)<120\)setTimeout\(\(\)=>loadHerb\(\(attempt\|\|0\)\+1\),50\);else\{try\{if\(window\.LowiBoot\)window\.LowiBoot\.loaded\(\);\}catch\(x\)\{\}\}return;\}/);
});

/* Run the service worker's fetch handler with fake caches. */
function swHarness(cached, online) {
    const handlers = {}, puts = [], fetched = [];
    const store = new Map(Object.entries(cached));
    const cache = { match: req => Promise.resolve(store.get(typeof req === 'string' ? req : req.url)), put: (req, res) => { puts.push(typeof req === 'string' ? req : req.url); return Promise.resolve(); },
        addAll: () => Promise.resolve() };
    const ctx = { self: { addEventListener: (t, f) => handlers[t] = f, location: { origin: 'https://x.test' }, registration: { scope: 'https://x.test/lowispike/' }, skipWaiting() {}, clients: { claim() {} } },
        caches: { open: () => Promise.resolve(cache), match: req => Promise.resolve(store.get(typeof req === 'string' ? req : req.url)), keys: () => Promise.resolve([]) },
        fetch: (req) => { fetched.push(typeof req === 'string' ? req : req.url); return online ? Promise.resolve({ ok: true, body: 'net', clone() { return this; } }) : Promise.reject(new TypeError('offline')); },
        Response: { error: () => ({ error: true }) }, URL, Promise, importScripts() {} };
    vm.runInNewContext(sw, ctx);
    const go = (u) => new Promise((res) => handlers.fetch({ request: { method: 'GET', url: u, mode: 'no-cors', headers: { get: () => '' } }, respondWith: p => Promise.resolve(p).then(res) }));
    return { go, puts, fetched };
}

test("this build's versioned files come straight from the cache; other builds and offline misses are handled", async () => {
    const B = sw.match(/const SHELL_BUILD = "(\d{8}-\d{6})"/)[1];
    const u = 'https://x.test/lowispike/spirit.js?v=' + B;
    let h = swHarness({ [u]: { body: 'cached' } }, true);
    assert.strictEqual((await h.go(u)).body, 'cached');
    assert.deepStrictEqual(h.fetched, [], 'no network round trip on launch');
    h = swHarness({}, true);
    assert.strictEqual((await h.go(u)).body, 'net');
    assert.deepStrictEqual(h.puts, [u], 'first use fills the cache');
    h = swHarness({ 'https://x.test/lowispike/spirit.js': { body: 'plain' } }, false);
    assert.strictEqual((await h.go(u)).body, 'plain', 'offline miss falls back to the plain cached copy');
    const other = 'https://x.test/lowispike/spirit.js?v=20990101-000000';
    h = swHarness({ [other]: { body: 'stale' } }, true);
    const r = await h.go(other);
    assert.ok(h.fetched.length >= 1 && r.body === 'net', 'a page from another build still goes to the network first');
});

test('service worker precaches this build under the exact URLs the loader asks for', () => {
    assert.match(sw, /const OWN = STATIC\.filter\(f => \/\\\.\(js\|css\)\$\/\.test\(f\) && f\.indexOf\("vendor\/"\) !== 0\), PLAIN = STATIC\.filter\(f => OWN\.indexOf\(f\) < 0\);/);
    assert.match(sw, /const u = f \+ "\?v=" \+ SHELL_BUILD;/);
    assert.ok(sw.indexOf('url.searchParams.get("v") === SHELL_BUILD') < sw.indexOf('spirit-core.js", "lowi-icons.js", "lowi-icons.css", "spirit.js"', sw.indexOf('addEventListener("fetch"')),
        'the versioned branch comes before the network-first list');
    const swB = sw.match(/const SHELL_BUILD = "(\d{8}-\d{6})"/)[1], lB = loader.match(/const v='(\d{8}-\d{6})'/)[1];
    assert.strictEqual(swB, lB, 'loader and service worker agree on the build, so the cache is hit');
});
