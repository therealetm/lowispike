/* LOWiSPIKE game supermarket (browser). 11 Nov 2026 (Emmanuel): Supermarket as a small game with four stations:
 *   shelves (only what passes) -> basket (the shopping list, with prices where known) -> fridge (the Kitchen) -> table and plate
 *   (lay out what you want to cook; air fryer, oven or pan changes the plate and the recipes that fit).
 * store-picks.js draws the frame (tabs, shop row, close) and calls LowiMarket.mount(root, env) inside it; "Plain list" hands
 * back to its old list. Rules and words: market-game-core.js. No XP, no sound, no companion speech; nothing is invented:
 * products, label values and prices come from the same sources the list uses. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiMarket) return;
  const C = W.LowiMarketCore; if (!C) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* private mode */ } };

  let root = null, env = null, st = 'shelf', aisle = '', shown = {}, items = [], msg = '';
  const lang = () => (env && env.lang ? env.lang() : 'en');
  const w = k => C.word(k, lang());
  const mode = () => C.mode(get(C.MODE_KEY));
  const setMode = m => put(C.MODE_KEY, C.mode(m));
  const table = () => C.table(get(C.TABLE_KEY));
  const saveTable = t => put(C.TABLE_KEY, t);
  const picOf = n => C.picOf(get(C.PICS_KEY), n);

  const IC = {
    shelf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3v18M20 3v18M4 9h16M4 15h16M4 21h16"/><path d="M7.5 9V6.2h3V9M13 9V5h3.5v4M8 15v-3h4v3M14.5 15v-2.4h2.5V15"/></svg>',
    basket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18l-1.6 9.2a1 1 0 0 1-1 .8H5.6a1 1 0 0 1-1-.8z"/><path d="M8 10l3-6M16 10l-3-6M9 14v3M12 14v3M15 14v3"/></svg>',
    fridge: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.2"/><path d="M6 9.5h12M9 5.5v2M9 12.5v3.5"/></svg>',
    table: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.2"/><circle cx="12" cy="12" r="3"/><path d="M3 5v14M21 5v6a2 2 0 0 1-2 2M21 13v6"/></svg>',
    airfryer: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="4"/><path d="M5 12h14M9.5 16.5h5"/><circle cx="12" cy="7.5" r="1.6"/></svg>',
    oven: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M3.5 8.5h17M7 6h.01M10 6h.01"/><rect x="7" y="11.5" width="10" height="6" rx="1"/></svg>',
    pan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 11h13a6.5 6.5 0 0 1-13 0z"/><path d="M15.5 11l6-2.2"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>'
  };

  /* ---------- data from the frame ---------- */
  const groups = () => { try { return (env.groups() || []).filter(g => g && g.pass && g.pass.length); } catch (e) { return []; } };
  const lines = () => { try { return env.cartLines() || []; } catch (e) { return []; } };
  const cartN = () => lines().reduce((a, l) => a + (l.q || 1), 0);
  const kit = () => { try { return env.kit() || { items: [] }; } catch (e) { return { items: [] }; } };
  const kitItems = () => { try { return env.K.view(kit()); } catch (e) { return []; } };
  const inCart = name => { const k = C.norm(name); const l = lines().find(x => C.norm(x.n) === k); return l ? l.q || 1 : 0; };
  const fname = n => { let v = n; try { v = env.foodName ? env.foodName(n) : n; } catch (e) { v = n; } return C.shortName(v); };

  function img(src, cls) { return src ? '<img class="' + (cls || '') + '" src="' + esc(src) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">' : ''; }
  const letter = n => esc((String(n || '?').trim()[0] || '?').toUpperCase());

  /* ---------- the four stations ---------- */
  function dock() {
    const t = table(), n = { shelf: 0, basket: cartN(), fridge: kitItems().length, table: t.ids.length };
    return '<nav class="mk-dock" aria-label="' + esc(w('stations')) + '">' + C.STATIONS.map(s =>
      '<button type="button" class="mk-stn' + (st === s ? ' on' : '') + '" data-mk-st="' + s + '"' + (st === s ? ' aria-current="step"' : '') + '>' + IC[s] + '<b>' + esc(w(s)) + '</b>' +
      '<i class="mk-cnt" data-mk-cnt="' + s + '"' + (n[s] ? '' : ' hidden') + '>' + n[s] + '</i></button>').join('') + '</nav>';
  }

  function shelfHTML() {
    const gs = groups(); items = [];
    if (!gs.length) return '<p class="mk-none">' + esc(w('onlyOk')) + '</p>';
    if (!gs.some(g => g.id === aisle)) aisle = gs[0].id;
    const g = gs.find(x => x.id === aisle), meta = env.groupMeta(g.id) || { ic: '', name: g.id };
    const page = C.shelfItems(g, shown[g.id]);
    const packs = page.items.map(it => {
      const i = items.push(it) - 1, p = it.p, n = inCart(p.n), src = env.photo(p);
      return '<div class="mk-prod"><button type="button" class="mk-pack" data-mk-add="' + i + '" aria-label="' + esc(p.n + (p.b ? ', ' + p.b : '') + (n ? ', ' + n + ' ' + w('inBasket') : '')) + '">' +
        '<span class="mk-ph"><span class="mk-emo" aria-hidden="true">' + esc(meta.ic) + '</span>' + img(src) + '</span>' +
        '<b>' + esc(p.n) + '</b><small>' + esc([p.b, p.q].filter(Boolean).join(' · ')) + '</small>' +
        '<i class="mk-n" data-mk-n="' + i + '"' + (n ? '' : ' hidden') + '>' + n + '</i></button>' +
        '<button type="button" class="mk-i" data-mk-info="' + i + '" aria-label="' + esc(w('info') + ': ' + p.n) + '"></button></div>';
    });
    let boards = '';
    for (let i = 0; i < packs.length; i += 3) boards += '<div class="mk-board">' + packs.slice(i, i + 3).join('') + '</div>';
    return '<div class="mk-top">' + (env.storeRowHTML ? env.storeRowHTML() : '') +
      '<button type="button" class="mk-listbtn" data-mk="list" aria-label="' + esc(w('list') + '. ' + w('listSub')) + '">' + IC.list + '<span>' + esc(w('list')) + '</span></button></div>' +
      '<div class="mk-aisles" role="tablist" aria-label="' + esc(w('aisle')) + '">' + gs.map(x => { const m = env.groupMeta(x.id) || { ic: '', name: x.id };
        return '<button type="button" role="tab" class="mk-aisle' + (x.id === aisle ? ' on' : '') + '" aria-selected="' + (x.id === aisle) + '" data-mk-aisle="' + esc(x.id) + '"><span aria-hidden="true">' + esc(m.ic) + '</span>' + esc(m.short || m.name) + '</button>'; }).join('') + '</div>' +
      '<div class="mk-scroll mk-rack"><h4 class="mk-sign"><span aria-hidden="true">' + esc(meta.ic) + '</span>' + esc(meta.name) + '</h4>' +
      (cartN() ? '' : '<p class="mk-hint">' + esc(w('tapAdd')) + '</p>') + boards +
      (page.left ? '<button type="button" class="mk-more" data-mk-more="' + page.next + '">' + esc(w('moreShelf')) + ' ›</button>' : '') +
      '<p class="mk-fine">' + esc(w('onlyOk')) + '</p></div>';
  }

  function priceOf(l) { return l.p != null ? env.money(l.p * (l.q || 1)) : l.pe != null ? '≈ ' + env.money(l.pe * (l.q || 1)) : w('noPrice'); }
  function basketHTML() {
    const ls = lines();
    if (!ls.length) return '<div class="mk-scroll"><div class="mk-empty">' + IC.basket + '<p>' + esc(w('basketEmpty')) + '</p><button type="button" class="mk-go" data-mk-st="shelf">' + esc(w('toShelf')) + '</button></div></div>';
    let tot = { sum: 0, priced: 0, all: 0 }; try { tot = env.cartTotal(); } catch (e) { /* no total */ }
    return '<div class="mk-scroll"><ul class="mk-lines">' + ls.map(l => {
      const src = l.photo || picOf(l.n);
      return '<li class="mk-line"><span class="mk-ph sm"><span class="mk-emo" aria-hidden="true">' + (l.e ? esc(l.e) : letter(l.n)) + '</span>' + img(src) + '</span>' +
        '<span class="mk-lt"><b>' + esc(fname(l.n)) + '</b><small>' + esc(priceOf(l)) + '</small></span>' +
        '<span class="mk-q" role="group" aria-label="' + esc(fname(l.n)) + '"><button type="button" class="mk-step" data-mk-q="' + esc(l.id) + '" data-d="-1" aria-label="' + esc(w('less') + ': ' + fname(l.n)) + '">−</button><b aria-live="polite">' + (l.q || 1) + '</b>' +
        '<button type="button" class="mk-step" data-mk-q="' + esc(l.id) + '" data-d="1" aria-label="' + esc(w('more') + ': ' + fname(l.n)) + '">+</button></span></li>'; }).join('') + '</ul>' +
      (tot.priced ? '<p class="mk-total"><span>' + esc(w('total')) + '</span><b>' + esc(env.money(tot.sum)) + '</b></p>' : '') +
      '<p class="mk-fine">' + esc(w('priceNote')) + '</p></div>' +
      '<div class="mk-acts"><button type="button" class="mk-go" data-mk="bought">' + IC.fridge + '<span>' + esc(w('bought')) + '</span></button>' +
      (env.giftReady && env.giftReady() ? '<button type="button" class="mk-go mk-alt" data-mk="gift">' + esc(w('otherPays')) + '</button>' : '') + '</div>';
  }

  function fridgeHTML() {
    const its = kitItems(), t = table();
    const form = '<form class="mk-have" data-mk-form="have"><input type="text" maxlength="60" autocomplete="off" enterkeyhint="done" aria-label="' + esc(w('have')) + '" placeholder="' + esc(w('have')) + '"><button type="submit" class="mk-add">' + esc(w('add')) + '</button></form>';
    if (!its.length) return '<div class="mk-scroll"><div class="mk-empty">' + IC.fridge + '<p>' + esc(w('fridgeEmpty')) + '</p><button type="button" class="mk-go" data-mk-st="shelf">' + esc(w('toShelf')) + '</button></div>' + form + '</div>';
    const tiles = its.map(it => {
      const on = t.ids.indexOf(it.id) >= 0, src = (it.p && it.p.img) || picOf(it.n);
      return '<div class="mk-prod"><button type="button" class="mk-pack mk-cold' + (on ? ' on' : '') + '" data-mk-lay="' + esc(it.id) + '" aria-pressed="' + on + '" aria-label="' + esc(fname(it.n) + (on ? ', ' + w('onTable') : '')) + '">' +
        '<span class="mk-ph"><span class="mk-emo" aria-hidden="true">' + letter(it.n) + '</span>' + img(src) + '</span><b>' + esc(fname(it.n)) + '</b>' +
        '<i class="mk-n mk-ok"' + (on ? '' : ' hidden') + '>✓</i></button>' +
        '<button type="button" class="mk-i mk-out" data-mk-used="' + esc(it.id) + '" aria-label="' + esc(w('usedUp') + ': ' + fname(it.n)) + '"></button></div>'; });
    let boards = '';
    for (let i = 0; i < tiles.length; i += 3) boards += '<div class="mk-board mk-glass">' + tiles.slice(i, i + 3).join('') + '</div>';
    return '<div class="mk-scroll mk-fridge"><p class="mk-hint">' + esc(w('fridgeHint')) + '</p>' + boards + form + '</div>' +
      (t.ids.length ? '<div class="mk-acts"><button type="button" class="mk-go" data-mk-st="table">' + IC.table + '<span>' + esc(w('table')) + ' · ' + t.ids.length + '</span></button></div>' : '');
  }

  let recCache = null;
  function recipes() {
    if (recCache) return recCache;
    let book = []; try { book = typeof RECIPE_BOOK !== 'undefined' ? RECIPE_BOOK : []; } catch (e) { book = []; } // eslint-disable-line no-undef
    const FN = W.LowiFoodNames, tr = s => { try { return W.LowiLang && W.LowiLang.t ? W.LowiLang.t(s) || s : s; } catch (e) { return s; } };
    recCache = book.filter(r => r && r.r === 'ja' && r.n && Array.isArray(r.ing)).map(r => {
      const words = [];
      r.ing.forEach(x => { const n = x && typeof x === 'object' ? String(x.n || '') : String(x).split('|').pop(); if (!n) return; words.push(n); if (FN && FN.name) C.LANGS.forEach(l => { try { words.push(FN.name(n, l)); } catch (e) { /* no name */ } }); });
      return { id: r.id || C.recipeId(r.n), n: r.n, get name() { return tr(r.n); }, words, make: (r.make || []).join(' ') };
    }).filter(r => { try { return !W.LowiP2 || !W.LowiP2.rec || !!W.LowiP2.rec(r.id); } catch (e) { return false; } });
    return recCache;
  }
  function tableHTML() {
    const k = kitItems(); let t = C.prune(table(), k.map(i => i.id));
    if (t.ids.length !== table().ids.length) saveTable(t);
    const laid = t.ids.map(id => k.find(i => i.id === id)).filter(Boolean);
    if (!laid.length) return '<div class="mk-scroll"><div class="mk-empty">' + IC.table + '<p>' + esc(w('tableEmpty')) + '</p><button type="button" class="mk-go" data-mk-st="fridge">' + esc(w('toFridge')) + '</button></div></div>';
    const pl = C.plate(t, laid.map(i => fname(i.n)), lang()), n = Math.min(laid.length, C.PLATE_MAX);
    const discs = laid.slice(0, n).map((it, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, r = n === 1 ? 0 : n === 2 ? 20 : 25, x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r, src = (it.p && it.p.img) || picOf(it.n);
      return '<span class="mk-disc" style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%"><span class="mk-emo">' + letter(it.n) + '</span>' + img(src) + '</span>'; }).join('');
    const fit = C.fits(laid.map(i => i.n).concat(laid.map(i => fname(i.n))), recipes(), t.dev, 3);
    return '<div class="mk-scroll mk-tbl">' +
      '<div class="mk-plate' + (t.dev ? ' dev-' + t.dev : '') + '" role="img" aria-label="' + esc(w('plate') + ': ' + pl.title + '. ' + pl.foods.join(', ')) + '"><span class="mk-steam" aria-hidden="true"><i></i><i></i><i></i></span><span class="mk-rim"></span>' + discs + '</div>' +
      '<p class="mk-cap" aria-live="polite"><b>' + esc(pl.title) + '</b><span>' + esc(pl.foods.join(' · ')) + '</span></p>' +
      '<p class="mk-q4">' + esc(w('how')) + '</p><div class="mk-devs" role="group" aria-label="' + esc(w('how')) + '">' + C.DEVICES.map(d =>
        '<button type="button" class="mk-dev' + (t.dev === d ? ' on' : '') + '" data-mk-dev="' + d + '" aria-pressed="' + (t.dev === d) + '">' + IC[d] + '<b>' + esc(w(d)) + '</b></button>').join('') + '</div>' +
      '<div class="mk-laid">' + laid.map(it => '<button type="button" class="mk-chip" data-mk-lay="' + esc(it.id) + '" aria-label="' + esc(w('takeOff') + ': ' + fname(it.n)) + '">' + esc(fname(it.n)) + ' <span aria-hidden="true">×</span></button>').join('') + '</div>' +
      (fit.length ? '<p class="mk-q4">' + esc(w('fits')) + '</p><div class="mk-fits">' + fit.map(r => '<button type="button" class="mk-fit" data-mk-rec="' + esc(r.id) + '">' + esc(r.name) + ' ›</button>').join('') + '</div>' : '') +
      '<button type="button" class="mk-more" data-mk="clear">' + esc(w('clear')) + '</button></div>';
  }

  function paint(keep) {
    if (!root || !root.isConnected) return;
    const sc = root.querySelector('.mk-scroll'), top = keep && sc ? sc.scrollTop : 0;
    root.setAttribute('data-st', st);
    root.innerHTML = '<div class="mk-scene">' + (st === 'basket' ? basketHTML() : st === 'fridge' ? fridgeHTML() : st === 'table' ? tableHTML() : shelfHTML()) +
      (msg ? '<p class="mk-msg" role="status">' + esc(msg) + '</p>' : '') + '</div>' + dock();
    msg = '';
    const sc2 = root.querySelector('.mk-scroll'); if (sc2 && top) sc2.scrollTop = top;
  }
  function counts() {
    if (!root) return;
    const t = table(), n = { basket: cartN(), fridge: kitItems().length, table: t.ids.length };
    Object.keys(n).forEach(s => { const el = root.querySelector('[data-mk-cnt="' + s + '"]'); if (el) { el.textContent = n[s]; el.hidden = !n[s]; } });
  }
  function bump(sel) { const el = root && root.querySelector(sel); if (!el) return; el.classList.remove('mk-bump'); void el.offsetWidth; el.classList.add('mk-bump'); }
  function go(s) { st = C.station(s); paint(); const on = root && root.querySelector('.mk-stn.on'); if (on) try { on.focus({ preventScroll: true }); } catch (e) { /* no focus */ } }

  function click(e) {
    const t = e.target, q = sel => (t.closest ? t.closest(sel) : null);
    let b;
    if ((b = q('[data-mk-st]'))) { e.stopPropagation(); return go(b.getAttribute('data-mk-st')); }
    if ((b = q('[data-mk-aisle]'))) { e.stopPropagation(); aisle = b.getAttribute('data-mk-aisle'); return paint(); }
    if ((b = q('[data-mk-more]'))) { e.stopPropagation(); shown[aisle] = +b.getAttribute('data-mk-more') || 0; return paint(true); }
    if ((b = q('[data-mk-info]'))) { e.stopPropagation(); const it = items[+b.getAttribute('data-mk-info')]; if (it && env.openInfo) env.openInfo(it); return; }
    if ((b = q('[data-mk-add]'))) {
      e.stopPropagation(); const i = +b.getAttribute('data-mk-add'), it = items[i]; if (!it) return;
      const src = env.photo(it.p); if (src) put(C.PICS_KEY, C.remember(get(C.PICS_KEY), it.p.n, src));
      const l = lines().find(x => C.norm(x.n) === C.norm(it.p.n));
      try { if (l) env.cartSetQty(l.id, (l.q || 1) + 1); else env.cartAdd(it.p.n); } catch (x) { /* list not ready */ }
      const n = inCart(it.p.n), badge = root.querySelector('[data-mk-n="' + i + '"]');
      if (badge) { badge.textContent = n; badge.hidden = !n; }
      b.classList.remove('mk-hop'); void b.offsetWidth; b.classList.add('mk-hop');
      const h = root.querySelector('.mk-hint'); if (h) h.remove();
      counts(); bump('[data-mk-st="basket"]'); return;
    }
    if ((b = q('[data-mk-q]'))) {
      e.stopPropagation(); const id = b.getAttribute('data-mk-q'), l = lines().find(x => x.id === id); if (!l) return paint(true);
      try { env.cartSetQty(id, (l.q || 1) + (+b.getAttribute('data-d') || 0)); } catch (x) { /* list not ready */ }
      return paint(true);
    }
    if ((b = q('[data-mk-lay]'))) {
      e.stopPropagation(); const r = C.toggle(table(), b.getAttribute('data-mk-lay'));
      if (r.full) { msg = w('full'); return paint(true); }
      saveTable(r.table);
      if (st === 'fridge') { paint(true); bump('[data-mk-st="table"]'); } else paint(true);
      return;
    }
    if ((b = q('[data-mk-used]'))) {
      e.stopPropagation(); try { const r = env.K.drop(kit(), b.getAttribute('data-mk-used')); env.kitSave(r.state); saveTable(C.prune(table(), r.state.items.map(i => i.id))); } catch (x) { /* nothing to drop */ }
      return paint(true);
    }
    if ((b = q('[data-mk-dev]'))) { e.stopPropagation(); saveTable(C.setDevice(table(), b.getAttribute('data-mk-dev'))); return paint(true); }
    if ((b = q('[data-mk-rec]'))) { e.stopPropagation(); const id = b.getAttribute('data-mk-rec'); if (env.openRecipe) env.openRecipe(id); return; }
    if ((b = q('[data-mk]'))) {
      e.stopPropagation(); const a = b.getAttribute('data-mk');
      if (a === 'list') { setMode('list'); if (env.repaint) env.repaint(); return; }
      if (a === 'clear') { saveTable(C.clear()); return paint(); }
      if (a === 'gift') { if (env.giftFromCart) env.giftFromCart(); return; }
      if (a === 'bought') {
        let k = kit(); const now = Date.now();
        lines().forEach((l, i) => { try { const n = env.K.fromCartName(l.n), src = l.photo || picOf(l.n); k = env.K.addProduct(k, src ? { n, img: src } : { n }, now + i, 'cart').state; env.cartDrop(l.id); } catch (x) { /* keep the line */ } });
        try { env.kitSave(k); } catch (x) { /* not saved */ }
        return go('fridge');
      }
    }
  }
  function submit(e) {
    const f = e.target && e.target.closest ? e.target.closest('[data-mk-form="have"]') : null; if (!f) return;
    e.preventDefault(); e.stopPropagation();
    const i = f.querySelector('input'), v = String(i && i.value || '').trim(); if (!v) return;
    try { env.kitSave(env.K.addProduct(kit(), { n: v }, Date.now(), 'me').state); } catch (x) { /* not saved */ }
    paint(true);
  }

  function mount(el, e) {
    if (!el || !e) return false;
    root = el; env = e; recCache = null;
    root.classList.add('mk'); root.setAttribute('data-noi18n', '');
    root.addEventListener('click', click);
    root.addEventListener('submit', submit);
    paint();
    return true;
  }
  W.LowiMarket = { mount, mode, setMode, go, station: () => st, repaint: () => paint(true) };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
