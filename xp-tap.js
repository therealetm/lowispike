/* LOWiSPIKE XP: completed actions only + healthy streak bonus (Oct 15, 2026). Rules: xp-tap-core.js.
   User decision: taps, tab visits, opening Move, menus and sheets, travelling to body regions and reading arrival cards
   earn 0 XP. This file listens to no taps, no tab changes and no menu or sheet events. It pays only four completed
   actions that had no reward yet (K.action): a first-ever discovery of a body region (once per region, ever), a microbe
   joining the crew (once per microbe, ever), care sent to a friend (max 3 a day), a corrected fasting start (max 1 a day).
   Real completed actions keep
   their own rewards (meals, water, Move sessions, steps, scans, swaps, cooking, check-in, quests, body trips), each with
   an eventId or per-day cap in award(). On top, a run of healthy completed actions builds a streak bonus (3 / 5 / 8),
   paid once per day per milestone (combo:<day>:<n>), with a banner or fanfare. Tap points an older build left pending
   on this device are dropped, never paid. */
(function () {
    'use strict';
    const W = window, D = document, K = W.LowiTapXPCore;
    if (!K || W.__lowiTapXP) return;
    W.__lowiTapXP = true;
    try { if (!D.querySelector('link[href^="xp-tap.css"]')) { const me = D.currentScript || D.querySelector('script[src*="xp-tap.js"]'); const l = D.createElement('link'); l.rel = 'stylesheet'; l.href = me ? me.getAttribute('src').replace('xp-tap.js', 'xp-tap.css') : 'xp-tap.css'; D.head.appendChild(l); } } catch (e) {}
    const KEY = 'lowi.xptap.v1';
    const L = () => { const l = String(D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const t = (en, de, es) => [en, de, es][L()];
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const state = () => { try { return W.LowiVitalsBridge && LowiVitalsBridge.state ? LowiVitalsBridge.state() : null; } catch (e) { return null; } };
    const canAward = () => typeof W.award === 'function' && !!state() && Array.isArray(state().ledger);

    /* an older build kept unpaid tap points on the device: drop them so they can never be paid */
    function dropOldTapState() { try { localStorage.removeItem(KEY); } catch (e) {} }

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

    /* taps, tabs, menus and navigation: never XP (kept as a no-op so older callers do not break) */
    function grant() { return 'none'; }

    /* ---------- completed actions that had no reward yet (rules + caps: K.action) ----------
       Each one is a finished thing, never a tap: a first-ever arrival in a body region (once per region, ever), a microbe
       joining the crew for the first time (once per microbe, ever), care sent to a friend (max 3 a day), a corrected fasting
       start (max 1 a day; the length of the fast never matters). The award() toast names the action. */
    const REG = { brain: ['Brain', 'Gehirn', 'Cerebro'], lung: ['Lungs', 'Lunge', 'Pulmones'], heart: ['Heart', 'Herz', 'Coraz\u00f3n'], liver: ['Liver', 'Leber', 'H\u00edgado'],
        pancreas: ['Pancreas', 'Bauchspeicheldr\u00fcse', 'P\u00e1ncreas'], gut: ['Gut', 'Darm', 'Intestino'], muscle: ['Muscle', 'Muskel', 'M\u00fasculo'] };
    const LAB = {
        discover: n => t('First discovery \u00b7 ', 'Erste Entdeckung \u00b7 ', 'Primer descubrimiento \u00b7 ') + n,
        buddy: n => t('New buddy \u00b7 ', 'Neuer Buddy \u00b7 ', 'Nuevo compa\u00f1ero \u00b7 ') + n,
        care: () => t('Care sent to a friend', 'F\u00fcrsorge an Freund gesendet', 'Cuidado enviado a un amigo'),
        fastedit: () => t('Fasting start updated', 'Fastenstart korrigiert', 'Inicio del ayuno corregido')
    };
    function act(kind, id, name) {
        const s = state(); if (!s || !canAward()) return 0;
        const a = K.action(kind, id, s.ledger, Date.now()); if (!a) return 0;
        let got = 0; try { got = W.award(a.amt, LAB[kind](name || a.id), null, a.src, a.eventId) || 0; } catch (e) { got = 0; }
        return got;
    }
    const detailOf = e => (e && e.detail) || {};
    W.addEventListener('lowi:world-region', e => { const id = String(detailOf(e).id || ''); if (REG[id]) act('discover', 'region-' + id, REG[id][L()]); });
    W.addEventListener('lowi:buddy-added', e => { const d = detailOf(e); if (d.id && !d.starter) act('buddy', d.id, d.name || d.id); });
    W.addEventListener('lowi:care-sent', () => act('care', 'care'));
    W.addEventListener('lowi:fast-start', e => { const d = detailOf(e); if (d.to && d.to !== d.from) act('fastedit', 'fast'); });

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
        if (booted) return; dropOldTapState(); if (!canAward()) { setTimeout(boot, 800); return; }
        booted = true;
        setTimeout(() => checkCombo(true), 2500);
    }
    W.LowiTapXP = { grant, act, flush: () => 0, store: () => null, checkCombo: () => checkCombo(false), fanfare, banner, _pop: pop };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(boot, 400)); else setTimeout(boot, 400);
})();
