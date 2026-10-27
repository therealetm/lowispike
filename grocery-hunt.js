/* LOWiSPIKE · Shopping hunt (Oct 17, 2026). Rules in grocery-hunt-core.js; this file draws the panel and wires it in.
   E-man: "Your health starts with grocery shopping." "Just like Pokemon ... in this shop there is this." "You have to scan the barcode
   or take the picture." "Speisequark, Kiwi, Mandeln ... when they connect these products ... like Super Saiyan."
   - Opens from Shop mode (under "Scan a product") and from the shopping scanner (the Hunt chip).
   - A barcode really scanned in the shopping scanner (shop-scan.js event lowi:shop-scan) is a catch; so is a fresh product photo taken
     here. The photo is only used to check it is a new picture, then dropped: it is not uploaded, not kept and never rated.
   - Shopping glow: LowiWorldHealth.setBoost (the world) and LowiGrocery.glow (your world in the spirit realm, body-world-3d-scene.js).
   - Shared finds and combos use the tables in supabase/proposals/grocery_hunt_20261017.sql once they exist and only after the user
     turns sharing on; until then everything works on this phone and the panel says so. No position is ever stored or shared. */
(function () {
    'use strict';
    const W = window, D = document, C = W.LowiGroceryCore;
    if (!C) return;
    const SP = () => W.LowiStorePicksCore;
    const li = () => { try { const l = String(W.LowiLang && LowiLang.get ? LowiLang.get() : D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; } catch (e) { return 0; } };
    const T = (en, de, es) => [en, de, es][li()] || en;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const loc = () => ['en-GB', 'de-DE', 'es-ES'][li()];
    const dateS = ts => { try { return new Date(ts).toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { return C.dayOf(ts); } };
    const WD = () => [T('Su', 'So', 'Do'), T('Mo', 'Mo', 'Lu'), T('Tu', 'Di', 'Ma'), T('We', 'Mi', 'Mi'), T('Th', 'Do', 'Ju'), T('Fr', 'Fr', 'Vi'), T('Sa', 'Sa', 'Sá')];
    const SVG = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    const IC = { x: SVG('<path d="M6 6l12 12M18 6L6 18"/>'), bc: SVG('<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8M11 8v8M14 8v8M17 8v8"/>'),
        cam: SVG('<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>'), pin: SVG('<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
        back: SVG('<path d="M15 5l-7 7 7 7"/>'), star: SVG('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>') };

    /* ---------- state ---------- */
    let S = null, glowK = 0, glowAt = 0;
    function load() { if (S) return S; let raw = null; try { raw = JSON.parse(localStorage.getItem(C.KEY) || 'null'); } catch (e) {} S = C.normalize(raw); C.resumeIfDue(S, Date.now()); return S; }
    function save() { try { localStorage.setItem(C.KEY, JSON.stringify(S)); } catch (e) {} glowAt = 0; try { W.dispatchEvent(new CustomEvent('lowi:grocery')); } catch (e) {} }
    function glow() { const now = Date.now(); if (now - glowAt > 30000) { glowAt = now; hookWorld(); try { glowK = C.strength(load(), now); } catch (e) { glowK = 0; } } return glowK; }
    /* the world rules load later (apple-ui.js companion list), so hook in whenever they appear */
    let hooked = null;
    function hookWorld() { try { const wh = W.LowiWorldHealth; if (wh && wh.setBoost && hooked !== wh) { wh.setBoost(now => C.status(load(), now || Date.now()).boost); hooked = wh; } } catch (e) {} }

    /* ---------- shared finds (only when the shared tables exist, the user is signed in, and has said yes) ---------- */
    const cloud = { status: 'off', finds: [], combos: [], store: '', at: 0 };
    const CX = () => W.LOWI_CLOUD_X;
    const missing = err => { const m = String(err && (err.code || '') + ' ' + (err.message || '')); return /PGRST205|42P01|does not exist|schema cache/i.test(m); };
    async function pull(store) {
        const x = CX(), id = store && store.id;
        if (!id) return;
        if (!x || !x.state || !x.state().live || !x.client || !x.uid || !x.uid()) { cloud.status = 'off'; return; }
        if (cloud.store === id && Date.now() - cloud.at < 120000 && cloud.status !== 'error') return;
        cloud.store = id; cloud.at = Date.now();
        try {
            const sb = x.client(), me = x.uid(), since = new Date(Date.now() - 60 * C.DAY).toISOString();
            const f = await sb.from('grocery_finds').select('store_id,product_key,name,barcode,kind,verdict,method,found_at,user_id').eq('store_id', id).gte('found_at', since).order('found_at', { ascending: false }).limit(300);
            if (f.error) { cloud.status = missing(f.error) ? 'missing' : 'error'; cloud.finds = []; cloud.combos = []; return; }
            cloud.finds = (f.data || []).map(r => Object.assign({}, r, { own: r.user_id === me }));
            const c = await sb.from('grocery_combos').select('id,name,items,store_id,created_at,user_id').eq('store_id', id).order('created_at', { ascending: false }).limit(40);
            cloud.combos = c.error ? [] : (c.data || []).filter(r => r.user_id !== me).map(r => ({ id: 's' + r.id, by: 'community', name: String(r.name || '').slice(0, 40),
                items: (Array.isArray(r.items) ? r.items : []).slice(0, 4).map(i => ({ kind: C.KINDS.some(k => k[0] === i.kind) ? i.kind : '', key: /^(bc:\d{6,14}|n:[a-z0-9 \u00df]{1,60})$/.test(i.key || '') ? i.key : '', label: String(i.label || '').slice(0, 60) })).filter(i => i.kind || i.key), ts: Date.parse(r.created_at) || 0 })).filter(r => r.items.length >= 2);
            cloud.status = 'ok';
        } catch (e) { cloud.status = 'error'; }
    }
    async function push(c, store) {
        const x = CX(); if (!S.consent || !store || !store.id || cloud.status === 'missing') return;
        if (!x || !x.state || !x.state().live || !x.client || !x.uid || !x.uid()) return;
        try {
            const row = Object.assign(C.shareRow(c, store), { user_id: x.uid(), found_at: new Date().toISOString() });
            const r = await x.client().from('grocery_finds').upsert(row, { onConflict: 'user_id,store_id,product_key' });
            if (r && r.error && missing(r.error)) cloud.status = 'missing';
        } catch (e) {}
    }
    async function pushCombo(cb) {
        const x = CX(); if (!S.consent || cloud.status === 'missing' || !x || !x.state || !x.state().live || !x.uid || !x.uid()) return false;
        try {
            const r = await x.client().from('grocery_combos').insert({ user_id: x.uid(), store_id: cb.store || '', name: cb.name, items: cb.items.map(i => ({ kind: i.kind || '', key: i.kind ? '' : i.key, label: String(i.label || '').slice(0, 60) })) });
            if (r && r.error) { if (missing(r.error)) cloud.status = 'missing'; return false; }
            return true;
        } catch (e) { return false; }
    }
    const shared = () => ({ finds: cloud.status === 'ok' && S.plan.store && cloud.store === S.plan.store.id ? cloud.finds : [], combos: cloud.status === 'ok' ? cloud.combos : [] });

    /* ---------- a catch, from the scanner or a photo ---------- */
    function award(res, label) {
        const b = W.LowiVitalsBridge; if (!b || !b.awardWith) return 0;
        let sum = 0;
        res.awards.forEach(a => {
            const txt = a.label === 'trip' ? T('Shopping bonus', 'Einkaufsbonus', 'Bonus de compra') : a.label === 'combo' ? T('Power combo', 'Power-Kombi', 'Combo de poder') :
                a.label === 'find' ? T('New find', 'Neuer Fund', 'Nuevo hallazgo') : T('Shop find', 'Ladenfund', 'Hallazgo');
            try { sum += b.awardWith(a.amt, txt + (label ? ' · ' + label : ''), 'grocery', a.eventId, { grocery: a.kind }, true) || 0; } catch (e) {}
        });
        return sum;
    }
    /* 0.32 (Emmanuel, 26 Oct): plain words. No "check-in", no glimmers, no glowing worlds: what you got, in XP, and why. */
    function lines(res) {
        if (!res.ok) return [];
        const out = [];
        if (res.again) out.push(T('Already scanned today', 'Heute schon gescannt', 'Ya escaneado hoy'));
        if (res.hint && res.hint.cooling && !res.awards.some(a => a.label === 'hint')) out.push(T('Found here before · counts again from ', 'Hier schon gefunden · zählt wieder ab ', 'Ya encontrado aquí · cuenta de nuevo el ') + dateS(res.hint.againAt));
        res.awards.forEach(a => {
            if (a.label === 'hint') out.push('+' + a.amt + ' XP · ' + (a.kind === 'community' ? T('another shopper found this here before', 'jemand hat das hier schon gefunden', 'otra persona lo encontró aquí antes') : T('you found this here before', 'du hast das hier schon gefunden', 'ya lo encontraste aquí')));
            if (a.label === 'find') out.push('+' + a.amt + ' XP · ' + T('new find at your shop', 'neuer Fund in deinem Laden', 'nuevo hallazgo en tu tienda'));
            if (a.label === 'trip') out.push('+' + a.amt + ' XP · ' + T('shopping bonus for 2 products today', 'Einkaufsbonus für 2 Produkte heute', 'bonus de compra por 2 productos hoy'));
        });
        if (res.renewed && !res.awards.some(a => a.label === 'trip')) out.push(T('Shopping bonus done for today', 'Einkaufsbonus für heute geschafft', 'Bonus de compra de hoy hecho'));
        if (!res.renewed && res.tripNeed > 0 && !res.again) out.push(T('1 more product today for +', 'Noch 1 Produkt heute für +', '1 producto más hoy para +') + C.XP.trip + ' XP');
        res.combos.forEach(x => out.push(x.paid ? '⚡ ' + T('Power combo! ', 'Power-Kombi! ', '¡Combo de poder! ') + comboName(x.combo) + ' +' + C.XP.combo + ' XP' : comboName(x.combo) + ' · ' + T('again from ', 'wieder ab ', 'de nuevo el ') + dateS(x.againAt)));
        if (res.ok && !res.awards.length && !res.again && !res.renewed && !res.combos.length && C.xpLeft(S, Date.now()) === 0) out.push(T('You have all of today\'s Shop finds XP. Scans still count for Power combos.', 'Du hast alle Ladenfunde-XP für heute. Scans zählen weiter für Power-Kombis.', 'Ya tienes todos los XP de hoy. Los escaneos siguen contando para los combos de poder.'));
        return out;
    }
    /* 0.32: the scanner card gets ONE short line, only when the scan earned something or moved a Power combo on. Nothing else:
       no shop reminder, no "1 more product" nag. The line opens Shop finds. */
    function oneLine(res) {
        if (!res.ok || res.again) return '';
        const paid = res.combos.find(x => x.paid);
        if (paid) return '⚡ ' + T('Power combo! ', 'Power-Kombi! ', '¡Combo de poder! ') + comboName(paid.combo) + ' +' + C.XP.combo + ' XP';
        const aw = l => res.awards.find(a => a.label === l);
        if (aw('trip')) return '+' + aw('trip').amt + ' XP · ' + T('shopping bonus for 2 products today', 'Einkaufsbonus für 2 Produkte heute', 'bonus de compra por 2 productos hoy');
        if (aw('hint')) return '+' + aw('hint').amt + ' XP · ' + T('found here before', 'hier schon gefunden', 'ya encontrado aquí');
        if (aw('find')) return '+' + aw('find').amt + ' XP · ' + T('new find at your shop', 'neuer Fund in deinem Laden', 'nuevo hallazgo en tu tienda');
        const now = Date.now(), todays = C.catchesOn(S, C.dayOf(now));
        for (const cb of C.allCombos(S, shared().combos)) {
            const at = S.comboDone[cb.id] || 0; if (at && now - at < C.COOLDOWN * C.DAY) continue;
            const pr = C.comboProgress(cb, todays);
            if (!pr.done && pr.items.some(i => i.by && i.by.key === res.key)) return T('Power combo ', 'Power-Kombi ', 'Combo de poder ') + comboName(cb) + ': ' + pr.have + T(' of ', ' von ', ' de ') + pr.items.length;
        }
        return '';
    }
    function doCatch(p) {
        load();
        const now = Date.now(), store = S.plan.store;
        const res = C.recordCatch(S, Object.assign({}, p, { store }), now, shared());
        if (!res.ok) return res;
        save();
        award(res, String(p.name || '').slice(0, 30));
        if (!res.again && store) { const c = S.catches[S.catches.length - 1]; if (c && c.key === res.key) push(c, store); }
        if (res.combos.some(x => x.paid)) power(res.combos.find(x => x.paid).combo);
        return res;
    }
    function comboName(cb) { return Array.isArray(cb.name) ? cb.name[li()] || cb.name[0] : cb.name; }

    /* from the shopping scanner: a looked-up barcode */
    W.addEventListener('lowi:shop-scan', e => {
        const d = e.detail || {}; if (!d.barcode) return;
        const res = doCatch({ via: 'barcode', bc: d.barcode, name: d.name, lvl: d.level });
        const card = d.card; if (!card || !res.ok) return;
        const sheet = card.querySelector('.ss-sheet'); if (!sheet) return;
        /* 0.32 (Emmanuel: the box was confusing): one short line, or nothing when the scan earned nothing */
        const one = oneLine(res); if (!one) return;
        const box = D.createElement('div'); box.className = 'gh-chip'; box.classList.add('gh-one');
        box.innerHTML = '<button type="button" class="gh-chip-open" data-gh="open" aria-label="' + esc(T('Open Shop finds', 'Ladenfunde öffnen', 'Abrir hallazgos')) + '">' + IC.star + '<small>' + esc(one) + '</small><i aria-hidden="true">›</i></button>';
        /* Oct 26 one scanner: the card is capped by its camera, so the finds note goes under the buttons (above Details), never between the verdict and Add to cart */
        const more = sheet.querySelector('.ss-more'); if (more) sheet.insertBefore(box, more); else sheet.appendChild(box);
    });

    /* a fresh product photo: downscaled in memory, hashed so the same picture never counts twice, then dropped */
    let photoInput = null, photoFor = null;
    function askPhoto(target) {
        photoFor = target || null;
        if (!photoInput) {
            photoInput = D.createElement('input'); photoInput.type = 'file'; photoInput.accept = 'image/*'; photoInput.setAttribute('capture', 'environment'); photoInput.className = 'gh-file';
            photoInput.addEventListener('change', () => { const f = photoInput.files && photoInput.files[0]; photoInput.value = ''; if (f) gotPhoto(f); });
            D.body.appendChild(photoInput);
        }
        photoInput.click();
    }
    function hashPhoto(file) {
        return new Promise((ok, bad) => {
            const url = URL.createObjectURL(file), img = new Image();
            img.onload = () => { try { const cv = D.createElement('canvas'); cv.width = 48; cv.height = 48; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 48, 48); const h = C.hashStr(cv.toDataURL('image/jpeg', 0.7)); URL.revokeObjectURL(url); ok(h); } catch (e) { URL.revokeObjectURL(url); bad(e); } };
            img.onerror = () => { URL.revokeObjectURL(url); bad(new Error('img')); };
            img.src = url;
        });
    }
    function gotPhoto(file) {
        hashPhoto(file).then(h => { pendingPhoto = { hash: h, target: photoFor }; view = 'photo'; paint(); }).catch(() => { msg = T('That photo could not be read. Try again, or scan the barcode.', 'Das Foto ließ sich nicht lesen. Versuch es nochmal oder scanne den Barcode.', 'No se pudo leer la foto. Inténtalo de nuevo o escanea el código.'); paint(); });
    }
    let pendingPhoto = null;

    /* ---------- the panel ---------- */
    let ov = null, view = 'home', msg = '', stores = null, where = null, q = '', picking = null, lastRes = null;
    function shell(inner, foot) {
        return '<div class="stp-card gh-card" role="dialog" aria-modal="true" aria-label="' + esc(T('Shop finds', 'Ladenfunde', 'Hallazgos en la tienda')) + '">' + inner +
            '<div class="stp-foot">' + (foot || '') + '<button type="button" class="stp-orb" data-gh="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + IC.x + '</button></div></div>';
    }
    function storeName(st) { return st ? (st.brand && st.name && st.name.toLowerCase().indexOf(st.brand.toLowerCase()) < 0 ? st.brand + ' ' + st.name : st.name || st.brand) + (st.town ? ' · ' + st.town : '') : ''; }
    /* 0.32: the same verdict words as the scanner card (shop-scan-core.js v_none / v_mild / v_spike): Lower / Moderate / Higher */
    function lvlWord(lvl) {
        const SC = W.LowiShopScanCore, k = 'v_' + lvl;
        try { if (SC && SC.tx) { const w = SC.tx(k, li()); if (w && w !== k) return w; } } catch (e) {}
        return { none: T('Insulin-friendly', 'Insulinfreundlich', 'Apto para la insulina'), mild: T('Not insulin-friendly', 'Nicht insulinfreundlich', 'No apto para la insulina'), spike: T('Not insulin-friendly', 'Nicht insulinfreundlich', 'No apto para la insulina') }[lvl];
    }
    function lvlTag(h) {
        if (h.via === 'photo' && !h.lvl) return '<i class="stp-tag">' + esc(T('Photo · not rated', 'Foto · nicht bewertet', 'Foto · sin valorar')) + '</i>';
        const cls = { none: 'best', mild: 'no', spike: 'no' }[h.lvl]; /* 27 Oct: two states only, the old middle level is red like Not insulin-friendly */
        if (cls) return '<i class="stp-tag ' + cls + '">' + esc(lvlWord(h.lvl) + T(' (estimate)', ' (Schätzung)', ' (estimación)')) + '</i>';
        return '<i class="stp-tag">' + esc(T('Not rated', 'Nicht bewertet', 'Sin valorar')) + '</i>';
    }
    function ago(d) { return d === 0 ? T('today', 'heute', 'hoy') : d === 1 ? T('yesterday', 'gestern', 'ayer') : T(d + ' days ago', 'vor ' + d + ' Tagen', 'hace ' + d + ' días'); }
    function hintHTML(h, i) {
        let src;
        if (h.community) src = T('Found here by ', 'Hier gefunden von ', 'Encontrado aquí por ') + h.shoppers + ' ' + (h.shoppers === 1 ? T('shopper', 'Person', 'persona') : T('shoppers', 'Personen', 'personas')) + ' · ' + T('last ', 'zuletzt ', 'última vez ') + ago(h.daysAgo);
        else src = T('Your find · last seen here ', 'Dein Fund · zuletzt hier gesehen ', 'Tu hallazgo · visto aquí ') + ago(h.daysAgo);
        const state = h.cooling ? T('Scanned · counts again from ', 'Gescannt · zählt wieder ab ', 'Escaneado · cuenta de nuevo el ') + dateS(h.againAt) : T('May be sold out or moved. Find it on the shelf and scan it, or take a photo.', 'Kann ausverkauft oder umgeräumt sein. Such es im Regal und scanne es oder mach ein Foto.', 'Puede estar agotado o en otro sitio. Búscalo y escanéalo o haz una foto.');
        return '<li class="stp-item gh-hint' + (h.cooling ? ' gh-cool' : ' gh-glim') + '"><span class="gh-spark" aria-hidden="true"></span><div><b>' + esc(h.name) + '</b><small>' + esc(src) + '</small><small class="gh-state">' + esc(state) + '</small></div>' +
            lvlTag(h) + (h.cooling ? '' : '<button type="button" class="gh-mini" data-gh="photo-hint" data-i="' + i + '" aria-label="' + esc(T('Catch with a photo', 'Mit Foto fangen', 'Capturar con foto')) + '">' + IC.cam + '</button>') + '</li>';
    }
    function comboHTML(cb, todays, now) {
        const pr = C.comboProgress(cb, todays), at = S.comboDone[cb.id] || 0, cool = at && now - at < C.COOLDOWN * C.DAY;
        const by = cb.by === 'starter' ? T('Starter idea from LOWiSPIKE', 'Start-Idee von LOWiSPIKE', 'Idea inicial de LOWiSPIKE') : cb.by === 'you' ? T('Your combo', 'Deine Kombi', 'Tu combo') + (cb.shared ? T(' · shared', ' · geteilt', ' · compartido') : '') : T('Shared by a shopper here', 'Von jemandem hier geteilt', 'Compartido por alguien aquí');
        const chips = pr.items.map((x, j) => '<span class="gh-item' + (x.by ? ' on' : '') + '">' + (x.by ? '✓ ' : '') + esc(x.item.kind ? C.kindLabel(x.item.kind, li()) : x.item.label || '?') +
            (x.by ? '' : '<button type="button" class="gh-mini sm" data-gh="photo-combo" data-c="' + esc(cb.id) + '" data-j="' + j + '" aria-label="' + esc(T('Catch with a photo', 'Mit Foto fangen', 'Capturar con foto')) + '">' + IC.cam + '</button>') + '</span>').join('');
        const st = cool ? '✓ ' + T('Done · again from ', 'Geschafft · wieder ab ', 'Hecho · de nuevo el ') + dateS(at + C.COOLDOWN * C.DAY) : T('Scan all of these on the same day: +', 'Scanne alle am selben Tag: +', 'Escanéalos todos el mismo día: +') + C.XP.combo + ' XP';
        return '<div class="gh-combo' + (pr.done ? ' done' : '') + '"><div class="gh-combo-h"><b>' + esc(comboName(cb)) + '</b><small>' + esc(by) + '</small></div><div class="gh-items">' + chips + '</div><small class="gh-state">' + esc(st) + '</small></div>';
    }
    function shareHTML() {
        const x = CX(), signed = !!(x && x.state && x.state().live && x.uid && x.uid());
        let st;
        if (!signed) st = T('Sign in to share finds with other shoppers. Until then your finds stay on this phone.', 'Melde dich an, um Funde mit anderen zu teilen. Bis dahin bleiben deine Funde auf diesem Handy.', 'Inicia sesión para compartir hallazgos. Hasta entonces se quedan en este móvil.');
        else if (cloud.status === 'missing') st = T('Sharing with other shoppers isn\'t switched on yet on our server. Your finds stay on this phone for now.', 'Teilen mit anderen ist auf unserem Server noch nicht eingeschaltet. Deine Funde bleiben vorerst auf diesem Handy.', 'Compartir con otras personas aún no está activado en nuestro servidor. Por ahora tus hallazgos se quedan en este móvil.');
        else if (cloud.status === 'error') st = T('Shared finds couldn\'t load right now.', 'Geteilte Funde ließen sich gerade nicht laden.', 'No se pudieron cargar los hallazgos compartidos.');
        else if (cloud.status === 'ok') st = T('Shared finds at this shop in the last 60 days: ', 'Geteilte Funde in diesem Laden (60 Tage): ', 'Hallazgos compartidos aquí (60 días): ') + cloud.finds.filter(r => !r.own).length;
        else st = '';
        return '<label class="stp-tog gh-tog"><input type="checkbox" data-gh="consent"' + (S.consent ? ' checked' : '') + '> <span>' + esc(T('Share my finds with other shoppers at this shop', 'Meine Funde mit anderen in diesem Laden teilen', 'Compartir mis hallazgos con otras personas en esta tienda')) + '</span></label>' +
            '<p class="stp-fine">' + esc(T('Shares only the shop, the product, the app\'s estimate, scan or photo, and the date. Never your name, your position or your photos.', 'Geteilt werden nur Laden, Produkt, die Schätzung der App, Scan oder Foto und das Datum. Nie dein Name, dein Standort oder deine Fotos.', 'Solo se comparte la tienda, el producto, la estimación, escaneo o foto, y la fecha. Nunca tu nombre, tu ubicación ni tus fotos.')) + (st ? ' ' + esc(st) : '') + '</p>';
    }
    /* Oct 17: the shopping rhythm has ONE home, the onboarding/shopping setup (shop-plan.js, window.LowiShopPlan, 'lowi:shopplan').
       When it is there the hunt only READS it (how often, which days) for the glow timing and links to its editor; its own chips are
       the fallback for builds without it. An unset plan keeps the hunt's quiet weekly timing and shows no number. */
    const SPL = () => W.LowiShopPlan;
    function syncPlan() {
        try {
            const sp = SPL(); if (!sp || typeof sp.get !== 'function') return false;
            const p = sp.get() || {}, cur = load().plan, ch = {};
            const ev = p.every != null && +p.every > 0 ? Math.max(C.EVERY_MIN, Math.min(C.EVERY_MAX, Math.round(+p.every))) : null;
            if (ev != null && ev !== cur.every) ch.every = ev;
            const ds = Array.isArray(p.days) ? [...new Set(p.days.map(Number).filter(d => d >= 0 && d <= 6))].sort() : [];
            if (ds.join() !== cur.days.join()) ch.days = ds;
            if (Object.keys(ch).length) { C.setPlan(S, ch); save(); }
            return true;
        } catch (e) { return false; }
    }
    function rhythmHTML(now) {
        const p = S.plan, st = C.status(S, now);
        if (syncPlan()) {
            const sp = SPL(); let sum = ''; try { sum = String(sp.summary ? sp.summary() : ''); } catch (e) {}
            let life2 = st.phase === 'paused' ? '<button type="button" class="stp-pill" data-gh="resume">' + esc(T('End the pause', 'Pause beenden', 'Terminar la pausa')) + '</button>' :
                '<button type="button" class="stp-pill" data-gh="pause" data-n="7">' + esc(T('Pause 1 week', '1 Woche pausieren', 'Pausar 1 semana')) + '</button><button type="button" class="stp-pill" data-gh="pause" data-n="14">' + esc(T('Pause 2 weeks', '2 Wochen pausieren', 'Pausar 2 semanas')) + '</button>';
            if (st.graceOk) life2 += '<button type="button" class="stp-pill" data-gh="grace">' + esc(T('Shopped but couldn\'t scan? Keep my world bright 3 more days', 'Eingekauft, aber Scannen ging nicht? Welt 3 Tage länger hell halten', '¿Compraste pero no pudiste escanear? Mantener mi mundo luminoso 3 días más')) + '</button>';
            return '<h4 class="stp-h4">' + esc(T('Your shopping rhythm (optional)', 'Dein Einkaufsrhythmus (optional)', 'Tu ritmo de compra (opcional)')) + '</h4>' +
                (sum ? '<p class="gh-q">' + esc(sum) + '</p>' : '') +
                '<div class="stp-chips stp-wrap"><button type="button" class="stp-pill" data-gh="plan-edit">' + esc(T('Change my shopping rhythm', 'Einkaufsrhythmus ändern', 'Cambiar mi ritmo de compra')) + '</button></div>' +
                '<div class="stp-chips stp-wrap gh-life">' + life2 + '</div>';
        }
        const ev = [3, 4, 7, 14].map(n => '<button type="button" class="stp-chip' + (p.every === n ? ' on' : '') + '" data-gh="every" data-n="' + n + '">' + esc(n === 7 ? T('Weekly', 'Wöchentlich', 'Semanal') : n === 14 ? T('Every 2 weeks', 'Alle 2 Wochen', 'Cada 2 semanas') : T('Every ' + n + ' days', 'Alle ' + n + ' Tage', 'Cada ' + n + ' días')) + '</button>').join('');
        const wd = WD(), days = [1, 2, 3, 4, 5, 6, 0].map(d => '<button type="button" class="stp-chip gh-day' + (p.days.indexOf(d) >= 0 ? ' on' : '') + '" data-gh="day" data-d="' + d + '" aria-pressed="' + (p.days.indexOf(d) >= 0) + '">' + esc(wd[d]) + '</button>').join('');
        const nx = C.nextShopDay(S, now);
        let life = st.phase === 'paused' ? '<button type="button" class="stp-pill" data-gh="resume">' + esc(T('End the pause', 'Pause beenden', 'Terminar la pausa')) + '</button>' :
            '<button type="button" class="stp-pill" data-gh="pause" data-n="7">' + esc(T('Pause 1 week', '1 Woche pausieren', 'Pausar 1 semana')) + '</button><button type="button" class="stp-pill" data-gh="pause" data-n="14">' + esc(T('Pause 2 weeks', '2 Wochen pausieren', 'Pausar 2 semanas')) + '</button>';
        if (st.graceOk) life += '<button type="button" class="stp-pill" data-gh="grace">' + esc(T('Shopped but couldn\'t scan? Keep my world bright 3 more days', 'Eingekauft, aber Scannen ging nicht? Welt 3 Tage länger hell halten', '¿Compraste pero no pudiste escanear? Mantener mi mundo luminoso 3 días más')) + '</button>';
        return '<h4 class="stp-h4">' + esc(T('Your shopping rhythm (optional)', 'Dein Einkaufsrhythmus (optional)', 'Tu ritmo de compra (opcional)')) + '</h4>' +
            '<p class="gh-q">' + esc(T('How often do you shop?', 'Wie oft kaufst du ein?', '¿Cada cuánto compras?')) + '</p><div class="stp-chips stp-wrap">' + ev + '</div>' +
            '<p class="gh-q">' + esc(T('Which days?', 'An welchen Tagen?', '¿Qué días?')) + '</p><div class="stp-chips stp-wrap">' + days + '</div>' +
            (nx && S.lastRenew ? '<p class="stp-fine">' + esc(T('Next shop day: ', 'Nächster Einkaufstag: ', 'Próximo día de compra: ') + dateS(nx)) + '</p>' : '') +
            '<div class="stp-chips stp-wrap gh-life">' + life + '</div>';
    }
    /* 0.32 (Emmanuel, 26 Oct: "When you open Shop finds, it's very complicated ... Power combos make sense, but that other stuff is
       confusing"): one plain line, the scan buttons, Power combos as the hero, Caught today with the scanner card's verdict words,
       then your shop in one quiet row. The rhythm, pause, sharing and the small print live under one "More" fold. The shopping
       bonus and the world boost still work exactly as before; they are just said plainly (C.XP.trip for 2 products a day). */
    const SPK = 'lowi.gh.spshop';
    function adoptShop() {
        /* the shop is picked once: the one picked in Supermarket (store-picks.js) is the Shop finds shop too, until you pick another one here */
        try {
            const P = W.LowiStorePicks, sp = P && P.state && (P.state() || {}).store; if (!sp || !sp.id) return;
            const own = S.plan.store, took = localStorage.getItem(SPK);
            if (own && own.id === String(sp.id)) return;
            if (own && own.id !== took) return;
            C.setPlan(S, { store: { id: sp.id, name: sp.name || sp.brand, brand: sp.brand || '', chain: sp.chain || '', town: sp.town || '' } });
            localStorage.setItem(SPK, String(sp.id)); save(); cloud.store = '';
        } catch (e) {}
    }
    function todayLine(now, todays) {
        if (C.dayOf(S.lastRenew || 0) === C.dayOf(now)) return '✓ ' + T('Shopping bonus today: +', 'Einkaufsbonus heute: +', 'Bonus de compra de hoy: +') + C.XP.trip + ' XP';
        if (todays.length === 1) return T('Scan 1 more product today for +', 'Noch 1 Produkt heute scannen für +', 'Escanea 1 producto más hoy para +') + C.XP.trip + ' XP';
        return T('Scan 2 different products today for +', 'Scanne heute 2 verschiedene Produkte für +', 'Escanea 2 productos distintos hoy para +') + C.XP.trip + ' XP';
    }
    function homeHTML() {
        load(); adoptShop();
        const now = Date.now(), st = S.plan.store, todays = C.catchesOn(S, C.dayOf(now)), sh = shared();
        let h = '<div class="stp-head"><h3>' + esc(T('Shop finds', 'Ladenfunde', 'Hallazgos en la tienda')) + '</h3><p>' + esc(T('Scan food while you shop to see if it\'s likely to spike your blood sugar, and earn XP for your companion.', 'Scanne Essen beim Einkaufen, sieh, ob es deinen Blutzucker wahrscheinlich hochtreibt, und sammle XP für deinen Begleiter.', 'Escanea comida mientras compras, mira si es probable que te suba el azúcar y gana XP para tu compañero.')) + '</p></div>';
        h += '<div class="stp-scroll">';
        if (msg) h += '<p class="stp-msg gh-msg">' + esc(msg) + '</p>';
        if (lastRes && lastRes.length) h += '<div class="gh-chip in-panel">' + lastRes.map(l => '<small>' + esc(l) + '</small>').join('') + '</div>';
        h += '<div class="stp-chips gh-acts"><button type="button" class="stp-go" data-gh="scan">' + IC.bc + '<span>' + esc(T('Scan a product', 'Produkt scannen', 'Escanear producto')) + '</span></button>' +
            '<button type="button" class="stp-pill gh-photo" data-gh="photo">' + IC.cam + '<span>' + esc(T('Photo', 'Foto', 'Foto')) + '</span></button></div>';
        h += '<section class="gh-combos"><h4 class="stp-h4 gh-hero-h">⚡ ' + esc(T('Power combos', 'Power-Kombis', 'Combos de poder')) + '</h4>' +
            C.allCombos(S, sh.combos).filter(cb => !cb.store || !st || cb.store === st.id || cb.by === 'you').map(cb => comboHTML(cb, todays, now)).join('') + '</section>';
        h += '<h4 class="stp-h4">' + esc(T('Caught today', 'Heute gefangen', 'Capturado hoy')) + (todays.length ? ' · ' + todays.length : '') + '</h4>';
        h += '<p class="gh-today' + (C.dayOf(S.lastRenew || 0) === C.dayOf(now) ? ' on' : '') + '">' + esc(todayLine(now, todays)) + '</p>';
        h += todays.length ? '<ul class="stp-items">' + todays.slice().reverse().map(c => '<li class="stp-item"><div><b>' + esc(c.name || T('Product', 'Produkt', 'Producto')) + '</b><small>' + esc(c.via === 'photo' ? T('Photo · not identified by the app', 'Foto · von der App nicht erkannt', 'Foto · la app no lo identifica') : T('Barcode scanned', 'Barcode gescannt', 'Código escaneado')) + (c.kind ? ' · ' + esc(C.kindLabel(c.kind, li())) : '') + '</small></div>' + lvlTag(c) + '</li>').join('') + '</ul>' +
            (todays.length >= 2 ? '<button type="button" class="stp-more" data-gh="combo-new">' + esc(T('Make a combo from today\'s catches', 'Kombi aus den heutigen Fängen machen', 'Crear un combo con lo de hoy')) + '</button>' : '') :
            '<p class="stp-none">' + esc(T('Nothing yet today.', 'Heute noch nichts.', 'Nada todavía hoy.')) + '</p>';
        h += '<h4 class="stp-h4">' + esc(T('Your shop', 'Dein Laden', 'Tu tienda')) + '</h4>' +
            '<button type="button" class="stp-shop gh-shop" data-gh="shops">' + IC.pin + '<span>' + esc(st ? storeName(st) : T('Pick your shop', 'Wähl deinen Laden', 'Elige tu tienda')) + '</span><i>' + esc(st ? T('Change', 'Ändern', 'Cambiar') : T('Optional', 'Optional', 'Opcional')) + '</i></button>';
        if (!st) h += '<p class="stp-fine">' + esc(T('Then the products you scan there show up here on your next trip. Only the shop is saved, never where you are.', 'Dann siehst du die Produkte, die du dort scannst, hier beim nächsten Einkauf. Gespeichert wird nur der Laden, nie wo du bist.', 'Así los productos que escanees allí aparecen aquí en tu próxima compra. Solo se guarda la tienda, nunca dónde estás.')) + '</p>';
        else {
            const hs = C.hints(S, st, sh.finds, now); picking = { hints: hs };
            if (hs.length) h += '<h4 class="stp-h4">' + esc(T('Found here before', 'Hier schon gefunden', 'Encontrado aquí antes')) + ' · ' + hs.filter(x => !x.cooling).length + '</h4>' +
                '<ul class="stp-items">' + hs.slice(0, 40).map(hintHTML).join('') + '</ul>' +
                '<p class="stp-fine">' + esc(T('Someone found these in this shop before. They may be sold out or moved.', 'Jemand hat sie früher in diesem Laden gefunden. Sie können ausverkauft oder umgeräumt sein.', 'Alguien los encontró antes en esta tienda. Pueden estar agotados o en otro sitio.')) + '</p>';
            else h += '<p class="stp-fine">' + esc(T('Products you scan here show up on your next trip.', 'Produkte, die du hier scannst, siehst du beim nächsten Einkauf.', 'Los productos que escanees aquí aparecen en tu próxima compra.')) + '</p>';
        }
        h += '<details class="stp-how gh-more"><summary>' + esc(T('More: rhythm, sharing, how XP works', 'Mehr: Rhythmus, Teilen, so gibt es XP', 'Más: ritmo, compartir, cómo se gana XP')) + '</summary>';
        h += rhythmHTML(now);
        h += '<h4 class="stp-h4">' + esc(T('Sharing', 'Teilen', 'Compartir')) + '</h4>' + shareHTML();
        h += '<h4 class="stp-h4">' + esc(T('How XP works', 'So gibt es XP', 'Cómo se gana XP')) + '</h4><p class="stp-fine">' +
            esc(T('Scan 2 different products on one day (barcode in the scanner, or a photo here) for a +' + C.XP.trip + ' XP shopping bonus. It also makes your companion\'s world a little brighter until a day after your next shop day, then it slowly goes back to normal. It never gets darker than normal and says nothing about what you eat. A new find at your shop gives +' + C.XP.find + ' XP. A Power combo gives +' + C.XP.combo + ' XP once a week. The same photo never counts twice, and Shop finds gives at most ' + C.XP_DAY_CAP + ' XP a day.',
                'Scanne 2 verschiedene Produkte an einem Tag (Barcode im Scanner oder ein Foto hier) für +' + C.XP.trip + ' XP Einkaufsbonus. Dazu wird die Welt deines Begleiters etwas heller, bis einen Tag nach deinem nächsten Einkaufstag, dann wird sie langsam wieder normal. Sie wird nie dunkler als normal und sagt nichts darüber, was du isst. Ein neuer Fund in deinem Laden gibt +' + C.XP.find + ' XP. Eine Power-Kombi gibt einmal pro Woche +' + C.XP.combo + ' XP. Dasselbe Foto zählt nie zweimal, und Ladenfunde geben höchstens ' + C.XP_DAY_CAP + ' XP am Tag.',
                'Escanea 2 productos distintos en un día (código en el escáner o una foto aquí) para un bonus de compra de +' + C.XP.trip + ' XP. Además, el mundo de tu compañero se ve un poco más luminoso hasta un día después de tu próximo día de compra, y luego vuelve poco a poco a la normalidad. Nunca se ve más oscuro de lo normal y no dice nada de lo que comes. Un nuevo hallazgo en tu tienda da +' + C.XP.find + ' XP. Un combo de poder da +' + C.XP.combo + ' XP una vez por semana. La misma foto nunca cuenta dos veces y los hallazgos dan como máximo ' + C.XP_DAY_CAP + ' XP al día.')) + '</p>';
        h += '<p class="stp-fine">' + esc(T('Ratings are estimates from the label, not a promise about your blood sugar or insulin. Portion size and your own body make a difference.', 'Bewertungen sind Schätzungen vom Etikett, kein Versprechen für deinen Blutzucker oder dein Insulin. Portionsgröße und dein Körper machen einen Unterschied.', 'Las valoraciones son estimaciones de la etiqueta, no una promesa sobre tu azúcar o tu insulina. La porción y tu cuerpo influyen.')) + '</p></details>';
        h += '</div>';
        return shell(h);
    }
    function mapHTML(list, center) {
        if (!list.length || !center) return '';
        const kx = Math.cos(center.lat * Math.PI / 180);
        let r = 0; list.forEach(s => { r = Math.max(r, Math.abs((s.lon - center.lon) * kx), Math.abs(s.lat - center.lat)); }); r = r * 1.15 || 0.01;
        const P = s => [50 + 46 * (s.lon - center.lon) * kx / r, 50 - 46 * (s.lat - center.lat) / r];
        const dots = list.map(s => { const p = P(s), n = Object.keys(S.finds[s.id] || {}).length, on = S.plan.store && S.plan.store.id === s.id;
            return '<g class="gh-dot' + (n ? ' glim' : '') + (on ? ' on' : '') + '" data-gh="store" data-id="' + esc(s.id) + '" role="button" aria-label="' + esc(s.brand + ' ' + (s.addr || '')) + '"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (on ? 3.6 : 2.8) + '"/>' + (n ? '<circle class="gh-ring" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5"/>' : '') + '</g>'; }).join('');
        const me = where ? (() => { const p = P(where); return '<circle class="gh-me" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2"/>'; })() : '';
        return '<svg class="gh-map" viewBox="0 0 100 100" aria-label="' + esc(T('Shops near you', 'Läden in deiner Nähe', 'Tiendas cerca')) + '">' + me + dots + '</svg><p class="stp-fine">' + esc(T('Rings mark shops where you have finds. Your position is only used to sort shops and is not saved.', 'Ringe zeigen Läden mit deinen Funden. Dein Standort sortiert nur die Läden und wird nicht gespeichert.', 'Los anillos marcan tiendas con tus hallazgos. Tu ubicación solo ordena las tiendas y no se guarda.')) + '</p>';
    }
    function shopsHTML() {
        const all = stores && stores.stores || [], P = SP();
        let list = [], center = null;
        if (q.trim().length >= 2 && P) list = P.findStore(all, q.trim()).slice(0, 20);
        else if (where && P) { list = P.nearest(all, where, 15); center = where; }
        else if (S.plan.store && P) { const me = all.find(s => s.id === S.plan.store.id); if (me) { center = me; list = P.nearest(all, me, 15); } }
        if (list.length && !center) center = list[0];
        let h = '<div class="stp-head"><h3>' + esc(T('Which shop?', 'Welcher Laden?', '¿Qué tienda?')) + '</h3><p>' + esc(T('Products you scan there show up here on your next trip. You can pick it before you go in. Only the shop is saved.', 'Produkte, die du dort scannst, siehst du hier beim nächsten Einkauf. Du kannst ihn schon vorher wählen. Gespeichert wird nur der Laden.', 'Los productos que escanees allí aparecen aquí en tu próxima compra. Puedes elegirla antes de entrar. Solo se guarda la tienda.')) + '</p>' +
            '<div class="stp-tools"><input class="stp-q" data-gh="q" type="search" enterkeyhint="search" maxlength="40" value="' + esc(q) + '" placeholder="' + esc(T('Shop, street or town', 'Laden, Straße oder Ort', 'Tienda, calle o ciudad')) + '"><button type="button" class="stp-pill" data-gh="near">' + esc(T('Near me', 'In der Nähe', 'Cerca')) + '</button></div></div><div class="stp-scroll">';
        if (msg) h += '<p class="stp-msg">' + esc(msg) + '</p>';
        if (!stores) h += '<p class="stp-msg">' + esc(T('Loading shops…', 'Läden werden geladen…', 'Cargando tiendas…')) + '</p>';
        h += mapHTML(list, center);
        h += list.length ? '<div class="stp-rows">' + list.map(s => { const n = Object.keys(S.finds[s.id] || {}).length; return '<button type="button" class="stp-row" data-gh="store" data-id="' + esc(s.id) + '"><b>' + esc(s.name && s.brand && s.name.toLowerCase().indexOf(s.brand.toLowerCase()) >= 0 ? s.name : (s.brand || '') + (s.name && s.name !== s.brand ? ' ' + s.name : '')) + '</b><small>' + esc((s.addr || (P ? P.town(s) : '')) + (n ? ' · ' + T(n + ' finds', n + ' Funde', n + ' hallazgos') : '')) + '</small><i>' + (s.km != null ? esc(String(Math.round(s.km * 10) / 10).replace('.', li() ? ',' : '.')) + ' km' : '') + '</i></button>'; }).join('') + '</div>' :
            (stores ? '<p class="stp-none">' + esc(T('Tap Near me to see the shops around you, or type a town or postcode.', 'Tipp auf In der Nähe, um die Läden um dich herum zu sehen, oder gib einen Ort oder eine Postleitzahl ein.', 'Toca Cerca para ver las tiendas a tu alrededor, o escribe una ciudad o un código postal.')) + '</p>' : '');
        if (q.trim().length >= 2) h += '<button type="button" class="stp-more" data-gh="place">' + esc(T('Find shops in "', 'Läden in "', 'Buscar tiendas en "') + q.trim() + T('"', '" suchen', '"')) + '</button>';
        if (q.trim().length >= 2) h += '<button type="button" class="stp-more" data-gh="store-own">' + esc(T('Use "', '"', 'Usar "') + q.trim() + T('" as my shop', '" als meinen Laden nehmen', '" como mi tienda')) + '</button>';
        h += '</div>';
        return shell(h, '<button type="button" class="stp-pill" data-gh="home">' + esc(T('Back', 'Zurück', 'Atrás')) + '</button>');
    }
    function photoHTML() {
        const t = pendingPhoto && pendingPhoto.target, nm = t ? t.name : '';
        const h = '<div class="stp-head"><h3>' + esc(T('What is in the photo?', 'Was ist auf dem Foto?', '¿Qué hay en la foto?')) + '</h3><p>' + esc(T('The app does not look at the photo or rate it. It only checks this is a new picture, then drops it. Your name for it is what counts.', 'Die App schaut sich das Foto nicht an und bewertet es nicht. Sie prüft nur, dass es ein neues Bild ist, und verwirft es dann. Es zählt, wie du es nennst.', 'La app no mira ni valora la foto. Solo comprueba que es nueva y luego la descarta. Cuenta el nombre que le pongas.')) + '</p></div>' +
            '<div class="stp-scroll"><form class="gh-form" data-gh-form="photo" autocomplete="off"><input class="stp-q" name="n" maxlength="60" required value="' + esc(nm) + '" placeholder="' + esc(T('e.g. Kiwi', 'z. B. Kiwi', 'p. ej. Kiwi')) + '" aria-label="' + esc(T('Product name', 'Produktname', 'Nombre del producto')) + '">' +
            '<button class="stp-go" type="submit">' + IC.star + '<span>' + esc(T('Catch it', 'Fangen', 'Capturar')) + '</span></button></form>' + (msg ? '<p class="stp-msg">' + esc(msg) + '</p>' : '') + '</div>';
        return shell(h, '<button type="button" class="stp-pill" data-gh="home">' + esc(T('Cancel', 'Abbrechen', 'Cancelar')) + '</button>');
    }
    let comboPick = {};
    function comboNewHTML() {
        const todays = C.catchesOn(S, C.dayOf(Date.now()));
        const h = '<div class="stp-head"><h3>' + esc(T('New power combo', 'Neue Power-Kombi', 'Nuevo combo de poder')) + '</h3><p>' + esc(T('Pick 2 to 4 products you caught today. Any brand of the same food counts later, like quark from any shop.', 'Wähl 2 bis 4 Produkte, die du heute gefangen hast. Später zählt jede Marke desselben Lebensmittels, z. B. Quark aus jedem Laden.', 'Elige de 2 a 4 productos capturados hoy. Luego cuenta cualquier marca del mismo alimento.')) + '</p></div>' +
            '<div class="stp-scroll"><form class="gh-form" data-gh-form="combo" autocomplete="off"><div class="stp-rows">' + todays.map(c => '<label class="stp-row gh-pick"><b>' + esc(c.name) + '</b><small>' + esc(c.kind ? C.kindLabel(c.kind, li()) + T(' · any brand', ' · jede Marke', ' · cualquier marca') : T('this exact product', 'genau dieses Produkt', 'este producto exacto')) + '</small><i><input type="checkbox" name="k" value="' + esc(c.key) + '"' + (comboPick[c.key] ? ' checked' : '') + '></i></label>').join('') + '</div>' +
            '<input class="stp-q" name="n" maxlength="40" placeholder="' + esc(T('Name (optional), e.g. Super snack', 'Name (optional), z. B. Super-Snack', 'Nombre (opcional)')) + '" style="margin-top:12px;width:100%">' +
            (S.consent ? '<label class="stp-tog gh-tog"><input type="checkbox" name="share" checked> <span>' + esc(T('Share it with other shoppers at this shop', 'Mit anderen in diesem Laden teilen', 'Compartir con otras personas en esta tienda')) + '</span></label>' : '') +
            '<button class="stp-go" type="submit" style="margin-top:12px">' + IC.star + '<span>' + esc(T('Save combo', 'Kombi speichern', 'Guardar combo')) + '</span></button></form>' + (msg ? '<p class="stp-msg">' + esc(msg) + '</p>' : '') + '</div>';
        return shell(h, '<button type="button" class="stp-pill" data-gh="home">' + esc(T('Back', 'Zurück', 'Atrás')) + '</button>');
    }
    function paint() {
        if (!ov) return;
        const top = ov.querySelector('.stp-scroll'), y = top && view === ov.dataset.view ? top.scrollTop : 0;
        ov.innerHTML = view === 'shops' ? shopsHTML() : view === 'photo' ? photoHTML() : view === 'combo' ? comboNewHTML() : homeHTML();
        ov.dataset.view = view;
        const sc = ov.querySelector('.stp-scroll'); if (sc && y) sc.scrollTop = y;
    }
    function refresh() { if (ov && view === 'home' && S.plan.store) pull(S.plan.store).then(() => { if (ov && view === 'home') paint(); }); }
    /* Oct 22, 2026 (Emmanuel: "Don't make this based on my location, the creator"): no bundled shop list for one region any more.
       Shops come live from OpenStreetMap around your own position (Near me) or a town / postcode you type (store-picks-core.js
       lookup). The list lives in memory while the panel is open; no position is stored or shared. */
    let finder = null;
    const look = () => { const P = SP(); return finder || (P && P.lookup ? (finder = P.lookup((u, o) => fetch(u, o))) : null); };
    const lang = () => ['en', 'de', 'es'][li()];
    function loadStores() { if (!stores) stores = { stores: [] }; return Promise.resolve(stores); }
    function shopsAround(at, cc) {
        const L = look(); if (!L) return Promise.reject(new Error('no lookup'));
        return L.shops(at, cc).then(list => { stores = { stores: list }; return stores; });
    }
    const MAPFAIL = () => T('Couldn\'t load shops from the map right now. Try again, or type your shop\'s name and use it as your shop.', 'Die Läden ließen sich gerade nicht von der Karte laden. Versuch es nochmal oder tipp den Namen deines Ladens und nimm ihn als deinen Laden.', 'No se pudieron cargar las tiendas del mapa. Inténtalo de nuevo o escribe el nombre de tu tienda y úsala.');

    function setStore(s) {
        const P = SP();
        C.setPlan(S, { store: s ? { id: s.id, name: s.name || s.brand, brand: s.brand || '', chain: s.chain || '', town: s.town != null ? s.town : (P && s.lat ? P.town(s) : '') } : null });
        try { localStorage.removeItem(SPK); } catch (e) {}
        save(); cloud.store = ''; msg = ''; view = 'home'; paint(); refresh();
    }
    /* BH-036 (P-CLOSING-STILL-LIVE): the panel fades out for 240 ms after it closes and stayed clickable: a double tap on "Scan"
       opened the shop camera twice, and a tap on Photo meanwhile opened the photo picker for a closed panel. A closing panel now
       ignores taps, and a real tap that closes it is marked spent (fresh-scrim.js) so the 2nd tap on that spot presses nothing. */
    function spend(e) { try { const F = W.LowiFreshScrim; if (F && F.spent) F.spent(e); } catch (x) {} }
    function onClick(e) {
        const t = e.target; if (!t || !t.closest) return;
        if (!ov || !ov.contains(t)) return;
        if (t === ov) { spend(e); close(); return; }
        const b = t.closest('[data-gh]'); if (!b || (b.tagName === 'INPUT' && b.type !== 'checkbox')) return;
        const a = b.getAttribute('data-gh');
        if (a === 'consent') { S.consent = !!b.checked; save(); refresh(); return; }
        if (b.tagName === 'INPUT') return;
        e.preventDefault();
        const now = Date.now();
        if (a === 'close') { spend(e); return close(); }
        if (a === 'home') { view = 'home'; msg = ''; pendingPhoto = null; return paint(); }
        if (a === 'scan') { spend(e); close(); try { W.LowiShopScan && W.LowiShopScan.open(); } catch (er) {} return; }
        if (a === 'photo') return askPhoto(null);
        if (a === 'photo-hint') { const h = picking && picking.hints[+b.dataset.i]; if (h) askPhoto({ name: h.name, bc: h.bc }); return; }
        if (a === 'photo-combo') { const cb = C.allCombos(S, shared().combos).find(c => c.id === b.dataset.c), it = cb && cb.items[+b.dataset.j]; if (it) askPhoto({ name: it.kind ? C.kindLabel(it.kind, li()) : it.label, kind: it.kind || '' }); return; }
        if (a === 'shops') { view = 'shops'; msg = ''; paint(); loadStores().then(() => { if (ov && view === 'shops') paint(); }).catch(() => { msg = T('Couldn\'t load the shop list. Type your shop\'s name instead.', 'Die Ladenliste ließ sich nicht laden. Tipp stattdessen den Namen deines Ladens.', 'No se pudo cargar la lista. Escribe el nombre de tu tienda.'); paint(); }); return; }
        if (a === 'near') {
            if (!navigator.geolocation) { msg = T('Location isn\'t available here. Search for your shop instead.', 'Standort ist hier nicht verfügbar. Such deinen Laden stattdessen.', 'La ubicación no está disponible. Busca tu tienda.'); return paint(); }
            msg = T('Finding shops near you…', 'Suche Läden in deiner Nähe…', 'Buscando tiendas cerca…'); paint();
            navigator.geolocation.getCurrentPosition(p => { const at = { lat: p.coords.latitude, lon: p.coords.longitude }; where = at; q = ''; shopsAround(at).then(() => { if (where === at) msg = ''; paint(); }).catch(() => { msg = MAPFAIL(); paint(); }); },
                () => { msg = T('Location is off. Search for your shop instead.', 'Standort ist aus. Such deinen Laden stattdessen.', 'La ubicación está desactivada. Busca tu tienda.'); paint(); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
            return;
        }
        if (a === 'store') { const s = (stores && stores.stores || []).find(x => x.id === b.dataset.id); if (s) setStore(s); return; }
        if (a === 'place') {
            const t = q.trim(), L = look(); if (t.length < 2 || !L) return;
            msg = T('Looking up ', 'Suche ', 'Buscando ') + t + '…'; paint();
            L.search(t, lang()).then(pl => {
                if (!pl) { msg = T('Couldn\'t find that place. Check the spelling or try a postcode.', 'Den Ort gibt es so nicht. Prüf die Schreibweise oder versuch eine Postleitzahl.', 'No se encontró ese lugar. Revisa la ortografía o prueba un código postal.'); return paint(); }
                const at = { lat: pl.lat, lon: pl.lon }; where = at;
                return shopsAround(at, pl.cc).then(() => { if (where === at) { q = ''; msg = T('Shops around ', 'Läden rund um ', 'Tiendas en torno a ') + (pl.line || t); } paint(); });
            }).catch(() => { msg = MAPFAIL(); paint(); });
            return;
        }
        if (a === 'store-own') { const n = q.trim().slice(0, 40); if (n.length >= 2) setStore({ id: 'own:' + C.nameKey(n).replace(/ /g, '-'), name: n, brand: '', town: '' }); return; }
        if (a === 'plan-edit') { const sp = SPL(); if (sp && sp.openEditor) { close(); try { sp.openEditor(); } catch (e) {} } return; }
        if (a === 'every') { C.setPlan(S, { every: +b.dataset.n }); save(); return paint(); }
        if (a === 'day') { const d = +b.dataset.d, ds = S.plan.days.slice(), i = ds.indexOf(d); if (i >= 0) ds.splice(i, 1); else ds.push(d); C.setPlan(S, { days: ds }); save(); return paint(); }
        if (a === 'pause') { C.pause(S, now, +b.dataset.n); save(); return paint(); }
        if (a === 'resume') { C.resume(S, now); save(); return paint(); }
        if (a === 'grace') { if (C.grace(S, now)) { save(); msg = T('Your world stays bright 3 more days. Next time, a product photo works when the barcode won\'t scan.', 'Deine Welt bleibt 3 Tage länger hell. Nächstes Mal geht auch ein Produktfoto, wenn der Barcode nicht klappt.', 'Tu mundo sigue luminoso 3 días más. La próxima vez, una foto del producto sirve si el código no se escanea.'); } return paint(); }
        if (a === 'combo-new') { comboPick = {}; view = 'combo'; msg = ''; return paint(); }
        if (a === 'open') { open(); return; }
    }
    function onSubmit(e) {
        const f = e.target; if (!f || !f.getAttribute) return;
        const k = f.getAttribute('data-gh-form'); if (!k) return;
        e.preventDefault();
        if (k === 'photo' && pendingPhoto) {
            const n = String(f.n.value || '').trim(); if (n.length < 2) return;
            const t = pendingPhoto.target || {};
            const res = doCatch({ via: 'photo', name: n, bc: t.bc || '', kind: t.kind || C.kindOf(n), photoHash: pendingPhoto.hash });
            pendingPhoto = null;
            if (!res.ok) { msg = res.why === 'samephoto' ? T('That photo was already used. Take a new one of the product.', 'Dieses Foto wurde schon benutzt. Mach ein neues vom Produkt.', 'Esa foto ya se usó. Haz una nueva del producto.') : T('That didn\'t count. Try again.', 'Das hat nicht gezählt. Versuch es nochmal.', 'No contó. Inténtalo de nuevo.'); view = 'home'; return paint(); }
            lastRes = lines(res); msg = ''; view = 'home'; return paint();
        }
        if (k === 'combo') {
            const keys = [...f.querySelectorAll('input[name="k"]:checked')].map(i => i.value);
            const r = C.makeCombo(S, keys, f.n.value, S.plan.store, Date.now());
            if (!r.ok) { msg = r.why === 'exists' ? T('You already have that combo.', 'Diese Kombi gibt es schon.', 'Ese combo ya existe.') : T('Pick 2 to 4 products.', 'Wähl 2 bis 4 Produkte.', 'Elige de 2 a 4 productos.'); keys.forEach(x => { comboPick[x] = 1; }); return paint(); }
            save();
            const sh = f.share && f.share.checked;
            lastRes = [T('Combo saved: ', 'Kombi gespeichert: ', 'Combo guardado: ') + r.combo.name + T('. Catch it again on a later trip for the power-up.', '. Fang sie bei einem späteren Einkauf wieder für das Power-up.', '. Vuelve a capturarlo otro día para el power-up.')];
            view = 'home'; msg = ''; paint();
            if (sh) pushCombo(r.combo).then(ok => { if (ok) { r.combo.shared = true; save(); } else lastRes = lastRes.concat(T('It stays on this phone: sharing isn\'t available right now.', 'Sie bleibt auf diesem Handy: Teilen geht gerade nicht.', 'Se queda en este móvil: compartir no está disponible ahora.')); if (ov) paint(); });
        }
    }
    let qT = 0;
    function onInput(e) { const t = e.target; if (!t || t.getAttribute('data-gh') !== 'q') return; q = t.value; clearTimeout(qT); qT = setTimeout(() => { if (!ov || view !== 'shops') return; loadStores().then(() => { paint(); const i = ov.querySelector('[data-gh="q"]'); if (i) { i.focus(); try { i.setSelectionRange(q.length, q.length); } catch (er) {} } }).catch(() => {}); }, 250); }
    function onKey(e) { if (e.key === 'Escape' && ov) close(); }
    function open(v) {
        load();
        if (ov) { view = v || 'home'; paint(); return; }
        ov = D.createElement('div'); ov.className = 'stp-ov gh-ov';
        view = v || 'home'; msg = ''; lastRes = null;
        ov.addEventListener('click', onClick); ov.addEventListener('submit', onSubmit); ov.addEventListener('input', onInput);
        D.addEventListener('keydown', onKey);
        D.body.appendChild(ov); paint();
        requestAnimationFrame(() => { if (ov) ov.classList.add('in'); });
        refresh();
    }
    function close() {
        if (!ov) return; const o = ov; ov = null; where = null; stores = null; D.removeEventListener('keydown', onKey);
        o.classList.remove('in'); o.classList.add('out'); setTimeout(() => { try { o.remove(); } catch (e) {} }, 240);
        decorate();
    }

    /* the power-up: a golden aura over the screen for a moment */
    function power(cb) {
        try {
            const p = D.createElement('div'); p.className = 'gh-power'; p.setAttribute('role', 'status');
            p.innerHTML = '<div class="gh-power-t"><b>' + esc(T('Power combo!', 'Power-Kombi!', '¡Combo de poder!')) + '</b><span>' + esc(comboName(cb)) + ' · +' + C.XP.combo + ' XP</span></div>';
            D.body.appendChild(p); setTimeout(() => { p.classList.add('out'); setTimeout(() => p.remove(), 600); }, 2600);
            if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
        } catch (e) {}
    }

    /* ---------- the way in: Shop mode (under Scan a product) and the shopping scanner ---------- */
    /* 0.32: plain words under Scan a product: what you have today, not a glow percentage */
    function entryHTML() {
        load();
        const now = Date.now(), n = C.catchesOn(S, C.dayOf(now)).length;
        const sub = n ? T(n + ' scanned today · Power combos', n + ' heute gescannt · Power-Kombis', n + ' escaneados hoy · combos de poder') :
            T('Scan food, earn XP, catch Power combos', 'Essen scannen, XP sammeln, Power-Kombis fangen', 'Escanea comida, gana XP, atrapa combos de poder');
        return '<span class="gh-entry-dot" aria-hidden="true">' + IC.star + '</span><span class="stp-sos-t"><b>' + esc(T('Shop finds', 'Ladenfunde', 'Hallazgos en la tienda')) + '</b><small>' + esc(sub) + '</small></span>';
    }
    function decorate() {
        D.querySelectorAll('.ss-entry').forEach(en => {
            const par = en.parentNode; if (!par) return;
            let b = par.querySelector(':scope > .gh-entry');
            if (!b) { b = D.createElement('button'); b.type = 'button'; b.className = 'gh-entry'; b.setAttribute('data-gh', 'open'); en.insertAdjacentElement('afterend', b); }
            const h = entryHTML(); if (b.__h !== h) { b.innerHTML = h; b.__h = h; }
        });
        D.querySelectorAll('#b3Cam .ss-row').forEach(r => { if (r.querySelector('.gh-hunt')) return; r.insertAdjacentHTML('beforeend', '<button type="button" class="ss-chip gh-hunt" data-gh="open">' + IC.star + '<span>' + esc(T('Finds', 'Funde', 'Hallazgos')) + '</span></button>'); });
    }
    let pend = 0;
    function soon() { if (pend) return; pend = requestAnimationFrame(() => { pend = 0; try { decorate(); } catch (e) {} }); }
    /* Oct 22 bug hunt: the Finds chip lives inside the shopping scanner, which sits on top of everything (z-index 2147483000), so the
       panel (z-index 410) opened underneath it and the tap looked dead. From the scanner, close the camera first, the same way its
       shopping-list chip does (shop-scan.js goCart), then open the panel. */
    function fromScanner(b) { return !!(b.closest && b.closest('.b3-cam')); }
    D.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-gh="open"]'); if (!b || (ov && ov.contains(b))) return; e.preventDefault(); e.stopPropagation();
        if (fromScanner(b)) { try { if (W.LowiDex && typeof W.LowiDex.stop === 'function') W.LowiDex.stop(); } catch (er) {} }
        open(); }, true);
    function boot() {
        load(); syncPlan(); hookWorld();
        W.addEventListener('lowi:shopplan', () => { syncPlan(); if (ov) { try { paint(); } catch (e) {} } });
        new MutationObserver(soon).observe(D.body, { childList: true, subtree: true });
        ['lowi:lang', 'lowi:grocery', 'focus'].forEach(n => W.addEventListener(n, soon));
        soon();
        let tries = 0; const iv = setInterval(() => { hookWorld(); if (hooked || ++tries > 40) clearInterval(iv); }, 1500);
    }
    W.LowiGrocery = { open, close, glow, status: () => C.status(load(), Date.now()), state: () => JSON.parse(JSON.stringify(load())), isOpen: () => !!ov, _catch: doCatch, _cloud: () => Object.assign({}, cloud) };
    hookWorld();
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
