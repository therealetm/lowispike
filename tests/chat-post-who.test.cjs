// 24 Nov 2026 (Emmanuel): photo posts show the poster's sign, personality type and birthday countdown (never the age), a react
// button under the picture, and a long press on the picture opens the reactions.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const c = R('community-chat.js');
test('the info line: sign, type, birthday countdown within 30 days else the date; never a year or an age', () => {
  assert.match(c, /function postWho\(uid\)\{/);
  assert.match(c, /nx\.days<=30\?P\.countdown\(nx\.days,l\):P\.dayMonth\(pub\.md,l\)/);
  const fn = c.slice(c.indexOf('function postWho('), c.indexOf('function time(ts){'));
  assert.doesNotMatch(fn, /age|getFullYear/);
  assert.strictEqual((c.match(/\+postWho\(mine\?scope:m\.uid\)/g) || []).length, 2, 'both renderers');
});
test('a react button under photo posts and a long press on the photo opens the reactions', () => {
  assert.match(c, /button\('more','<span aria-hidden="true">☺<\/span>\+'/);
  assert.match(c, /lp=\{x:e\.clientX,y:e\.clientY,t:setTimeout\(\(\)=>\{lp=null;lpSwallow=Date\.now\(\);try\{openMenu\(id\);\}/);
  assert.match(R('chat-meal-post.css'), /\.cs-photo img\{-webkit-touch-callout:none/);
});
