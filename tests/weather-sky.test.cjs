'use strict';
/* Weather sky: the app background follows the real weather outside (weather-sky-core.js + weather-sky.js). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const core = require(path.join(root, 'weather-sky-core.js'));

// Flensburg, 14 Oct 2026: sunrise 07:46, sunset 18:16 (UTC+2)
const RISE = Date.parse('2026-10-14T05:46:00Z'), SET = Date.parse('2026-10-14T16:16:00Z');
const at = iso => Date.parse(iso);
const reading = (code, temp, extra = {}) => Object.assign({ code, temp, ts: at('2026-10-14T12:00:00Z'), sunrise: RISE, sunset: SET }, extra);

test('rain outside is rain in the app, drizzle and storm are wet too', () => {
    for (const code of [61, 63, 65, 80, 81, 82, 66]) assert.equal(core.sky(reading(code, 11), at('2026-10-14T12:10:00Z')).cond, 'rain', 'code ' + code);
    assert.equal(core.sky(reading(53, 11), at('2026-10-14T12:10:00Z')).cond, 'drizzle');
    assert.equal(core.sky(reading(95, 18), at('2026-10-14T12:10:00Z')).cond, 'storm');
    for (const code of [53, 63, 95]) assert.equal(core.sky(reading(code, 11), at('2026-10-14T12:10:00Z')).wet, true);
    assert.equal(core.sky(reading(0, 11), at('2026-10-14T12:10:00Z')).wet, false);
});

test('sun, clouds, fog and snow map from the WMO codes', () => {
    const now = at('2026-10-14T12:10:00Z');
    assert.equal(core.sky(reading(0, 20), now).cond, 'clear');
    assert.equal(core.sky(reading(1, 20), now).cond, 'clear');
    assert.equal(core.sky(reading(2, 20), now).cond, 'partly');
    assert.equal(core.sky(reading(3, 20), now).cond, 'cloudy');
    assert.equal(core.sky(reading(45, 5), now).cond, 'fog');
    assert.equal(core.sky(reading(73, -2), now).cond, 'snow');
    assert.equal(core.sky(reading(86, -2), now).cond, 'snow');
});

test('light outside is day, dark outside is night, from the real sunrise and sunset', () => {
    const s = core.sky(reading(0, 12), at('2026-10-14T12:00:00Z'));
    assert.equal(s.day, true); assert.equal(s.phase, 'day'); assert.equal(s.lightSrc, 'sun');
    // 18:30 local: the old fixed 19:00 rule said day, but the sun set at 18:16
    const dusk = core.sky(reading(0, 12, { ts: at('2026-10-14T16:20:00Z') }), at('2026-10-14T16:30:00Z'));
    assert.equal(dusk.day, false); assert.equal(dusk.phase, 'dusk');
    const night = core.sky(reading(0, 9, { ts: at('2026-10-14T19:00:00Z') }), at('2026-10-14T19:30:00Z'));
    assert.equal(night.day, false); assert.equal(night.phase, 'night'); assert.equal(night.stars, true);
    const dawn = core.sky(reading(0, 5, { ts: at('2026-10-14T05:30:00Z') }), at('2026-10-14T05:40:00Z'));
    assert.equal(dawn.phase, 'dawn'); assert.equal(dawn.day, false);
    // a reading from yesterday afternoon still knows roughly when today's sun rises
    const next = core.daylight(reading(0, 5), at('2026-10-15T09:00:00Z'));
    assert.equal(next.day, true); assert.equal(next.src, 'sun');
});

test('rain at night stays rain without stars; clouds hide the stars', () => {
    const s = core.sky(reading(63, 7, { ts: at('2026-10-14T19:00:00Z') }), at('2026-10-14T19:10:00Z'));
    assert.equal(s.cond, 'rain'); assert.equal(s.day, false); assert.equal(s.stars, false);
    assert.equal(core.sky(reading(3, 7, { ts: at('2026-10-14T19:00:00Z') }), at('2026-10-14T19:10:00Z')).stars, false);
});

test('cold outside is cold in the app (and hot is hot)', () => {
    const now = at('2026-10-14T12:10:00Z');
    assert.equal(core.sky(reading(0, -4), now).temp, 'freezing');
    assert.equal(core.sky(reading(0, 0), now).temp, 'freezing');
    assert.equal(core.sky(reading(0, 4), now).temp, 'cold');
    assert.equal(core.sky(reading(0, 14), now).temp, 'mild');
    assert.equal(core.sky(reading(0, 23), now).temp, 'warm');
    assert.equal(core.sky(reading(0, 31), now).temp, 'hot');
});

test('no reading: the local clock sets day or night and no weather is invented', () => {
    const noon = new Date(2026, 9, 14, 12, 0).getTime(), late = new Date(2026, 9, 14, 23, 0).getTime();
    for (const w of [null, undefined, {}, { code: 'x', temp: 3, ts: noon }]) {
        const s = core.sky(w, noon);
        assert.equal(s.src, 'clock'); assert.equal(s.cond, 'none'); assert.equal(s.temp, 'none'); assert.equal(s.wet, false); assert.equal(s.day, true);
    }
    const n = core.sky(null, late);
    assert.equal(n.day, false); assert.equal(n.phase, 'night'); assert.equal(n.stars, true);
});

test('a stale reading (over 6 hours) no longer claims rain', () => {
    const w = reading(63, 8, { ts: at('2026-10-14T05:00:00Z') });
    assert.equal(core.sky(w, at('2026-10-14T10:00:00Z')).cond, 'rain');
    const s = core.sky(w, at('2026-10-14T12:00:00Z'));
    assert.equal(s.cond, 'none'); assert.equal(s.src, 'clock');
    assert.equal(s.lightSrc, 'sun', 'sunrise/sunset of the location still decide light');
});

test('is_day is only trusted while the reading is fresh', () => {
    const w = { code: 0, temp: 10, ts: at('2026-10-14T12:00:00Z'), isDay: 0 };
    assert.equal(core.daylight(w, at('2026-10-14T12:20:00Z')).day, false);
    assert.equal(core.daylight(w, at('2026-10-14T12:20:00Z')).src, 'weather');
    assert.equal(core.daylight(w, at('2026-10-14T14:30:00Z')).src, 'clock');
});

test('Open-Meteo answer becomes a reading with real sunrise and sunset', () => {
    const w = core.fromOpenMeteo({ utc_offset_seconds: 7200, current: { temperature_2m: 6.4, weather_code: 61, is_day: 1 }, daily: { sunrise: ['2026-10-14T07:46'], sunset: ['2026-10-14T18:16'] } }, 123);
    assert.deepEqual(w, { temp: 6.4, code: 61, ts: 123, isDay: 1, sunrise: RISE, sunset: SET });
    assert.equal(core.fromOpenMeteo({ current: {} }), null);
    const bare = core.fromOpenMeteo({ current: { temperature_2m: 3, weather_code: 3 } }, 5);
    assert.deepEqual(bare, { temp: 3, code: 3, ts: 5 });
});

/* weather-sky.js in a small fake DOM */
function page(opts = {}) {
    const store = new Map(Object.entries(opts.local || {}));
    const attrs = {}, dataset = {}, listeners = {};
    const app = { id: 'app', firstChild: null, children: [], insertBefore(n) { this.children.unshift(n); this.firstChild = n; n.parentNode = this; } };
    const layer = () => ({ id: '', hidden: false, innerHTML: '', setAttribute() {} });
    const H = { dataset, getAttribute: k => attrs[k], setAttribute: (k, v) => { attrs[k] = v; } };
    const D = { documentElement: H, readyState: 'complete', hidden: false, getElementById: id => id === 'app' ? app : id === 'wxSky' ? app.children.find(c => c.id === 'wxSky') || null : null, createElement: layer, addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }, dispatchEvent: e => (listeners[e.type] || []).forEach(f => f(e)) };
    let applied = 0;
    const R2 = { theme: () => store.get('lowi.theme') || 'dark', themeEffective(mode) { const m = mode || R2.theme(); return m === 'sunrise' ? 'clock-' + m : m; }, applyTheme() { applied++; attrs['data-theme'] = R2.themeEffective(); } };
    const geo = { calls: 0, getCurrentPosition() { geo.calls++; } };
    const win = { LowiR2: R2, addEventListener() {} };
    const ctx = vm.createContext({ window: win, document: D, localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }, navigator: { geolocation: geo }, CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; }, Date, JSON, setInterval: () => 1, clearInterval() {}, module: undefined, self: undefined });
    vm.runInContext('var self = window; ' + read('weather-sky-core.js').replace('typeof self !== \'undefined\' ? self : this', 'window') + '\n' + read('weather-sky.js'), ctx);
    win.LowiSkyCore = win.LowiSkyCore || ctx.LowiSkyCore;
    return { win, D, H, app, store, R2, geo, attrs, applied: () => applied };
}

