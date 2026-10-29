/* LOWiSPIKE · Circle games bar (29 Oct 2026, owner request on the call).
   Emmanuel: "schmeißen wir die [Shuffle und Swipe] einfach bei Circle rein ... eine Untermenüleiste machen, so wie beim
   Supermarkt ... wenn man auf Circle drückt, kann man dann ein Spiel auswählen", "ohne dass man das Gefühl hat, es öffnet neue
   Fenster", "Ruhezeit · Updates bleiben still ... kannst du raushauen, und dann kann da das sein, dass man auf Shuffle drückt",
   "Billard, Mischen und Swipen zusammen in ein Spiele-Menü" and "der Freundesbaum kommt auch in das Menü".

   So the Circle view gets one menu bar (the Spiele bar) in the strip where the quiet-hours line sat, built like the Supermarkt bar:
     Billard (the Circle room itself, the default) · Mischen · Swipen · Freundesbaum.
   Mischen and Swipen are the Kochen games; they rise in a panel right under the bar while the Circle header and the bar stay put
   and stay tappable, so it never feels like a new window. The Freundesbaum sits in the same spot. Tapping Billard (or any Circle
   tab, or back) closes it again. Kochen's own Mischen | Swipen switch and its title row are hidden there, the bar replaces them. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiCircleGames) return;
  const H = D.documentElement;
  const li = () => { const l = (H.lang || (W.localStorage && localStorage.getItem('lowispike.lang')) || 'de').slice(0, 2); return l === 'en' ? 0 : l === 'es' ? 2 : 1; };
  const L = (en, de, es) => [en, de, es][li()];
  const GAMES = [
    { id: 'billard', ic: '\uD83C\uDFB1', t: () => L('Billiards', 'Billard', 'Billar') },
    { id: 'mischen', ic: '\uD83D\uDD00', t: () => L('Shuffle', 'Mischen', 'Mezclar'), view: 'shuffle' },
    { id: 'swipen', ic: '\uD83C\uDCCF', t: () => L('Swipe', 'Swipen', 'Deslizar'), view: 'swipe' },
    { id: 'baum', ic: '\uD83C\uDF33', t: () => L('Friends tree', 'Freundesbaum', '\u00C1rbol') }
  ];
  let cur = 'billard', busy = false;

  const tab = () => { try { if (W.LowiHost && LowiHost.tab) return LowiHost.tab(); } catch (e) { } const a = D.querySelector('#main>.tab.active'); return a ? a.id.replace('tab-', '') : ''; };
  const go = t => { try { if (typeof W.goTab === 'function') W.goTab(t); } catch (e) { } };
  const community = () => D.getElementById('tab-foryou');
  /* the Circle view: Community open on its Circle tab and no chat thread on top */
  function circleOn() {
    const c = community(); if (!c || !c.classList.contains('active')) return false;
    let t = ''; try { t = W.LowiRoomsUI && LowiRoomsUI.tab ? LowiRoomsUI.tab() : ''; } catch (e) { }
    if (t !== 'room') return false;
    const p = D.getElementById('cmPaneChat');
    return !!p && !p.hasAttribute('data-room');
  }
  /* a Circle game panel (Kochen rising over Circle) */
  function gameOn() {
    if (cur !== 'mischen' && cur !== 'swipen') return false;
    if (tab() !== 'shelf') return false;
    const c = community();
    return !!c && c.classList.contains('holo-under');
  }
  const treeOv = () => D.querySelector('.cr-ov.cr-ov-tree');

  function barHTML() {
    return GAMES.map(g => '<button type="button" class="csp-tab" role="tab" data-csp="' + g.id + '" aria-selected="' + (g.id === cur) + '"><span aria-hidden="true">' + g.ic + '</span><b>' + g.t() + '</b></button>').join('');
  }
  function ensureBar() {
    const pane = D.getElementById('cmPaneChat'); if (!pane) return null;
    let bar = D.getElementById('cspBar');
    if (!bar || bar.parentElement !== pane) {
      if (bar) bar.remove();
      bar = D.createElement('nav');
      bar.id = 'cspBar'; bar.className = 'csp-bar'; bar.setAttribute('role', 'tablist');
      const room = D.getElementById('cpRoom'), st = D.getElementById('csStatus');
      if (room && room.parentElement === pane) pane.insertBefore(bar, room);
      else if (st && st.parentElement === pane) st.after(bar);
      else pane.insertBefore(bar, pane.firstChild ? pane.firstChild.nextSibling : null);
    }
    bar.setAttribute('aria-label', L('Games', 'Spiele', 'Juegos'));
    const key = li() + ':' + cur;
    if (bar.dataset.k !== key) { bar.innerHTML = barHTML(); bar.dataset.k = key; }
    return bar;
  }
  function measure(bar) {
    if (!bar) return;
    const r = bar.getBoundingClientRect();
    if (r.height > 4) H.style.setProperty('--csp-top', Math.round(r.bottom + 6) + 'px');
  }
  function inlineTree() {
    const ov = treeOv(); if (!ov) return false;
    if (!ov.classList.contains('csp-inline')) { ov.classList.add('csp-inline'); ov.setAttribute('aria-modal', 'false'); }
    return true;
  }
  function closeTree() {
    const ov = treeOv();
    if (ov && ov.classList.contains('csp-inline')) { try { W.LowiCellRoom && LowiCellRoom.closeTree ? LowiCellRoom.closeTree(true) : ov.remove(); } catch (e) { ov.remove(); } }
  }

  function sync() {
    if (busy) return;
    const circle = circleOn(), game = gameOn();
    if (cur === 'baum' && (!circle || !inlineTree())) { if (!circle) closeTree(); cur = 'billard'; }
    if ((cur === 'mischen' || cur === 'swipen') && !game) cur = 'billard';
    H.classList.toggle('csp-circle', circle || game);
    H.classList.toggle('csp-game', game);
    H.classList.toggle('csp-tree', circle && cur === 'baum');
    if (circle || game) { const bar = ensureBar(); if (circle) measure(bar); watchPane(); }
    else { const bar = D.getElementById('cspBar'); if (bar && bar.dataset.k !== li() + ':billard') { bar.innerHTML = barHTML(); bar.dataset.k = li() + ':billard'; } }
  }
  let watched = null;
  function watchPane() {
    const pane = D.getElementById('cmPaneChat');
    if (!pane || pane === watched) return;
    watched = pane;
    try { new MutationObserver(() => { if (!D.getElementById('cspBar') || D.getElementById('cspBar').parentElement !== watched) soon(); }).observe(pane, { childList: true }); } catch (e) { }
  }
  let raf = 0;
  const soon = () => { if (raf) return; raf = (W.requestAnimationFrame || setTimeout)(() => { raf = 0; sync(); }); };

  function select(id) {
    const g = GAMES.find(x => x.id === id); if (!g) return;
    busy = true;
    try {
      if (id !== 'baum') closeTree();
      if (id === 'billard' || id === 'baum') {
        if (tab() === 'shelf') go('foryou');
        cur = id;
        if (id === 'baum') {
          try { if (W.LowiCellRoom && LowiCellRoom.openTree) LowiCellRoom.openTree(); } catch (e) { }
          if (!inlineTree()) cur = 'billard';
        }
      } else {
        const bar = D.getElementById('cspBar'); if (bar && tab() !== 'shelf') measure(bar);
        cur = id;
        try { if (W.LowiFood && LowiFood.setView) LowiFood.setView(g.view); else if (typeof W.ckView === 'function') W.ckView(g.view); } catch (e) { }
        H.classList.add('csp-game', 'csp-circle');
        if (tab() !== 'shelf') go('shelf');
        try { if (W.LOWI_SHELF && LOWI_SHELF.showTab) LOWI_SHELF.showTab(); } catch (e) { }
        const sb = D.getElementById('shBody'); if (sb) sb.scrollTop = 0;
        reveal(id);
      }
    } finally { busy = false; }
    sync();
    const bar = D.getElementById('cspBar'); if (bar) { bar.dataset.k = ''; ensureBar(); }
  }

  /* 29 Oct sweep: on a short phone (iPhone SE) the game's own buttons (Swipen's Rückgängig row, Mischen's main button) opened
     under the floating bottom back button (#lwBX) until the panel was scrolled by hand. Once the game has drawn, scroll the
     panel just enough that its main control ends above the button. Stops as soon as the user scrolls or switches game. */
  const MAIN = { mischen: '#r5Go', swipen: '.r3k-b' };
  /* how far to scroll so a control whose bottom is at ctrlBottom ends gap px above a button whose top is at bxTop */
  function need(ctrlBottom, bxTop, gap) {
    if (!(ctrlBottom > 0) || !(bxTop > 0)) return 0;
    const d = Math.ceil(ctrlBottom - (bxTop - (gap == null ? 8 : gap)));
    return d > 0 ? d : 0;
  }
  function reveal(id) {
    const sel = MAIN[id]; if (!sel || !D) return;
    const sb0 = D.getElementById('shBody');
    let user = false;
    const mark = () => { user = true; };
    /* Kochen redraws (and resets its scroll) a few times while the game opens, so check again until it has settled;
       a finger or wheel on the panel means the user is scrolling: leave it from then on */
    if (sb0 && sb0.addEventListener) ['touchstart', 'pointerdown', 'wheel'].forEach(ev => sb0.addEventListener(ev, mark, { passive: true, once: true }));
    const step = () => {
      if (user || cur !== id || tab() !== 'shelf') return;
      const sb = D.getElementById('shBody'), bx = D.getElementById('lwBX');
      if (!sb || !bx) return;
      const bs = W.getComputedStyle ? W.getComputedStyle(bx) : null, br = bx.getBoundingClientRect();
      if (!br.width || (bs && (bs.display === 'none' || bs.visibility === 'hidden' || +bs.opacity === 0))) return;
      let bottom = 0;
      D.querySelectorAll('#tab-shelf ' + sel).forEach(b => { const r = b.getBoundingClientRect(); if (r.width > 4 && r.height > 4) bottom = Math.max(bottom, r.bottom); });
      const d = need(bottom, br.top);
      if (d > 0) sb.scrollTop = Math.min(sb.scrollTop + d, Math.max(0, sb.scrollHeight - sb.clientHeight));
    };
    /* 29 Oct 03:02 check: on a slow open the back button only fades in after ~3.9 s, so a check that ended at 3 s always found it
       hidden and never scrolled (Rückgängig stayed under it, a tap on Undo closed the game). Keep checking until 7 s. */
    [200, 600, 1200, 2000, 3000, 4000, 5000, 7000].forEach(t => setTimeout(step, t));
    /* Under load the button settled even later than 7 s. It shows by getting its class changed (on / bx-settle off), so also
       check again after each class change of the button (its fade-in can take over a second on a busy phone), for up to 15 s. */
    try {
      const bx0 = D.getElementById('lwBX');
      if (bx0 && W.MutationObserver) {
        const mo = new W.MutationObserver(() => [260, 700, 1400, 2500].forEach(t => setTimeout(step, t)));
        mo.observe(bx0, { attributes: true, attributeFilter: ['class'] });
        setTimeout(() => { try { mo.disconnect(); } catch (e) { } }, 15000);
      }
    } catch (e) { }
  }

  /* taps */
  D.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null; if (!t) return;
    const b = t.closest('#cspBar [data-csp]');
    if (b) { e.preventDefault(); e.stopPropagation(); if (b.dataset.csp !== cur || b.dataset.csp === 'billard') select(b.dataset.csp); return; }
    /* a tap on the Circle header while a game panel is up: back to Circle first, then the tap does what it always does */
    if (H.classList.contains('csp-game') && tab() === 'shelf' && t.closest('#tab-foryou')) { busy = true; cur = 'billard'; go('foryou'); busy = false; soon(); }
    /* Kochen only redraws itself fully while it is the open tab; inside Circle we redraw after a source or category tap */
    if (H.classList.contains('csp-game') && t.closest('#ckBar [data-ck]')) setTimeout(() => { try { if (tab() === 'shelf' && W.LOWI_SHELF && LOWI_SHELF.showTab) LOWI_SHELF.showTab(); } catch (er) { } }, 0);
  }, true);

  function boot() {
    try {
      new MutationObserver(soon).observe(H, { attributes: true, attributeFilter: ['class', 'lang'] });
      const main = D.getElementById('main') || D.body;
      /* only the attributes that change the view: a tab opening (class on #main>.tab), a Community tab (aria-selected), a chat thread (data-room) */
      new MutationObserver(soon).observe(main, { attributes: true, subtree: true, attributeFilter: ['aria-selected', 'data-room'] });
      const mo = new MutationObserver(soon);
      D.querySelectorAll('#main>.tab').forEach(t => mo.observe(t, { attributes: true, attributeFilter: ['class'] }));
      new MutationObserver(soon).observe(D.body, { childList: true });
    } catch (e) { }
    W.addEventListener('resize', soon);
    setInterval(() => { if (H.classList.contains('csp-circle') || circleOn()) sync(); }, 1500);
    sync();
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
  W.LowiCircleGames = { select, sync, current: () => cur, circleOn, gameOn, GAMES, need };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
