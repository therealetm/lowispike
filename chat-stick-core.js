/* chat-stick-core.js (25 Oct 2026, Emmanuel: "when opening the chat room ... it doesn't start from the most recent message,
   then you have to scroll down"). Keeps a chat list on its newest message, like WhatsApp and Telegram:
   - a chat opens stuck to the bottom;
   - while stuck, anything that changes size later (photos and videos loading, link previews, the composer growing, the
     keyboard) puts it back on the bottom before the frame is drawn (ResizeObserver runs after layout, before paint);
   - it lets go only when the user scrolls up (a touch, wheel, pointer or key on the list, or the list scrolled up while its
     size stayed the same); it sticks again once the user is back near the bottom;
   - while let go, the message being read keeps its place on screen when rows above it change (no yank on a new message;
     WebKit has no native scroll anchoring).
   Pure: no app state, works on any element with scrollTop/scrollHeight/clientHeight. window.LowiChatStick.create(list, env). */
(function (W) {
  'use strict';
  const NEAR = 90; /* px from the bottom that still counts as "at the newest message" (same as community-chat.js nearBottom) */
  const GESTURE_MS = 1500;
  function dist(l) { return l.scrollHeight - l.scrollTop - l.clientHeight; }
  function create(list, env) {
    env = env || {};
    const now = env.now || (() => Date.now());
    const RO = env.ResizeObserver === undefined ? (W && W.ResizeObserver) : env.ResizeObserver;
    const s = { stick: true, top: 0, ch: 0, sh: 0, gestureAt: 0, anchor: null, ro: null, seen: new Set(), pins: 0 };
    const rec = () => { s.top = list.scrollTop; s.ch = list.clientHeight; s.sh = list.scrollHeight; };
    const rows = () => { const k = list.children || []; return Array.prototype.slice.call(k); };
    function pin() { s.stick = true; s.anchor = null; const want = list.scrollHeight - list.clientHeight; if (list.scrollTop < want - .5 || list.scrollTop > want + .5) { list.scrollTop = list.scrollHeight; s.pins++; } rec(); }
    /* the first row whose bottom is below the top of the list: what the reader is looking at */
    function saveAnchor() {
      if (s.stick || !list.getBoundingClientRect) { s.anchor = null; return; }
      const top = list.getBoundingClientRect().top;
      for (const r of rows()) { if (!r.getBoundingClientRect) continue; const b = r.getBoundingClientRect(); if (b.height && b.bottom > top + 1) { s.anchor = { el: r, id: r.id || '', y: b.top - top }; return; } }
      s.anchor = null;
    }
    function restoreAnchor() {
      const a = s.anchor; if (s.stick || !a || !list.getBoundingClientRect) return false;
      let el = a.el; if (!el || el.parentNode !== list) { el = a.id && list.querySelector ? list.querySelector('#' + (W && W.CSS && W.CSS.escape ? W.CSS.escape(a.id) : a.id)) : null; if (!el) return false; a.el = el; }
      const d = (el.getBoundingClientRect().top - list.getBoundingClientRect().top) - a.y;
      if (Math.abs(d) >= 1) { list.scrollTop += Math.round(d); }
      rec(); return true;
    }
    /* something changed size: content (photos, previews, new rows) or the list box (keyboard, composer) */
    function changed() { if (s.stick) pin(); else { restoreAnchor(); rec(); } }
    function gesture() { s.gestureAt = now(); }
    function onScroll() {
      const d = dist(list), up = list.scrollTop < s.top - 1, sameBox = list.clientHeight === s.ch && list.scrollHeight === s.sh;
      if (s.stick && d > NEAR && up && (now() - s.gestureAt < GESTURE_MS || sameBox)) s.stick = false;
      else if (!s.stick && d <= NEAR && (now() - s.gestureAt < GESTURE_MS || !up)) s.stick = true;
      rec(); saveAnchor();
    }
    /* after the app re-rendered the rows: watch the new ones, stop watching the gone ones, then settle */
    function rendered() {
      if (s.ro) { const now_ = new Set(rows()); for (const r of s.seen) if (!now_.has(r)) { try { s.ro.unobserve(r); } catch (e) { } s.seen.delete(r); } for (const r of now_) if (!s.seen.has(r)) { try { s.ro.observe(r); } catch (e) { } s.seen.add(r); } }
      changed();
    }
    function watch() {
      if (s.watching) return; s.watching = true;
      if (RO) { try { s.ro = new RO(() => changed()); s.ro.observe(list); } catch (e) { s.ro = null; } }
      if (list.addEventListener) {
        for (const t of ['touchstart', 'touchmove', 'wheel', 'pointerdown', 'keydown']) list.addEventListener(t, gesture, { passive: true });
        list.addEventListener('scroll', onScroll, { passive: true });
        /* a photo or video that loads after its row was measured (some engines size <img> only on decode) */
        list.addEventListener('load', changed, true); list.addEventListener('loadedmetadata', changed, true);
      }
      rendered();
    }
    function stop() { if (s.ro) { try { s.ro.disconnect(); } catch (e) { } s.ro = null; s.seen.clear(); } }
    function release() { s.stick = false; rec(); saveAnchor(); }
    return { el: list, pin, release, changed, rendered, onScroll, gesture, watch, stop, saveAnchor, restoreAnchor, get stuck() { return s.stick; }, get pins() { return s.pins; }, dist: () => dist(list) };
  }
  const api = { create, dist, NEAR };
  if (W) W.LowiChatStick = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : null);
