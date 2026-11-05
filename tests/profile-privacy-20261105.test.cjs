/* Nov 5 2026 (owner): "the wrong old profile bubble thing ... the Pisces logo ... the bubble filling up ... nuke it";
   "I clicked on this Privacy and quiet thing button ... and nothing happened"; Antje's card: the Block line cut off at the bottom. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function bubbleFn() {
    const html = read('index.html');
    const a = html.indexOf('function bubble(p, size, o){'), b = html.indexOf('R3.bubble = bubble;', a);
    assert.ok(a > 0 && b > a, 'the avatar function is still R3.bubble');
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const safeImg = s => (typeof s === 'string' && /^(https:|data:image\/)/.test(s)) ? s : '';
    return new Function('esc', 'safeImg', html.slice(a, b) + '; return bubble;')(esc, safeImg);
}

test('the avatar is a plain round photo: no water level, glass, glow or star-sign badge', () => {
    const bubble = bubbleFn();
    const out = bubble({ n: 'eman', s: 11, lv: 7, prog: 0.6, avatar: 'https://x.test/a.jpg' }, 52, { signTap: true });
    assert.match(out, /class="lb3"/);
    assert.match(out, /<img class="lb3-ph" src="https:\/\/x\.test\/a\.jpg"/);
    assert.doesNotMatch(out, /lb3-(sg|lvl|g|c|w|wave|glow|bb|max)\b|data-r3="sign"|--lvl|[\u2648-\u2653]/);
    const ini = bubble({ n: 'antje', s: 3 }, 40);
    assert.match(ini, /lb3-ini">A</);
    assert.doesNotMatch(ini, /lb3-sg|--lvl/);
});

test('the old bubble styles and their animations are gone', () => {
    const html = read('index.html');
    for (const k of ['.lb3-sg', '.lb3-lvl', '.lb3-wave', '.lb3-glow', '.lb3-bb', 'lb3sway', 'lb3caus', 'r3aGlow', 'r3aWave', '.lb3-max']) assert.ok(!html.includes(k), k + ' is removed');
    assert.ok(!/signTap/.test(html), 'no star-sign tap on the avatar');
});

test('the Settings profile row draws its own plain avatar, no ring', () => {
    const css = read('community-me.css');
    const rule = css.slice(css.indexOf('.cme-av {'), css.indexOf('}', css.indexOf('.cme-av {')));
    assert.doesNotMatch(rule, /box-shadow|border:/);
    assert.match(read('community-me.js'), /R3\.bubble\(R3\.me\(\), 52\)/);
});

test('one plain name for the privacy page, its Settings row and the button on your own card', () => {
    const chat = read('community-chat.js'), me = read('community-me.js');
    assert.match(chat, / presence:\['Privacy & quiet hours','Privatsphäre & Ruhezeiten','Privacidad y horas de silencio'\]/);
    assert.match(chat, / controls:\['Privacy & quiet hours','Privatsphäre & Ruhezeiten','Privacidad y horas de silencio'\]/);
    assert.ok(!chat.includes("'Privacy & quiet'") && !chat.includes('Your presence'), 'old names gone');
    assert.match(me, /presence: 'Privacy & quiet hours'/);
});

test('sheets opened from a person card open above the People list (they opened behind it)', () => {
    const js = read('people-directory.js'), css = read('people-directory.css');
    assert.match(js, /new MutationObserver\(liftSheets\)/);
    assert.match(js, /lift\.disconnect\(\)/);
    assert.match(css, /\.r2-ov\.pd-above\{z-index:2147482995!important\}/);
});

test('Block sits right after the details with its line under it, not under the sheet edge', () => {
    const chat = read('community-chat.js');
    const i = chat.indexOf('<div class="cp-blk">'), j = chat.indexOf("tr('pcSharedNote')", i - 400);
    assert.ok(i > 0 && j > i, 'Block comes before the closing note');
    assert.match(read('community-chat.css'), /\.cs-sheet \.cp-blk>button\[data-chat="block"\]\{[^}]*min-height:44px/);
});
