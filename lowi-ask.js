/* lowi-ask.js (22 Nov 2026, Emmanuel: "apply all the AI stuff ... for the free stuff without me having to do nothing").
   The app's own AI chat, in the companion's voice (supabase/functions/lowi-ai, the project's free Gemini key, daily limits in
   public.ai_usage). It replaces the Custom GPT that OpenAI deletes in December:
     - every "Deep analyze" link to chatgpt.com/g/... (scanner, meal result, product, Cook card) opens this chat instead, with the
       meal or product the person was looking at as context, and asks for the analysis at once;
     - Misty's card has "Talk to Misty" (misty-hub.js);
     - a photo button sends a meal photo; three quick chips: make it insulin-friendly, is it a spike, a recipe idea.
   23 Nov 2026 (Emmanuel: "when I closed it, I tried to find it again, but that chat history was gone ... I need those chat
   histories to stay like ChatGPT"): every conversation is kept on this phone (localStorage, never on the server), newest first:
   "Chats" lists them, a tap reopens one, ✕ deletes one. A new Deep analyze or "New chat" starts a new conversation and keeps the
   old one. Photos are kept as small previews. Up to 40 chats of 60 messages each; the oldest go first when the phone is full. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiAsk) return;
    /* 25 Nov 2026: a shared chat's id from the link, read the moment this file runs (the app may change the address afterwards) */
    const SHARED_ID = (() => { try { const m = /[?&]chat=([A-Za-z0-9_-]{6,16})/.exec(location.search); return m ? m[1] : ''; } catch (e) { return ''; } })();
    const AI_LINK = (() => { try { return /[?&]ai=1\b/.test(location.search); } catch (e) { return false; } })();
    const SHARED_HASH = (() => { try { return location.hash; } catch (e) { return ''; } })();
    const RPC = 'https://vnfwmifmsfecascwaody.supabase.co/rest/v1/rpc/';
    const FN = 'https://vnfwmifmsfecascwaody.supabase.co/functions/v1/lowi-ai', PUBKEY = 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd', KEY = 'lowi.ask.v1';
    const L = () => { let l = ''; try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || D.documentElement.lang || 'en'; } catch (e) { l = 'en'; } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const W3 = { title: ['Talk to {n}', 'Mit {n} reden', 'Habla con {n}'], ph: ['Ask {n}…', 'Frag {n}…', 'Pregunta a {n}…'], back: ['Back', 'Zurück', 'Atrás'],
        hello: ['Hi, I’m {n}! Ask me anything about insulin-friendly food, or send me a photo of your meal.', 'Hi, ich bin {n}! Frag mich alles über insulinfreundliches Essen oder schick mir ein Foto von deinem Essen.', '¡Hola, soy {n}! Pregúntame sobre comida apta para la insulina o mándame una foto.'],
        c1: ['Make it insulin-friendly', 'Mach es insulinfreundlich', 'Hazlo apto para la insulina'], c2: ['Will this spike?', 'Gibt das einen Spike?', '¿Esto da un pico?'], c3: ['Quick recipe idea', 'Schnelle Rezeptidee', 'Idea de receta rápida'],
        analyze: ['Please analyze this for me: is it insulin-friendly, and what is one easy improvement?', 'Bitte analysier das für mich: Ist es insulinfreundlich, und was ist eine einfache Verbesserung?', 'Analízalo por favor: ¿es apto para la insulina y cuál es una mejora fácil?'],
        photo: ['What do you see, and is it insulin-friendly?', 'Was siehst du, und ist es insulinfreundlich?', '¿Qué ves y es apto para la insulina?'],
        limit: ['{n} is resting for today. Back tomorrow!', '{n} ruht sich für heute aus. Morgen wieder!', '{n} descansa por hoy. ¡Mañana vuelve!'], fail: ['I could not answer just now. Check your connection and try again.', 'Ich konnte gerade nicht antworten. Prüf deine Verbindung und versuch es nochmal.', 'No pude responder ahora. Inténtalo de nuevo.'],
        signin: ['Sign in to talk to {n}.', 'Melde dich an, um mit {n} zu reden.', 'Inicia sesión para hablar con {n}.'], note: ['Answers come from Google’s free AI. Please don’t share private health details. Not medical advice.', 'Antworten kommen von Googles kostenloser KI. Bitte teile keine privaten Gesundheitsdaten. Keine medizinische Beratung.', 'Las respuestas vienen de la IA gratuita de Google. No compartas datos privados de salud. No es consejo médico.'],
        photo2: ['Can I eat this? Is it insulin-friendly?', 'Kann ich das essen? Ist es insulinfreundlich?', '¿Puedo comer esto? ¿Es apto para la insulina?'], pvHint: ['Ask about this photo, then send', 'Frag etwas zu diesem Foto und sende', 'Pregunta sobre esta foto y envía'], photoFail: ['I could not open that photo. Try another one or take a screenshot of it.', 'Ich konnte das Foto nicht öffnen. Probier ein anderes oder mach einen Screenshot davon.', 'No pude abrir esa foto. Prueba otra o haz una captura.'],
        share: ['Share', 'Teilen', 'Compartir'], shareT: ['Talk to {n} on LOWiSPIKE', 'Mit {n} reden auf LOWiSPIKE', 'Habla con {n} en LOWiSPIKE'], shareTx: ['Look what {n} told me about my food:', 'Schau, was mir {n} zu meinem Essen gesagt hat:', 'Mira lo que {n} me dijo sobre mi comida:'], copied: ['Link copied', 'Link kopiert', 'Enlace copiado'], shotPh: ['📷 Photo', '📷 Foto', '📷 Foto'], sharedH: ['Shared chat', 'Geteilter Chat', 'Chat compartido'],
        seeIt: ['Check it out', 'Schau es dir an', 'Míralo'], watchOn: ['Watch on {p}', 'Auf {p} ansehen', 'Ver en {p}'], inFy: ['Open it in For You', 'In For You öffnen', 'Abrir en Para ti'], inChat: ['Open the chat', 'Den Chat öffnen', 'Abrir el chat'],
        nothing: ['Ask something first, then share the chat.', 'Frag zuerst etwas, dann teil den Chat.', 'Pregunta algo primero y luego comparte el chat.'], shareFail: ['The share link could not be saved. Check your connection and tap share again.', 'Der Link konnte nicht gespeichert werden. Prüf deine Verbindung und tipp nochmal auf Teilen.', 'No se pudo guardar el enlace. Revisa tu conexión y vuelve a compartir.'],
        thinking: ['{n} is thinking…', '{n} denkt nach…', '{n} está pensando…'], clear: ['New chat', 'Neuer Chat', 'Nuevo chat'],
        chats: ['Chats', 'Chats', 'Chats'], none: ['No chats yet. Your conversations with {n} stay here.', 'Noch keine Chats. Deine Gespräche mit {n} bleiben hier.', 'Aún no hay chats. Tus conversaciones con {n} se quedan aquí.'],
        untitled: ['Chat with {n}', 'Chat mit {n}', 'Chat con {n}'], del: ['Delete chat', 'Chat löschen', 'Borrar chat'] };
    const t = (k, n) => W3[k][['en', 'de', 'es'].indexOf(L())].replace(/\{n\}/g, n || name());
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    /* the companion's name exactly as the rest of the app shows it (misty-hub.js companionName: its birth name, a name you typed, the saved
       herb name, then the app's default); 25 Nov 2026 (Emmanuel: "Misty is the name of my specific companion, not the universal one.
       Everyone has their own companion name"): someone without an account (a visitor from a shared link) talks to LOWiSPIKE AI, never Misty */
    function name() {
        const pk = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; };
        if (!signedIn()) { try { const B = W.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); if (c && c.name) return pk(c.name); } } catch (e) {} return 'LOWiSPIKE AI'; }
        let auto = ''; try { auto = pk(W.LowiHerbIdentity && W.LowiHerbIdentity.autoName && W.LowiHerbIdentity.autoName()); } catch (e) {}
        const typed = v => { v = pk(v); return v && v !== auto ? v : ''; };
        let n = ''; try { const B = W.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pk(c && c.name); } } catch (e) {}
        if (!n) try { const tg = W.LowiHerbTamagotchi, p = tg && tg.readPrefs && tg.readPrefs(); n = typed(p && p.name); } catch (e) {}
        if (!n) try { const R = W.LowiR2, st = R && R.S && R.S(); n = typed(st && st.herb && st.herb.name); } catch (e) {}
        return n || 'Misty';
    }
    function sign() { try { const B = W.LowiBirthCompanion, c = B && B.has && B.has() ? B.get() : null; return String((c && (c.sign || c.zodiac)) || '').slice(0, 20); } catch (e) { return ''; } }
    let msgs = [], ctx = '', el = null, busy = false, cur = '', view = 'chat';
    const HK = 'lowi.ask.chats.v1', MAXC = 40, MAXM = 60;
    let book = { cur: '', list: [] };
    try { const b = JSON.parse(localStorage.getItem(HK) || 'null'); if (b && Array.isArray(b.list)) book = { cur: String(b.cur || ''), list: b.list.filter(x => x && x.id && Array.isArray(x.m)).slice(0, MAXC) }; } catch (e) {}
    /* the one conversation the old version kept for the session comes along once */
    try { const o = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (o && Array.isArray(o.m) && o.m.length && !book.list.length) book.list.push({ id: 'c' + Date.now().toString(36), at: Date.now(), c: String(o.c || ''), m: o.m.slice(-MAXM) }); sessionStorage.removeItem(KEY); } catch (e) {}
    { const c0 = book.list.find(x => x.id === book.cur) || null; if (c0) { cur = c0.id; msgs = c0.m.slice(); ctx = c0.c || ''; } }
    function titleOf(c) {
        const u = (c.m || []).find(m => m.role === 'user' && m.text && m.text !== t('analyze') && m.text !== t('photo'));
        const s0 = String(u ? u.text : (c.c || '').split('\n')[0] || '').replace(/\s+/g, ' ').trim();
        return s0 ? s0.slice(0, 70) : t('untitled');
    }
    function save() {
        for (let tries = 0; tries < 6; tries++) {
            try { localStorage.setItem(HK, JSON.stringify(book)); return; } catch (e) { if (book.list.length > 1) book.list.pop(); else return; }
        }
    }
    const keep = () => {
        const m = msgs.filter(x => !x.wait).slice(-MAXM).map(x => x.img ? { role: x.role, text: x.text, img: x.img } : { role: x.role, text: x.text });
        if (!m.length) return;
        let c = book.list.find(x => x.id === cur);
        if (!c) { cur = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); c = { id: cur }; book.list.unshift(c); }
        c.at = Date.now(); c.c = ctx; c.m = m;
        book.list = [c].concat(book.list.filter(x => x !== c)).slice(0, MAXC); book.cur = cur; save();
    };
    /* a fresh conversation; the one before stays in Chats */
    function fresh(context) { msgs = []; ctx = String(context || ''); cur = ''; book.cur = ''; save(); }
    /* 25 Nov 2026: never waits more than 2.5 s for the sign-in library (it can hang on iPhones); then the saved sign-in is used */
    const within = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
    async function token() {
        try { const x = W.LowiR2 && W.LowiR2.X && W.LowiR2.X(); const sb = x && await within(x.client(), 2500); const r = sb && await within(sb.auth.getSession(), 2500); const s = r && r.data && r.data.session; if (s && s.access_token) return s.access_token; } catch (e) {}
        try { const a = JSON.parse(localStorage.getItem('lowi.auth') || 'null'); if (a && a.access_token) return a.access_token; } catch (e) {}
        return '';
    }
    async function call(body) {
        const tk = await token();
        const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUBKEY, Authorization: 'Bearer ' + (tk || PUBKEY) }, body: JSON.stringify(body) });
        let j = {}; try { j = await r.json(); } catch (e) {}
        if (!r.ok || !j.ok) { const e = new Error(j.error || 'fail'); e.code = j.error || (r.status === 401 ? 'sign_in' : 'fail'); throw e; }
        return j;
    }
    function css() {
        if (D.getElementById('lwAskCss')) return; const s = D.createElement('style'); s.id = 'lwAskCss';
        s.textContent = '#lwAsk{position:fixed;inset:0;z-index:2147483100;display:flex;flex-direction:column;background:#05070c;color:#f3f6fb;font:16px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif}' +
            '#lwAsk .ak-h{flex:none;display:flex;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;border-bottom:1px solid rgba(255,255,255,.08)}' +
            '#lwAsk .ak-b{display:inline-flex;align-items:center;gap:2px;min-height:44px;padding:0 12px 0 6px;border-radius:999px;border:0;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-weight:600;cursor:pointer}' +
            '#lwAsk .ak-b svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
            '#lwAsk .ak-t{flex:1;text-align:center;font-weight:700;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
            '#lwAsk .ak-new{min-height:44px;padding:0 12px;border-radius:999px;border:0;background:none;color:#9fd8ff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}' +
            '#lwAsk .ak-l{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px}' +
            '#lwAsk .ak-m{max-width:84%;padding:10px 14px;border-radius:20px;white-space:pre-wrap;overflow-wrap:anywhere}' +
            '#lwAsk .ak-m.u{align-self:flex-end;background:linear-gradient(180deg,#2e7cf6,#1f63d6);border-bottom-right-radius:6px}' +
            '#lwAsk .ak-m.a{align-self:flex-start;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-bottom-left-radius:6px}' +
            '#lwAsk .ak-m img{display:block;max-width:220px;max-height:260px;border-radius:14px;margin-bottom:6px;object-fit:cover}' +
            '#lwAsk .ak-m.w{opacity:.7;font-style:italic}' +
            '#lwAsk .ak-c{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:6px 14px}#lwAsk .ak-c::-webkit-scrollbar{display:none}' +
            '#lwAsk .ak-c button{flex:none;min-height:38px;padding:0 14px;border-radius:999px;border:1px solid rgba(159,216,255,.35);background:rgba(159,216,255,.08);color:#bfe6ff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}' +
            '#lwAsk .ak-pv{flex:none;display:flex;align-items:center;gap:10px;margin:0 12px;padding:8px;border-radius:14px;background:rgba(255,255,255,.07)}#lwAsk .ak-pv[hidden]{display:none}#lwAsk .ak-pv img{width:56px;height:56px;object-fit:cover;border-radius:10px}#lwAsk .ak-pv span{flex:1;font-size:14px;opacity:.8}#lwAsk .ak-pv button{width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:16px}' +
            '#lwAsk .ak-f{flex:none;display:flex;gap:8px;align-items:flex-end;padding:8px 12px calc(env(safe-area-inset-bottom,0px) + 10px);border-top:1px solid rgba(255,255,255,.08)}' +
            '#lwAsk .ak-f textarea{flex:1;min-width:0;min-height:46px;max-height:120px;resize:none;border-radius:22px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:16px;padding:11px 16px}' +
            '#lwAsk .ak-i{flex:none;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;display:grid;place-items:center;cursor:pointer}' +
            '#lwAsk .ak-i svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#lwAsk .ak-i.s{background:linear-gradient(180deg,#bfe6ff,#7cc4ff);color:#05070c;border:0}#lwAsk .ak-i:disabled{opacity:.45}' +
            '#lwAsk .ak-n{padding:0 16px 6px;color:rgba(255,255,255,.45);font-size:12px;text-align:center}' +
            '#lwAsk .ak-new[data-v=chats]{color:#fff;background:rgba(255,255,255,.08)}#lwAsk.ak-list .ak-c,#lwAsk.ak-list .ak-f,#lwAsk.ak-list .ak-n{display:none}' +
            '#lwAsk .ak-r{display:flex;align-items:stretch;gap:6px}#lwAsk .ak-ro{flex:1;min-width:0;min-height:56px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;padding:10px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#fff;font:inherit;text-align:left;cursor:pointer}' +
            '#lwAsk .ak-ro b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}#lwAsk .ak-ro small{color:rgba(255,255,255,.55);font-size:13px}' +
            '#lwAsk .ak-rd{flex:none;width:48px;border-radius:16px;border:0;background:rgba(255,255,255,.04);color:rgba(255,255,255,.6);font-size:16px;cursor:pointer}#lwAsk .ak-e{margin:24px 8px;color:rgba(255,255,255,.6);text-align:center}' +
            /* 25 Nov 2026 (Emmanuel: "make it our Galaxy interface, but blur it just like Apple iOS would ... the back button is covered by
               another back button ... Talk to Misty is not even in the middle ... not sleek ... a picture ... like in the community ... see our
               companion ... when it's thinking or typing, it's moving"): the world shows through, blurred; one back arrow; the companion and
               its name in the middle; three round icons; glass bubbles; a photo as a post card; the companion beside its answers, moving
               while it thinks. */
            '#lwAsk{background:radial-gradient(120% 55% at 50% -5%,rgba(120,95,255,.26),transparent 60%),radial-gradient(90% 50% at 85% 105%,rgba(40,170,255,.2),transparent 62%),rgba(6,8,18,.58);-webkit-backdrop-filter:blur(30px) saturate(1.6);backdrop-filter:blur(30px) saturate(1.6)}' +
            '#lwAsk .ak-h{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;border-bottom:0;background:linear-gradient(rgba(6,8,18,.55),rgba(6,8,18,0))}' +
            '#lwAsk .ak-b{width:44px;height:44px;padding:0;justify-content:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.1);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}#lwAsk .ak-b span{display:none}' +
            '#lwAsk .ak-t{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;min-width:0}#lwAsk .ak-t .ak-hav{display:grid;place-items:center;width:34px;height:34px}#lwAsk .ak-b{justify-self:start}#lwAsk .ak-ic{justify-self:end}#lwAsk .ak-t em{font-style:normal;font-weight:700;font-size:16px;line-height:1.2}' +
            '#lwAsk .ak-ic{display:flex;gap:6px}#lwAsk .ak-new{width:40px;height:40px;min-height:0;padding:0;display:grid;place-items:center;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.1)!important;color:#fff}' +
            '#lwAsk .ak-new svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#lwAsk .ak-new.on{background:rgba(159,216,255,.3)!important}' +
            '#lwAsk .ak-av{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;overflow:visible}#lwAsk .ak-av svg,#lwAsk .ak-hav svg{width:100%;height:100%;overflow:visible}' +
            '#lwAsk .ak-orb{width:70%;height:70%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#9fe0ff 35%,#4a7dff 75%);box-shadow:0 0 14px rgba(120,190,255,.8)}' +
            '#lwAsk .ak-row{display:flex;align-items:flex-end;gap:8px;max-width:90%}#lwAsk .ak-row .ak-m{max-width:none}' +
            '#lwAsk .ak-m.a{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}' +
            '#lwAsk .ak-m.u{background:linear-gradient(160deg,#5b7cff,#7a4dff);box-shadow:0 6px 20px rgba(90,90,255,.3)}' +
            '#lwAsk .ak-m.ph{padding:6px;max-width:72%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,.35)}#lwAsk .ak-m.ph img{max-width:100%;width:260px;max-height:340px;border-radius:17px;margin:0}#lwAsk .ak-m.ph span{display:block;padding:8px 8px 4px}' +
            '#lwAsk .ak-think .ak-av{animation:akBob 1.1s ease-in-out infinite}#lwAsk .ak-dots{display:inline-flex;gap:5px;padding:4px 2px}#lwAsk .ak-dots i{width:7px;height:7px;border-radius:50%;background:#cfe9ff;animation:akDot 1.2s infinite ease-in-out}#lwAsk .ak-dots i:nth-child(2){animation-delay:.15s}#lwAsk .ak-dots i:nth-child(3){animation-delay:.3s}' +
            '@keyframes akBob{0%,100%{transform:translateY(0) scale(1);filter:drop-shadow(0 0 4px rgba(140,200,255,.5))}50%{transform:translateY(-4px) scale(1.06);filter:drop-shadow(0 0 12px rgba(140,200,255,.95))}}@keyframes akDot{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}' +
            '@media (prefers-reduced-motion:reduce){#lwAsk .ak-think .ak-av,#lwAsk .ak-dots i{animation:none}}' +
            '#lwAsk .ak-f{border-top:0;background:linear-gradient(rgba(6,8,18,0),rgba(6,8,18,.6))}#lwAsk .ak-f textarea{background:rgba(255,255,255,.1);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}#lwAsk .ak-i{background:rgba(255,255,255,.1)}' +
            /* 25 Nov 2026 (Emmanuel: "the disclaimer looks very unaesthetic ... ChatGPT doesn't do that ... If I share a screenshot"): the note and the
               quick questions show only on a fresh chat, small and quiet; once you talk, the screen is just the conversation */
            /* 25 Nov 2026, later (Emmanuel: "that annoying disclaimer is still there"): the note is not on the chat screen at all any more; it sits
               at the bottom of the Chats list (where your chats are), and the quick questions show only on a fresh chat */
            '#lwAsk .ak-n{display:none}#lwAsk:not(.ak-empty) .ak-c{display:none}#lwAsk .ak-lnote{margin:18px 8px 4px;font-size:11.5px;color:rgba(255,255,255,.4);text-align:center}' +
            '#lwAsk .ak-toast{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);transform:translate(-50%,-8px);padding:10px 16px;border-radius:999px;background:rgba(20,24,36,.92);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:14px;font-weight:600;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:5;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#lwAsk .ak-toast.on{opacity:1;transform:translate(-50%,0)}' +
            '#lwAsk .ak-cards{display:flex;flex-direction:column;gap:6px;margin-top:10px}#lwAsk .ak-card{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 10px;border-radius:14px;border:1px solid rgba(159,216,255,.28);background:rgba(120,170,255,.12);color:#fff;font:inherit;text-align:left;cursor:pointer}' +
            '#lwAsk .ak-ci{flex:none;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);font-size:14px}#lwAsk .ak-ct{flex:1;min-width:0;display:flex;flex-direction:column}#lwAsk .ak-ct b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#lwAsk .ak-ct small{font-size:12.5px;color:#bfe6ff}#lwAsk .ak-cg{font-size:22px;opacity:.6}' +
            '#lwAsk .ak-c button{background:rgba(255,255,255,.08);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}';
        D.head.appendChild(s);
    }
    const IC = { back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>', cam: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>', send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>' };
    function paint() {
        if (!el) return; const l = el.querySelector('.ak-l');
        el.classList.toggle('ak-list', view === 'list'); el.classList.toggle('ak-empty', !msgs.length); const cbn = el.querySelector('[data-ak=chats]'); if (cbn) cbn.classList.toggle('on', view === 'list');
        if (view === 'list') {
            l.innerHTML = book.list.length ? book.list.map(c => '<div class="ak-r"><button type="button" class="ak-ro" data-ak="pick" data-id="' + esc(c.id) + '"><b>' + esc(titleOf(c)) + '</b><small>' + esc(when(c.at)) + '</small></button><button type="button" class="ak-rd" data-ak="del" data-id="' + esc(c.id) + '" aria-label="' + esc(t('del')) + '">✕</button></div>').join('') : '<p class="ak-e">' + esc(t('none')) + '</p>';
            l.insertAdjacentHTML('beforeend', '<p class="ak-lnote">' + esc(t('note')) + '</p>');   /* the note lives here (25 Nov 2026) */
            l.scrollTop = 0; return;
        }
        const all = [{ role: 'model', text: t('hello') }].concat(msgs);
        const av = avatar(), lastA = all.map(m => m.role).lastIndexOf('model');
        l.innerHTML = all.map((m, i) => {
            if (m.role === 'user') return m.img ? '<div class="ak-m u ph"><img alt="" src="' + esc(m.img) + '"><span>' + esc(m.text) + '</span></div>' : '<div class="ak-m u">' + esc(m.text) + '</div>';
            if (m.wait) return '<div class="ak-row ak-think"><span class="ak-av">' + av + '</span><div class="ak-m a"><span class="ak-dots" aria-label="' + esc(m.text) + '"><i></i><i></i><i></i></span></div></div>';
            return '<div class="ak-row"><span class="ak-av">' + (i === lastA ? av : '') + '</span><div class="ak-m a">' + esc(m.text) + (m.links && m.links.length ? '<div class="ak-cards" data-mi="' + (i - 1) + '">' + cardsHTML(m.links) + '</div>' : '') + '</div></div>';
        }).join('');
        l.scrollTop = l.scrollHeight;
    }
    function when(ms) { try { const d = new Date(ms), loc = { en: 'en-GB', de: 'de-DE', es: 'es-ES' }[L()] || 'en-GB'; return d.toLocaleDateString(loc, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
    async function send(text, img) {
        text = String(text || '').trim(); if ((!text && !img) || busy) return;
        busy = true; const f = el && el.querySelector('.ak-f'); if (f) f.querySelectorAll('button,textarea').forEach(x => { x.disabled = true; });
        const um = { role: 'user', text: text || t('photo') }; if (img) um.img = img.url; msgs.push(um);
        msgs.push({ role: 'model', text: t('thinking'), wait: true }); paint();
        try {
            const j = await call({ action: 'ask', lang: L(), name: name(), sign: sign(), context: ctx, image: img ? img.b64 : undefined, messages: msgs.filter(m => !m.wait).slice(-12).map(m => ({ role: m.role, text: m.text })) });
            msgs.pop(); const am = { role: 'model', text: j.text || '…' }; const lk = cleanLinks(j.links); if (lk.length) am.links = lk; msgs.push(am);
        } catch (e) { msgs.pop(); msgs.push({ role: 'model', text: e.code === 'limit' ? t('limit') : e.code === 'sign_in' ? t('signin') : t('fail') }); }
        busy = false; keep(); paint(); if (f) f.querySelectorAll('button,textarea').forEach(x => { x.disabled = false; });
    }
    /* a picked photo: shrunk to 1024 px JPEG before it leaves the phone.
       25 Nov 2026 (Emmanuel: "uploading a picture in here doesn't work ... I take a picture of a TikTok video and I want to ask my AI if
       this fits, if I can eat it"): the file picker is put in the page while it is open (a picker left outside the page is dropped by
       iPhones before the photo comes back, so nothing happened); the photo waits above the text box with ✕ until you send, so you can
       ask your own question with it (with no question it asks "Can I eat this?"); a photo that cannot be read says so. */
    let PEND = null;
    function pend(p) { PEND = p; const v = el && el.querySelector('.ak-pv'); if (!v) return; v.hidden = !p; v.innerHTML = p ? '<img alt="" src="' + esc(p.url) + '"><span>' + esc(t('pvHint')) + '</span><button type="button" data-ak="unpend" aria-label="✕">✕</button>' : ''; if (p) { const ta = el.querySelector('textarea'); if (ta) ta.focus(); } }
    function pickPhoto() {
        const i = D.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0'; D.body.appendChild(i);
        const gone = () => { setTimeout(() => { try { i.remove(); } catch (e) {} }, 1000); };
        i.addEventListener('cancel', gone);
        i.onchange = () => { const f = i.files && i.files[0]; gone(); if (!f) return; const u = URL.createObjectURL(f), im = new Image();
            im.onerror = () => { URL.revokeObjectURL(u); msgs.push({ role: 'model', text: t('photoFail') }); paint(); };
            im.onload = () => { try { const s = Math.min(1, 1024 / Math.max(im.width, im.height)), c = D.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                const d = c.toDataURL('image/jpeg', 0.82); URL.revokeObjectURL(u);
                const k = Math.min(1, 240 / Math.max(im.width, im.height)), tc = D.createElement('canvas'); tc.width = Math.round(im.width * k); tc.height = Math.round(im.height * k); tc.getContext('2d').drawImage(im, 0, 0, tc.width, tc.height);
                pend({ url: tc.toDataURL('image/jpeg', 0.7), b64: d.split(',')[1] }); } catch (e) { msgs.push({ role: 'model', text: t('photoFail') }); paint(); } };
            im.src = u; };
        i.click();
    }
    function sendNow(v) { const p = PEND; if (!String(v || '').trim() && !p) return; pend(null); if (GUEST) return guestSend(v, p); send(String(v || '').trim() || (p ? t('photo2') : ''), p || undefined); }
    /* 25 Nov 2026 (Emmanuel: "I want a share button for the chat ... people who aren't signed in yet, they see the chat ... they can type
       and everything. But the moment they send a message ... they go to our app store ... to sign in. The people who already have an
       account, it will be their version ... and their Tamagotchi"): Share sends a link with the conversation in it (texts only, the last
       8 messages; photos show as "📷 Photo"; nothing is stored on a server). Opened by someone signed in: the conversation becomes a new
       chat of theirs, with their own companion, to go on with. Opened by someone without an account: the chat shows and they can type;
       sending keeps their question, opens the store page to get LOWiSPIKE, and after signing in the companion answers it. */
    const b64u = x => btoa(unescape(encodeURIComponent(x))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const unb64u = x => decodeURIComponent(escape(atob(String(x).replace(/-/g, '+').replace(/_/g, '/'))));
    /* the companion as Home shows it (its own drawing), else a glowing orb */
    function avatar() {
        try { const live = D.querySelector('#spBubble .sp-home-herb svg.tmg-plant') || D.querySelector('#spBubble svg.tmg-plant');
            if (live) { const c = live.cloneNode(true); c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id')); c.setAttribute('aria-hidden', 'true'); return c.outerHTML; } } catch (e) {}
        return '<i class="ak-orb" aria-hidden="true"></i>';
    }
    /* 25 Nov 2026 (Emmanuel: "why is my companion name in the link? I wanted it to be a link that shares the chat, just like a ChatGPT
       link"): the conversation is kept on the server (public.share_chat: signed in, 40 a day) and the link is only its short id,
       lowispike.com/?chat=ID. No name in it; photos go along as their small previews. */
    /* 25 Nov 2026 (Emmanuel: "if it's suggesting the user to try that, then it should also link them ... click here to check it out ... directly
       to the TikTok video"): what the companion recommends from the community comes with cards: ▶ Watch on TikTok / YouTube (the original
       video), or open the post in For You, or the public chat */
    function cleanLinks(l) { return (Array.isArray(l) ? l : []).slice(0, 3).map(x => ({ kind: x && x.kind === 'chat' ? 'chat' : 'fy', id: String(x && x.id || '').slice(0, 80), url: /^https:\/\/([a-z0-9-]+\.)*(tiktok\.com|youtube\.com|youtu\.be|instagram\.com)\//i.test(String(x && x.url || '')) ? String(x.url).slice(0, 400) : '', plat: String(x && x.plat || '').slice(0, 20), label: String(x && x.label || '').slice(0, 60) })).filter(x => x.url || x.id || x.kind === 'chat'); }
    function cardsHTML(l) { return (l || []).map((x, i) => { const ext = x.url, where = /youtu/i.test(x.url) ? 'YouTube' : /instagram/i.test(x.url) ? 'Instagram' : 'TikTok';
        return '<button type="button" class="ak-card" data-ak="go" data-i="' + i + '"><span class="ak-ci" aria-hidden="true">' + (ext ? '▶' : x.kind === 'chat' ? '💬' : '✨') + '</span><span class="ak-ct"><b>' + esc(x.label || t('seeIt')) + '</b><small>' + esc(ext ? t('watchOn').replace('{p}', where) : x.kind === 'chat' ? t('inChat') : t('inFy')) + '</small></span><span class="ak-cg" aria-hidden="true">›</span></button>'; }).join(''); }
    function goLink(x) { if (!x) return;
        if (x.url) { try { W.open(x.url, '_blank', 'noopener'); } catch (e) { location.href = x.url; } return; }
        if (GUEST) return guestSend('');
        close(); setTimeout(() => { try { if (x.kind === 'chat') { if (W.LowiOpenChat) W.LowiOpenChat(); } else if (W.LowiOpenPost) W.LowiOpenPost(x.id); } catch (e) {} }, 300); }
    function shareData() { let n = 0; return { v: 2, m: msgs.filter(x => !x.wait).slice(-12).map(x => { const o = [x.role === 'user' ? 'u' : 'a', String(x.text || '').slice(0, 1200), 0]; if (x.img && n < 4 && String(x.img).length < 60000) { o[2] = 1; o[3] = x.img; n++; } if (x.links && x.links.length) { while (o.length < 4) o.push(''); o[4] = x.links; } return o; }) }; }
    /* 25 Nov 2026, later (Emmanuel: "I clicked on sharing so that it creates a link. Didn't happen ... It gets stuck"): iPhones open the share
       sheet only right after a tap, and the link used to be fetched from the server first. Now the short id is made here, the share sheet
       (or "Link copied") comes at once inside the tap, and the chat is stored meanwhile; nothing is disabled or waited on. If storing
       fails, the chat says so and the link is not handed out again. */
    function newId() { const a = new Uint8Array(10), c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'; try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 10; i++) a[i] = Math.random() * 256; } return Array.from(a, x => c[x & 63]).join(''); }
    async function store(id, data) {
        const tk = await token(); if (!tk) throw Object.assign(new Error('sign_in'), { code: 'sign_in' });
        const r = await within(fetch(RPC + 'share_chat', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUBKEY, Authorization: 'Bearer ' + tk }, body: JSON.stringify({ p_data: data, p_id: id }) }), 15000);
        if (!r || !r.ok) throw Object.assign(new Error('fail'), { code: r && r.status === 401 ? 'sign_in' : 'fail' });
        return id;
    }
    function toast(msg) { if (!el) return; let x = el.querySelector('.ak-toast'); if (!x) { x = D.createElement('div'); x.className = 'ak-toast'; x.setAttribute('role', 'status'); el.appendChild(x); } x.textContent = msg; x.classList.add('on'); clearTimeout(x.__t); x.__t = setTimeout(() => x.classList.remove('on'), 1800); }
    /* 25 Nov 2026, later (Emmanuel: "I should be able to share the app's AI, not just the chat room ... I don't want to send my chat history or
       my own Tamagotchi ... I want to send this chat, this lowispike chat. That's the whole point"): Share sends the link to the app's AI,
       lowispike.com/?ai=1, from any screen of the chat. Whoever opens it gets a fresh chat: with their own companion when they have an
       account, else they can type and sending takes them to the store page. Nothing of your chats goes with it. */
    function shareChat() {
        const u = 'https://lowispike.com/?ai=1';
        const copy = () => { try { navigator.clipboard.writeText(u).then(() => toast(t('copied')), () => toast(u)); } catch (e) { toast(u); } };
        try { if (navigator.share) { navigator.share({ url: u }).catch(err => { if (!err || err.name !== 'AbortError') copy(); }); return; } } catch (e) { }
        copy();
    }
    async function shareUrl() { const id = newId(); await store(id, shareData()); return 'https://lowispike.com/?chat=' + id; }
    let GUEST = false;
    const signedIn = () => { try { const j = JSON.parse(localStorage.getItem('lowi.auth') || 'null'), u = j && j.user; return !!(u && !u.is_anonymous && u.email); } catch (e) { return false; } };
    function toMsgs(d) {
        if (!d || !Array.isArray(d.m)) return null;
        return d.m.slice(-12).map(x => { const o = { role: x[0] === 'u' ? 'user' : 'model', text: String(x[1] || '').slice(0, 1200) }; const lk = cleanLinks(x[4]); if (lk.length) o.links = lk; if (x[2] && typeof x[3] === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(x[3])) o.img = x[3]; else if (x[2]) o.text = t('shotPh') + (o.text ? ' · ' + o.text : ''); return o; }).filter(x => x.text || x.img);
    }
    async function sharedIn() {
        let d = null;
        if (SHARED_ID) { try { const r = await fetch(RPC + 'get_shared_chat', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUBKEY, Authorization: 'Bearer ' + PUBKEY }, body: JSON.stringify({ p_id: SHARED_ID }) }); if (r.ok) d = await r.json(); } catch (e) { d = null; } }
        else { try { const m = /#misty=([A-Za-z0-9_-]+)/.exec(SHARED_HASH); if (m) d = JSON.parse(unb64u(m[1])); } catch (e) { d = null; } }   /* links shared before (the chat in the link) */
        const out = toMsgs(d); if (!out) return null;
        try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])(chat=[A-Za-z0-9_-]+|misty=1)&?/g, '$1').replace(/[?&]$/, '') + (/^#misty=/.test(location.hash) ? '' : location.hash)); } catch (e) {}
        return out;
    }
    async function boot() {
        const sh = await sharedIn();
        if (sh) {
            if (signedIn()) { fresh(''); msgs = sh; keep(); open({}); return; }
            GUEST = true; msgs = sh; open({}); return;
        }
        if (AI_LINK) {   /* a shared link to the app's AI: a fresh chat */
            try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])ai=1&?/, '$1').replace(/[?&]$/, '') + location.hash); } catch (e) {}
            if (signedIn()) { fresh(''); view = 'chat'; open({}); return; }
            GUEST = true; msgs = []; open({}); return;
        }
        /* a question asked before signing in, from a shared chat */
        let q = ''; try { q = localStorage.getItem('lowi.ask.after') || ''; } catch (e) {}
        if (q && signedIn()) { try { localStorage.removeItem('lowi.ask.after'); } catch (e) {} setTimeout(() => open({ ask: q }), 2500); }
    }
    function guestSend(v, p) {
        try { if (String(v || '').trim() || p) localStorage.setItem('lowi.ask.after', String(v || '').trim() || t('photo2')); } catch (e) {}
        close();
        try { if (W.LowiStorePage && W.LowiStorePage.open) { W.LowiStorePage.open(); return; } } catch (e) {}
        location.href = '/';
    }
    function open(o) {
        o = o || {}; css();
        if (o.context != null && o.context !== ctx) fresh(String(o.context || '').slice(0, 3000));
        view = 'chat';
        if (!el) {
            el = D.createElement('div'); el.id = 'lwAsk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
            el.innerHTML = '<div class="ak-h"><button type="button" class="ak-b" data-ak="close" data-no-bx aria-label="Back">' + IC.back + '<span></span></button><b class="ak-t"></b><div class="ak-ic"><button type="button" class="ak-new ak-sh" data-ak="share" aria-label="Share"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6"/></svg></button><button type="button" class="ak-new" data-ak="chats" data-v="chats"></button><button type="button" class="ak-new" data-ak="new"></button></div></div><div class="ak-l" aria-live="polite"></div>' +
                '<div class="ak-c"><button type="button" data-ak="chip" data-c="c1"></button><button type="button" data-ak="chip" data-c="c2"></button><button type="button" data-ak="chip" data-c="c3"></button></div><p class="ak-n"></p>' +
                '<div class="ak-pv" hidden></div><div class="ak-f"><button type="button" class="ak-i" data-ak="photo" aria-label="Photo">' + IC.cam + '</button><textarea rows="1" enterkeyhint="send"></textarea><button type="button" class="ak-i s" data-ak="send" aria-label="Send">' + IC.send + '</button></div>';
            el.addEventListener('click', e => { const b = e.target.closest('[data-ak]'); if (!b) return; const k = b.dataset.ak, ta = el.querySelector('textarea');
                if (k === 'close') { if (view === 'list') { view = 'chat'; paint(); } else close(); }
                else if (k === 'new') { if (!busy) { fresh(''); view = 'chat'; paint(); } }
                else if (k === 'chats') { view = view === 'list' ? 'chat' : 'list'; paint(); }
                else if (k === 'pick') { const c = book.list.find(x => x.id === b.dataset.id); if (c && !busy) { cur = c.id; msgs = c.m.slice(); ctx = c.c || ''; book.cur = cur; save(); view = 'chat'; paint(); } }
                else if (k === 'del') { book.list = book.list.filter(x => x.id !== b.dataset.id); if (cur === b.dataset.id) { msgs = []; ctx = ''; cur = ''; book.cur = ''; } save(); paint(); }
                else if (k === 'photo') pickPhoto();
                else if (k === 'unpend') pend(null);
                else if (k === 'share') shareChat();
                else if (k === 'go') { const box = b.closest('[data-mi]'), mm = box && msgs[+box.dataset.mi]; goLink(mm && mm.links && mm.links[+b.dataset.i]); }
                else if (k === 'send') { const v = ta.value; ta.value = ''; sendNow(v); } else if (k === 'chip') { if (GUEST) guestSend(t(b.dataset.c)); else send(t(b.dataset.c)); } });
            el.querySelector('textarea').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const ta = e.target, v = ta.value; ta.value = ''; sendNow(v); } });
            D.body.appendChild(el);
        }
        el.querySelector('.ak-b span').textContent = t('back'); el.querySelector('.ak-t').innerHTML = '<span class="ak-hav">' + avatar() + '</span><em>' + esc(name()) + '</em>';
        const nb = el.querySelector('[data-ak=new]'), cb = el.querySelector('[data-ak=chats]'), sb = el.querySelector('[data-ak=share]');
        nb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'; nb.setAttribute('aria-label', t('clear'));
        cb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>'; cb.setAttribute('aria-label', t('chats'));
        if (sb) sb.setAttribute('aria-label', t('share'));
        el.querySelector('textarea').placeholder = t('ph'); el.querySelector('.ak-n').textContent = t('note');
        el.querySelectorAll('[data-c]').forEach(b => { b.textContent = t(b.dataset.c); });
        el.hidden = false; paint();
        if (o.ask && !busy) send(o.ask);
    }
    function close() { if (el) { el.remove(); el = null; } }
    /* every link to the old Custom GPT opens this chat instead (window capture: before gpt-open.js) */
    W.addEventListener('click', e => {
        const a = e.target && e.target.closest ? e.target.closest('a[href*="chatgpt.com/g/"], a[href*="chat.openai.com/g/"]') : null; if (!a) return;
        e.preventDefault(); e.stopImmediatePropagation();
        const c = a.getAttribute('data-gpt-deep') || '';
        open({ context: c, ask: c ? t('analyze') : '' });
    }, true);
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && el) close(); });
    W.LowiAsk = { open, close, call, shareUrl, _shareData: shareData };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(boot, 600)); else setTimeout(boot, 600);
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
