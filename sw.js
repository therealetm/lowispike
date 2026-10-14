/* LOWiSPIKE service worker · network-first app shell with offline static fallback. */
const SHELL_BUILD = "20261015-020000";
const CACHE = "lowispike-updates-20261015-020000";
const STATIC = ["finch-extras.js", "finch-extras.css", "spirit-core.js", "lowi-icons.js", "lowi-icons.css", "spirit.js", "spirit.css", "herb-quests-core.js", "herb-quests.js", "herb-quests.css", "wardrobe.css", "herb-config.js", "herb-core.js", "herb-tamagotchi-core.js", "herb-shop-core.js", "herb-shop.js", "herb-shop.css", "herb-identity-core.js", "herb-identity.js", "herb-identity.css", "herb-tamagotchi.js", "herb-tamagotchi-polish.js", "herb-tamagotchi-mount-fix.js", "herb-tamagotchi.css", "body-core.js", "body-companion.js", "body-companion.css", "swaflo-config.js", "swaflo-core.js", "swaflo.js", "swaflo.css", "discovery-config.js", "discovery-core.js", "discovery.js", "discovery.css", "apple-ui.js", "apple-ui.css", "appearance.js", "recipe-book.js", "updates.css", "weather-sky-core.js", "weather-sky.js", "weather-sky.css", "fast-bubble.js", "fast-bubble.css", "herb-touch.js", "herb-touch.css", "wide-layout.css", "living-home.js", "living-home.css", "daily-ritual.js", "daily-ritual.css", "sun-meter.js", "sun-meter.css", "praise.js", "vendor/supabase-2.117.3.js", "vendor/zxing-0.21.3.min.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
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
  if (["spirit-core.js", "lowi-icons.js", "lowi-icons.css", "spirit.js", "spirit.css", "herb-quests-core.js", "herb-quests.js", "herb-quests.css", "wardrobe.css", "herb-config.js", "herb-core.js", "herb-tamagotchi-core.js", "herb-shop-core.js", "herb-shop.js", "herb-shop.css", "herb-identity-core.js", "herb-identity.js", "herb-identity.css", "herb-tamagotchi.js", "herb-tamagotchi-polish.js", "herb-tamagotchi-mount-fix.js", "herb-tamagotchi.css", "body-core.js", "body-companion.js", "body-companion.css", "swaflo-config.js", "swaflo-core.js", "swaflo.js", "swaflo.css", "discovery-config.js", "discovery-core.js", "discovery.js", "discovery.css", "apple-ui.js", "apple-ui.css", "appearance.js", "recipe-book.js", "updates.css", "weather-sky-core.js", "weather-sky.js", "weather-sky.css", "fast-bubble.js", "fast-bubble.css", "herb-touch.js", "herb-touch.css", "wide-layout.css", "living-home.js", "living-home.css", "daily-ritual.js", "daily-ritual.css", "sun-meter.js", "sun-meter.css", "praise.js"].some(s => url.pathname.endsWith("/" + s))) {
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
  e.notification.close(); const q = (e.notification.data && e.notification.data.q) || "";
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(cs => {
    for (const c of cs) { if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) { try { c.postMessage({n1go: q,herbHome:true}); } catch(x){} return c.focus(); } }
    return self.clients.openWindow(self.registration.scope + "?herb=1");
  }));
});
self.addEventListener("pushsubscriptionchange", e => {
  const k = N1P_PUB.replace(/-/g, "+").replace(/_/g, "/"), r = atob(k + "=".repeat((4 - k.length % 4) % 4)), key = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) key[i] = r.charCodeAt(i);
  e.waitUntil(self.registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key}).then(sub =>
    fetch(N1P_FN, {method: "POST", headers: {"Content-Type": "text/plain;charset=UTF-8"}, body: JSON.stringify({a: "save", sub: sub.toJSON(), st: {}})})).catch(() => {}));
});

