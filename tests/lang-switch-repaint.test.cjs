// Bug hunt BH-004 (Oct 19, 2026): switching language mid-session (Settings > Language, no reload) left Home half in the old
// language: Move, Scan, Settings, Sleep, the fasting bubble and the VoiceOver labels of Water, Move, the joystick, Scan, Settings
// and Misty stayed English in German or Spanish until a reload (live build 20261019-110810: 20 mismatches against a reload).
// Root cause: about 20 modules repaint on a `lowi:lang` event, but setLang() never fired it; and a tap on a [data-lang] picker
// called the inner setLang() directly, skipping every LowiLang.set wrapper. The ring module and the joystick had no repaint at all.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* the language script from index.html, run against a tiny stand-in DOM that records events and capture-phase click handlers */
function bootLangScript() {
    const html = read('index.html');
    const at = html.indexOf('const LANG_KEY = "lowispike.lang"');
    assert.ok(at > 0, 'language script found');
    const s = html.lastIndexOf('<script>', at) + '<script>'.length, e = html.indexOf('</script>', at);
    const src = html.slice(s, e);
    const events = [], clicks = [], store = {};
    const el = () => ({ querySelectorAll: () => [], appendChild() { }, children: [], classList: { toggle() { } } });
    const document = {
        readyState: 'complete', documentElement: { lang: 'en' }, body: el(),
        createTreeWalker: () => ({ nextNode: () => null }), querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
        addEventListener(type, fn, cap) { if (type === 'click') clicks.push(fn); },
        dispatchEvent(ev) { events.push(ev); return true; }
    };
    class CustomEvent { constructor(type, o) { this.type = type; this.bubbles = !!(o && o.bubbles); this.detail = o && o.detail; } }
    class MutationObserver { observe() { } disconnect() { } }
    const sandbox = {
        document, CustomEvent, MutationObserver, NodeFilter: { SHOW_TEXT: 4 }, navigator: { language: 'en-US', languages: ['en-US'] },
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() { }, console
    };
    sandbox.window = sandbox; sandbox.self = sandbox; sandbox.addEventListener = () => { };
    vm.runInNewContext(src, sandbox);
    return { W: sandbox, document, events, clicks };
}

test('setLang tells every module: lowi:lang fires on document, bubbling to window, with the new language', () => {
    const { W, events } = bootLangScript();
    assert.ok(W.LowiLang && typeof W.LowiLang.set === 'function');
    W.LowiLang.set('de');
    const ev = events.filter(e => e.type === 'lowi:lang');
    assert.equal(ev.length, 1, 'one lowi:lang per switch');
    assert.ok(ev[0].bubbles, 'bubbles from document to window, so window listeners hear it too');
    assert.equal(ev[0].detail.lang, 'de');
    W.LowiLang.set('es');
    assert.equal(events.filter(e => e.type === 'lowi:lang').pop().detail.lang, 'es');
});

test('a tap on a language picker goes through LowiLang.set, so module wrappers of set() run too', () => {
    const { W, clicks, events } = bootLangScript();
    const seen = [];
    const s0 = W.LowiLang.set; W.LowiLang.set = function (l) { seen.push(l); return s0.apply(this, arguments); };
    const btn = { dataset: { lang: 'es' } };
    const ev = { target: { closest: sel => (sel === '[data-lang]' ? btn : null) }, preventDefault() { }, stopPropagation() { } };
    assert.ok(clicks.length >= 1, 'capture click handler registered');
    clicks.forEach(fn => fn(ev));
    assert.deepEqual(seen, ['es'], 'the picker tap reached the wrapped LowiLang.set');
    assert.equal(W.LowiLang.get(), 'es');
    assert.ok(events.some(e => e.type === 'lowi:lang' && e.detail.lang === 'es'));
});

test('the ring repaints its own bubbles (Scan, Sleep, Settings) in all three languages on lowi:lang', () => {
    const js = read('home-orbit-v2.js');
    assert.ok(/D\.addEventListener\('lowi:lang', \(\) => \{ relabel\(\);/.test(js), 'ring listens for lowi:lang');
    assert.ok(/scan: \[\['Scan a product', 'Scan'\], \['Produkt scannen', 'Scannen'\], \['Escanear un producto', 'Escanear'\]\]/.test(js));
    assert.ok(/settings: \[\['Community\. Hold for settings', 'Community'\], \['Community\. Halten f\\u00fcr Einstellungen', 'Community'\], \['Comunidad\. Mant\\u00e9n para los ajustes', 'Comunidad'\]\]/.test(js), 'the top bubble is Community (Oct 21 2026)');
    assert.ok(/if \(labelLang !== lang\(\)\)/.test(js), 'also catches a language change without the event (compares with the last language written)');
    /* the core export (node): offscreen added for the ring-return fix (Misty flying back in) */
    const core = require('../home-orbit-v2.js');
    assert.deepEqual(Object.keys(core).sort(), ['ORDER', 'angleOf', 'fit', 'moved', 'offscreen']);
});

test('joystick label, fasting bubble and Misty\'s VoiceOver name follow a switch without a reload', () => {
    assert.ok(/W\.addEventListener\('lowi:lang', \(\) => \{ paint\(\);/.test(read('misty-pad.js')), 'joystick aria-label repaints');
    const sp = read('spirit.js');
    assert.ok(/window\.addEventListener\('lowi:lang', refresh\)/.test(sp), 'spirit Home (fasting bubble) repaints');
    assert.ok(/head = tr\('world'\)/.test(sp) && /\(copy\.world \|\| \[\]\)\.indexOf\(cur\) >= 0/.test(sp), 'Misty aria head follows the language, only when it is ours');
    assert.ok(/'lowi:care', 'lowi:lang', 'storage'\]/.test(read('cell-world.js')), 'Misty state pill + aria tail repaints');
});
