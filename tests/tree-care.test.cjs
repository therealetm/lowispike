'use strict';
/* Oct 15: care from the friends tree. Tree nodes carry data-care-uid, the micro-book care sheet opens above the
   tree (z above 99990) and closes back to it, one friend source, heart bubble after care is sent, daily limits kept. */
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const C = require('../micro-book-core.js');
const K = require('../cell-room-core.js');
const mb = fs.readFileSync(path.join(root, 'micro-book.js'), 'utf8'), mbc = fs.readFileSync(path.join(root, 'micro-book.css'), 'utf8');
const cr = fs.readFileSync(path.join(root, 'cell-room.js'), 'utf8'), crc = fs.readFileSync(path.join(root, 'cell-room.css'), 'utf8');
let n = 0; const t = (name, fn) => { fn(); n++; };
const zOf = (css, sel) => { const m = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*z-index:(\\d+)').exec(css); return m ? +m[1] : -1; };

t('tree friend nodes (branches and the rest list) carry data-care-uid with the same uid', () => {
  const nodes = cr.match(/data-cr="friend" data-uid="'\+esc\((\w)\.uid\)\+'" data-care-uid="'\+esc\(\1\.uid\)\+'"/g) || [];
  assert.strictEqual(nodes.length, 2);
});
t('care sheet and toast sit above the tree overlay', () => {
  const tree = zOf(crc, '.cr-ov');
  assert.strictEqual(tree, 99990);
  assert.ok(zOf(mbc, '.r2-ov.mb-ov-top') > tree);
  assert.ok(zOf(mbc, '.mb-toast.mb-top') > tree);
  assert.ok(/\.r2-ov\.mb-ov-top\.off\{pointer-events:none\}/.test(mbc), 'closing sheet lets taps through to the tree');
  assert.ok(/mb-ov-top/.test(mb) && /LowiCellRoom\.isOpen/.test(mb));
});
t('one friend source: micro-book reads the tree list first; tree uids are valid care uids', () => {
  assert.ok(/W\.LowiCellRoom\.friends\(\)/.test(mb));
  const s = K.addFriend(K.blankFriends(), { uid: 'abcdef12', n: 'Anna', c: 'Funki', src: 'link' }, 'meuid123', 5);
  const f = K.cleanFriends(s).list[0];
  assert.ok(C.okUid(f.uid));
  const id = C.careId(f.uid, C.CARE[0].id, '2026-10-15');
  assert.deepStrictEqual(C.parseCare(id), { to: 'abcdef12', kind: C.CARE[0].id, day: '2026-10-15' });
});
t('openCare takes a uid or {uid,n} and an onClose that returns to the tree', () => {
  assert.ok(/function openCare\(uid, opts\)/.test(mb));
  assert.ok(/typeof uid === 'object' && C\.okUid\(uid\.uid\) && uid\.n/.test(mb));
  assert.ok(/onClose: \(\) =>/.test(mb) && /opts\.onClose/.test(mb));
  assert.ok(/LowiCare\.open\(\{uid:f\.uid,n:f\.n,c:f\.c\},\{top:true,onClose:/.test(cr));
  assert.ok(/paintTree\('\.cr-fcard \.cr-care'\)/.test(cr));
});
t('tapping a friend opens care (no double open from the delegated handler); friend card keeps a care button', () => {
  assert.ok(/a==='friend'&&careOK\(\)\)\{T\.sel=b\.dataset\.uid;[^}]*careFor\(T\.sel\)/.test(cr));
  assert.ok(/if \(!t\.dataset\.mb && t\.dataset\.cr\) return;/.test(mb));
  assert.ok(/data-cr="care" data-uid=/.test(cr));
  /* without the microbe book the old select / deselect stays */
  assert.ok(/else if\(a==='friend'\)\{T\.sel=T\.sel===b\.dataset\.uid\?'':b\.dataset\.uid;/.test(cr));
});
t('Escape and Tab go to the care sheet while it is on top of the tree', () => {
  assert.ok(/querySelector\('\.r2-ov\.mb-ov-top:not\(\.off\)'\)/.test(cr));
  assert.ok(/LowiR2\.close\(top\)/.test(cr));
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
