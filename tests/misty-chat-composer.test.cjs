// 25 Nov 2026 (Emmanuel: "When I'm trying to type in there ... I can't even see the text bubble ... It should be fixed like ChatGPT or
// Claude ... I want your type of text bubble"). Talk to {companion}: one rounded composer card (text on top, photo / mic / send under it)
// that grows with the text, and the whole chat follows the visible area above the iPhone keyboard.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const a = fs.readFileSync(path.join(__dirname, '..', 'lowi-ask.js'), 'utf8');
test('the composer is one card: the text on top, the buttons in a row under it; one mic of its own', () => {
  assert.match(a, /<div class="ak-f"><div class="ak-box"><textarea rows="1" enterkeyhint="send" data-mic="off"><\/textarea><div class="ak-bar">/);
  assert.match(a, /data-ak="mic" aria-label="Speak" hidden>/);
  assert.match(a, /W\.LowiMic\.dictate\(ta, st =>/);
  assert.match(a, /#lwAsk \.ak-bar \[hidden\]\{display:none\}/, 'no mic where the device cannot dictate');
  assert.match(a, /ta\.style\.height = Math\.min\(ta\.scrollHeight, 168\) \+ 'px'/);
  assert.match(a, /#lwAsk \.ak-f \.ak-box textarea\{flex:none;/, 'the text box really grows (no flex squeeze)');
});
test('the chat follows the keyboard (visualViewport) and lets go when it closes', () => {
  assert.match(a, /el\.style\.top = Math\.max\(0, v\.offsetTop\) \+ 'px'; el\.style\.height = v\.height \+ 'px';/);
  assert.match(a, /v\.addEventListener\('resize', kbFn\); v\.addEventListener\('scroll', kbFn\);/);
  assert.match(a, /function close\(\) \{ kbOff\(\);/);
  assert.match(a, /D\.body\.appendChild\(el\); kbOn\(\);/);
});
