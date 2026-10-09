/* LOWiSPIKE service worker · round 1 · Oct 9 2026
   The app page is always fetched fresh from the network (so every update lands on the same link) and only falls back
   to the saved copy when the phone is offline. Static files with a version in their name are cached. */
const CACHE = "lowispike-r1";
const STATIC = ["vendor/supabase-2.117.3.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const scopePath = new URL(self.registration.scope).pathname;
function isPage(req, url){ return req.mode === "navigate" || url.pathname === scopePath || url.pathname === scopePath + "index.html"; }
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;     // Supabase etc. go straight to the network
  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/sw.js")) return;
  if (isPage(req, url)) {
    e.respondWith(fetch(url.pathname + url.search, {cache:"no-cache", credentials:"same-origin"}).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(scopePath, cp)); }
      return res;
    }).catch(() => caches.match(scopePath).then(r => r || Response.error())));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok && STATIC.some(s => url.pathname.endsWith("/" + s))) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
