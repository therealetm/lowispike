'use strict';
/* Affiliates page, bug hunt 23 Oct 2026 (Affiliates + read-aloud):
   1. A wrong unlock code on one series left "That code doesn't work" under every other series too (UGC, LOWiSPIKE), where
      nothing had been typed. The message now belongs to the series it was typed on and clears when the series changes; it is
      kept as a key, so it is shown in the page's current language.
   2. On the LOWiSPIKE 30-day card, tapping minus moved the focus to plus (the check ran after day had already changed), and at
      day 30 the focus was lost on the disabled plus. Focus now stays on the button that was tapped, or moves to the other one.
   Runs affiliates/blueprint.js against a small stand-in DOM (no browser needed). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const A = require('../affiliates/access-core.js'), B = require('../affiliates/blueprint-core.js');

function makeDom() {
  const doc = { activeElement: null, hidden: false, listeners: {} };
  class Text { constructor(t) { this.nodeType = 3; this.data = String(t); this.parentNode = null; } get textContent() { return this.data; } set textContent(v) { this.data = String(v); } }
  class El {
    constructor(tag) { this.nodeType = 1; this.tagName = String(tag).toUpperCase(); this.childNodes = []; this.attrs = {}; this.parentNode = null; this.ls = {}; this.hidden = false; this.value = ''; this.style = {};
      const self = this; this.classList = { set: new Set(), add(...c) { c.forEach(x => this.set.add(x)); }, remove(...c) { c.forEach(x => this.set.delete(x)); }, toggle(c, on) { if (on === undefined ? !this.set.has(c) : on) this.set.add(c); else this.set.delete(c); }, contains(c) { return this.set.has(c); } }; void self; }
    get id() { return this.attrs.id || ''; } set id(v) { this.attrs.id = v; }
    get className() { return [...this.classList.set].join(' '); } set className(v) { this.classList.set = new Set(String(v).split(/\s+/).filter(Boolean)); }
    get disabled() { return 'disabled' in this.attrs; } set disabled(v) { if (v) this.attrs.disabled = ''; else delete this.attrs.disabled; }
    get firstChild() { return this.childNodes[0] || null; }
    get children() { return this.childNodes.filter(n => n.nodeType === 1); }
    get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
    setAttribute(k, v) { if (k === 'class') this.className = v; else this.attrs[k] = String(v); }
    getAttribute(k) { return k === 'class' ? this.className : (k in this.attrs ? this.attrs[k] : null); }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(n) { if (n.parentNode) n.parentNode.childNodes.splice(n.parentNode.childNodes.indexOf(n), 1); n.parentNode = this; this.childNodes.push(n); return n; }
    after(n) { const p = this.parentNode; if (!p) return; if (n.parentNode) n.parentNode.childNodes.splice(n.parentNode.childNodes.indexOf(n), 1); n.parentNode = p; p.childNodes.splice(p.childNodes.indexOf(this) + 1, 0, n); }
    remove() { if (this.parentNode) { this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this), 1); this.parentNode = null; } }
    get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
    set textContent(v) { this.childNodes.forEach(n => { n.parentNode = null; }); this.childNodes = []; if (v !== '' && v != null) this.appendChild(new Text(v)); }
    addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f); }
    removeEventListener() { }
    dispatch(t, extra) { const ev = Object.assign({ type: t, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }, extra || {}); (this.ls[t] || []).forEach(f => f.call(this, ev)); return ev; }
    click() { if (!this.disabled) this.dispatch('click'); }
    focus() { doc.activeElement = this; }
    blur() { if (doc.activeElement === this) doc.activeElement = null; }
    select() { }
    scrollIntoView() { }
    getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
    getClientRects() { return [1]; }
    walk(f) { for (const c of this.children) { if (f(c)) return c; const r = c.walk(f); if (r) return r; } return null; }
    querySelector(sel) { const t = sel.toUpperCase(); return this.walk(n => n.tagName === t); }
    querySelectorAll() { return []; }
  }
  const html = new El('html'), head = new El('head'), body = new El('body'); html.appendChild(head); html.appendChild(body);
  Object.assign(doc, {
    documentElement: html, head, body, title: '',
    createElement: t => new El(t), createElementNS: (ns, t) => new El(t), createTextNode: t => new Text(t),
    getElementById: id => html.walk(n => n.id === id),
    querySelector: sel => { const m = /^meta\[name="([^"]+)"\]$/.exec(sel); if (m) return head.walk(n => n.tagName === 'META' && n.attrs.name === m[1]); return html.querySelector(sel); },
    querySelectorAll: () => [],
    addEventListener: (t, f) => { (doc.listeners[t] = doc.listeners[t] || []).push(f); }, removeEventListener() { },
    execCommand: () => true
  });
  /* the static page from affiliates/index.html: every element with an id, the views with their headlines */
  const src = fs.readFileSync(path.join(root, 'affiliates', 'index.html'), 'utf8');
  const views = { viewStart: null, scriptView: null, shotView: null, earnView: null };
  let cur = body;
  for (const m of src.matchAll(/<(section|h1|button|div|span|p|h2|footer)\b([^>]*)>/g)) {
    const idm = /\bid="([^"]+)"/.exec(m[2]); if (!idm) continue;
    const el = new El(m[1]); el.id = idm[1]; if (/\shidden\b/.test(m[2])) el.hidden = true;
    if (m[1] === 'section') { body.appendChild(el); cur = el; views[el.id] = el; continue; }
    (el.id === 'toast' || el.id === 'app' ? body : cur).appendChild(el);
    if (el.id === 'startBtn' || el.id === 'toEarn') el.appendChild(new Text('x '));
  }
  return doc;
}

