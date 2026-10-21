/* LOWiSPIKE Affiliates page. All content lives in blueprint-core.js; this file only draws it.
   21 Oct 2026 redesign (Eman: "it looks shit, it shouldn't be cramped", reference: Eden's Plan screen): one thing per screen.
   Start (series switch, pill, big headline, one card of three rows, Start button) -> Skript -> Aufnahme -> Verdienst.
   Nothing is typed in and nothing is stored; the hash only remembers the series and the screen. */
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
  /* Line icons, drawn as SVG nodes (never HTML strings). */
  const ICONS = {
    script: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h6'],
    camera: ['M3 8h4l2-3h6l2 3h4v12H3z', 'M12 10.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7'],
    earn: ['M4 20V12', 'M10 20V7', 'M16 20V10', 'M21 20H3', 'M14 4h6v6'],
    screen: ['M3 5h18v11H3z', 'M8 20h8', 'M12 16v4'],
    talk: ['M12 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7', 'M5 20c1-4 4-6 7-6s6 2 7 6'],
    caption: ['M4 6h16', 'M4 11h16', 'M4 16h10']
  };
  function icon(name) {
    const NS = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    for (const d of ICONS[name] || ICONS.script) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); }
    return h('span', { class: 'tile' }, s);
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

  const VIEWS = { start: 'viewStart', script: 'scriptView', shots: 'shotView', earn: 'earnView' };
  let pick = B.ORDER[0], view = 'start', from = 'start';

  /* Segmented control (Webdesign | UGC). The one on the start screen keeps the ids pick-<series>. */
  function seg(prefix, label) {
    return h('div', { class: 'seg', role: 'group', 'aria-label': label || 'Serie wählen' }, B.ORDER.map(id => h('button', {
      type: 'button', id: prefix + id, 'aria-pressed': String(pick === id), onclick: () => { if (pick !== id) { pick = id; render(); sync(); } }
    }, B.SERIES[id].title)));
  }
  function backBtn(to) { return h('button', { type: 'button', class: 'back', 'aria-label': 'Zurück', onclick: () => go(typeof to === 'function' ? to() : to) }, h('span', { 'aria-hidden': 'true', text: '‹' })); }
  function row(ic, title, sub, onclick, extra) {
    const kids = [icon(ic), h('span', { class: 'txt' }, h('b', null, withPh(title)), sub ? h('span', null, withPh(sub)) : null, extra || null)];
    return onclick ? h('button', { type: 'button', class: 'row', onclick }, kids, h('span', { class: 'chev', 'aria-hidden': 'true', text: '›' })) : h('div', { class: 'row' }, kids);
  }

  function renderStart() {
    const box = $('seriesCards'); box.textContent = '';
    const g = seg('pick-'); while (g.firstChild) box.appendChild(g.firstChild);
    $('startLead').textContent = 'Skript holen, aufnehmen, verdienen.';
    const L = $('startList'); L.textContent = '';
    L.appendChild(row('script', 'Dein Skript', 'Jede Szene fertig zum Kopieren.', () => go('script')));
    L.appendChild(row('camera', 'Aufnahme & Caption', 'Shotliste und Caption.', () => go('shots')));
    L.appendChild(row('earn', 'Dein Verdienst', 'Bis zu ' + B.levels().slice(-1)[0].pct + ' pro Verkauf.', () => go('earn')));
  }
  function renderScript() {
    const v = $('scriptView'); v.textContent = '';
    const s = B.SERIES[pick];
    const scenes = s.scenes.map((x, i) => h('div', { class: 'row scene' },
      h('span', { class: 'tile num', text: String(i + 1) }),
      h('span', { class: 'txt' }, h('b', { class: 'shot ' + x.shot, text: x.label }), x.lines.map(l => h('p', null, withPh(l))), x.note ? h('span', { class: 'note', text: x.note }) : null)));
    v.appendChild(h('div', { class: 'bar' }, backBtn('start'), seg('sw-')));
    v.appendChild(h('div', { class: 'head' },
      h('span', { class: 'pill', text: 'Schritt 1 von 3' }),
      h('h1', { tabindex: '-1', text: 'Dein Skript.' }),
      h('p', { class: 'lead', text: s.title + ' · ' + s.product + '. Eckige Klammern tauschst du gegen deine eigenen Angaben, zum Beispiel ' + B.placeholders(pick).slice(0, 2).join(' oder ') + '.' })));
    v.appendChild(h('div', { class: 'card onscreen-card' }, h('div', { class: 'label', text: 'Text auf dem Bildschirm' }), h('div', { class: 'onscreen' }, withPh(s.onScreen))));
    v.appendChild(h('div', { class: 'card list', id: 'scriptCard' }, scenes));
    v.appendChild(h('button', { type: 'button', class: 'primary', id: 'copyScript', onclick: () => copy(B.scriptText(pick), 'Skript kopiert.') }, 'Skript kopieren'));
    v.appendChild(h('button', { type: 'button', class: 'secondary', id: 'toShots', onclick: () => go('shots') }, 'Weiter: Aufnahme ', h('span', { 'aria-hidden': 'true', text: '→' })));
  }
  function renderShots() {
    const s = B.SERIES[pick];
    const bar = $('shotBar'); bar.textContent = ''; bar.appendChild(backBtn('script')); bar.appendChild(seg('sh-'));
    $('shotLead').textContent = s.title + ' · drei Einstellungen, eine Aufnahme am Stück.';
    const c = $('shotCard'); c.textContent = '';
    s.shots.forEach((x, i) => c.appendChild(row(i === 0 || i === s.shots.length - 1 ? 'talk' : 'screen', x.title, x.how, null,
      x.beats ? h('ul', null, x.beats.map(b => h('li', { text: b }))) : null)));
    c.appendChild(h('p', { class: 'note pad', text: 'Du musst nicht zwischen iPad und Laptop wechseln: iPad nur im Opening und im Outro, dazwischen durchgehend der Laptop.' }));
    const cap = $('captionCard'); cap.textContent = '';
    cap.appendChild(h('div', { class: 'label', text: 'Caption' }));
    cap.appendChild(h('p', { class: 'caption' }, withPh(s.caption)));
    cap.appendChild(h('button', { type: 'button', class: 'secondary', id: 'copyCaption', onclick: () => copy(s.caption, 'Caption kopiert.') }, 'Caption kopieren'));
  }
  function renderEarnings() {
    const bar = $('earnBar'); bar.textContent = ''; bar.appendChild(backBtn(() => from === 'earn' ? 'start' : from)); bar.appendChild(h('span', { class: 'bartitle', text: 'Affiliates' }));
    $('earnLead').textContent = 'Pro Verkauf (' + B.eur(B.PRICE) + ') bekommst du deinen Anteil. Je mehr Verkäufe, desto höher dein Level. Jeder Verkauf zählt mit dem Prozentsatz seines Levels.';
    const t = h('table', { class: 'levels' },
      h('thead', null, h('tr', null, ['Level', 'Verkäufe', 'Provision', 'Pro Verkauf'].map(c => h('th', { scope: 'col', text: c })))),
      h('tbody', null, B.levels().map(l => h('tr', null, h('td', { class: 'lv' }, h('span', { class: 'lvw', text: 'Level ' }), String(l.level)), h('td', { text: l.range }), h('td', { class: 'rate', text: l.pct }), h('td', { class: 'eur', text: B.eur(l.perSale) })))));
    $('levelTable').textContent = ''; $('levelTable').appendChild(t);
    const ex = h('ul', { class: 'examples' }, B.examples().map(e => h('li', null, h('span', { text: e.sales + ' Verkäufe' }), h('b', { text: B.eur(e.total) }), h('span', { class: 'tiny', text: 'Level ' + e.level }))));
    $('exampleList').textContent = ''; $('exampleList').appendChild(ex);
    $('terms').textContent = 'Konditionen laut Partner-Dashboard, Stand 21.10.2026, bei ' + B.eur(B.PRICE) + ' pro Verkauf. Die Beispiele sind Summen über alle Verkäufe. Die 30.000 € im Skript sind das Ziel der Challenge, kein versprochenes Ergebnis.';
  }
  function render() { renderStart(); renderScript(); renderShots(); renderEarnings(); show(); }
  function show() { for (const k of Object.keys(VIEWS)) $(VIEWS[k]).hidden = k !== view; document.body.setAttribute('data-view', view); }
  function sync() { try { history.replaceState(null, '', location.pathname + location.search + (view === 'start' ? '' : '#' + pick + (view === 'script' ? '' : '/' + view))); } catch (e) {} }
  function go(to) {
    if (!VIEWS[to]) to = 'start';
    if (to === 'earn' && view !== 'earn') from = view;
    view = to; if (to === 'earn') renderEarnings(); show(); sync();
    try { window.scrollTo(0, 0); } catch (e) {}
    const t = $(VIEWS[to]).querySelector('h1'); if (t && t.focus) t.focus({ preventScroll: true });
  }

  $('startBtn').addEventListener('click', () => go('script'));
  $('fabEarn').addEventListener('click', () => go('earn'));
  $('toEarn').addEventListener('click', () => go('earn'));
  $('toStart').addEventListener('click', () => go('start'));
  const m = (location.hash || '').replace('#', '').split('/');
  if (B.SERIES[m[0]]) { pick = m[0]; view = VIEWS[m[1]] && m[1] !== 'start' ? m[1] : 'script'; }
  render();
})();
