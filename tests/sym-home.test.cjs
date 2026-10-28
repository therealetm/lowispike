/* Oct 17: symmetric Home (sym-home.js / sym-home.css): Meals bubble mirrors Move, Day/Night mirrors VR, round weather. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../sym-home.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('sym-home.js'), css = read('sym-home.css'), html = read('index.html'), sw = read('sw.js');

const NOW = new Date(2026, 9, 17, 15, 0, 0).getTime();
const meal = (h, extra) => Object.assign({ ts: new Date(2026, 9, 17, h, 0, 0).getTime(), t: 'Meal ' + h }, extra || {});

test('meals today: counts today only, skips voided, 3 meals fill the bubble', () => {
    const st = { logs: [meal(8), meal(12), meal(13, { voided: true }), { ts: new Date(2026, 9, 16, 19).getTime() }] };
    assert.strictEqual(C.mealsToday(st, NOW).length, 2);
    assert.deepStrictEqual(C.view(st, NOW), { n: 2, text: '2/3', fill: 2 / 3, full: false });
    assert.deepStrictEqual(C.view({ logs: [meal(8), meal(12), meal(14), meal(15)] }, NOW), { n: 4, text: '4/3', fill: 1, full: true });
    assert.deepStrictEqual(C.view(null, NOW), { n: 0, text: '0/3', fill: 0, full: false });
    assert.strictEqual(C.mealsToday({ logs: [{ day: '2026-10-17' }] }, NOW).length, 1, 'a day field counts too');
});

test('mirror: the Meals bubble sits on the other side of Misty from Move', () => {
    assert.strictEqual(C.mirrorX(336, 195), 54);
    assert.strictEqual(C.mirrorX(195, 195), 195);
});

test('Meals is a living bubble: .wh-cell in #whHud with data-hb; since the Oct 28 food plan it is Einkaufen (tap opens Shop, hold squishes)', () => {
    assert.ok(js.includes("el.className = 'wh-cell wh-meals'") && js.includes("el.dataset.hb = 'meals'"));
    assert.ok(js.includes("LowiLivingBubble.attach(b, { kind: 'meals', onLong: () => { longAt = performance.now(); return true; } })"), 'a hold only squishes');
    assert.ok(js.includes('B.shop()'), 'tap = the ring\'s one Einkaufen path');
    assert.ok(js.includes('W.LowiSpirit.meal()'), 'last fallback is still the meal sheet, never a dead tap');
    assert.ok(!/requestAnimationFrame\(function loop|setInterval\(\(\) => \{ paint/.test(js), 'no frame loop');
});

test('Day/Night sits above Sound like VR above World map, weather is round, files load and are cached offline', () => {
    assert.ok(/#tbTheme#tbTheme \{[^}]*position: fixed !important;[^}]*width: 46px !important; height: 46px !important;/.test(css));
    assert.ok(js.includes('sr.top - (mr.top - vrr.top)') && js.includes('sr.left + (sr.width - w) / 2'), 'same gap as VR over map, centred on Sound');
    assert.ok(/\.sp-weather\.sp-weather,[\s\S]*border-radius: 50% !important;/.test(css), 'round weather');
    assert.ok(/id="symCss" href="sym-home\.css\?v=\d{8}-\d{6}">\n<script src="sym-home\.js\?v=\d{8}-\d{6}"><\/script>\n(<link rel="stylesheet" id="secCss" href="section-nav\.css\?v=\d{8}-\d{6}">\n<script src="section-nav\.js\?v=\d{8}-\d{6}"><\/script>\n)?(<link rel="stylesheet" href="bottom-close\.css\?v=\d{8}-\d{6}">\n<script src="bottom-close\.js\?v=\d{8}-\d{6}"><\/script>\n)?<\/body>/.test(html));
    assert.ok(sw.includes('"sym-home.js", "sym-home.css"'));
});
