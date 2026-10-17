// Oct 17, 2026 (E-man: "I clicked on the meal thingy and nothing happens apart from that X button"; "the meal bubble moved";
// "the bubbles look pixely"). Guards the three fixes.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* every selector list in a stylesheet that contains `needle`, as [selectors, body] */
function rulesWith(css, needle) {
  const out = [];
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(flat))) { const sels = m[1].split(',').map(s => s.trim()); if (sels.includes(needle)) out.push([sels, m[2]]); }
  return out;
}

test('bottom sheets are never hidden: no rule gives .r2-sh / .rs-sh / .pnl opacity 0 or the level chip pill shape', () => {
  const css = read('beta.css');
  for (const sel of ['.r2-sh', '.rs-sh', '.pnl', '.sp-sheet .r2-sh']) {
    for (const [sels, body] of rulesWith(css, sel)) {
      assert.ok(!sels.includes('.r3m-pop'), sel + ' shares a rule with .r3m-pop');
      assert.ok(!/opacity:\s*0\s*[;}]?/.test(body.replace(/opacity:\s*0\.\d+/g, '')) || /opacity:\s*1/.test(body), sel + ' gets opacity 0');
      assert.ok(!/border-radius:\s*99px/.test(body), sel + ' gets the chip pill radius');
    }
  }
  const solid = rulesWith(css, '.r2-sh').find(([, b]) => /--b-solid/.test(b));
  assert.ok(solid && /opacity:\s*1/.test(solid[1]), 'the solid sheet rule (opacity 1) is back');
});

test('the level-up chip keeps its own rule', () => {
  const css = read('beta.css');
  const chip = rulesWith(css, '.r3m-pop').find(([, b]) => /99px/.test(b));
  assert.ok(chip, 'chip rule present');
  assert.deepStrictEqual(chip[0], ['.r3m-pop']);
});

test('Meals bubble mirrors Misty\'s HOME cell, not where she flies, and holds still during the clean flight view', () => {
  const js = read('sym-home.js');
  const place = js.slice(js.indexOf('function place()'), js.indexOf('function placeDayNight'));
  assert.match(js, /function homeRect\(mi\)[\s\S]*mf-roam[\s\S]*--mf-bx[\s\S]*--mf-by/);
  assert.match(place, /mr = homeRect\(mi\)/);
  assert.doesNotMatch(place, /mr = mi\.getBoundingClientRect\(\)/);
  assert.match(place, /lw-clean[\s\S]*lw-clean-out/);
  assert.match(place, /dataset\.mode[\s\S]*idle/);
});

test('3D sharpness: the frame-time watcher never drops below 1.5x on retina and climbs back', () => {
  const js = read('body-world-3d-scene.js');
  assert.match(js, /dprFloor = Math\.min\(dprTop, \(window\.devicePixelRatio \|\| 1\) >= 2 \? 1\.5 : 1\)/);
  assert.match(js, /dpr = Math\.max\(dprFloor, dpr - 0\.25\)/);
  assert.doesNotMatch(js, /dpr = Math\.max\(1, dpr - 0\.25\)/);
  assert.match(js, /dpr = Math\.min\(dprTop, dpr \+ 0\.25\)/);
  assert.match(js, /now - dprDropAt > 20000/);
});
