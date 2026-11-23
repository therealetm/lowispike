/* LOWiSPIKE last seen (23 Nov 2026, Emmanuel on the People list: "I want a timestamp for everyone on here so I can see when they
   were last online").
   - While the app is open and visible, a signed-in person's profiles.last_seen is set to now (RPC touch_seen, at most every 3 min,
     the server ignores more often than every 2 min). Nothing else is sent.
   - LowiLastSeen.get(uid) gives that time (ms) from one small read of profiles (id, last_seen), refreshed at most every minute.
   - LowiLastSeen.label(ms, lang) says it short with the clock time: "Online now", "5 min ago", "Today, 18:42", "Yesterday, 21:03", "Mon 17 Nov, 09:12".
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
      /* 23 Nov 2026 (Emmanuel: "the online timestamp didn't work for all of the accounts"): people_seen() takes the latest trace an open
         app leaves (session refresh, cloud save of the app state incl. games, messages, reactions, posts, likes, last_seen); plain
         profiles.last_seen is the fallback */
      try { let r = await c.rpc('people_seen'), key = 'seen';
        if (!r || r.error) { r = await c.from('profiles').select('id,last_seen').not('last_seen', 'is', null).limit(5000); key = 'last_seen'; }
        if (r && !r.error && Array.isArray(r.data)) { const m = {}; r.data.forEach(x => { const t = Date.parse(x[key]); if (x.id && t) m[String(x.id)] = t; }); map = m; loadedAt = Date.now();
          try { D.dispatchEvent(new CustomEvent('lowi:lastseen')); } catch (e) { } } } catch (e) { }
      return map;
    })();
    try { return await loading; } finally { loading = null; }
  }
  /* 23 Nov 2026 (Emmanuel: "it's not showing me the exact time. It's just showing me the date"): always the clock time too */
  const T = { en: { now: 'Online now', min: '{n} min ago', today: 'Today, {t}', y: 'Yesterday, {t}', never: 'Not seen yet' },
    de: { now: 'Gerade online', min: 'vor {n} Min.', today: 'Heute, {t}', y: 'Gestern, {t}', never: 'Noch nicht gesehen' },
    es: { now: 'En línea ahora', min: 'hace {n} min', today: 'Hoy, {t}', y: 'Ayer, {t}', never: 'Aún no visto' } };
  const LOC = { en: 'en-GB', de: 'de-DE', es: 'es-ES' };
  function label(ms, lang) {
    const L = T[lang] || T.en, loc = LOC[lang] || 'en-GB'; if (!ms) return '';
    const s = (Date.now() - ms) / 1000, d = new Date(ms);
    if (s < 300) return L.now;
    if (s < 3600) return L.min.replace('{n}', Math.round(s / 60));
    let t = ''; try { t = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }); } catch (e) { t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    const day0 = new Date(); day0.setHours(0, 0, 0, 0);
    if (ms >= day0.getTime()) return L.today.replace('{t}', t);
    if (ms >= day0.getTime() - 864e5) return L.y.replace('{t}', t);
    try { return d.toLocaleDateString(loc, { weekday: s < 6 * 86400 ? 'short' : undefined, day: 'numeric', month: 'short' }) + ', ' + t; } catch (e) { return t; }
  }
  D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible') touch(true); });
  setInterval(() => touch(false), 60e3);
  setTimeout(() => touch(true), 4000);
  W.LowiLastSeen = { touch, load, get: uid => map[String(uid)] || 0, label, _T: T };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
