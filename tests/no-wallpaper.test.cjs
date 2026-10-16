'use strict';
/* Oct 16, 2026 (E-man: "I hate the wallpaper. Remove it, kill it completely."; see DECISIONS.md).
   1. The flat Metabolic Spirit World picture never comes back as a backdrop anywhere; the living 3D world is the only spirit world.
   2. The in-app check-in bubble (#n1B) never sits in the status bar: a card in the content column on the iPad side rail,
      above the Scan orb on a phone, never above the safe area. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const shipped = () => fs.readdirSync(root).filter(f => /\.(js|css|html|webmanifest)$/.test(f));

test('no spirit-world picture files and no reference to them in shipped code', () => {
    const dir = path.join(root, 'spirit');
    if (fs.existsSync(dir)) {
        const raster = fs.readdirSync(dir).filter(f => /\.(webp|jpe?g|png|avif|gif)$/i.test(f));
        assert.deepStrictEqual(raster, [], 'no picture files in spirit/');
    }
    for (const f of shipped()) {
        assert.ok(!/metabolic-spirit-world/i.test(read(f)), f + ' must not reference the spirit-world picture');
    }
});

test('no raster wallpaper: no url(...png/jpg/webp) backgrounds in the app CSS, inline styles or scripts', () => {
    const re = /url\(\s*['"]?(?!data:|blob:)[^)'"]*\.(?:webp|jpe?g|png|avif|gif)(?:\?[^)'"]*)?['"]?\s*\)/i;
    for (const f of shipped()) {
        const m = read(f).match(re);
        assert.ok(!m, f + ' has a raster background ' + (m && m[0]));
    }
});

test('Community spirit layer is only the readability veil over the live world', () => {
    const css = read('community-spirit.css'), js = read('community-spirit.js');
    assert.ok(!/<picture|<img|background-image/i.test(js + css), 'no image layer in community-spirit');
    assert.ok(!/metabolic-spirit-world/.test(read('sw.js')), 'not precached');
});

test('the realm backdrop, if present, carries no picture', () => {
    for (const f of ['realm-backdrop.js', 'realm-backdrop-core.js', 'realm-backdrop.css']) {
        if (!fs.existsSync(path.join(root, f))) continue;
        const s = read(f);
        assert.ok(!/<picture|<img|\.rw-img|IMAGE\s*=|spirit\//.test(s), f + ' must not draw the picture');
    }
});

test('check-in bubble: side rail gives a card in the content column under the safe area and the top row', () => {
    const html = read('index.html');
    const i = html.indexOf('function place(){ const b = D.getElementById("n1B")');
    assert.ok(i > 0, 'n1 place() found');
    const src = html.slice(html.indexOf('function safe(){'), html.indexOf('function show(n){', i));
    assert.ok(/safe-area-inset-top/.test(src), 'reads the real safe area');
    assert.ok(/function rail\(\)/.test(src) && /r\.height > innerHeight \* 0\.5 && r\.right < innerWidth \* 0\.5/.test(src), 'detects the side rail');
    assert.ok(/if \(rr\) \{ placeCard\(b, rr, sa\); return; \}/.test(src), 'side rail -> card');
    assert.ok(/rr \? rr\.right : sa\.l\) \+ m/.test(src), 'card starts right of the rail');
    assert.ok(/Math\.max\(sa\.t \+ 12, tr \? tr \+ 10 : 0\)/.test(src), 'card top under the safe area and the top row');
    assert.ok(/< sa\.t \+ 8\) \{ placeCard\(b, null, sa\); return; \}/.test(src), 'phone: never above the safe area');
    assert.ok(/#n1B\.n1-card \.n1-tail\{display:none\}/.test(html), 'no tail on the card');
    assert.ok(/html #n1B,html:not\(\[data-ui=light\]\) #n1B\{[^}]*--wh-glass-rim/.test(html), 'blue liquid glass');
    assert.ok(/#n1B \.n1-btn\{[^}]*min-height:44px/.test(html), '44px buttons');
});

test('check-in bubble placement maths: rail layout lands below the safe area, right of the rail, on screen', () => {
    /* the same arithmetic as placeCard() for an iPad landscape 1180x820 with a 24px status bar and a 16..232 rail */
    const sa = {t: 24, r: 0, b: 20, l: 0}, rr = {right: 232}, innerWidth = 1180, innerHeight = 820, h = 140, m = 16;
    const L = Math.round(rr.right + m), R = Math.round(innerWidth - sa.r - m), W0 = Math.round(Math.min(360, R - L));
    const left = Math.round(L + (R - L - W0) / 2);
    for (const tr of [0, 60, 156, 194]) {
        const maxT = Math.max(sa.t + 10, innerHeight - sa.b - h - 16);
        const top = Math.round(Math.min(maxT, Math.max(sa.t + 12, tr ? tr + 10 : 0)));
        assert.ok(top >= sa.t + 12, 'below the status bar');
        assert.ok(!tr || top >= tr + 10, 'below the top row');
        assert.ok(top + h <= innerHeight - sa.b, 'fully on screen');
    }
    assert.ok(left >= rr.right + m && left + W0 <= innerWidth - m, 'inside the content column, clear of the rail');
});
