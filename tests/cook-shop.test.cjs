'use strict';
/* Oct 16, 2026 (Eman: "it's either cook it or grocery shop it ... the shop it interface is not aligned with our design style.
   Improve it so it's very efficient."): Cook it / Shop it as two equal primary actions, and Shop it (the cart) in black space + blue glass. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const css = read('cook-shop.css');
const fnSrc = name => { const i = html.indexOf('function ' + name + '('); assert.ok(i >= 0, 'missing ' + name); let d = 0, j = html.indexOf('{', i); for (; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) break; } return html.slice(i, j + 1); };

test('Cook it and Shop it come as one equal pair', () => {
    const i = html.indexOf('const CS_IC = {'), csIc = html.slice(i, html.indexOf('};', i) + 2);
    const ctx = {esc: s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'), window: {}};
    vm.runInNewContext(csIc.replace('const CS_IC', 'var CS_IC') + fnSrc('csPair') + ';this.out=[csPair("r_7"),csPair("m_3",{close:true,cook:\'data-p2="cook"\',noCook:false}),csPair("x",{noCook:true})];', ctx);
    const [a, b, c] = ctx.out;
    assert.match(a, /class="cs-btn cs-cook" data-p2="recipe" data-id="r_7">.*Cook it/);
    assert.match(a, /class="cs-btn cs-shop" data-lc="open" data-id="r_7">.*Shop it/);
    assert.ok(b.includes('data-p2="cook"') && b.includes('data-p2close="1"'), 'recipe screen: cook starts cooking, shop closes the recipe and opens the cart');
    assert.ok(!c.includes('Cook it') && c.includes('Shop it'), 'no steps: Shop it alone');
    /* both buttons share one look: equal weight */
    assert.match(css, /\.cs-pair \{ display: grid !important; grid-template-columns: 1fr 1fr;/);
    assert.ok(css.includes('html body .cs-pair .cs-btn {'));
    assert.ok(!/\.cs-(cook|shop)\s*\{/.test(css), 'neither button is styled stronger than the other');
});

test('the pair is on the Cook tab, the shuffle pick and every recipe', () => {
    assert.ok(html.includes('<div class="cs-pair cs-hub" id="csHub"><button type="button" class="cs-btn cs-cook" data-lc="hubcook">'), 'Cook tab hub');
    assert.ok(html.includes('LowiCS.pair(f.id, {cls:"r5-btns"'), 'shuffle pick');
    assert.ok(html.includes('LowiCS.pair(r.id, {cls:"p2-start p2-up p2-cs", cook:\'data-p2="cook"\', cookId:"p2Start", shopId:"p2Shop", close:true'), 'recipe screen');
    /* hub: Cook opens the picked or planned recipe, Shop opens the cart with the pick */
    assert.ok(html.includes('case "hubshop":') && html.includes('case "hubcook":'));
    /* Shop it works for swaps/meals on the recipe screen too */
    assert.ok(html.includes('LowiP2.rec && /^(m_|t_)/.test(String(id)) ? LowiP2.rec(id) : null'));
});

test('Shop it: glass close in the header, never over an action', () => {
    const r = fnSrc('lcRender0');
    assert.ok(r.includes('<button class="cs-x" data-lc="close" aria-label="Close">'), 'own close in the header');
    assert.ok(r.indexOf('cs-x') < r.indexOf('lc-body'), 'close sits above the body, not in the footer');
    assert.ok(css.includes('html:has(#lsCart.open) #whX, html:has(#lcShop.open) #whX { display: none !important; }'), 'the Today X never floats over Shop at ...');
    assert.match(css, /:is\(#lsCart, #lcShop\) \.cs-x \{[^}]*width: 44px; height: 44px;[^}]*border-radius: 50%/);
});

test('Shop it: no gold, no grid sketch, compact stores, all functions kept', () => {
    const r = fnSrc('lcRender0');
    for (const k of ['data-lc="store"', 'data-lc="meal"', 'data-lc="addmeal"', 'id="lcCart"', 'id="lcIn"', 'id="lcShelf"', 'data-lc="copy"', 'data-lc="shop"', 'data-lc="order"', 'LowiK9.entry()', 'lc-cheap'])
        assert.ok(r.includes(k), 'keeps ' + k);
    assert.ok(!r.includes('lc-cmp'), 'the big compare card is gone: the chips say the price, a one-line Switch says the saving');
    assert.ok(r.includes('class="cs-save" data-lc="store"'));
    assert.ok(css.includes('html body #lsCart .lc-handle, html body #lsCart .lc-wheels { display: none !important; }'), 'no wire-cart drawing');
    assert.ok(!/(202, ?161, ?90|#e7c48a|#caa15a|gold)/i.test(css.replace(/no gold/gi, '')), 'no gold or beige in Shop it');
    assert.ok(css.includes('html body .k9-eic { background: var(--wh-glass-bg'), 'search tile is blue glass');
    assert.ok(css.includes('html body #lsCart .lc-st.on { background: var(--cs-glass)'));
    assert.ok(css.includes('html body #lsCart .lc-stage { width: auto; height: auto;'), 'companion-birth.css .lc-stage (200x200) must not squeeze the cart');
});

test('in the store: the cart items tick off, at the cart store, and Done counts them as bought', () => {
    assert.ok(html.includes('case "shop": lcShopOpen(); break;'), 'Shop at ... opens the cart list, not the Today list');
    const s = fnSrc('lcShopRender');
    assert.ok(s.includes('lcItems().filter(lcIn)') && s.includes('data-lc="stick"') && s.includes('data-lc="shopdone"') && s.includes('cs-bar'));
    assert.ok(fnSrc('lcRender0').includes('data-lc="tick"'), 'tick right in the cart list too');
    assert.ok(html.includes('Object.keys(g).forEach(k => { S.td.got[k] = 1; }); lcState().got = {}; save();'));
    /* first open picks the cheapest store when you never chose one */
    assert.ok(html.includes('if (!opts.store && !lcState().picked) {'));
});

test('cook-shop.css loads last and is cached offline', () => {
    assert.match(html, /<link rel="stylesheet" id="cshCss" href="cook-shop\.css\?v=\d{8}-\d{6}">\n(<link rel="stylesheet" id="symCss" href="sym-home\.css\?v=\d{8}-\d{6}">\n<script src="sym-home\.js\?v=\d{8}-\d{6}"><\/script>\n)?(<link rel="stylesheet" id="secCss" href="section-nav\.css\?v=\d{8}-\d{6}">\n<script src="section-nav\.js\?v=\d{8}-\d{6}"><\/script>\n)?<\/body>/);  /* Oct 21: section-nav (X + swipe back, replaces the menu bar) loads after them */
    assert.ok(read('sw.js').includes('"cook-shop.css"'));
});
