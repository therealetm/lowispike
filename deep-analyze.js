/* LOWiSPIKE Deep analyze (Oct 21, 2026)
   Why: E-man: "Refine the Scan flow: remove the 'log meal' option so it's purely for identification. Keep 'deep analyze' for when
   products aren't found, and try to integrate ChatGPT directly into that button instead of just opening the app."
   Deep analyze used to be a plain link that left the app for the custom GPT. Now it works inside the scanner: a photo of the pack
   (front or nutrition label) goes to the app's own photo AI (food-photo-ai.js -> Supabase function "food-photo", the same one Fuel's
   Snap uses, same daily allowance) and the answer comes back right here: spike first, then what it is and its numbers.
   It never logs anything (Scan identifies; meals are logged in Fuel). The GPT stays one tap away, now with the question already
   written for it (barcode / what the AI saw), for swaps and the long answer, and as the way out when the photo check can't run.
   API window.LowiDeep {open({code}), close(), isOpen(), gptURL(q)}. EN / DE / ES. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiDeep = api;
})(typeof window !== 'undefined' ? window : globalThis, function (W) {
    'use strict';
    const D = W.document;
    const GPT = 'https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike';
    const STR = {
        en: { title: 'Deep analyze', close: 'Close', intro: 'Take a photo of the pack: the front, or the nutrition label. The AI reads it right here and tells you if it is likely to spike.',
            shoot: 'Take a photo', pick: 'Choose a photo', reading: 'Reading the pack…', again: 'Scan another product', retry: 'Try another photo', gpt: 'Ask the LOWiSPIKE GPT', gptS: 'Opens ChatGPT with your question written',
            nothing: 'I couldn’t make out a food or drink in that photo. Try the front of the pack or the nutrition label, in good light.',
            limit: 'You’ve used today’s 3 photo checks. New ones at midnight. The GPT can still answer.', sign_in: 'Sign in again to use the photo check. The GPT can still answer.',
            off: 'The photo check isn’t available right now. The GPT can still answer.', net: 'No connection to the photo check. Try again, or ask the GPT.', slow: 'The photo check took too long. Try again, or ask the GPT.',
            busy: 'Too many photos right now. Try again in a few minutes, or ask the GPT.', failed: 'Something went wrong reading that photo. Try again, or ask the GPT.',
            v_low: 'Low spike likely', v_mid: 'Medium spike likely', v_high: 'High spike likely', est: 'AI estimate from your photo. The label on the pack wins.', code: 'Barcode {c}', idOnly: 'Scan only checks. To log what you eat, use Log meal in Fuel.',
            qCode: 'Deep analyze this product for blood sugar: barcode {c}. Is it likely to spike my insulin? What should I watch in it, and what is a lower-spike swap?',
            qName: 'Deep analyze this product for blood sugar: {n}. Is it likely to spike my insulin? What should I watch in it, and what is a lower-spike swap?',
            qNone: 'I want to deep analyze a grocery product for blood sugar. I’ll send you a photo of the pack. Is it likely to spike my insulin, and what is a lower-spike swap?' },
        de: { title: 'Deep analyze', close: 'Schließen', intro: 'Fotografier die Packung: die Vorderseite oder die Nährwerttabelle. Die KI liest sie direkt hier und sagt dir, ob sie wahrscheinlich einen Spike macht.',
            shoot: 'Foto aufnehmen', pick: 'Foto wählen', reading: 'Ich lese die Packung…', again: 'Anderes Produkt scannen', retry: 'Anderes Foto versuchen', gpt: 'LOWiSPIKE GPT fragen', gptS: 'Öffnet ChatGPT mit deiner fertigen Frage',
            nothing: 'Ich erkenne auf dem Foto kein Essen oder Getränk. Versuch die Vorderseite oder die Nährwerttabelle, bei gutem Licht.',
            limit: 'Du hast heute deine 3 Foto-Checks genutzt. Neue gibt es um Mitternacht. Der GPT kann trotzdem antworten.', sign_in: 'Melde dich neu an, um den Foto-Check zu nutzen. Der GPT kann trotzdem antworten.',
            off: 'Der Foto-Check ist gerade nicht verfügbar. Der GPT kann trotzdem antworten.', net: 'Keine Verbindung zum Foto-Check. Versuch es nochmal oder frag den GPT.', slow: 'Der Foto-Check hat zu lange gedauert. Versuch es nochmal oder frag den GPT.',
            busy: 'Gerade zu viele Fotos. Versuch es in ein paar Minuten nochmal oder frag den GPT.', failed: 'Beim Lesen des Fotos ging etwas schief. Versuch es nochmal oder frag den GPT.',
            v_low: 'Wahrscheinlich kleiner Spike', v_mid: 'Wahrscheinlich mittlerer Spike', v_high: 'Wahrscheinlich großer Spike', est: 'KI-Schätzung aus deinem Foto. Das Etikett auf der Packung zählt.', code: 'Barcode {c}', idOnly: 'Scan prüft nur. Was du isst, trägst du in Fuel unter Mahlzeit eintragen ein.',
            qCode: 'Analysiere dieses Produkt für meinen Blutzucker: Barcode {c}. Macht es wahrscheinlich einen Insulin-Spike? Worauf sollte ich achten, und was ist eine Alternative mit weniger Spike?',
            qName: 'Analysiere dieses Produkt für meinen Blutzucker: {n}. Macht es wahrscheinlich einen Insulin-Spike? Worauf sollte ich achten, und was ist eine Alternative mit weniger Spike?',
            qNone: 'Ich will ein Produkt aus dem Supermarkt für meinen Blutzucker analysieren. Ich schicke dir ein Foto der Packung. Macht es wahrscheinlich einen Insulin-Spike, und was ist eine Alternative mit weniger Spike?' },
        es: { title: 'Deep analyze', close: 'Cerrar', intro: 'Haz una foto del envase: el frente o la tabla nutricional. La IA la lee aquí mismo y te dice si es probable que dispare tu azúcar.',
            shoot: 'Hacer foto', pick: 'Elegir foto', reading: 'Leyendo el envase…', again: 'Escanear otro producto', retry: 'Probar otra foto', gpt: 'Preguntar al GPT de LOWiSPIKE', gptS: 'Abre ChatGPT con tu pregunta escrita',
            nothing: 'No distingo comida ni bebida en esa foto. Prueba con el frente del envase o la tabla nutricional, con buena luz.',
            limit: 'Ya usaste los 3 análisis de fotos de hoy. Hay nuevos a medianoche. El GPT aún puede responder.', sign_in: 'Vuelve a iniciar sesión para usar el análisis de fotos. El GPT aún puede responder.',
            off: 'El análisis de fotos no está disponible ahora. El GPT aún puede responder.', net: 'Sin conexión con el análisis de fotos. Inténtalo de nuevo o pregunta al GPT.', slow: 'El análisis tardó demasiado. Inténtalo de nuevo o pregunta al GPT.',
            busy: 'Demasiadas fotos ahora. Inténtalo en unos minutos o pregunta al GPT.', failed: 'Algo falló al leer la foto. Inténtalo de nuevo o pregunta al GPT.',
            v_low: 'Pico bajo probable', v_mid: 'Pico medio probable', v_high: 'Pico alto probable', est: 'Estimación de la IA a partir de tu foto. Manda la etiqueta del envase.', code: 'Código {c}', idOnly: 'Escanear solo comprueba. Para registrar lo que comes, usa Registrar comida en Fuel.',
            qCode: 'Analiza a fondo este producto para mi azúcar en sangre: código de barras {c}. ¿Es probable que dispare mi insulina? ¿Qué debo vigilar y qué alternativa con menos pico hay?',
            qName: 'Analiza a fondo este producto para mi azúcar en sangre: {n}. ¿Es probable que dispare mi insulina? ¿Qué debo vigilar y qué alternativa con menos pico hay?',
            qNone: 'Quiero analizar un producto del supermercado para mi azúcar en sangre. Te mando una foto del envase. ¿Es probable que dispare mi insulina, y qué alternativa con menos pico hay?' }
    };
    const lang = () => { try { return (W.LowiLang.get() || 'en').slice(0, 2); } catch (e) { return ((D && D.documentElement.lang) || 'en').slice(0, 2); } };
    const s = k => (STR[lang()] || STR.en)[k] || STR.en[k] || '';
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const IC = { x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>',
        pic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M4 16l4.5-4.5 4 4 2.5-2.5L20 18"/><circle cx="15.5" cy="9.5" r="1.5"/></svg>',
        spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/></svg>',
        chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>' };

    function gptBase() { try { const g = W.LowiVitalsBridge && W.LowiVitalsBridge.gpt; if (g && /^https:\/\/chatgpt\.com\/g\//.test(g)) return g; } catch (e) {} return GPT; }
    /* the question rides along as ?q= so the user does not have to type it again */
    function gptURL(q) { const b = gptBase(); return q ? b + (b.indexOf('?') < 0 ? '?' : '&') + 'q=' + encodeURIComponent(String(q).slice(0, 600)) : b; }
    function question(o) {
        if (o && o.name) return s('qName').replace('{n}', o.name);
        if (o && o.code) return s('qCode').replace('{c}', o.code);
        return s('qNone');
    }
    const gptBtn = q => '<a class="da-gpt" href="' + esc(gptURL(q)) + '" target="_blank" rel="noopener">' + IC.spark + '<span><b>' + esc(s('gpt')) + '</b><small>' + esc(s('gptS')) + '</small></span>' + IC.chev + '</a>';

    /* photo -> JPEG data URL, long side 1024 px (enough to read a label, small enough for the function) */
    function shrink(file) {
        return new Promise((res, rej) => {
            const url = URL.createObjectURL(file), img = new Image();
            img.onload = () => {
                try {
                    const k = Math.min(1, 1024 / Math.max(img.naturalWidth, img.naturalHeight)), cv = D.createElement('canvas');
                    cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
                    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
                    const out = cv.toDataURL('image/jpeg', 0.8); cv.width = 0; cv.height = 0; URL.revokeObjectURL(url); res(out);
                } catch (e) { URL.revokeObjectURL(url); rej(e); }
            };
            img.onerror = () => { URL.revokeObjectURL(url); const e = new Error('failed'); e.code = 'failed'; rej(e); };
            img.src = url;
        });
    }

    let el = null, ctx = {}, back = null, run = 0;
    function view(html) { if (el) { el.querySelector('.da-body').innerHTML = html; const b = el.querySelector('.da-scroll'); if (b) b.scrollTop = 0; } }
    function leftLine() {
        try { const S = W.LowiMealSnap, t = S && S.leftText ? S.leftText() : ''; if (t) return '<p class="da-left">' + esc(t) + '</p>'; } catch (e) {}
        return '';
    }
    function intro() {
        view('<p class="da-intro">' + esc(s('intro')) + '</p>' + (ctx.code ? '<p class="da-code">' + esc(s('code').replace('{c}', ctx.code)) + '</p>' : '') +
            '<div class="da-acts"><button type="button" class="da-btn da-main" data-da="shoot">' + IC.cam + '<span>' + esc(s('shoot')) + '</span></button>' +
            '<button type="button" class="da-btn" data-da="pick">' + IC.pic + '<span>' + esc(s('pick')) + '</span></button></div>' + leftLine() +
            gptBtn(question(ctx)) + '<p class="da-id">' + esc(s('idOnly')) + '</p>');
    }
    function fail(code) {
        const msg = STR.en[code] && code !== 'title' ? s(code) : s('failed');
        view('<p class="da-msg" role="alert">' + esc(msg) + '</p><div class="da-acts">' + (code === 'limit' || code === 'off' || code === 'sign_in' ? '' : '<button type="button" class="da-btn da-main" data-da="again-photo">' + IC.cam + '<span>' + esc(s('retry')) + '</span></button>') + '</div>' +
            gptBtn(question(ctx)));
    }
    function result(m) {
        const S = W.LowiMealSnap, bs = m.bs || 'mid';
        const card = S && S.cardHTML ? S.cardHTML(m) : '<b class="ms-name">' + esc(m.name) + '</b>';
        view('<div class="da-verdict da-' + esc(bs) + '" role="status"><i aria-hidden="true"></i><b>' + esc(s('v_' + bs)) + '</b></div>' + card +
            '<p class="da-est">' + esc(s('est')) + '</p>' + leftLine() +
            '<div class="da-acts"><button type="button" class="da-btn da-main" data-da="close">' + IC.x.replace('aria-hidden', 'class="da-sm" aria-hidden') + '<span>' + esc(s('again')) + '</span></button></div>' +
            gptBtn(question({ name: m.name, code: ctx.code })) + '<p class="da-id">' + esc(s('idOnly')) + '</p>');
    }
    async function analyse(file) {
        const my = ++run;
        view('<div class="da-wait" role="status"><i class="da-spin" aria-hidden="true"></i><span>' + esc(s('reading')) + '</span></div>');
        try {
            const A = W.LowiFoodAI, S = W.LowiMealSnap;
            if (!A || !A.analyse || !S || !S.meal) { const e = new Error('off'); e.code = 'off'; throw e; }
            const url = await shrink(file);
            const out = await A.analyse(url);
            if (my !== run || !el) return;
            const m = S.meal(out);
            if (!m) { fail('nothing'); return; }
            result(m);
        } catch (e) {
            if (my !== run || !el) return;
            fail(e && e.code ? e.code : 'failed');
        }
    }
    function pickFile(camera) {
        const i = D.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if (camera) i.setAttribute('capture', 'environment');
        i.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        i.addEventListener('change', () => { const f = i.files && i.files[0]; i.remove(); if (f) analyse(f); }, { once: true });
        D.body.appendChild(i); i.click();
        setTimeout(() => { if (i.isConnected && !(i.files && i.files.length)) i.remove(); }, 120000);
    }
    function open(o) {
        if (!D) return false;
        close(true);
        ctx = { code: o && o.code ? String(o.code).replace(/\D/g, '').slice(0, 14) : '' };
        back = D.activeElement;
        el = D.createElement('div'); el.className = 'da-ov'; el.id = 'daSheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'daTitle'); el.setAttribute('data-noi18n', '');
        el.innerHTML = '<div class="da-card"><div class="da-top"><button type="button" class="da-x" data-da="close" aria-label="' + esc(s('close')) + '">' + IC.x + '</button><h2 id="daTitle">' + IC.spark + esc(s('title')) + '</h2></div>' +
            '<div class="da-scroll"><div class="da-body"></div></div></div>';
        D.body.appendChild(el);
        intro();
        requestAnimationFrame(() => { if (el) el.classList.add('on'); });
        el.addEventListener('click', onClick);
        D.addEventListener('keydown', onKey, true);
        setTimeout(() => { const x = el && el.querySelector('.da-main'); if (x) x.focus({ preventScroll: true }); }, 60);
        return true;
    }
    function close(quick) {
        run++;
        D && D.removeEventListener('keydown', onKey, true);
        const e = el; el = null;
        if (!e) return;
        if (quick) { e.remove(); return; }
        e.classList.remove('on'); setTimeout(() => e.remove(), 240);
        try { if (back && back.focus && D.contains(back)) back.focus({ preventScroll: true }); } catch (x) {}
    }
    function onKey(e) { if (el && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }
    function onClick(e) {
        if (e.target === el) { close(); return; }
        const b = e.target.closest('[data-da]'); if (!b) return;
        const k = b.dataset.da;
        if (k === 'close') close();
        else if (k === 'shoot' || k === 'again-photo') pickFile(true);
        else if (k === 'pick') pickFile(false);
    }
    return { open, close, isOpen: () => !!el, gptURL, question, strings: STR };
});
