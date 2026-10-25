/* LOWiSPIKE service worker · network-first app shell with offline static fallback. */
const SHELL_BUILD = "20261025-201810";
const CACHE = "lowispike-updates-20261025-201810";
const STATIC = ["community-room.css", "community-tg.css", "one-sheet.css", "cycle-world.css", "cycle-care-core.js", "cycle-world.js", "misty-say.css", "misty-peak.js", "ate-this.css", "ate-this.js", "body-stats.css", "body-stats-core.js", "body-stats.js", "weight-journey.css", "weight-journey-core.js", "weight-journey.js", "tutorial.css", "tutorial-steps.js", "tutorial.js", "home-visit.css", "home-visit.js", "nutri-stats.css", "nutri-stats-core.js", "nutri-stats.js", "meal-result.js", "food-photo-ai.js", "meal-photo.js", "meal-photo.css", "meal-journal.js", "meal-journal.css", "grocery-bucket-core.js", "grocery-bucket.js", "grocery-bucket.css", "string-pov.js", "misty-pop.css", "clean-view-core.js", "clean-view.js", "move-estimate-core.js", "move-bubble.js", "move-bubble.css", "misty-hunt.js", "hunt-count.js", "hunt-count.css", "misty-scale.js", "misty-scale.css", "misty-hints.js", "adventure.js", "mirror-move.css", "mirror-move-core.js", "mirror-hinge-core.js", "mirror-hinge.js", "mirror-move.js", "app-voice.js", "app-voice-data.js", "scan-screens.css", "onboarding-world.css", "liquid-glass.css", "liquid-glass.js", "style-sweep.css", "scan-glass.css", "scan-glass.js", "gpt-open.js", "tiktok-open.js", "realm-backdrop.css", "realm-backdrop-core.js", "realm-backdrop.js", "misty-hub.css", "read-time-core.js", "misty-hub.js", "community-chat-core.js", "profile-share-core.js", "account-sync-core.js", "community-chat-cloud.js", "chat-stick-core.js", "community-chat.js", "community-chat.css", "community-galaxy.js", "community-galaxy.css", "community-composer.css", "community-composer.js", "community-energy.css", "community-voice.css", "community-energy.js", "finch-extras.js", "finch-extras.css", "meal-db-core.js", "spirit-core.js", "lowi-icons.js", "lowi-icons.css", "spirit.js", "spirit.css", "herb-quests-core.js", "herb-quests.js", "herb-quests.css", "wardrobe.css", "herb-config.js", "herb-core.js", "herb-tamagotchi-core.js", "herb-shop-core.js", "herb-shop.js", "herb-shop.css", "herb-identity-core.js", "starter-core.js", "companion-birth-core.js", "companion-birth.js", "companion-birth.css", "herb-start.js", "herb-start.css", "herb-identity.js", "herb-identity.css", "herb-tamagotchi.js", "herb-tamagotchi-polish.js", "herb-tamagotchi-mount-fix.js", "cell-world.js", "cell-world.css", "herb-tamagotchi.css", "body-core.js", "swaflo-config.js", "scan-sort-core.js", "swaflo-core.js", "swaflo.js", "swaflo.css", "discovery-config.js", "discovery-core.js", "discovery.js", "discovery.css", "apple-ui.js", "apple-ui.css", "appearance.js", "recipe-book.js", "updates.css", "weather-sky-core.js", "weather-sky.js", "weather-sky.css", "fast-bubble.js", "fast-bubble.css", "herb-touch.js", "herb-touch.css", "wide-layout.css", "living-home.js", "living-home.css", "daily-ritual.js", "daily-ritual.css", "body-trips.js", "body-trips.css", "top-bar.js", "top-bar.css", "body-world-3d.js", "body-world-3d-scene.js", "power-saver.js", "body-world-3d.css", "world-health-core.js", "inside-row.js", "season-core.js", "season.js", "season.css", "atmosphere-core.js", "atmosphere.js", "atmosphere.css", "arrival-core.js", "arrival-cards.js", "fast-edit-core.js", "fast-edit.js", "fast-edit.css", "xp-tap-core.js", "xp-tap.js", "xp-tap.css", "calm-sound-core.js", "sound-strings.js", "sound-strings.css", "region-pals-core.js", "region-pals.js", "region-pals.css", "world-audio-core.js", "world-audio.js", "world-audio.css", "world-mood-core.js", "world-mood.js", "world-mood.css", "companion-core.js", "companion.js", "companion.css", "arrival-cards.css", "body-world-regions.js", "body-world-regions.css", "vendor/three-0.160.1.module.min.js", "sun-meter.js", "sun-meter.css", "praise.js", "micro-book-core.js", "micro-book.js", "micro-book.css", "cell-room-core.js", "cell-room.js", "cell-room.css", "vendor/supabase-2.117.3.js", "vendor/zxing-0.21.3.min.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "world-home-core.js", "world-home.js", "world-home.css", "nav-moves.js", "back-swipe.js", "nav-moves.css", "galaxy-zoom.js", "community-spirit.js", "community-spirit.css", "misty-pad.js", "misty-pad.css", "misty-flight.js", "misty-galaxy.js", "galaxy-bubbles.js", "move-durations.css", "move-player.css", "move-player.js", "fy-embed.css", "fy-embed.js", "community-standout.css", "glass-nav.css", "cook-shop.css", "today-sheet.css", "shop-scan.css", "shop-scan-core.js", "shop-scan.js", "store-picks-core.js", "store-picks.js", "own-entries.js", "shop-plan-core.js", "shop-plan.js", "shop-plan.css", "store-picks.css", "seller-zone.css", "seller-zone-data.js", "seller-zone-core.js", "seller-zone.js", "grocery-hunt-core.js", "grocery-hunt.js", "grocery-hunt.css", "name-estimate-core.js", "ingredient-core.js", "food-policy-core.js", "food-knowledge-core.js", "food-assess-core.js", "food-engine-core.js", "spike-core.js", "spike-catch.js", "spike-catch.css", "label-photos-core.js", "label-photos.js", "label-photos.css", "food-card-core.js", "food-card.css", "living-bubbles.js", "living-bubbles.css", "sym-home.js", "sym-home.css", "home-orbit-v2.js", "home-orbit-v2.css", "home-settings-sleep-v2.js", "community-me.js", "community-me.css", "home-settings-sleep-v2.css", "home-blooms-v2.js", "gap-view.css", "gap-view.js", "home-blooms-v2.css", "bloom-ring.js", "bloom-ring.css", "misty-turn.js", "misty-face.js", "misty-panels.css", "misty-bloom.js", "misty-bump.js", "adventure-tiers.js", "care-board-core.js", "ranking-core.js", "ranking.js", "ranking.css", "hidden-accounts.js", "bot-accounts.js", "people-directory-core.js", "people-directory.js", "people-directory.css", "misty-explore.js", "section-nav.css", "section-nav.js", "readability-fit.css", "world-sci-core.js", "world-sci.js", "world-sci.css", "install-guide.css", "install-guide.js", "lis-push.css", "lis-push.js"];
/* Oct 15 clean start: files the page asks for with ?v=<this build> never change, so they come straight from this build's cache
   (filled at install, or on first use) instead of a network round trip per file on every launch. A page from another build
   (?v=other) still goes to the network first, so old and new files never mix. */
STATIC.push("foryou.css", "foryou-core.js", "inspo-core.js", "nibblo-core.js", "foryou.js", "foryou-stay.js"); /* Oct 24 For You: insulin-friendly rule + inspiration bot */
STATIC.push("rubberband.js", "spring.js"); /* Oct 25 iOS feel: shared springs + rubber band, own line */
STATIC.push("gift-basket-core.js", "gift-basket.js", "gift-basket.css"); /* Oct 25 Give a hand in Shop: own line, like kitchen-core.js */
STATIC.push("after-meal-checklist-core.js", "after-meal-checklist.js", "after-meal-checklist.css"); /* Oct 25 after-meal checklist: own line */
STATIC.push("studio-lock-core.js", "studio-lock.js", "studio-lock.css"); /* Oct 25 Studio lock: own line */
STATIC.push("community-remove-core.js", "community-remove.js", "community-remove.css"); /* Oct 25 admin Remove from community: own line */
STATIC.push("tutorial-demo.js", "tutorial-demo.css", "tutorial-flight.js", "tutorial-img/scan-sample.webp"); /* Oct 25 short tour: the demo finger, the mocked Scan photo and her first flight */
STATIC.push("kitchen-core.js"); /* Oct 24 Kitchen in Shop: on its own line so it never collides with the build stamp next to the STATIC line */
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
const PAGE_WAIT = 1500; /* ms a launch waits for the network before it opens the saved page */
/* Oct 21 (affiliate blueprint): only the app shell address is "the page". Before, every navigation counted, so opening another
   page of the site (blueprint.html, 404.html) saved THAT page as the app shell, and the next slow or offline launch opened it
   instead of the app. Other pages now go straight to the network, untouched by this worker. */
function isShell(url){ return url.pathname === scopePath || url.pathname === scopePath + "index.html"; }
function isPage(req, url){ return isShell(url); }
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
  if (["body-stats.css", "body-stats-core.js", "body-stats.js", "weight-journey.css", "weight-journey-core.js", "weight-journey.js", "nutri-stats.css", "nutri-stats-core.js", "nutri-stats.js", "tutorial.css", "tutorial-steps.js", "tutorial.js", "home-visit.css", "home-visit.js", "community-room.css", "community-tg.css", "misty-pop.css", "clean-view-core.js", "clean-view.js", "move-estimate-core.js", "move-bubble.js", "move-bubble.css", "onboarding-world.css", "liquid-glass.css", "liquid-glass.js", "style-sweep.css", "scan-glass.css", "scan-glass.js", "community-chat-core.js", "community-chat-cloud.js", "chat-stick-core.js", "community-chat.js", "community-chat.css", "community-galaxy.js", "community-galaxy.css", "community-composer.css", "community-composer.js", "community-energy.css", "community-voice.css", "community-energy.js", "meal-db-core.js", "spirit-core.js", "lowi-icons.js", "lowi-icons.css", "spirit.js", "spirit.css", "herb-quests-core.js", "herb-quests.js", "herb-quests.css", "wardrobe.css", "herb-config.js", "herb-core.js", "herb-tamagotchi-core.js", "herb-shop-core.js", "herb-shop.js", "herb-shop.css", "herb-identity-core.js", "starter-core.js", "companion-birth-core.js", "companion-birth.js", "companion-birth.css", "herb-start.js", "herb-start.css", "herb-identity.js", "herb-identity.css", "herb-tamagotchi.js", "herb-tamagotchi-polish.js", "herb-tamagotchi-mount-fix.js", "cell-world.js", "cell-world.css", "herb-tamagotchi.css", "body-core.js", "swaflo-config.js", "scan-sort-core.js", "swaflo-core.js", "swaflo.js", "swaflo.css", "discovery-config.js", "discovery-core.js", "discovery.js", "discovery.css", "apple-ui.js", "apple-ui.css", "appearance.js", "recipe-book.js", "updates.css", "weather-sky-core.js", "weather-sky.js", "weather-sky.css", "fast-bubble.js", "fast-bubble.css", "herb-touch.js", "herb-touch.css", "wide-layout.css", "living-home.js", "living-home.css", "daily-ritual.js", "daily-ritual.css", "body-trips.js", "body-trips.css", "top-bar.js", "top-bar.css", "body-world-3d.js", "body-world-3d-scene.js", "power-saver.js", "body-world-3d.css", "world-health-core.js", "inside-row.js", "season-core.js", "season.js", "season.css", "atmosphere-core.js", "atmosphere.js", "atmosphere.css", "arrival-core.js", "arrival-cards.js", "fast-edit-core.js", "fast-edit.js", "fast-edit.css", "xp-tap-core.js", "xp-tap.js", "xp-tap.css", "calm-sound-core.js", "sound-strings.js", "sound-strings.css", "region-pals-core.js", "region-pals.js", "region-pals.css", "world-audio-core.js", "world-audio.js", "world-audio.css", "world-mood-core.js", "world-mood.js", "world-mood.css", "companion-core.js", "companion.js", "companion.css", "arrival-cards.css", "body-world-regions.js", "body-world-regions.css", "sun-meter.js", "sun-meter.css", "praise.js", "micro-book-core.js", "micro-book.js", "micro-book.css", "cell-room-core.js", "cell-room.js", "cell-room.css", "/", "world-home-core.js", "world-home.js", "world-home.css", "nav-moves.js", "back-swipe.js", "nav-moves.css", "galaxy-zoom.js", "shop-scan.css", "shop-scan-core.js", "shop-scan.js", "store-picks-core.js", "store-picks.js", "own-entries.js", "shop-plan-core.js", "shop-plan.js", "shop-plan.css", "store-picks.css", "seller-zone.css", "seller-zone-data.js", "seller-zone-core.js", "seller-zone.js", "grocery-hunt-core.js", "grocery-hunt.js", "grocery-hunt.css", "name-estimate-core.js", "ingredient-core.js", "food-policy-core.js", "food-knowledge-core.js", "food-assess-core.js", "food-engine-core.js", "spike-core.js", "spike-catch.js", "spike-catch.css", "label-photos-core.js", "label-photos.js", "label-photos.css", "food-card-core.js", "food-card.css", "living-bubbles.js", "living-bubbles.css", "glass-nav.css", "misty-panels.css", "misty-bloom.js"].some(s => url.pathname.endsWith("/" + s))) {
    e.respondWith(fetch(req, {cache:"no-cache"}).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }).catch(() => caches.match(req).then(r => r || Response.error())));
    return;
  }
  /* Oct 23 (Seller Zone photos): a product photo never changes under its name, so once loaded it comes from the phone, also
     offline and after updates (the cache name starts with lowispike-steps, which activate keeps). No repeat downloads. */
  if (url.pathname.indexOf("/seller-zone-img/") >= 0) {
    e.respondWith(caches.open("lowispike-steps-seller-img").then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }))).catch(() => fetch(req)));
    return;
  }
  if (req.mode === "navigate" && !isShell(url)) return;
  if (isPage(req, url)) {
    /* Oct 21 (open instantly): still network first, but a launch no longer waits on a slow or half-dead connection. If the network
       has not answered within PAGE_WAIT, the copy of the page saved on the phone opens, and the network answer still refreshes that
       copy in the background. The opened page names its own build, so the usual "New version" check takes it from there. A tapped
       update (?v=<build>) and a first launch with nothing saved still wait for the network. */
    const net = fetch(url.pathname + url.search, {cache:"no-cache", credentials:"same-origin"}).then(stampPage).then(res => {
      if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(scopePath, cp)); }
      return res;
    });
    const saved = () => caches.match(scopePath).then(r => r || Response.error());
    if (url.searchParams.has("v")) { e.respondWith(net.catch(saved)); return; }
    e.respondWith(caches.match(scopePath).then(hit => {
      if (!hit) return net.catch(saved);
      let t = 0; const slow = new Promise(r => { t = setTimeout(() => r(null), PAGE_WAIT); });
      return Promise.race([net.catch(() => null), slow]).then(res => {
        clearTimeout(t);
        if (res && res.ok) return res;
        try { e.waitUntil(net.catch(() => {})); } catch (x) {}
        return hit;
      });
    }).catch(() => net.catch(saved)));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok && STATIC.some(s => url.pathname.endsWith("/" + s))) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
