// 22 Nov 2026 (Emmanuel): after scrolling down and back up, the For You buttons did nothing. Only a real swipe is ignored now.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const g = html.slice(html.indexOf('(function fyTapIntent(){'), html.indexOf('(function fyTopOnOpen(){'));
test('a tap right after scrolling counts; only a moved finger or a scroll during the touch is a swipe', () => {
  assert.doesNotMatch(g, /lastScroll > 250/); assert.doesNotMatch(g, /rr\.top >= fr\.top/);
  assert.match(g, /const swipe = d && \(!d\.ok \|\| lastScroll > d\.t \+ 40\);/);
  assert.match(g, /Math\.hypot\(e\.clientX - down\.x, e\.clientY - down\.y\) > 10/);
});
