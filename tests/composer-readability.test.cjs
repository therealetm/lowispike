'use strict';
/* Oct 25, 2026 (readability + fit, part 2; Emmanuel's iPhone 15 Pro Max: the hint and "0/600" under the chat composer were faint
   and cut off): readable size and colour, may wrap to two lines, never under the home indicator. Split out of readability-fit.test.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const G = require('../community-galaxy.js');
test('readability-fit.css is linked, outweighs the rules it fixes and is cached for offline', () => {
  const html = read('index.html');
  const links = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1].split('?')[0]);
  assert.ok(links.length > 3);
  /* Other tests pin the end of index.html, so the file sits at the end of <head> and wins by weight instead of by order: every
     rule repeats #cmPaneChat (one id more than any rule it overrides) and every declaration is !important. */
  assert.ok(links.includes('readability-fit.css'), 'linked: ' + links.slice(-3).join(', '));
  assert.ok(fs.existsSync(path.join(ROOT, 'readability-fit.css')));
  const rf = read('readability-fit.css').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of rf.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].trim() === ':root') continue;
    for (const sel of m[1].split(',')) assert.match(sel, /#cmPaneChat#cmPaneChat/, 'outweighs the older rule: ' + sel.trim());
    for (const d of m[2].split(';').map(x => x.trim()).filter(Boolean)) assert.match(d, /!important$/, 'wins over older !important rules: ' + d);
  }
  assert.match(read('sw.js'), /readability-fit\.css/);
});

function rules(css, sel) { const out = []; const re = /([^{}]+)\{([^{}]*)\}/g; let m; while ((m = re.exec(css))) if (m[1].split(',').some(s => s.trim().includes(sel))) out.push(m[2]); return out.join(';'); }
test('composer hint and counter: 12 px or larger, may wrap to two lines, never clipped', () => {
  const css = read('readability-fit.css');
  const meta = rules(css, '.cs-compose-meta'), draft = rules(css, '#csDraft');
  const fs_ = +(meta.match(/font-size:\s*(\d+(?:\.\d+)?)px/) || [])[1];
  assert.ok(fs_ >= 12, 'hint font-size >= 12px, got ' + fs_);
  assert.match(meta, /white-space:\s*normal/);
  assert.match(draft, /white-space:\s*normal/);
  assert.match(draft, /overflow:\s*visible/);
  assert.doesNotMatch(draft, /text-overflow:\s*ellipsis|nowrap/);
});

test('Room composer: the bottom padding keeps the hint above the home indicator even when the phone reports no safe area', () => {
  const css = read('readability-fit.css');
  const pane = rules(css, '#cmPaneChat');
  assert.match(pane, /padding-bottom:\s*calc\(\s*max\(\s*var\(--sab[^)]*\)\s*,\s*(\d+)px\s*\)/, 'max(safe area, a floor)');
  const floor = +pane.match(/max\(\s*var\(--sab[^)]*\)\s*,\s*(\d+)px/)[1];
  assert.ok(floor >= 20, 'floor >= 20px, got ' + floor);
  assert.match(pane, /padding-left:\s*max\(/);
  assert.match(pane, /padding-right:\s*max\(/);
});

const core = require('../tools/readfit/core.cjs');
test('composer hint colours reach WCAG AA on the composer plate in dark and day mode', () => {
  const css = read('readability-fit.css');
  const vars = {}; for (const m of css.matchAll(/--(rf-[a-z-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  const hex = s => { s = s.replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); };
  for (const k of ['rf-hint', 'rf-hint-day', 'rf-plate', 'rf-plate-day']) assert.match(vars[k] || '', /^#[0-9a-f]{6}$/i, '--' + k + ' is a solid colour');
  assert.ok(core.contrast(hex(vars['rf-hint']), hex(vars['rf-plate'])) >= 4.5, 'dark: ' + core.contrast(hex(vars['rf-hint']), hex(vars['rf-plate'])).toFixed(2));
  assert.ok(core.contrast(hex(vars['rf-hint-day']), hex(vars['rf-plate-day'])) >= 4.5, 'day: ' + core.contrast(hex(vars['rf-hint-day']), hex(vars['rf-plate-day'])).toFixed(2));
});

/* ---------- 4. the audit ---------- */