async function openPage(hash, list) {
  const doc = makeDom(), store = {};
  const loc = { href: 'https://therealetm.github.io/lowispike/affiliates/?lang=en' + (hash || ''), search: '?lang=en', hash: hash || '', pathname: '/lowispike/affiliates/' };
  const win = {
    document: doc, location: loc, navigator: { languages: ['en'], language: 'en' }, URL, URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval, console, crypto: globalThis.crypto,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    history: { replaceState: (s, t, u) => { const i = String(u).indexOf('#'); loc.hash = i >= 0 ? String(u).slice(i) : ''; } },
    scrollTo() { }, addEventListener() { }, removeEventListener() { }, matchMedia: () => ({ matches: false }), isSecureContext: false,
    TextEncoder, Uint8Array, Promise
  };
  win.window = win; win.self = win; win.parent = win; win.globalThis = win;
  win.LowiBlueprint = B; win.LowiAffAccess = A; win.LOWI_AFF_ACCESS = list; win.LOWI_AFF_RECRUITS = { verified: [] };
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(root, 'affiliates', 'blueprint.js'), 'utf8'), win, { filename: 'blueprint.js' });
  return { doc, win, $: id => doc.getElementById(id) };
}
const settle = () => new Promise(r => setTimeout(r, 60));

async function testList() {
  const list = { salt: 'test-salt', iter: 1000, codes: [], buy: {} };
  const web = A.newCode('WEB'); list.codes.push({ h: await A.hash(web, list), tracks: ['webdesign'], kind: 'buyer' });
  return { list, web };
}
async function typeCode(P, code, sfx) {
  const input = P.$('unlockCode' + (sfx || '')); input.value = code;
  input.parentNode.dispatch('submit');
  for (let i = 0; i < 100 && /…$/.test(P.$('gateMsg' + (sfx || '')) ? P.$('gateMsg' + (sfx || '')).textContent : ''); i++) await settle();
  await settle();
}

test('a wrong code message stays with its series: switching series clears it on both screens', async () => {
  const { list } = await testList();
  const P = await openPage('#webdesign', list);
  assert.equal(P.doc.body.getAttribute('data-view'), 'script');
  await typeCode(P, 'WRONG-CODE-1234');
  assert.equal(P.$('gateMsg').textContent, B.t('en', 'codeWrong'), 'the wrong code is refused on Webdesign');
  P.$('sw-ugc').click();
  assert.equal(P.win.location.hash, '#ugc');
  assert.equal(P.$('gateMsg').textContent, '', 'UGC script: no message, nothing was typed there');
  assert.equal(P.$('gateMsgShots').textContent, '', 'UGC recording screen: no message');
  P.$('sw-webdesign').click();
  assert.equal(P.$('gateMsg').textContent, '', 'back on Webdesign the old message is gone too');
  await typeCode(P, 'WRONG-CODE-1234');
  assert.equal(P.$('gateMsg').textContent, B.t('en', 'codeWrong'), 'a new wrong code is still refused');
});

test('a code for another series says so, and that note does not follow you to the series it unlocked', async () => {
  const { list, web } = await testList();
  const P = await openPage('#ugc', list);
  await typeCode(P, web);
  assert.equal(P.$('gateMsg').textContent, B.t('en', 'codeOther', { title: B.series('en').webdesign.title }));
  P.$('sw-webdesign').click();
  assert.equal(P.$('gateMsg'), null, 'Webdesign is unlocked, no gate');
  assert.ok(P.$('copyScript'), 'full Webdesign script');
  P.$('sw-ugc').click();
  assert.equal(P.$('gateMsg').textContent, '', 'back on UGC the note is gone');
});

test('LOWiSPIKE shows the free-track note and no day stepper (24 Oct 2026)', async () => {
  const { list } = await testList();
  const P = await openPage('#lowispike', list);
  assert.equal(P.$('dayNext'), null, 'no day stepper');
  assert.equal(P.$('freeCard').textContent, B.t('en', 'freeTrack'));
  assert.ok(P.$('copyScript'), 'the free track is open');
});
