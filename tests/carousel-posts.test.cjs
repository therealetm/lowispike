'use strict';
/* Nov 6 2026 carousels in For You (Emmanuel, 5 Nov: post carousels, "swipe right through the pictures", MAYA-HANDOFF 0.41 item 5).
   A photo post takes up to 6 photos; the first is the cover (photo / photo_url, as every photo post has). The others are stored next
   to it (<uid>/<id>-2.jpg ... -6.jpg) and listed, cover first, in the post's meta.slides, so the posts table needs no new column.
   In the feed the pictures swipe sideways inside the card (the feed still scrolls up and down) and dots above the name say where you
   are. Once shared, the phone keeps the links, not the pictures (storage and the account backup). Deleting a post removes every
   picture. A new post is sent once (the feed's own retry used to send every new post a second time).
   Browser walks (scratch, recorded in HANDOFF-sheet-bubble.md): local site in Chromium (compose 3, remove one, add one, post, swipe
   to picture 2) and the repo's fake Supabase (tools/sim): exactly 3 uploads, meta.slides, links on the phone, delete cleanup. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../carousel-core.js');
const html = read('index.html');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}
const U = n => 'https://x.supabase.co/storage/v1/object/public/media/u1/t1' + (n > 1 ? '-' + n : '') + '.jpg';
const D = c => 'data:image/jpeg;base64,' + c + 'AAAA';

test('which pictures a post swipes through: cover first, 2 to 6, only our own links or photos still on the phone', () => {
    assert.deepEqual(K.slidesOf({ slides: [U(1), U(2), U(3)] }), [U(1), U(2), U(3)]);
    assert.deepEqual(K.slidesOf({ meta: { slides: [U(1), U(2)] } }), [U(1), U(2)], 'from the table: meta.slides');
    assert.deepEqual(K.slidesOf({ slides: [D('a'), D('b')] }), [D('a'), D('b')], 'not sent yet: the photos themselves');
    assert.equal(K.slidesOf({ slides: [U(1)] }), null, 'one picture is a photo post, not a carousel');
    assert.equal(K.slidesOf({ photo: U(1) }), null);
    assert.equal(K.slidesOf(null), null);
    assert.deepEqual(K.slidesOf({ slides: [U(1), U(1), U(2)] }), [U(1), U(2)], 'never the same picture twice');
    const bad = ['javascript:alert(1)', 'http://plain.example/x.jpg', 'https://x.example/a".jpg', 'data:text/html;base64,PHNjcmlwdD4=', 'https://x.example/a b.jpg', 7, null];
    assert.deepEqual(K.slidesOf({ slides: [U(1)].concat(bad, [U(2)]) }), [U(1), U(2)], 'anything else is left out');
    /* test changed 7 Nov 2026 (Emmanuel's week carousel: the cart, then each day's dinner): at most 8, was 6 (week-carousel.test.cjs) */
    assert.equal(K.slidesOf({ slides: Array.from({ length: 11 }, (x, i) => U(i + 1)) }).length, 8, 'at most 8');
    assert.equal(K.MAX, 8);
});

test('where the pictures live and what a delete removes', () => {
    assert.equal(K.path('u1', 't1', 0), 'u1/t1.jpg', 'the cover keeps the old place');
    assert.equal(K.path('u1', 't1', 1), 'u1/t1-2.jpg');
    assert.equal(K.path('u1', 't1', 5), 'u1/t1-6.jpg');
    assert.deepEqual(K.files('u1', 't1'), ['u1/t1.jpg', 'u1/t1.mp4', 'u1/t1.mov', 'u1/t1.webm', 'u1/t1-2.jpg', 'u1/t1-3.jpg', 'u1/t1-4.jpg', 'u1/t1-5.jpg', 'u1/t1-6.jpg', 'u1/t1-7.jpg', 'u1/t1-8.jpg'], 'test changed 7 Nov 2026: 8 pictures, so a delete also removes -7 and -8');
});

