// Nov 5 2026 (Misty sheet plan, phase 4): the small meal photos stay on this phone. Measured: a 160 px thumbnail is about 8,600
// characters, so a year of photo meals made the saved app data (lowispike.v2) far bigger than Safari keeps, and the logs went
// into the account backup with their photos. Now thumbnails live in the photo database under 't:<id>' and the log keeps ph: 1.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const J = require('../meal-journal.js');
const Core = require('../misty-sheet-core.js');

const PIC = 'data:image/jpeg;base64,/9j/AAAA';

test('thumb(): a log with its own photo uses it, a moved log reads from this phone, nothing else is a picture', () => {
    assert.equal(J.thumb({ id: 'a', photo: PIC }), PIC);
    assert.equal(J.thumb({ id: 'b', ph: 1 }), '', 'not loaded yet: no picture, the placeholder shows');
    assert.equal(J.thumb({ id: 'c', photo: 'https://example.com/x.jpg' }), '', 'only data pictures');
    assert.equal(J.thumb(null), '');
});

test('movable(): only logs with an id and a picture are moved', () => {
    const logs = [{ id: 1, photo: PIC }, { id: 2 }, { photo: PIC }, { id: 3, photo: 'x' }, null];
    assert.deepEqual(J.movable(logs).map(l => l.id), [1]);
    assert.deepEqual(J.movable(undefined), []);
});

test('the log loses its photo only after the thumbnail is stored, and the saved data is written once', () => {
    const src = R('meal-journal.js');
    const body = src.slice(src.indexOf('function tidy()'), src.indexOf('const ping'));
    assert.ok(body.indexOf('await putThumb(id, ph)') < body.indexOf('delete l.photo'), 'store first, then clear');
    assert.match(body, /catch \(e\) \{ continue; \}/, 'a failed store keeps the photo on the log');
    assert.match(body, /l\.ph = 1/);
    assert.match(body, /if \(n\) \{ try \{ v\.save\(\); \}/);
    assert.match(src, /const TK = id => 't:' \+ String\(id\)/);
    assert.match(src, /s\.delete\(String\(id\)\); s\.delete\(TK\(id\)\)/, 'deleting a meal deletes both photos');
    assert.match(src, /if \(pic\.thumb\) \{ thumbs\.set\(String\(id\), pic\.thumb\); try \{ await tidy\(\); \}/, 'a new photo meal is moved right after it is saved');
});

test('the journal, the edit sheet and Misty\'s card read the thumbnail through thumb()', () => {
    const src = R('meal-journal.js');
    assert.match(src, /const src = thumbOf\(log\);/);
    assert.match(src, /return thumbOf\(log\);/);
    const sp = R('spirit.js');
    assert.match(sp, /MJ = window\.LowiMealJournal, ph = MJ && MJ\.thumb \? MJ\.thumb\(l\)/);
    assert.match(R('misty-sheet.js'), /thumb: W\.LowiMealJournal && W\.LowiMealJournal\.thumb/);
    assert.match(R('misty-hub.js'), /'lowi:meal-thumbs'\]\.forEach/, 'the card repaints once the thumbnails are loaded');
});

test('Misty\'s card Today: a moved meal still shows its photo, an older log its own', () => {
    const now = new Date(2026, 10, 5, 13, 0).getTime();
    const S = { logs: [{ id: 'm1', t: 'Soup', ts: now - 3600e3, ph: 1 }, { id: 'm2', t: 'Salad', ts: now - 1800e3, photo: PIC }], ledger: [], xp: 0 };
    const thumb = l => l.id === 'm1' ? 'data:image/jpeg;base64,Zm9v' : J.thumb(l);
    const d = Core.day({ now, S, fast: {}, move: {}, deps: { thumb } }, Core.dayKey(now));
    const ph = Object.fromEntries(d.meals.map(m => [m.id, m.photo]));
    assert.equal(ph.m1, 'data:image/jpeg;base64,Zm9v');
    assert.equal(ph.m2, PIC);
    const d2 = Core.day({ now, S, fast: {}, move: {}, deps: {} }, Core.dayKey(now));
    assert.equal(d2.meals.find(m => m.id === 'm2').photo, PIC, 'without the journal the log\'s own photo still shows');
    assert.equal(d2.meals.find(m => m.id === 'm1').photo, '');
});
