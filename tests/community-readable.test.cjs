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
  /* active tab: white on the brand-blue tint over the glass over white (worst case; item 43: no cyan) */
  const { c, a } = rgba(varOf('rm-glass')); const track = over(c, a, WHITE); const pill = over([47, 149, 255], 0.34, track);
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
  assert.match(js, /if\(VIEWS\[view\]\)it\.push\(\['copyview'/);
  for (const k of ['community', 'hereNow', 'menu', 'mDir', 'mProfile', 'mInvite', 'mCopyAff', 'mCopyCreate', 'mSettings', 'mWelcome']) assert.match(js, new RegExp(k + ":\\['[^']+','[^']+','[^']+'\\]"), 'EN/DE/ES ' + k);
});

/* Channel list: built only from real data; with none it shows honest empty lines, never invented people, counts or messages. */
function rows(community) {
  const vm = require('vm');
  const D = { readyState: 'loading', addEventListener() {}, getElementById: () => null, documentElement: {} };
  const W = { getComputedStyle: () => ({}), addEventListener() {}, LowiCommunity: community, LowiRooms: null };
  const ctx = { window: W, document: D, setInterval() {}, setTimeout() {}, location: { hash: '' }, navigator: { language: 'en' } }; vm.createContext(ctx);
  vm.runInContext(read('community-rooms-ui.js'), ctx); return W.LowiRoomsUI._chanRows();
}
test('channels: empty data gives honest empty states, no invented members or counts', () => {
  const r = rows({ latest: () => null, unread: () => 0, directed: () => ({ list: [] }) });
  assert.deepEqual(r.map(x => x.k), ['galaxy', 'replies', 'aff', 'create'], 'one chat for everyone: no room row (Oct 24 2026)');
  assert.equal(r[0].p, 'No messages yet. Say hi to everyone.'); assert.equal(r[0].n, 0);
  assert.equal(r[1].p, 'Nothing for you yet.'); assert.equal(r[1].dis, true);
  assert.ok(!r.some(x => /here now|Room \d/.test(x.p || '')), 'no presence count or room number invented');
});
test('channels: real newest message, unread count and replies are shown as they are', () => {
  const r = rows({ latest: () => ({ uid: 'u1', by: 'Ana', text: 'Day 3 done', ts: Date.now() - 120000 }), unread: () => 3, directed: () => ({ list: [{ uid: 'u2', by: 'Ben', text: '@you nice', ts: Date.now(), seen: false }, { uid: 'u3', by: 'Cy', text: 'old', ts: 1, seen: true }].reverse() }) });
  assert.equal(r[0].p, 'Ana: Day 3 done'); assert.equal(r[0].n, 3);
  assert.equal(r[1].p, 'Ben: @you nice'); assert.equal(r[1].n, 1); assert.ok(!r[1].dis);
});

test('welcome sheet: 4 steps (welcome + rules one card, slim batch 7), rules agree, affiliate yes leads to Affiliates, every line in EN/DE/ES, shown once', () => {
  const js = read('community-rooms-ui.js');
  assert.match(js, /obStep:\['\{i\} of 4','\{i\} von 4','\{i\} de 4'\]/);
  assert.match(js, /if\(obI===0\)return[^\n]*\n[^\n]*rm-ob-rules/, 'rules sit on the welcome card'); assert.match(js, /obI===0\?tr\('obAgree'\)/);
  assert.match(js, /if\(aff\)cards\.unshift\(\['aff'/); assert.match(js, /const aff=obA\.aff==='yes';obClose\(true\);if\(aff\)showView\('aff'\)/);
  assert.match(js, /function maybeWelcome\(\)\{if\(ob\|\|lsGet\(OBK\)/);
  const block = js.slice(js.indexOf('const OT={'), js.indexOf('Object.assign(T,OT);'));
  const keys = block.match(/\b(ob[A-Za-z0-9]+):\[/g).map(k => k.slice(0, -2));
  assert.ok(keys.length >= 50, 'keys ' + keys.length);
  for (const k of keys) assert.ok(new RegExp(k + ":\\['(?:[^'\\\\]|\\\\.)+','(?:[^'\\\\]|\\\\.)+','(?:[^'\\\\]|\\\\.)+'\\]").test(block), 'EN/DE/ES ' + k);
  assert.match(js, /W\.LowiCommunityWelcome=\{open:openWelcome/);
  assert.match(js, /\['welcome','📜',tr\('mWelcome'\)\]/);
});
