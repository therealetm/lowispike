/* LOWiSPIKE · Weekly Challenge, spoken cooking guides (8 Nov 2026).
   Emmanuel: "instead of just reading, they can like play the tutorial on how to prepare the food ... let's say you're in the kitchen
   and you just click on play and you can listen to ... almost like your grandma talking to you through how you're supposed to
   prepare the food. So it's important that it's not just text to speech, but it's a script."
   The scripts are written by hand (tools/fakeaway/voice/scripts.json, no exact amounts: those stay on the screen and follow the
   number of people) and recorded once (media/challenge/<recipe>-<lang>.mp3, challenge-voice-data.js). In the recipe one big
   ▶ Anhören button plays it; it shows how far along it is and can pause. Nothing is generated on the phone. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiChallengeVoice) return;
  const DATA = () => W.LOWI_CHALLENGE_VOICE || {};
  const H = D.documentElement;
  const li = () => { const l = (H.lang || 'de').slice(0, 2); return l === 'en' ? 0 : l === 'es' ? 2 : 1; };
  const L = (en, de, es) => [en, de, es == null ? en : es][li()];
  let audio = null, playing = '', raf = 0;
  const has = (id, lang) => !!(DATA()[lang] && DATA()[lang][id] && DATA()[lang][id].f);
  const key = (id, lang) => id + ':' + lang;
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
  function button(id, lang) {
    const on = playing === key(id, lang) && audio && !audio.paused;
    return '<button type="button" class="cwk-play' + (on ? ' on' : '') + '" data-cwkv="' + id + '" data-lang="' + lang + '" aria-pressed="' + on + '">' +
      '<span class="cwk-play-ic">' + (on ? PAUSE : PLAY) + '</span><span class="cwk-play-t"><b>' + (on ? L('Pause', 'Pause', 'Pausa') : L('Listen: cook along', 'Anhören: mitkochen', 'Escuchar: cocina conmigo')) + '</b>' +
      '<small>' + L('Your companion walks you through it', 'Dein Begleiter führt dich durch', 'Tu compañero te guía') + '</small></span><i class="cwk-play-bar"><i style="width:' + pct() + '%"></i></i></button>';
  }
  function pct() { return audio && audio.duration ? Math.min(100, Math.round(audio.currentTime / audio.duration * 100)) : 0; }
  function paintBtn() {
    D.querySelectorAll('.cwk-play').forEach(b => {
      const on = playing === key(b.dataset.cwkv, b.dataset.lang) && audio && !audio.paused;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      const ic = b.querySelector('.cwk-play-ic'); if (ic) ic.innerHTML = on ? PAUSE : PLAY;
      const t = b.querySelector('.cwk-play-t b'); if (t) t.textContent = on ? L('Pause', 'Pause', 'Pausa') : (playing === key(b.dataset.cwkv, b.dataset.lang) && pct() > 0 && pct() < 100 ? L('Go on', 'Weiter', 'Seguir') : L('Listen: cook along', 'Anhören: mitkochen', 'Escuchar: cocina conmigo'));
      const bar = b.querySelector('.cwk-play-bar i'); if (bar) bar.style.width = (playing === key(b.dataset.cwkv, b.dataset.lang) ? pct() : 0) + '%';
    });
  }
  function tick() { paintBtn(); if (audio && !audio.paused) raf = (W.requestAnimationFrame || setTimeout)(tick, 250); }
  function toggle(id, lang) {
    if (!has(id, lang)) return;
    const k = key(id, lang);
    if (audio && playing === k) { if (audio.paused) audio.play().catch(() => { }); else audio.pause(); tick(); return; }
    stop();
    audio = new Audio(DATA()[lang][id].f); playing = k;
    audio.addEventListener('ended', () => { paintBtn(); });
    audio.addEventListener('pause', paintBtn); audio.addEventListener('play', tick);
    audio.play().catch(() => { });
    paintBtn();
  }
  function stop() { if (audio) { try { audio.pause(); } catch (e) { } } audio = null; playing = ''; paintBtn(); }
  D.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-cwkv]') : null; if (!b) return;
    e.preventDefault(); e.stopPropagation(); toggle(b.dataset.cwkv, b.dataset.lang);
  }, true); /* capture: a later page-wide click handler stopped the tap before it got here */
  W.LowiChallengeVoice = { has, button, toggle, stop, playing: () => playing };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
