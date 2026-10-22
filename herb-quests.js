/* LOWiSPIKE herb path UI (Oct 15, 2026): evolution card with a countable rule and the next action, special quests with hints
   and Claim, one weekly mission layer (pick up to 2), own goals that point at existing actions, and the food collection.
   Functional first: every number comes from the app's own stores (logs, ledger, fasting, move, dex) through LowiHerbQuestsCore.
   Payouts only on Claim, through award() with an eventId (hq:<stage>:<step>, wm:<week>:<id>), so nothing can pay twice.
   Goals give no XP: the action they point at already pays. EN / DE / ES. */
(function () {
    'use strict';
    const W = window, D = document, C = W.LowiHerbQuestsCore;
    if (!C || W.LowiHerbQuests) return;
    if (!D.getElementById('hqCss')) { const l = D.createElement('link'), me = D.currentScript, q = me && me.src && me.src.indexOf('?') > 0 ? me.src.slice(me.src.indexOf('?')) : ''; l.id = 'hqCss'; l.rel = 'stylesheet'; l.href = 'herb-quests.css' + q; D.head.appendChild(l); }
    const R = W.LowiR2 || {}, V = () => W.LowiVitalsBridge;
    const lang = () => { let l = 'de'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || D.documentElement.lang || 'de'; } catch (e) {} l = String(l).slice(0, 2); return l === 'en' || l === 'es' ? l : 'de'; };
    const li = () => ({ en: 0, de: 1, es: 2 }[lang()]);
    const t = (en, de, es) => [en, de, es][li()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const js = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
    const S = () => { try { const v = V(); return v && v.state ? v.state() : null; } catch (e) { return null; } };
    const save = () => { try { V().save(); } catch (e) {} };
    const toast = m => { try { R.toast ? R.toast(m) : null; } catch (e) {} };
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const sname = st => st ? st.name[li()] || st.name[0] : '';
    function stores() {
        const s = S() || {};
        let products = [];
        try { products = Object.values((W.LowiDex && LowiDex.state && LowiDex.state().mine) || {}); } catch (e) {}
        const fy = js('lowispike.foryou.v1');
        return { s, fast: js('lowi_fast_v1'), move: js('lowispike.move.v1'), posts: Array.isArray(fy.posts) ? fy.posts : [], products };
    }
    const ICO = {
        veg: 'M12 21c0-6 1-10 6-14-6 0-10 3-11 9M12 21C10 15 7 12 3 11c1 5 4 8 9 10',
        fruit: 'M12 7c-4-2-8 1-7 6 1 5 4 8 7 7 3 1 6-2 7-7 1-5-3-8-7-6zM12 7c0-2 1-3 3-4',
        protein: 'M12 3c-4 0-6 6-6 10a6 6 0 0 0 12 0c0-4-2-10-6-10z',
        fish: 'M3 12c3-5 9-6 14-2l4-3v10l-4-3c-5 4-11 3-14-2zM8 11v.01',
        dairy: 'M4 15l9-8 7 3v6l-9 3-7-4zM4 15v3l7 4 9-3v-3M13 7l-2 9',
        grain: 'M12 21V8M12 8c-3-1-4-3-4-5 3 0 4 2 4 5zm0 0c3-1 4-3 4-5-3 0-4 2-4 5zM12 13c-3-1-4-3-4-5M12 13c3-1 4-3 4-5',
        nut: 'M12 3c4 0 7 4 7 9s-3 9-7 9-7-4-7-9 3-9 7-9zM12 3v18',
        drink: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
        sweet: 'M4 10h16l-2 10H6L4 10zM8 10V7a4 4 0 0 1 8 0v3',
        check: 'M5 12l5 5 9-10', lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z', arrow: 'M9 6l6 6-6 6', plus: 'M12 5v14M5 12h14',
        star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z', clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', x: 'M6 6l12 12M18 6L6 18', bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 0 0-4-10z'
    };
    const ico = (k, cls) => '<svg class="hq-i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (ICO[k] || ICO.star) + '"/></svg>';
    const bar = (p, cls) => '<span class="hq-bar' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><i style="width:' + Math.round(Math.max(0, Math.min(1, p)) * 100) + '%"></i></span>';
    const goLabel = a => ({ eat: t('Log', 'Eintragen', 'Registrar'), scan: t('Scan', 'Scannen', 'Escanear'), water: t('+1 glass', '+1 Glas', '+1 vaso'), fast: t('My fast', 'Mein Fasten', 'Mi ayuno'), move: t('Move', 'Bewegen', 'Moverse'), checkin: t('Check in', 'Einchecken', 'Registrarme'), post: t('Post', 'Posten', 'Publicar') }[a] || t('Go', 'Los', 'Ir'));
    let view = 'path', draft = null, showAll = false, chooser = false, openHint = '';

    /* ---------- evolution card ---------- */
    function nextStep() {
        const q = C.specialQuests(stores(), lang());
        return q.steps.find(x => x.done && !x.claimed) || q.steps.find(x => !x.done) || null;
    }
    function evoHTML(compact) {
        const s = S() || {}, ev = C.evolution(s.xp);
        if (!ev.next) return '<section class="hq-evo hq-max"><span class="hq-over">' + esc(t('Final form', 'Endform', 'Forma final')) + '</span><b class="hq-evo-name">' + esc(sname(ev.current)) + '</b><p class="hq-evo-rule">' + esc(t('Your herb is fully grown. Every action still keeps it lively.', 'Dein Kraut ist ausgewachsen. Jede Aktion hält es weiter lebendig.', 'Tu ser de luz ya está en su forma final. Cada acción lo mantiene lleno de vida.')) + '</p></section>';
        const step = nextStep();
        let h = '<section class="hq-evo' + (compact ? ' hq-compact' : '') + '"><div class="hq-evo-top"><span class="hq-over">' + esc(t('Next form', 'Nächste Form', 'Siguiente forma')) + '</span><b class="hq-evo-name">' + esc(sname(ev.next)) + '</b></div>' +
            '<p class="hq-evo-rule">' + esc(t('Rule: reach ', 'Regel: ', 'Regla: llegar a ') + ev.next.xp + t(' XP', ' XP erreichen', ' XP') + ' · ' + t('you have ', 'du hast ', 'tienes ') + ev.xp) + '</p>' + bar(ev.progress) +
            '<p class="hq-evo-more"><b class="num">' + esc(t(ev.left + ' XP more', 'noch ' + ev.left + ' XP', 'faltan ' + ev.left + ' XP')) + '</b><span>' + esc(t('≈ ' + ev.meals + ' meals or ' + ev.specials + ' quest steps', '≈ ' + ev.meals + ' Mahlzeiten oder ' + ev.specials + ' Quest-Schritte', '≈ ' + ev.meals + ' comidas o ' + ev.specials + ' pasos de misión')) + '</span></p>';
        if (step) h += '<div class="hq-next"><span>' + esc(step.done ? t('Ready to claim', 'Bereit zum Abholen', 'Listo para reclamar') : t('Next step', 'Nächster Schritt', 'Siguiente paso')) + '</span><b>' + esc(step.title) + ' <em class="num">' + step.n + '/' + step.goal + '</em></b>' +
            (step.done ? '<button type="button" class="hq-btn hq-claim" data-hq="claimStep" data-id="' + step.id + '">' + esc(t('Claim', 'Abholen', 'Reclamar')) + ' +' + step.xp + '</button>' : '<button type="button" class="hq-btn" data-hq-go="' + step.go + '">' + esc(goLabel(step.go)) + ico('arrow') + '</button>') + '</div>';
        if (compact) h += '<button type="button" class="hq-link" data-sp="path">' + esc(t('Quests', 'Quests', 'Misiones')) + ico('arrow') + '</button>';
        return h + '</section>';
    }

    /* ---------- special quests ---------- */
    function specialsHTML() {
        const q = C.specialQuests(stores(), lang());
        if (!q.next) return '';
        return '<section class="hq-sec"><h3>' + esc(t('Special quests to ', 'Spezial-Quests bis ', 'Misiones especiales hasta ') + sname(q.next)) + '<span class="num">' + q.done + '/' + q.steps.length + '</span></h3><ol class="hq-steps">' + q.steps.map(x => {
            const st = x.claimed ? 'claimed' : x.done ? 'ready' : 'open';
            return '<li class="hq-step ' + st + '"><span class="hq-ck">' + ico(x.claimed ? 'check' : x.done ? 'star' : 'clock') + '</span><span class="hq-st"><b>' + esc(x.title) + '</b>' + bar(x.n / x.goal, 'thin') +
                '<button type="button" class="hq-hint-t" data-hq="hint" data-id="' + x.id + '" aria-expanded="' + (openHint === x.id) + '">' + ico('bulb') + esc(t('Hint', 'Tipp', 'Pista')) + '</button>' + (openHint === x.id ? '<small class="hq-hint">' + esc(x.hint) + '</small>' : '') + '</span>' +
                '<span class="hq-sa"><em class="num">' + x.n + '/' + x.goal + '</em>' + (x.claimed ? '<i class="hq-done">+' + x.xp + '</i>' : x.done ? '<button type="button" class="hq-btn hq-claim" data-hq="claimStep" data-id="' + x.id + '">' + esc(t('Claim', 'Abholen', 'Reclamar')) + ' +' + x.xp + '</button>' : '<button type="button" class="hq-btn ghost" data-hq-go="' + x.go + '" aria-label="' + esc(goLabel(x.go)) + '">' + ico('arrow') + '</button>') + '</span></li>';
        }).join('') + '</ol></section>';
    }

    /* ---------- daily quest board: countdown + claim, same truth as the Home board ---------- */
    function dailyHTML() {
        const F = W.LowiF3;
        if (!F || !F.state) return '';
        let L = [];
        try { L = F.state(); } catch (e) { return ''; }
        const n = L.filter(q => q.done).length, cx = F.claimXP ? F.claimXP() : 0, r = C.resetIn();
        return '<section class="hq-sec hq-daily"><h3>' + esc(t('Daily quest', 'Tägliche Quest', 'Misión diaria')) + '<span class="num">' + n + '/' + L.length + '</span></h3><p class="hq-row"><span class="hq-cd">' + ico('clock') + esc(t('New quests in ', 'Neue Quests in ', 'Nuevas misiones en ') + r.text + ' h') + '</span>' +
            (cx ? '<button type="button" class="hq-btn hq-claim" data-hq="claimDaily">' + esc(t('Claim', 'Abholen', 'Reclamar')) + ' +' + cx + '</button>' : '<small>' + esc(n === L.length ? t('All claimed. See you tomorrow.', 'Alles abgeholt. Bis morgen.', 'Todo reclamado. Hasta mañana.') : t('Rewards wait here until you claim them.', 'Belohnungen warten hier, bis du sie abholst.', 'Las recompensas esperan aquí hasta que las reclames.')) + '</small>') + '</p></section>';
    }

    /* ---------- weekly missions: pick up to 2 ---------- */
    function missionsHTML() {
        const s = S() || {}, list = C.missions(stores(), s.herbWeek, lang()), picked = list.filter(m => m.picked), r = C.weekResetIn();
        let h = '<section class="hq-sec hq-week"><h3>' + esc(t('This week', 'Diese Woche', 'Esta semana')) + '<span class="hq-cd">' + ico('clock') + esc(t('new week in ', 'neue Woche in ', 'nueva semana en ') + r.text) + '</span></h3>';
        if (chooser || !picked.length) {
            h += '<p class="hq-note">' + esc(t('Pick up to 2 missions. Every action counts, spread over the week.', 'Wähl bis zu 2 Missionen. Jede Aktion zählt, über die Woche verteilt.', 'Elige hasta 2 misiones. Cada acción cuenta, repartida en la semana.')) + '</p><div class="hq-chips">' +
                list.map(m => '<button type="button" class="hq-chip' + (m.picked ? ' on' : '') + '" data-hq="pickMission" data-id="' + m.id + '" aria-pressed="' + m.picked + '"' + (!m.picked && picked.length >= C.MAX_MISSIONS ? ' disabled' : '') + '>' + esc(m.title) + '</button>').join('') + '</div>' +
                (picked.length ? '<button type="button" class="hq-link" data-hq="chooser">' + esc(t('Done', 'Fertig', 'Listo')) + '</button>' : '');
        } else {
            h += '<ul class="hq-missions">' + picked.map(m => '<li class="hq-step ' + (m.claimed ? 'claimed' : m.done ? 'ready' : 'open') + '"><span class="hq-st"><b>' + esc(m.title) + '</b>' + bar(m.n / m.goal, 'thin') + '</span><span class="hq-sa"><em class="num">' + m.n + '/' + m.goal + '</em>' +
                (m.claimed ? '<i class="hq-done">+' + m.xp + '</i>' : m.done ? '<button type="button" class="hq-btn hq-claim" data-hq="claimMission" data-id="' + m.id + '">' + esc(t('Claim', 'Abholen', 'Reclamar')) + ' +' + m.xp + '</button>' : '<button type="button" class="hq-btn ghost" data-hq-go="' + m.go + '" aria-label="' + esc(goLabel(m.go)) + '">' + ico('arrow') + '</button>') + '</span></li>').join('') + '</ul>' +
                '<button type="button" class="hq-link" data-hq="chooser">' + esc(t('Change missions', 'Missionen ändern', 'Cambiar misiones')) + '</button>';
        }
        return h + '</section>';
    }

    /* ---------- own goals ---------- */
    function goalsHTML() {
        const s = S() || {}, st = stores(), list = C.goalsToday(s.herbGoals, st);
        return '<section class="hq-sec hq-goals"><h3>' + esc(t('Your goals today', 'Deine Ziele heute', 'Tus metas de hoy')) + '<button type="button" class="hq-btn ghost hq-add" data-hq="add">' + ico('plus') + esc(t('Goal', 'Ziel', 'Meta')) + '</button></h3>' +
            (list.length ? '<ul class="hq-glist">' + list.map(g => '<li class="hq-goal' + (g.done ? ' done' : '') + '"><span class="hq-ck">' + ico(g.done ? 'check' : 'clock') + '</span><span class="hq-st"><b>' + esc(g.text) + '</b><small>' + esc((g.daily ? t('Every day', 'Jeden Tag', 'Cada día') : t('Once', 'Einmal', 'Una vez')) + ' · ' + g.value + '/' + g.n) + '</small></span><span class="hq-sa">' +
                (g.done ? '' : '<button type="button" class="hq-btn ghost" data-hq-go="' + g.action + '">' + esc(goLabel(g.action)) + '</button>') + '<button type="button" class="hq-x" data-hq="delGoal" data-id="' + g.id + '" aria-label="' + esc(t('Remove goal', 'Ziel entfernen', 'Quitar meta')) + '">' + ico('x') + '</button></span></li>').join('') + '</ul>'
                : '<p class="hq-note">' + esc(t('Add a small goal. It counts itself from what you log, nothing to tick off.', 'Füg ein kleines Ziel hinzu. Es zählt sich selbst aus dem, was du einträgst. Nichts abzuhaken.', 'Añade una meta pequeña. Se cuenta sola con lo que registras, sin marcar nada.')) + '</p>') + '</section>';
    }
    function addHTML() {
        const d = draft || {};
        return '<div class="hq-addv"><h3>' + esc(t('New goal', 'Neues Ziel', 'Nueva meta')) + '</h3><p class="hq-note">' + esc(t('Pick a suggestion, then say it your way.', 'Wähl einen Vorschlag und formulier ihn, wie du willst.', 'Elige una sugerencia y escríbela a tu manera.')) + '</p>' +
            C.CHIPS.map((g, gi) => '<div class="hq-cg"><span class="hq-over">' + esc(g.t[li()]) + '</span><div class="hq-chips">' + g.c.map((c, ci) => '<button type="button" class="hq-chip' + (d.key === gi + ':' + ci ? ' on' : '') + '" data-hq="chip" data-id="' + gi + ':' + ci + '">' + esc(c[2][li()]) + '</button>').join('') + '</div></div>').join('') +
            '<label class="hq-in"><span>' + esc(t('Your wording', 'Deine Worte', 'Tus palabras')) + '</span><input id="hqGoalText" maxlength="60" value="' + esc(d.text || '') + '" placeholder="' + esc(t('Pick a suggestion first', 'Erst einen Vorschlag wählen', 'Primero elige una sugerencia')) + '"' + (d.action ? '' : ' disabled') + '></label>' +
            (d.action ? '<p class="hq-note">' + esc(t('Counts from: ', 'Zählt aus: ', 'Cuenta desde: ') + goLabel(d.action) + ' · ' + t('target ', 'Ziel ', 'meta ') + d.n) + '</p>' : '') +
            '<label class="hq-tog"><input type="checkbox" id="hqDaily"' + (d.daily === false ? '' : ' checked') + '><span>' + esc(t('Repeat every day', 'Jeden Tag wiederholen', 'Repetir cada día')) + '</span></label>' +
            '<div class="hq-actions"><button type="button" class="hq-btn ghost" data-hq="back">' + esc(t('Back', 'Zurück', 'Atrás')) + '</button><button type="button" class="hq-btn pri" data-hq="saveGoal"' + (d.action ? '' : ' disabled') + '>' + esc(t('Add goal', 'Ziel hinzufügen', 'Añadir meta')) + '</button></div></div>';
    }

    /* ---------- food collection ----------
       Oct 22 (E-man: "I don't understand the food journal section ... I'd say remove it"): the Food journal screen is gone.
       The meals you logged live in the Fuel sheet's meal list. The tally underneath (core journal(), discover(), newFoods())
       stays for XP and fair-play rules. */

    function pathHTML() {
        if (view === 'add') return '<div class="hq-root" data-view="add" data-noi18n>' + addHTML() + '</div>';
        return '<div class="hq-root" data-view="path" data-noi18n><h2>' + esc(t('Herb path', 'Kraut-Pfad', 'Camino de tu ser de luz')) + '</h2>' + evoHTML(false) + specialsHTML() + dailyHTML() + goalsHTML() + missionsHTML() + '</div>';
    }

    function repaint() {
        D.querySelectorAll('.hq-root').forEach(r => {
            const v = r.dataset.view, y = r.closest('.r2-sh') ? r.closest('.r2-sh').scrollTop : 0;
            const tmp = D.createElement('div');
            tmp.innerHTML = pathHTML();
            r.replaceWith(tmp.firstChild);
            const sh = D.querySelector('.r2-sh'); if (sh && y) sh.scrollTop = y;
        });
        D.querySelectorAll('.hq-evo.hq-compact').forEach(e => { const tmp = D.createElement('div'); tmp.innerHTML = evoHTML(true); e.replaceWith(tmp.firstChild); });
    }

    /* ---------- actions ---------- */
    function award(amt, label, eventId) {
        if (typeof W.award === 'function') return W.award(amt, label, null, 'herb-quest', eventId) || 0;
        try { return LowiHost.award('herb-quest', null, { amt, label, eventId }) || 0; } catch (e) { return 0; }
    }
    function claimStep(id) {
        const q = C.specialQuests(stores(), lang()), x = q.steps.find(s => s.id === id);
        if (!x || !x.done || x.claimed) return 0;
        return award(x.xp, t('Special quest', 'Spezial-Quest', 'Misión especial') + ' · ' + x.title, x.eventId);
    }
    function claimMission(id) {
        const s = S() || {}, m = C.missions(stores(), s.herbWeek, lang()).find(x => x.id === id);
        if (!m || !m.picked || !m.done || m.claimed) return 0;
        return award(m.xp, t('Weekly mission', 'Wochen-Mission', 'Misión semanal') + ' · ' + m.title, m.eventId);
    }
    function pickMission(id) {
        const s = S(); if (!s) return false;
        const r = C.pickMission(s.herbWeek, id);
        if (r.ok) { s.herbWeek = r.state; save(); }
        else if (r.full) toast(t('Two missions max. Tap one to swap it.', 'Maximal zwei Missionen. Tipp eine an, um sie zu tauschen.', 'Máximo dos misiones. Toca una para cambiarla.'));
        return r.ok;
    }
    function go(action) {
        const ov = D.querySelector('.r2-ov .hq-root') && D.querySelector('.r2-ov .hq-root').closest('.r2-ov');
        try { if (ov && R.close) R.close(ov); } catch (e) {}
        try { if (W.LowiSpirit && LowiSpirit.isOpen && LowiSpirit.isOpen()) LowiSpirit.close(); } catch (e) {}
        setTimeout(() => {
            if (action === 'scan' && W.LowiLiving && LowiLiving.scan) LowiLiving.scan();
            else if (action === 'green') { if (W.LowiLiving && LowiLiving.scan) LowiLiving.scan(); }
            else if (W.LowiF3 && LowiF3.go) LowiF3.go(action === 'green' ? 'eat' : action);
        }, 320);
    }
    let undoTimer = 0;
    function snack(text, onUndo) {
        let el = D.getElementById('hqSnack');
        if (!el) { el = D.createElement('div'); el.id = 'hqSnack'; el.className = 'hq-snack'; el.setAttribute('role', 'status'); D.body.appendChild(el); }
        el.innerHTML = '<span>' + esc(text) + '</span><button type="button" data-hq="undo">' + esc(t('Undo', 'Rückgängig', 'Deshacer')) + '</button>';
        el.__undo = onUndo; el.hidden = false; el.classList.add('on');
        clearTimeout(undoTimer); undoTimer = setTimeout(() => { el.classList.remove('on'); el.hidden = true; el.__undo = null; }, 6000);
    }
    function saveGoal() {
        const s = S(); if (!s || !draft || !draft.action) return;
        const inp = D.getElementById('hqGoalText'), daily = D.getElementById('hqDaily');
        const r = C.addGoal(s.herbGoals, { action: draft.action, n: draft.n, text: inp ? inp.value : draft.text, daily: daily ? daily.checked : true });
        if (!r.goal) { toast(r.error === 'full' ? t('That is plenty of goals for now.', 'Das sind erstmal genug Ziele.', 'Ya son suficientes metas por ahora.') : r.error === 'dup' ? t('You already have this goal.', 'Dieses Ziel hast du schon.', 'Ya tienes esta meta.') : t('Write a few words first.', 'Schreib erst ein paar Worte.', 'Escribe unas palabras primero.')); return; }
        s.herbGoals = r.list; save(); view = 'path'; draft = null; repaint();
        const id = r.goal.id;
        snack(t('Goal added', 'Ziel hinzugefügt', 'Meta añadida') + ': ' + r.goal.text, () => { const x = S(); if (!x) return; x.herbGoals = C.removeGoal(x.herbGoals, id); save(); repaint(); });
    }
    D.addEventListener('click', e => {
        const g = e.target.closest && e.target.closest('[data-hq-go]');
        if (g) { e.preventDefault(); go(g.dataset.hqGo); return; }
        const b = e.target.closest && e.target.closest('[data-hq]');
        if (!b) return;
        const a = b.dataset.hq, id = b.dataset.id;
        e.preventDefault(); e.stopPropagation();
        if (a === 'claimStep') claimStep(id);
        else if (a === 'claimMission') claimMission(id);
        else if (a === 'claimDaily') { if (W.LowiF3 && LowiF3.claim) LowiF3.claim('all'); }
        else if (a === 'pickMission') { pickMission(id); const x = S(); chooser = !!(x && x.herbWeek && (x.herbWeek.picks || []).length < C.MAX_MISSIONS); }
        else if (a === 'chooser') chooser = !chooser;
        else if (a === 'hint') openHint = openHint === id ? '' : id;
        else if (a === 'all') showAll = !showAll;
        else if (a === 'add') { view = 'add'; draft = { daily: true }; }
        else if (a === 'back') { view = 'path'; draft = null; }
        else if (a === 'chip') { const [gi, ci] = id.split(':').map(Number), c = C.CHIPS[gi].c[ci], inp = D.getElementById('hqGoalText'), dl = D.getElementById('hqDaily'); draft = { key: id, action: c[0], n: c[1], text: c[2][li()], daily: dl ? dl.checked : true }; if (inp && inp.value && draft.key && inp.dataset.own === '1') draft.text = inp.value; }
        else if (a === 'saveGoal') { saveGoal(); return; }
        else if (a === 'delGoal') { const s = S(); if (s) { const old = (s.herbGoals || []).slice(), gl = old.find(x => x.id === id); s.herbGoals = C.removeGoal(s.herbGoals, id); save(); if (gl) snack(t('Goal removed', 'Ziel entfernt', 'Meta quitada'), () => { const x = S(); if (x) { x.herbGoals = old; save(); repaint(); } }); } }
        else if (a === 'undo') { const el = D.getElementById('hqSnack'); if (el && el.__undo) { const f = el.__undo; el.__undo = null; f(); } if (el) { el.classList.remove('on'); el.hidden = true; } return; }
        repaint();
        if (a === 'add' || a === 'chip') { const inp = D.getElementById('hqGoalText'); if (inp && a === 'chip') inp.addEventListener('input', () => { inp.dataset.own = '1'; if (draft) draft.text = inp.value; }); }
    }, true);

    /* ---------- after progress: a small evolution card that follows the reward, never blocks ---------- */
    let popTimer = 0, lastFood = null;
    function pop(beforeXP, afterXP) {
        const b = C.evolution(beforeXP), a = C.evolution(afterXP), evolved = a.index > b.index;
        const quarter = x => Math.floor(x.progress * 4);
        /* Oct 17 (E-man: "I don't like the leveling up bar. It's very big and not in our style, and it's very distracting"):
           a small chip of Misty's bubble glass, a thin progress ring + one short line, centred under the Daily Quest.
           It only comes when she evolves or crosses a quarter of the way to her next form (no 15-min repeats), and leaves after 3 s. */
        if (!evolved && quarter(a) === quarter(b)) return;
        let el = D.getElementById('hqPop');
        if (!el) { el = D.createElement('button'); el.type = 'button'; el.id = 'hqPop'; el.setAttribute('data-sp', 'path'); D.body.appendChild(el); }
        el.className = 'hq-pop hq-chip';
        const pct = Math.max(0, Math.min(1, a.next ? +a.progress || 0 : 1));
        el.style.setProperty('--hq-p', pct.toFixed(3));
        el.innerHTML = '<i class="hq-ring" aria-hidden="true"></i><span class="hq-tx">' + (a.next
            ? esc(evolved ? t('Evolved! Next: ', 'Entwickelt! Nächste: ', '¡Evolucionó! Siguiente: ') : t('Next: ', 'Nächste: ', 'Siguiente: ')) + '<b>' + esc(sname(a.next)) + '</b> · <span class="num">' + esc(t(a.left + ' XP to go', 'noch ' + a.left + ' XP', 'faltan ' + a.left + ' XP')) + '</span>'
            : esc(t('Final form', 'Endform', 'Forma final')) + ' · <b>' + esc(sname(a.current)) + '</b>') + '</span>';
        el.setAttribute('aria-label', a.next
            ? t('Next form: ' + sname(a.next) + ', ' + a.left + ' XP more, about ' + a.meals + ' meals', 'Nächste Form: ' + sname(a.next) + ', noch ' + a.left + ' XP, etwa ' + a.meals + ' Mahlzeiten', 'Siguiente forma: ' + sname(a.next) + ', faltan ' + a.left + ' XP, unas ' + a.meals + ' comidas')
            : el.textContent);
        /* Oct 16 (E-man: the XP card "is in another position, doesn't fit"): on Home it sits right under the Daily Quest box,
           never over the top row or the quest; elsewhere it drops in under the top bar. Oct 17: only as wide as its words. */
        try { const q = D.getElementById('f3Board'), r = q && q.offsetParent ? q.getBoundingClientRect() : null;
            /* Oct 17: below the hunt-count line too when it continues the box inside a world (hunt-count.js) */
            let bot = r ? r.bottom : 0; const hc = D.getElementById('hcLine'); if (r && hc && hc.classList.contains('on') && !hc.classList.contains('hc-away')) { const hr = hc.getBoundingClientRect(); if (hr.height > 0) bot = Math.max(bot, hr.bottom); }
            el.style.removeProperty('width');
            if (r && r.width > 0 && r.bottom > 0) { el.style.top = Math.round(bot + 8) + 'px'; el.style.maxWidth = Math.round(r.width) + 'px'; el.style.left = Math.round(r.left + r.width / 2) + 'px'; el.dataset.at = 'quest'; }
            else { ['top', 'max-width', 'left'].forEach(k => el.style.removeProperty(k)); delete el.dataset.at; } } catch (e) {}
        el.hidden = false; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
        clearTimeout(popTimer); popTimer = setTimeout(() => { el.classList.remove('on'); setTimeout(() => { el.hidden = true; }, reduced() ? 0 : 300); }, 3000);
    }
    W.addEventListener('lowi:reward', e => {
        const d = e.detail || {};
        const minor = d.entry && d.entry.src === 'tap'; /* xtp: tap XP shows its own tiny pop, not the evolution card */
        if (!minor && Number.isFinite(+d.beforeXP) && Number.isFinite(+d.afterXP)) setTimeout(() => pop(+d.beforeXP, +d.afterXP), 1700);
        setTimeout(repaint, 60);
    });
    /* the first time a food from the collection is logged, say so (no XP) */
    function foodCheck() {
        const st = stores(), d = C.discover(st.s.logs, st.products);
        if (lastFood) { const fresh = C.newFoods(lastFood, d); if (fresh.length) { const f = C.FOODS.find(x => x.id === fresh[0]); setTimeout(() => toast(t('First time logged: ', 'Zum ersten Mal eingetragen: ', 'Registrado por primera vez: ') + f.names[li()]), 2600); } }
        lastFood = d;
    }
    D.addEventListener('lowi:meal-logged', () => setTimeout(foodCheck, 50));
    W.addEventListener('lowi:reward', () => setTimeout(foodCheck, 80));
    W.addEventListener('lowi:quest-claimed', () => setTimeout(repaint, 60));
    setTimeout(() => { try { foodCheck(); const s = S(); if (s && C.settleGoals(s.herbGoals, stores())) save(); } catch (e) {} }, 1500);
    setInterval(() => {
        if (D.hidden || !D.querySelector('.hq-root[data-view="path"]')) return;
        const a = D.activeElement; if (a && a.closest && a.closest('.hq-root')) return;
        try { const s = S(); if (s && C.settleGoals(s.herbGoals, stores())) save(); } catch (e) {}
        repaint();
    }, 30000);

    W.LowiHerbQuests = { pathHTML, evoHTML, claimStep, claimMission, pickMission, go, repaint, reset: () => { view = 'path'; draft = null; chooser = false; openHint = ''; showAll = false; } };
})();
