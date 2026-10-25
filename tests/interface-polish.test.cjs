'use strict';
/* Oct 16, 2026: Move's session length picker (move-durations.css). For You videos from other platforms: they played inline
   from Oct 16 (fy-embed.js); since 25 Oct 2026 they open on the creator's platform instead (fy-embed.js now guards that). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function loadEmbed() {
    const listeners = [], opened = [];
    const doc = { documentElement: { lang: 'en' }, addEventListener: (n, f, c) => listeners.push([n, c]), querySelectorAll: () => [] };
    const win = { document: doc, addEventListener: (n, f, c) => listeners.push([n, c]), navigator: { onLine: true }, open: (u, t, f) => { opened.push([u, t, f]); return {}; } };
    win.window = win;
    const ctx = Object.assign(win, { URL, setTimeout, clearTimeout, requestAnimationFrame: f => f(), cancelAnimationFrame: () => {} });
    vm.runInNewContext(read('foryou-core.js'), ctx);
    vm.runInNewContext(read('fy-embed.js'), ctx);
    return { E: win.LowiFyEmbed, listeners, opened };
}

test('Move: the picker ships, loaded and precached', () => {
    const html = read('index.html'), sw = read('sw.js');
    assert.match(html, /<link rel="stylesheet" id="mvdCss" href="move-durations\.css\?v=[\d-]+">/);
    assert.ok(sw.includes('"move-durations.css"'));
});

test('Move: seven standard lengths, one centred group, the chosen one announced', () => {
    const html = read('index.html');
    const line = html.split('\n').find(l => l.includes('data-mv="mins"'));
    assert.ok(line.includes('[5, 10, 15, 20, 30, 45, 60]'));
    assert.ok(line.includes('mv-mins r3w-mins mvd" role="group"'));
    assert.ok(line.includes('aria-pressed="\' + (M.mins === n) + \'"'));
    assert.ok(line.includes('<b>\' + n + \'</b><small>min</small>'));
    /* the picker comes after Start in the same hero, in the normal flow */
    assert.ok(line.indexOf('mv-mins') > 0 && html.indexOf('class="btn primary mv-go"') < html.indexOf('mv-mins r3w-mins mvd'));
});

test('Move: clean, centred, never cramped, never over Start', () => {
    const css = read('move-durations.css');
    assert.ok(css.includes('justify-content: center !important'));
    assert.ok(css.includes('flex-wrap: wrap !important'), 'wraps instead of overflowing');
    assert.ok(css.includes('position: relative; inset: auto; transform: none;'), 'in the flow under Start, never floated over it');
    assert.ok(css.includes('min-height: 44px !important'), '44px touch targets');
    assert.ok(/min-width: 4\dpx !important/.test(css));
    assert.ok(css.includes('container: mvhero / inline-size'));
    assert.ok(css.includes('@container mvhero (max-width: 300px)'), 'two centred rows on a very narrow card');
    assert.ok(/\.chip\.on \{[^}]*color: #0b1d3f !important/.test(css), 'chosen length: light button, dark text');
    assert.ok(css.includes('prefers-reduced-motion: reduce'));
    assert.ok(!/gold|purple|#caa15a|#d9b56a/i.test(css), 'Misty blue, no gold or purple');
});

/* 25 Oct 2026 (Emmanuel): "if it's a video from someone else, it shouldn't play in our platform. It should take them to their
   platform." The Oct 16 inline players are gone; these tests replace the ones that asserted them. */
test('For You: the link-out guard ships, loaded and precached', () => {
    const html = read('index.html'), sw = read('sw.js');
    assert.match(html, /<script src="fy-embed\.js\?v=[\d-]+"><\/script>/);
    assert.match(html, /id="fyeCss" href="fy-embed\.css\?v=[\d-]+"/);
    assert.ok(sw.includes('"fy-embed.js"') && sw.includes('"fy-embed.css"'));
});

test('For You: a creator\'s video is never played inside LOWiSPIKE', () => {
    const js = read('fy-embed.js');
    const code = js.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/iframe|createElement|youtube-nocookie\.com\/embed|tiktok\.com\/player|\/embed\/?|player\.vimeo/i.test(code), 'no player is built');
    const { listeners } = loadEmbed();
    assert.equal(listeners.filter(([n]) => n === 'click').length, 0, 'no click is taken over to start a player');
});

test('For You: YouTube, TikTok, Instagram, Vimeo and more open the original on their platform', () => {
    const { E, opened } = loadEmbed();
    const cases = [
        ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'YouTube'],
        ['https://youtu.be/dQw4w9WgXcQ', 'youtube', 'YouTube'],
        ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube', 'YouTube'],
        ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'YouTube'],
        ['https://www.tiktok.com/@cook/video/7301234567890123456', 'tiktok', 'TikTok'],
        ['https://vm.tiktok.com/ZMabc123/', 'tiktok', 'TikTok'],
        ['https://www.instagram.com/reel/Cxyz123AbC/', 'instagram', 'Instagram'],
        ['https://vimeo.com/76979871', 'vimeo', 'Vimeo'],
        ['https://www.facebook.com/watch/?v=123', 'facebook', 'Facebook'],
        ['https://x.com/someone/status/1', 'x', 'X']
    ];
    for (const [u, plat, name] of cases) {
        const o = E.outFor(u);
        assert.ok(o, u); assert.equal(o.plat, plat, u); assert.equal(o.name, name, u); assert.equal(o.url, new URL(u).href, 'the original, unchanged: ' + u);
    }
    assert.equal(E.openOut({ url: 'https://youtu.be/dQw4w9WgXcQ' }), true);
    assert.deepEqual(JSON.parse(JSON.stringify(opened[0])), ['https://youtu.be/dQw4w9WgXcQ', '_blank', 'noopener'], 'a new tab, so iOS can hand it to the creator platform\'s app');
});

