'use strict';
/* Oct 28 2026 (owner request 13, Emmanuel on the call): one back returns where you came from, things that open in place stay in
   place. Plus the audit's chat notification that opened Home. Browser check: tools/check-navfix.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Einkaufen > Hilf mit keeps the Einkaufen section bar, Hilf mit lit, and its other sections switch directly', () => {
  const sp = read('store-picks.js'), gb = read('gift-basket.js');
  assert.match(sp, /const cur = tabOver \|\| tab;/);
  assert.match(sp, /tabsHTML: active => \{ if \(!ov\) return ''; tabOver = active \|\| ''; try \{ return tabsHTML\(\); \} finally \{ tabOver = ''; \} \}/);
  assert.match(gb, /aria-labelledby="gb-title">' \+ shopBar\(\) \+/);
  assert.match(gb, /getAttribute\('data-from'\) !== 'shop'/);
  assert.match(gb, /S\.tabsHTML\('gift'\)/);
  /* a tap on another section closes this panel through the back stack, then Einkaufen switches */
  assert.match(gb, /if \(el\.hasAttribute\('data-stp-tab'\)\) \{ const id = el\.getAttribute\('data-stp-tab'\); if \(id === 'gift'\) return; spend\(e\); close\(true\); if \(ov\) close\(false\); try \{ W\.LowiStorePicks\.setTab\(id\); \} catch \(x\) \{\} return; \}/);
  assert.match(gb, /t\.closest\('\[data-stp-tab\],\[data-gb\]/);
});

test('a tapped chat notification opens Community chat with that person, never Home', () => {
  const cc = read('community-chat.js'), lp = read('lis-push.js'), sw = read('sw.js');
  assert.match(cc, /data:\{q:'chat:'\+\(m\.uid\|\|''\)\+':'\+\(m\.id\|\|''\),tab:'foryou'\}/);
  assert.doesNotMatch(cc, /data:\{q:'',tab:'foryou'\}/);
  assert.match(lp, /const ch = \/\^chat\(\?::\(\[\^:\]\*\)\(\?::\(\.\+\)\)\?\)\?\$\/\.exec/);
  assert.match(lp, /if \(ch\) \{ tab\("foryou"\); setTimeout\(\(\) => seg\("chat"\), 350\);/);
  assert.match(lp, /C\.openMessage\(uid, id\); else C\.select\(uid\);/);
  /* notifications already on the phone from before (q "", tab "foryou") open the chat too */
  assert.match(sw, /d\.tab === "foryou" \? "community" : ""/);
});
