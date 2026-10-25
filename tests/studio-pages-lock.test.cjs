'use strict';
/* 25 Oct 2026 (Emmanuel: "I wanted the studio to be, like, private. So only I can access it with a password." Then: "Ok nice if
   only I can see it it's ok."): the standalone Affiliates and Creation pages get the same server-checked lock as Community >
   Studio (admin account straight in, everyone else the PIN). Nothing of the page renders or loads before the server says yes.
   Unlocked Studio shows a small "Private · only you" badge and a Lock button that locks this device again. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../studio-lock-core.js');

test('core: a device locked with the Lock button stays locked, even for the owner, until the right PIN', () => {
    assert.equal(C.PREVIEW_KEY, 'lowi.studio.locked');
    assert.equal(C.decide(true, 'uid:me', '', 'me', true), false, 'server yes, but this device was locked');
    assert.equal(C.decide(null, 'uid:me', '', 'me', true), false);
    assert.equal(C.decide(true, '', '', 'me', false), true, 'owner straight in when not locked here');
    assert.equal(C.decide(true, '', '', 'me'), true, 'old 4-argument calls unchanged');
    assert.equal(C.decide(false, 'pass', 'a'.repeat(48), '', false), false);
});

test('core: badge and Lock texts in EN/DE/ES; the lock panel markup is shared', () => {
    for (const l of ['en', 'de', 'es']) {
        const t = C.text(l);
        assert.ok(t.badge && t.lockNow && t.lockAria, l);
    }
    assert.equal(C.text('en').badge, 'Private · only you');
    assert.equal(C.text('de').badge, 'Privat · nur du');
    assert.equal(C.text('es').badge, 'Privado · solo tú');
    assert.equal(C.text('en').lockNow, 'Lock');
    const h = C.lockHtml('de', false, '');
    assert.match(h, /Im Aufbau/);
    assert.match(h, /type="password" inputmode="numeric" pattern="\[0-9\]\*" maxlength="8" autocomplete="off"/);
    assert.match(h, /<form class="sl-pin" novalidate hidden>/, 'PIN form closed until the lock button');
    assert.match(C.lockHtml('en', true, '<b>'), /&lt;b&gt;/, 'message escaped');
    const o = C.openHtml('en');
    assert.match(o, /🔒/);
    assert.match(o, /Private · only you/);
    assert.match(o, /data-sl="lock"/);
});

function scripts(html) { return [...html.matchAll(/<script\b([^>]*)>/g)].map(m => m[1]); }

for (const page of ['affiliates/index.html', 'create/index.html']) {
    test(page + ': only the lock runs; content is inert until the server says yes', () => {
        const html = read(page);
        const head = html.slice(0, html.indexOf('</head>'));
        assert.match(head, /<link rel="stylesheet" href="\.\.\/studio-lock\.css">/);
        assert.match(head, /<script src="\.\.\/studio-lock-core\.js"><\/script>/);
        assert.match(head, /<script src="\.\.\/studio-gate\.js"><\/script>/);
        for (const a of scripts(html)) {
            if (/src="\.\.\/studio-(lock-core|gate)\.js"/.test(a)) continue;
            assert.match(a, /type="text\/x-studio"/, 'not run before unlock: <script' + a + '>');
        }
        assert.doesNotMatch(html, /<link rel="stylesheet" href="blueprint\.css">/, 'page styles wait too');
        const body = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>'));
        const tpl = body.indexOf('<template id="studioPage">'), end = body.indexOf('</template>');
        assert.ok(tpl > 0 && end > tpl, 'content inside <template id="studioPage">');
        const outside = body.slice(body.indexOf('>') + 1, tpl) + body.slice(end + 11);
        assert.doesNotMatch(outside.replace(/<script\b[^>]*>[^]*?<\/script>/g, ''), /<(h1|h2|p|section|main|button|div)\b/, 'nothing visible outside the template');
    });
}

test('gate: asks the server with the device pass; the admin session goes along; the PIN is never in the code', () => {
    const g = read('studio-gate.js');
    assert.match(g, /rpc\('studio_access', \{ pass: p \|\| null \}\)/);
    assert.match(g, /rpc\('studio_unlock', \{ pin \}\)/);
    assert.match(g, /storageKey: 'lowi\.auth'/, 'same sign-in as the app, so the owner gets straight in');
    assert.doesNotMatch(g + read('affiliates/index.html') + read('create/index.html'), /1994/);
    assert.doesNotMatch(g, /innerHTML\s*=\s*[^;]*(location|search|hash)/);
});

/* ---- the gate in a small fake page: content appears only after a server yes ---- */
class Node_ {
    constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.attrs = {}; this.parentNode = null; this.hidden = false; this.textContent = ''; this.dataset = {}; this.listeners = {}; this.classList = { add() { }, remove() { }, contains: () => false }; this.style = { setProperty() { } }; }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(n) { if (n.isFragment) { n.children.slice().forEach(c => this.appendChild(c)); n.children = []; return n; } if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.children.push(n); if (this.onAppend) this.onAppend(n); return n; }
    insertBefore(n, ref) { if (!ref) return this.appendChild(n); if (n.isFragment) { n.children.slice().forEach(c => this.insertBefore(c, ref)); n.children = []; return n; } if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, n); return n; }
    removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); n.parentNode = null; return n; }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    replaceWith(n) { const p = this.parentNode; if (!p) return; p.insertBefore(n, this); p.removeChild(this); }
    get firstChild() { return this.children[0] || null; }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n.tagName === '#DOC'; }
    set innerHTML(v) { this._html = String(v); this.children = []; }
    get innerHTML() { return this._html || ''; }
    walk(f, out) { out = out || []; for (const c of this.children) { if (f(c)) out.push(c); c.walk(f, out); } return out; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    querySelectorAll(sel) {
        const m = /^([a-z]+)(?:\[(\w+)="([^"]+)"\])?$/.exec(sel);
        if (m) return this.walk(n => n.tagName === m[1].toUpperCase() && (!m[2] || n.attrs[m[2]] === m[3]));
        const c = /^\.([\w-]+)/.exec(sel); if (c) return this.walk(n => String(n.attrs.class || n.className || '').split(/\s+/).includes(c[1]));
        return [];
    }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    removeEventListener() { }
    focus() { }
    closest() { return null; }
}
function fakePage(search, store, server) {
    const doc = new Node_('#doc'), html = doc.appendChild(new Node_('html')), head = html.appendChild(new Node_('head')), body = html.appendChild(new Node_('body'));
    const tpl = body.appendChild(new Node_('template')); tpl.setAttribute('id', 'studioPage');
    const frag = new Node_('#frag'); frag.isFragment = true; const h1 = new Node_('h1'); h1.textContent = 'SECRET'; frag.children.push(h1); tpl.content = frag;
    const s1 = body.appendChild(new Node_('script')); s1.setAttribute('type', 'text/x-studio'); s1.setAttribute('src', 'blueprint.js');
    const css = head.appendChild(new Node_('link')); css.setAttribute('rel', 'studio-stylesheet'); css.setAttribute('href', 'blueprint.css');
    const added = []; body.onAppend = n => { if (n.tagName === 'SCRIPT') added.push(n); };
    Object.assign(doc, {
        documentElement: html, head, body, readyState: 'complete',
        createElement: t => new Node_(t), getElementById: id => doc.walk(n => n.id === id)[0] || null,
        importNode: n => { const f = new Node_('#frag'); f.isFragment = true; f.children = n.children.slice(); return f; }
    });
    const calls = [];
    const win = {
        document: doc, location: { search, pathname: '/lowispike/affiliates/', href: 'https://therealetm.github.io/lowispike/affiliates/' + search, reload() { win.reloaded = true; } },
        navigator: { language: 'en', onLine: true }, console, setTimeout, clearTimeout, Promise, JSON, Date, URLSearchParams,
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        addEventListener() { }, dispatchEvent() { }, CustomEvent: function () { },
        fetch: async (url, opt) => { calls.push({ url, body: JSON.parse(opt.body || '{}') }); const d = server(url, JSON.parse(opt.body || '{}')); return { ok: true, status: 200, json: async () => d }; }
    };
    win.window = win; win.self = win; win.parent = win; win.top = win;
    vm.createContext(win);
    vm.runInContext(read('studio-lock-core.js'), win, { filename: 'studio-lock-core.js' });
    vm.runInContext(read('studio-gate.js'), win, { filename: 'studio-gate.js' });
    return { win, doc, body, css, added, calls, secretShown: () => body.walk(n => n.textContent === 'SECRET').length > 0 };
}
const settle = () => new Promise(r => setTimeout(r, 30));

