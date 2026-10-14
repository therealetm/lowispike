/* LOWiSPIKE weather sky: pure rules that turn the real Open-Meteo reading into an app atmosphere.
   No DOM here, so the rules run in Node tests. Input is the object spirit.js caches in lowi.weather.v1:
   {temp, code, ts, isDay?, sunrise?, sunset?}  (sunrise/sunset are epoch ms for the reading's location). */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiSkyCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const STALE_MS = 6 * 3600000; // an older reading no longer says anything about outside right now
    const TWILIGHT_MS = 40 * 60000; // dawn / dusk window around real sunrise / sunset

    /* WMO weather codes (Open-Meteo) -> one look */
    function condition(code) {
        code = +code;
        if (!Number.isFinite(code)) return 'none';
        if (code <= 1) return 'clear';
        if (code === 2) return 'partly';
        if (code === 3) return 'cloudy';
        if (code === 45 || code === 48) return 'fog';
        if (code >= 51 && code <= 57) return 'drizzle';
        if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
        if (code >= 95) return 'storm';
        if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
        return 'cloudy';
    }

    function tempBand(t) {
        if (!Number.isFinite(t)) return 'none';
        if (t <= 0) return 'freezing';
        if (t < 8) return 'cold';
        if (t < 20) return 'mild';
        if (t < 27) return 'warm';
        return 'hot';
    }

    function fresh(w, now) {
        return !!(w && Number.isFinite(+w.code) && Number.isFinite(+w.temp) && Number.isFinite(+w.ts) && now - w.ts >= -60000 && now - w.ts < STALE_MS);
    }

    /* the same sunrise/sunset moved to the day of now (a reading from this morning still knows tonight's sunset) */
    function sunTimes(w, now) {
        if (!w || !Number.isFinite(+w.sunrise) || !Number.isFinite(+w.sunset) || +w.sunset <= +w.sunrise) return null;
        const DAY = 86400000;
        if (Math.abs(now - w.sunrise) > 3 * DAY) return null; // old location data: let the clock decide
        const shift = Math.round((now - (+w.sunrise + +w.sunset) / 2) / DAY) * DAY;
        return { rise: +w.sunrise + shift, set: +w.sunset + shift };
    }

    function clockDay(date) {
        const h = date.getHours();
        return h >= 7 && h < 19;
    }

    /* light outside? real sunrise/sunset first, then Open-Meteo is_day (fresh only), then the local clock */
    function daylight(w, now) {
        now = +now || Date.now();
        const sun = sunTimes(w, now);
        if (sun) {
            const day = now >= sun.rise && now < sun.set;
            let phase = day ? 'day' : 'night';
            if (Math.abs(now - sun.rise) < TWILIGHT_MS) phase = 'dawn';
            else if (Math.abs(now - sun.set) < TWILIGHT_MS) phase = 'dusk';
            return { day, phase, src: 'sun' };
        }
        if (fresh(w, now) && (w.isDay === 0 || w.isDay === 1) && now - w.ts < 3600000) {
            return { day: w.isDay === 1, phase: w.isDay === 1 ? 'day' : 'night', src: 'weather' };
        }
        const d = new Date(now), h = d.getHours() + d.getMinutes() / 60, day = clockDay(d);
        return { day, phase: h >= 6.4 && h < 7.6 ? 'dawn' : h >= 18.4 && h < 19.6 ? 'dusk' : day ? 'day' : 'night', src: 'clock' };
    }

    /* the whole look: what the sky layer and Sunrise mode read */
    function sky(w, now) {
        now = +now || Date.now();
        const ok = fresh(w, now), light = daylight(w, now);
        const cond = ok ? condition(w.code) : 'none';
        return {
            src: ok ? 'weather' : 'clock',
            cond,
            temp: ok ? tempBand(+w.temp) : 'none',
            day: light.day,
            phase: light.phase,
            lightSrc: light.src,
            wet: cond === 'rain' || cond === 'drizzle' || cond === 'storm',
            stars: !light.day && (cond === 'clear' || cond === 'partly' || cond === 'none')
        };
    }

    /* Open-Meteo JSON -> cached reading (sunrise/sunset are local wall times; utc_offset_seconds pins them) */
    function fromOpenMeteo(data, ts) {
        const c = data && data.current;
        if (!c || !Number.isFinite(c.temperature_2m)) return null;
        const w = { temp: c.temperature_2m, code: +c.weather_code || 0, ts: ts || Date.now() };
        if (c.is_day === 0 || c.is_day === 1) w.isDay = c.is_day;
        const off = Number.isFinite(data.utc_offset_seconds) ? data.utc_offset_seconds : null, d = data.daily;
        const at = s => typeof s === 'string' && off !== null ? Date.parse(s + (s.length === 16 ? ':00' : '') + 'Z') - off * 1000 : NaN;
        if (d && d.sunrise && d.sunset) {
            const rise = at(d.sunrise[0]), set = at(d.sunset[0]);
            if (Number.isFinite(rise) && Number.isFinite(set) && set > rise) { w.sunrise = rise; w.sunset = set; }
        }
        return w;
    }

    return { condition, tempBand, fresh, daylight, sky, fromOpenMeteo, STALE_MS };
});
