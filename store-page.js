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
      med: 'Food guidance from estimates, not medical advice.', imp: 'Impressum', priv: 'Privacy', share: 'Share', shared: 'Link copied' },
    de: { sub: 'Klüger essen. Ruhiger Blutzucker.', get: 'Laden', free: 'Kostenlos · läuft im Browser', price: 'PREIS', priceV: 'Gratis', priceS: 'Keine Werbung', langs: 'SPRACHEN', langsS: '+ English, Español', cat: 'KATEGORIE', catV: 'Gesundheit', catS: '& Fitness', inst: 'INSTALLATION', instV: 'Web-App', instS: 'Ohne App Store',
      s1: 'Foto machen. Sehen, ob es spikt.', s2: 'Dein Begleiter wächst mit dir', s3: 'Dein Tag auf einen Blick',
      about: 'Fotografiere dein Essen und LOWiSPIKE sagt dir in einer Sekunde, ob es deinen Blutzucker in die Höhe treibt, und wenn ja, mit einem einfachen Tausch. Trag Wasser und Bewegung ein, koch insulinfreundliche Rezepte und lass deinen kleinen Begleiter dabei wachsen. Teile Mahlzeiten mit Freunden, mach die Wochen-Challenge mit, alles kostenlos.',
      med: 'Ernährungs-Tipps aus Schätzungen, keine medizinische Beratung.', imp: 'Impressum', priv: 'Datenschutz', share: 'Teilen', shared: 'Link kopiert' },
    es: { sub: 'Come mejor. Azúcar en calma.', get: 'Obtener', free: 'Gratis · funciona en tu navegador', price: 'PRECIO', priceV: 'Gratis', priceS: 'Sin anuncios', langs: 'IDIOMAS', langsS: '+ English, Deutsch', cat: 'CATEGORÍA', catV: 'Salud', catS: 'y forma física', inst: 'INSTALAR', instV: 'Web app', instS: 'Sin App Store',
      s1: 'Haz una foto. Mira si sube.', s2: 'Tu compañero crece contigo', s3: 'Tu día de un vistazo',
      about: 'Haz una foto de tu comida y LOWiSPIKE te dice en un segundo si subirá tu azúcar, con un cambio sencillo cuando lo hace. Registra agua y movimiento, cocina recetas aptas para la insulina y haz crecer a tu pequeño compañero. Comparte comidas con amigos y haz el reto semanal, todo gratis.',
      med: 'Orientación alimentaria basada en estimaciones, no consejo médico.', imp: 'Aviso legal', priv: 'Privacidad', share: 'Compartir', shared: 'Enlace copiado' }
  };
  const t = k => (TX[lang] || TX.en)[k];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  let el = null;
  function html() {
    const shots = [['store/shot-1.webp', t('s1')], ['store/shot-2.webp', t('s2')], ['store/shot-3.webp', t('s3')]];
    return '<div class="lsp-top"><div class="lsp-lang" role="group" aria-label="Language">' + ['en', 'de', 'es'].map(l => '<button type="button" data-lsp-l="' + l + '" aria-pressed="' + (l === lang) + '">' + l.toUpperCase() + '</button>').join('') + '</div>' +
      '<button type="button" class="lsp-share" data-lsp="share" aria-label="' + esc(t('share')) + '">' + SHARE + '</button></div>' +
      '<header class="lsp-head"><img class="lsp-icon" src="icon-512.png" alt="" width="118" height="118"><div class="lsp-ht"><h1>LOWiSPIKE</h1><p>' + esc(t('sub')) + '</p>' +
      '<div class="lsp-getrow"><button type="button" class="lsp-get" data-lsp="get">' + esc(t('get')) + '</button><small>' + esc(t('free')) + '</small></div></div></header>' +
      '<div class="lsp-info">' + [[t('price'), t('priceV'), t('priceS')], [t('langs'), 'EN', t('langsS')], [t('cat'), t('catV'), t('catS')], [t('inst'), t('instV'), t('instS')]].map(c => '<div><small>' + esc(c[0]) + '</small><b>' + esc(c[1]) + '</b><span>' + esc(c[2]) + '</span></div>').join('') + '</div>' +
      '<div class="lsp-shots" tabindex="0" aria-label="Screenshots">' + shots.map(s => '<figure><figcaption>' + esc(s[1]) + '</figcaption><div class="lsp-phone"><img src="' + s[0] + '" alt="' + esc(s[1]) + '" loading="lazy" decoding="async"></div></figure>').join('') + '</div>' +
      '<p class="lsp-about">' + esc(t('about')) + '</p>' +
      '<footer class="lsp-foot"><p>' + esc(t('med')) + '</p><a href="' + IMPRINT + '" target="_blank" rel="noopener">' + esc(t('imp')) + '</a> · <a href="privacy.html" target="_blank" rel="noopener">' + esc(t('priv')) + '</a> · © LOWiSPIKE</footer>';
  }
  function paint() { if (el) el.querySelector('.lsp-in').innerHTML = html(); }
  function close() { ss.set(SEEN, '1'); if (!el) return; const e = el; el = null; e.classList.add('out'); D.documentElement.classList.remove('lsp-open'); setTimeout(() => e.remove(), 260); }
  function open() {
    if (el) return el;
    el = D.createElement('div'); el.id = 'lspStore'; el.className = 'lsp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'LOWiSPIKE'); el.setAttribute('data-noi18n', '');
    el.innerHTML = '<div class="lsp-in">' + html() + '</div>';
    el.addEventListener('click', e => {
      const l = e.target.closest('[data-lsp-l]'); if (l) { lang = l.dataset.lspL; try { localStorage.setItem('lowispike.lang', lang); } catch (x) { } paint(); try { if (W.LowiLang && W.LowiLang.set) W.LowiLang.set(lang); } catch (x) { } return; }
      const b = e.target.closest('[data-lsp]'); if (!b) return;
      if (b.dataset.lsp === 'get') close();
      else if (b.dataset.lsp === 'share') { const u = location.origin + location.pathname; if (navigator.share) navigator.share({ title: 'LOWiSPIKE', text: t('sub'), url: u }).catch(() => { }); else if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => { b.title = t('shared'); }); }
    });
    D.body.appendChild(el); D.documentElement.classList.add('lsp-open');
    return el;
  }
  W.LowiStorePage = { open, close, want, _TX: TX };
  if (want()) { if (D.body) open(); else D.addEventListener('DOMContentLoaded', open); }
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
