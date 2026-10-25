'use strict';
/* Oct 25 2026: proves the server-side spike word list in supabase/proposals/gift_baskets_20261025.sql (gift_items_ok)
   never refuses a food the app itself rates low-spike (LowiFoodPolicy.rateName verdict JA).
   node tools/gift-basket/deny-corpus.cjs   -> prints counts, exits 1 on any JA food the list would refuse. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
global.self = global;
const FP = require(path.join(root, 'food-policy-core.js'));
const rate = n => { try { return (FP.rateName ? FP : global.LowiFoodPolicy).rateName(n); } catch (e) { return null; } };
const DENY = require('./deny.cjs');
const re = { test: DENY.refused };
const norm = s => String(s || '');
const files = fs.readdirSync(root).filter(f => /\.(js|json)$/.test(f) && !/^vendor/.test(f));
const names = new Set();
for (const f of files) {
  let t = ''; try { t = fs.readFileSync(path.join(root, f), 'utf8'); } catch (e) { continue; }
  if (t.length > 6e6) continue;
  const m = t.match(/['"`]([^'"`\n\\]{2,40})['"`]/g) || [];
  for (const s of m) { const v = s.slice(1, -1).trim(); if (/[a-zäöüßáéíóúñ]/i.test(v) && !/[{}<>=;()$]/.test(v)) names.add(v); }
}
/* the app rates these JA (nut rule wins); the server refusing sugar-coated nuts is intended */
const INTENDED = ['Nuts in a sugar coating, not plain nuts', 'Sugar-coated nuts'];
let ja = 0, bad = [], hit = 0;
for (const n of names) {
  const r = rate(n); const isJa = r && r.verdict === 'JA';
  const den = re.test(norm(n));
  if (isJa) ja++;
  if (den) hit++;
  if (isJa && den && !INTENDED.includes(n)) bad.push(n);
}
/* the spike foods the app must refuse are refused by the server too */
const mustRefuse = ['Cola', 'Coca-Cola', 'Toast', 'Toastbrot', 'Weißbrot', 'white bread', 'Bananen', 'Banana', 'Plátano', 'Zucker', 'sugar', 'azúcar', 'Gummibärchen', 'Chips', 'Kartoffelchips', 'Apfelsaft', 'orange juice', 'zumo de naranja', 'Limonade', 'Fanta', 'Sprite', 'Red Bull', 'Energy Drink', 'Nutella', 'Cornflakes', 'Croissant', 'Donut', 'Kuchen', 'cake', 'Kekse', 'cookies', 'galletas', 'Süßigkeiten', 'candy', 'Bonbons', 'Eiscreme', 'ice cream', 'Pommes', 'french fries', 'Pizza', 'Bier', 'beer', 'cerveza', 'Wein', 'Vodka', 'Honig', 'honey', 'Marmelade', 'jam', 'Sirup', 'syrup', 'Softdrink', 'Eistee', 'Weingummi', 'Lollipop', 'Brötchen', 'baguette', 'pan blanco', 'Chocolate bar', 'Schokoriegel', 'Snickers', 'Haribo', 'Milchschnitte', 'Kinder Riegel'];
const miss = mustRefuse.filter(n => !re.test(norm(n)));
console.log(JSON.stringify({ corpus: names.size, ja, denyHits: hit, jaRefused: bad.slice(0, 40), jaRefusedCount: bad.length, mustRefuseMissed: miss }));
process.exit(bad.length || miss.length ? 1 : 0);
