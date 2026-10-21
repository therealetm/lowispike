'use strict';
// Oct 21 2026, Emmanuel on his iPhone (home-screen app, dark mode): "I opened the app and there was still this for a split second.
// We don't need it. Remove it. And when I open the app it's white for 1 second. Fix that."
// 1. No launch screen: no Misty cell, no LOWiSPIKE wordmark, nothing drawn while the app gets ready.
// 2. Never white at launch: the first paint is the dark brand background, and iOS gets plain dark startup images
//    (no logo) to show before the page paints, instead of its default white.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const head = html.slice(0, html.indexOf('</head>'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
const BRAND = '#03050a';

/* Minimal PNG reader (8-bit RGB/RGBA, no interlace): size and every pixel. */
function readPng(file) {
    const b = fs.readFileSync(file);
    assert.strictEqual(b.slice(1, 4).toString(), 'PNG', file + ' is not a PNG');
    let o = 8, w, h, depth, type, inter; const idat = [];
    while (o < b.length) {
        const len = b.readUInt32BE(o), t = b.slice(o + 4, o + 8).toString(), d = b.slice(o + 8, o + 8 + len);
        if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; inter = d[12]; }
        if (t === 'IDAT') idat.push(d);
        if (t === 'IEND') break;
        o += 12 + len;
    }
    assert.ok(depth === 8 && (type === 2 || type === 6) && inter === 0, file + ': expected plain 8-bit RGB(A)');
    const bpp = type === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(stride * h);
    for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)], line = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const a = x >= bpp ? px[y * stride + x - bpp] : 0, up = y ? px[(y - 1) * stride + x] : 0, c = (x >= bpp && y) ? px[(y - 1) * stride + x - bpp] : 0;
            let v = line[x];
            if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
            else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : pb <= pc ? up : c; }
            px[y * stride + x] = v & 255;
        }
    }
    return { w, h, bpp, px };
}

const links = [...head.matchAll(/<link rel="apple-touch-startup-image" media="([^"]+)" href="([^"]+)">/g)].map(m => {
    const q = m[1], n = k => +((q.match(new RegExp(k + ':\\s*(\\d+)')) || [])[1]);
    return { media: q, href: m[2], w: n('device-width'), h: n('device-height'), r: n('-webkit-device-pixel-ratio'), land: /orientation:\s*landscape/.test(q) };
});

test('no launch screen: the boot gate draws nothing, no Misty cell and no wordmark while the app gets ready', () => {
    assert.doesNotMatch(html, /id="lwBoot"|\.id = "lwBoot"|#lwBoot|lwb-orb|lwb-w/);
    const gate = (html.match(/<script id="lwBootJs">([\s\S]*?)<\/script>/) || [])[1] || '';
    assert.ok(gate.length > 200, 'the boot gate itself stays (the finished app still shows in one step)');
    assert.doesNotMatch(gate, /createElement|appendChild|innerHTML|insertAdjacent/, 'the boot gate must not add anything to the page');
    assert.match(gate, /H\.classList\.add\("lw-boot"\)/);
    assert.match(gate, /H\.classList\.remove\("lw-boot"\)/);
});

test('first paint is dark: the brand background is set before anything else in <head>, with a dark color-scheme', () => {
    const fp = head.indexOf('<style id="firstPaint">html,body{background:' + BRAND + '}</style>');
    assert.ok(fp > 0 && fp < 1200, 'first-paint background must be one of the first things in <head>');
    assert.ok(fp < head.indexOf('data:'), 'before the big inline icons');
    assert.ok(fp < head.indexOf('<style', fp - 1) + 1 && head.indexOf('<style') === fp, 'the very first style in the page');
    assert.ok(fp < head.indexOf('<script'), 'before any script');
    const cs = head.indexOf('<meta name="color-scheme" content="dark">');
    assert.ok(cs > 0 && cs < fp, 'dark color-scheme first, so WebKit starts from a dark canvas');
    assert.match(head, new RegExp('<meta name="theme-color" content="' + BRAND + '">'));
    assert.strictEqual(manifest.background_color, BRAND);
    assert.strictEqual(manifest.theme_color, BRAND);
    assert.match(html, /html,body\{height:100%;background:var\(--bg\)/);
    assert.match(html, /:root\{--bg:#03050a;/, 'the app background the first paint hands over to is the same colour');
});

test('iOS startup images cover current iPhones and iPads, each matching its screen exactly', () => {
    assert.ok(links.length >= 20, 'startup images for the common devices');
    const has = (w, h, r) => links.some(l => l.w === w && l.h === h && l.r === r && !l.land);
    for (const [w, h, r, name] of [[375, 667, 2, 'iPhone SE'], [390, 844, 3, 'iPhone 13'], [393, 852, 3, 'iPhone 15'], [402, 874, 3, 'iPhone 16 Pro'],
        [430, 932, 3, 'iPhone 15 Pro Max'], [440, 956, 3, 'iPhone 16 Pro Max'], [375, 812, 3, 'iPhone 13 mini'], [428, 926, 3, 'iPhone 13 Pro Max'],
        [768, 1024, 2, 'iPad 9.7'], [810, 1080, 2, 'iPad 10.2'], [820, 1180, 2, 'iPad Air'], [834, 1194, 2, 'iPad Pro 11'], [1024, 1366, 2, 'iPad Pro 12.9']])
        assert.ok(has(w, h, r), 'missing startup image for ' + name);
    assert.strictEqual(new Set(links.map(l => l.media)).size, links.length, 'no duplicate media queries');
    for (const l of links) {
        assert.match(l.href, /^startup\/launch-\d+x\d+\.png$/);
        const f = path.join(root, l.href);
        assert.ok(fs.existsSync(f), l.href + ' missing');
        const b = fs.readFileSync(f), w = b.readUInt32BE(16), h = b.readUInt32BE(20);
        assert.strictEqual(b.slice(12, 16).toString(), 'IHDR');
        const ew = (l.land ? l.h : l.w) * l.r, eh = (l.land ? l.w : l.h) * l.r;
        assert.deepStrictEqual([w, h], [ew, eh], l.href + ' does not match ' + l.media + ' (iOS ignores a wrong size and shows white)');
    }
});

test('startup images are plain brand background, no logo (there is no splash)', () => {
    const want = [3, 5, 10];
    const files = [...new Set(links.map(l => l.href))];
    assert.deepStrictEqual(fs.readdirSync(path.join(root, 'startup')).sort(), files.map(f => path.basename(f)).sort(), 'every file in startup/ is linked, nothing extra');
    for (const f of files) {
        const { px, bpp } = readPng(path.join(root, f));
        for (let i = 0; i < px.length; i += bpp) {
            if (px[i] !== want[0] || px[i + 1] !== want[1] || px[i + 2] !== want[2]) assert.fail(f + ': pixel ' + (i / bpp) + ' is not ' + BRAND + ' (a logo or a stray mark)');
        }
    }
});
