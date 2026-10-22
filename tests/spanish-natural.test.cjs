'use strict';
/* Natural Spanish (Oct 2026): a Spanish-speaking tester found the onboarding read like word-for-word English.
   These lock in the rewrites and guard the meaning: the scanner estimates a blood sugar spike, not insulin. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const decode = s => s.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
const SRC = ['index.html', 'herb-start.js', 'companion-birth.js', 'shop-plan.js', 'starter-core.js', 'spirit.js', 'daily-ritual.js',
    'herb-tamagotchi.js', 'herb-quests.js', 'herb-quests-core.js', 'herb-shop-core.js', 'finch-extras.js', 'shop-scan-core.js', 'store-picks.js'];
const all = () => SRC.map(f => [f, decode(read(f))]);

/* every [en, de, es] row of the DOM translator, as parsed strings */
const rows = () => {
    const out = [], re = /\[("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*")\]/g, s = read('index.html');
    let m; while ((m = re.exec(s))) { try { out.push(m.slice(1, 4).map(x => JSON.parse(x))); } catch (e) { /* not a string row */ } }
    return out;
};
const es = en => { const r = rows().filter(x => x[0] === en); assert.ok(r.length, 'row missing: ' + en); return r[r.length - 1][2]; };

test('word-for-word Spanish from onboarding and setup is gone', () => {
    const banned = ['Tu compañía ya está aquí', 'Da forma a tu compañía', 'Tu compañía y tu app', '¿Qué quieres más?', 'Sin el pico.',
        'Tres campos. Eso es todo.', 'Move para abrirla', 'mundo espíritu', 'Escribe tu propio número', 'Cada uno abre la parte de la app que lo hace',
        'Low spike, hecho por ti', 'cambio low-spike', 'ni siquiera LOWiSPIKE puede', 'Se ve bien"', '"No OK"', 'Solo cambia tus consejos', 'como «Comida» o «Moverse»'];
    for (const [f, s] of all()) for (const b of banned) assert.ok(!s.includes(b), f + ' still says: ' + b);
});

test('Spanish never calls the companion "tu hierba" (it reads as slang for weed)', () => {
    for (const [f, s] of all()) assert.ok(!/tu hierba|la hierba te|hierba llegó|Camino de la hierba/i.test(s), f);
});

test('scanner verdicts in Spanish talk about blood sugar, not an insulin spike', () => {
    for (const en of ['Higher estimated blood sugar impact', 'Lower estimated blood sugar impact', 'Moderate estimated blood sugar impact']) {
        const t = es(en);
        assert.match(t, /azúcar/, en);
        assert.doesNotMatch(t, /insulina/, en);
    }
    assert.match(es('Blood sugar and insulin impact'), /azúcar y la insulina/, 'meter keeps both, kept apart');
    const scan = decode(read('shop-scan-core.js'));
    assert.match(scan, /'Impacto estimado más alto en el azúcar en sangre'/);
    assert.match(scan, /'Impacto estimado más bajo en el azúcar en sangre'/);
    assert.doesNotMatch(scan, /suba tu insulina|sube tu insulina/);
});

test('the reveal joins "de" + "el" into "del" for every star sign', () => {
    const C = require('../companion-birth-core.js');
    const src = decode(read('companion-birth.js'));
    const tpl = (src.match(/es:\{waking:[\s\S]*?myth:'([^']+)'/) || [])[1];
    assert.ok(tpl && tpl.includes('{myth}'), 'Spanish myth template keeps {myth}');
    assert.match(src, /\.replace\(\/\\bde el \/g,'del '\)/, 'the reveal applies the contraction');
    for (const sign of C.SIGN_KEYS) {
        const line = tpl.replace('{myth}', C.myth(sign, 'es')).replace(/\bde el /g, 'del ');
        assert.doesNotMatch(line, /\bde el\b/, sign);
        assert.match(line, /^Nace (del|de los|de la) /, sign + ': ' + line);
    }
    assert.match(src, /over:'Tu compañero ya está aquí'/);
});

test('rewritten setup rows keep their English keys, all three languages and every {placeholder}', () => {
    const keys = ['Skip the spike.', "Three fields. That's it.", 'What do you want most?', 'It shapes your companion and the colour of your app.',
        "Your companion and your app take on your sign's colour.", 'Looks good', 'Change later', 'Your star sign shows up here', 'Already have one?'];
    for (const k of keys) { const t = es(k); assert.ok(t && t !== k, k); }
    for (const [en, de, sp] of rows()) {
        const ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
        if (ph(en)) assert.equal(ph(sp), ph(en), 'placeholders differ: ' + en);
    }
    assert.equal(es('What do you want most?'), '¿Qué es lo que más quieres?');
    assert.equal(es('It shapes your companion and the colour of your app.'), 'Con él nacen tu compañero y el color de tu app.');
});

test('first screens: Spanish bubble names match the real bubbles, and the shopping step asks plainly', () => {
    const s = decode(read('herb-start.js'));
    assert.match(s, /plantH:'Come mejor y adelgaza jugando\.'/);
    assert.match(s, /'Movimiento','Pausa \(ayuno\)'/);
    assert.match(decode(read('move-bubble.js')), /'Move', 'Bewegung', 'Movimiento'/, 'the Move bubble on Home reads "Movimiento"');
    const shop = decode(read('shop-plan.js'));
    assert.match(shop, /¿Cada cuántos días sueles hacer la compra\? Escribe el número\./);
});

test('meal photo checks: Spanish singular "Te queda 1", no "Hora del Cena", and English untouched', () => {
    const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
    global.localStorage = global.localStorage || mem(); global.sessionStorage = global.sessionStorage || mem();
    delete require.cache[require.resolve('../meal-photo.js')];
    const M = require('../meal-photo.js');
    M.setLeft(1, 3);
    assert.equal(M.leftText('es'), 'Te queda 1 de 3 an\u00e1lisis de foto hoy');
    assert.match(M.nudgeText('d', 'es'), /^Cena: fotograf\u00eda tu plato y lo analizo\. Te queda 1 de 3 an\u00e1lisis hoy\.$/);
    assert.equal(M.leftText('en'), M.t('left', 'en', { n: 1, max: 3 }), 'English keeps its one string');
    M.setLeft(2, 3);
    assert.equal(M.leftText('es'), 'Te quedan 2 de 3 an\u00e1lisis de foto hoy');
    for (const k of ['b', 'l', 'd']) assert.doesNotMatch(M.nudgeText(k, 'es'), /Hora del/);
    assert.equal(M.t('high', 'es'), 'Probable pico de az\u00facar');
});
