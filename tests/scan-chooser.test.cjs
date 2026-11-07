'use strict';
/* Nov 5 2026 Scan chooser and the live supermarket scan (Emmanuel, screenshots, evening):
   "when you click on it, the camera opens directly. It's confusing for a lot of people ... I would want the option that I can see
   there, you know, with the live code, or take a photo of your food ... now they can just have it open, walk around the supermarket,
   scan products ... put it into Warenkorb or skip ... when they skip, the live [scan] still stays open ... another button that needs
   to be there is the deep analyzer ... Have the interface look really, really nice ... like it's analyzing."
   - Scan (the Home bubble and every "cam" entry) opens the chooser: Live scan, Photo of your food, Deep analyze, and Photos small under
     them. No camera opens by itself (tests/scan-pick.test.cjs pins the first statement of openScanner).
   - The card over the live camera has Skip next to Add to cart; both go on scanning (the camera never stops).
   - The live layer shows the cart (how full it is, one tap to the list).
   Browser walk-through (fake camera, network blocked): tools/check-scan-chooser.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
const C = require('../shop-scan-core.js');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}
const GPT = 'https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike';
function chooser(state, cam) {
    const ctx = {
        CAM: cam || null, IC: { bc: '<svg data-i="bc"/>', cam: '<svg data-i="cam"/>', chev: '<svg data-i="chev"/>' }, IC_SPARK: '<svg data-i="spark"/>', IC_PICS: '<svg data-i="pics"/>',
        esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]), t: k => '{' + k + '}', deepURL: () => GPT
    };
    vm.createContext(ctx); vm.runInContext(fnSrc(html, 'function pickHTML(s)'), ctx);
    return ctx.pickHTML(state);
}

test('the chooser: one question, then Live scan, Photo of your food, Deep analyze in that order, Photos small under them', () => {
    const h = chooser('pick');
    assert.match(h, /^<div class="b3-pickbox b3-pstart b3-pchoose">/);
    assert.match(h, /<div class="b3-plens" aria-hidden="true">/, 'the analysing lens is decoration only');
    assert.match(h, /<b class="b3-pq">\{chooseT\}<\/b><small class="b3-pqs">\{chooseS\}<\/small>/);
    const at = re => { const m = h.match(re); assert.ok(m, String(re)); return m.index; };
    const live = at(/<button class="b3-popt b3-popt-live" type="button" data-b3="picklive">/);
    const photo = at(/<button class="b3-popt b3-popt-photo" type="button" data-b3="pickshoot">/);
    /* test changed 7 Nov 2026 (Emmanuel: "Typing in a barcode and or typing in the food's name ... should just go into a button, das
       heißt manually"): a fourth row, Type it in, sits between Photo of your food and Deep analyze (tests/scan-chooser-liquid.test.cjs) */
    const man = at(/<button class="b3-popt b3-popt-man" type="button" data-b3="pickman">/);
    const deep = at(/<a class="b3-popt b3-popt-deep" href="https:\/\/chatgpt\.com\/g\/g-69481a874bf08191b8118f8d88c9c90e-lowispike" target="_blank" rel="noopener">/);
    const lib = at(/<button type="button" class="b3-plib" data-b3="picklib">/);
    assert.ok(live < photo && photo < man && man < deep && deep < lib, 'Live scan, Photo of your food, Type it in, Deep analyze, then Photos');
    assert.match(h, /data-b3="picklive"><span class="b3-poic" aria-hidden="true"><svg data-i="bc"\/><\/span><span class="b3-potx"><b>\{pickLive\}<\/b><small>\{optLiveS\}<\/small>/);
    assert.match(h, /data-b3="pickshoot"><span class="b3-poic" aria-hidden="true"><svg data-i="cam"\/><\/span><span class="b3-potx"><b>\{optPhoto\}<\/b><small>\{optPhotoS\}<\/small>/);
    assert.match(h, /rel="noopener"><span class="b3-poic" aria-hidden="true"><svg data-i="spark"\/><\/span><span class="b3-potx"><b>\{deep\}<\/b><small>\{deepS\}<\/small>/, 'gpt-open.js writes its no-app hint into this <small>');
    assert.equal((h.match(/class="b3-popt /g) || []).length, 4, 'four rows (test changed 7 Nov 2026: Type it in joined them)');
    assert.doesNotMatch(h, /data-b3="[^"]*"[^>]*href|href[^>]*data-b3=/, 'the GPT link carries no data-b3, so the scanner click handler never swallows it');
    assert.doesNotMatch(h, /class="b3-deep/, 'not the bottom bar Deep analyze, which the photo screen hides');
    assert.doesNotMatch(h, /getUserMedia|startCam|pickOpen/, 'drawing the chooser opens no camera');
});

test('reading a photo still shows the photo with the scanning sweep', () => {
    const h = chooser('pickread', { pickUrl: 'blob:x' });
    assert.match(h, /^<div class="b3-pickbox b3-pread" role="status"><div class="b3-pthumb"><img alt="" src="blob:x"><i class="b3-psweep"><\/i><i class="b3-pgrid"><\/i><\/div><small>\{pickRead\}<\/small><\/div>$/);
});

test('each row does what it says: live layer, the phone camera, the photo library, the GPT link', () => {
    assert.match(html, /case "picklive": sfx\("tap"\); openScanner\("live"\); break;/);
    assert.match(html, /case "pickshoot": pickOpen\(false\); break;/);
    assert.match(html, /case "picklib": pickOpen\(true\); break;/);
    const inp = fnSrc(html, 'function pickInput(lib)');
    assert.match(inp, /if \(!lib\) i\.setAttribute\("capture", "environment"\)/, 'Photo of your food = the phone camera; Photos = the library');
    assert.match(read('gpt-open.js'), /closest\("a\[href\]"\)/, 'gpt-open.js takes any GPT link, so the row opens the ChatGPT app on iPhone');
    assert.match(html, /const IC_PICS = '<svg /);
});

test('the chooser look: no title over the question, rows like an iOS list, motion off when asked', () => {
    const css = read('scan-glass.css');
    assert.match(css, /\.b3-cam\.b3-pick \.b3-ctitle \{ visibility: hidden; \}/);
    /* test changed 7 Nov 2026 (Emmanuel: "Transparenz, Design, Liquid, Bubble, Style"): each row is its own glass bubble, no longer one
       inset list with hairlines between rows */
    assert.match(css, /\.b3-popts \{ width: 100%; display: flex; flex-direction: column; gap: 10px; text-align: left; \}/);
    assert.match(css, /\.b3-popt \{[^}]*min-height: 64px;/, 'rows are easy to hit');
    assert.doesNotMatch(css, /\.b3-popt \+ \.b3-popt::before \{/, 'no hairlines: each row is its own bubble');
    assert.match(css, /\.b3-popt \{[^}]*border-radius: 24px; background: rgba\(255, 255, 255, \.08\); border: 1px solid rgba\(255, 255, 255, \.17\);/);
    assert.match(css, /@keyframes b3pspin/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.b3-pring, \.b3-pbeam \{ animation: none; \}/);
    assert.match(css, /@media \(max-height: 700px\) \{\n  \.b3-cam\.b3-pick \.b3-pickbox \{[^}]*\}\n  \.b3-cam\.b3-pick \.b3-pchoose \{ display: grid; grid-template-columns: 40px minmax\(0, 1fr\);/, 'short phones: the lens beside the question, so everything fits');
    assert.doesNotMatch(css, /\.b3-pshoot|\.b3-pbtns/, 'the old one-button card styles are gone with the card');
    assert.match(css, /\.b3-cam\.b3-livebc\.live \.b3-ctitle::before \{/, 'a live dot by the title while the camera reads');
    assert.match(css, /html\.lg \.b3-cam\.sg-xbot\.b3-livebc \.b3-cbot:has\(> \.ss-liverow\) > \.sg-xrow \{ position: absolute; right: 12px; bottom: 12px; \}/, 'no empty band in the live panel');
});

/* ---------- shop-scan.js in a small stub DOM ---------- */
function node(cls, extra) {
    const classes = new Set(String(cls || '').split(/\s+/).filter(Boolean));
    const n = Object.assign({
        dataset: {}, children: [], innerHTML: '', textContent: '', isConnected: true, parent: null,
        classList: { add: c => classes.add(c), remove: (...c) => c.forEach(x => classes.delete(x)), contains: c => classes.has(c), toggle: (c, on) => { if (on === undefined) on = !classes.has(c); if (on) classes.add(c); else classes.delete(c); return on; } },
        get className() { return [...classes].join(' '); }, set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
        setAttribute() { }, getAttribute() { return null; }, remove() { if (this.parent) { const k = this.parent.children.indexOf(this); if (k >= 0) this.parent.children.splice(k, 1); } },
        appendChild(k) { k.parent = this; this.children.push(k); return k; },
        insertBefore(k, ref) { k.parent = this; const i = this.children.indexOf(ref); if (i < 0) this.children.push(k); else this.children.splice(i, 0, k); return k; },
        get nextSibling() { const p = this.parent; if (!p) return null; return p.children[p.children.indexOf(this) + 1] || null; },
        all() { return this.children.reduce((a, k) => a.concat([k], k.all()), []); },
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
        querySelectorAll(sel) {
            const c = sel.replace(/^\./, '');
            const out = this.all().filter(k => k.classList.contains(c));
            /* the cart row is HTML text: its count badge and chip are found in it */
            this.all().forEach(k => {
                if (c === 'ss-count' && /class="ss-count"/.test(k.innerHTML)) out.push(k.countNode || (k.countNode = { textContent: '0' }));
                if (c === 'ss-cartchip' && /ss-cartchip/.test(k.innerHTML)) out.push(k.chipNode || (k.chipNode = node('ss-chip ss-cartchip')));
            });
            return out;
        },
        closest() { return null; }
    }, extra || {});
    return n;
}
function load(o) {
    o = o || {};
    const clicks = [], calls = [];
    const dex = { lookup: async () => null, rate: () => ({ verdict: 'ok', why: [] }), prep: p => p, view: p => p, bubbleInfo: () => ({ has: false, label: 'Catch it in a bubble' }), swap: () => null,
        shopResume: () => calls.push('resume'), stop: () => calls.push('stop'), scan: m => calls.push('scan:' + m), shopMode: () => false };
    const W = { LowiShopScanCore: C, LowiDex: dex, LowiLang: { get: () => o.lang || 'en' }, LOWI_SHELF: { cartCount: () => o.cart || 0, addScanned: () => ({ action: 'added', n: 'Skyr', undo() { } }) },
        addEventListener() { }, dispatchEvent() { return true }, localStorage: { getItem: () => null, setItem() { }, removeItem() { } }, sessionStorage: { getItem: () => null, setItem() { } },
        setTimeout, clearTimeout, requestAnimationFrame: f => setTimeout(f, 0), performance: { now: () => Date.now() }, navigator: {} };
    const D = { readyState: 'complete', documentElement: { lang: 'en' }, body: node(), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => node(),
        addEventListener: (t, fn) => { if (t === 'click') clicks.push(fn); } };
    /* shop-scan.js reads the language as a page global (LowiLang), like in the app */
    const ctx = { window: W, document: D, LowiLang: W.LowiLang, CustomEvent: function (t, x) { this.type = t; this.detail = x && x.detail; }, console, setTimeout, clearTimeout, navigator: {} };
    W.window = W; W.document = D; W.CustomEvent = ctx.CustomEvent;
    vm.createContext(ctx); vm.runInContext(read('shop-scan.js'), ctx);
    const tap = (el, ss) => { const btn = { dataset: { ss }, getAttribute: () => null, closest: s => (s === '.b3-cam' ? el : null) };
        const ev = { target: { closest: s => (s === '[data-ss]' ? btn : null) }, preventDefault() { } }; clicks.forEach(fn => fn(ev)); };
    return { W, calls, tap };
}
const skyr = { name: 'Skyr Natur', brand: 'Arla', barcode: '5711953068881', verdict: 'ok', why: ['protein'], facts: { c: 4, s: 4, f: 0, p: 11 } };
const cardOf = el => el.children.find(k => k.classList.contains('ss-card'));

test('the card over the live camera: Skip right next to Add to cart (scan and shopping cameras), not on Log meal', () => {
    const { W } = load();
    for (const ctx of ['scan', 'shop']) {
        const el = node('b3-cam' + (ctx === 'shop' ? ' b3-shop' : '')); W.LowiShopScan.show(el, skyr, { ctx });
        const h = cardOf(el).innerHTML;
        assert.match(h, /<div class="ss-acts"><button type="button" class="ss-add" data-ss="add">[\s\S]*?<\/button><button type="button" class="ss-skip" data-ss="next">Skip<\/button><\/div>/, ctx);
        assert.ok(h.indexOf('data-ss="add"') < h.indexOf('class="ss-skip"'), 'Add to cart stays first');
    }
    const m = node('b3-cam'); W.LowiShopScan.show(m, skyr, { ctx: 'meal' });
    assert.doesNotMatch(cardOf(m).innerHTML, /ss-skip/, 'Log meal keeps its own card');
    const de = load({ lang: 'de' }).W, el = node('b3-cam'); de.LowiShopScan.show(el, skyr, { ctx: 'scan' });
    assert.match(cardOf(el).innerHTML, />Überspringen<\/button>/);
    assert.deepEqual(C.TX.skip, ['Skip', 'Überspringen', 'Saltar']);
});

test('Skip closes the card and the same camera reads the next product; Add to cart does the same after adding', () => {
    const { W, calls, tap } = load();
    const el = node('b3-cam b3-livebc live');
    W.LowiShopScan.show(el, skyr, { ctx: 'scan' });
    assert.ok(cardOf(el) && el.classList.contains('ss-open'));
    tap(el, 'next');
    assert.equal(cardOf(el), undefined, 'card gone'); assert.ok(!el.classList.contains('ss-open'));
    assert.deepEqual(calls, ['resume'], 'shopResume: the live loop carries on, nothing stops the camera');
    W.LowiShopScan.show(el, skyr, { ctx: 'scan' });
    tap(el, 'add');
    assert.equal(cardOf(el), undefined);
    assert.deepEqual(calls, ['resume', 'resume'], 'added, then straight on to the next product');
    assert.ok(!calls.includes('stop'));
});

test('the live layer shows the cart under the hint, once, with how full it is; a tap opens the list', () => {
    const { W, calls, tap } = load({ cart: 3 });
    const el = node('b3-cam b3-livebc'), bot = el.appendChild(node('b3-cbot')), hint = bot.appendChild(node('b3-chint')), xrow = bot.appendChild(node('sg-xrow'));
    W.LowiShopScan.live(el); W.LowiShopScan.live(el);
    const rows = bot.children.filter(k => k.classList.contains('ss-liverow'));
    assert.equal(rows.length, 1, 'one row, however often it is called');
    assert.deepEqual(bot.children, [hint, rows[0], xrow], 'between the hint and the X');
    assert.match(rows[0].innerHTML, /^<button type="button" class="ss-chip ss-cartchip" data-ss="cart">[\s\S]*<span>Shopping list<\/span><b class="ss-count">0<\/b><\/button>$/);
    assert.equal(rows[0].countNode.textContent, '3', 'the count is the cart\'s');
    assert.ok(rows[0].chipNode.classList.contains('has'));
    tap(el, 'cart');
    assert.deepEqual(calls, ['stop'], 'the list opens (the scanner closes first)');
    const css = read('shop-scan.css');
    assert.match(css, /\.b3-cam \.ss-liverow \.ss-chip \{[^}]*flex-direction: row;/, 'one row on small phones too');
    assert.match(css, /\.b3-cam \.ss-skip \{[^}]*min-height: 58px;/, 'Skip as tall as Add to cart');
});

test('openScanner gives only the live layer its cart row', () => {
    const f = fnSrc(html, 'function openScanner(mode)');
    assert.match(f, /if \(live && window\.LowiShopScan && LowiShopScan\.live\) LowiShopScan\.live\(el\);/);
    assert.ok(f.indexOf('LowiShopScan.live(el)') > f.indexOf('CAM = {el,'), 'after the camera state exists');
});

test('the chooser words exist in English, German and Spanish, and the Scan bubble says what a tap does', () => {
    for (const [k, en, de, es] of [
        ['chooseT', 'What do you want to check?', 'Was möchtest du prüfen?', '¿Qué quieres revisar?'],
        ['optLiveS', 'Product after product: into your cart or skip', 'Produkt für Produkt: in den Wagen oder überspringen', 'Producto tras producto: al carro o saltar'],
        ['optPhoto', 'Photo of your food', 'Foto von deinem Essen', 'Foto de tu comida'],
        ['optPhotoS', 'Opens your camera, the AI checks your plate', 'Öffnet deine Kamera, die KI prüft dein Essen', 'Abre tu cámara; la IA revisa tu plato']])
        assert.ok(html.includes('\n  ' + k + ': ["' + en + '", "' + de + '", "' + es + '"],'), k);
    assert.ok(html.includes('\n  pickLive: ["Live barcode scan", "Barcode live scannen", "Escanear en vivo"],'));
    const orbit = read('home-orbit-v2.js');
    assert.match(orbit, /scan: \[\['Scan: live barcode scan, photo of your food or Deep analyze', 'Scan'\]/);
    assert.doesNotMatch(orbit, /Take a photo of a product or a meal/);
});
