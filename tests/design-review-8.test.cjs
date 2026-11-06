'use strict';
/* Nov 6 2026 design review point 8 (Emmanuel, "Kleinkram"), six small fixes:
   - Swipe: the legend row (Today / Soon / Not today / Never) is gone, the buttons at the bottom say it
   - your companion's panel no longer sends you "in Fuel" (Fuel no longer exists); the gap time note no longer names Fuel either
   - Move: one big blue button (Mirror mode's start); the Mirror mode card's buttons keep their inset on the right; nothing lies under
     the round back button: the page fits above it, tight when it must (the small heading steps aside, each session tile becomes one
     row), never with a cut word, and it only scrolls (at its own size) when even the tight way does not fit
   - the Move bubble is a runner, no longer a pulse line
   - New post: the Post row stays above the round X
   - Billiards: "Middle: Name" no longer covers the name on the ball
   Browser walk (scratch, Chromium, local site, network blocked): 390x844 de and 393x852 de (tight, everything above the back
   button, no cut word), 430x932 en (as it was), 375x667 es (scrolls, nothing under the button at the end). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}

test('Swipe: no legend row; the five buttons at the bottom stay', () => {
    assert.ok(!html.includes('r3k-legend'), 'no legend markup and no legend styles left');
    const sec = fnSrc(html, 'function dkSectionHTML()');
    assert.match(sec, /'<div class="r3k-btns">' \+ b\("down", "never"\) \+ b\("left", "skip"\) \+ '<button class="r3k-b undo" data-r5="swipe-undo"/);
    assert.match(sec, /\+ b\("right", "soon"\) \+ b\("up", "today"\) \+ '<\/div>'/);
});

test('your companion\'s panel and the gap time note no longer name Fuel', () => {
    const peak = read('misty-peak.js');
    assert.ok(peak.includes("fuel_none_do: ['Log a low-spike meal', 'Trag ein Low-Spike-Essen ein', 'Registra una comida sin picos']"));
    const str = fnSrc(peak, 'const STR = {').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.deepEqual((str.match(/'[^']*\bFuel\b[^']*'/g) || []), [], 'no shown sentence in the panel says Fuel');
    const fe = read('fast-edit.js');
    assert.deepEqual(fe.match(/mealNote: '[^']*'/g), ["mealNote: 'Your logged meal \\u201c{m}\\u201d moves to this time too.'",
        "mealNote: 'Deine eingetragene Mahlzeit \\u201e{m}\\u201c wandert mit auf diese Zeit.'",
        "mealNote: 'Tu comida registrada \\u00ab{m}\\u00bb tambi\\u00e9n pasa a esta hora.'"]);
});

test('Move: one big blue button; the Mirror mode card keeps its inset on the right', () => {
    assert.match(html, /#mv-screen\.tabmode > \.stack\.g2 > \*\{padding-right:0\}\n(?:\/\*[^]*?\*\/\n)?#mv-screen\.tabmode > \.stack\.g2 > \.mm-hero\{padding-right:14px\}/, 'after the rule that took it away');
    assert.match(html, /#mv-screen \.mv-go\.btn\.primary\{background:rgba\(255,255,255,\.1\)!important;color:#eaf6ff!important;border:1\.5px solid rgba\(200,235,255,\.45\)!important;/, 'Desk Spike Breaker\'s start is glass, over the liquid-glass blue');
    assert.match(html, /html\[data-ui=light\] #mv-screen \.mv-go\.btn\.primary\{background:rgba\(10,132,255,\.08\)!important;/);
});

test('Move: the page stops above the round back button, tight before it scrolls, never a cut word', () => {
    assert.match(html, /function clearOrb\(lim\)\{ const o = D\.getElementById\("lwBX"\); if \(!o \|\| !o\.classList\.contains\("on"\) \|\| !vis\(o\)\) return lim; const t = o\.getBoundingClientRect\(\)\.top; return t > 0 \? Math\.min\(lim, t - 12\) : lim; \}/);
    const fit = fnSrc(html, 'function fitMove()');
    assert.match(fit, /const lim = clearOrb\(limit\(\)\);/);
    assert.match(fit, /for \(let tight = 0; tight < 2; tight\+\+\) \{\n    if \(tight\) \{ setV\(\{\}\); H\.classList\.add\("g2f-mvq"\); \}\n    if \(fitMoveIn\(s, lim, rows, tiles\)\) break;\n  \}/);
    assert.match(fit, /if \(bottom\(s\) > lim \+ \.5\) \{ H\.classList\.remove\("g2f-mvq"\); const v = \{\}; setV\(v\); uncut\(s, v\); H\.classList\.add\("g2f-snm"\); sp\(m, lim\); \}/, 'scrolling, it keeps its own size');
    assert.match(fit, /if \(!m\) \{ H\.classList\.remove\("g2f-snm", "g2f-mvq"\); return; \}/);
    assert.match(fnSrc(html, 'function fitMoveIn(s, lim, rows, tiles)'), /uncut\(s, v\);\n  return bottom\(s\) <= lim \+ \.5;\n\}$/);
    assert.match(html, /function sp\(el, lim\)\{ if \(!el\) return; const r = el\.getBoundingClientRect\(\); el\.style\.setProperty\("--g2fSp", Math\.max\(12, Math\.round\(r\.bottom - \(lim == null \? limit\(\) : lim\) \+ 8\)\) \+ "px"\); \}/, 'the scroll room ends above the button too');
    assert.match(html, /html\.g2f-mvq #mv-screen\.tabmode \.mv-quick-h\{display:none\}/);
    assert.match(html, /html\[data-lay=phone\]\.g2f-mvq #mv-screen\.tabmode \.stack\.g2 \.mv-fmt\{flex-direction:row;align-items:center;justify-content:flex-start;height:calc\(60px \+ var\(--g2fFmt,0px\)\);/);
    assert.match(html, /html\.g2f-mvq #mv-screen\.tabmode \.stack\.g2 \.mv-fmt \.mv-ic\{display:none\}/);
});

test('Move: a tile never gets shorter than its own words (a progress bar keeps its room)', () => {
    const set = [];
    const ctx = { setV: o => set.push(Object.assign({}, o)), getComputedStyle: e => e._cs || { position: e._pos || 'static' } };
    vm.createContext(ctx);
    vm.runInContext(fnSrc(html, 'function vis(e)') + '\n' + fnSrc(html, 'function cutBy(s, sel)') + '\n' + fnSrc(html, 'function uncut(s, v)'), ctx);
    const kid = (a, b, pos) => ({ offsetHeight: b - a, offsetWidth: 40, _pos: pos, getBoundingClientRect: () => ({ top: a, bottom: b }) });
    /* a quick tile: border 1, padding 10 / 8; icon 11-45, name 48-63.8, small line 66.8-79.45 (the words take 68.45) */
    const tile = (h, bar) => ({ offsetHeight: h, offsetWidth: 80, _cs: { borderTopWidth: '1px', borderBottomWidth: '1px', paddingTop: '10px', paddingBottom: '8px' },
        getBoundingClientRect: () => ({ top: 0, bottom: h }), querySelector: () => bar || null,
        children: [kid(11, 45), kid(48, 63.8), kid(66.8, 79.45), kid(h - 10, h - 7, 'absolute')] });
    const box = list => ({ querySelectorAll: sel => sel === '.g2-tile' ? list : [] });
    assert.equal(ctx.cutBy(box([tile(96)]), '.g2-tile'), 0, 'room to spare');
    assert.equal(ctx.cutBy(box([tile(80)]), '.g2-tile'), 9, '80px is 8.45 short: it gets 9 back');
    assert.equal(ctx.cutBy(box([tile(80, kid(70, 73))]), '.g2-tile'), 12, 'a progress bar 10px from the bottom keeps 2px to the words');
    assert.equal(ctx.cutBy(box([tile(96), tile(80)]), '.g2-tile'), 9, 'the most crowded tile decides');
    const v = { '--g2fTile': -16 };
    ctx.uncut(box([tile(80)]), v);
    assert.equal(v['--g2fTile'], -7, 'the shrink gives back what the words need');
    assert.equal(set.length, 1);
    const w = {}; ctx.uncut(box([tile(96)]), w);
    assert.deepEqual(Object.keys(w), [], 'nothing to give back, nothing set');
    assert.equal(set.length, 1);
});