const N1P_FN = "https://vnfwmifmsfecascwaody.supabase.co/functions/v1/n1-push";
const N1P_PUB = "BLNmn2O2yRpMS7JukbXrgnYu157fNv317XnjgtVWzEyLuWMBupmX4Q1a0wid-4r6p0uGk8sVI0gMdl2uzlAREsA";
if(typeof importScripts==="function")importScripts("world-home-core.js","herb-config.js","herb-core.js","herb-tamagotchi-core.js");
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
/* 25 Oct 2026 (phone notifications, four pillars): the push handler shows what the server sends. Since Oct 14 it ignored
   every payload and stayed silent unless a herb reminder was due, so no companion push was ever seen (and iOS takes the
   subscription away after silent pushes). Payload from n1-push: {t: title, b: body, q: where a tap goes, tag}. A push
   without a payload still runs the herb reminder, and if that has nothing either, shows a plain line instead of nothing. */
self.addEventListener("push", e => {
  let d = null;
  try { d = e.data ? e.data.json() : null; } catch (x) { d = null; }
  if (d && typeof d.t === "string" && d.t) {
    const tag = typeof d.tag === "string" && d.tag ? d.tag.slice(0, 40) : "lowi-n1";
    e.waitUntil(self.registration.showNotification(d.t.slice(0, 80), {
      body: typeof d.b === "string" ? d.b.slice(0, 240) : "", tag, renotify: true,
      icon: "icon-192.png", badge: "icon-192.png", lang: typeof d.l === "string" ? d.l : undefined,
      data: { q: typeof d.q === "string" ? d.q.slice(0, 20) : "", tab: d.q === "foryou" ? "foryou" : "" }
    }));
    return;
  }
  e.waitUntil(herbReminderClaim(Date.now()).then(config => {
    if (config) return self.registration.showNotification(config.name || "Your companion", { body: self.LowiHerbTamagotchiCore.reminder(config), icon: "icon-192.png", badge: "icon-192.png", tag: "lowi-herb-daily", data: { q: "", herbHome: true } });
    /* fallback: never a silent push */
    return self.registration.showNotification("LOWiSPIKE", { body: "\u{1FAE7}", tag: "lowi-n1", icon: "icon-192.png", badge: "icon-192.png", data: { q: "home" } });
  }).catch(() => self.registration.showNotification("LOWiSPIKE", { body: "\u{1FAE7}", tag: "lowi-n1", icon: "icon-192.png", data: { q: "home" } })));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const d = e.notification.data || {}, q = typeof d.q === "string" ? d.q : "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if ("focus" in c) {
        try { c.postMessage(d.herbHome ? { n1go: "", herbHome: true } : { n1go: q }); } catch (x) {}
        return c.focus();
      }
    }
    /* cold start: keep where the push wanted to go (before 25 Oct this always opened ?herb=1 and lost it) */
    return self.clients.openWindow(self.registration.scope + (d.herbHome ? "?herb=1" : q ? "?n1go=" + encodeURIComponent(q) : ""));
  }));
});
self.addEventListener("pushsubscriptionchange", e => {
  const k = N1P_PUB.replace(/-/g, "+").replace(/_/g, "/"), r = atob(k + "=".repeat((4 - k.length % 4) % 4)), key = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) key[i] = r.charCodeAt(i);
  e.waitUntil(self.registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: key}).then(sub =>
    fetch(N1P_FN, {method: "POST", headers: {"Content-Type": "text/plain;charset=UTF-8"}, body: JSON.stringify({a: "save", sub: sub.toJSON(), st: {}})})).catch(() => {}));
});

