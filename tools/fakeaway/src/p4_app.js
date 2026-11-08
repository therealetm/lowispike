(function () {
'use strict';
const F = FAW, KEY = 'faw.v1';
let st = { lang: null, people: 2, seen: false, checks: {} };
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') st = Object.assign(st, s); } catch (e) {}
if (st.lang !== 'de' && st.lang !== 'en') st.lang = /^de/i.test(navigator.language || 'de') ? 'de' : 'en';
if (!(st.people >= 1 && st.people <= 6)) st.people = 2;
const cur0 = { ch: 0, app: false };
/* Nov 8 2026 (LOWiSPIKE): opened from the app (?app=1&lang=de&theme=dark), the page speaks the app's language, wears the app's
   Day or Night, and leaves the bottom strip to the app's round close button; a shared link (no app) keeps its own choice */
try { const q = new URLSearchParams(location.search);
  if (q.get('app') === '1') document.documentElement.classList.add('in-app');
  const ql = q.get('lang'); if ((ql === 'de' || ql === 'en') && q.get('app') === '1') st.lang = ql;
  const th = q.get('theme'); if (th === 'dark' || th === 'light') document.documentElement.setAttribute('data-theme', th);
  /* Nov 8 2026 (Emmanuel, opening the shared link in a private browser: "nun sieht das nicht mehr so aus, als würde das von derselben
     App kommen"): a shared link wears the app's own night look, whatever the phone's light setting */
  else document.documentElement.setAttribute('data-theme', 'dark');
  if (q.get('app') === '1') cur0.app = true;
  /* Nov 8 2026: opened as the app's Weekly Challenge (?ch=<calendar week>), the wordmark says so */
  const ch = q.get('ch'); if (q.get('app') === '1' && /^\d{1,2}$/.test(ch || '')) cur0.ch = +ch; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
const L = () => st.lang, T = () => UI[st.lang], DE = () => st.lang === 'de';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const todayIdx = () => (new Date().getDay() + 6) % 7;
const cur = { sel: todayIdx(), sheet: null, rec: null, last: null, more: false };

/* ---------- number words ---------- */
const FR3 = [[0, ''], [.25, '¼'], [1 / 3, '⅓'], [.5, '½'], [2 / 3, '⅔'], [.75, '¾'], [1, '']];
const FR4 = [[0, ''], [.25, '¼'], [.5, '½'], [.75, '¾'], [1, '']];
function frac(n, set) {
  set = set || FR3;
  let w = Math.floor(n + 1e-9), r = n - w, best = set[0];
  set.forEach(f => { if (Math.abs(f[0] - r) < Math.abs(best[0] - r)) best = f; });
  let val = w + best[0], txt;
  if (best[0] === 1) { w += 1; val = w; txt = String(w); } else txt = (w ? String(w) : '') + best[1];
  if (!txt || val === 0) { txt = '¼'; val = .25; }
  return { txt, val };
}
function gramTxt(g) {
  const r = g < 20 ? Math.max(5, Math.round(g / 5) * 5) : Math.round(g / 10) * 10;
  if (r >= 1000) { const kg = Math.round(r / 100) / 10; return (DE() ? String(kg).replace('.', ',') : String(kg)) + ' kg'; }
  return r + ' g';
}
const eur = v => DE() ? v.toFixed(2).replace('.', ',') + ' €' : '€' + v.toFixed(2);
const eur0 = v => DE() ? Math.round(v) + ' €' : '€' + Math.round(v);
const ppl = n => { const s = n % 1 ? frac(n, FR4).txt : String(n); return s + ' ' + (DE() ? (n > 1 ? 'Personen' : 'Person') : (n > 1 ? 'people' : 'person')); };
const about = () => DE() ? 'ca.' : 'about';

/* amount of an item as text. returns {am, noun}; noun = the name is already inside am */
function fmt(it, q) {
  const I = F.ITEMS[it], t = T(), i = DE() ? 0 : 1, nm = I.nm[L()];
  if (it === 'eggs') { const n = Math.max(1, Math.ceil(q - 1e-9)); return { am: n + ' ' + nm[n > 1 ? 1 : 0], noun: true }; }
  if (I.show === 'none') return { am: '', noun: true, name: nm[0] };
  if (I.show === 'tsp') {
    if (q >= 3) { const v = Math.max(1, Math.round(q / 3 * 2) / 2); return { am: frac(v, FR4).txt + ' ' + t.tbsS, noun: false }; }
    return { am: frac(q, FR4).txt + ' ' + t.tspS, noun: false };
  }
  if (I.show === 'spoon') {
    if (q <= 120) return { am: frac(Math.max(.5, Math.round(q / I.spoonG * 2) / 2), FR4).txt + ' ' + t.spoonS, noun: false };
    return { am: gramTxt(q), noun: false };
  }
  if (I.show === 'pc') { const f = frac(q / I.pc, FR4); return { am: f.txt + ' ' + nm[f.val > 1 ? 1 : 0], noun: true }; }
  if (I.show === 'leaf') { const n = Math.max(1, Math.ceil(q / I.pc - 1e-9)); return { am: n + ' ' + nm[n > 1 ? 1 : 0], noun: true }; }
  if (I.show === 'clove') { const f = frac(Math.max(.5, Math.round(q / I.pc * 2) / 2), FR4); return { am: f.txt + ' ' + nm[f.val > 1 ? 1 : 0], noun: true }; }
  if (I.show === 'lemon') {
    if (q < 8) return { am: t.pinch + ' ' + t.lemonN[0], noun: true };
    const f = frac(q / I.pc, FR4); return { am: f.txt + ' ' + t.lemonN[f.val > 1 ? 1 : 0], noun: true };
  }
  if (I.show === 'head') { const f = frac(q / I.pack, FR4); return { am: about() + ' ' + gramTxt(q) + ' (' + f.txt + ' ' + t.headOf + ')', noun: false }; }
  return { am: gramTxt(q), noun: false };
}

/* ---------- recipe text ---------- */
const PIECES = { pancakes: 4, nuggets: 6 };
function stepHtml(s, id, P, tm) {
  const r = F.RECIPES[id], t = T();
  return esc(s).replace(/\{(\w+)(?:\*([\d.]+))?\}/g, (m, k, mul) => {
    if (k === 'leftover') return esc(LEFT_TIP[L()]._ + (LEFT_TIP[L()][id] || ''));
    if (k === 'trays') { const n = Math.max(1, Math.ceil(P * tm / (r.perTray || 4) - 1e-9)); return '<b>' + n + ' ' + t.pcs.tray[n > 1 ? 1 : 0] + '</b>'; }
    if (k === 'pieces') { const n = Math.round(PIECES[id] * P * tm); return '<b>' + about() + ' ' + n + '</b>'; }
    const e = r.ing.find(x => x[0] === k); if (!e) return k;
    const f = fmt(k, e[1] * P * tm * (mul ? parseFloat(mul) : 1)), I = F.ITEMS[k];
    if (f.name) return f.name;
    return f.noun ? '<b>' + esc(f.am) + '</b>' : '<b>' + esc(f.am) + '</b> ' + esc(I.nm[L()][0]);
  });
}
const startTime = (day) => {
  const s = day.slots.find(x => F.RECIPES[x[1]] && F.RECIPES[x[1]].slot === 'dinner'); if (!s) return null;
  const m = 18 * 60 - F.RECIPES[s[1]].min; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};
const hm = s => +s.slice(0, 2) * 60 + +s.slice(3);
/* Nov 8 2026 (Emmanuel: "We shouldn't lock in the time ... morning, brunch, evening, nighttime ... or snack. So people don't feel
   fixed"): the plan keeps its order by the old times, but shows a part of the day instead of a clock time */
function slotOf(time, kind) {
  if (kind === 'thaw') return 'night';
  if (kind === 'shop') return 'forenoon';
  const m = hm(time);
  return m < 600 ? 'morning' : m < 720 ? 'brunch' : m < 900 ? 'midday' : m < 1020 ? 'snack' : 'evening';
}

/* ---------- main page ---------- */
function render() {
  const fid = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : null;
  const t = T(), P = F.portionsOf(st.people, 0), b = F.basket(st.people, 0), tdy = todayIdx(), day = F.WEEK[cur.sel];
  document.documentElement.lang = st.lang; document.title = t.title;
  const dish = k => k === 'pancakes' ? 'pancakes' : k;
  const st0 = startTime(day);
  const now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  const items = day.slots.map(s => ({ time: s[0], kind: s[1] === 'shop' ? 'shop' : s[1] === 'rest' ? 'rest' : 'meal', id: s[1] === 'rest' ? s[2] : s[1] }))
    .concat(day.tasks.map(k => ({ time: k[0], kind: 'thaw', id: k[2] }))).sort((a, c) => a.time < c.time ? -1 : a.time > c.time ? 1 : 0);
  let nowIdx = -1;
  if (cur.sel === tdy) { nowIdx = items.findIndex(x => hm(x.time) + 60 > nowM); }
  const rows = items.map((x, i) => {
    const cls = 'rw' + (cur.sel === tdy && i < nowIdx ? ' past' : '') + (i === nowIdx ? ' now' : '');
    const flag = i === nowIdx ? '<span class="flag">' + (hm(x.time) <= nowM + 15 ? t.now : t.next) + '</span>' : '';
    let card;
    if (x.kind === 'thaw') {
      const th = t.thaw[x.id];
      card = '<div class="card task">' + ICONS.thaw + '<div class="tx">' + flag + '<b>' + esc(th[0]) + ' (' + esc(th[1]) + ')</b><small>' + esc(t.thawSub) + '</small></div></div>';
    } else if (x.kind === 'shop') {
      card = '<button class="card shop" data-act="shop" data-fid="shop' + i + '"><span class="bubble sm">' + ICONS.shop + '</span><span class="tx">' + flag + '<b>' + t.shop + '</b><small>' + esc(t.shopSub(eur0(b.total))) + '</small></span><span class="go">›</span></button>';
    } else {
      const r = F.RECIPES[x.id], tx = REC[x.id][L()], rest = x.kind === 'rest';
      const sub = rest ? (tx.reheat || '') : tx.portion + (r.slot === 'dinner' ? ' · ' + r.min + ' ' + t.min : '');
      card = '<button class="card" data-rec="' + x.id + (rest ? ':rest' : '') + '" data-fid="r' + i + '"><span class="bubble sm">' + ICONS[r.icon] + '</span><span class="tx">' +
        (rest ? '<span class="flag">' + t.rest + '</span>' : flag) + '<b>' + esc(tx.name) + '</b><small>' + esc(sub) + '</small></span><span class="go">›</span></button>';
    }
    return '<li class="' + cls + '"><div class="row"><div class="t">' + esc(t.slotW[slotOf(x.time, x.kind)]) + '</div>' + card + '</div></li>';
  }).join('');
  const strip = F.WEEK.map((d, i) => '<button class="dayb' + (i === tdy ? ' today' : '') + '" data-d="' + i + '" data-fid="d' + i + '" aria-pressed="' + (i === cur.sel) + '" aria-label="' + t.daysL[i] + ', ' + esc(t.themes[d.theme]) + '">' + ICONS[dish(d.theme)] + '<span>' + t.daysS[i] + '</span></button>').join('');
  $('#app').innerHTML =
    '<div class="top"><div class="brand">' + (cur0.ch ? '<span class="chl">\u{1F3C6} ' + esc(DE() ? 'Wochen-Challenge \u00b7 KW\u00a0' + cur0.ch : 'Weekly challenge \u00b7 Wk\u00a0' + cur0.ch) + '</span>' : ICONS.leaf + 'LOWISPIKE') + '</div><div class="topr"><button class="shr" data-act="share" data-fid="share" aria-label="' + esc(t.share) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v6h14v-6"/></svg></button><div class="seg" role="group" aria-label="Language"><button data-lang="de" data-fid="ld" aria-pressed="' + DE() + '">DE</button><button data-lang="en" data-fid="le" aria-pressed="' + !DE() + '">EN</button></div></div></div>' +
    '<section class="hero"><div><div class="kick">' + (cur.sel === tdy ? t.today + ' · ' : '') + t.daysL[cur.sel] + '</div><h1>' + esc(t.themes[day.theme]) + '</h1><p>' + esc(st0 ? t.cookOnce : t.noCook) + '</p></div><div class="bubble">' + ICONS[dish(day.theme)] + '</div></section>' +
    (st.seen ? '' : '<section class="first"><h2>' + t.firstT + '</h2><ol>' + t.first.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol><button data-act="ok" data-fid="ok">' + t.ok + '</button></section>') +
    '<div class="days">' + strip + '</div>' +
    '<div class="dayhead"><h2>' + t.daysL[cur.sel] + '</h2><span>' + ppl(st.people) + '</span></div>' +
    '<ul class="tl">' + rows + '</ul>' +
    '<div class="foot"><span>' + esc(t.med) + '</span><b>' + esc(t.brand) + '</b></div>';
  $('#cta').innerHTML = '<button data-act="shop" data-fid="cta">' + esc(t.shopBtn(eur0(b.total))) + '</button>';
  if (fid) { const el = document.querySelector('[data-fid="' + fid + '"]'); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); }
}

/* ---------- recipe sheet ---------- */
function who() {
  const t = T();
  return '<div class="who"><div><b>' + t.who + '</b><small>' + t.whoHint + '</small></div><div class="step"><button data-act="pm" data-fid="pm" aria-label="−">−</button><output>' + (st.people % 1 ? frac(st.people, FR4).txt : st.people) + '</output><button data-act="pp" data-fid="pp" aria-label="+">+</button></div></div>';
}
function renderRecipe() {
  const { id, rest } = cur.rec, r = F.RECIPES[id], x = REC[id][L()], t = T(), P = F.portionsOf(st.people, 0), tm = F.times(id), pp = F.perPortion(id), el = $('#sheet-r .in');
  const ings = r.ing.map(e => {
    const f = fmt(e[0], e[1] * P * tm), I = F.ITEMS[e[0]];
    return '<li><label><input type="checkbox"><span class="nm">' + esc(I[L()]) + '</span><span class="am">' + esc(f.am) + '</span></label></li>';
  }).join('');
  const steps = x.steps.map(s => '<li>' + stepHtml(s, id, P, tm) + '</li>').join('');
  el.innerHTML =
    '<div class="grab"><button class="x" data-act="close" data-fid="x" aria-label="' + t.close + '">×</button></div>' +
    '<div class="rh"><div class="bubble md">' + ICONS[r.icon] + '</div><div><h2>' + esc(x.name) + '</h2><span class="swap">' + esc(x.statt) + '</span></div></div>' +
    (rest ? '<div class="note">' + ICONS.more + '<span><b>' + t.rest + '</b><br>' + t.reheat + ': ' + esc(x.reheat || '') + '</span></div>' : '') +
    '<div class="facts"><div class="fact"><b>' + r.min + '</b><span>' + t.min + (r.active ? ' · ' + r.active + (DE() ? ' aktiv' : ' active') : '') + '</span></div><div class="fact"><b>' + (P % 1 ? frac(P, FR4).txt : P) + '</b><span>' + t.persons + '</span></div><div class="fact"><b>' + eur(pp.eur) + '</b><span>' + t.perPortion + '</span></div></div>' +
    '<div class="eat"><span>' + t.eat + '</span><b>' + esc(x.portion) + '</b></div>' +
    '<div class="note">' + ICONS.drink + '<span><small>' + t.drink + '</small><br>' + esc(x.drink) + '</span></div>' +
    who() +
    (rest ? '' : (r.leftover ? '<div class="note">' + ICONS.more + '<span>' + t.double + '</span></div>' : '') +
      '<div class="sec"><h3>' + t.ing + '</h3><ul class="chk">' + ings + '</ul></div>' +
      '<div class="sec"><h3>' + t.steps + '</h3><ol class="steps">' + steps + '</ol></div>') +
    (r.slot !== 'snack' ? '<div class="note">' + ICONS.more + '<span>' + t.hungry + '</span></div>' : '') +
    '<details class="more"' + (cur.more ? ' open' : '') + '><summary>' + t.more + '</summary><p class="why"><b>' + t.why + '</b><br>' + esc(x.why) + '</p>' +
    '<p class="sm-note">' + t.perPer + '</p><div class="nut"><div><b>' + Math.round(pp.kcal) + '</b><span>' + t.kcal + '</span></div><div><b>' + Math.round(pp.protein) + ' g</b><span>' + t.protein + '</span></div><div><b>' + Math.round(pp.carbs) + ' g</b><span>' + t.carbs + '</span></div><div><b>' + Math.round(pp.fat) + ' g</b><span>' + t.fat + '</span></div></div></details>';
}

/* ---------- shopping sheet ---------- */
function renderList() {
  const t = T(), b = F.basket(st.people, 0), el = $('#sheet-l .in'), i = DE() ? 0 : 1;
  const perDay = (b.total - b.spare) / b.P / 7;
  const groups = F.AISLES.map(a => {
    const rs = b.rows.filter(r => F.ITEMS[r.it].aisle === a); if (!rs.length) return '';
    const sub = rs.reduce((s, r) => s + r.cost, 0);
    return '<div class="sec"><div class="aisle"><h3>' + t.aisles[a] + '</h3><small>' + eur(sub) + '</small></div><ul class="chk">' + rs.map(r => {
      const I = F.ITEMS[r.it], on = !!st.checks[r.it];
      return '<li class="' + (on ? 'done' : '') + '"><label><input type="checkbox" data-it="' + r.it + '"' + (on ? ' checked' : '') + '><span class="nm">' + esc(I[L()]) + '<span class="pk">' + esc(I.pk[i]) + (I.store ? ' · ' + I.store : '') + '</span></span><span class="am"><b>' + r.packs + '×</b><span class="pk">' + (I.est ? about() + ' ' : '') + eur(r.cost) + '</span></span></label></li>';
    }).join('') + '</ul></div>';
  }).join('');
  const basics = Object.keys(F.ITEMS).filter(k => F.ITEMS[k].basic);
  const bsum = basics.reduce((s, k) => s + F.ITEMS[k].price, 0);
  const n = b.rows.length, d = b.rows.filter(r => st.checks[r.it]).length;
  el.innerHTML =
    '<div class="grab"><button class="x" data-act="close" data-fid="x" aria-label="' + t.close + '">×</button></div>' +
    '<div class="big"><h2>' + t.list + '</h2><div class="eur">' + about() + ' ' + eur0(b.total) + '</div><p>' + esc(t.forP(ppl(st.people), eur(perDay))) + '</p><p>' + esc(t.spare(eur0(b.spare))) + '</p>' +
    '<div class="bar"><i id="barfill" style="width:' + Math.round(d / n * 100) + '%"></i></div><p id="barlabel">' + esc(t.inBasket(d, n)) + '</p></div>' +
    who() + groups +
    '<details class="more"><summary>' + t.basics + '</summary><p class="sm-note">' + esc(t.basicsSub(eur(bsum))) + '</p><ul class="chk">' + basics.map(k => '<li><label><span class="nm">' + esc(F.ITEMS[k][L()]) + '</span><span class="am">' + eur(F.ITEMS[k].price) + '</span></label></li>').join('') + '</ul></details>' +
    '<div class="note">' + ICONS.thaw + '<span><b>' + t.after + '</b><br>' + t.afterL.map(esc).join('<br>') + '</span></div>' +
    (appList() ? '<button class="btnapp" data-act="toapp" data-fid="toapp">' + esc(t.toApp) + '</button>' : '') +
    '<button class="btn2" data-act="copy" data-fid="copy">' + t.copy + '</button>' +
    '<p class="sm-note">' + esc(t.prices) + '</p>';
}
/* Nov 8 2026 (LOWiSPIKE): opened inside the app (Supermarkt), the list can go straight into the app's own shopping list, with the
   packs and the price of each pack; the shared page (no app around it) only shows Teilen and Liste kopieren */
function appList() { try { const P = window.parent; return P && P !== window && P.LOWI_SHELF && typeof P.LOWI_SHELF.addIngredients === 'function' ? P.LOWI_SHELF : null; } catch (e) { return null; } }
function toApp() {
  const S = appList(); if (!S) return; const b = F.basket(st.people, 0);
  const items = b.rows.map(r => ({ n: F.ITEMS[r.it][L()], packs: r.packs, pe: F.ITEMS[r.it].price }));
  let n = 0; try { n = S.addIngredients(items, T().list) || items.length; } catch (e) { n = 0; }
  toast(T().added(n || items.length));
}
function pageUrl() { return location.origin + location.pathname.replace(/index\.html$/, ''); }
function share() {
  const url = pageUrl(), t = T();
  if (navigator.share) { navigator.share({ title: t.title, url }).catch(() => {}); return; }
  try { navigator.clipboard.writeText(url).then(() => toast(t.shared), () => {}); } catch (e) {}
}
function listText() {
  const b = F.basket(st.people, 0), i = DE() ? 0 : 1, t = T(), out = [t.list + ' · ' + ppl(st.people) + ' · ' + eur0(b.total)];
  F.AISLES.forEach(a => { const rs = b.rows.filter(r => F.ITEMS[r.it].aisle === a); if (!rs.length) return; out.push('', t.aisles[a]); rs.forEach(r => out.push('[ ] ' + r.packs + '× ' + F.ITEMS[r.it][L()] + ' (' + F.ITEMS[r.it].pk[i] + ')')); });
  return out.join('\n');
}
function toast(msg) { const e = $('#toast'); e.textContent = msg; e.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove('on'), 1800); }
function copy() {
  const txt = listText(), done = () => toast(T().copied);
  const fb = () => { try { const a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); done(); } catch (e) {} };
  try { navigator.clipboard.writeText(txt).then(done, fb); } catch (e) { fb(); }
}

/* ---------- sheets ---------- */
/* Nov 8 2026 (Emmanuel: "wenn man ... klickt ... bei irgendein Rezept oder das mit der Einkaufsliste ... dass das dann ein zur Homepage
   bringt ... registrieren ... Oder wenn jemand schon einen Account hat, dann ... öffnet er sich halt in dem richtigen ... Sektion"):
   on a shared link (not inside the app) a recipe or the list opens this card instead: join in the app, which opens the Weekly
   Challenge right away (#challenge, challenge-week.js) once you are signed in or have signed up. The week itself stays readable. */
const APP_URL = () => location.pathname.replace(/fakeaway\/(index\.html)?$/, '') + '#challenge';
function hasAccount() { try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) || ''; if (/^sb-.*-auth-token$/.test(k) || k === 'lowispike.lang') return true; } } catch (e) { } return false; }
function renderJoin() {
  const de = DE(), acc = hasAccount(), el = $('#sheet-j .in');
  const pts = de ? ['\u{1F680} Start am Montag, mit Haken für jede Mahlzeit', '\u{1F3A7} Jedes Rezept zum Anhören, Schritt für Schritt', '\u{1F6D2} Die Einkaufsliste mit Preisen, zum Abhaken', '\u{1F4B8} Wie viel du im Monat sparst']
    : ['\u{1F680} Start on Monday, tick every meal', '\u{1F3A7} Every recipe to listen to, step by step', '\u{1F6D2} The shopping list with prices, to tick off', '\u{1F4B8} How much you save a month'];
  el.innerHTML = '<div class="grab"><button class="x" data-act="close" data-fid="x" aria-label="' + T().close + '">\u00d7</button></div>' +
    '<div class="join"><div class="bubble md">' + ICONS.leaf + '</div><h2>' + esc(de ? 'Mach die Challenge in der App' : 'Do the challenge in the app') + '</h2>' +
    '<p>' + esc(de ? 'Rezepte, Einkaufsliste und deine Woche gibt es in LOWiSPIKE. Kostenlos.' : 'Recipes, the shopping list and your week live in LOWiSPIKE. Free.') + '</p>' +
    '<ul>' + pts.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    '<a class="btnapp" href="' + esc(APP_URL()) + '" data-fid="join">' + esc(acc ? (de ? 'In der App öffnen' : 'Open in the app') : (de ? 'Kostenlos mitmachen' : 'Join for free')) + '</a>' +
    (acc ? '' : '<a class="btn2" href="' + esc(APP_URL()) + '">' + esc(de ? 'Ich habe schon ein Konto' : 'I already have an account') + '</a>') + '</div>';
}
function openSheet(w) {
  if (!cur0.app && (w === 'r' || w === 'l')) w = 'j';
  cur.sheet = w; cur.last = document.activeElement;
  if (w === 'r') renderRecipe(); else if (w === 'j') renderJoin(); else renderList();
  const el = $('#sheet-' + w); el.inert = false; el.setAttribute('aria-hidden', 'false'); el.classList.add('on');
  el.querySelector('.in').scrollTop = 0; $('#veil').classList.add('on'); document.body.style.overflow = 'hidden';
  const x = el.querySelector('.x'); if (x) x.focus({ preventScroll: true });
}
function closeSheet() {
  if (!cur.sheet) return;
  const el = $('#sheet-' + cur.sheet); el.classList.remove('on'); el.inert = true; el.setAttribute('aria-hidden', 'true');
  $('#veil').classList.remove('on'); document.body.style.overflow = ''; cur.sheet = null;
  if (cur.last && document.contains(cur.last)) cur.last.focus({ preventScroll: true });
}
function refresh() {
  const fid = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fid : null;
  render();
  if (cur.sheet === 'r') renderRecipe(); else if (cur.sheet === 'l') renderList();
  if (fid) { const el = document.querySelector('[data-fid="' + fid + '"]'); if (el) el.focus({ preventScroll: true }); }
}

