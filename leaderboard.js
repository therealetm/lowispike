/* leaderboard.js: Community > Leaderboard gets a strength board (Oct 22 2026, Emmanuel: "which companion is the strongest, who's
   number one, place one, two, three"). Three views on one switch: This week (XP since Monday 00:00, phone time), Strongest (all-time
   XP and level) and Care (the Care board as it was). The rows keep the Care board's classes (.r3-lb, .r3-lbl > .r3-lbrow, .t1-.t3,
   .me, .r3-lbme), so the phone layout in index.html (g2dCss: 2nd-1st-3rd podium, places that fit, you pinned) works unchanged.
   Each row shows the companion (shared look, or a plain cell at that level), the nickname and the level; never a photo, a real name,
   weight or BMI. "Show me on the leaderboard" (profile hub, on by default) hides you from all three. Numbers and checks:
   leaderboard-core.js. Hooks for the evolution plan: LowiLeaderboard.hooks.power(row) can add a power figure to each row. */
(function () {
    'use strict';
    const C = window.LowiLeaderboardCore; if (!C) return;
    const D = document, H = D.documentElement;
    const SHOW_K = 'lowispike.lbshow', MODE_K = 'lowi.lbmode', SEEN_K = 'lowi.lbseen';
    const lang = () => { const l = (H.lang || 'en').slice(0, 2); return C.TX[l] ? l : 'en'; };
    const T = () => C.TX[lang()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
    const shown = () => ls.get(SHOW_K) !== '0';
    const mode = () => { const m = ls.get(MODE_K); return m === 'strong' || m === 'care' ? m : 'week'; };
    const fmt = n => { try { return (+n || 0).toLocaleString(lang() === 'de' ? 'de-DE' : lang() === 'es' ? 'es-ES' : 'en-US'); } catch (e) { return String(n); } };
    const hash = s => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
    function S() { try { return (window.LowiR2 && LowiR2.S && LowiR2.S()) || JSON.parse(ls.get('lowispike.v2') || '{}'); } catch (e) { return {}; } }
    function mine(now) { const s = S() || {}; return { xp: Math.max(0, Math.round(+s.xp || 0)), wxp: C.weekXP(s.ledger, now), hide: !shown() }; }
    /* what your profile row carries: the care tag plus the week's XP and the hide choice */
    function wkTag(base) { const m = mine(Date.now()); return C.tag(base, { wxp: m.wxp, hide: m.hide, now: Date.now() }); }
    function hidden(p) { if (!p) return false; if (p.me) return !shown(); return C.parse(p.wk).hide; }

    /* the last XP this phone saw for each member, for the grew-too-fast check */
    let seen = null;
    function seenMap() { if (seen) return seen; try { seen = JSON.parse(ls.get(SEEN_K) || '{}') || {}; } catch (e) { seen = {}; } return seen; }
    function remember(rows, now) {
        const m = seenMap(); let ch = false;
        for (const r of rows) { const id = r.p && r.p.uid; if (!id || r.p.me || r.demo) continue; const o = m[id]; if (!o || now - o.t > 864e5) { m[id] = { xp: r.xp, t: now }; ch = true; } }
        const ks = Object.keys(m); if (ks.length > 3000) { ks.sort((a, b) => m[a].t - m[b].t).slice(0, ks.length - 3000).forEach(k => delete m[k]); ch = true; }
        if (ch) ls.set(SEEN_K, JSON.stringify(m));
    }

    function people() {
        const R3 = window.LowiR3, CB = window.LowiCareBoard; let all = [];
        try { const m = R3.me(), live = !!(window.LOWI_CLOUD && LOWI_CLOUD.live()), real = live ? LOWI_CLOUD.people() : [], bots = (window.LOWI_BOTS || []).map(p => Object.assign({}, p, { bot: true }));
            all = real.concat(bots).filter(p => !(p.uid && p.uid === m.uid) && !(!p.uid && p.n === m.n)).concat([m]); } catch (e) { }
        try { if (CB && CB.roster) all = CB.roster(all); } catch (e) { }
        return all;
    }
    function art(r, i, size) {
        const CC = window.LowiCompanionCore, p = r.p; let g = null;
        if (CC) {
            try { if (p.me && window.LowiCompanion && LowiCompanion.genome) g = LowiCompanion.genome(); } catch (e) { }
            if (!g && p.look) { try { g = CC.decode(p.look); } catch (e) { } }
            if (!g) { try { g = CC.genome({}, r.lv - 1, hash(p.uid || p.n) % 65536); } catch (e) { } }
            /* a shared look never shows a stronger form than the XP allows */
            if (g) g = Object.assign({}, g, { st: Math.max(0, Math.min(CC.clampStage(g.st), r.lv - 1)) });
        }
        let svg = ''; try { svg = g ? CC.miniSVG(g, 'lbx' + mode().charAt(0) + i) : ''; } catch (e) { }
        return '<span class="lbx-art" style="--sz:' + size + 'px" aria-hidden="true">' + (svg || '<i>' + esc(String(p.n || '?').charAt(0).toUpperCase()) + '</i>') + '</span>';
    }
    const hooks = { power: null };
    function row(r, i, md) {
        const t = T(), p = r.p, val = md === 'week' ? r.wxp : r.xp, stg = C.stageName(r.lv, lang());
        let pw = ''; try { if (typeof hooks.power === 'function') { const v = hooks.power(r); if (v) pw = ' \u00b7 ' + esc(v); } } catch (e) { }
        const who = ' data-r5="profile" data-who="' + esc(p.n) + '"' + (p.uid ? ' data-uid="' + esc(p.uid) + '"' : '') + (p.me ? ' data-me="1"' : '');
        return '<button type="button" class="r3-lbrow lbx-row' + (p.me ? ' me' : '') + (i < 3 ? ' t' + (i + 1) : '') + '"' + who + ' aria-label="' + esc('#' + (i + 1) + ' ' + p.n + ', ' + stg + ', ' + t.lv + ' ' + r.lv + ', ' + fmt(val) + ' XP') + '">' +
            '<span class="r3-rk num">' + (i + 1) + '</span>' + art(r, i, i < 3 ? 50 : 38) +
            '<div class="r3-lbm"><b>' + esc(p.n) + (p.me ? ' <em>' + esc(t.you.toLowerCase()) + '</em>' : '') + (r.demo ? '<span class="cm-tag r3z-bot">demo</span>' : '') + '</b>' +
            '<small>' + esc(stg) + ' \u00b7 ' + t.lv + ' ' + r.lv + pw + '</small></div>' +
            '<span class="r3-lbx num">' + fmt(val) + '<small>XP</small></span></button>';
    }
    function seg(md) {
        const t = T();
        return '<div class="lbx-mode" role="tablist" data-noi18n>' + [['week', t.week], ['strong', t.strong], ['care', t.care]].map(o =>
            '<button type="button" role="tab" data-lbm="' + o[0] + '" aria-selected="' + (md === o[0]) + '" class="' + (md === o[0] ? 'on' : '') + '">' + esc(o[1]) + '</button>').join('') + '</div>';
    }
    function boardHTML(orig) {
        const md = mode(), t = T();
        if (md === 'care') { const h = orig ? String(orig() || '') : ''; return h.replace(/^(<div class="r3-lb[^"]*">)/, '$1' + seg(md)); }
        const now = Date.now(), live = !!(window.LOWI_CLOUD && LOWI_CLOUD.live()), m = mine(now);
        const seenM = seenMap(), res = C.rank(people(), md, now, m, { demo: !live, seen: p => p.uid ? seenM[p.uid] || null : null });
        remember(res.rows, now);
        const L = res.rows, mi = res.me, top = L.slice(0, 50);
        const youVal = md === 'week' ? m.wxp : m.xp;
        const you = m.hide ? '<p class="lbx-you lbx-off" role="status">' + esc(t.hidden) + '</p>'
            : '<p class="lbx-you" role="status"><b>' + esc(t.you) + ': ' + (mi >= 0 ? '#' + (mi + 1) : esc(t.notRanked)) + '</b><span class="num">' + fmt(youVal) + ' XP \u00b7 ' + t.lv + ' ' + C.levelFor(m.xp) + '</span></p>';
        return '<div class="r3-lb lbx lbx-' + md + '" data-noi18n>' + seg(md) +
            '<h2>' + esc(md === 'week' ? t.tWeek : t.tStrong) + '</h2><p class="r2-p">' + esc(md === 'week' ? t.dWeek : t.dStrong) + '</p>' +
            (live ? '' : '<p class="lbx-demo">' + esc(t.demo) + '</p>') + you +
            '<div class="r3-lbl">' + (top.length ? top.map((r, i) => row(r, i, md)).join('') : '<div class="r3-empty">' + esc(t.empty) + '</div>') + '</div>' +
            (mi >= 50 ? '<div class="r3-lbme">' + row(L[mi], mi, md) + '</div>' : '') +
            '<p class="r3-cbnote lbx-note">' + esc(t.fair) + '</p></div>';
    }
    function repaint(from) {
        const R3 = window.LowiR3;
        if (from && !from.closest('#cmPaneBoard')) { const lb = from.closest('.r3-lb'); if (lb && R3 && R3.boardHTML) { const w = D.createElement('div'); w.innerHTML = R3.boardHTML(); if (w.firstElementChild) lb.replaceWith(w.firstElementChild); } return; }
        try { if (window.LowiR3F && LowiR3F.paintBoard) LowiR3F.paintBoard(); } catch (e) { }
    }
    function setShown(v) { ls.set(SHOW_K, v ? '1' : '0'); /* a lowispike.* key: the profile row is pushed again (index.html setItem hook) */ try { const x = window.LowiR2 && LowiR2.X && LowiR2.X(); if (x) x.pushProfile(); } catch (e) { } repaint(); }
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest && e.target.closest('[data-lbm]'); if (!b) return;
        e.preventDefault(); e.stopPropagation(); ls.set(MODE_K, b.getAttribute('data-lbm')); repaint(b);
    }, true);
    function hook() {
        const R3 = window.LowiR3; if (!R3 || !R3.boardHTML || R3.boardHTML.__lbx) return !!(R3 && R3.boardHTML && R3.boardHTML.__lbx);
        const orig = R3.boardHTML, w = function () { return boardHTML(orig); }; w.__lbx = true; R3.boardHTML = w; return true;
    }
    /* a language change repaints the board in the new language */
    try { const LL = window.LowiLang; if (LL && typeof LL.set === 'function' && !LL.set.__lbx) { const o = LL.set, w = function () { const r = o.apply(this, arguments); try { if (D.querySelector('#cmPaneBoard .lbx')) repaint(); } catch (e) { } return r; }; w.__lbx = true; LL.set = w; } } catch (e) { }
    if (!hook()) { let n = 0; const iv = setInterval(() => { if (hook() || ++n > 40) clearInterval(iv); }, 250); }
    window.LowiLeaderboard = { wkTag, hidden, shown, setShown, mode, boardHTML: () => boardHTML(null), hooks, mine };
})();
