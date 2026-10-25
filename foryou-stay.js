/* 25 Oct 2026 (Emmanuel: "I keep losing the for you page"): iOS reloads the Home Screen app after a trip to TikTok or the camera,
   and the app then opened on Home, with Community on its first tab (Room). Now, when he left the app while on For You less than
   30 minutes ago, it opens on For You again, at the post he was looking at. A link (#...) still wins, and after 30 minutes the
   usual first-tab rule applies. Stored on this device only (lowi.* keys stay out of the account backup). */
(function (root) {
  'use strict';
  const KEY = 'lowi.fystay.v1', MAX = 30 * 60000;
  /* -> the post id to scroll to ('' = top of For You), or null when the app should open as usual */
  function resume(st, now, hash) {
    if (!st || typeof st !== 'object' || !st.fy || typeof st.at !== 'number') return null;
    if (hash && String(hash).length > 1) return null;
    if (now - st.at > MAX || st.at - now > 60000) return null;
    return typeof st.id === 'string' ? st.id : '';
  }
  const api = { resume, KEY, MAX };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  const W = root, D = root.document;
  W.LowiForYouStay = api;
  const tabOn = () => { const t = D.getElementById('tab-foryou'); return !!(t && t.classList.contains('active')); };
  const onFy = () => { const R = W.LowiRoomsUI; return tabOn() && !!(R && R.view && R.view() === 'fy'); };
  function topId() {
    const f = D.getElementById('fyFeed'); if (!f) return '';
    const y = f.scrollTop; let best = '';
    for (const s of f.querySelectorAll('.fy-slide[data-id]')) { if (s.offsetTop + s.offsetHeight / 2 > y) { best = s.dataset.id; break; } }
    return best;
  }
  let restoring = false;
  function save() {
    if (restoring) return;
    try { localStorage.setItem(KEY, JSON.stringify({ fy: onFy() ? 1 : 0, id: onFy() ? topId() : '', at: Date.now() })); } catch (e) { }
  }
  D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'hidden') save(); });
  W.addEventListener('pagehide', save);
  setInterval(() => { if (D.visibilityState !== 'hidden') save(); }, 4000); /* iOS can end the app without either event */
  /* the same inside one visit: back in Community within 30 minutes of leaving it from For You, For You again (community-tab-order
     asks back() before it applies the first-tab rule) */
  let lastView = '', lastSeen = 0;
  setInterval(() => { if (tabOn() && W.LowiRoomsUI && W.LowiRoomsUI.view) { lastView = W.LowiRoomsUI.view() || 'room'; lastSeen = Date.now(); } }, 800);
  api.back = () => lastView === 'fy' && Date.now() - lastSeen < MAX;
  function ready() {
    const g = D.getElementById('r2gate');
    if (g && g.offsetParent !== null) return false;
    if (D.documentElement.classList.contains('gate-up') || D.documentElement.classList.contains('gate-boot')) return false;
    return !!(W.LowiRoomsUI && W.LowiRoomsUI.openOn && typeof W.goTab === 'function');
  }
  function scrollTo(id) {
    const f = D.getElementById('fyFeed'); if (!f) return false;
    if (!id) return true;
    const s = f.querySelector('.fy-slide[data-id="' + (W.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (!s) return false;
    f.scrollTop = s.offsetTop; return true;
  }
  function restore() {
    let st = null; try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
    const id = resume(st, Date.now(), location.hash);
    if (id === null) return;
    restoring = true;
    let k = 0, touched = false, wasLive = false, placed = false;
    const stop = () => { touched = true; };
    const go = () => {
      k++;
      if (!ready()) { if (k < 80) setTimeout(go, 250); else restoring = false; return; }
      if (!onFy()) { try { W.LowiRoomsUI.openOn('fy'); } catch (e) { } setTimeout(place, 600); return; }
      place();
    };
    const place = () => {
      k++;
      const f = D.getElementById('fyFeed');
      if (f && !f.dataset.fystay) { f.dataset.fystay = '1'; ['touchstart', 'wheel', 'pointerdown'].forEach(e => f.addEventListener(e, stop, { passive: true })); }
      const live = !!(W.LOWI_CLOUD && W.LOWI_CLOUD.live && W.LOWI_CLOUD.live());
      if (!touched && onFy() && (!placed || (live && !wasLive))) { if (scrollTo(id)) { placed = true; wasLive = live; } }
      if (touched || (placed && wasLive) || k > 120) { restoring = false; return; }
      setTimeout(place, 300);
    };
    setTimeout(go, 400);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', restore); else restore();
})(typeof window !== 'undefined' ? window : globalThis);