test('the sky layer sits behind everything, first in #app, and marks the weather', () => {
    const now = Date.now();
    const p = page({ local: { 'lowi.weather.v1': JSON.stringify({ code: 63, temp: 4, ts: now, sunrise: now - 3600000, sunset: now + 3600000 }) } });
    assert.equal(p.app.firstChild.id, 'wxSky');
    assert.equal(p.H.dataset.wxCond, 'rain'); assert.equal(p.H.dataset.wxTemp, 'cold'); assert.equal(p.H.dataset.wxDay, 'day'); assert.equal(p.H.dataset.wxWet, '1'); assert.equal(p.H.dataset.wxSrc, 'weather');
    assert.equal(p.geo.calls, 0, 'the sky never asks for location itself');
});

test('missing weather falls back quietly to the clock', () => {
    const p = page();
    assert.equal(p.H.dataset.wxSrc, 'clock'); assert.equal(p.H.dataset.wxCond, 'none'); assert.equal(p.geo.calls, 0);
});

test('a new reading from spirit.js repaints the sky at once', () => {
    const p = page();
    const now = Date.now();
    p.store.set('lowi.weather.v1', JSON.stringify({ code: 73, temp: -3, ts: now, sunrise: now - 3600000, sunset: now + 3600000 }));
    p.D.dispatchEvent({ type: 'lowi:weather' });
    assert.equal(p.H.dataset.wxCond, 'snow'); assert.equal(p.H.dataset.wxTemp, 'freezing');
});

