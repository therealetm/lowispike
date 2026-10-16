// Day & night atmosphere: a volume-style scale over the whole day (mist -> day -> golden -> blue mist -> night stars).
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../atmosphere-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('atmosphere.js'), css = read('atmosphere.css'), loader = read('apple-ui.js'), sw = read('sw.js'), html = read('index.html'), topbar = read('top-bar.js');

/* real text colours of the two UI themes (light ink + muted, dark ink + muted) */
const INK = { light: '#111318', dark: '#f8f5ed' }, MUTED = { light: '#4a5167', dark: '#a19c90' };

test('the five places on the scale are in the order E-man described', () => {
    assert.deepStrictEqual(C.MARKS.map(m => m.id), ['mist', 'day', 'golden', 'blue', 'night']);
    assert.deepStrictEqual(C.MARKS.map(m => m.p), [0, 25, 50, 75, 100]);
    assert.deepStrictEqual(C.MARKS.map(m => C.markWord(m.id, 'de')), ['Morgennebel', 'Tag', 'Goldene Stunde', 'Blauer Nebel', 'Sternennacht']);
    assert.deepStrictEqual(C.MARKS.map(m => C.markWord(m.id, 'en')), ['Morning mist', 'Day', 'Golden hour', 'Blue mist', 'Night stars']);
    assert.strictEqual(C.DAY, 25); assert.strictEqual(C.NIGHT, 100);
});

test('the sky moves continuously: small steps make small changes, except the one theme flip', () => {
    const dist = (a, b) => { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = h(a), B = h(b); return Math.max(...A.map((v, i) => Math.abs(v - B[i]))); };
    for (let p = 0; p < 100; p += 0.5) {
        const a = C.look(p), b = C.look(p + 0.5);
        if (a.theme !== b.theme) { assert.strictEqual(p + 0.5, C.THRESH); continue; }
        for (const k of ['top', 'mid', 'bot']) assert.ok(dist(a[k], b[k]) <= 18, 'step at ' + p + ' ' + k + ' ' + a[k] + '->' + b[k]);
        assert.ok(Math.abs(a.star - b.star) <= 0.06 && Math.abs(a.mistA - b.mistA) <= 0.07 && Math.abs(a.sunA - b.sunA) <= 0.07, 'layers jump at ' + p);
    }
    // in-between positions are really in between (no snapping to the nearest stop)
    const g = C.look(44);
    assert.notStrictEqual(g.top, C.look(38).top); assert.notStrictEqual(g.top, C.look(50).top);
    assert.ok(C.look(87).star > C.look(75).star && C.look(87).star < 1);
});

test('text stays readable on the sky at every half step (ink >= 7:1, muted >= 3:1, mist included)', () => {
    for (let p = 0; p <= 100; p += 0.5) {
        const k = C.look(p), th = k.theme;
        const cols = [k.top, k.mid, k.bot, C.mixHex(k.bot, k.mist, k.mistA * 0.35), C.mixHex(k.mid, k.mist, k.mistA * 0.35), C.mixHex(k.top, k.mist, k.mistA * 0.35)];
        for (const c of cols) {
            assert.ok(C.contrast(c, INK[th]) >= 7, p + ' ink ' + c + ' ' + C.contrast(c, INK[th]).toFixed(2));
            assert.ok(C.contrast(c, MUTED[th]) >= 3, p + ' muted ' + c + ' ' + C.contrast(c, MUTED[th]).toFixed(2));
        }
    }
});

test('theme side: light up to golden hour and sunset, dark from dusk; ends are Day and Night', () => {
    assert.strictEqual(C.themeFor(0), 'light'); assert.strictEqual(C.themeFor(25), 'light'); assert.strictEqual(C.themeFor(50), 'light');
    assert.strictEqual(C.themeFor(61.5), 'light'); assert.strictEqual(C.themeFor(62), 'dark'); assert.strictEqual(C.themeFor(75), 'dark'); assert.strictEqual(C.themeFor(100), 'dark');
    assert.strictEqual(C.look(0).mark, 'mist'); assert.strictEqual(C.look(100).star, 1); assert.strictEqual(C.look(25).star, 0);
    assert.ok(C.look(0).mistA > 0.8 && C.look(75).mistA > 0.5 && C.look(25).mistA < 0.15, 'morning mist and bluish mist are misty, day is clear');
    assert.strictEqual(C.look(100).bot, '#03050a', 'night ends on the brand dark navy');
});

