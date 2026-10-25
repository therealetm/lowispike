/* LOWiSPIKE rubberband.js (25 Oct 2026): the iOS overscroll rubber band, shared by every surface that can be dragged past an edge.
   Emmanuel's TikTok ("Why does iOS feel so nice to use"): the stretch is a hyperbola, not a log and not a straight 1/3 factor:
     offset = (1 - 1 / (x * c / d + 1)) * d
   x = how far the finger went past the edge, d = the size of the screen or container on that axis, c = 0.55 (Apple's constant).
   Near the edge it follows the finger at c (0.55); the further you pull, the less it follows, and it can never pass d (one screen).
   inverse() turns a stretched position back into finger distance, so grabbing something that is still stretched does not jump. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof root === 'object') root.LowiRubber = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';
  const C = 0.55;
  function offset(x, d, c) {
    c = c == null ? C : c;
    if (!x || !(d > 0)) return 0;
    const a = Math.abs(x), o = (1 - 1 / (a * c / d + 1)) * d;
    return x < 0 ? -o : o;
  }
  /* the finger distance that gives this stretch (offset must stay inside (-d, d)) */
  function inverse(o, d, c) {
    c = c == null ? C : c;
    if (!o || !(d > 0)) return 0;
    const a = Math.min(Math.abs(o), d * 0.999), x = a * d / (c * (d - a));
    return o < 0 ? -x : x;
  }
  /* a value that may only live in [min, max]: inside it is untouched, outside it is pulled back by the rubber band */
  function clamp(v, min, max, d, c) {
    if (min > max) { const t = min; min = max; max = t; }
    if (v < min) return min + offset(v - min, d, c);
    if (v > max) return max + offset(v - max, d, c);
    return v;
  }
  /* the raw (finger) value that clamp() turns into this displayed value: lets a new drag start where the stretched thing is */
  function unclamp(v, min, max, d, c) {
    if (min > max) { const t = min; min = max; max = t; }
    if (v < min) return min + inverse(v - min, d, c);
    if (v > max) return max + inverse(v - max, d, c);
    return v;
  }
  return { C, offset, inverse, clamp, unclamp };
});
