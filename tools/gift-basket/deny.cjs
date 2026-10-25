'use strict';
/* Oct 25 2026: server-side spike word list for Give a hand baskets (gift_items_ok() in
   supabase/proposals/gift_baskets_20261025.sql). The app already refuses anything LowiFoodPolicy.rateName() does not
   rate JA; this list only stops a tampered app from posting obvious spike foods. It must never refuse a food the app
   accepts: tools/gift-basket/deny-corpus.cjs proves that against every food string in the repo.
   Each term: s = must start at a word start, e = must end at a word end (German compounds: 'saft' ends Apfelsaft). */
const TERMS = [
  // drinks
  ['cola', 1, 0], ['coca', 1, 0], ['pepsi', 1, 0], ['fanta', 1, 0], ['sprite', 1, 1], ['limo', 1, 1], ['limonade', 0, 1], ['eistee', 1, 0], ['ice tea', 1, 1], ['iced tea', 1, 1],
  ['softdrink', 1, 0], ['soft drink', 1, 0], ['energy drink', 1, 0], ['energydrink', 1, 0], ['red bull', 1, 1], ['monster energy', 1, 1], ['refresco', 1, 0],
  ['saft', 0, 1], ['juice', 1, 1], ['zumo', 1, 1], ['nektar', 0, 1], ['nectar', 1, 1], ['smoothie', 1, 0],
  ['bier', 1, 1], ['beer', 1, 1], ['cerveza', 1, 0], ['wein', 1, 1], ['wine', 1, 1], ['vino', 1, 1], ['vodka', 1, 0], ['wodka', 1, 0], ['schnaps', 1, 0], ['likör', 0, 1], ['rum', 1, 1], ['sekt', 1, 1],
  // sugar and sweets
  ['zucker', 1, 1], ['sugar', 1, 1], ['azucar', 1, 1], ['azúcar', 1, 1], ['traubenzucker', 1, 0], ['puderzucker', 1, 0],
  ['süßigkeit', 1, 0], ['suessigkeit', 1, 0], ['süssigkeit', 1, 0], ['candy', 1, 0], ['sweets', 1, 1], ['caramelo', 1, 0], ['golosina', 1, 0], ['dulces', 1, 1],
  ['bonbon', 1, 0], ['lolli', 1, 0], ['lollipop', 1, 0], ['gummibär', 1, 0], ['gummibaer', 1, 0], ['weingummi', 1, 0], ['fruchtgummi', 1, 0], ['haribo', 1, 0], ['gummy bear', 1, 0],
  ['nutella', 1, 0], ['schokoriegel', 1, 0], ['chocolate bar', 1, 0], ['milchschokolade', 1, 0], ['milk chocolate', 1, 1], ['snickers', 1, 0], ['mars', 1, 1], ['twix', 1, 0], ['kitkat', 1, 0], ['kit kat', 1, 0], ['milchschnitte', 1, 0], ['kinder', 1, 1],
  ['honig', 1, 1], ['honey', 1, 1], ['miel', 1, 1], ['marmelade', 1, 0], ['konfitüre', 1, 0], ['jam', 1, 1], ['mermelada', 1, 0], ['sirup', 0, 1], ['syrup', 1, 1], ['sirope', 1, 0],
  ['eiscreme', 1, 0], ['speiseeis', 1, 0], ['ice cream', 1, 1], ['helado', 1, 0],
  ['kuchen', 0, 1], ['torte', 0, 1], ['cake', 1, 1], ['cupcake', 1, 0], ['tarta', 1, 1], ['pastel', 1, 1], ['keks', 1, 0], ['kekse', 0, 1], ['cookie', 1, 0], ['galleta', 1, 0], ['waffel', 1, 0], ['waffle', 1, 0],
  ['donut', 1, 0], ['doughnut', 1, 0], ['berliner', 1, 1], ['croissant', 1, 0], ['muffin', 1, 0], ['brownie', 1, 0], ['churro', 1, 0], ['pudding', 1, 1],
  // white flour, potatoes, fast food
  ['toast', 1, 0], ['toastbrot', 1, 0], ['weißbrot', 1, 0], ['weissbrot', 1, 0], ['white bread', 1, 0], ['pan blanco', 1, 0], ['pan de molde', 1, 0], ['brötchen', 0, 1], ['broetchen', 0, 1], ['baguette', 1, 0], ['brezel', 1, 0], ['pretzel', 1, 0], ['bagel', 1, 0],
  ['cornflakes', 1, 0], ['frosties', 1, 0], ['choco pops', 1, 0], ['cereal', 1, 0],
  ['chips', 0, 1], ['crisps', 1, 1], ['patatas fritas', 1, 0], ['pommes', 1, 0], ['french fries', 1, 0], ['fries', 1, 1], ['pizza', 1, 0], ['burger', 1, 0], ['hamburguesa', 1, 0], ['hot dog', 1, 1], ['nachos', 1, 0], ['popcorn', 1, 0], ['palomitas', 1, 0],
  // high-sugar fruit the app refuses
  ['banane', 1, 0], ['bananen', 1, 0], ['banana', 1, 0], ['platano', 1, 0], ['plátano', 1, 0], ['weintraube', 1, 0], ['trauben', 0, 1], ['grapes', 1, 1], ['uvas', 1, 1], ['datteln', 1, 0], ['dates', 1, 1], ['dátiles', 1, 0], ['rosinen', 1, 0], ['raisins', 1, 0], ['pasas', 1, 1]
];
/* phrases taken out before matching: sugar snap peas, sugar free, etc. */
const EXCEPT = ['zuckerschote', 'zuckerschoten', 'zuckererbse', 'zuckererbsen', 'zuckerhut', 'zuckerfrei', 'ohne zucker', 'ohne zuckerzusatz', 'sugar free', 'sugar-free', 'no sugar', 'no added sugar', 'sugar snap', 'sin azúcar', 'sin azucar', 'sin azúcares', 'rum steak', 'without sugar', 'less sugar', 'weniger zucker', 'menos az\u00facar', 'menos azucar'];
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ -]?');
const JS_RE = TERMS.map(([t, s, e]) => (s ? '(?<![\\p{L}\\p{N}])' : '') + escRe(t) + (e ? '(?![\\p{L}\\p{N}])' : '')).join('|');
const SQL_RE = TERMS.map(([t, s, e]) => (s ? '\\m' : '') + escRe(t) + (e ? '\\M' : '')).join('|');
const EXCEPT_RE = EXCEPT.map(escRe).join('|');
const jsDeny = new RegExp(JS_RE, 'iu'), jsExcept = new RegExp(EXCEPT_RE, 'giu');
function refused(name) { const n = String(name || '').toLowerCase().replace(jsExcept, ' '); return jsDeny.test(n); }
module.exports = { TERMS, EXCEPT, JS_RE, SQL_RE, EXCEPT_RE, refused };
