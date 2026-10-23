/* ate-this.js (Oct 22 2026, Emmanuel: "I did the shuffle and cooked something. Even when I finish cooking, there's no 'I just ate it'
   and it doesn't log into my 'I just ate it' sub-section. Some people don't even want to watch the cooking tutorial ... There should be
   'I just ate this' or 'I'm going to eat this' right in the main shortcut. It comes with the shuffle and the Tinder swipe, and then it
   logs it automatically.")
   Two buttons for any pick (eBook recipe, Recipes, caught product, community pick):
   - "I just ate this": one tap logs it as eaten NOW through LowiVitalsBridge.logMeal, the one meal path (Fuel count, the meal gap
     ends, 15 XP under the same daily cap, macros, the Log meal slot picked from the clock like Log meal's "now"). The same food in the
     same slot today counts once (mealDup, the fair-play rule). A bar confirms it, lets you change the slot and Undo (log, XP and the gap
     clock go back to how they were).
   - "I'll eat this": planned for later today, never counted as eaten. A book meal goes on today's plan (the old "Add to today" path,
     data-td=addtoday); anything else goes on S.td.later. Both show in the plan with a one-tap "Ate it" that logs it the same way.
   Where: the Shuffle "Your pick" card (decorated here, so the Shuffle code stays untouched), a right swipe (LowiAte.offer from dkDecide),
   the cook-along DONE screen (LowiAte.doneNav, "I just ate this" is the main button). Every old "Add to today" reads "I'll eat this". */
