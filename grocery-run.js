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
   shown with "≈" and said once on the start screen. Nothing is sent anywhere; no XP (a game, not a care action).
   24 Nov 2026, the whole journey (Emmanuel: "Didn't I tell you that I want a whole journey of game interface? This just ends at the
   checklist ... every time I accidentally leave ... it just restarts from the beginning ... There should be a restart button ... a
   shortcut ... click on meat and then quickly have an overview of all the meat ranked by most insulin friendly ... share ... she gets
   this really nice interface that opens really fast, that shows that it's insulin safe ... where's my wardrobe? Where's my kitchen? ...
   play the cooking thingy, prepare my meal prep ... share that to my girlfriend ... share my grocery card"):
     Hub (the game's home; the game reopens where you left it): Grocery Run · Quick find · My kitchen · Cook today · list · menu.
     Quick find: one aisle of the chosen shop, ranked best first (spikes last); pick products -> Share / + Shopping list / I have it.
     My kitchen: everything you own, on shelves by aisle (Done shopping puts the ticked things there; Quick find adds too).
     Cook today: pick a meal, tap what you have into the pan, Cook -> a plate with its insulin check -> Today's menu.
     Share: a fast page (list/#...) with the photos, "insulin-friendly" and the estimated price; the data rides in the link itself.
     Restart (↺) starts a new run of the budget game. */
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
    list: ['Shopping list', 'Einkaufsliste', 'Lista de la compra'],
    bk: ['Back', 'Zurück', 'Atrás'], hubSub: ['Plan, shop, cook. All as a game.', 'Planen, einkaufen, kochen. Alles als Spiel.', 'Planea, compra, cocina. Todo como un juego.'],
    tRun: ['Grocery Run', 'Einkaufs-Run', 'Carrera del súper'], tRunS: ['Spin a budget, fill your cart', 'Budget drehen, Wagen füllen', 'Gira un presupuesto, llena el carrito'],
    tFind: ['Quick find', 'Schnell finden', 'Buscar rápido'], tFindS: ['The best of one aisle, to share', 'Das Beste aus einem Regal, zum Teilen', 'Lo mejor de un pasillo, para compartir'],
    tKit: ['My kitchen', 'Meine Küche', 'Mi cocina'], tKitS: ['Everything you have at home', 'Alles, was du zu Hause hast', 'Todo lo que tienes en casa'],
    tCook: ['Cook today', 'Heute kochen', 'Cocinar hoy'], tCookS: ['Play today’s meals', 'Spiel die Mahlzeiten von heute', 'Juega las comidas de hoy'],
    tMenu: ['Today’s menu', 'Heutiges Menü', 'Menú de hoy'], restart: ['Start a new run?', 'Neuen Run starten?', '¿Empezar de nuevo?'], restartA: ['Restart', 'Neu starten', 'Reiniciar'],
    pickN: ['{n} picked', '{n} ausgewählt', '{n} elegidos'], share: ['Share', 'Teilen', 'Compartir'], toList: ['+ List', '+ Liste', '+ Lista'], have: ['I have it', 'Hab ich', 'Lo tengo'],
    added: ['Added', 'Hinzugefügt', 'Añadido'], copied: ['Link copied', 'Link kopiert', 'Enlace copiado'], spikes: ['Spike foods', 'Spike-Lebensmittel', 'Alimentos que suben'],
    kitEmpty: ['Your kitchen is empty. Tick things off at the shop, or add them in Quick find.', 'Deine Küche ist leer. Hak im Laden ab oder füg in Schnell finden hinzu.', 'Tu cocina está vacía. Marca en la tienda o añade en Buscar rápido.'],
    addFind: ['+ Add from Quick find', '+ Aus Schnell finden', '+ Desde Buscar rápido'], use: ['Used up', 'Aufgebraucht', 'Gastado'],
    slots: ['Breakfast|Lunch|Dinner|Snack', 'Frühstück|Mittag|Abend|Snack', 'Desayuno|Comida|Cena|Snack'], pan: ['Tap what you have. It goes into the pan.', 'Tipp an, was du hast. Es kommt in die Pfanne.', 'Toca lo que tienes. Va a la sartén.'],
    cook: ['Cook!', 'Kochen!', '¡Cocinar!'], cooking: ['Cooking…', 'Kocht…', 'Cocinando…'], okPlate: ['Insulin-friendly plate', 'Insulinfreundlicher Teller', 'Plato apto para la insulina'],
    spikePlate: ['Has a spike food. Swap it?', 'Hat ein Spike-Lebensmittel. Austauschen?', 'Tiene algo que sube. ¿Cambiarlo?'], veg: ['Veg + protein', 'Gemüse + Eiweiß', 'Verdura + proteína'],
    toMenu: ['Add to today’s menu', 'Zum heutigen Menü', 'Al menú de hoy'], menuEmpty: ['Nothing planned yet. Cook something first.', 'Noch nichts geplant. Koch zuerst etwas.', 'Nada planeado aún. Cocina algo primero.'],
    shareMenu: ['📤 Share today’s menu', '📤 Heutiges Menü teilen', '📤 Compartir el menú de hoy'], shareCart: ['📤 Share my cart', '📤 Meinen Wagen teilen', '📤 Compartir mi carrito'],
    shareKit: ['📤 Share my kitchen', '📤 Meine Küche teilen', '📤 Compartir mi cocina'], noKit: ['Put things in your kitchen first.', 'Leg zuerst etwas in deine Küche.', 'Primero pon cosas en tu cocina.'],
    fromKit: ['From your kitchen', 'Aus deiner Küche', 'De tu cocina'], plate: ['Plate', 'Teller', 'Plato'], listSub: ['Tick things off while you shop.', 'Hak ab, was du im Laden einpackst.', 'Marca lo que vas metiendo en la tienda.'],
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
  let st = load(), el = null, view = 'hub', aisle = 'veg', shelves = null, loadingFor = '', mute = false, picks = {}, pan = [], slot = 0, plate = null;
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') return { shop: s.shop || 'lidl', budget: +s.budget || 0, cart: Array.isArray(s.cart) ? s.cart : [], list: Array.isArray(s.list) ? s.list : [], got: s.got || {}, kitchen: Array.isArray(s.kitchen) ? s.kitchen : [], menu: s.menu && s.menu.day === dayKey() ? s.menu : { day: dayKey(), meals: [] }, view: s.view || 'hub', aisle: s.aisle || 'veg' }; } catch (e) { } return { shop: 'lidl', budget: 0, cart: [], list: [], got: {}, kitchen: [], menu: { day: dayKey(), meals: [] }, view: 'hub', aisle: 'veg' }; }
  function dayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function save() { st.view = view === 'spin' ? 'start' : view; st.aisle = aisle; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } }
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
    return '<div class="gr-hud"><button class="gr-x" data-gr="hub" aria-label="' + esc(t('bk')) + '">‹</button><button class="gr-x gr-rs" data-gr="restart" aria-label="' + esc(t('restartA')) + '">↺</button>' +
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
    const r = root(); r.className = 'gr gr-v-' + view + (r.dataset.in ? ' in' : ''); if (view !== st.view) save();
    if (view === 'start') {
      const L = totals(st.list);
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="hub" aria-label="' + esc(t('bk')) + '">‹</button><span></span><button class="gr-snd" data-gr="mute" aria-label="' + esc(t('sound')) + '">' + (mute ? '🔇' : '🔊') + '</button></div>' +
        '<div class="gr-title"><div class="gr-logo">🛒</div><h1>' + esc(t('title')) + '</h1><p>' + esc(t('sub')) + '</p></div>' +
        (st.list.length ? '<button class="gr-listcard" data-gr="list"><b>📝 ' + esc(t('yourList')) + '</b><span>' + L.n + ' ' + esc(t('items')) + ' · ≈ ' + esc(eur(L.sum)) + '</span><i>' + esc(t('open')) + ' ›</i></button>' : '') +
        '<div class="gr-shops" role="group" aria-label="' + esc(t('shop')) + '">' + SHOPS.map(s => '<button class="' + (st.shop === s[0] ? 'on' : '') + '" data-gr="shopc" data-s="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>' +
        '<button class="gr-big gr-spinb" data-gr="spin">🎰 ' + esc(t('spin')) + '</button>' +
        '<div class="gr-own"><input id="grOwn" inputmode="decimal" placeholder="' + esc(t('ownPh')) + '" aria-label="' + esc(t('own')) + '"><button class="gr-mid" data-gr="own">€ ' + esc(t('own')) + '</button></div>' +
        '<p class="gr-note">' + esc(t('est')) + '</p>';
    } else if (view === 'hub') {
      const L = totals(st.list), K = st.kitchen.reduce((n, k) => n + k.qty, 0), M = st.menu.meals.length;
      const tile = (k, ic, a, b2, n) => '<button class="gr-tile gr-tile-' + k + '" data-gr="go" data-v="' + k + '"><i>' + ic + '</i><b>' + esc(a) + '</b><small>' + esc(b2) + '</small>' + (n ? '<em>' + n + '</em>' : '') + '</button>';
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="close" aria-label="' + esc(t('close')) + '">✕</button><span></span><button class="gr-snd" data-gr="mute" aria-label="' + esc(t('sound')) + '">' + (mute ? '🔇' : '🔊') + '</button></div>' +
        '<div class="gr-title gr-title-s"><div class="gr-logo">🛒</div><h1>' + esc(t('title')) + '</h1><p>' + esc(t('hubSub')) + '</p></div>' +
        '<div class="gr-tiles">' + tile('start', '🎰', t('tRun'), t('tRunS'), st.cart.length ? totals(st.cart).n : 0) + tile('find', '🔎', t('tFind'), t('tFindS'), 0) +
        tile('kitchen', '🧺', t('tKit'), t('tKitS'), K) + tile('cook', '🍳', t('tCook'), t('tCookS'), 0) +
        (st.list.length ? tile('list', '📝', t('yourList'), L.n + ' ' + t('items') + ' · ≈ ' + eur(L.sum), 0) : '') + (M ? tile('menu', '🍽', t('tMenu'), M + ' × ' + t('plate'), 0) : '') + '</div>' +
        '<p class="gr-note">' + esc(t('est')) + '</p>';
    } else if (view === 'find') {
      const all = shelves && shelves[aisle] || [], good = all.filter(p => p.ok).sort((a, b) => (b.best - a.best)), bad = all.filter(p => !p.ok), n = Object.keys(picks).length;
      const row = p => '<button class="gr-fr' + (picks[p.id] ? ' on' : '') + '" data-gr="pick" data-id="' + esc(p.id) + '"><span class="gr-ri">' + (p.im ? '<img loading="lazy" alt="" src="' + esc(p.im) + '">' : aisleInfo(p.aisle).ic) + '</span><div><b>' + esc(p.n) + '</b><small>' + esc([p.b, p.q].filter(Boolean).join(' · ')) + '</small><span class="gr-pf"><span class="gr-t ' + (p.best ? 'best' : p.ok ? 'good' : 'spike') + '">' + esc(t(p.best ? 'best' : p.ok ? 'good' : 'spike')) + '</span><strong>≈ ' + esc(eur(p.price)) + '</strong></span></div><i class="gr-ck">' + (picks[p.id] ? '✓' : '+') + '</i></button>';
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="hub" aria-label="' + esc(t('bk')) + '">‹</button><b class="gr-ht">' + esc(t('tFind')) + '</b><span style="width:48px"></span></div>' +
        '<div class="gr-shops">' + SHOPS.map(s2 => '<button class="' + (st.shop === s2[0] ? 'on' : '') + '" data-gr="shopc" data-s="' + s2[0] + '">' + s2[1] + '</button>').join('') + '</div>' + aisleBar() +
        (shelves ? '<div class="gr-frs">' + good.map(row).join('') + (bad.length ? '<h3 class="gr-la">⚠️ ' + esc(t('spikes')) + '</h3>' + bad.map(row).join('') : '') + '</div>' : loadBox()) +
        (n ? '<div class="gr-foot"><button class="gr-big" data-gr="sharepicks">📤 ' + esc(t('share')) + ' (' + n + ')</button><button class="gr-mid" data-gr="picklist">' + esc(t('toList')) + '</button><button class="gr-mid" data-gr="pickhave">🧺 ' + esc(t('have')) + '</button></div>' : '');
    } else if (view === 'kitchen') {
      const byA = {}; st.kitchen.forEach(k => { (byA[k.aisle] = byA[k.aisle] || []).push(k); });
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="hub" aria-label="' + esc(t('bk')) + '">‹</button><b class="gr-ht">🧺 ' + esc(t('tKit')) + '</b><span style="width:48px"></span></div>' +
        (st.kitchen.length ? AISLE.filter(a => byA[a]).map(a => '<h3 class="gr-la">' + aisleInfo(a).ic + ' ' + esc(aisleInfo(a).n) + '</h3><div class="gr-shelf">' + byA[a].map(k => '<div class="gr-kt"><span class="gr-pi">' + (k.im ? '<img loading="lazy" alt="" src="' + esc(k.im) + '">' : '<i>' + aisleInfo(k.aisle).ic + '</i>') + '<em>' + k.qty + '</em></span><b>' + esc(k.n) + '</b><span class="gr-q"><button data-gr="kminus" data-id="' + esc(k.id) + '" aria-label="' + esc(t('use')) + '">−</button><button data-gr="kplus" data-id="' + esc(k.id) + '" aria-label="+">+</button></span></div>').join('') + '</div>').join('') : '<p class="gr-empty">' + esc(t('kitEmpty')) + '</p>') +
        '<div class="gr-foot"><button class="gr-mid" data-gr="go" data-v="find">' + esc(t('addFind')) + '</button>' + (st.kitchen.length ? '<button class="gr-big" data-gr="go" data-v="cook">🍳 ' + esc(t('tCook')) + '</button>' : '') + '</div>' +
        (st.kitchen.length ? '<button class="gr-mid gr-sharek" data-gr="sharekit">' + esc(t('shareKit')) + '</button>' : '');
    } else if (view === 'cook') {
      const slots = t('slots').split('|'), have = st.kitchen;
      const inPan = pan.map(id => have.find(k => k.id === id)).filter(Boolean);
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="hub" aria-label="' + esc(t('bk')) + '">‹</button><b class="gr-ht">🍳 ' + esc(t('tCook')) + '</b><span style="width:48px"></span></div>' +
        '<div class="gr-shops">' + slots.map((n2, i) => '<button class="' + (slot === i ? 'on' : '') + '" data-gr="slot" data-i="' + i + '">' + esc(n2) + '</button>').join('') + '</div>' +
        (plate ? plateHTML(plate) : '<div class="gr-pan' + (inPan.length ? ' full' : '') + '"><div class="gr-panin">' + (inPan.length ? inPan.map(k => '<span class="gr-ing">' + (k.im ? '<img alt="" src="' + esc(k.im) + '">' : aisleInfo(k.aisle).ic) + '</span>').join('') : '<p>' + esc(t('pan')) + '</p>') + '</div></div>' +
          (have.length ? '<h3 class="gr-la">' + esc(t('fromKit')) + '</h3><div class="gr-shelf">' + have.map(k => '<button class="gr-kt' + (pan.indexOf(k.id) >= 0 ? ' on' : '') + '" data-gr="topan" data-id="' + esc(k.id) + '"><span class="gr-pi">' + (k.im ? '<img loading="lazy" alt="" src="' + esc(k.im) + '">' : '<i>' + aisleInfo(k.aisle).ic + '</i>') + '</span><b>' + esc(k.n) + '</b></button>').join('') + '</div>' : '<p class="gr-empty">' + esc(t('noKit')) + '</p>') +
          '<div class="gr-foot"><button class="gr-big" data-gr="cookgo"' + (inPan.length ? '' : ' disabled') + '>🔥 ' + esc(t('cook')) + '</button></div>');
    } else if (view === 'menu') {
      const slots = t('slots').split('|');
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="hub" aria-label="' + esc(t('bk')) + '">‹</button><b class="gr-ht">🍽 ' + esc(t('tMenu')) + '</b><span style="width:48px"></span></div>' +
        (st.menu.meals.length ? st.menu.meals.map((m, i) => '<div class="gr-meal"><div class="gr-mh"><b>' + esc(slots[m.slot] || '') + '</b><button class="gr-mx" data-gr="mealdel" data-i="' + i + '" aria-label="✕">✕</button></div>' + plateHTML(m, true) + '</div>').join('') : '<p class="gr-empty">' + esc(t('menuEmpty')) + '</p>') +
        '<div class="gr-foot"><button class="gr-mid" data-gr="go" data-v="cook">🍳</button>' + (st.menu.meals.length ? '<button class="gr-big" data-gr="sharemenu">' + esc(t('shareMenu')) + '</button>' : '') + '</div>';
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
        '<div class="gr-foot gr-foot2"><button class="gr-big" data-gr="keep">📝 ' + esc(t('toShop')) + '</button><button class="gr-mid" data-gr="sharecart">' + esc(t('shareCart')) + '</button><button class="gr-mid" data-gr="again">↻ ' + esc(t('again')) + '</button></div>';
      countUp(r.querySelector('.gr-score b')); m.forEach((on, i) => { if (on) setTimeout(() => blip(660 + i * 220, 0.18, 'triangle', 0.05), 500 + i * 350); });
    } else if (view === 'list') {
      const byA = {}; st.list.forEach(c => { (byA[c.aisle] = byA[c.aisle] || []).push(c); });
      const T = totals(st.list), gotSum = st.list.reduce((s, c) => s + (st.got[c.id] ? c.price * c.qty : 0), 0);
      r.innerHTML = '<div class="gr-hud"><button class="gr-x" data-gr="hub" aria-label="' + esc(t('bk')) + '">‹</button><b class="gr-ht">' + esc(t('list')) + '</b><span></span></div>' +
        '<p class="gr-lsub">' + esc(t('listSub')) + ' · ' + esc((SHOPS.find(s => s[0] === st.shop) || ['', ''])[1]) + '</p>' +
        '<div class="gr-lsum"><b>≈ ' + esc(eur(gotSum)) + '</b> ' + esc(t('got')) + ' · ≈ ' + esc(eur(T.sum)) + '</div>' +
        AISLE.filter(a => byA[a]).map(a => '<h3 class="gr-la">' + aisleInfo(a).ic + ' ' + esc(aisleInfo(a).n) + '</h3>' + byA[a].map(c => '<button class="gr-li' + (st.got[c.id] ? ' got' : '') + '" data-gr="tick" data-id="' + esc(c.id) + '"><i>' + (st.got[c.id] ? '✓' : '') + '</i><span>' + c.qty + '× ' + esc(c.n) + '</span><small>≈ ' + esc(eur(c.price * c.qty)) + '</small></button>').join('')).join('') +
        '<div class="gr-foot"><button class="gr-big" data-gr="donelist">✓ ' + esc(t('done')) + '</button></div>';
    }
  }
  function aisleBar() { return '<div class="gr-aisles" role="tablist">' + AISLE.filter(a => !shelves || (shelves[a] && shelves[a].length)).map(a => '<button role="tab" aria-selected="' + (a === aisle) + '" class="' + (a === aisle ? 'on' : '') + '" data-gr="aisle" data-a="' + a + '"><span>' + aisleInfo(a).ic + '</span>' + esc(aisleInfo(a).n.split(/[ ,&]/)[0]) + '</button>').join('') + '</div>'; }
  function loadBox() { return '<div class="gr-load"><div class="gr-logo spin">🛒</div><p>' + esc(loadingFor === 'err' ? t('noData') : t('loading')) + '</p></div>'; }
  /* a plate: its name from the main things, the insulin check and veg + protein */
  function plateOf(items) {
    const ok = items.every(k => k.ok), a = {}; items.forEach(k => { a[k.aisle] = 1; });
    const name = items.slice(0, 3).map(k => String(k.n).split(/\s+/).slice(0, 2).join(' ')).join(' · ');
    return { slot, name, ok, bal: !!((a.veg || a.fruit) && (a.meat || a.fish || a.dairy || a.cheese)), items: items.map(k => ({ id: k.id, n: k.n, im: k.im, best: k.best, ok: k.ok, aisle: k.aisle })) };
  }
  function plateHTML(p, small) {
    return '<div class="gr-plate' + (small ? ' sm' : '') + (p.ok ? ' ok' : ' bad') + '"><div class="gr-dish">' + p.items.map(k => '<span class="gr-ing">' + (k.im ? '<img alt="" src="' + esc(k.im) + '">' : aisleInfo(k.aisle).ic) + '</span>').join('') + '</div>' +
      '<b class="gr-pn">' + esc(p.name) + '</b><span class="gr-pv">' + esc(p.ok ? '✓ ' + t('okPlate') : '⚠️ ' + t('spikePlate')) + '</span>' + (p.bal ? '<span class="gr-pv ok">🥗 ' + esc(t('veg')) + '</span>' : '') +
      (small ? '' : '<div class="gr-foot"><button class="gr-mid" data-gr="cookagain">↺</button><button class="gr-big" data-gr="tomenu">🍽 ' + esc(t('toMenu')) + '</button></div>') + '</div>';
  }
  /* share: the list rides in the link (list/#...), so the page opens at once and needs no server */
  const IMGB = 'https://images.openfoodfacts.org/images/products/';
  function packItem(k) { return [String(k.n).slice(0, 80), String(k.im || '').indexOf(IMGB) === 0 ? k.im.slice(IMGB.length) : '', k.best ? 0 : k.ok ? 1 : 2, Math.round((k.price || 0) * 100), k.qty || 1]; }
  function enc(o) { const b = new TextEncoder().encode(JSON.stringify(o)); let s2 = ''; b.forEach(c => { s2 += String.fromCharCode(c); }); return btoa(s2).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function shareLink(kind, groups, title) {
    const base = location.origin + location.pathname.replace(/[^/]*$/, ''), shop = (SHOPS.find(s2 => s2[0] === st.shop) || ['', ''])[1];
    const url = base + 'list/#' + enc({ v: 1, k: kind, l: ['en', 'de', 'es'][li()], s: shop, t: title, g: groups.map(g => [g[0], g[1].map(packItem)]) });
    const done = () => { blip(880, 0.08); };
    if (navigator.share) return navigator.share({ title: 'LOWiSPIKE · ' + title, url }).then(done, () => { });
    try { navigator.clipboard.writeText(url).then(() => toast(t('copied'))); } catch (e) { }
    return Promise.resolve();
  }
  function byAisle(items) { const byA = {}; items.forEach(k => { (byA[k.aisle] = byA[k.aisle] || []).push(k); }); return AISLE.filter(a => byA[a]).map(a => [aisleInfo(a).ic + ' ' + aisleInfo(a).n, byA[a]]); }
  function toast(msg) { if (!el) return; const d = D.createElement('div'); d.className = 'gr-toast'; d.textContent = msg; el.appendChild(d); setTimeout(() => d.remove(), 1800); }
  function intoKitchen(items) { items.forEach(p => { const k = st.kitchen.find(x => x.id === p.id); if (k) k.qty += p.qty || 1; else st.kitchen.push(Object.assign({}, p, { qty: p.qty || 1 })); }); }
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
  function goShop(v) {
    view = v || 'shop'; paint();
    if (shelves && loadingFor === st.shop) return;
    shelves = null; loadingFor = st.shop; paint();
    const want = st.shop;
    shelvesFor(want).then(s => { if (st.shop !== want) return; shelves = s; if (!s[aisle] || !s[aisle].length) aisle = AISLE.find(a => s[a] && s[a].length) || 'veg'; if (view === 'shop' || view === 'find') paint(); }, () => { loadingFor = 'err'; if (view === 'shop' || view === 'find') paint(); });
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
    if (k === 'hub') { view = 'hub'; plate = null; save(); return paint(); }
    if (k === 'go') { const v = b.dataset.v; plate = null; if (v === 'find') return goShop('find'); view = v; save(); return paint(); }
    if (k === 'restart') { if (!confirm(t('restart'))) return; st.cart = []; st.budget = 0; view = 'start'; save(); return paint(); }
    if (k === 'pick') { const id = b.dataset.id; if (picks[id]) delete picks[id]; else { picks[id] = 1; blip(880, 0.05); buzz(6); } const y = el.scrollTop; paint(); el.scrollTop = y; return; }
    if (k === 'sharepicks' || k === 'picklist' || k === 'pickhave') {
      const all = Object.values(shelves || {}).reduce((a, l) => a.concat(l), []), items = Object.keys(picks).map(id => Object.assign({ qty: 1 }, all.find(x => x.id === id))).filter(x => x.n);
      if (k === 'sharepicks') return shareLink('find', byAisle(items), t('tFind'));
      if (k === 'picklist') { items.forEach(p => { const c = st.list.find(x => x.id === p.id); if (c) c.qty++; else st.list.push(p); }); }
      if (k === 'pickhave') intoKitchen(items);
      picks = {}; save(); coin(); toast(t('added')); return paint();
    }
    if (k === 'kplus' || k === 'kminus') { const it = st.kitchen.find(x => x.id === b.dataset.id); if (it) { it.qty += k === 'kplus' ? 1 : -1; if (it.qty <= 0) st.kitchen = st.kitchen.filter(x => x !== it); save(); } const y = el.scrollTop; paint(); el.scrollTop = y; return; }
    if (k === 'sharekit') return shareLink('kitchen', byAisle(st.kitchen), t('tKit'));
    if (k === 'slot') { slot = +b.dataset.i; return paint(); }
    if (k === 'topan') { const id = b.dataset.id, i = pan.indexOf(id); if (i >= 0) pan.splice(i, 1); else { pan.push(id); blip(520 + pan.length * 60, 0.06, 'triangle'); buzz(6); } const y = el.scrollTop; paint(); el.scrollTop = y; return; }
    if (k === 'cookgo') { const items = pan.map(id => st.kitchen.find(x => x.id === id)).filter(Boolean); if (!items.length) return; const pnl = el.querySelector('.gr-pan'); if (pnl) pnl.classList.add('sizzle'); b.disabled = true; b.textContent = t('cooking'); let n2 = 0; const sz = () => { if (n2++ < 8) { blip(200 + Math.random() * 120, 0.05, 'sawtooth', 0.015); setTimeout(sz, 110); } }; sz(); setTimeout(() => { plate = plateOf(items); coin(); buzz(20); paint(); }, reduce() ? 50 : 1300); return; }
    if (k === 'cookagain') { plate = null; return paint(); }
    if (k === 'tomenu') { if (plate) { st.menu.meals.push(plate); st.menu.meals.sort((a, c) => a.slot - c.slot); } plate = null; pan = []; view = 'menu'; save(); coin(); return paint(); }
    if (k === 'mealdel') { st.menu.meals.splice(+b.dataset.i, 1); save(); return paint(); }
    if (k === 'sharemenu') { const slots = t('slots').split('|'); return shareLink('menu', st.menu.meals.map(m => [slots[m.slot] + ' · ' + m.name, m.items.map(x => Object.assign({ qty: 1, price: 0 }, x))]), t('tMenu')); }
    if (k === 'sharecart') return shareLink('cart', byAisle(st.cart), t('tRun'));
    if (k === 'mute') { mute = !mute; try { localStorage.setItem('lowi.grun.mute', mute ? '1' : ''); } catch (x) { } return paint(); }
    if (k === 'shopc') { st.shop = b.dataset.s; save(); blip(700, 0.05); if (view === 'find') { picks = {}; return goShop('find'); } return paint(); }
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
    if (k === 'home') { view = 'hub'; return paint(); }
    if (k === 'tick') { const id = b.dataset.id; if (st.got[id]) delete st.got[id]; else { st.got[id] = 1; blip(990, 0.06); buzz(6); } save(); const y = el.scrollTop; paint(); el.scrollTop = y; return; }
    if (k === 'donelist') { intoKitchen(st.list.filter(c => st.got[c.id])); st.list = []; st.got = {}; view = 'kitchen'; save(); coin(); return paint(); }   /* 24 Nov 2026: what you bought goes into My kitchen */
  }
  function open() { try { mute = localStorage.getItem('lowi.grun.mute') === '1'; } catch (e) { } view = st.view && st.view !== 'spin' ? st.view : 'hub'; aisle = st.aisle || 'veg'; if (view === 'receipt' && !st.cart.length) view = 'hub'; root(); if (view === 'shop' || view === 'find') { view = view; goShop(view); } else paint(); D.documentElement.classList.add('gr-open'); requestAnimationFrame(() => { if (el) { el.dataset.in = '1'; el.classList.add('in'); } }); }
  function close() { if (!el) return; const e = el; el = null; D.documentElement.classList.remove('gr-open'); e.remove(); }
  D.addEventListener('keydown', e => { if (e.key === 'Escape' && el) close(); });
  W.LowiGroceryRun = Object.assign({ open, close, isOpen: () => !!el }, core);
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
