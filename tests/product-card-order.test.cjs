/* Oct 19 (owner's call): the scanned-product card puts Details (open) and "cheaper at other stores" high and the community
   deals low. This renders the real simpleCardHTML() from index.html with small stubs and checks the order in EN, DE and ES. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const a = html.indexOf('const SC_TX = {'), b = html.indexOf('function actsHTML(p)');
const src = html.slice(a, b);

function render(lang, opts) {
    opts = opts || {};
    const L = { en: 0, de: 1, es: 2 }[lang];
    const ctx = {
        LI: () => L, esc: s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
        t: k => ({ catch: ['Catch it', 'Fangen', 'Atrapar'][L], legal: 'legal', catches1: '1 catch', bcFound: 'bc' })[k] || k,
        isMine: () => !!opts.mine, D: { mine: {} }, pkey: p => p.barcode, whyText: w => String(w), CAT_E: { other: '?' },
        factsHTML: () => '<div class="b3-facts">facts</div>', fillNoteHTML: () => '',
        LowiDeals: { cardHTML: () => '<section class="sc-sec sc-deals"><h4>deals</h4><button type="button" class="sc-ghost" data-sc="post">post</button></section>' },
        LOWI_SHELF: { priceCompareHTML: () => opts.prices ? '<div class="sh-cmp compact">rows</div>' : '' }
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(src + '\nthis.out = simpleCardHTML(P);', Object.assign(ctx, { P: { name: 'Putenhackfleisch', brand: 'Dulano (Lidl)', barcode: '4056489123456', verdict: 'ok', why: ['low carb'], facts: { q: '500 g' } } }));
    return ctx.out;
}
const at = (h, needle) => { const i = h.indexOf(needle); assert.ok(i >= 0, needle + ' present'); return i; };

for (const lang of ['en', 'de', 'es']) {
    test('product card order (' + lang + '): header > spike estimate > cheaper > Catch it > Details (open) > community deals > spike lists', () => {
        for (const prices of [false, true]) {
            const h = render(lang, { prices });
            const seq = ['class="sc-top"', 'class="sc-verd', 'class="sc-sec sc-prices"', 'data-b3="catch"', '<details class="sc-more" open>', 'class="sc-sec sc-deals"', 'data-sc="lists"'].map(n => at(h, n));
            for (let i = 1; i < seq.length; i++) assert.ok(seq[i - 1] < seq[i], 'step ' + i + ' in order (prices=' + prices + ')');
            /* the community deals and the lists button come after Details closes, never inside it */
            assert.ok(at(h, '</details>') < at(h, 'class="sc-sec sc-deals"'));
            assert.equal((h.match(/<details/g) || []).length, 1);
        }
    });
}
test('product card: Details summary is localized and the card still works for a product you already caught', () => {
    assert.match(render('es'), /<summary>Detalles<\/summary>/);
    assert.match(render('de'), /<summary>Details<\/summary>/);
    const h = render('en', { mine: true });
    assert.ok(at(h, 'sc-have') < at(h, '<details class="sc-more" open>'));
    assert.ok(!h.includes('data-b3="catch"'));
});
test('product card: sheets on Home keep room under the content for the bottom-centre close X', () => {
    const css = fs.readFileSync(path.join(root, 'world-home.css'), 'utf8');
    assert.match(css, /html\.wh-on\.wh-r2-on \.r2-ov:not\(\.full\) \.r2-shb \{ padding-bottom: calc\(var\(--sab, env\(safe-area-inset-bottom\)\) \+ 96px\) !important; \}/);
});