(function () {
  'use strict';
  const W = window, D = document;
  if (W.LowiAte) return;
  const TX = {
    en: { now: 'I just ate this', later: "I'll eat this", ateIt: 'Ate it', eaten: 'Eaten', logged: 'Logged as {s}', dup: 'Already logged today, it counts once',
      undo: 'Undo', undone: 'Removed from your meals', planned: "On today's plan, not eaten yet. Tap Ate it when you eat it.", have: "Already on today's plan.",
      plannedTag: 'Planned · not eaten yet', liked: 'Liked', fail: "Couldn't log it. Try again.", meal: 'Meal',
      breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', rm: 'Remove' },
    de: { now: 'Gerade gegessen', later: 'Ess ich später', ateIt: 'Gegessen', eaten: 'Gegessen ✓', logged: 'Eingetragen als {s}', dup: 'Heute schon eingetragen, zählt einmal',
      undo: 'Rückgängig', undone: 'Aus deinen Mahlzeiten entfernt', planned: 'Für heute geplant, noch nicht gegessen. Tipp auf Gegessen, wenn du es isst.', have: 'Steht schon auf deinem Plan für heute.',
      plannedTag: 'Geplant · noch nicht gegessen', liked: 'Gemerkt', fail: 'Konnte nicht eintragen. Versuch es nochmal.', meal: 'Mahlzeit',
      breakfast: 'Frühstück', lunch: 'Mittag', dinner: 'Abend', snack: 'Snack', rm: 'Entfernen' },
    es: { now: 'Ya me lo comí', later: 'Me lo como luego', ateIt: 'Me lo comí', eaten: 'Comido ✓', logged: 'Registrado como {s}', dup: 'Ya registrado hoy, cuenta una vez',
      undo: 'Deshacer', undone: 'Quitado de tus comidas', planned: 'En tu plan de hoy, aún sin comer. Toca Me lo comí cuando lo comas.', have: 'Ya está en tu plan de hoy.',
      plannedTag: 'Planeado · aún sin comer', liked: 'Guardado', fail: 'No se pudo registrar. Inténtalo de nuevo.', meal: 'Comida',
      breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack', rm: 'Quitar' }
  };
  const SLOTS = ['meal', 'snack']; /* Oct 23: Meal or Snack, the time does the rest (older logs keep their old slot) */
  const lang = () => { let l = ''; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || D.documentElement.lang || localStorage.getItem('lowispike.lang') || 'en'; } catch (e) { l = 'en'; } l = String(l).slice(0, 2); return TX[l] ? l : 'en'; };
  const t = (k, o) => String(TX[lang()][k] || TX.en[k] || k).replace(/\{(\w+)\}/g, (m, x) => (o && o[x] != null ? o[x] : ''));
  /* bug hunt Oct 22: the bar and the plan rows are data-noi18n, so the page translator skips them and a German or Spanish user saw the
     English recipe name. Show the name in the app language; the log keeps the canonical name, so one meal still counts once. */
  const nm = s => { try { return W.LowiLang && LowiLang.t ? LowiLang.t(String(s || '')) || s : s; } catch (e) { return s; } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const V = () => W.LowiVitalsBridge;
  const S = () => { try { return V() && V().state(); } catch (e) { return null; } };
  const slotNow = now => { try { if (W.LowiSpiritCore && LowiSpiritCore.slotFor) return LowiSpiritCore.slotFor(now); } catch (e) { }
    return 'meal'; };

  /* what was picked: a recipe (LowiP2), a caught product or a community pick (the Shuffle pool, fById) */
  function item(id, name) {
    id = String(id || ''); let f = null, r = null;
    try { if (typeof fById === 'function') f = fById(id) || null; } catch (e) { }
    try { if (W.LowiP2 && LowiP2.rec) r = LowiP2.rec(id) || null; } catch (e) { }
    if (f && f.buy) { const p = f.product || {}, v = String(p.verdict || '').toLowerCase();
      return { key: id, t: name || p.name || f.n, code: String(p.code || p.barcode || p.ean || ''), lvl: v === 'low' || v === 'high' ? v : '', product: true }; }
    if (r) { let m; try { m = W.LowiSpiritCore && LowiSpiritCore.macros ? LowiSpiritCore.macros(r) : undefined; } catch (e) { }
      return { key: id, t: name || r.swapName || r.n, r: r.r, macros: m, book: !!r.book, meal: r.c === 'meal' }; }
    if (f) return { key: id, t: name || f.n };
    return name ? { key: id || name, t: name } : null;
  }
  /* already eaten today (any log of the same food, the same rule Log meal blocks a second log with) */
  const ledgerIds = s => new Set(((s && s.ledger) || []).map(e => e && e.eventId).filter(Boolean));
  function eatenToday(it) { try { return !!(it && V() && V().mealDup({ t: it.t, code: it.code })); } catch (e) { return false; } }

  /* ---------- the confirmation bar (shared one-sheet glass) ---------- */
  let barT = 0;
  function bar(html, ms) {
    let b = D.getElementById('ateBar'); if (!b) { b = D.createElement('div'); b.id = 'ateBar'; b.className = 'ate-bar'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite'); b.setAttribute('data-noi18n', ''); D.body.appendChild(b); }
    b.innerHTML = html; b.classList.add('on'); clearTimeout(barT);
    const hide = () => { barT = setTimeout(() => { b.classList.remove('on'); }, ms || 8000); };
    b.onpointerdown = () => clearTimeout(barT); b.onpointerup = hide; hide(); return b;
  }
  function hideBar() { const b = D.getElementById('ateBar'); if (b) b.classList.remove('on'); clearTimeout(barT); }
  let LAST = null;
  function loggedBar() {
    const L = LAST; if (!L) return; const log = L.log;
    bar('<div class="ate-bt"><span class="ate-ok" aria-hidden="true">✓</span><span class="ate-btx"><b>' + esc(nm(log.t)) + '</b><small>' + esc(t('logged', { s: t(log.slot || 'snack') })) +
      (L.xp ? ' · +' + L.xp + ' XP' : L.reason ? ' · ' + esc(L.reason) : '') + '</small></span><button type="button" class="ate-undo" data-ate="undo">' + esc(t('undo')) + '</button></div>' +
      '<div class="ate-slots" role="group" aria-label="' + esc(t('meal')) + '">' + SLOTS.map(s => '<button type="button" class="ate-slot' + (s === log.slot ? ' on' : '') + '" data-ate="slot" data-slot="' + s + '" aria-pressed="' + (s === log.slot) + '">' + esc(t(s)) + '</button>').join('') + '</div>');
  }

  /* ---------- I just ate this ---------- */
  function logNow(id, o) {
    o = o || {}; const v = V(), s = S(), it = item(id, o.name); if (!v || !s || !it) { toast(t('fail')); return null; }
    const slot = SLOTS.indexOf(o.slot) >= 0 ? o.slot : slotNow();
    let fast = null; try { fast = localStorage.getItem('lowi_fast_v1'); } catch (e) { }
    const td = s.td && s.td.day ? s.td : null, ateBefore = td ? JSON.stringify(td.ate || {}) : '', had = ledgerIds(s);
    let res; try { res = v.logMeal({ id: 'ate:' + Date.now().toString(36) + ':' + it.key, t: it.t, macros: it.macros, r: it.r, lvl: it.lvl, code: it.code, slot, via: 'recipe' }); } catch (e) { console.error(e); res = false; }
    if (!res) { toast(t('fail')); return null; }
    if (res.dup) { LAST = null; bar('<div class="ate-bt"><span class="ate-ok" aria-hidden="true">✓</span><span class="ate-btx"><b>' + esc(nm(it.t)) + '</b><small>' + esc(t('dup')) + '</small></span></div>', 3500); return res; }
    /* a planned copy of this food is now eaten, so the plan never asks for it again */
    if (td) { td.ate = td.ate || {}; (td.plan || []).forEach((pid, i) => { if (pid === it.key && !td.ate[i]) td.ate[i] = true; });
      (td.later || []).forEach(x => { if (x.key === it.key) x.ate = res.log.eventId; }); try { v.save(); } catch (e) { } }
    LAST = { log: res.log, xp: res.xp, reason: res.reason, fast, ateBefore, had };
    loggedBar(); repaint(); return res;
  }
  function changeSlot(slot) {
    const L = LAST, v = V(); if (!L || !v || SLOTS.indexOf(slot) < 0 || L.log.slot === slot) return;
    const twin = v.mealDup({ t: L.log.t, code: L.log.code, slot }); if (twin && twin !== L.log) { toast(t('dup')); return; }
    L.log.slot = slot; v.save(); emit('lowi:state', { meal: L.log.eventId }); loggedBar(); repaint();
  }
  function undo() {
    const L = LAST, v = V(), s = S(); if (!L || !v || !s) return; LAST = null;
    const i = s.logs.indexOf(L.log); if (i >= 0) s.logs.splice(i, 1);
    /* every XP the tap earned goes back: the meal's 15 and the gap-end reward it set off (ledger entries added since the tap) */
    try { (s.ledger || []).filter(e => e && e.eventId && !(L.had && L.had.has(e.eventId))).map(e => e.eventId).forEach(id => v.unaward(id)); if (!L.had && L.xp) v.unaward(L.log.eventId); } catch (e) { }
    try { const rw = D.getElementById('fstRw'); if (rw) rw.remove(); } catch (e) { }
    if (s.td) { try { s.td.ate = JSON.parse(L.ateBefore || '{}'); } catch (e) { } (s.td.later || []).forEach(x => { if (x.ate === L.log.eventId) delete x.ate; }); }
    try { if (L.fast == null) localStorage.removeItem('lowi_fast_v1'); else localStorage.setItem('lowi_fast_v1', L.fast); } catch (e) { }
    v.save(); emit('lowi:fast', { undo: true }); emit('lowi:state', { unlogged: L.log.eventId });
    try { if (W.LowiSpirit && LowiSpirit.refresh) LowiSpirit.refresh(); } catch (e) { }
    bar('<div class="ate-bt"><span class="ate-btx"><small>' + esc(t('undone')) + '</small></span></div>', 2200); repaint();
  }

  /* ---------- I'll eat this ---------- */
  function planLater(id, o) {
    o = o || {}; const it = item(id, o.name), s = S(); if (!it || !s) return false;
    if (it.book) { /* the existing Today plan path: a meal takes a free slot, anything else is an extra; no double plan */
      const b = D.createElement('button'); b.hidden = true; b.dataset.td = 'addtoday'; b.dataset.id = it.key; b.dataset.sfx = 'none'; D.body.appendChild(b); try { b.click(); } catch (e) { } b.remove(); repaint(); return true; }
    const td = s.td; if (!td) { toast(t('fail')); return false; }
    td.later = Array.isArray(td.later) ? td.later : [];
    if (td.later.some(x => x.key === it.key && !x.ate)) { toast(t('have')); return true; }
    td.later.push({ key: it.key, t: it.t, code: it.code || '', lvl: it.lvl || '', r: it.r, macros: it.macros }); V().save(); toast(t('planned')); repaint(); return true;
  }

  /* ---------- markup ---------- */
  function pairHTML(id, name, cls) {
    const a = ' data-id="' + esc(id) + '"' + (name ? ' data-name="' + esc(name) + '"' : '');
    return '<div class="ate-pair' + (cls ? ' ' + cls : '') + '" data-noi18n><button type="button" class="ate-now" data-ate="now"' + a + '><span aria-hidden="true">✓</span> ' + esc(t('now')) + '</button>' +
      '<button type="button" class="ate-later" data-ate="later"' + a + '>' + esc(t('later')) + '</button></div>';
  }
  /* cook-along DONE: "I just ate this" is the big button, "I'll eat this" the small one beside it */
  function doneNav(r) {
    if (!r) return ''; const a = ' data-id="' + esc(r.id) + '" data-name="' + esc(r.swapName || r.n) + '" data-p2close="all" data-noi18n';
    return '<button class="r2-btn pri big ate-now ate-done" data-ate="now"' + a + '><span aria-hidden="true">✓</span> ' + esc(t('now')) + '</button>' +
      '<button class="r2-btn ghost ate-later ate-done2" data-ate="later"' + a + '>' + esc(t('later')) + '</button>';
  }
  /* the plan (Today / Fuel plan sheet): extras get an Ate it, and S.td.later rows show as planned until eaten */
  function extraBtn(id) { const it = item(id); if (!it) return ''; const done = eatenToday(it);
    return '<button class="td-act ate-plan' + (done ? ' on' : '') + '" data-ate="' + (done ? 'none' : 'now') + '" data-id="' + esc(id) + '" data-noi18n>' + esc(done ? t('eaten') : t('ateIt')) + '</button>'; }
  function planHTML(d) {
    const L = d && Array.isArray(d.later) ? d.later : []; if (!L.length) return '';
    return L.map((x, j) => { const done = !!x.ate || eatenToday(x);
      return '<div class="card td-extra ate-row' + (done ? ' ate' : '') + '" data-noi18n><div class="td-mtx"><div class="tiny ' + (done ? 'muted' : 'gold') + '">' + esc(done ? t('eaten') : t('plannedTag')) + '</div><div style="font-weight:650">' + esc(nm(x.t)) + '</div></div>' +
        '<button class="td-act ate-plan' + (done ? ' on' : '') + '" data-ate="' + (done ? 'none' : 'laterate') + '" data-j="' + j + '">' + esc(done ? t('eaten') : t('ateIt')) + '</button>' +
        (done ? '' : '<button class="td-x" data-ate="laterrm" data-j="' + j + '" aria-label="' + esc(t('rm')) + '">×</button>') + '</div>'; }).join('');
  }
  /* a right swipe: offer both right away, the card is already gone */
  function offer(id) {
    const it = item(id); if (!it) return;
    LAST = null; bar('<div class="ate-bt"><span class="ate-ok" aria-hidden="true">♥</span><span class="ate-btx"><b>' + esc(it.t) + '</b><small>' + esc(t('liked')) + '</small></span></div>' + pairHTML(id, '', 'ate-inbar'), 5200);
  }

  /* ---------- wiring ---------- */
  function toast(m) { try { if (typeof W.toast === 'function') return W.toast(m); } catch (e) { } bar('<div class="ate-bt"><span class="ate-btx"><small>' + esc(m) + '</small></span></div>', 2600); }
  function emit(n, d) { try { W.dispatchEvent(new CustomEvent(n, { detail: d })); } catch (e) { } }
  function repaint() { try { if (D.querySelector('#tdPlan') && typeof W.renderHome === 'function') W.renderHome(); } catch (e) { } decorate(); }
  D.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-ate]'); if (!b) return; const k = b.dataset.ate;
    if (k === 'now') { if (b.closest('#ateBar')) hideBar(); logNow(b.dataset.id, { name: b.dataset.name }); }
    else if (k === 'later') { if (b.closest('#ateBar')) hideBar(); planLater(b.dataset.id, { name: b.dataset.name }); }
    else if (k === 'slot') changeSlot(b.dataset.slot);
    else if (k === 'undo') undo();
    else if (k === 'laterate' || k === 'laterrm') { const s = S(), L = s && s.td && s.td.later, x = L && L[+b.dataset.j]; if (!x) return;
      if (k === 'laterrm') { L.splice(+b.dataset.j, 1); V().save(); repaint(); return; }
      const v = V(), had = ledgerIds(s); let fast = null; try { fast = localStorage.getItem('lowi_fast_v1'); } catch (er) { }
      const res = v.logMeal({ id: 'ate:' + Date.now().toString(36) + ':' + x.key, t: x.t, macros: x.macros, r: x.r, lvl: x.lvl, code: x.code, slot: slotNow(), via: 'plan-later' });
      if (!res) { toast(t('fail')); return; } if (res.dup) { x.ate = 'dup'; v.save(); toast(t('dup')); repaint(); return; }
      x.ate = res.log.eventId; v.save(); LAST = { log: res.log, xp: res.xp, reason: res.reason, fast, ateBefore: JSON.stringify(s.td.ate || {}), had }; loggedBar(); repaint(); }
  });
  /* the Shuffle "Your pick" card gets the pair; every old "Add to today" reads "I'll eat this" */
  function decorate() {
    D.querySelectorAll('.r5-card[data-id]').forEach(c => {
      if (c.querySelector('.ate-pair') || c.closest('#ateBar')) return; const id = c.dataset.id; if (!id || !item(id)) return;
      const host = c.querySelector('.r5-btns'), h = D.createElement('div'); h.innerHTML = pairHTML(id, ''); const p = h.firstChild;
      if (host && host.parentNode === c) host.insertAdjacentElement('afterend', p); else c.appendChild(p);
      c.querySelectorAll('.r5-mini [data-td="addtoday"]').forEach(x => { x.hidden = true; x.setAttribute('aria-hidden', 'true'); });
      const mini = c.querySelector('.r5-mini'); if (mini && ![...mini.children].some(x => !x.hidden)) mini.hidden = true;
    });
    D.querySelectorAll('[data-td="addtoday"]:not([data-ate-lbl])').forEach(x => { if (x.id === 'r3kTd' || x.hidden) return; x.setAttribute('data-ate-lbl', '1'); x.setAttribute('data-noi18n', ''); x.textContent = t('later'); });
  }
  let q = 0; const soon = () => { if (q) return; q = (W.requestAnimationFrame || setTimeout)(() => { q = 0; try { decorate(); } catch (e) { } }); };
  try { new MutationObserver(soon).observe(D.body || D.documentElement, { childList: true, subtree: true }); } catch (e) { }
  W.addEventListener('lowi:lang', () => { D.querySelectorAll('.ate-pair').forEach(x => { if (!x.closest('#ateBar')) x.remove(); }); D.querySelectorAll('[data-ate-lbl]').forEach(x => x.removeAttribute('data-ate-lbl')); soon(); });
  soon();
  W.LowiAte = { TX, item, logNow, planLater, undo, changeSlot, pairHTML, doneNav, extraBtn, planHTML, offer, decorate, slotNow, last: () => LAST };
})();
