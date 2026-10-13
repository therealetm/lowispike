/* LOWiSPIKE service worker · round 1 · Oct 9 2026
   The app page is always fetched fresh from the network (so every update lands on the same link) and only falls back
   to the saved copy when the phone is offline. Static files with a version in their name are cached. */
/* r3g: step pictures live in their own cache (lowispike-steps) */
const CACHE = "lowispike-r1";
const STATIC = ["herb-config.js", "herb-core.js", "body-core.js", "body-companion.js", "body-companion.css", "swaflo-config.js", "swaflo-core.js", "swaflo.js", "swaflo.css", "discovery-config.js", "discovery-core.js", "discovery.js", "discovery.css", "apple-ui.js", "apple-ui.css", "appearance.js", "recipe-book.js", "updates.css", "vendor/supabase-2.117.3.js", "vendor/zxing-0.21.3.min.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.indexOf("lowispike-steps") !== 0).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const scopePath = new URL(self.registration.scope).pathname;
function isPage(req, url){ return req.mode === "navigate" || url.pathname === scopePath || url.pathname === scopePath + "index.html"; }
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;     // Supabase etc. go straight to the network
  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/sw.js")) return;
  if (["herb-config.js", "herb-core.js", "body-core.js", "body-companion.js", "body-companion.css", "swaflo-config.js", "swaflo-core.js", "swaflo.js", "swaflo.css", "discovery-config.js", "discovery-core.js", "discovery.js", "discovery.css", "apple-ui.js", "apple-ui.css", "appearance.js", "recipe-book.js", "updates.css"].some(s => url.pathname.endsWith("/" + s))) {
    e.respondWith(fetch(req, {cache:"no-cache"}).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }).catch(() => caches.match(req).then(r => r || Response.error())));
    return;
  }
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
/* n1p: phone notifications (N1 part 2, Oct 11 2026). Shows the nudge the n1-push edge function sends and opens the
   right place when it is tapped. */
const N1P_FN = "https://vnfwmifmsfecascwaody.supabase.co/functions/v1/n1-push";
const N1P_PUB = "BLNmn2O2yRpMS7JukbXrgnYu157fNv317XnjgtVWzEyLuWMBupmX4Q1a0wid-4r6p0uGk8sVI0gMdl2uzlAREsA";
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch(x){ d = {b: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.t || "LOWiSPIKE", {body: d.b || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || "lowi", data: {q: d.q || ""}}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const q = (e.notification.data && e.notification.data.q) || "";
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(cs => {
    for (const c of cs) { if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) { try { c.postMessage({n1go: q}); } catch(x){} return c.focus(); } }
    return self.clients.openWindow(self.registration.scope + "?n1go=" + encodeURIComponent(q));
  }));
});
self.addEventListener("pushsubscriptionchange", e => {
  const k = N1P_PUB.replace(/-/g, "+").replace(/_/g, "/"), r = atob(k + "=".repeat((4 - k.length % 4) % 4)), key = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) key[i] = r.charCodeAt(i);
  e.waitUntil(self.registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key}).then(sub =>
    fetch(N1P_FN, {method: "POST", headers: {"Content-Type": "text/plain;charset=UTF-8"}, body: JSON.stringify({a: "save", sub: sub.toJSON(), st: {}})})).catch(() => {}));
});
/* /n1p */
