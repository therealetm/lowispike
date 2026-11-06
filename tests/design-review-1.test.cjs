'use strict';
/* Nov 6 2026 design review point 1 (Emmanuel): logging food.
   - In the Scan camera, a food result (a typed name or a plate: no barcode) has "Log as eaten" as the big button and Add to cart
     as the small one; a barcode product keeps Add to cart big (shop-scan.js result()). The plate photo sheet already had Log as
     eaten as its one main button.
   - After Log as eaten comes "Last meal today?" with "Yes, start Gap" and "Not yet" (last-meal-ask.js). Yes does exactly what the
     Gap bubble's Last meal does (home-blooms-v2.js gap.commit('last', t)), t = when the meal was eaten; Not yet changes nothing.
     The 28 Oct decoupling stays: logging alone never touches the Gap.
   - Bubble catch after logging is NOT automatic: it would change the XP rules (Pathfinder XP without a tap, and every eaten
     product shared into the Bubble Dex), so Emmanuel decides first.
   Browser walk (scratch, Chromium, fake camera, local site, network blocked), recorded in DECISIONS.md. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ss = read('shop-scan.js'), html = read('index.html'), sp = read('spirit.js'), lma = read('last-meal-ask.js');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}

/* a small stand-in for the page: just what last-meal-ask.js touches */
function page(o) {
    o = o || {};
    const on = {}, body = { kids: [], appendChild(c) { this.kids.push(c); c.isConnected = true; } };
    const D = { body, documentElement: { lang: o.lang || 'de' }, addEventListener: (n, f) => { (on[n] = on[n] || []).push(f); }, removeEventListener: () => { },
        createElement: () => { const el = { classList: { s: new Set(), add(...a) { a.forEach(x => this.s.add(x)); }, remove(...a) { a.forEach(x => this.s.delete(x)); }, contains(x) { return this.s.has(x); } },
            attrs: {}, setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; }, set className(v) { String(v).split(' ').forEach(x => x && this.classList.add(x)); },
            contains: () => false, remove() { this.isConnected = false; }, querySelector: () => ({ id: 'lmaQ1', focus() { } }) }; return el; } };
    const commits = [];
    const W = { document: D, LowiLang: { get: () => o.lang || 'de' }, matchMedia: () => ({ matches: true }), requestAnimationFrame: f => f(), setTimeout: f => f(), Date };
    if (!o.noGap) W.LowiHomeBloomsV2 = { gap: { commit: (k, t) => { commits.push([k, t]); return true; } } };
    W.window = W;
    const ctx = vm.createContext(Object.assign({}, W, { window: W }));
    vm.runInContext(lma.replace("typeof window !== 'undefined' ? window : null", 'window'), ctx);
    /* a tap on a button inside a question block */
    const click = (which, t, inCard) => {
        const box = { getAttribute: k => (k === 'data-lma-t' ? String(t) : null), remove() { this.gone = true; } };
        const b = { getAttribute: k => (k === 'data-lma' ? which : null), closest: s => (s === '[data-lma]' ? b : s === '.lma' ? box : null) };
        on.click.forEach(f => f({ target: b, preventDefault() { } }));
        return box;
    };
    return { W, A: W.LowiLastMealAsk, commits, click, on };
}

