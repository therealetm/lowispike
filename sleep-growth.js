/* sleep-growth.js: logging Sleep grows Misty (Oct 18 2026, Emmanuel: sleep, like the other habits, should grow her; 7 h or more counts the most).
   - XP goes through the app's one ledger only: LowiVitalsBridge.awardWith / unaward (index.html), so it moves S.xp, the level and
     Misty's stage exactly like a glass of water or a Move. Stages never regress (LowiHerbCore.sync), so taking XP back never shrinks her.
   - One ledger entry per local sleep day: eventId 'sleep:<YYYY-MM-DD>', src 'sleep', label 'Sleep' (no hours in the ledger).
     The entry always equals XP[band] of that day's log: a correction swaps it (net change = the difference), Under 6 h or Clear
     takes it back. Repeated taps, repeated events and reloads change nothing, so nothing can be farmed.
   - XP table below is PROVISIONAL (chosen by the coding task, for Emmanuel to tune): 7 h or more = 10, 6-7 h = 5, under 6 h = 0.
     Nothing above 7 h, never minus points, no shaming words.
   - Sleep stays private: the log itself stays in S.health.sleepDays (never backed up); sun-meter.js gives src 'sleep' no sunbeam,
     so the Care board does not change. Only the XP total moves, like any other habit.
   - Wiring: listens to the document event 'lowi:sleep' {day, band} that home-settings-sleep-v2.js sends on every change, and reads the
     band back from the store (the store is the truth, never the event). On start it only settles today when today has a log here
     (health is device-only, the ledger is synced: a device without the log never takes XP back on its own).
   window.LowiSleepGrowth: { XP, eventId, want, plan, engine, message, reconcile }. Node: module.exports = the pure core. */
