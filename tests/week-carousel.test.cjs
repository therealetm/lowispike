'use strict';
/* Nov 7 2026 (Emmanuel: "My carousels usually start in a way where you see my grocery card ... the grocery Einkaufswagen ... the price
   ... then you swipe right, and then you see the first Monday meal, Tuesday meal ... I wanted to be able to post a carousel in that
   style on my For You page").
   "Als Karussell posten" in Deine Woche draws the slides on the phone (week-carousel.js) and opens New post with them: the cart with the
   week's price first, then one slide per dinner still to come. A carousel now holds 8 pictures (the cart and seven dinners).
   Browser walk (scratch, Chromium, local site, network blocked, 393 x 852 with the iPhone's safe areas): a planned week of 5 dinners gave
   6 slides (1080 x 1350), New post opened with them and the caption, Posten active; in Dark the slides keep their own colours; a dinner
   without a photo shows its emoji; long names shrink into two lines (slides checked). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../week-carousel.js');

test('the cart takes the first slide, the dinners the rest, never more than a carousel holds', () => {
    const days = Array.from({ length: 9 }, (x, i) => ({ day: 'D' + i, name: 'Dinner ' + i }));
    assert.equal(K.pick(days, 8).length, 7, 'cart + seven dinners');
    assert.equal(K.pick(days.slice(0, 3), 8).length, 3);
    assert.deepEqual(K.pick([{ name: '' }, null, { name: 'A' }], 8).map(d => d.name), ['A'], 'only real dinners');
    assert.equal(K.W, 1080); assert.equal(K.H, 1350, '4:5, the photo size of Instagram and TikTok');
});

test('a name never runs past two lines', () => {
    assert.deepEqual(K.wrap('Zucchini-Bänder mit Rinder-Ragout', 22, 2), ['Zucchini-Bänder mit', 'Rinder-Ragout']);
    const w = K.wrap('one two three four five six seven eight nine ten', 10, 2);
    assert.equal(w.length, 2); assert.ok(w[1].endsWith('…'));
});

test('Deine Woche offers it and fills New post with the slides; the slides keep their colours in Dark', () => {
    const wb = read('week-basket.js'), html = read('index.html'), js = read('week-carousel.js');
    assert.match(wb, /data-wb="carousel">' \+ T\('Post as carousel', 'Als Karussell posten', 'Publicar como carrusel'\)/);
    assert.match(wb, /if \(a === 'carousel'\) return postCarousel\(\);/);
    assert.match(wb, /title: T\('My week of dinners', 'Mein Wochenkorb', 'Mi cesta de la semana'\), price: '\\u2248 ' \+ eur\(c\.bs\.total\)/);
    assert.match(wb, /note: T\('Prices are estimates', 'Preise sind Sch\\u00e4tzungen', 'Precios estimados'\)/, 'still labelled as estimates');
    assert.match(html, /setPhotos:list => \{ if \(!C \|\| !Array\.isArray\(list\)\) return; const ph = list\.filter\(Boolean\)\.slice\(0, carMax\(\)\);/);
    assert.match(js, /W\.LowiR3F\.postSheet\('', o\.caption \|\| ''\);\n        W\.TRIBE\.setPhotos\(list\);/, 'nothing goes out until Posten');
    assert.match(js, /const bgOf = k => load\('data:image\/svg\+xml;charset=utf-8,'/, 'backgrounds as pictures: true-black.js redraws canvas fills, not images');
    assert.match(html, /<script src="week-carousel\.js\?v=[^"]+"><\/script>\n<script src="week-basket\.js\?v=/);
    assert.ok(read('sw.js').includes('"week-carousel.js"'));
});

test('the round back button never covers Weiter in Meine Woche planen', () => {
    assert.ok(read('week-basket.css').includes('html.lw-bx-on .wb-ov .wb-card { padding-bottom: 68px; }'));
});
