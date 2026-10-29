/* One UI step 1 (Oct 22 2026): the profile hub lives in the one sheet shell, no dark band behind the grab, the round X never sits on a
   sheet. The look itself is checked in the browser by tools/one-ui/look.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the hub opens in the shared shell (LowiR2.sheet, one-sheet class), with the old card only as a fallback', () => {
    const js = R('community-me.js');
    assert.match(js, /R2\.sheet\('<div class="cme cme-in" id="cmeSheet"><\/div>', \{ cls: 'cme-ov one-sheet', onClose: \(\) => done\(false\) \}\)/);
    assert.match(js, /if \(ov\) \{ const o = ov; done\(refocus\); try \{ root\.LowiR2\.close\(o\); \}/, 'closing the hub closes its sheet');
    assert.match(js, /\(ov \? '' : '<button type="button" class="cme-ibtn" data-cme="close"/, 'no second X inside the shell');
    /* the hold guard moves to the sheet: the click that ends the hold presses nothing */
    assert.match(js, /ov\.addEventListener\('click', e => \{ if \(!armed && e\.detail !== 0\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); return; \}/);
});

test('the settings page is one iOS list: every group is rows with one line, no tile grid (Oct 29 2026)', () => {
    const js = R('community-me.js');
    assert.ok(!/function tile\(id\)/.test(js), 'no tiles');
    assert.match(js, /<\/h3><div class="cme-list">' \+ g\.ids\.map\(row\)\.join\(''\) \+ '<\/div><\/section>'/);
    assert.match(js, /'<span class="cme-tx"><b>' \+ esc\(lab\) \+ '<\/b><\/span>' \+ svg\('chev', 'cme-chev'\)/, 'one line per row');
});

test('one-sheet.css: no band behind the grab, the sheet ends above the round X, tiles three across', () => {
    const css = R('one-sheet.css');
    assert.match(css, /\.r2-ov:not\(\.full\) \.r2-sh > \.pf-hd \{ background: none !important; \}/);
    assert.match(css, /html:root:root\.wh-x-on body \.r2-ov:not\(\.full\) \.r2-sh \{\s*margin-bottom: var\(--one-x-gap\) !important;/);
    assert.match(css, /--one-x-gap: calc\(var\(--sab, env\(safe-area-inset-bottom\)\) \+ 72px\)/, 'X is 58px at 16px from the bottom');
    assert.match(css, /\.r2-ov\.one-sheet:not\(\.full\) \.r2-sh \{\s*background: var\(--mb-surface/, 'the same membrane as Log a meal');
    assert.match(css, /\.cme-tiles \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    const n = (css.match(/\{/g) || []).length, m = (css.match(/\}/g) || []).length; assert.strictEqual(n, m, 'braces balance');
});

test('one-sheet.css is linked after community-me and precached', () => {
    const html = R('index.html'), sw = R('sw.js');
    const a = html.indexOf('community-me.js?v='), b = html.indexOf('one-sheet.css?v=');
    assert.ok(a > 0 && b > a, 'linked after the hub script');
    assert.match(sw, /"one-sheet\.css"/);
});
