/* LOWiSPIKE Grocery Run (24 Nov 2026, Emmanuel: "I absolutely hate our supermarket ... Nuke it completely. And redesign ... someone had
   like a shuffle, and that shuffle would pick a budget, and then you would use that budget to then fake grocery shop. I actually want that
   game interface ... When people click on supermarket, a game, not an interface ... like those cooking games that are going viral ...
   gamified, but also apply to reality ... a digital grocery session, so that when I'm about to go grocery shopping, I already have
   everything in my digital basket").
   The cart bubble on Home opens this game instead of the old Supermarket / Snack shelf / Baskets panel (home-blooms-v2.js).
     1. Start: spin a budget (a slot reel) or type your own, pick the shop.
     2. Shop: aisles of real products of that chain (data/shop/<chain>.json, rated by store-picks-core.js), a budget bar that drains,
        three missions (stay in budget, mostly insulin-friendly, veggies + protein). Tap a product: it flies into the cart.
     3. Checkout: the receipt prints, the stars and the score count up.
     4. "Take it to the shop": the same cart as a real shopping list to tick off in the shop. Kept on this phone (lowi.grun.v1).
   Prices: the product data has none (Open Food Facts), so every price is an estimate from the aisle, the pack size and the chain, always
   shown with "≈" and said once on the start screen. Nothing is sent anywhere; no XP (a game, not a care action). */
