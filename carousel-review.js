/* LOWiSPIKE · look through the picked carousel pictures before posting (8 Nov 2026).
   Emmanuel: "when I uploaded the carousels, I wasn't able to scroll through them ... I needed to be a little bit more bigger so I can scroll
   through them, see if I like it, see if the text is right, which one I want to delete. I wasn't able to swipe right or swipe left".
   The strip in New post scrolls sideways (foryou-rail.css); a tap on a picture opens all of them full size, swipe left and right,
   "n / total", and Entfernen removes the one you are looking at (it presses that picture's own × in the strip, so the post logic is
   unchanged). */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiCarouselReview) return;
  const H = D.documentElement;
  const L = (en, de) => ((H.lang || 'de').slice(0, 2) === 'en' ? en : de);
  let ov = null, at = 0;
  const thumbs = () => Array.from(D.querySelectorAll('#trCompose .tr-strip .tr-thumbsm'));
  function close() { if (ov) { ov.remove(); ov = null; } }
  function paint(i) {
    const list = thumbs(); if (!list.length) { close(); return; }
    at = Math.max(0, Math.min(i, list.length - 1));
    if (!ov) {
      ov = D.createElement('div'); ov.className = 'crv-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', L('Your pictures', 'Deine Bilder'));
      D.body.appendChild(ov);
    }
    ov.innerHTML = '<div class="crv-top"><span class="crv-n">' + (at + 1) + ' / ' + list.length + '</span><button type="button" class="crv-x" aria-label="' + L('Close', 'Schließen') + '">×</button></div>' +
      '<div class="crv-tr">' + list.map((im, k) => '<img src="' + im.getAttribute('src') + '" alt="' + (k + 1) + '">').join('') + '</div>' +
      '<div class="crv-bot"><div class="crv-dots">' + list.map((x, k) => '<i' + (k === at ? ' class="on"' : '') + '></i>').join('') + '</div><button type="button" class="crv-del">' + L('Remove this one', 'Dieses entfernen') + '</button></div>';
    const tr = ov.querySelector('.crv-tr');
    tr.scrollLeft = at * tr.clientWidth;
    tr.addEventListener('scroll', () => {
      const k = Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)); if (k === at) return; at = k;
      ov.querySelector('.crv-n').textContent = (at + 1) + ' / ' + list.length;
      ov.querySelectorAll('.crv-dots i').forEach((d, j) => d.classList.toggle('on', j === at));
    }, { passive: true });
  }
  D.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    const im = t.closest('#trCompose .tr-strip .tr-thumbsm');
    if (im) { e.preventDefault(); paint(thumbs().indexOf(im)); return; }
    if (!ov || !ov.contains(t)) return;
    if (t.closest('.crv-x')) { close(); return; }
    if (t.closest('.crv-del')) {
      const x = D.querySelectorAll('#trCompose .tr-strip .tr-phx')[at]; if (x) x.click();
      setTimeout(() => paint(at), 60);
    }
  });
  D.addEventListener('keydown', e => { if (ov && e.key === 'Escape') close(); });
  W.LowiCarouselReview = { open: paint, close };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
