'use strict';
/* Oct 15: care from the friends tree. Tree nodes carry data-care-uid, the micro-book care sheet opens above the
   tree (z above 99990) and closes back to it, one friend source, heart bubble after care is sent, daily limits kept.
   5 Nov 2026: the friends tree screen is gone (owner: "we can nuke it"). The tree-only checks became one check that it is gone;
   Care itself (one friend source, care ids, heart bubble, daily limits) keeps its checks. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const C = require('../micro-book-core.js');
const K = require('../cell-room-core.js');
const mb = fs.readFileSync(path.join(root, 'micro-book.js'), 'utf8'), mbc = fs.readFileSync(path.join(root, 'micro-book.css'), 'utf8');
const cr = fs.readFileSync(path.join(root, 'cell-room.js'), 'utf8'), crc = fs.readFileSync(path.join(root, 'cell-room.css'), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; };
const zOf = (css, sel) => { const m = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*z-index:(\\d+)').exec(css); return m ? +m[1] : -1; };

t('5 Nov 2026: no friends tree screen left; Care still reads the saved friends list', () => {
  assert.ok(!/function treeHTML|cr-ov-tree|data-cr="friend"|b\.id='crTreeBtn'/.test(cr), 'tree screen, its nodes and its buttons are gone');
  assert.ok(/D\.querySelectorAll\('#crTreeBtn,\.cr-mrow,#cpRoom > \.nm-ctree'\)\.forEach\(o=>o\.remove\(\)\)/.test(cr), 'a button an older build left is removed');
  assert.ok(/function openTree\(\)\{toCircle\(\);\}/.test(cr), 'an old call to openTree opens Circle');
  assert.ok(/friends:\(\)=>friends\(\)\.list\.slice\(\)/.test(cr), 'the saved friends list is still offered to Care');
  assert.ok(!/data-mb="tree"/.test(mb), 'Care has no "Open friends tree" button');
});
t('one friend source: micro-book reads the tree list first; tree uids are valid care uids', () => {
  assert.ok(/W\.LowiCellRoom\.friends\(\)/.test(mb));
  const s = K.addFriend(K.blankFriends(), { uid: 'abcdef12', n: 'Anna', c: 'Funki', src: 'link' }, 'meuid123', 5);
  const f = K.cleanFriends(s).list[0];
  assert.ok(C.okUid(f.uid));
  const id = C.careId(f.uid, C.CARE[0].id, '2026-10-15');
  assert.deepStrictEqual(C.parseCare(id), { to: 'abcdef12', kind: C.CARE[0].id, day: '2026-10-15' });
});
t('openCare takes a uid or {uid,n} and an onClose', () => {
  assert.ok(/function openCare\(uid, opts\)/.test(mb));
  assert.ok(/typeof uid === 'object' && C\.okUid\(uid\.uid\) && uid\.n/.test(mb));
  assert.ok(/onClose: \(\) =>/.test(mb) && /opts\.onClose/.test(mb));
});
t('heart bubble after care is sent today; incoming care still wins', () => {
  assert.ok(/const sentToday = /.test(mb));
  assert.ok(/c\.to === uid && c\.day === today/.test(mb));
  assert.ok(/mb-sent/.test(mb) && /\.mb-heart\.mb-sent\{/.test(mbc));
  assert.ok(/setTimeout\(cpaint, reduced\(\) \? 0 : 650\);\s*badges\(\);/.test(mb));
});
t('daily limits unchanged: the same kind cannot go to the same friend twice a day', () => {
  const f = { uid: 'abcdef12', n: 'Anna' }, k = C.CARE.find(x => !x.lv || x.lv <= 1) || C.CARE[0];
  const ctx = { day: '2026-10-15', level: 99, hour: 12 };
  const st = { sent: {}, out: [], seen: {}, inbox: {} };
  const r = C.canCare(st, f, k, ctx);
  if (r.ok) { st.sent[r.id] = Date.now(); assert.strictEqual(C.canCare(st, f, k, ctx).why, 'sent'); }
  else assert.ok(['time', 'locked'].includes(r.why));
});
t('syntax', () => { new Function(mb); new Function(cr); });

console.log('tree-care: ' + n + ' tests passed');
