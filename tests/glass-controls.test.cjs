'use strict';
/* Oct 16, 2026 (Emmanuel: "everything should conform"): the Today Day/Night (sun/moon) button and the For You inline-video
   Close / Open on ... buttons (since 25 Oct 2026 the "Watch on ..." pill) wear the same blue liquid glass as the weather pill and Daily Quest. */
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
    assert.match(js, /if \(taps === 1\) \{ toggleTheme\(\); return; \}/, 'tap still flips Day/Night');
    /* the old dark thin-outlined look no longer wins */
    assert.ok(css.indexOf('html #tbTheme#tbTheme{') > css.indexOf('html[data-ui=light] #tbTheme{'));
});

/* 25 Oct 2026: the inline players are gone (a creator's video opens on their platform). Their Close / Open buttons are
   replaced by one "Watch on ..." pill, which wears the same glass. */
test('For You: "Watch on ..." wears the same blue liquid glass, 44px, readable in light mode', () => {
    const css = read('fy-embed.css');
    const b = rule(css, '.fy-meta .fy-out');
    for (const t of ['var(--wh-glass-ink, #fff)', 'var(--wh-glass-rim', 'var(--wh-glass-wide', 'var(--wh-glass-sh', 'blur(10px)', 'min-height: 44px', 'border-radius: 22px'])
        assert.ok(b.includes(t), t);
    assert.ok(css.includes('html[data-theme="light"] .fy-meta .fy-out {'), 'light mode keeps it readable');
    assert.ok(css.includes('.fy-meta .fy-out:focus-visible'), 'visible keyboard focus');
});

test('For You: the creator card sits in the caption column, under the caption, never over the slide', () => {
    const html = read('index.html');
    const i = html.indexOf('function slideHTML'), slide = html.slice(i, html.indexOf('function sharePost', i));
    assert.ok(slide.indexOf('<div class="fy-meta">') > 0 && slide.indexOf('<div class="fy-meta">') < slide.indexOf('fyOut(p, ex)'), 'inside the caption column');
    const css = read('fy-embed.css');
    assert.ok(!/position: (absolute|fixed)/.test(rule(css, '.fy-meta .fy-out')), 'in the flow');
    assert.ok(rule(css, '.fy-meta .fy-love').includes('max-width: 34ch'));
});

test('For You: the Back button over the player wears the same glass', () => {
    const css = read('nav-moves.css');
    const r = rule(css, '.nm-layer-fy .nm-back');
    for (const t of ['var(--wh-glass-rim', 'var(--wh-glass-wide', 'var(--wh-glass-sh', 'blur(10px) saturate(1.4)']) assert.ok(r.includes(t), t);
});