test('the lit dot follows the swipe; the picker gives pictures only, never more than still fit', () => {
    assert.equal(K.dot(0, 348, 3), 0); assert.equal(K.dot(348, 348, 3), 1); assert.equal(K.dot(500, 348, 3), 1); assert.equal(K.dot(700, 348, 3), 2);
    assert.equal(K.dot(5000, 348, 3), 2); assert.equal(K.dot(-20, 348, 3), 0); assert.equal(K.dot(100, 0, 3), 0);
    const f = (n, type) => ({ name: n, type });
    assert.deepEqual(K.take([f('a', 'image/jpeg'), f('b', 'video/mp4'), f('c', 'image/png')], 0).map(x => x.name), ['a', 'c']);
    assert.deepEqual(K.take([f('a', 'image/heic'), f('b', 'image/jpeg'), f('c', 'image/jpeg')], 6).map(x => x.name), ['a', 'b'], 'room for 2 (test changed 7 Nov 2026: MAX 8)');
    assert.deepEqual(K.take([f('a', 'image/jpeg')], 8), []);
    assert.deepEqual(K.take(null, 0), []);
});

test('the feed card: the pictures side by side, the dots above the name, the small My posts thumbnail keeps the cover', () => {
    /* in the page window.LowiCarousel is also the global LowiCarousel */
    const ctx = { window: { LowiCarousel: K }, LowiCarousel: K, esc: s => String(s).replace(/"/g, '&quot;') };
    vm.createContext(ctx);
    vm.runInContext(fnSrc(html, 'function fyCarHTML(sl)') + '\n' + fnSrc(html, 'function fyCarDots(p)'), ctx);
    const h = ctx.fyCarHTML([U(1), U(2), U(3)]);
    assert.match(h, /^<div class="fy-bg fy-car" data-n="3"><div class="fy-car-track"><img src="[^"]+t1\.jpg" alt="" decoding="async"><img src="[^"]+t1-2\.jpg" alt="" loading="lazy" decoding="async"><img src="[^"]+t1-3\.jpg" alt="" loading="lazy" decoding="async"><\/div><\/div>$/, 'only the cover loads at once');
    assert.equal(ctx.fyCarDots({ photo: U(1), slides: [U(1), U(2), U(3)] }), '<div class="fy-car-dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div>');
    assert.equal(ctx.fyCarDots({ photo: U(1) }), '', 'a one-photo post has no dots');
    const bg = fnSrc(html, 'function fyBg(p, thumb)');
    assert.match(bg, /if \(p\.photo\) \{ const sl = !thumb && window\.LowiCarousel \? LowiCarousel\.slidesOf\(p\) : null; if \(sl\) return fyCarHTML\(sl\);/);
    assert.match(html, /'<div class="fy-meta">' \+ fyCarDots\(p\) \+ '<div class="fy-by"/);
    assert.match(html, /if \(window\.FYV\) FYV\.attach\(f\); fyCarBind\(f\); \}/, 'the dots are wired whenever the feed is drawn');
    const bind = fnSrc(html, 'function fyCarBind(root)');
    assert.match(bind, /K\.dot\(t\.scrollLeft, t\.clientWidth, dots\.length\)/);
    assert.match(bind, /\{passive:true\}/);
    assert.match(html, /\.fy-car-track\{position:absolute;inset:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;/);
    assert.match(html, /\.fy-car-track>img\{flex:0 0 100%;[^}]*scroll-snap-align:center;scroll-snap-stop:always\}/, 'one picture per swipe');
    assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{\.fy-car-dots i\{transition:none\}\}/);
    assert.match(html, /\.fy-shade\{position:absolute;inset:0;pointer-events:none;/, 'the shade never takes the swipe');
});

test('the composer: up to 6 photos picked at once, each with its own remove, the post carries them all', () => {
    const row = fnSrc(html, 'function trPhotosHTML()');
    /* test changed 8 Nov 2026 (Emmanuel: carousels "So wie bei Instagram und TikTok"): the Photos tile picks the first ones, the strip
       numbers them and adds more with a + tile; the words go through the app dictionary (new-post-tiktok-1108.test.cjs) */
    assert.match(row, /data-tr="nophoto" data-i="' \+ i \+ '" aria-label="' \+ esc\(fyT\("Remove photo"\)\)/);
    assert.match(row, /fyT\("Add more photos"\)/); assert.match(html, /<b>' \+ esc\(fyT\("Photos"\)\)/);
    assert.match(row, /fyT\("A carousel\. Number 1 is the cover\."\)/);
    assert.match(html, /f\.multiple = carMax\(\) > 1; f\.click\(\);/);
    assert.match(html, /const K = CAR\(\), xs = K \? K\.take\(f\.files, C \? \(C\.photos \|\| \[\]\)\.length : 0\) : \[f\.files\[0\]\];/);
    const pick = fnSrc(html, 'async function trPhotosPick(xs, h)');
    assert.match(pick, /h\.resizeImage\(x, 640\)/, 'the same size as one photo');
    assert.match(pick, /if \(C !== c0\) return;/, 'a closed composer gets nothing');
    assert.match(html, /if \(\(C\.photos \|\| \[\]\)\.length > 1\) p\.slides = C\.photos\.slice\(0, carMax\(\)\);/);
    assert.match(html, /case "nophoto": if \(C\) \{ const i = \+\(b\.dataset\.i \|\| 0\), was = C\.photo; C\.photos = \(C\.photos \|\| \[\]\)\.filter\(\(x, k\) => k !== i\); C\.photo = C\.photos\[0\] \|\| "";/);
    assert.match(html, /setPhoto:ph => \{ if \(C\) \{ C\.photo = ph \|\| ""; C\.photos = ph \? \[ph\] : \[\];/, 'Fuel\'s photo hand-off still works');
    for (const [en, de, es] of [['Add photos', 'Fotos hinzufügen', 'Añadir fotos'], ['Add more photos', 'Weitere Fotos', 'Más fotos']])
        assert.ok(html.includes('["' + en + '", "' + de + '", "' + es + '"]'), en);
    assert.match(html, /\.tr-phx::after\{content:"";position:absolute;inset:-8px\}/, 'the small x has a 44 pt tap area');
});

test('sharing: the pictures go up next to the cover, meta.slides lists them, the phone keeps links, a delete takes all; one send per post', () => {
    const pub = fnSrc(html, 'async function publish(p, file, quiet)');
    assert.match(pub, /slides\.push\(await upload\(K\.path\(uid, p\.id, i\), b, b\.type\)\)/);
    assert.match(pub, /p\.photo = photo_url; p\.slides = slides\.slice\(\);/);
    assert.match(pub, /if \(slides && slides\.length > 1\) meta = Object\.assign\(\{\}, meta \|\| \{\}, \{slides\}\);/);
    assert.match(html, /const files = window\.LowiCarousel \? LowiCarousel\.files\(uid, id\) : \["jpg", "mp4", "mov", "webm"\]/);
    assert.match(html, /slides:\(window\.LowiCarousel && LowiCarousel\.slidesOf\(r\)\) \|\| null\}/, 'a post from the table knows its pictures');
    const share = fnSrc(html, 'function sharePost(p, file)');
    assert.match(share, /if \(ok && q !== p && Array\.isArray\(p\.slides\) && p\.slides\.length > 1 && p\.slides\.every\(x => \/\^https:\\\/\\\/\/\.test\(x\)\)\) \{ q\.photo = p\.photo; q\.slides = p\.slides\.slice\(\); \}/);
    assert.match(html, /if \(p\.vis === "tribe"\) fySending\.add\(p\.id\);\n  showFeed\(\);/, 'marked as being sent before the feed repaints');
    assert.match(html, /sharePost\(p\)\.then\(ok => \{ fySending\.delete\(p\.id\);/);
    assert.match(fnSrc(html, 'function retryShares()'), /const go = todo\.filter\(p => !fySending\.has\(p\.id\)\);/);
});

test('the module loads with the page and works offline', () => {
    assert.match(html, /<script src="cart-core\.js\?v=[^"]+"><\/script>\n<script src="carousel-core\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /STATIC\.push\("carousel-core\.js"\);/);
});
