// Oct 17 (E-man): one coherent Misty look for every popup, and tips are only "read" after a deliberate tap, never while Misty flies.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = src('misty-pop.css'), html = src('index.html'), sw = src('sw.js'), shop = src('herb-shop.js'), ritual = src('daily-ritual.js');

test('misty-pop.css loads at the end, versioned like everything else, and cached by the service worker', () => {
  const i = html.indexOf('id="mpopCss"');
  assert.ok(i > 0, 'linked');
  assert.ok(i > html.indexOf('id="scrCss"') && html.indexOf('id="gnCss"') > i, 'in the closing block, after the screen styles (glass-nav + cook-shop keep the last two slots; neither styles a popup)');
  const b = (html.match(/<meta name="lowi-build" content="([^"]+)"/) || [])[1];
  assert.ok(html.includes('misty-pop.css?v=' + b), 'same build as the page');
  assert.ok(/const STATIC = \[[^\]]*"misty-pop\.css"/.test(sw), 'offline cache');
});

test('every popup surface wears the same Misty membrane', () => {
  for (const sel of ['#toast', '#r2gate .a1-toast', '#n1B', '.hs-giftpop', '.lp-praise', '.xtp-banner', '#lcUpd.lc-upd', '#lcUpdOk', '.fst-rwc']) {
    assert.ok(css.includes('html body ' + sel + ',') || css.includes('html body ' + sel + ' {'), sel);
  }
  /* Misty's real colours (living-bubbles): blue core, violet rim, cyan edge */
  assert.ok(/155, 135, 210/.test(css) && /143, 231, 255/.test(css) && /58, 159, 224/.test(css));
  assert.ok(/\.fst-medal \{[\s\S]*var\(--mp-rim\)/.test(css), 'the Fast done medal is a small Misty bubble');
});

test('paint only: no layout, no positions, no endless animation, contrast and reduced settings handled', () => {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/(^|[;{\s])(position|top|left|right|bottom|width|height|display|margin)\s*:/m.test(body), 'no layout properties');
  assert.ok(!/animation\s*:/.test(body) && !/@keyframes/.test(body), 'nothing runs on its own');
  assert.ok(/prefers-contrast: more/.test(css) && /prefers-reduced-transparency/.test(css) && /prefers-reduced-motion/.test(css));
  assert.ok(/min-height: 44px/.test(css), '44 px buttons');
});

test('bubble reminders: shown is not read; only the deliberate tap marks one, and none while Misty flies', () => {
  assert.ok(/if \(!opts\.force\) \{ shownAt\(now\); n\.ack = true; \} show\(n\);/.test(html), 'showing records only the time');
  assert.ok(!/if \(!opts\.force\) mark\(n\.id, now\)/.test(html), 'no marking on show');
  assert.ok(/k === "go"\) \{ hide\(\); sfx\("tap"\); if \(c && c\.ack\) mark\(c\.id\);/.test(html), 'action marks it');
  assert.ok(/if \(k === "x" && c && c\.ack\) mark\(c\.id\);/.test(html), 'OK marks it, Later does not');
  assert.ok(/RETRY_MIN \* 6e4/.test(html), 'an unread one waits before it comes back');
  assert.ok(/function appFree\(\)\{\n  if \(H\.classList\.contains\("mf-on"\)\) return false;/.test(html), 'quiet while flying');
  assert.ok(/MutationObserver\(\(\) => \{ if \(H\.classList\.contains\("mf-on"\) && cur && !cur\.stay/.test(html), 'fades unread when she takes off');
});

test('Misty\'s gift of the day: taken only with Nice or Support, never on open, and hidden while she flies', () => {
  const open = shop.slice(shop.indexOf('function openGift'), shop.indexOf('D.addEventListener(\'click\''));
  assert.ok(!/localStorage\.setItem\(GKEY/.test(open), 'opening does not take it');
  assert.ok(/a==='giftok'\)\{[^}]*giftAck\(\)/.test(shop) && /a==='giftkofi'\)\{[^}]*giftAck\(\)/.test(shop));
  assert.ok(/flying\(\)&&!giftTaken\(\)\)\{if\(G\.pop\)/.test(shop), 'no gift spot or card while flying');
  assert.ok(shop.includes("Misty\\'s gift of the day") && shop.includes('Mistys Geschenk des Tages') && shop.includes('El regalo del día de Misty'));
  assert.ok(shop.includes("open('plus')"), 'Ko-fi support unchanged');
});

test('the daily card waits, unseen, while Misty flies', () => {
  assert.ok(/busy\(\) \|\| D\.documentElement\.classList\.contains\('mf-on'\)\) \{ quiet = 0; return; \}/.test(ritual));
});

test('praise speaks as a cell now: no leaves or roots', () => {
  const p = src('praise.js');
  assert.ok(!/'[^'\n]*(leaves|roots|Blätter|Wurzeln|hojas|raíces)[^'\n]*'/.test(p), 'no herb words in any line Misty says');
});
