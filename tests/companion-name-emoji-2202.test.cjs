'use strict';
/* Code error sweep Oct 24 22:02: the 20:02 fix kept an emoji in the companion's name on Misty's card only. Everywhere else the
   name shows (Home bubble, today line 'Lumi ✨ is a bit sleepy', journey bar, Ranking, the 'Now called' toast, her world
   title) spirit.js symbols() still swapped the ✨ for an outline icon. This runs the real symbols() from spirit.js on a tiny
   fake DOM: the companion's own name keeps its emoji wherever it is, other emoji in the same line still become icons, and
   names in the Ranking (.rk-cn, chosen by each user) are left alone. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'spirit.js'), 'utf8');

function load(name) {
  const a = src.indexOf('    const emoji = '), b = src.indexOf('    function attachPick()');
  assert.ok(a > 0 && b > a, 'emoji regex .. symbols() found in spirit.js');
  const block = src.slice(a, b);
  const replaced = [];
  const mk = (data, sel) => {
    const parent = { closest: s => (sel && s.split(',').map(x => x.trim()).includes(sel)) ? parent : null };
    const n = { data, parentElement: parent, replaceWith: f => replaced.push({ data, html: f.innerHTML }) };
    return n;
  };
  const ctx = {
    window: { LowiIcons: { fromEmoji: s => '<svg data-e="' + s + '"></svg>' }, LowiLang: { t: k => k }, LowiBirthCompanion: { displayName: () => name } },
    D: { createTreeWalker: root => { let i = -1; return { nextNode() { i++; this.currentNode = root.kids[i]; return i < root.kids.length; }, currentNode: null }; }, createElement: () => ({ className: '', innerHTML: '' }) },
    NodeFilter: { SHOW_TEXT: 4 },
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'),
    icon: k => '<svg data-k="' + k + '"></svg>'
  };
  ctx.LowiIcons = ctx.window.LowiIcons; ctx.LowiLang = ctx.window.LowiLang;
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.symbols = symbols;', ctx);
  return { run: kids => { replaced.length = 0; ctx.symbols({ isConnected: true, kids }); return replaced.slice(); }, mk };
}

test("the companion's own name keeps its emoji in any UI line, not only on Misty's card", () => {
  const { run, mk } = load('Lumi \u2728');
  const out = run([mk('Lumi \u2728'), mk('Lumi \u2728 is a bit sleepy'), mk('Next journey: Lumi \u2728 needs energy'), mk('Now called Lumi \u2728')]);
  assert.strictEqual(out.length, 0, 'no line that only has the name\'s emoji is rewritten: ' + JSON.stringify(out));
});

test('other emoji next to the name still become icons, the name stays as typed', () => {
  const { run, mk } = load('Lumi \u2728');
  const out = run([mk('\u{1F4A7} Lumi \u2728 wants water')]);
  assert.strictEqual(out.length, 1);
  assert.match(out[0].html, /data-e="\u{1F4A7}"/u, 'the water drop is an icon');
  assert.ok(out[0].html.includes('Lumi \u2728'), 'the name keeps its sparkle: ' + out[0].html);
  assert.ok(!out[0].html.includes('data-e="\u2728"'), 'the sparkle is not an icon');
});

test('a name without an emoji changes nothing: UI emoji still become icons', () => {
  const { run, mk } = load('Lumi');
  const out = run([mk('Lumi \u2728 star')]);
  assert.strictEqual(out.length, 1);
  assert.match(out[0].html, /data-e="\u2728"/u);
});

test('companion names in the Ranking (.rk-cn) are left as each user typed them', () => {
  const { run, mk } = load('Misty');
  assert.strictEqual(run([mk('Bobo \u{1F496}', '.rk-cn')]).length, 0);
});
