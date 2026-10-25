'use strict';
/* Oct 25 (Emmanuel, plantain chips): a product that is in no database must not ask for sugar / syrup / sweetener / starch ticks
   while the scanner can look at the pack. Online: "Photo of the pack" runs the same photo check as Snap food (LowiFoodAI) and the
   answer says it is a guess ("Looks like ...", ingredients not read). Offline the ticks stay. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a); assert.ok(i >= 0, 'missing ' + a); const j = html.indexOf(b, i + a.length); assert.ok(j > i, 'missing end ' + b); return html.slice(i, j); };

test('pack photo strings exist in English, German and Spanish and say it is a guess', () => {
  const NE = require(path.join(root, 'name-estimate-core.js'));
  const S = NE.STR || (global.LowiNameEstimate && global.LowiNameEstimate.STR);
  for (const l of ['en', 'de', 'es']) for (const k of ['snap', 'snapS', 'snapBusy', 'snapFail', 'photo', 'looks', 'exactH'])
    assert.ok(S[l][k] && S[l][k].length > 2, k + ' in ' + l);
  assert.match(S.en.photo, /ingredients not read/);
  assert.match(S.de.looks, /Sieht aus wie/);
});

test('Photo of the pack uses the Snap food photo check and marks the result as a photo estimate', async () => {
  const src = cut('async function snapPack(file){', '\ndocument.addEventListener("change"');
  assert.match(src, /LowiFoodAI\.analyse\(/, 'same photo check as Snap food');
  assert.match(src, /src:"photo"/);
  const shown = [];
  const live = { innerHTML: '' };
  const ctx = {
    NE_BUSY: false, REV: {}, CUR: { barcode: '786', name: '' }, $: () => live, esc: s => String(s), net: k => k, NEL: () => 'en', nameRate: x => x, sfx() {},
    FileReader: class { readAsDataURL() { this.result = 'data:x'; this.onload(); } },
    window: { LowiFoodAI: { analyse: async () => ({ isFood: true, dishes: [{ name: 'plantain chips', carbs: 60 }] }), title: d => d[0].name } },
    NE: () => ({ fromAI: (ai, o) => ({ verdict: 'spike', nameEst: { how: 'ai', hit: o.name } }) }),
    showNameResult: async p => { shown.push(p); }
  };
  ctx.LowiFoodAI = ctx.window.LowiFoodAI;
  vm.createContext(ctx); vm.runInContext('var NE_BUSY=false;' + src + ';this.snapPack=snapPack;', ctx);
  await ctx.snapPack({});
  assert.strictEqual(shown.length, 1);
  assert.strictEqual(shown[0].name, 'plantain chips');
  assert.strictEqual(shown[0].nameEst.src, 'photo');
  assert.strictEqual(shown[0].barcode, '786', 'the scanned barcode stays with the result');
});

test('a photo estimate is labelled as one on the verdict and the read row says Looks like', () => {
  assert.match(cut('function simpleCardHTML(p){', '\nfunction '), /p\.nameEst\.src === "photo" \? "photo" : "ai"/);
  assert.match(cut('function nameEstHTML(p){', '\nfunction '), /net\(e\.src === "photo" \? "looks" : "read"\)/);
});
