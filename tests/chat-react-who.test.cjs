'use strict';
/* Nov 7 2026 (Emmanuel: "When I long press on an emoji that someone ... reacts to the bubbles with ... a heart or the number 2 or 3,
   I should be able to see who left that"). chat-react-who.js: a long press on a reaction chip opens a small card with the reaction
   and the names (you first as "You"); a tap still toggles your own reaction; right-click does the same on a computer.
   Browser walk (scratch, Chromium, a page with the chat's chip markup): long press -> "❤️ 3 · Du, Ana, Cara", no toggle; a tap
   elsewhere closes it; a plain tap toggles once; sliding off opens nothing. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const R = require('../chat-react-who.js');
const js = read('chat-react-who.js'), chat = read('community-chat.js');

test('the names for one reaction: you first, each person once, only that message and emoji', () => {
    const rows = [{ message_id: 'm1', user_id: 'a', emoji: 'heart' }, { message_id: 'm1', user_id: 'me', emoji: 'heart' }, { message_id: 'm1', user_id: 'a', emoji: 'heart' },
        { message_id: 'm1', user_id: 'b', emoji: 'clap' }, { message_id: 'm2', user_id: 'c', emoji: 'heart' }, null];
    const names = { a: 'Ana', me: 'Me', b: 'Ben', c: 'Cara' };
    assert.deepEqual(R.who(rows, 'm1', 'heart', 'me', u => names[u]).map(p => [p.uid, p.me, p.n]), [['me', true, 'Me'], ['a', false, 'Ana']]);
    assert.deepEqual(R.who(rows, 'm1', 'clap', 'me', u => names[u]).map(p => p.n), ['Ben']);
    assert.deepEqual(R.who(null, 'm1', 'heart', 'me', u => u), []);
});

test('the chat\'s own chips: a long press, never instead of the tap', () => {
    assert.match(chat, /button\('react','<span class="cm-emo" aria-hidden="true">'\+g\+'<\/span> '\+rows\.length,'aria-label="[^]*?data-id="'\+esc\(m\.id\)\+'" data-emoji="'\+esc\(em\)\+'"/, 'the chips carry the message and the emoji');
    assert.match(js, /const D = W\.document, SEL = '\.cm-rx \[data-chat="react"\]';/);
    assert.equal(R.HOLD_MS, 450); assert.equal(R.SLOP, 10);
    assert.match(js, /swallow = \{ chip: c, until: Date\.now\(\) \+ 900 \}; open\(c\);/);
    assert.match(js, /if \(chip && chip === swallow\.chip\) \{ e\.preventDefault\(\); e\.stopPropagation\(\);/, 'the click that ends a long press does not toggle');
    assert.match(js, /D\.addEventListener\('contextmenu', e => \{ const chip = [^]*?if \(chip\) \{ e\.preventDefault\(\); open\(chip\); \} \}, true\);/, 'right-click on a computer');
    assert.match(js, /D\.addEventListener\('scroll', \(\) => \{ cancel\(\); if \(card\) close\(\); \}, true\);/);
    assert.match(read('chat-react-who.css'), /\.cm-rx \[data-chat="react"\] \{ -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; \}/);
});

test('names from the Community, then from messages, then "Member"; three languages', () => {
    assert.match(js, /H\.people \? \(H\.people\(\) \|\| \[\]\)\.find\(x => x && x\.uid === uid\)/);
    assert.match(js, /return T\('Member', 'Mitglied', 'Miembro'\);/);
    assert.match(js, /p\.me \? T\('You', 'Du', 'Tú'\) : p\.n/);
    const html = read('index.html');
    assert.match(html, /<script src="community-energy\.js\?v=[^"]+"><\/script>\n<link rel="stylesheet" href="chat-react-who\.css\?v=[^"]+">\n<script src="chat-react-who\.js\?v=[^"]+"><\/script>/, 'after the chat (and its energy add-on)');
    assert.match(read('sw.js'), /STATIC\.push\("chat-react-who\.js", "chat-react-who\.css"\);/);
});
