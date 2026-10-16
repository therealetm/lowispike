/* LOWiSPIKE service worker · network-first app shell with offline static fallback. */
const SHELL_BUILD = "20261016-181510";
const CACHE = "lowispike-updates-20261016-181510";
const STATIC = ["onboarding-world.css", "liquid-glass.css", "liquid-glass.js", "style-sweep.css", "scan-glass.css", "scan-glass.js", "realm-backdrop.css", "realm-backdrop-core.js", "realm-backdrop.js", "misty-hub.css", "misty-hub.js", "community-chat-core.js", "community-chat-cloud.js", "community-chat.js", "community-chat.css", "community-galaxy.js", "community-galaxy.css", "finch-extras.js", "finch-extras.css", "spirit-core.js", "lowi-icons.js", "lowi-icons.css", "spirit.js", "spirit.css", "herb-quests-core.js", "herb-quests.js", "herb-quests.css", "wardrobe.css", "herb-config.js", "herb-core.js", "herb-tamagotchi-core.js", "herb-shop-core.js", "herb-shop.js", "herb-shop.css", "herb-identity-core.js", "starter-core.js", "herb-start.js", "herb-start.css", "herb-identity.js", "herb-identity.css", "herb-tamagotchi.js", "herb-tamagotchi-polish.js", "herb-tamagotchi-mount-fix.js", "cell-world.js", "cell-world.css", "herb-tamagotchi.css", "body-core.js", "body-companion.js", "body-companion.css", "swaflo-config.js", "swaflo-core.js", "swaflo.js", "swaflo.css", "discovery-config.js", "discovery-core.js", "discovery.js", "discovery.css", "apple-ui.js", "apple-ui.css", "appearance.js", "recipe-book.js", "updates.css", "weather-sky-core.js", "weather-sky.js", "weather-sky.css", "fast-bubble.js", "fast-bubble.css", "herb-touch.js", "herb-touch.css", "wide-layout.css", "living-home.js", "living-home.css", "daily-ritual.js", "daily-ritual.css", "body-trips.js", "body-trips.css", "top-bar.js", "top-bar.css", "body-world-3d.js", "body-world-3d-scene.js", "body-world-3d.css", "world-health-core.js", "body-ride-core.js", "body-ride.js", "body-ride.css", "season-core.js", "season.js", "season.css", "atmosphere-core.js", "atmosphere.js", "atmosphere.css", "arrival-core.js", "arrival-cards.js", "fast-edit-core.js", "fast-edit.js", "fast-edit.css", "xp-tap-core.js", "xp-tap.js", "xp-tap.css", "calm-sound-core.js", "sound-strings.js", "sound-strings.css", "region-pals-core.js", "region-pals.js", "region-pals.css", "world-audio-core.js", "world-audio.js", "world-audio.css", "world-mood-core.js", "world-mood.js", "world-mood.css", "companion-core.js", "companion.js", "companion.css", "arrival-cards.css", "body-world-regions.js", "body-world-regions.css", "vendor/three-0.160.1.module.min.js", "sun-meter.js", "sun-meter.css", "praise.js", "micro-book-core.js", "micro-book.js", "micro-book.css", "cell-room-core.js", "cell-room.js", "cell-room.css", "vendor/supabase-2.117.3.js", "vendor/zxing-0.21.3.min.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "world-home-core.js", "world-home.js", "world-home.css", "nav-moves.js", "nav-moves.css", "galaxy-zoom.js", "community-spirit.js", "community-spirit.css", "misty-pad.js", "misty-pad.css", "misty-flight.js", "move-durations.css", "move-player.css", "move-player.js", "fy-embed.css", "fy-embed.js"];
/* Oct 15 clean start: files the page asks for with ?v=<this build> never change, so they come straight from this build's cache
   (filled at install, or on first use) instead of a network round trip per file on every launch. A page from another build
   (?v=other) still goes to the network first, so old and new files never mix. */
const OWN = STATIC.filter(f => /\.(js|css)$/.test(f) && f.indexOf("vendor/") !== 0), PLAIN = STATIC.filter(f => OWN.indexOf(f) < 0);
self.addEventListener("install", e => {
  self.skipWaiting();
  /* Oct 15: the page itself goes into this build's cache too, so an offline launch right after an update
     still opens the app (activate deletes the old cache that held the last page). */
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([c.addAll(PLAIN).catch(() => {}),
    fetch(scopePath, {cache:"no-cache", credentials:"same-origin"}).then(r => r && r.ok ? c.put(scopePath, r) : null).catch(() => {})].concat(OWN.map(f => {
    const u = f + "?v=" + SHELL_BUILD;
    return fetch(u, {cache:"no-cache"}).then(r => r && r.ok ? Promise.all([c.put(u, r.clone()), c.put(f, r)]) : null).catch(() => {});
  })))));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.indexOf("lowispike-steps") !== 0 && k !== "lowi-handoff").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const scopePath = new URL(self.registration.scope).pathname;
