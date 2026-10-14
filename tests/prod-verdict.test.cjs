// Regression: a caught product picked in Cook > Produkte (shuffle or the "Dein Treffer" sheet) must show
// the same LOWiSPIKE spike verdict as a barcode scan (reveal animation, herb, meter, reasons), not the
// Swaflo "Label unverified" card that led to the evidence-only "Tier pending" page.
// Missing label facts are filled from Open Food Facts by exact barcode only, never guessed.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function fnBody(src, sig) {
  const i = src.indexOf(sig);
  assert.ok(i >= 0, 'missing ' + sig);
  let depth = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (!depth) return src.slice(i, k + 1); }
  }
  throw new Error('unterminated ' + sig);
}

// Cook: product picks use the verdict card, never the Swaflo evidence card
const rev = fnBody(html, 'function fRevealHTML(f, anim){');
assert.ok(/if \(f\.buy && window\.LowiDex && LowiDex\.enrich\) return fProdCardHTML\(f, anim\);/.test(rev), 'product picks must render fProdCardHTML first');
const card = fnBody(html, 'function fProdCardHTML(f, anim){');
assert.ok(/data-r5="pverdict"/.test(card), 'product pick opens the verdict card');
assert.ok(!/data-sf="product"/.test(card) && !/openProduct/.test(card), 'product pick must not open the evidence guide');
assert.ok(/b3-vb v-/.test(card), 'product pick shows the verdict badge');
assert.ok(!/r5-card ck-pv' \+ \(anim/.test(card), 'no "in" class: it would pop the plain Your pick sheet on phones');
const pv = fnBody(html, 'function fProdVerdict(f, open){');
assert.ok(/LowiDex\.enrich\(f\.product\)/.test(pv) && /LowiDex\.reveal\(q\)/.test(pv), 'enrich then reveal');
assert.ok(/case "pverdict":/.test(html), 'pverdict click handler');
assert.ok(/if \(pk\) pk\.innerHTML = fRevealHTML\(f, true\); if \(f\.buy && window\.LowiDex\) fProdVerdict\(f, true\);/.test(html), 'shuffle landing opens the verdict');

// B3: enrichment fills only missing fields from Open Food Facts by barcode
const en = fnBody(html, 'function enrich(p){');
assert.ok(/validCode\(q\.barcode\)/.test(en), 'barcode only');
assert.ok(/offProduct\(code\)/.test(en), 'uses Open Food Facts');
assert.ok(/q\.facts\[k\] == null && o\.facts\[k\] != null/.test(en), 'never overwrites known facts');
assert.ok(!/search_terms|search\.pl/.test(en), 'no fuzzy name search');
assert.ok(/fillNoteHTML\(p\)/.test(fnBody(html, 'function cardHTML(p, anim){')), 'verdict card says what was filled or is missing');
assert.ok(/enrich, showProduct/.test(html), 'exported on LowiDex');
console.log('prod-verdict ok');
