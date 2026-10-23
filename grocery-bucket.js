/* LOWiSPIKE · grocery bucket on the product card (queue grocery-1 + grocery-2, Oct 23 2026). Logic and words: grocery-bucket-core.js.
   A product check (Scan, not the Log meal scan, not the shopping camera which has its own cart) gets one row under the card's
   actions: "Add to bucket" or "Skip". Add keeps the product in today's bucket (on the phone, per day) and shows the count,
   Undo and a small list of today's bucket you can open and remove from. Skip closes the card so the next scan is one tap away.
   grocery-2: the list has "Shop you're in" (shops that real price reports name for today's items, or "Other shop"), each item's
   spike points and price (the newest real report at that shop, else a Type price field), and the shop total + total points.
   Prices only come from the person or from real reports (LOWI_SHELF.priceReports, the person's own LowiDiscovery price
   contributions), never invented. index.html's scActsHTML asks LowiBucket.rowHTML(p).
   grocery-4: the Today's groceries sheet also logs what was cooked from them (text or Snap photo) into the one meal journal. */
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
            '<label class="gb-shop"><span>' + esc(T('shop')) + '</span><select data-gb-shop="1">' + opts + '</select></label><ul>' + items.slice().reverse().map(row).join('') + '</ul>' + total +
            '<button type="button" class="gb-today" data-gbt="open">' + esc(T('todayOpen')) + ' <span aria-hidden="true">›</span></button>' :
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
    /* grocery-3 (Seven, Maya 7 handover): "Today's groceries: at the end of the day, show what was bought, with suggestions for
       what to cook from it." A sheet with today's bucket (items, price + points totals from the core) and up to 3 recipes from
       Cook's own recipe list (LowiAllRecipes) that use them. In-app entry only (the bucket list, LowiBucket.openToday): the repo
       has no evening hour for a reminder, so none is invented. */
    function recipes() { try { return typeof W.LowiAllRecipes === 'function' ? W.LowiAllRecipes() : []; } catch (e) { return []; } }
    function groupWords() { return W.LOWI_GROUP_WORDS || null; } /* Cook's own group words (index.html GROUP_WORDS) */
    function todayHTML() {
        const s = C.load(), items = C.today(s), L = li();
        if (!items.length) return '<div class="gt-sheet"><div class="h2">' + esc(T('todayG')) + '</div><p class="gb-empty">' + esc(T('noneToday')) + '</p></div>';
        const byKey = {}; items.forEach(x => { byKey[x.k] = reportsFor(x); });
        const picked = C.shopOf(s), shop = picked === OTHER ? '' : picked, tot = C.totals(items, byKey, shop);
        const list = items.map(x => { const pr = C.priceFor(x, byKey[x.k], shop);
            return '<li><span class="gb-dot v-' + esc(x.verdict) + '" aria-hidden="true"></span><span class="gb-nm">' + esc(x.name || x.code) + (x.brand ? '<small>' + esc(x.brand) + '</small>' : '') + '</span>' +
                '<span class="gb-pr"><b>' + esc(pr ? C.fmtPrice(pr.amount, L) : '–') + '</b><small>' + esc(typeof x.pts === 'number' ? T('pts', x.pts) : T('noPts')) + '</small></span></li>'; }).join('');
        const sug = C.suggest(items, recipes(), groupWords(), 3);
        const cook = sug.length ? '<ul class="gt-cook">' + sug.map(r => '<li><button type="button" class="gt-rec" data-sh="recipe" data-r="' + esc(r.id) + '" aria-label="' + esc(T('openRecipe') + ': ' + r.n) + '">' +
                '<span class="gt-e" aria-hidden="true">' + esc(r.e || '🍽️') + '</span><span class="gb-nm"><b>' + esc(r.n) + '</b><small>' + esc(C.tx('uses', L, null, r.have.join(', '))) + '</small>' +
                (r.need.length ? '<small class="gt-need">' + esc(C.tx('alsoNeed', L, null, r.need.slice(0, 4).join(', ') + (r.need.length > 4 ? ' …' : ''))) + '</small>' : '') + '</span><span class="gt-go" aria-hidden="true">›</span></button>' +
                '<button type="button" class="gt-did" data-gtc="fill" data-n="' + esc(r.n) + '" data-used="' + esc(C.keysFor(items, r.used).join('\n')) + '">' + esc(T('cookedThis')) + '</button></li>').join('') + '</ul>' :
            '<p class="gb-empty gt-nocook">' + esc(T('noCook')) + '</p>';
        return '<div class="gt-sheet"><div class="h2">' + esc(T('todayG')) + '</div>' +
            '<div class="gt-lab">' + esc(T('bought')) + ' <b>' + items.length + '</b></div><ul class="gt-items">' + list + '</ul>' +
            '<div class="gb-tot" role="status"><div><span>' + esc(shop ? C.tx('totalAt', L, null, shop) : T('total')) + '</span><b class="gb-tp">' + esc(C.fmtPrice(tot.price, L)) + '</b></div>' +
            (tot.missing ? '<small class="gb-miss">' + esc(tot.missing === 1 ? T('missing1') : T('missingN', tot.missing)) + '</small>' : '') +
            '<div><span>' + esc(T('points')) + '</span><b class="gb-tpts">' + tot.points + '</b></div></div>' +
            '<div class="gt-lab">' + esc(T('cook')) + '</div><p class="gt-note">' + esc(T('cookNote')) + '</p>' + cook + cookedHTML(items) + '</div>';
    }
    /* grocery-4 (Seven, Maya 7 handover): "Log what was cooked from those groceries, as text or a photo." Under the cook ideas:
       what you cooked today, and a small form: type it (Log it) or Snap a photo, with chips for the groceries that went in.
       Text logs through LowiVitalsBridge.logMeal, the one meal path (meal count, XP cap, meal gap, the same-food-once rule);
       the photo opens the app's own Snap (LowiSpirit.photo), which saves the photo and its estimate in meal-journal.js. No new
       meal store: the bucket only keeps the link (LowiBucketCore.addCooked) from that meal to the items used. */
    const VB = () => W.LowiVitalsBridge || null;
    function logById(id) { try { const v = VB(), st = v && v.state && v.state(), logs = st && Array.isArray(st.logs) ? st.logs : []; return logs.find(l => l && (l.eventId === id || l.id === id || 'meal:' + l.id === id)) || null; } catch (e) { return null; } }
    function slotNow() { try { if (W.LowiSpiritCore && LowiSpiritCore.slotFor) return LowiSpiritCore.slotFor(); } catch (e) {} return ''; } /* Log meal's own slot from the clock */
    function cookedHTML(items) {
        const L = li(), names = {}; items.forEach(x => { names[x.k] = x.name || x.code; });
        const done = C.cookedToday(C.load()).map(c => ({ c, log: logById(c.id) })).filter(x => x.log).reverse();
        const thumb = log => { try { return W.LowiMealJournal && LowiMealJournal.thumbHTML ? LowiMealJournal.thumbHTML(log) : ''; } catch (e) { return ''; } };
        const list = done.length ? '<ul class="gt-done">' + done.map(({ c, log }) => { const used = c.used.map(k => names[k]).filter(Boolean);
            return '<li data-gtc-id="' + esc(c.id) + '">' + thumb(log) + '<span class="gb-nm"><b>' + esc(log.t || c.t) + '</b><small>' + esc(T(c.via === 'photo' ? 'viaPhoto' : 'viaText')) + (used.length ? ' · ' + esc(C.tx('usedS', L, null, used.join(', '))) : '') + '</small></span></li>'; }).join('') + '</ul>' : '';
        const chips = items.map(x => '<label class="gt-chip"><input type="checkbox" value="' + esc(x.k) + '"><span>' + esc(x.name || x.code) + '</span></label>').join('');
        return '<div class="gt-lab">' + esc(T('cooked')) + (done.length ? ' <b>' + done.length + '</b>' : '') + '</div><p class="gt-note">' + esc(T('cookedNote')) + '</p>' + list +
            '<form class="gt-form" data-gtc-form="1" novalidate><label class="gt-what"><span>' + esc(T('cookedAsk')) + '</span><input type="text" name="gtc" maxlength="100" autocomplete="off" enterkeyhint="done" placeholder="' + esc(T('cookedPh')) + '"></label>' +
            '<fieldset class="gt-used"><legend>' + esc(T('usedQ')) + '</legend><div class="gt-chips">' + chips + '</div></fieldset>' +
            '<div class="gt-acts"><button type="submit" class="r2-btn pri gt-logt" data-gtc="text">' + esc(T('logText')) + '</button><button type="button" class="r2-btn ghost gt-logp" data-gtc="photo">' + esc(T('logPhoto')) + '</button></div>' +
            '<p class="gt-msg" role="status" aria-live="polite"></p></form>';
    }
    function toast(m) { try { if (W.LowiR2 && LowiR2.toast) LowiR2.toast(m); } catch (e) {} }
    function usedOf(form) { return [...form.querySelectorAll('.gt-chip input:checked')].map(i => i.value); }
    function repaint(ov) { const sh = ov && ov.querySelector('.gt-sheet'); if (sh) sh.outerHTML = todayHTML(); }
    function logText(form) {
        const ov = form.closest('.gt-ov'), inp = form.querySelector('[name="gtc"]'), msg = form.querySelector('.gt-msg'), t = String(inp.value || '').trim();
        if (!t) { inp.setAttribute('aria-invalid', 'true'); msg.textContent = T('needName'); return null; }
        const v = VB(); let res = false;
        try { res = v && v.logMeal ? v.logMeal(Object.assign({ id: 'gc:' + Date.now().toString(36), t, via: 'groceries' }, slotNow() ? { slot: slotNow() } : {})) : false; } catch (e) { console.error(e); res = false; }
        if (res && res.log) {
            C.save(C.addCooked(C.load(), { id: res.log.eventId || res.log.id, t, via: 'text', used: usedOf(form) }));
            fire('cooked', {}); repaint(ov); toast(T('loggedC')); return res;
        }
        msg.textContent = T(res && res.dup ? 'dupC' : 'failC'); return res;
    }
    let pending = null; /* a Snap started from this sheet: the next photo meal within 10 minutes is the cooked one */
    function logPhoto(form) {
        pending = { at: Date.now(), used: usedOf(form), t: String((form.querySelector('[name="gtc"]') || {}).value || '').trim() };
        const ov = form.closest('.gt-ov');
        try { if (ov && W.LowiR2 && LowiR2.close) LowiR2.close(ov); } catch (e) {}
        try { if (W.LowiSpirit && LowiSpirit.photo) { LowiSpirit.photo(); return true; } } catch (e) { console.error(e); }
        pending = null; return false;
    }
    W.addEventListener('lowi:meal-logged', e => {
        const d = e && e.detail || {}; if (!pending || Date.now() - pending.at > 10 * 60000) { pending = null; return; }
        if (d.via === 'groceries' || !(d.photo || d.via === 'photo')) return;
        C.save(C.addCooked(C.load(), { id: d.id, t: d.title || pending.t, via: 'photo', used: pending.used })); pending = null; fire('cooked', {});
    });
    W.addEventListener('lowi:meal-deleted', e => { const id = e && e.detail && e.detail.id; if (id) C.save(C.removeCooked(C.load(), id)); });
    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-gtc]'); if (!b || !b.closest('.gt-ov')) return;
        const a = b.dataset.gtc, ov = b.closest('.gt-ov'), form = ov.querySelector('[data-gtc-form]'); if (!form) return;
        if (a === 'fill') {
            e.preventDefault(); e.stopPropagation();
            const inp = form.querySelector('[name="gtc"]'); inp.value = b.dataset.n || ''; inp.removeAttribute('aria-invalid'); form.querySelector('.gt-msg').textContent = '';
            const keys = String(b.dataset.used || '').split('\n'); form.querySelectorAll('.gt-chip input').forEach(i => { i.checked = keys.indexOf(i.value) >= 0; });
            try { form.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {}
        } else if (a === 'photo') { e.preventDefault(); e.stopPropagation(); logPhoto(form); }
    }, true);
    D.addEventListener('submit', e => { const f = e.target; if (!f || !f.matches || !f.matches('[data-gtc-form]')) return; e.preventDefault(); logText(f); }, true);
    D.addEventListener('keydown', e => { const t = e.target; if (e.key === 'Enter' && t && t.matches && t.matches('[name="gtc"]')) { e.preventDefault(); t.blur(); } }, true);
    function openToday() { if (!W.LowiR2 || !LowiR2.sheet) return null; const ov = LowiR2.sheet(todayHTML(), { cls: 'gt-ov' }); fire('today', {}); return ov; }
    D.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-gbt="open"]'); if (!b) return; e.preventDefault(); e.stopPropagation(); openToday(); }, true);
    W.LowiBucket = { rowHTML, today: () => C.today(C.load()), openToday, todayHTML, logText, logPhoto };
})();
