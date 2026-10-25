/* Injected before app scripts by tools/heat/heat-probe.cjs. Counts only; every wrapper calls straight through. */
(function () {
  'use strict';
  if (window.__heat) return;
  const H = window.__heat = { raf: 0, rafBy: {}, frames: 0, timerCb: 0, timerBy: {}, draw2d: 0, draw2dBy: {}, glDraw: 0, glBy: {}, mut: 0, intervals: new Set(), audio: [], wake: 0 };
  function caller() {
    const st = (new Error().stack || '').split('\n');
    for (let i = 2; i < st.length; i++) { const m = st[i].match(/\/([\w.-]+\.(?:js|html))(?:\?[^:]*)?:(\d+)/); if (m && m[1] !== 'heat-inject.js') return m[1] + ':' + m[2]; }
    return '?';
  }
  const rAF = window.requestAnimationFrame.bind(window);
  let lastFrameT = -1;
  window.requestAnimationFrame = function (cb) {
    const who = caller();
    return rAF(function (t) { H.raf++; H.rafBy[who] = (H.rafBy[who] || 0) + 1; if (t !== lastFrameT) { lastFrameT = t; H.frames++; } return cb(t); });
  };
  const sT = window.setTimeout, sI = window.setInterval, cI = window.clearInterval;
  window.setTimeout = function (f, ms) { if (typeof f !== 'function') return sT.apply(window, arguments); const who = caller(); const a = [].slice.call(arguments, 2); return sT(function () { H.timerCb++; H.timerBy['t ' + who] = (H.timerBy['t ' + who] || 0) + 1; return f.apply(this, a); }, ms); };
  window.setInterval = function (f, ms) { if (typeof f !== 'function') return sI.apply(window, arguments); const who = caller() + ' @' + (ms | 0); const a = [].slice.call(arguments, 2); const id = sI(function () { H.timerCb++; H.timerBy['i ' + who] = (H.timerBy['i ' + who] || 0) + 1; return f.apply(this, a); }, ms); H.intervals.add(id); return id; };
  window.clearInterval = function (id) { H.intervals.delete(id); return cI(id); };
  const C2 = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (C2) ['drawImage', 'fillRect', 'clearRect', 'fill', 'stroke', 'fillText', 'putImageData', 'strokeRect'].forEach(n => { const f = C2[n]; C2[n] = function () { H.draw2d++; if (n === 'clearRect' || n === 'drawImage') { const w = caller(); H.draw2dBy[w] = (H.draw2dBy[w] || 0) + 1; } return f.apply(this, arguments); }; });
  [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(G => { if (!G) return; ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'].forEach(n => { const f = G.prototype[n]; if (!f) return; G.prototype[n] = function () { H.glDraw++; const w = caller(); H.glBy[w] = (H.glBy[w] || 0) + 1; return f.apply(this, arguments); }; }); });
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const W = function () { const c = new AC(...arguments); H.audio.push(c); return c; }; W.prototype = AC.prototype; window.AudioContext = W; if (window.webkitAudioContext) window.webkitAudioContext = W; }
  try { if (navigator.wakeLock) { const rq = navigator.wakeLock.request.bind(navigator.wakeLock); navigator.wakeLock.request = function () { H.wake++; return rq.apply(null, arguments); }; } } catch (e) { }
  function mo() { new MutationObserver(l => { H.mut += l.length; }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true }); }
  if (document.documentElement) mo();
  H.snap = function () {
    const cv = [...document.querySelectorAll('canvas')];
    let mp = 0; const list = [];
    cv.forEach(c => { const r = c.getBoundingClientRect(); const vis = r.width > 0 && r.height > 0 && getComputedStyle(c).visibility !== 'hidden'; mp += c.width * c.height; list.push((c.id || c.className || 'canvas').toString().slice(0, 24) + ' ' + c.width + 'x' + c.height + ' css ' + Math.round(r.width) + 'x' + Math.round(r.height) + (vis ? '' : ' hidden')); });
    let running = 0; const anim = {};
    try { document.getAnimations().forEach(a => { if (a.playState === 'running') { running++; const t = a.effect && a.effect.target; const k = (a.animationName || a.transitionProperty || 'waapi') + ' ' + (t ? (t.id ? '#' + t.id : '.' + ((t.className && t.className.baseVal !== undefined ? t.className.baseVal : t.className) || t.tagName).toString().split(' ')[0]) : ''); anim[k] = (anim[k] || 0) + 1; } }); } catch (e) { }
    let backdrop = 0; const bdList = [];
    document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e); const b = s.backdropFilter || s.webkitBackdropFilter; if (b && b !== 'none') { const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && s.display !== 'none') { backdrop++; if (bdList.length < 12) bdList.push((e.id ? '#' + e.id : '.' + String(e.className).split(' ')[0]) + ' ' + b); } } });
    return {
      raf: H.raf, rafBy: Object.assign({}, H.rafBy), frames: H.frames, timerCb: H.timerCb, timerBy: Object.assign({}, H.timerBy), liveIntervals: H.intervals.size,
      draw2d: H.draw2d, draw2dBy: Object.assign({}, H.draw2dBy), glDraw: H.glDraw, glBy: Object.assign({}, H.glBy), mut: H.mut,
      canvases: { n: cv.length, mp: +(mp / 1e6).toFixed(2), list }, animations: { running, top: Object.entries(anim).sort((a, b) => b[1] - a[1]).slice(0, 10) },
      backdrop, backdropList: bdList, audio: H.audio.map(c => c.state), wakeLocks: H.wake,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null, nodes: document.getElementsByTagName('*').length
    };
  };
})();