function isPage(req, url){ return req.mode === "navigate" || url.pathname === scopePath || url.pathname === scopePath + "index.html"; }
async function stampPage(res){
  // The loaded HTML is authoritative; never relabel stale HTML as a new app build.
  return res;
}
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json") || url.pathname.endsWith("/sw.js")) return;
  if (url.searchParams.get("v") === SHELL_BUILD && /\.(js|css)$/.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => caches.match(url.origin + url.pathname).then(r => r || Response.error())))));
    return;
  }
  if (["onboarding-world.css", "liquid-glass.css", "liquid-glass.js", "style-sweep.css", "scan-glass.css", "scan-glass.js", "community-chat-core.js", "community-chat-cloud.js", "community-chat.js", "community-chat.css", "community-galaxy.js", "community-galaxy.css", "spirit-core.js", "lowi-icons.js", "lowi-icons.css", "spirit.js", "spirit.css", "herb-quests-core.js", "herb-quests.js", "herb-quests.css", "wardrobe.css", "herb-config.js", "herb-core.js", "herb-tamagotchi-core.js", "herb-shop-core.js", "herb-shop.js", "herb-shop.css", "herb-identity-core.js", "starter-core.js", "herb-start.js", "herb-start.css", "herb-identity.js", "herb-identity.css", "herb-tamagotchi.js", "herb-tamagotchi-polish.js", "herb-tamagotchi-mount-fix.js", "cell-world.js", "cell-world.css", "herb-tamagotchi.css", "body-core.js", "body-companion.js", "body-companion.css", "swaflo-config.js", "swaflo-core.js", "swaflo.js", "swaflo.css", "discovery-config.js", "discovery-core.js", "discovery.js", "discovery.css", "apple-ui.js", "apple-ui.css", "appearance.js", "recipe-book.js", "updates.css", "weather-sky-core.js", "weather-sky.js", "weather-sky.css", "fast-bubble.js", "fast-bubble.css", "herb-touch.js", "herb-touch.css", "wide-layout.css", "living-home.js", "living-home.css", "daily-ritual.js", "daily-ritual.css", "body-trips.js", "body-trips.css", "top-bar.js", "top-bar.css", "body-world-3d.js", "body-world-3d-scene.js", "body-world-3d.css", "world-health-core.js", "body-ride-core.js", "body-ride.js", "body-ride.css", "season-core.js", "season.js", "season.css", "atmosphere-core.js", "atmosphere.js", "atmosphere.css", "arrival-core.js", "arrival-cards.js", "fast-edit-core.js", "fast-edit.js", "fast-edit.css", "xp-tap-core.js", "xp-tap.js", "xp-tap.css", "calm-sound-core.js", "sound-strings.js", "sound-strings.css", "region-pals-core.js", "region-pals.js", "region-pals.css", "world-audio-core.js", "world-audio.js", "world-audio.css", "world-mood-core.js", "world-mood.js", "world-mood.css", "companion-core.js", "companion.js", "companion.css", "arrival-cards.css", "body-world-regions.js", "body-world-regions.css", "sun-meter.js", "sun-meter.css", "praise.js", "micro-book-core.js", "micro-book.js", "micro-book.css", "cell-room-core.js", "cell-room.js", "cell-room.css", "/", "world-home-core.js", "world-home.js", "world-home.css", "nav-moves.js", "nav-moves.css", "galaxy-zoom.js"].some(s => url.pathname.endsWith("/" + s))) {
    e.respondWith(fetch(req, {cache:"no-cache"}).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }).catch(() => caches.match(req).then(r => r || Response.error())));
    return;
  }
  if (isPage(req, url)) {
    e.respondWith(fetch(url.pathname + url.search, {cache:"no-cache", credentials:"same-origin"}).then(stampPage).then(res => {
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
const N1P_FN = "https://vnfwmifmsfecascwaody.supabase.co/functions/v1/n1-push";
const N1P_PUB = "BLNmn2O2yRpMS7JukbXrgnYu157fNv317XnjgtVWzEyLuWMBupmX4Q1a0wid-4r6p0uGk8sVI0gMdl2uzlAREsA";
if(typeof importScripts==="function")importScripts("herb-config.js","herb-core.js","herb-tamagotchi-core.js");
function herbReminderClaim(now){
  return new Promise(resolve=>{
    if(typeof indexedDB==="undefined"){resolve(null);return;}
    const request=indexedDB.open("lowi-herb-reminders",1);
    request.onupgradeneeded=()=>request.result.createObjectStore("state");
    request.onerror=()=>resolve(null);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction("state","readwrite"),store=tx.objectStore("state"),c=store.get("config");let delivery=null;
      c.onsuccess=()=>{const config=c.result;if(!config||!config.tz||!self.LowiHerbTamagotchiCore)return;
        const r=store.get("delivered");r.onsuccess=()=>{const window=self.LowiHerbTamagotchiCore.reminderWindow(now,config.tz,r.result);
          if(window.allowed){store.put(window.day,"delivered");delivery=config;}};};
      tx.oncomplete=()=>{db.close();resolve(delivery);};tx.onerror=()=>{db.close();resolve(null);};tx.onabort=()=>resolve(null);
    };
  });
}
self.addEventListener("push", e => {
  e.waitUntil(herbReminderClaim(Date.now()).then(config=>{
    if(!config)return;
    return self.registration.showNotification(config.name||"Your herb",{body:self.LowiHerbTamagotchiCore.reminder(config),icon:"icon-192.png",badge:"icon-192.png",tag:"lowi-herb-daily",data:{q:"",herbHome:true}});
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close(); const q = (e.notification.data && e.notification.data.q) || "", tab = (e.notification.data && e.notification.data.tab) || "";
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(cs => {
    for (const c of cs) { if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) { try { c.postMessage(tab === "foryou" ? {cgTab: tab} : {n1go: q,herbHome:true}); } catch(x){} return c.focus(); } }
    return self.clients.openWindow(self.registration.scope + "?herb=1");
  }));
});
self.addEventListener("pushsubscriptionchange", e => {
  const k = N1P_PUB.replace(/-/g, "+").replace(/_/g, "/"), r = atob(k + "=".repeat((4 - k.length % 4) % 4)), key = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) key[i] = r.charCodeAt(i);
  e.waitUntil(self.registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key}).then(sub =>
    fetch(N1P_FN, {method: "POST", headers: {"Content-Type": "text/plain;charset=UTF-8"}, body: JSON.stringify({a: "save", sub: sub.toJSON(), st: {}})})).catch(() => {}));
});

