'use strict';
/* Oct 16 (E-man, 04:10): Misty's herb world was "a completely different interface ... nuke that and redesign it";
   Misty should tell you when Today has something for you; buttons like "Say goodnight" must be readable. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html'), js = read('misty-hub.js'), css = read('misty-hub.css'), sw = read('sw.js'), spirit = read('spirit.js'), wh = read('world-home.js');

test('Misty\'s card loads with the shell build and is cached offline', () => {
    const build = (html.match(/name="lowi-build" content="([0-9-]+)"/) || [])[1];
    assert.ok(build);
    assert.ok(html.includes('id="mhCss" href="misty-hub.css?v=' + build + '"'));
    assert.ok(html.includes('<script src="misty-hub.js?v=' + build + '"></script>'));
    assert.ok(html.indexOf('id="mhCss"') > html.indexOf('id="lgCss"'), 'after the Liquid Glass layer');
    assert.ok(sw.includes('"misty-hub.css"') && sw.includes('"misty-hub.js"'));
});

test('holding Misty and every plain "open her world" go to the new card; Scan keeps its own layer', () => {
    assert.ok(/function openMisty\(tab\) \{[\s\S]{0,400}W\.LowiMistyHub\.open\(\)/.test(wh), 'long press opens the card first');
    assert.ok(/openDetails,/.test(wh) && /function openDetails\(tab\)/.test(wh), 'the aura / growth sheet stays reachable from the Glow door');
    assert.ok(/function open\(opts\) \{\s*opts = opts \|\| \{\};[\s\S]{0,400}!opts\.capture && !opts\.embedded && window\.LowiMistyHub/.test(spirit), 'the herb world is replaced');
    assert.ok(/embedded: true/.test(spirit) && /if \(opts\.capture && !opts\.embedded\) scan\(\);/.test(spirit), 'Scan still opens its own capture and result view');
});

test('the card is the same Misty over the same world: cloned Home artwork, glass sheet, no cosmic portal', () => {
    assert.ok(js.includes("#spBubble .sp-home-herb svg.tmg-plant"), 'clones the Home Misty');
    assert.ok(!/constellation|starfield|sp-stage|sp-portal/i.test(css) && !/sp-stage|sp-constellation|sp-portal/.test(js), 'no starfield or portal');
    assert.ok(/R2\.sheet\(html\(sayOverride\), \{ cls: 'wh-ms-ov mh-ov' \}\)/.test(js), 'a normal sheet over the live world');
    assert.ok(!js.includes('data-mh="mood"'), 'no mood check-in on the card (Oct 23)');
    for (const k of ['data-mh="goodnight"', 'data-mh="door"', 'data-door="', 'mh-xp', 'role="progressbar"'])
        assert.ok(js.includes(k), k);
});

test('readable text: dark ink on light fills, light ink on dark glass, nothing forced onto one line', () => {
    assert.ok(/\.mh-moods button \{[^}]*background: rgba\(255, 255, 255, \.08\)[^}]*color: var\(--mh-ink\)/.test(css), 'mood chips: light text on glass');
    assert.ok(/\.mh-moods button\[aria-pressed="true"\] \{ background: var\(--a\);[^}]*color: #06201a/.test(css), 'picked mood: dark text on mint');
    assert.ok(/\.mh-pri \{[^}]*color: #06201a/.test(css), 'Goodnight: dark text on mint');
    assert.ok(/html\.spirit-app #spHome \.sp-next, html\.spirit-app #spHome \.sp-next span \{ color: #06201a; \}/.test(css), 'Say goodnight in Today');
    assert.ok(!/white-space:\s*nowrap|text-overflow:\s*ellipsis/.test(css), 'no clipped lines');
});

test('nudges: one at a time, each once, a quiet gap, a daily cap, and never over a sheet or a hint', () => {
    assert.ok(/NUDGE_GAP = 90e3/.test(js) && /NUDGE_DAY_MAX = 4/.test(js) && /SETTLE = 3500/.test(js));
    assert.ok(/candidates\(\)\.find\(c => !s\[c\.key\] && !\(retry\[c\.key\]/.test(js), 'a tapped nudge never repeats; an unread one waits NUDGE_RETRY');
    /* Oct 17 (E-man): only the deliberate tap marks it, never just showing it, and never while Misty flies */
    assert.ok(/function tapNudge\(\) \{\n\s*const n = nudge; hideNudge\(\); if \(n\) markSeen\(n\.key\);/.test(js), 'marked on tap');
    const show = js.slice(js.indexOf('function showNudge'), js.indexOf('function hideNudge'));
    assert.ok(!/markSeen/.test(show), 'showing does not mark');
    assert.ok(/H\.classList\.contains\('mf-on'\)\) return 'flying'/.test(js), 'quiet while flying');
    for (const why of ["'today-open'", "'sheet'", "'hint'", "'overlay'", "'not-home'"]) assert.ok(js.includes(why), why);
    assert.ok(/className = 'wh-hint wh-say mh-nudge'/.test(js), 'same bubble as her speech lines');
    assert.ok(/W\.LowiWorldHome\.openToday\(true\)/.test(js), 'tapping it opens Today');
    assert.ok(/'gn:' \+ nightKey\(\)/.test(js) && /'sun:' \+ dayKey\(\)/.test(js) && /'trip:' \+ tripKey\(\)/.test(js));
});

test('saying goodnight is remembered for the night and Today stops asking', () => {
    assert.ok(/function nightKey\(\) \{ return dayKey\(Date\.now\(\) - 12 \* 3600e3\); \}/.test(js));
    assert.ok(/LowiMistyHub\.saidGoodnight\(\)/.test(spirit) && /addEventListener\('lowi:goodnight', refresh\)/.test(spirit));
});
