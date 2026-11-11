/* LOWiSPIKE Nibblo idea card (browser). 11 Nov 2026 (Emmanuel): the bot's meal ideas left For You. They arrive as a
 * notification; a tap shows that one idea, with two ways out: cook it or close it.
 *  - open(id): the card for one idea (photo, dish, one line, Cook it). The round bottom button closes it ([data-close]).
 *  - notice(): one small in-app notice per idea, only when nothing else is open; it goes away by itself after 8 s.
 *  - a tapped phone notification (lis-push.js route "nb:<id>") calls open(id).
 * Rules live in nibblo-idea-core.js; dishes in nibblo-core.js. No XP, no sound, no companion speech. */
(function (W) {
  'use strict';
  const D = W.document, C = W.LowiNibbloIdeaCore;
  if (!D || !C || W.LowiNibbloIdea) return;
  const N = () => W.LowiNibblo || null;
  const lang = () => { const l = String(D.documentElement.lang || 'en').slice(0, 2).toLowerCase(); return /^(en|de|es)$/.test(l) ? l : 'en'; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = () => { try { return C.clean(JSON.parse(localStorage.getItem(C.KEY) || '{}')); } catch (e) { return C.clean(null); } };
  const save = s => { try { localStorage.setItem(C.KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } };
  function localImg(id) { try { return typeof FOOD_IMG !== 'undefined' && FOOD_IMG[id] ? FOOD_IMG[id] : ''; } catch (e) { return ''; } } // eslint-disable-line no-undef

  function close() {
    const el = D.getElementById('nbIdea'); if (!el) return;
    el.classList.add('out'); setTimeout(() => { try { el.remove(); } catch (e) { /* gone */ } }, 220);
  }
  function cook(bookId) {
    close();
    setTimeout(() => {
      try { const B = W.LowiBotRecipe; if (B && B.cook && B.cook(bookId)) return; } catch (e) { /* fall through */ }
      try { if (W.LowiP2 && W.LowiP2.open) W.LowiP2.open(bookId, { cook: true }); } catch (e) { /* no recipe page */ }
    }, 240);
  }
  function open(id) {
    const c = C.card(id, lang(), N()); if (!c) return false;
    save(C.seen(state(), c.id)); hideNotice();
    const old = D.getElementById('nbIdea'); if (old) old.remove();
    const l = lang(), el = D.createElement('div');
    el.id = 'nbIdea'; el.className = 'nbi'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', C.word('aria', l)); el.setAttribute('data-noi18n', '');
    const alt = localImg(c.bookId);
    el.innerHTML = '<div class="nbi-card">' +
      '<div class="nbi-ph"><span class="nbi-e" aria-hidden="true">' + esc(c.e) + '</span><img alt="" src="' + esc(c.photo) + '"' + (alt ? ' data-alt="' + esc(alt) + '"' : '') + '></div>' +
      '<p class="nbi-k"><b>' + esc(c.who) + '</b><span class="nbi-tag">' + esc(C.word('bot', l)) + '</span><span>' + esc(c.kicker) + '</span></p>' +
      '<h2 class="nbi-n">' + esc(c.name) + '</h2><p class="nbi-l">' + esc(c.line) + '</p>' +
      '<button type="button" class="nbi-cook" data-nbi-cook="' + esc(c.bookId) + '">' + esc(C.word('cook', l)) + '</button>' +
      '<button type="button" class="nbi-x" data-close aria-label="' + esc(C.word('close', l)) + '">×</button></div>';
    const img = el.querySelector('img');
    img.addEventListener('error', () => { const a = img.getAttribute('data-alt'); if (a && img.src.indexOf(a) < 0) { img.removeAttribute('data-alt'); img.src = a; } else img.remove(); });
    el.addEventListener('click', e => {
      const t = e.target;
      if (t === el || (t.closest && t.closest('.nbi-x'))) { close(); return; }
      const b = t.closest && t.closest('[data-nbi-cook]'); if (b) cook(b.getAttribute('data-nbi-cook'));
    });
    D.body.appendChild(el);
    try { el.querySelector('.nbi-cook').focus({ preventScroll: true }); } catch (e) { /* no focus */ }
    return true;
  }
  D.addEventListener('keydown', e => { if (e.key === 'Escape' && D.getElementById('nbIdea')) close(); });

  /* ---- the small in-app notice ---- */
  let timer = 0;
  function hideNotice() { clearTimeout(timer); const n = D.getElementById('nbNote'); if (n) { n.classList.add('out'); setTimeout(() => { try { n.remove(); } catch (e) { /* gone */ } }, 220); } }
  function busy() {
    try {
      if (D.getElementById('nbIdea') || D.getElementById('nbNote')) return true;
      if (D.querySelector('[aria-modal="true"]:not([hidden]), .sheet.open, .tour-on, .lt-tour, .lisp-card, #r2gate:not([hidden])')) return true;
      const a = D.activeElement; if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return true;
    } catch (e) { return true; }
    return false;
  }
  function notice() {
    if (D.visibilityState && D.visibilityState !== 'visible') return false;
    const k = C.latest(Date.now(), N()); if (!k || !C.fresh(state(), k.id) || busy()) return false;
    const c = C.card(k.id, lang(), N()); if (!c) return false;
    save(C.seen(state(), k.id)); /* shown once, tapped or not */
    const b = D.createElement('button');
    b.type = 'button'; b.id = 'nbNote'; b.className = 'nbn'; b.setAttribute('data-noi18n', ''); b.setAttribute('data-no-bx', '');
    b.setAttribute('aria-label', c.who + ': ' + c.kicker + ', ' + c.name + '. ' + C.word('open', lang()));
    b.innerHTML = '<span class="nbn-e" aria-hidden="true">' + esc(c.e) + '</span><span class="nbn-t"><small>' + esc(c.who) + ' · ' + esc(c.kicker) + '</small><b>' + esc(c.name) + '</b></span>';
    b.addEventListener('click', () => open(k.id));
    D.body.appendChild(b);
    timer = setTimeout(hideNotice, 8000);
    return true;
  }
  function soon() { setTimeout(() => { try { notice(); } catch (e) { /* never in the way */ } }, 6000); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', soon); else soon();
  D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible') soon(); });

  W.LowiNibbloIdea = { open, close, notice };
})(typeof window !== 'undefined' ? window : this);
