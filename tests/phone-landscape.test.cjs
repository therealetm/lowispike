// 25 Nov 2026 (Emmanuel, iPhone turned sideways: "Why isn't it when I tilt the phone? It should just look like when I open it as iPad").
// Checked in Chromium at 932x430 (an iPhone on its side): #app 932 px wide (was capped at 520 px with black bars beside it).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
test('a phone held sideways fills the screen; pages other than Home keep a readable middle column', () => {
  assert.match(html, /html\[data-lay=phone\]\[data-orient=land\] #app\{max-width:none\}/);
  assert.match(html, /html\[data-lay=phone\]\[data-orient=land\] #main>\.tab:not\(#tab-home\)\{padding-left:max\(var\(--gutmin,16px\),calc\(\(100vw - 640px\) \/ 2\)\)!important;/);
});
test('upright phones are unchanged: the 520 px column stays the phone rule', () => {
  assert.match(html, /#app\{position:fixed;inset:0;max-width:520px;margin:0 auto;/);
  assert.match(html, /if \(!mouse && Math\.min\(w, h\) < 500\) lay = "phone";/);
});
