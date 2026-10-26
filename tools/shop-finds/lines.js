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
