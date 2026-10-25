/* LOWiSPIKE shopping rhythm, page layer (Oct 17, 2026). Rules live in shop-plan-core.js (LowiShopPlanCore).
   - formHTML(): the "Your grocery shopping" form. The setup (onboarding) shows it as its last step; Profile > About you
     opens the same form in a sheet, so it can be changed any time.
   - Setup (opts.first): one plain line on what it's for. The editor in Profile also explains the shopping glow.
   - Oct 25 (Eman): the person picks a bubble: once / twice / 3 times / more per week, or it varies. Weekdays are optional and
     pick the bubble for them (Tue + Sat = twice a week); a summary line says it back. Shop name optional. Nothing is pre-picked.
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
            over: 'GROCERY SHOPPING', h: 'Healthy days start in the shop', p: 'How often do you usually go grocery shopping?',
            perWeek: 'Per week', fl: { '1': 'Once', '2': 'Twice', '3': '3 times', more: 'More', varies: 'It varies' },
            daysHint: 'Tap your usual days and we count them for you.', daysQ: 'Usual days', opt: '(optional)', store: 'Usual shop', storePh: 'e.g. Edeka on Main Street',
            does: 'Scan two different products on a shopping day and your worlds glow brighter until about a day after your next shop is due, then slowly fade back to normal.',
            first: 'So the app knows when to reward your shopping trip. No pressure: change it any time in Profile \u203a About you.',
            note: 'Missing a shop never means you ate badly. Change it any time in Profile \u203a About you.',
            need: 'Pick how often you shop, or tap Later.', save: 'Save', later: 'Later', saved: 'Shopping rhythm saved.', profT: 'Grocery shopping', profSet: 'Set my rhythm', profEdit: 'Change', close: 'Close'
        },
        de: {
            over: 'EINKAUFEN', h: 'Gesunde Tage beginnen im Laden', p: 'Wie oft gehst du normalerweise einkaufen?',
            perWeek: 'Pro Woche', fl: { '1': 'Einmal', '2': 'Zweimal', '3': 'Dreimal', more: '\u00d6fter', varies: 'Unterschiedlich' },
            daysHint: 'Tipp deine \u00fcblichen Tage an, wir z\u00e4hlen f\u00fcr dich mit.', daysQ: 'Meist an diesen Tagen', opt: '(freiwillig)', store: 'Dein Laden', storePh: 'z. B. Edeka in der Hauptstra\u00dfe',
            does: 'Scannst du an einem Einkaufstag zwei verschiedene Produkte, leuchten deine Welten heller, bis etwa einen Tag nach deinem n\u00e4chsten Einkauf, und werden dann langsam wieder normal.',
            first: 'So wei\u00df die App, wann sie dich f\u00fcr deinen Einkauf belohnt. Kein Druck: \u00c4ndern kannst du es jederzeit unter Profil \u203a \u00dcber dich.',
            note: 'Ein verpasster Einkauf hei\u00dft nie, dass du schlecht gegessen hast. \u00c4ndern kannst du es jederzeit unter Profil \u203a \u00dcber dich.',
            need: 'W\u00e4hl aus, wie oft du einkaufst, oder tippe auf Sp\u00e4ter.', save: 'Speichern', later: 'Sp\u00e4ter', saved: 'Einkaufsrhythmus gespeichert.', profT: 'Einkaufen', profSet: 'Rhythmus eintragen', profEdit: '\u00c4ndern', close: 'Schlie\u00dfen'
        },
        es: {
            over: 'LA COMPRA', h: 'Los d\u00edas sanos empiezan en la tienda', p: '\u00bfCon qu\u00e9 frecuencia sueles hacer la compra?',
            perWeek: 'Por semana', fl: { '1': 'Una vez', '2': 'Dos veces', '3': 'Tres veces', more: 'M\u00e1s', varies: 'Var\u00eda' },
            daysHint: 'Toca tus d\u00edas habituales y los contamos por ti.', daysQ: 'D\u00edas habituales', opt: '(opcional)', store: 'Tu tienda', storePh: 'p. ej. Edeka de la calle Mayor',
            does: 'Si escaneas dos productos distintos el d\u00eda de la compra, tus mundos brillar\u00e1n m\u00e1s hasta un d\u00eda despu\u00e9s de tu siguiente compra. Luego vuelven poco a poco a la normalidad.',
            first: 'As\u00ed la app sabe cu\u00e1ndo premiarte por tu compra. Sin presi\u00f3n: puedes cambiarlo cuando quieras en Perfil \u203a Sobre ti.',
            note: 'Saltarte una compra no significa que hayas comido mal. Puedes cambiarlo cuando quieras en Perfil \u203a Sobre ti.',
            need: 'Elige cada cu\u00e1nto compras, o toca M\u00e1s tarde.', save: 'Guardar', later: 'M\u00e1s tarde', saved: 'Ritmo de compra guardado.', profT: 'La compra', profSet: 'Definir mi ritmo', profEdit: 'Cambiar', close: 'Cerrar'
        }
    };
    const t = k => (TX[lang()] || TX.en)[k] || TX.en[k] || k;
    const fl = f => ((TX[lang()] || TX.en).fl || TX.en.fl)[f] || f;

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
            '<div class="r2-obsub spl-sub spl-fq">' + esc(t('perWeek')) + '</div>' +
            '<div class="spl-freqs" role="radiogroup" aria-label="' + esc(t('perWeek')) + '"' + (p.was ? ' data-spl-was="' + p.was + '"' : '') + '>' + C.FREQS.map(f => { const on = p.freq === f; return '<button type="button" role="radio" class="r2-chip spl-freq' + (on ? ' on' : '') + '" aria-checked="' + on + '" aria-label="' + esc(C.freqLabel(f, lang())) + '" data-spl-freq="' + f + '">' + esc(fl(f)) + '</button>'; }).join('') + '</div>' +
            '<div class="r2-obsub spl-sub">' + esc(t('daysQ')) + ' <span>' + esc(t('opt')) + '</span></div>' +
            '<p class="spl-hint">' + esc(t('daysHint')) + '</p>' +
            '<div class="r2-chips spl-days" role="group" aria-label="' + esc(t('daysQ')) + '">' + order.map(i => '<button type="button" class="r2-chip spl-day' + (p.days.indexOf(i) >= 0 ? ' on' : '') + '" aria-pressed="' + (p.days.indexOf(i) >= 0) + '" data-spl-day="' + i + '">' + esc(names[i]) + '</button>').join('') + '</div>' +
            '<p class="spl-sum" aria-live="polite">' + (p.freq ? esc(C.summary({ freq: p.freq, days: p.days, was: p.was }, lang())) : '') + '</p>' +
            '<label class="r2-fl spl-store"><span>' + esc(t('store')) + ' ' + esc(t('opt')) + '</span><input id="' + id + 'Store" maxlength="60" autocomplete="off" placeholder="' + esc(t('storePh')) + '" value="' + esc(p.store) + '"></label>' +
            /* Oct 23 (Emmanuel): in the setup a new user doesn't know worlds or scanning yet, so the setup says only what it's for,
               in one line. The glow rule ('does') and the no-guilt note stay in the Profile editor, where they make sense. */
            (opts.first ? '<p class="spl-note spl-first">' + esc(t('first')) + '</p>' :
                (window.LowiGroceryCore ? '<p class="spl-note spl-does">' + esc(t('does')) + '</p>' : '') +
                '<p class="spl-note">' + esc(t('note')) + '</p>') +
            '<div class="r2-err spl-err" id="' + id + 'Err" role="alert"></div></div>';
    }
    /* reads a form; returns {ok, plan, empty}. Nothing picked = not set (fine for "Later") */
    function formState(f) {
        const b = f.querySelector('.spl-freq.on');
        const days = Array.prototype.map.call(f.querySelectorAll('.spl-day.on'), x => +x.getAttribute('data-spl-day'));
        const box = f.querySelector('.spl-freqs');
        return { freq: b ? b.getAttribute('data-spl-freq') : (days.length ? C.freqFromDays(days) : null), days, was: box && box.getAttribute('data-spl-was') ? +box.getAttribute('data-spl-was') : null };
    }
    function readForm(root) {
        root = root || D;
        const f = root.querySelector('[data-spl-form]'); if (!f) return { ok: false, empty: true, plan: null };
        const st = formState(f);
        const store = (f.querySelector('.spl-store input') || {}).value || '';
        return { ok: !!st.freq, empty: !st.freq, plan: { freq: st.freq, days: st.days, was: st.was, store } };
    }
    function showErr(root) {
        const f = (root || D).querySelector('[data-spl-form]'); if (!f) return;
        const e = f.querySelector('.spl-err'); if (e) { e.textContent = t('need'); e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
        const b = f.querySelector('.spl-freq'); if (b) try { b.focus(); } catch (x) { }
    }
    /* the summary line under the days follows every tap ("Twice a week · usually Tue, Sat") */
    function syncSum(f) {
        const st = formState(f), o = f.querySelector('.spl-sum');
        const txt = st.freq ? C.summary({ freq: st.freq, days: st.days, was: st.was }, lang()) : '';
        if (o && o.textContent !== txt) o.textContent = txt;
        const e = f.querySelector('.spl-err'); if (e && st.freq && e.textContent) e.textContent = '';
    }
    function pickFreq(f, val) {
        Array.prototype.forEach.call(f.querySelectorAll('.spl-freq'), x => { const on = x.getAttribute('data-spl-freq') === val; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    }
    /* save from a form: true when saved */
    function saveForm(root) { const r = readForm(root); if (!r.ok) { showErr(root); return false; } set(Object.assign({}, r.plan, { skipped: false })); return true; }

    /* weekday chips toggle in place (both in setup and in the editor) */
    D.addEventListener('click', e => {
        /* a weekday tap counts the picked days into the bubble (Tue + Sat -> Twice) */
        const b = e.target.closest('[data-spl-day]'), bf = b && b.closest('[data-spl-form]');
        if (bf) {
            const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
            const n = C.freqFromDays(formState(bf).days); if (n) pickFreq(bf, n);
            syncSum(bf); return;
        }
        /* a bubble tap; picked days that no longer match it are cleared, so the two never disagree */
        const q = e.target.closest('[data-spl-freq]'), qf = q && q.closest('[data-spl-form]');
        if (qf) {
            const val = q.getAttribute('data-spl-freq'); pickFreq(qf, val);
            const days = formState(qf).days;
            if (days.length && C.freqFromDays(days) !== val) Array.prototype.forEach.call(qf.querySelectorAll('.spl-day.on'), x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
            const box = qf.querySelector('.spl-freqs'); if (box && val !== 'varies') box.removeAttribute('data-spl-was');
            syncSum(qf); return;
        }
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
