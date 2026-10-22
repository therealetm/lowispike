// scanfe-c (Oct 22, 2026): ingredient parser + flags (ingredient-core.js, window.LowiIngredients).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const I = require(path.join(__dirname, '..', 'ingredient-core.js'));
const root = path.join(__dirname, '..');
const words = arr => arr.map(h => h.w);

test('brackets are read: sweeteners and sugar inside compound ingredients', () => {
  const zero = I.analyzeIngredients('Wasser, Kohlensäure, Farbstoff E150d, Säureungsmittel Phosphorsäure, Süßungsmittel (Natriumcyclamat, Acesulfam K, Aspartam), Aroma');
  assert.strictEqual(zero.status, 'complete');
  assert.ok(words(zero.flags.sweeteners).includes('aspartam'));
  assert.ok(zero.summary.sweetener);
  assert.strictEqual(zero.flags.addedSugar.length, 0, 'E150d colour is not sugar');
  assert.strictEqual(zero.flags.veg.length, 0, 'Kohlensäure is not cabbage');
  const jog = I.analyzeIngredients('Joghurt, Erdbeerzubereitung (Erdbeeren 60%, Zucker, färbendes Rote Beete Saftkonzentrat), Zucker');
  const nested = jog.flags.addedSugar.find(h => h.depth === 1);
  assert.ok(nested && nested.i === 1 && nested.top, 'sugar inside the 2nd ingredient counts at position 2');
  assert.ok(!words(jog.flags.addedSugar).some(w => /saftkonzentrat/.test(w)), 'colouring concentrate is not added sugar');
  assert.ok(jog.truncated === false);
});

test('E-number sweeteners, sugar alcohols and percent decimals', () => {
  const a = I.analyzeIngredients('Entrahmte Milch, Milcheiweiß 8,5%, modifizierte Stärke, Süßungsmittel (E 950 Sucralose), Erythrit');
  assert.ok(words(a.flags.sweeteners).some(w => /e 950/.test(w)));
  assert.ok(words(a.flags.sugarAlcohols).includes('erythrit'));
  assert.ok(a.summary.refinedTop && /stärke/.test(a.summary.refinedTop.w));
  assert.ok(a.items.some(it => it.text === 'milcheiweiß' && it.pct === 8.5), '8,5% stays one ingredient');
  assert.deepStrictEqual(a.allergens, ['milk']);
});

test('added sugar family: syrups, honey, dextrose, maltodextrin, juice concentrate; claims are not sugar', () => {
  const a = I.analyzeIngredients('Haferflocken, Glukosesirup, Honig, Dextrose, Maltodextrin, Apfelsaftkonzentrat, Reissirup');
  assert.strictEqual(a.flags.addedSugar.length, 6);
  assert.ok(a.summary.addedSugarTop.i === 1);
  assert.ok(!words(a.flags.refinedStarch).includes('reissirup'), 'rice syrup is sugar, not starch');
  assert.ok(a.summary.wholeGrainTop, 'oats are whole grain');
  const b = I.analyzeIngredients('Mandeln, Salz, ohne Zucker');
  assert.strictEqual(b.flags.addedSugar.length, 0);
});

test('refined starch vs whole grain', () => {
  const t = I.analyzeIngredients('58 % Weizenvollkornmehl, Wasser, Weizensauerteig (Weizenmehl, Wasser), Hefe');
  assert.ok(!words(t.flags.refinedStarch).includes('weizenvollkornmehl'));
  assert.ok(words(t.flags.refinedStarch).includes('weizenmehl'));
  assert.ok(words(t.flags.wholeGrain).includes('weizenvollkornmehl'));
  const r = I.analyzeIngredients('Basmatireis');
  assert.ok(r.summary.refinedTop);
  const s = I.analyzeIngredients('Hartweizengrieß');
  assert.ok(s.summary.refinedTop);
  assert.ok(s.allergens.includes('gluten'));
});

test('EU-14 allergens without false hits', () => {
  const a = I.analyzeIngredients('Erdnüsse, Haselnüsse, Sesam, Senf, Sellerie, Sojalecithin, Eigelb, Lachs, Garnelen, Lupinenmehl, Tintenfisch, Schwefeldioxid, Weizenmehl, Butter');
  for (const k of ['peanuts', 'nuts', 'sesame', 'mustard', 'celery', 'soy', 'eggs', 'fish', 'crustaceans', 'lupin', 'molluscs', 'sulphites', 'gluten', 'milk']) assert.ok(a.allergens.includes(k), k);
  const b = I.analyzeIngredients('Kokosmilch, Muskatnuss, Kakaobutter, Milchsäure, Laktase, Erdnussbutter');
  assert.ok(!b.allergens.includes('milk'), 'coconut milk, cocoa butter, lactic acid, lactase are not milk');
  assert.ok(!b.allergens.includes('nuts'), 'nutmeg / coconut are not tree nuts');
  assert.ok(b.allergens.includes('peanuts'));
  const c = I.analyzeIngredients('Milcheiweiß, Molke');
  assert.ok(!c.allergens.includes('eggs'), 'milk protein is not egg');
});

test('pork and alcohol, with turkey salami and vinegar excluded', () => {
  assert.ok(I.analyzeIngredients('Schweinefleisch, Speck, Salz').summary.pork);
  assert.ok(!I.analyzeIngredients('Putensalami (Putenfleisch, Salz)').summary.pork);
  assert.ok(I.analyzeIngredients('Sahne, Zucker, Rum, Eigelb').summary.alcohol);
  assert.ok(!I.analyzeIngredients('Tomaten, Weinessig, Salz').summary.alcohol);
});

test('claims are recognised and never approve', () => {
  const a = I.analyzeIngredients('Milch', {name: 'High Protein Pudding Low Carb Keto zuckerfrei Bio vegan glutenfrei'});
  const keys = a.claims.map(c => c.key);
  for (const k of ['high_protein', 'low_carb', 'keto', 'sugar_free', 'organic', 'vegan', 'gluten_free']) assert.ok(keys.includes(k), k);
  assert.ok(a.claims.every(c => c.approves === false));
  assert.strictEqual(a.claimsApprove, false);
  assert.deepStrictEqual(I.detectClaims('Coca-Cola Zero').map(c => c.key), ['zero_sugar']);
});

test('missing, unusable and truncated lists are never treated as clean', () => {
  const m = I.analyzeIngredients(null);
  assert.strictEqual(m.status, 'missing');
  assert.strictEqual(m.complete, false);
  assert.strictEqual(m.summary, undefined, 'no summary means no claim of "no added sugar"');
  assert.strictEqual(I.analyzeIngredients('  ').status, 'missing');
  assert.strictEqual(I.analyzeIngredients('%% 12 ## 3,4 // 5').status, 'unusable');
  const t = I.analyzeIngredients('Joghurt, Erdbeerzubereitung (Erdbeeren 60%, Zucker');
  assert.strictEqual(t.truncated, true);
  assert.ok(I.analyzeIngredients('Wasser, Zucker, ...').truncated);
});

test('ingredient-core.js and food-policy-core.js load before food-engine-core.js and are cached by the service worker', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const a = html.indexOf('<script src="ingredient-core.js'), b = html.indexOf('<script src="food-policy-core.js'), c = html.indexOf('<script src="food-engine-core.js');
  assert.ok(a > 0 && b > a && c > b);
  assert.strictEqual(sw.split('"ingredient-core.js", "food-policy-core.js", "food-engine-core.js"').length - 1, 2, 'both sw.js lists');
});
