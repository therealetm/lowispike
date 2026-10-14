/* LOWiSPIKE living Home (task 'living Home integration'): live tiles on Home, every number from real state.
   Sources: XP + stage from LowiHerbTamagotchi, meals + macros from LowiVitalsBridge logs, macro goals from
   user.macroGoals, water from the fasting store, movement from today's XP ledger, weather from the cached
   reading, time of day from the clock. Nothing is estimated or invented: unknown stays unknown.
   One-tap scan: the Home tile and the nav Scan open the barcode camera as its own full-screen layer,
   not inside the herb world. The herb world still plays the catch + verdict after a product is found. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document, WATER_GOAL = 8;
    if (W.LowiLiving) return;
    const lang = () => {
        try { return (LowiLang.get() || 'de').slice(0, 2); } catch (e) { return (D.documentElement.lang || 'de').slice(0, 2); }
    };
    const copy = {
        level: ['Level', 'Level', 'Nivel'],
        today: ['today', 'heute', 'hoy'],
        water: ['Water', 'Wasser', 'Agua'],
        glassAdd: ['+1 glass', '+1 Glas', '+1 vaso'],
        waterDone: ['Goal reached', 'Ziel erreicht', 'Meta lograda'],
        warm: ['Warm out', 'Warm draußen', 'Hace calor'],
        scan: ['Scan', 'Scannen', 'Escanear'],
        scanSub: ['Spike or not?', 'Spike oder nicht?', '¿Pico o no?'],
        scanDone: ['Scanned today', 'Heute gescannt', 'Escaneado hoy'],
        food: ['Food', 'Essen', 'Comida'],
        mealNone: ['Nothing yet', 'Noch nichts', 'Nada aún'],
        mealOne: ['1 meal', '1 Mahlzeit', '1 comida'],
        mealMany: ['meals', 'Mahlzeiten', 'comidas'],
        logIt: ['Log a meal', 'Essen eintragen', 'Registrar'],
        macros: ['Macros', 'Makros', 'Macros'],
        setGoals: ['Set goals', 'Ziele setzen', 'Fijar metas'],
        noValues: ['no values yet', 'noch keine Werte', 'sin valores'],
        unknownN: ['without values', 'ohne Werte', 'sin valores'],
        P: ['P', 'P', 'P'], F: ['F', 'B', 'F'], S: ['S', 'Z', 'A'],
        protein: ['Protein', 'Protein', 'Proteína'], fiber: ['Fiber', 'Ballaststoffe', 'Fibra'], sugar: ['Sugar', 'Zucker', 'Azúcar'],
        move: ['Move', 'Bewegung', 'Movimiento'],
        moveDone: ['Done today', 'Heute erledigt', 'Hecho hoy'],
        moveOpen: ['Still open', 'Noch offen', 'Pendiente'],
        morning: ['Morning', 'Morgen', 'Mañana'], day: ['Day', 'Tag', 'Día'], evening: ['Evening', 'Abend', 'Tarde'], night: ['Night', 'Nacht', 'Noche'],
        maxStage: ['Final form', 'Endform', 'Forma final'],
        to: ['to', 'bis', 'a'],
        dash: ['Your day', 'Dein Tag', 'Tu día']
    };
    const L = () => ({ en: 0, de: 1, es: 2 }[lang()] || 0);
    const tr = k => (copy[k] || [k])[L()] || (copy[k] || [k])[0];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const icon = n => { try { return LowiSpiritCore.icon(n); } catch (e) { return ''; } };
    const pad = n => String(n).padStart(2, '0');
    const dayKey = d => { try { return LowiSpiritCore.day(d); } catch (e) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); } };
    const period = h => h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'day' : h >= 17 && h < 22 ? 'evening' : 'night';
    const stageName = s => Array.isArray(s) ? (s[L()] || s[0]) : (s && (s.name || s.label)) ? (Array.isArray(s.name) ? (s.name[L()] || s.name[0]) : (s.name || s.label)) : '';

    /* ---------- pure model (tested in tests/living-home.test.cjs) ---------- */
    function model(input) {
        const now = new Date(input.now || Date.now()), key = dayKey(now), s = input.state || {}, m = input.herb || {};
        const start = new Date(now).setHours(0, 0, 0, 0);
        const ledger = (s.ledger || []).filter(e => +e.ts >= start);
        const xpToday = ledger.reduce((a, e) => a + (Number.isFinite(+e.amt) ? +e.amt : 0), 0);
        const logs = (s.logs || []).filter(l => (l.day || dayKey(l.ts)) === key);
        const fields = ['protein', 'fiber', 'sugar'], sum = {}, known = {}, goals = (s.user && s.user.macroGoals) || {};
        let mac = null;
        try { mac = LowiSpiritCore.macros; } catch (e) {}
        if (!mac && input.macros) mac = input.macros;
        for (const k of fields) {
            sum[k] = 0; known[k] = 0;
            for (const l of logs) {
                const v = mac ? mac(l)[k] : (l.macros && Number.isFinite(+l.macros[k]) ? +l.macros[k] : null);
                if (v != null) { sum[k] += v; known[k]++; }
            }
        }
        const unknown = logs.length ? logs.length - Math.min(...fields.map(k => known[k])) : 0;
        const macros = fields.filter(k => +goals[k] > 0).map(k => {
            const g = +goals[k], earned = (s.ledger || []).some(e => e.eventId === 'macro-goal:' + key + ':' + k);
            return { k, goal: g, value: Math.round(sum[k] * 10) / 10, known: known[k], ratio: known[k] ? Math.min(1, sum[k] / g) : 0, earned, over: k === 'sugar' && known[k] > 0 && sum[k] > g };
        });
        const water = Math.max(0, +input.water || 0);
        const moved = ledger.some(e => /move|walk|workout|steps|dance/i.test((e.src || '') + ' ' + (e.label || '')));
        const scanned = ledger.some(e => /scan|capture|product/i.test((e.src || '') + ' ' + (e.label || '')));
        const w = input.weather && Number.isFinite(+input.weather.temp) && (Date.now() - (+input.weather.ts || 0) < 6 * 3600000) ? input.weather : null;
        const progress = Number.isFinite(+m.progress) ? Math.max(0, Math.min(1, +m.progress > 1 ? +m.progress / 100 : +m.progress)) : 0;
        const done = [water >= WATER_GOAL, logs.length > 0, moved, scanned].filter(Boolean).length;
        return {
            key, period: period(now.getHours()), xp: Math.round(+m.xp || 0), xpToday: Math.round(xpToday), progress,
            left: m.next ? Math.max(0, Math.ceil(+m.left || 0)) : 0, stage: stageName(m.current), next: m.next ? stageName(m.next) : '',
            water, waterGoal: WATER_GOAL, meals: logs.length, unknown, macros, hasGoals: macros.length > 0, moved, scanned,
            warm: !!(w && +w.temp >= 24), temp: w ? Math.round(+w.temp) : null, dayDone: done / 4
        };
    }

    if (!D) {
        if (typeof module !== 'undefined' && module.exports) module.exports = { model, period };
        return;
    }

    /* ---------- live state readers ---------- */
    function readWater(key) {
        try {
            if (W.LowiFast && typeof LowiFast.water === 'function') { const n = +LowiFast.water(key); if (Number.isFinite(n)) return n; }
        } catch (e) {}
        try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); return +(f.water && f.water[key]) || 0; } catch (e) { return 0; }
    }
    function live() {
        let state = {}, herb = {}, weather = null;
        try { state = LowiVitalsBridge.state() || {}; } catch (e) {}
        try { herb = LowiHerbTamagotchi.current().m || {}; } catch (e) {}
        try { weather = JSON.parse(localStorage.getItem('lowi.weather.v1') || 'null'); } catch (e) {}
        const now = Date.now();
        return model({ now, state, herb, weather, water: readWater(dayKey(now)) });
    }

    /* ---------- render ---------- */
    function ring(p) {
        const r = 15, c = 2 * Math.PI * r;
        return '<svg class="lv-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="' + r + '" class="lv-ring-bg"/><circle cx="18" cy="18" r="' + r + '" class="lv-ring-fg" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + (c * (1 - p)).toFixed(2) + '"/></svg>';
    }
    function tiles(v) {
        const meals = v.meals === 0 ? tr('mealNone') : v.meals === 1 ? tr('mealOne') : v.meals + ' ' + tr('mealMany');
        const lvl = '<button type="button" class="lv-tile lv-level" data-sp="path" data-lv-k="level" aria-label="' + esc(v.stage + ', ' + v.xp + ' XP' + (v.next ? ', ' + v.left + ' XP ' + tr('to') + ' ' + v.next : '')) + '">' +
            '<span class="lv-vis">' + ring(v.progress) + '<i class="lv-ring-ico" data-lv-ico="leaf">' + icon('leaf') + '</i></span>' +
            '<span class="lv-tx"><small>' + esc(v.stage || tr('level')) + '</small><b class="num">' + v.xp + ' XP</b><em>' + (v.xpToday > 0 ? '+' + v.xpToday + ' ' + esc(tr('today')) : v.next ? v.left + ' ' + esc(tr('to')) + ' ' + esc(v.next) : esc(tr('maxStage'))) + '</em></span></button>';
        const wfill = Math.min(1, v.water / v.waterGoal);
        const wat = '<button type="button" class="lv-tile lv-water' + (v.water >= v.waterGoal ? ' done' : '') + '" data-sp="water" data-lv-k="water" aria-label="' + esc(tr('water') + ' ' + v.water + '/' + v.waterGoal + ', ' + tr('glassAdd')) + '" style="--lv-fill:' + wfill.toFixed(3) + '">' +
            '<span class="lv-liquid" aria-hidden="true"></span>' +
            '<span class="lv-vis"><i data-lv-ico="water">' + icon('water') + '</i></span>' +
            '<span class="lv-tx"><small>' + esc(tr('water')) + '</small><b class="num">' + v.water + '/' + v.waterGoal + '</b><em>' + (v.water >= v.waterGoal ? esc(tr('waterDone')) : v.warm ? esc(tr('warm')) + ' · ' + v.temp + '°' : esc(tr('glassAdd'))) + '</em></span></button>';
        const scan = '<button type="button" class="lv-tile lv-scan" data-lv="scan" data-lv-k="scan" aria-label="' + esc(tr('scan')) + '">' +
            '<span class="lv-vis"><i data-lv-ico="scan">' + icon('scan') + '</i></span>' +
            '<span class="lv-tx"><b>' + esc(tr('scan')) + '</b><em>' + esc(v.scanned ? tr('scanDone') : tr('scanSub')) + '</em></span></button>';
        const food = '<button type="button" class="lv-tile lv-food' + (v.meals ? ' done' : '') + '" data-sp="meal" data-lv-k="food" aria-label="' + esc(tr('food') + ', ' + meals) + '">' +
            '<span class="lv-vis"><i data-lv-ico="plate">' + icon('plate') + '</i></span>' +
            '<span class="lv-tx"><small>' + esc(tr('food')) + '</small><b>' + esc(meals) + '</b><em>' + esc(tr('logIt')) + '</em></span></button>';
        let macro;
        if (!v.hasGoals) {
            macro = '<button type="button" class="lv-tile lv-macro empty" data-sp="goals" data-lv-k="macros" aria-label="' + esc(tr('macros') + ', ' + tr('setGoals')) + '">' +
                '<span class="lv-vis"><i data-lv-ico="star">' + icon('star') + '</i></span><span class="lv-tx"><small>' + esc(tr('macros')) + '</small><b>' + esc(tr('setGoals')) + '</b><em>' + esc(tr('protein')) + ' · ' + esc(tr('fiber')) + '</em></span></button>';
        } else {
            const label = { protein: 'P', fiber: 'F', sugar: 'S' };
            const bars = v.macros.map(x => '<span class="lv-bar' + (x.earned ? ' earned' : '') + (x.over ? ' over' : '') + '" data-k="' + x.k + '"><i style="--lv-r:' + x.ratio.toFixed(3) + '"></i><u>' + esc(tr(label[x.k])) + '</u><s class="num">' + (x.known ? Math.round(x.value) : '–') + '/' + Math.round(x.goal) + '</s></span>').join('');
            const al = v.macros.map(x => tr(x.k) + ' ' + (x.known ? Math.round(x.value) : '?') + ' / ' + Math.round(x.goal) + ' g').join(', ');
            macro = '<button type="button" class="lv-tile lv-macro" data-sp="goals" data-lv-k="macros" aria-label="' + esc(tr('macros') + ': ' + al) + '">' +
                '<span class="lv-bars">' + bars + '</span>' + (v.unknown ? '<em class="lv-unk">' + v.unknown + ' ' + esc(tr('unknownN')) + '</em>' : (v.meals ? '' : '<em class="lv-unk">' + esc(tr('noValues')) + '</em>')) + '</button>';
        }
        const move = '<button type="button" class="lv-tile lv-move' + (v.moved ? ' done' : '') + '" data-sp="move" data-lv-k="move" aria-label="' + esc(tr('move') + ', ' + (v.moved ? tr('moveDone') : tr('moveOpen'))) + '">' +
            '<span class="lv-vis"><i data-lv-ico="move">' + icon('move') + '</i></span>' +
            '<span class="lv-tx"><small>' + esc(tr('move')) + '</small><b>' + esc(v.moved ? tr('moveDone') : tr('moveOpen')) + '</b><em>' + esc(tr(v.period)) + '</em></span></button>';
        return lvl + wat + scan + food + macro + move;
    }

    let dash = null, last = '', lastVals = {};
    function mount() {
        const home = D.getElementById('spHome');
        if (!home) return null;
        const log = home.querySelector('.sp-log');
        if (!log) return null;
        if (!dash) {
            dash = D.createElement('div');
            dash.id = 'lvDash';
            dash.className = 'lv-dash';
            dash.setAttribute('role', 'group');
        }
        dash.setAttribute('aria-label', tr('dash'));
        if (dash.parentNode !== log) { log.appendChild(dash); last = ''; }
        D.documentElement.classList.add('lv-on');
        return dash;
    }
    function render() {
        if (!mount()) return;
        const v = live();
        const sig = JSON.stringify(v) + lang();
        const home = D.getElementById('spHome');
        if (home) {
            home.style.setProperty('--lv-day', v.dayDone.toFixed(2));
            home.dataset.lvPeriod = v.period;
        }
        dash.dataset.period = v.period;
        if (sig === last) return;
        last = sig;
        dash.innerHTML = tiles(v);
        /* a tile whose real value just changed gives one soft pulse */
        const vals = { level: v.xp, water: v.water, food: v.meals, move: v.moved, scan: v.scanned, macros: JSON.stringify(v.macros) };
        if (Object.keys(lastVals).length) {
            for (const k of Object.keys(vals)) if (vals[k] !== lastVals[k]) { const t = dash.querySelector('[data-lv-k="' + k + '"]'); if (t) t.classList.add('lv-pulse'); }
        }
        lastVals = vals;
    }
    let queued = 0;
    function schedule() {
        if (queued) return;
        queued = requestAnimationFrame(() => { queued = 0; try { render(); } catch (e) {} });
    }

    /* ---------- one-tap scan, its own layer ---------- */
    let direct = false;
    function directScan(mode) {
        if (!W.LowiDex || typeof LowiDex.scan !== 'function') {
            try { LowiSpirit.open({ capture: true }); } catch (e) {}
            return;
        }
        hookSpirit();
        direct = true;
        try { LowiDex.scan(mode || 'cam'); } finally { direct = false; }
        const cam = D.querySelector('body > .b3-cam');
        if (cam) { cam.setAttribute('aria-modal', 'true'); cam.classList.add('lv-solo'); }
    }
    function hookSpirit() {
        const S = W.LowiSpirit;
        if (!S || S.__lvHooked) return !!S;
        S.__lvHooked = true;
        const host = S.scannerHost, open = S.open;
        if (typeof host === 'function') S.scannerHost = function () { return direct ? D.body : host.apply(this, arguments); };
        if (typeof open === 'function') S.open = function (o) {
            if (o && o.capture && !o.embedded && !o.world && W.LowiDex) return directScan('cam');
            return open.apply(this, arguments);
        };
        return true;
    }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-lv="scan"]');
        if (!b) return;
        e.preventDefault();
        directScan('cam');
    });

    /* ---------- wiring ---------- */
    ['lowi:reward', 'lowi:state', 'lowi:weather', 'lowi:care', 'lowi:lang', 'lowi:fast', 'lowi:water', 'lowi:meal', 'visibilitychange', 'focus', 'storage'].forEach(n => (n === 'focus' || n === 'storage' ? W : D).addEventListener(n, schedule));
    D.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-sp],[data-b3],[data-f3],.tb')) setTimeout(schedule, 350); }, true);
    function boot() {
        hookSpirit();
        if (!D.getElementById('lvCss')) {
            const l = D.createElement('link');
            l.id = 'lvCss';
            l.rel = 'stylesheet';
            const me = D.querySelector('script[src*="living-home.js"]');
            l.href = me ? me.getAttribute('src').replace('living-home.js', 'living-home.css') : 'living-home.css';
            D.head.appendChild(l);
        }
        const tab = D.getElementById('tab-home');
        if (tab && W.MutationObserver) new MutationObserver(() => { if (!dash || !dash.isConnected) schedule(); }).observe(tab, { childList: true, subtree: true });
        schedule();
        setInterval(() => { if (!D.hidden) schedule(); }, 30000);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    if (!W.LowiSpirit) { let n = 0; const t = setInterval(() => { if (hookSpirit() || ++n > 40) clearInterval(t); }, 250); }

    W.LowiLiving = { model, render, scan: directScan, live };
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiLiving;
})();
