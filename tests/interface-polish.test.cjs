'use strict';
/* Oct 16, 2026: Move's session length picker (move-durations.css) and For You videos playing inline (fy-embed.js). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function loadEmbed() {
    const listeners = [];
    const doc = { documentElement: { lang: 'en' }, addEventListener: (n, f, c) => listeners.push([n, c]), querySelectorAll: () => [] };
    const win = { document: doc, addEventListener: () => {}, navigator: { onLine: true } };
    win.window = win;
    vm.runInNewContext(read('fy-embed.js'), Object.assign(win, { URL, setTimeout, clearTimeout, requestAnimationFrame: f => f(), cancelAnimationFrame: () => {} }));
    return { E: win.LowiFyEmbed, listeners };
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

test('For You: the inline player ships, loaded and precached', () => {
    const html = read('index.html'), sw = read('sw.js');
    assert.match(html, /<script src="fy-embed\.js\?v=[\d-]+"><\/script>/);
    assert.match(html, /id="fyeCss" href="fy-embed\.css\?v=[\d-]+"/);
    assert.ok(sw.includes('"fy-embed.js"') && sw.includes('"fy-embed.css"'));
    assert.ok(html.indexOf('nav-moves.js') < html.indexOf('fy-embed.js'), 'loads after the module that moves For You into Cook');
});

test('For You: official players for YouTube, TikTok, Instagram and Vimeo', () => {
    const { E } = loadEmbed();
    const yt = E.embedFor('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s');
    assert.equal(yt.plat, 'youtube');
    assert.ok(yt.src.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?'));
    assert.ok(yt.src.includes('playsinline=1') && yt.src.includes('start=90'), 'plays inline on iPhone, keeps the start time');
    assert.equal(E.embedFor('https://youtu.be/dQw4w9WgXcQ').plat, 'youtube');
    assert.equal(E.embedFor('https://youtube.com/shorts/dQw4w9WgXcQ').ar, 9 / 16, 'Shorts are tall');
    const tt = E.embedFor('https://www.tiktok.com/@cook/video/7234567890123456789');
    assert.ok(tt.src.startsWith('https://www.tiktok.com/player/v1/7234567890123456789?'), 'TikTok embed player');
    assert.equal(E.embedFor('https://vm.tiktok.com/ZMabc/').resolve, true, 'short links resolve through TikTok oEmbed');
    assert.equal(E.embedFor('https://www.instagram.com/reel/Cabc123/').src, 'https://www.instagram.com/reel/Cabc123/embed/');
    assert.equal(E.embedFor('https://www.instagram.com/p/Cabc123/?igsh=1').src, 'https://www.instagram.com/p/Cabc123/embed/');
    assert.ok(E.embedFor('https://vimeo.com/76979871').src.startsWith('https://player.vimeo.com/video/76979871?'));
});

test('For You: only what cannot be embedded falls back to opening outside', () => {
    const { E } = loadEmbed();
    ['https://example.com/recipe', 'https://www.youtube.com/@channel', 'https://www.tiktok.com/@x/photo/7234567890123456789', 'javascript:alert(1)', '', 'not a url']
        .forEach(u => assert.equal(E.embedFor(u), null, u));
    const js = read('fy-embed.js');
    assert.ok(js.includes("const emb = embedFor(p.url); if (!emb) return;"), 'no embed: the legacy handler opens it outside');
    assert.ok(js.includes('p.demo || p.vid) return;'), 'sample posts and uploaded videos keep their legacy behaviour');
    assert.ok(read('index.html').includes('Sample post. Real videos play right here.'), 'the sample note no longer says links leave the app');
    assert.ok(js.includes("class=\"fye-btn fye-out\" href="), 'every player keeps an Open on ... fallback link');
    assert.ok(js.includes('rel="noopener noreferrer"'));
});

test('For You: one player at a time, inside the slide, stopped when it scrolls away', () => {
    const { listeners } = loadEmbed();
    assert.ok(listeners.some(([n, c]) => n === 'click' && c === true), 'capture phase, ahead of the legacy feed handler');
    const js = read('fy-embed.js');
    assert.ok(js.includes("closest('#fyFeed')"), 'only the For You feed');
    assert.ok(js.includes('closeAll(slide)'));
    assert.ok(js.includes('intersectionRatio < 0.5) closeIn'), 'scrolling to the next post stops the video');
    assert.ok(js.includes("f.src = 'about:blank'"), 'closing really stops playback');
    assert.ok(js.includes('allow="autoplay; encrypted-media; picture-in-picture; fullscreen'));
    assert.ok(js.includes("querySelector('.fy-rail')") && js.includes("querySelector('.fy-meta')"), 'sits beside the rail and above the caption');
    assert.ok(js.includes("slide.classList.add('fye-tall')") && read('fy-embed.css').includes('.fy-slide.fye-tall > .fy-meta'), 'tall players get the caption space on short screens');
});

test('For You: glass styling, light buttons with dark text, reduced motion', () => {
    const css = read('fy-embed.css'), js = read('fy-embed.js');
    assert.ok(/\.fye-btn \{[^}]*color: #0b1d3f/.test(css));
    assert.ok(css.includes('var(--wh-glass-rim'));
    assert.ok(css.includes('prefers-reduced-motion: reduce'));
    assert.ok(css.includes('.fy-slide.fye-on > .fy-play { opacity: 0 !important; pointer-events: none !important; }'));
    assert.ok(!/gold|purple|herb|buddy|buddies|microbe/i.test(css + js));
});
