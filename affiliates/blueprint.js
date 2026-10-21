/* LOWiSPIKE Affiliates page (simplified 21 Oct 2026). All content lives in blueprint-core.js; this file only draws it.
   Pick a series, read and copy the baseline script, see the commission levels. Nothing is typed in and nothing is stored. */
(function () {
  'use strict';
  const B = window.LowiBlueprint;
  const $ = id => document.getElementById(id);
  if (/[?&]embed=1\b/.test(location.search)) document.body.classList.add('embed');

  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) { const c = arguments[i]; if (c == null || c === false) continue; (Array.isArray(c) ? c : [c]).forEach(x => x != null && x !== false && el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x)); }
    return el;
  }
  /* Placeholders like [Branche] stay plain bracketed text, only tinted so they are easy to spot. */
  function withPh(text) { return String(text).split(/(\[[^\]]+\])/).filter(Boolean).map(p => /^\[[^\]]+\]$/.test(p) ? h('span', { class: 'ph', text: p }) : p); }
  let toastT = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); }
  function copy(text, done) {
    const ok = () => toast(done);
    const fallback = () => {
      const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;top:-1000px;opacity:0' }); ta.value = text; document.body.appendChild(ta); ta.select();
      let r = false; try { r = document.execCommand('copy'); } catch (e) {} ta.remove();
      if (r) ok(); else toast('Kopieren ging nicht. Halte den Text gedrückt und kopiere ihn von Hand.');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }

  let pick = '';
  function renderCards() {
    const box = $('seriesCards'); box.textContent = '';
    for (const id of B.ORDER) {
      const s = B.SERIES[id];
      box.appendChild(h('button', { type: 'button', class: 'pickcard', id: 'pick-' + id, 'aria-pressed': String(pick === id), 'aria-controls': 'scriptView', onclick: () => choose(id, true) },
        h('b', { text: s.title }), h('span', { class: 'prod', text: s.product }), h('span', { text: s.blurb }), h('span', { class: 'kw', text: 'Keyword \u201e' + s.keyword + '\u201c' })));
    }
  }
  function renderScript() {
    const v = $('scriptView'); v.textContent = '';
    const s = B.SERIES[pick];
    if (!s) { v.hidden = true; return; }
    v.hidden = false;
    const scenes = s.scenes.map((x, i) => h('div', { class: 'scene' },
      h('div', { class: 'shot ' + x.shot, text: (i + 1) + ' \u00b7 ' + x.label }),
      x.lines.map(l => h('p', null, withPh(l))),
      x.note ? h('p', { class: 'note', text: x.note }) : null));
    v.appendChild(h('div', { class: 'card hero', id: 'scriptCard' },
      h('h2', { text: 'Skript \u00b7 ' + s.title }),
      h('p', { class: 'small muted', text: 'Eckige Klammern tauschst du gegen deine eigenen Angaben, zum Beispiel ' + B.placeholders(pick).slice(0, 2).join(' oder ') + '.' }),
      h('div', { class: 'label', text: 'Text auf dem Bildschirm' }),
      h('div', { class: 'onscreen' }, withPh(s.onScreen)),
      scenes,
      h('button', { type: 'button', class: 'wide', id: 'copyScript', onclick: () => copy(B.scriptText(pick), 'Skript kopiert.') }, 'Skript kopieren')));
    v.appendChild(h('div', { class: 'card', id: 'shotCard' },
      h('h2', { text: 'Shotliste' }),
      h('ol', { class: 'shots' }, s.shots.map(x => h('li', null, h('b', { text: x.title }), h('div', { text: x.how }), x.beats ? h('ul', null, x.beats.map(b => h('li', { text: b }))) : null))),
      h('p', { class: 'note', text: 'Du musst nicht zwischen iPad und Laptop wechseln: iPad nur im Opening und im Outro, dazwischen durchgehend der Laptop.' })));
    v.appendChild(h('div', { class: 'card', id: 'captionCard' },
      h('h2', { text: 'Caption' }),
      h('p', { class: 'caption' }, withPh(s.caption)),
      h('button', { type: 'button', class: 'ghost', id: 'copyCaption', onclick: () => copy(s.caption, 'Caption kopiert.') }, 'Caption kopieren')));
  }
  function choose(id, scroll) {
    pick = B.SERIES[id] ? id : '';
    renderCards(); renderScript();
    try { history.replaceState(null, '', location.pathname + location.search + (pick ? '#' + pick : '')); } catch (e) {}
    if (scroll && pick) { const el = $('scriptView'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function renderEarnings() {
    $('earnLead').textContent = 'Pro Verkauf (' + B.eur(B.PRICE) + ') bekommst du deinen Anteil. Je mehr Verk\u00e4ufe, desto h\u00f6her dein Level. Jeder Verkauf z\u00e4hlt mit dem Prozentsatz seines Levels.';
    const t = h('table', { class: 'levels' },
      h('thead', null, h('tr', null, ['Level', 'Verk\u00e4ufe', 'Provision', 'Pro Verkauf'].map(c => h('th', { scope: 'col', text: c })))),
      h('tbody', null, B.levels().map(l => h('tr', null, h('td', { class: 'lv' }, h('span', { class: 'lvw', text: 'Level ' }), String(l.level)), h('td', { text: l.range }), h('td', { class: 'rate', text: l.pct }), h('td', { class: 'eur', text: B.eur(l.perSale) })))));
    $('levelTable').textContent = ''; $('levelTable').appendChild(t);
    const ex = h('ul', { class: 'examples' }, B.examples().map(e => h('li', null, h('span', { text: e.sales + ' Verk\u00e4ufe' }), h('b', { text: B.eur(e.total) }), h('span', { class: 'tiny', text: 'Level ' + e.level }))));
    $('exampleList').textContent = ''; $('exampleList').appendChild(ex);
    $('terms').textContent = 'Konditionen laut Partner-Dashboard, Stand 21.10.2026, bei ' + B.eur(B.PRICE) + ' pro Verkauf. Die Beispiele sind Summen \u00fcber alle Verk\u00e4ufe. Die 30.000\u00a0\u20ac im Skript sind das Ziel der Challenge, kein versprochenes Ergebnis.';
  }

  renderEarnings();
  const fromHash = (location.hash || '').replace('#', '');
  choose(B.SERIES[fromHash] ? fromHash : '', false);
})();
