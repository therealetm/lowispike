/* Affiliates: every script read aloud in the tutorial's voice (22 Oct 2026).
   Emmanuel: "I would like the affiliate texts, their scripts, to also have that voice. The same tutorial voice, so that they
   don't have to just read. They can just listen to what they can say in the camera."
   - The voice is app-voice.js (LowiVoice): the same recorded neural voices as the tutorial (en Ava, de Seraphina, es Ximena).
     tools/app-voice/phrases.cjs records every line from sayable() below, so the page plays recordings, not the robot voice.
   - Only what is on screen is read: the unlocked scenes (scene 1 alone in the free preview) and the day's follow line.
   - One big Listen button for the whole script (play / pause / continue / listen again), a round "start over" button next to it,
     and a small play button on each scene and on the day's line. The line being read lights up.
   - Sound only ever starts from a tap (iOS Safari), and stops when the script changes, the screen changes or the tab is hidden.
   - Text only ever goes in as textContent; the page sends nothing anywhere. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LowiAffVoice = api;
})(typeof window !== 'undefined' ? window : globalThis, function (W) {
  'use strict';

  const STR = {
    listen: ['Listen to the script', 'Skript anh\u00f6ren', 'Escuchar el guion'],
    listenPreview: ['Listen to scene 1', 'Szene 1 anh\u00f6ren', 'Escuchar la escena 1'],
    pause: ['Pause', 'Pause', 'Pausa'],
    resume: ['Continue listening', 'Weiter anh\u00f6ren', 'Seguir escuchando'],
    again: ['Listen again', 'Nochmal anh\u00f6ren', 'Escuchar otra vez'],
    fromStart: ['Start over', 'Von vorn', 'Desde el principio'],
    hint: ['Listen first, then say it to the camera.', 'Erst anh\u00f6ren, dann in die Kamera sagen.', 'Esc\u00fachalo y luego dilo a la c\u00e1mara.'],
    sceneOf: ['Scene {n} of {total}', 'Szene {n} von {total}', 'Escena {n} de {total}'],
    playScene: ['Listen to scene {n}', 'Szene {n} anh\u00f6ren', 'Escuchar la escena {n}'],
    pauseScene: ['Pause scene {n}', 'Szene {n} pausieren', 'Pausar la escena {n}'],
    playLine: ['Listen to this line', 'Diese Zeile anh\u00f6ren', 'Escuchar esta frase'],
    pauseLine: ['Pause this line', 'Diese Zeile pausieren', 'Pausar esta frase']
  };
  const LANGS = ['en', 'de', 'es'];
  function t(lang, key, vars) {
    const row = STR[key] || [key]; let s = row[Math.max(0, LANGS.indexOf(lang))] || row[0];
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? String(vars[k]) : m);
    return s;
  }

  /* ---- what can be said (pure, also used by the recorder) ---- */
  function dayText(B, s, pick, lang, day) {
    return B.fill(day === 30 ? s.outro30 : B.followLine(pick, lang, day), s.vars, { day });
  }
  /* plan(): the items for one script screen. open=false is the free preview (scene 1 only).
     Each item is one line on screen: { key (the line's data-say), text, scene }. */
  function plan(B, s, o) {
    o = o || {};
    const scenes = s.scenes.map((x, i) => (o.open || i === 0) ? x.lines.map((l, j) => ({ key: 's' + i + '-' + j, text: l, scene: i })) : null);
    const all = [].concat.apply([], scenes.filter(Boolean));
    const day = (o.open && s.follow) ? [{ key: 'day', text: dayText(B, s, o.pick, o.lang, o.day || 1), scene: -1 }] : null;
    return { all, scenes, day, total: scenes.filter(Boolean).length };
  }
  /* sayable(): every line the page can read in a language (all tracks, every scene, every day's line). */
  function sayable(B, lang) {
    const out = [], S = B.series(lang);
    for (const k of Object.keys(B.SERIES)) {
      const s = S[k]; if (!s) continue;
      s.scenes.forEach(x => x.lines.forEach(l => out.push(l)));
      if (s.follow) for (let d = 1; d <= 30; d++) out.push(dayText(B, s, k, lang, d));
    }
    return out.filter((x, i) => x && out.indexOf(x) === i);
  }

  const api = { STR, t, plan, sayable, dayText };
  if (!W || !W.document) return api;

  /* ---- the player ---- */
  const D = W.document;
  W.LOWI_VOICE_TAP_ONLY = true; /* read by ../app-voice.js (loaded right after this file): sound only from a Listen tap */
  const reduce = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  let lang = 'en', items = [], idx = 0, group = '', status = 'idle', token = 0, gapT = 0, watchT = 0, total = 0;
  const V = () => W.LowiVoice;
  const parentWin = () => { try { return W.parent && W.parent !== W ? W.parent : null; } catch (e) { return null; } };
  let mediaOn = false;
  /* inside the app the clip list is the app build's own (served from the phone's saved copy); a shared link gets the newest */
  try {
    const p = parentWin(), m = p && p.document.querySelector('meta[name="lowi-build"]');
    if (m && !D.querySelector('meta[name="lowi-build"]')) { const c = D.createElement('meta'); c.name = 'lowi-build'; c.content = m.content; D.head.appendChild(c); }
  } catch (e) { }
  function media(on) {
    if (on === mediaOn) return; mediaOn = on;
    /* the app's world sound and voices live in the parent page when this page sits in the Community tab */
    const p = parentWin(); if (!p) return;
    try { p.dispatchEvent(new p.CustomEvent('lowi:media', { detail: { on, id: 'aff-voice' } })); } catch (e) { }
  }
  function frameShown() {
    try { const f = W.frameElement; if (f && !f.getClientRects().length) return false; } catch (e) { }
    return !D.hidden;
  }
  function paint() {
    D.querySelectorAll('.saying').forEach(e => e.classList.remove('saying'));
    if (status === 'playing' && items[idx]) {
      const el = D.querySelector('[data-say="' + items[idx].key + '"]');
      if (el) {
        el.classList.add('saying');
        try {
          const r = el.getBoundingClientRect(), vh = W.innerHeight || 0;
          if (r.top < 70 || r.bottom > vh - 40) el.scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' });
        } catch (e) { }
      }
    }
    D.querySelectorAll('[data-voice]').forEach(b => {
      const g = b.getAttribute('data-voice'), mine = g === group, st = mine ? status : 'idle';
      const playing = st === 'playing';
      b.classList.toggle('playing', playing);
      b.setAttribute('aria-pressed', playing ? 'true' : 'false');
      const lab = b.querySelector('.vlabel'), n = b.getAttribute('data-n');
      if (g === 'all') {
        const txt = playing ? t(lang, 'pause') : st === 'paused' ? t(lang, 'resume') : st === 'done' ? t(lang, 'again') : b.getAttribute('data-idle');
        if (lab) lab.textContent = txt;
      } else {
        const k = g === 'day' ? (playing ? 'pauseLine' : 'playLine') : (playing ? 'pauseScene' : 'playScene');
        b.setAttribute('aria-label', t(lang, k, { n })); b.title = t(lang, k, { n });
      }
    });
    const again = D.getElementById('listenAgain');
    if (again) again.hidden = !(group === 'all' && status !== 'idle');
    const where = D.getElementById('listenWhere');
    if (where) {
      const it = items[idx];
      where.textContent = (group === 'all' && status === 'playing' && it && it.scene >= 0 && total > 1) ? t(lang, 'sceneOf', { n: it.scene + 1, total }) : '';
    }
  }
  function set(st) { status = st; paint(); media(st === 'playing'); watch(); }
  function watch() {
    clearInterval(watchT); watchT = 0;
    if (status !== 'playing') return;
    /* the Community tab hides this page without telling it: pause when it is no longer on screen */
    watchT = setInterval(() => { if (!frameShown()) pause(); }, 700);
  }
  function step() {
    const my = ++token; clearTimeout(gapT);
    const it = items[idx];
    if (!it) { set('done'); return; }
    set('playing');
    const v = V(); if (!v) { set('idle'); return; }
    const nx = items[idx + 1]; if (nx && v.prefetch) { try { v.prefetch(nx.text, lang); } catch (e) { } }
    const next = () => {
      if (my !== token) return;
      const cur = items[idx]; idx++;
      const n = items[idx];
      gapT = setTimeout(() => { if (my === token) step(); }, n && cur && n.scene !== cur.scene ? 650 : 250);
    };
    v.speak(it.text, { lang, queue: false, onend: next, onerror: e => { if (e && e.error === 'interrupted') return; next(); } });
  }
  function start(g, list, from) {
    if (!list || !list.length || !V()) return;
    group = g; items = list; idx = from || 0;
    step();
  }
  function pause() {
    if (status !== 'playing') return;
    token++; clearTimeout(gapT);
    try { V() && V().cancel(); } catch (e) { }
    set('paused');
  }
  function stop() {
    if (status === 'idle' && !group) return;
    const was = status; token++; clearTimeout(gapT);
    if (was === 'playing') { try { V() && V().cancel(); } catch (e) { } }
    group = ''; items = []; idx = 0; set('idle');
  }
  /* tap on a play button: play, pause, or continue where it paused */
  function toggle(g, list) {
    if (g === group && status === 'playing') return pause();
    if (g === group && status === 'paused') return start(g, list, Math.min(idx, list.length - 1));
    if (g !== group && status === 'playing') pause();
    start(g, list, 0);
  }
  function replay(g, list) { if (status === 'playing') pause(); start(g, list, 0); }

  /* Oct 22 2026 (Emmanuel: "When user turns sound on it should stay on ... even if they leave the app. And it should stay on or turn
     on when they come back on the app."): a script that was playing when the app went to the background goes on from the same
     line when the page is in front again (not if the user paused it, or the page is no longer on screen) */
  let hidPaused = false;
  D.addEventListener('visibilitychange', () => {
    if (D.hidden) { hidPaused = status === 'playing'; pause(); return; }
    if (hidPaused && status === 'paused' && group && items.length && frameShown()) start(group, items, Math.min(idx, items.length - 1));
    hidPaused = false;
  });
  W.addEventListener('pagehide', () => stop());
  /* another voice in the app (tutorial, Audio mode) starts: this one pauses, so two voices never talk at once */
  try {
    const p = parentWin();
    if (p) p.addEventListener('lowi:media', e => { const d = e.detail || {}; if (d.on && d.id !== 'aff-voice') pause(); });
  } catch (e) { }

  /* ---- the buttons (built with DOM nodes, never HTML strings) ---- */
  const NS = 'http://www.w3.org/2000/svg';
  function glyph() {
    const s = D.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.setAttribute('class', 'vglyph');
    const play = D.createElementNS(NS, 'path'); play.setAttribute('d', 'M8 5.5v13l10.5-6.5z'); play.setAttribute('class', 'gplay');
    const pa = D.createElementNS(NS, 'path'); pa.setAttribute('d', 'M7.5 5.5h3v13h-3zM13.5 5.5h3v13h-3z'); pa.setAttribute('class', 'gpause');
    s.appendChild(play); s.appendChild(pa); return s;
  }
  function againGlyph() {
    const s = D.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    for (const d of ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4.5 4.5v4h4']) { const p = D.createElementNS(NS, 'path'); p.setAttribute('d', d); s.appendChild(p); }
    return s;
  }
  function el(tag, attrs, kids) {
    const e = D.createElement(tag);
    for (const k of Object.keys(attrs || {})) {
      const v = attrs[k]; if (v == null) continue;
      if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else if (k === 'onclick') e.addEventListener('click', v); else e.setAttribute(k, v);
    }
    (kids || []).forEach(c => c && e.appendChild(typeof c === 'string' ? D.createTextNode(c) : c));
    return e;
  }
  const ready = () => !!V();
  /* the card under the headline: the big Listen button, start over, and which scene is playing */
  function listenCard(p, lg, open) {
    lang = lg; if (!ready() || !p.all.length) return null;
    total = p.total;
    const idle = open ? t(lg, 'listen') : t(lg, 'listenPreview');
    const main = el('button', { type: 'button', class: 'listen-main', id: 'listenAll', 'data-voice': 'all', 'data-idle': idle, 'aria-pressed': 'false', onclick: () => toggle('all', p.all) },
      [el('span', { class: 'vbtn' }, [glyph()]), el('span', { class: 'vlabel', text: idle })]);
    const again = el('button', { type: 'button', class: 'fab listen-again', id: 'listenAgain', 'aria-label': t(lg, 'fromStart'), title: t(lg, 'fromStart'), onclick: () => replay('all', p.all) }, [againGlyph()]);
    again.hidden = true;
    const card = el('div', { class: 'card listen-card', id: 'listenCard' }, [
      el('div', { class: 'listen-row' }, [main, again]),
      el('p', { class: 'note listen-hint', id: 'listenHint', text: t(lg, 'hint') }),
      el('p', { class: 'listen-where', id: 'listenWhere', 'aria-live': 'polite' })
    ]);
    return card;
  }
  function lineButton(g, list, lg, n) {
    lang = lg; if (!ready() || !list || !list.length) return null;
    const k = g === 'day' ? 'playLine' : 'playScene';
    return el('button', { type: 'button', class: 'fab say-btn', 'data-voice': g, 'data-n': n != null ? String(n) : null, 'aria-pressed': 'false', 'aria-label': t(lg, k, { n }), title: t(lg, k, { n }), onclick: () => toggle(g, list) }, [glyph()]);
  }
  function sceneButton(p, i, lg) { return lineButton('s' + i, p.scenes[i], lg, i + 1); }
  function dayButton(p, lg) { return lineButton('day', p.day, lg); }
  /* after the page redraws (same content), keep the buttons and the lit line in step */
  function refresh() { paint(); }

  return Object.assign(api, { listenCard, sceneButton, dayButton, stop, pause, toggle, replay, refresh, state: () => ({ group, status, idx, key: items[idx] ? items[idx].key : '' }) });
});