test('Night and Cloud stay as chosen; Sunrise mode follows the real sun', () => {
    const now = Date.now();
    const dark = JSON.stringify({ code: 0, temp: 9, ts: now, sunrise: now - 13 * 3600000, sunset: now - 3600000 });
    const p = page({ local: { 'lowi.theme': 'light', 'lowi.weather.v1': dark } });
    assert.equal(p.R2.themeEffective('light'), 'light');
    assert.equal(p.R2.themeEffective('dark'), 'dark');
    assert.equal(p.R2.themeEffective('sunrise'), 'dark');
    const light = JSON.stringify({ code: 0, temp: 9, ts: now, sunrise: now - 3600000, sunset: now + 3600000 });
    const q = page({ local: { 'lowi.theme': 'sunrise', 'lowi.weather.v1': light } });
    assert.equal(q.R2.themeEffective('sunrise'), 'light');
    assert.equal(q.attrs['data-theme'], 'light', 'Sunrise mode re-applied from the real sun');
});

test('the sky can be switched off and back on', () => {
    const p = page();
    p.win.LowiSky.setEnabled(false);
    assert.equal(p.H.dataset.wxCond, undefined); assert.equal(p.app.firstChild.hidden, true);
    p.win.LowiSky.setEnabled(true);
    assert.equal(p.H.dataset.wxCond, 'none'); assert.equal(p.app.firstChild.hidden, false);
});

test('wiring: real Open-Meteo call, loader, offline cache, no touches, reduced motion', () => {
    const spirit = read('spirit.js'), ui = read('apple-ui.js'), sw = read('sw.js'), css = read('weather-sky.css'), js = read('weather-sky.js');
    assert.match(spirit, /current=temperature_2m,weather_code,is_day&daily=sunrise,sunset/);
    assert.match(spirit, /LowiSkyCore\.fromOpenMeteo/);
    assert.match(spirit, /dispatchEvent\(new CustomEvent\('lowi:weather'/);
    assert.match(ui, /'weather-sky-core\.js','weather-sky\.js'/);
    assert.match(ui, /weather-sky\.css\?v=/);
    for (const f of ['weather-sky-core.js', 'weather-sky.js', 'weather-sky.css']) assert.equal(sw.split('"' + f + '"').length - 1, 2, f + ' cached and served by sw.js');
    assert.match(css, /#wxSky \{[^}]*pointer-events: none/);
    assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none !important/);
    assert.match(css, /#spWorld\.sp-capture\) #wxSky \{ visibility: hidden \}/);
    assert.doesNotMatch(js, /getCurrentPosition|watchPosition|permissions\.query/);
    new vm.Script(js); new vm.Script(read('weather-sky-core.js'));
});
