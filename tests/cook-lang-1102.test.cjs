// Bug hunt (Oct 24, 2026 11:02, live build 20261024-104917), Cook tab in German and Spanish:
// (1) the recipe rows read "15 min · Fried rice craving, rebuilt with cauliflower." in English: the row is '<b>15 min</b> · ' + blurb, so the
//     blurb's text node starts with " · " and the translator never found it, although the blurb has a German and Spanish line.
// (2) the "Swap ingredients / Healthier swaps" tile stayed English in Spanish: beta.js L() only knew English and German, and the tile
//     never repainted after a language switch.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');

function bootLang(lang) {
    const at = html.indexOf('const LANG_KEY = "lowispike.lang"');
    assert.ok(at > 0, 'language script found');
    const s = html.lastIndexOf('<script>', at) + '<script>'.length, e = html.indexOf('</script>', at);
    const store = { 'lowispike.lang': lang };
    const el = () => ({ querySelectorAll: () => [], appendChild() { }, children: [], classList: { toggle() { } } });
    const document = { readyState: 'complete', documentElement: { lang: 'en' }, body: el(), createTreeWalker: () => ({ nextNode: () => null }), querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, addEventListener() { }, removeEventListener() { }, dispatchEvent() { }, createElement: el, head: el() };
    class CustomEvent { constructor(type, o) { this.type = type; this.detail = o && o.detail; } }
    class MutationObserver { observe() { } disconnect() { } }
    const sb = { document, CustomEvent, MutationObserver, NodeFilter: { SHOW_TEXT: 4 }, navigator: { language: 'en-US', languages: ['en-US'] },
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() { }, console };
    sb.window = sb; sb.self = sb; sb.addEventListener = () => { };
    vm.runInNewContext(html.slice(s, e), sb);
    sb.LowiLang.set(lang);
    sb.LowiLang.add([['Fried rice craving, rebuilt with cauliflower.', 'Lust auf gebratenen Reis, neu gebaut mit Blumenkohl.', 'Antojo de arroz frito, rehecho con coliflor.']]);
    return en => sb.LowiLang.line(en);
}

test('a recipe blurb after "15 min · " is translated in German and Spanish', () => {
    const de = bootLang('de');
    assert.strictEqual(de(' · Fried rice craving, rebuilt with cauliflower.'), ' · Lust auf gebratenen Reis, neu gebaut mit Blumenkohl.');
    const es = bootLang('es');
    assert.strictEqual(es(' · Fried rice craving, rebuilt with cauliflower.'), ' · Antojo de arroz frito, rehecho con coliflor.');
    assert.strictEqual(de(' · Something nobody translated.'), ' · Something nobody translated.', 'unknown text stays as it is');
    assert.strictEqual(de('Fried rice craving, rebuilt with cauliflower.'), 'Lust auf gebratenen Reis, neu gebaut mit Blumenkohl.', 'the plain line still works');
});

function bootBeta(lang) {
    const listeners = {}, docListeners = {};
    const mk = (tag) => { const n = { tagName: tag, children: [], dataset: {}, classList: { remove() { }, add() { }, contains: () => false }, innerHTML: '', insertBefore(c) { this.children.push(c); return c; }, appendChild(c) { this.children.push(c); return c; },
        querySelector(sel) { if (sel === '[data-b-open="swap"]') return this.children.find(c => c.dataset && c.dataset.bOpen === 'swap') || null; return null; } }; return n; };
    const tiles = mk('DIV');
    let cur = lang;
    const D = { body: mk('BODY'), querySelectorAll: () => [], getElementById: id => (id === 'g2cTiles' ? tiles : null), querySelector: () => null, createElement: mk,
        addEventListener: (t, f) => { (docListeners[t] = docListeners[t] || []).push(f); } };
    const sb = { document: D, MutationObserver: class { observe() { } }, requestAnimationFrame: f => { f(); return 1; }, console, localStorage: { getItem: () => cur },
        LowiLang: { get: () => cur } };
    sb.window = sb;
    vm.runInNewContext(read('beta.js'), sb);
    sb.LowiBeta.run();
    return { tile: () => tiles.children.find(c => c.dataset.bOpen === 'swap'), set: l => { cur = l; (docListeners['lowi:lang'] || []).forEach(f => f({})); }, count: () => tiles.children.length };
}

test('the Swap ingredients tile speaks Spanish and follows a language switch', () => {
    const b = bootBeta('es');
    assert.match(b.tile().innerHTML, /Cambiar ingredientes/);
    assert.match(b.tile().innerHTML, /Cambios más sanos/);
    assert.doesNotMatch(b.tile().innerHTML, /Swap ingredients|Healthier swaps/);
    b.set('de');
    assert.match(b.tile().innerHTML, /Zutatentausch/);
    b.set('en');
    assert.match(b.tile().innerHTML, /Swap ingredients/);
    assert.strictEqual(b.count(), 1, 'still one tile');
});
