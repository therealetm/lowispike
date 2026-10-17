/* Oct 17 (Eman, second take: "ich möchte alles in dem Stil von Move", meaning the TAP on Move): Meals, Fasting, Weather,
   Body sound, Today and the bubble lists bloom out of the tapped spot as one Misty membrane with Move orbs inside,
   instead of sliding up like a drawer. misty-panels.css paints it, misty-bloom.js aims it. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('misty-panels.css'), html = read('index.html'), sw = read('sw.js');
const moveCss = read('move-bubble.css'), spiritJs = read('spirit.js'), topBar = read('top-bar.js');
const bloomJs = read('misty-bloom.js'), appleUi = read('apple-ui.js'), audio = read('world-audio.js'), home = read('world-home.js');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('misty-panels.css and misty-bloom.js load after the older panel looks, versioned with the page, cached offline', () => {
  const at = html.indexOf('misty-panels.css?v=');
  assert.ok(at > 0, 'linked');
  for (const f of ['today-sheet.css', 'scan-screens.css', 'world-home.css', 'misty-pop.css']) assert.ok(at > html.lastIndexOf(f + '?v='), 'after ' + f);
  const b = (html.match(/<meta name="lowi-build" content="([^"]+)"/) || [])[1] || (html.match(/misty-pop\.css\?v=([0-9-]+)/) || [])[1];
  assert.ok(b && html.includes('misty-panels.css?v=' + b), 'same build as the page');
  assert.ok(html.includes('misty-bloom.js?v=' + b), 'bloom script, same build');
  assert.ok(/const STATIC = \[[^\]]*"misty-panels\.css", "misty-bloom\.js"/.test(sw), 'offline cache');
  assert.equal((sw.match(/"misty-bloom\.js"/g) || []).length, 2, 'cached and network-first like its neighbours');
});

test('the surface is Move\'s orb membrane, not the long-press graphite glass', () => {
  assert.ok(!/rgba\(28, 28, 30, \.86\)/.test(rules), 'the graphite sheet of the first take is gone');
  assert.ok(/--mb-rim:\s*rgba\(143, 231, 255, \.55\)/.test(rules), 'Move orb rim');
  assert.ok(/--mb-orb:[^;]*rgba\(20, 60, 120, \.5\)[^;]*rgba\(155, 135, 210, \.45\)[^;]*rgba\(143, 231, 255, \.6\)/.test(rules), 'the orb gradient copied from .wm-orb');
  assert.ok(/\.wm-orb\s*\{[^}]*rgba\(20, 60, 120, \.5\)/.test(moveCss), 'and .wm-orb still uses it');
  const surface = rules.slice(rules.indexOf('/* ---------- 1.') >= 0 ? 0 : 0, rules.indexOf('background: var(--mb-surface)'));
  for (const sel of ['#sheet:has(> .fst-sh)', '.r2-ov.sp-sheet:not(.full) .r2-sh', '.r2-ov.wm-sheet-ov:not(.full) .r2-sh', '#whToday.wh-today', '#tbWx .tbw-sheet', '.wa-panel']) assert.ok(surface.includes(sel), sel);
  assert.ok(/border-radius:\s*var\(--mb-r\)/.test(rules) && /--mb-r:\s*34px/.test(rules), 'round on every corner');
  assert.ok(/rgba\(4, 10, 30, \.32\)/.test(rules) && /rgba\(4, 10, 30, \.32\)/.test(moveCss), 'Move\'s light veil');
});

test('floating, not docked: every panel is lifted 10 px off the edges', () => {
  assert.ok(/\.r2-sh\.mb-on\s*\{[^}]*width:\s*calc\(100% - 20px\)[^}]*margin:\s*0 auto calc\(env\(safe-area-inset-bottom, 0px\) \+ 10px\)/.test(rules));
  assert.ok(/#sheet:has\(> \.fst-sh\)\s*\{[^}]*left:\s*10px[^}]*right:\s*10px/.test(rules));
  assert.ok(/#whToday\.wh-today\s*\{[^}]*width:\s*min\(calc\(100% - 20px\), 600px\)/.test(rules));
  assert.ok(/#tbWx \.tbw-sheet\s*\{[^}]*width:\s*calc\(100% - 20px\)/.test(rules));
});

test('the bloom: from the tapped spot, small and round, Move\'s spring; back into it on close; nothing with reduced motion', () => {
  assert.ok(/@keyframes mb-in\s*\{\s*from\s*\{[^}]*translate:\s*var\(--mb-dx[^}]*scale:\s*\.14[^}]*border-radius:\s*50%/.test(rules));
  assert.ok(/@keyframes mb-out\s*\{\s*to\s*\{[^}]*translate:\s*var\(--mb-dx[^}]*scale:\s*\.18/.test(rules));
  assert.ok(/cubic-bezier\(\.3, 1\.6, \.5, 1\)/.test(rules) && /cubic-bezier\(\.3, 1\.6, \.5, 1\)/.test(moveCss), 'the orbs pop with the Move orb spring');
  for (const s of ['.r2-sh.mb-on.mb-in', '.wa-panel.mb-on.mb-in', '#sheetwrap.open #sheet.mb-on', '#tbWx.in .tbw-sheet.mb-on', '.wh-today-open body #whToday.mb-on']) assert.ok(rules.includes(s), 'opens: ' + s);
  for (const s of ['.r2-sh.mb-on.mb-out', '.wa-panel.mb-on.mb-out', '#sheetwrap:not(.open) #sheet.mb-on', '#tbWx:not(.in) .tbw-sheet.mb-on', ':not(.wh-today-open) body #whToday.mb-on']) assert.ok(rules.includes(s), 'closes: ' + s);
  const motion = rules.slice(rules.indexOf('@media (prefers-reduced-motion: no-preference)'));
  assert.ok(motion.indexOf('animation: mb-in') > 0, 'the bloom only plays when motion is welcome');
  assert.ok(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.mb-on[^}]*animation:\s*none/.test(rules));
  assert.ok(/\.mb-out \.26s/.test(rules.replace('mb-out .26s', '.mb-out .26s')) && /setTimeout\(fin, 320\)/.test(bloomJs), 'close is short and always finishes');
});

test('quick choices are Move orbs: fasting times, Snap food / Scan, the weather readings, the round buttons', () => {
  assert.ok(/\.fst-chips \.chip\s*\{[^}]*width:\s*64px[^}]*height:\s*64px[^}]*border-radius:\s*50%[^}]*var\(--mb-orb\)/.test(rules));
  assert.ok(/\.sp-quick-cap button\s*\{[^}]*width:\s*104px[^}]*border-radius:\s*50%[^}]*var\(--mb-orb\)/.test(rules));
  assert.ok(/\.tbw-facts > div\s*\{[^}]*aspect-ratio:\s*1[^}]*border-radius:\s*50%/.test(rules));
  assert.ok(/\.tbw-hr\s*\{[^}]*border-radius:\s*999px[^}]*var\(--mb-orb\)/.test(rules));
  assert.ok(/\.sp-quick-item em\s*\{[^}]*border-radius:\s*50%/.test(rules), 'the quick-log + is an orb');
  assert.ok(/\.fst-chips \.chip\.on\s*\{[^}]*var\(--mb-chosen\)/.test(rules), 'the picked time fills mint like a Move orb');
  assert.ok(/:nth-child\(2\)\s*\{\s*--mb-i:\s*1;/.test(rules) && /animation-delay:\s*calc\(140ms \+ var\(--mb-i, 0\) \* 40ms\)/.test(rules), 'one after another, 40 ms apart like Move');
});

test('touch targets stay big and the main action is Move\'s mint', () => {
  assert.ok(/\.wa-x\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/.test(rules));
  assert.ok(/\.sp-quick-item\s*\{[^}]*min-height:\s*54px/.test(rules));
  assert.ok(/\.fst-go,[\s\S]*?\.sp-next\s*\{[^}]*var\(--mb-go\)[^}]*border-radius:\s*999px/.test(rules));
  assert.ok(/#tbWx \.tbw-top \.tbw-btn\s*\{[^}]*position:\s*absolute[^}]*bottom:[^}]*width:\s*52px/.test(rules), 'Weather Refresh and Close stay at the bottom right for the right thumb');
  assert.ok(/#tbWx \.tbw-body\s*\{[^}]*padding-bottom:\s*82px/.test(rules));
  assert.ok(!/display:\s*none/.test(rules), 'nothing hidden');
});

test('the selectors match markup that exists', () => {
  for (const c of ['fst-sh', 'fst-title', 'fst-sum', 'fst-chips', 'fst-go', 'fst-earn', 'id="sheetwrap"']) assert.ok(html.includes(c), c);
  for (const c of ['sp-quick-log', 'sp-quick-cap', 'sp-quick-item', 'sp-herb-tip', 'sp-manual', "cls: 'sp-sheet'"]) assert.ok(spiritJs.includes(c), c);
  for (const c of ['tbw-top', 'tbw-btn', 'data-tbw="refresh"', 'data-tbw="close"', 'tbw-body', 'tbw-sheet']) assert.ok(topBar.includes(c), c);
  for (const c of ['wa-panel', 'wa-x', 'wa-row']) assert.ok(audio.includes(c), c);
});

test('the hooks: every panel is aimed before it shows, and folds back on close', () => {
  assert.ok(/LowiBloom\.wants\(sh,opts\)/.test(appleUi) && /y:bloom\?0:/.test(appleUi), 'r2 sheets skip the slide-up');
  assert.ok(/if\(bloom\)LowiBloom\.open\(sh\);else settle\(s,0,0\)/.test(appleUi));
  assert.ok(/s\.bloom&&s\.y<12&&LowiBloom\.close\(s\.sh/.test(appleUi), 'a dragged-down sheet still springs away downwards');
  assert.ok(/LowiBloom\.prep\(\$\("#sheet"\)\); \}catch\(e\)\{\} \$\("#sheetwrap"\)\.classList\.add\("open"\)/.test(html), 'Fasting, before it opens');
  assert.ok(/LowiBloom\.prep\(ov\.querySelector\('\.tbw-sheet'\)\)[\s\S]{0,80}classList\.add\('in'\)/.test(topBar), 'Weather, before .in');
  assert.ok(/LowiBloom\.prep\(box\)[\s\S]{0,60}wh-today-open/.test(home), 'Today, before it opens');
  assert.ok(/LowiBloom\.open\(p\)/.test(audio) && /LowiBloom\.close\(p, \(\) => p\.remove\(\)\)/.test(audio), 'Body sound');
  assert.equal((audio.match(/querySelector\('\.wa-panel:not\(\.mb-ghost\)'\)/g) || []).length, 3, 'a closing Body sound panel no longer counts as open');
});

/* a tiny DOM, enough to run misty-bloom.js */
function el(cls, opts = {}) {
  const set = new Set(cls ? cls.split(' ') : []);
  const e = {
    id: opts.id || '', parentNode: opts.parent || null, style: { props: {}, setProperty(k, v) { this.props[k] = v; } },
    classList: { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c) },
    get className() { return [...set].join(' '); }, offsetWidth: 1, listeners: {},
    addEventListener(n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); },
    querySelector: q => (opts.has || []).some(h => q.split(',').includes(h)) ? {} : null,
    getBoundingClientRect: () => opts.rect || { left: 10, top: 400, width: 370, height: 400 },
    closest: () => opts.closest || null,
  };
  return e;
}
function load(reduced) {
  const listeners = {};
  const ctx = { performance: { now: () => 1000 }, setTimeout: (f) => f(), innerWidth: 390, innerHeight: 844,
    matchMedia: () => ({ matches: !!reduced }), document: { addEventListener: (n, f) => { listeners[n] = f; } } };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(bloomJs, ctx);
  return { B: ctx.LowiBloom, listeners };
}

