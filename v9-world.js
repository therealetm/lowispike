/* v9-world.js: Nov 18 2026, the v9 redesign (owner override: "I just want the whole thing finished ... everything done").
   Design: handoff/design-v9-20261118 (branch design-v9-handoff), LOWiSPIKE-v9.pdf screens 01-16.
   Every bubble on Home opens a WORLD with the same four zones, always in the same spot:
     header (world bubble + title + one status line), hero (the one big glowing bubble), at most four choice bubbles on a soft
     arc with a word under each, and the back bubble at the bottom (bottom-close.js draws it from this world's own Back / Close).
   Worlds: Check (Scan bubble), Your body (timer bubble), Shopping (cart bubble), Lounge (Community bubble, with the Playroom
   drawer), Move (hold Move), Misty (hold Misty) with Food-Dex and Settings (profile photo).
   The worlds only lead to features that already exist (scanner, shop, week planner, list, chat, For You, ranking, games,
   Move player, Misty's card, settings routes); every feature keeps its own logic, XP rules and data. Nothing here awards XP.
   Switch: localStorage lowi.v9 = 'off' brings back the old taps. EN / DE / ES. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiV9) return;
    const H = D.documentElement;
    const OFF = () => { try { return W.localStorage.getItem('lowi.v9') === 'off'; } catch (e) { return false; } };
    const L = () => { const l = (H.lang || 'en').slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const T = (en, de, es) => (L() === 'de' ? de : L() === 'es' ? es : en);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
    const fn = (o, k) => !!(o && typeof o[k] === 'function');
    const tryc = (f, d) => { try { const v = f(); return v === undefined ? d : v; } catch (e) { return d; } };
    const P = 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
    const svg = d => '<svg viewBox="0 0 24 24" aria-hidden="true" ' + P + '>' + d + '</svg>';
    const I = {
        camera: svg('<path d="M4 8.5h3l1.6-2.3h6.8L17 8.5h3v10H4z"/><circle cx="12" cy="13.2" r="3.4"/>'),
        barcode: svg('<path d="M4 7V5h3M17 5h3v2M20 17v2h-3M7 19H4v-2M7.5 8v8M10 8v8M12.5 8v8M15 8v8M17 8v8"/>'),
        gallery: svg('<rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4 3.5 3 2.5-2 3.5 3"/>'),
        keyboard: svg('<rect x="3.5" y="7" width="17" height="10" rx="2"/><path d="M7 10.5h.01M10 10.5h.01M13 10.5h.01M16 10.5h.01M8 14h8"/>'),
        sparkle: svg('<path d="M12 4l1.8 4.6L18.5 10l-4.7 1.6L12 16.5l-1.8-4.9L5.5 10l4.7-1.4z"/><path d="M18 15.5l.8 1.8 1.8.7-1.8.7-.8 1.8-.8-1.8-1.8-.7 1.8-.7z"/>'),
        clock: svg('<circle cx="12" cy="12.5" r="7.5"/><path d="M12 8.5v4.3l2.8 1.7M10 3.5h4"/>'),
        cart: svg('<path d="M3.5 5h2.2l2 10h10l1.8-7H7"/><circle cx="9.5" cy="18.8" r="1.3"/><circle cx="16.5" cy="18.8" r="1.3"/>'),
        search: svg('<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5L20 20"/>'),
        cal: svg('<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
        send: svg('<path d="M20 4L9.5 14.5M20 4l-6.5 16-4-7.5-7.5-4z"/>'),
        chat: svg('<path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.2V17H5a1.5 1.5 0 0 1-1.5-1.5V8A1.5 1.5 0 0 1 5 6.5z"/>'),
        walk: svg('<circle cx="13" cy="4.8" r="1.8"/><path d="M10 21l2.2-6.5 2.8 2.5V21M8 12.5l2.5-4.5 3.5 1 2 3.5h2.5M12.2 14.5L11 9"/>'),
        list: svg('<path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/>'),
        dex: svg('<path d="M12 3.5l3.5 2v4l-3.5 2-3.5-2v-4zM8.5 11.5l3.5 2v4l-3.5 2-3.5-2v-4zM15.5 11.5l3.5 2v4l-3.5 2-3.5-2v-4z"/>'),
        hist: svg('<circle cx="12" cy="12.5" r="7.5"/><path d="M12 8.5v4l2.5 2.5"/>'),
        globe: svg('<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 3.5 5 3.5 8s-1 5.5-3.5 8c-2.5-2.5-3.5-5-3.5-8s1-5.5 3.5-8z"/>'),
        moon: svg('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'),
        vr: svg('<path d="M3.5 9.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3.3l-2-2.5h-2.4l-2 2.5H5.5a2 2 0 0 1-2-2z"/><circle cx="8" cy="12" r="1.4"/><circle cx="16" cy="12" r="1.4"/>'),
        lang: svg('<circle cx="12" cy="12" r="8"/><path d="M4.5 9.5h15M4.5 14.5h15M12 4c-2.2 2.4-3.2 5-3.2 8s1 5.6 3.2 8M12 4c2.2 2.4 3.2 5 3.2 8s-1 5.6-3.2 8"/>'),
        bell: svg('<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>'),
        lock: svg('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
        gift: svg('<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3.5 9h17M12 9v11M12 9c-1.5-3-5-3.5-5-1.2S10 9 12 9zm0 0c1.5-3 5-3.5 5-1.2S14 9 12 9z"/>'),
        calm: svg('<path d="M4 13c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1M4 17.5c2-2 4-2 6 0s4 2 6 0 3-1.5 4-1"/><circle cx="16" cy="7" r="2.3"/>'),
        crown: svg('<path d="M4 17.5L3 8l5 4 4-6 4 6 5-4-1 9.5z"/><path d="M5 20h14"/>'),
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
        save: svg('<path d="M7 4.5h10v15l-5-3.5-5 3.5z"/>'),
        mic: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'),
        mirror: svg('<rect x="6" y="3.5" width="12" height="17" rx="6"/><path d="M9.5 9l3-2.5M9.5 13l5-4.5"/>'),
        desk: svg('<path d="M3.5 10h17M5.5 10v9M18.5 10v9M8 10V6.5h8V10"/>'),
        seat: svg('<path d="M7 4v9h9l1.5 7M7 13l-1.5 7M7 8h7"/>'),
        bed: svg('<path d="M3.5 18V7M3.5 13h17v5M20.5 13a3 3 0 0 0-3-3H10v3"/><circle cx="7" cy="10.5" r="1.6"/>'),
        pool: svg('<circle cx="9" cy="10" r="3.2"/><circle cx="15.5" cy="14.5" r="3.2"/><path d="M4 20L20 4"/>'),
        cards: svg('<rect x="6" y="5" width="10" height="14" rx="2" transform="rotate(-10 11 12)"/><rect x="9" y="5" width="10" height="14" rx="2" transform="rotate(8 14 12)"/>'),
        shuffle: svg('<path d="M4 7h3.5c4 0 5 10 9 10H20M4 17h3.5c1.5 0 2.5-1.4 3.4-3M14 8.4C14.8 7.5 15.7 7 16.5 7H20M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5"/>'),
        user: svg('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
        help: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.8c0 1.6-2.2 2-2.2 3.5M12 17h.01"/>'),
        speaker: svg('<path d="M4 10v4h3l4 3.5v-11L7 10H4z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10"/>'),
        edit: svg('<path d="M5 19l1-4L16 5l3 3L9 18z"/>'),
        plus: svg('<path d="M12 5v14M5 12h14"/>'),
        check: svg('<path d="M6 12.5l4 4 8-9"/>'),
        lockS: svg('<rect x="7" y="11" width="10" height="8" rx="1.8"/><path d="M9.5 11V9a2.5 2.5 0 0 1 5 0v2"/>')
    };
    const GROUP_EMO = { gemuese: '\u{1F966}', salat: '\u{1F96C}', huhn: '\u{1F357}', eier: '\u{1F95A}', milch: '\u{1F95B}', kaese: '\u{1F9C0}', fisch: '\u{1F41F}', fleisch: '\u{1F969}', obst: '\u{1F34E}', nuss: '\u{1F95C}', brot: '\u{1F35E}', gewuerz: '\u{1F9C2}', oel: '\u{1FAD2}', tk: '\u{1F9CA}', getraenk: '\u{1F964}' };

    /* ---------- small helpers into the app ---------- */
    const S = () => tryc(() => W.LowiR2.S(), null) || {};
    const onHome = () => !!D.querySelector('#tab-home.active') || !D.querySelector('#main .tab.active');
    function goTab(t) { try { if (fn(W, 'lowiOpen')) W.lowiOpen(t); else if (fn(W, 'goTab')) W.goTab(t); } catch (e) { console.warn('[v9] tab', t, e); } }
    function clickText(scope, re) { const r = D.querySelector(scope); if (!r) return false; const b = [...r.querySelectorAll('button,[role="tab"],[role="button"]')].find(x => re.test((x.textContent || '').trim())); if (b) { b.click(); return true; } return false; }
    function later(f, ms) { setTimeout(() => { try { f(); } catch (e) { console.warn('[v9]', e); } }, ms || 0); }
    function toast(m) { try { if (W.LowiR2 && fn(W.LowiR2, 'toast')) return W.LowiR2.toast(m); } catch (e) { } }
    function route(id) { const R = W.LowiHomeSettingsSleepV2; try { return !!(R && fn(R, 'run') && R.has(id) && R.run(id)); } catch (e) { return false; } }
    function companionName() {
        const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; };
        let n = '';
        try { const B = W.LowiBirthCompanion; if (B && B.has && B.has()) n = pick(B.get().name); } catch (e) { }
        if (!n) try { const t = W.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = pick(p && p.name); } catch (e) { }
        if (!n) try { n = pick(S().herb && S().herb.name); } catch (e) { }
        return n || 'Misty';
    }
    function mistyArt() {
        const src = D.querySelector('#spBubble .sp-creature svg') || D.querySelector('.sp-creature svg');
        if (!src) return '<span class="v9-mi-fb" aria-hidden="true">✨</span>';
        const c = src.cloneNode(true); c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
        return '<span class="v9-mi-art" aria-hidden="true">' + c.outerHTML + '</span>';
    }
    function avatar() { const u = S().user || {}; return u.avatar || u.photo || ''; }
    function dayData() { return tryc(() => W.LowiMistySheet.data(), null) || {}; }
    function level() { const d = dayData(); return d.levelTo || d.levelFrom || 1; }
    function listItems() { const g = tryc(() => W.tdListItems(), []) || []; const out = []; g.forEach(a => (a.items || []).forEach(i => out.push(Object.assign({ aisle: a.a }, i)))); return out; }
    function storeName() { const p = tryc(() => W.LowiShopPlan.get(), null) || {}; return String(p.store || '').trim(); }

    /* ---------- the bubble ---------- */
    /* o: {id, tint, size, html, label, sub, glow, img, fit, badge, cls, attrs, aria} */
    function bubble(o) {
        const st = '--s:' + (o.size || 74) + 'px' + (o.x != null ? ';--x:' + o.x : '') + (o.y != null ? ';--y:' + o.y : '');
        const face = o.img ? '<img class="v9b-img' + (o.fit === 'contain' ? ' v9-contain' : '') + '" src="' + esc(o.img) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '';
        return '<div class="v9-ch' + (o.cls ? ' ' + o.cls : '') + '" style="' + st + '">' +
            '<button type="button" class="v9b v9-' + (o.tint || 'glass') + (o.glow ? ' v9-glow' : '') + '" data-v9="' + esc(o.id) + '"' + (o.attrs || '') +
            ' aria-label="' + esc(o.aria || [o.label, o.sub].filter(Boolean).join(', ')) + '">' + face + '<span class="v9b-in">' + (o.html || '') + '</span>' +
            (o.badge ? '<b class="v9-badge">' + esc(o.badge) + '</b>' : '') + '</button>' +
            (o.label ? '<span class="v9-lab" aria-hidden="true">' + esc(o.label) + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>' : '') + '</div>';
    }
    /* positions of 3 / 4 choices on a soft smile (handoff 2.5), as % of the width and px offsets */
    const ARC = { 1: [[50, 0]], 2: [[33, 6], [67, 6]], 3: [[20.5, 0], [50, 16], [79.5, 0]], 4: [[14.4, 0], [38, 20], [62, 20], [85.6, 0]] };
    function choices(list) {
        const a = ARC[list.length] || ARC[4];
        return '<div class="v9-arc">' + list.map((c, i) => bubble(Object.assign({ size: c.size || 74, x: a[i][0] + '%', y: a[i][1] + 'px', cls: 'v9-pos' }, c))).join('') + '</div>';
    }
    function header(w) {
        return '<header class="v9-head"><span class="v9b v9-' + w.tint + ' v9-hb" aria-hidden="true"><span class="v9b-in">' + (w.icon || '') + '</span></span>' +
            '<div class="v9-ht"><h2>' + esc(w.title) + '</h2><p>' + (w.subHTML || esc(w.sub || '')) + '</p></div>' + (w.right || '') + '</header>';
    }
    function hero(o) {
        return '<div class="v9-hero">' + bubble(Object.assign({ size: 190, glow: true, cls: 'v9-heroch' }, o, { label: '', sub: '' })) +
            '<div class="v9-hl"><b>' + esc(o.label || '') + '</b>' + (o.subHTML ? '<small>' + o.subHTML + '</small>' : o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</div></div>';
    }
    const bigIcon = (ic, txt) => '<span class="v9-hic">' + ic + '</span>' + (txt ? '<span class="v9-htx">' + esc(txt) + '</span>' : '');

    /* ---------- worlds ---------- */
    const WORLDS = {};
    WORLDS.check = () => ({
        tint: 'green', icon: I.camera, title: T('Check your food', 'Check dein Essen', 'Revisa tu comida'), sub: T('Spike or not, in seconds', 'Spike oder nicht, in Sekunden', '¿Pico o no? En segundos'),
        hero: { id: 'photo', tint: 'green', html: bigIcon(I.camera, T('Take a photo', 'Foto machen', 'Hacer foto')), label: T('Photo of your plate', 'Foto von deinem Teller', 'Foto de tu plato'), sub: companionName() + T(' checks it for you', ' checkt es f\u00fcr dich', ' lo revisa por ti') },
        choices: [
            { id: 'barcode', tint: 'blue', html: I.barcode, label: 'Barcode', sub: T('products', 'Produkte', 'productos') },
            { id: 'gallery', tint: 'blue', html: I.gallery, label: T('Gallery', 'Galerie', 'Galería') },
            { id: 'type', tint: 'blue', html: I.keyboard, label: T('Type it', 'Eintippen', 'Escribir') },
            { id: 'deep', tint: 'gold', html: I.sparkle, label: T('Deep check', 'Deep Check', 'Análisis a fondo'), sub: 'GPT' }
        ]
    });
    WORLDS.shop = () => {
        const items = listItems(), st = storeName();
        const thumbs = items.slice(0, 3).map((x, i) => '<span class="v9-th v9-th' + i + '">' + (GROUP_EMO[x.g] || '\u{1F6D2}') + '</span>').join('');
        const n = items.length;
        return {
            tint: 'blue', icon: I.cart, title: T('Shopping', 'Einkaufen', 'Compras'),
            sub: st || T('Pick your shop and budget', 'Wähl Laden und Budget', 'Elige tienda y presupuesto'),
            right: '<button type="button" class="v9-chip" data-v9="plan">' + esc(T('Change', 'Ändern', 'Cambiar')) + '</button>',
            hero: { id: 'list', tint: 'blue', html: n ? '<span class="v9-thumbs">' + thumbs + '</span>' : bigIcon(I.list), label: T('Your list', 'Deine Liste', 'Tu lista'), sub: n ? T(n + (n === 1 ? ' thing' : ' things'), n + (n === 1 ? ' Sache' : ' Sachen'), n + (n === 1 ? ' cosa' : ' cosas')) : T('Empty. Plan your week or find food', 'Leer. Plan deine Woche oder finde Essen', 'Vacía. Planea tu semana o busca comida') },
            choices: [
                { id: 'find', tint: 'blue', html: I.search, label: T('Find food', 'Essen finden', 'Buscar comida') },
                { id: 'week', tint: 'blue', html: I.cal, label: T('This week', 'Diese Woche', 'Esta semana'), sub: T('plan & prep', 'planen & vorkochen', 'planear y preparar') },
                { id: 'others', tint: 'blue', html: '<span class="v9-emo">\u{1F36A}</span>', label: T('From others', 'Von anderen', 'De otros'), sub: T('snack shelf', 'Snackregal', 'estante de snacks') },
                { id: 'send', tint: 'blue', html: I.send, label: T('Send list', 'Liste senden', 'Enviar lista') }
            ]
        };
    };
    WORLDS.move = () => {
        const d = dayData(), mins = d.moveMin || 0;
        const band = { casual: T('under 5k steps', 'unter 5k Schritte', 'menos de 5k pasos'), steady: T('5k to 10k steps', '5k bis 10k Schritte', '5k a 10k pasos'), epic: T('10k+ steps · Epic ✓', '10k+ Schritte · Epic ✓', '10k+ pasos · Epic ✓') }[d.steps] || '';
        return {
            tint: 'mint', icon: I.walk, title: T('Move', 'Bewegung', 'Movimiento'),
            sub: [band, mins ? mins + ' min ' + T('today', 'heute', 'hoy') : ''].filter(Boolean).join(' · ') || T('Nothing logged yet today', 'Heute noch nichts eingetragen', 'Hoy aún nada'),
            hero: { id: 'walk', tint: 'mint', html: bigIcon(I.walk, T('Walk & Lift', 'Gehen & Heben', 'Caminar y levantar')), label: T('Walk & Lift · 5 min', 'Gehen & Heben · 5 Min', 'Caminar y levantar · 5 min'), sub: T('Best right after eating', 'Am besten direkt nach dem Essen', 'Mejor justo después de comer'), attrs: ' data-mv="quick" data-fmt="walk" data-min="5"' },
            choices: [
                { id: 'mirror', tint: 'mint', html: I.mirror, label: T('Mirror', 'Spiegel', 'Espejo'), sub: T('new', 'neu', 'nuevo') },
                { id: 'desk', tint: 'mint', html: I.desk, label: T('Desk', 'Schreibtisch', 'Escritorio'), sub: '3 min', attrs: ' data-mv="quick" data-fmt="desk" data-min="3"' },
                { id: 'seated', tint: 'mint', html: I.seat, label: T('Seated', 'Im Sitzen', 'Sentado'), sub: '8 min', attrs: ' data-mv="quick" data-fmt="desk" data-min="8"' },
                { id: 'bed', tint: 'mint', html: I.bed, label: T('In bed', 'Im Bett', 'En la cama'), sub: '6 min', attrs: ' data-mv="quick" data-fmt="bed" data-min="6"' }
            ]
        };
    };
    function rings() {
        const d = dayData(), meals = (d.meals || []).length, water = +d.water || 0, mv = (+d.moveMin || 0) > 0 || !!d.steps;
        const eat = Math.min(1, meals / 3), wat = Math.min(1, water / 6), mov = mv ? 1 : 0;
        const ring = (r, p, c) => { const C = 2 * Math.PI * r; return '<circle cx="100" cy="100" r="' + r + '" stroke="' + c + '" stroke-opacity=".3" stroke-width="9" fill="none"/>' + '<circle cx="100" cy="100" r="' + r + '" stroke="' + c + '" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="' + (C * p).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 100 100)"/>'; };
        return { meals, water, mv, full: eat >= 1 && wat >= 1 && mov >= 1, svg: '<svg class="v9-rings" viewBox="0 0 200 200" aria-hidden="true">' + ring(94, eat, '#F0CF7F') + ring(82, mov, '#7FE3C4') + ring(70, wat, '#7FCDF5') + '</svg>' };
    }
    WORLDS.misty = () => {
        const r = rings(), name = companionName(), av = avatar(), dex = dexItems().length;
        const st = '<span style="color:#F0CF7F">' + esc(T('Eat', 'Essen', 'Comer')) + ' ' + Math.min(r.meals, 3) + '/3</span> · <span style="color:#7FE3C4">' + esc(T('Move', 'Bewegung', 'Mover')) + (r.mv ? ' ✓' : ' 0/1') + '</span> · <span style="color:#7FCDF5">' + esc(T('Water', 'Wasser', 'Agua')) + ' ' + Math.min(r.water, 6) + '/6</span>';
        return {
            tint: 'lav', icon: I.user, title: name,
            sub: r.full ? T('Full-sun day! All three rings closed', 'Voller Sonnentag! Alle drei Ringe zu', '¡Día de sol completo! Los tres anillos cerrados') : T('Close all three rings for a full-sun day', 'Schließ alle drei Ringe für einen vollen Sonnentag', 'Cierra los tres anillos para un día de sol completo'),
            right: '<button type="button" class="v9-me" data-v9="settings" aria-label="' + esc(T('Settings', 'Einstellungen', 'Ajustes')) + '">' + (av ? '<img src="' + esc(av) + '" alt="">' : '<span>' + esc(((S().user || {}).name || '?').slice(0, 1).toUpperCase()) + '</span>') + '<small>' + esc(T('Settings', 'Einstellungen', 'Ajustes')) + '</small></button>',
            hero: { id: 'card', tint: 'lav', cls: 'v9-misty', html: r.svg + mistyArt(), label: T('Level ', 'Level ', 'Nivel ') + level() + ' · ' + name, subHTML: st, aria: name },
            choices: [
                { id: 'dex', tint: 'gold', html: I.dex, label: 'Food-Dex', sub: String(dex) },
                { id: 'history', tint: 'glass', html: I.hist, label: T('History', 'Verlauf', 'Historial') },
                { id: 'worlds', tint: 'cyan', html: I.globe, label: T('Worlds', 'Welten', 'Mundos'), sub: T('look & aura', 'Look & Aura', 'look y aura') },
                { id: 'night', tint: 'lav', html: I.moon, label: T('Goodnight', 'Gute Nacht', 'Buenas noches'), sub: T('day recap', 'Tagesrückblick', 'resumen del día') }
            ]
        };
    };

    /* Your body: Misty walks the six typical phases after a meal (LowiGapView.model, the same texts the Gap view uses) */
    const TIPS = {
        rise: ['A 10-minute walk now softens the rise.', 'Ein 10-Minuten-Spaziergang jetzt dämpft den Anstieg.', 'Un paseo de 10 minutos ahora suaviza la subida.'],
        settle: ['Water helps. No snack needed yet.', 'Wasser hilft. Noch kein Snack nötig.', 'El agua ayuda. Aún no hace falta picar.'],
        liver: ['Lower the spike: make your next meal savory, with protein.', 'Spike senken: Mach deine nächste Mahlzeit herzhaft, mit Eiweiß.', 'Baja el pico: que tu próxima comida sea salada y con proteína.'],
        fat: ['Start your next meal with veg and protein, carbs last.', 'Starte die nächste Mahlzeit mit Gemüse und Eiweiß, Kohlenhydrate zuletzt.', 'Empieza la próxima comida con verdura y proteína, los carbohidratos al final.'],
        ketones: ['Feeling shaky or unwell? Eat. Your body, your pace.', 'Zittrig oder unwohl? Iss etwas. Dein Körper, dein Tempo.', '¿Tembloroso o mal? Come. Tu cuerpo, tu ritmo.'],
        cleanup: ['No extra points for longer. Eat when you are ready.', 'Länger bringt keine Extrapunkte. Iss, wenn du bereit bist.', 'Alargarlo no da puntos extra. Come cuando estés listo.']
    };
    let bodyPick = -1;
    function bodyModel() { return tryc(() => W.LowiGapView.model(Date.now()), null) || { stages: tryc(() => W.LowiFast.stagesFull(), []), cur: -1, hours: 0, start: 0 }; }
    const hm = h => { const m = Math.max(0, Math.round(h * 60)); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
    WORLDS.body = () => {
        const m = bodyModel(), stg = m.stages || [], started = !!m.start;
        const cur = started ? Math.max(0, m.cur) : -1, sel = bodyPick >= 0 ? bodyPick : Math.max(0, cur);
        /* six stops, bottom to top, zig-zag; the path drawn through them (viewBox 0 0 340 330) */
        const pts = stg.map((s, i) => ({ x: [60, 280, 60, 280, 60, 280][i % 6], y: 318 - i * 61 }));
        let d = ''; pts.forEach((p, i) => { if (!i) { d = 'M' + p.x + ' ' + p.y; return; } const q = pts[i - 1], my = (q.y + p.y) / 2; d += ' C' + q.x + ' ' + my + ' ' + p.x + ' ' + my + ' ' + p.x + ' ' + p.y; });
        let dDone = ''; if (cur >= 0) pts.slice(0, cur + 1).forEach((p, i) => { if (!i) { dDone = 'M' + p.x + ' ' + p.y; return; } const q = pts[i - 1], my = (q.y + p.y) / 2; dDone += ' C' + q.x + ' ' + my + ' ' + p.x + ' ' + my + ' ' + p.x + ' ' + p.y; });
        const stops = stg.map((s, i) => {
            const p = pts[i], done = cur >= 0 && i < cur, now = i === cur, left = p.x < 170, inH = started ? Math.max(0, s.h - m.hours) : s.h;
            const sub = now ? T('now', 'jetzt', 'ahora') + ' · ' + hm(m.hours) : done ? s.t : (started ? T('in ', 'in ', 'en ') + hm(inH).replace(/ 00 min$/, '') : s.t);
            return '<button type="button" class="v9-stop' + (done ? ' done' : '') + (now ? ' now' : '') + (i === sel ? ' sel' : '') + (left ? ' l' : ' r') + '" data-v9="stop" data-i="' + i + '" style="left:' + (p.x / 340 * 100) + '%;top:' + (p.y / 330 * 100) + '%">' +
                (now ? '<span class="v9-stop-m">' + mistyArt() + '</span>' : '<span class="v9-stop-d">' + (done ? I.check : I.lockS) + '</span>') +
                '<span class="v9-stop-t">' + (now ? '<em>' + esc(companionName() + T(' is here', ' ist hier', ' est\u00e1 aqu\u00ed')) + '</em>' : '') + '<b>' + esc(s.n) + '</b><small>' + esc(sub) + '</small></span></button>';
        }).join('');
        const s = stg[sel] || {}, tip = TIPS[s.id] || TIPS.liver;
        const curve = '<svg class="v9-curve" viewBox="0 0 220 50" aria-hidden="true"><path d="M5 42 C35 42 45 6 70 6 S105 38 130 40 S190 42 215 42" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/><circle cx="' + [12, 70, 130, 165, 190, 210][sel] + '" cy="' + [40, 7, 39, 41, 42, 42][sel] + '" r="4.5" fill="#C6B6FF"/></svg>';
        const card = '<section class="v9-panel v9-phase"><div class="v9-ph-h"><b>' + esc(s.n || '') + '</b>' + (sel === cur ? '<i class="v9-now">' + esc(T('NOW', 'JETZT', 'AHORA')) + '</i>' : '') +
            '<button type="button" class="v9-say" data-v9="say" aria-label="' + esc(T('Read it to me', 'Vorlesen', 'Léemelo')) + '">' + I.speaker + '</button></div>' + curve +
            '<p>' + (s.x || '') + ' <span class="v9-dim">' + esc(T('Typical, not measured.', 'Typisch, nicht gemessen.', 'Típico, no medido.')) + '</span></p>' +
            '<p class="v9-tip">' + esc(tip[L() === 'de' ? 1 : L() === 'es' ? 2 : 0]) + '</p></section>';
        return {
            tint: 'cyan', icon: I.clock, title: T('Your body', 'Dein Körper', 'Tu cuerpo'),
            sub: started ? hm(m.hours) + ' ' + T('since your last meal', 'seit deiner letzten Mahlzeit', 'desde tu última comida') : T('Tap "I ate" to start the journey', 'Tipp auf „Gegessen“, dann geht die Reise los', 'Toca «He comido» para empezar el viaje'),
            right: '<button type="button" class="v9-chip" data-v9="ate">' + esc(T('I ate', 'Gegessen', 'He comido')) + '</button>',
            body: '<div class="v9-journey"><svg class="v9-path" viewBox="0 0 340 330" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="v9pg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8FE6C8"/><stop offset="1" stop-color="#C6B6FF"/></linearGradient></defs>' +
                '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/>' + (dDone ? '<path d="' + dDone + '" fill="none" stroke="url(#v9pg)" stroke-width="4" stroke-linecap="round"/>' : '') + '</svg>' + stops + '</div>' + card
        };
    };

    /* Lounge: For You on top like TV, the chat below, the Playroom door (handoff screen 09 / 10) */
    let drawer = false;
    WORLDS.lounge = () => {
        const bot = tryc(() => W.LowiForYou.botPosts(), [])[0] || null, ppl = tryc(() => W.LowiPeople.people(), []) || [];
        const here = Array.isArray(ppl) ? ppl.filter(p => p && (p.online || p.here)).length : 0;
        const stack = (Array.isArray(ppl) ? ppl : []).filter(p => p && (p.online || p.here)).slice(0, 3).map(p => '<i class="v9-av">' + (p.avatar ? '<img src="' + esc(p.avatar) + '" alt="">' : esc(String(p.name || '?').slice(0, 1).toUpperCase())) + '</i>').join('');
        const last = tryc(() => W.LowiCommunity.latest(), null);
        const tv = '<button type="button" class="v9-tv" data-v9="fy">' + (bot && bot.img ? '<img src="' + esc(bot.img) + '" alt="">' : '') +
            '<span class="v9-tv-tabs"><i class="on">For You</i><i>' + esc(T('Watch together', 'Zusammen schauen', 'Ver juntos')) + '</i></span>' +
            '<span class="v9-tv-play">' + I.play + '</span>' +
            '<span class="v9-tv-cap"><b>' + esc(bot ? ('@' + (bot.who || 'Nibblo') + ' · ' + ((bot.inspo && bot.inspo.swap && bot.inspo.swap.to) || '')) : 'For You') + '</b><small><i class="v9-dot"></i>' + esc(T('Low spike', 'Wenig Spike', 'Pico bajo')) + '</small></span>' +
            '<span class="v9-tv-save" aria-hidden="true">' + I.save + '</span></button>';
        const chat = '<button type="button" class="v9-chatprev" data-v9="chat">' + (last && (last.text || last.body) ? '<span class="v9-msg"><i class="v9-av">' + esc(String(last.name || '?').slice(0, 1).toUpperCase()) + '</i><span><b>' + esc(last.name || '') + '</b>' + esc(String(last.text || last.body).slice(0, 90)) + '</span></span>' : '<span class="v9-msg v9-empty">' + esc(T('Say hi to everyone here', 'Sag allen hier Hallo', 'Saluda a todos')) + ' \u{1F44B}</span>') + '</button>';
        const input = '<div class="v9-inrow">' + bubble({ id: 'play', tint: 'gold', size: 52, html: I.sparkle, label: 'Playroom', cls: 'v9-door' }) +
            '<button type="button" class="v9-field" data-v9="chat">' + esc(T('Message', 'Nachricht', 'Mensaje')) + '</button><button type="button" class="v9-micb" data-v9="chat" aria-label="' + esc(T('Message', 'Nachricht', 'Mensaje')) + '">' + I.mic + '</button></div>';
        const dr = drawer ? '<div class="v9-drawer" role="dialog" aria-label="Playroom"><i class="v9-grab"></i><h3>Playroom</h3>' + choices([
            { id: 'pool', tint: 'gold', html: I.pool, label: T('Billiards', 'Billard', 'Billar') },
            { id: 'rank', tint: 'gold', html: I.crown, label: 'Ranking' },
            { id: 'swipe', tint: 'gold', html: I.cards, label: 'Swipe', sub: T('pick dinner', 'Abendessen wählen', 'elige cena') },
            { id: 'shuffle', tint: 'gold', html: I.shuffle, label: T('Shuffle', 'Mischen', 'Mezclar'), sub: T('surprise meal', 'Überraschung', 'sorpresa') }
        ]) + '</div>' : '';
        return {
            tint: 'coral', icon: I.chat, title: 'Lounge',
            subHTML: '<i class="v9-dot"></i>' + esc(here ? T(here + ' here now', here + ' gerade hier', here + ' aquí ahora') : T('Everyone, one room', 'Alle, ein Raum', 'Todos, una sala')),
            right: stack ? '<span class="v9-stack">' + stack + '</span>' : '',
            body: tv + chat + input + dr, cls: drawer ? 'v9-drawer-on' : ''
        };
    };

    /* Food-Dex: every food and product you logged, one bubble each, no limit */
    function dexItems() {
        const logs = (S().logs || []).filter(l => l && l.t), map = new Map();
        logs.forEach(l => { const k = String(l.t).toLowerCase().trim(); const e = map.get(k) || { t: l.t, n: 0, first: l.ts || 0, lvl: l.lvl, e: l.e, photo: '', code: l.code }; e.n++; if (l.photo && !e.photo) e.photo = l.photo; if (l.ts && (!e.first || l.ts < e.first)) e.first = l.ts; map.set(k, e); });
        return [...map.values()].sort((a, b) => (b.first || 0) - (a.first || 0));
    }
    let dexQ = '', dexF = 'all';
    WORLDS.dex = () => {
        const all = dexItems();
        const list = all.filter(x => (!dexQ || x.t.toLowerCase().includes(dexQ)) && (dexF === 'all' || (dexF === 'snacks' ? !!x.code : !x.code)));
        const lv = x => x.lvl === 'low' ? 'v9-lo' : x.lvl === 'high' ? 'v9-hi' : x.lvl === 'medium' ? 'v9-me2' : '';
        const cells = list.map(x => '<button type="button" class="v9-cell ' + lv(x) + '" data-v9="dexone" data-k="' + esc(x.t) + '" aria-label="' + esc(x.t) + '">' +
            (x.photo ? '<img src="' + esc(x.photo) + '" alt="">' : '<span>' + esc(x.e || '\u{1F37D}️') + '</span>') + (x.n > 1 ? '<b>' + x.n + '</b>' : '') + '<small>' + esc(x.t) + '</small></button>').join('');
        const chip = (id, txt) => '<button type="button" class="v9-fchip' + (dexF === id ? ' on' : '') + '" data-v9="dexf" data-f="' + id + '">' + esc(txt) + '</button>';
        return {
            tint: 'gold', icon: I.dex, title: 'Food-Dex', sub: T(all.length + ' foods collected · no limit', all.length + ' Lebensmittel gesammelt · kein Limit', all.length + ' alimentos · sin límite'),
            body: '<form class="v9-search" data-v9form="dex"><span>' + I.search + '</span><input type="search" value="' + esc(dexQ) + '" placeholder="' + esc(T('Search your foods', 'Deine Lebensmittel suchen', 'Busca tus alimentos')) + '" enterkeyhint="search"></form>' +
                '<div class="v9-fchips">' + chip('all', T('All', 'Alle', 'Todo')) + chip('snacks', T('Products', 'Produkte', 'Productos')) + chip('meals', T('Meals', 'Mahlzeiten', 'Comidas')) + '</div>' +
                '<div class="v9-hive">' + (cells || '<p class="v9-none">' + esc(all.length ? T('Nothing matches.', 'Nichts gefunden.', 'Nada coincide.') : T('Every food you log lands here. Check your first plate!', 'Alles, was du einträgst, landet hier. Check deinen ersten Teller!', 'Todo lo que registres aparece aquí. ¡Revisa tu primer plato!')) + '</p>') + '</div>' +
                '<p class="v9-foot">' + esc(T('Every food you log lands here.', 'Jedes Essen, das du einträgst, landet hier.', 'Cada comida que registras aparece aquí.')) + '</p>'
        };
    };

    /* Settings: the profile photo, six setting bubbles, the rest as quiet links (handoff screen 16) */
    WORLDS.settings = () => {
        const u = S().user || {}, av = avatar(), R = W.LowiHomeSettingsSleepV2, has = id => tryc(() => R.has(id), false);
        const b = [
            has('vr') && { id: 'vr', tint: 'cyan', html: I.vr, label: 'VR' },
            { id: 'lang', tint: 'glass', html: I.lang, label: T('Language', 'Sprache', 'Idioma'), sub: L().toUpperCase() },
            has('notifications') && { id: 'alerts', tint: 'glass', html: I.bell, label: T('Alerts', 'Hinweise', 'Avisos') },
            has('about') && { id: 'privacy', tint: 'glass', html: I.lock, label: T('Privacy', 'Datenschutz', 'Privacidad') },
            { id: 'invite', tint: 'gold', html: I.gift, label: T('Invite', 'Einladen', 'Invitar') },
            has('look') && { id: 'calm', tint: 'lav', html: I.calm, label: T('Look & calm', 'Look & Ruhe', 'Aspecto y calma') }
        ].filter(Boolean);
        const grid = '<div class="v9-grid">' + b.map(x => bubble(Object.assign({ size: 72 }, x))).join('') + '</div>';
        const link = (id, txt, red) => has(id) || id === 'help' ? '<button type="button" class="v9-link' + (red ? ' red' : '') + '" data-v9="r-' + id + '">' + esc(txt) + '</button>' : '';
        return {
            tint: 'glass', icon: I.user, title: T('Settings', 'Einstellungen', 'Ajustes'), sub: T('You, your app, your account', 'Du, deine App, dein Konto', 'Tú, tu app, tu cuenta'),
            body: '<div class="v9-prof">' + bubble({ id: 'me', tint: 'gold', size: 118, glow: true, html: av ? '' : '<span class="v9-init">' + esc((u.name || '?').slice(0, 1).toUpperCase()) + '</span>', img: av || '', aria: u.name || '' }) +
                '<b>' + esc(u.name || T('You', 'Du', 'Tú')) + '</b><small>' + esc(T('Photo, name, body, goals, account', 'Foto, Name, Körper, Ziele, Konto', 'Foto, nombre, cuerpo, metas, cuenta')) + '</small></div>' + grid +
                '<nav class="v9-links">' + link('tutorial', T('Help & tutorial', 'Hilfe & Tutorial', 'Ayuda y tutorial')) + link('feedback', 'Feedback') + link('feedbackInbox', 'Inbox') + link('support', T('Pay what you want', 'Zahl, was du willst', 'Paga lo que quieras')) + link('about', T('About', 'Über', 'Acerca de')) + link('account', T('Account', 'Konto', 'Cuenta')) + '</nav>'
        };
    };

    /* ---------- render ---------- */
    let el = null, stack = [], leftAt = 0;
    const PARENT = { dex: 'misty', settings: 'misty' };
    const NAME = () => ({ check: T('Check', 'Check', 'Revisar'), shop: T('Shop', 'Einkaufen', 'Compras'), misty: companionName(), lounge: 'Lounge' });
    function render() {
        if (!el) return;
        const id = stack[stack.length - 1]; const make = WORLDS[id]; if (!make) return close();
        let w; try { w = make(); } catch (e) { console.error('[v9] world', id, e); return close(); }
        const prev = stack[stack.length - 2];
        const back = prev ? '<button type="button" class="v9-bk" data-v9="back" aria-label="' + esc(T('Back', 'Zurück', 'Atrás')) + '" data-bx-label="' + esc(NAME()[prev] || T('Back', 'Zurück', 'Atrás')) + '"></button>'
            : '<button type="button" class="v9-bk" data-v9="back" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '"></button>';
        el.className = 'v9w v9w-' + id + ' v9t-' + w.tint + (w.cls ? ' ' + w.cls : '');
        el.setAttribute('aria-label', w.title);
        el.innerHTML = '<div class="v9-bg" aria-hidden="true"><i class="v9-beam"></i><i class="v9-beam b2"></i><i class="v9-aura"></i></div>' + header(w) +
            (w.body ? '<div class="v9-body">' + w.body + '</div>' : hero(w.hero) + choices(w.choices || [])) + back;
    }
    function open(id, keep) {
        if (!WORLDS[id]) return false;
        if (!el) {
            el = D.createElement('section'); el.id = 'v9W'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
            el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); el.addEventListener('input', onInput);
            D.body.appendChild(el);
        }
        if (!keep) stack = []; else if (stack[stack.length - 1] === id) return true;
        stack.push(id); drawer = false; bodyPick = -1;
        H.classList.add('v9-on'); el.hidden = false; render();
        try { el.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 260, easing: 'cubic-bezier(.2,.9,.25,1.1)' }); } catch (e) { }
        return true;
    }
    function close() { stack = []; drawer = false; if (el) { el.hidden = true; el.innerHTML = ''; } H.classList.remove('v9-on', 'v9-away'); }
    function back() { if (drawer) { drawer = false; render(); return; } stack.pop(); if (!stack.length) close(); else render(); }
    /* a feature that is a whole tab (scanner, Community, Cook, Move) goes over the world: the world waits out of sight and is
       there again when you come back Home; a sheet or panel simply opens on top of it */
    let sawAway = false;
    function away(f) { H.classList.add('v9-away'); leftAt = Date.now(); sawAway = false; later(f, 0); }
    setInterval(() => {
        if (!el || el.hidden || !stack.length) return;
        /* pages that open inside the app frame under the world (the Move player, the Move page) put it out of sight too */
        const over = !!D.querySelector('#mv-player.on,#mv-screen.on:not(.tabmode)');
        if (over && !H.classList.contains('v9-away')) { H.classList.add('v9-away'); leftAt = Date.now(); }
        if (!H.classList.contains('v9-away')) return;
        if (!onHome() || over) { sawAway = true; return; }
        if (!sawAway && Date.now() - leftAt < 4000) return;
        if (Date.now() - leftAt > 20 * 60 * 1000) close(); else { H.classList.remove('v9-away'); render(); }
    }, 400);

    /* ---------- actions ---------- */
    /* the scanner opens on its own chooser (index.html pickHTML): the world presses the row the person picked here */
    function scan(key, then) {
        away(() => {
            goTab('scan');
            let n = 0;
            const t = setInterval(() => {
                const b = D.querySelector('#tab-scan [data-b3="' + key + '"],[data-b3="' + key + '"]');
                if (b || ++n > 25) { clearInterval(t); if (b) { try { b.click(); } catch (e) { } } if (then) later(then, 300); }
            }, 80);
        });
    }
    function sendList() {
        const txt = tryc(() => W.tdListText(), '');
        if (!txt || !listItems().length) { toast(T('Your list is empty', 'Deine Liste ist leer', 'Tu lista está vacía')); return; }
        try { if (navigator.share) { navigator.share({ text: txt }).catch(() => { }); return; } } catch (e) { }
        try { navigator.clipboard.writeText(txt).then(() => toast(T('List copied. Paste it in WhatsApp', 'Liste kopiert. In WhatsApp einfügen', 'Lista copiada. Pégala en WhatsApp')), () => { }); } catch (e) { }
    }
    function say() {
        try { const m = bodyModel(), s = (m.stages || [])[bodyPick >= 0 ? bodyPick : Math.max(0, m.cur)]; if (!s) return; const txt = s.n + '. ' + String(s.x || '').replace(/<[^>]+>/g, ''); if (W.LowiVoice && fn(W.LowiVoice, 'speak')) { try { W.LowiVoice.cancel(); } catch (e) { } W.LowiVoice.speak(txt, { lang: L() }); } } catch (e) { }
    }
    function community(then) { away(() => { goTab('foryou'); if (then) later(then, 450); }); }
    function cook(re) { away(() => { goTab('shelf'); later(() => clickText('#tab-shelf', re), 450); }); }
    const ACT = {
        back, photo: () => scan('pickshoot'), barcode: () => scan('picklive'),
        gallery: () => scan('picklib'),
        type: () => scan('pickman', () => { const i = D.getElementById('b3Nm'); if (i) { try { i.scrollIntoView({ block: 'center' }); } catch (e) { } i.focus(); } }),
        deep: () => { const u = tryc(() => W.LowiGptOpen.GPT, '') || 'https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike'; W.open(u, '_blank', 'noopener'); },
        plan: () => { if (fn(W.LowiShopPlan, 'openEditor')) W.LowiShopPlan.openEditor(); },
        list: () => { if (fn(W, 'tdShopOpen')) W.tdShopOpen(); else ACT.find(); },
        find: () => { if (W.LowiStorePicks) W.LowiStorePicks.openAt('shop', 'home-shop'); },
        week: () => { if (fn(W.LowiWeekBasket, 'open')) W.LowiWeekBasket.open(); else if (W.LowiStorePicks) W.LowiStorePicks.openAt('shop', 'home-shop'); },
        others: () => { if (W.LowiStorePicks) W.LowiStorePicks.openAt('sz', 'home-shop'); },
        send: sendList,
        ate: () => { close(); later(() => { const B = W.LowiHomeBloomsV2; if (B && fn(B, 'open')) B.open('gap'); }, 200); },
        say,
        mirror: () => { if (fn(W.LowiMirror, 'open')) W.LowiMirror.open(); else if (fn(W.LowiMoveBubble, 'page')) away(() => W.LowiMoveBubble.page()); },
        card: () => { if (ORIG.hub) ORIG.hub.call(W.LowiMistyHub); },
        dex: () => open('dex', true), settings: () => open('settings', true),
        history: () => { if (ORIG.hub) { ORIG.hub.call(W.LowiMistyHub); later(() => clickText('.mh-sheet,#mhSheet,.r2-ov:last-of-type', /^(History|Verlauf|Historial)$/), 300); } },
        worlds: () => { if (fn(W.LowiMistyHub, 'openSec')) W.LowiMistyHub.openSec('aura'); },
        night: () => { if (fn(W.LowiMistyHub, 'goodnight')) W.LowiMistyHub.goodnight(); else if (fn(W.LowiDayRecap, 'open')) W.LowiDayRecap.open(); },
        fy: () => { if (W.LowiNavMoves && fn(W.LowiNavMoves, 'open')) away(() => W.LowiNavMoves.open('fy')); else community(); },
        chat: () => community(() => clickText('#tab-foryou', /^(Chat)$/)),
        play: () => { drawer = !drawer; render(); },
        pool: () => community(() => clickText('#tab-foryou', /^(Room|Raum|Sala)$/)),
        rank: () => { if (W.LowiRanking && fn(W.LowiRanking, 'open')) away(() => W.LowiRanking.open()); },
        swipe: () => cook(/^(Swipe|Wischen|Desliza)/), shuffle: () => cook(/^(Shuffle|Mischen|Mezclar)/),
        me: () => route('me') || route('account'), vr: () => route('vr'), alerts: () => route('notifications'), privacy: () => route('about'), calm: () => route('look'),
        lang: () => { const n = { en: 'de', de: 'es', es: 'en' }[L()]; try { W.LowiLang.set(n); } catch (e) { } later(render, 120); },
        invite: () => { const u = 'https://therealetm.github.io/lowispike/', t = T('Join me on LOWiSPIKE, the low-spike food game: ', 'Komm zu LOWiSPIKE, dem Low-Spike-Essensspiel: ', 'Únete a LOWiSPIKE, el juego de comida sin picos: '); try { if (navigator.share) { navigator.share({ text: t + u }).catch(() => { }); return; } } catch (e) { } try { navigator.clipboard.writeText(t + u); toast(T('Link copied', 'Link kopiert', 'Enlace copiado')); } catch (e) { } },
        dexone: b => { const x = dexItems().find(i => i.t === b.getAttribute('data-k')); if (!x) return; const v = { low: T('Low spike', 'Wenig Spike', 'Pico bajo'), medium: T('Medium spike', 'Mittlerer Spike', 'Pico medio'), high: T('Spikes', 'Spikt', 'Pico') }[x.lvl] || ''; toast(x.t + (v ? ' · ' + v : '') + ' · ' + x.n + '×' + (x.first ? ' · ' + T('first ', 'zuerst ', 'primero ') + new Date(x.first).toLocaleDateString() : '')); },
        dexf: b => { dexF = b.getAttribute('data-f') || 'all'; render(); },
        stop: b => { bodyPick = +b.getAttribute('data-i'); render(); }
    };
    ['tutorial', 'feedback', 'feedbackInbox', 'support', 'about', 'account'].forEach(k => { ACT['r-' + k] = () => route(k) || (k === 'account' && route('me')); });
    function onClick(e) {
        const b = e.target.closest('[data-v9]'); if (!b || !el.contains(b)) return;
        const k = b.getAttribute('data-v9');
        /* Move bubbles carry data-mv: the Move player's own handler starts them (index.html [data-mv] "quick") */
        if (b.hasAttribute('data-mv')) { e.preventDefault(); const M = W.MOVE; try { if (M && fn(M, 'start')) M.start(b.getAttribute('data-fmt'), +b.getAttribute('data-min') || 5); } catch (err) { console.warn('[v9] move', err); } return; }
        const f = ACT[k]; if (!f) return;
        e.preventDefault();
        try { if (navigator.vibrate) navigator.vibrate(6); } catch (x) { }
        try { f(b); } catch (err) { console.warn('[v9] action', k, err); }
    }
    function onSubmit(e) { e.preventDefault(); const i = e.target.querySelector('input'); if (i) i.blur(); }
    function onInput(e) { if (e.target.closest('[data-v9form="dex"]')) { dexQ = String(e.target.value || '').toLowerCase().trim(); const pos = e.target.selectionStart; render(); const n = el.querySelector('[data-v9form="dex"] input'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { } } } }
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && el && !el.hidden && stack.length && !H.classList.contains('v9-away')) { e.preventDefault(); back(); } });

    /* ---------- Home: the bubbles open their worlds ---------- */
    /* one window capture listener, registered before the ring's own handlers (this file loads before home-orbit-v2 / blooms):
       a plain tap opens the world; a hold (Scan: all bubbles, Community: settings) keeps doing what it did */
    const TAP = { scan: 'check', fuel: 'shop', gap: 'body', settings: 'lounge' };
    let downAt = 0, downKey = '', downXY = null;
    W.addEventListener('pointerdown', e => { const b = e.target && e.target.closest && e.target.closest('[data-orbit]'); downKey = b ? b.getAttribute('data-orbit') : ''; downAt = Date.now(); downXY = [e.clientX, e.clientY]; }, true);
    W.addEventListener('click', e => {
        if (OFF()) return;
        const b = e.target && e.target.closest && e.target.closest('[data-orbit]'); if (!b) return;
        const k = b.getAttribute('data-orbit'), w = TAP[k]; if (!w) return;
        if (downKey === k && Date.now() - downAt > 480) return; /* the click that ends a hold */
        if (!H.classList.contains('wh-home') && !onHome()) return;
        e.preventDefault(); e.stopImmediatePropagation();
        try { const B = W.LowiHomeBloomsV2; if (B && B.isOpen && B.isOpen()) B.close(); } catch (x) { }
        open(w);
    }, true);
    /* Misty's card and the Move page open as their worlds; the old card / page stay one tap inside */
    const ORIG = {};
    function wrap() {
        const M = W.LowiMistyHub;
        if (M && fn(M, 'open') && !M.open.__v9) { ORIG.hub = M.open; const f = function (x) { if (OFF() || x || (el && !el.hidden && stack[stack.length - 1] === 'misty')) return ORIG.hub.apply(this, arguments); return open('misty'); }; f.__v9 = 1; M.open = f; }
        const V = W.LowiMoveBubble;
        if (V && fn(V, 'page') && !V.page.__v9) { ORIG.move = V.page; const g = function () { if (OFF() || (el && !el.hidden && stack[stack.length - 1] === 'move')) return ORIG.move.apply(this, arguments); return open('move'); }; g.__v9 = 1; V.page = g; }
    }
    W.addEventListener('load', wrap); setTimeout(wrap, 1500); setTimeout(wrap, 5000);

    W.LowiV9 = { open, close, back, worlds: () => Object.keys(WORLDS), current: () => stack[stack.length - 1] || '', isOpen: () => !!(el && !el.hidden && stack.length), _dex: dexItems, _rings: rings };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