(function (W, D) {
  'use strict';
  if (W && W.LowiGroceryRun) return;
  const KEY = 'lowi.grun.v1', BEST = 'lowi.grun.best';
  const li = () => { let l = ''; try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || D.documentElement.lang || 'en'; } catch (e) { l = 'en'; } l = String(l).slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
  const S = {
    title: ['Grocery Run', 'Einkaufs-Run', 'Carrera del súper'], sub: ['Fill your cart. Stay in budget. Eat smart.', 'Füll deinen Wagen. Bleib im Budget. Iss schlau.', 'Llena tu carrito. Respeta el presupuesto. Come bien.'],
    spin: ['Spin a budget', 'Budget drehen', 'Gira un presupuesto'], own: ['My own budget', 'Mein eigenes Budget', 'Mi propio presupuesto'], go: ['Start shopping', 'Los geht’s', 'A comprar'],
    shop: ['Shop', 'Laden', 'Tienda'], est: ['Prices are estimates (≈), not the shop’s real prices.', 'Preise sind Schätzungen (≈), nicht die echten Preise im Laden.', 'Los precios son estimaciones (≈), no los reales de la tienda.'],
    budget: ['Your budget', 'Dein Budget', 'Tu presupuesto'], left: ['left', 'übrig', 'quedan'], over: ['over budget!', 'über Budget!', '¡te pasaste!'],
    m1: ['Stay in budget', 'Im Budget bleiben', 'Dentro del presupuesto'], m2: ['80% insulin-friendly', '80 % insulinfreundlich', '80 % apto para la insulina'], m3: ['Veggies + protein', 'Gemüse + Eiweiß', 'Verdura + proteína'],
    best: ['Best', 'Top', 'Top'], good: ['Good', 'Gut', 'Bien'], spike: ['Spike', 'Spike', 'Pico'], loading: ['Filling the shelves…', 'Regale werden aufgefüllt…', 'Llenando las estanterías…'],
    noData: ['Could not load this shop. Check your connection.', 'Dieser Laden lädt gerade nicht. Prüf deine Verbindung.', 'No se pudo cargar esta tienda. Revisa tu conexión.'],
    checkout: ['Checkout', 'Zur Kasse', 'Pagar'], cart: ['Cart', 'Wagen', 'Carrito'], empty: ['Your cart is empty. Tap a product to add it.', 'Dein Wagen ist leer. Tipp auf ein Produkt.', 'Tu carrito está vacío. Toca un producto.'],
    total: ['Total', 'Summe', 'Total'], score: ['Score', 'Punkte', 'Puntos'], record: ['New record!', 'Neuer Rekord!', '¡Nuevo récord!'],
    toShop: ['Take this list to the shop', 'Liste mit in den Laden nehmen', 'Llevar esta lista a la tienda'], again: ['Play again', 'Nochmal spielen', 'Jugar otra vez'], back: ['Back to shopping', 'Weiter einkaufen', 'Seguir comprando'],
    list: ['Shopping list', 'Einkaufsliste', 'Lista de la compra'], listSub: ['Tick things off while you shop.', 'Hak ab, was du im Laden einpackst.', 'Marca lo que vas metiendo en la tienda.'],
    yourList: ['Your shopping list', 'Deine Einkaufsliste', 'Tu lista de la compra'], open: ['Open', 'Öffnen', 'Abrir'], done: ['Done shopping', 'Fertig eingekauft', 'Compra terminada'],
    got: ['in the cart', 'im Wagen', 'en el carrito'], close: ['Close', 'Schließen', 'Cerrar'], items: ['items', 'Teile', 'productos'], ok: ['OK', 'OK', 'OK'],
    ownPh: ['e.g. 40', 'z. B. 40', 'p. ej. 40'], ownQ: ['How much do you want to spend?', 'Wie viel willst du ausgeben?', '¿Cuánto quieres gastar?'], sound: ['Sound', 'Ton', 'Sonido'],
    star1: ['In budget', 'Im Budget', 'En presupuesto'], star2: ['Insulin-smart', 'Insulin-schlau', 'Listo para la insulina'], star3: ['Balanced', 'Ausgewogen', 'Equilibrado']
  };
  const t = k => S[k][li()];
  const AISLE = ['veg', 'fruit', 'meat', 'fish', 'dairy', 'cheese', 'bread', 'snacks', 'pantry', 'drinks', 'sweets', 'meals'];
  const SHOPS = [['lidl', 'Lidl'], ['aldi', 'Aldi'], ['rewe', 'Rewe'], ['edeka', 'Edeka'], ['penny', 'Penny'], ['kaufland', 'Kaufland'], ['netto', 'Netto']];
  const REEL = [15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100];
  /* ---------- pure: price estimates ---------- */
  const PER_KG = { veg: 2.6, fruit: 3.2, meat: 11, fish: 16, dairy: 2.4, cheese: 11, bread: 3.8, snacks: 13, pantry: 5.5, drinks: 1.1, sweets: 9, meals: 7.5, other: 6 };
  const PACK = { veg: 1.49, fruit: 1.99, meat: 3.99, fish: 3.79, dairy: 1.19, cheese: 2.29, bread: 1.49, snacks: 2.49, pantry: 1.99, drinks: 0.99, sweets: 1.79, meals: 2.99, other: 1.99 };
  const CHAIN = { lidl: 1, aldi: 1, penny: 1, netto: 1, kaufland: 1.05, famila: 1.1, rewe: 1.18, edeka: 1.2, salling: 1.25 };
  function kgOf(q) {
    const s = String(q || '').toLowerCase().replace(',', '.'); let n = 1, v, u, m = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|l|ml|cl)\b/.exec(s);
    if (m) { n = +m[1]; v = +m[2]; u = m[3]; } else { m = /(\d+(?:\.\d+)?)\s*(kg|g|l|ml|cl)\b/.exec(s); if (!m) return 0; v = +m[1]; u = m[2]; }
    const kg = (u === 'kg' || u === 'l' ? v : u === 'cl' ? v / 100 : v / 1000) * n; return kg > 0 && kg < 10 ? kg : 0;
  }
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
  function price(p, aisle, chain) {
    const kg = kgOf(p.q), base = kg ? (PER_KG[aisle] || 6) * kg : (PACK[aisle] || 1.99);
    let v = base * (CHAIN[chain] || 1) * (0.88 + hash(p.g || p.n) * 0.24);
    v = Math.max(0.39, Math.min(24.99, v));
    return Math.max(0.39, Math.floor(v) + (v % 1 < 0.5 ? 0.49 : 0.99));
  }
  /* ---------- pure: the run ---------- */
  function totals(cart) {
    let sum = 0, n = 0, good = 0; const aisles = {};
    (cart || []).forEach(c => { sum += c.price * c.qty; n += c.qty; if (c.ok) good += c.qty; aisles[c.aisle] = 1; });
    return { sum: Math.round(sum * 100) / 100, n, good, share: n ? good / n : 0, aisles };
  }
  function missions(cart, budget) {
    const T = totals(cart), a = T.aisles;
    return [T.n > 0 && T.sum <= budget, T.n > 0 && T.share >= 0.8, !!((a.veg || a.fruit) && (a.meat || a.fish || a.dairy || a.cheese) && T.n >= 4)];
  }
  function score(cart, budget) {
    const T = totals(cart); let pts = 0;
    (cart || []).forEach(c => { pts += (c.best ? 30 : c.ok ? 20 : -10) * c.qty; });
    if (T.n && T.sum <= budget) pts += Math.round((budget - T.sum) * 5);
    return Math.max(0, pts);
  }
  const core = { kgOf, price, totals, missions, score, REEL, PER_KG };
  if (typeof module === 'object' && module.exports) { module.exports = core; }
  if (!W || !D || !D.createElement) return;

  /* ---------- state ---------- */
  let st = load(), el = null, view = 'start', aisle = 'veg', shelves = null, loadingFor = '', mute = false;
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') return { shop: s.shop || 'lidl', budget: +s.budget || 0, cart: Array.isArray(s.cart) ? s.cart : [], list: Array.isArray(s.list) ? s.list : [], got: s.got || {} }; } catch (e) { } return { shop: 'lidl', budget: 0, cart: [], list: [], got: {} }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const eur = v => '€' + (Math.round(v * 100) / 100).toFixed(2).replace('.', li() ? ',' : '.');
  const C = () => W.LowiStorePicksCore;
  const reduce = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  /* ---------- sound: tiny WebAudio blips ---------- */
  let ac = null;
  function blip(f, d, type, vol) { if (mute) return; try { ac = ac || new (W.AudioContext || W.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.value = vol || 0.05; g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + (d || 0.12)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (d || 0.12)); } catch (e) { } }
  const coin = () => { blip(988, 0.08, 'square', 0.03); setTimeout(() => blip(1319, 0.14, 'square', 0.03), 70); };
  const buzz = n => { try { if (navigator.vibrate) navigator.vibrate(n || 8); } catch (e) { } };
  /* ---------- shelves ---------- */
  const CACHE = {};
  function shelvesFor(shop) {
    if (CACHE[shop]) return Promise.resolve(CACHE[shop]);
    return fetch('data/shop/' + shop + '.json').then(r => { if (!r.ok) throw new Error('x'); return r.json(); }).then(data => {
      const b = C().build(data), out = {};
      b.groups.forEach(g => {
        if (AISLE.indexOf(g.id) < 0) return;
        const pass = g.pass.slice(0, 18), fail = g.fail.slice(0, 6), mix = [];
        pass.forEach((x, i) => { mix.push(x); if (i % 3 === 2 && fail.length) mix.push(fail.shift()); });
        out[g.id] = mix.concat(fail).map(x => ({ id: String(x.p.g || x.p.n), n: x.p.n, b: x.p.b || '', q: x.p.q || '', im: C().photo(x.p) || '', best: !!x.r.best, ok: !!x.r.pass, aisle: g.id, price: price(x.p, g.id, shop) }));
      });
      CACHE[shop] = out; return out;
    });
  }
  const aisleInfo = id => { const g = (C() && C().GROUPS || []).find(x => x.id === id) || {}; return { ic: g.ic || '🛒', n: g[['en', 'de', 'es'][li()]] || id }; };
  /* ---------- render ---------- */
  function root() {
    if (el) return el;
    el = D.createElement('div'); el.id = 'grun'; el.className = 'gr'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('data-noi18n', '');
    el.addEventListener('click', onClick); el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'grOwn') { e.preventDefault(); setOwn(); } });
    D.body.appendChild(el); return el;
  }
  function hud() {
    const T = totals(st.cart), left = st.budget - T.sum, pct = st.budget ? Math.max(0, Math.min(100, left / st.budget * 100)) : 0;
    return '<div class="gr-hud"><button class="gr-x" data-gr="close" aria-label="' + esc(t('close')) + '">✕</button>' +
      '<div class="gr-bud' + (left < 0 ? ' neg' : '') + '"><div class="gr-budt"><b>🪙 ' + esc(eur(Math.abs(left))) + '</b><span>' + esc(left < 0 ? t('over') : t('left')) + '</span></div><div class="gr-bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<button class="gr-cartb" data-gr="cart" aria-label="' + esc(t('cart')) + '">🛒<em>' + T.n + '</em></button></div>';
  }
  function missionRow() {
    const m = missions(st.cart, st.budget);
    return '<div class="gr-mis">' + [['💰', 'm1'], ['🥦', 'm2'], ['🥗', 'm3']].map((x, i) => '<span class="' + (m[i] ? 'on' : '') + '">' + (m[i] ? '✓' : x[0]) + ' ' + esc(t(x[1])) + '</span>').join('') + '</div>';
  }
  function card(p) {
    const inC = (st.cart.find(c => c.id === p.id) || {}).qty || 0, tag = p.best ? 'best' : p.ok ? 'good' : 'spike';
    return '<button class="gr-p' + (inC ? ' in' : '') + '" data-gr="add" data-id="' + esc(p.id) + '"><span class="gr-pi">' + (p.im ? '<img loading="lazy" alt="" src="' + esc(p.im) + '">' : '<i>' + aisleInfo(p.aisle).ic + '</i>') + (inC ? '<em>' + inC + '</em>' : '') + '</span>' +
      '<b>' + esc(p.n) + '</b><small>' + esc([p.b, p.q].filter(Boolean).join(' · ')) + '</small><span class="gr-pf"><span class="gr-t ' + tag + '">' + esc(t(tag)) + '</span><strong>≈ ' + esc(eur(p.price)) + '</strong></span></button>';
  }
  function paint() {
    const r = root(); r.className = 'gr gr-v-' + view + (r.dataset.in ? ' in' : '');
    if (view === 'start') {
      const L = totals(st.list);
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="close" aria-label="' + esc(t('close')) + '">✕</button><span></span><button class="gr-snd" data-gr="mute" aria-label="' + esc(t('sound')) + '">' + (mute ? '🔇' : '🔊') + '</button></div>' +
        '<div class="gr-title"><div class="gr-logo">🛒</div><h1>' + esc(t('title')) + '</h1><p>' + esc(t('sub')) + '</p></div>' +
        (st.list.length ? '<button class="gr-listcard" data-gr="list"><b>📝 ' + esc(t('yourList')) + '</b><span>' + L.n + ' ' + esc(t('items')) + ' · ≈ ' + esc(eur(L.sum)) + '</span><i>' + esc(t('open')) + ' ›</i></button>' : '') +
        '<div class="gr-shops" role="group" aria-label="' + esc(t('shop')) + '">' + SHOPS.map(s => '<button class="' + (st.shop === s[0] ? 'on' : '') + '" data-gr="shopc" data-s="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>' +
        '<button class="gr-big gr-spinb" data-gr="spin">🎰 ' + esc(t('spin')) + '</button>' +
        '<div class="gr-own"><input id="grOwn" inputmode="decimal" placeholder="' + esc(t('ownPh')) + '" aria-label="' + esc(t('own')) + '"><button class="gr-mid" data-gr="own">€ ' + esc(t('own')) + '</button></div>' +
        '<p class="gr-note">' + esc(t('est')) + '</p>';
    } else if (view === 'spin') {
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="close" aria-label="' + esc(t('close')) + '">✕</button><span></span><span></span></div>' +
        '<div class="gr-spinbox"><p>' + esc(t('budget')) + '</p><div class="gr-reel"><div class="gr-strip">' + strip() + '</div></div><button class="gr-big" data-gr="startshop" hidden>' + esc(t('go')) + ' ›</button></div>';
      runReel();
    } else if (view === 'shop') {
      const sh = shelves && shelves[aisle] || [];
      r.innerHTML = hud() + missionRow() + '<div class="gr-aisles" role="tablist">' + AISLE.filter(a => shelves && shelves[a] && shelves[a].length).map(a => '<button role="tab" aria-selected="' + (a === aisle) + '" class="' + (a === aisle ? 'on' : '') + '" data-gr="aisle" data-a="' + a + '"><span>' + aisleInfo(a).ic + '</span>' + esc(aisleInfo(a).n.split(/[ ,&]/)[0]) + '</button>').join('') + '</div>' +
        (shelves ? '<div class="gr-grid">' + sh.map(card).join('') + '</div>' : '<div class="gr-load"><div class="gr-logo spin">🛒</div><p>' + esc(loadingFor === 'err' ? t('noData') : t('loading')) + '</p></div>') +
        '<div class="gr-foot"><button class="gr-big" data-gr="checkout"' + (st.cart.length ? '' : ' disabled') + '>🧾 ' + esc(t('checkout')) + ' · ' + esc(eur(totals(st.cart).sum)) + '</button></div>';
      const g = r.querySelector('.gr-aisles .on'); if (g) g.scrollIntoView({ inline: 'center', block: 'nearest' });
    } else if (view === 'cart') {
      const T = totals(st.cart);
      r.innerHTML = hud() + '<h2 class="gr-h">' + esc(t('cart')) + '</h2>' + (st.cart.length ? '<div class="gr-rows">' + st.cart.map(c => '<div class="gr-row"><span class="gr-ri">' + (c.im ? '<img alt="" src="' + esc(c.im) + '">' : aisleInfo(c.aisle).ic) + '</span><div><b>' + esc(c.n) + '</b><small><span class="gr-t ' + (c.best ? 'best' : c.ok ? 'good' : 'spike') + '">' + esc(t(c.best ? 'best' : c.ok ? 'good' : 'spike')) + '</span> ≈ ' + esc(eur(c.price)) + '</small></div><div class="gr-q"><button data-gr="minus" data-id="' + esc(c.id) + '" aria-label="−">−</button><b>' + c.qty + '</b><button data-gr="plus" data-id="' + esc(c.id) + '" aria-label="+">+</button></div></div>').join('') + '</div>' : '<p class="gr-empty">' + esc(t('empty')) + '</p>') +
        '<div class="gr-foot"><button class="gr-mid" data-gr="toshop">‹ ' + esc(t('back')) + '</button><button class="gr-big" data-gr="checkout"' + (st.cart.length ? '' : ' disabled') + '>🧾 ' + esc(t('checkout')) + ' · ' + esc(eur(T.sum)) + '</button></div>';
    } else if (view === 'receipt') {
      const T = totals(st.cart), m = missions(st.cart, st.budget), sc = score(st.cart, st.budget); let rec = 0; try { rec = +localStorage.getItem(BEST) || 0; } catch (e) { }
      const isRec = sc > rec; if (isRec) { try { localStorage.setItem(BEST, String(sc)); } catch (e) { } }
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="close" aria-label="' + esc(t('close')) + '">✕</button><span></span><span></span></div>' +
        '<div class="gr-stars">' + m.map((on, i) => '<div class="gr-star' + (on ? ' on' : '') + '" style="--d:' + (0.5 + i * 0.35) + 's"><i>★</i><small>' + esc(t('star' + (i + 1))) + '</small></div>').join('') + '</div>' +
        '<div class="gr-score"><small>' + esc(t('score')) + '</small><b data-to="' + sc + '">0</b>' + (isRec ? '<em>' + esc(t('record')) + '</em>' : '') + '</div>' +
        '<div class="gr-receipt"><b class="gr-rh">' + esc((SHOPS.find(s => s[0] === st.shop) || ['', 'Shop'])[1]) + '</b>' + st.cart.map((c, i) => '<div class="gr-rl" style="--i:' + i + '"><span>' + c.qty + '× ' + esc(c.n) + '</span><span>≈ ' + esc(eur(c.price * c.qty)) + '</span></div>').join('') +
        '<div class="gr-rl gr-rt"><span>' + esc(t('total')) + '</span><span>≈ ' + esc(eur(T.sum)) + '</span></div><div class="gr-rl"><span>' + esc(t('budget')) + '</span><span>' + esc(eur(st.budget)) + '</span></div></div>' +
        '<div class="gr-foot gr-foot2"><button class="gr-big" data-gr="keep">📝 ' + esc(t('toShop')) + '</button><button class="gr-mid" data-gr="again">↻ ' + esc(t('again')) + '</button></div>';
      countUp(r.querySelector('.gr-score b')); m.forEach((on, i) => { if (on) setTimeout(() => blip(660 + i * 220, 0.18, 'triangle', 0.05), 500 + i * 350); });
    } else if (view === 'list') {
      const byA = {}; st.list.forEach(c => { (byA[c.aisle] = byA[c.aisle] || []).push(c); });
      const T = totals(st.list), gotSum = st.list.reduce((s, c) => s + (st.got[c.id] ? c.price * c.qty : 0), 0);
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="home" aria-label="' + esc(t('close')) + '">‹</button><b class="gr-ht">' + esc(t('list')) + '</b><span></span></div>' +
        '<p class="gr-lsub">' + esc(t('listSub')) + ' · ' + esc((SHOPS.find(s => s[0] === st.shop) || ['', ''])[1]) + '</p>' +
        '<div class="gr-lsum"><b>≈ ' + esc(eur(gotSum)) + '</b> ' + esc(t('got')) + ' · ≈ ' + esc(eur(T.sum)) + '</div>' +
        AISLE.filter(a => byA[a]).map(a => '<h3 class="gr-la">' + aisleInfo(a).ic + ' ' + esc(aisleInfo(a).n) + '</h3>' + byA[a].map(c => '<button class="gr-li' + (st.got[c.id] ? ' got' : '') + '" data-gr="tick" data-id="' + esc(c.id) + '"><i>' + (st.got[c.id] ? '✓' : '') + '</i><span>' + c.qty + '× ' + esc(c.n) + '</span><small>≈ ' + esc(eur(c.price * c.qty)) + '</small></button>').join('')).join('') +
        '<div class="gr-foot"><button class="gr-big" data-gr="donelist">✓ ' + esc(t('done')) + '</button></div>';
    }
  }
  function strip() { let h = ''; for (let k = 0; k < 6; k++) REEL.forEach(v => { h += '<div>' + esc(eur(v).replace(/[.,]00$/, '')) + '</div>'; }); return h; }
  function runReel() {
    const s = el.querySelector('.gr-strip'), btn = el.querySelector('[data-gr=startshop]'); if (!s) return;
    const pick = Math.floor(Math.random() * REEL.length), stopAt = 4 * REEL.length + pick, h = 84;
    st.budget = REEL[pick]; save();
    const dur = reduce() ? 300 : 2400;
    s.style.transition = 'none'; s.style.transform = 'translateY(0)';
    requestAnimationFrame(() => requestAnimationFrame(() => { s.style.transition = 'transform ' + dur + 'ms cubic-bezier(.12,.75,.2,1)'; s.style.transform = 'translateY(' + (-stopAt * h) + 'px)'; }));
    let n = 0; const tick = () => { if (n++ < 14 && view === 'spin') { blip(500 + n * 25, 0.03, 'square', 0.02); setTimeout(tick, 60 + n * 14); } }; tick();
    setTimeout(() => { if (view !== 'spin') return; coin(); buzz(25); el.querySelector('.gr-reel').classList.add('won'); btn.hidden = false; }, dur + 60);
  }
  function countUp(b) { if (!b) return; const to = +b.dataset.to, t0 = performance.now(), dur = reduce() ? 1 : 1200; const f = now => { const k = Math.min(1, (now - t0) / dur); b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
  function goShop() {
    view = 'shop'; paint();
    if (shelves && loadingFor === st.shop) return;
    shelves = null; loadingFor = st.shop; paint();
    const want = st.shop;
    shelvesFor(want).then(s => { if (st.shop !== want) return; shelves = s; if (!s[aisle] || !s[aisle].length) aisle = AISLE.find(a => s[a] && s[a].length) || 'veg'; if (view === 'shop') paint(); }, () => { loadingFor = 'err'; if (view === 'shop') paint(); });
  }
  function fly(fromEl) {
    if (reduce() || !fromEl) return; const cb = el.querySelector('.gr-cartb'); if (!cb) return;
    const a = fromEl.getBoundingClientRect(), b = cb.getBoundingClientRect(), img = fromEl.querySelector('img, i'); if (!img) return;
    const c = img.cloneNode(true); c.className = 'gr-fly'; c.style.left = a.left + 'px'; c.style.top = a.top + 'px'; c.style.width = a.width + 'px'; c.style.height = a.height + 'px'; el.appendChild(c);
    requestAnimationFrame(() => { c.style.transform = 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(.15)'; c.style.opacity = '.3'; });
    setTimeout(() => { c.remove(); cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop'); }, 560);
  }
  function add(id, from) {
    const p = shelves && Object.values(shelves).reduce((f, l) => f || l.find(x => x.id === id), null); if (!p) return;
    const c = st.cart.find(x => x.id === id); if (c) c.qty++; else st.cart.push(Object.assign({ qty: 1 }, p));
    save(); coin(); buzz(8);
    const before = el.querySelector('.gr-bud').classList.contains('neg');
    fly(from && from.querySelector('.gr-pi'));
    const keep = el.querySelector('.gr-grid') ? el.querySelector('.gr-grid').scrollTop : 0, y = el.scrollTop;
    paint(); el.scrollTop = y; const g = el.querySelector('.gr-grid'); if (g) g.scrollTop = keep;
    const fl = D.createElement('span'); fl.className = 'gr-minus'; fl.textContent = '−' + eur(p.price); el.querySelector('.gr-bud').appendChild(fl); setTimeout(() => fl.remove(), 900);
    if (!before && el.querySelector('.gr-bud').classList.contains('neg')) { blip(180, 0.3, 'sawtooth', 0.04); buzz([30, 40, 30]); el.querySelector('.gr-bud').classList.add('shake'); }
  }
  function setOwn() { const v = parseFloat(String((D.getElementById('grOwn') || {}).value || '').replace(',', '.')); if (!(v >= 1 && v <= 2000)) { const i = D.getElementById('grOwn'); if (i) i.focus(); return; } st.budget = Math.round(v * 100) / 100; st.cart = []; save(); coin(); goShop(); }
  function onClick(e) {
    const b = e.target.closest('[data-gr]'); if (!b) return; const k = b.dataset.gr;
    if (k === 'close') return close();
    if (k === 'mute') { mute = !mute; try { localStorage.setItem('lowi.grun.mute', mute ? '1' : ''); } catch (x) { } return paint(); }
    if (k === 'shopc') { st.shop = b.dataset.s; save(); blip(700, 0.05); return paint(); }
    if (k === 'spin') { st.cart = []; view = 'spin'; return paint(); }
    if (k === 'own') return setOwn();
    if (k === 'startshop') return goShop();
    if (k === 'aisle') { aisle = b.dataset.a; blip(600, 0.04); paint(); const g = el.querySelector('.gr-grid'); if (g) g.scrollTop = 0; el.scrollTop = 0; return; }
    if (k === 'add') return add(b.dataset.id, b);
    if (k === 'cart') { view = 'cart'; return paint(); }
    if (k === 'toshop') { view = 'shop'; return paint(); }
    if (k === 'plus' || k === 'minus') { const c = st.cart.find(x => x.id === b.dataset.id); if (c) { c.qty += k === 'plus' ? 1 : -1; if (c.qty <= 0) st.cart = st.cart.filter(x => x !== c); save(); blip(k === 'plus' ? 880 : 440, 0.05); } return paint(); }
    if (k === 'checkout') { if (!st.cart.length) return; view = 'receipt'; return paint(); }
    if (k === 'keep') { st.list = st.cart.map(c => Object.assign({}, c)); st.got = {}; save(); view = 'list'; return paint(); }
    if (k === 'again') { st.cart = []; save(); view = 'start'; return paint(); }
    if (k === 'list') { view = 'list'; return paint(); }
    if (k === 'home') { view = 'start'; return paint(); }
    if (k === 'tick') { const id = b.dataset.id; if (st.got[id]) delete st.got[id]; else { st.got[id] = 1; blip(990, 0.06); buzz(6); } save(); const y = el.scrollTop; paint(); el.scrollTop = y; return; }
    if (k === 'donelist') { st.list = []; st.got = {}; save(); view = 'start'; return paint(); }
  }
  function open() { try { mute = localStorage.getItem('lowi.grun.mute') === '1'; } catch (e) { } view = 'start'; root(); paint(); D.documentElement.classList.add('gr-open'); requestAnimationFrame(() => { if (el) { el.dataset.in = '1'; el.classList.add('in'); } }); }
  function close() { if (!el) return; const e = el; el = null; D.documentElement.classList.remove('gr-open'); e.remove(); view = 'start'; }
  D.addEventListener('keydown', e => { if (e.key === 'Escape' && el) close(); });
  W.LowiGroceryRun = Object.assign({ open, close, isOpen: () => !!el }, core);
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
