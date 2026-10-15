'use strict';
/* Oct 16: one Liquid Glass design for every tab (E-man: "it doesn't even look like it's the same app"). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html'), css = read('liquid-glass.css'), js = read('liquid-glass.js'), sw = read('sw.js');

test('the Liquid Glass layer is loaded after the per-screen styles, with the shell build, and cached by the service worker', () => {
    const build = (html.match(/name="lowi-build" content="([0-9-]+)"/) || [])[1];
    assert.ok(build);
    assert.ok(html.includes('id="lgCss" href="liquid-glass.css?v=' + build + '"'));
    assert.ok(html.includes('<script src="liquid-glass.js?v=' + build + '"></script>'));
    assert.ok(html.indexOf('id="lgCss"') > html.indexOf('community-galaxy.css'));
    assert.ok(sw.includes('"liquid-glass.css"') && sw.includes('"liquid-glass.js"'));
});

test('the UI never goes light any more: light/day only changes the world', () => {
    assert.ok(!/\[data-theme="?light"?\]/.test(html), 'index.html styles no longer key on data-theme=light');
    for (const f of ['apple-ui.css', 'top-bar.css', 'community-chat.css', 'community-galaxy.css', 'micro-book.css', 'fast-edit.css', 'finch-extras.css'])
        assert.ok(!/\[data-theme="?light"?\]/.test(read(f)), f);
    assert.ok(!/data-ui/.test(js), 'nothing turns the light UI back on');
    /* world files keep their day look */
    assert.ok(/\[data-theme="?light"?\]/.test(read('body-world-3d.css')));
});

test('one palette: black space, glass widgets, iOS blue, no gold / beige / per-tab tint', () => {
    assert.ok(/html\.lg, html\.lg\[data-atm\] body, html\.lg body \{ background: #000 !important; \}/.test(css), 'no beige strip under the tab bar');
    assert.ok(css.includes('--gold: #0a84ff !important') && css.includes('--lg-blue: #0a84ff'));
    assert.ok(/#main > \.tab:not\(#tab-home\) \{ background-color: #000/.test(css));
    assert.ok(/backdrop-filter: var\(--lg-blur\)/.test(css));
    assert.ok(/html\.lg #app #main #tabbar \.tb\.active \{ color: #fff !important; background: rgba\(255, 255, 255, \.16\)/.test(css));
    assert.ok(/-apple-system/.test(css));
    assert.ok(!/#caa15a|#ecd08f|#f4dea5|#d8b66f/i.test(css));
});

test('the glue marks the visible tab on <html> and keeps the sheet last', () => {
    assert.ok(js.includes("H.classList.add('lg')"));
    assert.ok(js.includes("setAttribute('data-lg-tab'"));
    assert.ok(js.includes("getElementById('lgCss')"));
});
