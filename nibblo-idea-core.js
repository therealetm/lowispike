/* LOWiSPIKE Nibblo idea card (pure logic, no DOM). 11 Nov 2026.
 * Emmanuel: For You is for people only. The bot's meal ideas repeat, so they leave the feed and arrive as a notification:
 * a tap shows that one idea, then you cook it or close it. This file says which idea is the current one, what the card
 * says in EN/DE/ES and whether its small in-app notice was already shown. Dishes, slots and photos stay in nibblo-core.js. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LowiNibbloIdeaCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const KEY = 'lowi.nbIdea';
  const RX = /^nb-(\d{8})-([mne])$/;
  const LANGS = ['en', 'de', 'es'];
  const li = l => Math.max(0, LANGS.indexOf(String(l || 'en').slice(0, 2).toLowerCase()));
  const W = {
    slot: { m: ['Breakfast idea', 'Idee fürs Frühstück', 'Idea para el desayuno'], n: ['Lunch idea', 'Idee fürs Mittagessen', 'Idea para la comida'], e: ['Dinner idea', 'Idee fürs Abendessen', 'Idea para la cena'] },
    cook: ['Cook it', 'Jetzt kochen', 'Cocinarlo'],
    close: ['Close', 'Schließen', 'Cerrar'],
    bot: ['Bot', 'Bot', 'Bot'],
    open: ['Show the idea', 'Idee ansehen', 'Ver la idea'],
    aria: ['Meal idea from Nibblo, the food bot', 'Essensidee von Nibblo, dem Food-Bot', 'Idea de comida de Nibblo, el bot de comida']
  };
  const word = (k, lang, sub) => { const w = sub ? W[k] && W[k][sub] : W[k]; return w ? w[li(lang)] : ''; };
  /* a push or a notice names the idea by Nibblo's message id (nb-YYYYMMDD-m|n|e); the For You post id has an s in front */
  function parse(id) { const m = RX.exec(String(id || '').replace(/^s(?=nb-)/, '')); return m ? { id: 'nb-' + m[1] + '-' + m[2], day: m[1], slot: m[2] } : null; }
  /* the newest idea of today that is already out at instant t (Berlin time, the same slots the server uses), or null before breakfast */
  function latest(t, N) {
    if (!N || !N.berlin || !N.SLOTS) return null;
    const b = N.berlin(t); let best = null, bestAt = -1;
    for (const s of Object.keys(N.SLOTS)) { const p = String(N.SLOTS[s]).split(':').map(Number), at = p[0] * 60 + p[1]; if (b.min >= at && at > bestAt) { best = s; bestAt = at; } }
    return best ? { id: 'nb-' + b.day + '-' + best, day: b.day, slot: best } : null;
  }
  /* everything the card shows for one idea, in one language; null when the id is not one of Nibblo's */
  function card(id, lang, N) {
    const k = parse(id); if (!k || !N || !N.pick) return null;
    const p = N.pick(k.day, k.slot); if (!p || !p.dish) return null;
    const i = li(lang), d = p.dish;
    return { id: k.id, day: k.day, slot: k.slot, bookId: N.bookId(d.r), e: d.e, name: d.name[i], line: d.line[i], photo: N.photoUrl(d.r),
      kicker: word('slot', lang, k.slot), who: N.NAME || 'Nibblo' };
  }
  /* the in-app notice shows once per idea */
  function clean(s) { s = s && typeof s === 'object' ? s : {}; return { seen: parse(s.seen) ? parse(s.seen).id : '' }; }
  function fresh(state, id) { const k = parse(id); return !!k && clean(state).seen !== k.id; }
  function seen(state, id) { const k = parse(id), s = clean(state); if (k) s.seen = k.id; return s; }
  return { KEY, LANGS, W, word, parse, latest, card, clean, fresh, seen };
});
