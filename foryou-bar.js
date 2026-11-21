/* LOWiSPIKE · For You: the circle row (Post, My posts, Saved, Create content, Affiliate) comes back on the way up (21 Nov 2026).
   Emmanuel: "No matter how low I swipe ... the moment I swipe up, that bar should appear ... it's annoying to scroll back up too much."
   The row is sticky at the top of #fyFeed (foryou-ig.css section 5). Scrolling down past it hides it; any scroll up shows it again.
   One delegated, passive listener: #fyFeed is rebuilt on every render, so nothing is bound to the node itself. */
(function () {
  if (window.__fyBar) return; window.__fyBar = true;
  let lastY = 0, lastEl = null, acc = 0;
  function onScroll(e) {
    const f = e.target; if (!f || f.id !== "fyFeed") return;
    const bar = f.querySelector(".fy-tools"); if (!bar) return;
    const y = f.scrollTop, h = bar.offsetHeight || 100;
    if (f !== lastEl) { lastEl = f; lastY = y; acc = 0; }
    const d = y - lastY; lastY = y;
    if (y <= 2) { bar.classList.remove("fyb-hide", "fyb-pin"); acc = 0; return; }
    bar.classList.add("fyb-pin");
    if ((acc > 0) !== (d > 0)) acc = 0;
    acc += d;
    if (acc < -4) bar.classList.remove("fyb-hide");            /* the moment you scroll up: back */
    else if (acc > 8 && y > h) bar.classList.add("fyb-hide");   /* scrolling down past it: away */
  }
  document.addEventListener("scroll", onScroll, {capture: true, passive: true});
  window.LowiFyBar = {onScroll};
})();
