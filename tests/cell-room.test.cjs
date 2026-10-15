/* Oct 15: cell room (decoratable home for the living cell) + friends tree. Core logic + wiring checks. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const K = require('../cell-room-core.js');
const WC = require('../herb-tamagotchi-core.js');
const src = fs.readFileSync(path.join(root, 'cell-room.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'cell-room.css'), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; };

t('room lists own furniture plus every non-premium wardrobe piece, owned only by XP or shop', () => {
  const low = K.items(WC, 0), high = K.items(WC, 5000);
  assert.ok(low.find(i => i.id === 'window' && i.owned));
  assert.ok(low.find(i => i.id === 'bubbles' && !i.owned));
  assert.ok(high.find(i => i.id === 'bubbles' && i.owned));
  assert.ok(!low.some(i => i.src === 'wardrobe' && WC.COSMETICS.find(c => c.id === i.id && c.premium)));
  const pieces = low.filter(i => i.src === 'wardrobe');
  assert.ok(pieces.length >= 6);
  pieces.forEach(p => assert.ok(['licht', 'schatz'].includes(p.cat)));
  assert.deepStrictEqual(K.CATS.map(c => c.id), ['moebel', 'licht', 'schatz']);
  K.CATS.forEach(c => assert.strictEqual(c.names.length, 3));
});
t('only owned pieces can be placed; toggling places and removes', () => {
  const list = K.items(WC, 0);
  let st = K.blankRoom();
  assert.strictEqual(K.toggle(st, 'bubbles', list), null);
  st = K.toggle(st, 'window', list); assert.ok(!st.placed.includes('window'));
  st = K.toggle(st, 'window', list); assert.ok(st.placed.includes('window'));
  const free = list.find(i => i.src === 'wardrobe' && i.owned);
  if (free) { st = K.toggle(st, free.id, list); assert.ok(K.visible(st, list).includes(free.id)); }
});
t('visible() hides placed pieces the user no longer owns (restore / new account)', () => {
  const st = { v: 1, placed: ['window', 'bubbles', 'rug'], ts: 1 };
  assert.deepStrictEqual(K.visible(st, K.items(WC, 0)), ['window']);
  assert.deepStrictEqual(K.visible(st, K.items(WC, 5000)), ['window', 'bubbles', 'rug']);
});
t('cleanRoom tolerates junk and dedupes', () => {
  assert.deepStrictEqual(K.cleanRoom(null).placed, ['window', 'cushion', 'lamp']);
  assert.deepStrictEqual(K.cleanRoom({ placed: ['lamp', 'lamp', '<x>', 3] }).placed, ['lamp']);
});
t('light pieces tint the room', () => {
  const list = K.items(WC, 1e6);
  const st = K.toggle(K.blankRoom(), 'aurora', list);
  if (st) assert.strictEqual(K.roomTint(st, list), '#7ef0c8');
});
t('friends: real entries only, no self, dedupe, cap', () => {
  let s = K.blankFriends();
  assert.strictEqual(K.addFriend(s, { uid: 'bad', n: 'X' }), null);
  assert.strictEqual(K.addFriend(s, { uid: 'abcdef12', n: '' }), null);
  assert.strictEqual(K.addFriend(s, { uid: 'meuid123', n: 'Me' }, 'meuid123'), null);
  s = K.addFriend(s, { uid: 'abcdef12', n: 'Anna', c: 'Funki', src: 'link' }, 'meuid123', 5);
  assert.strictEqual(s.list.length, 1); assert.strictEqual(s.list[0].c, 'Funki');
  s = K.addFriend(s, { uid: 'abcdef12', n: 'Anna B' }, 'meuid123', 6);
  assert.strictEqual(s.list.length, 1); assert.strictEqual(s.list[0].n, 'Anna B'); assert.strictEqual(s.list[0].c, 'Funki');
  for (let i = 0; i < 20; i++) { const n2 = K.addFriend(s, { uid: 'person' + i + 'xx', n: 'P' + i }, 'meuid123', 7); if (n2) s = n2; }
  assert.strictEqual(s.list.length, K.MAX_FRIENDS);
  s = K.removeFriend(s, 'abcdef12'); assert.ok(!s.list.some(f => f.uid === 'abcdef12'));
  assert.ok(K.cleanFriends({ list: [{ uid: 'abcdef12', n: '<b>Hi</b>' }] }).list[0].n.indexOf('<') < 0);
});
t('invite link round trip, no link without a signed-in user', () => {
  assert.strictEqual(K.inviteURL('https://x.io/app/', { uid: '', n: 'A' }), '');
  const u = K.inviteURL('https://x.io/app/index.html?a=1#t', { uid: 'abc-123_XYZ', n: 'Emmanuel', c: 'Lumi Zelle' });
  assert.ok(u.startsWith('https://x.io/app/index.html?friend=abc-123_XYZ'));
  const p = K.parseInvite(u.slice(u.indexOf('?')));
  assert.deepStrictEqual(p, { uid: 'abc-123_XYZ', n: 'Emmanuel', c: 'Lumi Zelle' });
  assert.strictEqual(K.parseInvite('?friend=x'), null);
  assert.strictEqual(K.parseInvite(''), null);
});
t('tree has 8 branch spots plus your own cell in the centre', () => {
  assert.strictEqual(K.TREE.spots.length, 8);
  assert.deepStrictEqual(K.TREE.me, [50, 47]);
  assert.ok(K.hue('a') >= 0 && K.hue('a') < 360 && K.hue('a') === K.hue('a'));
});
t('UI: German-first copy, privacy line, Shop + close, honest friends (no fallback people)', () => {
  assert.ok(src.includes('Freund hinzuf\\u00fcgen') || src.includes('Freund hinzuf\u00fcgen'));
  assert.ok(/Gesundheitsdaten nicht sehen/.test(src));
  assert.ok(!/root\.LowiCellRoom=\{openRoom/.test(src) && !src.includes("#spWd .wd-head") && !src.includes(".lh-room-head')"), 'room retired Oct 15: no door, openRoom not exported');
  assert.ok(src.includes('data-cr="close"'));
  assert.ok(/function roomPeople\(\)\{if\(!live\(\)\)return\[\]/.test(src), 'people list only when the cloud is live');
  assert.ok(src.includes('LowiExtras.openMiles'), 'hooks into Community milestones / good vibes');
  assert.ok(src.includes('invYes') && src.includes('Nicht jetzt'), 'invite asks first');
  assert.ok(src.includes("'lowi:shop'"), 'room repaints after the shop closes');
});
t('wiring: loader, service worker, CSS reduced motion, no sideways overflow helpers', () => {
  const apple = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(apple.indexOf("'cell-room-core.js','cell-room.js'") > 0);
  ['cell-room-core.js', 'cell-room.js', 'cell-room.css'].forEach(f => assert.ok(sw.includes('"' + f + '"'), f));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(/\.cr-ov\{position:fixed;inset:0;z-index:99990/.test(css), 'room sits under the shop overlay');
  assert.ok(css.includes('overflow-x:hidden'));
});
console.log('cell-room: ' + n + ' tests passed');
