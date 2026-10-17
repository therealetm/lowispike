/* Oct 17, 2026 (E-man in a world: "how many are left? I'm just flying around, not knowing if there are still any"):
   a slim line under the Daily Quest box with the world's collected/total and a clear "world clean" state. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const C = require('../hunt-count.js');
const js = strip(read('hunt-count.js')), css = read('hunt-count.css'), hunt = strip(read('misty-hunt.js')), html = read('index.html'), sw = read('sw.js');

test('the line says collected / total and what is left, in all three languages', () => {
    const en = C.model({ world: 'gut', n: 6, left: 4 }, 'en', 'Gut');
    assert.strictEqual(en.main, '2/6 collected'); assert.strictEqual(en.sub, '4 left'); assert.strictEqual(en.clean, false);
    assert.strictEqual(en.aria, 'Gut: 2 of 6 collected, 4 left.');
    assert.deepStrictEqual(en.dots, [true, true, false, false, false, false]);
    assert.strictEqual(C.model({ world: 'gut', n: 6, left: 4 }, 'de', 'Darm').main, '2/6 gesammelt');
    assert.strictEqual(C.model({ world: 'gut', n: 6, left: 4 }, 'de', 'Darm').sub, 'noch 4');
    assert.strictEqual(C.model({ world: 'gut', n: 6, left: 4 }, 'es', 'Intestino').sub, 'quedan 4');
    for (const l of ['en', 'de', 'es']) for (const k of Object.keys(C.L.en)) assert.ok(C.L[l][k], l + ' ' + k);
});

test('a world with nothing left says it is clean, unmistakably', () => {
    const m = C.model({ world: 'brain', n: 8, left: 0 }, 'en', 'Brain');
    assert.strictEqual(m.clean, true); assert.strictEqual(m.main, 'World clean'); assert.strictEqual(m.sub, 'all 8 collected');
    assert.ok(m.dots.every(Boolean));
    assert.strictEqual(C.model({ world: 'brain', n: 8, left: 0 }, 'de', 'Gehirn').main, 'Welt sauber');
});

test('no world, the bloodstream or no hunt: nothing shows; bad numbers are clamped', () => {
    assert.strictEqual(C.model(null, 'en'), null);
    assert.strictEqual(C.model({ world: null, n: 6, left: 6 }, 'en'), null);
    assert.strictEqual(C.model({ world: 'hub', n: 6, left: 6 }, 'en'), null);
    assert.strictEqual(C.model({ world: 'gut', n: 0, left: 0 }, 'en'), null);
    assert.strictEqual(C.model({ world: 'gut', n: 6, left: 9 }, 'en').main, '0/6 collected');
    assert.strictEqual(C.model({ world: 'gut', n: 6, left: -2 }, 'en').clean, true);
    assert.strictEqual(C.model({ world: 'gut', n: 20, left: 3 }, 'en').dots, null, 'too many for dots: numbers only');
});

test('the numbers come from the real hunt, only when they change, never per frame', () => {
    assert.ok(/function tally\(\)/.test(hunt) && /left = H\.bits\.filter\(b => !b\.gone\)\.length/.test(hunt), 'counted from the crumbs that are there');
    assert.ok(/'lowi:hunt-count'/.test(hunt));
    const tells = (hunt.match(/\btell\(\)/g) || []).length; assert.ok(tells >= 4, 'spawn, eat, clear (+ early return)');
    assert.ok(/if \(k === lastTally\) return c;/.test(hunt), 'same count = no event');
    const frame = hunt.slice(hunt.indexOf('function frame('), hunt.indexOf('function frame(') + 1400);
    assert.ok(!/tell\(\)/.test(frame.split('if (!H.bits.length) return;')[0].replace(/spawn\(ctx, reg, id, reach\)/g, '')), 'frame itself does not send counts');
    assert.ok(/tally,\s*state:/.test(hunt), 'LowiMistyHunt.tally() for a late start');
    assert.ok(!/requestAnimationFrame/.test(js), 'no frame loop in hunt-count.js');
    assert.strictEqual((js.match(/setInterval\(/g) || []).length, 1, 'one light look, only while the line shows');
    assert.ok(/setInterval\(look, 400\)/.test(js) && /clearInterval\(watch\)/.test(js) && /watchOn\(false\); return;/.test(js));
    assert.ok(/addEventListener\('lowi:hunt-count'/.test(js));
});

test('a new day gives the world its new crumbs, checked every few seconds, not every frame', () => {
    assert.ok(/ms - H\.dayChk > 5000/.test(hunt));
    assert.ok(/H\.day !== dayKey\(ms\)\) \{ drop\(\); spawn\(/.test(hunt));
    assert.ok(/function drop\(\)/.test(hunt));
});

test('hunt rules untouched: no autopilot eating, eaten crumbs stay eaten', () => {
    assert.ok(/steer/.test(hunt));
    const src = read('misty-hunt.js');
    assert.ok(/const done = s\.eaten\[cleanId\(id\)\] \|\| \[\]/.test(src) || /done = s\.eaten\[cleanId\(id\)\]/.test(src));
});

test('it continues the Daily Quest glass box, never a popup and never touchable', () => {
    assert.ok(/role', 'status'/.test(js) && /aria-live', 'polite'/.test(js));
    assert.ok(/pointer-events: none/.test(css));
    assert.ok(/var\(--wh-glass-wide/.test(css) && /var\(--wh-glass-rim/.test(css), 'same glass as the box');
    assert.ok(/#f3Board\.hc-joined \{ border-bottom-left-radius: 0 !important/.test(css), 'box corners square off');
    assert.ok(/insertAdjacentElement\('afterend'/.test(js) && /b\.offsetLeft/.test(js) && /b\.offsetWidth/.test(js), 'same left and width as the box, right under it');
    assert.ok(/hqSlot/.test(js), 'under the arrival card when one is in the box');
    assert.ok(/prefers-reduced-motion: reduce/.test(css));
    assert.ok(/\.hc-line\.hc-away/.test(css), 'leaves with the box');
});

test('loaded after misty-hunt.js and cached for offline', () => {
    const a = html.indexOf('misty-hunt.js?v='), b = html.indexOf('hunt-count.js?v=');
    assert.ok(a > 0 && b > a);
    assert.ok(sw.includes('"hunt-count.js"') && sw.includes('"hunt-count.css"'));
});

test('Misty, the cell guide, its speech bubble and the controller are never hidden behind the line', () => {
    for (const k of ['LowiMistyFlight', ".rp-body", ".rp-say", "#whPad"]) assert.ok(js.includes(k), k);
    assert.ok(/\.hc-line\.on\.hc-dim \{ opacity: \.14; \}/.test(css));
    assert.ok(/html\.lw-clean \.hc-line/.test(css), 'clean autopilot view hides it with the Daily Quest');
});
