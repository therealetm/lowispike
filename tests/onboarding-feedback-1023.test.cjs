'use strict';
/* Oct 23 2026, Emmanuel tested setup up to the end of sign-up:
   1. "Was willst du am meisten?" didn't fit a screen about him (gender, goals, conditions) -> "About you" + why we ask.
   2. The shopping step's text about scanning and glowing worlds confused a first-time user -> one plain line in setup;
      the glow rule stays in the Profile editor.
   3. Companion names sounded like diseases or medications -> friendly pool + "Type my own" on the reveal. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('setup step about the person is titled About you, with a short why, in en/de/es', () => {
  const h = read('index.html');
  assert.match(h, /'<div class="r2-obt">About you<\/div><div class="r2-obs">So your tips fit you\. Change it any time in Profile\.<\/div>'/);
  assert.ok(!/r2-obt">What do you want most\?/.test(h), 'old title gone from the step');
  assert.ok(h.includes('["So your tips fit you. Change it any time in Profile.", "Damit deine Tipps zu dir passen. Ändern kannst du alles im Profil.", "Así tus consejos se adaptan a ti. Puedes cambiarlo en Perfil."]'));
  assert.ok(h.includes('["About you", "Über dich", "Sobre ti"]'));
});

function shopForm(lang, opts) {
  const store = { 'lowispike.lang': lang };
  const win = { localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); } }, LowiGroceryCore: {}, addEventListener() {}, dispatchEvent() {} };
  const doc = { documentElement: { lang }, addEventListener() {}, readyState: 'complete', querySelector: () => null, querySelectorAll: () => [], getElementById: () => null };
  const vm = require('vm');
  const ctx = vm.createContext(Object.assign({ window: win, document: doc, console, CustomEvent: function () {}, setTimeout, clearTimeout, requestAnimationFrame: f => 0 }, {}));
  ctx.window.window = ctx.window;
  vm.runInContext(read('shop-plan-core.js'), ctx);
  ctx.window.LowiShopPlanCore = ctx.window.LowiShopPlanCore || ctx.LowiShopPlanCore;
  vm.runInContext('var LowiShopPlanCore = window.LowiShopPlanCore;', ctx);
  vm.runInContext(read('shop-plan.js'), ctx);
  return ctx.window.LowiShopPlan.formHTML(null, opts);
}

test('shopping step in setup: one plain line, no worlds or scanning; the Profile editor still explains the glow', () => {
  const words = { en: /world|scan|glow/i, de: /Welt|scann|leucht/i, es: /mundo|escane|brill/i };
  for (const l of ['en', 'de', 'es']) {
    let setup, editor;
    try { setup = shopForm(l, { prefix: 'r2obSp', first: true }); editor = shopForm(l, { prefix: 'splEd' }); }
    catch (e) { throw e; } /* the setup and editor forms, rendered for real */
    assert.ok(setup.includes('spl-first'), l + ': setup line');
    assert.ok(!setup.includes('spl-does'), l + ': no glow rule in setup');
    const line = /<p class="spl-note spl-first">([^<]*)<\/p>/.exec(setup)[1];
    assert.ok(!words[l].test(line), l + ': ' + line);
    assert.ok(line.length < 140, l + ': short');
    assert.ok(editor.includes('spl-does') && !editor.includes('spl-first'), l + ': editor keeps the explanation');
  }
  const js = read('shop-plan.js');
  assert.strictEqual((js.match(/first: '/g) || []).length, 3, 'first line in en, de, es');
});

test('companion reveal: New name + Type my own; a typed name is checked and saved with Continue', () => {
  const js = read('companion-birth.js');
  for (const k of ["own:'Type my own'", "own:'Selbst benennen'", "own:'Ponerle nombre'", "ownBad:'"]) assert.ok(js.includes(k), k);
  assert.match(js, /data-lc="own"/);
  assert.match(js, /class="lc-in" type="text" maxlength="24"/);
  assert.match(js, /C\.renameCheck\(inp\.value\)/);
  assert.match(js, /c=C\.generate\(\{bday:c\.bday,btime:c\.btime,n:c\.n,name:chk\.name\}\)/);
  const css = read('companion-birth.css');
  assert.match(css, /\.lc-own:not\(\[hidden\]\)/);
});
