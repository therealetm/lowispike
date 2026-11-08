/* LOWiSPIKE · Weekly Challenge panel (8 Nov 2026).
   Emmanuel, after opening the Challenge for the first time on a Sunday: "it feels like it thinks I already bought the things ... It
   just throws me in there ... there should be a little gamified start of the week ... if it's Sunday, then they gotta start tomorrow";
   "We shouldn't lock in the time. It should just say morning, brunch, evening, nighttime ... or snack"; "this is a insulin-friendly
   week challenge that needs to be highlighted ... No sugar, no junk food"; "an estimate of how much calories ... on that day and on
   that week"; "how much money that they save ... within a month versus a month of just ... buying sweets now and then, eating out now
   and then, buying juice and drinks ... chewing gum"; "when clicking on challenge, it opens a new page ... it is very important that
   it is in the same style of that UI design ... so it doesn't feel like it's opening a new page"; "Pictures ... these people are
   visual thinkers".
   So the Challenge is drawn right under the Circle games bar (like Mischen and Swipen), in the same glass look:
     not joined   -> what it is (insulin-friendly, no sugar, no junk food), the 7 dishes as pictures, money, kcal, "Ich bin dabei"
     joined early -> the start is the next Monday (today when it is Monday): countdown, shopping list, Monday's preview
     running      -> Tag n von 7, the day's meals by part of the day (no clock), tick what you ate, kcal of the day and of the week
     done         -> geschafft, start again
   The plan, prices, amounts and steps come from the Fakeaway week (fakeaway/faw-core.js, built from tools/fakeaway/src). */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiChallenge) return;
  const H = D.documentElement, KEY = 'lowi.challenge.v1', DAY = 864e5;
  const li = () => { const l = (H.lang || (W.localStorage && localStorage.getItem('lowispike.lang')) || 'de').slice(0, 2); return l === 'en' ? 0 : l === 'es' ? 2 : 1; };
  const L = (en, de, es) => [en, de, es == null ? en : es][li()];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F = () => W.FAW || null, TX = () => W.FAW_TX || null, AP = () => W.FAWAPP || null;
  const fl = () => (li() === 1 ? 'de' : 'en');

  /* ---------- pure: dates, state ---------- */
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  /* the first day of the challenge: today when it is Monday, else the next Monday (on a Sunday: tomorrow) */
  function startFor(now) {
    const t = midnight(now || new Date()), wd = (t.getDay() + 6) % 7;
    return wd === 0 ? t : new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7 - wd);
  }
  const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / DAY);
  /* where you are: 'intro' (not joined), 'wait' (joined, before day 1), 'run' (day 0..6), 'done' (after day 7) */
  function phase(st, now) {
    const s = st && parse(st.start); if (!s) return { k: 'intro' };
    const d = daysBetween(s, now || new Date());
    if (d < 0) return { k: 'wait', left: -d, start: s };
    if (d > 6) return { k: 'done', start: s };
    return { k: 'run', day: d, start: s };
  }
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') return o; } catch (e) { } return {}; }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }

  /* the part of the day for a plan time (the plan keeps its order; the clock is not shown) */
  function slotOf(time, kind) {
    if (kind === 'thaw') return 'night';
    if (kind === 'shop') return 'forenoon';
    const m = +String(time).slice(0, 2) * 60 + +String(time).slice(3, 5);
    return m < 600 ? 'morning' : m < 720 ? 'brunch' : m < 900 ? 'midday' : m < 1020 ? 'snack' : 'evening';
  }
  const SLOT = {
    morning: () => L('Morning', 'Morgens', 'Mañana'), forenoon: () => L('Late morning', 'Vormittags', 'Media mañana'), brunch: () => L('Brunch', 'Brunch', 'Brunch'),
    midday: () => L('Midday', 'Mittags', 'Mediodía'), snack: () => L('Snack', 'Snack', 'Snack'), evening: () => L('Evening', 'Abends', 'Noche'), night: () => L('Before bed', 'Vor dem Schlafen', 'Antes de dormir')
  };
  /* one day of the plan as rows, in order */
  function rowsOf(dayIdx) {
    const f = F(); if (!f) return [];
    const day = f.WEEK[dayIdx]; if (!day) return [];
    return day.slots.map(s => ({ time: s[0], kind: s[1] === 'shop' ? 'shop' : s[1] === 'rest' ? 'rest' : 'meal', id: s[1] === 'rest' ? s[2] : s[1] }))
      .concat(day.tasks.map(k => ({ time: k[0], kind: 'thaw', id: k[2] })))
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
      .map(x => Object.assign(x, { slot: slotOf(x.time, x.kind) }));
  }
  /* kcal of one adult on a plan day (a leftover lunch counts as its dish) */
  function kcalOf(dayIdx) {
    const f = F(); if (!f) return 0;
    return Math.round(rowsOf(dayIdx).reduce((a, x) => a + (x.kind === 'meal' || x.kind === 'rest' ? f.perPortion(x.id).kcal : 0), 0));
  }
  const kcalWeek = () => { let k = 0; for (let i = 0; i < 7; i++) k += kcalOf(i); return k; };

  /* money: what a month of "now and then" extras costs one person. Example amounts, labelled as such, each can be switched off */
  const EXTRAS = [
    { id: 'sweets', ic: '🍫', eur: 16, t: () => L('Sweets & chocolate', 'Süßigkeiten & Schokolade', 'Dulces y chocolate'), s: () => L('about €4 a week', 'ca. 4 € pro Woche', 'unos 4 € por semana') },
    { id: 'drinks', ic: '🥤', eur: 24, t: () => L('Cola, juice, energy drinks', 'Cola, Saft, Energy', 'Cola, zumo, energéticas'), s: () => L('about €6 a week', 'ca. 6 € pro Woche', 'unos 6 € por semana') },
    { id: 'takeaway', ic: '🍔', eur: 45, t: () => L('Fast food & delivery', 'Fast Food & Lieferdienst', 'Comida rápida y a domicilio'), s: () => L('3 times a month, about €15', '3-mal im Monat, je ca. 15 €', '3 veces al mes, unos 15 €') },
    { id: 'bakery', ic: '🥐', eur: 20, t: () => L('Bakery & snacks on the go', 'Bäcker & Snacks unterwegs', 'Panadería y snacks fuera'), s: () => L('about €5 a week', 'ca. 5 € pro Woche', 'unos 5 € por semana') },
    { id: 'coffee', ic: '☕', eur: 16, t: () => L('Sweet coffee to go', 'Süßer Coffee to go', 'Café dulce para llevar'), s: () => L('once a week, about €4', '1-mal pro Woche, ca. 4 €', '1 vez por semana, unos 4 €') },
    { id: 'gum', ic: '🍬', eur: 6, t: () => L('Chewing gum & bits', 'Kaugummi & Kleinkram', 'Chicle y cositas'), s: () => L('at the till', 'an der Kasse', 'en la caja') }
  ];
  function savedPerMonth(off) { off = off || {}; return EXTRAS.reduce((a, x) => a + (off[x.id] ? 0 : x.eur), 0); }

  /* ---------- formatting ---------- */
  const eur0 = v => (li() === 1 ? Math.round(v) + ' €' : '€' + Math.round(v));
  const eur2 = v => (li() === 1 ? v.toFixed(2).replace('.', ',') + ' €' : '€' + v.toFixed(2));
  const num = v => { try { return Math.round(v).toLocaleString(li() === 1 ? 'de-DE' : 'en-GB'); } catch (e) { return String(Math.round(v)); } };
  const dateWord = d => { try { return d.toLocaleDateString(li() === 1 ? 'de-DE' : li() === 2 ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return ymd(d); } };
  const icon = id => { const t = TX(), f = F(); if (!t || !f) return ''; const r = f.RECIPES[id]; return t.ICONS[(r && r.icon) || id] || t.ICONS[id] || ''; };
  const recTx = id => { const t = TX(); return t && t.REC[id] ? t.REC[id][fl()] : null; };
  const themeIcon = th => { const t = TX(); return t ? (t.ICONS[th] || '') : ''; };
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
  }

  /* ---------- view ---------- */
  let pane = null, sheet = '', listOpen = false;
  const st = () => load();
  const people = () => { const p = +st().ppl; return p >= 1 && p <= 6 ? p : 1; };
  function sync() { const a = AP(); if (a && a.st) { a.st.lang = fl(); a.st.people = people(); } }

  function headHTML(ph) {
    const t = TX();
    return '<div class="cwk-hero"><div class="cwk-kick">🏆 ' + esc(L('Weekly challenge', 'Wochen-Challenge', 'Reto semanal')) + ' · ' + esc(L('Wk', 'KW', 'Sem.')) + ' ' + isoWeek(ph.start || startFor()) + '</div>' +
      '<h2>' + esc(t ? t.UI[fl()].title : 'Fakeaway') + '</h2>' +
      '<p>' + esc(L('Burger, pizza, döner & co. Rebuilt, so your blood sugar stays calm.', 'Burger, Pizza, Döner & Co. Nachgebaut, damit dein Blutzucker ruhig bleibt.', 'Hamburguesa, pizza, kebab y más. Rehechos para que tu azúcar se quede tranquila.')) + '</p>' +
      '<div class="cwk-badges"><span class="cwk-badge on">🩸 ' + esc(L('Insulin-friendly', 'Insulinfreundlich', 'Amigable con la insulina')) + '</span><span class="cwk-badge">🚫 ' + esc(L('No sugar', 'Kein Zucker', 'Sin azúcar')) + '</span><span class="cwk-badge">🍟 ' + esc(L('No junk food', 'Kein Junkfood', 'Sin comida basura')) + '</span></div></div>';
  }
  function dishesHTML() {
    const f = F(), t = TX(); if (!f || !t) return '';
    const u = t.UI[fl()];
    return '<div class="cwk-dishes" role="list">' + f.WEEK.map((d, i) => '<div class="cwk-dish" role="listitem"><span class="cwk-pic">' + themeIcon(d.theme) + '</span><b>' + esc(u.daysS[i]) + '</b><small>' + esc(u.themes[d.theme].replace(/^(Fish & Chips) .*/, '$1').replace(/[-\s](Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/, '').replace(/^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s? /, '')) + '</small></div>').join('') + '</div>';
  }
  function statsHTML() {
    const f = F(); if (!f) return '';
    const b = f.basket(people(), 0), k = Math.round(kcalWeek() / 7);
    return '<div class="cwk-stats"><div><b>≈ ' + esc(eur0(b.total)) + '</b><span>' + esc(L('shopping for the week', 'Einkauf für die Woche', 'compra de la semana')) + '</span></div>' +
      '<div><b>≈ ' + esc(num(k)) + '</b><span>' + esc(L('kcal a day', 'kcal am Tag', 'kcal al día')) + '</span></div>' +
      '<div><b>≈ ' + esc(eur0(savedPerMonth(st().off))) + '</b><span>' + esc(L('saved a month', 'gespart im Monat', 'ahorrado al mes')) + '</span></div></div>';
  }
  function pplHTML() {
    const p = people();
    return '<div class="cwk-ppl"><span>' + esc(L('Eating with you', 'Wie viele essen mit?', '¿Cuántos coméis?')) + '</span><div><button type="button" data-cwk="pm" aria-label="−"' + (p <= 1 ? ' disabled' : '') + '>−</button><b>' + p + '</b><button type="button" data-cwk="pp" aria-label="+"' + (p >= 6 ? ' disabled' : '') + '>+</button></div></div>';
  }
  function moneyHTML() {
    const off = st().off || {}, m = savedPerMonth(off);
    return '<section class="cwk-card cwk-money"><h3>💸 ' + esc(L('What a month of extras costs', 'Was ein Monat Extras kostet', 'Lo que cuesta un mes de extras')) + '</h3>' +
      '<p class="cwk-sub">' + esc(L('Things you buy "now and then". Tap what you don’t buy anyway.', 'Sachen, die man „ab und zu“ kauft. Tipp weg, was du eh nicht kaufst.', 'Cosas que compras "de vez en cuando". Toca lo que no compras.')) + '</p>' +
      '<div class="cwk-extras">' + EXTRAS.map(x => '<button type="button" class="cwk-ex' + (off[x.id] ? '' : ' on') + '" data-cwk="ex" data-id="' + x.id + '" aria-pressed="' + !off[x.id] + '"><span class="cwk-exi" aria-hidden="true">' + x.ic + '</span><span class="cwk-ext"><b>' + esc(x.t()) + '</b><small>' + esc(x.s()) + '</small></span><i>' + esc(eur0(x.eur)) + '</i></button>').join('') + '</div>' +
      '<div class="cwk-save"><span>' + esc(L('With the challenge you save', 'Mit der Challenge sparst du', 'Con el reto ahorras')) + '</span><b>≈ ' + esc(eur0(m)) + ' ' + esc(L('a month', 'im Monat', 'al mes')) + '</b><small>≈ ' + esc(li() === 1 ? num(m * 12) + ' €' : '€' + num(m * 12)) + ' ' + esc(L('a year', 'im Jahr', 'al año')) + '</small></div>' +
      '<p class="cwk-fine">' + esc(L('Example amounts for one person, not your real spending.', 'Beispielbeträge für eine Person, nicht deine echten Ausgaben.', 'Importes de ejemplo para una persona, no tu gasto real.')) + '</p></section>';
  }
  function listHTML() {
    const f = F(), t = TX(); if (!f || !t) return '';
    const b = f.basket(people(), 0), u = t.UI[fl()], ck = st().ck || {}, done = b.rows.filter(r => ck[r.it]).length;
    const head = '<button type="button" class="cwk-listbtn" data-cwk="list" aria-expanded="' + listOpen + '"><span aria-hidden="true">' + (t.ICONS.shop || '🛒') + '</span><b>' + esc(u.list) + ' · ≈ ' + esc(eur0(b.total)) + '</b><i>' + done + '/' + b.rows.length + '</i></button>';
    if (!listOpen) return head;
    const by = {}; b.rows.forEach(r => { const a = f.ITEMS[r.it].aisle; (by[a] = by[a] || []).push(r); });
    return head + '<div class="cwk-list">' + Object.keys(by).map(a => '<h4>' + esc(u.aisles[a] || a) + '</h4><ul>' + by[a].map(r => {
      const I = f.ITEMS[r.it];
      return '<li><label><input type="checkbox" data-cwk-ck="' + esc(r.it) + '"' + (ck[r.it] ? ' checked' : '') + '><span>' + esc(I[fl()]) + '<small>' + r.packs + ' × ' + esc(I.pk[fl() === 'de' ? 0 : 1]) + '</small></span><i>' + esc(eur2(r.cost)) + '</i></label></li>';
    }).join('') + '</ul>').join('') +
      (W.LOWI_SHELF && LOWI_SHELF.addIngredients ? '<button type="button" class="cwk-btn" data-cwk="toapp">' + esc(u.toApp) + '</button>' : '') +
      '<p class="cwk-fine">' + esc(u.prices) + '</p></div>';
  }
  function introHTML() {
    const s = startFor(), today = daysBetween(new Date(), s) === 0;
    const steps = [
      ['🛒', L('Shop once', 'Einmal einkaufen', 'Compra una vez'), today ? L('today', 'heute', 'hoy') : L('before the start', 'vor dem Start', 'antes de empezar')],
      ['🍳', L('Cook once a day', 'Einmal am Tag kochen', 'Cocina una vez al día'), L('half is tomorrow’s lunch', 'die Hälfte ist morgen Mittag', 'la mitad es la comida de mañana')],
      ['🏆', L('7 days done', '7 Tage geschafft', '7 días hechos'), L('tick each meal', 'jede Mahlzeit abhaken', 'marca cada comida')]
    ];
    return headHTML({ start: s }) + dishesHTML() + statsHTML() +
      '<section class="cwk-card cwk-start"><h3>' + esc(today ? L('Your week starts today', 'Deine Woche startet heute', 'Tu semana empieza hoy') : L('Your week starts on', 'Deine Woche startet am', 'Tu semana empieza el')) + (today ? '' : ' <span>' + esc(dateWord(s)) + '</span>') + '</h3>' +
      '<ol class="cwk-steps">' + steps.map(x => '<li><span aria-hidden="true">' + x[0] + '</span><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></li>').join('') + '</ol>' +
      pplHTML() + '<button type="button" class="cwk-go" data-cwk="join">' + esc(L('I’m in', 'Ich bin dabei', 'Me apunto')) + '</button></section>' +
      moneyHTML() + footHTML();
  }
  function waitHTML(ph) {
    const left = ph.left;
    return headHTML(ph) +
      '<section class="cwk-card cwk-count"><div class="cwk-big">' + left + '</div><div><b>' + esc(left === 1 ? L('day to go', 'Tag bis zum Start', 'día para empezar') : L('days to go', 'Tage bis zum Start', 'días para empezar')) + '</b><small>' + esc(L('Start: ', 'Start: ', 'Inicio: ') + dateWord(ph.start)) + '</small></div></section>' +
      '<section class="cwk-card"><h3>' + esc(L('Before Monday', 'Bis Montag', 'Antes del lunes')) + '</h3>' + listHTML() +
      '<p class="cwk-sub">' + esc(L('Back home: split the chicken into 2 bags, freeze meat and fish.', 'Zu Hause: Hähnchen in 2 Beutel teilen, Fleisch und Fisch einfrieren.', 'En casa: reparte el pollo en 2 bolsas, congela carne y pescado.')) + '</p></section>' +
      '<h3 class="cwk-h">' + esc(L('Monday’s preview', 'Vorschau Montag', 'Avance del lunes')) + '</h3>' + mealsHTML(0, false) + statsHTML() + moneyHTML() + leaveHTML() + footHTML();
  }
  function runHTML(ph) {
    const f = F(), t = TX(), u = t.UI[fl()], d = ph.day, ate = (st().ate || {}), dk = ymd(new Date(ph.start.getTime() + d * DAY));
    const strip = f.WEEK.map((w, i) => { const k = ymd(new Date(ph.start.getTime() + i * DAY)), n = Object.keys(ate[k] || {}).length, all = rowsOf(i).filter(x => x.kind === 'meal' || x.kind === 'rest').length;
      return '<span class="cwk-day' + (i === d ? ' now' : '') + (i < d ? ' past' : '') + (n && n >= all ? ' full' : '') + '">' + themeIcon(w.theme) + '<b>' + esc(u.daysS[i]) + '</b>' + (n && n >= all ? '<i aria-hidden="true">✓</i>' : '') + '</span>'; }).join('');
    const doneN = Object.keys(ate).reduce((a, k) => a + Object.keys(ate[k] || {}).length, 0);
    return headHTML(ph) +
      '<div class="cwk-prog"><b>' + esc(L('Day ', 'Tag ', 'Día ') + (d + 1) + L(' of 7', ' von 7', ' de 7')) + '</b><span>' + esc(u.themes[f.WEEK[d].theme]) + '</span></div>' +
      '<div class="cwk-strip">' + strip + '</div>' +
      mealsHTML(d, true, dk) +
      '<div class="cwk-stats"><div><b>≈ ' + esc(num(kcalOf(d))) + '</b><span>' + esc(L('kcal today', 'kcal heute', 'kcal hoy')) + '</span></div><div><b>≈ ' + esc(num(kcalWeek())) + '</b><span>' + esc(L('kcal this week', 'kcal diese Woche', 'kcal esta semana')) + '</span></div><div><b>' + doneN + '</b><span>' + esc(L('meals ticked', 'Mahlzeiten abgehakt', 'comidas marcadas')) + '</span></div></div>' +
      '<section class="cwk-card">' + listHTML() + '</section>' + moneyHTML() + leaveHTML() + footHTML();
  }
  function doneHTML(ph) {
    const ate = st().ate || {}, n = Object.keys(ate).reduce((a, k) => a + Object.keys(ate[k] || {}).length, 0);
    return headHTML(ph) + '<section class="cwk-card cwk-start cwk-won"><div class="cwk-big">🎉</div><h3>' + esc(L('Week done!', 'Woche geschafft!', '¡Semana hecha!')) + '</h3><p class="cwk-sub">' + esc(L(n + ' meals ticked.', n + ' Mahlzeiten abgehakt.', n + ' comidas marcadas.')) + '</p>' +
      '<button type="button" class="cwk-go" data-cwk="again">' + esc(L('Go again next week', 'Nächste Woche nochmal', 'Otra vez la semana que viene')) + '</button></section>' + moneyHTML() + footHTML();
  }
  function mealsHTML(d, tick, dk) {
    const ate = (st().ate || {})[dk] || {}, t = TX(), u = t.UI[fl()];
    return '<ul class="cwk-meals">' + rowsOf(d).map((x, i) => {
      const lab = '<span class="cwk-slot">' + esc(SLOT[x.slot]()) + '</span>';
      if (x.kind === 'thaw') { const th = u.thaw[x.id]; return '<li class="cwk-m cwk-task">' + lab + '<div class="cwk-mrow"><span class="cwk-pic sm">' + (t.ICONS.thaw || '') + '</span><span class="cwk-mt"><b>' + esc(th[0]) + '</b><small>' + esc(u.thawSub) + '</small></span></div></li>'; }
      if (x.kind === 'shop') return '<li class="cwk-m cwk-task">' + lab + '<div class="cwk-mrow"><span class="cwk-pic sm">' + (t.ICONS.shop || '') + '</span><span class="cwk-mt"><b>' + esc(u.shop) + '</b><small>' + esc(L('Your list is below', 'Die Liste ist unten', 'La lista está abajo')) + '</small></span></div></li>';
      const tx = recTx(x.id), r = F().RECIPES[x.id], rest = x.kind === 'rest', on = !!ate[i];
      return '<li class="cwk-m' + (on ? ' ate' : '') + '">' + lab + '<div class="cwk-mrow"><button type="button" class="cwk-mopen" data-cwk="rec" data-id="' + esc(x.id) + '" data-rest="' + (rest ? 1 : 0) + '"><span class="cwk-pic">' + icon(x.id) + '</span><span class="cwk-mt">' + (rest ? '<em>' + esc(u.rest) + '</em>' : '') + '<b>' + esc(tx.name) + '</b><small>' + esc(rest ? (tx.reheat || tx.portion) : tx.portion + (r.slot === 'dinner' ? ' · ' + r.min + ' ' + u.min : '')) + '</small></span></button>' +
        (tick ? '<button type="button" class="cwk-tick" data-cwk="ate" data-i="' + i + '" data-k="' + dk + '" aria-pressed="' + on + '" aria-label="' + esc(L('Eaten', 'Gegessen', 'Comido')) + '">✓</button>' : '') + '</div></li>';
    }).join('') + '</ul>';
  }
  function leaveHTML() { return '<button type="button" class="cwk-leave" data-cwk="leave">' + esc(L('Leave the challenge', 'Challenge verlassen', 'Dejar el reto')) + '</button>'; }
  function footHTML() {
    const t = TX(), u = t ? t.UI[fl()] : null;
    return '<div class="cwk-foot"><button type="button" class="cwk-share" data-cwk="share">' + esc(L('Share the challenge', 'Challenge teilen', 'Compartir el reto')) + '</button><p>' + esc(u ? u.med : '') + '</p></div>';
  }
  function recipeHTML(id, rest) {
    const f = F(), t = TX(), a = AP(), u = t.UI[fl()], tx = recTx(id), r = f.RECIPES[id];
    if (!tx || !r || !a) return '';
    sync();
    const P = f.portionsOf(people(), 0), tm = f.times(id), pp = f.perPortion(id);
    const ings = r.ing.map(e => { const fm = a.fmt(e[0], e[1] * P * tm); return '<li><span>' + esc(f.ITEMS[e[0]][fl()]) + '</span><i>' + esc(fm.am) + '</i></li>'; }).join('');
    const steps = tx.steps.map(s => '<li>' + a.stepHtml(s, id, P, tm) + '</li>').join('');
    return '<div class="cwk-sheet" role="dialog" aria-modal="true" aria-label="' + esc(tx.name) + '"><div class="cwk-sh-in">' +
      '<button type="button" class="cwk-x" data-cwk="close" aria-label="' + esc(u.close) + '">×</button>' +
      '<div class="cwk-rh"><span class="cwk-pic lg">' + icon(id) + '</span><div><h3>' + esc(tx.name) + '</h3><small>' + esc(tx.statt) + '</small></div></div>' +
      '<div class="cwk-facts"><div><b>' + r.min + '</b><span>' + esc(u.min) + '</span></div><div><b>' + esc(eur2(pp.eur)) + '</b><span>' + esc(u.perPortion) + '</span></div><div><b>≈ ' + Math.round(pp.kcal) + '</b><span>kcal</span></div></div>' +
      (W.LowiChallengeVoice && W.LowiChallengeVoice.has(id, fl()) ? W.LowiChallengeVoice.button(id, fl()) : '') +
      (rest ? '<p class="cwk-note">' + esc(u.rest + ' · ' + u.reheat + ': ' + (tx.reheat || '')) + '</p>' : '') +
      '<p class="cwk-note"><b>' + esc(u.eat) + ':</b> ' + esc(tx.portion) + ' · <b>' + esc(u.drink) + ':</b> ' + esc(tx.drink) + '</p>' +
      (rest ? '' : (r.leftover ? '<p class="cwk-note">' + esc(u.double) + '</p>' : '') + '<h4>' + esc(u.ing) + '</h4><ul class="cwk-ing">' + ings + '</ul><h4>' + esc(u.steps) + '</h4><ol class="cwk-steps2">' + steps + '</ol>') +
      '<p class="cwk-why"><b>' + esc(u.why) + '</b><br>' + esc(tx.why) + '</p></div></div>';
  }
  function html() {
    if (!F() || !TX() || !AP()) return '<p class="cwk-sub">' + esc(L('Loading the challenge…', 'Challenge lädt…', 'Cargando el reto…')) + '</p>';
    sync();
    const ph = phase(st());
    return ph.k === 'intro' ? introHTML() : ph.k === 'wait' ? waitHTML(ph) : ph.k === 'run' ? runHTML(ph) : doneHTML(ph);
  }
  function paint(keep) {
    if (!pane) return;
    const sc = pane.querySelector('.cwk-scroll'), y = keep && sc ? sc.scrollTop : 0;
    pane.innerHTML = '<div class="cwk-scroll">' + html() + '</div>' + (sheet ? recipeHTML(sheet.split(':')[0], sheet.split(':')[1] === '1') : '');
    const s2 = pane.querySelector('.cwk-scroll'); if (s2) s2.scrollTop = y;
  }
  function mount(host) {
    if (!host) return null;
    if (!pane || !pane.isConnected) { pane = D.createElement('section'); pane.id = 'cwkPane'; pane.className = 'cwk-pane'; pane.setAttribute('aria-label', L('Weekly challenge', 'Wochen-Challenge', 'Reto semanal')); }
    if (pane.parentElement !== host) host.appendChild(pane);
    paint(true); return pane;
  }
  function unmount() { if (pane) { pane.remove(); } sheet = ''; try { if (W.LowiChallengeVoice) W.LowiChallengeVoice.stop(); } catch (e) { } }
  function toast(m) { try { if (typeof W.toast === 'function') W.toast(m); else if (W.LowiToast) W.LowiToast(m); } catch (e) { } }

  D.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('#cwkPane [data-cwk]') : null; if (!b) return;
    const k = b.dataset.cwk, o = st();
    if (k === 'join') { o.start = ymd(startFor()); o.ate = {}; save(o); paint(); toast(L('You’re in. Let’s go!', 'Du bist dabei. Los geht’s!', '¡Te apuntaste!')); return; }
    if (k === 'again') { o.start = ymd(startFor(new Date(Date.now() + DAY))); o.ate = {}; o.ck = {}; save(o); paint(); return; }
    if (k === 'leave') { delete o.start; o.ate = {}; save(o); paint(); return; }
    if (k === 'pm' || k === 'pp') { o.ppl = Math.min(6, Math.max(1, people() + (k === 'pp' ? 1 : -1))); save(o); paint(true); return; }
    if (k === 'ex') { o.off = o.off || {}; o.off[b.dataset.id] = !o.off[b.dataset.id]; save(o); paint(true); return; }
    if (k === 'list') { listOpen = !listOpen; paint(true); return; }
    if (k === 'ate') { o.ate = o.ate || {}; const d = (o.ate[b.dataset.k] = o.ate[b.dataset.k] || {}); if (d[b.dataset.i]) delete d[b.dataset.i]; else d[b.dataset.i] = 1; save(o); paint(true); return; }
    if (k === 'rec') { sheet = b.dataset.id + ':' + b.dataset.rest; paint(true); return; }
    if (k === 'close') { sheet = ''; try { if (W.LowiChallengeVoice) W.LowiChallengeVoice.stop(); } catch (er) { } paint(true); return; }
    if (k === 'toapp') {
      const f = F(), bk = f.basket(people(), 0), items = bk.rows.map(r => ({ n: f.ITEMS[r.it][fl()], packs: r.packs, pe: f.ITEMS[r.it].price }));
      let n = 0; try { n = LOWI_SHELF.addIngredients(items, TX().UI[fl()].list) || items.length; } catch (er) { n = 0; }
      toast(TX().UI[fl()].added(n)); return;
    }
    if (k === 'share') {
      const url = new URL('fakeaway/', location.href).href, title = L('Weekly challenge: Fakeaway week', 'Wochen-Challenge: Fakeaway-Woche', 'Reto semanal: semana fakeaway');
      if (navigator.share) { navigator.share({ title, url }).catch(() => { }); return; }
      try { navigator.clipboard.writeText(url).then(() => toast(L('Link copied', 'Link kopiert', 'Enlace copiado'))); } catch (er) { }
    }
  });
  D.addEventListener('change', e => {
    const c = e.target; if (!c || !c.dataset || !c.dataset.cwkCk) return;
    const o = st(); o.ck = o.ck || {}; if (c.checked) o.ck[c.dataset.cwkCk] = 1; else delete o.ck[c.dataset.cwkCk]; save(o); paint(true);
  });
  D.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet && pane && pane.isConnected) { sheet = ''; paint(true); } });

  W.LowiChallenge = { mount, unmount, paint, html, startFor, phase, slotOf, rowsOf, kcalOf, kcalWeek, savedPerMonth, EXTRAS, isoWeek, ymd, KEY };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
