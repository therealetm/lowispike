/* pw-reset.js: Nov 19 2026 (Emmanuel: "it says they should message me ... everyone thinks I can see their password").
   Forgot password? on the sign-in screen sends a Supabase reset link to that email. Nobody, not Emmanuel either, sees or
   sets anyone's password. The link opens the app signed in for that one account; the app then asks for a new password
   (the existing "Forgot your password?" sheet, data-r2p="pwforgot"). The answer never says whether an email has an account.
   Supabase setup it needs: Auth > URL Configuration > Redirect URLs contains the app URL; Auth > SMTP set (the built-in
   mailer only reaches the project team). */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiPwReset) return;
    const KEY = 'lowi.pwreset';
    const t = s => (W.LowiLang && W.LowiLang.t ? W.LowiLang.t(s) : s);
    const appUrl = () => W.location.origin + W.location.pathname;

    /* 1. coming back from the email: grab the one-time tokens before anything else reads or clears the address bar */
    try {
        const h = String(W.location.hash || '');
        if (/type=recovery/.test(h) || /error_code=otp_expired/.test(h)) {
            const q = new URLSearchParams(h.replace(/^#/, ''));
            if (q.get('access_token') && q.get('refresh_token')) W.sessionStorage.setItem(KEY, JSON.stringify({ a: q.get('access_token'), r: q.get('refresh_token') }));
            else W.sessionStorage.setItem(KEY, JSON.stringify({ bad: 1 }));
            W.history.replaceState(null, '', appUrl());
        }
    } catch (e) { }

    async function client() { const x = W.LowiR2 && W.LowiR2.X && W.LowiR2.X(); if (!x) throw new Error('offline'); return x.client(); }
    function say(form, msg, ok) { const el = form && form.querySelector('.r2-err'); if (!el) return; el.textContent = t(msg); el.style.color = ok ? '#8FE6C8' : ''; }

    /* 2. the button on the sign-in screen */
    D.addEventListener('click', async e => {
        const b = e.target && e.target.closest && e.target.closest('[data-r2a="forgot"]'); if (!b) return;
        e.preventDefault(); e.stopImmediatePropagation();
        const root = b.closest('.r2-start') || D, form = root.querySelector('form.r2-form'), inp = form && form.querySelector('input[name="email"]');
        const em = String(inp && inp.value || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { say(form, 'Type your email above, then tap Forgot password? again.'); if (inp) inp.focus(); return; }
        if (b.disabled) return; b.disabled = true;
        try {
            const sb = await client();
            const r = await sb.auth.resetPasswordForEmail(em, { redirectTo: appUrl() });
            if (r && r.error && /rate|too many/i.test(r.error.message || '')) { say(form, 'Too many tries. Wait a minute and try again.'); b.disabled = false; return; }
            say(form, 'Check your email. If this address has an account, a link to set a new password is on its way (look in spam too).', true);
        } catch (err) { say(form, 'No connection. Check your internet and try again.'); }
        setTimeout(() => { b.disabled = false; }, 30000);
    }, true);

    /* 3. after the link: sign in with the one-time tokens, reload once, then open "set a new password" */
    let tries = 0;
    async function finish() {
        let st = null; try { st = JSON.parse(W.sessionStorage.getItem(KEY) || 'null'); } catch (e) { }
        if (!st) return;
        if (st.bad) { W.sessionStorage.removeItem(KEY); setTimeout(() => { try { W.LowiR2.toast(t('That reset link is old or used. Ask for a new one.')); } catch (e) { } }, 2500); return; }
        if (st.a) {
            try { const sb = await client(); const r = await sb.auth.setSession({ access_token: st.a, refresh_token: st.r }); if (r.error) throw r.error; }
            catch (e) { if (++tries < 20) return void setTimeout(finish, 500); W.sessionStorage.removeItem(KEY); return; }
            W.sessionStorage.setItem(KEY, JSON.stringify({ ask: 1 })); W.location.reload(); return;
        }
        if (st.ask) {
            const R = W.LowiR2;
            if (!R || (R.gateUp && R.gateUp()) || !R.sheet) { if (++tries < 40) setTimeout(finish, 500); return; }
            W.sessionStorage.removeItem(KEY);
            const x = D.createElement('button'); x.setAttribute('data-r2p', 'pwforgot'); x.hidden = true; D.body.appendChild(x); x.click(); x.remove();
        }
    }
    if (D.readyState === 'complete') setTimeout(finish, 1200); else W.addEventListener('load', () => setTimeout(finish, 1200));
    W.LowiPwReset = { finish };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
