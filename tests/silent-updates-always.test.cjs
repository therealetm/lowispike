'use strict';
// Oct 26 2026 (Emmanuel, voice message about 5:30 AM: "you're supposed to push out the update silently. It's annoying when people
// get notified of every update. So, no more notification updates."): every release is silent, always. No "I've got something new
// for you!" / "New version" ask, no "Update loaded", no push and no Community post about a release. version.json "loud" stays
// frozen at 20000101-000000, so builds that are already on phones (they read "loud") stay quiet too. A newer build loads by
// itself: on the next open, or quietly when the app comes back after a long time away. The What's New tour inside the app stays.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { applyBump } = require('../scripts/bump-build.cjs');
const { check } = require('../scripts/release-check.cjs');
const FROZEN = '20000101-000000';

const start = html.indexOf('const BUILD = (document.querySelector'), end = html.indexOf('function sw(){', start);
const source = html.slice(start, end);
const old = '20261025-100000', latest = '20261026-051305';
function app(build, live, initial = {}) {
    const made = new Set(), nodes = new Map(), local = new Map(Object.entries(initial.local || {})), session = new Map(Object.entries(initial.session || {}));
    const timers = [], replaces = [], events = [];
    const storage = map => ({ getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k) });
    const element = () => { const cls = new Set(); return { dataset: {}, style: {}, classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) }, setAttribute() { }, remove() { nodes.delete(this.id); } }; };
    const active = initial.active || null;
    const document = { body: {}, readyState: 'complete', visibilityState: 'visible', activeElement: active, dispatchEvent: e => { events.push(e.detail); return true; },
        documentElement: { lang: 'en', appendChild: n => { made.add(n.id); nodes.set(n.id, n); } }, createElement: element,
        querySelector: s => (s.includes('meta[') ? { content: build } : null), querySelectorAll: () => initial.fields || [] };
    const url = new URL(initial.url || 'https://example.com/lowispike/#home');
    const location = { href: url.href, protocol: url.protocol, pathname: url.pathname, search: url.search, hash: url.hash, replace: u => replaces.push(u) };
    const ctx = vm.createContext({ document, location, navigator: initial.navigator || {}, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = (o || {}).detail; } }, clearTimeout: () => { },
        window: { addEventListener() { } }, localStorage: storage(local), sessionStorage: storage(session), history: { state: null, replaceState() { } }, URL, Date, Promise,
        $: s => nodes.get(s.slice(1)) || null, getComputedStyle: () => ({ fontFamily: 'system-ui' }), setTimeout: (fn) => { timers.push(fn); return timers.length; },
        fetch: async () => ({ ok: true, status: 200, json: async () => live, text: async () => JSON.stringify(live) }) });
    vm.runInContext(source, ctx);
    const settle = async () => { for (let k = 0; k < 6; k++) { await new Promise(r => setImmediate(r)); timers.splice(0).forEach(f => { try { f(); } catch (e) { } }); } };
    return { ctx, made, nodes, local, session, replaces, events, settle, run: e => vm.runInContext(e, ctx) };
}

test('a newer build never puts an update ask on screen: no "loud", an old-style loud build, or the frozen one', async () => {
    for (const live of [{ build: latest }, { build: latest, loud: latest }, { build: latest, loud: FROZEN }]) {
        const a = app(old, live);
        await a.run('checkUpdate(true)'); await a.settle();
        assert(!a.made.has('lcUpd'), 'no update ask for ' + JSON.stringify(live));
        assert(!a.events.some(e => e && e.state === 'show'), 'the orb is never told to show an update card');
        assert.equal(a.replaces.length, 0, 'and nothing reloads while the app is in use');
    }
});

test('a new build that arrived by itself never says "Update loaded"', async () => {
    for (const live of [{ build: latest }, { build: latest, loud: latest }]) {
        const a = app(latest, live, { local: { 'lowi.build': old } });
        a.run('afterUpdate()'); await a.settle();
        assert(!a.made.has('lcUpdOk'), 'no toast for ' + JSON.stringify(live));
        assert.equal(a.local.get('lowi.build'), latest);
    }
});

test('back after a long time away, a newer build loads quietly, once per build, and says nothing', async () => {
    const a = app(old, { build: latest, loud: FROZEN });
    a.run('updAway(11 * 60000)'); await a.run('checkUpdate(true)'); await a.settle();
    assert.equal(a.replaces.length, 1, 'one quiet load');
    const u = new URL(a.replaces[0], 'https://example.com');
    assert.equal(u.searchParams.get('v'), latest); assert.equal(u.searchParams.get('q'), '1');
    assert(!a.made.has('lcUpd') && !a.made.has('lcUpdOk'));
    a.run('updAway(11 * 60000)'); await a.run('checkUpdate(true)'); await a.settle();
    assert.equal(a.replaces.length, 1, 'never a second try for the same build (no reload loop)');
    const b = app(latest, { build: latest, loud: FROZEN }, { session: { 'lowi.upd.q': latest }, url: 'https://example.com/lowispike/?v=' + latest + '&r=1&q=1#home', local: { 'lowi.build': old } });
    b.run('afterUpdate()'); await b.settle();
    assert(!b.made.has('lcUpdOk'), 'the quiet load opens without any toast');
    const c = app(old, { build: latest, loud: FROZEN }, { session: { 'lowi.upd.q': latest }, url: 'https://example.com/lowispike/?v=' + latest + '&r=1&q=1#home' });
    c.run('afterUpdate()'); await c.settle();
    assert(!c.made.has('lcUpdOk'), 'a quiet load that got the old page says nothing either');
});

