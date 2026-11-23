/* LOWiSPIKE store page (23 Nov 2026, Emmanuel: "I would use my main page link instead of my Beacons ... make my main page look
   better, not too overwhelming ... so it looks like a web app. I actually even want to copy the Apple Store ... when you're about
   to download an app, people are used to that").
   The first thing a new visitor sees at lowispike.com in a browser: an app-store-style listing (icon, name, subtitle, Get, a short
   info row, real screenshots with big captions, a short description, Impressum and Privacy at the bottom).
   Honest on purpose: no star ratings, no chart rank, no download counts (we have none). "Get" opens the phone's share menu with a
   small looping animation of what to tap (see get() below), or goes straight into the app on a computer.
   Shown once per browser session, never in the installed app (standalone), never for someone who already uses the app in this
   browser, never on a deep link (#post, ?ref ...). EN / DE / ES. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiStorePage) return;
  const SEEN = 'lowi.store.seen';
  const IMPRINT = 'impressum.html';
  const standalone = () => { try { return !!(navigator.standalone || (W.matchMedia && matchMedia('(display-mode: standalone)').matches)); } catch (e) { return false; } };
  const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } } };
  function uses() { try { const s = JSON.parse(localStorage.getItem('lowispike.v2') || 'null'); return !!(s && ((s.logs && s.logs.length) || s.setupDone || (s.user && s.user.name))) || !!localStorage.getItem('lowi.auth'); } catch (e) { return false; } }
  function want() {
    if (standalone() || ss.get(SEEN) === '1' || uses()) return false;
    if ((location.hash && location.hash.length > 1) || /[?&](ref|post|p|s|c|code|invite|app)=/.test(location.search)) return false;
    return true;
  }
  let lang = 'en';
  try { lang = (localStorage.getItem('lowispike.lang') || navigator.language || 'en').slice(0, 2); } catch (e) { }
  if (['en', 'de', 'es'].indexOf(lang) < 0) lang = 'en';
  const TX = {
    en: { sub: 'Eat smarter. Calm blood sugar.', get: 'Get', free: 'Free · works in your browser', price: 'PRICE', priceV: 'Free', priceS: 'No ads', langs: 'LANGUAGES', langsS: '+ Deutsch, Español', cat: 'CATEGORY', catV: 'Health', catS: '& Fitness', inst: 'INSTALL', instV: 'Web app', instS: 'No App Store needed',
      s1: 'Snap a pic. See if it spikes.', s2: 'Your companion grows with you', s3: 'Your day at a glance',
      about: 'Take a photo of your meal and LOWiSPIKE tells you in a second if it will spike your blood sugar, with a simple swap when it does. Log water and movement, cook from insulin-friendly recipes and grow your little companion as you go. Share meals with friends, do the weekly challenge, all for free.',
      med: 'Food guidance from estimates, not medical advice.', imp: 'Impressum', priv: 'Privacy', share: 'Share', shared: 'Link copied',
      revH: 'Ratings & Reviews', rev1: '1 rating', revN: '{n} ratings', revFoot: 'From people who use LOWiSPIKE, about the app itself.', play: 'Play voice note', voiceNote: 'Voice note', transcript: 'Transcript',
      more: 'more', newH: 'What’s New', newT: 'Photo check wrong? Just say what you ate and it recalculates. Your day’s meals are easy to edit or delete. See when friends were last online. The weekly challenge starts the day you join.', updated: 'Updated',
      privH: 'App Privacy', privS: 'From our privacy policy. In short:', p1h: 'No tracking', p1t: 'No ads, no tracking, no analytics tools. Your data is never sold.', p2h: 'Data linked to you', p2t: 'Kept in your account (servers in Frankfurt, EU), only to run the app:', p2a: ['Email', 'Profile', 'Meals you log', 'Your posts'], p3h: 'Only on your phone', p3t: 'Health details, cycle, weight and settings stay on your device.', privMore: 'Read the privacy policy',
      accH: 'Accessibility', acc: ['Dark interface', 'Reduced motion', 'Speak instead of typing', 'Three languages'],
      infoH: 'Information', iCat: 'Category', iCatV: 'Health & Fitness', iComp: 'Works on', iCompV: 'iPhone, Android, any browser', iLang: 'Languages', iLangV: 'English, Deutsch, Español', iAge: 'Age', iAgeV: '16+', iPrice: 'Price', iPriceV: 'Free', iHelp: 'Help', iWeb: 'Website' },
    de: { sub: 'Klüger essen. Ruhiger Blutzucker.', get: 'Laden', free: 'Kostenlos · läuft im Browser', price: 'PREIS', priceV: 'Gratis', priceS: 'Keine Werbung', langs: 'SPRACHEN', langsS: '+ English, Español', cat: 'KATEGORIE', catV: 'Gesundheit', catS: '& Fitness', inst: 'INSTALLATION', instV: 'Web-App', instS: 'Ohne App Store',
      s1: 'Foto machen. Sehen, ob es spikt.', s2: 'Dein Begleiter wächst mit dir', s3: 'Dein Tag auf einen Blick',
      about: 'Fotografiere dein Essen und LOWiSPIKE sagt dir in einer Sekunde, ob es deinen Blutzucker in die Höhe treibt, und wenn ja, mit einem einfachen Tausch. Trag Wasser und Bewegung ein, koch insulinfreundliche Rezepte und lass deinen kleinen Begleiter dabei wachsen. Teile Mahlzeiten mit Freunden, mach die Wochen-Challenge mit, alles kostenlos.',
      med: 'Ernährungs-Tipps aus Schätzungen, keine medizinische Beratung.', imp: 'Impressum', priv: 'Datenschutz', share: 'Teilen', shared: 'Link kopiert',
      revH: 'Bewertungen', rev1: '1 Bewertung', revN: '{n} Bewertungen', revFoot: 'Von Menschen, die LOWiSPIKE nutzen, über die App selbst.', play: 'Sprachnachricht abspielen', voiceNote: 'Sprachnachricht', transcript: 'Transkript',
      more: 'mehr', newH: 'Neu', newT: 'Foto-Check falsch? Sag einfach, was du gegessen hast, und er rechnet neu. Die Mahlzeiten des Tages lassen sich leicht ändern oder löschen. Sieh, wann Freunde zuletzt online waren. Die Wochen-Challenge startet an dem Tag, an dem du mitmachst.', updated: 'Aktualisiert',
      privH: 'Datenschutz der App', privS: 'Aus unserer Datenschutzerklärung, kurz:', p1h: 'Kein Tracking', p1t: 'Keine Werbung, kein Tracking, keine Analyse-Tools. Deine Daten werden nie verkauft.', p2h: 'Mit dir verknüpfte Daten', p2t: 'In deinem Konto (Server in Frankfurt, EU), nur um die App zu betreiben:', p2a: ['E-Mail', 'Profil', 'Eingetragene Mahlzeiten', 'Deine Posts'], p3h: 'Nur auf deinem Handy', p3t: 'Gesundheitsangaben, Zyklus, Gewicht und Einstellungen bleiben auf deinem Gerät.', privMore: 'Datenschutzerklärung lesen',
      accH: 'Barrierefreiheit', acc: ['Dunkles Design', 'Reduzierte Bewegung', 'Sprechen statt tippen', 'Drei Sprachen'],
      infoH: 'Informationen', iCat: 'Kategorie', iCatV: 'Gesundheit & Fitness', iComp: 'Läuft auf', iCompV: 'iPhone, Android, jedem Browser', iLang: 'Sprachen', iLangV: 'English, Deutsch, Español', iAge: 'Alter', iAgeV: 'ab 16', iPrice: 'Preis', iPriceV: 'Kostenlos', iHelp: 'Hilfe', iWeb: 'Webseite' },
    es: { sub: 'Come mejor. Azúcar en calma.', get: 'Obtener', free: 'Gratis · funciona en tu navegador', price: 'PRECIO', priceV: 'Gratis', priceS: 'Sin anuncios', langs: 'IDIOMAS', langsS: '+ English, Deutsch', cat: 'CATEGORÍA', catV: 'Salud', catS: 'y forma física', inst: 'INSTALAR', instV: 'Web app', instS: 'Sin App Store',
      s1: 'Haz una foto. Mira si sube.', s2: 'Tu compañero crece contigo', s3: 'Tu día de un vistazo',
      about: 'Haz una foto de tu comida y LOWiSPIKE te dice en un segundo si subirá tu azúcar, con un cambio sencillo cuando lo hace. Registra agua y movimiento, cocina recetas aptas para la insulina y haz crecer a tu pequeño compañero. Comparte comidas con amigos y haz el reto semanal, todo gratis.',
      med: 'Orientación alimentaria basada en estimaciones, no consejo médico.', imp: 'Aviso legal', priv: 'Privacidad', share: 'Compartir', shared: 'Enlace copiado',
      revH: 'Valoraciones y reseñas', rev1: '1 valoración', revN: '{n} valoraciones', revFoot: 'De personas que usan LOWiSPIKE, sobre la app en sí.', play: 'Reproducir nota de voz', voiceNote: 'Nota de voz', transcript: 'Transcripción',
      more: 'más', newH: 'Novedades', newT: '¿La foto se equivocó? Di lo que comiste y se recalcula. Las comidas del día se editan o borran fácilmente. Mira cuándo estuvieron en línea tus amigos. El reto semanal empieza el día que te unes.', updated: 'Actualizado',
      privH: 'Privacidad de la app', privS: 'De nuestra política de privacidad, en resumen:', p1h: 'Sin rastreo', p1t: 'Sin anuncios, sin rastreo, sin herramientas de análisis. Nunca vendemos tus datos.', p2h: 'Datos vinculados a ti', p2t: 'En tu cuenta (servidores en Frankfurt, UE), solo para que la app funcione:', p2a: ['Email', 'Perfil', 'Comidas que registras', 'Tus posts'], p3h: 'Solo en tu móvil', p3t: 'Datos de salud, ciclo, peso y ajustes se quedan en tu dispositivo.', privMore: 'Leer la política de privacidad',
      accH: 'Accesibilidad', acc: ['Interfaz oscura', 'Movimiento reducido', 'Hablar en vez de escribir', 'Tres idiomas'],
      infoH: 'Información', iCat: 'Categoría', iCatV: 'Salud y forma física', iComp: 'Funciona en', iCompV: 'iPhone, Android, cualquier navegador', iLang: 'Idiomas', iLangV: 'English, Deutsch, Español', iAge: 'Edad', iAgeV: '16+', iPrice: 'Precio', iPriceV: 'Gratis', iHelp: 'Ayuda', iWeb: 'Sitio web' }
  };
  const t = k => (TX[lang] || TX.en)[k];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const IC = {
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/><path d="M9 12.2l2 2 4-4"/></svg>',
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.9-4 3.8-6 7.5-6s6.6 2 7.5 6"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>',
    acc: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="7.5" r="1.3"/><path d="M7.5 10.2l4.5 1 4.5-1M12 11.2v3.3l-2.2 4M12 14.5l2.2 4"/></svg>'
  };
  let el = null, moreOpen = false, BUILD = '', REV = [];
  /* 23 Nov 2026 (Emmanuel: the ratings people give in the app are "automatically added to the website", with their profile picture,
     a play button for a voice note and its transcript): real reviews only, from app_reviews_public (review-ask.js). No section and no
     rating until the first one exists. */
  const SB = 'https://vnfwmifmsfecascwaody.supabase.co', PK = 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd';
  function loadReviews() {
    fetch(SB + '/rest/v1/app_reviews_public?select=stars,body,voice_url,transcript,lang,created_at,name,avatar&order=created_at.desc&limit=60', { headers: { apikey: PK, Authorization: 'Bearer ' + PK } })
      .then(r => r.ok ? r.json() : []).then(a => { REV = Array.isArray(a) ? a : []; if (REV.length) paint(); }).catch(() => { });
  }
  const starRow = n => '<span class="lsp-st" aria-label="' + n + ' / 5">' + [1, 2, 3, 4, 5].map(i => '<i class="' + (i <= Math.round(n) ? 'on' : '') + '">★</i>').join('') + '</span>';
  function reviewsHTML() {
    if (!REV.length) return '';
    const avg = REV.reduce((a, r) => a + (+r.stars || 0), 0) / REV.length, v = (Math.round(avg * 10) / 10).toFixed(1);
    const card = (r, i) => { const words = (r.body || '').trim(), tr = (r.transcript || '').trim(), main = words || tr;
      return '<article class="lsp-rv"><header>' + (r.avatar ? '<img src="' + esc(r.avatar) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="lsp-rvi">' + esc((r.name || '?').charAt(0)) + '</span>') +
        '<div><b>' + esc(r.name) + '</b>' + starRow(+r.stars) + '</div></header>' + (main ? '<p>' + esc(main) + '</p>' : '') +
        (r.voice_url ? '<div class="lsp-voice"><button type="button" data-lsp="play" data-i="' + i + '" aria-label="' + esc(t('play')) + '">▶</button><span>' + esc(t('voiceNote')) + '</span></div>' +
          (tr && words ? '<details><summary>' + esc(t('transcript')) + '</summary><p>' + esc(tr) + '</p></details>' : '') : '') + '</article>'; };
    return '<section class="lsp-sec"><h2>' + esc(t('revH')) + '</h2><div class="lsp-rvsum"><b>' + v + '</b><div>' + starRow(avg) + '<small>' + esc(REV.length === 1 ? t('rev1') : t('revN').replace('{n}', REV.length)) + '</small></div></div>' +
      '<div class="lsp-rvs">' + REV.map(card).join('') + '</div><p class="lsp-dim">' + esc(t('revFoot')) + '</p></section>';
  }
  let playing = null;
  function play(b) { const r = REV[+b.dataset.i]; if (!r || !r.voice_url) return; if (playing && playing.b === b) { playing.a.pause(); b.textContent = '▶'; playing = null; return; }
    if (playing) { playing.a.pause(); playing.b.textContent = '▶'; } const a = new Audio(r.voice_url); playing = { a, b }; b.textContent = '❚❚'; a.onended = () => { b.textContent = '▶'; playing = null; }; a.play().catch(() => { b.textContent = '▶'; playing = null; }); }
  const dateOf = b => { const m = /^(\d{4})(\d{2})(\d{2})/.exec(b); if (!m) return ''; try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
  try { const m = /[?&]v=(\d{8}-\d{6})/.exec((D.currentScript && D.currentScript.src) || ''); if (m) BUILD = m[1]; } catch (e) { }
  function html() {
    const shots = [['store/shot-1.webp', t('s1')], ['store/shot-2.webp', t('s2')], ['store/shot-3.webp', t('s3')]];
    return '<div class="lsp-top"><div class="lsp-lang" role="group" aria-label="Language">' + ['en', 'de', 'es'].map(l => '<button type="button" data-lsp-l="' + l + '" aria-pressed="' + (l === lang) + '">' + l.toUpperCase() + '</button>').join('') + '</div>' +
      '<button type="button" class="lsp-share" data-lsp="share" aria-label="' + esc(t('share')) + '">' + SHARE + '</button></div>' +
      '<header class="lsp-head"><img class="lsp-icon" src="icon-512.png" alt="" width="118" height="118"><div class="lsp-ht"><h1>LOWiSPIKE</h1><p>' + esc(t('sub')) + '</p>' +
      '<div class="lsp-getrow"><button type="button" class="lsp-get" data-lsp="get">' + esc(t('get')) + '</button><small>' + esc(t('free')) + '</small></div></div></header>' +
      '<div class="lsp-info">' + [[t('price'), t('priceV'), t('priceS')], [t('langs'), 'EN', t('langsS')], [t('cat'), t('catV'), t('catS')], [t('inst'), t('instV'), t('instS')]].map(c => '<div><small>' + esc(c[0]) + '</small><b>' + esc(c[1]) + '</b><span>' + esc(c[2]) + '</span></div>').join('') + '</div>' +
      '<div class="lsp-shots" tabindex="0" aria-label="Screenshots">' + shots.map(s => '<figure><figcaption>' + esc(s[1]) + '</figcaption><div class="lsp-phone"><img src="' + s[0] + '" alt="' + esc(s[1]) + '" loading="lazy" decoding="async"></div></figure>').join('') + '</div>' +
      '<div class="lsp-about' + (moreOpen ? ' open' : '') + '"><p>' + esc(t('about')) + '</p>' + (moreOpen ? '' : '<button type="button" data-lsp="more">' + esc(t('more')) + '</button>') + '</div>' +
      reviewsHTML() +
      '<section class="lsp-sec"><h2>' + esc(t('newH')) + '</h2><p class="lsp-dim">' + esc(t('updated')) + (BUILD ? ' ' + esc(dateOf(BUILD)) : '') + '</p><p>' + esc(t('newT')) + '</p></section>' +
      '<section class="lsp-sec"><h2>' + esc(t('privH')) + '</h2><p class="lsp-dim">' + esc(t('privS')) + '</p>' +
        '<div class="lsp-card"><i aria-hidden="true">' + IC.shield + '</i><h3>' + esc(t('p1h')) + '</h3><p>' + esc(t('p1t')) + '</p></div>' +
        '<div class="lsp-card"><i aria-hidden="true">' + IC.person + '</i><h3>' + esc(t('p2h')) + '</h3><p>' + esc(t('p2t')) + '</p><ul>' + t('p2a').map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
        '<div class="lsp-card"><i aria-hidden="true">' + IC.phone + '</i><h3>' + esc(t('p3h')) + '</h3><p>' + esc(t('p3t')) + '</p></div>' +
        '<a class="lsp-link" href="privacy.html" target="_blank" rel="noopener">' + esc(t('privMore')) + ' ›</a></section>' +
      '<section class="lsp-sec"><h2>' + esc(t('accH')) + '</h2><div class="lsp-card"><i aria-hidden="true">' + IC.acc + '</i><ul class="lsp-two">' + t('acc').map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div></section>' +
      '<section class="lsp-sec"><h2>' + esc(t('infoH')) + '</h2><dl class="lsp-dl">' +
        [[t('iCat'), t('iCatV')], [t('iComp'), t('iCompV')], [t('iLang'), t('iLangV')], [t('iAge'), t('iAgeV')], [t('iPrice'), t('iPriceV')]].map(r => '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>').join('') +
        '<div><dt>' + esc(t('iHelp')) + '</dt><dd><a href="mailto:therealetm@gmail.com">therealetm@gmail.com</a></dd></div><div><dt>' + esc(t('iWeb')) + '</dt><dd><a href="https://lowispike.com">lowispike.com</a></dd></div></dl></section>' +
      '<footer class="lsp-foot"><p>' + esc(t('med')) + '</p><a href="' + IMPRINT + '" target="_blank" rel="noopener">' + esc(t('imp')) + '</a> · <a href="privacy.html" target="_blank" rel="noopener">' + esc(t('priv')) + '</a> · © LOWiSPIKE</footer>';
  }
  function paint() { if (el) el.querySelector('.lsp-in').innerHTML = html(); }
  /* ---------- Get (23 Nov 2026, Emmanuel: "when they click on Get ... the closest thing that gets them to the add to home screen ...
     automatically opens that thing ... in the background they still see a motion graphic replaying what they need to do ... once they've
     done that, they can go through the registration"; the old step-by-step guide (A1) "overwhelms people").
     iPhone has no way for a page to open Add to Home Screen itself (WebKit bugs 198673, 193959). The closest: Get opens the share menu
     at once (navigator.share). The share menu covers the lower part of the screen, so the top part loops a small animation of what to
     tap in it (View More, then Add to Home Screen). When the menu closes, one small panel says what is next: open it from the Home
     Screen, or, if the option was not in that menu, an arrow at the real ••• button. Android: the browser's own install prompt.
     Instagram / TikTok browsers: open Safari first. A computer: straight into the app. ---------- */
  const UA = navigator.userAgent || '';
  const ios = () => /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && (navigator.maxTouchPoints || 0) > 1);
  const android = () => /Android/i.test(UA);
  const inapp = () => /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|Bytedance|BytedanceWebview|trill_|Snapchat|LinkedInApp|Pinterest|Line\//i.test(UA);
  const crios = () => /CriOS|FxiOS|EdgiOS/.test(UA);
  const safariMajor = () => { const m = /Version\/(\d+)/.exec(UA); return m ? +m[1] : 0; };
  let bip = null; W.addEventListener('beforeinstallprompt', e => { bip = e; });
  const IX = {
    en: { top: 'In the menu: tap “View More”, then “Add to Home Screen”.', vm: 'View More', a2: 'Add to Home Screen', copyRow: 'Copy', fav: 'Add to Favourites', find: 'Find on Page',
      doneH: 'Added it?', doneT: 'Open LOWiSPIKE from your Home Screen. You sign up there, once.', notH: 'Not in that menu?', notT: 'Tap ••• at the bottom right, then Share, View More, Add to Home Screen.', notTold: 'Tap the Share button at the bottom, then Add to Home Screen.', notTc: 'Tap Share at the top right, then Add to Home Screen.',
      again: 'Open the menu again', cont: 'Continue in the browser', inH: 'Open it in Safari first', inT: 'This app’s browser can’t add LOWiSPIKE to your Home Screen. Tap ••• at the top right, then “Open in browser”.', safari: 'Open in Safari', copy: 'Copy link', copied: 'Link copied. Paste it in Safari.',
      anH: 'Install LOWiSPIKE', anT: 'Tap ⋮ at the top right, then “Add to Home screen” or “Install app”.' },
    de: { top: 'Im Menü: tippe auf „Mehr anzeigen“, dann auf „Zum Home-Bildschirm“.', vm: 'Mehr anzeigen', a2: 'Zum Home-Bildschirm', copyRow: 'Kopieren', fav: 'Zu Favoriten', find: 'Auf der Seite suchen',
      doneH: 'Hinzugefügt?', doneT: 'Öffne LOWiSPIKE auf deinem Home-Bildschirm. Dort registrierst du dich, einmal.', notH: 'Nicht in dem Menü?', notT: 'Tippe unten rechts auf •••, dann Teilen, Mehr anzeigen, Zum Home-Bildschirm.', notTold: 'Tippe unten auf Teilen, dann auf Zum Home-Bildschirm.', notTc: 'Tippe oben rechts auf Teilen, dann auf Zum Home-Bildschirm.',
      again: 'Menü nochmal öffnen', cont: 'Im Browser weitermachen', inH: 'Erst in Safari öffnen', inT: 'Der Browser dieser App kann LOWiSPIKE nicht auf den Home-Bildschirm legen. Tippe oben rechts auf ••• und dann auf „Im Browser öffnen“.', safari: 'In Safari öffnen', copy: 'Link kopieren', copied: 'Link kopiert. Füg ihn in Safari ein.',
      anH: 'LOWiSPIKE installieren', anT: 'Tippe oben rechts auf ⋮ und dann auf „Zum Startbildschirm hinzufügen“ oder „App installieren“.' },
    es: { top: 'En el menú: toca «Ver más» y luego «Añadir a pantalla de inicio».', vm: 'Ver más', a2: 'Añadir a pantalla de inicio', copyRow: 'Copiar', fav: 'Añadir a favoritos', find: 'Buscar en la página',
      doneH: '¿La añadiste?', doneT: 'Abre LOWiSPIKE desde tu pantalla de inicio. Allí te registras, una vez.', notH: '¿No estaba en ese menú?', notT: 'Toca ••• abajo a la derecha, luego Compartir, Ver más, Añadir a pantalla de inicio.', notTold: 'Toca Compartir abajo y luego Añadir a pantalla de inicio.', notTc: 'Toca Compartir arriba a la derecha y luego Añadir a pantalla de inicio.',
      again: 'Abrir el menú otra vez', cont: 'Seguir en el navegador', inH: 'Ábrela primero en Safari', inT: 'El navegador de esta app no puede añadir LOWiSPIKE a tu pantalla de inicio. Toca ••• arriba a la derecha y luego «Abrir en el navegador».', safari: 'Abrir en Safari', copy: 'Copiar enlace', copied: 'Enlace copiado. Pégalo en Safari.',
      anH: 'Instalar LOWiSPIKE', anT: 'Toca ⋮ arriba a la derecha y luego «Añadir a pantalla de inicio» o «Instalar app».' }
  };
  const ix = k => (IX[lang] || IX.en)[k];
  const url = () => location.origin + location.pathname;
  function layer() { let L = el && el.querySelector('#lspInst'); if (!L && el) { L = D.createElement('div'); L.id = 'lspInst'; L.setAttribute('role', 'dialog'); L.setAttribute('aria-modal', 'true'); el.appendChild(L); } return L; }
  /* the loop for the top of the screen: the share menu, View More, the list, Add to Home Screen lit (pure CSS, see store-page.css) */
  function anim() { return '<div class="ix-anim" aria-hidden="true"><div class="ix-sheet"><div class="ix-row ix-vm"><i></i>' + esc(ix('vm')) + ' ⌄</div><div class="ix-list"><div class="ix-row">' + esc(ix('copyRow')) + '</div><div class="ix-row">' + esc(ix('fav')) + '</div><div class="ix-row">' + esc(ix('find')) + '</div><div class="ix-row ix-a2"><b>⊞</b>' + esc(ix('a2')) + '</div></div><span class="ix-finger"></span></div></div>'; }
  function arrow(pos) { return '<span class="ix-arrow ix-' + pos + '" aria-hidden="true">' + (pos === 'br' || pos === 'bc' ? '↓' : '↑') + '</span>'; }
  function instOn(mode) {
    const L = layer(); if (!L) return; el.classList.add('inst');
    const where = crios() ? 'tr' : safariMajor() >= 26 ? 'br' : 'bc';
    if (mode === 'after') L.innerHTML = '<div class="ix-top"><p>' + esc(ix('top')) + '</p>' + anim() + '</div><div class="ix-card"><h3>' + esc(ix('doneH')) + '</h3><p>' + esc(ix('doneT')) + '</p><h3>' + esc(ix('notH')) + '</h3><p>' + esc(crios() ? ix('notTc') : safariMajor() >= 26 ? ix('notT') : ix('notTold')) + '</p>' +
      '<button type="button" class="ix-link" data-lsp="cont">' + esc(ix('cont')) + '</button></div>' + arrow(where);
    else if (mode === 'inapp') L.innerHTML = '<div class="ix-card ix-mid"><h3>' + esc(ix('inH')) + '</h3><p>' + esc(ix('inT')) + '</p>' + (ios() ? '<button type="button" class="lsp-get ix-big" data-lsp="safari">' + esc(ix('safari')) + '</button>' : '') + '<button type="button" class="ix-btn" data-lsp="copy">' + esc(ix('copy')) + '</button><button type="button" class="ix-link" data-lsp="cont">' + esc(ix('cont')) + '</button></div>' + arrow('tr');
    else if (mode === 'done') L.innerHTML = '<div class="ix-card ix-mid"><h3>' + esc(ix('doneH')) + '</h3><p>' + esc(ix('doneT')) + '</p><button type="button" class="ix-link" data-lsp="cont">' + esc(ix('cont')) + '</button></div>';
    else if (mode === 'android') L.innerHTML = '<div class="ix-card ix-mid"><h3>' + esc(ix('anH')) + '</h3><p>' + esc(ix('anT')) + '</p><button type="button" class="ix-link" data-lsp="cont">' + esc(ix('cont')) + '</button></div>' + arrow('tr');
    L.insertAdjacentHTML('afterbegin', '<button type="button" class="ix-back" data-lsp="ixback" aria-label="Back">‹</button>');
  }
  function instOff() { if (!el) return; el.classList.remove('inst'); const L = el.querySelector('#lspInst'); if (L) L.remove(); }
  /* 23 Nov 2026, tried on his iPhone: the share menu a page can open (navigator.share) has no "Add to Home Screen" row, only Safari's
     own menu has it, and no page can open that one. So Get on an iPhone plays the replay (install-replay.js): Safari's own screens,
     tapped by themselves, step by step, then "Your turn" with an arrow at the real button. */
  function replay(variant) {
    const R = W.LowiInstallReplay; if (!R || !el) return instOn(android() ? 'android' : 'after');
    R.open(el, { variant, lang, onBrowser: goBrowser, onClose: () => { } });
  }
  function openSafari() { location.href = 'x-safari-' + url(); }
  function copyLink(b) { const u = url(); const ok = () => { b.textContent = ix('copied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, ok); else ok(); }
  /* the browser instead: the old guide (A1) is skipped for this visit and sign-up goes on in the browser */
  function goBrowser() {
    try { sessionStorage.setItem('lowi.a1.skip', '1'); } catch (e) { }
    close();
    setTimeout(() => { const c = D.querySelector('#r2gate [data-a1="continue"]'); if (c) c.click(); }, 60);
  }
  function get() {
    if (inapp()) { instOn('inapp'); if (ios()) setTimeout(openSafari, 50); return; }
    /* Android: the browser's own install window opens at once when it offers one; otherwise (or when they say no) the replay */
    if (android()) { if (bip) { const e = bip; bip = null; try { e.prompt(); Promise.resolve(e.userChoice).then(c => { if (c && c.outcome === 'accepted') instOn('done'); else replay('android'); }).catch(() => replay('android')); } catch (x) { replay('android'); } } else replay('android'); return; }
    if (ios()) { replay(W.LowiInstallReplay ? W.LowiInstallReplay.variantFor(UA) : ''); return; }
    goBrowser();   /* a computer: the app works right here */
  }
  function close() { ss.set(SEEN, '1'); if (!el) return; const e = el; el = null; e.classList.add('out'); D.documentElement.classList.remove('lsp-open'); setTimeout(() => e.remove(), 260); }
  function open() {
    if (el) return el;
    el = D.createElement('div'); el.id = 'lspStore'; el.className = 'lsp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'LOWiSPIKE'); el.setAttribute('data-noi18n', '');
    el.innerHTML = '<div class="lsp-mini" aria-hidden="true"><img src="icon-512.png" alt=""><button type="button" class="lsp-get" data-lsp="get" tabindex="-1">' + esc(t('get')) + '</button></div><div class="lsp-in">' + html() + '</div>';
    /* like the store: once the header scrolls away, a slim bar with the icon and Get stays at the top */
    el.addEventListener('scroll', () => { const h = el.querySelector('.lsp-head'); const on = !!h && h.getBoundingClientRect().bottom < 40; el.classList.toggle('mini', on); el.querySelector('.lsp-mini').setAttribute('aria-hidden', String(!on)); }, { passive: true });
    el.addEventListener('click', e => {
      const l = e.target.closest('[data-lsp-l]'); if (l) { lang = l.dataset.lspL; try { localStorage.setItem('lowispike.lang', lang); } catch (x) { } paint(); try { if (W.LowiLang && W.LowiLang.set) W.LowiLang.set(lang); } catch (x) { } return; }
      const b = e.target.closest('[data-lsp]'); if (!b) return;
      if (b.dataset.lsp === 'get') get();
      else if (b.dataset.lsp === 'cont') goBrowser();
      else if (b.dataset.lsp === 'safari') openSafari();
      else if (b.dataset.lsp === 'copy') copyLink(b);
      else if (b.dataset.lsp === 'ixback') instOff();
      else if (b.dataset.lsp === 'more') { moreOpen = true; paint(); }
      else if (b.dataset.lsp === 'play') play(b);
      else if (b.dataset.lsp === 'share') { const u = location.origin + location.pathname; if (navigator.share) navigator.share({ title: 'LOWiSPIKE', text: t('sub'), url: u }).catch(() => { }); else if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => { b.title = t('shared'); }); }
    });
    D.body.appendChild(el); D.documentElement.classList.add('lsp-open'); loadReviews();
    /* 23 Nov 2026 bug (Emmanuel: "the whole page is frozen"): the sign-in screen's lock (index.html lockApp) made every other layer inert,
       this page too, so nothing could be tapped or scrolled. lockApp now skips it; and should anything else mark it inert, undo it. */
    const unlock = () => { if (el && (el.inert || el.hasAttribute('inert'))) { el.inert = false; el.removeAttribute('inert'); el.removeAttribute('data-gate-inert'); } };
    unlock(); try { new MutationObserver(unlock).observe(el, { attributes: true, attributeFilter: ['inert'] }); } catch (e) { }
    return el;
  }
  W.LowiStorePage = { open, close, want, get, _TX: TX, _IX: IX };
  if (want()) { if (D.body) open(); else D.addEventListener('DOMContentLoaded', open); }
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
