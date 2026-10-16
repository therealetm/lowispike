'use strict';
/* Oct 16, 2026 (Emmanuel: "everything should conform"): the Today Day/Night (sun/moon) button and the For You inline-video
   Close / Open on ... buttons wear the same blue liquid glass as the weather pill and Daily Quest. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
/* the last rule that starts a line with exactly this selector */
const rule = (css, sel) => { let i = css.lastIndexOf('\n' + sel + '{'); if (i < 0) i = css.lastIndexOf('\n' + sel + ' {'); assert.ok(i >= 0, 'missing rule ' + sel); return css.slice(i, css.indexOf('}', i) + 1); };

test('the weather pill still owns the tokens the glass buttons copy', () => {
    const wh = read('world-home.css');
    const pill = rule(wh, 'html.spirit-app.wh-home #tab-home #spHome .sp-weather, html.spirit-app.wh-home #tab-home #spHome .sp-weather.ask');
    for (const t of ['var(--wh-glass-rim)', 'var(--wh-glass-wide)', 'var(--wh-glass-sh)', 'var(--wh-glass-ink)', 'blur(10px) saturate(1.4)', 'height: 44px']) assert.ok(pill.includes(t), t);
});

test('Today: the sun/moon button is the weather pill glass, round, 44 px, same place and tap', () => {
    const css = read('top-bar.css'), js = read('top-bar.js');
    const r = rule(css, 'html #tbTheme#tbTheme');
    for (const t of ['width:44px', 'height:44px', 'border:1.5px solid var(--wh-glass-rim', 'background:var(--wh-glass-wide', 'box-shadow:var(--wh-glass-sh', 'color:var(--wh-glass-ink',
        'backdrop-filter:blur(10px) saturate(1.4)', '-webkit-backdrop-filter:blur(10px) saturate(1.4)']) assert.ok(r.includes(t), t);
    assert.match(css, /#tbTheme\{position:absolute;[^}]*border-radius:50%/, 'still a circle');
    /* the margins grow top-bar.js's 38 px box to 44 px around the same centre: tied to its size and 10 px gap */
    assert.ok(r.includes('margin:-3px 0 0 -2px'));
    assert.ok(js.includes('const size = 38;') && js.includes('x = Math.round(left - size - 10)') && js.includes('y = Math.round(top + (h - size) / 2)'), 'placement unchanged');
    assert.match(js, /if \(held\) \{ held = false; return; \} toggleTheme\(\);/, 'tap still flips Day/Night');
    /* the old dark thin-outlined look no longer wins */
    assert.ok(css.indexOf('html #tbTheme#tbTheme{') > css.indexOf('html[data-ui=light] #tbTheme{'));
});

test('For You: Close and Open on ... are blue liquid-glass pills, 44 px, readable', () => {
    const css = read('fy-embed.css');
    const b = rule(css, '.fy-slide > .fye .fye-btn');
    for (const t of ['min-height: 44px', 'min-width: 44px', 'border: 1.5px solid var(--wh-glass-rim', 'background: var(--wh-glass-wide', 'box-shadow: var(--wh-glass-sh', 'color: var(--wh-glass-ink',
        'backdrop-filter: blur(10px) saturate(1.4)', 'font-weight: 700', 'rgba(8, 20, 48, .42)']) assert.ok(b.includes(t), t);
    assert.ok(!css.includes('rgba(246, 251, 255, .96)'), 'the old white pill is gone');
    assert.match(css, /html\[data-theme="light"\] \.fy-slide > \.fye \.fye-btn \{ background: var\(--wh-glass-wide\), rgba\(235, 243, 255, \.66\)/);
    assert.match(css, /\.fye\.fye-narrow \.fye-x \{ width: 44px; padding: 0; \}/);
});

test('For You: the buttons get their room above the caption and never reach the like rail', () => {
    const js = read('fy-embed.js');
    assert.ok(js.includes("let bar = 52;"), '44 px buttons + 8 px gap reserved');
    assert.ok(js.includes("barEl.style.width = Math.round(availW) + 'px'"), 'the bar spans the free column left of the rail');
    assert.ok(js.includes("right = Math.max(12, sr.right - rr.left + 8)"), 'the free column ends before the rail');
    assert.ok(js.includes("box.classList.add('fye-narrow')") && js.includes('bar = barEl.offsetHeight + 8'), 'two rows are compacted or reserved');
});

test('For You: the Back button over the player wears the same glass', () => {
    const css = read('nav-moves.css');
    const r = rule(css, '.nm-layer-fy .nm-back');
    for (const t of ['var(--wh-glass-rim', 'var(--wh-glass-wide', 'var(--wh-glass-sh', 'blur(10px) saturate(1.4)']) assert.ok(r.includes(t), t);
});