test('the quiet load waits: not after a short break, not while typing, not offline', async () => {
    const short = app(old, { build: latest });
    short.run('updAway(2 * 60000)'); await short.run('checkUpdate(true)'); await short.settle();
    assert.equal(short.replaces.length, 0, 'a two minute break keeps the page');
    const typing = app(old, { build: latest }, { active: { tagName: 'TEXTAREA', value: 'half a message' } });
    typing.run('updAway(30 * 60000)'); await typing.run('checkUpdate(true)'); await typing.settle();
    assert.equal(typing.replaces.length, 0, 'never under your fingers');
    const draft = app(old, { build: latest }, { fields: [{ tagName: 'TEXTAREA', value: 'draft', type: 'textarea' }] });
    draft.run('updAway(30 * 60000)'); await draft.run('checkUpdate(true)'); await draft.settle();
    assert.equal(draft.replaces.length, 0, 'a written draft keeps the page');
    const offline = app(old, { build: latest }, { navigator: { onLine: false } });
    offline.run('updAway(30 * 60000)'); await offline.run('checkUpdate(true)'); await offline.settle();
    assert.equal(offline.replaces.length, 0, 'offline keeps the page it has');
});

test('version.json keeps "loud" frozen right after "build", inside the 64 bytes old builds read', () => {
    const raw = fs.readFileSync(path.join(root, 'version.json'), 'utf8');
    assert.equal(JSON.parse(raw).loud, FROZEN);
    assert(/^\{"build":"\d{8}-\d{6}","loud":"20000101-000000"/.test(raw.slice(0, 64)), raw.slice(0, 64));
});

function fixture(id, extra) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lowi-silent-'));
    fs.writeFileSync(path.join(d, 'index.html'), '<meta name="lowi-build" content="' + id + '">\n');
    fs.writeFileSync(path.join(d, 'sw.js'), 'const SHELL_BUILD = "' + id + '";\nconst CACHE = "lowispike-updates-' + id + '";\n');
    fs.writeFileSync(path.join(d, 'apple-ui.js'), "  const v='" + id + "';\n");
    fs.writeFileSync(path.join(d, 'version.json'), JSON.stringify(Object.assign({ build: id }, extra || {}, { news: { id: 'n-' + id, go: { tab: 'home' }, tutorial: { none: 'a test fixture with no tour' }, text: { en: 'Hi', de: 'Hallo', es: 'Hola' } } })) + '\n');
    return d;
}

test('every release keeps "loud" frozen: with What\'s New, quiet, and from an old version.json with a real loud build', () => {
    const news = { slug: 'x', text: { en: 'New', de: 'Neu', es: 'Nuevo' }, tutorial: { none: 'nothing to point at here' } };
    for (const [extra, n, o] of [[{ loud: '20261025-233717' }, news, {}], [{ loud: '20261025-233717' }, null, { quiet: true }], [{}, null, {}], [{ loud: FROZEN }, news, {}]]) {
        const d = fixture('20261026-100000', extra);
        applyBump(d, '20261026-100000', '20261026-100001', n, o);
        const raw = fs.readFileSync(path.join(d, 'version.json'), 'utf8');
        assert.equal(JSON.parse(raw).loud, FROZEN, JSON.stringify([extra, !!n, o]));
        assert(raw.indexOf('"loud":"' + FROZEN + '"') < 64, 'still where old builds look');
    }
});

test('the release check fails any version.json that would make phones ask to update', () => {
    for (const loud of ['20261026-100000', undefined]) {
        const d = fixture('20261026-100000', loud ? { loud } : {});
        const r = check(d);
        assert(r.errors.some(e => /loud/.test(e) && /silent/i.test(e)), 'loud=' + loud + ': ' + r.errors.join(' | '));
    }
    const ok = check(fixture('20261026-100000', { loud: FROZEN }));
    assert(!ok.errors.some(e => /loud/.test(e)), ok.errors.join(' | '));
});

test('no release script can notify users: no push, no Community post, no notify flag', () => {
    const dir = path.join(root, 'scripts');
    for (const f of fs.readdirSync(dir).filter(f => /\.(sh|cjs|js|mjs|py)$/.test(f))) {
        const t = fs.readFileSync(path.join(dir, f), 'utf8');
        assert(!/n1-push|functions\/v1|push_subscriptions|community_messages|community_posts|web-push|webpush|sendNotification/i.test(t), f + ' reaches users');
    }
    const rel = fs.readFileSync(path.join(dir, 'release.sh'), 'utf8');
    assert(!/--notify|--loud|--announce/.test(rel), 'release.sh has no way to announce a release');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert(!/version\.json[\s\S]{0,200}showNotification|showNotification[\s\S]{0,200}(update|release|new version)/i.test(sw), 'the service worker never shows an update notification');
});

test('the rule is written down for every Maya and every bug hunt', () => {
    const pb = fs.readFileSync(path.join(root, 'AI_PLAYBOOK.md'), 'utf8'), ho = fs.readFileSync(path.join(root, 'MAYA-HANDOFF.md'), 'utf8');
    assert(/always ship silently/i.test(pb) && /20000101-000000/.test(pb), 'AI_PLAYBOOK.md');
    assert(/always ship silently|ALWAYS ship silently/.test(ho), 'MAYA-HANDOFF.md');
});
