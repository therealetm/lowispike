/* LOWiSPIKE App Store prep (Nov 3, 2026, branch app-store-prep)
   Why: the iPhone app (Capacitor shell, capacitor.config.json + ios/) has to pass Apple's review. This file holds the small
   pieces that review needs and that the web app had no home for yet:
   - LowiConsent: asks once before a meal photo or a typed food name goes to Google Gemini (guideline 5.1.2). food-photo-ai.js
     calls LowiConsent.ask() and sends nothing on "Not now". The answer sits in localStorage (lowi.aiConsent.v1 = yes|no) and
     can be changed in Settings > About & info (home-settings-sleep-v2.js shows LowiStore.aboutHTML()).
   - LowiStore.openPrivacy(): the privacy policy (privacy.html) inside the app, with a close button, so the native app never
     leaves its only page. LowiStore.SUPPORT is the support contact shown in About & info and in privacy.html.
   - LowiStore.medNote(box): one quiet line "Food guidance, not medical advice" under a photo check result.
   - LowiStore.MIN_AGE: the youngest age the onboarding birthday step accepts (index.html paintOb). Change it here only.
   Works the same on the website; nothing here talks to a server. EN/DE/ES. */
(function () {
    'use strict';
    const W = window, D = document;
    const KEY = 'lowi.aiConsent.v1';
    const SUPPORT = 'therealetm@gmail.com';
    const MIN_AGE = 16;
    const L3 = () => { try { const l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en'; return l === 'de' || l === 'es' ? l : 'en'; } catch (e) { return 'en'; } };
    const T = (en, de, es) => { const l = L3(); return l === 'de' ? de : l === 'es' ? es : en; };
    const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const nm = t => { try { const B = W.LowiBirthCompanion; return B && B.withName ? B.withName(t) : t; } catch (e) { return t; } };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => MAP[c]);

    function css() {
        if (D.getElementById('lisStoreCss')) return;
        const st = D.createElement('style'); st.id = 'lisStoreCss';
        st.textContent = [
            '.lis-scrim{position:fixed;inset:0;z-index:2147483600;background:rgba(3,5,10,.72);display:flex;align-items:flex-end;justify-content:center;padding:0 0 env(safe-area-inset-bottom);opacity:0;transition:opacity .18s ease}',
            '.lis-scrim.in{opacity:1}',
            '.lis-card{width:100%;max-width:480px;max-height:92vh;overflow:auto;background:#0d1220;color:#eef2fa;border-radius:22px 22px 0 0;padding:22px 20px 20px;box-shadow:0 -10px 40px rgba(0,0,0,.5);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;transform:translateY(24px);transition:transform .2s ease}',
            '.lis-scrim.in .lis-card{transform:none}',
            '.lis-card h2{font-size:19px;line-height:1.25;margin:0 0 10px;font-weight:700}',
            '.lis-card p{margin:0 0 10px;color:#c9d2e3}',
            '.lis-card ul{margin:0 0 12px 18px;padding:0;color:#c9d2e3}',
            '.lis-card li{margin:0 0 4px}',
            '.lis-row{display:flex;gap:10px;margin-top:14px}',
            '.lis-b{flex:1;min-height:48px;border-radius:14px;border:1px solid rgba(255,255,255,.16);background:transparent;color:#eef2fa;font-family:inherit;font-size:15px;font-weight:600}',
            '.lis-b.pri{background:#caa15a;border-color:#caa15a;color:#141008}',
            '.lis-link{background:none;border:0;padding:0;color:#caa15a;text-decoration:underline;font:inherit;cursor:pointer}',
            '.lis-full{position:fixed;inset:0;z-index:2147483601;background:#03050a;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top)}',
            '.lis-full header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;color:#eef2fa;font:600 16px/1.2 -apple-system,system-ui,sans-serif}',
            '.lis-full header button{min-height:40px;padding:0 16px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#eef2fa;font-family:inherit;font-size:15px;font-weight:600}',
            '.lis-full iframe{flex:1;width:100%;border:0;background:#03050a}',
            '.lis-mednote{margin:10px 2px 0;font-size:12px;line-height:1.4;opacity:.7}',
            '.lis-about p{margin:0 0 8px}',
            '.lis-about .lis-ai{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 10px}',
            '.lis-about .lis-ai button{min-height:36px;padding:0 14px;border-radius:12px;border:1px solid rgba(202,161,90,.6);background:transparent;color:inherit;font-family:inherit;font-size:14px;font-weight:600;white-space:nowrap}'
        ].join('');
        (D.head || D.documentElement).appendChild(st);
    }

    /* ---------- AI consent ---------- */
    function get() { try { const v = localStorage.getItem(KEY); return v === 'yes' || v === 'no' ? v : ''; } catch (e) { return ''; } }
    function set(v) {
        try { if (v === 'yes' || v === 'no') localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) {}
        try { W.dispatchEvent(new CustomEvent('lowi:ai-consent', { detail: { value: get() } })); } catch (e) {}
        refreshAbout();
    }
    let pending = null;
    /* Resolves true (Allow) or false (Not now / closed). Asks only while there is no answer yet (or when forced from
       About & info); after that it follows the answer. */
    function ask(force) {
        const v = get();
        if (!force && v) return Promise.resolve(v === 'yes');
        if (pending) return pending;
        css();
        pending = new Promise(done => {
            const s = D.createElement('div'); s.className = 'lis-scrim'; s.setAttribute('data-noi18n', '');
            s.innerHTML = '<div class="lis-card" role="dialog" aria-modal="true" aria-labelledby="lisAiH">' +
                '<h2 id="lisAiH">' + esc(nm(T('Let Misty check your food with AI?', 'Darf Misty dein Essen mit KI prüfen?', '¿Misty puede revisar tu comida con IA?'))) + '</h2>' +
                '<p>' + esc(T('To recognise a meal, LOWiSPIKE sends it to Google Gemini, an AI service by Google:',
                    'Um ein Essen zu erkennen, schickt LOWiSPIKE es an Google Gemini, einen KI-Dienst von Google:',
                    'Para reconocer una comida, LOWiSPIKE la envía a Google Gemini, un servicio de IA de Google:')) + '</p>' +
                '<ul><li>' + esc(T('the meal photo you take or pick', 'das Foto vom Essen, das du machst oder auswählst', 'la foto de la comida que tomas o eliges')) + '</li>' +
                '<li>' + esc(T('or the food name you type', 'oder den Namen, den du eintippst', 'o el nombre del alimento que escribes')) + '</li></ul>' +
                '<p>' + esc(T('Nothing else: no name, email or health data, and Google does not get your account.',
                    'Sonst nichts: kein Name, keine E-Mail, keine Gesundheitsdaten, und Google bekommt dein Konto nicht.',
                    'Nada más: ni nombre, ni email, ni datos de salud, y Google no recibe tu cuenta.')) + '</p>' +
                '<p>' + esc(T('Without it you can still type and log every meal. You can change this any time in Settings > About & info.',
                    'Ohne KI kannst du trotzdem jedes Essen eintippen und speichern. Du kannst das jederzeit unter Einstellungen > Über & Hinweise ändern.',
                    'Sin ella puedes escribir y guardar cada comida. Puedes cambiarlo cuando quieras en Ajustes > Acerca de.')) +
                ' <button type="button" class="lis-link" data-lis="privacy">' + esc(T('Privacy policy', 'Datenschutz', 'Privacidad')) + '</button></p>' +
                '<div class="lis-row"><button type="button" class="lis-b" data-lis="no">' + esc(T('Not now', 'Jetzt nicht', 'Ahora no')) + '</button>' +
                '<button type="button" class="lis-b pri" data-lis="yes">' + esc(T('Allow', 'Erlauben', 'Permitir')) + '</button></div></div>';
            const finish = ok => {
                set(ok ? 'yes' : 'no');
                s.classList.remove('in'); setTimeout(() => s.remove(), 200);
                pending = null; done(ok);
            };
            s.addEventListener('click', ev => {
                const b = ev.target.closest && ev.target.closest('[data-lis]');
                if (!b) { if (ev.target === s) finish(false); return; }
                ev.preventDefault(); ev.stopPropagation();
                const k = b.getAttribute('data-lis');
                if (k === 'privacy') return openPrivacy();
                finish(k === 'yes');
            });
            (D.body || D.documentElement).appendChild(s);
            requestAnimationFrame(() => s.classList.add('in'));
        });
        return pending;
    }

    /* ---------- privacy policy inside the app ---------- */
    function openPrivacy() {
        css();
        if (D.querySelector('.lis-full')) return;
        const f = D.createElement('div'); f.className = 'lis-full'; f.setAttribute('data-noi18n', ''); f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true');
        const ttl = esc(T('Privacy policy', 'Datenschutzerklärung', 'Política de privacidad'));
        f.innerHTML = '<header><span>' + ttl + '</span><button type="button" data-lis="close">' + esc(T('Close', 'Schließen', 'Cerrar')) + '</button></header>' +
            '<iframe src="privacy.html#' + L3() + '" title="' + ttl + '"></iframe>';
        f.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-lis="close"]'); if (b) { ev.preventDefault(); ev.stopPropagation(); f.remove(); } });
        (D.body || D.documentElement).appendChild(f);
    }

    /* ---------- "not medical advice" under a photo check ---------- */
    function medNote(box) {
        if (!box || !box.parentNode) return;
        css();
        const host = box.parentNode;
        if (Array.prototype.some.call(host.children, c => c.classList && c.classList.contains('lis-mednote'))) return;
        const p = D.createElement('p'); p.className = 'lis-mednote'; p.setAttribute('data-noi18n', '');
        p.textContent = T('Food guidance from estimates, not medical advice. Talk to your doctor about your health.',
            'Ernährungs-Tipps aus Schätzungen, keine medizinische Beratung. Sprich mit deiner Ärztin oder deinem Arzt über deine Gesundheit.',
            'Orientación alimentaria basada en estimaciones, no consejo médico. Habla con tu médico sobre tu salud.');
        host.insertBefore(p, box.nextSibling);
    }

    /* ---------- Settings > About & info block ---------- */
    const IMPRINT = 'https://versteckmich.de/emanwel/impressum';
    function aboutHTML() {
        css();
        const on = get() === 'yes';
        return '<div class="lis-about" data-noi18n>' +
            '<div class="lis-ai"><span>' + esc(T('AI food check (Google Gemini)', 'KI-Essensprüfung (Google Gemini)', 'Revisión con IA (Google Gemini)')) + ': <b>' +
            esc(on ? T('on', 'an', 'activada') : T('off', 'aus', 'desactivada')) + '</b></span>' +
            '<button type="button" data-lis-about="ai">' + esc(on ? T('Turn off', 'Ausschalten', 'Desactivar') : T('Turn on', 'Einschalten', 'Activar')) + '</button></div>' +
            '<p><button type="button" class="lis-link" data-lis-about="privacy">' + esc(T('Privacy policy', 'Datenschutzerklärung', 'Política de privacidad')) + '</button>' +
            /* Nov 8 2026 (owner: "Alles bezüglich meiner Impressum findest du hier"): the legal notice (§ 5 DDG) one tap away */
            ' · <a class="lis-link" href="' + IMPRINT + '" target="_blank" rel="noopener">' + esc(T('Legal notice', 'Impressum', 'Aviso legal')) + '</a></p>' +
            '<p>' + esc(T('Help or questions:', 'Hilfe oder Fragen:', 'Ayuda o preguntas:')) + ' <a href="mailto:' + SUPPORT + '?subject=LOWiSPIKE">' + SUPPORT + '</a></p></div>';
    }
    function refreshAbout() {
        D.querySelectorAll('.lis-about').forEach(el => { const t = D.createElement('div'); t.innerHTML = aboutHTML(); el.replaceWith(t.firstChild); });
    }
    D.addEventListener('click', ev => {
        const b = ev.target.closest && ev.target.closest('[data-lis-about]');
        if (!b) return;
        ev.preventDefault(); ev.stopPropagation();
        const k = b.getAttribute('data-lis-about');
        if (k === 'privacy') return openPrivacy();
        if (k === 'ai') { if (get() === 'yes') set('no'); else ask(true); return; }
        if (k === 'copylog') {
            const txt = (W.LowiCrashLog && W.LowiCrashLog.text) ? W.LowiCrashLog.text() : '';
            const say = ok => { const m = b.parentNode && b.parentNode.querySelector('[data-lis-copied]'); if (m) m.textContent = ok ? T('Copied.', 'Kopiert.', 'Copiado.') : T('Could not copy.', 'Kopieren ging nicht.', 'No se pudo copiar.'); };
            const old = () => { try { const ta = D.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; D.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length); const ok = D.execCommand('copy'); ta.remove(); say(ok); } catch (e) { say(false); } };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => say(true), old); else old();
        }
    }, true);

    W.LowiConsent = { get, set, ask, KEY };
    W.LowiStore = { IMPRINT, openPrivacy, medNote, aboutHTML, SUPPORT, MIN_AGE, native: () => !!W.LIS_NATIVE };
})();
