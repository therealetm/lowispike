// layout + a11y geometry of the Shop from home sheet; run after it is open
module.exports = async function layout(p) {
  return p.evaluate(() => {
    const card = document.querySelector('#wbSheet .wb-card'); if (!card) return { err: 'no sheet' };
    const cr = card.getBoundingClientRect(), out = { card: [Math.round(cr.left), Math.round(cr.top), Math.round(cr.width), Math.round(cr.height)], clipped: [], small: [], offCard: [], dup: [] };
    card.querySelectorAll('*').forEach(e => {
      const r = e.getBoundingClientRect(); if (!r.width) return;
      if (e.closest('.wb-stores') && e.classList.contains('wb-chip')) return;
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto' && e.children.length === 0) out.clipped.push(e.className + ':' + e.textContent.slice(0, 30));
      if (e.matches('button,a,input') && !e.closest('.wb-tick') && (r.height < 43.5 || r.width < 43.5) && !e.classList.contains('wb-tick')) out.small.push(e.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + e.textContent.slice(0, 20));
      if (!e.closest('.wb-scroll') && !e.closest('.wb-toast') && (r.right > cr.right + 1 || r.left < cr.left - 1)) out.offCard.push(e.className);
    });
    const tick = card.querySelector('.wb-tick'); if (tick) { const r = tick.getBoundingClientRect(); out.tick = Math.round(r.width) + '+16'; }
    out.text = card.innerText.slice(0, 1400);
    return out;
  });
};
