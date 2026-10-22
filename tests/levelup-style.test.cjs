const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('level-up card shows the same Misty as Home, in blue glass, with her cell stage name', () => {
    const js = read('herb-tamagotchi.js'), css = read('herb-tamagotchi.css');
    const evo = js.slice(js.indexOf('function evolve('), js.indexOf('function finishEvolution('));
    assert.ok(evo.includes('evoArt(m,p)'), 'evolve paints Misty through evoArt');
    assert.ok(!/plant\(m,'hero',p\)/.test(evo), 'evolve never paints the raw herb in a pot');
    assert.ok(/function evoArt\(m,p\)\{return curArt\(m,'hero',p\);\}/.test(js) && /function curArt\([^\n]*plantHTML\.cell/.test(js), 'evoArt uses the wrapped plantHTML that paints Home');
    assert.ok(evo.includes('evoStage(m)') && js.includes('LowiWorldHomeCore'), 'stage name comes from Misty cell stages');
    assert.ok(!evo.includes("lineFor('evolution'"), 'no old herb evolution lines (new leaves, pot)');
    assert.ok(!css.includes('#080d22f5'), 'old purple-space backdrop is gone');
    assert.ok(/#lhEvolution \.lh-primary\{[^}]*color:#0b1d3f/.test(css), 'continue button has dark text on light glass');
    assert.ok(!/continue:\['Hello, new leaves'/.test(js) || js.includes("tr('evoGo')"), 'button no longer says Hello, new leaves');
});

test('level toast names the cell stage', () => {
    const html = read('index.html');
    assert.ok(html.includes("const lvl = (n, t) => { try { const c = window.LowiWorldHomeCore"));
    assert.ok(!html.includes("you're a {t} now"));
});
