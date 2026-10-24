/* LOWiSPIKE For You rule (pure logic, no DOM). 24 Oct 2026, Emmanuel: "all the images there don't fit our standard,
 * insulin friendly. Clear all of them ... From now on make sure they're always insulin friendly and fit our whole LOWiSPIKE
 * scene." and "when you share to the community, it should also land on the For You page."
 *
 * Standing rule (DECISIONS.md, 24 Oct 2026): For You only shows items with an insulin-friendly verdict from the app's own
 * logic. An item's verdict is the WORST of what it carries:
 *   - meta.meal: the meal read from a photo, rebuilt and re-scored on this phone (LowiMealSnap.clean -> bs, never trusted);
 *   - meta.spike: the spike level the app gave a logged meal (meal journal), set when a meal is shared to Community;
 *   - rec: a Recipe Book recipe, by its own verdict (r: "ja" -> low, "selten" -> mid, "nein" -> high).
 * Only "low" (the app's "Low spike" / "No spike") passes. An item that carries none of these (a plain link, a video, a
 * text, a crowd "Just ate" post) has no verdict and does not show. The inspiration bot's slides carry a Recipe Book recipe
 * and pass the same rule; nothing gets a free pass. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LowiForYouCore = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const RANK = { low: 0, mid: 1, high: 2 };
  function level(v) { v = String(v || '').toLowerCase(); if (v === 'medium') v = 'mid'; return RANK.hasOwnProperty(v) ? v : ''; }
  function recipeLevel(r) { const v = typeof r === 'string' ? r : r && r.r; return v === 'ja' ? 'low' : v === 'selten' ? 'mid' : v === 'nein' ? 'high' : ''; }

  /* ctx: {meal(m) -> 'low'|'mid'|'high' (re-scored), recipe(id) -> recipe object or null} */
  function verdict(p, ctx) {
    if (!p || typeof p !== 'object') return '';
    ctx = ctx || {};
    const got = [];
    const meta = p.meta && typeof p.meta === 'object' ? p.meta : null;
    if (meta && meta.meal) {
      const l = ctx.meal ? level(ctx.meal(meta.meal)) : '';
      got.push(l || 'high'); /* a meal we cannot score does not pass */
    }
    if (meta && meta.spike != null) got.push(level(meta.spike) || 'high');
    if (p.rec) {
      const l = ctx.recipe ? recipeLevel(ctx.recipe(p.rec)) : '';
      got.push(l || 'high'); /* an unknown recipe id does not pass */
    }
    if (!got.length) return '';
    return got.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'low');
  }
  const passes = (p, ctx) => verdict(p, ctx) === 'low';
  const filter = (list, ctx) => (Array.isArray(list) ? list : []).filter(p => passes(p, ctx));

  /* The For You feed: posts that pass, plus the bot's slides (bot posts pass the same rule), newest first, no duplicates. */
  function merge(list, bot, ctx) {
    const seen = new Set(), out = [];
    for (const p of (bot || []).concat(list || [])) { if (!p || !p.id || seen.has(p.id)) continue; seen.add(p.id); if (passes(p, ctx)) out.push(p); }
    return out.sort((a, b) => (+b.ts || 0) - (+a.ts || 0));
  }

  /* Share -> Community also lands in For You. The meal journal posts {photo url, dish name, spike level, caption} to the
   * Community room; the same meal becomes a For You post with meta.spike, so the rule above decides. */
  function str(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n); }
  function sharePost(o) {
    o = o || {};
    const src = String(o.src || ''), name = str(o.name, 80), lvl = level(o.lvl);
    if (!/^https:\/\//.test(src) || !name || !lvl) return null;
    const caption = str(o.caption, 140);
    return { id: 's' + String(o.id || Date.now().toString(36)), ts: typeof o.now === 'number' ? o.now : Date.now(), plat: '', url: '',
      meta: { spike: lvl, dish: name, from: 'community' }, cap: caption || name, photo: src, rec: '', vis: 'tribe', mine: false };
  }
  /* The photo url of a shared meal, read back from the Community row (any text field that holds a meal body). */
  function srcOfRow(row, parseMeal) {
    if (!row || typeof parseMeal !== 'function') return '';
    const vals = typeof row === 'string' ? [row] : Object.keys(row).map(k => row[k]);
    for (const v of vals) { if (typeof v !== 'string') continue; const m = parseMeal(v); if (m && m.src) return m.src; }
    return '';
  }

  const NOTE = {
    both: ['Shared to Community and For You', 'In der Community und in Für dich geteilt', 'Compartida en la Comunidad y en Para ti'],
    only: ['Shared to Community. For You only shows low-spike meals, so this one stays in Community.',
      'In der Community geteilt. Für dich zeigt nur Mahlzeiten mit wenig Spike, darum bleibt diese in der Community.',
      'Compartida en la Comunidad. Para ti solo muestra comidas de pico bajo, así que esta se queda en la Comunidad.'],
    post: ['Saved in My posts. For You only shows insulin-friendly food: a low-spike meal photo or a Recipe Book recipe.',
      'In Meine Posts gespeichert. Für dich zeigt nur insulinfreundliches Essen: ein Mahlzeitfoto mit wenig Spike oder ein Rezept aus dem Rezeptbuch.',
      'Guardado en Mis publicaciones. Para ti solo muestra comida amigable con la insulina: una foto de comida de pico bajo o una receta del recetario.'],
    foot: ['Only this meal is shared: the photo, its name and the spike rating. Low-spike meals also show in For You. Never your weight or other health data.',
      'Geteilt wird nur diese Mahlzeit: das Foto, ihr Name und die Spike-Einschätzung. Mahlzeiten mit wenig Spike erscheinen auch in Für dich. Nie dein Gewicht oder andere Gesundheitsdaten.',
      'Solo se comparte esta comida: la foto, su nombre y la estimación del pico. Las comidas de pico bajo también salen en Para ti. Nunca tu peso ni otros datos de salud.'],
    badge: ['Low spike', 'Wenig Spike', 'Pico bajo']
  };
  function note(key, lang) { const i = ['en', 'de', 'es'].indexOf(String(lang || 'en').slice(0, 2).toLowerCase()); const a = NOTE[key] || []; return a[i < 0 ? 0 : i] || a[0] || ''; }

  return { level, recipeLevel, verdict, passes, filter, merge, sharePost, srcOfRow, NOTE, note };
});
