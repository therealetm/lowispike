/* LOWiSPIKE top bar (Oct 15, 2026, from E-man's iPad screenshot + voice note):
   1. Sub-page header (Back + title, #g2eHead) no longer paints a solid black band: it is transparent and only
      gets a soft fade when content scrolls under it. The "TAP TO SCAN" first-use hint only shows on Today,
      never floating over Community, Cook, Move or a Profile sub-page.
   2. One-tap Day/Night switch (#tbTheme) next to the profile button on every page, phone, iPad and desktop.
      It uses LowiR2.applyTheme, so Look & sound stays in sync; Sunrise (automatic) stays in Look & sound.
   3. Tapping the weather pill opens a small weather app inside LOWiSPIKE: now, next hours, today's high/low,
      sunrise/sunset, UV, and "So wirkt das Wetter heute auf deinen Körper" with careful, general facts.
      Source: Open-Meteo, the same service the pill already uses. Location is asked only where it was already
      given (the pill in its "Wetter" ask state keeps its old behaviour).
   Pure core first (exported for node tests), DOM layer after. Reduced motion: no slide, only fade. */
(function (root) {
    'use strict';
    const LANGS = ['en', 'de', 'es'];
    const T = {
        toDark: ['Switch to Night', 'Nacht einschalten', 'Activar Noche'],
        toLight: ['Switch to Day', 'Tag einschalten', 'Activar Día'],
        nightOn: ['Night on', 'Nacht an', 'Noche activada'],
        cloudOn: ['Day on', 'Tag an', 'Día activado'],
        weather: ['Weather', 'Wetter', 'Tiempo'],
        now: ['Now', 'Jetzt', 'Ahora'],
        feels: ['Feels like', 'Gefühlt', 'Sensación'],
        high: ['H', 'H', 'Máx'],
        low: ['L', 'T', 'Mín'],
        hours: ['Next hours', 'Nächste Stunden', 'Próximas horas'],
        today: ['Today', 'Heute', 'Hoy'],
        humidity: ['Humidity', 'Luftfeuchte', 'Humedad'],
        wind: ['Wind', 'Wind', 'Viento'],
        sunrise: ['Sunrise', 'Sonnenaufgang', 'Amanecer'],
        sunset: ['Sunset', 'Sonnenuntergang', 'Atardecer'],
        uv: ['UV max', 'UV max', 'UV máx'],
        daylight: ['Daylight', 'Tageslicht', 'Luz del día'],
        rain: ['Rain', 'Regen', 'Lluvia'],
        body: ['How today\'s weather affects your body', 'So wirkt das Wetter heute auf deinen Körper', 'Cómo afecta el tiempo de hoy a tu cuerpo'],
        cell: ['Your cells feel the weather too: temperature, light and movement change how much water and energy they need.',
            'Deine Zellen spüren das Wetter mit: Temperatur, Licht und Bewegung ändern, wie viel Wasser und Energie sie brauchen.',
            'Tus células también notan el tiempo: la temperatura, la luz y el movimiento cambian cuánta agua y energía necesitan.'],
        note: ['General information, not medical advice. If you use insulin, follow your care team.',
            'Allgemeine Infos, keine medizinische Beratung. Wenn du Insulin nutzt, gilt der Plan deines Behandlungsteams.',
            'Información general, no es consejo médico. Si usas insulina, sigue a tu equipo médico.'],
        source: ['Weather data: Open-Meteo', 'Wetterdaten: Open-Meteo', 'Datos del tiempo: Open-Meteo'],
        refresh: ['Refresh', 'Aktualisieren', 'Actualizar'],
        close: ['Close', 'Schließen', 'Cerrar'],
        loading: ['Loading the forecast…', 'Vorhersage lädt…', 'Cargando el pronóstico…'],
        offline: ['Forecast not available right now. Showing your last reading.', 'Vorhersage gerade nicht erreichbar. Du siehst den letzten Stand.', 'Pronóstico no disponible ahora. Ves la última lectura.'],
        noLoc: ['Allow location for the weather to see the forecast.', 'Erlaube den Standort fürs Wetter, dann siehst du die Vorhersage.', 'Permite la ubicación para ver el pronóstico.'],
        updated: ['Updated', 'Stand', 'Actualizado']
    };
    const WORDS = [
        ['Clear', 'Klar', 'Despejado'], ['Some clouds', 'Leicht bewölkt', 'Algo nublado'], ['Cloudy', 'Bewölkt', 'Nublado'],
        ['Fog', 'Nebel', 'Niebla'], ['Drizzle', 'Niesel', 'Llovizna'], ['Rain', 'Regen', 'Lluvia'], ['Showers', 'Schauer', 'Chubascos'],
        ['Snow', 'Schnee', 'Nieve'], ['Thunder', 'Gewitter', 'Tormenta']
    ];
    /* body notes: short, careful, general facts. Each has a title and one to three plain sentences. */
    const NOTES = {
        heat: {
            ico: 'drop',
            t: ['Heat', 'Hitze', 'Calor'],
            d: ['You lose more water through sweat. Drink across the day, before you feel thirsty: too little fluid can push blood sugar readings up. If you use insulin, warmth can make it act faster, so check more often.',
                'Du verlierst mehr Wasser über den Schweiß. Trink über den Tag verteilt, bevor Durst kommt: Zu wenig Flüssigkeit kann Blutzuckerwerte steigen lassen. Wer Insulin nutzt: Wärme kann es schneller wirken lassen, also öfter messen.',
                'Pierdes más agua al sudar. Bebe a lo largo del día, antes de tener sed: poco líquido puede subir los valores de azúcar. Si usas insulina, el calor puede hacer que actúe más rápido, así que mide más a menudo.']
        },
        warm: {
            ico: 'drop',
            t: ['Warm day', 'Warmer Tag', 'Día cálido'],
            d: ['Your cells need a bit more water today. A glass with every meal is an easy start.',
                'Deine Zellen brauchen heute etwas mehr Wasser. Ein Glas zu jeder Mahlzeit ist ein leichter Start.',
                'Tus células necesitan algo más de agua hoy. Un vaso con cada comida es un buen comienzo.']
        },
        cold: {
            ico: 'snow',
            t: ['Cold', 'Kälte', 'Frío'],
            d: ['Your body uses a little more energy to stay warm, and appetite often rises. Warm meals with protein and fibre, like soup or stew, keep you full for longer. Cold fingers can make finger-prick readings less reliable: warm your hands first.',
                'Dein Körper verbraucht etwas mehr Energie, um warm zu bleiben, und der Appetit steigt oft. Warme Mahlzeiten mit Eiweiß und Ballaststoffen, wie Suppe oder Eintopf, halten länger satt. Kalte Finger können Messungen am Finger verfälschen: Hände vorher wärmen.',
                'Tu cuerpo gasta algo más de energía para mantenerse caliente y el apetito suele subir. Comidas calientes con proteína y fibra, como sopa o guiso, sacian más tiempo. Los dedos fríos pueden falsear la medición en el dedo: calienta las manos antes.']
        },
        light: {
            ico: 'sun',
            t: ['Little daylight', 'Wenig Tageslicht', 'Poca luz del día'],
            d: ['Morning light sets your inner clock and helps sleep and mood. Poor sleep can lower insulin sensitivity the next day. Try 10 to 20 minutes outside, ideally before noon.',
                'Licht am Vormittag stellt deine innere Uhr und hilft Schlaf und Stimmung. Schlechter Schlaf kann die Insulinempfindlichkeit am nächsten Tag senken. 10 bis 20 Minuten draußen, am besten vormittags.',
                'La luz de la mañana ajusta tu reloj interno y ayuda al sueño y al ánimo. Dormir mal puede bajar la sensibilidad a la insulina al día siguiente. Sal 10 a 20 minutos, mejor por la mañana.']
        },
        walk: {
            ico: 'walk',
            t: ['Good weather for a walk', 'Gutes Wetter für einen Spaziergang', 'Buen tiempo para caminar'],
            d: ['10 to 15 minutes of walking after a meal makes the blood sugar rise afterwards smaller, because your muscles use sugar straight away.',
                '10 bis 15 Minuten Gehen nach dem Essen lassen den Blutzucker danach weniger stark steigen, weil deine Muskeln Zucker direkt verbrauchen.',
                'Caminar 10 a 15 minutos después de comer hace que el azúcar suba menos, porque tus músculos usan el azúcar enseguida.']
        },
        wet: {
            ico: 'rain',
            t: ['Wet outside', 'Nass draußen', 'Mojado fuera'],
            d: ['Move indoors instead: 10 minutes of stairs, dancing or a Move session after a meal helps your blood sugar just the same.',
                'Beweg dich drinnen: 10 Minuten Treppen, Tanzen oder eine Move-Session nach dem Essen helfen deinem Blutzucker genauso.',
                'Muévete dentro: 10 minutos de escaleras, baile o una sesión de Move después de comer ayudan igual a tu azúcar.']
        },
        night: {
            ico: 'moon',
            t: ['Night', 'Nacht', 'Noche'],
            d: ['Sleep is part of your blood sugar: short nights can raise hunger and blood sugar the next day. A cool, dark bedroom (around 16 to 19 \u00b0C) helps you fall asleep.',
                'Schlaf geh\u00f6rt zu deinem Blutzucker: Kurze N\u00e4chte k\u00f6nnen am n\u00e4chsten Tag Hunger und Blutzucker erh\u00f6hen. Ein k\u00fchles, dunkles Schlafzimmer (etwa 16 bis 19 \u00b0C) hilft beim Einschlafen.',
                'El sue\u00f1o forma parte de tu az\u00facar: dormir poco puede subir el hambre y el az\u00facar al d\u00eda siguiente. Un dormitorio fresco y oscuro (unos 16 a 19 \u00b0C) ayuda a dormirte.']
        },
        uv: {
            ico: 'sun',
            t: ['Strong sun', 'Starke Sonne', 'Sol fuerte'],
            d: ['High UV around midday: shade and sun protection. A few minutes of morning sun is enough for your inner clock.',
                'Hohe UV-Werte um die Mittagszeit: Schatten und Sonnenschutz. Ein paar Minuten Morgensonne reichen für deine innere Uhr.',
                'UV alto a mediodía: sombra y protección solar. Unos minutos de sol por la mañana bastan para tu reloj interno.']
        }
    };
    const li = l => Math.max(0, LANGS.indexOf(String(l || 'en').slice(0, 2)));
    const tr = (k, l) => (T[k] || [k])[li(l)] || (T[k] || [k])[0];
    function kind(code) {
        code = +code || 0;
        if (code <= 1) return 0;
        if (code === 2) return 1;
        if (code === 3) return 2;
        if (code === 45 || code === 48) return 3;
        if (code >= 51 && code <= 57) return 4;
        if ((code >= 61 && code <= 67)) return 5;
        if (code >= 80 && code <= 82) return 6;
        if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 7;
        if (code >= 95) return 8;
        return 2;
    }
    const word = (code, l) => WORDS[kind(code)][li(l)];
    function icon(code, night) {
        const k = kind(code);
        return k === 0 ? (night ? 'moon' : 'sun') : k === 1 ? (night ? 'cloudmoon' : 'cloudsun') : k === 2 ? 'cloud' : k === 3 ? 'fog' : k === 7 ? 'snow' : k === 8 ? 'storm' : 'rain';
    }
    const wet = code => { const k = kind(code); return k >= 4; };
    /* Night <-> Cloud. Sunrise (automatic) counts by what it shows right now. */
    const nextTheme = effective => effective === 'light' ? 'dark' : 'light';
    const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(+v)) ? null : +v;
    /* Open-Meteo forecast -> {now, hours[], today}. Times stay local strings from the API (timezone=auto). */
    function parseForecast(data) {
        const c = data && data.current;
        if (!c || num(c.temperature_2m) === null) return null;
        const now = { temp: +c.temperature_2m, feels: num(c.apparent_temperature), code: +c.weather_code || 0, isDay: c.is_day === 0 ? 0 : 1, hum: num(c.relative_humidity_2m), wind: num(c.wind_speed_10m), time: String(c.time || '') };
        const hours = [];
        const h = data.hourly;
        if (h && Array.isArray(h.time)) {
            const cur = now.time.slice(0, 13);
            let i = h.time.findIndex(t => String(t).slice(0, 13) >= cur);
            if (i < 0) i = 0;
            for (let j = i; j < h.time.length && hours.length < 12; j++) {
                const t = num(h.temperature_2m && h.temperature_2m[j]);
                if (t === null) continue;
                hours.push({ time: String(h.time[j]), hh: String(h.time[j]).slice(11, 13), temp: t, code: +(h.weather_code && h.weather_code[j]) || 0, pop: num(h.precipitation_probability && h.precipitation_probability[j]), isDay: h.is_day ? (h.is_day[j] === 0 ? 0 : 1) : 1 });
            }
        }
        const d = data.daily || {}, at = (k) => d[k] && d[k].length ? d[k][0] : null;
        const today = { max: num(at('temperature_2m_max')), min: num(at('temperature_2m_min')), uv: num(at('uv_index_max')), sunrise: at('sunrise') ? String(at('sunrise')).slice(11, 16) : '', sunset: at('sunset') ? String(at('sunset')).slice(11, 16) : '', daylightH: num(at('daylight_duration')) === null ? null : +at('daylight_duration') / 3600, popMax: num(at('precipitation_probability_max')) };
        return { now, hours, today };
    }
    /* which body notes fit today: at most 4, most relevant first. Works with a bare reading too ({now:{temp,code}}). */
    function bodyNotes(fc) {
        if (!fc || !fc.now) return [];
        const n = fc.now, t = fc.today || {}, hrs = (fc.hours || []).slice(0, 3);
        const feels = n.feels !== null && n.feels !== undefined ? n.feels : n.temp;
        const max = t.max !== null && t.max !== undefined ? t.max : n.temp;
        const out = [];
        const rainSoon = wet(n.code) || hrs.some(x => wet(x.code) || (x.pop !== null && x.pop >= 50));
        if (feels >= 27 || max >= 28) out.push('heat');
        else if (max >= 22) out.push('warm');
        if (max <= 8 || feels <= 3) out.push('cold');
        const hr = /T(\d\d)/.test(n.time || '') ? +RegExp.$1 : null;
        const late = hr !== null ? (hr >= 22 || hr < 5) : false;
        if (late) out.unshift('night');
        if (rainSoon || (t.popMax !== null && t.popMax !== undefined && t.popMax >= 70)) out.push('wet');
        else if (!late && feels >= 5 && feels <= 26) out.push('walk');
        if ((t.daylightH !== null && t.daylightH !== undefined && t.daylightH < 11) || (n.isDay && kind(n.code) >= 2 && kind(n.code) <= 3)) out.push('light');
        if (t.uv !== null && t.uv !== undefined && t.uv >= 6) out.push('uv');
        return out.slice(0, 4);
    }
    const fcUrl = (lat, lon) => 'https://api.open-meteo.com/v1/forecast?latitude=' + (+lat).toFixed(2) + '&longitude=' + (+lon).toFixed(2) +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m' +
        '&hourly=temperature_2m,weather_code,precipitation_probability,is_day' +
        '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,daylight_duration,precipitation_probability_max' +
        '&forecast_days=2&timezone=auto';
    const core = { T, NOTES, WORDS, LANGS, tr, kind, word, icon, wet, nextTheme, parseForecast, bodyNotes, fcUrl };
    if (typeof module === 'object' && module.exports) module.exports = core;
    root.LowiTopBarCore = core;

    const D = root.document;
    if (!D || !root.addEventListener || root.LowiTopBar) return;
    const H = D.documentElement, FC_KEY = 'lowi.wx.fc.v1', WX_KEY = 'lowi.weather.v1';
    const lang = () => { let l = 'en'; try { l = (root.LowiLang && root.LowiLang.get && root.LowiLang.get()) || localStorage.getItem('lowispike.lang') || H.lang || 'en'; } catch (e) {} return String(l).slice(0, 2); };
    const t = k => tr(k, lang());
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const reduced = () => { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const sv = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
    const SUN = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>';
    const MOON = '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>';
    const CLOUD = '<path d="M7 18.5h10.2a4 4 0 00.6-7.95A5.6 5.6 0 007.1 9.4 4.6 4.6 0 007 18.5z"/>';
    const IC = {
        sun: sv(SUN), moon: sv(MOON), cloud: sv(CLOUD),
        cloudsun: sv('<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.8v1.4M2.8 8.5h1.4M4.5 4.5l1 1M12.5 4.5l-1 1"/><path d="M9 19.5h8.6a3.4 3.4 0 00.5-6.76 4.8 4.8 0 00-9-1A3.9 3.9 0 009 19.5z"/>'),
        cloudmoon: sv('<path d="M11.5 6.6A4 4 0 016.4 11.7 4 4 0 1011.5 6.6z"/><path d="M9 19.5h8.6a3.4 3.4 0 00.5-6.76 4.8 4.8 0 00-9-1A3.9 3.9 0 009 19.5z"/>'),
        fog: sv('<path d="M4 9h16M3 13h18M5 17h14"/>'),
        rain: sv('<path d="M7 15.5h10.2a4 4 0 00.6-7.95A5.6 5.6 0 007.1 6.4 4.6 4.6 0 007 15.5z"/><path d="M9 18.5l-1 2.5M13 18.5l-1 2.5M17 18.5l-1 2.5"/>'),
        snow: sv('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5"/>'),
        storm: sv('<path d="M7 14.5h10.2a4 4 0 00.6-7.95A5.6 5.6 0 007.1 5.4 4.6 4.6 0 007 14.5z"/><path d="M12.5 14.5l-2 3.5h3l-2 3.5"/>'),
        drop: sv('<path d="M12 3.2s6 6.4 6 10.8a6 6 0 01-12 0c0-4.4 6-10.8 6-10.8z"/>'),
        walk: sv('<circle cx="13" cy="4.5" r="1.8"/><path d="M10.5 21l2-6-2.5-2.5 1-4.5 3 2.5 2.5 1M9 8.5l-2.5 3M12.5 15l3 6"/>'),
        x: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
        refresh: sv('<path d="M20 11a8 8 0 10-2.3 5.7M20 4.5V11h-6.5"/>')
    };
    const effective = () => H.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

    /* ---------- 1 · sub-page header + scan hint ---------- */
    function syncState() {
        const home = D.getElementById('tab-home');
        const onHome = !!(home && home.classList.contains('active')) && !H.classList.contains('g2e-open');
        H.classList.toggle('tb-scanok', onHome);
        const p = D.getElementById('tab-profile');
        H.classList.toggle('tb-stuck', !!(p && H.classList.contains('g2e-open') && p.scrollTop > 6));
    }

    /* ---------- 2 · one-tap theme ---------- */
    let btn = null;
    function paintBtn() {
        if (!btn) return;
        const dark = effective() === 'dark';
        const html = dark ? IC.moon : IC.sun;
        if (btn.__h !== html) { btn.__h = html; btn.innerHTML = html; }
        const lab = dark ? t('toLight') : t('toDark');
        if (btn.getAttribute('aria-label') !== lab) { btn.setAttribute('aria-label', lab); btn.title = lab; }
        btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        btn.dataset.mode = dark ? 'dark' : 'light';
    }
    function placeBtn() {
        if (!btn) return;
        const pf = D.getElementById('pfBtn'), main = D.getElementById('main');
        if (!pf || !main) return;
        if (btn.parentNode !== pf.parentNode) pf.parentNode.insertBefore(btn, pf);
        const cs = getComputedStyle(pf);
        const top = pf.offsetTop, left = pf.offsetLeft, w = pf.offsetWidth || 42, h = pf.offsetHeight || 42;
        const size = 38;
        const y = Math.round(top + (h - size) / 2), x = Math.round(left - size - 10);
        if (btn.__pos !== x + ',' + y) { btn.__pos = x + ',' + y; btn.style.top = y + 'px'; btn.style.left = x + 'px'; }
        btn.classList.toggle('tb-off', !!main.classList.contains('pf-hide') || cs.display === 'none');
    }
    function toggleTheme(quiet) {
        const to = nextTheme(effective());
        const R2 = root.LowiR2;
        /* Day & night atmosphere (atmosphere.js): one tap jumps to its Day or Night stop; the slider lives in Look & Ton */
        if (root.LowiAtmos && root.LowiAtmos.quick) root.LowiAtmos.quick(to === 'light' ? 'day' : 'night', { toast: false });
        else if (R2 && R2.applyTheme) R2.applyTheme(to);
        else { try { localStorage.setItem('lowi.theme', to); } catch (e) {} H.setAttribute('data-theme', to); H.setAttribute('data-theme-mode', to); }
        paintBtn();
        try { if (!quiet && R2 && R2.toast) R2.toast(to === 'light' ? t('cloudOn') : t('nightOn')); } catch (e) {}
        try { D.dispatchEvent(new CustomEvent('lowi:theme', { detail: { theme: to } })); } catch (e) {}
    }
    /* third tap: undo the first tap's flip (quietly) and open the Day & night adjuster */
    function tripleTheme(before) {
        if (before && effective() !== before) toggleTheme(true);
        const A = root.LowiAtmos; if (!A || typeof A.openSheet !== 'function') return null;
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) {}
        return A.openSheet();
    }
    root.LowiTopBar = Object.assign(root.LowiTopBar || {}, { tripleTheme });
    function mountBtn() {
        if (btn && btn.isConnected) return;
        btn = D.getElementById('tbTheme') || D.createElement('button');
        btn.id = 'tbTheme';
        btn.type = 'button';
        btn.setAttribute('data-noi18n', '');
        /* Oct 17 (Eman): no more long press (iOS turned it into copy/select and cancelled the hold, so the menu never came back).
           One tap flips Day/Night right away. THREE quick taps open the Day & night adjuster (LowiAtmos.openSheet) and put the
           theme back to where it was before the first tap. Tapping anywhere outside the adjuster closes it. */
        let taps = 0, lastTap = 0, tapT = 0, before = null;
        const TAP_GAP = 500; /* taps are timed by when the finger touched (e.timeStamp), so a busy frame after the first flip cannot split a triple tap */
        btn.addEventListener('contextmenu', e => e.preventDefault());
        btn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const now = e.timeStamp || performance.now();
            if (now - lastTap > TAP_GAP) { taps = 0; before = effective(); }
            lastTap = now; taps++;
            clearTimeout(tapT); tapT = 0;
            if (taps === 1) { toggleTheme(); return; }
            if (taps === 2) { tapT = setTimeout(() => { tapT = 0; if (taps === 2) toggleTheme(); }, TAP_GAP); return; }
            if (taps === 3) { taps = 0; lastTap = 0; tripleTheme(before); }
        });
        btn.__h = null; btn.__pos = null;
        placeBtn(); paintBtn();
    }

    /* ---------- 3 · weather sheet ---------- */
    let ov = null, lastFc = null;
    const readJ = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    function fallbackFc() {
        const w = readJ(WX_KEY);
        if (!w || !Number.isFinite(+w.temp)) return null;
        let isDay = w.isDay === 0 ? 0 : 1;
        if (w.isDay === undefined) { const hr = new Date().getHours(); isDay = hr >= 7 && hr < 19 ? 1 : 0; }
        return { now: { temp: +w.temp, feels: null, code: +w.code || 0, isDay, hum: null, wind: null }, hours: [], today: {}, ts: +w.ts || 0, bare: true };
    }
    const deg = v => v === null || v === undefined ? '–' : Math.round(v) + '°';
    function render(fc, status) {
        if (!ov) return;
        const l = lang(), body = ov.querySelector('.tbw-body');
        if (!fc) {
            body.innerHTML = '<p class="tbw-msg">' + esc(status === 'noloc' ? t('noLoc') : status === 'loading' ? t('loading') : t('offline')) + '</p>';
            return;
        }
        const n = fc.now, td = fc.today || {}, night = !n.isDay;
        ov.dataset.k = String(kind(n.code)); ov.dataset.night = night ? '1' : '0';
        let h = '<section class="tbw-now"><div class="tbw-cell" aria-hidden="true"><i></i>' + IC[icon(n.code, night)] + '</div>' +
            '<div class="tbw-nowtx"><div class="tbw-temp">' + deg(n.temp) + '</div><div class="tbw-word">' + esc(word(n.code, l)) + '</div>' +
            '<div class="tbw-sub">' + (n.feels !== null ? esc(t('feels')) + ' ' + deg(n.feels) : '') +
            (td.max !== null && td.max !== undefined ? (n.feels !== null ? ' · ' : '') + esc(t('high')) + ' ' + deg(td.max) + ' · ' + esc(t('low')) + ' ' + deg(td.min) : '') + '</div></div></section>';
        if (status === 'offline' || status === 'noloc' || status === 'loading') h += '<p class="tbw-msg">' + esc(status === 'noloc' ? t('noLoc') : status === 'loading' ? t('loading') : t('offline')) + '</p>';
        if (fc.hours && fc.hours.length) {
            h += '<h3 class="tbw-h">' + esc(t('hours')) + '</h3><div class="tbw-hours" role="list">' + fc.hours.map((x, i) =>
                '<div class="tbw-hr" role="listitem"><span class="tbw-hh">' + (i === 0 ? esc(t('now')) : esc(x.hh)) + '</span>' + IC[icon(x.code, !x.isDay)] +
                '<b>' + deg(x.temp) + '</b><small>' + (x.pop !== null && x.pop >= 10 ? Math.round(x.pop) + '%' : '&nbsp;') + '</small></div>').join('') + '</div>';
        }
        const facts = [];
        if (n.hum !== null) facts.push([t('humidity'), Math.round(n.hum) + '%']);
        if (n.wind !== null) facts.push([t('wind'), Math.round(n.wind) + ' km/h']);
        if (td.sunrise) facts.push([t('sunrise'), td.sunrise]);
        if (td.sunset) facts.push([t('sunset'), td.sunset]);
        if (td.daylightH !== null && td.daylightH !== undefined) facts.push([t('daylight'), Math.floor(td.daylightH) + ' h ' + String(Math.round((td.daylightH % 1) * 60)).padStart(2, '0') + ' min']);
        if (td.uv !== null && td.uv !== undefined) facts.push([t('uv'), String(Math.round(td.uv))]);
        if (facts.length) h += '<h3 class="tbw-h">' + esc(t('today')) + '</h3><div class="tbw-facts">' + facts.map(f => '<div><small>' + esc(f[0]) + '</small><b>' + esc(f[1]) + '</b></div>').join('') + '</div>';
        const notes = bodyNotes(fc);
        h += '<h3 class="tbw-h">' + esc(t('body')) + '</h3><p class="tbw-cellline">' + esc(t('cell')) + '</p><div class="tbw-notes">' +
            notes.map(k => { const N = NOTES[k]; return '<div class="tbw-note" data-n="' + k + '"><span class="tbw-nico">' + IC[N.ico] + '</span><div><b>' + esc(N.t[li(l)]) + '</b><p>' + esc(N.d[li(l)]) + '</p></div></div>'; }).join('') +
            '</div><p class="tbw-fine">' + esc(t('note')) + '</p>';
        const ts = fc.ts ? new Date(fc.ts) : null;
        h += '<p class="tbw-fine">' + esc(t('source')) + (ts ? ' · ' + esc(t('updated')) + ' ' + String(ts.getHours()).padStart(2, '0') + ':' + String(ts.getMinutes()).padStart(2, '0') : '') + '</p>';
        body.innerHTML = h;
    }
    function locate() {
        return new Promise((res) => {
            if (!navigator.geolocation) return res(null);
            let done = false;
            const fin = v => { if (!done) { done = true; res(v); } };
            setTimeout(() => fin(null), 9000);
            try { navigator.geolocation.getCurrentPosition(p => fin({ lat: p.coords.latitude, lon: p.coords.longitude }), () => fin(null), { maximumAge: 1800000, timeout: 8000 }); } catch (e) { fin(null); }
        });
    }
    async function load(force) {
        const cached = readJ(FC_KEY);
        if (cached && cached.fc && !force && Date.now() - cached.ts < 20 * 60000) { lastFc = Object.assign(cached.fc, { ts: cached.ts }); render(lastFc); return; }
        const base = cached && cached.fc ? Object.assign(cached.fc, { ts: cached.ts }) : fallbackFc();
        render(base, 'loading');
        const pos = await locate();
        if (!ov) return;
        if (!pos) { render(base, base ? 'offline' : 'noloc'); return; }
        try {
            const r = await fetch(fcUrl(pos.lat, pos.lon), { signal: root.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
            if (!r.ok) throw new Error('http ' + r.status);
            const fc = parseForecast(await r.json());
            if (!fc) throw new Error('empty');
            const ts = Date.now();
            try { localStorage.setItem(FC_KEY, JSON.stringify({ ts, fc })); } catch (e) {}
            lastFc = Object.assign(fc, { ts });
            if (ov) render(lastFc);
        } catch (e) { if (ov) render(base, base ? 'offline' : 'noloc'); }
    }
    let lastFocus = null;
    function openWeather() {
        if (ov) return;
        lastFocus = D.activeElement;
        ov = D.createElement('div');
        ov.id = 'tbWx';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', t('weather'));
        ov.setAttribute('data-noi18n', '');
        ov.innerHTML = '<div class="tbw-bg" data-tbw="close"></div><div class="tbw-sheet"><header class="tbw-top"><h2>' + esc(t('weather')) + '</h2>' +
            '<button type="button" class="tbw-btn" data-tbw="refresh" aria-label="' + esc(t('refresh')) + '">' + IC.refresh + '</button>' +
            '<button type="button" class="tbw-btn" data-tbw="close" aria-label="' + esc(t('close')) + '">' + IC.x + '</button></header><div class="tbw-body"></div></div>';
        if (reduced()) ov.classList.add('tbw-rm');
        D.body.appendChild(ov);
        H.classList.add('tbw-open');
        /* blooms out of the weather pill you tapped, like Move's choices (misty-bloom.js) */
        try { root.LowiBloom && root.LowiBloom.prep(ov.querySelector('.tbw-sheet')); } catch (e) {}
        void ov.offsetWidth; ov.classList.add('in');
        const x = ov.querySelector('[data-tbw=close].tbw-btn'); try { x.focus({ preventScroll: true }); } catch (e) {}
        load(false);
    }
    function closeWeather() {
        if (!ov) return;
        const o = ov; ov = null;
        H.classList.remove('tbw-open');
        o.classList.remove('in');
        setTimeout(() => o.remove(), reduced() ? 0 : 260);
        try { lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }

    function boot() {
        mountBtn();
        syncState();
        /* weather pill: open the in-app weather when there is a reading; the "Wetter" ask state keeps asking for location */
        root.addEventListener('click', e => {
            const tg = e.target && e.target.closest ? e.target : null;
            if (!tg) return;
            const a = tg.closest('[data-tbw]');
            if (a && ov && ov.contains(a)) { e.preventDefault(); if (a.dataset.tbw === 'close') closeWeather(); else if (a.dataset.tbw === 'refresh') load(true); return; }
            const pill = tg.closest('.sp-weather');
            if (pill && !pill.classList.contains('ask')) { e.preventDefault(); e.stopImmediatePropagation(); openWeather(); }
        }, true);
        D.addEventListener('keydown', e => { if (ov && e.key === 'Escape') { e.preventDefault(); closeWeather(); } });
        D.addEventListener('scroll', syncState, true);
        root.addEventListener('resize', () => { placeBtn(); syncState(); });
        new MutationObserver(() => { paintBtn(); placeBtn(); syncState(); }).observe(H, { attributes: true, attributeFilter: ['data-theme', 'class', 'data-lay', 'lang'] });
        D.addEventListener('click', () => setTimeout(() => { mountBtn(); placeBtn(); syncState(); }, 80), true);
        setInterval(() => { mountBtn(); placeBtn(); paintBtn(); syncState(); }, 1500);
        ['lowi:lang'].forEach(n => { D.addEventListener(n, paintBtn); root.addEventListener(n, paintBtn); });
    }
    root.LowiTopBar = { toggleTheme, openWeather, closeWeather, state: () => ({ theme: effective(), btn: !!(btn && btn.isConnected), open: !!ov, scanok: H.classList.contains('tb-scanok') }), fc: () => lastFc };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
