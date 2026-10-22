// misty-say (Oct 22, Emmanuel: "Misty's bubbles look bad. They don't fit the UI and they're so big."): Misty's and the guides'
// speech bubbles are one compact glass card (misty-say.css), one message at a time (praise.js queue, misty-hub.js waits),
// two lines with tap to open, and the lines that show in them are short enough for two lines in EN, DE and ES.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('misty-say.css is loaded after one-sheet.css and precached', () => {
    const html = read('index.html'), i = html.indexOf('id="oneSheetCss"'), j = html.indexOf('id="mistySayCss"');
    assert.ok(i > 0 && j > i, 'misty-say.css comes right after one-sheet.css');
    assert.ok(/"misty-say\.css"/.test(read('sw.js')), 'service worker precaches it');
});

test('one compact card: ~70% wide, 13px, two lines, small tail, Day and Night', () => {
    const css = read('misty-say.css');
    assert.ok(/--ms-max:\s*min\(70vw,\s*300px\)/.test(css));
    for (const sel of ['.lp-praise', '.wh-hint.mh-nudge', '.wh-hint.wh-say', '.rp-say']) assert.ok(css.includes(sel), sel + ' is styled');
    assert.ok((css.match(/max-width: var\(--ms-max\)/g) || []).length >= 3, 'every bubble is capped');
    assert.ok((css.match(/font-size: 13px/g) || []).length >= 3, 'smaller type everywhere');
    assert.ok(/\.lp-tx[^}]*-webkit-line-clamp: 2/.test(css) && /\.rp-tx[^}]*-webkit-line-clamp: 2/.test(css), 'two lines');
    assert.ok(/\.lp-open \.lp-tx/.test(css) && /\.rp-open \.rp-say \.rp-tx/.test(css), 'tap opens the full line');
    assert.ok(/width: 10px !important; height: 10px/.test(css), 'small tail');
    assert.ok(/html\[data-ui=light\], html\[data-theme="light"\]/.test(css), 'Day variant');
    assert.ok(/\.lp-praise\.on \{ pointer-events: auto/.test(css), 'tappable only while up');
});

test('one message at a time: praise queues, the nudge waits, tap opens then closes', () => {
    const js = read('praise.js'), hub = read('misty-hub.js'), pals = read('region-pals.js');
    assert.ok(/QUEUE_MAX = 3, QUEUE_TTL = 25000/.test(js), 'short queue, stale lines dropped');
    assert.ok(/if \(isOn\(\) \|\| othersTalking\(\)\) \{ waitT = setTimeout\(pump/.test(js), 'waits while a line, the nudge or a guide is up');
    assert.ok(/getElementById\('mhNudge'\)/.test(js) && /rp-talk/.test(js), 'knows the nudge and the guides');
    assert.ok(/addEventListener\('click', onTap\)/.test(js) && /lp-more/.test(js) && /lp-open/.test(js), 'tap to open / close');
    assert.ok(/talking, hide/.test(js), 'talking() exported');
    assert.ok(/LowiPraise\.talking\(\)\) return;/.test(hub), 'no nudge while Misty talks');
    assert.ok(/rp-open/.test(pals) && /st\.asking/.test(pals), 'guides: tap opens a long line, questions stay whole');
});

// a line in a bubble: about 38 characters a line at 13px and ~70% of a 375 px phone, so two lines ~ 70 characters
const MAX = 70;
const fill = t => String(t).replace(/\{k\}/g, '6').replace(/\{n\}/g, 'Hexa');
test('the bubble lines are short (EN, DE, ES)', () => {
    const H = require('../misty-hints.js'), C = require('../region-pals-core.js');
    for (const k of ['stormFood', 'stormProducts', 'weak', 'tired', 'bright']) for (const l of ['en', 'de', 'es']) {
        const t = H.tr(k, l); assert.ok(t && t.length <= MAX, k + ' ' + l + ' ' + (t || '').length);
    }
    for (const k of ['sense', 'auto']) C.GUIDE[k].forEach((t, i) => assert.ok(fill(t).length <= MAX, 'guide ' + k + ' ' + i + ' ' + fill(t).length));
    const src = read('misty-hunt.js') + read('body-trips.js');
    for (const m of src.matchAll(/\b(sense|tired):\s*\[\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\]/g))
        for (const t of m.slice(2)) assert.ok(fill(t).length <= MAX, m[1] + ': ' + t);
});
