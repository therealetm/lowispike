/* LOWiSPIKE Affiliates page. All content lives in blueprint-core.js; this file only draws it.
   21 Oct 2026 redesign (Eman: "it looks shit, it shouldn't be cramped", reference: Eden's Plan screen): one thing per screen.
   Start (series switch, pill, big headline, one card of three rows, Start button) -> Skript -> Aufnahme -> Verdienst.
   Nothing is typed in and nothing is stored; the hash only remembers the series and the screen. */
(function () {
  'use strict';
  const B = window.LowiBlueprint;
  const $ = id => document.getElementById(id);
  if (/[?&]embed=1\b/.test(location.search)) document.body.classList.add('embed');
  /* Language follows the app (Eman, 21 Oct): ?lang= from a shared link, else the app's own choice (same key the app writes,
     this page shares its origin and sits in the app's Community tab), else the browser, else English. */
  const qs = new URLSearchParams(location.search);
  function store(k, v) { try { if (v == null) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function appLang() { let l = ''; try { l = (window.parent !== window && window.parent.LowiLang && window.parent.LowiLang.get && window.parent.LowiLang.get()) || ''; } catch (e) {} return l || store('lowispike.lang') || ''; }
  const navLangs = () => [].concat(navigator.languages || [], navigator.language || []);
  let lang = B.pickLang({ param: qs.get('lang'), stored: appLang(), nav: navLangs() });
  let S = B.series(lang);
  const T = (k, v) => B.t(lang, k, v);
  /* Referral: ?aff=<id> (or the partner dashboard's affiliate link id) is the affiliate's own id and is kept; ?ref=<id> marks who sent this visitor. */
  const own = B.cleanId(qs.get('aff') || qs.get('affiliateLinkId'));
  if (own) store('lowispike.affId', own);
  const arrived = B.cleanId(qs.get('ref'));
  if (arrived && !store('lowispike.referredBy')) store('lowispike.referredBy', arrived);
  const myId = () => B.cleanId(store('lowispike.affId'));

  /* Buy-to-unlock (Eman, 21 Oct): scene 1 of each paid track is a free preview; the full script, shot list and caption open
     with the product's buyer code or a personal invite code. Only code hashes ship (access-list.js); a code is checked here,
     and its hash is kept on this device. If the access files did not load, nothing is locked (a broken download must not lock buyers out). */
  const A = window.LowiAffAccess, LIST = window.LOWI_AFF_ACCESS, REC = window.LOWI_AFF_RECRUITS;
  const gated = !!(A && LIST && Array.isArray(LIST.codes));
  let opened = gated ? A.saved(localStorage, LIST) : {};
  const isOpen = id => !gated || !!(B.SERIES[id].free || opened[id]);
  const buyRef = () => A && A.idFrom ? A.idFrom(arrived || store('lowispike.referredBy') || '') : '';
  let gateMsg = '';

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
      if (r) ok(); else toast(T('copyFail'));
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }

  const VIEWS = { start: 'viewStart', script: 'scriptView', shots: 'shotView', earn: 'earnView' };
  let pick = B.ORDER[0], view = 'start', from = 'start';

  /* Share button (Eman: "next to UGC, in the right corner, so I can share exactly that page to my clients"):
     the native share sheet, or copy the link where there is none. The link opens this same track, screen and language. */
  function link() { return B.shareUrl({ base: new URL('./', location.href).href, track: pick, view, lang, ref: myId() }); }
  function share() {
    const url = link(), title = T('docTitle'), text = T('shareText', { title: S[pick].title });
    if (navigator.share) navigator.share({ title, text, url }).catch(e => { if (!e || e.name !== 'AbortError') copy(url, T('linkCopied')); });
    else copy(url, T('linkCopied'));
  }
  function shareBtn(id) {
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    for (const d of ['M12 3v12', 'M7.5 7.5L12 3l4.5 4.5', 'M5 11v9h14v-9']) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); svg.appendChild(p); }
    return h('button', { type: 'button', class: 'fab share', id, 'aria-label': T('share'), title: T('share'), onclick: share }, svg);
  }

  /* Segmented control (Webdesign | UGC). The one on the start screen keeps the ids pick-<series>. */
  function seg(prefix, label) {
    return h('div', { class: 'seg', role: 'group', 'aria-label': label || T('pickSeries') }, B.ORDER.map(id => h('button', {
      type: 'button', id: prefix + id, 'aria-pressed': String(pick === id), onclick: () => { if (pick !== id) { pick = id; render(); sync(); } }
    }, S[id].title)));
  }
  function backBtn(to) { return h('button', { type: 'button', class: 'back', 'aria-label': T('back'), onclick: () => go(typeof to === 'function' ? to() : to) }, h('span', { 'aria-hidden': 'true', text: '‹' })); }
  function row(ic, title, sub, onclick, extra) {
    const kids = [icon(ic), h('span', { class: 'txt' }, h('b', null, withPh(title)), sub ? h('span', null, withPh(sub)) : null, extra || null)];
    return onclick ? h('button', { type: 'button', class: 'row', onclick }, kids, h('span', { class: 'chev', 'aria-hidden': 'true', text: '›' })) : h('div', { class: 'row' }, kids);
  }

  function renderStart() {
    const box = $('seriesCards'); box.textContent = ''; box.setAttribute('aria-label', T('pickSeries'));
    const g = seg('pick-'); while (g.firstChild) box.appendChild(g.firstChild);
    const fab = $('fabEarn'); fab.setAttribute('aria-label', T('earnAria'));
    const old = $('shareStart'); if (old) old.remove(); fab.after(shareBtn('shareStart'));
    $('startPill').textContent = T('pill'); $('startTitle').textContent = T('startTitle');
    $('startLead').textContent = T('startLead');
    const L = $('startList'); L.textContent = '';
    L.appendChild(row('script', T('rowScript'), T('rowScriptSub'), () => go('script')));
    L.appendChild(row('camera', T('rowShots'), T('rowShotsSub'), () => go('shots')));
    L.appendChild(row('earn', T('rowEarn'), T('rowEarnSub', { pct: B.levels(B.PRICE, lang).slice(-1)[0].pct }), () => go('earn')));
    $('startBtn').firstChild.textContent = T('start') + ' ';
    $('linkLine').textContent = T('linkLine');
  }
  function gate(sfx) {
    const s = S[pick], url = A.buyUrl(pick, buyRef(), LIST), field = 'unlockCode' + sfx, msgId = 'gateMsg' + sfx;
    const input = h('input', { id: field, class: 'code', type: 'text', inputmode: 'text', autocomplete: 'one-time-code', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'XXXX-XXXX-XXXX', 'aria-describedby': msgId });
    const msg = h('p', { class: 'note gate-msg', id: msgId, role: 'status', 'aria-live': 'polite', text: gateMsg });
    const btn = h('button', { type: 'submit', class: 'primary', id: 'unlockBtn' + sfx }, T('unlockBtn'));
    const form = h('form', { class: 'gate-form', novalidate: '', onsubmit: e => { e.preventDefault(); tryCode(input, btn, msg); } },
      h('label', { for: field, class: 'label', text: T('codeLabel') }), input, btn, msg);
    return h('div', { class: 'card gate', id: 'gateCard' + sfx },
      h('h2', { class: 'gate-title', text: T('gateTitle', { title: s.title }) }),
      h('p', { class: 'note', text: T('gateLead') }),
      url ? h('a', { class: 'secondary', id: 'buyBtn' + sfx, href: url, target: '_blank', rel: 'noopener' }, T('buyFor', { product: s.product, price: B.eur(s.price || B.PRICE, lang) }))
          : h('p', { class: 'note', id: 'buyAsk' + sfx, text: T('buyAsk') }),
      h('p', { class: 'note', text: T('afterBuy') }), form);
  }
  async function tryCode(input, btn, msg) {
    const code = input.value; if (!A.normalize(code)) { input.focus(); return; }
    btn.disabled = true; msg.textContent = T('checking');
    let r; try { r = await A.check(code, LIST); } catch (e) { btn.disabled = false; msg.textContent = T('checkFail'); return; }
    btn.disabled = false;
    if (!r.ok) { gateMsg = T('codeWrong'); msg.textContent = gateMsg; input.select(); return; }
    A.remember(localStorage, r.h); opened = A.saved(localStorage, LIST);
    if (r.tracks.indexOf(pick) < 0) { gateMsg = T('codeOther', { title: r.tracks.map(id => S[id] ? S[id].title : id).join(', ') }); render(); return; }
    gateMsg = ''; render(); toast(T('unlocked'));
    const t = $(VIEWS[view]).querySelector('h1'); if (t && t.focus) t.focus({ preventScroll: true });
  }
  function renderScript() {
    const v = $('scriptView'); v.textContent = '';
    const s = S[pick], open = isOpen(pick);
    const scenes = s.scenes.map((x, i) => open || i === 0 ? h('div', { class: 'row scene' },
      h('span', { class: 'tile num', text: String(i + 1) }),
      h('span', { class: 'txt' }, h('b', { class: 'shot ' + x.shot, text: x.label }), x.lines.map(l => h('p', null, withPh(l))), x.note ? h('span', { class: 'note', text: x.note }) : null))
      : h('div', { class: 'row scene locked' }, h('span', { class: 'tile num', text: String(i + 1) }),
          h('span', { class: 'txt' }, h('b', { class: 'shot ' + x.shot, text: x.label }), h('span', { class: 'note', text: T('lockedScene') }))));
    v.appendChild(h('div', { class: 'bar' }, backBtn('start'), seg('sw-'), shareBtn('shareScript')));
    v.appendChild(h('div', { class: 'head' },
      h('span', { class: 'pill', text: T('step1') }),
      h('h1', { tabindex: '-1', text: T('scriptTitle') }),
      h('p', { class: 'lead', text: T('scriptLead', { title: s.title, product: s.product, ph: B.placeholders(pick, lang).slice(0, 2).join(T('or')) }) })));
    if (open) v.appendChild(h('div', { class: 'card onscreen-card' }, h('div', { class: 'label', text: T('onScreen') }), h('div', { class: 'onscreen' }, withPh(s.onScreen))));
    else v.appendChild(h('span', { class: 'pill preview', text: T('preview') }));
    v.appendChild(h('div', { class: 'card list', id: 'scriptCard' }, scenes));
    if (!open) { v.appendChild(gate('')); return; }
    v.appendChild(h('button', { type: 'button', class: 'primary', id: 'copyScript', onclick: () => copy(B.scriptText(pick, lang), T('scriptCopied')) }, T('copyScript')));
    v.appendChild(h('button', { type: 'button', class: 'secondary', id: 'toShots', onclick: () => go('shots') }, T('toShots'), h('span', { 'aria-hidden': 'true', text: '→' })));
  }
  function renderShots() {
    const s = S[pick];
    const bar = $('shotBar'); bar.textContent = ''; bar.appendChild(backBtn('script')); bar.appendChild(seg('sh-')); bar.appendChild(shareBtn('shareShots'));
    $('shotPill').textContent = T('step2'); $('shotTitle').textContent = T('shotsTitle');
    $('shotLead').textContent = T('shotsLead', { title: s.title });
    const c = $('shotCard'); c.textContent = ''; const open = isOpen(pick);
    s.shots.forEach((x, i) => c.appendChild(open || i === 0 ? row(i === 0 || i === s.shots.length - 1 ? 'talk' : 'screen', x.title, x.how, null,
      x.beats ? h('ul', null, x.beats.map(b => h('li', { text: b }))) : null) : row('screen', x.title, T('lockedScene'))));
    c.appendChild(h('p', { class: 'note pad', text: T('shotsNote') }));
    const cap = $('captionCard'); cap.textContent = '';
    if (!open) { cap.classList.add('gate-host'); cap.appendChild(gate('Shots')); }
    else cap.classList.remove('gate-host');
    if (open) {
    cap.appendChild(h('div', { class: 'label', text: T('caption') }));
    cap.appendChild(h('p', { class: 'caption' }, withPh(s.caption)));
    cap.appendChild(h('button', { type: 'button', class: 'secondary', id: 'copyCaption', onclick: () => copy(s.caption, T('captionCopied')) }, T('copyCaption')));
    }
    const tip = $('tipLine'); tip.textContent = ''; tip.appendChild(h('b', { text: T('tipB') })); tip.appendChild(document.createTextNode(T('tip')));
    $('toEarn').firstChild.textContent = T('toEarn');
  }
  function renderEarnings() {
    const bar = $('earnBar'); bar.textContent = ''; bar.appendChild(backBtn(() => from === 'earn' ? 'start' : from)); bar.appendChild(h('span', { class: 'bartitle', text: 'Affiliates' }));
    $('earnPill').textContent = T('step3'); $('earnTitle').textContent = T('earnTitle'); $('exLabel').textContent = T('examples'); $('toStart').textContent = T('done');
    $('earnLead').textContent = T('earnLead', { price: B.eur(B.PRICE, lang) });
    const t = h('table', { class: 'levels' },
      h('thead', null, h('tr', null, [T('thLevel'), T('thSales'), T('thRate'), T('thPer')].map(c => h('th', { scope: 'col', text: c })))),
      h('tbody', null, B.levels(B.PRICE, lang).map(l => h('tr', null, h('td', { class: 'lv' }, h('span', { class: 'lvw', text: T('levelWord') }), String(l.level)), h('td', { text: l.range }), h('td', { class: 'rate', text: l.pct }), h('td', { class: 'eur', text: B.eur(l.perSale, lang) })))));
    $('levelTable').textContent = ''; $('levelTable').appendChild(t);
    const ex = h('ul', { class: 'examples' }, B.examples().map(e => h('li', null, h('span', { text: T('salesN', { n: e.sales }) }), h('b', { text: B.eur(e.total, lang) }), h('span', { class: 'tiny', text: T('levelWord') + e.level }))));
    $('exampleList').textContent = ''; $('exampleList').appendChild(ex);
    $('terms').textContent = T('terms', { price: B.eur(B.PRICE, lang) });
    /* Recruit levels: active recruits (bought through your link AND published a video, checked by Eman in recruits.js) lift your level. */
    const rc = $('recruitCard'); rc.textContent = '';
    const R = A && A.RECRUIT ? A.RECRUIT : { salesPerRecruit: 5, recruitsPerLevel: 3 };
    rc.appendChild(h('h2', { class: 'label', text: T('recruitTitle') }));
    rc.appendChild(h('p', { class: 'note', text: T('recruitRule', { n: R.salesPerRecruit }) }));
    if (A && A.progress) {
      const me = myId(), n = me && REC ? A.recruitsFor(me, REC) : 0;
      const ex = A.progress(0, 3, B.TIERS), pr = A.progress(0, n, B.TIERS);
      if (n > 0) rc.appendChild(h('p', { class: 'recruit-you', id: 'recruitYou', text: T('recruitYou', { n, level: pr.level, rate: Math.round(pr.rate * 100) + '%' }) }));
      rc.appendChild(h('p', { class: 'note', id: 'recruitEx', text: T('recruitEx', { n: ex.credit, level: ex.level, rate: Math.round(ex.rate * 100) + '%' }) }));
    }
    rc.appendChild(h('p', { class: 'note', text: T('recruitHow') }));
  }
  function paintDoc() {
    document.documentElement.lang = lang; document.title = T('docTitle');
    const md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', T('metaDesc'));
  }
  function render() { paintDoc(); renderStart(); renderScript(); renderShots(); renderEarnings(); show(); }
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
  if (B.SERIES[qs.get('track')]) pick = qs.get('track');
  if (B.SERIES[m[0]]) { pick = m[0]; view = VIEWS[m[1]] && m[1] !== 'start' ? m[1] : 'script'; }
  render();
  /* When the app's language changes while this page is open in the Community tab, follow it (an explicit ?lang= wins). */
  function relang() {
    if (B.normLang(qs.get('lang'))) return;
    const l = B.pickLang({ stored: appLang(), nav: navLangs() });
    if (l !== lang) { lang = l; S = B.series(lang); render(); }
  }
  window.addEventListener('storage', e => { if (!e.key || e.key === 'lowispike.lang') relang(); });
  try { if (window.parent !== window) { window.parent.addEventListener('lowi:lang', relang); window.parent.document.addEventListener('lowi:lang', relang); } } catch (e) {}
  window.addEventListener('pageshow', relang);
})();
