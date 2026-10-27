/* Frame-stepper injected into the live app page: every CSS animation/transition is paused and moved by exactly dt per video frame,
   so a slow headless WebKit still gives a smooth, true-timing 30 fps recording of the real app. JS timers + rAF are stepped by Playwright's clock. */
(() => {
  if (window.__p6step) return;
  const S = { t: 0, seen: new WeakMap() };
  window.__p6 = S;
  window.__p6step = (dt) => {
    S.t += dt;
    for (const a of document.getAnimations()) {
      let st = S.seen.get(a);
      if (st === undefined) { st = S.t - dt; S.seen.set(a, st); try { a.pause(); } catch (e) { } }
      if (st === null) continue;
      const local = S.t - st;
      let end = Infinity; try { end = a.effect.getComputedTiming().endTime; } catch (e) { }
      if (isFinite(end) && local >= end) { S.seen.set(a, null); try { a.finish(); } catch (e) { try { a.currentTime = end; } catch (e2) { } } }
      else { try { a.currentTime = local; } catch (e) { } }
    }
    return S.t;
  };
})();
