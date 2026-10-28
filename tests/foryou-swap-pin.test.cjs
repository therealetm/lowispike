// 28 Oct 2026 (Emmanuel, call + screenshot): "Why does it say Konjak Nudeln? What does Konjak Nudeln have to do with this?"
// and "Why did Tausch des Tages stop?". Two fixes, both in the pure cores:
//  1. The every-other-day Gold Rush product inside the Tausch des Tages slide shows its own heading
//     ("Goldrausch" + "Im Regal entdeckt") and its source line. inspo-core card() never filled label.gold / goldSub /
//     goldSrc, which foryou.js slideHTML reads, so a bare star sat above the noodles and they looked like part of the swap.
//  2. Today's Tausch des Tages stays at the top of For You (foryou-core merge). Older swaps keep their place by date.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const F = require('../foryou-core.js');
const I = require('../inspo-core.js');

const html = read('index.html');
const BOOK = (() => {
  const a = html.indexOf('const RECIPE_BOOK = ['), b = html.indexOf('\n];', a);
  const scope = new Proxy({}, { has: (t, k) => k !== 'Array' && k !== 'Object' && k !== 'String' && k !== 'JSON', get: () => '' });
  const list = new Function('scope', 'with (scope) { return ' + html.slice(a + 'const RECIPE_BOOK = '.length, b + 2) + '; }')(scope);
  list.forEach(r => { r.id = I.bookId(r.n); });
  return list;
})();
const ctx = { recipe: id => BOOK.find(r => r.id === id) || null };
const at = (y, m, d, h, mi) => new Date(y, m - 1, d, h, mi || 0, 0, 0).getTime();

/* foryou.js (browser glue) in a tiny window, to render the real slide */
function glue(lang) {
  const win = { LowiForYouCore: F, LowiInspoCore: I, document: { documentElement: { lang } } };
  win.window = win;
  vm.runInNewContext(read('foryou.js'), win);
  return win.LowiForYou;
}
const text = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

test('the Gold Rush product in Tausch des Tages has its own heading, subtitle and source line in every language', () => {
  const want = {
    en: ['Gold Rush', 'Spotted on the shelf', 'Label values from Open Food Facts'],
    de: ['Goldrausch', 'Im Regal entdeckt', 'Werte vom Etikett laut Open Food Facts'],
    es: ['Fiebre del oro', 'Visto en la estantería', 'Valores de la etiqueta según Open Food Facts']
  };
  let goldDays = 0;
  for (const l of I.LANGS) {
    const FY = glue(l);
    for (let d = 0; d < 30; d++) {
      const now = at(2026, 10, 1 + d, 12);
      const c = I.card({ now, lang: l });
      const s = FY.slideHTML(I.post(c), {});
      if (!c.gold) { assert.doesNotMatch(s, /fyb-gold/, 'no product section on a swap-only day'); continue; }
      goldDays++;
      assert.equal(c.label.gold, want[l][0]);
      assert.equal(c.label.goldSub, want[l][1]);
      assert.ok(c.label.goldSrc.startsWith(want[l][2]));
      const sec = s.slice(s.indexOf('<section class="fyb-gold">'));
      const head = sec.slice(0, sec.indexOf('</p>'));
      assert.doesNotMatch(head, /<small><\/small>/, 'the subtitle is never empty');
      assert.equal(text(head), '\u2605 ' + want[l][0] + ' ' + want[l][1], 'heading before the product (' + l + ' ' + c.day + ')');
      assert.ok(sec.indexOf(want[l][0]) < sec.indexOf(c.gold.name.replace(/&/g, '&amp;')), 'heading comes before the product name');
      assert.match(sec, /<p class="fyb-src">[^<]+<\/p>/, 'the source line is filled');
      assert.doesNotMatch(s, />undefined</);
    }
  }
  assert.ok(goldDays >= 40, 'about every other day carries a product');
});

test('his 28 Oct screenshot: Eis am Stiel swap, then Vitasia Konjak Nudeln under its own Goldrausch heading', () => {
  const c = I.card({ now: at(2026, 10, 28, 15, 50), lang: 'de' });
  assert.ok(c.gold, '28 Oct carries a product');
  assert.match(c.gold.name, /Konjak/i);
  const s = text(glue('de').slideHTML(I.post(c), {}));
  const iSwap = s.indexOf('Tausch des Tages'), iHead = s.indexOf('Goldrausch Im Regal entdeckt'), iProd = s.indexOf(c.gold.name);
  assert.ok(iSwap >= 0 && iHead > iSwap && iProd > iHead, s);
});

test('today\'s Tausch des Tages stays at the top of For You; older swaps keep their date order and nothing is doubled', () => {
  const now = at(2026, 10, 28, 19, 10);
  const bot = I.feed({ now, lang: 'de' });
  const today = bot[0];
  const member = [
    { id: 'm-dinner', uid: 'real-member', cloud: true, cap: 'Abendessen', ts: at(2026, 10, 28, 18, 45) },
    { id: 'm-lunch', uid: 'real-member', cloud: true, cap: 'Mittag', ts: at(2026, 10, 28, 12, 30) },
    { id: 'm-old', uid: 'real-member', cloud: true, cap: 'Gestern', ts: at(2026, 10, 27, 20, 0) },
    Object.assign({}, today) /* the same id coming back from another list never shows twice */
  ];
  const out = F.merge(member, bot, ctx);
  assert.equal(out[0].id, today.id, 'today\'s swap first, even though it is dated 08:00');
  assert.equal(out.filter(p => p.id === today.id).length, 1);
  assert.deepEqual(out.slice(1, 3).map(p => p.id), ['m-dinner', 'm-lunch']);
  const rest = out.slice(1);
  for (let k = 1; k < rest.length; k++) assert.ok(rest[k - 1].ts >= rest[k].ts, 'the rest stays newest first');
  const yesterday = bot[1];
  assert.ok(out.indexOf(yesterday) > out.findIndex(p => p.id === 'm-old'), 'yesterday\'s swap is not pinned');
  /* before 07:00 the current card is still yesterday's: that one is on top, not a new one */
  const early = I.feed({ now: at(2026, 10, 29, 6, 30), lang: 'de' });
  assert.equal(early[0].id, 'inspo-2026-10-28');
  assert.equal(F.merge([{ id: 'n', uid: 'u', cloud: true, ts: at(2026, 10, 29, 6, 0) }], early, ctx)[0].id, 'inspo-2026-10-28');
  /* no bot list: plain newest first, as before */
  assert.deepEqual(F.merge(member.slice(0, 3), [], ctx).map(p => p.id), ['m-dinner', 'm-lunch', 'm-old']);
  /* the user hid today's card: index.html feed() filters it after merge, so nothing else is pulled up */
  assert.match(read('index.html'), /LowiForYou\.feed\(all\)\.filter\(p => !T\.hidden\.includes\(p\.id\)\)/);
});
