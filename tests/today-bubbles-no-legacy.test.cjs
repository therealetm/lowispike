'use strict';
/* Oct 18 (E-man, iPad screenshot): "some of the bubbles there are straight lines and the old design is still inside of the new
   design". The Today bubbles are the 3D living-bubble glass now (living-bubbles.js). Two pieces of the earlier flat design were
   still drawn inside that glass: Misty's energy ring with its two tier ticks (misty-scale.js) and the fasting bubble's stage
   tick dashes and hour labels (fast-bubble.js). This runs the real files in a small fake page and checks none of it is drawn,
   while the information stays: Misty's % on her name tag, the next fasting marker for screen readers, the water level. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

/* ---------- a tiny fake DOM: enough for the two files to attach and paint ---------- */
class El {
    constructor(tag, id) {
        this.tagName = String(tag).toUpperCase(); this.id = id || ''; this.children = []; this.attrs = {}; this.parentNode = null;
        this._html = ''; this.textContent = ''; this.className = ''; this.isConnected = true; this.clientLeft = 0; this.clientTop = 0;
        this.clientWidth = 118; this.clientHeight = 118;
        const sp = {}; this.style = { setProperty: (k, v) => { sp[k] = String(v); }, getPropertyValue: k => sp[k] || '', removeProperty: k => { delete sp[k]; }, _p: sp };
        const cs = new Set(); this.classList = { add: (...c) => c.forEach(x => cs.add(x)), remove: (...c) => c.forEach(x => cs.delete(x)), contains: x => cs.has(x), toggle: (x, on) => { (on === undefined ? !cs.has(x) : on) ? cs.add(x) : cs.delete(x); } };
    }
    set innerHTML(h) { this._html = String(h); } get innerHTML() { return this._html; }
    get firstChild() { return this.children[0] || null; }
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
    insertBefore(c) { c.parentNode = this; this.children.unshift(c); return c; }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); this.parentNode = null; this.isConnected = false; }
    contains(c) { return this === c || this.children.some(x => x === c || x.contains(c)); }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener() { }
    removeEventListener() { }
    getBoundingClientRect() { return { left: 0, top: 0, right: 118, bottom: 118, width: 118, height: 118 }; }
    /* class selectors only: counts markup drawn into innerHTML plus real child elements */
    _cls() { return String(this.className || this.attrs.class || '').split(/\s+/); }
    querySelectorAll(sel) {
        const m = /^\.([\w-]+)$/.exec(sel); if (!m) return [];
        const out = [];
        const walk = e => e.children.forEach(k => { if (k._cls().includes(m[1])) out.push(k); walk(k); });
        walk(this);
        const re = new RegExp('class="(?:[^"]*\\s)?' + m[1] + '(?:\\s[^"]*)?"', 'g');
        (this._html.match(re) || []).forEach(() => out.push(new El('i')));
        return out;
    }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    getContext() {
        const noop = () => grad, grad = { addColorStop() { } };
        return new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
    }
}

function page(extra) {
    const byId = {}, store = {};
    const doc = {
        readyState: 'complete', hidden: false, documentElement: new El('html'), body: new El('body'),
        getElementById: id => byId[id] || null,
        createElement: t => new El(t), createElementNS: (ns, t) => new El(t),
        querySelector: () => null, querySelectorAll: () => [], addEventListener() { }, removeEventListener() { }
    };
    doc.documentElement.lang = 'en';
    const win = {
        document: doc, devicePixelRatio: 2, performance: { now: () => 0 }, Date, Math, JSON, Object, Array, String, Number, Promise, Proxy, Set, Map,
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        addEventListener() { }, removeEventListener() { }, dispatchEvent() { return true; },
        matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
        requestAnimationFrame: () => 1, cancelAnimationFrame() { }, setTimeout: (f) => { try { f(); } catch (e) { } return 1; }, clearTimeout() { }, setInterval: () => 1, clearInterval() { },
        CustomEvent: function () { }, console
    };
    Object.assign(win, extra || {});
    win.window = win; win.globalThis = win;
    return { win, doc, byId, store, run: f => vm.runInNewContext(read(f), win, { filename: f }) };
}

test('Misty\'s bubble: no old energy ring, arcs or tier ticks inside the glass; her % stays on the name tag', () => {
    const P = page();
    const bub = new El('div', 'spBubble'); P.byId.spBubble = bub;
    P.win.LowiSun = require('../sun-meter.js');
    P.win.LowiVitalsBridge = { state: () => ({ logs: [], ledger: [] }) };
    P.store.lowi_fast_v1 = JSON.stringify({ water: {} });
    P.run('misty-scale.js');
    P.win.LowiMistyScale.paint();
    const kids = bub.children.map(k => k._cls().join(' ') + ' ' + k.tagName);
    assert.equal(bub.querySelectorAll('.ms-ring').length, 0, 'no ring svg in Misty\'s bubble: ' + kids.join(', '));
    assert.equal(bub.querySelectorAll('.ms-tick').length, 0, 'no tick lines');
    assert.ok(!bub.children.some(k => k.tagName === 'SVG'), 'nothing drawn over her glass: ' + kids.join(', '));
    /* the reading is not lost: name tag "Misty · 20%" and the tier for her face/membrane */
    assert.match(bub.style.getPropertyValue('--ms-tag'), /\d+%/);
    assert.ok(['weak', 'tired', 'ok', 'thriving'].includes(bub.getAttribute('data-ms-tier')));
});

test('fasting bubble: no stage tick dashes or hour labels drawn on its rim; the water and the next marker stay', () => {
    const P = page({ LowiFast: { stages: () => [{ h: 0, n: 'Start' }, { h: 3, n: 'Blood sugar' }, { h: 8, n: 'Liver' }, { h: 12, n: 'Fat burn' }, { h: 14, n: 'Ketones' }, { h: 16, n: 'Goal' }] } });
    const el = new El('button', 'spFast'); P.byId.spFast = el;
    el.style.setProperty('--sp-fill', '68%');
    P.store.lowi_fast_v1 = JSON.stringify({ last: Date.now() - (10 * 60 + 53) * 60e3, target: 16 });
    P.run('fast-bubble.js');
    const s = P.win.LowiFastBubble.state();
    assert.equal(s.on, true, 'the water bubble attached');
    assert.equal(s.running, true);
    assert.equal(s.marks, 0, 'no tick dashes on the rim (old design)');
    assert.equal(s.labels, 0, 'no hour labels on the rim');
    assert.equal(el.querySelectorAll('.fb-tick').length, 0);
    assert.ok(s.level > 0.6 && s.level < 0.75, 'the water still shows how far the fast is: ' + s.level);
    assert.match(s.sr, /Next marker 12 h: Fat burn/, 'the next marker stays for screen readers');
});

test('no CSS keeps an old ring or rim inside the living glass', () => {
    const ms = read('misty-scale.css'), fb = read('fast-bubble.css'), wh = read('world-home.css');
    assert.ok(!/\.ms-ring|\.ms-tick/.test(ms), 'misty-scale.css has no ring styles left');
    assert.ok(!/\.fb-tick|\.fb-lab/.test(fb), 'fast-bubble.css has no tick or label styles left');
    /* the red "weak" rim drawn in CSS sits inside the 3D membrane, which turns reddish itself; only the flat fallback keeps it */
    assert.match(wh, /html:not\(\.wh-world-live\) #spHome\[data-misty="weak"\] #spBubble::after/);
    assert.ok(!/(^|[^)] )#spHome\[data-misty="weak"\] #spBubble::after/m.test(wh), 'no unscoped weak rim');
});