(function (root) {
    'use strict';
    if (!root) return;
    if (root.LowiSleepGrowth) return;

    /* the one place to tune sleep XP */
    const XP = Object.freeze({ under6: 0, '6to7': 5, '7plus': 10 });
    const BANDS = ['under6', '6to7', '7plus'];
    const SRC = 'sleep', PRE = 'sleep:', LABEL = 'Sleep';
    const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
    const MAX = Math.max.apply(null, BANDS.map(b => XP[b]));

    const pad = n => String(n).padStart(2, '0');
    function dayKey(t) { const d = t instanceof Date ? t : new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function prevDay(key) { const p = String(key).split('-').map(Number); return dayKey(new Date(p[0], p[1] - 1, p[2] - 1, 12)); }
    const eventId = day => PRE + day;
    const want = band => (BANDS.includes(band) ? XP[band] : 0);
    function bandOf(state, day) {
        const m = state && state.health && state.health.sleepDays, e = m && typeof m === 'object' && !Array.isArray(m) ? m[day] : null;
        return e && BANDS.includes(e.band) ? e.band : null;
    }
    function have(ledger, day) {
        const id = eventId(day);
        return (Array.isArray(ledger) ? ledger : []).filter(e => e && e.eventId === id).reduce((n, e) => n + Math.max(0, +e.amt || 0), 0);
    }
    /* what today's ledger needs: {day, eventId, band, have, want, delta} */
    function plan(input) {
        const day = input.day, band = BANDS.includes(input.band) ? input.band : null, h = have(input.ledger, day), w = want(band);
        return { day, eventId: eventId(day), band, have: h, want: w, delta: w - h };
    }

    /* the engine: settles one day against the store through the bridge. env: {bridge, now?} */
    function engine(env) {
        let busy = false;
        const now = () => (env.now ? +env.now() : Date.now());
        function okDay(day) { const t = dayKey(now()); return DAY_RE.test(String(day || '')) && (day === t || day === prevDay(t)); }
        /* opts.explicit: the user changed or cleared it on this device (may take XP back). Without it, only a day that has a log here is settled. */
        function reconcile(day, opts) {
            opts = opts || {};
            const B = env.bridge && env.bridge();
            if (!B || typeof B.state !== 'function' || typeof B.awardWith !== 'function' || typeof B.unaward !== 'function') return null;
            day = day || dayKey(now());
            if (!okDay(day) || busy) return null;
            const S = B.state(); if (!S || typeof S !== 'object') return null;
            const p = plan({ day, band: bandOf(S, day), ledger: S.ledger });
            if (!opts.explicit && !p.band) return Object.assign(p, { delta: 0, changed: false, skipped: true });
            if (!p.delta) return Object.assign(p, { changed: false });
            const xp0 = +S.xp || 0;
            busy = true;
            try {
                if (p.have > 0) { let n = 0; while (have(S.ledger, day) > 0 && n++ < 5) if (!B.unaward(p.eventId)) break; }
                if (p.want > 0) B.awardWith(p.want, LABEL, SRC, p.eventId, null, true);
            } finally { busy = false; }
            const S2 = B.state(), got = have(S2.ledger, day);
            return Object.assign(p, { changed: true, delta: got - p.have, credited: got, xpBefore: xp0, xpAfter: +S2.xp || 0 });
        }
        return { reconcile, okDay };
    }

    /* plain words for what just happened; null = say nothing */
    const TX = {
        en: { add7: '+{n} XP for {name} \u00b7 7 h or more', add6: '+{n} XP for {name} \u00b7 6\u20137 h (7 h or more gives {max})', under: 'Sleep logged \u00b7 6 h or more helps {name} grow',
            up: '+{d} XP for {name} \u00b7 now {w} XP for last night', down: 'Sleep changed \u00b7 now {w} XP for last night', back: 'Sleep changed \u00b7 {h} XP taken back',
            cleared: 'Sleep cleared \u00b7 {h} XP taken back', same: 'Already counted \u00b7 {w} XP for last night' },
        de: { add7: '+{n} XP f\u00fcr {name} \u00b7 7 Std. oder mehr', add6: '+{n} XP f\u00fcr {name} \u00b7 6\u20137 Std. (7 Std. oder mehr gibt {max})', under: 'Schlaf eingetragen \u00b7 ab 6 Std. w\u00e4chst {name} mit',
            up: '+{d} XP f\u00fcr {name} \u00b7 jetzt {w} XP f\u00fcr letzte Nacht', down: 'Schlaf ge\u00e4ndert \u00b7 jetzt {w} XP f\u00fcr letzte Nacht', back: 'Schlaf ge\u00e4ndert \u00b7 {h} XP zur\u00fcckgenommen',
            cleared: 'Schlaf gel\u00f6scht \u00b7 {h} XP zur\u00fcckgenommen', same: 'Schon gez\u00e4hlt \u00b7 {w} XP f\u00fcr letzte Nacht' },
        es: { add7: '+{n} XP para {name} \u00b7 7 h o m\u00e1s', add6: '+{n} XP para {name} \u00b7 6\u20137 h (7 h o m\u00e1s da {max})', under: 'Sue\u00f1o anotado \u00b7 con 6 h o m\u00e1s {name} crece',
            up: '+{d} XP para {name} \u00b7 ahora {w} XP por anoche', down: 'Sue\u00f1o cambiado \u00b7 ahora {w} XP por anoche', back: 'Sue\u00f1o cambiado \u00b7 {h} XP retirados',
            cleared: 'Sue\u00f1o borrado \u00b7 {h} XP retirados', same: 'Ya contado \u00b7 {w} XP por anoche' }
    };
    function message(r, lang, name) {
        if (!r || r.skipped) return null;
        const t = TX[String(lang || 'en').slice(0, 2)] || TX.en, nm = String(name || 'Misty');
        const f = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
        const o = { name: nm, n: r.want, d: Math.abs(r.delta), w: r.want, h: r.have, max: MAX };
        if (!r.band) return r.have > 0 ? f(t.cleared, o) : null;
        if (!r.changed) return r.want > 0 ? f(t.same, o) : f(t.under, o);
        if (r.have === 0) return f(r.band === '7plus' ? t.add7 : t.add6, o);
        if (r.delta > 0) return f(t.up, o);
        return r.want > 0 ? f(t.down, o) : f(t.back, o);
    }

    const core = { XP, BANDS, SRC, PRE, LABEL, MAX, TX, dayKey, prevDay, eventId, want, bandOf, have, plan, engine, message };
    if (typeof module === 'object' && module.exports) module.exports = core;

    const D = root.document;
    if (!D || typeof D.addEventListener !== 'function') return;

    const E = engine({ bridge: () => root.LowiVitalsBridge || null });
    const lang = () => ((D.documentElement && D.documentElement.lang) || 'en').slice(0, 2);
    function name() { try { const S = root.LowiVitalsBridge.state(), n = S && S.herb && String(S.herb.name || '').trim(); return n ? n.slice(0, 24) : 'Misty'; } catch (e) { return 'Misty'; } }
    const reduced = () => { try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
    function toast(msg) { try { if (root.LowiR2 && typeof root.LowiR2.toast === 'function') root.LowiR2.toast(msg); else if (typeof root.toast === 'function') root.toast(msg, 2600); } catch (e) { } }
    function css() {
        if (D.getElementById('sgCss')) return;
        const s = D.createElement('style'); s.id = 'sgCss';
        s.textContent = '.sg-pop{position:fixed;z-index:70;pointer-events:none;transform:translate(-50%,-50%);font:700 15px/1.1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;' +
            'color:#eafff4;text-shadow:0 1px 6px rgba(40,200,140,.75);white-space:nowrap;animation:sgRise 1.5s ease-out forwards}' +
            '.sg-pop.sg-neg{color:rgba(235,240,255,.85);text-shadow:0 1px 6px rgba(0,0,0,.45)}' +
            '@keyframes sgRise{0%{opacity:0;margin-top:6px}18%{opacity:1}70%{opacity:1}100%{opacity:0;margin-top:-34px}}' +
            '@keyframes sgFade{0%{opacity:0}20%{opacity:1}75%{opacity:1}100%{opacity:0}}' +
            '@media (prefers-reduced-motion: reduce){.sg-pop{animation:sgFade 1.5s linear forwards}}';
        (D.head || D.documentElement).appendChild(s);
    }
    /* a small '+10 XP' that rises off the Sleep bubble (fades in place with reduced motion); gone after 1.6 s */
    function pop(r) {
        if (!r || !r.changed || !r.delta) return;
        const b = D.querySelector('[data-orbit="sleep"]'); if (!b || !b.getBoundingClientRect) return;
        const q = b.getBoundingClientRect(); if (!q.width) return;
        css();
        const el = D.createElement('div');
        el.className = 'sg-pop' + (r.delta < 0 ? ' sg-neg' : '') + (reduced() ? ' sg-still' : '');
        el.setAttribute('aria-hidden', 'true');
        el.textContent = (r.delta > 0 ? '+' : '\u2212') + Math.abs(r.delta) + ' XP';
        el.style.left = Math.round(q.left + q.width / 2) + 'px'; el.style.top = Math.round(q.top + q.height * 0.3) + 'px';
        D.body.appendChild(el);
        root.setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1600);
    }
    function onSleep(e) {
        const d = e && e.detail || {};
        const r = E.reconcile(d.day, { explicit: true });
        if (!r) return;
        api.last = r;
        const msg = message(r, lang(), name()); if (msg) toast(msg);
        pop(r);
        try { D.dispatchEvent(new root.CustomEvent('lowi:sleep-xp', { detail: { day: r.day, delta: r.delta, credited: r.changed ? r.credited : r.have } })); } catch (x) { }
    }
    function start() {
        if (api.started) return; api.started = true;
        D.addEventListener('lowi:sleep', onSleep);
        let n = 0;
        (function settle() { if (root.LowiVitalsBridge && root.LowiVitalsBridge.state && root.LowiVitalsBridge.state()) { api.last = E.reconcile(null, { explicit: false }); return; } if (n++ < 40) root.setTimeout(settle, 250); })();
    }
    const api = Object.assign({}, core, { started: false, last: null, reconcile: (day, opts) => E.reconcile(day, opts), start });
    root.LowiSleepGrowth = api;
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
