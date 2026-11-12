/* LOWiSPIKE snack shelf (pure rules, no DOM). 11 Nov 2026.
 * Emmanuel: "Throw the Seller Zone out. The Seller Zone is basically just snacks. People need insulin-friendly snacks. Either the
 * ones from the Seller Zone that are in there, or ones that people found in the store, and those then go in there ... a community
 * cross-platform snack wardrobe ... You can also gamify it, have the right stuff in there so that it's more fun to use."
 * One shelf, two sources, nothing invented: (1) products people scanned in a shop that pass the Food check (the shared product
 * list every account sees), (2) the checked snacks you can order (seller-zone-data.js). A find gets on the shelf by scanning it. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LowiSnackShelfCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const LANGS = ['en', 'de', 'es'], PER_SHELF = 9;
  const li = l => Math.max(0, LANGS.indexOf(String(l || 'en').slice(0, 2).toLowerCase()));
  const NAME = { en: 'Snack shelf', de: 'Snack-Regal', es: 'Estante de snacks' };
  const W = {
    lead: ['Insulin-friendly snacks. Found in shops by the community, or ready to order.', 'Insulinfreundliche Snacks. Von der Community im Laden gefunden oder zum Bestellen.', 'Snacks aptos para la insulina. Encontrados en tiendas por la comunidad o para pedir.'],
    found: ['Found in the shop', 'Im Laden gefunden', 'Encontrados en la tienda'],
    order: ['To order', 'Zum Bestellen', 'Para pedir'],
    scan: ['Found a snack? Scan it onto the shelf', 'Snack gefunden? Scann ihn ins Regal', '¿Encontraste un snack? Escanéalo al estante'],
    mine: ['You put {n} on the shelf', 'Du hast {n} ins Regal gestellt', 'Has puesto {n} en el estante'],
    yours: ['yours', 'von dir', 'tuyo'], by: ['by {name}', 'von {name}', 'de {name}'],
    times: ['found {n}×', '{n}× gefunden', 'encontrado {n}×'],
    none: ['Nothing on the shelf yet. Scan a snack in the shop and it stands here for everyone.', 'Noch steht nichts im Regal. Scann einen Snack im Laden, dann steht er hier für alle.', 'Aún no hay nada en el estante. Escanea un snack en la tienda y estará aquí para todos.'],
    tap: ['Tap a snack to put it in your basket.', 'Tipp auf einen Snack, dann liegt er im Korb.', 'Toca un snack y va a tu cesta.'],
    more: ['Next shelf', 'Nächstes Regal', 'Siguiente estante'], info: ['Label values', 'Etikett-Werte', 'Valores de la etiqueta'],
    inBasket: ['in your basket', 'im Korb', 'en tu cesta'], details: ['Details and shop', 'Details und Shop', 'Detalles y tienda'],
    rule: ['Only snacks that pass the Food check stand here.', 'Hier steht nur, was den Food-Check besteht.', 'Aquí solo hay snacks que pasan el Food check.']
  };
  const word = (k, lang, vars) => { let s = W[k] ? W[k][li(lang)] : ''; if (vars) for (const v of Object.keys(vars)) s = s.replace('{' + v + '}', vars[v]); return s; };
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
  const SNACKY = { snack: 0, sweets: 1 }; /* snack-like groups stand in front */
  /* the community's finds: only products the Food check passes ("ok"), one pack per barcode or name, snack groups first, then the
     most found, then the newest. mineKeys: barcodes/names this phone caught; hidden(uid): test accounts whose name never shows */
  function community(items, opt) {
    opt = opt || {};
    const mine = {}; (opt.mineKeys || []).forEach(k => { mine[String(k)] = 1; });
    const seen = {}, out = [];
    for (const p of (Array.isArray(items) ? items : [])) {
      if (!p || p.verdict !== 'ok' || !String(p.name || '').trim()) continue;
      const bc = String(p.barcode || '').replace(/\D/g, ''), key = bc || 'n:' + norm(p.name);
      if (!key || key === 'n:' || seen[key]) continue; seen[key] = 1;
      const hid = !!(opt.hidden && p.by && opt.hidden(p.by));
      out.push({ key, name: String(p.name).trim().slice(0, 80), brand: String(p.brand || '').trim().slice(0, 40), img: /^https:\/\/[^\s"'<>]+$/.test(String(p.img || '')) ? String(p.img) : '',
        by: hid ? '' : String(p.byName || '').trim().slice(0, 24), catches: Math.max(1, p.catches | 0), mine: !!(mine[key] || mine[bc] || mine[norm(p.name)]), cat: String(p.cat || 'other'), ts: +p.ts || 0, src: p });
    }
    const rank = x => (x.cat in SNACKY ? SNACKY[x.cat] : 2);
    out.sort((a, b) => (rank(a) - rank(b)) || (b.catches - a.catches) || (b.ts - a.ts) || (a.name < b.name ? -1 : 1));
    return out;
  }
  function page(list, shown) { const all = Array.isArray(list) ? list : [], n = Math.min(all.length, Math.max(PER_SHELF, shown | 0)); return { items: all.slice(0, n), left: all.length - n, next: n + PER_SHELF }; }
  /* the small line under a find: who found it and how often */
  function credit(x, lang) {
    const parts = [];
    if (x.mine) parts.push(word('yours', lang)); else if (x.by) parts.push(word('by', lang, { name: x.by }));
    if (x.catches > 1) parts.push(word('times', lang, { n: x.catches }));
    return parts.join(' · ');
  }
  return { LANGS, PER_SHELF, NAME, W, word, norm, community, page, credit };
});
