/* LOWiSPIKE universal interaction XP + healthy streak bonus + tiered feedback (Oct 15, 2026). Rules: xp-tap-core.js.
   Every purposeful tap earns a little XP the first time each day; new places earn a bit more; real actions keep their own
   rewards and, in a row, build a streak bonus. Feedback is tiered: a tiny pop at the finger for taps, a slightly bigger one
   for new places, a banner for streak 3 and 5, a full fanfare for streak 8 and day-streak badges. Animations rotate so the
   same one never plays twice in a row. All XP goes through the app's award(); taps are batched into one ledger entry. */
(function () {
    'use strict';
    const W = window, D = document, K = W.LowiTapXPCore;
    if (!K || W.__lowiTapXP) return;
    W.__lowiTapXP = true;
    try { if (!D.querySelector('link[href^="xp-tap.css"]')) { const me = D.currentScript || D.querySelector('script[src*="xp-tap.js"]'); const l = D.createElement('link'); l.rel = 'stylesheet'; l.href = me ? me.getAttribute('src').replace('xp-tap.js', 'xp-tap.css') : 'xp-tap.css'; D.head.appendChild(l); } } catch (e) {}
    const KEY = 'lowi.xptap.v1', FLUSH_MS = 2500;
    const L = () => { const l = String(D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const t = (en, de, es) => [en, de, es][L()];
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const state = () => { try { return W.LowiVitalsBridge && LowiVitalsBridge.state ? LowiVitalsBridge.state() : null; } catch (e) { return null; } };
    const canAward = () => typeof W.award === 'function' && !!state() && Array.isArray(state().ledger);
    const tab = () => { try { return typeof TAB !== 'undefined' ? String(TAB) : ''; } catch (e) { return ''; } };

    /* ---------- storage ---------- */
    let store = null;
    function load() {
        const day = K.dayKey(Date.now());
        if (store && store.day === day) return store;
        let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
        if (raw && raw.day && raw.day !== day && raw.pend > 0) { store = raw; flush(true); raw = null; } /* yesterday's last taps still count, once */
        const s = state();
        store = K.norm(raw, day, s && s.ledger);
        return store;
    }
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

    /* ---------- flushing taps into the ledger (one entry per burst) ---------- */
    let flushTimer = 0;
    function flush(now) {
        clearTimeout(flushTimer); flushTimer = 0;
        if (!store || !(store.pend > 0)) return 0;
        if (!canAward()) { if (!now) flushTimer = setTimeout(flush, FLUSH_MS); return 0; }
        const r = K.flush(store); if (!r.award) return 0;
        const label = t('Curiosity · ' + r.award.n + (r.award.n === 1 ? ' tap' : ' taps'), 'Neugier · ' + r.award.n + (r.award.n === 1 ? ' Tap' : ' Taps'), 'Curiosidad · ' + r.award.n + (r.award.n === 1 ? ' toque' : ' toques'));
        store = r.store; persist(); /* the id is spent before the award, so a crash can't award it twice */
        let got = 0; try { got = W.award(r.award.amt, label, null, 'tap', r.award.eventId, { quiet: true }) || 0; } catch (e) { got = 0; }
        return got;
    }
    function soon() { clearTimeout(flushTimer); flushTimer = setTimeout(flush, FLUSH_MS); }
    D.addEventListener('visibilitychange', () => { if (D.hidden) flush(true); });
    W.addEventListener('pagehide', () => flush(true));

    /* ---------- feedback layer ---------- */
    let layer = null, live = null, lastAnn = 0;
    function ensure() {
        if (layer && layer.isConnected) return;
        layer = D.createElement('div'); layer.className = 'xtp-layer'; layer.setAttribute('aria-hidden', 'true'); D.body.appendChild(layer);
        live = D.createElement('div'); live.className = 'xtp-live'; live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status'); D.body.appendChild(live);
    }
    function announce(msg, force) { const n = Date.now(); if (!force && n - lastAnn < 6000) return; lastAnn = n; ensure(); live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); }
    const lastV = {};
    const vary = (group, list) => (lastV[group] = K.pick(list, lastV[group]));
    const TAP_V = ['rise', 'drift-l', 'drift-r', 'spark', 'twirl', 'bubble'];
    const EXP_V = ['bloom', 'orbit', 'rise', 'spark'];
    const EXP_WORDS = [['New spot', 'Neu entdeckt', 'Nuevo lugar'], ['Discovered', 'Entdeckt', 'Descubierto'], ['Explorer', 'Entdecker', 'Explorador'], ['First visit today', 'Heute zum ersten Mal', 'Primera visita hoy']];
    let lastWord = -1;
    function at(x, y) {
        const w = W.innerWidth || 390, h = W.innerHeight || 800;
        return { x: Math.max(28, Math.min(w - 28, Number.isFinite(x) ? x : w / 2)), y: Math.max(56, Math.min(h - 40, Number.isFinite(y) ? y : h * 0.42)) };
    }
    function pop(x, y, text, cls, variant) {
        ensure(); const p = at(x, y);
        const el = D.createElement('span'); el.className = 'xtp-pop ' + (cls || '') + ' v-' + (reduced() ? 'still' : variant);
        el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.textContent = text;
        if (!reduced() && /spark|bloom|orbit/.test(variant)) for (let i = 0; i < 5; i++) { const s = D.createElement('i'); s.style.setProperty('--a', Math.round(Math.random() * 360) + 'deg'); s.style.setProperty('--d', (14 + Math.random() * 14).toFixed(0) + 'px'); el.appendChild(s); }
        layer.appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }
    function tapPop(x, y, amt) { pop(x, y, '+' + amt, 'tap', vary('tap', TAP_V)); announce(t('+' + amt + ' XP', '+' + amt + ' XP', '+' + amt + ' XP')); }
    function explorePop(x, y, amt) {
        let i; do { i = Math.floor(Math.random() * EXP_WORDS.length); } while (i === lastWord && EXP_WORDS.length > 1); lastWord = i;
        const word = EXP_WORDS[i][L()];
        pop(x, y, '+' + amt + ' · ' + word, 'explore', vary('exp', EXP_V));
        announce('+' + amt + ' XP · ' + word);
    }
    let lastRepeat = 0; const saidRepeat = new Set();
    function repeatPop(x, y, key) {
        const n = Date.now(); if (saidRepeat.has(key) || n - lastRepeat < 8000) return;
        saidRepeat.add(key); lastRepeat = n;
        pop(x, y, t('\u2713 counted today', '\u2713 heute gez\u00e4hlt', '\u2713 ya contado hoy'), 'dim', 'still');
    }
    function capPop(x, y) {
        if (store.capSaid) return; store.capSaid = 1; persist();
        pop(x, y, t('Tap XP full for today \u00b7 real actions still count', 'Tap-XP f\u00fcr heute voll \u00b7 echte Aktionen z\u00e4hlen weiter', 'XP de toques completo hoy \u00b7 las acciones reales siguen contando'), 'dim wide', 'still');
        announce(t('Tap XP full for today', 'Tap-XP f\u00fcr heute voll', 'XP de toques completo hoy'), true);
    }

    /* banner for streak 3 / 5 */
    const BAN_V = ['slide', 'bloom', 'tilt', 'drop'];
    function banner(title, sub, big) {
        ensure(); layer.querySelectorAll('.xtp-banner').forEach(b => b.remove()); /* one banner at a time */
        const el = D.createElement('div'); el.className = 'xtp-banner' + (big ? ' big' : '') + ' v-' + (reduced() ? 'still' : vary('ban', BAN_V));
        el.innerHTML = '<b></b><small></small>'; el.firstChild.textContent = title; el.lastChild.textContent = sub;
        if (big && !reduced()) for (let i = 0; i < 10; i++) { const s = D.createElement('i'); s.style.setProperty('--a', (i * 36 + Math.random() * 20).toFixed(0) + 'deg'); s.style.setProperty('--d', (40 + Math.random() * 40).toFixed(0) + 'px'); el.appendChild(s); }
        layer.appendChild(el);
        try { W.LowiSFX && LowiSFX.play && LowiSFX.play('xp'); } catch (e) {}
        announce(title + ' \u00b7 ' + sub, true);
        setTimeout(() => el.remove(), 3400);
    }
    /* full fanfare for big streaks */
    const FAN_V = ['confetti', 'burst', 'rings', 'comet'];
    const COLORS = ['#ffd36b', '#ffb347', '#7ee0c3', '#8fb8ff', '#ff8fb1', '#c6a8ff', '#ffffff'];
    let fanOpen = 0;
    function fanfare(big, title, sub) {
        ensure(); if (fanOpen && Date.now() - fanOpen < 2500) return; fanOpen = Date.now();
        const v = reduced() ? 'still' : vary('fan', FAN_V);
        const el = D.createElement('div'); el.className = 'xtp-fan v-' + v;
        const card = D.createElement('button'); card.type = 'button'; card.className = 'xtp-fan-card';
        card.innerHTML = '<span class="xtp-fan-big"></span><b></b><small></small><em></em>';
        card.children[0].textContent = big; card.children[1].textContent = title; card.children[2].textContent = sub; card.children[3].textContent = t('Tap to continue', 'Tippen zum Weitermachen', 'Toca para seguir');
        if (!reduced()) {
            const n = v === 'rings' ? 5 : v === 'comet' ? 14 : 34;
            for (let i = 0; i < n; i++) {
                const s = D.createElement('i'); s.className = 'p';
                s.style.setProperty('--a', (Math.random() * 360).toFixed(0) + 'deg');
                s.style.setProperty('--d', (90 + Math.random() * 170).toFixed(0) + 'px');
                s.style.setProperty('--c', COLORS[Math.floor(Math.random() * COLORS.length)]);
                s.style.setProperty('--t', (0.9 + Math.random() * 0.9).toFixed(2) + 's');
                s.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
                s.style.setProperty('--i', String(i));
                el.appendChild(s);
            }
        }
        el.appendChild(card); D.body.appendChild(el);
        const close = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 320); };
        card.addEventListener('click', e => { e.stopPropagation(); close(); });
        setTimeout(close, 3600);
        try { W.LowiSFX && LowiSFX.play && LowiSFX.play(Math.random() < 0.5 ? 'streak' : 'levelup'); } catch (e) {}
        try { navigator.vibrate && navigator.vibrate([18, 40, 18, 40, 60]); } catch (e) {}
        announce(big + ' \u00b7 ' + title, true);
        requestAnimationFrame(() => el.classList.add('on'));
    }

    /* ---------- core: one tap or one visit ---------- */
    function grant(key, tier, x, y) {
        if (!canAward()) return 'none';
        load();
        const r = K.decide(store, { key, tier, now: Date.now() });
        store = r.store;
        if (r.outcome === 'earn') { persist(); soon(); tier === 'explore' ? explorePop(x, y, r.amt) : tapPop(x, y, r.amt); }
        else if (r.outcome === 'repeat') repeatPop(x, y, key);
        else if (r.outcome === 'cap') capPop(x, y);
        return r.outcome;
    }

    /* ---------- what counts as a purposeful tap ---------- */
    const SEL = 'button, a[href], summary, label, [role=button], [role=tab], [role=menuitem], [role=option], [role=switch], [role=link], [onclick], [tabindex]:not([tabindex="-1"])';
    const SKIP = '.xtp-layer, .xtp-fan, #toast, input, textarea, select, [contenteditable=""], [contenteditable="true"], canvas, [data-xtp="off"]';
    const ACT_NEG = /^(x|close|closesheet|dismiss|cancel|back|undo|del|delete|remove|reset|clear|logout|signout|skip|later|no)([-_:]|$)|(^|[-_])(close|cancel|delete|remove|logout)$/i;
    const CLS_NEG = /(^|[-_ ])(close|closer|cancel|dismiss|back|del|delete|remove|danger|destructive|ov|overlay|backdrop|scrim|veil|mask)($|[-_ ])/i;
    function control(target) {
        if (!target || !target.closest) return null;
        if (target.closest(SKIP)) return null;
        let el = target.closest(SEL);
        if (!el) { let n = target; for (let i = 0; n && n !== D.body && i < 5; i++, n = n.parentElement) { try { if (getComputedStyle(n).cursor === 'pointer') { el = n; break; } } catch (e) { break; } } }
        if (!el || el === D.body || el === D.documentElement) return null;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[inert]')) return null;
        return el;
    }
    function words(el) {
        const lab = el.getAttribute('aria-label') || el.getAttribute('title') || '';
        let txt = ''; try { txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) {}
        return { lab, txt: txt.slice(0, 48) };
    }
    function dataHook(el) {
        for (const a of el.attributes || []) { if (/^data-/.test(a.name) && !/^data-(v|i|n|id|idx|style|state|on|open|lvl|l|tip)$/.test(a.name)) return a.name.slice(5) + '-' + String(a.value).slice(0, 24); }
        return '';
    }
    function negativeEl(el) {
        const w = words(el), hook = dataHook(el);
        if (K.negative(w.lab) || (w.txt.length <= 28 && K.negative(w.txt))) return true;
        for (const a of el.attributes || []) if (/^data-/.test(a.name) && ACT_NEG.test(String(a.value))) return true;
        if (CLS_NEG.test(String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className || '')) || CLS_NEG.test(el.id || '')) return true;
        return hook && ACT_NEG.test(hook.replace(/^[a-z0-9]+-/, ''));
    }
    function area(el) {
        const dlg = el.closest('[role=dialog], .sheet, [class*="sheet"], [class*="-ov"], [class*="modal"]');
        let a = tab() || 'app';
        if (dlg) a += '/' + (dlg.id || String(dlg.className || '').split(/\s+/)[0] || 'sheet');
        return a;
    }
    function identOf(el) {
        const w = words(el);
        return el.id || dataHook(el) || w.lab || w.txt.slice(0, 32) || String(el.className || '').split(/\s+/)[0] || el.tagName;
    }

    /* accidental taps: drags, long presses and scroll flicks are not taps */
    let down = null, lastUser = 0, gesture = 0, exploredIn = -1;
    W.addEventListener('pointerdown', e => { if (e.isTrusted) { down = { x: e.clientX, y: e.clientY, t: Date.now() }; lastUser = Date.now(); } }, { capture: true, passive: true });
    W.addEventListener('keydown', e => { if (e.isTrusted && (e.key === 'Enter' || e.key === ' ')) lastUser = Date.now(); }, { capture: true, passive: true });
    W.addEventListener('click', e => {
        if (!e.isTrusted) return;
        lastUser = Date.now(); const g = ++gesture;
        const kb = e.detail === 0;
        if (!kb && down) { const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), held = Date.now() - down.t; if (moved > 12 || held > 1200) return; }
        const el = control(e.target); if (!el) return;
        const r = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        const x = kb && r ? r.left + r.width / 2 : e.clientX, y = kb && r ? r.top : e.clientY - 14;
        const tb = el.closest('#tabbar [data-tab]');
        if (tb) { const k = 'tab:' + tb.getAttribute('data-tab'); exploredIn = g; setTimeout(() => grant(k, 'explore', x, y - 10), 0); return; }
        if (negativeEl(el)) return;
        const key = K.keyFor(area(el), identOf(el)); if (!key) return;
        /* wait one beat: if this same tap opened a new place, the bigger explore reward replaces the tap reward */
        setTimeout(() => { if (exploredIn === g) return; grant(key, 'tap', x, y); }, 90);
    }, { capture: true, passive: true });
    D.addEventListener('change', e => {
        const el = e.target; if (!e.isTrusted || !el || !el.matches) return;
        if (!el.matches('input[type=range], input[type=checkbox], input[type=radio], select') || el.closest(SKIP.replace(/, input, textarea, select/, ''))) return;
        if (el.disabled) return;
        if (Date.now() - lastUser < 1200) exploredIn = gesture; /* a label tap that toggled this input is one gesture, one reward */
        const r = el.getBoundingClientRect();
        const key = K.keyFor(area(el), 'set-' + (el.name || el.id || el.getAttribute('aria-label') || el.type));
        if (key) grant(key, 'tap', r.left + r.width / 2, r.top - 6);
    }, true);

    /* new places and learning: only right after a real user gesture, never from code on boot */
    function onPlace(kind, id) {
        if (!id || Date.now() - lastUser > 2500) return;
        exploredIn = gesture;
        grant(kind + ':' + String(id).toLowerCase().slice(0, 32), 'explore', undefined, undefined);
    }
    const placeOf = e => (e && e.detail) || {};
    W.addEventListener('lowi:world-region', e => { const d = placeOf(e); if (d.id && d.id !== 'hub') onPlace('region', d.id); });
    W.addEventListener('lowi:world3d-place', e => onPlace('place', placeOf(e).id));
    W.addEventListener('lowi:ride-arrive', e => onPlace('ride', placeOf(e).place));
    W.addEventListener('lowi:arrival', e => onPlace('learn', placeOf(e).place));
    W.addEventListener('lowi:buddy-found', e => onPlace('buddy', placeOf(e).id));
    W.addEventListener('lowi:care-sent', e => onPlace('care', placeOf(e).kind));
    ['lowi:cellroom', 'lowi:buddies', 'lowi:shop'].forEach(n => W.addEventListener(n, e => { if (placeOf(e).open) onPlace('room', n.slice(5)); }));

    /* ---------- healthy streak bonus ---------- */
    let comboTimer = 0, booted = false;
    function verdictFn() {
        try { if (W.LowiCell && typeof LowiCell.verdict === 'function') return l => LowiCell.verdict(l); } catch (e) {}
        return K.verdict;
    }
    function checkCombo(quietBoot) {
        const s = state(); if (!s || !canAward()) return;
        const due = K.comboDue({ logs: s.logs, ledger: s.ledger, now: Date.now(), verdict: verdictFn() });
        if (!due.length) return;
        let top = null;
        for (const m of due) {
            const label = t('Healthy streak \u00d7' + m.n, 'Gesunde Serie \u00d7' + m.n, 'Racha sana \u00d7' + m.n);
            let got = 0; try { got = W.award(m.xp, label, null, 'combo', m.eventId, { quiet: true }) || 0; } catch (e) {}
            if (got) top = m;
        }
        if (!top) return;
        const title = t(top.n + ' healthy in a row!', top.n + ' gesund in Folge!', '\u00a1' + top.n + ' sanas seguidas!');
        const sub = '+' + top.xp + ' XP \u00b7 ' + t('streak bonus', 'Serien-Bonus', 'bonus de racha');
        if (top.tier === 'fanfare' && !quietBoot) fanfare('+' + top.xp + ' XP', title, t('Your best run today. Keep it gentle.', 'Dein bester Lauf heute. Ganz entspannt weiter.', 'Tu mejor racha de hoy. Sigue con calma.'));
        else banner(title, sub, top.tier !== 'pop');
    }
    function queueCombo() { clearTimeout(comboTimer); comboTimer = setTimeout(() => checkCombo(false), 450); }
    W.addEventListener('lowi:reward', e => {
        const en = e.detail && e.detail.entry; if (!en || K.isMinor(en)) return;
        if (/-day streak badge/i.test(String(en.label || ''))) {
            const n = parseInt(en.label, 10) || 0;
            setTimeout(() => fanfare('+' + en.amt + ' XP', t(n + ' days in a row!', n + ' Tage in Folge!', '\u00a1' + n + ' d\u00edas seguidos!'), t('Day streak badge unlocked', 'Tages-Serien-Abzeichen frei', 'Insignia de racha desbloqueada')), 900);
        }
        queueCombo();
    });
    D.addEventListener('lowi:meal-logged', queueCombo); W.addEventListener('lowi:meal-logged', queueCombo);

    function boot() {
        if (booted) return; if (!canAward()) { setTimeout(boot, 800); return; }
        booted = true; load(); if (store.pend > 0) flush(true); persist();
        setTimeout(() => checkCombo(true), 2500);
    }
    W.LowiTapXP = { grant, flush: () => flush(true), store: () => (load(), JSON.parse(JSON.stringify(store))), checkCombo: () => checkCombo(false), fanfare, banner, _pop: pop };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(boot, 400)); else setTimeout(boot, 400);
})();
