const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'scan-glass.css'), 'utf8');
test('barcode field rides above the keyboard', () => {
  assert.ok(/function kbFit\(\)/.test(html) && /visualViewport/.test(html.slice(html.indexOf('function kbFit'), html.indexOf('function kbFit') + 1200)));
  assert.ok(html.includes('kbWire(el);'));
  assert.ok(/\.b3-cam\.kb \.b3-cbot[^{]*\{[^}]*bottom: calc\(var\(--b3kb/.test(css));
  assert.ok(/\.b3-cam\.kb \.b3-cmsg[^{]*\{[^}]*display: none/.test(css));
});
