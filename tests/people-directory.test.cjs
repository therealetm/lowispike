'use strict';
/* Oct 24, 2026 (Emmanuel): browse everyone in the app, offline people and people he has not added too, with human names
   and pictures, and open their human profile. Pins people-directory-core.js (who is listed, search, safe pictures, words),
   and the wiring: a discreet People / Leute / Personas entry in the Community menu, the list taken from the Add a friend
   list (real humans only), blocked people left out, the person card on tap, no numbers, levels, presence or health data,
   Friends Tree untouched, the files loaded and cached, reduced motion and safe areas in the CSS. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const P = require('../people-directory-core.js');

const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');

test('lists everyone given (offline too), one row per id, sorted by name, without you or blocked people', () => {
    const list = [
        { uid: U(3), n: 'zoe', avatar: 'https://x.supabase.co/a.png', w: 82, lv: 9, xp: 900, online: false },
        { uid: U(1), n: '  Anna   Berg ', avatar: '' },
        { uid: U(2), n: 'Émile', avatar: 'javascript:alert(1)' },
        { uid: U(1), n: 'Anna Berg' },
        { uid: U(4), n: 'Blocked Bob' },
        { uid: U(5), n: 'Me Myself' },
        { uid: '', n: 'No Id' },
        { uid: U(6), n: '   ' },
        null
    ];
    const rows = P.build(list, { blocked: id => id === U(4), me: U(5) });
    assert.deepStrictEqual(rows.map(r => r.n), ['Anna Berg', 'Émile', 'zoe']);
    assert.deepStrictEqual(rows.map(r => r.uid), [U(1), U(2), U(3)]);
    assert.strictEqual(rows[2].img, 'https://x.supabase.co/a.png');
    assert.strictEqual(rows[1].img, '', 'unsafe picture URLs fall back to initials');
    for (const r of rows) assert.deepStrictEqual(Object.keys(r).sort(), ['img', 'n', 'uid'], 'a row carries only id, name and picture (no weight, level, XP or presence)');
});

test('name search ignores case and accents and matches word starts', () => {
    const rows = P.build([{ uid: U(1), n: 'Anna Berg' }, { uid: U(2), n: 'Émile Durand' }, { uid: U(3), n: 'Bernd' }]);
    assert.deepStrictEqual(P.match(rows, 'emi').map(r => r.n), ['Émile Durand']);
    assert.deepStrictEqual(P.match(rows, 'BER').map(r => r.n), ['Anna Berg', 'Bernd']);
    assert.deepStrictEqual(P.match(rows, 'an be').map(r => r.n), ['Anna Berg']);
    assert.deepStrictEqual(P.match(rows, 'nna').map(r => r.n), []);
    assert.strictEqual(P.match(rows, '  ').length, 3);
});

test('pictures: only https and inline images; initials otherwise', () => {
    assert.strictEqual(P.safeImg('https://a.b/c.jpg'), 'https://a.b/c.jpg');
    assert.strictEqual(P.safeImg('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64,iVBORw0KGgo=');
    for (const bad of ['http://a.b/c.jpg', 'javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'https://a.b/"onerror="x', '']) assert.strictEqual(P.safeImg(bad), '', bad);
    assert.strictEqual(P.initials('anna berg'), 'AB');
    assert.strictEqual(P.initials('Émile'), 'É');
    assert.strictEqual(P.initials(''), '?');
});

test('every word exists in English, German and Spanish, and the entry is People / Leute / Personas', () => {
    for (const [k, row] of Object.entries(P.T)) {
        assert.strictEqual(row.length, 3, k);
        for (const s of row) assert.ok(typeof s === 'string' && s.trim(), k);
    }
    assert.deepStrictEqual(P.T.entry, ['People', 'Leute', 'Personas']);
    assert.strictEqual(P.tr('open', 1, { n: 'Anna' }), 'Profil von Anna öffnen');
    /* discreet: no member count anywhere in the words */
    for (const row of Object.values(P.T)) for (const s of row) assert.ok(!/\{(c|count|num)\}|\d/.test(s), 'no numbers in: ' + s);
});

test('Community menu has the discreet People entry that opens the directory', () => {
    const ui = read('community-rooms-ui.js');
    assert.match(ui, /mDir:\['People','Leute','Personas'\]/);
    assert.match(ui, /it\.push\(\['dir',[^\]]*tr\('mDir'\)\]\)/);
    assert.match(ui, /k==='dir'\)\{try\{W\.LowiPeopleDir\.open\(\);/);
});

