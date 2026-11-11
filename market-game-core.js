/* LOWiSPIKE game supermarket (pure rules, no DOM). 11 Nov 2026.
 * Emmanuel: "I would rather have the supermarket actually look like a digital supermarket ... almost like a game where I can
 * pretend to go grocery shopping before I actually go ... a whole game from supermarket to what goes into the basket, what is
 * actually in your fridge, and then what you're gonna lay out on the table ... I almost see my plate. And I click on the air
 * fryer or the oven or use the pan, the plate changes." Someone who just wants to type or scroll taps one button for the list.
 * Four stations: shelves -> basket -> fridge -> table. Nothing here invents data: products come from the shop's range (only the
 * ones that pass), the basket is the shopping list, the fridge is the Kitchen (lowispike.kitchen.v1), prices only where the
 * cart already has one. The table and the remembered pictures are small phone-only states of their own. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LowiMarketCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const MODE_KEY = 'lowi.market.mode', TABLE_KEY = 'lowi.market.table.v1', PICS_KEY = 'lowi.market.pics.v1';
  const STATIONS = ['shelf', 'basket', 'fridge', 'table'];
  const DEVICES = ['airfryer', 'oven', 'pan'];
  const TABLE_MAX = 8, PICS_MAX = 240, PER_SHELF = 9, PLATE_MAX = 6;
  const LANGS = ['en', 'de', 'es'];
  const li = l => Math.max(0, LANGS.indexOf(String(l || 'en').slice(0, 2).toLowerCase()));
  const W = {
    shelf: ['Shelves', 'Regale', 'Estantes'], basket: ['Basket', 'Korb', 'Cesta'], fridge: ['Fridge', 'Kühlschrank', 'Nevera'], table: ['Table', 'Tisch', 'Mesa'],
    stations: ['From the shelf to your plate', 'Vom Regal bis auf den Teller', 'Del estante al plato'],
    list: ['Plain list', 'Einfache Liste', 'Lista simple'], game: ['Back to the market', 'Zurück zum Markt', 'Volver al mercado'],
    listSub: ['Type or scroll, no game', 'Tippen oder scrollen, ohne Spiel', 'Escribe o desliza, sin juego'],
    aisle: ['Aisle', 'Gang', 'Pasillo'], moreShelf: ['Next shelf', 'Nächstes Regal', 'Siguiente estante'],
    tapAdd: ['Tap a product to put it in your basket.', 'Tipp auf ein Produkt, dann liegt es im Korb.', 'Toca un producto y va a tu cesta.'],
    inBasket: ['in your basket', 'im Korb', 'en tu cesta'], info: ['Label values', 'Etikett-Werte', 'Valores de la etiqueta'],
    onlyOk: ['Only insulin-friendly products are on these shelves.', 'In diesen Regalen steht nur Insulinfreundliches.', 'En estos estantes solo hay productos aptos para la insulina.'],
    basketEmpty: ['Your basket is empty. Pick something from the shelves.', 'Dein Korb ist leer. Hol dir was aus den Regalen.', 'Tu cesta está vacía. Coge algo de los estantes.'],
    toShelf: ['To the shelves', 'Zu den Regalen', 'A los estantes'],
    bought: ['Bought it: into my fridge', 'Gekauft: ab in den Kühlschrank', 'Comprado: a mi nevera'],
    otherPays: ['Someone else pays', 'Jemand anderes zahlt', 'Que pague otra persona'],
    total: ['Estimated total', 'Geschätzte Summe', 'Total estimado'], noPrice: ['no price yet', 'noch kein Preis', 'aún sin precio'],
    priceNote: ['Prices only where someone reported one or the week plan estimated it. In the shop it can differ.', 'Preise nur dort, wo jemand einen gemeldet oder der Wochenplan geschätzt hat. Im Laden kann es anders sein.', 'Precios solo donde alguien indicó uno o el plan semanal lo estimó. En la tienda puede variar.'],
    less: ['One less', 'Eins weniger', 'Uno menos'], more: ['One more', 'Eins mehr', 'Uno más'],
    fridgeEmpty: ['Your fridge is empty. What you buy lands here.', 'Dein Kühlschrank ist leer. Was du kaufst, landet hier.', 'Tu nevera está vacía. Lo que compras llega aquí.'],
    fridgeHint: ['Tap what you want to cook with. It goes on the table.', 'Tipp an, womit du kochen willst. Es kommt auf den Tisch.', 'Toca con qué quieres cocinar. Va a la mesa.'],
    have: ['I already have…', 'Hab ich schon…', 'Ya tengo…'], add: ['Add', 'Dazu', 'Añadir'],
    usedUp: ['Used up', 'Aufgebraucht', 'Gastado'], onTable: ['on the table', 'auf dem Tisch', 'en la mesa'],
    tableEmpty: ['Nothing on the table yet. Take something out of the fridge.', 'Noch nichts auf dem Tisch. Hol dir was aus dem Kühlschrank.', 'Aún no hay nada en la mesa. Saca algo de la nevera.'],
    toFridge: ['To the fridge', 'Zum Kühlschrank', 'A la nevera'],
    how: ['How do you cook it?', 'Womit machst du es?', '¿Cómo lo cocinas?'],
    airfryer: ['Air fryer', 'Airfryer', 'Freidora de aire'], oven: ['Oven', 'Ofen', 'Horno'], pan: ['Pan', 'Pfanne', 'Sartén'],
    plate: ['Your plate', 'Dein Teller', 'Tu plato'],
    plateRaw: ['On your plate', 'Auf deinem Teller', 'En tu plato'],
    plate_airfryer: ['Crispy from the air fryer', 'Knusprig aus dem Airfryer', 'Crujiente de la freidora de aire'],
    plate_oven: ['Golden from the oven', 'Goldbraun aus dem Ofen', 'Dorado del horno'],
    plate_pan: ['Seared in the pan', 'Scharf angebraten aus der Pfanne', 'Sellado en la sartén'],
    fits: ['Recipes that fit', 'Rezepte, die passen', 'Recetas que encajan'],
    clear: ['Clear the table', 'Tisch abräumen', 'Recoger la mesa'], full: ['The table is full.', 'Der Tisch ist voll.', 'La mesa está llena.'],
    back: ['Back', 'Zurück', 'Atrás'], takeOff: ['Take off the table', 'Vom Tisch nehmen', 'Quitar de la mesa']
  };
  const word = (k, lang) => (W[k] ? W[k][li(lang)] : '');
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();

  /* a pack name for a tile or the plate: range lists sometimes carry weight and price in the name ("... 200g 0.99€ 1kg 4.9");
     the words before the first amount are the name. Nothing is cut when that would leave less than two letters. */
  function shortName(n) {
    const s = String(n == null ? '' : n).replace(/\s+/g, ' ').trim();
    const m = /\s\d+(?:[.,]\d+)?\s?(?:g|kg|ml|l|cl|stk|pcs|x)\b|\s\d+(?:[.,]\d+)?\s?€|\s€/i.exec(s);
    const cut = m && m.index >= 2 ? s.slice(0, m.index).trim() : s;
    return cut.length > 44 ? cut.slice(0, 43).trim() + '\u2026' : cut;
  }
  const mode = raw => (raw === 'list' ? 'list' : 'game');
  const station = s => (STATIONS.indexOf(s) >= 0 ? s : 'shelf');

  /* the aisles of the market: only groups with something that passes, each cut into shelves of nine */
  function aisles(groups) {
    return (Array.isArray(groups) ? groups : []).filter(g => g && Array.isArray(g.pass) && g.pass.length).map(g => ({ id: g.id, n: g.pass.length, shelves: Math.ceil(g.pass.length / PER_SHELF) }));
  }
  function shelfItems(group, shown) {
    const all = group && Array.isArray(group.pass) ? group.pass : [], want = Math.max(PER_SHELF, shown | 0), n = Math.min(all.length, want);
    return { items: all.slice(0, n), left: all.length - n, next: n + PER_SHELF };
  }

  /* the table: which fridge entries are laid out, and the cooker picked */
  function table(raw) {
    let o = null; try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { o = null; }
    o = o && typeof o === 'object' ? o : {};
    const seen = {}, ids = (Array.isArray(o.ids) ? o.ids : []).filter(x => typeof x === 'string' && x && !seen[x] && (seen[x] = 1)).slice(0, TABLE_MAX);
    return { ids, dev: DEVICES.indexOf(o.dev) >= 0 ? o.dev : '' };
  }
  function toggle(t, id) {
    t = table(t); id = String(id || '');
    if (!id) return { table: t, on: false, full: false };
    if (t.ids.indexOf(id) >= 0) return { table: { ids: t.ids.filter(x => x !== id), dev: t.dev }, on: false, full: false };
    if (t.ids.length >= TABLE_MAX) return { table: t, on: false, full: true };
    return { table: { ids: t.ids.concat([id]), dev: t.dev }, on: true, full: false };
  }
  /* entries that left the fridge leave the table too */
  function prune(t, kitchenIds) { t = table(t); const k = {}; (kitchenIds || []).forEach(x => { k[x] = 1; }); return { ids: t.ids.filter(x => k[x]), dev: t.ids.some(x => k[x]) ? t.dev : '' }; }
  function setDevice(t, dev) { t = table(t); return { ids: t.ids, dev: DEVICES.indexOf(dev) >= 0 && t.dev !== dev ? dev : '' }; }
  const clear = () => ({ ids: [], dev: '' });
  /* what the plate says: the cooker's line and the foods on it */
  function plate(t, names, lang) {
    t = table(t); const ns = (names || []).filter(Boolean).slice(0, PLATE_MAX);
    return { on: ns.length > 0, title: ns.length ? word(t.dev ? 'plate_' + t.dev : 'plateRaw', lang) : '', foods: ns, dev: t.dev };
  }

  /* pictures of products picked from the shelf, by name, so basket, fridge and table show the same pack (https only, bounded) */
  function pics(raw) {
    let o = null; try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { o = null; }
    const out = {}; let n = 0;
    if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (n >= PICS_MAX) break; const v = o[k]; if (typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v) && norm(k) === k && k) { out[k] = v.slice(0, 400); n++; } }
    return out;
  }
  function remember(p, name, url) {
    p = pics(p); const k = norm(name);
    if (!k || !/^https:\/\/[^\s"'<>]+$/.test(String(url || ''))) return p;
    delete p[k]; p[k] = String(url).slice(0, 400);
    const ks = Object.keys(p); while (ks.length > PICS_MAX) delete p[ks.shift()];
    return p;
  }
  const picOf = (p, name) => pics(p)[norm(name)] || '';

  /* recipes that fit what is on the table. recipes: [{id, name, words:[ingredient names in any language], make:'steps text (English)'}].
     A food fits an ingredient when they share a word stem of 4+ letters. With a cooker picked, recipes cooked that way come first. */
  const DEV_RX = { airfryer: /air.?fry/i, oven: /\boven\b|\bbake|\broast|\bgrill/i, pan: /\bpan\b|skillet|\bwok\b|\bfry|\bsear|\bbrown/i };
  const stems = s => norm(s).split(' ').filter(w => w.length >= 4).map(w => w.slice(0, 5));
  function fits(foodNames, recipes, dev, max) {
    const foods = (foodNames || []).map(stems).filter(a => a.length);
    if (!foods.length) return [];
    const out = [];
    for (const r of (recipes || [])) {
      if (!r || !r.id) continue;
      const ing = {}; (r.words || []).forEach(w => stems(w).forEach(s => { ing[s] = 1; }));
      const hit = foods.filter(f => f.some(s => ing[s])).length;
      if (!hit) continue;
      const way = !!(dev && DEV_RX[dev] && DEV_RX[dev].test(String(r.make || '')));
      out.push({ id: r.id, name: r.name, hit, way });
    }
    out.sort((a, b) => (b.way - a.way) || (b.hit - a.hit) || (a.name < b.name ? -1 : 1));
    return out.slice(0, max || 3);
  }
  const recipeId = n => 'rb_' + String(n || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');

  return { MODE_KEY, TABLE_KEY, PICS_KEY, STATIONS, DEVICES, TABLE_MAX, PICS_MAX, PER_SHELF, PLATE_MAX, LANGS, W, word, norm, shortName, mode, station, aisles, shelfItems,
    table, toggle, prune, setDevice, clear, plate, pics, remember, picOf, fits, recipeId, DEV_RX };
});
