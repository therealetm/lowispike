/* 21 Oct 2026 (Eman: "we can't even see the writing"): Community header, menu, Creation and Affiliates must stay readable.
   Guards the two real causes: (1) a label coloured by a rule that loses to `#cmPaneChat[data-spirit-chat] button{color:inherit}`
   (white label on a white pill); (2) the Creation/Affiliates pages shown in a frame without color-scheme dark, which makes the
   browser paint an opaque white canvas under their see-through cards. Contrast is computed from the declared colours. */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); const p = m[1].split(',').map(Number); return { c: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
const over = (top, a, under) => top.map((v, i) => v * a + under[i] * (1 - a));
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const WHITE = [255, 255, 255], DARK = [3, 5, 10];
const css = read('community-rooms.css');
const varOf = n => { const m = css.match(new RegExp('--' + n + ':([^;]+);')); assert.ok(m, 'var ' + n); return m[1].trim(); };

test('tab labels and the active tab are coloured with selectors that beat the chat pane button reset', () => {
  assert.ok(/#cmPaneChat\[data-spirit-chat\] button\{[^}]*color:inherit/.test(read('community-chat.css')), 'pane button reset still present');
  assert.match(css, /#cmPaneChat\[data-spirit-chat\] \.rm-tab\{[^}]*color:var\(--rm-ink2\)/);
  assert.match(css, /#cmPaneChat\[data-spirit-chat\] \.rm-tab\[aria-selected=true\]\{color:#fff;/);
  assert.doesNotMatch(css, /\.rm-tab\[aria-selected=true\]\{[^}]*background:#fff/, 'no white pill');
  assert.doesNotMatch(css, /^\.rm-tab\b/m, 'no bare .rm-tab rule that the pane reset would beat');
});

test('header and menu text keeps WCAG AA contrast even if the glass sat on white', () => {
  const ink = hex(varOf('rm-ink')), ink2 = hex(varOf('rm-ink2'));
  for (const g of ['rm-glass', 'rm-glass-hi']) {
    const { c, a } = rgba(varOf(g));
    for (const under of [WHITE, DARK]) {
      const bg = over(c, a, under);
      assert.ok(ratio(ink, bg) >= 4.5, g + ' ink ' + ratio(ink, bg).toFixed(2));
      assert.ok(ratio(ink2, bg) >= 4.5, g + ' secondary ' + ratio(ink2, bg).toFixed(2));
    }
  }
  /* active tab: white on the cyan tint over the glass over white (worst case) */
  const { c, a } = rgba(varOf('rm-glass')); const track = over(c, a, WHITE); const pill = over([28, 247, 249], 0.26, track);
  assert.ok(ratio(WHITE, pill) >= 4.5, 'active tab ' + ratio(WHITE, pill).toFixed(2));
});

for (const [page, cssFile] of [['affiliates/index.html', 'affiliates/blueprint.css'], ['create/index.html', 'create/index.html']]) {
  test(page + ' is dark in the app frame and on its own (no white canvas, no white cards)', () => {
    const html = read(page), sheet = read(cssFile);
    assert.match(html, /<meta name="color-scheme" content="dark">/);
    assert.match(sheet, /:root\{color-scheme:dark;/);
    assert.doesNotMatch(sheet, /body\.embed\{[^}]*background:transparent/);
    assert.match(sheet, /body\.embed\{[^}]*background:linear-gradient\(180deg,#081a40/);
    const ink = hex(sheet.match(/--ink:(#[0-9a-f]{3,6})/i)[1]), muted = hex(sheet.match(/--muted:(#[0-9a-f]{3,6})/i)[1]);
    const card = sheet.match(/--card:(rgba\([^)]+\))/); const bg = card ? over(rgba(card[1]).c, rgba(card[1]).a, [8, 26, 64]) : [8, 26, 64];
    assert.ok(ratio(ink, bg) >= 4.5 && ratio(muted, bg) >= 4.5, 'card text ' + ratio(muted, bg).toFixed(2));
    assert.doesNotMatch(sheet, /background:\s*(#fff\b|#ffffff\b|white\b)/i, 'no white surfaces');
  });
}

test('the Copy link button moved into the community menu; the menu only offers things that work', () => {
  const js = read('community-rooms-ui.js');
  assert.doesNotMatch(js, /rm-view-top|class="rm-copy"/);
  assert.match(js, /\['invite','🔗',tr\('mInvite'\)\]/);
  assert.match(js, /if\(view\)it\.push\(\['copyview'/);
  for (const k of ['community', 'hereNow', 'menu', 'mPeople', 'mProfile', 'mInvite', 'mCopyAff', 'mCopyCreate', 'mSettings', 'mWelcome']) assert.match(js, new RegExp(k + ":\\['[^']+','[^']+','[^']+'\\]"), 'EN/DE/ES ' + k);
});
