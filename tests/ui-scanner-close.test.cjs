'use strict';
/* Oct 18 2026, Emmanuel (handoff, Home decisions): "Scanner: X bottom right. Keep barcode, snap, flash and manual barcode entry."
   The full-screen scanner's close X leaves the top bar and sits at the bottom right of the capture panel, at the right end of the
   Deep analyze row (scan-glass.js dockX). It is the same node, so its data-b3="camclose" tap, its label and the tab-bar close
   keep working. The torch stays in the top bar; the barcode field, Go, Scan/Photo/Meal and Deep analyze are untouched.
   Browser proof: tests/ui-scanner-close-live.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = read('scan-glass.js'), css = read('scan-glass.css'), html = read('index.html');

/* a small DOM: enough tree for appendChild / insertBefore / querySelector by class or attribute */
function node(tag, cls, attrs) {
    const set = new Set((cls || '').split(' ').filter(Boolean));
    const n = {
        tagName: tag.toUpperCase(), id: (attrs && attrs.id) || '', attrs: Object.assign({}, attrs), children: [], parentElement: null, dataset: {}, style: { setProperty() {} },
        classList: { add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c), toggle: (c, on) => (on ? set.add(c) : set.delete(c)) },
        get className() { return [...set].join(' '); }, set className(v) { set.clear(); String(v).split(' ').filter(Boolean).forEach(c => set.add(c)); },
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844 }),
        appendChild(c) { detach(c); c.parentElement = n; n.children.push(c); return c; },
        insertBefore(c, ref) { if (!ref) return n.appendChild(c); detach(c); c.parentElement = n; n.children.splice(n.children.indexOf(ref), 0, c); return c; },
        matches(s) { return s.split(',').some(one => match(n, one.trim())); },
        querySelector(s) { return all(n).find(e => e.matches(s)) || null; },
        querySelectorAll(s) { return all(n).filter(e => e.matches(s)); },
        closest(s) { let e = n; while (e && e.matches) { if (e.matches(s)) return e; e = e.parentElement; } return null; },
        click() { n.clicked = (n.clicked || 0) + 1; }
    };
    return n;
}
function detach(c) { if (c.parentElement) { const a = c.parentElement.children; a.splice(a.indexOf(c), 1); c.parentElement = null; } }
function all(n) { const out = []; (function walk(e) { for (const c of e.children) { out.push(c); walk(c); } })(n); return out; }
function match(n, s) {
    const m = s.match(/^([a-z]*)((?:[.#][\w-]+)*)((?:\[[^\]]+\])*)$/i); if (!m) return false;
    if (m[1] && n.tagName !== m[1].toUpperCase()) return false;
    for (const p of m[2].match(/[.#][\w-]+/g) || []) { if (p[0] === '.' && !n.classList.contains(p.slice(1))) return false; if (p[0] === '#' && n.id !== p.slice(1)) return false; }
    for (const a of m[3].match(/\[[^\]]+\]/g) || []) { const [k, v] = a.slice(1, -1).split('='); const val = k.startsWith('data-') ? n.attrs[k] : n.attrs[k]; if (v === undefined ? val === undefined : val !== v.replace(/"/g, '')) return false; }
    return true;
}
/* the scanner exactly as index.html openScanner() builds it: top bar (X, title, torch), frame, messages, bottom panel */
function scanner() {
    const cam = node('div', 'b3-cam', { id: 'b3Cam' });
    const top = cam.appendChild(node('div', 'b3-ctop'));
    const x = top.appendChild(node('button', 'b3-cx', { 'data-b3': 'camclose', 'aria-label': 'Close' }));
    top.appendChild(node('span', 'b3-ctitle'));
    const torch = top.appendChild(node('button', 'b3-torch', { 'data-b3': 'torch' }));
    cam.appendChild(node('div', 'b3-frame', { id: 'b3Frame' }));
    cam.appendChild(node('div', 'b3-cmsg', { id: 'b3CMsg' }));
    const bot = cam.appendChild(node('div', 'b3-cbot'));
    bot.appendChild(node('div', 'b3-chint', { id: 'b3Hint' }));
    const form = bot.appendChild(node('form', 'b3-type b3-ctype', { id: 'b3BcF' }));
    form.appendChild(node('input', 'input', { id: 'b3Bc' })); form.appendChild(node('button', 'b3-go'));
    const acts = bot.appendChild(node('div', 'b3-cacts'));
    for (const a of ['scan', 'photo', 'meal']) acts.appendChild(node('button', 'b3-cact', { 'data-b3': 'camact', 'data-act': a }));
    const deep = bot.appendChild(node('a', 'b3-deep', { id: 'b3Deep' }));
    return { cam, top, x, torch, bot, form, acts, deep };
}
function world(o) {
    o = Object.assign({ lg: true, dock: false }, o);
    const H = node('html', o.lg ? 'lg' : ''), body = node('body'), app = body.appendChild(node('div', '', { id: 'app' }));
    const tabbar = app.appendChild(node('nav', '', { id: 'tabbar' }));
    tabbar.getBoundingClientRect = () => (o.dock ? { left: 10, top: 744, width: 370, height: 68, bottom: 812 } : { left: 0, top: 0, width: 0, height: 0, bottom: 0 });
    const observers = [];
    const D = { documentElement: H, body, readyState: 'complete', createElement: t => node(t), querySelector: s => all(body).find(e => e.matches(s)) || null,
        getElementById: id => all(body).find(e => e.id === id) || null, addEventListener() {} };
    const ctx = { document: D, window: { addEventListener() {} }, requestAnimationFrame: f => f(), setTimeout: f => f(),
        getComputedStyle: () => ({ display: o.dock ? 'flex' : 'none', visibility: 'visible' }),
        MutationObserver: class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} } };
    vm.runInNewContext(js, ctx);
    const flush = () => observers.forEach(m => m.cb([]));
    return { D, H, body, app, flush, ctx };
}
function open(w, host) {
    const s = scanner();
    (host || w.body).appendChild(s.cam); w.H.classList.add('b3-camon'); w.flush();
    return s;
}

test('the close X moves to the bottom right of the capture panel, at the end of the Deep analyze row', () => {
    const w = world(), s = open(w);
    assert.ok(!s.top.children.includes(s.x), 'the X has left the top bar');
    const row = s.x.parentElement;
    assert.ok(row && row.classList.contains('sg-xrow'), 'the X sits in its own row class: ' + (row && row.className));
    assert.strictEqual(row.parentElement, s.bot, 'that row is inside the bottom panel');
    assert.strictEqual(s.bot.children[s.bot.children.length - 1], row, 'it is the last row of the panel (bottom)');
    assert.deepStrictEqual(row.children, [s.deep, s.x], 'Deep analyze first, the X at the right end');
    assert.ok(s.cam.classList.contains('sg-xbot'));
});

test('the capture tools are untouched: torch in the top bar, barcode field + Go, Scan / Photo / Meal, Deep analyze', () => {
    const w = world(), s = open(w);
    assert.strictEqual(s.torch.parentElement, s.top, 'the torch (flash) stays in the top bar');
    assert.strictEqual(s.form.parentElement, s.bot); assert.ok(s.cam.querySelector('#b3Bc') && s.cam.querySelector('.b3-go'), 'manual barcode entry');
    assert.strictEqual(s.acts.parentElement, s.bot); assert.strictEqual(s.acts.children.length, 3, 'Scan, Photo and Meal');
    assert.ok(s.bot.children.indexOf(s.form) < s.bot.children.indexOf(s.acts), 'order kept');
    assert.strictEqual(s.x.attrs['data-b3'], 'camclose', 'same node: the app\'s camclose tap still closes it');
    assert.strictEqual(s.x.attrs['aria-label'], 'Close');
});

test('idempotent: more syncs, a docked scanner and a second scanner each end with exactly one X row', () => {
    const w = world({ dock: true }), s = open(w);
    w.flush(); w.flush(); w.ctx.window.LowiScanGlass.sync();
    assert.strictEqual(s.cam.querySelectorAll('.sg-xrow').length, 1);
    assert.strictEqual(s.cam.querySelectorAll('.b3-cx').length, 1);
    assert.strictEqual(s.cam.parentElement, w.app, 'still docks under the menu bar');
    assert.strictEqual(s.x.parentElement.parentElement, s.bot);
    detach(s.cam); w.H.classList.remove('b3-camon'); w.flush();
    const s2 = open(w);
    assert.strictEqual(s2.x.parentElement.className, 'sg-xrow');
});

test('inside Misty\'s world (#spWorld) the scanner keeps its own layout: that X stays hidden in its top bar', () => {
    const w = world();
    const sp = w.body.appendChild(node('div', 'sp-capture', { id: 'spWorld' }));
    const s = open(w, sp);
    assert.strictEqual(s.x.parentElement, s.top);
    assert.ok(!s.cam.classList.contains('sg-xbot'));
});

test('a panel without Deep analyze still gets the X at its bottom right', () => {
    const w = world(), s = scanner();
    detach(s.deep);
    w.body.appendChild(s.cam); w.H.classList.add('b3-camon'); w.flush();
    const row = s.x.parentElement;
    assert.strictEqual(row.className, 'sg-xrow'); assert.strictEqual(s.bot.children[s.bot.children.length - 1], row);
});

test('the stylesheet: X row at the right, Deep analyze takes the rest, title stays centred, shopping and keyboard keep the X', () => {
    const rule = sel => { const i = css.indexOf(sel + ' {'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
    assert.ok(/display: flex/.test(rule('.b3-cam.sg-xbot .sg-xrow')) && /justify-content: flex-end/.test(rule('.b3-cam.sg-xbot .sg-xrow')), 'a row, X pushed right');
    assert.ok(/flex: 1 1 auto/.test(rule('.b3-cam.sg-xbot .sg-xrow > .b3-deep')), 'Deep analyze fills the row');
    assert.ok(/width: 46px/.test(rule('.b3-cam.sg-xbot .sg-xrow > .b3-cx')) && /flex: none/.test(rule('.b3-cam.sg-xbot .sg-xrow > .b3-cx')), 'a 46px round X, Deep analyze\'s height');
    assert.ok(/padding-left/.test(rule('.b3-cam.sg-xbot .b3-ctop')), 'the title stays centred over the torch side');
    assert.ok(css.includes('.b3-cbot:has(> .ss-row) > .sg-xrow'), 'shopping mode: the X joins the name/cart row instead of floating over Go');
    assert.ok(!/\.kb [^{]*\.sg-xrow[^{]*\{[^}]*display: none/.test(css), 'the X stays while typing a code');
    assert.ok(/\.b3-cam\.ss-open \.b3-cbot/.test(read('shop-scan.css')), 'while a shopping result card is open the panel (and the X) step aside for the card, whose own X shows');
    /* the scanner markup this relies on is still what index.html builds */
    assert.ok(html.includes('<button class="b3-cx" data-b3="camclose"'));
    assert.ok(html.includes('<div class="b3-cbot">') && html.includes('class="b3-deep" id="b3Deep"'));
    assert.ok(html.includes('case "camclose": closeScanner(); break;'));
});