test('gate: server says no -> only the lock, no page content, no page script, no page styles', async () => {
    const p = fakePage('', {}, () => false);
    await settle();
    assert.equal(p.calls.length, 1); assert.match(p.calls[0].url, /\/rest\/v1\/rpc\/studio_access$/);
    assert.equal(p.secretShown(), false); assert.equal(p.added.length, 0); assert.equal(p.css.getAttribute('rel'), 'studio-stylesheet');
    assert.ok(p.body.querySelector('.sl-lock'), 'lock panel shown');
    assert.equal(p.win.LowiStudioGate.state(), 'locked');
});

test('gate: server says yes -> the page appears, its scripts and styles load, badge + Lock shown', async () => {
    const pass = 'b'.repeat(48);
    const p = fakePage('', { 'lowi.studio.pass': pass }, () => true);
    await settle();
    assert.equal(p.calls[0].body.pass, pass);
    assert.equal(p.secretShown(), true); assert.equal(p.added.length, 1); assert.equal(p.added[0].getAttribute('src') || p.added[0].src, 'blueprint.js');
    assert.equal(p.css.getAttribute('rel'), 'stylesheet');
    assert.ok(p.body.querySelector('.sl-open'), 'Private badge + Lock');
    assert.equal(p.win.LowiStudioGate.state(), 'open');
});

