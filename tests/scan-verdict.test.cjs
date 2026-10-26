// Regression: a barcode scan must show the LOWiSPIKE likely-spike estimate (red / yellow / green),
// the herb's reaction and Ate it / Skip, not the evidence-only "Tier pending" field-guide screen.
// Root cause (b70d05a): rate(), rateName(), cardHTML() and reveal() were all short-circuited to
// LowiDiscovery whenever discovery.js was loaded, so every scan ended on the label-evidence page.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const spirit = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');

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

const rate = fnBody(html, 'function rate(p){');
assert.ok(!/LowiDiscovery/.test(rate), 'rate() must use the LOWiSPIKE rules, not the discovery assessment');
assert.ok(/verdict:\s*v/.test(rate) || /verdict/.test(rate), 'rate() returns a verdict');

const rateName = fnBody(html, 'function rateName(name){');
assert.ok(!/LowiDiscovery/.test(rateName), 'rateName() must not be disabled by discovery');

const reveal = fnBody(html, 'function reveal(p, quiet){');
assert.ok(!/LowiDiscovery\.openProduct/.test(reveal), 'reveal() must show the verdict card, not jump to the field guide');
// Oct 16: the owner found the stacked card overwhelming; reveal() now renders the simple spike card (tests/spike-catch.test.cjs)
assert.ok(/simpleCardHTML\(p\)/.test(reveal), 'reveal() renders the simple spike card');
assert.ok(/b3-stage sc-stage show/.test(reveal), 'reveal() shows the card straight away');
assert.ok(/fillHerb\(REV\)/.test(reveal), 'reveal() gives the herb a visible reaction');

const card = fnBody(html, 'function cardHTML(p, anim){');
assert.ok(!/LowiDiscovery\.productHTML/.test(card), 'cardHTML() must not be replaced by the discovery page');
assert.ok(/b3-vb v-/.test(card), 'card shows the colour-coded verdict');
assert.ok(/herbHTML\(v\)\s*\+\s*eatHTML\(p\)/.test(card), 'herb reaction and Ate it / Skip sit right under the verdict');
assert.ok(/r\[0\] === "pending" \? ""/.test(card), 'no "Tier pending" badge on the scan card');
assert.ok(/data-b3="label"/.test(fnBody(html, 'function simpleCardHTML(p){')), 'label evidence stays reachable as a secondary link (in Details)');
assert.ok(/case "label": if \(CUR && window\.LowiDiscovery\) LowiDiscovery\.openProduct\(CUR\)/.test(html), 'label link opens the field guide');

const eat = fnBody(html, 'function eatCur(btn, prod){');
assert.ok(/LowiVitalsBridge\.logMeal\(/.test(eat), 'Ate it logs through the single meal ledger');
assert.ok(!/award\(/.test(eat), 'Ate it does not award XP a second time (logMeal awards it once)');
assert.ok(!/verdict\s*===\s*"ok"\s*\?/.test(eat), 'logging earns XP whatever the spike estimate');
assert.ok(/case "eat": eatCur\(b\)/.test(html) && /case "skip":/.test(html), 'Ate it / Skip are wired');
assert.ok(/rev\.querySelectorAll\("\.b3-eat"\)\.forEach\(x => x\.remove\(\)\)/.test(html), 'meal-check flow keeps a single Ate it bar');
assert.ok(/cur:\(\) => CUR \|\| \(window\.LowiDiscovery/.test(html), 'LowiDex.cur() returns the scanned product');

// Herb reaction follows the same estimate the card shows
const cap = fnBody(spirit, 'async function captureProduct(p) {');
assert.ok(!/LowiDiscovery\.assess/.test(cap), 'herb reaction must not depend on the discovery category');
assert.ok(/scanVerdict\(p, LowiDex\.rate, window\.LowiSpikeCore\)/.test(cap) && /scanSpike/.test(cap), 'herb reacts to the likely-spike estimate made stricter by the Food check (scanfe-h5)');

// Snap and upload
assert.ok(/flight\(photoURL\)\.then\(\(\) => photoSheet\(\)\)/.test(spirit), 'Snap opens the photo sheet');
assert.ok(/class="sp-file-in"/.test(spirit) && /classList\.contains\('sp-file-in'\)/.test(spirit), 'upload uses a native file input');
assert.ok(/a === 'savePhoto'\) savePhoto\(\)/.test(spirit), 'photo can be saved');
const sheet = fnBody(spirit, 'function photoSheet() {');
assert.ok(/gptHTML\(\)/.test(sheet) && /sp-photo-prev/.test(sheet), 'photo sheet shows the photo and the custom GPT link');

// Fast close of the herb world
assert.ok(/world\.animate\(\[\{ transform: 'scale\(1\)', opacity: 1 \}/.test(spirit), 'world closes with a compositor animation');
assert.ok(/classList\.remove\('herb-room', 'sp-open', 'sp-capturing'\);\s*try \{\s*ensure\(\);/.test(spirit), 'Home is shown underneath at the start of the close');

console.log('scan-verdict regression: ok');
