/* Oct 17 (E-man: "I don't like the leveling up bar. It's very big and not in our style, and it's very distracting"):
   the XP / next-form card and the level-up pop are small chips of Misty's bubble glass, not wide bars. */
const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('XP card is a compact chip: progress ring + one line, no wide bar', () => {
  const js = R('herb-quests.js');
  const pop = js.slice(js.indexOf('function pop(beforeXP, afterXP)'), js.indexOf("W.addEventListener('lowi:reward'"));
  assert.ok(pop.includes("el.className = 'hq-pop hq-chip'"), 'chip class');
  assert.ok(pop.includes('class="hq-ring"') && pop.includes("'--hq-p'"), 'ring shows progress');
  assert.ok(!pop.includes('bar(a.progress'), 'no progress bar inside the card');
  assert.ok(!/el\.style\.width = /.test(pop), 'not stretched to the Daily Quest width');
  assert.ok(pop.includes("getElementById('f3Board')") && pop.includes("el.dataset.at = 'quest'"), 'still under the Daily Quest');
  assert.ok(pop.includes("setAttribute('data-sp', 'path')"), 'tap still opens the path');
  assert.ok(/a\.meals/.test(pop) && /a\.left/.test(pop), 'XP left and meals still told (meals in the label)');
  assert.ok(pop.includes('3000)'), 'leaves after 3 s');
});

test('XP card only comes on an evolution or a new quarter, never every 15 minutes', () => {
  const js = R('herb-quests.js');
  const pop = js.slice(js.indexOf('function pop(beforeXP, afterXP)'), js.indexOf("W.addEventListener('lowi:reward'"));
  assert.ok(pop.includes('if (!evolved && quarter(a) === quarter(b)) return;'));
  assert.ok(!pop.includes('15 * 60000'));
});

test('chip CSS uses Misty glass tokens, pill shape, auto width; light mode and clean view handled; no animation loop', () => {
  const css = R('herb-quests.css'); const sec = css.slice(css.indexOf('.hq-pop.hq-chip, html.lg .hq-pop.hq-chip {'));
  assert.ok(sec.length > 100);
  assert.ok(/width: auto !important/.test(sec) && /border-radius: 99px/.test(sec));
  assert.ok(sec.includes('var(--gn-fill') && sec.includes('var(--gn-rim') && sec.includes('var(--gn-sh'));
  assert.ok(sec.includes('conic-gradient(#8fe7ff calc(var(--hq-p'));
  assert.ok(sec.includes('[data-ui="light"]') && sec.includes('html.lw-clean .hq-pop.hq-chip'));
  assert.ok(!/animation\s*:/.test(sec), 'no keyframe animation');
});

test('level-up pop is the same small glass chip, 4 s, tap still opens the unlock / map', () => {
  const b = R('beta.css'), h = R('index.html');
  const r = b.slice(b.indexOf('.r3m-pop {'));
  assert.ok(/border-radius: 99px !important/.test(r) && r.includes('var(--gn-fill') && /width: auto !important/.test(r));
  /* the solid always-visible box no longer applies to the chip; it still belongs to the bottom sheets (Oct 17 meals-sheet fix) */
  const solid = b.match(/([^{}]*)\{\s*background: var\(--b-solid\) !important;\s*background-image: none !important;\s*-webkit-backdrop-filter: none !important;\s*backdrop-filter: none !important;\s*opacity: 1;/);
  assert.ok(solid && !solid[1].includes('.r3m-pop') && solid[1].includes('.r2-sh'), 'solid box is for sheets only, not the chip');
  const pop = h.slice(h.indexOf('function pop(L){'), h.indexOf('function hookAward(){'));
  assert.ok(pop.includes('}, 4000);') && !pop.includes('}, 7000);'));
  assert.ok(pop.includes('data-r3m') && pop.includes('"unlock" : "map"'));
});
