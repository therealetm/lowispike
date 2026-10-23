/* LOWiSPIKE · grocery bucket on the product card (queue grocery-1 + grocery-2, Oct 23 2026). Logic and words: grocery-bucket-core.js.
   A product check (Scan, not the Log meal scan, not the shopping camera which has its own cart) gets one row under the card's
   actions: "Add to bucket" or "Skip". Add keeps the product in today's bucket (on the phone, per day) and shows the count,
   Undo and a small list of today's bucket you can open and remove from. Skip closes the card so the next scan is one tap away.
   grocery-2: the list has "Shop you're in" (shops that real price reports name for today's items, or "Other shop"), each item's
   spike points and price (the newest real report at that shop, else a Type price field), and the shop total + total points.
   Prices only come from the person or from real reports (LOWI_SHELF.priceReports, the person's own LowiDiscovery price
   contributions), never invented. index.html's scActsHTML asks LowiBucket.rowHTML(p). */
(() => {
    'use strict';
    const W = window, D = document, C = W.LowiBucketCore;
    if (!C) return;
    const li = () => { try { return C.langIndex(W.LowiLang && LowiLang.get ? LowiLang.get() : D.documentElement.lang); } catch (e) { return 0; } };
    const T = (k, n) => C.tx(k, li(), n);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const PROD = new Map(); let seq = 0;
    function countText(n) { return n === 1 ? T('count1') : T('countN', n); }
    const OTHER = '__other';
    function reportsFor(it) {
        let rs = [];
        try { if (W.LOWI_SHELF && LOWI_SHELF.priceReports) rs = rs.concat(LOWI_SHELF.priceReports(it.name, it.code) || []); } catch (e) {}
        try { if (W.LowiDiscovery && W.LowiDiscoveryCore) { const key = LowiDiscoveryCore.identity({ barcode: it.code, name: it.name, brand: it.brand }); rs = rs.concat((LowiDiscovery.state().contributions || []).filter(c => c.kind === 'price' && c.productKey === key && c.data).map(c => c.data)); } } catch (e) {}
        return rs;
    }
    function shortDate(d) { const x = new Date(d); return isNaN(x) ? '' : x.getDate() + '.' + (x.getMonth() + 1) + '.'; }
    function listHTML(open) {
        const s = C.load(), items = C.today(s), byKey = {}; items.forEach(x => { byKey[x.k] = reportsFor(x); });
        const shops = C.shopsFrom(byKey), picked = C.shopOf(s), shop = picked === OTHER ? '' : picked, L = li(), tot = C.totals(items, byKey, shop);
        const opts = '<option value=""' + (picked ? '' : ' selected') + '>' + esc(T('noShop')) + '</option>' + shops.map(n => '<option value="' + esc(n) + '"' + (n === picked ? ' selected' : '') + '>' + esc(n) + '</option>').join('') +
            (picked && picked !== OTHER && shops.indexOf(picked) < 0 ? '<option value="' + esc(picked) + '" selected>' + esc(picked) + '</option>' : '') +
            '<option value="' + OTHER + '"' + (picked === OTHER ? ' selected' : '') + '>' + esc(T('otherShop')) + '</option>';
        const row = x => {
            const pr = C.priceFor(x, byKey[x.k], shop);
            const price = pr && pr.src === 'report' ? '<span class="gb-pr"><b>' + esc(C.fmtPrice(pr.amount, L)) + '</b><small>' + esc(C.tx('reported', L, null, shortDate(pr.date))) + '</small></span>' :
                '<label class="gb-pin"><span class="gb-sr">' + esc(T('price') + ': ' + (x.name || x.code)) + '</span><input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" data-gb-price="' + esc(x.k) + '" placeholder="' + esc(T('typePrice')) + '" value="' + esc(pr ? String(pr.amount.toFixed(2)).replace('.', L ? ',' : '.') : '') + '"></label>';
            return '<li><span class="gb-dot v-' + esc(x.verdict) + '" aria-hidden="true"></span><span class="gb-nm">' + esc(x.name || x.code) + (x.brand ? '<small>' + esc(x.brand) + '</small>' : '') +
                '<small class="gb-v">' + esc(T('v_' + x.verdict)) + ' · ' + esc(typeof x.pts === 'number' ? T('pts', x.pts) : T('noPts')) + '</small></span>' + price +
                '<button type="button" class="gb-rm" data-gb="rm" data-k="' + esc(x.k) + '" aria-label="' + esc(T('remove') + ': ' + (x.name || x.code)) + '">×</button></li>';
        };
        const total = items.length ? '<div class="gb-tot" role="status"><div><span>' + esc(shop ? C.tx('totalAt', L, null, shop) : T('total')) + '</span><b class="gb-tp">' + esc(C.fmtPrice(tot.price, L)) + '</b></div>' +
            (tot.missing ? '<small class="gb-miss">' + esc(tot.missing === 1 ? T('missing1') : T('missingN', tot.missing)) + '</small>' : '') +
            '<div><span>' + esc(T('points')) + '</span><b class="gb-tpts">' + tot.points + '</b></div><small>' + esc(T('ptsNote')) + '</small></div>' : '';
        return '<details class="gb-list"' + (open ? ' open' : '') + '><summary>' + esc(T('list')) + ' <b>' + items.length + '</b></summary>' + (items.length ?
            '<label class="gb-shop"><span>' + esc(T('shop')) + '</span><select data-gb-shop="1">' + opts + '</select></label><ul>' + items.slice().reverse().map(row).join('') + '</ul>' + total :
            '<p class="gb-empty">' + esc(T('empty')) + '</p>') + '</details>';
    }
    function doneHTML(id) {
        const n = C.today(C.load()).length;
        return '<div class="gb-done" role="status"><span class="gb-ok" aria-hidden="true">✓</span><span><b>' + esc(T('added')) + '</b><small>' + esc(countText(n)) + '</small></span>' +
            '<button type="button" class="gb-undo" data-gb="undo" data-id="' + id + '">' + esc(T('undo')) + '</button></div>' + listHTML();
    }
    function chooseHTML(id) {
        return '<div class="gb-btns"><button type="button" class="r2-btn pri gb-add" data-gb="add" data-id="' + id + '">' + esc(T('add')) + '</button>' +
            '<button type="button" class="r2-btn ghost gb-skip" data-gb="skip" data-id="' + id + '">' + esc(T('skip')) + '</button></div>';
    }
    function rowHTML(p) {
        if (!p || p.notFound || !C.keyOf(p)) return '';
        const id = 'gb' + (++seq); PROD.set(id, p); if (PROD.size > 40) PROD.delete(PROD.keys().next().value);
        return '<div class="gb-row" data-gbrow="' + id + '">' + (C.has(C.load(), p) ? doneHTML(id) : chooseHTML(id)) + '</div>';
    }
    function fire(type, p) { try { W.dispatchEvent(new CustomEvent('lowi:bucket', { detail: { type, key: C.keyOf(p), count: C.today(C.load()).length } })); } catch (e) {} }
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-gb]'); if (!b) return;
        const row = b.closest('.gb-row'); if (!row) return;
        e.preventDefault(); e.stopPropagation();
        const a = b.dataset.gb, id = b.dataset.id || row.dataset.gbrow, p = PROD.get(id);
        if (a === 'add' && p) { C.save(C.add(C.load(), p)); row.innerHTML = doneHTML(id); fire('add', p); try { if (navigator.vibrate) navigator.vibrate(15); } catch (x) {} }
        else if (a === 'undo' && p) { C.save(C.remove(C.load(), C.keyOf(p))); row.innerHTML = chooseHTML(id); fire('remove', p); }
        else if (a === 'rm') { const k = b.dataset.k; C.save(C.remove(C.load(), k)); const cur = p && C.keyOf(p) === k; row.innerHTML = cur ? chooseHTML(id) : doneHTML(id); if (!cur) { const d = row.querySelector('.gb-list'); if (d) d.open = true; } fire('remove', { barcode: '', name: '' }); }
        else if (a === 'skip') { fire('skip', p || {}); const ov = row.closest('.r2-ov'); if (ov && W.LowiR2 && LowiR2.close) LowiR2.close(ov); else row.innerHTML = ''; }
    }, true);
    function relist(row) { const d = row.querySelector('.gb-list'); if (d) d.outerHTML = listHTML(true); }
    D.addEventListener('change', e => {
        const t = e.target; if (!t || !t.closest) return; const row = t.closest('.gb-row'); if (!row) return;
        if (t.matches('[data-gb-shop]')) { C.save(C.setShop(C.load(), t.value)); relist(row); fire('shop', {}); }
        else if (t.matches('[data-gb-price]')) { const v = t.value.trim(); if (v && C.parsePrice(v) == null) { t.setAttribute('aria-invalid', 'true'); return; } C.save(C.setPrice(C.load(), t.dataset.gbPrice, v)); relist(row); fire('price', {}); }
    }, true);
    D.addEventListener('keydown', e => { const t = e.target; if (e.key === 'Enter' && t && t.matches && t.matches('[data-gb-price]')) { e.preventDefault(); t.blur(); } }, true);
    W.LowiBucket = { rowHTML, today: () => C.today(C.load()) };
})();
