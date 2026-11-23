/* LOWiSPIKE store page (23 Nov 2026, Emmanuel: "I would use my main page link instead of my Beacons ... make my main page look
   better, not too overwhelming ... so it looks like a web app. I actually even want to copy the Apple Store ... when you're about
   to download an app, people are used to that").
   The first thing a new visitor sees at lowispike.com in a browser: an app-store-style listing (icon, name, subtitle, Get, a short
   info row, real screenshots with big captions, a short description, Impressum and Privacy at the bottom).
   Honest on purpose: no star ratings, no chart rank, no download counts (we have none). "Get" leads to the existing
   Add to Home Screen guide (A1 in index.html), or straight into the app on a computer.
   Shown once per browser session, never in the installed app (standalone), never for someone who already uses the app in this
   browser, never on a deep link (#post, ?ref ...). EN / DE / ES. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiStorePage) return;
  const SEEN = 'lowi.store.seen';
  const IMPRINT = 'https://versteckmich.de/emanwel/impressum';
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
      more: 'more', newH: 'What’s New', newT: 'Photo check wrong? Just say what you ate and it recalculates. Your day’s meals are easy to edit or delete. See when friends were last online. The weekly challenge starts the day you join.', updated: 'Updated',
      privH: 'App Privacy', privS: 'From our privacy policy. In short:', p1h: 'No tracking', p1t: 'No ads, no tracking, no analytics tools. Your data is never sold.', p2h: 'Data linked to you', p2t: 'Kept in your account (servers in Frankfurt, EU), only to run the app:', p2a: ['Email', 'Profile', 'Meals you log', 'Your posts'], p3h: 'Only on your phone', p3t: 'Health details, cycle, weight and settings stay on your device.', privMore: 'Read the privacy policy',
      accH: 'Accessibility', acc: ['Dark interface', 'Reduced motion', 'Speak instead of typing', 'Three languages'],
      infoH: 'Information', iCat: 'Category', iCatV: 'Health & Fitness', iComp: 'Works on', iCompV: 'iPhone, Android, any browser', iLang: 'Languages', iLangV: 'English, Deutsch, Español', iAge: 'Age', iAgeV: '16+', iPrice: 'Price', iPriceV: 'Free', iHelp: 'Help', iWeb: 'Website' },
    de: { sub: 'Klüger essen. Ruhiger Blutzucker.', get: 'Laden', free: 'Kostenlos · läuft im Browser', price: 'PREIS', priceV: 'Gratis', priceS: 'Keine Werbung', langs: 'SPRACHEN', langsS: '+ English, Español', cat: 'KATEGORIE', catV: 'Gesundheit', catS: '& Fitness', inst: 'INSTALLATION', instV: 'Web-App', instS: 'Ohne App Store',
      s1: 'Foto machen. Sehen, ob es spikt.', s2: 'Dein Begleiter wächst mit dir', s3: 'Dein Tag auf einen Blick',
      about: 'Fotografiere dein Essen und LOWiSPIKE sagt dir in einer Sekunde, ob es deinen Blutzucker in die Höhe treibt, und wenn ja, mit einem einfachen Tausch. Trag Wasser und Bewegung ein, koch insulinfreundliche Rezepte und lass deinen kleinen Begleiter dabei wachsen. Teile Mahlzeiten mit Freunden, mach die Wochen-Challenge mit, alles kostenlos.',
      med: 'Ernährungs-Tipps aus Schätzungen, keine medizinische Beratung.', imp: 'Impressum', priv: 'Datenschutz', share: 'Teilen', shared: 'Link kopiert',
      more: 'mehr', newH: 'Neu', newT: 'Foto-Check falsch? Sag einfach, was du gegessen hast, und er rechnet neu. Die Mahlzeiten des Tages lassen sich leicht ändern oder löschen. Sieh, wann Freunde zuletzt online waren. Die Wochen-Challenge startet an dem Tag, an dem du mitmachst.', updated: 'Aktualisiert',
      privH: 'Datenschutz der App', privS: 'Aus unserer Datenschutzerklärung, kurz:', p1h: 'Kein Tracking', p1t: 'Keine Werbung, kein Tracking, keine Analyse-Tools. Deine Daten werden nie verkauft.', p2h: 'Mit dir verknüpfte Daten', p2t: 'In deinem Konto (Server in Frankfurt, EU), nur um die App zu betreiben:', p2a: ['E-Mail', 'Profil', 'Eingetragene Mahlzeiten', 'Deine Posts'], p3h: 'Nur auf deinem Handy', p3t: 'Gesundheitsangaben, Zyklus, Gewicht und Einstellungen bleiben auf deinem Gerät.', privMore: 'Datenschutzerklärung lesen',
      accH: 'Barrierefreiheit', acc: ['Dunkles Design', 'Reduzierte Bewegung', 'Sprechen statt tippen', 'Drei Sprachen'],
      infoH: 'Informationen', iCat: 'Kategorie', iCatV: 'Gesundheit & Fitness', iComp: 'Läuft auf', iCompV: 'iPhone, Android, jedem Browser', iLang: 'Sprachen', iLangV: 'English, Deutsch, Español', iAge: 'Alter', iAgeV: 'ab 16', iPrice: 'Preis', iPriceV: 'Kostenlos', iHelp: 'Hilfe', iWeb: 'Webseite' },
    es: { sub: 'Come mejor. Azúcar en calma.', get: 'Obtener', free: 'Gratis · funciona en tu navegador', price: 'PRECIO', priceV: 'Gratis', priceS: 'Sin anuncios', langs: 'IDIOMAS', langsS: '+ English, Deutsch', cat: 'CATEGORÍA', catV: 'Salud', catS: 'y forma física', inst: 'INSTALAR', instV: 'Web app', instS: 'Sin App Store',
      s1: 'Haz una foto. Mira si sube.', s2: 'Tu compañero crece contigo', s3: 'Tu día de un vistazo',
      about: 'Haz una foto de tu comida y LOWiSPIKE te dice en un segundo si subirá tu azúcar, con un cambio sencillo cuando lo hace. Registra agua y movimiento, cocina recetas aptas para la insulina y haz crecer a tu pequeño compañero. Comparte comidas con amigos y haz el reto semanal, todo gratis.',
      med: 'Orientación alimentaria basada en estimaciones, no consejo médico.', imp: 'Aviso legal', priv: 'Privacidad', share: 'Compartir', shared: 'Enlace copiado',
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
  let el = null, moreOpen = false, BUILD = '';
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
      if (b.dataset.lsp === 'get') close();
      else if (b.dataset.lsp === 'more') { moreOpen = true; paint(); }
      else if (b.dataset.lsp === 'share') { const u = location.origin + location.pathname; if (navigator.share) navigator.share({ title: 'LOWiSPIKE', text: t('sub'), url: u }).catch(() => { }); else if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => { b.title = t('shared'); }); }
    });
    D.body.appendChild(el); D.documentElement.classList.add('lsp-open');
    return el;
  }
  W.LowiStorePage = { open, close, want, _TX: TX };
  if (want()) { if (D.body) open(); else D.addEventListener('DOMContentLoaded', open); }
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
