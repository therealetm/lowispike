/* LOWiSPIKE Studio · AI use (23 Nov 2026, Emmanuel: "how much does it cost every time I add someone's profile ... Where is it coming
   from again? ... I need to see how much I've got left somewhere as an admin, so I know what is using it, how many people are using
   it, and how much I've got left"). Owner only: the "AI use" pill next to Edit opens a full page from public.ai_overview():
   today's AI requests against the app's own daily stop (400), how many people used AI, what used it, and the last 14 days.
   Where it comes from: Google's free Gemini tier through the app's own key, so it costs nothing; Google does not say how much of
   its free quota is left, so the page counts every request the app sends. Profile autofill is not AI (it reads the public page). */
(function (W, D) {
  'use strict';
  var S = W.STUDIO; if (!S || W.StudioAiUse) return;
  var I = {en: 0, de: 1, es: 2}[S.L] || 0, esc = S.esc;
  var T = {
    pill: ['AI use', 'KI-Nutzung', 'Uso de IA'], title: ['AI use', 'KI-Nutzung', 'Uso de IA'], back: ['Back', 'Zurück', 'Atrás'],
    today: ['Today', 'Heute', 'Hoy'], of: ['{n} of {c} AI requests used', '{n} von {c} KI-Anfragen genutzt', '{n} de {c} solicitudes de IA usadas'],
    left: ['{n} left today', 'Heute noch {n}', 'Quedan {n} hoy'], people: ['{n} people used AI today', '{n} Personen haben heute KI genutzt', '{n} personas usaron IA hoy'],
    what: ['What used it today', 'Was heute genutzt wurde', 'Qué se usó hoy'], days: ['Last 14 days', 'Letzte 14 Tage', 'Últimos 14 días'],
    req: ['{n} requests', '{n} Anfragen', '{n} solicitudes'], req1: ['1 request', '1 Anfrage', '1 solicitud'], ppl: ['{n} people', '{n} Personen', '{n} personas'], ppl1: ['1 person', '1 Person', '1 persona'], people1: ['1 person used AI today', '1 Person hat heute KI genutzt', '1 persona usó IA hoy'], nothing: ['No AI used yet today.', 'Heute noch keine KI genutzt.', 'Hoy aún no se usó IA.'],
    cost: ['Cost: €0. The AI is Google’s free Gemini tier, through the app’s own key. Google does not show how much of its free quota is left, so this page counts every AI request the app sends. The app stops itself at 400 a day, below Google’s free limit. Meal photo checks are not in that 400: each person gets 10 a day.',
      'Kosten: 0 €. Die KI ist Googles kostenloses Gemini, über den eigenen Schlüssel der App. Google zeigt nicht, wie viel vom Gratis-Kontingent übrig ist, darum zählt diese Seite jede KI-Anfrage der App. Die App stoppt sich selbst bei 400 am Tag, unter Googles Gratis-Grenze. Essensfoto-Checks zählen nicht zu den 400: jede Person hat 10 am Tag.',
      'Coste: 0 €. La IA es el nivel gratuito de Gemini de Google, con la clave propia de la app. Google no muestra cuánto queda de la cuota gratuita, así que esta página cuenta cada solicitud de IA de la app. La app se para sola en 400 al día, por debajo del límite gratuito de Google. Las fotos de comida no cuentan en esas 400: cada persona tiene 10 al día.'],
    fail: ['Could not load it. Sign in as the owner and try again.', 'Konnte nicht laden. Melde dich als Besitzer an und versuch es nochmal.', 'No se pudo cargar. Inicia sesión como dueño e inténtalo de nuevo.'],
    F: {ask: ['Talk to Misty', 'Mit Misty reden', 'Hablar con Misty'], photo: ['Meal photo check', 'Essensfoto-Check', 'Revisión de foto de comida'], mealfix: ['“Wrong? Tell me” meal fix', '„Falsch? Sag’s mir“ Essen korrigieren', '«¿Mal? Dímelo» corrección'],
      translate: ['Translate', 'Übersetzen', 'Traducir'], linkcheck: ['For You link check', 'For-You-Linkprüfung', 'Revisión de enlaces For You'], transcribe: ['Voice to text', 'Sprache zu Text', 'Voz a texto'],
      fill: ['Studio: fill from a video', 'Studio: aus Video ausfüllen', 'Studio: rellenar desde vídeo'], words: ['Studio: video → words', 'Studio: Video → Text', 'Studio: vídeo → texto'],
      profile: ['Profile autofill (not AI, free)', 'Profil automatisch ausfüllen (keine KI, gratis)', 'Autorrelleno de perfil (no es IA, gratis)']}
  };
  var t = function (k, n, c) { if (n === 1 && T[k + '1']) k = k + '1'; return T[k][I].replace('{n}', n).replace('{c}', c); }, fname = function (f) { return (T.F[f] || [f, f, f])[I]; };
  function day(s) { try { return new Date(s + 'T12:00:00Z').toLocaleDateString(['en-GB', 'de-DE', 'es-ES'][I], {weekday: 'short', day: 'numeric', month: 'short'}); } catch (e) { return s; } }
  function page() { var el = D.getElementById('aiuse'); if (!el) { el = D.createElement('section'); el.id = 'aiuse'; el.className = 'view'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); D.body.appendChild(el); el.addEventListener('click', function (e) { if (e.target.closest('[data-au=close]')) close(); }); } return el; }
  function frame(body) {
    page().innerHTML = '<div class="vtop"><button class="ib" data-au="close" aria-label="' + esc(t('back')) + '">‹</button><span class="cnt">' + esc(t('title')) + '</span><span style="width:46px"></span></div><div class="vbody">' + body + '</div>';
  }
  function paint(o) {
    var d0 = (o.days || []).filter(function (d) { return d.day === o.today; })[0] || {ai: 0, people: 0, features: []}, cap = o.cap || 400, used = d0.ai || 0, pct = Math.min(100, Math.round(used / cap * 100));
    var feats = (d0.features || []).map(function (f) { return '<li><span>' + esc(fname(f.feature)) + '</span><b>' + esc(t('req', f.uses)) + '</b><small>' + esc(t('ppl', f.people)) + '</small></li>'; }).join('');
    frame('<div class="au-big"><small>' + esc(t('today')) + '</small><b>' + esc(t('of', used, cap)) + '</b><div class="au-bar" role="img" aria-label="' + pct + '%"><i style="width:' + pct + '%"></i></div><span>' + esc(t('left', Math.max(0, cap - used))) + ' · ' + esc(t('people', d0.people || 0)) + '</span></div>' +
      '<h3 class="au-h">' + esc(t('what')) + '</h3>' + (feats ? '<ul class="au-l">' + feats + '</ul>' : '<p class="note">' + esc(t('nothing')) + '</p>') +
      '<h3 class="au-h">' + esc(t('days')) + '</h3><ul class="au-l">' + (o.days || []).map(function (d) { return '<li><span>' + esc(day(d.day)) + '</span><b>' + esc(t('req', d.total != null ? d.total : (d.ai || 0))) + '</b><small>' + esc(t('ppl', d.people || 0)) + '</small></li>'; }).join('') + '</ul>' +
      '<p class="note au-cost">' + esc(t('cost')) + '</p>');
  }
  function open() {
    frame('<p class="note">…</p>'); page().classList.add('on'); D.body.style.overflow = 'hidden';
    var sb = S.sb && S.sb(); if (!sb) return frame('<p class="note">' + esc(t('fail')) + '</p>');
    sb.rpc('ai_overview').then(function (r) { if (!r || r.error || !r.data) throw new Error('x'); paint(r.data); }).catch(function () { frame('<p class="note">' + esc(t('fail')) + '</p>'); });
  }
  function close() { var el = D.getElementById('aiuse'); if (el) el.classList.remove('on'); D.body.style.overflow = ''; }
  W.StudioAiUse = {open: open, close: close, label: function () { return T.pill[I]; }, _T: T};
})(window, document);
