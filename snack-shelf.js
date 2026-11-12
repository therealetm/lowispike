/* LOWiSPIKE snack shelf (browser). 11 Nov 2026 (Emmanuel): the Seller Zone tab of Einkaufen becomes the community's snack shelf.
 * Two shelves in the same look as the game market: "Im Laden gefunden" (products people scanned that pass, from the shared
 * product list) and "Zum Bestellen" (the checked snacks of seller-zone-data.js, with their shop page). A tap on a find puts it in
 * the basket; "Snack gefunden? Scann ihn ins Regal" opens the scanner, where a passing product joins the shared list as before.
 * store-picks.js draws the frame and calls headHTML / html / click. Rules and words: snack-shelf-core.js. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiSnackShelf) return;
  const C = W.LowiSnackShelfCore; if (!C) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => { const l = String(D.documentElement.lang || 'en').slice(0, 2).toLowerCase(); return /^(en|de|es)$/.test(l) ? l : 'en'; };
  const w = (k, v) => C.word(k, lang(), v);
  const Z = () => (W.LowiSellerZone && W.LowiSellerZone.orderItems ? W.LowiSellerZone : null);
  const MC = () => W.LowiMarketCore || null;
  let shown = 0, finds = [], open = '', loading = false;
  const SCAN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M8 9v6M11 9v6M14 9v6M17 9v6"/></svg>';

  function dexItems() { try { return W.LowiDex && W.LowiDex.items ? W.LowiDex.items() : []; } catch (e) { return []; } }
  function mineKeys() { try { const m = W.LowiDex.state().mine || {}; return Object.keys(m).concat(Object.keys(m).map(k => m[k] && m[k].barcode).filter(Boolean)).concat(Object.keys(m).map(k => m[k] && C.norm(m[k].name)).filter(Boolean)); } catch (e) { return []; } }
  function hidden(uid) { try { const H = W.LowiHiddenAccounts; return !!(H && H.isHidden && H.isHidden(uid)); } catch (e) { return false; } }
  function build() { finds = C.community(dexItems(), { mineKeys: mineKeys(), hidden }); return finds; }
  /* ask the shared list once per opening; the panel repaints when it answers */
  function refresh(repaint) {
    if (loading || !W.LowiDex || !W.LowiDex.load) return;
    loading = true;
    Promise.resolve().then(() => W.LowiDex.load()).then(ok => { loading = false; if (ok && repaint) repaint(); }, () => { loading = false; });
  }
  const inCart = (env, name) => { try { const k = C.norm(name), l = (env.cartLines() || []).find(x => C.norm(x.n) === k); return l ? l.q || 1 : 0; } catch (e) { return 0; } };
  const img = src => (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">' : '');
  const boards = tiles => { let h = ''; for (let i = 0; i < tiles.length; i += 3) h += '<div class="mk-board">' + tiles.slice(i, i + 3).join('') + '</div>'; return h; };

  function headHTML() {
    return '<div class="sz-head sz-head-in sn-head"><span class="sz-orb sz-orb-h" aria-hidden="true">\u{1F36A}</span><div><h3>' + esc(C.NAME[lang()]) + '</h3><p>' + esc(w('lead')) + '</p></div></div>';
  }
  function html(env) {
    build();
    const pg = C.page(finds, shown), nMine = finds.filter(x => x.mine).length;
    const tiles = pg.items.map((x, i) => { const n = inCart(env, x.name), cr = C.credit(x, lang());
      return '<div class="mk-prod"><button type="button" class="mk-pack' + (x.mine ? ' sn-mine' : '') + '" data-sn-add="' + i + '" aria-label="' + esc(x.name + (x.brand ? ', ' + x.brand : '') + (cr ? ', ' + cr : '') + (n ? ', ' + n + ' ' + w('inBasket') : '')) + '">' +
        '<span class="mk-ph"><span class="mk-emo" aria-hidden="true">\u{1F36A}</span>' + img(x.img) + '</span><b>' + esc(x.name) + '</b><small>' + esc(cr || x.brand) + '</small>' +
        '<i class="mk-n" data-sn-n="' + i + '"' + (n ? '' : ' hidden') + '>' + n + '</i></button>' +
        '<button type="button" class="mk-i" data-sn-info="' + i + '" aria-label="' + esc(w('info') + ': ' + x.name) + '"></button></div>'; });
    const z = Z(); let order = '';
    if (z) {
      const items = z.orderItems();
      const ot = items.map(x => '<div class="mk-prod"><button type="button" class="mk-pack' + (open === x.id ? ' sn-open' : '') + '" data-sn-order="' + esc(x.id) + '" aria-expanded="' + (open === x.id) + '" aria-label="' + esc(x.n + ', ' + x.b + (x.price ? ', ' + x.price : '') + '. ' + w('details')) + '">' +
        '<span class="mk-ph"><span class="mk-emo" aria-hidden="true">' + x.e + '</span>' + (x.pic ? '<img src="' + esc(x.pic) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') + '</span><b>' + esc(x.n) + '</b><small>' + esc(x.price || x.shop) + '</small></button></div>');
      /* the opened snack's card (why it passes, shop link) sits right under its own shelf board */
      const at = open ? items.findIndex(x => x.id === open) : -1; let rows = '';
      for (let i = 0; i < ot.length; i += 3) rows += '<div class="mk-board">' + ot.slice(i, i + 3).join('') + '</div>' + (at >= i && at < i + 3 ? '<div class="sn-card">' + z.cardHTML(items[at].id) + '</div>' : '');
      order = '<h4 class="mk-sign sn-sign"><span aria-hidden="true">\u{1F4E6}</span>' + esc(w('order')) + '</h4>' +
        '<div data-sz-inline="1" class="sn-regs">' + z.regionsHTML() + '</div>' + rows;
    }
    return '<div class="mk mk-sn" data-noi18n>' +
      '<button type="button" class="mk-go sn-scan" data-sn="scan">' + SCAN + '<span>' + esc(w('scan')) + '</span></button>' +
      (nMine ? '<p class="sn-mineline">⭐ ' + esc(w('mine', { n: nMine })) + '</p>' : '') +
      '<h4 class="mk-sign sn-sign"><span aria-hidden="true">\u{1F6D2}</span>' + esc(w('found')) + '</h4>' +
      (finds.length ? '<p class="mk-hint">' + esc(w('tap')) + '</p>' + boards(tiles) + (pg.left ? '<button type="button" class="mk-more" data-sn-more="' + pg.next + '">' + esc(w('more')) + ' ›</button>' : '')
        : '<p class="mk-hint sn-none">' + esc(w('none')) + '</p>') +
      order + '<p class="mk-fine">' + esc(w('rule')) + '</p></div>';
  }
  /* a tap inside the shelf. Returns 'paint' when the panel should redraw (keeping its scroll), true when handled, false otherwise */
  function click(t, env) {
    const root = t && t.closest ? t.closest('.mk-sn') : null; if (!root) return false;
    let b;
    if ((b = t.closest('[data-sn-add]'))) {
      const i = +b.getAttribute('data-sn-add'), x = finds[i]; if (!x) return true;
      try { const M = MC(); if (M && x.img) localStorage.setItem(M.PICS_KEY, JSON.stringify(M.remember(localStorage.getItem(M.PICS_KEY), x.name, x.img))); } catch (e) { /* no picture kept */ }
      try { const l = (env.cartLines() || []).find(y => C.norm(y.n) === C.norm(x.name)); if (l) env.cartSetQty(l.id, (l.q || 1) + 1); else env.cartAdd(x.name); } catch (e) { /* list not ready */ }
      const n = inCart(env, x.name), badge = root.querySelector('[data-sn-n="' + i + '"]'); if (badge) { badge.textContent = n; badge.hidden = !n; }
      b.classList.remove('mk-hop'); void b.offsetWidth; b.classList.add('mk-hop');
      return true;
    }
    if ((b = t.closest('[data-sn-info]'))) { const x = finds[+b.getAttribute('data-sn-info')]; if (x && env.showProduct) env.showProduct(x.src); return true; }
    if ((b = t.closest('[data-sn-more]'))) { shown = +b.getAttribute('data-sn-more') || 0; return 'paint'; }
    if ((b = t.closest('[data-sn-order]'))) { const id = b.getAttribute('data-sn-order'); open = open === id ? '' : id; return 'paint'; }
    if ((b = t.closest('[data-sn="scan"]'))) { if (env.scan) env.scan(); return true; }
    return false;
  }
  W.LowiSnackShelf = { headHTML, html, click, refresh, name: () => C.NAME[lang()], count: () => build().length + (Z() ? Z().orderItems().length : 0), reset: () => { shown = 0; open = ''; } };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
