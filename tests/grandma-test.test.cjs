'use strict';
/* The grandma test (Oct 21, 2026, from the TikTok Emmanuel sent: "would a drunk grandma understand this? If not, simplify it.")
   Every number says its unit, every empty state says in words what is missing, option lists show their question,
   subtitles name the benefit. These lock the cases fixed on Home, Scan, Fuel, Gap, Move and Sleep. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Einkaufen bubble (Oct 28 2026, Emmanuel read the list count and the fill as meals eaten): a big cart and the word, no number, no fill', () => {
    const s = R('sym-home.js');
    assert.match(s, /bb\.innerHTML = CART_BIG/, 'the big number slot holds a cart, not a count');
    assert.doesNotMatch(s.slice(s.indexOf("b.classList.add('wh-shop');"), s.indexOf("if (b.getAttribute('aria-label') !== aria)")), /listCount\(\)|listOpen/, 'no shopping-list count on the bubble');
    assert.match(s, /setProperty\('--wh-fill', '0'\)/, 'the fill stays empty');
    assert.doesNotMatch(s, /bb\.textContent = v\.text/, 'the bare "1/3" write is gone');
    const css = R('sym-home.css');
    assert.match(css, /\.wh-meals\.wh-shop \.wh-cell-fill \{ display: none !important; \}/, 'no liquid fill');
    const o8 = R('home-orbit-v2.css');
    assert.match(o8, /--o8-i-fuel: url\("data:image\/svg\+xml,[^"]*circle cx='10' cy='20'/, 'the ring draws a shopping cart (wheels), not a fork and knife');
    assert.match(o8, /\[data-orbit="fuel"\]\.wh-shop \.wh-cell-tx > b \{ display: none !important; \}/, 'no number on the ring bubble');
    for (const w of ['Shopping', 'Einkaufen', 'Compras']) assert.ok(o8.includes("content: '" + w + "'"), w);
});

test('Gap bubble: an empty Gap is the label alone on Home, says "no meal yet" in its spoken label', () => {
    const s = R('spirit.js');
    for (const k of ['noMealYet', 'gapAria', 'gapAria0']) {
        const m = s.match(new RegExp('\\b' + k + ": \\[('[^']*'), ('[^']*'), ('[^']*')\\]"));
        assert.ok(m, k + ' has EN, DE and ES');
    }
    /* Oct 23 one text rule for every Home bubble (Emmanuel: "Gap has too much text ... keep it minimal"): an empty Gap shows its label
       alone, no dash and no second line; the words "no meal yet" stay in the spoken label (gapAria0) and on the Gap page */
    assert.ok(s.includes("(f.start ? hours + ':' + String(min).padStart(2, '0') : '')"), 'empty Gap: the label alone, no dash');
    /* Oct 28 decoupled: a stopped Gap's label is the control itself, "Letzte Mahlzeit" (tap = start) */
    assert.ok(s.includes("tr(f.start ? 'sinceMeal' : 'lastMealGo')"), 'stopped Gap: label alone = Letzte Mahlzeit');
    assert.ok(/lastMealGo: \['Last meal', 'Letzte Mahlzeit', '\u00daltima comida'\]/.test(s));
    assert.ok(/f\.start \? tr\('gapAria'\)[\s\S]{0,200}tr\('gapAria0'\)|tr\('gapAria0'\)/.test(s), 'the spoken label still says no meal yet');
    assert.ok(/el\.setAttribute\('aria-label', al\)/.test(s), 'the Gap bubble gets an aria-label');
    const m = s.match(/noMealYet: \[([^\]]+)\]/);
    for (const w of m[1].split(',').map(x => x.trim().replace(/^'|'$/g, ''))) assert.ok(w.length <= 18, 'fits the 70 px ring bubble like "last meal 12:38": ' + w);
});

test('Gap view: the planet marks say h, a bare 16 is not obviously hours', () => {
    assert.ok(/esc\(m\.stages\[i\]\.h\) \+ '<tspan class="gv-u">h<\/tspan><\/text>/.test(R('gap-view.js')));
    assert.ok(/\.gv-pl \.gv-u \{/.test(R('gap-view.css')));
});

test('Today\'s stats strip: "1/6" says "on track" and reads the full sentence aloud', () => {
    const s = R('nutri-stats.js');
    assert.ok(/T\('on track', 'im Ziel', 'bien'\)/.test(s));
    assert.ok(/class="ns-strip" data-ns="open" aria-label="/.test(s));
});

test('Move bloom: the note asks the question first (now: today\'s steps from the phone\'s own counter, Oct 23); Emmanuel\'s Epic stays', () => {
    const s = R('home-blooms-v2.js');
    assert.ok(s.includes("T('How many steps today? Check your step counter, then tap one.'"));
    assert.ok(s.includes("'Wie viele Schritte heute? Schau auf deinen Schrittzähler und tippe eins an.'"));
    assert.ok(s.includes("'¿Cuántos pasos hoy? Mira tu contador de pasos y toca uno.'"));
    assert.ok(!s.includes('Your guess, not steps'), 'the old minutes-guess note is gone');
    assert.ok(s.includes("epic: () => T('Epic', 'Episch', 'Épico')"), 'the name Emmanuel chose is kept');
});

test('Sleep: the question tries both sides of the chips and never lands on a bubble before it is dropped', () => {
    const s = R('home-settings-sleep-v2.js');
    assert.ok(/for \(const below of \[prefBelow, !prefBelow\]\)/.test(s), 'two sides tried');
    assert.ok(/hitsBubble/.test(s) && /hitsChip/.test(s), 'checks bubbles and chips');
});

test('Scan: the Deep analyze subtitle says where the tap goes (the custom GPT, Oct 21 evening)', () => {
    const s = R('index.html');
    assert.ok(s.includes('deepS: ["Opens the LOWiSPIKE GPT in ChatGPT", "Öffnet den LOWiSPIKE GPT in ChatGPT", "Abre el GPT de LOWiSPIKE en ChatGPT"]'));
    assert.ok(!s.includes('Snap the pack: will it spike you?'), 'no photo promise: Deep analyze no longer takes a photo');
    assert.ok(!s.includes('Photo of the pack, the AI reads it here'));
});

test('Fly hint: one instruction, not three gestures in a row', () => {
    const s = R('misty-pad.js');
    assert.ok(s.includes("T('New: drag here to fly Misty', 'Neu: hier ziehen, um mit Misty zu fliegen', 'Nuevo: arrastra aqu\\u00ed para volar con Misty')"));
    assert.ok(!s.includes('New: drag to fly Misty \\u00b7 hold'), 'the first hint no longer lists hold and taps (they come later, one at a time)');
});

test('the rule is written down where every agent reads it', () => {
    assert.ok(/The grandma test \(21 Oct 2026/.test(R('AGENTS.md')));
    assert.ok(/## 2026-10-21 — The grandma test for every screen and ad/.test(R('DECISIONS.md')));
});
