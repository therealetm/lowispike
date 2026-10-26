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
