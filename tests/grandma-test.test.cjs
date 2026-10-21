'use strict';
/* The grandma test (Oct 21, 2026, from the TikTok Emmanuel sent: "would a drunk grandma understand this? If not, simplify it.")
   Every number says its unit, every empty state says in words what is missing, option lists show their question,
   subtitles name the benefit. These lock the cases fixed on Home, Scan, Fuel, Gap, Move and Sleep. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Fuel bubble: the count says its unit in EN, DE and ES, like Water does', () => {
    const s = R('sym-home.js');
    assert.ok(/T\('meals', 'Mahlzeiten', 'comidas'\)/.test(s), 'meals unit in three languages');
    assert.ok(/class="wh-num"><\/span> <u class="wh-unit"><\/u>/.test(s), 'same number + unit markup as Water');
    assert.ok(/\^\\d\+\\s\*\\\/\\s\*\\d\+\$/.test(s), 'the unit only rides a plain n/goal count');
    assert.doesNotMatch(s, /bb\.textContent = v\.text/, 'the bare "1/3" write is gone');
});

test('Gap bubble: an empty Gap says "no meal yet" in words and the bubble has a spoken label', () => {
    const s = R('spirit.js');
    for (const k of ['noMealYet', 'gapAria', 'gapAria0']) {
        const m = s.match(new RegExp('\\b' + k + ": \\[('[^']*'), ('[^']*'), ('[^']*')\\]"));
        assert.ok(m, k + ' has EN, DE and ES');
    }
    assert.ok(/<b>' \+ esc\(tr\('noFast'\)\) \+ '<\/b><small>' \+ esc\(tr\('noMealYet'\)\) \+ '<\/small>'/.test(s), 'the dash is followed by words');
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

test('Move bloom: the note asks the question first and keeps the honest "not steps"; Emmanuel\'s Epic stays', () => {
    const s = R('home-blooms-v2.js');
    assert.ok(s.includes("T('How far did you walk? Your guess, not steps · '"));
    assert.ok(s.includes("'Wie weit bist du gelaufen? Geschätzt, keine Schritte · heute '"));
    assert.ok(s.includes("'¿Cuánto has caminado? Tu cálculo, no pasos · hoy '"));
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