test('which panels bloom: Home\'s panels yes, full-screen and unrelated sheets no', () => {
  const { B } = load();
  assert.equal(B.wants(el('r2-sh'), { cls: 'sp-sheet' }), true, 'Meals');
  assert.equal(B.wants(el('r2-sh'), { cls: 'wm-sheet-ov' }), true, 'Move / Meals bubble list');
  assert.equal(B.wants(el('r2-sh'), { cls: 'sp-sheet', full: true }), false, 'full screen');
  assert.equal(B.wants(el('r2-sh'), { cls: 'cook-recipe' }), false, 'other sheets keep their slide');
  assert.equal(B.wants(el('', { id: 'sheet', has: ['.fst-sh'] })), true, 'Fasting');
  assert.equal(B.wants(el('', { id: 'sheet' })), false, 'other legacy sheets');
  assert.equal(B.wants(el('tbw-sheet')), true, 'Weather');
  assert.equal(B.wants(el('wa-panel')), true, 'Body sound');
  assert.equal(B.wants(el('', { id: 'whToday' })), true, 'Today');
});

test('prep aims the panel\'s centre at the tapped bubble', () => {
  const { B, listeners } = load();
  const bubble = { getBoundingClientRect: () => ({ left: 60, top: 460, width: 80, height: 80 }) };
  listeners.pointerdown({ target: { closest: () => bubble } });
  const p = el('tbw-sheet', { rect: { left: 10, top: 300, width: 370, height: 500 } });
  assert.equal(B.prep(p), true);
  assert.equal(p.style.props['--mb-dx'], (100 - 195) + 'px');
  assert.equal(p.style.props['--mb-dy'], (500 - 550) + 'px');
  assert.ok(p.classList.contains('mb-on') && !p.classList.contains('mb-measure'));
  const other = el('', { id: 'sheet' }); other.classList.add('mb-on');
  assert.equal(B.prep(other), false); assert.equal(other.classList.contains('mb-on'), false, 'a non-Fasting legacy sheet drops the bloom');
});

test('close folds back and always hands over, at once with reduced motion', () => {
  const { B } = load(true);
  const p = el('wa-panel'); B.open(p);
  let done = 0; assert.equal(B.close(p, () => done++), true); assert.equal(done, 1);
  assert.ok(p.classList.contains('mb-out') && !p.classList.contains('mb-in'));
  assert.equal(B.close(el('wa-panel'), () => done++), false, 'not bloomed: the caller closes it its own way');
  const { B: B2 } = load(false); const q = el('wa-panel'); B2.open(q); let d2 = 0; B2.close(q, () => d2++); assert.equal(d2, 1, 'the timer fallback finishes it even without animationend');
});