test('gate: a refused pass is forgotten; no answer and nothing remembered stays locked', async () => {
    const store = { 'lowi.studio.pass': 'c'.repeat(48), 'lowi.studio.ok': 'pass' };
    const p = fakePage('', store, () => false);
    await settle();
    assert.equal(store['lowi.studio.pass'], undefined); assert.equal(store['lowi.studio.ok'], undefined); assert.equal(p.secretShown(), false);
    const q = fakePage('', {}, () => { throw new Error('offline'); });
    await settle();
    assert.equal(q.secretShown(), false);
});

test('gate: Lock locks this device (even the owner) until the right PIN; a wrong PIN stays locked', async () => {
    const store = { 'lowi.studio.locked': '1' };
    let pinOk = false;
    const p = fakePage('', store, (url, b) => /studio_unlock/.test(url) ? (pinOk && b.pin === '4321' ? { ok: true, pass: 'd'.repeat(48) } : { ok: false, reason: 'wrong' }) : true);
    await settle();
    assert.equal(p.secretShown(), false, 'locked here even though the server would say yes');
    assert.equal(await p.win.LowiStudioGate.unlock('0000'), false);
    assert.equal(p.secretShown(), false);
    pinOk = true;
    assert.equal(await p.win.LowiStudioGate.unlock('4321'), true);
    assert.equal(store['lowi.studio.locked'], undefined); assert.equal(store['lowi.studio.pass'], 'd'.repeat(48));
    assert.equal(p.secretShown(), true);
    p.win.LowiStudioGate.lock();
    assert.equal(store['lowi.studio.locked'], '1'); assert.equal(store['lowi.studio.pass'], undefined); assert.equal(p.win.reloaded, true);
});

test('gate: an affiliate invite link (?ref=) shows the same lock and only remembers the ref on this device', async () => {
    const store = {}, id = '0f8c2a52-1d3e-4b6f-9a7c-2e5d8b1c4f60';
    const p = fakePage('?ref=' + id, store, () => false);
    await settle();
    assert.equal(p.secretShown(), false);
    assert.equal(store['lowi.aff.ref'], id);
    const q = fakePage('?ref=<script>', {}, () => false);
    await settle();
    assert.equal(q.win.localStorage.getItem('lowi.aff.ref'), null);
});

test('in-app Studio: the open badge and Lock button, and Lock keeps this device locked', () => {
    const js = read('studio-lock.js'), ui = read('community-rooms-ui.js'), css = read('studio-lock.css');
    assert.match(js, /function lockDevice\(\)/);
    assert.match(js, /put\(C\.PREVIEW_KEY, '1'\)/);
    assert.match(js, /put\(C\.PREVIEW_KEY, ''\)/, 'the right PIN clears it');
    assert.match(js, /paintOpen/);
    assert.match(ui, /SL\.paintOpen\(box,!!VIEWS\[view\]&&!lk&&pageActive\(\)\)/);
    assert.match(css, /\.sl-open\{/);
    assert.match(css, /\.sl-lock\.sl-page\{[^}]*position:fixed/);
});