test('stored choice: old Night/Cloud/Sunrise users keep their look, broken values are safe', () => {
    assert.deepStrictEqual(C.parse(null, 'dark'), { mode: 'manual', p: 100, legacy: true });
    assert.deepStrictEqual(C.parse(null, 'light'), { mode: 'manual', p: 25, legacy: true });
    assert.deepStrictEqual(C.parse(null, 'sunrise'), { mode: 'auto', p: null, legacy: true });
    assert.deepStrictEqual(C.parse(null, null), { mode: 'manual', p: 100, legacy: true });
    assert.deepStrictEqual(C.parse('{oops', 'light'), { mode: 'manual', p: 25, legacy: true });
    assert.deepStrictEqual(C.parse('{"mode":"manual","p":"999"}', 'dark'), { mode: 'manual', p: 100 });
    assert.deepStrictEqual(C.parse('{"mode":"manual","p":-3}', 'light'), { mode: 'manual', p: 0 });
    assert.deepStrictEqual(C.parse('{"mode":"manual","p":"abc"}', 'light'), { mode: 'manual', p: 25 });
    assert.deepStrictEqual(C.parse('{"mode":"weird"}', 'sunrise'), { mode: 'auto', p: null, legacy: true });
    assert.deepStrictEqual(C.parse('{"mode":"manual","p":44.3}', 'light'), { mode: 'manual', p: 44.5 });
    assert.strictEqual(C.serialize({ mode: 'manual', p: 44.5 }), '{"mode":"manual","p":44.5}');
    assert.strictEqual(C.serialize({ mode: 'auto', p: 3 }), '{"mode":"auto"}');
});

test('reconcile: the UI theme key wins when an older switch changed it', () => {
    assert.deepStrictEqual(C.reconcile({ mode: 'manual', p: 44 }, 'light'), { mode: 'manual', p: 44 });
    assert.deepStrictEqual(C.reconcile({ mode: 'manual', p: 44 }, 'dark'), { mode: 'manual', p: 100 });
    assert.deepStrictEqual(C.reconcile({ mode: 'manual', p: 80 }, 'light'), { mode: 'manual', p: 25 });
    assert.deepStrictEqual(C.reconcile({ mode: 'manual', p: 80 }, 'sunrise'), { mode: 'auto', p: null });
    assert.deepStrictEqual(C.reconcile({ mode: 'auto', p: null }, 'dark'), { mode: 'manual', p: 100 });
    assert.strictEqual(C.legacyFor({ mode: 'manual', p: 61.5 }), 'light');
    assert.strictEqual(C.legacyFor({ mode: 'manual', p: 62 }), 'dark');
    assert.strictEqual(C.legacyFor({ mode: 'auto' }), 'sunrise');
});

test('auto shows where the real clock is on the scale', () => {
    const at = h => new Date(2026, 9, 15, Math.floor(h), Math.round((h % 1) * 60)).getTime();
    assert.strictEqual(C.clockP(at(3)), 100);
    assert.ok(C.clockP(at(6.5)) < 10, 'dawn is morning mist');
    assert.strictEqual(C.clockP(at(13)), 25);
    assert.ok(C.clockP(at(18)) > 45 && C.clockP(at(18)) < 61, 'late afternoon nears golden hour');
    assert.ok(C.clockP(at(19.5)) > 62 && C.clockP(at(19.5)) < 80, 'after sunset is blue mist');
    assert.strictEqual(C.clockP(at(23)), 100);
});

