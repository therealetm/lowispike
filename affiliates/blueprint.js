/* LOWiSPIKE Affiliates · Master Blueprint page (21 Oct 2026). All logic lives in blueprint-core.js; this file only draws it.
   User text is always set with textContent, never as HTML. State is saved to this browser only (localStorage). */
(function () {
  'use strict';
  const B = window.LowiBlueprint;
  const $ = id => document.getElementById(id);
  const store = (function () { try { const k = '__lowi_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; } })();
  const persistent = store === window.localStorage;
  const embed = /[?&]embed=1\b/.test(location.search);
  if (embed) document.body.classList.add('embed');
  let S = B.load(store);
  let tab = 'today';
  const save = () => { if (!B.save(store, S)) toast('Speichern hat nicht geklappt. Ist der Speicher voll?'); };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (let i = 2; i < arguments.length; i++) { const c = arguments[i]; if (c == null || c === false) continue; (Array.isArray(c) ? c : [c]).forEach(x => x != null && x !== false && el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x)); }
    return el;
  }
  let toastT = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
  function copy(text, done) {
    const ok = () => toast(done || 'Kopiert.');
    const fallback = () => { const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;top:-1000px;opacity:0' }); ta.value = text; document.body.appendChild(ta); ta.select(); let r = false; try { r = document.execCommand('copy'); } catch (e) {} ta.remove(); r ? ok() : toast('Kopieren ging nicht. Markier den Text und kopier ihn selbst.'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }
  const P = () => S.product;
  const D = () => S.day[S.product] || 1;
  function entry(p, d) {
    S.days[p] = S.days[p] || {};
    const k = String(d);
    if (!S.days[p][k]) S.days[p][k] = { facts: {}, checks: {}, post: null };
    const e = S.days[p][k]; e.facts = e.facts || {}; e.checks = e.checks || {};
    return e;
  }
  const peek = (p, d) => B.dayEntry(S, p, d);

  /* ---------- Heutiges Video ---------- */
  function renderToday() {
    const v = $('viewToday'); v.textContent = '';
    const p = P(), d = D(), prod = B.PRODUCTS[p];
    v.appendChild(h('div', { class: 'products', role: 'group', 'aria-label': 'Produkt' },
      Object.keys(B.PRODUCTS).map(id => { const x = B.PRODUCTS[id]; return h('button', { type: 'button', class: 'prod', 'aria-pressed': String(id === p), 'data-product': id, onclick: () => { S.product = id; save(); renderToday(); } },
        h('b', { text: x.name }), h('span', { text: B.eur(x.price) + ' · Keyword „' + x.keyword + '“' })); })));
    v.appendChild(h('div', { class: 'daybar' },
      h('button', { type: 'button', class: 'ghost', 'aria-label': 'Vorheriger Tag', disabled: d <= 1, onclick: () => setDay(d - 1) }, '‹'),
      h('div', { class: 'day', id: 'dayLabel' }, 'Tag ' + d + ' von ' + B.CHALLENGE.days),
      h('button', { type: 'button', class: 'ghost', 'aria-label': 'Nächster Tag', disabled: d >= B.CHALLENGE.days, onclick: () => setDay(d + 1) }, '›')));
    const cols = h('div', { class: 'cols' });
    cols.appendChild(h('div', { class: 'card hero', id: 'checkCard' }));
    cols.appendChild(factsCard(p, d));
    cols.appendChild(h('div', { class: 'card', id: 'scriptCard' }));
    cols.appendChild(h('div', { class: 'card', id: 'shotCard' }));
    cols.appendChild(linkCard(p));
    cols.appendChild(postCard(p, d));
    cols.appendChild(h('div', { class: 'card', id: 'promptCard' }));
    v.appendChild(cols);
    refreshToday();
  }
  function setDay(n) { S.day[P()] = Math.max(1, Math.min(B.CHALLENGE.days, n)); save(); renderToday(); const l = $('dayLabel'); if (l) l.focus && l.setAttribute('tabindex', '-1'); }

  function refreshToday() { renderChecklist(); renderScript(); renderShots(); renderPrompt(); markFields(); }

  function renderChecklist() {
    const c = $('checkCard'); if (!c) return; c.textContent = '';
    const p = P(), d = D(), cl = B.checklist(S, p, d);
    c.appendChild(h('h2', { text: 'Mach dein Tag-' + d + '-Video' }));
    c.appendChild(h('div', { class: 'row small muted' }, cl.done + ' von ' + cl.total + ' erledigt'));
    const bar = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(cl.total), 'aria-valuenow': String(cl.done), 'aria-label': 'Fortschritt Checkliste' }, h('i'));
    bar.firstChild.style.width = Math.round(cl.done / cl.total * 100) + '%';
    c.appendChild(bar);
    c.appendChild(h('ul', { class: 'checks' }, cl.items.map(it => {
      const id = 'ck_' + it.k;
      return h('li', { class: it.done ? 'done' : '' },
        h('input', { type: 'checkbox', id, checked: it.done, disabled: it.auto, 'data-check': it.k, onchange: e => { const en = entry(P(), D()); if (e.target.checked) en.checks[it.k] = true; else delete en.checks[it.k]; save(); renderChecklist(); } }),
        h('label', { for: id, text: it.label }), it.auto ? h('span', { class: 'auto', text: 'automatisch' }) : null);
    })));
    if (cl.done === cl.total) c.appendChild(h('p', { class: 'status ok', text: 'Tag ' + d + ' ist erledigt. Weiter mit Tag ' + Math.min(d + 1, B.CHALLENGE.days) + ', sobald du bereit bist.' }));
  }

  function factsCard(p, d) {
    const card = h('div', { class: 'card', id: 'factsCard' }, h('h2', { text: 'Fakten von heute' }),
      h('p', { class: 'note', text: 'Nur echte Zahlen von heute. Was fehlt, bleibt im Skript als Lücke markiert, damit nichts Erfundenes im Video landet.' }));
    const grid = h('div', { class: 'fields' });
    const e = peek(p, d);
    for (const f of B.FIELDS[p]) {
      if (f.fromDay && d < f.fromDay) continue;
      const id = 'f_' + f.k;
      const wrap = h('div', { class: 'field' + (f.kind === 'text' && f.max > 60 || f.kind === 'shuffle' ? ' full' : ''), 'data-field': f.k });
      const setVal = v => { const en = entry(p, d); if (v === '' || v == null || v === false) delete en.facts[f.k]; else en.facts[f.k] = v; save(); refreshToday(); };
      if (f.kind === 'shuffle') {
        const out = h('output', { id, 'aria-live': 'polite', text: B.pickLabel(p, e.facts.pick) || 'Noch nichts gezogen' });
        wrap.appendChild(h('label', { for: id + 'Btn', text: f.label + (f.need ? '' : ' (optional)') }));
        wrap.appendChild(h('div', { class: 'shuffle' }, out, h('button', { type: 'button', id: id + 'Btn', onclick: ev => shuffle(p, d, out, ev.currentTarget) }, 'Shuffle')));
      } else if (f.kind === 'bool') {
        wrap.appendChild(h('div', { class: 'toggle' }, h('input', { type: 'checkbox', id, checked: !!e.facts[f.k], onchange: ev => setVal(ev.target.checked) }), h('label', { for: id, text: f.label })));
      } else if (f.kind === 'update') {
        wrap.appendChild(h('label', { for: id, text: f.label + ' (optional)' }));
        wrap.appendChild(h('select', { id, onchange: ev => setVal(ev.target.value === 'none' ? '' : ev.target.value) },
          Object.keys(B.UPDATE_LABELS).map(k => h('option', { value: k, selected: (e.facts[f.k] || 'none') === k, text: B.UPDATE_LABELS[k] }))));
      } else {
        wrap.appendChild(h('label', { for: id, text: f.label }));
        const inp = h(f.kind === 'text' && f.max > 60 ? 'textarea' : 'input', { id, type: f.kind === 'text' ? 'text' : 'text', inputmode: f.kind === 'int' ? 'numeric' : f.kind === 'money' ? 'decimal' : null, maxlength: String(f.max || 60), placeholder: f.hint || '', autocomplete: 'off' });
        inp.value = e.facts[f.k] == null ? '' : e.facts[f.k];
        inp.addEventListener('input', ev => setVal(ev.target.value));
        wrap.appendChild(inp);
      }
      wrap.appendChild(h('div', { class: 'err', id: id + 'Err', 'aria-live': 'polite' }));
      grid.appendChild(wrap);
    }
    card.appendChild(grid);
    return card;
  }
  function markFields() {
    const p = P(), d = D(), e = peek(p, d);
    const miss = B.missingFacts(p, d, e.facts), probs = B.factProblems(p, d, e.facts);
    document.querySelectorAll('#factsCard .field').forEach(w => {
      const k = w.getAttribute('data-field');
      w.classList.toggle('missing', miss.indexOf(k) >= 0);
      const err = w.querySelector('.err'); const pr = probs.find(x => x.k === k);
      if (err) err.textContent = pr ? pr.msg : '';
    });
  }
  function shuffle(p, d, out, btn) {
    const cur = peek(p, d).facts.pick;
    const run = B.shuffleRun(p, cur);
    const finish = () => { out.classList.remove('spin'); btn.disabled = false; const en = entry(p, d); en.facts.pick = run[run.length - 1]; out.textContent = B.pickLabel(p, en.facts.pick); save(); refreshToday(); };
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
    btn.disabled = true; out.classList.add('spin');
    let i = 0;
    const step = () => { out.textContent = B.pickLabel(p, run[i]); i++; if (i < run.length) setTimeout(step, 60 + i * 18); else finish(); };
    step();
  }

  function renderScript() {
    const c = $('scriptCard'); if (!c) return; c.textContent = '';
    const p = P(), d = D();
    const s = B.buildScript(p, d, peek(p, d).facts, d > 1 ? peek(p, d - 1).facts : null);
    c.appendChild(h('h2', { text: 'Skript zum Aufnehmen' }));
    c.appendChild(h('div', { class: 'onscreen', id: 'onScreen' }, h('span', { class: 'tiny', text: 'Text auf dem Bildschirm: ' }), s.onScreen));
    for (const x of s.sections) {
      const sec = h('div', { class: 'sec', 'data-sec': x.id }, h('span', { class: 'shot' + (x.shot === 'screen' ? ' screen' : ''), text: x.label }));
      for (const line of x.lines) {
        const pEl = h('p');
        line.split(B.GAP).forEach((part, i) => { if (i) pEl.appendChild(h('span', { class: 'gap', text: 'fehlt' })); if (part) pEl.appendChild(document.createTextNode(part)); });
        sec.appendChild(pEl);
      }
      if (x.screen) sec.appendChild(h('p', { class: 'note', text: x.screen }));
      c.appendChild(sec);
    }
    c.appendChild(h('div', { class: 'row' },
      h('button', { type: 'button', id: 'copyScript', onclick: () => copy(B.scriptText(s), s.ready ? 'Skript kopiert.' : 'Kopiert, aber im Skript fehlen noch Fakten.') }, s.ready ? 'Skript kopieren' : 'Skript kopieren (mit Lücken)')));
    if (!s.ready) c.appendChild(h('p', { class: 'status warn', id: 'scriptGaps', text: 'Noch ' + s.missing.length + (s.missing.length === 1 ? ' Fakt fehlt' : ' Fakten fehlen') + '. Trag sie oben ein, bevor du aufnimmst.' }));
  }
  function renderShots() {
    const c = $('shotCard'); if (!c) return; c.textContent = '';
    const p = P(), d = D();
    const shots = B.shotList(p, d, peek(p, d).facts);
    c.appendChild(h('h2', { text: 'Shotliste' }));
    c.appendChild(h('ol', { class: 'shots' }, shots.map(s => h('li', null, h('b', { text: s.title }), h('div', { class: 'small', text: s.how }), s.beats ? h('ul', null, s.beats.map(b => h('li', { class: 'small', text: b }))) : null))));
  }
  function renderPrompt() {
    const c = $('promptCard'); if (!c) return; c.textContent = '';
    const p = P(), txt = B.agentPrompt(p, peek(p, D()).facts);
    c.appendChild(h('h2', { text: p === 'website' ? 'Auftrag an den Lead-Skill' : 'Auftrag an den Sponsoren-Agent' }));
    c.appendChild(h('pre', { class: 'copy', text: txt }));
    c.appendChild(h('div', { class: 'row' }, h('button', { type: 'button', class: 'ghost', onclick: () => copy(txt, 'Auftrag kopiert.') }, 'Auftrag kopieren')));
    c.appendChild(h('p', { class: 'note', text: p === 'website'
      ? 'Kalte Werbe-E-Mails an Firmen sind in Deutschland rechtlich heikel. Klär selbst, ob und wie du jemanden anschreiben darfst. Diese Seite verschickt nichts.'
      : 'Diese Seite verschickt nichts. Ob und wen dein Agent anschreibt, entscheidest du, und die Regeln dazu klärst du selbst.' }));
  }

  function linkCard(p) {
    const prod = B.PRODUCTS[p];
    const card = h('div', { class: 'card', id: 'linkCard' }, h('h2', { text: 'Dein Link und CTA' }));
    const inp = h('input', { type: 'url', id: 'affLink', inputmode: 'url', autocomplete: 'off', spellcheck: 'false', placeholder: 'https://shop.beacons.ai/emanuristic/…?affiliateLinkId=…' });
    inp.value = S.links[p] || '';
    const status = h('p', { class: 'status', id: 'linkStatus', 'aria-live': 'polite' });
    const paint = () => { const r = B.checkLink(p, S.links[p]); status.className = 'status ' + (r.level === 'ok' ? 'ok' : r.level === 'empty' ? '' : r.level === 'warn' ? 'warn' : 'error'); status.textContent = r.msg; copyBtn.disabled = !r.ok; };
    const copyBtn = h('button', { type: 'button', class: 'ghost', onclick: () => copy(S.links[p].trim(), 'Dein Link ist kopiert.') }, 'Link kopieren');
    inp.addEventListener('input', () => { S.links[p] = inp.value.trim(); save(); paint(); renderChecklist(); });
    card.appendChild(h('div', { class: 'field full' }, h('label', { for: 'affLink', text: 'Dein Affiliate-Link für ' + prod.name }), inp));
    card.appendChild(status);
    card.appendChild(h('p', { class: 'note', text: 'Deinen eigenen Link findest du in Beacons unter deinen Affiliate-Links. Nimm nicht den Link von jemand anderem, sonst geht die Provision an ihn.' }));
    card.appendChild(h('h3', { text: 'CTA im Video' }));
    card.appendChild(h('pre', { class: 'copy', id: 'ctaText', text: prod.cta }));
    card.appendChild(h('div', { class: 'row' }, copyBtn, h('button', { type: 'button', class: 'ghost', onclick: () => copy(prod.cta, 'CTA kopiert.') }, 'CTA kopieren')));
    paint();
    return card;
  }

  function postCard(p, d) {
    const card = h('div', { class: 'card', id: 'postCard' }, h('h2', { text: 'Posten' }));
    const cap = B.caption(p, d, S);
    card.appendChild(h('h3', { text: 'Caption' }));
    card.appendChild(h('pre', { class: 'copy', id: 'captionText', text: cap }));
    card.appendChild(h('div', { class: 'row' }, h('button', { type: 'button', class: 'ghost', onclick: () => copy(cap, 'Caption kopiert.') }, 'Caption kopieren')));
    card.appendChild(h('p', { class: 'note', text: 'Wer per Kommentar den Link bekommt, kauft über deinen Link. Kennzeichne das Video als Werbung.' }));
    const e = peek(p, d);
    const box = h('div');
    const paint = () => {
      box.textContent = '';
      const cur = peek(p, d).post;
      if (cur && cur.url) {
        box.appendChild(h('p', { class: 'status ok', id: 'postedInfo' }, 'Gepostet' + (cur.date ? ' am ' + cur.date.split('-').reverse().join('.') : '') + ': ', h('a', { href: cur.url, target: '_blank', rel: 'noopener noreferrer', style: 'color:inherit;overflow-wrap:anywhere', text: cur.url })));
        box.appendChild(h('button', { type: 'button', class: 'ghost', onclick: () => { entry(p, d).post = null; save(); paint(); renderChecklist(); } }, 'Nicht gepostet'));
        return;
      }
      const inp = h('input', { type: 'url', id: 'postUrl', inputmode: 'url', autocomplete: 'off', placeholder: 'https://www.tiktok.com/@…/video/…' });
      const err = h('div', { class: 'err', 'aria-live': 'polite' });
      box.appendChild(h('div', { class: 'field full' }, h('label', { for: 'postUrl', text: 'Link zum geposteten Video' }), inp, err));
      box.appendChild(h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { type: 'button', id: 'markPosted', onclick: () => {
        let u; try { u = new URL(inp.value.trim()); } catch (x) { u = null; }
        if (!u || u.protocol !== 'https:') { err.textContent = 'Füge den vollständigen Link zum Video ein (beginnt mit https://).'; return; }
        entry(p, d).post = { url: u.href.slice(0, 500), date: today() }; save(); paint(); renderChecklist(); toast('Tag ' + d + ' als gepostet gespeichert.');
      } }, 'Als gepostet speichern')));
    };
    paint();
    card.appendChild(box);
    return card;
  }

  /* ---------- Meine Zahlen ---------- */
  function renderNumbers() {
    const v = $('viewNumbers'); v.textContent = '';
    const E = B.earnings(S);
    const tierCard = h('div', { class: 'card hero', id: 'tierCard' }, h('h2', { text: 'Deine Provisionsstufe' }));
    if (E.nextRate != null) {
      tierCard.appendChild(h('p', { id: 'tierLine', text: E.count === 0 ? 'Noch kein bestätigter Verkauf. Dein erster Verkauf bringt ' + B.pct(E.rateNow, 0) + ' Provision.' : E.count + (E.count === 1 ? ' bestätigter Verkauf' : ' bestätigte Verkäufe') + '. Du bekommst gerade ' + B.pct(E.rateNow, 0) + '. Noch ' + E.toNext + (E.toNext === 1 ? ' Verkauf' : ' Verkäufe') + ' bis ' + B.pct(E.nextRate, 0) + '.' }));
    } else tierCard.appendChild(h('p', { id: 'tierLine', text: E.count + ' bestätigte Verkäufe. Du bist auf der höchsten Stufe: ' + B.pct(E.rateNow, 0) + '.' }));
    const bar = h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(E.progress * 100)), 'aria-label': 'Fortschritt zur nächsten Stufe' }, h('i'));
    bar.firstChild.style.width = Math.round(E.progress * 100) + '%';
    tierCard.appendChild(bar);
    tierCard.appendChild(h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', { text: String(E.count) }), h('span', { text: 'bestätigte Verkäufe' })),
      h('div', { class: 'stat' }, h('b', { text: B.eur(E.revenue) }), h('span', { text: 'Umsatz' })),
      h('div', { class: 'stat' }, h('b', { id: 'commission', text: B.eur(E.commission) }), h('span', { text: 'Provision' }))));
    tierCard.appendChild(h('p', { class: 'small', id: 'feeLine', text: E.feeWaived ? 'Die Monatsgebühr von ' + B.MONTHLY_FEE + ' € entfällt laut Konditionen dauerhaft, seit ' + E.feeWaivedFrom.split('-').reverse().join('/') + ' (Monat deines zweiten Verkaufs).' : 'Ab dem Monat deines zweiten bestätigten Verkaufs entfällt die Monatsgebühr von ' + B.MONTHLY_FEE + ' € dauerhaft. Noch ' + E.toWaiver + (E.toWaiver === 1 ? ' Verkauf.' : ' Verkäufe.') }));
    tierCard.appendChild(h('table', { class: 'sales', 'aria-label': 'Provisionsstufen' }, h('thead', null, h('tr', null, h('th', { text: 'Verkäufe' }), h('th', { text: 'Provision' }))),
      h('tbody', null, B.TIERS.map((t, i) => h('tr', { style: i === E.tierIndex ? 'color:var(--teal);font-weight:700' : null }, h('td', { text: t.to === Infinity ? 'ab ' + t.from : t.from + '–' + t.to }), h('td', { text: B.pct(t.rate, 0) }))))));
    tierCard.appendChild(h('p', { class: 'note', text: 'Nur bestätigte Verkäufe zählen. Jeder Verkauf wird mit der Stufe gerechnet, in die er fällt. Das ist eine Rechenhilfe nach den Partner-Konditionen; maßgeblich sind deine Vereinbarung und die Auszahlung in Beacons.' }));
    v.appendChild(tierCard);

    const cols = h('div', { class: 'cols' });
    cols.appendChild(funnelCard());
    cols.appendChild(salesCard());
    cols.appendChild(backupCard());
    v.appendChild(cols);
  }
  function funnelCard() {
    const card = h('div', { class: 'card', id: 'funnelCard' }, h('h2', { text: 'Vom Video zum Verkauf' }));
    const F = B.funnel(S);
    card.appendChild(h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', { id: 'fPosts', text: String(F.posts) }), h('span', { text: 'Videos gepostet' })),
      h('div', { class: 'stat' }, h('b', { id: 'fClicks', text: F.clicks == null ? '–' : String(F.clicks) }), h('span', { text: 'Link-Klicks' })),
      h('div', { class: 'stat' }, h('b', { id: 'fSales', text: String(F.confirmed) }), h('span', { text: 'bestätigte Verkäufe' }))));
    card.appendChild(h('div', { class: 'rates' },
      h('div', { class: 'stat' }, h('b', { id: 'fCpp', text: F.clicksPerPost == null ? '–' : F.clicksPerPost.toFixed(1).replace('.', ',') }), h('span', { text: 'Klicks pro Video' })),
      h('div', { class: 'stat' }, h('b', { id: 'fSpc', text: B.pct(F.salesPerClick) }), h('span', { text: 'Klicks, die kaufen' }))));
    F.warnings.forEach(w => card.appendChild(h('p', { class: 'status warn', text: w })));
    if (F.reported) card.appendChild(h('p', { class: 'small muted', text: F.reported + (F.reported === 1 ? ' gemeldeter Verkauf ist' : ' gemeldete Verkäufe sind') + ' noch nicht bestätigt und zählen nicht mit.' }));
    card.appendChild(h('h3', { text: 'Link-Klicks laut Beacons' }));
    for (const p of Object.keys(B.PRODUCTS)) {
      const id = 'clicks_' + p, ck = S.clicks[p];
      const inp = h('input', { type: 'text', id, inputmode: 'numeric', autocomplete: 'off', placeholder: 'Gesamtzahl aus Beacons' });
      inp.value = ck ? String(ck.total) : '';
      const err = h('div', { class: 'err', 'aria-live': 'polite', text: ck && ck.asOf ? 'Stand ' + ck.asOf.split('-').reverse().join('.') : '' });
      inp.addEventListener('change', () => { const r = B.setClicks(S, p, inp.value, today()); if (!r.ok) { err.textContent = r.msg; return; } save(); renderNumbers(); });
      card.appendChild(h('div', { class: 'field full', style: 'margin-bottom:8px' }, h('label', { for: id, text: B.PRODUCTS[p].name }), inp, err));
    }
    card.appendChild(h('p', { class: 'note', text: 'Diese Seite kann Klicks nicht selbst zählen: Sie sieht deinen Link nicht, wenn andere ihn öffnen. Trag die Gesamtzahl aus deinem Beacons-Dashboard ein. Klicks und Verkäufe kommen auch von Profil, Story oder Kommentaren, darum zeigt die Quote den Trend, nicht welches Video verkauft hat.' }));
    return card;
  }
  function salesCard() {
    const card = h('div', { class: 'card', id: 'salesCard' }, h('h2', { text: 'Verkäufe' }));
    const form = h('form', { id: 'saleForm', novalidate: true });
    const pSel = h('select', { id: 'sProduct' }, Object.keys(B.PRODUCTS).map(id => h('option', { value: id, selected: id === S.product, text: B.PRODUCTS[id].name })));
    const date = h('input', { type: 'date', id: 'sDate', max: today() }); date.value = today();
    const amt = h('input', { type: 'text', id: 'sAmount', inputmode: 'decimal', autocomplete: 'off' }); amt.value = String(B.PRODUCTS[S.product].price);
    const st = h('select', { id: 'sStatus' }, h('option', { value: 'confirmed', text: 'Bestätigt in Beacons' }), h('option', { value: 'reported', text: 'Gemeldet, noch nicht geprüft' }));
    const ref = h('input', { type: 'text', id: 'sRef', autocomplete: 'off', maxlength: '60', placeholder: 'aus der Beacons-Bestellung' });
    const err = h('div', { class: 'err', 'aria-live': 'polite' });
    pSel.addEventListener('change', () => { amt.value = String(B.PRODUCTS[pSel.value].price); });
    form.appendChild(h('div', { class: 'fields' },
      h('div', { class: 'field' }, h('label', { for: 'sProduct', text: 'Produkt' }), pSel),
      h('div', { class: 'field' }, h('label', { for: 'sDate', text: 'Datum' }), date),
      h('div', { class: 'field' }, h('label', { for: 'sAmount', text: 'Preis (€)' }), amt),
      h('div', { class: 'field' }, h('label', { for: 'sStatus', text: 'Status' }), st),
      h('div', { class: 'field full' }, h('label', { for: 'sRef', text: 'Bestellnummer (Pflicht bei „bestätigt“)' }), ref)));
    form.appendChild(err);
    form.appendChild(h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { type: 'submit', id: 'addSale' }, 'Verkauf eintragen')));
    form.addEventListener('submit', ev => { ev.preventDefault(); const r = B.addSale(S, { product: pSel.value, date: date.value, amount: amt.value, status: st.value, ref: ref.value }, today()); if (!r.ok) { err.textContent = r.msg; return; } save(); renderNumbers(); toast('Verkauf eingetragen.'); });
    card.appendChild(form);
    const list = S.sales.slice().sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.at - a.at);
    if (!list.length) card.appendChild(h('p', { class: 'muted small', id: 'noSales', text: 'Noch keine Verkäufe eingetragen.' }));
    else card.appendChild(h('table', { class: 'sales', id: 'salesTable' }, h('thead', null, h('tr', null, ['Datum', 'Produkt', 'Preis', 'Status', ''].map(t => h('th', { text: t })))),
      h('tbody', null, list.map(s => h('tr', null,
        h('td', { text: s.date.split('-').reverse().join('.') }), h('td', { text: B.PRODUCTS[s.product].short }), h('td', { text: B.eur(s.amount) }),
        h('td', null, h('span', { class: 'pill ' + (s.status === 'confirmed' ? 'ok' : 'warn'), text: s.status === 'confirmed' ? 'bestätigt' : 'gemeldet' }), s.ref ? h('div', { class: 'tiny', text: s.ref }) : null),
        h('td', null, h('button', { type: 'button', class: 'ghost', 'aria-label': 'Verkauf vom ' + s.date + ' löschen', style: 'min-height:36px;padding:0 10px', onclick: () => { if (!confirm('Diesen Verkauf löschen?')) return; S.sales = S.sales.filter(x => x.id !== s.id); save(); renderNumbers(); } }, '✕')))))));
    card.appendChild(h('p', { class: 'note', text: '„Bestätigt“ heißt: Du hast den Verkauf in deinem Beacons-Dashboard gesehen und die Bestellnummer eingetragen. Diese Seite kann das nicht selbst prüfen. Jede Bestellnummer zählt nur einmal.' }));
    return card;
  }
  function backupCard() {
    const card = h('div', { class: 'card', id: 'backupCard' }, h('h2', { text: 'Sicherung' }));
    card.appendChild(h('p', { class: 'small muted', text: persistent ? 'Deine Daten liegen nur in diesem Browser. Lade ab und zu eine Sicherung herunter, z. B. bevor du das Gerät wechselst.' : 'Dieser Browser erlaubt kein Speichern (privater Modus?). Was du einträgst, ist beim Schließen weg. Lade vorher eine Sicherung herunter.' }));
    const file = h('input', { type: 'file', id: 'importFile', accept: 'application/json,.json', class: 'sr' });
    file.addEventListener('change', () => {
      const f = file.files && file.files[0]; if (!f) return;
      if (f.size > 2e6) { toast('Die Datei ist zu groß.'); return; }
      f.text().then(t => { let raw; try { raw = JSON.parse(t); } catch (e) { toast('Das ist keine Sicherung von dieser Seite.'); return; } if (!raw || raw.v !== B.VERSION) { toast('Das ist keine Sicherung von dieser Seite.'); return; } if (!confirm('Sicherung laden? Das ersetzt, was gerade hier gespeichert ist.')) return; S = B.sanitize(raw); save(); renderAll(); toast('Sicherung geladen.'); });
    });
    card.appendChild(h('div', { class: 'row' },
      h('button', { type: 'button', class: 'ghost', id: 'exportBtn', onclick: () => { const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(blob), download: 'lowispike-affiliate-' + today() + '.json' }); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } }, 'Sicherung herunterladen'),
      h('label', { for: 'importFile', class: 'btn', style: 'background:transparent;box-shadow:none;border-color:var(--line)', tabindex: '0', role: 'button', onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } } }, 'Sicherung laden'), file,
      h('button', { type: 'button', class: 'ghost', onclick: () => { if (!confirm('Alles auf diesem Gerät löschen: Tage, Links, Klicks und Verkäufe?')) return; S = B.fresh(); save(); renderAll(); toast('Alles gelöscht.'); } }, 'Alles löschen')));
    return card;
  }

  /* ---------- Tabs, share, boot ---------- */
  function setTab(t) {
    tab = t;
    $('tabToday').setAttribute('aria-selected', String(t === 'today')); $('tabNumbers').setAttribute('aria-selected', String(t === 'numbers'));
    $('viewToday').hidden = t !== 'today'; $('viewNumbers').hidden = t !== 'numbers';
    if (t === 'numbers') renderNumbers(); else renderToday();
    try { history.replaceState(null, '', location.pathname + location.search + (t === 'numbers' ? '#zahlen' : '')); } catch (e) {}
  }
  function renderAll() { setTab(tab); }
  $('tabToday').addEventListener('click', () => setTab('today'));
  $('tabNumbers').addEventListener('click', () => setTab('numbers'));
  document.querySelector('.tabs').addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const t = tab === 'today' ? 'numbers' : 'today'; setTab(t); (t === 'today' ? $('tabToday') : $('tabNumbers')).focus(); } });
  $('shareLink').addEventListener('click', () => {
    const url = location.origin + location.pathname;
    if (navigator.share && !embed) navigator.share({ title: 'LOWiSPIKE Affiliates · Master Blueprint', url }).catch(() => {}); else copy(url, 'Link zur Affiliate-Seite kopiert.');
  });
  window.addEventListener('storage', e => { if (e.key === B.STORE_KEY) { S = B.load(store); renderAll(); } });
  setTab(location.hash === '#zahlen' ? 'numbers' : 'today');
})();
