/* LOWiSPIKE · light crash log (Oct 28 2026, item 29: on Emmanuel's real iPhone, going from Community into the chat crashes or reloads
   the page, and no browser here reproduces it). This keeps a short local record so the next report points at the cause:
   - a JS error (window error) or an unhandled promise rejection: message, file:line, where in the app it happened;
   - an unexpected reload: iOS kills a page that runs out of memory without any event, so the page keeps a small "alive" mark
     (where you are, how many canvas pixels exist) that a normal leave clears (pagehide / going to the background). If the next
     start finds the mark still set, the page died while it was in front: that is logged as "Seite neu geladen" with the place.
   Only on this device (localStorage lowi.crashlog, last 20), nothing is sent anywhere. Shown in Profil › Über & Hinweise.
   Loaded right after igFresh in index.html, so the first-start check still sees empty storage. */
(function (W) {
    'use strict';
    const D = W.document;
    if (!D || W.LowiCrashLog) return;
    const KEY = 'lowi.crashlog', LIVE = 'lowi.crash.live', MAX = 20;
    const get = k => { try { return W.localStorage.getItem(k); } catch (e) { return null; } };
    const set = (k, v) => { try { W.localStorage.setItem(k, v); } catch (e) { } };
    function list() { try { const a = JSON.parse(get(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function build() { try { const m = D.querySelector('meta[name="lowi-build"]'); return m ? m.content : ''; } catch (e) { return ''; } }
    /* where in the app: the open page, plus the Community tab or the chat room when that is open */
    function area() {
        try {
            const H = D.documentElement, c = H.classList, t = D.querySelector('#main > .tab.active');
            let a = t ? t.id.replace(/^tab-/, '') : 'start';
            if (a === 'foryou' || c.contains('wb-comm')) {
                a = 'community';
                const on = D.querySelector('.rm-tab.on, .rm-tab[aria-selected="true"]');
                if (c.contains('rm-room-open')) a += '/chat'; else if (on && on.dataset && on.dataset.rm) a += '/' + on.dataset.rm;
            }
            if (c.contains('gx-in') || c.contains('gx-out')) a += ' (warp)';
            return a;
        } catch (e) { return '?'; }
    }
    function canvasMP() { try { let n = 0; D.querySelectorAll('canvas').forEach(x => { n += (x.width || 0) * (x.height || 0); }); return Math.round(n / 1e5) / 10; } catch (e) { return -1; } }
    function add(k, m, s) {
        const a = list(), now = Date.now(), last = a[a.length - 1];
        m = String(m == null ? '' : m).slice(0, 240); s = String(s || '').slice(0, 120);
        if (last && last.k === k && last.m === m && last.s === s && now - last.t < 10000) { last.n = (last.n || 1) + 1; last.t = now; }
        else a.push({ t: now, k, m, s, a: area(), b: build() });
        set(KEY, JSON.stringify(a.slice(-MAX)));
    }
    /* the page died in front last time? (mark set and never cleared) */
    try {
        const prev = JSON.parse(get(LIVE) || 'null');
        if (prev && prev.on) {
            const a = list();
            a.push({ t: prev.t || Date.now(), k: 'reload', m: 'canvas ' + (prev.mp == null ? '?' : prev.mp) + ' MP', s: '', a: prev.a || '?', b: prev.b || '' });
            set(KEY, JSON.stringify(a.slice(-MAX)));
        }
    } catch (e) { }
    function mark(on) { set(LIVE, JSON.stringify({ on: !!on, t: Date.now(), a: area(), mp: canvasMP(), b: build() })); }
    mark(true);
    let tm = 0;
    const soon = () => { if (tm) clearTimeout(tm); tm = setTimeout(() => { tm = 0; if (!D.hidden) mark(true); }, 700); };
    try {
        W.addEventListener('error', e => { if (!e || (!e.message && !e.error)) return; add('error', e.message || (e.error && e.error.message) || 'error', (String(e.filename || '').split('/').pop().split('?')[0]) + ':' + (e.lineno || 0)); }, true);
        W.addEventListener('unhandledrejection', e => { const r = e && e.reason; add('promise', (r && (r.message || r.name)) || String(r), ''); });
        W.addEventListener('pagehide', () => mark(false));
        D.addEventListener('visibilitychange', () => { if (D.hidden) mark(false); else mark(true); });
        /* the place is refreshed a moment after each tap, so a crash while opening the chat names the chat */
        W.addEventListener('pointerup', soon, { passive: true, capture: true });
        W.addEventListener('keyup', soon, { passive: true, capture: true });
    } catch (e) { }
    function clear() { set(KEY, '[]'); }
    W.LowiCrashLog = { list, clear, area, note: (m, s) => add('note', m, s) };
})(window);