test('css vars are complete and the head can restore them before first paint', () => {
    const v = C.vars(50);
    for (const k of ['--atm-top', '--atm-mid', '--atm-bot', '--atm-sun', '--atm-sun-a', '--atm-sun-x', '--atm-sun-y', '--atm-mist', '--atm-mist-a', '--atm-star-a', '--atm-cell-a']) assert.ok(k in v, k);
    assert.match(C.cssText(80), /^--atm-p:0\.800;--atm-top:#[0-9a-f]{6};/);
    assert.ok(html.includes('localStorage.getItem("lowi.atmos.css")') && html.includes('h.setAttribute("data-atm","manual")'), 'head restore script');
    assert.ok(html.indexOf('lowi.atmos.css') < html.indexOf('</head>'), 'restore runs in <head>');
    assert.ok(html.includes('html[data-atm="manual"] body #app{background:linear-gradient'), 'head paints the sky on #app');
    assert.ok(html.includes('k === "lowi.atmos"'), 'the look survives a data reset like lowi.theme');
});

test('wiring: loader, offline cache, top bar, Look card, weather and seasons kept', () => {
    assert.ok(/'season\.js','atmosphere-core\.js','atmosphere\.js'/.test(loader), 'loaded after season.js');
    for (const f of ['atmosphere-core.js', 'atmosphere.js', 'atmosphere.css']) assert.strictEqual(sw.split('"' + f + '"').length - 1, 2, f + ' in both sw lists');
    assert.ok(topbar.includes('root.LowiAtmos.quick(to === \'light\' ? \'day\' : \'night\''), 'top bar jumps Day/Night');
    assert.ok(!/Cloud einschalten|Switch to Cloud/.test(topbar), 'no Cloud wording left in the top bar');
    assert.ok(js.includes("'.r2-look:not([data-atm-card])'") && js.includes('data-atm-quick="day"') && js.includes('data-atm-quick="night"') && js.includes('data-atm-quick="auto"'));
    assert.ok(js.includes('type="range" min="0" max="100" step="0.5"'), 'a real slider, half steps');
    assert.ok(/#wxSky :is\(\.wx-tint, \.wx-orb, \.wx-stars\)/.test(css), 'only weather time-of-day bits hidden');
    assert.ok(!/wx-cloud|wx-rain|ssnSky/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'clouds, rain and the season layer untouched');
    assert.ok(js.includes("app.insertBefore(sky, app.firstChild)"), '#atmSky is the first layer, under weather and season');
    assert.ok(/prefers-reduced-motion: reduce[\s\S]*animation: none/.test(css), 'reduced motion stops twinkle and drift');
    assert.ok(!/getContext\(|new [A-Za-z.]*WebGLRenderer/.test(js), 'no second WebGL context');
    assert.ok(js.includes('inRegion(a) && !riding()') || js.includes('!inRegion(a) && !riding()'), '3D only in the hub, not in regions or rides');
    assert.ok(/::-webkit-slider-thumb \{[^}]*width: 32px/.test(css), 'big touch thumb');
});

test('Oct 16: the 3D world tone moves gradually across the whole scale, no jump at the theme flip or at blue mist', () => {
    const d = (a, b) => { const A = C.mixHex(a, a, 0), x = parseInt(A.slice(1), 16), y = parseInt(b.slice(1), 16); return Math.max(Math.abs((x >> 16) - (y >> 16)), Math.abs((x >> 8 & 255) - (y >> 8 & 255)), Math.abs((x & 255) - (y & 255))); };
    let moving = 0;
    for (let p = 0; p < 100; p += 0.5) {
        const a = C.world(p), b = C.world(p + 0.5);
        assert.ok(d(a.haze, b.haze) <= 8, p + ' haze step ' + d(a.haze, b.haze));
        assert.ok(d(a.tint, b.tint) <= 8, p + ' tint step ' + d(a.tint, b.tint));
        assert.ok(Math.abs(a.light - b.light) <= 0.02 && Math.abs(a.tintA - b.tintA) <= 0.02, p + ' light/tint amount step');
        if (a.haze !== b.haze) moving++;
    }
    assert.ok(moving >= 195, 'something changes at (almost) every half step: ' + moving);
    assert.notStrictEqual(C.world(61).haze, C.world(63).haze);
});
