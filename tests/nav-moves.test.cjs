/* Navigation moves (Oct 15, 2026): For You lives in Cook, Leaderboard lives in Move, Community is the galaxy alone. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('nav-moves is loaded after the galaxy chat and cached by the service worker', () => {
    const html = read('index.html');
    const chat = html.indexOf('<script src="community-chat.js'), css = html.indexOf('href="nav-moves.css'), js = html.indexOf('<script src="nav-moves.js');
    assert.ok(chat > 0 && css > chat && js > css, 'nav-moves.css + nav-moves.js come after community-chat.js');
    const sw = read('sw.js');
    assert.ok(sw.includes('"nav-moves.js"') && sw.includes('"nav-moves.css"'), 'both files are in the offline shell');
});

test('For You opens inside Cook and Leaderboard inside Move', () => {
    const js = read('nav-moves.js');
    assert.match(js, /fy: \{ tab: 'shelf', root: '#tab-shelf', pane: 'cmPaneFeed'/);
    assert.match(js, /lb: \{ tab: 'move', root: '#tab-move', pane: 'cmPaneBoard'/);
    // the real panes are moved, so their id-scoped styles and renderers keep working
    assert.match(js, /body\.appendChild\(p\)/);
    assert.match(js, /TRIBE\.renderForYou\(f\)/);
    assert.match(js, /LowiR3F\.paintBoard\(\)/);
});

test('old For You / Leaderboard routes land in Cook / Move; a galaxy drag never does', () => {
    const js = read('nav-moves.js');
    assert.match(js, /if \(swipeGuard\) return s0\.call\(this, 'chat'\);/);
    assert.match(js, /open\(x === 'feed' \? 'fy' : 'lb'\)/);
    assert.match(js, /W\.cmSetView = v;/);
    assert.match(js, /W\.renderCommunity = r;/);
});

test('Oct 20: with the galaxy alone the chat pane is never made inert (2nd visit: box could not be tapped)', () => {
    const js = read('nav-moves.js');
    assert.match(js, /if \(typeof W\.cmPanesInert === 'function' && !W\.cmPanesInert\.__nm\)/);
    assert.match(js, /if \(x\.id === 'cmPaneChat'\) x\.removeAttribute\('inert'\); else x\.setAttribute\('inert', ''\);/);
    assert.match(js, /try \{ cmPanesInert = p; \} catch \(e\) \{ \}/);
    // the original is still a plain global the wrapper can replace, and both callers use the bare name
    const html = read('index.html');
    assert.match(html, /\nfunction cmPanesInert\(i\)\{/);
    assert.match(html, /cmPanesInert\(i\);\s*\n\s*\$\$\("#cmSeg button"\)/);
    assert.match(html, /try \{ cmPanesInert\(i\); \} catch\(e\)\{\}/);
});

test('Community declutter (Oct 21): small privacy icon, labelled friends tree, Milestones row gone from Move (23 Oct)', () => {
    const js = read('nav-moves.js'), css = read('nav-moves.css');
    // Oct 22: the privacy shield badge next to the Community name is gone (Your presence lives in the profile panel)
    assert.doesNotMatch(js, /s\.className = 'nm-cpriv'/);
    assert.match(js, /const old = pane\.querySelector\('\.rm-head > \.nm-cpriv'\); if \(old\) old\.remove\(\);/);
    // friends tree: a labelled button in the galaxy, opened by cell-room.js through data-cr="tree"
    assert.match(js, /t\.className = 'nm-ctree'; t\.dataset\.cr = 'tree'/);
    assert.match(js, /T\('Friends tree', 'Freundesbaum', '\\u00c1rbol de amigos'\)/);
    assert.match(read('cell-room.js'), /if\(a==='tree'&&/);
    // 23 Oct (E-man: one board, the companion Ranking): the Milestones row and the Care board card are no longer in Move
    assert.doesNotMatch(js, /m\.className = 'card nm-milescard'/);
    assert.match(read('finch-extras.js'), /if \(a === 'miles'\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); openMiles\(\); \}/);
    // labels are only written when they change (tick() runs on every DOM change: no endless loop)
    assert.match(js, /if \(sp\.textContent !== tl\)/);
    assert.match(js, /raf = 0; hook\(\); align\(\); privacy\(\); communityTools\(\); moveCard\(\);/);
});

test('Community shows the galaxy alone: no tabs, no big title, no Privacy & quiet button', () => {
    const css = read('nav-moves.css');
    assert.match(css, /#tab-foryou\.nm-solo \.ls-phd \{ display: none !important; \}/);
    assert.match(css, /#tab-foryou\.nm-solo #cmTrack > \.ls-pane:not\(#cmPaneChat\) \{ display: none !important; \}/);
    assert.match(css, /html\.nm-on #cmPaneChat \.cp-bar, html\.nm-on #cmPaneChat #csControls \{ display: none !important; \}/);
});
