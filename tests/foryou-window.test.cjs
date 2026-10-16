/* Cook > For You (Oct 16, 2026). E-man on his iPhone: "I click on post, and it's just not working. It's stuck. The For You page
   keeps appearing... the window kind of opens for a second." And: For You should open like Shuffle and Swipe, as a window in Cook. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function fnSource(src, head) {
    const i = src.indexOf(head); assert.ok(i >= 0, head + ' exists');
    let depth = 0, j = src.indexOf('{', i);
    for (let k = j; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (!depth) return src.slice(i, k + 1); } }
    throw new Error('unbalanced ' + head);
}

/* Replays the real postSheet() from index.html against the app's own tab rules: goTab() closes any open sheet, and the
   old Community feed route (cmSetView('feed')) re-opens For You in Cook 60 ms later (nav-moves.js). */
function runPost(withNavMoves) {
    const html = read('index.html');
    const timers = [];
    const log = [];
    const ctx = {
        TAB: 'shelf', sheetOpen: false, composed: 0, log,
        esc: s => String(s), T: s => s, XI: '',
        $: () => ({ classList: { add() { } }, scrollTop: 0 }),
        setTimeout: (f, ms) => { timers.push([ms || 0, f]); return timers.length; },
        console,
    };
    ctx.window = ctx;
    ctx.goTab = t => { log.push('goTab:' + t); ctx.TAB = t; ctx.sheetOpen = false; };
    ctx.sheet = () => { log.push('sheet'); ctx.sheetOpen = true; };
    ctx.TRIBE = { composeInto: () => { ctx.composed++; } };
    if (withNavMoves) {
        ctx.LowiNavMoves = { open: k => { if (ctx.TAB !== 'shelf') ctx.goTab('shelf'); log.push('open:' + k); } };
        ctx.cmSetView = v => { if (v === 'feed') ctx.setTimeout(() => ctx.LowiNavMoves.open('fy'), 60); };
    } else ctx.cmSetView = () => { };
    vm.createContext(ctx);
    vm.runInContext(fnSource(html, 'function postSheet(') + '\npostSheet();', ctx);
    timers.sort((a, b) => a[0] - b[0]).forEach(t => t[1]());
    return ctx;
}

test('Post from Cook > For You opens the posting window and it stays open (no tab switch that closes it)', () => {
    const c = runPost(true);
    assert.strictEqual(c.sheetOpen, true, 'the New post window is still open after every timer ran: ' + c.log.join(' > '));
    assert.strictEqual(c.composed, 1, 'the composer (link, video, photo, caption) is filled in');
    assert.strictEqual(c.TAB, 'shelf', 'you stay in Cook');
    assert.ok(!c.log.some(x => x.startsWith('goTab')), 'no tab change while posting: ' + c.log.join(' > '));
});

test('without nav-moves (old layout) Post still opens on the Community feed', () => {
    const c = runPost(false);
    assert.strictEqual(c.sheetOpen, true);
    assert.deepStrictEqual(c.log, ['goTab:foryou', 'sheet']);
});

test('after posting, the feed opens where it lives (Cook window), not through the Community tab', () => {
    const html = read('index.html');
    const show = fnSource(html, 'function showFeed(');
    assert.match(show, /nm\.open\("fy"\)/);
    assert.match(show, /renderForYou\(\)/);
    assert.match(html, /save\(\); C = null; h\.closeSheet\(\); showFeed\(\);/, 'link / photo / text posts');
    assert.match(html, /if \(window\.LowiNavMoves && TRIBE\.showFeed\) TRIBE\.showFeed\(\);/, 'video posts');
    assert.match(html, /renderForYou, compose, showFeed,/);
    // uploaded videos play in the Cook window too (they used to need the Community tab)
    assert.match(html, /if \(nm && nm\.isOpen && nm\.isOpen\("fy"\)\) return !h \|\| h\.tab\(\) === "shelf";/);
});

test('For You is a window in Cook, in the spot of the Shuffle game and the Swipe cards', () => {
    const js = read('nav-moves.js');
    assert.match(js, /return k === 'fy' \? \$\('#tab-shelf #shBody > #ckBar'\) : null;/, 'it lives right under Cook\'s top row');
    assert.match(js, /bar\.after\(L\)/);
    assert.match(js, /L\.classList\.toggle\('fyw', !!bar\)/);
    assert.match(js, /H\.classList\.toggle\('nm-fyw', !!bar\)/);
    // Shuffle or Swipe closes it; a Cook re-render puts it back under the new top row
    assert.match(js, /closest\('#tab-shelf #ckBar \[data-ck="view"\]'\)/);
    assert.match(js, /if \(LAY\.fy && \(!LAY\.fy\.hidden \|\| LAY\.fy\.classList\.contains\('fyw'\)\)\) \{ layer\('fy'\); marks\(\); fit\(\); \}/);
    // the For You button lights up while the window is open, and closing it stops any playing video
    assert.match(js, /D\.querySelectorAll\('#tab-shelf \.ck-fy'\)\.forEach\(b => \{ b\.classList\.toggle\('on', on\)/);
    assert.match(js, /W\.LowiFyEmbed\.closeAll\(null\)/);
    assert.match(js, /W\.LowiNavMoves = \{ open, show, isOpen, solo, align, fit \};/);
});

test('the window keeps Cook on screen and uses the blue liquid glass; posts swipe up and down inside it', () => {
    const css = read('nav-moves.css');
    assert.match(css, /html\.nm-open-fy:not\(\.nm-fyw\) #tab-shelf > :not\(\.nm-layer\) \{ visibility: hidden !important; \}/, 'Cook is only hidden in the full-screen fallback');
    const win = css.slice(css.indexOf('#tab-shelf .nm-layer-fy.fyw {'));
    assert.match(win, /border: 1\.5px solid var\(--wh-glass-rim/);
    assert.match(win, /background: var\(--wh-glass-wide/);
    assert.match(win, /box-shadow: var\(--wh-glass-sh/);
    assert.match(win, /border-radius: 26px; overflow: hidden;/);
    assert.match(css, /html\.nm-open-fy\.nm-fyw #tab-shelf #shBody > :is\(#r5Shuf, #r3kSwipe, #g2cTiles, #r3kYes, #r3kAll\) \{ display: none !important; \}/);
    assert.match(css, /#tab-shelf \.nm-layer-fy\.fyw \.fy-feed \{ height: 100%; touch-action: pan-y; overscroll-behavior: contain; \}/);
    assert.match(css, /#tab-shelf \.nm-layer-fy\.fyw \.fyv-fab \{ top: 12px; left: 12px; right: auto; \}/, 'Post sits inside the window, clear of the like/chat column');
    assert.match(css, /prefers-reduced-motion: reduce\) \{ #tab-shelf \.nm-layer-fy\.fyw \{ animation: none; \}/);
});

test('the inline video player ignores the notch inside the window and Chat on a post goes to the Community chat', () => {
    const emb = read('fy-embed.js');
    assert.match(emb, /classList\.contains\('fyw'\) \? 48 /);
    const js = read('nav-moves.js');
    assert.match(js, /closest\('\.nm-layer-fy \[data-tr="comment"\]'\)/);
    assert.match(js, /go\('foryou'\); setTimeout\(\(\) => \{ try \{ W\.cmComment\(who\);/);
});