test('the directory reuses the real-human list, leaves blocked people out and opens the human person card', () => {
    const js = read('people-directory.js');
    assert.match(js, /LowiCellRoom\.people\(\)/, 'list comes from the Add a friend list (bots, test, hidden and owner accounts removed)');
    assert.match(js, /LowiCommunity\.blocked\(uid\)/, 'blocked people are left out');
    assert.match(js, /LowiCommunity\.openProfile\(r\.uid, r\.n\)/, 'tap opens the person card');
    assert.ok(!/\.(w|lv|xp|glu|weight|online)\b/.test(js.replace(/\/\*[\s\S]*?\*\//g, '')), 'no health data, levels or presence read in the directory');
    assert.ok(!/LOWI_CLOUD\.people\(\)\s*\|\|\s*\[\]\)\.map/.test(js), 'never builds rows straight from the raw profiles list');
    const cr = read('cell-room.js');
    assert.match(cr, /people:\(\)=>onePerName\(roomPeople\(\)\)/, 'cell-room exposes the same list Add a friend uses');
    const cc = read('community-chat.js');
    assert.match(cc, /blocked:id=>!!id&&blocked\(String\(id\)\)/, 'community-chat exposes its block check');
    /* Friends Tree stays friends-only: the directory never paints into the tree */
    assert.ok(!/cr-tree|openTree|paintTree/.test(js));
});

test('the card sits above the directory and Chat / Energy close it', () => {
    const js = read('people-directory.js'), css = read('people-directory.css');
    assert.match(js, /classList\.add\('pd-above'\)/);
    assert.match(css, /\.cs-overlay\.pd-above\{z-index:(\d+)!important\}/);
    const above = +css.match(/\.cs-overlay\.pd-above\{z-index:(\d+)/)[1], dir = +css.match(/\.pd-ov\{[\s\S]*?z-index:(\d+)/)[1];
    assert.ok(above > dir, 'person card above the directory');
    assert.match(js, /data-chat=\\?"select-close\\?"/);
    assert.match(js, /data-chat=\\?"energy\\?"/);
});

test('dialog semantics, reduced motion, safe areas and touch sizes', () => {
    const js = read('people-directory.js'), css = read('people-directory.css');
    assert.match(js, /'role', 'dialog'/);
    assert.match(js, /'aria-modal', 'true'/);
    assert.match(js, /e\.key === 'Escape'/);
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /safe-area-inset-top/);
    assert.match(css, /\.pd-x\{[^}]*width:44px;height:44px/);
    assert.match(css, /min-height:60px/);
    assert.ok(!/--ms-|--rm-/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'own --pd-* tokens only');
    /* Oct 24 2026 back and close sweep: the only gesture is the sheet's swipe down on its header (dragDown), the same one the
       tutorial teaches as sheet-drag; everything else stays click and keyboard. */
    const noDrag = js.slice(0, js.indexOf('function dragDown(')) + js.slice(js.indexOf('function close('));
    assert.ok(!/pointerdown|touchstart|mousedown/.test(noDrag), 'click and keyboard only, apart from the sheet swipe down');
    assert.ok(require('../tutorial-steps.js').GESTURES.find(g => g.id === 'sheet-drag').src.includes('people-directory.js'), 'the swipe down is the taught sheet-drag');
});

test('files are loaded by the page and cached by the service worker', () => {
    const html = read('index.html'), sw = read('sw.js');
    for (const f of ['people-directory-core.js', 'people-directory.js']) {
        assert.match(html, new RegExp('<script src="' + f.replace('.', '\\.') + '\\?v='));
        assert.ok(sw.includes('"' + f + '"'), f + ' in sw.js STATIC');
    }
    assert.match(html, /<link rel="stylesheet" href="people-directory\.css\?v=/);
    assert.ok(sw.includes('"people-directory.css"'));
    assert.ok(html.indexOf('people-directory-core.js') < html.indexOf('people-directory.js?'), 'core before UI');
});

test('What\'s New tour has the People step', () => {
    const S = require('../tutorial-steps.js');
    const s = S.STEPS.find(x => x.id === 'new-people');
    assert.ok(s && s.area === 'new' && s.where === 'community');
    for (const l of ['en', 'de', 'es']) assert.ok(s.text[l] && s.title[l], l);
    assert.match(s.text.de, /Leute/);
    assert.match(s.text.es, /Personas/);
});
