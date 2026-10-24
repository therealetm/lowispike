'use strict';
/* Tutorial visuals (tutorial-show.js, item 42, Oct 22 2026, Emmanuel: "Show everything visually. So ppl don't just read boringly. If you
   can't take them to the page."). The first section of the tour (your companion + the bubbles) shows what each card talks about: a finger
   doing the gesture on the real control, lit bubbles, or a look-alike of what opens. Pictures only: no touch taken, nothing opened. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const X = require('../tutorial-show.js'), S = require('../tutorial-steps.js');
const FIRST = ['hello', 'touch', 'misty-hold', 'misty-turn', 'energy', 'mood', 'energy-peak', 'bubbles', 'gap', 'ring-still', 'gap-tap', 'fuel', 'fuel-hold', 'log-meal', 'water', 'water-hold', 'move', 'move-hold', 'sleep'];
const steps = () => S.plan({ noOwnCompanion: true, claimReady: false });

test('every card of the first section (companion + bubbles) has a visual plan', () => {
    for (const id of FIRST) assert.ok(X.plan(id), id + ' has no plan in SHOW');
});
test('every plan belongs to a real tutorial step', () => {
    const ids = new Set(steps().map(s => s.id));
    for (const id of X.ids()) assert.ok(ids.has(id), id + ' is not a step in tutorial-steps.js');
});
test('the photo card (bubbles, a centred text card) lights the real bubbles one after another and shows the ring', () => {
    const p = X.plan('bubbles');
    assert.ok(Array.isArray(p.spots) && p.spots.length >= 6, 'bubbles lights at least six real controls');
    assert.ok(p.spots.includes('#whHud .wh-water') && p.spots.includes('#spFast'), 'the spots are the real Home bubbles');
    assert.equal(p.vis, 'ring');
});
test('a card that teaches a gesture on a spotlit control shows that gesture with the finger', () => {
    const G = { tap: 'tap', hold: 'hold', drag: 'drag', triple: 'triple' };
    for (const s of steps().filter(x => FIRST.includes(x.id) && x.tryIt && x.target)) {
        assert.equal(X.plan(s.id).g, G[s.tryIt.how], s.id + ': the finger does ' + s.tryIt.how);
    }
});
test('a card with no control to spotlight carries a picture instead (energy, mood, log meal)', () => {
    for (const id of ['energy', 'mood', 'energy-peak', 'log-meal', 'gap']) assert.ok(X.plan(id).vis, id + ' has a picture');
});
test('every picture has its words in English, German and Spanish, and none is empty', () => {
    const kinds = new Set(X.ids().map(id => X.plan(id).vis).filter(Boolean));
    for (const k of kinds) for (const l of ['en', 'de', 'es']) {
        const h = X.visHtml(k, l);
        assert.ok(h.length > 20, k + '/' + l + ' is empty');
        assert.ok(!/undefined/.test(h), k + '/' + l + ' has a missing word');
    }
    for (const l of ['de', 'es']) for (const k of Object.keys(X.L.en)) assert.ok(X.L[l][k] != null, l + ' misses ' + k);
    assert.match(X.visHtml('water', 'de'), /Sips[\s\S]*Glas[\s\S]*Flasche/); /* Oct 23: water by sips */
    assert.match(X.visHtml('move', 'es'), /Épico/);
});
test('pictures only: tutorial-show never opens a tab, a sheet, the camera, the mic or notifications, and takes no touch (only a tap on a text it shortened)', () => {
    const src = read('tutorial-show.js').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bad of ['getUserMedia', 'goTab', '.click(', 'Notification', 'addEventListener(\'pointer', 'localStorage', 'b3Open', 'openScan']) assert.ok(!src.includes(bad), 'tutorial-show.js uses ' + bad);
    assert.equal((src.match(/addEventListener\(/g) || []).length, 1, 'one listener only'); assert.match(src, /tx\.addEventListener\('click'/);
    const css = read('tutorial-show.css');
    assert.match(css, /\.lts-layer \{[^}]*pointer-events: none/);
    assert.match(css, /\.lts-vis \{[^}]*pointer-events: none/);
    assert.match(css, /prefers-reduced-motion: reduce/);
});
test('tutorial.js loads tutorial-show.js and calls it after every render and every place', () => {
    const t = read('tutorial.js');
    assert.match(t, /script\[src\^="tutorial-show\.js"\]/);
    assert.match(t, /LowiTutorialShow\.render\(card, s, root\)/);
    assert.match(t, /LowiTutorialShow\.place\(root, el, s\)/);
    assert.ok((t.match(/show\((null|el), s\)/g) || []).length >= 2, 'both branches of place() (spotlight and centred card) call show()');
});

/* a tiny fake page: render puts the picture under the text and the finger on the layer; practice / peek cards get no second picture */
function fakePage() {
    const mk = (tag) => {
        const el = { tag, children: [], attrs: {}, classList: null, style: {}, innerHTML: '', className: '', parent: null,
            setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; },
            querySelector(sel) { return find(this, sel)[0] || null; }, querySelectorAll(sel) { return find(this, sel); },
            appendChild(c) { c.parent = this; this.children.push(c); return c; },
            insertBefore(c) { c.parent = this; this.children.unshift(c); return c; },
            after(c) { const p = this.parent, k = p.children.indexOf(this); c.parent = p; p.children.splice(k + 1, 0, c); },
            insertAdjacentHTML(_, h) { this.innerHTML += h; },
            getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; } };
        const set = new Set(); el.classList = { add: c => set.add(c), remove: c => set.delete(c), contains: c => set.has(c), toggle: (c, v) => (v ? set.add(c) : set.delete(c)) };
        return el;
    };
    const find = (el, sel) => {
        const out = [], want = sel.split(',').map(x => x.trim());
        const hit = e => want.some(w => w.startsWith('.') ? (' ' + e.className + ' ').includes(' ' + w.slice(1).split('[')[0] + ' ') : false);
        const walk = e => { for (const c of e.children) { if (hit(c)) out.push(c); walk(c); } };
        walk(el); return out;
    };
    const document = { createElement: mk, head: mk('head'), documentElement: { lang: 'en' }, getElementById: () => null, querySelector: () => null };
    return { document, mk };
}
function load() {
    const P = fakePage();
    const ctx = { window: null, document: P.document, matchMedia: () => ({ matches: false }) };
    ctx.window = ctx; ctx.window.document = P.document; ctx.window.matchMedia = ctx.matchMedia;
    vm.createContext(ctx); vm.runInContext(read('tutorial-show.js'), ctx);
    return { X: ctx.LowiTutorialShow, P };
}
function card(P, extra) {
    const root = P.mk('div'), c = P.mk('div'); c.className = 'lt-card'; root.appendChild(c);
    const t = P.mk('p'); t.className = 'lt-text'; c.appendChild(t);
    if (extra) { const e = P.mk('div'); e.className = extra; c.appendChild(e); }
    return { root, c };
}
test('render: water gets the cups picture under the text and a tapping finger on the page', () => {
    const { X, P } = load(), { root, c } = card(P);
    X.render(c, { id: 'water', tryIt: { how: 'tap' } }, root);
    const v = c.querySelector('.lts-vis'); assert.ok(v, 'picture on the card');
    assert.equal(v.getAttribute('data-vis'), 'water');
    assert.equal(c.children[1], v, 'right under the text');
    const layer = root.querySelector('.lts-layer'); assert.ok(layer);
    assert.equal(layer.getAttribute('data-g'), 'tap'); assert.match(layer.innerHTML, /lts-hand/);
    assert.equal(root.getAttribute('data-show'), 'water');
});
test('render: a card that already has a practice pad or a Scan peek gets no second picture, and practice gets no finger', () => {
    const { X, P } = load();
    let k = card(P, 'lt-pad'); X.render(k.c, { id: 'water', practice: { how: 'tap' } }, k.root);
    assert.equal(k.c.querySelector('.lts-vis'), null); assert.doesNotMatch(k.root.querySelector('.lts-layer').innerHTML, /lts-hand/);
    k = card(P, 'lt-peek'); X.render(k.c, { id: 'fuel' }, k.root);
    assert.equal(k.c.querySelector('.lts-vis'), null);
});
test('render: a card without a plan clears the previous card\'s finger and spots', () => {
    const { X, P } = load(), { root, c } = card(P);
    X.render(c, { id: 'bubbles' }, root);
    assert.match(root.querySelector('.lts-layer').innerHTML, /lts-spot/);
    X.render(c, { id: 'scan-in' }, root);
    assert.equal(root.querySelector('.lts-layer').innerHTML, '');
    assert.equal(root.getAttribute('data-show'), undefined);
});
