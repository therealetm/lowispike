// 24 Nov 2026 (Emmanuel: "Nuke [the supermarket] completely ... When people click on supermarket, a game ... pick a budget ... fake
// grocery shop ... but also apply to reality ... a digital grocery basket"). grocery-run.js: the Grocery Run game.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const G = require('../grocery-run.js'), js = R('grocery-run.js');
test('pack sizes and estimated prices: by aisle, pack and chain, always ending .49 or .99', () => {
  assert.strictEqual(G.kgOf('500g'), 0.5); assert.ok(Math.abs(G.kgOf('6 x 50 g') - 0.3) < 1e-9); assert.strictEqual(G.kgOf('1,5 l'), 1.5); assert.strictEqual(G.kgOf('1pcs'), 0);
  const a = G.price({ q: '500 g', g: '1', n: 'x' }, 'veg', 'lidl'), b = G.price({ q: '500 g', g: '1', n: 'x' }, 'veg', 'edeka');
  assert.ok(a >= 0.39 && a < 3 && /\.(49|99)$/.test(a.toFixed(2)), a); assert.ok(b >= a, 'Edeka not cheaper than Lidl');
  assert.match(js, /≈ ' \+ esc\(eur\(p\.price\)\)/, 'every price is shown as an estimate'); assert.match(js, /Prices are estimates \(≈\), not the shop’s real prices\./);
});
test('missions and score: budget, 80% insulin-friendly, veggies + protein', () => {
  const cart = [{ price: 2, qty: 3, ok: true, best: true, aisle: 'veg' }, { price: 5, qty: 1, ok: true, best: false, aisle: 'meat' }, { price: 1, qty: 1, ok: false, best: false, aisle: 'sweets' }];
  assert.deepStrictEqual(G.missions(cart, 20), [true, true, true]);
  assert.deepStrictEqual(G.missions(cart, 5), [false, true, true]);
  assert.strictEqual(G.score(cart, 20), 30 * 3 + 20 - 10 + Math.round((20 - 12) * 5));
  assert.deepStrictEqual(G.missions([], 20), [false, false, false]);
});
test('the cart bubble opens the game; the old shop doors no longer bloom; loaded, cached, three languages', () => {
  const h = R('home-blooms-v2.js');
  assert.match(h, /if \(kind === 'fuel' && fn\(W\.LowiGroceryRun, 'open'\)\) return shop\(\);/);
  assert.match(h, /if \(fn\(W\.LowiGroceryRun, 'open'\)\) \{ close\(true\); buzz\(8\); W\.LowiGroceryRun\.open\(\); return true; \}/);
  assert.match(R('index.html'), /<script src="grocery-run\.js\?v=/); assert.match(R('sw.js'), /STATIC\.push\("grocery-run\.js", "grocery-run\.css"\)/);
  const S = /const S = (\{[\s\S]*?\n  \});/.exec(js)[1]; for (const [k, v] of Object.entries(require('vm').runInNewContext('(' + S + ')'))) assert.ok(v.length === 3 && v.every(x => x), k);
  assert.match(R('grocery-run.css'), /@media \(prefers-reduced-motion:reduce\)/);
});
test('Grocery Run wears the app\'s look: dark space, glass cards, neon glow (24 Nov 2026)', () => {
  const c = R('grocery-run.css');
  assert.match(c, /\.gr\.gr\{--g-ink:#eef3ff;/); assert.match(c, /#05060c\}/);
  assert.match(c, /backdrop-filter:blur\(18px\) saturate\(160%\)/); assert.match(c, /box-shadow:0 0 22px rgba\(255,216,74,\.55\)/);
});
