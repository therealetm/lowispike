'use strict';
/* Oct 24, 2026 button sweep (18:20): Today's in-store list (Go shopping) tapped through in German still showed English:
   "0 of 11" (and "1 of 11" after a tick), "for Nori Smash Burger Stack, Cabbage Egg Okonomiyaki" under an item, and
   "Members found: Cheddar Scheiben at REWE". Shop it's prices read "€1,89" in English.
   The browser check is tools/sweep-buttons-tdshopprobe.cjs --lang de. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const DE = { 'Nori Smash Burger Stack': 'Nori-Smash-Burger-Stapel', 'Cabbage Egg Okonomiyaki': 'Kohl-Ei-Okonomiyaki' };
function load(lang) {
  const helpers = html.match(/const tdLang = [^\n]*\n(?:const td(?:OfTx|ForTx|FoundTx) = [^\n]*\n){3}/)[0];
  const eur = html.match(/const lcEur = [^\n]*\n/)[0];
  const L = { get: () => lang, t: s => (lang === 'de' && DE[s]) || s }, sb = { window: { LowiLang: L }, LowiLang: L };
  vm.createContext(sb); vm.runInContext(helpers + eur + '; this.r = {tdOfTx, tdForTx, tdFoundTx, lcEur};', sb); return sb.r;
}

test('in-store count reads in the user\'s language', () => {
  assert.equal(load('de').tdOfTx(0, 11), '0 von 11');
  assert.equal(load('es').tdOfTx(1, 11), '1 de 11');
  assert.equal(load('en').tdOfTx(1, 11), '1 of 11');
  assert.ok(!/got \+ " of " \+ all/.test(html), 'a hard-coded English "of" count is back');
});

test('the recipes an item is for are translated name by name, with the word for "for"', () => {
  const i = { for: ['Nori Smash Burger Stack', 'Cabbage Egg Okonomiyaki'] };
  assert.equal(load('de').tdForTx(i), 'für Nori-Smash-Burger-Stapel, Kohl-Ei-Okonomiyaki');
  assert.equal(load('es').tdForTx({ for: ['X'] }), 'para X');
  assert.equal(load('en').tdForTx(i), 'for Nori Smash Burger Stack, Cabbage Egg Okonomiyaki');
  assert.ok(!html.includes('"for " + esc(i.for.join(", "))'), 'the joined English line is back');
});

test('members found line reads in the user\'s language', () => {
  const f = { n: 'Cheddar Scheiben', store: 'REWE', price: '€2,29' };
  assert.equal(load('de').tdFoundTx(f), 'Von Mitgliedern gefunden: Cheddar Scheiben bei REWE · €2,29');
  assert.equal(load('es').tdFoundTx(f), 'Encontrado por miembros: Cheddar Scheiben en REWE · €2,29');
  assert.equal(load('en').tdFoundTx({ n: 'A $& B', store: 'Aldi' }), 'Members found: A $& B at Aldi');
});

test('Shop it prices: decimal point in English, comma in German and Spanish', () => {
  assert.equal(load('en').lcEur(1.89), '€1.89');
  assert.equal(load('de').lcEur(1.89), '€1,89');
  assert.equal(load('es').lcEur(0.1), '€0,10');
});

test('"Any store" has a German and Spanish row', () => {
  assert.ok(html.includes('["Any store", "Jeder Laden", "Cualquier tienda"]'));
});
