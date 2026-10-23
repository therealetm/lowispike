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
        you: ['you', 'du', 'tú'], demo: ['demo', 'Demo', 'demo'],
        hidden: ['Hidden companion', 'Versteckter Begleiter', 'Compañero oculto'],
        hiddenMe: ['Only you see your companion here', 'Nur du siehst hier deinen Begleiter', 'Solo tú ves aquí a tu compañero'],
        lv: ['Lv {n}', 'Lv {n}', 'Nv {n}'],
        sun: ['sunbeams', 'Sonnenstrahlen', 'rayos de sol'], xp: ['XP', 'XP', 'XP'],
        place: ['Place {n}', 'Platz {n}', 'Puesto {n}'],
        empty: ['No one on the board yet. Care for your companion and be the first.', 'Noch niemand auf der Rangliste. Kümmere dich um deinen Begleiter und sei der Erste.', 'Aún no hay nadie. Cuida a tu compañero y sé el primero.'],
        howW: ['Score: sunbeams your companion got from you, up to 12 a day. Companions whose owners hide them show as a hidden orb.', 'Punkte: Sonnenstrahlen, die dein Begleiter von dir bekommt, bis zu 12 am Tag. Versteckte Begleiter erscheinen als verdeckte Kugel.', 'Puntos: rayos de sol que tu compañero recibe de ti, hasta 12 al día. Los compañeros ocultos aparecen como una esfera tapada.'],
        howA: ['Score: your companion\'s strength, all the XP it ever earned. Companions whose owners hide them show as a hidden orb.', 'Punkte: die Stärke deines Begleiters, alle XP, die er je gesammelt hat. Versteckte Begleiter erscheinen als verdeckte Kugel.', 'Puntos: la fuerza de tu compañero, toda la XP que ha ganado. Los compañeros ocultos aparecen como una esfera tapada.'],
        open: ['Open {name}', '{name} öffnen', 'Abrir {name}']
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
            return { g, name: name || 'Misty', me: true };
        }
        if (p.bot || p.demo) {
            const st = Math.max(0, Math.min(C.MAX_ST || 9, Math.floor((lv - 1) * (C.MAX_ST || 9) / 24)));
            const g = C.genome({ palette: { a: '#5AA9FF', b: '#8FE7FF' }, personality: p.t || '' }, st, 'bot:' + (p.n || ''));
            return { g, name: C.formName(g.st, g.el, L) };
        }
        const code = K.lookFor(p, allLooks()), g = code ? C.decode(code) : null;
        if (!g) return null;
        return { g, name: C.formName(g.st, g.el, L) };
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
    function ownerLine(p, lv) {
        return '<small class="rk-own">' + esc(p.me ? tr('you') : (p.n || '')) + ((p.bot || p.demo) ? ' <em class="rk-demo">' + esc(tr('demo')) + '</em>' : '') + '<span class="rk-sep"> \u00b7 </span>' + esc(tr('lv', { n: lv })) + '</small>';
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
            '<b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' + ownerLine(x.p, x.lv) +
            '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span>' +
            '<span class="rk-step" aria-hidden="true"></span></button>';
    }
    function rowHTML(x, i) {
        const c = companion(x.p, x.lv);
        return '<li><button type="button" class="rk-row' + (x.p.me ? ' me' : '') + '"' + attrs(x, c) + '><span class="rk-n num">' + x.rank + '</span>' + art(c, 'rkl' + i, false) +
            '<span class="rk-who"><b class="rk-cn">' + esc(c ? c.name : tr('hidden')) + '</b>' + ownerLine(x.p, x.lv) + '</span>' +
            '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span></button></li>';
    }
    function meHTML(list) {
        const x = K.mine(list), self = people().find(p => p && p.me) || { me: true, n: '' }, lv = x ? x.lv : K.level(self), c = companion(self, lv);
        let shared = true; try { const pr = LC() && LC().prefs && LC().prefs(); if (pr && pr.share === false) shared = false; } catch (e) { }
        const sub = shared ? ownerLine(self, lv) : '<small class="rk-own">' + esc(tr('hiddenMe')) + '</small>';
        return '<button type="button" class="rk-me" data-rk="open" data-me="1" data-who="' + esc(self.n || '') + '">' +
            '<span class="rk-me-l"><small>' + esc(tr('yourPlace')) + '</small><b class="num">' + (x ? '#' + x.rank : '\u2013') + '</b></span>' + art(c, 'rkme', false) +
            '<span class="rk-who"><b class="rk-cn">' + esc(c ? c.name : 'Misty') + '</b>' + (x ? sub : '<small class="rk-own">' + esc(tr('notYet')) + ' \u00b7 ' + esc(per === 'all' ? tr('notYetA') : tr('notYetW')) + '</small>') + '</span>' +
            (x ? '<span class="rk-pts num">' + score(x) + '<small>' + esc(unit()) + '</small></span>' : '') + '</button>';
    }
    function html() {
        const list = K.rows(people(), per, Date.now(), myCare()), top = list.slice(0, 3), rest = list.slice(3, 50);
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
            if (t.dataset.rk === 'open') { try { const r = R3(); if (r && r.open) r.open({ uid: t.dataset.uid || '', name: t.dataset.who || '', me: t.dataset.me === '1' }); } catch (er) { console.error(er); } }
        });
        b.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const s = e.target.closest('.rk-segb'); if (!s) return;
            const i = K.PERIODS.indexOf(per), n = K.PERIODS[(i + (e.key === 'ArrowRight' ? 1 : K.PERIODS.length - 1)) % K.PERIODS.length];
            e.preventDefault(); const nb = b.querySelector('.rk-segb[data-k="' + n + '"]'); if (nb) nb.click();
        });
    }
    function render(b) {
        if (!b) return; box = b; wire(b);
        const r = html(), key = per + '|' + lang() + '|' + r.h.length + '|' + r.h;
        if (b.__rkH !== key) { b.__rkH = key; b.innerHTML = '<div class="rk" data-noi18n>' + r.h + '</div>'; }
        fetchLooks(r.uids);
    }
    W.LowiRanking = { render, period: () => per, setPeriod: k => { per = K.period(k); if (box && box.isConnected) render(box); }, _html: () => html().h };
})();
