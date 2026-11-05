'use strict';
/* Nov 5 2026 (Emmanuel, iPhone screenshot of Circle > Billiards: the table high up, a big empty strip under it, a small aim stick cut
   off at the bottom, and words showing behind the top of the table: "Just redesign it. Actually act as a designer ... a nice billiard
   that's centered, the joystick ... reachable, big enough ... there's so much space there ... put something there like a scoreboard").
   room-table-core.js roomLayout: one control row (aim stick + scoreboard) 12 px above the round back button, the table centred in all
   the space above it. Boxes below are the Room's box (#cgGalaxy) and the back button's top as measured: his iPhone (from the
   screenshot), the test browser at 390x844 and smaller / larger phones. The words were the table's screen-reader line ("Energy blast
   at {name}") with no .sr-only rule anywhere: apple-ui.css has one now. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../room-table-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const BOXES = [
    { name: 'his iPhone (screenshot)', gw: 352, gh: 592, backTop: 499 },
    { name: 'test browser 390x844', gw: 352, gh: 654, backTop: 619 },
    { name: 'small phone', gw: 337, gh: 470, backTop: 430 },
    { name: 'large phone', gw: 392, gh: 690, backTop: 600 },
    { name: 'no back button showing', gw: 352, gh: 654, backTop: null },
    { name: 'iPad', gw: 760, gh: 900, backTop: 840 }
];

for (const b of BOXES) {
    test('pool table layout, ' + b.name + ': centred table, one control row above the back button, nothing overlaps', () => {
        const L = C.roomLayout(b), t = L.table, s = L.stick, rowBottom = s.top + s.size;
        assert.ok(Math.abs(t.left + t.width / 2 - b.gw / 2) <= 1, 'table centred left-right: ' + JSON.stringify(t));
        const above = t.top - L.room.top, below = L.room.top + L.room.height - (t.top + t.height);
        assert.ok(Math.abs(above - below) <= 1, 'table centred top-bottom in its space: ' + above + ' / ' + below);
        assert.ok(t.top + t.height <= s.top - 12, 'the table ends at least 12 px above the control row');
        assert.ok(s.size >= 84 && s.size <= 104, 'the aim stick is big enough for a thumb (>= 84 px; Apple asks 44): ' + s.size);
        assert.ok(s.left >= 14, 'the stick keeps off the edge');
        if (b.backTop != null) assert.ok(rowBottom <= b.backTop - 11, 'the row ends above the back button: ' + rowBottom + ' vs ' + b.backTop);
        assert.ok(rowBottom <= b.gh - 11, 'the row never leaves the box (the old stick sat cut off at the bottom)');
        if (L.board) {
            assert.ok(L.board.left >= s.left + s.size + 12, 'the scoreboard sits beside the stick, not on it');
            assert.ok(L.board.left + L.board.width <= b.gw - 14, 'and inside the box');
            assert.equal(L.board.top, s.top); assert.equal(L.board.height, s.size, 'same row, same height');
        }
        assert.ok(L.scale > 0.12 && L.fw > 0 && L.fh > 0);
    });
}

test('no back button showing: the row sits at the bottom of the box', () => {
    const L = C.roomLayout({ gw: 352, gh: 654, backTop: null });
    assert.ok(Math.abs(L.stick.top + L.stick.size - (654 - 12)) <= 1, 'bottom of the row: ' + (L.stick.top + L.stick.size));
});

test('his iPhone: the table now stands in the middle of its space instead of at the top with ~160 px empty under it', () => {
    const L = C.roomLayout({ gw: 352, gh: 592, backTop: 499 });
    assert.ok(L.table.top >= 8, 'not glued to the top edge any more');
    assert.ok(L.board && L.board.width >= 150, 'room for a readable scoreboard: ' + JSON.stringify(L.board));
});

test('a box too narrow for the scoreboard leaves it out instead of squeezing it', () => {
    const L = C.roomLayout({ gw: 230, gh: 500, backTop: 440 });
    assert.equal(L.board, null);
});

test('the words behind the table: screen-reader-only text is hidden from sight app-wide (and still read)', () => {
    const css = read('apple-ui.css');
    const rule = (css.match(/(^|\n)\.sr-only\{([^}]*)\}/) || [])[2] || '';
    for (const want of ['position:absolute', 'width:1px', 'height:1px', 'overflow:hidden', 'clip-path:inset(50%)', 'white-space:nowrap']) assert.ok(rule.includes(want), want);
    assert.ok(!/display:\s*none|visibility:\s*hidden/.test(rule), 'not display:none: VoiceOver still reads the live region');
    assert.match(read('room-table.js'), /<span class="sr-only rt-live" aria-live="polite"><\/span>/, 'the shot line is still announced');
});

test('scoreboard copy in English, German and Spanish; the old Freundesbaum placement is gone', () => {
    const js = read('room-table.js');
    for (const k of ['board', 'sbMid', 'sbNobody', 'sbYouFor', 'sbDay', 'sbDayV', 'sbRoom', 'sbRoomV', 'sbMin', 'sbHour']) {
        const m = new RegExp('\\n  ' + k + ":\\[('[^']*'),('[^']*'),('[^']*')\\]").exec(js);
        assert.ok(m, k + ' has EN/DE/ES');
    }
    assert.match(js, /sbDayV:\['\{h\}\/\{c\} h · \+\{x\} XP'/, 'every number says its unit (grandma test)');
    assert.doesNotMatch(js, /nm-ctree|placeStick/, 'the Freundesbaum button left the app on 5 Nov; no code waits for it');
    assert.match(js, /const L=C\.roomLayout\(\{gw,gh,backTop:backTop\(gh\)\}\)/, 'the page uses the tested layout');
});
