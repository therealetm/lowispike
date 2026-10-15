/* top-bar.js core: theme switch, forecast parsing, body notes, i18n coverage, hooks */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../top-bar.js');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('one tap flips Night and Cloud', () => {
    assert.equal(C.nextTheme('dark'), 'light');
    assert.equal(C.nextTheme('light'), 'dark');
    assert.equal(C.nextTheme(undefined), 'light');
});

test('weather codes map to words and icons', () => {
    assert.equal(C.word(0, 'de'), 'Klar');
    assert.equal(C.word(63, 'de'), 'Regen');
    assert.equal(C.word(95, 'es'), 'Tormenta');
    assert.equal(C.icon(0, true), 'moon');
    assert.equal(C.icon(2, false), 'cloudsun');
    assert.equal(C.icon(73, false), 'snow');
    assert.ok(C.wet(61) && C.wet(81) && !C.wet(3));
});

const sample = () => ({
    current: { time: '2026-10-15T10:15', temperature_2m: 11.4, apparent_temperature: 9.1, relative_humidity_2m: 82, weather_code: 3, is_day: 1, wind_speed_10m: 18 },
    hourly: {
        time: Array.from({ length: 48 }, (_, i) => '2026-10-' + (15 + Math.floor(i / 24)) + 'T' + String(i % 24).padStart(2, '0') + ':00'),
        temperature_2m: Array.from({ length: 48 }, (_, i) => 8 + (i % 24) / 3),
        weather_code: Array.from({ length: 48 }, () => 3),
        precipitation_probability: Array.from({ length: 48 }, () => 10),
        is_day: Array.from({ length: 48 }, (_, i) => (i % 24) >= 8 && (i % 24) < 18 ? 1 : 0)
    },
    daily: { temperature_2m_max: [13.2, 12], temperature_2m_min: [6.1, 5], sunrise: ['2026-10-15T07:58', ''], sunset: ['2026-10-15T18:23', ''], uv_index_max: [2.1, 2], daylight_duration: [37440, 37000], precipitation_probability_max: [20, 40] }
});

test('forecast starts at the current hour and keeps 12 hours', () => {
    const fc = C.parseForecast(sample());
    assert.equal(fc.hours.length, 12);
    assert.equal(fc.hours[0].hh, '10');
    assert.equal(fc.hours[11].hh, '21');
    assert.equal(fc.today.max, 13.2);
    assert.equal(fc.today.sunrise, '07:58');
    assert.ok(Math.abs(fc.today.daylightH - 10.4) < 0.01);
    assert.equal(C.parseForecast({}), null);
    assert.equal(C.parseForecast(null), null);
});

test('body notes fit the weather', () => {
    const fc = C.parseForecast(sample());
    const n = C.bodyNotes(fc);
    assert.ok(n.includes('walk'), 'dry 9-11 degrees is walking weather');
    assert.ok(n.includes('light'), 'short, overcast day');
    assert.ok(!n.includes('heat') && !n.includes('wet'));
    const hot = C.bodyNotes({ now: { temp: 31, feels: 33, code: 0, isDay: 1 }, today: { max: 32, uv: 8, daylightH: 15 }, hours: [] });
    assert.deepEqual(hot.slice(0, 1), ['heat']);
    assert.ok(hot.includes('uv') && !hot.includes('walk') && !hot.includes('cold'));
    const cold = C.bodyNotes({ now: { temp: 1, feels: -3, code: 71, isDay: 1 }, today: { max: 2, daylightH: 8 }, hours: [] });
    assert.ok(cold.includes('cold') && cold.includes('wet') && cold.includes('light'));
    const late = C.bodyNotes({ now: { temp: 10, code: 2, isDay: 0, time: '2026-10-15T01:45' }, today: { max: 15, daylightH: 10.5 }, hours: [] });
    assert.equal(late[0], 'night');
    assert.ok(!late.includes('walk'), 'no walk tip at 2 AM');
    const bare = C.bodyNotes({ now: { temp: 15, code: 0, isDay: 1 } });
    assert.ok(bare.includes('walk'));
    assert.ok(hot.length <= 4 && cold.length <= 4);
    assert.deepEqual(C.bodyNotes(null), []);
});

test('every string and note exists in en, de and es', () => {
    for (const [k, v] of Object.entries(C.T)) assert.equal(v.length, 3, k);
    for (const [k, v] of Object.entries(C.NOTES)) { assert.equal(v.t.length, 3, k); assert.equal(v.d.length, 3, k); v.d.forEach(s => assert.ok(s.length > 30, k)); }
    assert.equal(C.tr('body', 'de'), 'So wirkt das Wetter heute auf deinen Körper');
    assert.equal(C.tr('weather', 'fr'), 'Weather');
});

test('forecast URL uses Open-Meteo with rounded coordinates', () => {
    const u = C.fcUrl(54.7837, 9.4321);
    assert.ok(u.startsWith('https://api.open-meteo.com/v1/forecast?latitude=54.78&longitude=9.43'));
    assert.ok(/hourly=temperature_2m,weather_code,precipitation_probability/.test(u) && /timezone=auto/.test(u));
});

test('loader, service worker and CSS hooks are in place', () => {
    const ui = R('apple-ui.js'), sw = R('sw.js'), css = R('top-bar.css');
    assert.ok(/const files=\[[^\]]*'top-bar\.js'[^\]]*\]/.test(ui));
    assert.ok(ui.includes("top-bar.css?v='+v"));
    assert.ok(sw.includes('"top-bar.js"') && sw.includes('"top-bar.css"'));
    assert.ok(/#g2eHead\{background:transparent!important/.test(css), 'sub-page header has no band');
    assert.ok(css.includes('html:not(.tb-scanok) #fxHint[data-h=scan]'), 'scan hint only on Today');
    assert.ok(css.includes('prefers-reduced-motion'));
});
