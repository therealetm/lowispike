// Regression: iPad and laptop layout (Oct 14, 2026).
// - An iPad on its side (landscape, 1000px+) gets the desktop layout with the side navigation, decided from the viewport, not the device.
// - Phones keep their own layout: below 700px stays phone, a phone on its side stays phone.
// - The game screens (Home, Cook, Community board, Profile) run on every size, and LowiFit never squeezes them on iPad/laptop.
// - On iPad/laptop a page that is taller than the screen scrolls: nothing below the fold is cut off (Profile's lower controls included).
// - In the side navigation, Scan is one row like the other items (icon left, label next to it, same type), not the old tall orb block.
// - wide-layout.css is loaded by apple-ui.js and cached by the service worker; every rule is scoped away from phones.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'wide-layout.css'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// 1. layout classification, run for real
const headLine = html.split('\n').find(l => l.includes('var lay = w < 700'));
assert(headLine, 'layout line missing');
const expr = headLine.trim().replace(/^var lay = /, '').replace(/;.*$/, '');
const lay = (w, h) => Function('w', 'h', 'return ' + expr)(w, h);
const cases = [
  [1180, 740, 'desktop'],  // iPad Air/10th gen on its side, Safari
  [1180, 820, 'desktop'],
  [1133, 700, 'desktop'],  // iPad mini on its side
  [1024, 700, 'desktop'],  // older iPad on its side
  [1366, 950, 'desktop'],  // iPad Pro 13" on its side
  [1440, 900, 'desktop'],  // laptop
  [820, 1080, 'tablet'],   // iPad upright
  [1024, 1300, 'tablet'],  // iPad Pro upright
  [780, 740, 'tablet'],    // split view
  [390, 844, 'phone'],
  [430, 932, 'phone'],
  [699, 500, 'phone'],
];
for (const [w, h, want] of cases) assert.strictEqual(lay(w, h), want, `${w}x${h} should be ${want}`);

// 2. game screens on every size, LowiFit squeezes only phones
assert.strictEqual((html.match(/const phone = \(\) => H\.getAttribute\("data-lay"\) === "phone"/g) || []).length, 0, 'a game screen is still phone-only');
assert((html.match(/const phone = \(\) => true;/g) || []).length >= 4, 'game screens should run on every size');
assert(/function limit\(\)\{\s*\/\*[^*]*\*\/\s*const lay = H\.getAttribute\("data-lay"\); if \(lay && lay !== "phone"\) return 1e6;/.test(html), 'LowiFit.limit must not squeeze iPad/laptop screens');

// 3. wide pages scroll
assert(/:is\(\[data-lay=tablet\],\[data-lay=desktop\]\) \.tab\.active,[\s\S]*#tab-profile#tab-profile\{overflow-y:auto!important/.test(css), 'wide pages must scroll');
assert(/g2e-open:is\(\[data-lay=tablet\],\[data-lay=desktop\]\) #tab-profile#tab-profile\{[^}]*overflow-y:auto!important/.test(css), 'an opened profile part must scroll');

// 4. every rule is scoped away from phones
const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
const selectors = [];
body.replace(/([^{}@]+)\{[^{}]*\}/g, (m, sel) => { sel.split(',').forEach(s => { s = s.trim(); if (s) selectors.push(s); }); return m; });
assert(selectors.length > 20, 'no rules parsed');
for (const s of selectors) assert(/\[data-lay=(tablet|desktop)\]/.test(s), 'rule not scoped to iPad/laptop: ' + s);

// 5. (Oct 21) the side navigation / menu bar is gone, so there is no Scan row to check

// 6. Cook tiles never cut off on wide screens
assert(/#shelf #g2cTiles\.g2c-tiles\{display:grid!important;[^}]*overflow:visible!important/.test(css), 'Cook tiles must be a grid on wide screens');

// 7. loaded and cached, in sync with the build
assert(/wl\.href='wide-layout\.css\?v='\+v/.test(loader), 'apple-ui.js must load wide-layout.css');
assert(sw.includes('"wide-layout.css"'), 'sw.js must cache wide-layout.css');
const build = html.match(/<meta name="lowi-build" content="([^"]+)"/)[1];
assert(loader.includes(`const v='${build}'`), 'apple-ui.js build out of sync');
assert(sw.includes(`SHELL_BUILD = "${build}"`), 'sw.js build out of sync');
console.log('wide-layout: ok');