/* Nov 8 2026: inside LOWiSPIKE (fakeaway/faw-core.js, FAW_HEADLESS) only the helpers are used; no page, no listeners */
if (!window.FAW_HEADLESS) {
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act],[data-rec],[data-d],[data-lang]'); if (!a) return;
  if (a.dataset.rec) { const p = a.dataset.rec.split(':'); cur.rec = { id: p[0], rest: p[1] === 'rest' }; openSheet('r'); return; }
  if (a.dataset.d) { cur.sel = +a.dataset.d; render(); return; }
  if (a.dataset.lang) { st.lang = a.dataset.lang; save(); refresh(); return; }
  const k = a.dataset.act;
  if (k === 'shop') openSheet('l');
  else if (k === 'close') closeSheet();
  else if (k === 'ok') { st.seen = true; save(); render(); }
  else if (k === 'pm' || k === 'pp') { st.people = Math.min(6, Math.max(1, st.people + (k === 'pp' ? .5 : -.5))); save(); refresh(); }
  else if (k === 'copy') copy();
  else if (k === 'share') share();
  else if (k === 'toapp') toApp();
});
$('#veil').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
document.addEventListener('change', e => {
  const c = e.target; if (c.dataset && c.dataset.it) {
    st.checks[c.dataset.it] = c.checked; save(); c.closest('li').classList.toggle('done', c.checked);
    const b = F.basket(st.people, 0), n = b.rows.length, d = b.rows.filter(r => st.checks[r.it]).length;
    $('#barfill').style.width = Math.round(d / n * 100) + '%'; $('#barlabel').textContent = T().inBasket(d, n);
  } else if (c.type === 'checkbox') c.closest('li').classList.toggle('done', c.checked);
});
document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('more') && cur.sheet === 'r') cur.more = e.target.open; }, true);
}
window.FAWAPP = { fmt, stepHtml, startTime, frac, FR4, eur, eur0, ppl, about, st, slotOf, hm, gramTxt };
if (!window.FAW_PRINT && !window.FAW_HEADLESS) {
render();
setInterval(() => { if (!cur.sheet) render(); }, 60000);
}
})();
