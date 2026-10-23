/* Oct 16 polish (E-man's 11 screenshots): Cook, Move and Home quick fixes. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('Cook: eBook | Recipes | Products, and For You sits between Shuffle and Swipe', () => {
    const html = read('index.html');
    assert.match(html, /seg\("src", "community", ckT\("Recipes", "Rezepte", "Recetas"\), s === "community"\)/);
    assert.ok(!html.includes('seg("src", "community", "Community"'), 'no Community segment in Cook');
    const i = html.indexOf('seg("view", "shuffle"'), j = html.indexOf('class="ck-b ck-fy" data-nm="fy"'), k = html.indexOf('seg("view", "swipe"');
    assert.ok(i > 0 && j > i && k > j, 'Shuffle | For You | Swipe');
});

test('the old top-right For You / Leaderboard pills are gone', () => {
    assert.match(read('nav-moves.css'), /html\.nm-on \.nm-pill \{ display: none !important; \}/);
});

test('Move: no board card under the title any more (23 Oct: the companion Ranking in Community replaced it), Safety shield gone, notes under Start', () => {
    const js = read('nav-moves.js'), css = read('nav-moves.css');
    assert.doesNotMatch(js, /nm-lbcard'; c\.dataset\.nm = 'lb'/);
    assert.match(js, /querySelectorAll\(':scope > \.nm-lbcard, :scope > \.nm-milescard'\)\.forEach\(o => o\.remove\(\)\)/);
    assert.match(js, /class="nm-safe" data-mv="safety"/);
    assert.match(js, /tl\.insertAdjacentHTML\('afterend', '<p class="nm-safeline"/);
    assert.match(css, /html\.nm-on \.g2-safe \{ display: none !important; \}/);
});

test('Home: the drag / zoom hint is Misty talking, and every Home control shares her glass bubble', () => {
    const js = read('world-home.js'), css = read('world-home.css');
    assert.match(js, /h\.classList\.toggle\('wh-say', say\)/);
    assert.match(js, /mr\.top - h\.offsetHeight - 10/);
    assert.match(css, /\.wh-hint\.wh-say::after/);
    assert.match(css, /html\.wh-home #spHome \.f3-board \{ background: radial-gradient/);
    assert.match(css, /html\.wh-home \.wh-hud \.wh-zoom, html\.wh-home \.wh-hud \.wa-btn\.wa-home \{ border-radius: 50%; \}/);
});
