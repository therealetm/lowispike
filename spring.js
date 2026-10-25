/* LOWiSPIKE spring.js (25 Oct 2026): interruptible damped harmonic springs, the way iOS moves things.
   Emmanuel's TikTok ("Why does iOS feel so nice to use"): a timed animation has a fixed path and length, so grabbing it half way
   throws it away and starts again from zero. A spring only knows where it is, how fast it moves and where it wants to be, so it
   can be grabbed, thrown or sent somewhere else mid-flight and it carries its position and speed over. SwiftUI's presets are
   all springs with different damping; the same presets live here.

   - solve(): the exact closed-form spring (under-, critically and over-damped), so a frame that comes late (power saver,
     a busy phone) lands on the same curve instead of exploding or slowing down.
   - create(): one animated number. to(target, {velocity}) retargets from where it is now, with the speed it has now.
     Finger release speed goes in as velocity. requestAnimationFrame only runs while it moves; at rest it stops completely.
   - prefers-reduced-motion: no movement at all, values jump to the target.
   - glide(): a fling (iOS scroll deceleration 0.998/ms) that hands over to a spring when it runs past an edge.
   - cssVar(): a CSS custom property driven by a spring (the sliding glow of the segmented pills). */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof root === 'object') root.LowiSpring = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  /* response = seconds for one undamped swing (SwiftUI "response"), damping = fraction of critical (1 = no bounce) */
  const PRESETS = {
    standard: { response: 0.55, damping: 0.825 }, /* SwiftUI .spring() */
    smooth: { response: 0.5, damping: 1 },        /* .smooth */
    snappy: { response: 0.5, damping: 0.85 },     /* .snappy */
    bouncy: { response: 0.5, damping: 0.7 },      /* .bouncy */
    sheet: { response: 0.33, damping: 1 },        /* the old apple-ui sheet spring: stiffness 360, damping 38 */
    toggle: { response: 0.35, damping: 0.8 },     /* segmented pills: one small, soft overshoot */
    interactive: { response: 0.3, damping: 0.86 } /* .interactiveSpring */
  };
  function params(o) {
    o = o || {};
    const p = typeof o === 'string' ? PRESETS[o] : (o.preset ? Object.assign({}, PRESETS[o.preset], o) : o);
    const response = Math.max(0.02, +(p && p.response) || PRESETS.standard.response);
    const damping = Math.max(0, p && p.damping != null ? +p.damping : PRESETS.standard.damping);
    const w = TAU / response;
    return { response, damping, w, stiffness: w * w, friction: 2 * damping * w };
  }
  /* exact spring: x0 = distance from the target, v0 = speed (units/s), w = natural frequency (rad/s), z = damping fraction */
  function solve(x0, v0, w, z, t) {
    if (t <= 0) return { x: x0, v: v0 };
    if (z < 1) {
      const wd = w * Math.sqrt(1 - z * z), e = Math.exp(-z * w * t), A = x0, B = (v0 + z * w * x0) / wd;
      const c = Math.cos(wd * t), s = Math.sin(wd * t);
      const x = e * (A * c + B * s);
      const v = e * ((B * wd - z * w * A) * c - (A * wd + z * w * B) * s);
      return { x, v };
    }
    if (z === 1) {
      const e = Math.exp(-w * t), B = v0 + w * x0;
      return { x: e * (x0 + B * t), v: e * (B - w * (x0 + B * t)) };
    }
    const s = w * Math.sqrt(z * z - 1), r1 = -z * w + s, r2 = -z * w - s;
    const c2 = (v0 - r1 * x0) / (r2 - r1), c1 = x0 - c2;
    const e1 = Math.exp(r1 * t), e2 = Math.exp(r2 * t);
    return { x: c1 * e1 + c2 * e2, v: c1 * r1 * e1 + c2 * r2 * e2 };
  }
  /* how far a fling at v (units/s) coasts with iOS's normal deceleration (UIScrollView.DecelerationRate.normal = 0.998 per ms) */
  const DECEL = 0.998, LAMBDA = -Math.log(DECEL) * 1000;
  function project(v, rate) { const l = rate ? -Math.log(rate) * 1000 : LAMBDA; return v / l; }
  function coast(x0, v0, t, rate) { const l = rate ? -Math.log(rate) * 1000 : LAMBDA, e = Math.exp(-l * t); return { x: x0 + v0 / l * (1 - e), v: v0 * e }; }

  function reduced() {
    try { return !!(root && root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  const raf = (root && root.requestAnimationFrame) ? root.requestAnimationFrame.bind(root) : (f => setTimeout(() => f(now()), 16));
  const caf = (root && root.cancelAnimationFrame) ? root.cancelAnimationFrame.bind(root) : clearTimeout;
  function now() { return (root && root.performance && root.performance.now) ? root.performance.now() : Date.now(); }
  let moving = 0;
  function mark(d) { moving = Math.max(0, moving + d); try { const h = root && root.document && root.document.documentElement; if (h) h.classList.toggle('sp-moving', moving > 0); } catch (e) {} }

  /* one animated number */
  function create(opts) {
    opts = opts || {};
    let p = params(opts), x = +opts.value || 0, v = +opts.velocity || 0, target = opts.target != null ? +opts.target : x;
    let restDelta = opts.restDelta != null ? +opts.restDelta : 0.5, restSpeed = opts.restSpeed != null ? +opts.restSpeed : restDelta * 4;
    let id = 0, last = 0, onRest = opts.onRest || null, running = false;
    const onUpdate = opts.onUpdate || function () {};
    function emit() { try { onUpdate(x, v); } catch (e) { console.warn('[spring]', e); } }
    function halt() { if (id) caf(id); id = 0; if (running) { running = false; mark(-1); } }
    function rest() { x = target; v = 0; halt(); emit(); const f = onRest; onRest = null; if (f) try { f(x); } catch (e) { console.warn('[spring]', e); } }
    function frame(t) {
      id = 0;
      const dt = Math.min(0.064, Math.max(0, (t - last) / 1000)); last = t;
      const s = solve(x - target, v, p.w, p.damping, dt); x = target + s.x; v = s.v;
      if (Math.abs(x - target) < restDelta && Math.abs(v) < restSpeed) { rest(); return; }
      emit(); id = raf(frame);
    }
    const api = {
      /* go to target from where it is now, keeping its speed (or the finger's release speed if given) */
      to(t, o) {
        o = o || {};
        target = +t;
        if (o.velocity != null) v = +o.velocity;
        if (o.response != null || o.damping != null || o.preset) p = params(Object.assign({ response: p.response, damping: p.damping }, o));
        if (o.onRest !== undefined) onRest = o.onRest;
        if (reduced() || o.immediate) { rest(); return api; }
        if (Math.abs(x - target) < restDelta && Math.abs(v) < restSpeed) { rest(); return api; }
        if (!running) { running = true; mark(1); last = now(); id = raf(frame); }
        return api;
      },
      /* jump (a finger holding it): the spring stops where it is, nothing is lost */
      set(val, vel) { halt(); x = +val; v = vel != null ? +vel : 0; target = x; emit(); return api; },
      /* grab: stop moving and keep the current position (the finger now owns it) */
      stop() { halt(); target = x; return api; },
      get value() { return x; }, get velocity() { return v; }, get target() { return target; }, get moving() { return running; },
      get params() { return p; }
    };
    return api;
  }

  /* a fling: coasts with iOS deceleration inside [min, max]; past an edge a spring takes over with the speed it had there.
     A fling that starts past an edge (a stretched rubber band) springs straight back. */
  function glide(o) {
    const min = o.min != null ? o.min : -Infinity, max = o.max != null ? o.max : Infinity;
    let x = +o.value || 0, v = +o.velocity || 0, id = 0, last = 0, sp = null, running = false;
    const onUpdate = o.onUpdate || function () {}, rd = o.restDelta != null ? o.restDelta : 0.5;
    const springOpts = o.spring || { response: 0.45, damping: 1 };
    function finish() { if (running) { running = false; mark(-1); } if (o.onRest) try { o.onRest(x); } catch (e) {} }
    function toSpring(t) {
      sp = create(Object.assign({}, springOpts, { value: x, velocity: v, restDelta: rd, onUpdate(nx, nv) { x = nx; v = nv; onUpdate(x, v); } }));
      if (running) { running = false; mark(-1); }
      sp.to(t, { onRest() { finish(); } });
    }
    function frame(t) {
      id = 0;
      const dt = Math.min(0.064, Math.max(0, (t - last) / 1000)); last = t;
      const s = coast(x, v, dt, o.rate); x = s.x; v = s.v;
      if (x < min || x > max) { onUpdate(x, v); toSpring(x < min ? min : max); return; }
      onUpdate(x, v);
      if (Math.abs(v) < rd * 4) { v = 0; if (running) { running = false; mark(-1); } if (o.onRest) try { o.onRest(x); } catch (e) {} return; }
      id = raf(frame);
    }
    const api = { stop() { if (id) caf(id); id = 0; if (sp) sp.stop(); if (running) { running = false; mark(-1); } return x; }, get value() { return x; }, get velocity() { return v; } };
    if (reduced()) { x = Math.min(max, Math.max(min, x)); v = 0; onUpdate(x, 0); finish(); return api; }
    if (x < min || x > max) { running = true; mark(1); toSpring(x < min ? min : max); return api; }
    if (Math.abs(v) < rd * 4) { onUpdate(x, 0); if (o.onRest) o.onRest(x); return api; }
    running = true; mark(1); last = now(); id = raf(frame);
    return api;
  }

  /* a CSS custom property that follows its target on a spring (number only). Taps during the slide retarget it smoothly. */
  function cssVar(el, name, target, o) {
    if (!el || !el.style) return;
    const key = '__sp' + name;
    let s = el[key];
    if (!s) {
      const cur = parseFloat(el.style.getPropertyValue(name));
      s = el[key] = create(Object.assign({ preset: 'toggle' }, o || {}, { value: isFinite(cur) ? cur : +target, restDelta: 0.002, onUpdate(x) { el.style.setProperty(name, String(Math.round(x * 1000) / 1000)); } }));
      if (el.classList) el.classList.add('sp-var');
      if (!isFinite(cur)) { s.set(+target); return s; }
    }
    s.to(+target);
    return s;
  }

  return { PRESETS, params, solve, project, coast, create, glide, cssVar, reduced, get moving() { return moving > 0; } };
});
