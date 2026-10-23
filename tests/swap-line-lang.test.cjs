// Bug hunt (Oct 24, 2026, live build 20261023-234332): typing a food by name in Scan in German or Spanish showed the "Best swap" line in
// English: "apple" gave "A small handful of berries & a palm of protein", "Milch" gave "A splash of milk in coffee or tea" and
// "Haferflocken mit Milch" gave "Greek yogurt with chia and almonds & a splash of milk in coffee or tea". Root cause: the swap foods
// had no translations, and the line is built from parts (joined with ", ", " & " or " + ") while the translator only looked up whole lines.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');

function bootLang(lang) {
    const at = html.indexOf('const LANG_KEY = "lowispike.lang"');
    assert.ok(at > 0, 'language script found');
    const s = html.lastIndexOf('<script>', at) + '<script>'.length, e = html.indexOf('</script>', at);
    const store = { 'lowispike.lang': lang };
    const el = () => ({ querySelectorAll: () => [], appendChild() { }, children: [], classList: { toggle() { } } });
    const document = { readyState: 'complete', documentElement: { lang: 'en' }, body: el(), createTreeWalker: () => ({ nextNode: () => null }), querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, addEventListener() { }, dispatchEvent() { return true; } };
    class CustomEvent { constructor(type, o) { this.type = type; this.detail = o && o.detail; } }
    class MutationObserver { observe() { } disconnect() { } }
    const sb = { document, CustomEvent, MutationObserver, NodeFilter: { SHOW_TEXT: 4 }, navigator: { language: 'en-US', languages: ['en-US'] },
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() { }, console };
    sb.window = sb; sb.self = sb; sb.addEventListener = () => { };
    vm.runInNewContext(html.slice(s, e), sb);
    assert.ok(sb.LowiLang && typeof sb.LowiLang.line === 'function', 'LowiLang.line exists');
    sb.LowiLang.set(lang);
    return en => { const o = sb.LowiLang.line(en); return o === en ? null : o; };
}
/* what a text node shows after the translator ran */
const shown = (tr, en) => { const o = tr(en); return o === null ? en : o; };

test('the Best swap lines from the hunt read fully in German and Spanish', () => {
    const de = bootLang('de');
    assert.strictEqual(shown(de, 'A small handful of berries & a palm of protein'), 'Eine kleine Handvoll Beeren & eine Handfläche Eiweiß');
    assert.strictEqual(shown(de, 'A splash of milk in coffee or tea'), 'Ein Schuss Milch in Kaffee oder Tee');
    assert.strictEqual(shown(de, 'Greek yogurt with chia and almonds & a splash of milk in coffee or tea'), 'Griechischer Joghurt mit Chia und Mandeln & ein Schuss Milch in Kaffee oder Tee');
    const es = bootLang('es');
    assert.strictEqual(shown(es, 'A small handful of berries & a palm of protein'), 'Un puñado pequeño de frutos rojos y una palma de proteína');
    assert.strictEqual(shown(es, 'Greek yogurt with chia and almonds & a splash of milk in coffee or tea'), 'Yogur griego con chía y almendras y un chorrito de leche en el café o el té');
});

test('a part with its own comma still matches, and a line with an unknown part stays as it was', () => {
    const de = bootLang('de');
    assert.strictEqual(shown(de, 'Eggs, sweet potato, one fist & veg first'), 'Eier, Süßkartoffel, eine Faust voll & Gemüse zuerst');
    assert.strictEqual(de('Eggs, something nobody translated & a palm of protein'), null, 'half-translated lines are never shown');
    assert.strictEqual(de('Hello, world'), null);
});

test('every swap food and food name in FOODS has a German and a Spanish line', () => {
    const seg = html.slice(html.indexOf('const FOODS = ['), html.indexOf('\n];', html.indexOf('const FOODS = [')));
    const parts = [...seg.matchAll(/sub:\{[^}]*?\bn:"([^"]+)"/g)].map(m => m[1]).concat([...seg.matchAll(/\{id:"[^"]+", n:"([^"]+)"/g)].map(m => m[1]), ['a palm of protein', 'veg first']);
    assert.ok(parts.length > 60, 'found the food parts');
    /* every part needs a [en, de, es] line somewhere in the app (the language script or a module that adds its rows) */
    const rows = new Set([...html.matchAll(/\[\s*"((?:[^"\\]|\\.)*)",\s*"(?:[^"\\]|\\.)*",\s*"/g)].map(m => m[1]));
    const miss = [...new Set(parts)].filter(p => !rows.has(p) && !rows.has(p.charAt(0).toUpperCase() + p.slice(1)));
    assert.deepStrictEqual(miss, [], 'every swap part has a German and Spanish line');
});
