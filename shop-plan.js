/* LOWiSPIKE shopping rhythm, page layer (Oct 17, 2026). Rules live in shop-plan-core.js (LowiShopPlanCore).
   - formHTML(): the "Your grocery shopping" form. The setup (onboarding) shows it as its last step; Profile > About you
     opens the same form in a sheet, so it can be changed any time.
   - The person types their own number of days. Weekdays and a shop name are optional. Nothing is guessed or pre-filled.
   - Saved to localStorage 'lowispike.shopplan.v1' (in the account backup). Fires window event 'lowi:shopplan'.
   ONE shared API: window.LowiShopPlan = {get, set, isSet, summary, formHTML, readForm, bind, openEditor, refresh}. */
(function () {
    'use strict';
    const C = window.LowiShopPlanCore;
    if (!C || window.LowiShopPlan) return;
    const D = document;
    const R = () => window.LowiR2 || {};
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { let l = ''; try { l = (window.LowiLang && LowiLang.get && LowiLang.get()) || localStorage.getItem('lowispike.lang') || D.documentElement.lang || 'en'; } catch (e) { l = 'en'; } l = String(l).slice(0, 2).toLowerCase(); return C.LANGS.indexOf(l) >= 0 ? l : 'en'; };
    const TX = {
        en: {
            over: 'GROCERY SHOPPING', h: 'Healthy days start in the shop', p: 'How often do you usually go grocery shopping? Type your own number.',
            every: 'I shop every', days: 'days', daysQ: 'Usual days', opt: '(optional)', store: 'Usual shop', storePh: 'e.g. Edeka on Main Street',
            note: 'Missing a shop never means you ate badly. Change it any time in Profile \u203a About you.',
            need: 'Type a number from 1 to 60, or tap Later.', save: 'Save', later: 'Later', saved: 'Shopping rhythm saved.', profT: 'Grocery shopping', profSet: 'Set my rhythm', profEdit: 'Change', close: 'Close'
        },
        de: {
            over: 'EINKAUFEN', h: 'Gesunde Tage beginnen im Laden', p: 'Wie oft gehst du normalerweise einkaufen? Trag deine eigene Zahl ein.',
            every: 'Ich kaufe ein alle', days: 'Tage', daysQ: 'Meist an diesen Tagen', opt: '(freiwillig)', store: 'Dein Laden', storePh: 'z. B. Edeka in der Hauptstra\u00dfe',
            note: 'Ein verpasster Einkauf hei\u00dft nie, dass du schlecht gegessen hast. \u00c4ndern kannst du es jederzeit unter Profil \u203a \u00dcber dich.',
            need: 'Trag eine Zahl von 1 bis 60 ein oder tippe auf Sp\u00e4ter.', save: 'Speichern', later: 'Sp\u00e4ter', saved: 'Einkaufsrhythmus gespeichert.', profT: 'Einkaufen', profSet: 'Rhythmus eintragen', profEdit: '\u00c4ndern', close: 'Schlie\u00dfen'
        },
        es: {
            over: 'LA COMPRA', h: 'Los d\u00edas sanos empiezan en la tienda', p: '\u00bfCada cu\u00e1nto sueles hacer la compra? Escribe tu propio n\u00famero.',
            every: 'Compro cada', days: 'd\u00edas', daysQ: 'D\u00edas habituales', opt: '(opcional)', store: 'Tu tienda', storePh: 'p. ej. Edeka de la calle Mayor',
            note: 'Saltarte una compra nunca significa que comiste mal. C\u00e1mbialo cuando quieras en Perfil \u203a Sobre ti.',
            need: 'Escribe un n\u00famero del 1 al 60, o toca M\u00e1s tarde.', save: 'Guardar', later: 'M\u00e1s tarde', saved: 'Ritmo de compra guardado.', profT: 'La compra', profSet: 'Definir mi ritmo', profEdit: 'Cambiar', close: 'Cerrar'
        }
    };
    const t = k => (TX[lang()] || TX.en)[k] || TX.en[k] || k;

    function get() { try { return C.normalize(JSON.parse(localStorage.getItem(C.KEY) || 'null')); } catch (e) { return C.normalize(null); } }
    function set(part) {
        const cur = get();
        const next = C.normalize(Object.assign({}, cur, part || {}, { updated: Date.now() }));
        try { localStorage.setItem(C.KEY, JSON.stringify(next)); } catch (e) { }
        try { const x = window.LOWI_CLOUD_X; if (x && x.backupNow) x.backupNow(); } catch (e) { }
        try { window.dispatchEvent(new CustomEvent('lowi:shopplan', { detail: next })); } catch (e) { }
        return next;
    }

    /* the form. opts.prefix keeps ids unique when two forms could exist (setup + editor) */
    function formHTML(p, opts) {
        p = C.normalize(p || get()); opts = opts || {};
        const id = opts.prefix || 'spl';
        const names = C.dayNames(lang());
        const order = [1, 2, 3, 4, 5, 6, 0];
        return '<div class="spl-form" data-spl-form data-noi18n>' +
            (opts.head === false ? '' : '<p class="spl-over">' + esc(t('over')) + '</p><div class="r2-obt spl-h">' + esc(t('h')) + '</div><div class="r2-obs spl-p">' + esc(t('p')) + '</div>') +
            '<label class="spl-every" for="' + id + 'Every"><span>' + esc(t('every')) + '</span>' +
            '<input id="' + id + 'Every" class="spl-num" type="number" inputmode="numeric" pattern="[0-9]*" min="' + C.MIN + '" max="' + C.MAX + '" step="1" enterkeyhint="done" autocomplete="off" value="' + (p.every || '') + '" aria-describedby="' + id + 'Err">' +
            '<span>' + esc(t('days')) + '</span></label>' +
            '<div class="r2-obsub spl-sub">' + esc(t('daysQ')) + ' <span>' + esc(t('opt')) + '</span></div>' +
            '<div class="r2-chips spl-days" role="group" aria-label="' + esc(t('daysQ')) + '">' + order.map(i => '<button type="button" class="r2-chip spl-day' + (p.days.indexOf(i) >= 0 ? ' on' : '') + '" aria-pressed="' + (p.days.indexOf(i) >= 0) + '" data-spl-day="' + i + '">' + esc(names[i]) + '</button>').join('') + '</div>' +
            '<label class="r2-fl spl-store"><span>' + esc(t('store')) + ' ' + esc(t('opt')) + '</span><input id="' + id + 'Store" maxlength="60" autocomplete="off" placeholder="' + esc(t('storePh')) + '" value="' + esc(p.store) + '"></label>' +
            '<p class="spl-note">' + esc(t('note')) + '</p>' +
            '<div class="r2-err spl-err" id="' + id + 'Err" role="alert"></div></div>';
    }
    /* reads a form; returns {ok, plan, empty}. Empty number = not set (fine for "Later"), a bad number = not ok */
    function readForm(root) {
        root = root || D;
        const f = root.querySelector('[data-spl-form]'); if (!f) return { ok: false, empty: true, plan: null };
        const raw = (f.querySelector('.spl-num') || {}).value || '';
        const every = C.parseEvery(raw);
        const days = Array.prototype.map.call(f.querySelectorAll('.spl-day.on'), b => +b.getAttribute('data-spl-day'));
        const store = (f.querySelector('.spl-store input') || {}).value || '';
        const empty = !String(raw).trim();
        return { ok: !!every, empty, plan: { every, days, store } };
    }
    function showErr(root) {
        const f = (root || D).querySelector('[data-spl-form]'); if (!f) return;
        const e = f.querySelector('.spl-err'); if (e) { e.textContent = t('need'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
        const i = f.querySelector('.spl-num'); if (i) try { i.focus(); } catch (x) { }
    }
    /* save from a form: true when saved */
    function saveForm(root) { const r = readForm(root); if (!r.ok) { showErr(root); return false; } set(Object.assign({}, r.plan, { skipped: false })); return true; }

    /* weekday chips toggle in place (both in setup and in the editor) */
    D.addEventListener('click', e => {
        const b = e.target.closest('[data-spl-day]');
        if (b && b.closest('[data-spl-form]')) { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); return; }
        const a = e.target.closest('[data-spl]'); if (!a) return;
        const v = a.getAttribute('data-spl'), ov = a.closest('.r2-ov');
        if (v === 'save') { if (saveForm(ov)) { try { R().close(ov); } catch (x) { } try { R().toast && R().toast(t('saved')); } catch (x) { } refresh(); } return; }
        if (v === 'close') { try { R().close(ov); } catch (x) { } return; }
        if (v === 'open') { e.preventDefault(); openEditor(); }
    }, false);
    D.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const i = e.target; if (!i || !i.closest || !i.closest('[data-spl-form]') || i.tagName !== 'INPUT') return; e.preventDefault(); try { i.blur(); } catch (x) { } }, true);

    function openEditor() {
        const r = R(); if (!r.sheet) return null;
        return r.sheet('<div class="spl-sheet">' + formHTML(get(), { prefix: 'splEd' }) + '<div class="r2-obacts"><button type="button" class="r2-btn pri big" data-spl="save">' + esc(t('save')) + '</button></div></div>', { cls: 'spl-ov' });
    }

    /* Profile > About you: one small card next to the starter plan card, same look */
    let busy = false;
    function cardHTML() {
        const p = get(), has = C.isSet(p);
        return '<div class="card spl-pcard" id="splProf" data-noi18n><div class="spl-pch"><span class="spl-ic" aria-hidden="true">' + icon() + '</span><div><b>' + esc(t('profT')) + '</b><small>' + esc(C.summary(p, lang())) + '</small></div></div>' +
            '<div class="spl-pcb"><button type="button" class="r2-btn' + (has ? ' ghost' : ' pri') + '" data-spl="open">' + esc(has ? t('profEdit') : t('profSet')) + '</button></div></div>';
    }
    function icon() { try { const s = window.LowiIcons && LowiIcons.svg && LowiIcons.svg('cart'); if (s) return s; } catch (e) { } return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 10.2a1.6 1.6 0 001.6 1.3h8.4a1.6 1.6 0 001.6-1.2L20.5 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>'; }
    function refresh() {
        if (busy) return; busy = true;
        try {
            const prof = D.getElementById('tab-profile'); if (!prof) return;
            const pf = prof.querySelector('.r3a-pf'); const ex = D.getElementById('splProf');
            if (!pf) { if (ex) ex.remove(); return; }
            const anchor = D.getElementById('hsProf') && D.getElementById('hsProf').previousElementSibling === pf ? D.getElementById('hsProf') : pf;
            const html = cardHTML();
            if (ex && ex.previousElementSibling === anchor) { if (ex.getAttribute('data-h') !== String(html.length) + C.summary(get(), lang())) { ex.outerHTML = html; const n = D.getElementById('splProf'); if (n) n.setAttribute('data-h', String(html.length) + C.summary(get(), lang())); } }
            else { if (ex) ex.remove(); anchor.insertAdjacentHTML('afterend', html); const n = D.getElementById('splProf'); if (n) n.setAttribute('data-h', String(html.length) + C.summary(get(), lang())); }
        } finally { busy = false; }
    }
    let RT = 0; const soon = () => { clearTimeout(RT); RT = setTimeout(refresh, 160); };
    ['lowi:shopplan', 'lowi:layout', 'lowi:companion', 'lowi:lang'].forEach(ev => window.addEventListener(ev, soon));
    D.addEventListener('visibilitychange', () => { if (!D.hidden) soon(); });
    /* Profile re-renders its own content: watch only that tab's direct children, and only re-add when the card is missing */
    function watch() {
        const prof = D.getElementById('tab-profile'); if (!prof || prof._splMo) return;
        prof._splMo = new MutationObserver(() => { if (!busy && !D.getElementById('splProf') && prof.querySelector('.r3a-pf')) soon(); else if (!busy) { const ex = D.getElementById('splProf'), hp = D.getElementById('hsProf'); if (ex && hp && ex.previousElementSibling !== hp && hp.previousElementSibling === prof.querySelector('.r3a-pf')) soon(); } });
        prof._splMo.observe(prof, { childList: true, subtree: true });
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => { watch(); soon(); }); else { watch(); soon(); }

    window.LowiShopPlan = { get, set, isSet: () => C.isSet(get()), summary: () => C.summary(get(), lang()), formHTML, readForm, saveForm, showErr, openEditor, refresh, t };
})();
