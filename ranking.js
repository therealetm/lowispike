/* ranking.js (23 Oct 2026): the Community Ranking tab, a companion leaderboard. Layout from the reference E-man sent (Spazier Club
   "Rangliste"): title + one line, a period switch, a highlighted Your place card, a podium of the top 3 (2nd left, 1st centre and
   raised, 3rd right) with medals 1/2/3, then a numbered list. In LOWiSPIKE's own look (brand blues and cyan on glass) and with
   companions instead of people: each entry shows the owner's companion in its evolution form and the owner's name small under it.
   Rules (periods, scores, privacy) live in ranking-core.js. community-rooms-ui.js shows this page when the Ranking tab is open
   (LowiRanking.render(box)); the Community top bar above it is the same shared bar as on every other tab.
   Tapping an entry opens that person's profile (LowiR3.open). */
(function () {
    'use strict';
    const W = window, D = document, K = W.LowiRankingCore;
    if (!K) return;
    const T = {
        title: ['Ranking', 'Rangliste', 'Clasificación'],
        subW: ['Whose companion got the most care this week?', 'Wessen Begleiter wurde diese Woche am besten versorgt?', '¿Qué compañero recibió más cuidados esta semana?'],
        subM: ['Whose companion got the most care this month?', 'Wessen Begleiter wurde diesen Monat am besten versorgt?', '¿Qué compañero recibió más cuidados este mes?'],
        subA: ['Whose companion is the strongest?', 'Wessen Begleiter ist am stärksten?', '¿Qué compañero es el más fuerte?'],
        w: ['Week', 'Woche', 'Semana'], m: ['Month', 'Monat', 'Mes'], all: ['All time', 'Gesamt', 'Total'],
        periods: ['Period', 'Zeitraum', 'Periodo'],
        yourPlace: ['Your place', 'Dein Platz', 'Tu puesto'],
        notYet: ['Not ranked yet', 'Noch nicht dabei', 'Aún sin puesto'],
        notYetW: ['Meals, water, Moves and scans give your companion sunbeams.', 'Mahlzeiten, Wasser, Moves und Scans geben deinem Begleiter Sonnenstrahlen.', 'Comidas, agua, Moves y escaneos dan rayos de sol a tu compañero.'],
        notYetA: ['Every log makes your companion stronger.', 'Jeder Eintrag macht deinen Begleiter stärker.', 'Cada registro hace más fuerte a tu compañero.'],
        you: ['you', 'du', 'tú'],
        hidden: ['Hidden companion', 'Versteckter Begleiter', 'Compañero oculto'],
        hiddenMe: ['Only you see your companion here', 'Nur du siehst hier deinen Begleiter', 'Solo tú ves aquí a tu compañero'],
        lv: ['Lv {n}', 'Lv {n}', 'Nv {n}'],
        sun: ['sunbeams', 'Sonnenstrahlen', 'rayos de sol'], xp: ['XP', 'XP', 'XP'],
        place: ['Place {n}', 'Platz {n}', 'Puesto {n}'],
        empty: ['No one on the board yet. Care for your companion and be the first.', 'Noch niemand auf der Rangliste. Kümmere dich um deinen Begleiter und sei der Erste.', 'Aún no hay nadie. Cuida a tu compañero y sé el primero.'],
        howW: ['Score: sunbeams your companion got from you, up to 12 a day. Companions whose owners hide them show as a hidden orb.', 'Punkte: Sonnenstrahlen, die dein Begleiter von dir bekommt, bis zu 12 am Tag. Versteckte Begleiter erscheinen als verdeckte Kugel.', 'Puntos: rayos de sol que tu compañero recibe de ti, hasta 12 al día. Los compañeros ocultos aparecen como una esfera tapada.'],
        howA: ['Score: your companion\'s strength, all the XP it ever earned. Companions whose owners hide them show as a hidden orb.', 'Punkte: die Stärke deines Begleiters, alle XP, die er je gesammelt hat. Versteckte Begleiter erscheinen als verdeckte Kugel.', 'Puntos: la fuerza de tu compañero, toda la XP que ha ganado. Los compañeros ocultos aparecen como una esfera tapada.'],
        open: ['Open {name}', '{name} öffnen', 'Abrir {name}'],
        levels: ['Levels', 'Level', 'Niveles'],
        ladT: ['Levels', 'Level', 'Niveles'],
        ladLv: ['Level {n}', 'Level {n}', 'Nivel {n}'],
        ladNext: ['{x} XP to level {n}', 'Noch {x} XP bis Level {n}', '{x} XP para el nivel {n}'],
        ladMax: ['Top level reached', 'Höchstes Level erreicht', 'Nivel máximo alcanzado'],
        ladPct: ['{p}% of players', '{p}% der Spieler', '{p}% de los jugadores'],
        ladFew: ['under 1% of players', 'unter 1% der Spieler', 'menos del 1% de los jugadores'],
        ladEvo: ['Evolution', 'Entwicklung', 'Evolución'],
        ladYou: ['You are here', 'Du bist hier', 'Estás aquí'],
        ladLock: ['Locked', 'Gesperrt', 'Bloqueado'],
        ladFoot: ['Out of {n} players, real accounts only. Each person counts once.', 'Von {n} Spielern, nur echte Konten. Jede Person zählt einmal.', 'De {n} jugadores, solo cuentas reales. Cada persona cuenta una vez.'],
        close: ['Close', 'Schließen', 'Cerrar']
    };
    function lang() { try { return Math.max(0, ['en', 'de', 'es'].indexOf((W.LowiLang && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || 'en')); } catch (e) { return 0; } }
    function tr(k, v) { let s = (T[k] || [k])[lang()] || T[k][0]; for (const x in v || {}) s = s.split('{' + x + '}').join(String(v[x])); return s; }
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const KEY = 'lowispike.ranking.period';
    let per = (function () { try { return K.period(localStorage.getItem(KEY) || 'w'); } catch (e) { return 'w'; } })();
    let box = null, looks = {}, fetchedAt = 0, fetching = false;
    const CC = () => W.LowiCompanionCore, LC = () => W.LowiCompanion, R3 = () => W.LowiR3;
    function people() { try { const r = R3(); return (r && r.everyone) ? r.everyone() : []; } catch (e) { return []; } }
    function myCare() { try { const r = R3(), m = r && r.me && r.me(); return m && m.care; } catch (e) { return null; } }
    function allLooks() { let f = {}; try { f = (LC() && LC().friendLooks && LC().friendLooks()) || {}; } catch (e) { } return Object.assign({}, f, looks); }
    async function fetchLooks(uids) {
        uids = uids.filter(u => u && !/^bot:/.test(u));
        if (fetching || !uids.length || Date.now() - fetchedAt < 120000) return;
        const X = W.LOWI_CLOUD_X; if (!X || !X.client) return;
        try { const st = X.state(); if (!st || !st.live) return; } catch (e) { return; }
        fetching = true;
        try {
            const sb = await X.client();
            const r = await sb.from('profiles').select('id,look').in('id', uids.slice(0, 60));
            if (!r.error && Array.isArray(r.data)) {
                const next = {}, C = CC();
                r.data.forEach(row => { if (row && row.look && (!C || C.decode(row.look))) next[row.id] = row.look; });
                looks = next; fetchedAt = Date.now(); if (box && box.isConnected) render(box);
            }
        } catch (e) { } finally { fetching = false; }
    }
    /* the companion of one entry: genome + title, or null when it is hidden */
    function companion(p, lv) {
        const C = CC(); if (!C) return null;
        const L = lang();
        if (p.me) {
            let g = null, name = '';
            try { g = LC() && LC().genome ? LC().genome() : null; } catch (e) { }
            try { const H = W.LowiHerbTamagotchi, c = H && H.current && H.current(); if (H && H.name && c) name = H.name(c.p, c.m); } catch (e) { }
            return { g, name: name || 'Misty', form: g ? C.formName(g.st, g.el, L) : '', named: true, me: true };
        }
        const code = K.lookFor(p, allLooks()), g = code ? C.decode(code) : null;
        if (!g) return null;
        /* 23 Oct 2026 (Eman: "show their name, the names they chose for their companions. And beneath that, the ranks."): the
           chosen name when the owner's app has shared it, else the evolution form as before */
        const form = C.formName(g.st, g.el, L);
        return g.nm ? { g, name: g.nm, form, named: true } : { g, name: form, form: '', named: false };
    }
    function art(c, key, big) {
        if (!c || !c.g) return '<span class="rk-orb rk-hid" aria-hidden="true"><i></i></span>';
        let s = '';
        try { s = big && LC() && LC().friendSVG ? LC().friendSVG(c.g, key) : CC().miniSVG(c.g, key); } catch (e) { s = ''; }
        if (!s) { try { s = CC().miniSVG(c.g, key); } catch (e) { } }
        return '<span class="rk-orb" aria-hidden="true">' + s + '</span>';
    }
    function score(x) { return K.fmt(x.pts, lang()); }
    function unit() { return per === 'all' ? tr('xp') : '\u2600'; }
    function unitLong() { return per === 'all' ? tr('xp') : tr('sun'); }
    /* under the companion's name: its rank (evolution form and level), then the owner small */
    function ownerLine(p, lv, c) {
        return '<small class="rk-own">' + (c && c.named && c.form ? esc(c.form) + '<span class="rk-sep"> \u00b7 </span>' : '') + esc(tr('lv', { n: lv })) + '</small>' +
            '<small class="rk-ownr">' + esc(p.me ? tr('you') : (p.n || '')) + '</small>';
    }
    function attrs(x, c) {
        const p = x.p, nm = c ? c.name : tr('hidden');
        return ' data-rk="open" data-who="' + esc(p.n || '') + '"' + (p.uid ? ' data-uid="' + esc(p.uid) + '"' : '') + (p.me ? ' data-me="1"' : '') +
            ' aria-label="' + esc(tr('place', { n: x.rank }) + ', ' + nm + ', ' + (p.me ? tr('you') : p.n) + ', ' + score(x) + ' ' + unitLong()) + '"';
    }
    function podHTML(x, slot) {
        const c = companion(x.p, x.lv);
        return '<button type="button" class="rk-pod-i rk-p' + x.rank + (x.p.me ? ' me' : '') + '"' + attrs(x, c) + '>' +
            '<span class="rk-pod-art">' + art(c, 'rkp' + slot, true) + '<b class="rk-medal m' + x.rank + '" aria-hidden="true">' + x.rank + '</b></span>' +
            '<b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' + ownerLine(x.p, x.lv, c) +
            '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span>' +
            '<span class="rk-step" aria-hidden="true"></span></button>';
    }
    function rowHTML(x, i) {
        const c = companion(x.p, x.lv);
        return '<li><button type="button" class="rk-row' + (x.p.me ? ' me' : '') + '"' + attrs(x, c) + '><span class="rk-n num">' + x.rank + '</span>' + art(c, 'rkl' + i, false) +
            '<span class="rk-who"><b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' + ownerLine(x.p, x.lv, c) + '</span>' +
            '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span></button></li>';
    }
    function meHTML(list) {
        const x = K.mine(list), self = people().find(p => p && p.me) || { me: true, n: '' }, lv = x ? x.lv : K.level(self), c = companion(self, lv);
        let shared = true; try { const pr = LC() && LC().prefs && LC().prefs(); if (pr && pr.share === false) shared = false; } catch (e) { }
        const sub = shared ? ownerLine(self, lv, c) : '<small class="rk-own">' + esc(tr('hiddenMe')) + '</small>';
        return '<button type="button" class="rk-me" data-rk="ladder" data-me="1" aria-haspopup="dialog" aria-label="' + esc(tr('yourPlace') + ', ' + (x ? '#' + x.rank : '') + ', ' + (c ? c.name : 'Misty') + ', ' + tr('levels')) + '" data-who="' + esc(self.n || '') + '">' +
            '<span class="rk-me-l"><small>' + esc(tr('yourPlace')) + '</small><b class="num">' + (x ? '#' + x.rank : '\u2013') + '</b></span>' + art(c, 'rkme', false) +
            '<span class="rk-who"><b class="rk-cn">' + esc(c ? c.name : 'Misty') + '</b>' + (x ? sub : '<small class="rk-own">' + esc(tr('notYet')) + ' \u00b7 ' + esc(per === 'all' ? tr('notYetA') : tr('notYetW')) + '</small>') + '</span>' +
            (x ? '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span>' : '') +
            '<span class="rk-me-go" aria-hidden="true"><i>' + esc(tr('levels')) + '</i><b>\u203a</b></span></button>';
    }
    function html() {
        const list = K.rows(people(), per, Date.now(), myCare()), top = list.slice(0, 3), rest = K.board(list).slice(3);
        const sub = per === 'all' ? tr('subA') : per === 'm' ? tr('subM') : tr('subW');
        let h = '<header class="rk-h"><h2 class="rk-t">' + esc(tr('title')) + '</h2><p class="rk-sub">' + esc(sub) + '</p></header>' +
            '<div class="rk-seg" role="tablist" aria-label="' + esc(tr('periods')) + '" style="--rk-i:' + K.PERIODS.indexOf(per) + '">' +
            K.PERIODS.map(k => '<button type="button" role="tab" class="rk-segb" data-rk="per" data-k="' + k + '" aria-selected="' + (k === per) + '" tabindex="' + (k === per ? 0 : -1) + '">' + esc(tr(k)) + '</button>').join('') + '</div>' +
            meHTML(list);
        if (!list.length) h += '<p class="rk-empty">' + esc(tr('empty')) + '</p>';
        else {
            h += '<div class="rk-pod n' + top.length + '">' + K.podium(list).map((x, i) => podHTML(x, i)).join('') + '</div>';
            if (rest.length) h += '<ol class="rk-list">' + rest.map(rowHTML).join('') + '</ol>';
        }
        h += '<p class="rk-how">' + esc(per === 'all' ? tr('howA') : tr('howW')) + '</p>';
        return { h, uids: list.map(x => x.p && x.p.uid).filter(Boolean) };
    }
    function wire(b) {
        if (b.__rk) return; b.__rk = 1;
        b.addEventListener('click', e => {
            const t = e.target.closest('[data-rk]'); if (!t || !b.contains(t)) return;
            if (t.dataset.rk === 'per') { per = K.period(t.dataset.k); try { localStorage.setItem(KEY, per); } catch (er) { } render(b); const n = b.querySelector('.rk-segb[aria-selected="true"]'); if (n) n.focus({ preventScroll: true }); return; }
            if (t.dataset.rk === 'ladder') { openLadder(t); return; }
            if (t.dataset.rk === 'open') { try { const r = R3(); if (r && r.open) r.open({ uid: t.dataset.uid || '', name: t.dataset.who || '', me: t.dataset.me === '1' }); } catch (er) { console.error(er); } }
        });
        b.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const s = e.target.closest('.rk-segb'); if (!s) return;
            const i = K.PERIODS.indexOf(per), n = K.PERIODS[(i + (e.key === 'ArrowRight' ? 1 : K.PERIODS.length - 1)) % K.PERIODS.length];
            e.preventDefault(); const nb = b.querySelector('.rk-segb[data-k="' + n + '"]'); if (nb) nb.click();
        });
    }
    /* ---------- the level ladder (23 Oct 2026, Eman's Skool idea): your level, the XP to the next one, then every level with the
       share of players who reached it. Reached levels glow, locked ones are dimmed with a lock. ---------- */
    let ladEl = null, ladBack = null;
    function stepName(st) { const n = st.n; return Array.isArray(n) ? (n[lang()] || n[0]) : ''; }
    function ladderHTML() {
        const d = K.ladder(people()), self = people().find(p => p && p.me) || { me: true, n: '' }, c = companion(self, d.my);
        const next = d.next == null ? '<p class="rk-lad-next">' + esc(tr('ladMax')) + '</p>' :
            '<p class="rk-lad-next">' + esc(tr('ladNext', { x: K.fmt(d.toNext, lang()), n: d.my + 1 })) + '</p>';
        const lo = d.my > 1 ? d.steps[d.my - 1].xp : 0, prog = d.next == null ? 1 : Math.max(0, Math.min(1, (d.xp - lo) / Math.max(1, d.next - lo)));
        let h = '<div class="rk-lad-h">' + art(c, 'rklad', true) +
            '<div class="rk-lad-hw"><b class="rk-lad-cn">' + esc(c ? c.name : 'Misty') + '</b><span class="rk-lad-lv">' + esc(tr('ladLv', { n: d.my })) + (c && c.form ? ' \u00b7 ' + esc(c.form) : '') + '</span>' + next +
            '<span class="rk-lad-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(prog * 100) + '"><i style="width:' + (prog * 100).toFixed(1) + '%"></i></span></div>' +
            '<button type="button" class="rk-lad-x" data-lad="close" aria-label="' + esc(tr('close')) + '">\u00d7</button></div>';
        h += '<ol class="rk-lad-l">' + d.steps.map(st => {
            const pct = st.some && st.pct < 1 ? tr('ladFew') : tr('ladPct', { p: st.pct });
            const cls = 'rk-lad-i' + (st.reached ? ' on' : ' off') + (st.now ? ' now' : '') + (st.evo ? ' evo' : '');
            return '<li class="' + cls + '"' + (st.now ? ' aria-current="step"' : '') + '><span class="rk-lad-b" aria-hidden="true"><b class="num">' + st.lv + '</b>' + (st.reached ? '' : '<i class="rk-lock"></i>') + '</span>' +
                '<span class="rk-lad-w"><b>' + esc(tr('ladLv', { n: st.lv })) + (stepName(st) ? '<span class="rk-sep"> \u00b7 </span>' + esc(stepName(st)) : '') + (st.evo ? ' <em class="rk-lad-evo">' + esc(tr('ladEvo')) + '</em>' : '') + '</b>' +
                '<small>' + esc(pct) + (st.now ? '<span class="rk-sep"> \u00b7 </span>' + esc(tr('ladYou')) : st.reached ? '' : '<span class="rk-sep"> \u00b7 </span>' + esc(tr('ladLock'))) + '</small></span></li>';
        }).join('') + '</ol>';
        h += '<p class="rk-lad-foot">' + esc(tr('ladFoot', { n: d.total })) + '</p>';
        return h;
    }
    function closeLadder() {
        if (!ladEl) return;
        const el = ladEl, back = ladBack; ladEl = null; ladBack = null;
        el.classList.remove('in'); D.removeEventListener('keydown', ladKey, true);
        setTimeout(() => { try { el.remove(); } catch (e) { } }, 220);
        try { if (back && back.focus) back.focus({ preventScroll: true }); } catch (e) { }
    }
    function ladKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeLadder(); } }
    function openLadder(from) {
        if (ladEl) closeLadder();
        const el = D.createElement('div');
        el.className = 'rk-lad-wrap'; el.setAttribute('data-noi18n', '');
        el.innerHTML = '<div class="rk-lad" role="dialog" aria-modal="true" aria-label="' + esc(tr('ladT')) + '">' + ladderHTML() + '</div>';
        el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-lad="close"]')) closeLadder(); });
        D.body.appendChild(el); ladEl = el; ladBack = from || null;
        D.addEventListener('keydown', ladKey, true);
        requestAnimationFrame(() => { el.classList.add('in'); const now = el.querySelector('.rk-lad-i.now'); try { if (now) now.scrollIntoView({ block: 'center' }); } catch (e) { } const x = el.querySelector('.rk-lad-x'); if (x) x.focus({ preventScroll: true }); });
    }
    function render(b) {
        if (!b) return; box = b; wire(b);
        const r = html(), key = per + '|' + lang() + '|' + r.h.length + '|' + r.h;
        if (b.__rkH !== key) { b.__rkH = key; b.innerHTML = '<div class="rk" data-noi18n>' + r.h + '</div>'; }
        fetchLooks(r.uids);
    }
    /* 23 Oct (E-man: "we have a care board and some XP board ... nuke them"): Ranking is the one board. Every old way in (Profile's
       board row, "See leaderboard", the Settings row, the old Move card) lands here: Community, Ranking tab. */
    function open() {
        try { const R2 = W.LowiR2; if (R2 && R2.top && R2.top() && R2.closeAll) R2.closeAll(); } catch (e) { }
        try { const sw = D.getElementById('sheetwrap'); if (sw && sw.classList.contains('open') && typeof W.closeSheet === 'function') W.closeSheet(); } catch (e) { }
        try { if (typeof W.goTab === 'function') W.goTab('foryou'); } catch (e) { console.error(e); }
        let n = 0;
        const go = () => {
            const U = W.LowiRoomsUI;
            try { if (U && U.showView && D.getElementById('cmPaneChat')) { U.showView('rank'); if (U.view && U.view() === 'rank') return; } } catch (e) { console.error(e); }
            if (++n < 25) setTimeout(go, 120);
        };
        setTimeout(go, 60);
    }
    W.LowiRanking = { render, open, period: () => per, setPeriod: k => { per = K.period(k); if (box && box.isConnected) render(box); }, _html: () => html().h, openLadder, closeLadder, _ladder: () => ladderHTML() };
})();
