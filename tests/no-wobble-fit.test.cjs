'use strict';
/* Nov 7 2026 (Emmanuel: "When you swipe down, the whole interface moves to the left or moves to the right ... very wobbly, especially
   settings" and "If something can fit in one page, then it should clearly fit in one page ... in shuffle or in mixing, where there's
   like a little scroll ... That's stupid").
   - A sheet or page that scrolls up and down never slides sideways. The sticky grab bar of every one-sheet sheet (Settings, the
     companion's sheet, Log a meal, the lists) stuck out 8 px on each side, so the sheet scrolled 8 px sideways.
   - Cook and the Circle games fit above the round back button, and the last step shrinks the shuffle machine by exactly what is
     still over before the screen scrolls; the spacer for long pages no longer adds a small scroll of its own.
   Browser walk (scratch, Chromium, local site, network blocked, iPhone safe areas emulated): before, Settings scrolled 8 px sideways
   at 375, 390 and 393 wide, and Mischen kept a 15 px (393 x 852) / 57 px (375 x 667) scroll with the tiles under the back button;
   after, no sideways scroll on any screen walked and Mischen ends above the button with nothing to scroll. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
const oneSheet = read('one-sheet.css');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}

test('a sheet or page that scrolls up and down never scrolls sideways', () => {
    assert.ok(html.includes('.r2-sh,#sheet,#rsSheet .rs-sh,.tab,.cme-body,.ss2-page-body,.ss2-body,.ls-pane,.gv-scroll{overflow-x:hidden!important}'));
    assert.ok(html.includes('#shBody{overflow-x:hidden}'), 'Cook\'s body already did');
    assert.ok(html.includes('.r2-sh,#sheet,#rsSheet .rs-sh{overscroll-behavior:contain}'), 'and none of them pulls the page behind along');
});

test('the grab bar of a one-sheet sheet is exactly as wide as the sheet', () => {
    assert.match(oneSheet, /html:root:root body \.r2-ov\.one-sheet:not\(\.full\) \.r2-sh \{ padding-left: var\(--one-pad\) !important; padding-right: var\(--one-pad\) !important; \}/);
    assert.match(oneSheet, /html:root:root body \.r2-ov\.one-sheet:not\(\.full\) \.r2-sh > \.pf-hd \{ margin-left: calc\(-1 \* var\(--one-pad\)\) !important; margin-right: calc\(-1 \* var\(--one-pad\)\) !important; \}/);
    assert.match(html, /\.pf-hd\{position:sticky;top:0;z-index:6;height:30px;margin:-10px -22px 0;/, 'the shared bar still fits the 22 px sheets');
});

test('Cook and the Circle games fit above the round back button', () => {
    assert.match(html, /window\.LowiFit = \{limit, bottom, over, sp, gap: \(\) => gapNow, check: gapCheck, clear: clearOrb\};/);
    assert.match(html, /function fitLim\(\)\{ const F = window\.LowiFit; if \(!F\) return innerHeight; const l = F\.limit\(\); return F\.clear \? F\.clear\(l\) : l; \}/);
    assert.match(html, /function over\(b\)\{ return window\.LowiFit \? LowiFit\.bottom\(b\) > fitLim\(\) \+ \.5 : b\.scrollHeight - b\.clientHeight > 1; \}/);
    const fit = fnSrc(html, 'function fit(b){');
    assert.match(fit, /let lv = 0; while \(over\(b\) && lv < LV\.length\) \{ H\.classList\.add\(LV\[lv\]\); lv\+\+; \}\n  if \(over\(b\)\) squeeze\(b\);\n  if \(over\(b\)\) \{ H\.classList\.add\("g2f-snc"\); if \(window\.LowiFit\) LowiFit\.sp\(b, fitLim\(\)\); \}/, 'six steps, then the exact squeeze, then scrolling');
    assert.match(fit, /LV\.forEach\(c => H\.classList\.remove\(c\)\); H\.classList\.remove\("g2f-snc"\); H\.classList\.remove\("g2c-t7"\);/, 'every pass starts loose again');
});

test('the last step shrinks the shuffle machine by exactly what is still over, never under 96 px', () => {
    const ctx = {};
    vm.runInNewContext(fnSrc(html, 'function squeezeW(w, d)') + '; this.squeezeW = squeezeW;', ctx);
    assert.equal(ctx.squeezeW(132, 20), 110);
    assert.equal(ctx.squeezeW(132, 20.4), 109, 'rounds down, so it really fits');
    assert.equal(ctx.squeezeW(132, 100), 96, 'a smaller machine is no longer a machine: the screen scrolls instead');
    const sq = fnSrc(html, 'function squeeze(b){');
    assert.match(sq, /const st = b\.querySelector\("\.r5-stage"\); if \(!st \|\| !window\.LowiFit\) return;/, 'Swipen has no machine and is left alone');
    assert.match(sq, /if \(H\.style\.getPropertyValue\("--g2cSt"\) !== w2 \+ "px"\) H\.style\.setProperty\("--g2cSt", w2 \+ "px"\);/, 'no style write when nothing changed (the fit loop watches <html>)');
    assert.ok(html.includes('html.g2c-on.g2c-t7 #shelf.tabmode #shBody .r5-stage{width:var(--g2cSt,96px)}'));
});

test('a Cook screen that fits has no extra scroll room under it', () => {
    assert.ok(html.includes('html.g2c-on:not(.g2f-snc) #shelf.tabmode #shBody::after{display:none}'));
    assert.ok(html.includes('html.g2f-snc.g2c-on #shelf.tabmode #shBody::after{content:"";display:block;flex:none;order:99;height:var(--g2fSp,calc(var(--sab) + 124px))}'), 'a screen that must scroll keeps its room');
    assert.match(read('bottom-close.css'), /html\.lw-bx-on #tab-shelf #shBody::after,html\.lw-bx-on \.gv-scroll::after,/, 'other long pages keep theirs');
});

test('typing in a small text field no longer zooms the whole app in (it then slid sideways on every swipe)', () => {
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">/);
    assert.equal((html.match(/<meta name="viewport"/g) || []).length, 1);
});

test('on the sixth step the line over Cook\'s title steps aside and the machine moves up; the Swipen deck ends above the button', () => {
    assert.ok(html.includes('html.g2c-on.g2c-t6 #tab-shelf #shTop .sh-row .small.muted{display:none}'));
    assert.ok(html.includes('html.g2c-on.g2c-t6 #shelf.tabmode #shBody .r5-shuf{padding-top:10px}'));
    const deck = fnSrc(html, 'function ckFitDeck(b)');
    assert.match(deck, /let over = b\.scrollHeight - b\.clientHeight;\n[^]*?try \{ const F = window\.LowiFit; if \(F && F\.clear\) over = Math\.max\(over, Math\.ceil\(F\.bottom\(b\) - F\.clear\(F\.limit\(\)\)\)\); \} catch\(e\)\{\}\n  if \(over > 0\) st\.style\.height = Math\.max\(150, st\.offsetHeight - over - 4\) \+ "px"; \}$/);
});
