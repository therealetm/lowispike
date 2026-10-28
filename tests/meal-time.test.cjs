/* Oct 28, 2026. Antje (about 70): "Ich kann die Zeit ändern, aber ich kann's nirgends speichern." Emmanuel: "Wir müssen das für
   sie, für solche Kunden einfacher machen." One meal time chooser (meal-time.js): big plain choices, the time counts the moment it is
   picked, with a clear saved line. These tests pin the pure helpers and the wiring. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const MT = require('../meal-time.js');
const MIN = 60000, H = 3600000;
const at = (h, m, back) => { const d = new Date(2026, 9, 28, 14, 0, 0, 0); d.setDate(d.getDate() - (back || 0)); d.setHours(h, m, 0, 0); return d.getTime(); };
const NOW = at(14, 0);

test('the quick choices: Jetzt first, then only times that have passed, then yesterday evening, each with its time', () => {
    const c = MT.choices(NOW, 'de');
    assert.deepStrictEqual(c.map(x => x.label), ['Jetzt', 'Heute fr\u00fch', 'Mittags', 'Gestern Abend']);
    assert.strictEqual(c[0].at, 0, 'Jetzt means the moment it is saved');
    assert.strictEqual(c[1].at, at(8, 0)); assert.strictEqual(c[1].time, '08:00');
    assert.strictEqual(c[3].at, at(19, 0, 1));
    const eve = MT.choices(at(20, 30), 'de').map(x => x.k);
    assert.deepStrictEqual(eve, ['now', 'morning', 'noon', 'evening', 'yest']);
    const early = MT.choices(at(7, 0), 'de').map(x => x.k);
    assert.deepStrictEqual(early, ['now', 'yest'], 'nothing in the future is offered');
});

test('labels read plainly: "08:00" today, "gestern, 19:00" yesterday', () => {
    assert.strictEqual(MT.label(at(8, 0), NOW, 'de'), '08:00');
    assert.strictEqual(MT.label(at(19, 0, 1), NOW, 'de'), 'gestern, 19:00');
    assert.strictEqual(MT.label(at(19, 0, 1), NOW, 'en'), 'yesterday, 19:00');
});

test('"Andere Zeit": a day and a time, never in the future, at most 7 days back', () => {
    assert.deepStrictEqual(MT.fromDayTime(0, '08:00', NOW), { at: at(8, 0) });
    assert.deepStrictEqual(MT.fromDayTime(1, '19:30', NOW), { at: at(19, 30, 1) });
    assert.strictEqual(MT.fromDayTime(0, '18:00', NOW).err, 'future');
    assert.strictEqual(MT.fromDayTime(0, '', NOW).err, 'invalid');
    assert.deepStrictEqual(MT.fromDayTime(99, '15:00', NOW), { at: at(15, 0, 7) }, 'clamped to 7 days');
    assert.strictEqual(MT.fromDayTime(7, '12:00', NOW).err, 'old');
});

test('a gallery photo time is offered only when it is worth it (10 min to 7 days old); EXIF dates parse', () => {
    assert.ok(MT.photoWorth(NOW - 2 * H, NOW));
    assert.ok(!MT.photoWorth(NOW - 5 * MIN, NOW), 'a photo just taken is "Jetzt" anyway');
    assert.ok(!MT.photoWorth(NOW - 8 * 24 * H, NOW));
    assert.strictEqual(MT.parseExifDate('2026:10:28 08:05:00'), new Date(2026, 9, 28, 8, 5, 0).getTime());
    assert.strictEqual(MT.parseExifDate('garbage'), 0);
});

test('the chooser markup: one group, big buttons, the saved line is a live status, every text in EN, DE and ES', () => {
    for (const L of ['en', 'de', 'es']) for (const k of Object.keys(MT.T.en)) assert.ok(MT.T[L][k], L + ' ' + k);
    assert.strictEqual(MT.T.de.saved, 'Zeit gespeichert: {t}');
    const src = R('meal-time.js');
    assert.match(src, /role="group"/);
    assert.match(src, /class="mt-ok" role="status" aria-live="polite"/);
    assert.match(src, /setTimeout\(fromBox, 900\)/, 'the iPhone wheel counts once it settles');
    assert.match(R('meal-time.css'), /min-height: *(4[4-9]|[5-9]\d)px/, 'buttons are big enough to hit');
});

test('wiring: Log meal uses the one time button, the time holds an hour and up to 7 days, the meal lands on the day it was eaten', () => {
    const sp = R('spirit.js'), html = R('index.html');
    assert.match(sp, /mtRow\(at, 0\)/);
    assert.match(sp, /data-sp="lmTime" aria-expanded="/);
    assert.match(html, /mc\.from==="when"&&Date\.now\(\)-mc\.at<60\*60000/);
    assert.match(html, /log=\{id:data\.id,eventId:id,ts:mts,day:mday,/);
    assert.match(R('apple-ui.js'), /'herb-shop\.js','meal-time\.js'/);
    assert.ok(R('sw.js').split('meal-time.js').length >= 3, 'offline list has it');
    assert.ok(R('sw.js').split('meal-time.css').length >= 3);
});