test('For You: only http(s) links on creator platforms count; nothing else is opened', () => {
    const { E, opened } = loadEmbed();
    for (const u of ['javascript:alert(1)', 'data:text/html,hi', '', null, 'not a url', 'https://example.com/video.mp4', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'https://notyoutube.com/x'])
        assert.equal(E.outFor(u), null, String(u));
    assert.equal(E.openOut({ url: 'javascript:alert(1)' }), false);
    assert.equal(opened.length, 0);
});

test('For You: the old player API stays harmless for its callers', () => {
    const { E } = loadEmbed();
    for (const k of ['closeAll', 'close', 'place']) assert.equal(typeof E[k], 'function', k);
    assert.doesNotThrow(() => { E.closeAll(); E.close(null); E.place(); });
    const nav = read('nav-moves.js');
    assert.ok(nav.includes('if (W.LowiFyEmbed) W.LowiFyEmbed.closeAll(null)'));
    assert.ok(read('community-rooms-ui.js').includes('if(W.LowiFyEmbed)W.LowiFyEmbed.closeAll(null)'));
});

test('For You: the tap opens the original, the sample says where real videos go', () => {
    const html = read('index.html');
    const line = html.slice(html.indexOf('case "open": {'), html.indexOf('case "open": {') + 900);
    assert.ok(line.includes('LowiForYou.external(p.url)'));
    assert.ok(line.includes('window.open(u, "_blank", "noopener")'));
    assert.ok(line.includes('/^https?:\\/\\//i.test(u)'), 'only http(s) is opened');
    assert.ok(line.includes("Sample post. Real videos open on the creator's own page."));
    assert.ok(!html.includes('Real videos play right here'));
});

test('For You: glass styling, blue liquid-glass buttons (see glass-controls.test.cjs), reduced motion', () => {
    const css = read('fy-embed.css'), js = read('fy-embed.js');
    assert.ok(/\.fy-meta \.fy-out \{[^}]*color: var\(--wh-glass-ink, #fff\)/.test(css));
    assert.ok(css.includes('var(--wh-glass-rim'));
    assert.ok(css.includes('prefers-reduced-motion: reduce'));
    assert.ok(!/gold|purple|herb|buddy|buddies|microbe/i.test(css + js));
});
