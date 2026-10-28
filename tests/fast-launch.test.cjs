// Oct 28 2026, Emmanuel: "Die Öffnung der App, das dauert zu lange. Es ist irgendwie weiß, wenn man das öffnet, für so 2 Sekunden ...
// if the app has to load, at least have an impressive loading animation. But that loading animation should not make the app feel like
// it's taking too long."
// 1. The service worker opens the page saved on the phone straight away when it is the live build (it only asks version.json's first
//    64 bytes), downloads the page only when a newer build is live, and opens the saved page when the network is slow or gone.
// 2. The launch glow (on the html element, so it shows from the first frame) has no minimum time and fades into Home in 0.26 s.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const swSrc = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const bootJs = (html.match(/<script id="lwBootJs">([\s\S]*?)<\/script>/) || [])[1] || '';
const bootCss = (html.match(/<style id="lwBootCss">([\s\S]*?)<\/style>/) || [])[1] || '';
const ORIGIN = 'https://therealetm.github.io', SCOPE = ORIGIN + '/lowispike/';

function body(text, chunk) {
    const enc = new TextEncoder().encode(text); let i = 0; const n = chunk || 64;
    return { getReader() { return { read: () => Promise.resolve(i >= enc.length ? { done: true } : { done: false, value: enc.slice(i, i += n) }), cancel() { i = enc.length; } }; } };
}
function resp(text, status) { const r = { ok: (status || 200) < 300, status: status || 200, text, body: body(text), clone: () => resp(text, status) }; return r; }
const pageOf = b => '<!doctype html><html><head><meta charset="utf-8"><meta name="lowi-build" content="' + b + '">' + 'x'.repeat(3000);

