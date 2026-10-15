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

test('Community shows the galaxy alone: no tabs, no big title, no Privacy & quiet button', () => {
    const css = read('nav-moves.css');
    assert.match(css, /#tab-foryou\.nm-solo \.ls-phd \{ display: none !important; \}/);
    assert.match(css, /#tab-foryou\.nm-solo #cmTrack > \.ls-pane:not\(#cmPaneChat\) \{ display: none !important; \}/);
    assert.match(css, /html\.nm-on #cmPaneChat \.cp-bar, html\.nm-on #cmPaneChat #csControls \{ display: none !important; \}/);
});
