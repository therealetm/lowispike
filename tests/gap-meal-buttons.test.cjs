// Oct 28 2026 (Emmanuel: "Mach doch jetzt alles live"): the Letzte / Erste Mahlzeit buttons were built in a sheet that opened behind
// the Essenspause screen, so nobody could press them. They sit right on the Essenspause screen now, every old door to the sheet opens
// that screen, and a long press on the timer shows only the body phases. These tests run the real fasting module in a small VM.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const gv = fs.readFileSync(path.join(root, 'gap-view.js'), 'utf8');
const gvcss = fs.readFileSync(path.join(root, 'gap-view.css'), 'utf8');
const lb = fs.readFileSync(path.join(root, 'living-bubbles.js'), 'utf8');
const hb = fs.readFileSync(path.join(root, 'home-blooms-v2.js'), 'utf8');
const H = 36e5;

function stopSrc() {
    const a = html.indexOf('/* LOWiSPIKE fasting stop (Oct 10, 2026): "I just ate"');
    assert.ok(a > 0, 'found the fasting stop module');
    const end = html.indexOf('\n})();', html.indexOf('window.LowiFastStop = {'));
    return html.slice(a, end) + '\n})();';
}
function host(init, extra) {
    const store = new Map(Object.entries(init || {}));
    const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
    const document = { hidden: false, head: null, body: { appendChild() {} }, documentElement: { appendChild() {} }, activeElement: null,
        addEventListener() {}, getElementById: () => null, querySelectorAll: () => [], querySelector: () => null,
        createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, querySelector: () => null, addEventListener() {} }) };
    const win = Object.assign({ localStorage, document, Date, Math, JSON, console, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
        setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, matchMedia: () => ({ matches: false }), addEventListener() {}, dispatchEvent: () => true,
        toast() {}, closeSheet() {}, S: { td: { meals: 0 }, logs: [] }, award() {} }, extra || {});
    win.window = win; win.self = win;
    vm.createContext(win);
    vm.runInContext(stopSrc(), win);
    return win;
}

test('running: the screen shows "Erste Mahlzeit" with time chips, the clock and the button, no meal log', () => {
    const W = host({ lowi_fast_v1: JSON.stringify({ last: Date.now() - 5 * H, hist: [], v2: 1 }) });
    const h = W.LowiFastStop.ctl();
    assert.match(h, /data-fst="pick"/, 'time chips');
    assert.match(h, /id="fstIn" type="datetime-local"|type="datetime-local" id="fstIn"/, 'any other time');
    assert.match(h, /data-fst="end">First meal: now</, 'the stop button');
    assert.ok(!/fst-hist|fst-sum/.test(h), 'compact: no second summary or history (the screen shows those)');
});
test('stopped: the screen shows "Letzte Mahlzeit"', () => {
    const W = host({ lowi_fast_v1: JSON.stringify({ last: Date.now() - 2 * H, hist: [], off: 1, v2: 1 }) });
    assert.strictEqual(W.LowiFastStop.startOf(), 0);
    assert.match(W.LowiFastStop.ctl(), /data-fst="end">Last meal: now</);
});
test('every old door to the sheet opens the Essenspause screen with the buttons', () => {
    const calls = [];
    const W = host({ lowi_fast_v1: JSON.stringify({ last: Date.now() - 5 * H, hist: [], v2: 1 }) }, { LowiGapView: { open: o => { calls.push(o); return true; } } });
    W.LowiFastStop.open();
    assert.deepStrictEqual(calls.map(o => !!(o && o.ctl)), [true]);
    assert.match(html, /if \(!\(o && o\.sheet\) && window\.LowiGapView && typeof LowiGapView\.open === "function"\)/);
});
test('the screen puts the buttons in its body, running and stopped, and never repaints under an open time wheel', () => {
    assert.match(gv, /'<div class="gv-editslot"><\/div>' \+ ctlSec\(m\) \+ acts\(\)/, 'running: right under the last meal');
    assert.match(gv, /'<p class="gv-sub">' \+ esc\(s\('noneSub'\)\) \+ '<\/p>' \+ ctlSec\(m\) \+ acts\(\)/, 'stopped: right under the line that says what to do');
    assert.match(gv, /<div id="fstSheet" data-mode="ctl">/, 'the fasting module repaints only the compact buttons there');
    assert.match(html, /el\.innerHTML = el\.dataset\.mode === "ctl" \? ctl\(\) : body\(\);/);
    assert.match(gv, /if \(ae && ae\.id === 'fstIn' && el\.contains\(ae\)\) return;/);
    assert.match(gvcss, /\.gv-ctl \.fst-go, \.fst-sh\.gv-ctl \.fst-go \{ position: static;/, 'the button stays in its card');
    for (const t of ["noneSub: 'Wenn du fertig gegessen hast, tipp unten auf „Letzte Mahlzeit“.", "phT: 'Nach dem Essen'", "phT: 'After your meal'", "phT: 'Después de comer'"]) assert.ok(gv.includes(t), t);
});
test('a tap on the screen\'s button keeps the screen open and tells it to repaint', () => {
    assert.match(html, /const inGap = !!a\.closest\("#gvSheet"\);/);
    assert.match(html, /SEL = 0; try \{ window\.dispatchEvent\(new CustomEvent\("lowi:fast", \{detail:\{stop:true\}\}\)\); \}/);
});
test('long press on the timer: the phases-only screen (strip + markers), from both hold listeners, opened once', () => {
    assert.match(gv, /if \(mode === 'phases'\) return phasesOnly\(m\);/);
    assert.match(gv, /function phasesOnly\(m\) \{[^\n]*curve\(m\) \+ markers\(m\)/);
    assert.ok(!/function phasesOnly\(m\) \{[^\n]*(acts\(|today\(|ctlSec\(|recent\()/.test(gv), 'no buttons, meals or stats');
    assert.match(lb, /return G\.open\(\{ phases: true \}\) !== false;/);
    assert.match(hb, /G\.open\(\{ phases: true \}\)/);
});
