/* LOWiSPIKE · grocery bucket on the product card (queue grocery-1, Oct 23 2026). Logic and words: grocery-bucket-core.js.
   A product check (Scan, not the Log meal scan, not the shopping camera which has its own cart) gets one row under the card's
   actions: "Add to bucket" or "Skip". Add keeps the product in today's bucket (on the phone, per day) and shows the count,
   Undo and a small list of today's bucket you can open and remove from. Skip closes the card so the next scan is one tap away.
   index.html's scActsHTML asks LowiBucket.rowHTML(p). */
(() => {
    'use strict';
    const W = window, D = document, C = W.LowiBucketCore;
    if (!C) return;
    const li = () => { try { return C.langIndex(W.LowiLang && LowiLang.get ? LowiLang.get() : D.documentElement.lang); } catch (e) { return 0; } };
    const T = (k, n) => C.tx(k, li(), n);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const PROD = new Map(); let seq = 0;
    function countText(n) { return n === 1 ? T('count1') : T('countN', n); }
    function listHTML() {
        const items = C.today(C.load());
        return '<details class="gb-list"><summary>' + esc(T('list')) + ' <b>' + items.length + '</b></summary>' + (items.length ? '<ul>' + items.slice().reverse().map(x =>
            '<li><span class="gb-dot v-' + esc(x.verdict) + '" aria-hidden="true"></span><span class="gb-nm">' + esc(x.name || x.code) + (x.brand ? '<small>' + esc(x.brand) + '</small>' : '') + '</span>' +
            '<small class="gb-v">' + esc(T('v_' + x.verdict)) + '</small><button type="button" class="gb-rm" data-gb="rm" data-k="' + esc(x.k) + '" aria-label="' + esc(T('remove') + ': ' + (x.name || x.code)) + '">×</button></li>').join('') + '</ul>' :
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
    W.LowiBucket = { rowHTML, today: () => C.today(C.load()) };
})();
