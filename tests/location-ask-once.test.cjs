'use strict';
/* Nov 7 2026 (Emmanuel, screenshot of the iPhone asking for the location at launch: "Diese Benachrichtigung ist nervig. Die passiert, wenn
   man die App neu öffnet ... erst dann, wenn man in der Einstellung das manuell aktivieren möchte"). An iPhone Home Screen app does not
   keep the location yes between launches, so every launch that read the location asked again. Now the place from the last yes is kept
   on this phone (rounded, never backed up) and launches and the weather panel use it without asking; only Settings > weather asks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sp = read('spirit.js');
function fnSrc(s, sig) { const i = s.indexOf(sig); assert.ok(i >= 0, sig); let d = 0; const j = s.indexOf('{', i); for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } } throw new Error('unclosed'); }
function run(local, perm) {
    const store = new Map(Object.entries(local || {})), calls = { geo: 0, fetch: [] };
    const ctx = { localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
        navigator: { geolocation: { getCurrentPosition() { calls.geo++; } }, permissions: perm ? { query: () => Promise.resolve({ state: perm }) } : undefined },
        fetch: u => { calls.fetch.push(u); return Promise.resolve({ ok: false }); }, AbortSignal: {}, WEATHER_KEY: 'lowi.weather.v1', paintWeather() { }, Date, JSON, Number, console };
    vm.createContext(ctx); vm.runInContext(fnSrc(sp, 'function weather(ask, launch)'), ctx);
    return { ctx, calls, store };
}
test('a launch with a kept place fetches the weather for it and asks nothing', async () => {
    const r = run({ 'lowi.weather.v1.at': '{"lat":52.52,"lon":13.4}' }, 'prompt');
    r.ctx.weather(false, true); await new Promise(f => setTimeout(f, 10));
    assert.equal(r.calls.geo, 0, 'no location question');
    assert.match(r.calls.fetch[0] || '', /latitude=52\.52&longitude=13\.40/);
});
test('a launch with no kept place asks nothing either, even after an earlier yes (the iPhone said prompt every launch)', async () => {
    const r = run({ 'lowi.weather.v1.optin': '1' }, 'prompt');
    r.ctx.weather(false, true); await new Promise(f => setTimeout(f, 10));
    assert.equal(r.calls.geo, 0);
});
test('turning the weather on in Settings asks, and keeps the place on this phone only', async () => {
    const r = run({}, 'prompt');
    r.ctx.weather(true); assert.equal(r.calls.geo, 1);
    assert.match(sp, /localStorage\.setItem\(AT_KEY, JSON\.stringify\(\{ lat: \+pos\.coords\.latitude\.toFixed\(2\), lon: \+pos\.coords\.longitude\.toFixed\(2\) \}\)\)/);
    const sync = require('../account-sync-core.js');
    assert.equal(sync.synced('lowi.weather.v1.at'), false, 'never in the account backup');
});
test('the weather panel uses the kept place first', () => {
    assert.match(read('top-bar.js'), /JSON\.parse\(localStorage\.getItem\('lowi\.weather\.v1\.at'\) \|\| 'null'\); if \(at && Number\.isFinite\(\+at\.lat\)/);
});
