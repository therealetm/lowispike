// Oct 22 2026 (Emmanuel: "Look and sound should have world sound inside of it."): World sound is a card inside
// Profile > Look & sound, not its own Settings row; the saved choice (lowi.worldAudio) is read and written exactly as before.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const SS = require('../home-settings-sleep-v2.js'), C = require('../world-audio-core.js');
const js = read('world-audio.js'), html = read('index.html'), css = read('world-audio.css');

test('Settings has no separate World sound row any more; Look & sound is still there', () => {
    const all = { has: () => true };
    assert.ok(!SS.SETTINGS_IDS.includes('worldSound'));
    assert.ok(SS.SETTINGS_IDS.includes('look'));
    assert.ok(!SS.entries('settings', all).includes('worldSound'));
    assert.ok(SS.pageGroups(all).every(g => !g.ids.includes('worldSound')));
    assert.strictEqual(SS.MORE_REMOVED.worldSound, 'look', 'recorded where it went');
});

test('the World sound card is filed under the Look & sound part of Profile', () => {
    assert.match(html, /c\.contains\("sfx-sec"\) \|\| c\.contains\("wa-look"\)\) return "look"/);
    assert.match(js, /className = 'card wa-look'/);
    assert.match(js, /querySelector\(':scope > \.sfx-card'\) \|\| tab\.querySelector\(':scope > \.r2-look'\)/, 'sits after the Sounds card (or Day & night)');
    assert.match(css, /\.wa-look \{/);
});

test('the card has the switch, the volume and the sound pad, in EN/DE/ES', () => {
    assert.match(js, /data-wa-look="on" role="switch" aria-checked="/);
    assert.match(js, /data-wa-look="vol"/);
    assert.match(js, /data-wa-look="pad" aria-haspopup="dialog"/);
    for (const l of ['en', 'de', 'es']) for (const k of ['look', 'lookSub', 'lookPad', 'vol']) assert.ok(C.t(k, l), k + ' ' + l);
    assert.strictEqual(C.t('look', 'de'), 'Weltklang');
    /* the same switch and saved prefs as the world panel: setOn, save(), lowi.worldAudio */
    assert.match(js, /dataset\.waLook === 'on'\) \{ st\.userOff = st\.on; setOn\(!st\.on\)/);
    assert.match(js, /matches\('\.wa-look input\[data-wa-look=vol\]'\)\) save\(\)/);
    assert.strictEqual(C.KEY, 'lowi.worldAudio', 'existing users keep their saved volume and warp choice');
    assert.deepStrictEqual(C.loadPrefs('{"vol":70,"warp":false}'), { vol: 70, warp: false });
});

test('Open the sound pad goes Home and opens the same Body sound panel', () => {
    assert.match(js, /function openPadFromLook\(\)/);
    assert.match(js, /W\.lowiOpen\('home'\)/);
    assert.match(js, /if \(uiHost\(\)\) \{ ensureUi\(\); togglePanel\(true\); return; \}/);
    assert.match(js, /openFromLook: openPadFromLook/);
});

test('the tutorial card says where World sound is now', () => {
    const S = require('../tutorial-steps.js'), st = S.STEPS.find(s => s.id === 'world-sound');
    assert.match(st.text.en, /Look & sound/);
    assert.match(st.text.de, /Aussehen & Ton/);
    assert.match(st.text.es, /Aspecto y sonido/);
});