test('a food in the Scan camera: Log as eaten is the big button, Add to cart the small one; a barcode product is unchanged', () => {
    const r = fnSrc(ss, 'function result(el, p, o)');
    assert.match(r, /const food = !code;/, 'food = no barcode (a typed name or a plate)');
    assert.match(r, /const acts = ctx === 'meal' \? ateB \+ kitB\(false\) : kIn \? pair\(kitB\(true\)\) \+ cartB\(false\)\n\s+: ctx === 'scan' && food \? pair\(ateB\) \+ cartB\(false\) \+ kitB\(false\)\n\s+: pair\(cartB\(true\)\) \+ kitB\(false\) \+ \(ctx === 'scan' \? ateS : ''\);/);
    assert.match(r, /const ateB = '<button type="button" class="ss-add ss-ate" data-ss="ate">'/, 'ss-add is the big style');
    assert.match(r, /const cartB = big => '<button type="button" class="' \+ \(big \? 'ss-add' : 'ss-kit'\) \+ '" data-ss="add">'/);
    assert.ok(/ate: \['Log as eaten', 'Als gegessen eintragen', 'Registrar como comido'\]/.test(read('shop-scan-core.js')));
    assert.match(sp, /<button type="submit" class="sp-action sp-primary">' \+ icon\('plate'\) \+ '<span>' \+ esc\(tr\('photoLog'\)\)/, 'the plate photo sheet: Log as eaten is its main button');
});

test('after a real log the scan card asks "Last meal today?"; logging alone never touches the Gap', () => {
    const a = fnSrc(ss, 'function ate(el, btn)');
    assert.match(a, /let r = null; try \{ r = X\(\)\.eat\(p\); \} catch \(e\) \{\}/);
    assert.match(a, /if \(A && r && r\.log && !r\.dup\) setTimeout\(\(\) => \{ try \{ A\.ask\(r\.log\.ts\); \} catch \(e\) \{\} \}, 700\);/, 'only after a real log, at the meal time');
    assert.doesNotMatch(a.replace(/\/\*[\s\S]*?\*\//g, ''), /bubble|LowiFastStop|LowiFastEdit|firstMeal/, 'no automatic Bubble catch, no Gap from the log itself');
    const eat = fnSrc(html, 'function eatCur(btn, prod)');
    assert.match(eat, /return res \|\| null;\n\}$/, 'eatCur says what the log did');
    assert.ok(!/LowiFastStop|LowiFastEdit|firstMeal/.test(eat), 'DECOUPLED: logging starts no Gap');
    assert.match(html, /eat:p => eatCur\(\{disabled:false\}, p\)/);
    const fm = fnSrc(sp, 'async function finishMeal(form)');
    assert.match(fm, /const askLast = !!\(form\.classList && form\.classList\.contains\('sp-photo-form'\) && !form\.dataset\.edit\);/);
    assert.match(fm, /const lma = askLast && window\.LowiLastMealAsk \? window\.LowiLastMealAsk\.html\(log\.ts\) : '';\n\s+showSheet\('<h2>' \+ esc\(tr\('saved'\)\) \+ '<\/h2><p>' \+ [^\n]*esc\(log\.t\) \+ '<\/p>' \+ lma \+ estHTML\(log\)/, 'right under the meal in its Saved sheet');
    assert.match(html, /<script src="shop-scan\.js\?v=[^"]+"><\/script>\n<link rel="stylesheet" href="last-meal-ask\.css\?v=[^"]+">\n<script src="last-meal-ask\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /STATIC\.push\("last-meal-ask\.js", "last-meal-ask\.css"\);/);
});

test('"Last meal today?": Yes is the Gap bubble\'s own Last meal at the meal time, Not yet changes nothing', () => {
    const p = page({ lang: 'de' });
    const h = p.A.html(1000);
    assert.match(h, /<b class="lma-q" id="lmaQ\d+">Letzte Mahlzeit heute\?<\/b>/);
    assert.match(h, /data-lma="yes">Ja, Gap starten<\/button><button type="button" class="lma-no" data-lma="no">Noch nicht<\/button>/);
    assert.match(h, /data-lma-t="1000"/);
    const yes = p.click('yes', 1000);
    assert.deepEqual(p.commits.map(c => Array.from(c)), [['last', 1000]], 'exactly the bubble\'s Last meal, at the meal time');
    assert.ok(yes.gone, 'the question goes once answered');
    p.click('no', 2000);
    assert.equal(p.commits.length, 1, 'Not yet: nothing');
    const later = Date.now() + 3600e3; p.click('yes', later);
    assert.ok(p.commits[1][1] <= Date.now(), 'never a start in the future');
    assert.equal(page({ noGap: true }).A.html(1000), '', 'no Gap bubble, no question');
    assert.equal(page({ noGap: true }).A.ask(1000), false);
    const en = page({ lang: 'en' }).A._tx, es = page({ lang: 'es' }).A._tx;
    assert.deepEqual([en.q(), en.yes(), en.no()], ['Last meal today?', 'Yes, start Gap', 'Not yet']);
    assert.deepEqual([es.q(), es.yes(), es.no()], ['¿La última comida de hoy?', 'Sí, iniciar Gap', 'Todavía no']);
    assert.equal((lma.replace(/\/\*[\s\S]*?\*\//g, '').match(/\.commit\(/g) || []).length, 1, 'the one place that touches the Gap is the Yes answer');
});

test('the card: over the screen at the bottom, the after-meal checklist waits for it, calm motion', () => {
    assert.match(lma, /c\.className = 'lma-card on'; c\.setAttribute\('role', 'dialog'\);/, 'after-meal-checklist.js blocker() waits for a visible role=dialog.on');
    assert.match(read('after-meal-checklist.js'), /\[role="dialog"\]\.on/);
    assert.match(lma, /c\.classList\.remove\('in', 'on'\); c\.classList\.add\('out'\);/, 'the checklist comes back once it is answered');
    assert.match(lma, /function outside\(e\) \{ if \(card && !\(e\.target && card\.contains\(e\.target\)\)\) close\(\); \}/, 'a tap elsewhere is a Not yet');
    const css = read('last-meal-ask.css');
    assert.match(css, /\.lma-card \{ position: fixed; z-index: 9200; left: 16px; right: 16px; bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 96px\);/);
    assert.match(css, /\.lma-acts button \{ flex: 1 1 0; min-width: 0; min-height: 48px;/, 'big enough to tap');
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.lma-card, \.lma-card\.in, \.lma-card\.out \{ transition: none; transform: none; \}/);
});
