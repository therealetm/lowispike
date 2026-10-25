/* Oct 25 2026: "Give a hand" under Fuel > Shop (Emmanuel, after the Instagram app "A little help"): people pay for each
   other's HEALTHY groceries, and LOWiSPIKE never touches the money.
   - "I could use a hand": a basket of low-spike staples (from the shopping cart or picked from rated foods; only foods the
     app rates low-spike go in), a rough euro total and the person's OWN Ko-fi / Stripe Payment Link / PayPal.me link.
   - "Give a hand": a calm list of baskets (no swiping on people). The card shows the food, not the hardship: first name or
     anonymous, city optional. The giver leaves the app for the person's link, then taps "I helped"; the first "I helped"
     takes the basket so nobody pays the same groceries twice. +1 sunbeam on the Care board per basket, never per euro.
   - Verified badge (Emmanuel: "like Uber, you rate after the drive"): the person has 7 days to photograph the receipt
     (bottom of the photo blurred where card details usually are; private, only that giver sees it). The giver taps
     Verified or Doesn't match; unanswered for 7 days counts as verified. Score = verified / counted, "New" until one counted.
   Rules: gift-basket-core.js. Server: supabase/proposals/gift_baskets_20261025.sql. Nothing about money passes through here.
   The overlay uses the Shop panel's glass classes (.stp-ov/.stp-card), so the app's back gesture adopts it and Back returns to Shop. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiGiftBasket) return;
    const C = W.LowiGiftBasketCore;
    if (!C) return;
    const DRAFT_KEY = 'lowi.giftBasket.draft.v1';
    const SEEN_KEY = 'lowi.giftBasket.seen.v1';
    const li = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][li()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const eur = n => { try { return Number(n).toLocaleString(['en-IE', 'de-DE', 'es-ES'][li()], { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 }); } catch (e) { return '€' + n; } };
    const rate = n => (W.LowiFoodPolicy && W.LowiFoodPolicy.rateName ? W.LowiFoodPolicy.rateName(n) : null);
    const STAPLES = [
        ['Eggs', 'Eier', 'Huevos'], ['Plain yoghurt', 'Naturjoghurt', 'Yogur natural'], ['Cottage cheese', 'Hüttenkäse', 'Queso cottage'],
        ['Chicken breast', 'Hähnchenbrust', 'Pechuga de pollo'], ['Salmon', 'Lachs', 'Salmón'], ['Tuna', 'Thunfisch', 'Atún'],
        ['Broccoli', 'Brokkoli', 'Brócoli'], ['Spinach', 'Spinat', 'Espinacas'], ['Cucumber', 'Gurke', 'Pepino'],
        ['Tomatoes', 'Tomaten', 'Tomates'], ['Bell pepper', 'Paprika', 'Pimiento'], ['Frozen berries', 'TK-Beeren', 'Frambuesas'],
        ['Avocado', 'Avocado', 'Aguacate'], ['Almonds', 'Mandeln', 'Almendras'], ['Olive oil', 'Olivenöl', 'Aceite de oliva'], ['Tofu', 'Tofu', 'Tofu']
    ];

    /* ---------- server (overridable for tests: LowiGiftBasket._api) ---------- */
    const COLS = 'id,user_id,first_name,anon,city,items,total_eur,pay_url,created_at,helper_id,helped_at,receipt_path,receipt_at,verdict,verdict_at';
    async function sbc() {
        const x = W.LOWI_CLOUD_X; if (!x || !x.state || !x.client) return null;
        const st = x.state(); if (!st || !st.uid || !st.live) return null;
        return { sb: await x.client(), uid: st.uid };
    }
    const need = async () => { const c = await sbc(); if (!c) throw new Error('offline'); return c; };
    const ok = r => { if (r && r.error) throw r.error; return r ? r.data : null; };
    const cloudApi = {
        uid() { const x = W.LOWI_CLOUD_X, st = x && x.state ? x.state() : null; return st && st.live ? st.uid || '' : ''; },
        async open() { const { sb } = await need(); return ok(await sb.from('gift_baskets').select(COLS).is('helped_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(60)) || []; },
        async mine() { const { sb, uid } = await need(); return ok(await sb.from('gift_baskets').select(COLS).eq('user_id', uid).order('created_at', { ascending: false }).limit(40)) || []; },
        async given() { const { sb, uid } = await need(); return ok(await sb.from('gift_baskets').select(COLS).eq('helper_id', uid).order('helped_at', { ascending: false }).limit(40)) || []; },
        async trust(uids) { if (!uids.length) return []; const { sb } = await need(); return ok(await sb.rpc('gift_trust', { uids: uids.slice(0, 200) })) || []; },
        async share(row, id) {
            const { sb, uid } = await need();
            if (id) return ok(await sb.from('gift_baskets').update(Object.assign({}, row, { updated_at: new Date().toISOString() })).eq('id', id).eq('user_id', uid).select(COLS).single());
            return ok(await sb.from('gift_baskets').insert(Object.assign({ user_id: uid }, row)).select(COLS).single());
        },
        async takeDown(id) { const { sb, uid } = await need(); ok(await sb.from('gift_baskets').delete().eq('id', id).eq('user_id', uid).is('helped_at', null)); return true; },
        async help(id) { const { sb } = await need(); return ok(await sb.rpc('gift_help', { basket: id })); },
        async receipt(id, blob) {
            const { sb, uid } = await need();
            ok(await sb.storage.from('gift-receipts').upload(uid + '/' + id + '.jpg', blob, { contentType: 'image/jpeg', upsert: true }));
            return ok(await sb.rpc('gift_receipt', { basket: id }));
        },
        async receiptUrl(path) { const { sb } = await need(); const d = ok(await sb.storage.from('gift-receipts').createSignedUrl(path, 900)); return d && d.signedUrl || ''; },
        async verdict(id, v) { const { sb } = await need(); return ok(await sb.rpc('gift_verdict', { basket: id, v })); },
        /* is the gift_baskets table there yet? (the server change is applied separately; until then Shop shows no entry) */
        async ready() { const c = await sbc(); if (!c) return null; const r = await c.sb.from('gift_baskets').select('id', { head: true, count: 'exact' }).limit(1); return !(r && r.error); }
    };
    const API = { _api: null };
    const api = () => API._api || cloudApi;

    /* ---------- local state ---------- */
    let ov = null, tab = 'give', busy = false, msg = '', msgKind = '', loaded = false, offline = false;
    let open = [], mine = [], given = [], momentIds = {}, trustBy = {}, opened = {}, receiptUrl = {}, photo = null, blurOn = true;
    let draft = loadDraft();
    function loadDraft() {
        try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); if (d && typeof d === 'object') return { items: Array.isArray(d.items) ? d.items.slice(0, C.MAX_ITEMS).map(String) : [], firstName: String(d.firstName || ''), anon: !!d.anon, city: String(d.city || ''), total: String(d.total || ''), payUrl: String(d.payUrl || '') }; } catch (e) {}
        return { items: [], firstName: '', anon: false, city: '', total: '', payUrl: '' };
    }
    function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {} }
    function seen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch (e) { return {}; } }
    function markSeen(id) { const s = seen(); s[id] = Date.now(); try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) {} }

    /* ---------- texts ---------- */
    const MONEY = () => T('Money goes straight to the person through their own Ko-fi, Stripe or PayPal link. LOWiSPIKE doesn’t handle, check or guarantee payments, and never sees card details.',
        'Das Geld geht direkt an die Person, über ihren eigenen Ko-fi-, Stripe- oder PayPal-Link. LOWiSPIKE wickelt keine Zahlungen ab, prüft sie nicht und garantiert sie nicht und sieht nie Kartendaten.',
        'El dinero va directo a la persona a través de su propio enlace de Ko-fi, Stripe o PayPal. LOWiSPIKE no gestiona, no comprueba ni garantiza los pagos, y nunca ve datos de tarjetas.');
    function badge(t) {
        if (!t || t.label === 'new') return '<span class="gb-badge gb-new">' + esc(T('New', 'Neu', 'Nuevo')) + '</span>';
        return '<span class="gb-badge' + (t.pct >= 90 ? ' gb-good' : t.pct < 60 ? ' gb-low' : '') + '">' + esc(t.pct + (li() ? ' % ' : '% ') + T('verified', 'verifiziert', 'verificado')) + '</span>';
    }
    function who(b) { return b.name || T('Someone', 'Jemand', 'Alguien'); }
    function itemsHTML(items) { return '<ul class="gb-items">' + items.map(n => '<li>' + esc(n) + '</li>').join('') + '</ul>'; }
    function linkText(kind) { return T('Pay with ', 'Bezahlen mit ', 'Pagar con ') + (C.linkName(kind) || 'link'); }
    function left(b) { const d = C.daysLeft(b); return T(d === 1 ? '1 day left' : d + ' days left', d === 1 ? 'noch 1 Tag' : 'noch ' + d + ' Tage', d === 1 ? 'queda 1 día' : 'quedan ' + d + ' días'); }

    /* ---------- paint ---------- */
    function shell(inner) {
        return '<div class="stp-card gb-card" role="dialog" aria-modal="true" aria-labelledby="gb-title">' +
            '<div class="stp-head gb-head"><h3 id="gb-title">\u{1F91D} ' + esc(T('Give a hand', 'Hilf mit', 'Echa una mano')) + '</h3>' +
            '<div class="stp-tabs gb-tabs" role="tablist">' +
            tabBtn('give', T('Give a hand', 'Helfen', 'Ayudar')) + tabBtn('mine', T('I could use a hand', 'Ich brauche Hilfe', 'Necesito ayuda')) + '</div></div>' +
            '<p class="gb-msg' + (msg ? ' on' : '') + (msgKind ? ' gb-' + msgKind : '') + '" role="status" aria-live="polite">' + esc(msg) + '</p>' +
            '<div class="stp-scroll gb-scroll" data-noi18n>' + inner + '</div>' +
            '<div class="stp-foot gb-foot"><span></span><button type="button" class="stp-orb gb-x" data-stp="close" data-gb="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>';
    }
    function tabBtn(id, label) { return '<button type="button" role="tab" class="stp-tab' + (tab === id ? ' on' : '') + '" aria-selected="' + (tab === id) + '" data-gb-tab="' + id + '"><b>' + esc(label) + '</b></button>'; }
    function paint() {
        if (!ov) return;
        const sc = ov.querySelector('.gb-scroll'), top = sc ? sc.scrollTop : 0;
        const f = D.activeElement && ov.contains(D.activeElement) && D.activeElement.id ? D.activeElement.id : '';
        ov.innerHTML = shell(!loaded ? '<p class="stp-msg">' + esc(T('Loading baskets…', 'Lade Körbe …', 'Cargando cestas…')) + '</p>' : offline ? offlineHTML() : tab === 'mine' ? mineHTML() : giveHTML());
        const sc2 = ov.querySelector('.gb-scroll'); if (sc2) sc2.scrollTop = top;
        if (f) { const el = D.getElementById(f); if (el) try { el.focus({ preventScroll: true }); if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
        loadReceipts();
    }
    function offlineHTML() {
        return '<p class="stp-msg">' + esc(T('Give a hand needs you to be online and signed in, so baskets can reach other people.', 'Helfen geht nur online und angemeldet, damit Körbe andere Menschen erreichen.', 'Para ayudar tienes que estar en línea y con sesión iniciada, así las cestas llegan a otras personas.')) + '</p>' +
            '<button type="button" class="stp-pill" data-gb="reload">' + esc(T('Try again', 'Nochmal versuchen', 'Reintentar')) + '</button><p class="stp-fine">' + esc(MONEY()) + '</p>';
    }

    function giveHTML() {
        const me = api().uid();
        const s = seen();
        const arrived = given.filter(b => b.receipt && (!s[b.id] || momentIds[b.id]));
        const moment = arrived.length ? '<div class="gb-moment" role="note"><span aria-hidden="true">\u{1F9FA}</span><div><b>' + esc(T('Your basket arrived', 'Dein Korb ist angekommen', 'Tu cesta ha llegado')) + '</b><small>' +
            esc(T(who(arrived[0]) + ' added the receipt. Have a look below.', who(arrived[0]) + ' hat den Kassenbon hochgeladen. Schau unten nach.', who(arrived[0]) + ' ha subido el ticket. Míralo abajo.')) + '</small></div></div>' : '';
        const intro = '<p class="gb-intro">' + esc(T('Pay for someone’s healthy groceries. Each basket only holds low-spike food.', 'Bezahl jemandem gesunde Lebensmittel. In jedem Korb ist nur Essen ohne großen Zuckerspike.', 'Paga la compra sana de alguien. Cada cesta solo lleva comida sin grandes picos.')) + '</p>' +
            '<p class="gb-money">' + esc(MONEY()) + '</p>';
        const list = open.filter(b => b.owner !== me && b.link);
        const cards = list.length ? list.map(cardHTML).join('') : '<p class="stp-snack-none gb-none">' + esc(T('No baskets right now. Check back later.', 'Gerade keine Körbe. Schau später wieder rein.', 'Ahora no hay cestas. Vuelve más tarde.')) + '</p>';
        const giv = given.length ? '<h4 class="stp-h4">' + esc(T('Baskets you helped', 'Körbe, bei denen du geholfen hast', 'Cestas que has ayudado')) + ' <i>' + given.length + '</i></h4>' + given.map(givenHTML).join('') : '';
        return moment + intro + '<h4 class="stp-h4">' + esc(T('Baskets', 'Körbe', 'Cestas')) + (list.length ? ' <i>' + list.length + '</i>' : '') + '</h4>' + cards + giv;
    }
    function cardHTML(b) {
        const t = trustBy[b.owner];
        const act = opened[b.id]
            ? '<p class="gb-ask">' + esc(T('Did the payment go through?', 'Hat die Zahlung geklappt?', '¿Se ha completado el pago?')) + '</p>' +
              '<div class="stp-foot-acts"><button type="button" class="stp-go gb-helped" data-gb-help="' + esc(b.id) + '"' + (busy ? ' disabled' : '') + '>' + esc(T('I helped', 'Ich habe geholfen', 'He ayudado')) + '</button>' +
              '<a class="stp-pill gb-pay" href="' + esc(b.link) + '" target="_blank" rel="noopener noreferrer external" data-gb-pay="' + esc(b.id) + '">' + esc(T('Open link again', 'Link nochmal öffnen', 'Abrir otra vez')) + ' ↗</a></div>'
            : '<a class="stp-go gb-pay" href="' + esc(b.link) + '" target="_blank" rel="noopener noreferrer external" data-gb-pay="' + esc(b.id) + '">' + esc(linkText(b.kind)) + ' ↗</a>';
        return '<article class="gb-basket" data-gb-id="' + esc(b.id) + '"><header><b>' + esc(who(b)) + '</b>' + (b.city ? '<small>' + esc(b.city) + '</small>' : '') + badge(t) + '</header>' +
            itemsHTML(b.items) + '<p class="gb-total">' + esc(T('About ', 'Etwa ', 'Unos ')) + '<b>' + esc(eur(b.total)) + '</b></p>' + act + '</article>';
    }
    function givenHTML(b) {
        const s = C.status(b);
        let body = '';
        if (s === 'await-receipt') body = '<p class="gb-state">' + esc(T('Waiting for their receipt', 'Warte auf den Kassenbon', 'Esperando el ticket')) + ' · ' + esc(left(b)) + '</p>';
        else if (s === 'missed') body = '<p class="gb-state gb-low">' + esc(T('No receipt came within 7 days.', 'Innerhalb von 7 Tagen kam kein Kassenbon.', 'No llegó ningún ticket en 7 días.')) + '</p>';
        else {
            const url = receiptUrl[b.id];
            body = '<figure class="gb-receipt">' + (url ? '<img src="' + esc(url) + '" alt="' + esc(T('Grocery receipt from ', 'Kassenbon von ', 'Ticket de ') + who(b)) + '" loading="lazy">' : '<span class="gb-receipt-wait">' + esc(T('Loading the receipt…', 'Lade den Kassenbon …', 'Cargando el ticket…')) + '</span>') + '</figure>';
            if (s === 'await-verdict') body += '<p class="gb-ask">' + esc(T('Does the receipt match the basket?', 'Passt der Kassenbon zum Korb?', '¿Coincide el ticket con la cesta?')) + '</p>' +
                '<div class="stp-foot-acts"><button type="button" class="stp-go" data-gb-verdict="verified" data-gb-for="' + esc(b.id) + '"' + (busy ? ' disabled' : '') + '>' + esc(T('Verified ✓', 'Verifiziert ✓', 'Verificado ✓')) + '</button>' +
                '<button type="button" class="stp-pill" data-gb-verdict="mismatch" data-gb-for="' + esc(b.id) + '"' + (busy ? ' disabled' : '') + '>' + esc(T('Doesn’t match', 'Passt nicht', 'No coincide')) + '</button></div>' +
                '<p class="stp-fine gb-fine">' + esc(left(b) + T('. If you don’t answer, it counts as verified.', '. Wenn du nicht antwortest, gilt er als verifiziert.', '. Si no respondes, cuenta como verificado.')) + '</p>';
            else body += '<p class="gb-state' + (s === 'mismatch' ? ' gb-low' : ' gb-good') + '">' + esc(s === 'mismatch' ? T('You said it doesn’t match.', 'Du hast gesagt: passt nicht.', 'Dijiste que no coincide.') : s === 'auto-verified' ? T('Counted as verified.', 'Gilt als verifiziert.', 'Cuenta como verificado.') : T('You verified it ✓', 'Du hast ihn verifiziert ✓', 'Lo verificaste ✓')) + '</p>';
        }
        return '<article class="gb-basket gb-given" data-gb-id="' + esc(b.id) + '"><header><b>\u{1F9FA} ' + esc(who(b)) + '</b>' + (b.city ? '<small>' + esc(b.city) + '</small>' : '') + '</header>' + itemsHTML(b.items) + body + '</article>';
    }

    function mineHTML() {
        const me = api().uid();
        const t = C.trust(mine, Date.now());
        const head = '<div class="gb-score"><span>' + esc(T('Your badge', 'Dein Abzeichen', 'Tu insignia')) + '</span>' + badge(t) + '</div>' +
            '<p class="stp-fine gb-fine">' + esc(T('After someone helps, add your grocery receipt within 7 days. They tap Verified, and your badge stays high. No receipt, or one that doesn’t match, lowers it.', 'Wenn dir jemand hilft, lade innerhalb von 7 Tagen deinen Kassenbon hoch. Die Person tippt auf Verifiziert, und dein Abzeichen bleibt oben. Kein Kassenbon oder einer, der nicht passt, senkt es.', 'Cuando alguien te ayude, sube tu ticket de la compra en 7 días. Esa persona toca Verificado y tu insignia se mantiene alta. Sin ticket, o con uno que no coincide, baja.')) + '</p>';
        const due = mine.filter(b => C.canReceipt(b));
        const dueHTML = due.map(receiptHTML).join('');
        const cur = mine.find(b => !b.helped);
        const hist = mine.filter(b => b.helped && !C.canReceipt(b));
        const histHTML = hist.length ? '<h4 class="stp-h4">' + esc(T('Helped baskets', 'Geholfene Körbe', 'Cestas ayudadas')) + ' <i>' + hist.length + '</i></h4><ul class="gb-hist">' + hist.map(b => {
            const s = C.status(b);
            const l = { 'await-verdict': T('Receipt sent, waiting for their answer', 'Kassenbon gesendet, wartet auf Antwort', 'Ticket enviado, esperando respuesta'), verified: T('Verified ✓', 'Verifiziert ✓', 'Verificado ✓'), 'auto-verified': T('Counted as verified', 'Gilt als verifiziert', 'Cuenta como verificado'), mismatch: T('Marked as not matching', 'Als unpassend markiert', 'Marcado como que no coincide'), missed: T('No receipt in 7 days', 'Kein Kassenbon in 7 Tagen', 'Sin ticket en 7 días') }[s] || '';
            return '<li><b>' + esc(b.items.slice(0, 3).join(', ') + (b.items.length > 3 ? ' …' : '')) + '</b><small>' + esc(l) + '</small></li>';
        }).join('') + '</ul>' : '';
        const body = cur ? myBasketHTML(cur) : builderHTML();
        void me;
        return dueHTML + head + body + histHTML;
    }
    function myBasketHTML(b) {
        return '<h4 class="stp-h4">' + esc(T('Your basket is shared', 'Dein Korb ist geteilt', 'Tu cesta está compartida')) + '</h4>' +
            '<article class="gb-basket gb-mine"><header><b>' + esc(who(b)) + '</b>' + (b.city ? '<small>' + esc(b.city) + '</small>' : '') + '</header>' + itemsHTML(b.items) +
            '<p class="gb-total">' + esc(T('About ', 'Etwa ', 'Unos ')) + '<b>' + esc(eur(b.total)) + '</b> · ' + esc(C.linkName(b.kind)) + '</p>' +
            '<p class="stp-fine gb-fine">' + esc(T('Others see it under Give a hand until someone helps. It goes away by itself after 3 weeks.', 'Andere sehen ihn unter Helfen, bis jemand hilft. Nach 3 Wochen verschwindet er von selbst.', 'Los demás la ven en Ayudar hasta que alguien ayude. Desaparece sola a las 3 semanas.')) + '</p>' +
            '<button type="button" class="stp-pill gb-down" data-gb="down" data-gb-for="' + esc(b.id) + '"' + (busy ? ' disabled' : '') + '>' + esc(T('Take my basket down', 'Meinen Korb zurücknehmen', 'Retirar mi cesta')) + '</button></article>' +
            '<p class="gb-money">' + esc(MONEY()) + '</p>';
    }
    function receiptHTML(b) {
        return '<article class="gb-basket gb-due" data-gb-id="' + esc(b.id) + '"><header><b>\u{1F49A} ' + esc(T('Someone helped you!', 'Jemand hat dir geholfen!', '¡Alguien te ha ayudado!')) + '</b></header>' + itemsHTML(b.items) +
            '<p class="gb-ask">' + esc(T('Add a photo of your grocery receipt', 'Lade ein Foto deines Kassenbons hoch', 'Sube una foto de tu ticket de la compra')) + ' · ' + esc(left(b)) + '</p>' +
            '<p class="stp-fine gb-fine">' + esc(T('Cover your card number and your address before you take it. Only the person who helped you sees the photo.', 'Deck vorher Kartennummer und Adresse ab. Nur die Person, die dir geholfen hat, sieht das Foto.', 'Tapa el número de tarjeta y tu dirección antes de hacer la foto. Solo la persona que te ayudó ve la foto.')) + '</p>' +
            (photo && photo.id === b.id ? '<figure class="gb-receipt"><img src="' + esc(photo.url) + '" alt="' + esc(T('Your receipt photo', 'Dein Kassenbon-Foto', 'Tu foto del ticket')) + '"></figure>' +
                '<label class="gb-check"><input type="checkbox" id="gb-blur" data-gb="blur"' + (blurOn ? ' checked' : '') + '> ' + esc(T('Blur the bottom (where card details usually are)', 'Unten verwischen (da stehen meist die Kartendaten)', 'Difuminar la parte de abajo (donde suelen ir los datos de la tarjeta)')) + '</label>' +
                '<div class="stp-foot-acts"><button type="button" class="stp-go" data-gb="send-receipt" data-gb-for="' + esc(b.id) + '"' + (busy ? ' disabled' : '') + '>' + esc(T('Send to my helper', 'An meinen Helfer senden', 'Enviar a quien me ayudó')) + '</button>' +
                '<label class="stp-pill gb-file">' + esc(T('Retake', 'Neu', 'Repetir')) + '<input type="file" accept="image/*" capture="environment" data-gb-file="' + esc(b.id) + '"></label></div>'
                : '<label class="stp-go gb-file">\u{1F4F7} ' + esc(T('Photograph the receipt', 'Kassenbon fotografieren', 'Fotografiar el ticket')) + '<input type="file" accept="image/*" capture="environment" data-gb-file="' + esc(b.id) + '"></label>') + '</article>';
    }
    function builderHTML() {
        const chosen = draft.items;
        const has = n => chosen.some(x => C.norm(x) === C.norm(n));
        let cart = [];
        try { cart = W.LOWI_SHELF && W.LOWI_SHELF.listOpen ? W.LOWI_SHELF.listOpen() : []; } catch (e) { cart = []; }
        const cartOk = [], cartNo = [];
        cart.forEach(i => { const c = C.itemCheck(i && i.n, rate); if (!c.name) return; (c.ok ? cartOk : cartNo).push(c.name); });
        const staples = STAPLES.map(s => s[li()]).filter(n => C.itemCheck(n, rate).ok);
        const chip = n => '<button type="button" class="stp-chip gb-add-chip" data-gb-add="' + esc(n) + '">+ ' + esc(n) + '</button>';
        const link = draft.payUrl ? C.payLink(draft.payUrl) : null;
        const linkMsg = !link ? '' : link.ok ? '✓ ' + C.linkName(link.kind) : linkWhy(link);
        const built = C.build(draft, rate);
        return '<h4 class="stp-h4">' + esc(T('Share a basket', 'Korb teilen', 'Compartir una cesta')) + '</h4>' +
            '<p class="gb-intro">' + esc(T('Pick the healthy groceries you need. Only low-spike food can go in a basket.', 'Wähl die gesunden Lebensmittel, die du brauchst. In einen Korb kommt nur Essen ohne großen Zuckerspike.', 'Elige la compra sana que necesitas. En una cesta solo entra comida sin grandes picos.')) + '</p>' +
            '<div class="gb-chosen" aria-label="' + esc(T('Your basket', 'Dein Korb', 'Tu cesta')) + '">' + (chosen.length ? chosen.map(n => '<button type="button" class="stp-chip on" data-gb-drop="' + esc(n) + '" aria-label="' + esc(T('Remove ', 'Entfernen: ', 'Quitar ') + n) + '">' + esc(n) + ' <i aria-hidden="true">×</i></button>').join('') : '<span class="gb-empty">' + esc(T('Your basket is empty.', 'Dein Korb ist leer.', 'Tu cesta está vacía.')) + '</span>') + '</div>' +
            '<form class="stp-snack-add gb-addf" data-gb-form="item"><input id="gb-item" type="text" maxlength="40" autocomplete="off" enterkeyhint="done" placeholder="' + esc(T('Add a food, like eggs', 'Lebensmittel hinzufügen, z. B. Eier', 'Añade un alimento, p. ej. huevos')) + '" aria-label="' + esc(T('Add a food to the basket', 'Lebensmittel zum Korb hinzufügen', 'Añadir un alimento a la cesta')) + '"><button type="submit" class="stp-pill">' + esc(T('Add', 'Hinzufügen', 'Añadir')) + '</button></form>' +
            (cartOk.filter(n => !has(n)).length ? '<p class="gb-sub">' + esc(T('From your shopping cart', 'Aus deinem Einkaufswagen', 'De tu carrito')) + '</p><div class="gb-chips">' + cartOk.filter(n => !has(n)).map(chip).join('') + '</div>' : '') +
            (cartNo.length ? '<p class="stp-fine gb-fine">' + esc(T('Not for a basket (not low-spike): ', 'Nicht für einen Korb (kein Low-Spike): ', 'No para una cesta (no es bajo en picos): ') + cartNo.slice(0, 6).join(', ')) + '</p>' : '') +
            '<p class="gb-sub">' + esc(T('Healthy staples', 'Gesunde Basics', 'Básicos sanos')) + '</p><div class="gb-chips">' + staples.filter(n => !has(n)).map(chip).join('') + '</div>' +
            '<label class="gb-field"><span>' + esc(T('Rough total in euros', 'Ungefährer Betrag in Euro', 'Total aproximado en euros')) + '</span><input id="gb-total" data-gb-in="total" inputmode="decimal" maxlength="7" placeholder="25" value="' + esc(draft.total) + '"></label>' +
            '<p class="stp-fine gb-fine">' + esc(T('Between €5 and €150.', 'Zwischen 5 und 150 €.', 'Entre 5 y 150 €.')) + '</p>' +
            '<label class="gb-field"><span>' + esc(T('Your payment link', 'Dein Zahlungslink', 'Tu enlace de pago')) + '</span><input id="gb-link" data-gb-in="payUrl" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="300" placeholder="https://ko-fi.com/yourname" value="' + esc(draft.payUrl) + '"></label>' +
            '<p class="gb-linkmsg' + (link && !link.ok ? ' gb-low' : '') + '" id="gb-linkmsg" aria-live="polite">' + esc(linkMsg) + '</p>' +
            '<p class="stp-fine gb-fine">' + esc(T('Your own Ko-fi page, Stripe Payment Link or PayPal.me link. Givers pay you there directly.', 'Deine eigene Ko-fi-Seite, dein Stripe-Zahlungslink oder dein PayPal.me-Link. Dort zahlen dir Helfer direkt.', 'Tu propia página de Ko-fi, enlace de pago de Stripe o enlace de PayPal.me. Allí te pagan directamente.')) + '</p>' +
            '<label class="gb-check"><input type="checkbox" id="gb-anon" data-gb-in="anon"' + (draft.anon ? ' checked' : '') + '> ' + esc(T('Stay anonymous', 'Anonym bleiben', 'Quedarme anónimo')) + '</label>' +
            (draft.anon ? '' : '<label class="gb-field"><span>' + esc(T('First name (optional)', 'Vorname (optional)', 'Nombre (opcional)')) + '</span><input id="gb-name" data-gb-in="firstName" maxlength="24" autocomplete="given-name" value="' + esc(draft.firstName) + '"></label>') +
            '<label class="gb-field"><span>' + esc(T('City (optional)', 'Stadt (optional)', 'Ciudad (opcional)')) + '</span><input id="gb-city" data-gb-in="city" maxlength="40" autocomplete="address-level2" value="' + esc(draft.city) + '"></label>' +
            '<p class="gb-money">' + esc(MONEY()) + '</p>' +
            '<button type="button" class="stp-go gb-share" data-gb="share"' + (busy || !built.ok ? ' disabled' : '') + '>' + esc(T('Share my basket', 'Meinen Korb teilen', 'Compartir mi cesta')) + '</button>' +
            '<p class="stp-fine gb-fine gb-missing"' + (built.ok ? ' hidden' : '') + '>' + esc(missing(built)) + '</p>';
    }
    function missing(built) { return built.ok ? '' : T('Still missing: ', 'Es fehlt noch: ', 'Falta: ') + built.errors.map(e => ({ items: T('food', 'Essen', 'comida'), total: T('total', 'Betrag', 'total'), link: T('payment link', 'Zahlungslink', 'enlace de pago') })[e]).join(', '); }
    function linkWhy(l) {
        if (l.why === 'https') return T('The link must start with https://', 'Der Link muss mit https:// beginnen', 'El enlace debe empezar por https://');
        if (l.why === 'host') return T('Only Ko-fi, Stripe Payment Links (buy.stripe.com) or PayPal.me links work.', 'Nur Ko-fi-, Stripe-Zahlungslinks (buy.stripe.com) oder PayPal.me-Links gehen.', 'Solo sirven enlaces de Ko-fi, de pago de Stripe (buy.stripe.com) o de PayPal.me.');
        if (l.kind === 'kofi') return T('Use your public Ko-fi page, like ko-fi.com/yourname', 'Nimm deine öffentliche Ko-fi-Seite, z. B. ko-fi.com/deinname', 'Usa tu página pública de Ko-fi, p. ej. ko-fi.com/tunombre');
        return T('This link doesn’t look right. Copy it again from your account.', 'Der Link sieht nicht richtig aus. Kopier ihn nochmal aus deinem Konto.', 'Este enlace no parece correcto. Cópialo otra vez de tu cuenta.');
    }

    /* ---------- data ---------- */
    async function load() {
        const a = api();
        if (!a.uid()) { offline = true; loaded = true; paint(); return; }
        try {
            const [o, m, g] = await Promise.all([a.open(), a.mine(), a.given()]);
            open = o.map(C.view).filter(Boolean); mine = m.map(C.view).filter(Boolean); given = g.map(C.view).filter(Boolean);
            /* "your basket arrived" shows for this visit, then counts as seen */
            const sn = seen(); momentIds = {}; given.forEach(b => { if (b.receipt && !sn[b.id]) { momentIds[b.id] = 1; markSeen(b.id); } });
            offline = false;
            const uids = [...new Set(open.map(b => b.owner).filter(Boolean))];
            trustBy = {};
            try { (await a.trust(uids)).forEach(r => { trustBy[r.user_id] = C.fromCounts(r.counted, r.verified, r.pending); }); } catch (e) {}
        } catch (e) { offline = true; }
        loaded = true; paint();
    }
    async function loadReceipts() {
        if (!ov || tab !== 'give') return;
        for (const b of given) {
            if (!b.receiptPath || receiptUrl[b.id] !== undefined) continue;
            receiptUrl[b.id] = '';
            api().receiptUrl(b.receiptPath).then(u => { receiptUrl[b.id] = u || ''; if (u) paint(); }).catch(() => {});
        }
    }
    function say(t, kind) { msg = t || ''; msgKind = kind || ''; paint(); }
    function errText(e) {
        const m = String(e && (e.message || e.code) || e || '');
        if (/taken/.test(m)) return T('Someone else helped this basket a moment ago. Thank you anyway!', 'Jemand anderes hat gerade bei diesem Korb geholfen. Trotzdem danke!', 'Otra persona acaba de ayudar con esta cesta. ¡Gracias igualmente!');
        if (/too late|closed/.test(m)) return T('The 7 days for this are over.', 'Die 7 Tage dafür sind vorbei.', 'Los 7 días para esto ya han pasado.');
        if (/duplicate|unique|one_open/.test(m)) return T('You already have a basket shared.', 'Du hast schon einen Korb geteilt.', 'Ya tienes una cesta compartida.');
        if (/offline|fetch|network/i.test(m)) return T('You’re offline. Try again when you’re connected.', 'Du bist offline. Versuch es nochmal, wenn du verbunden bist.', 'Estás sin conexión. Inténtalo cuando tengas conexión.');
        return T('That didn’t work. Nothing was changed. Try again.', 'Das hat nicht geklappt. Es wurde nichts geändert. Versuch es nochmal.', 'No ha funcionado. No se ha cambiado nada. Inténtalo de nuevo.');
    }
    async function run(fn) {
        if (busy) return; busy = true; paint();
        try { await fn(); } catch (e) { msg = errText(e); msgKind = 'low'; } finally { busy = false; paint(); }
    }

    /* the receipt photo: at most 1280 px, JPEG, bottom 18% blurred by default (card numbers and payment lines sit there) */
    function readPhoto(file) {
        return new Promise((res, rej) => {
            if (!file || !/^image\//.test(file.type || 'image/')) return rej(new Error('type'));
            const url = URL.createObjectURL(file), img = new Image();
            img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
            img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
            img.src = url;
        });
    }
    function render(img, blur) {
        const k = Math.min(1, 1280 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
        const w = Math.max(1, Math.round((img.naturalWidth || img.width) * k)), h = Math.max(1, Math.round((img.naturalHeight || img.height) * k));
        const cv = D.createElement('canvas'); cv.width = w; cv.height = h;
        const g = cv.getContext('2d'); g.drawImage(img, 0, 0, w, h);
        if (blur) {
            const y = Math.round(h * .82), bh = h - y;
            /* pixelate, then soften: works where ctx.filter does not (older Safari) */
            const s = D.createElement('canvas'), sw = Math.max(1, Math.round(w / 24)), sh = Math.max(1, Math.round(bh / 24));
            s.width = sw; s.height = sh; s.getContext('2d').drawImage(cv, 0, y, w, bh, 0, 0, sw, sh);
            g.imageSmoothingEnabled = true; g.drawImage(s, 0, 0, sw, sh, 0, y, w, bh);
            g.fillStyle = 'rgba(40,40,48,.35)'; g.fillRect(0, y, w, bh);
        }
        return cv;
    }
    function toBlob(cv) { return new Promise(res => { if (cv.toBlob) cv.toBlob(b => res(b), 'image/jpeg', .8); else res(null); }); }
    async function setPhoto(id, file) {
        try {
            const img = await readPhoto(file);
            photo = { id, img, url: '' }; await redraw();
        } catch (e) { say(T('That photo couldn’t be opened. Try another one.', 'Das Foto ließ sich nicht öffnen. Versuch ein anderes.', 'No se pudo abrir la foto. Prueba con otra.'), 'low'); }
    }
    async function redraw() {
        if (!photo) return;
        const cv = render(photo.img, blurOn);
        photo.blob = await toBlob(cv);
        if (photo.url && photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url);
        photo.url = photo.blob ? URL.createObjectURL(photo.blob) : cv.toDataURL('image/jpeg', .8);
        paint();
    }

    /* ---------- events ---------- */
    function onClick(e) {
        const t = e.target;
        if (t === ov) { close(e.isTrusted); return; }
        const el = t.closest ? t.closest('[data-gb],[data-gb-tab],[data-gb-help],[data-gb-add],[data-gb-drop],[data-gb-verdict],[data-gb-pay]') : null;
        if (!el || !ov.contains(el)) return;
        if (el.hasAttribute('data-gb-pay')) { const id = el.getAttribute('data-gb-pay'); if (!opened[id]) { opened[id] = true; setTimeout(paint, 60); } return; } /* the link opens; nothing is sent */
        if (el.hasAttribute('data-gb-tab')) { tab = el.getAttribute('data-gb-tab'); msg = ''; paint(); return; }
        if (el.hasAttribute('data-gb-add')) { addItem(el.getAttribute('data-gb-add')); return; }
        if (el.hasAttribute('data-gb-drop')) { const n = el.getAttribute('data-gb-drop'); draft.items = draft.items.filter(x => x !== n); saveDraft(); paint(); return; }
        if (el.hasAttribute('data-gb-help')) { help(el.getAttribute('data-gb-help')); return; }
        if (el.hasAttribute('data-gb-verdict')) { verdict(el.getAttribute('data-gb-for'), el.getAttribute('data-gb-verdict')); return; }
        const a = el.getAttribute('data-gb');
        if (a === 'close') { close(e.isTrusted); return; }
        if (a === 'reload') { loaded = false; paint(); load(); return; }
        if (a === 'share') { share(); return; }
        if (a === 'down') { takeDown(el.getAttribute('data-gb-for')); return; }
        if (a === 'send-receipt') { sendReceipt(el.getAttribute('data-gb-for')); return; }
    }
    function onInput(e) {
        const t = e.target, k = t && t.getAttribute && t.getAttribute('data-gb-in');
        if (!k || k === 'anon') return;
        draft[k] = String(t.value || '').slice(0, 300); saveDraft();
        /* repaint only the parts that depend on the typing, so the keyboard stays put */
        const built = C.build(draft, rate), sh = ov.querySelector('.gb-share');
        if (sh) sh.disabled = busy || !built.ok;
        const miss = ov.querySelector('.gb-missing');
        if (miss) { miss.hidden = built.ok; miss.textContent = missing(built); }
        if (k === 'payUrl') { const l = draft.payUrl ? C.payLink(draft.payUrl) : null, m = ov.querySelector('#gb-linkmsg');
            if (m) { m.textContent = !l ? '' : l.ok ? '✓ ' + C.linkName(l.kind) : linkWhy(l); m.classList.toggle('gb-low', !!(l && !l.ok)); } }
    }
    function onChange(e) {
        const t = e.target;
        if (t.getAttribute('data-gb-in') === 'anon') { draft.anon = !!t.checked; saveDraft(); paint(); return; }
        if (t.getAttribute('data-gb') === 'blur') { blurOn = !!t.checked; redraw(); return; }
        if (t.hasAttribute('data-gb-file')) { const f = t.files && t.files[0]; if (f) setPhoto(t.getAttribute('data-gb-file'), f); return; }
    }
    function onSubmit(e) {
        const f = e.target; if (!f || f.getAttribute('data-gb-form') !== 'item') return;
        e.preventDefault();
        const i = f.querySelector('input'); const v = i ? i.value : '';
        if (addItem(v) && i) i.value = '';
    }
    function onKey(e) { if (e.key === 'Escape' && ov) { e.stopImmediatePropagation(); close(true); } }

    function addItem(name) {
        const c = C.itemCheck(name, rate);
        if (!c.ok) {
            if (c.why === 'empty') return false;
            say(c.why === 'spike' ? T(c.name + ' isn’t low-spike, so it can’t go in a basket.', c.name + ' ist kein Low-Spike-Essen und kann nicht in den Korb.', c.name + ' no es bajo en picos, así que no puede ir en una cesta.')
                : T('The app doesn’t know "' + c.name + '" yet. Try a plain name, like eggs or broccoli.', 'Die App kennt „' + c.name + '“ noch nicht. Versuch einen einfachen Namen, z. B. Eier oder Brokkoli.', 'La app aún no conoce «' + c.name + '». Prueba con un nombre sencillo, como huevos o brócoli.'), 'low');
            return false;
        }
        if (draft.items.some(x => C.norm(x) === C.norm(c.name))) { say(T('Already in your basket.', 'Schon im Korb.', 'Ya está en tu cesta.')); return true; }
        if (draft.items.length >= C.MAX_ITEMS) { say(T('A basket holds up to 12 foods.', 'Ein Korb fasst bis zu 12 Lebensmittel.', 'Una cesta lleva hasta 12 alimentos.'), 'low'); return false; }
        draft.items.push(c.name); saveDraft(); msg = ''; paint(); return true;
    }
    function share() {
        const b = C.build(draft, rate); if (!b.ok) return;
        run(async () => {
            const cur = mine.find(x => !x.helped);
            const row = await api().share(b.row, cur ? cur.id : '');
            const v = C.view(row); if (v) mine = [v].concat(mine.filter(x => x.id !== v.id));
            msg = T('Your basket is shared. Others can see it under Give a hand.', 'Dein Korb ist geteilt. Andere sehen ihn unter Helfen.', 'Tu cesta está compartida. Los demás la ven en Ayudar.'); msgKind = 'good';
        });
    }
    function takeDown(id) {
        run(async () => { await api().takeDown(id); mine = mine.filter(x => x.id !== id); msg = T('Your basket is down. Your list is still here.', 'Dein Korb ist zurückgenommen. Deine Liste ist noch da.', 'Has retirado tu cesta. Tu lista sigue aquí.'); msgKind = ''; });
    }
    function help(id) {
        const b = open.find(x => x.id === id); if (!b) return;
        run(async () => {
            await api().help(id);
            open = open.filter(x => x.id !== id);
            given = [Object.assign({}, b, { helper: api().uid(), helped: Date.now() })].concat(given);
            /* one sunbeam per basket on the Care board ("other" kind, capped per day like every habit), never per euro */
            try { if (typeof W.award === 'function') W.award(10, T('Gave a hand', 'Geholfen', 'Ayudó'), null, 'gift', C.careEventId(id)); } catch (e) {}
            msg = T('Thank you! ' + who(b) + ' has 7 days to add the receipt, and you’ll see it here.', 'Danke! ' + who(b) + ' hat 7 Tage Zeit, den Kassenbon hochzuladen. Du siehst ihn dann hier.', '¡Gracias! ' + who(b) + ' tiene 7 días para subir el ticket y lo verás aquí.'); msgKind = 'good';
            try { W.dispatchEvent(new CustomEvent('lowi:gift-helped', { detail: { id } })); } catch (e) {}
        });
    }
    function verdict(id, v) {
        run(async () => {
            await api().verdict(id, v);
            given = given.map(x => x.id === id ? Object.assign({}, x, { verdict: v, verdictAt: Date.now() }) : x);
            msg = v === 'verified' ? T('Verified. Thanks for checking!', 'Verifiziert. Danke fürs Nachsehen!', 'Verificado. ¡Gracias por comprobarlo!') : T('Noted. Their badge goes down a little.', 'Notiert. Ihr Abzeichen sinkt ein wenig.', 'Anotado. Su insignia baja un poco.'); msgKind = v === 'verified' ? 'good' : '';
        });
    }
    function sendReceipt(id) {
        if (!photo || photo.id !== id || !photo.blob) return;
        run(async () => {
            const at = await api().receipt(id, photo.blob);
            mine = mine.map(x => x.id === id ? Object.assign({}, x, { receipt: Date.parse(at) || Date.now(), receiptPath: api().uid() + '/' + id + '.jpg' }) : x);
            if (photo.url && photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url);
            photo = null;
            msg = T('Receipt sent. Thank you!', 'Kassenbon gesendet. Danke!', 'Ticket enviado. ¡Gracias!'); msgKind = 'good';
        });
    }

    /* ---------- open / close ---------- */
    function openPanel(from) {
        if (ov) return;
        ov = D.createElement('div');
        ov.className = 'stp-ov gb-ov';
        ov.setAttribute('data-from', from || '');
        ov.addEventListener('click', onClick);
        ov.addEventListener('input', onInput);
        ov.addEventListener('change', onChange);
        ov.addEventListener('submit', onSubmit);
        D.addEventListener('keydown', onKey, true);
        loaded = false; offline = false; msg = ''; opened = {}; receiptUrl = {}; photo = null; draft = loadDraft();
        D.body.appendChild(ov);
        paint();
        requestAnimationFrame(() => { if (ov) ov.classList.add('in'); });
        load();
    }
    /* A tap on X / the backdrop / Escape goes through the app's back stack, so the Shop panel under it comes back.
       The back stack closes this panel by clicking [data-stp=close] (an untrusted click): that one closes for real. */
    function close(user) {
        if (!ov) return;
        const o = ov, R2 = W.LowiR2;
        if (user && R2 && R2.back && R2.top && R2.top() === o) { R2.back(o); if (!ov) return; }
        ov = null;
        D.removeEventListener('keydown', onKey, true);
        if (photo && photo.url && photo.url.startsWith('blob:')) try { URL.revokeObjectURL(photo.url); } catch (e) {}
        photo = null; open = []; given = []; receiptUrl = {};
        o.classList.remove('in'); o.classList.add('out');
        setTimeout(() => { try { o.remove(); } catch (e) {} }, 260);
    }
    /* Server gate: the entry shows only once the server has the basket table (checked when the account is online,
       remembered for 6 hours). So this can ship before the database change without a broken panel. */
    const READY_KEY = 'lowi.giftBasket.server.v1';
    function serverReady() { try { const r = JSON.parse(localStorage.getItem(READY_KEY) || 'null'); return !!(r && r.ok); } catch (e) { return false; } }
    let probing = false;
    async function probe() {
        if (probing) return; probing = true;
        try {
            let r = null; try { r = JSON.parse(localStorage.getItem(READY_KEY) || 'null'); } catch (e) {}
            if (r && r.ok && Date.now() - r.at < 6 * 36e5 && !API._api) return;
            if (r && !r.ok && Date.now() - r.at < 10 * 6e4 && !API._api) return;
            const ok = await (api().ready ? api().ready() : Promise.resolve(true));
            if (ok == null) return;
            const was = serverReady();
            try { localStorage.setItem(READY_KEY, JSON.stringify({ ok: !!ok, at: Date.now() })); } catch (e) {}
            if (!!ok !== was) try { W.dispatchEvent(new CustomEvent('lowi:gift-ready', { detail: { ok: !!ok } })); } catch (e) {}
        } catch (e) {} finally { probing = false; }
    }
    function entryHTML() {
        if (!serverReady()) { probe(); return ''; }
        return '<button type="button" class="stp-row gb-entry" data-stp="gift"><span class="gb-entry-i" aria-hidden="true">\u{1F91D}</span><span class="stp-sos-t"><b>' + esc(T('Give a hand', 'Hilf mit', 'Echa una mano')) + '</b><small>' +
            esc(T('Pay for someone’s healthy groceries, or share your own basket', 'Bezahl jemandem gesunde Lebensmittel oder teile deinen eigenen Korb', 'Paga la compra sana de alguien o comparte tu propia cesta')) + '</small></span></button>';
    }
    W.addEventListener('lowi:lang', () => { if (ov) paint(); });
    /* check the server after start (the cloud account needs a moment to come online) */
    setTimeout(probe, 6000);
    setTimeout(probe, 30000);
    W.addEventListener('lowi:boot-ready', () => setTimeout(probe, 2500));
    W.LowiGiftBasket = Object.assign(API, { open: openPanel, probe, serverReady, close: () => close(false), isOpen: () => !!ov, entryHTML, _state: () => ({ tab, open, mine, given, draft, trustBy, offline, loaded, msg }), _render: render });
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
