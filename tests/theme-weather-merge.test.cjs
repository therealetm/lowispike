'use strict';
/* Nov 5 2026 (owner: "just have the app theme be inside of the time of day and weather ... put it in there logically, like Apple
   would" and "make dark mode the universal mode for everyone, cuz it just looks better"). Pins: one look row in Settings, the
   sheet it opens is grouped Look / Time of day / World with the look first, every device switches to true black Dark once, a look
   picked afterwards stays, and the tour names the new place. tools/theme-weather/flow.cjs is the phone-sized browser check. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function boot(saved) {
    const store = Object.assign({}, saved || {});
    const attrs = { 'data-theme': 'dark' };
    const H = { getAttribute: k => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: k => { delete attrs[k]; }, hasAttribute: k => k in attrs, classList: { contains: () => false, toggle() { }, add() { }, remove() { } }, style: {} };
    const D = { documentElement: H, querySelector: () => null, querySelectorAll: () => [], addEventListener() { }, dispatchEvent() { }, styleSheets: [], body: null, readyState: 'complete' };
    const win = {
        document: D, localStorage: { get length() { return Object.keys(store).length; }, getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        addEventListener() { }, setInterval: () => 0, setTimeout: () => 0, clearTimeout() { }, requestAnimationFrame: () => 0, MutationObserver: function () { this.observe = () => { }; },
        CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, getComputedStyle: () => ({ getPropertyValue: () => '' }), console
    };
    win.window = win; win.self = win; win.globalThis = win;
    const ctx = vm.createContext(win);
    vm.runInContext(read('true-black-core.js'), ctx, { filename: 'true-black-core.js' });
    vm.runInContext(read('true-black.js'), ctx, { filename: 'true-black.js' });
    return { TB: win.LowiTrueBlack, store, win };
}

test('every device switches to true black Dark once, whatever look it had', () => {
    for (const old of [{ 'lowi.theme': 'light', 'lowi.atmos': '{"mode":"manual","p":25}', 'lowi.atmos.css': 'x' },
        { 'lowi.theme.dark': 'night', 'lowi.theme.dark.picked': 'night', 'lowi.theme.dark.fix1': '1', 'lowi.theme': 'dark' },
        { 'lowi.atmos': '{"mode":"auto","p":40}', 'lowi.theme': 'light' }, {}]) {
        const r = boot(old);
        assert.equal(r.TB.kind(), 'black', JSON.stringify(old));
        assert.equal(r.store['lowi.theme'], 'dark');
        assert.deepEqual(JSON.parse(r.store['lowi.atmos']), { mode: 'manual', p: 100 }, 'the slider sits on Night (dark) by hand, not Auto');
        assert.ok(!('lowi.atmos.css' in r.store), 'the old look\'s sky colours are dropped');
        assert.ok(!('lowi.theme.dark.picked' in r.store));
        assert.equal(r.store['lowi.theme.dark.all1'], '1');
    }
});

test('a look picked after the switch stays: Day and Night survive the next start', () => {
    let r = boot({});
    r.store['lowi.theme'] = 'light'; r.store['lowi.atmos'] = '{"mode":"manual","p":25}';
    let again = boot(r.store);
    assert.equal(again.store['lowi.theme'], 'light', 'Day stays');
    r = boot({});
    r.TB.set('night', { byHand: true });
    again = boot(r.store);
    assert.equal(again.TB.kind(), 'night', 'Night stays');
});

test('the first-start check still sees an empty storage on a new phone', () => {
    const r = boot({});
    assert.equal(r.win.__lowiFresh, true);
    const r2 = boot({ 'lowi.lang': 'de' });
    assert.equal(r2.win.__lowiFresh, false);
    const html = read('index.html');
    assert.ok(html.includes('try{if(window.__lowiFresh==null)window.__lowiFresh=localStorage.length===0}catch(e){}'), 'the later check keeps the earlier answer');
    assert.ok(html.indexOf('true-black.js') < html.indexOf('id="igFresh"'), 'true-black.js runs first');
    assert.ok(html.includes('k.indexOf("lowi.theme.dark") === 0'), 'a reset that keeps the look keeps the Dark switch flag too');
});

test('Settings has one look row, first in its group, with Still galaxy right under it; no separate App theme row', () => {
    delete require.cache[require.resolve('../community-me.js')];
    const M = require('../community-me.js');
    const g = M.groups(() => true).find(x => x.key === 'settings');
    assert.equal(g.ids[0], 'sky'); assert.equal(g.ids[1], 'galaxyStill');
    assert.ok(!g.ids.includes('theme'));
    const src = read('community-me.js');
    assert.ok(src.includes("en: ['Look, time of day & weather'") && src.includes("de: ['Design, Tageszeit & Wetter'") && src.includes("es: ['Aspecto, hora y tiempo'"));
    assert.ok(!src.includes('data-cme-theme'), 'no theme buttons left in the Settings page');
    assert.ok(/aria-label="' \+ esc\(W2\[0\]\) \+ ': ' \+ esc\(now\)/.test(src), 'VoiceOver hears the row and the current look');
});

test('the sheet from Settings is grouped Look / Time of day / World, the look first, one line saying what the choice does', () => {
    const atm = read('atmosphere.js'), core = read('atmosphere-core.js'), css = read('atmosphere.css');
    assert.ok(atm.includes("const grouped = !!card.closest('.atm-sheet');"));
    const g = atm.slice(atm.indexOf('function groupedHTML'), atm.indexOf('function cardHTML'));
    assert.ok(g.indexOf("sec('Look'") < g.indexOf("sec('Time'") && g.indexOf("sec('Time'") < g.indexOf("sec('World'"));
    for (const k of ['sheetTitle', 'secLook', 'secTime', 'secWorld', 'footDay', 'footBlack', 'footNight', 'footAutoBlack', 'footAutoNight', 'footSlider']) assert.ok(new RegExp('\\b' + k + ": \\['").test(core), k);
    assert.ok(/\.atm-grouped \.atm-quick button \{[^}]*height: 44px/.test(css));
    assert.ok(css.includes('html[data-black="1"] .atm-grouped .atm-grp { background: #0b0b0b;'), 'neutral black panels in Dark');
});

test('the tour names the new place: the Settings card and a What\'s New card that points at the look row', () => {
    const S = require('../tutorial-steps.js');
    const st = S.STEPS.find(s => s.id === 'settings');
    assert.ok(/look and weather/.test(st.text.en) && /Design & Wetter/.test(st.text.de) && /aspecto y tiempo/.test(st.text.es));
    const n = S.STEPS.find(s => s.id === 'new-look-weather');
    assert.ok(n && n.area === 'new' && n.open === 'settings-sheet');
    assert.deepEqual(n.target, ['.cme-ov [data-cme="sky"]']);
    for (const l of ['en', 'de', 'es']) assert.ok(n.text[l].length <= 125 && n.title[l].length <= 32, l);
    assert.ok(S.VERSION >= 41);
});
