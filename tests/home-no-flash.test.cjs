// Oct 15: tapping back to Today must never show the old Home for a moment.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const wh = fs.readFileSync(path.join(root, 'world-home.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'world-home.css'), 'utf8');

test('renderHome keeps the world Home node instead of throwing it away', () => {
  const start = html.indexOf('function renderHome(){');
  assert.ok(start > 0);
  const body = html.slice(start, html.indexOf('\n}\n', start));
  const keep = body.indexOf('const keepSp = document.getElementById("spHome")');
  const wipe = body.indexOf('$("#tab-home").innerHTML =');
  const back = body.indexOf('th.prepend(keepSp)');
  assert.ok(keep > 0 && wipe > keep && back > wipe, 'spHome is taken before the re-render and put back right after');
});

test('world Home adopts rebuilt Home nodes in the same frame', () => {
  assert.match(wh, /const homeMo = new MutationObserver\(adopt\)/);
  assert.match(wh, /homeMo\.observe\(t, \{ childList: true \}\)/);
  assert.match(wh, /homeMo\.observe\(h, \{ childList: true \}\)/);
  assert.match(wh, /H\.classList\.add\('wh-snap'\)/);
});

test('Today appears without cross-fade or slide-in', () => {
  assert.match(css, /html\.wh-snap \.wh-today[^{]*\{ transition: none !important; \}/);
  assert.match(css, /html\.wh-home #tab-home\.active, html\.wh-home \.tab:not\(\.active\) \{ transition: none !important; \}/);
  assert.match(css, /html\.wh-home #tab-home\.p2-tabin > \* \{ animation: none !important; \}/);
});