function loadSw(opts) {
    const listeners = {}, log = [], store = new Map();
    if (opts.saved) store.set('/lowispike/', resp(pageOf(opts.saved)));
    const cache = { match: k => Promise.resolve(store.get(typeof k === 'string' ? k : k.url)), put: (k, v) => { store.set(typeof k === 'string' ? k : k.url, v); log.push('put ' + k); return Promise.resolve(); }, addAll: () => Promise.resolve() };
    const sandbox = {
        self: { addEventListener: (t, f) => { listeners[t] = f; }, registration: { scope: SCOPE }, location: { origin: ORIGIN }, skipWaiting() {}, clients: { claim() {} } },
        caches: { open: () => Promise.resolve(cache), match: k => cache.match(k), keys: () => Promise.resolve([]), delete: () => Promise.resolve(true) },
        fetch: (u, o) => {
            const s = String(u); log.push('fetch ' + s.split('?')[0].replace(/.*\//, '/') + (o && o.headers && o.headers.Range ? ' range' : ''));
            if (/version\.json/.test(s)) return opts.live === undefined ? new Promise(() => {}) : opts.live === 'offline' ? Promise.reject(new Error('offline')) : Promise.resolve(resp('{"build":"' + opts.live + '","title":"x"' + '}', 206));
            if (opts.offline) return Promise.reject(new Error('offline'));
            return Promise.resolve(resp(pageOf(opts.net || opts.live)));
        },
        URL, TextDecoder, TextEncoder, Response: { error: () => ({ error: true }) }, setTimeout: (f, ms) => setTimeout(f, Math.min(ms, opts.fast ? 5 : ms)), clearTimeout, console, Promise, Date, Set, Map
    };
    vm.createContext(sandbox); vm.runInContext(swSrc, sandbox);
    return {
        log, open: async (q) => {
            let got = null, waits = [];
            listeners.fetch({ request: { method: 'GET', url: SCOPE + (q || ''), mode: 'navigate', headers: { get: () => null } }, respondWith: p => { got = p; }, waitUntil: p => waits.push(p) });
            assert.ok(got, 'the worker answers the launch');
            const r = await got; await Promise.all(waits).catch(() => {});
            return r;
        }
    };
}
const buildOf = r => (/name="lowi-build" content="([^"]+)"/.exec(r.text) || [])[1];

test('same build is live: the saved page opens straight away, the 1.7 MB page is not downloaded', async () => {
    const sw = loadSw({ saved: '20261028-130000', live: '20261028-130000' });
    const r = await sw.open();
    assert.strictEqual(buildOf(r), '20261028-130000');
    assert.deepStrictEqual(sw.log.filter(l => l.startsWith('fetch')), ['fetch version.json range'], 'only the tiny build check goes out');
});

test('a newer build is live (a release since the last launch): the new page comes from the network, so reopening brings updates', async () => {
    const sw = loadSw({ saved: '20261028-130000', live: '20261028-140000' });
    const r = await sw.open();
    assert.strictEqual(buildOf(r), '20261028-140000');
    assert.ok(sw.log.some(l => l === 'put /lowispike/'), 'the new page is saved for the next launch');
});

test('no answer about the live build (bad signal): the saved page opens after a short wait and is refreshed in the background', async () => {
    const sw = loadSw({ saved: '20261028-130000', net: '20261028-140000', fast: true });
    const r = await sw.open();
    assert.strictEqual(buildOf(r), '20261028-130000', 'opens the saved page');
    assert.ok(sw.log.some(l => l === 'put /lowispike/'), 'refreshes it for next time');
    assert.ok(/const LIVE_WAIT = (\d+)/.test(swSrc) && +RegExp.$1 <= 800, 'the build check never holds a launch longer than 0.8 s');
});

test('offline: the saved page opens', async () => {
    const sw = loadSw({ saved: '20261028-130000', live: 'offline', offline: true });
    const r = await sw.open();
    assert.strictEqual(buildOf(r), '20261028-130000');
});

test('first launch (nothing saved) and a tapped update (?v=) use the network', async () => {
    let sw = loadSw({ live: '20261028-140000' });
    assert.strictEqual(buildOf(await sw.open()), '20261028-140000');
    sw = loadSw({ saved: '20261028-130000', live: '20261028-130000', net: '20261028-140000' });
    assert.strictEqual(buildOf(await sw.open('?v=20261028-140000')), '20261028-140000');
    assert.ok(!sw.log.some(l => /version\.json/.test(l)), 'a tapped update does not ask for the build first');
});

test('the page names its build in its first kilobyte, where the worker reads it', () => {
    const i = html.indexOf('name="lowi-build"');
    assert.ok(i > 0 && i < 4096, 'meta lowi-build within the first 4 KB (at ' + i + ')');
    assert.ok(/<meta name="lowi-build" content="\d{8}-\d{6}">/.test(html));
    const v = fs.readFileSync(path.join(root, 'version.json'), 'utf8');
    assert.ok(/^\{\s*"build"\s*:\s*"\d{8}-\d{6}"/.test(v), 'version.json starts with the build, so 64 bytes are enough');
});

/* Oct 28 (later): the html::before/::after glow became the launch scene #lwLaunch (tests/launch-scene.test.cjs has the details). */
test('launch scene: fixed over the page from the first frame, centred on Home\'s ring, never moves the layout', () => {
    assert.ok(!/html\.lw-boot::(before|after)/.test(bootCss), 'the old pseudo-element glow is gone');
    assert.match(bootCss, /#lwLaunch\{position:fixed;top:0;right:0;bottom:0;left:0;/, 'fixed: it never moves the layout');
    assert.match(bootCss, /--lwl-x:var\(--o8-cx,50vw\);--lwl-y:var\(--o8-cy,46vh\)/, 'centred where Misty sits on Home');
    assert.match(bootCss, /prefers-reduced-motion/);
});

test('launch scene has no minimum time: Home shows the moment it is ready, the fade is 0.34 s and taps go through at once', () => {
    assert.match(bootJs, /H\.classList\.add\("lw-launch-out"\); H\.classList\.remove\("lw-boot"\);/);
    assert.match(bootJs, /H\.classList\.remove\("lw-launch-out"\); var L = document\.getElementById\("lwLaunch"\); if \(L && L\.parentNode\) L\.parentNode\.removeChild\(L\); \}, 380\)/);
    assert.match(bootCss, /html\.lw-launch-out #lwLaunch\{pointer-events:none;animation:lwlOut \.34s/, 'the scene lets taps through while it fades');
    assert.ok(!/minimum|MIN_SHOW|minShow/i.test(bootJs), 'no minimum display time');
});
