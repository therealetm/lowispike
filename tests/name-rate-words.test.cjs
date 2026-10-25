// Bug hunt Oct 24 13:02 (Scan by name / spike rating): the typed-name word table (NAMES in index.html) fired inside other words
// and differed by language. "Pan-fried salmon" was rated a spike as bread, "dark chocolate" got the drink reason (cho-COLA-te),
// "jamón" got the jam reason, "Marzipan" the flour reason; "Süßkartoffel" was stricter than "sweet potato", a Spanish protein bar
// was friendlier than the English and German one, and "espaguetis", "palomitas", "cruasán" got no verdict at all.
// Runs the real NAMES table + rateName() from index.html, without the Master Knowledge layer (that one can only make it stricter).
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function grab(start, endMark) {
  const i = html.indexOf(start); assert.ok(i >= 0, 'missing ' + start);
  const j = html.indexOf(endMark, i); assert.ok(j > i, 'unterminated ' + start);
  return html.slice(i, j + endMark.length);
}
function fnBody(sig) {
  const i = html.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let depth = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') depth++; else if (html[k] === '}') { depth--; if (!depth) return html.slice(i, k + 1); }
  }
  throw new Error('unterminated ' + sig);
}
const nkeyLine = html.match(/const nkey = s => [^\n]+/)[0];
const names = grab('const NAMES = [', '\n];');
const rateNameSrc = fnBody('function rateName(name){');
const rateName = new Function('window', nkeyLine + '\n' + names + '\n' + rateNameSrc + '\nreturn rateName;')({});
const why = q => { const r = rateName(q); return r ? r.why[0][0] : null; };

/* words inside other words */
assert.notStrictEqual(why('pan-fried salmon'), 'n_flour', 'pan-fried salmon is not bread');
assert.notStrictEqual(why('Pan fried chicken'), 'n_flour', 'pan fried chicken is not bread');
assert.strictEqual(why('pan-fried salmon'), 'n_ok');
assert.notStrictEqual(why('Japanese curry'), 'n_flour', 'japan is not pan');
assert.strictEqual(why('pan integral'), 'n_flour', 'Spanish bread stays bread');
assert.strictEqual(why('pan'), 'n_flour');
assert.strictEqual(why('Pan de molde'), 'n_flour');
assert.strictEqual(why('dark chocolate 85%'), 'n_sugar', 'chocolate gets the sugar reason, not the drink one');
assert.strictEqual(why('chocolate negro 85%'), 'n_sugar');
assert.strictEqual(why('Coca-Cola'), 'n_drink');
assert.strictEqual(why('Cola'), 'n_drink');
assert.strictEqual(why('Kirschcola'), 'n_drink');
assert.notStrictEqual(why('jamón cocido'), 'n_sugar', 'ham is not jam');
assert.strictEqual(why('strawberry jam'), 'n_sugar');
assert.strictEqual(why('Marzipan'), 'n_sugar', 'marzipan is sugar, not flour');
assert.strictEqual(why('mazapán'), 'n_sugar');
/* same food, same verdict in EN / DE / ES */
assert.notStrictEqual(why('Süßkartoffel'), 'n_potato', 'sweet potato is not potato');
assert.notStrictEqual(why('Suesskartoffel'), 'n_potato');
assert.strictEqual(why('Kartoffel'), 'n_potato', 'plain potato stays a spike');
assert.strictEqual(why('Kartoffelchips'), 'n_potato');
assert.strictEqual(why('Süßkartoffel-Chips'), 'n_potato', 'chips stay chips');
for (const q of ['protein bar', 'Proteinriegel', 'barrita de proteína', 'barrita proteica']) assert.strictEqual(why(q), 'n_sweet', q);
for (const q of ['spaghetti', 'Spaghetti', 'espaguetis', 'macarrones']) assert.strictEqual(why(q), 'n_flour', q);
for (const q of ['popcorn', 'Popcorn', 'palomitas']) assert.strictEqual(why(q), 'n_corn', q);
for (const q of ['croissant', 'Croissant', 'cruasán']) assert.strictEqual(why(q), 'n_sugar', q);
/* Oct 25 bug hunt: Spanish "limón" fired the German "Limo" drink word (spike), "tortilla francesa" (omelette) the corn tortilla;
   common Spanish names had no verdict where EN/DE had one */
for (const q of ['limón', 'limon', 'Limones', 'lima limón']) assert.notStrictEqual(why(q), 'n_drink', q + ' is a lemon, not a drink');
for (const q of ['Limo', 'Zitronenlimo', 'Limonade', 'limonada', 'zumo de limón', 'Coca-Cola']) assert.strictEqual(why(q), 'n_drink', q);
assert.strictEqual(why('tortilla francesa'), 'n_ok', 'a plain omelette is not a corn tortilla');
for (const q of ['tortilla', 'Tortilla chips', 'tortillas de maíz']) assert.ok(['n_corn', 'n_potato'].includes(why(q)), q);
assert.strictEqual(why('tortilla de patatas'), 'n_potato');
for (const q of ['bebida energética', 'batido', 'batido de frutas']) assert.strictEqual(why(q), 'n_drink', q);
assert.notStrictEqual(why('batido de proteína'), 'n_drink', 'protein shake is not read as a sugary drink in only one language');
for (const q of ['lasaña', 'lasagna', 'Lasagne', 'ñoquis']) assert.strictEqual(why(q), 'n_flour', q);
assert.strictEqual(why('natillas'), 'n_sugar');
for (const q of ['mayonesa', 'mostaza', 'frutos secos', 'coco']) assert.strictEqual(why(q), 'n_ok', q);
assert.notStrictEqual(why('chocolate'), 'n_ok', 'coco only as a whole word');
/* the policy layer (Master Knowledge classify) must not read pan-fried as bread either */
const P = require(path.join(__dirname, '..', 'food-policy-core.js'));
const cats = q => Object.keys(P.classify({ name: q }) || {});
assert.ok(!cats('pan-fried salmon').includes('starch_bread'), 'policy: pan-fried salmon is not bread');
assert.ok(!cats('Pan seared chicken breast').includes('starch_bread'), 'policy: pan seared chicken is not bread');
assert.ok(cats('pan integral').includes('starch_bread'), 'policy: pan integral stays bread');
assert.ok(cats('pan-fried bread').includes('starch_bread'), 'policy: pan-fried bread stays bread');
/* Oct 25: the policy layer must not read a Spanish omelette as a wrap either; a plain tortilla stays bread */
assert.ok(!cats('tortilla francesa').includes('starch_bread'), 'policy: tortilla francesa is an omelette');
assert.ok(cats('Tortilla wrap').includes('starch_bread'), 'policy: a tortilla wrap stays bread');
console.log('name-rate-words: ok');