test('the Move bubble is a runner, no longer a pulse line', () => {
    const css = read('home-orbit-v2.css');
    const m = css.match(/html\.o8 \{ --o8-i-move: url\("([^"]+)"\); \}/);
    assert.ok(m, 'the Move symbol');
    const svg = decodeURIComponent(m[1]);
    assert.ok(!svg.includes('M3 12h4l2.2-5.5 4.6 11 2.2-5.5h5'), 'the pulse line is gone');
    assert.match(svg, /<circle cx='14\.6' cy='4\.3' r='2' fill='black' stroke='none'\/>/, 'a head');
    assert.match(svg, /M13 7\.6 11 12\.8M11 12\.8l2\.6 3-1 4\.7M11 12\.8l-2\.4 3\.6-3\.2 1M13 7\.6l3\.2 2 2\.4-1\.4M13 7\.6l-3 1-1\.6 2\.6/, 'body, legs and arms in stride');
});

test('New post: the Post row stays above the round X', () => {
    assert.match(html, /#sheet\.r3f-sheet \.ls-postfoot\{position:sticky;bottom:calc\(var\(--sab\) \+ 84px\);z-index:3;/);
    assert.match(html, /html\[data-ui=light\] #sheet\.r3f-sheet \.ls-postfoot\{background:linear-gradient/);
});

test('Billiards: "Middle: Name" no longer covers the name on the ball', () => {
    const css = read('room-table.css');
    assert.match(css, /\.rt-mid\.on\{color:#ffd678\}\n\/\*[^*]*\*\/\n\.rt-ball\.mid \.rt-name\{visibility:hidden\}/);
    assert.ok(!/\.rt-ball\.mid \.rt-orb\{[^}]*visibility/.test(css), 'the ball itself stays');
});
