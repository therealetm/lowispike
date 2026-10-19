/* Oct 16 (E-man, 04:10): "this weird misty radiant hub ... I don't even know what I'm seeing ... it doesn't even look like my
   Misty ... Nuke that and redesign it so it fits our whole design more." One clear Misty card in the app's own language:
   - the SAME Misty as on Home (her live Home artwork is cloned, not a second drawing), over the same live blue world
     (a normal glass sheet; no cosmic oval, no constellations)
   - what she is up to, her level and XP, a readable mood check-in, Goodnight at night, and three doors:
     Forms (evolution), Collection, Glow (aura / growth / discoveries)
   It opens on a LONG PRESS on Misty (tap stays pet/play) and wherever the old herb world used to open.

   Misty's nudges (same request): when something in Today needs you, Misty says so once in her Home speech bubble
   ("I'm back! Open Today for your surprise", "My sun is full!", "I'm sleepy... say goodnight?"). Tapping the bubble
   opens Today and points at the row. One nudge at a time, each one once, a quiet gap between them, never during a
   sheet, a first-timer hint or right after the page loads. */
(() => {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiMistyHub) return;
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'de').slice(0, 2); } catch (e) { return 'de'; } };
    const T = (en, de, es) => ({ de, es })[lang()] || en;
    const LI = () => ({ de: 1, es: 2 })[lang()] || 0;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const C = () => W.LowiWorldHomeCore;
    const GN_KEY = 'lowi.mh.goodnight', NUDGE_KEY = 'lowi.mh.nudges';
    const cellCopy = k => { try { const c = W.LowiCell && W.LowiCell.copy && W.LowiCell.copy[k]; return c ? (c[LI()] || c[0]) : ''; } catch (e) { return ''; } };

    /* ---------- data ---------- */
    function cur() { try { return W.LowiHerbTamagotchi && W.LowiHerbTamagotchi.current ? W.LowiHerbTamagotchi.current() : null; } catch (e) { return null; } }
    function xpNow() { const c = cur(); return c && c.m ? +c.m.xp || 0 : 0; }
    function name() { const c = cur(); try { return c ? String(W.LowiHerbTamagotchi.name(c.p, c.m) || 'Misty') : 'Misty'; } catch (e) { return 'Misty'; } }
    function cell() { try { return W.LowiCell && W.LowiCell.live ? W.LowiCell.live() : null; } catch (e) { return null; } }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function dayKey(t) { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    /* the night belongs to the evening it started on: 01:00 on Friday is still Thursday's night */
    function nightKey() { return dayKey(Date.now() - 12 * 3600e3); }
    function isNight() { const p = H.dataset.spPeriod; if (p) return p === 'night'; const h = new Date().getHours(); return h >= 22 || h < 6; }
    function saidGoodnight() { try { return localStorage.getItem(GN_KEY) === nightKey(); } catch (e) { return false; } }
    function aura() { try { const c = C(); const id = W.LowiWorldHome && W.LowiWorldHome.auraId ? W.LowiWorldHome.auraId() : ''; return c ? c.aura(id) : { a: '#6ee7c8', b: '#64d2ff' }; } catch (e) { return { a: '#6ee7c8', b: '#64d2ff' }; } }
    function stageOf(xp) {
        const c = C(); if (!c || !c.stage) return null;
        const s = c.stage(xp), P = arr => c.pick(arr, lang());
        return { name: P(s.cur.n), next: s.next ? P(s.next.n) : '', pct: s.pct, left: s.left, level: s.index + 1, levels: (c.STAGES || []).length || 6 };
    }
    /* Misty's Home artwork, cloned so the card shows exactly the Misty you see on Home */
    function art() {
        const live = D.querySelector('#spBubble .sp-home-herb svg.tmg-plant') || D.querySelector('#spBubble svg.tmg-plant');
        if (live) {
            const c = live.cloneNode(true);
            c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
            c.setAttribute('aria-hidden', 'true'); c.classList.add('mh-misty');
            return c.outerHTML;
        }
        const x = cur();
        try { if (x && W.LowiHerbTamagotchi.plantHTML) return W.LowiHerbTamagotchi.plantHTML(x.m, 'preview', x.p, { label: name() }); } catch (e) { }
        return '';
    }
    function status() {
        const v = cell();
        const box = D.querySelector('#spHome .sp-status');
        const t = box && box.querySelector('b');
        let title = t ? t.textContent.trim() : '', sub = '';
        if (v) {
            const act = v.activity === 'journey' ? cellCopy('act_journey') : cellCopy('act_' + v.activity);
            sub = [cellCopy(v.state), act].filter(Boolean).join(' \u00b7 ');
        }
        if (!title) title = name();
        return { title, sub, state: v ? v.state : '' };
    }
    function line(v) {
        if (saidGoodnight() && isNight()) return T('Goodnight. I\u2019m curling up, see you in the morning.', 'Gute Nacht. Ich kuschel mich ein, bis morgen fr\u00fch.', 'Buenas noches. Me acurruco, nos vemos por la ma\u00f1ana.');
        const c = v || cell(); if (!c) return '';
        return cellCopy(c.activity === 'journey' ? 'say_journey' : 'say_' + c.state) || '';
    }

    /* ---------- the card ---------- */
    const ICO = {
        forms: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18c2-6 5-9 8-9s6 3 8 9"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="9" r="2.4"/><circle cx="18" cy="18" r="1.6"/></svg>',
        col: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="7" height="9" rx="2"/><rect x="13" y="5" width="7" height="9" rx="2"/><path d="M4 18h16"/></svg>',
        glow: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
        moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'
    };
    function html(sayOverride) {
        const xp = xpNow(), s = stageOf(xp), a = aura(), v = cell(), st = status();
        const mood = v ? v.mood : '';
        const moods = (W.LowiCell && W.LowiCell.MOODS) || ['good', 'okay', 'tired', 'unwell'];
        const say = sayOverride || line(v);
        const night = isNight(), gn = saidGoodnight();
        return '<div class="mh" id="mistyHub" data-noi18n style="--a:' + esc(a.a) + ';--b:' + esc(a.b) + '">' +
            '<header class="mh-head">' +
                '<div class="mh-art"><span class="mh-glow" aria-hidden="true"></span>' + art() + '</div>' +
                '<div class="mh-id"><h2>' + esc(name()) + '</h2>' +
                    (s ? '<p class="mh-lv">' + esc(T('Level ', 'Level ', 'Nivel ') + s.level + ' \u00b7 ' + s.name) + '</p>' : '') +
                    '<p class="mh-st"><b>' + esc(st.title) + '</b>' + (st.sub ? '<span>' + esc(st.sub) + '</span>' : '') + '</p>' +
                '</div>' +
            '</header>' +
            (say ? '<p class="mh-say" role="status" aria-live="polite">' + esc(say) + '</p>' : '<p class="mh-say" role="status" aria-live="polite" hidden></p>') +
            scaleHtml() +
            (s ? '<section class="mh-card mh-xp" aria-label="' + esc(T('Level and XP', 'Level und XP', 'Nivel y XP')) + '">' +
                '<div class="mh-row"><b>' + esc(s.name) + '</b><span class="num">' + xp + ' XP</span></div>' +
                '<i class="mh-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(s.pct * 100) + '" aria-label="' + esc(T('Progress to the next level', 'Fortschritt zum n\u00e4chsten Level', 'Progreso al siguiente nivel')) + '"><i style="width:' + Math.round(s.pct * 100) + '%"></i></i>' +
                '<small>' + esc(s.next ? T(s.left + ' XP to ' + s.next, 'Noch ' + s.left + ' XP bis ' + s.next, 'Faltan ' + s.left + ' XP para ' + s.next) : T('Top level reached', 'H\u00f6chstes Level erreicht', 'Nivel m\u00e1ximo alcanzado')) + '</small>' +
            '</section>' : '') +
            advHtml() +
            '<section class="mh-card mh-mood" aria-label="' + esc(cellCopy('feel') || 'How do you feel?') + '">' +
                '<h3>' + esc(cellCopy('feel') || T('How do you feel?', 'Wie f\u00fchlst du dich?', '\u00bfC\u00f3mo te sientes?')) + '</h3>' +
                '<div class="mh-moods">' + moods.map(m => '<button type="button" data-mh="mood" data-mood="' + m + '" aria-pressed="' + (mood === m) + '">' + esc(cellCopy('m_' + m) || m) + '</button>').join('') + '</div>' +
            '</section>' +
            (night ? '<button type="button" class="mh-pri" data-mh="goodnight"' + (gn ? ' aria-pressed="true"' : '') + '>' + ICO.moon + '<span>' + esc(gn ? T('Tucked in for the night', 'F\u00fcr die Nacht eingekuschelt', 'Arropada para la noche') : T('Say goodnight', 'Gute Nacht sagen', 'Dar las buenas noches')) + '</span></button>' : '') +
            '<nav class="mh-doors" aria-label="' + esc(name()) + '">' +
                '<button type="button" data-mh="forms">' + ICO.forms + '<b>' + esc(T('Forms', 'Formen', 'Formas')) + '</b><small>' + esc(T('How it evolves', 'Wie es sich entwickelt', 'C\u00f3mo evoluciona')) + '</small></button>' +
                '<button type="button" data-mh="collection">' + ICO.col + '<b>' + esc(T('Collection', 'Sammlung', 'Colecci\u00f3n')) + '</b><small>' + esc(T('Your scanned cards', 'Deine Scan-Karten', 'Tus cartas')) + '</small></button>' +
                '<button type="button" data-mh="glow">' + ICO.glow + '<b>' + esc(T('Glow', 'Leuchten', 'Brillo')) + '</b><small>' + esc(T('Aura and finds', 'Aura und Funde', 'Aura y hallazgos')) + '</small></button>' +
            '</nav>' +
        '</div>';
    }
    /* Oct 17: Misty's energy scale and her way back (misty-scale.js), right under her words */
    /* adventure tiers (adventure-tiers.js): what her timed adventure reaches at this level; autopilot is never gated */
    function advHtml() { try { return W.LowiAdventureTiers && W.LowiAdventureTiers.html ? W.LowiAdventureTiers.html() : ''; } catch (e) { return ''; } }
    function scaleHtml() { try { return W.LowiMistyScale && W.LowiMistyScale.html ? W.LowiMistyScale.html() : ''; } catch (e) { return ''; } }
    function sheet() { return D.getElementById('mistyHub'); }
    function open(sayOverride) {
        const R2 = W.LowiR2; if (!R2 || !R2.sheet) return false;
        if (sheet()) { repaint(sayOverride); return true; }
        try { if (W.LowiWorldHome && W.LowiWorldHome.state && W.LowiWorldHome.state.today) W.LowiWorldHome.openToday(false); } catch (e) { }
        R2.sheet(html(sayOverride), { cls: 'wh-ms-ov mh-ov' });
        try { W.LowiWorldHome && W.LowiWorldHome.syncX && setTimeout(W.LowiWorldHome.syncX, 20); } catch (e) { }
        hideNudge();
        return true;
    }
    function repaint(sayOverride) {
        const ex = sheet(); if (!ex) return;
        const t = D.createElement('div'); t.innerHTML = html(sayOverride);
        ex.replaceWith(t.firstChild);
    }
    function close() { const ex = sheet(); const ov = ex && ex.closest('.r2-ov'); try { if (ov && W.LowiR2 && W.LowiR2.close) W.LowiR2.close(ov); else if (ov) ov.remove(); } catch (e) { ov && ov.remove(); } }
    function goodnight() {
        try { localStorage.setItem(GN_KEY, nightKey()); } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:goodnight', { detail: { night: nightKey() } })); } catch (e) { }
        try { navigator.vibrate && navigator.vibrate(10); } catch (e) { }
        repaint();
    }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('#mistyHub [data-mh]'); if (!b) return;
        const k = b.dataset.mh;
        if (k === 'mood') {
            try { W.LowiCell && W.LowiCell.setMood(b.dataset.mood); } catch (x) { }
            const v = cell();
            repaint(v && v.mood ? cellCopy('thanks') : '');
        } else if (k === 'goodnight') goodnight();
        else if (k === 'forms') { try { if (W.LowiCompanion && W.LowiCompanion.open && W.LowiCompanion.open()) return; } catch (x) { } openDetails('grow'); }
        else if (k === 'collection') { const t = D.createElement('button'); t.type = 'button'; t.dataset.sp = 'collection'; t.hidden = true; D.body.appendChild(t); t.click(); t.remove(); }
        else if (k === 'glow') openDetails('aura');
    });
    function openDetails(tab) { try { if (W.LowiWorldHome && W.LowiWorldHome.openDetails) return W.LowiWorldHome.openDetails(tab); } catch (e) { } return false; }
    ['lowi:herb-xp', 'lowi:cell-state', 'lowi:meal-logged', 'lowi:lang'].forEach(ev => W.addEventListener(ev, () => { if (sheet()) repaint(); }));

    /* ---------- Misty's nudges on Home ---------- */
    const NUDGE_GAP = 90e3, NUDGE_SHOW = 11e3, NUDGE_DAY_MAX = 4, SETTLE = 3500;
    let nudge = null, nudgeEl = null, hideT = 0, homeSince = 0, lastShown = 0;
    const NUDGE_RETRY = 10 * 60e3, NUDGE_SHOWS_MAX = 8, retry = {}, shows = [];
    function seen() { try { const s = JSON.parse(localStorage.getItem(NUDGE_KEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch (e) { return {}; } }
    function markSeen(key) {
        const s = seen(), now = Date.now(); s[key] = now;
        Object.keys(s).forEach(k => { if (now - s[k] > 3 * 864e5) delete s[k]; });
        try { localStorage.setItem(NUDGE_KEY, JSON.stringify(s)); } catch (e) { }
    }
    function shownToday() { const s = seen(), d = dayKey(); return Object.values(s).filter(t => dayKey(t) === d).length; }
    function tripKey() { try { const b = W.LowiBodyTrips && W.LowiBodyTrips.state && W.LowiBodyTrips.state(); const t = b && b.trip; return t ? String(t.place || '') + ':' + String(t.start || t.at || t.ts || t.until || dayKey()) : dayKey(); } catch (e) { return dayKey(); } }
    /* what in Today needs you right now, most important first (one at a time) */
    function candidates() {
        const out = [], home = D.getElementById('spHome');
        if (home && home.querySelector('[data-bt="bar"].back')) out.push({ key: 'trip:' + tripKey(), row: '[data-bt="bar"].back', text: T('I\u2019m back! Open Today for your surprise.', 'Bin zur\u00fcck! \u00d6ffne Heute f\u00fcr deine \u00dcberraschung.', '\u00a1Volv\u00ed! Abre Hoy para tu sorpresa.') });
        let sun = null; try { sun = W.LowiSun && W.LowiSun.live && W.LowiSun.live(); } catch (e) { }
        if (sun && sun.full && !sun.away) out.push({ key: 'sun:' + dayKey(), row: '.ls-row, [class*="ls-"].full', text: T('My sun is full! Peek in Today.', 'Meine Sonne ist voll! Schau in Heute.', '\u00a1Mi sol est\u00e1 lleno! Mira en Hoy.') });
        if (isNight() && !saidGoodnight() && home && home.querySelector('.sp-next[data-sp="open"]')) out.push({ key: 'gn:' + nightKey(), row: '.sp-next[data-sp="open"]', text: T('I\u2019m sleepy\u2026 say goodnight in Today?', 'Ich bin m\u00fcde \u2026 sagst du mir in Heute gute Nacht?', 'Tengo sue\u00f1o\u2026 \u00bfme das las buenas noches en Hoy?') });
        return out;
    }
    /* why Misty stays quiet right now ('' = she may speak) */
    function quiet() {
        if (D.hidden) return 'hidden';
        /* Oct 17 (E-man): no nudges while Misty flies (autopilot or steering); nobody reads them then */
        if (H.classList.contains('mf-on')) return 'flying';
        const wh = W.LowiWorldHome;
        const tab = D.getElementById('tab-home');
        if (!tab || !tab.classList.contains('active')) return 'not-home';
        if (!H.classList.contains('wh-home')) return 'no-world';
        if (wh && wh.state && wh.state.today) return 'today-open';
        const busy = ['wh-today-open', 'gate-up', 'gx-hold'].find(c => H.classList.contains(c)); if (busy) return busy;
        try { const t = W.LowiR2 && W.LowiR2.top && W.LowiR2.top(); if (t && t.isConnected) return 'sheet'; } catch (e) { }
        if ([...D.querySelectorAll('.cf-ov.on, #drDay')].some(e => e.getBoundingClientRect().width > 0)) return 'overlay';
        const hint = D.getElementById('whHint'); if (hint && hint.classList.contains('on')) return 'hint';
        const b = D.getElementById('spBubble'); if (!b || !b.getBoundingClientRect().width) return 'no-misty';
        return '';
    }
    /* Oct 19 (bug hunt BH-002): on the ring Home the spot right above Misty's head sits on Settings, Water and Fuel, so the nudge
       covered them and a tap on their upper half opened Today instead. Controls are never covered: when the head spot touches one,
       the nudge moves to the top (or bottom) of the screen with no tail, like the guides' speech bubbles inside worlds (BH-001).
       Pure: m = Misty's rect {l, t, w}, b = nudge size {w, h}, obs = control rects {l, t, r, b}, view = {w, h}. */
    function nudgeSpot(m, b, obs, view) {
        const ov = (q, o) => Math.max(0, Math.min(q.l + b.w, o.r) - Math.max(q.l, o.l)) * Math.max(0, Math.min(q.t + b.h, o.b) - Math.max(q.t, o.t));
        const cost = q => (obs || []).reduce((c, o) => c + ov(q, o), 0);
        const cx = m.l + m.w / 2, half = b.w / 2;
        const head = { l: cx - half, t: Math.max(8, m.t - b.h - 10) };
        if (!cost(head)) return { x: cx, t: head.t, dock: false };
        const x = Math.max(10 + half, Math.min(view.w - 10 - half, cx));
        let best = null, bc = cost(head);
        for (const t of [56, view.h - b.h - 28]) { const q = { l: x - half, t }; const c = cost(q); if (c < bc) { bc = c; best = { x, t, dock: true }; } }
        return best || { x: cx, t: head.t, dock: false };
    }
    function nudgeObstacles() {
        const out = [];
        D.querySelectorAll('[data-orbit], #whPad').forEach(e => {
            const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return;
            const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
            out.push({ l: r.left - 4, t: r.top - 4, r: r.right + 4, b: r.bottom + 4 }); /* faded controls too: they come straight back */
        });
        return out;
    }
    function place() {
        if (!nudgeEl) return;
        const b = D.getElementById('spBubble'); if (!b) return;
        /* same spot as Misty's own speech line (world-home paintHint): right above her head, tail on her, unless that covers a control */
        const r = b.getBoundingClientRect();
        const s = nudgeSpot({ l: r.left, t: r.top, w: r.width }, { w: nudgeEl.offsetWidth, h: nudgeEl.offsetHeight }, nudgeObstacles(), { w: W.innerWidth, h: W.innerHeight });
        nudgeEl.style.left = Math.round(s.x) + 'px';
        nudgeEl.style.top = Math.round(s.t) + 'px';
        if (nudgeEl.classList.contains('mh-dock') !== s.dock) nudgeEl.classList.toggle('mh-dock', s.dock);
    }
    function showNudge(n) {
        const hud = D.getElementById('whHud') || (D.getElementById('whHint') || {}).parentElement || D.body;
        if (!nudgeEl || !nudgeEl.isConnected) {
            nudgeEl = D.createElement('button'); nudgeEl.type = 'button'; nudgeEl.id = 'mhNudge';
            nudgeEl.className = 'wh-hint wh-say mh-nudge';
            nudgeEl.setAttribute('aria-live', 'polite');
            nudgeEl.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); tapNudge(); });
            hud.appendChild(nudgeEl);
        }
        /* only a deliberate tap on the nudge marks it (tapNudge); a nudge that fades unread may come back after NUDGE_RETRY */
        nudge = n; lastShown = Date.now(); retry[n.key] = lastShown; shows.push(lastShown);
        nudgeEl.textContent = n.text;
        nudgeEl.setAttribute('aria-label', n.text + ' \u00b7 ' + T('Open Today', 'Heute \u00f6ffnen', 'Abrir Hoy'));
        place();
        requestAnimationFrame(() => { nudgeEl && nudgeEl.classList.add('on'); });
        clearTimeout(hideT); hideT = setTimeout(hideNudge, W.LowiReadTime ? W.LowiReadTime.atLeast(n.text, NUDGE_SHOW) : NUDGE_SHOW); /* never shorter than its reading time */
    }
    function hideNudge() { clearTimeout(hideT); if (nudgeEl) nudgeEl.classList.remove('on'); nudge = null; }
    function tapNudge() {
        const n = nudge; hideNudge(); if (n) markSeen(n.key);
        try { W.LowiWorldHome && W.LowiWorldHome.openToday(true); } catch (e) { }
        if (!n || !n.row) return;
        /* Today repaints its rows while it opens, so keep re-finding the row and keep the glow on it for a moment */
        const sel = n.row.split(',').map(x => '#whToday ' + x.trim()).join(', ');
        let k = 0, scrolled = false;
        const iv = setInterval(() => {
            const r = D.querySelector(sel);
            if (r) {
                if (!scrolled) { scrolled = true; try { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { } }
                r.classList.add('mh-point');
            }
            if (++k > 10) { clearInterval(iv); D.querySelectorAll('.mh-point').forEach(x => x.classList.remove('mh-point')); }
        }, 260);
    }
    function tick() {
        if (quiet()) { homeSince = 0; if (nudge) hideNudge(); return; }
        if (!homeSince) { homeSince = Date.now(); return; }
        if (nudge) { place(); return; }
        if (Date.now() - homeSince < SETTLE || Date.now() - lastShown < NUDGE_GAP || shownToday() >= NUDGE_DAY_MAX) return;
        const now = Date.now(); while (shows.length && dayKey(shows[0]) !== dayKey(now)) shows.shift();
        if (shows.length >= NUDGE_SHOWS_MAX) return;
        const s = seen(), n = candidates().find(c => !s[c.key] && !(retry[c.key] && now - retry[c.key] < NUDGE_RETRY));
        if (n) showNudge(n);
    }
    function boot() { setInterval(tick, 1500); W.addEventListener('resize', place); }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    W.LowiMistyHub = { open, close, repaint, goodnight, saidGoodnight, nightKey, candidates, tick, quiet, nudgeSpot, _html: html };
})();
