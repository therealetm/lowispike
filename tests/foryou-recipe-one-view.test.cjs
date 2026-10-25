'use strict';
/* Oct 25, 2026 (Eman, For You > Nibblo "Tausch des Tages" > recipe chip): two recipe views opened at once. The Kitchen's
   document capture listener ([data-sh] -> onAct -> openShelf, the "Rezept" page with the back arrow) and the P2 capture
   listener (the recipe screen) both ran on one tap: stopPropagation in a capture listener does not stop another listener on
   the same node. X on the recipe screen showed the Kitchen page underneath. Now: one recipe view (the P2 screen, it has all
   the Kitchen page had: shops, cart, Ess ich spaeter, share, and now the heads-up note), its X round at the bottom centre
   for one hand, and the For You post photo as its picture when the book has none.
   Browser check: tools/check-foryou-recipe.cjs <w> <h> [url|root] [out] [lang]. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('a recipe chip goes to the recipe screen only: onAct open-shelf hands recipe opens to LowiP2', () => {
  const i = html.indexOf('case "open-shelf":');
  assert.ok(i > 0);
  const body = html.slice(i, html.indexOf('return openShelf(', i));
  assert.match(body, /el\.dataset\.sub === "recipe" && el\.dataset\.r && window\.LowiP2 && LowiP2\.rec && LowiP2\.rec\(el\.dataset\.r\)\) return;/);
  /* the P2 capture listener still takes exactly these buttons */
  assert.ok(html.includes(`t.closest('[data-sh="recipe"][data-r], [data-sh="open-shelf"][data-sub="recipe"][data-r]')`));
});

test('the handoff logic: P2 knows the recipe -> no Kitchen page; P2 does not -> the Kitchen page as before', () => {
  const i = html.indexOf('case "open-shelf":');
  const src = html.slice(i + 'case "open-shelf":'.length, html.indexOf('\n', html.indexOf('return openShelf(', i)));
  const run = (known, sub) => {
    const calls = [];
    const fn = new Function('el', 'e', 'window', 'LowiP2', 'openShelf', src);
    const P2 = { rec: id => known ? { id } : null };
    fn({ dataset: { sub, r: 'rb_espresso_cottage_cream_cups', t: 'kochen' } }, { stopPropagation() { } }, { LowiP2: P2 }, P2, (...a) => calls.push(a));
    return calls;
  };
  assert.equal(run(true, 'recipe').length, 0);
  assert.equal(run(false, 'recipe').length, 1);
  assert.equal(run(true, '').length, 1);
});

test('the recipe screen puts its X at the bottom centre', () => {
  assert.match(html, /R2\.xBottom = function\(ov\)\{[^\n]*:scope > \.r2-sh > \.r2-x[^\n]*ov\.appendChild\(x\); ov\.classList\.add\("r2-xb"\)/);
  const o = html.indexOf('function openRecipe(');
  assert.ok(html.slice(o, html.indexOf('\n\n', o)).includes('R2.xBottom(ov)'));
  const css = html.match(/\.r2-ov\.r2-xb>\.r2-x\{([^}]*)\}/);
  assert.ok(css, 'bottom X style');
  assert.match(css[1], /left:50%/); assert.match(css[1], /margin-left:-29px/); assert.match(css[1], /width:58px/); assert.match(css[1], /bottom:calc\(/); assert.match(css[1], /top:auto/);
  assert.match(html, /\.r2-ov\.r2-xb \.r2-shb\{padding-bottom:calc\(/);
});

test('the recipe screen picture falls back to the For You photo, and it keeps the heads-up note', () => {
  assert.ok(html.includes('const img = k => (typeof FOOD_IMG !== "undefined" && k && FOOD_IMG[k]) || (window.LowiInspoCore && LowiInspoCore.fileImg && k ? LowiInspoCore.fileImg(k) : "");'));
  assert.ok(html.includes('note:r.note || ""'));
  assert.ok(html.includes(`(r.note ? '<div class="sh-heads p2-heads p2-up"`));
  const core = require(path.join(__dirname, '..', 'inspo-core.js'));
  const I = core.fileImg ? core : (global.LowiInspoCore || core);
  if (I && I.fileImg) assert.equal(I.fileImg('rb_espresso_cottage_cream_cups'), 'fy-img/rb_espresso_cottage_cream_cups.webp');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'fy-img', 'rb_espresso_cottage_cream_cups.webp')));
});
