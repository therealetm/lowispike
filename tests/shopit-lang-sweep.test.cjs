'use strict';
/* Oct 24, 2026 button sweep (17:20): Cook > Shop it, tapped through in German and Spanish, still showed English:
   - "Lidl is €0,10 cheaper" on the switch-store button (the <b> around the amount split the sentence, so the translator never matched it)
   - "Nori Smash Burger Stack · Cabbage Egg Okonomiyaki" under a list item that two meals need (the translator knows each recipe
     name, not two joined), in the cart, in the in-store list and in Today's at-home list
   - the in-store list's "Shopping at Aldi", "0 of 11", "Nothing to buy" and its X's label "Back to the cart"
   - every product tile's spoken label ("Nori sheets", "Cabbage") while the tile itself read German.
   The browser check is tools/sweep-buttons-shopprobe.cjs --lang de. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function cheaper(lang) {
  const src = html.match(/function lcCheaper\(store, eur\)\{[\s\S]*?\n  return [^\n]*\}/)[0];
  const L = { get: () => lang }, sb = { window: { LowiLang: L }, LowiLang: L, esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;') };
  vm.createContext(sb); vm.runInContext(src + '; this.f = lcCheaper;', sb); return sb.f;
}

test('switch-store line is one sentence in the user\'s language, amount still bold', () => {
  assert.equal(cheaper('de')('Lidl', '€0,10'), 'Lidl ist <b class="num">€0,10</b> günstiger');
  assert.equal(cheaper('es')('Lidl', '€0,10'), 'Lidl es <b class="num">€0,10</b> más barato');
  assert.equal(cheaper('en')('Lidl', '€0.10'), 'Lidl is <b class="num">€0.10</b> cheaper');
  assert.ok(!html.includes("' is <b class=\"num\">' + lcEur(save) + '</b> cheaper"), 'the split English sentence is back');
});

test('recipes a list item is for are translated name by name', () => {
  assert.ok(!/esc\(i\.for\.join\(" · "\)\)/.test(html), 'a list still joins English recipe names before translating');
  assert.ok((html.match(/esc\(lcFor\(i, " · "\)\)/g) || []).length >= 2, 'cart and in-store lists should use lcFor');
  assert.ok(html.includes('esc(i.for.map(n => window.LowiLang ? LowiLang.t(n) : n).join(" · "))'), 'Today\'s at-home list should translate each name');
  assert.ok(html.includes('aria-label="\' + esc(lcT(i.n)) + \'">\' + lcFace(i, "lc-e")'), 'product tiles should speak the translated name');
});

test('in-store list header, count, empty state and X label', () => {
  assert.ok(html.includes('aria-label="\' + esc(lcT("Back to the cart")) + \'"'), 'X label is still literal English');
  assert.ok(!html.includes('id="lcShopN">\' + n + " of " + inC.length'), 'count still says "of"');
  assert.ok(html.includes('({de:"von", es:"de"}[window.LowiLang ? LowiLang.get() : "en"] || "of")'));
  assert.ok(html.includes('[/^Shopping at (.+)$/, "Einkaufen bei $1", "Comprando en $1"]'), 'header pattern missing');
  assert.ok(html.includes('["Nothing to buy", "Nichts zu kaufen", "Nada que comprar"]'), 'empty-state row missing');
  const re = /^Shopping at (.+)$/; assert.equal('Shopping at Aldi'.replace(re, 'Einkaufen bei $1'), 'Einkaufen bei Aldi');
});
