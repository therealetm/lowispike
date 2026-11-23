/* LOWiSPIKE last seen (23 Nov 2026, Emmanuel on the People list: "I want a timestamp for everyone on here so I can see when they
   were last online").
   - While the app is open and visible, a signed-in person's profiles.last_seen is set to now (RPC touch_seen, at most every 3 min,
     the server ignores more often than every 2 min). Nothing else is sent.
   - LowiLastSeen.get(uid) gives that time (ms) from one small read of profiles (id, last_seen), refreshed at most every minute.
   - LowiLastSeen.label(ms, lang) says it short: "Online now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", or a date.
   people-directory.js shows it under each name. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiLastSeen) return;
  const X = () => W.LOWI_CLOUD_X || null;
  const live = () => { try { return !!(W.LOWI_CLOUD && W.LOWI_CLOUD.live && W.LOWI_CLOUD.live()); } catch (e) { return false; } };
  async function client() { const x = X(); if (!x || !live()) return null; try { return await x.client(); } catch (e) { return null; } }
  let lastTouch = 0, map = {}, loadedAt = 0, loading = null;
  async function touch(force) {
    if (D.visibilityState !== 'visible' || (!force && Date.now() - lastTouch < 180e3)) return;
    const c = await client(); if (!c) return;
    lastTouch = Date.now();
    try { await c.rpc('touch_seen'); } catch (e) { /* offline or not signed in */ }
  }
  async function load(force) {
    if (!force && Date.now() - loadedAt < 60e3) return map;
    if (loading) return loading;
    loading = (async () => {
      const c = await client(); if (!c) return map;
      try { const r = await c.from('profiles').select('id,last_seen').not('last_seen', 'is', null).limit(5000);
        if (r && !r.error && Array.isArray(r.data)) { const m = {}; r.data.forEach(x => { const t = Date.parse(x.last_seen); if (x.id && t) m[String(x.id)] = t; }); map = m; loadedAt = Date.now();
          try { D.dispatchEvent(new CustomEvent('lowi:lastseen')); } catch (e) { } } } catch (e) { }
      return map;
    })();
    try { return await loading; } finally { loading = null; }
  }
  const T = { en: { now: 'Online now', min: '{n} min ago', h: '{n} h ago', y: 'Yesterday', d: '{n} days ago', never: 'Not seen yet' },
    de: { now: 'Gerade online', min: 'vor {n} Min.', h: 'vor {n} Std.', y: 'Gestern', d: 'vor {n} Tagen', never: 'Noch nicht gesehen' },
    es: { now: 'En línea ahora', min: 'hace {n} min', h: 'hace {n} h', y: 'Ayer', d: 'hace {n} días', never: 'Aún no visto' } };
  function label(ms, lang) {
    const L = T[lang] || T.en; if (!ms) return '';
    const s = (Date.now() - ms) / 1000;
    if (s < 300) return L.now;
    if (s < 3600) return L.min.replace('{n}', Math.round(s / 60));
    if (s < 86400) return L.h.replace('{n}', Math.round(s / 3600));
    const days = Math.floor(s / 86400);
    if (days < 2) return L.y;
    if (days < 7) return L.d.replace('{n}', days);
    try { return new Date(ms).toLocaleDateString(lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' }); } catch (e) { return ''; }
  }
  D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible') touch(true); });
  setInterval(() => touch(false), 60e3);
  setTimeout(() => touch(true), 4000);
  W.LowiLastSeen = { touch, load, get: uid => map[String(uid)] || 0, label, _T: T };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
