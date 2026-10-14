/* LOWiSPIKE sun meter (Oct 15, 2026): one daily bar on Today, fed only by actions the XP ledger counted.
   Meal +3, scan +3, Move +4, fasting milestone +3, macro goal +2, water +1, any other counted action +1. 12 = full.
   Duplicate meals and meals over the daily cap never reach the ledger, so they add nothing.
   Full sun: one reward per local day (ledger eventId sun-full:<day>, +10 XP), one reward sheet, then the herb goes out
   into the garden for an hour (countdown on its bubble and on the bar) and comes back with one find.
   Finds are kept in S.garden (account data). Pure model at the top is tested in tests/sun-meter.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiSun) return;
    const GOAL = 12, AWAY_MS = 60 * 60000, BONUS = 10;
    const PTS = { meal: 3, scan: 3, move: 4, fast: 3, macro: 2, water: 1, other: 1, sun: 0 };
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

    /* ---------- pure model ---------- */
    function classify(e) {
        if (!e) return 'other';
        const src = String(e.src || ''), id = String(e.eventId || ''), txt = (src + ' ' + (e.label || '')).toLowerCase();
        if (/^sun-full/.test(src) || /^sun-full:/.test(id)) return 'sun';
        if (/^meal/.test(src) || /^meal:|^plan-meal:/.test(id)) return 'meal';
        if (/^macro-goal/.test(src) || /^macro-goal/.test(id)) return 'macro';
        if (/scan|capture|product|dex/.test(txt)) return 'scan';
        if (/water|wasser|agua|hydrat/.test(txt)) return 'water';
        if (/move|walk|workout|steps|dance|yoga|stretch/.test(txt)) return 'move';
        if (/fast/.test(txt)) return 'fast';
        return 'other';
    }
    const points = e => (e && +e.amt > 0) ? (PTS[classify(e)] || 0) : 0;
    const isDay = (e, key) => (e.day ? e.day === key : dayKey(+e.ts || 0) === key);
    function model(input) {
        input = input || {};
        const now = +input.now || Date.now(), key = dayKey(now), ledger = (input.ledger || []).filter(e => e && isDay(e, key));
        const parts = {};
        let raw = 0;
        for (const e of ledger) {
            const p = points(e);
            if (!p) continue;
            const k = classify(e);
            parts[k] = parts[k] || { n: 0, pts: 0 };
            parts[k].n++; parts[k].pts += p; raw += p;
        }
        const fullDone = (input.ledger || []).some(e => e && e.eventId === 'sun-full:' + key);
        const trip = input.garden && input.garden.trips && input.garden.trips[key] || null;
        let away = null;
        for (const t of Object.values((input.garden && input.garden.trips) || {})) if (t && !t.got && +t.back > now) away = t;
        const pending = Object.entries((input.garden && input.garden.trips) || {}).filter(([, t]) => t && !t.got && +t.back <= now).map(([d, t]) => Object.assign({ day: d }, t));
        return { key, goal: GOAL, raw, points: Math.min(GOAL, raw), ratio: Math.min(1, raw / GOAL), full: raw >= GOAL, fullDone, parts, trip, away, left: away ? +away.back - now : 0, pending };
    }
    const ITEMS = [
        { id: 'dew', hue: 195, n: ['Morning dew drop', 'Morgentautropfen', 'Gota de rocío'] },
        { id: 'pebble', hue: 48, n: ['Star pebble', 'Sternenkiesel', 'Guijarro estelar'] },
        { id: 'feather', hue: 230, n: ['Moon feather', 'Mondfeder', 'Pluma lunar'] },
        { id: 'seed', hue: 140, n: ['Glow seed', 'Leuchtsamen', 'Semilla luminosa'] },
        { id: 'shard', hue: 20, n: ['Meteor shard', 'Meteoritensplitter', 'Fragmento de meteorito'] },
        { id: 'petal', hue: 300, n: ['Night-bloom petal', 'Nachtblütenblatt', 'Pétalo nocturno'] },
        { id: 'ribbon', hue: 165, n: ['Aurora ribbon', 'Polarlichtband', 'Cinta de aurora'] },
        { id: 'shell', hue: 265, n: ['Comet shell', 'Kometenmuschel', 'Concha de cometa'] },
        { id: 'acorn', hue: 32, n: ['Tiny acorn', 'Mini-Eichel', 'Bellota diminuta'] },
        { id: 'crystal', hue: 175, n: ['Crystal leaf', 'Kristallblatt', 'Hoja de cristal'] }
    ];
    /* one find per trip: stable for the day, prefers something the user doesn't have yet */
    function pickItem(key, owned) {
        const have = new Set((owned || []).map(o => o && (o.id || o)));
        let h = 7;
        for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
        const fresh = ITEMS.filter(i => !have.has(i.id)), pool = fresh.length ? fresh : ITEMS;
        return pool[h % pool.length].id;
    }
    /* countdown as h:mm, never 0:00 while still away */
    function fmtLeft(ms) {
        const m = Math.max(1, Math.ceil(Math.max(0, +ms || 0) / 60000));
        return Math.floor(m / 60) + ':' + pad(m % 60);
    }
    const core = { GOAL, AWAY_MS, BONUS, PTS, ITEMS, classify, points, model, pickItem, fmtLeft, dayKey };
    if (!D) {
        if (typeof module !== 'undefined' && module.exports) module.exports = core;
        return;
    }

    /* ---------- copy ---------- */
    const lang = () => { try { return (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { return ((D.documentElement.lang) || 'de').slice(0, 2); } };
    const L = () => ({ en: 0, de: 1, es: 2 }[lang()] || 0);
    const copy = {
        sun: ['Sun', 'Sonne', 'Sol'],
        full: ['Sun is full', 'Sonne ist voll', 'Sol lleno'],
        away: ['In the garden', 'Im Garten', 'En el jardín'],
        back: ['back in', 'zurück in', 'vuelve en'],
        title: ['Your sun is full!', 'Deine Sonne ist voll!', '¡Tu sol está lleno!'],
        thanks: ['Thank you! All that sunshine makes me want to explore. I’m popping out to the garden and I’ll bring you something back.', 'Danke! Bei so viel Sonne will ich auf Entdeckungstour. Ich geh kurz in den Garten und bring dir was mit.', '¡Gracias! Con tanto sol me dan ganas de explorar. Salgo un rato al jardín y te traigo algo.'],
        filled: ['What filled it today', 'Das hat sie heute gefüllt', 'Lo que la llenó hoy'],
        go: ['Off you go', 'Los, ab in den Garten', '¡Ve!'],
        backIn: ['Back in', 'Zurück in', 'Vuelvo en'],
        tomorrow: ['Tomorrow your sun starts fresh.', 'Morgen fängt deine Sonne neu an.', 'Mañana tu sol empieza de nuevo.'],
        home: ['I’m back!', 'Ich bin zurück!', '¡Ya volví!'],
        found: ['Look what I found in the garden:', 'Schau, was ich im Garten gefunden hab:', 'Mira lo que encontré en el jardín:'],
        keep: ['Keep it', 'Behalten', 'Guardar'],
        finds: ['Garden finds', 'Garten-Funde', 'Hallazgos del jardín'],
        none: ['Fill your sun and I’ll bring the first one.', 'Füll deine Sonne, dann bring ich den ersten mit.', 'Llena tu sol y te traigo el primero.'],
        how: ['How the sun fills', 'So füllt sich die Sonne', 'Cómo se llena el sol'],
        howTx: ['Every counted action is a sunbeam for me. Repeats and meals over the daily limit don’t count.', 'Jede gezählte Aktion ist ein Sonnenstrahl für mich. Doppeltes und Essen über dem Tageslimit zählt nicht.', 'Cada acción contada es un rayo de sol para mí. Repeticiones y comidas sobre el límite diario no cuentan.'],
        awayTap: ['I’m out in the garden! Back in', 'Ich bin im Garten! Zurück in', '¡Estoy en el jardín! Vuelvo en'],
        meal: ['Meal', 'Mahlzeit', 'Comida'], scan: ['Scan', 'Scan', 'Escaneo'], move: ['Move', 'Bewegung', 'Movimiento'], fast: ['Fasting milestone', 'Fasten-Etappe', 'Etapa de ayuno'],
        macro: ['Macro goal', 'Makro-Ziel', 'Meta de macros'], water: ['Glass of water', 'Glas Wasser', 'Vaso de agua'], other: ['Other action', 'Andere Aktion', 'Otra acción']
    };
    const tr = k => (copy[k] || [k])[L()] || (copy[k] || [k])[0];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const itemName = id => { const it = ITEMS.find(i => i.id === id); return it ? (it.n[L()] || it.n[0]) : id; };
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const sunSvg = r => '<svg class="ls-ico" viewBox="0 0 24 24" aria-hidden="true"><g class="ls-rays">' +
        [0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => '<line x1="12" y1="2.2" x2="12" y2="4.6" transform="rotate(' + a + ' 12 12)" style="opacity:' + (r >= (i + 1) / 8 ? 1 : .28) + '"/>').join('') +
        '</g><circle cx="12" cy="12" r="5.2"/></svg>';
    const itemSvg = id => { const it = ITEMS.find(i => i.id === id) || ITEMS[0]; return '<svg class="ls-find" viewBox="0 0 40 40" aria-hidden="true" style="--h:' + it.hue + '"><circle cx="20" cy="20" r="17" class="ls-find-bg"/><path d="M20 8l3.2 8.1L31 19l-7.8 2.9L20 30l-3.2-8.1L9 19l7.8-2.9z" class="ls-find-fg"/></svg>'; };

    /* ---------- state ---------- */
    const B = () => W.LowiVitalsBridge;
    const S = () => { try { return B().state() || {}; } catch (e) { return {}; } };
    const save = () => { try { B().save(); } catch (e) {} };
    function garden() { const s = S(); if (!s.garden || typeof s.garden !== 'object') s.garden = { trips: {}, items: [] }; s.garden.trips = s.garden.trips || {}; s.garden.items = s.garden.items || []; return s.garden; }
    const live = () => { const s = S(); return model({ now: Date.now(), ledger: s.ledger || [], garden: s.garden }); };

    /* ---------- bar on Today ---------- */
    let row = null, last = '';
    function mount() {
        const home = D.getElementById('spHome'), log = home && home.querySelector('.sp-log');
        if (!log) return null;
        if (!row) {
            row = D.createElement('button');
            row.type = 'button';
            row.id = 'lsSun';
            row.className = 'ls-sun';
            row.dataset.ls = 'info';
        }
        const dash = log.querySelector('#lvDash'), head = log.querySelector(':scope > header');
        const before = dash || (head ? head.nextSibling : log.firstChild);
        if (row.parentNode !== log || (dash && row.nextSibling !== dash)) { log.insertBefore(row, before); last = ''; }
        return row;
    }
    function render() {
        if (!mount()) return;
        const v = live(), home = D.getElementById('spHome');
        const away = !!v.away, label = away ? tr('away') : v.full ? tr('full') : tr('sun');
        const right = away ? tr('back') + ' ' + fmtLeft(v.left) : v.points + '/' + v.goal;
        const sig = [label, right, v.ratio.toFixed(3), lang(), away].join('|');
        if (home) { if (away) home.dataset.sunAway = '1'; else delete home.dataset.sunAway; }
        awayBadge(v);
        if (sig === last) return;
        last = sig;
        row.classList.toggle('full', v.full);
        row.classList.toggle('away', away);
        row.style.setProperty('--ls-fill', v.ratio.toFixed(3));
        row.setAttribute('aria-label', label + ', ' + right);
        row.innerHTML = sunSvg(v.ratio) + '<span class="ls-name">' + esc(label) + '</span><span class="ls-track" aria-hidden="true"><i class="ls-fill"></i></span><span class="ls-num num">' + esc(right) + '</span>';
    }
    function awayBadge(v) {
        const bub = D.getElementById('spBubble');
        if (!bub) return;
        let b = bub.querySelector('.ls-away');
        if (!v.away) { if (b) b.remove(); return; }
        if (!b) { b = D.createElement('span'); b.className = 'ls-away'; b.setAttribute('aria-hidden', 'true'); bub.appendChild(b); }
        const t = fmtLeft(v.left), html = '<i class="ls-away-ico">' + sunSvg(1) + '</i><b>' + esc(tr('away')) + '</b><small class="num">' + t + '</small>';
        if (b.dataset.t !== t + lang()) { b.dataset.t = t + lang(); b.innerHTML = html; }
    }
    function pop(n) {
        if (!row || !row.isConnected || !n) return;
        const p = D.createElement('span');
        p.className = 'ls-pop' + (reduced() ? ' rm' : '');
        p.textContent = '+' + n;
        p.setAttribute('aria-hidden', 'true');
        row.appendChild(p);
        row.classList.remove('ls-bump'); void row.offsetWidth; if (!reduced()) row.classList.add('ls-bump');
        setTimeout(() => p.remove(), 1300);
    }

    /* ---------- sheets ---------- */
    const R = () => W.LowiR2;
    function partsHtml(v) {
        const ks = Object.keys(v.parts);
        if (!ks.length) return '';
        return '<ul class="ls-parts">' + ks.map(k => '<li><span>' + esc(tr(k)) + (v.parts[k].n > 1 ? ' ×' + v.parts[k].n : '') + '</span><b class="num">+' + v.parts[k].pts + '</b></li>').join('') + '</ul>';
    }
    function fullSheet(v) {
        if (!R() || !R().sheet) return;
        try { localStorage.setItem('lowi.sun.sheet', v.key); } catch (e) {}
        const html = '<div class="ls-sheet"><div class="ls-big">' + sunSvg(1) + '</div><h2>' + esc(tr('title')) + '</h2><p class="ls-say">' + esc(tr('thanks')) + '</p>' +
            '<p class="ls-bonus num">+' + BONUS + ' XP</p>' +
            (Object.keys(v.parts).length ? '<h3>' + esc(tr('filled')) + '</h3>' + partsHtml(v) : '') +
            '<p class="ls-note">' + esc(tr('backIn')) + ' ' + fmtLeft(AWAY_MS) + ' · ' + esc(tr('tomorrow')) + '</p>' +
            '<button type="button" class="ls-cta" data-ls="close">' + esc(tr('go')) + '</button></div>';
        R().sheet(html, { cls: 'ls-ov' });
    }
    function returnSheet(trip) {
        const name = itemName(trip.item);
        if (R() && R().sheet) {
            R().sheet('<div class="ls-sheet"><div class="ls-big">' + itemSvg(trip.item) + '</div><h2>' + esc(tr('home')) + '</h2><p class="ls-say">' + esc(tr('found')) + '</p><p class="ls-item">' + esc(name) + '</p>' +
                '<button type="button" class="ls-cta" data-ls="close">' + esc(tr('keep')) + '</button></div>', { cls: 'ls-ov' });
        }
    }
    function infoSheet() {
        if (!R() || !R().sheet) return;
        const v = live(), g = garden();
        const how = ['meal', 'scan', 'move', 'fast', 'macro', 'water'].map(k => '<li><span>' + esc(tr(k)) + '</span><b class="num">+' + PTS[k] + '</b></li>').join('');
        const finds = g.items.length ? '<ul class="ls-finds">' + g.items.slice(-12).reverse().map(i => '<li>' + itemSvg(i.id) + '<span>' + esc(itemName(i.id)) + '</span></li>').join('') + '</ul>' : '<p class="ls-note">' + esc(tr('none')) + '</p>';
        R().sheet('<div class="ls-sheet ls-info"><div class="ls-head">' + sunSvg(v.ratio) + '<div><h2>' + esc(v.away ? tr('away') : v.full ? tr('full') : tr('sun')) + '</h2><p class="num">' + (v.away ? esc(tr('back')) + ' ' + fmtLeft(v.left) : v.points + '/' + v.goal) + '</p></div></div>' +
            '<div class="ls-track big" style="--ls-fill:' + v.ratio.toFixed(3) + '"><i class="ls-fill"></i></div>' + partsHtml(v) +
            '<h3>' + esc(tr('how')) + '</h3><p class="ls-note">' + esc(tr('howTx')) + '</p><ul class="ls-parts how">' + how + '</ul>' +
            '<h3>' + esc(tr('finds')) + '</h3>' + finds + '</div>', { cls: 'ls-ov' });
    }

    /* ---------- flow ---------- */
    let busy = false;
    function check(e) {
        const v = live();
        if (e && e.detail && e.detail.entry && !v.fullDone) {
            const n = points(e.detail.entry);
            const before = v.raw - n;
            if (n && before < GOAL) pop(Math.min(n, GOAL - before));
        } else if (e && e.detail && e.detail.entry && points(e.detail.entry) && !v.full) pop(points(e.detail.entry));
        render();
        if (v.full && !v.fullDone && !busy) { busy = true; setTimeout(fill, 700); }
    }
    function fill() {
        busy = false;
        const v = live();
        if (!v.full || v.fullDone || !W.LowiHost) return;
        const got = LowiHost.award('sun-full', null, { amt: BONUS, label: 'Sun meter full', eventId: 'sun-full:' + v.key, perDay: 1 });
        if (!got) return;
        const g = garden();
        if (!g.trips[v.key]) g.trips[v.key] = { start: Date.now(), back: Date.now() + AWAY_MS, item: pickItem(v.key, g.items), got: false };
        save();
        let shown = '';
        try { shown = localStorage.getItem('lowi.sun.sheet') || ''; } catch (x) {}
        if (shown !== v.key) fullSheet(live());
        render();
    }
    function collect() {
        const v = live();
        if (!v.pending.length || D.hidden) return;
        if (R() && R().top && R().top()) return;
        const home = D.querySelector('#tab-home.active');
        if (!home) return;
        const g = garden(), t = v.pending[0], trip = g.trips[t.day];
        if (!trip || trip.got) return;
        trip.got = true;
        if (!g.items.some(i => i.day === t.day)) g.items.push({ id: trip.item, day: t.day, ts: Date.now() });
        save();
        render();
        returnSheet(trip);
    }
    D.addEventListener('click', e => {
        const c = e.target.closest && e.target.closest('[data-ls]');
        if (c && c.dataset.ls === 'close') { const ov = c.closest('.r2-ov'); if (ov && R()) R().close(ov); return; }
        if (c && c.dataset.ls === 'info') { e.preventDefault(); infoSheet(); return; }
        const bub = e.target.closest && e.target.closest('#spBubble');
        if (bub) {
            const v = live();
            /* ambience only: the trip never blocks the herb world or anything in it */
            if (v.away && W.LowiPraise && LowiPraise.say) LowiPraise.say(tr('awayTap') + ' ' + fmtLeft(v.left) + '.');
        }
    }, true);

    let queued = 0;
    const schedule = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; try { render(); } catch (e) {} }); };
    W.addEventListener('lowi:reward', e => { try { check(e); } catch (x) {} });
    ['lowi:lang', 'lowi:state', 'storage', 'focus'].forEach(n => W.addEventListener(n, schedule));
    D.addEventListener('visibilitychange', () => { schedule(); setTimeout(collect, 600); });
    function boot() {
        if (!D.getElementById('lsCss')) {
            const l = D.createElement('link');
            l.id = 'lsCss'; l.rel = 'stylesheet';
            const me = D.querySelector('script[src*="sun-meter.js"]');
            l.href = me ? me.getAttribute('src').replace('sun-meter.js', 'sun-meter.css') : 'sun-meter.css';
            D.head.appendChild(l);
        }
        const tab = D.getElementById('tab-home');
        if (tab && W.MutationObserver) new MutationObserver(() => { if (!row || !row.isConnected || (row.nextSibling && row.nextSibling.id !== 'lvDash' && D.getElementById('lvDash'))) schedule(); }).observe(tab, { childList: true, subtree: true });
        schedule();
        setTimeout(() => check(null), 1500);
        setInterval(() => { if (D.hidden) return; const v = live(); if (v.away || v.pending.length) { schedule(); collect(); } }, 5000);
        setInterval(() => { if (!D.hidden) schedule(); }, 30000);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    W.LowiSun = Object.assign({}, core, { render, live, info: infoSheet, collect });
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiSun;
})();
