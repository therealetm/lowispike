/* ===== LOWiSPIKE install guide (Oct 23, 2026, Emmanuel: "adding it to the home screen on iPhone is too complicated") =====
   One animated walkthrough that looks like the real screens, recreated in HTML/CSS (no video files):
   - Choose your device: iPhone | Android, preselected from the phone, switchable.
   - iPhone Safari (iOS 26 bar): ••• -> Share -> View More -> Add to Home Screen -> Open as Web App on -> Add -> open it.
     In an in-app browser (Instagram, TikTok, Facebook, WhatsApp...) first: ••• -> Open in browser.
     Chrome on iPhone: Share at the top right -> Add to Home Screen -> Add.
   - Android: Chrome (Pixel and most phones), Samsung Internet, Edge, Firefox and in-app browsers each get their own menu path.
     Where the browser fires beforeinstallprompt, the overlay's button opens the system install dialog in one tap.
   - iOS has no API that opens Add to Home Screen. The closest: a pulsing arrow at the real ••• button (bottom right on iPhone,
     top right on iPad) while the guide is up, plus a success moment with Misty the first time the app opens from the Home Screen.
   - The loop runs on one timer, only while a player is on screen and the page is visible; reduced motion = no ripples.
   Mounted by: A1 (open-in-browser / Add to Home Screen screen before sign-up, index.html #a1js), the Today hint (#lcA2hs,
   via daily-ritual.js) and Profile > Put it on your Home Screen (installSheet). Pure core is tested in tests/install-guide.test.cjs. */
(function (root) {
  'use strict';
  const W = root;
  const D = W.document;

  /* ---------- pure core ---------- */
  function detect(ua, touch) {
    ua = String(ua || '');
    const ipadOS = /Macintosh/.test(ua) && (touch || 0) > 1;
    const ios = /iPhone|iPad|iPod/.test(ua) || ipadOS;
    const android = !ios && /Android/i.test(ua);
    const inapp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|Bytedance|BytedanceWebview|trill_|Snapchat|LinkedInApp|Pinterest|Line\/|WhatsApp|Twitter|GSA\//i.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    let browser = 'other';
    if (inapp) browser = 'inapp';
    else if (ios) browser = /CriOS/.test(ua) ? 'crios' : /FxiOS|EdgiOS|OPiOS/.test(ua) ? 'iosother' : 'safari';
    else if (android) browser = /SamsungBrowser/i.test(ua) ? 'samsung' : /EdgA/i.test(ua) ? 'edge' : /Firefox/i.test(ua) ? 'firefox' : 'chrome';
    return { device: ios ? 'ios' : android ? 'android' : 'desktop', browser, inapp, ipad: /iPad/.test(ua) || ipadOS };
  }
  /* the scenes for one device + browser; inapp adds the "get out of the in-app browser" scenes first */
  function flow(device, browser, inapp, ipad) {
    const out = [];
    if (device === 'android') {
      if (inapp) out.push({ f: 'iab', os: 'android', cap: 'iab_kebab' }, { f: 'iabmenu', os: 'android', cap: 'iab_open_chrome' });
      const b = inapp ? 'chrome' : (['samsung', 'edge', 'firefox'].indexOf(browser) >= 0 ? browser : 'chrome');
      if (b === 'samsung') out.push({ f: 'abar', b, cap: 'sb_menu' }, { f: 'amenu', b, cap: 'sb_addto' }, { f: 'asub', b, cap: 'sb_home' }, { f: 'adlg', b, btn: 'add', cap: 'dlg_add' });
      else if (b === 'edge') out.push({ f: 'abar', b, cap: 'eb_menu' }, { f: 'amenu', b, cap: 'eb_item' }, { f: 'adlg', b, btn: 'install', cap: 'dlg_install' });
      else if (b === 'firefox') out.push({ f: 'abar', b, cap: 'ff_menu' }, { f: 'amenu', b, cap: 'ch_item' }, { f: 'adlg', b, btn: 'add', cap: 'dlg_add' });
      else out.push({ f: 'abar', b: 'chrome', cap: 'ch_menu' }, { f: 'amenu', b: 'chrome', cap: 'ch_item' }, { f: 'adlg', b: 'chrome', btn: 'install', cap: 'dlg_install' });
      out.push({ f: 'ahome', cap: 'home' });
      return out;
    }
    if (inapp) out.push({ f: 'iab', os: 'ios', cap: 'iab_dots' }, { f: 'iabmenu', os: 'ios', cap: 'iab_open_safari' });
    if (!inapp && browser === 'crios') out.push({ f: 'crbar', cap: 'cr_share' }, { f: 'share', direct: true, cap: 'share_a2hs' });
    else if (!inapp && ipad) out.push({ f: 'crbar', pad: true, cap: 'pad_share' }, { f: 'share', cap: 'share_more' }, { f: 'more', cap: 'more_a2hs' });
    else out.push({ f: 'sbar', cap: inapp ? 'sf_dots_in' : 'sf_dots' }, { f: 'smenu', cap: 'sf_share' }, { f: 'share', cap: 'share_more' }, { f: 'more', cap: 'more_a2hs' });
    out.push({ f: 'a2hs', cap: 'a2hs_add' }, { f: 'home', cap: 'home' });
    return out;
  }
  /* captions (what to do) and the labels inside the mock screens, EN / DE / ES */
  const TX = {
    pick: ['Your phone', 'Dein Handy', 'Tu móvil'],
    step: ['Step', 'Schritt', 'Paso'],
    iab_dots: ['Tap ••• at the top right', 'Tippe oben rechts auf •••', 'Toca ••• arriba a la derecha'],
    iab_kebab: ['Tap \u22ee at the top right', 'Tippe oben rechts auf \u22ee', 'Toca \u22ee arriba a la derecha'],
    pad_share: ['Tap Share at the top right', 'Tippe oben rechts auf Teilen', 'Toca Compartir arriba a la derecha'],
    iab_open_safari: ['Tap Open in browser (or Open in Safari)', 'Tippe auf Im Browser öffnen (oder In Safari öffnen)', 'Toca Abrir en el navegador (o Abrir en Safari)'],
    iab_open_chrome: ['Tap Open in browser (or Open in Chrome)', 'Tippe auf Im Browser öffnen (oder In Chrome öffnen)', 'Toca Abrir en el navegador (o Abrir en Chrome)'],
    sf_dots: ['Tap ••• at the bottom right', 'Tippe unten rechts auf •••', 'Toca ••• abajo a la derecha'],
    sf_dots_in: ['Now in Safari: tap ••• at the bottom right', 'Jetzt in Safari: tippe unten rechts auf •••', 'Ya en Safari: toca ••• abajo a la derecha'],
    sf_share: ['Tap Share', 'Tippe auf Teilen', 'Toca Compartir'],
    share_more: ['Scroll down and tap View More', 'Scroll runter und tippe auf Mehr anzeigen', 'Desliza y toca Ver más'],
    more_a2hs: ['Tap Add to Home Screen', 'Tippe auf Zum Home-Bildschirm', 'Toca Añadir a pantalla de inicio'],
    a2hs_add: ['Leave Open as Web App on, tap Add', 'Als Web-App öffnen anlassen, auf Hinzufügen tippen', 'Deja Abrir como app web activado y toca Añadir'],
    home: ['Open LOWiSPIKE from your Home Screen', 'Öffne LOWiSPIKE vom Home-Bildschirm', 'Abre LOWiSPIKE desde tu pantalla de inicio'],
    cr_share: ['Tap Share at the top right', 'Tippe oben rechts auf Teilen', 'Toca Compartir arriba a la derecha'],
    share_a2hs: ['Scroll down, tap Add to Home Screen', 'Scroll runter, tippe auf Zum Home-Bildschirm', 'Desliza y toca Añadir a pantalla de inicio'],
    ch_menu: ['Tap ⋮ at the top right', 'Tippe oben rechts auf ⋮', 'Toca ⋮ arriba a la derecha'],
    ch_item: ['Tap Add to Home screen (or Install app)', 'Tippe auf Zum Startbildschirm hinzufügen (oder App installieren)', 'Toca Añadir a pantalla de inicio (o Instalar app)'],
    dlg_install: ['Tap Install', 'Tippe auf Installieren', 'Toca Instalar'],
    dlg_add: ['Tap Add', 'Tippe auf Hinzufügen', 'Toca Añadir'],
    sb_menu: ['Tap ≡ at the bottom right', 'Tippe unten rechts auf ≡', 'Toca ≡ abajo a la derecha'],
    sb_addto: ['Tap Add page to', 'Tippe auf Seite hinzufügen zu', 'Toca Añadir página a'],
    sb_home: ['Tap Home screen', 'Tippe auf Startbildschirm', 'Toca Pantalla de inicio'],
    eb_menu: ['Tap ••• at the bottom', 'Tippe unten auf •••', 'Toca ••• abajo'],
    eb_item: ['Tap Add to phone', 'Tippe auf Zum Telefon hinzufügen', 'Toca Añadir al teléfono'],
    ff_menu: ['Tap ⋮ in the toolbar', 'Tippe in der Leiste auf ⋮', 'Toca ⋮ en la barra'],
    /* mock screen labels */
    l_share: ['Share', 'Teilen', 'Compartir'], l_addbm: ['Add to Bookmarks', 'Lesezeichen hinzufügen', 'Añadir a marcadores'],
    l_addbmto: ['Add Bookmark to…', 'Lesezeichen hinzufügen zu …', 'Añadir marcador a…'], l_newtab: ['New Tab', 'Neuer Tab', 'Nueva pestaña'],
    l_private: ['New Private Tab', 'Neuer privater Tab', 'Nueva pestaña privada'], l_bms: ['Bookmarks', 'Lesezeichen', 'Marcadores'],
    l_alltabs: ['All Tabs', 'Alle Tabs', 'Todas las pestañas'], l_copy: ['Copy', 'Kopieren', 'Copiar'], l_pdf: ['Convert to PDF', 'In PDF umwandeln', 'Convertir a PDF'],
    l_more: ['View More', 'Mehr anzeigen', 'Ver más'], l_reading: ['Add to Reading List', 'Zur Leseliste hinzufügen', 'Añadir a la lista de lectura'],
    l_favs: ['Add to Favourites', 'Zu Favoriten hinzufügen', 'Añadir a favoritos'], l_find: ['Find on Page', 'Auf der Seite suchen', 'Buscar en la página'],
    l_a2hs: ['Add to Home Screen', 'Zum Home-Bildschirm', 'Añadir a pantalla de inicio'], l_markup: ['Markup', 'Markierungen', 'Marcación'], l_print: ['Print', 'Drucken', 'Imprimir'],
    l_cancel: ['Cancel', 'Abbrechen', 'Cancelar'], l_add: ['Add', 'Hinzufügen', 'Añadir'], l_webapp: ['Open as Web App', 'Als Web-App öffnen', 'Abrir como app web'],
    l_openb: ['Open in browser', 'Im Browser öffnen', 'Abrir en el navegador'], l_copylink: ['Copy link', 'Link kopieren', 'Copiar enlace'], l_report: ['Report', 'Melden', 'Denunciar'],
    l_history: ['History', 'Verlauf', 'Historial'], l_dl: ['Downloads', 'Downloads', 'Descargas'], l_settings: ['Settings', 'Einstellungen', 'Configuración'],
    l_a2hsA: ['Add to Home screen', 'Zum Startbildschirm hinzufügen', 'Añadir a pantalla de inicio'], l_installT: ['Install app', 'App installieren', 'Instalar aplicación'],
    l_install: ['Install', 'Installieren', 'Instalar'], l_addto: ['Add page to', 'Seite hinzufügen zu', 'Añadir página a'], l_homescr: ['Home screen', 'Startbildschirm', 'Pantalla de inicio'],
    l_phone: ['Add to phone', 'Zum Telefon hinzufügen', 'Añadir al teléfono'], l_sharew: ['Share…', 'Teilen…', 'Compartir…'], l_bmA: ['Bookmarks', 'Lesezeichen', 'Favoritos'],
    /* overlay + coach + success */
    o_h: ['Make LOWiSPIKE an app', 'Mach LOWiSPIKE zur App', 'Convierte LOWiSPIKE en app'],
    o_why: ['Full screen, one tap to open, and your companion can remind you.', 'Vollbild, mit einem Tipp offen, und dein Begleiter kann dich erinnern.', 'Pantalla completa, se abre con un toque y tu ser de luz puede recordarte cosas.'],
    o_whys: ['Full screen, one tap to open, and you stay signed in.', 'Vollbild, mit einem Tipp offen, und du bleibst angemeldet.', 'Pantalla completa, se abre con un toque y sigues con tu sesión.'],
    o_install: ['Install app', 'App installieren', 'Instalar app'], o_where: ['Show me where', 'Zeig mir wo', 'Muéstrame dónde'],
    o_safari: ['Open in Safari', 'In Safari öffnen', 'Abrir en Safari'], o_chrome: ['Open in Chrome', 'In Chrome öffnen', 'Abrir en Chrome'],
    o_signed: ['Copy sign-in & finish', 'Anmeldung kopieren & fertig', 'Copiar acceso y listo'], o_done: ['Got it', 'Alles klar', 'Entendido'],
    o_later: ['Maybe later', 'Vielleicht später', 'Quizás luego'], o_close: ['Close', 'Schließen', 'Cerrar'],
    t_copied_s: ['Link copied. Paste it in Safari.', 'Link kopiert. Füg ihn in Safari ein.', 'Enlace copiado. Pégalo en Safari.'],
    t_copied_c: ['Link copied. Paste it in Chrome.', 'Link kopiert. Füg ihn in Chrome ein.', 'Enlace copiado. Pégalo en Chrome.'],
    t_noopen: ['Didn\'t open? Use the three dots, like in the video.', 'Nicht geöffnet? Nimm die drei Punkte, wie im Video.', '¿No se abrió? Usa los tres puntos, como en el vídeo.'],
    c_ios: ['Tap ••• down here', 'Tippe hier unten auf •••', 'Toca ••• aquí abajo'], c_ipad: ['Tap Share up here', 'Tippe hier oben auf Teilen', 'Toca Compartir aquí arriba'],
    c_path: ['then Share → View More → Add to Home Screen → Add', 'dann Teilen → Mehr anzeigen → Zum Home-Bildschirm → Hinzufügen', 'luego Compartir → Ver más → Añadir a pantalla de inicio → Añadir'],
    c_pathpad: ['then Add to Home Screen → Add', 'dann Zum Home-Bildschirm → Hinzufügen', 'luego Añadir a pantalla de inicio → Añadir'],
    w_h: ['You did it!', 'Geschafft!', '¡Lo lograste!'],
    w_t: ['LOWiSPIKE is on your Home Screen now. One tap and Misty is there.', 'LOWiSPIKE ist jetzt auf deinem Home-Bildschirm. Ein Tipp und Misty ist da.', 'LOWiSPIKE ya está en tu pantalla de inicio. Un toque y Misty está ahí.']
  };
  const LI = { en: 0, de: 1, es: 2 };
  function tx(key, lang) { const r = TX[key]; return r ? (r[LI[lang] == null ? 0 : LI[lang]] || r[0]) : key; }
  const Core = { detect, flow, TX, tx, WELCOME: 'lowi.ig.welcome', SEEN: 'lowi.ig.seen', A2HS_X: 'lowi.a2hs.x' };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  if (!D || !W.addEventListener) return;

  /* ---------- browser ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function lang() { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || localStorage.getItem('lowispike.lang') || D.documentElement.lang || 'en'; } catch (e) {} l = String(l).slice(0, 2); return LI[l] != null ? l : 'en'; }
  function standalone() { try { return !!(navigator.standalone || (W.matchMedia && matchMedia('(display-mode: standalone)').matches)); } catch (e) { return false; } }
  function reduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  const ENV = detect(navigator.userAgent, navigator.maxTouchPoints);
  /* iOS keeps the Home Screen app's storage apart from Safari's, so an empty storage at the very first standalone start = just added */
  let FRESH = false; try { FRESH = standalone() && (W.__lowiFresh === true || (W.__lowiFresh == null && localStorage.length === 0)); } catch (e) {}
  let bip = null;
  W.addEventListener('beforeinstallprompt', e => { try { e.preventDefault(); } catch (x) {} bip = e; paintInstall(); });
  W.addEventListener('appinstalled', () => { bip = null; paintInstall(); });

  const I = {
    dots: '<svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/></svg>',
    kebab: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="18.5" r="1.9"/></svg>',
    burger: '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.5v7M8.5 12h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    compass: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
  };
  const ICON = '<img class="ig-icon" src="icon-180.png" alt="" width="60" height="60" decoding="async">';
  const URLT = 'therealetm.github.io';

  /* ---------- one frame of the mock phone ---------- */
  function page(dim) { return '<div class="ig-page' + (dim ? ' dim' : '') + '">' + ICON + '<b>LOWiSPIKE</b><i class="ig-ln"></i><i class="ig-ln s"></i></div>'; }
  function row(label, hit, ic) { return '<div class="ig-row' + (hit ? ' ig-hit' : '') + '">' + (ic || '<i class="ig-ri"></i>') + '<span>' + esc(label) + '</span></div>'; }
  function frame(sc, L) {
    const t = k => esc(tx(k, L));
    switch (sc.f) {
      case 'iab': return '<div class="ig-iab"><span class="ig-x">×</span><span class="ig-url">' + URLT + '</span><span class="ig-btn ig-hit">' + (sc.os === 'android' ? I.kebab : I.dots) + '</span></div>' + page();
      case 'iabmenu': return '<div class="ig-iab"><span class="ig-x">×</span><span class="ig-url">' + URLT + '</span><span class="ig-btn">' + (sc.os === 'android' ? I.kebab : I.dots) + '</span></div>' + page(true) +
        '<div class="ig-sheet">' + row(tx('l_openb', L), true, I.compass) + row(tx('l_copylink', L), false, I.link) + row(tx('l_report', L)) + '</div>';
      case 'sbar': return page() + '<div class="ig-sfbar"><span class="ig-circ">' + I.back + '</span><span class="ig-pill">' + URLT + '</span><span class="ig-circ ig-hit">' + I.dots + '</span></div>';
      case 'smenu': return page(true) + '<div class="ig-pop">' + row(tx('l_share', L), true, I.share) + row(tx('l_addbm', L)) + row(tx('l_addbmto', L)) + row(tx('l_newtab', L)) + row(tx('l_private', L)) + row(tx('l_bms', L)) + row(tx('l_alltabs', L)) + '</div>' +
        '<div class="ig-sfbar"><span class="ig-circ">' + I.back + '</span><span class="ig-pill">' + URLT + '</span><span class="ig-circ on">' + I.dots + '</span></div>';
      case 'crbar': return '<div class="ig-crbar"><span class="ig-pill">' + URLT + '</span><span class="ig-btn ig-hit">' + I.share + '</span></div>' + page();
      case 'share': return page(true) + '<div class="ig-sheet ig-share"><div class="ig-shh">' + ICON + '<span><b>LOWiSPIKE</b><small>' + URLT + '</small></span></div>' +
        '<div class="ig-ppl"><i></i><i></i><i></i><i></i></div><div class="ig-apps"><i class="a1"></i><i class="a2"></i><i class="a3"></i><i class="a4"></i></div>' +
        (sc.direct ? row(tx('l_copy', L)) + row(tx('l_reading', L)) + row(tx('l_a2hs', L), true, I.plus) : row(tx('l_copy', L)) + row(tx('l_pdf', L)) + row(tx('l_more', L), true, I.dots)) + '</div>';
      case 'more': return page(true) + '<div class="ig-sheet ig-list">' + row(tx('l_addbm', L)) + row(tx('l_reading', L)) + row(tx('l_favs', L)) + row(tx('l_find', L)) + row(tx('l_a2hs', L), true, I.plus) + row(tx('l_markup', L)) + row(tx('l_print', L)) + '</div>';
      case 'a2hs': return '<div class="ig-a2"><div class="ig-nav"><span>' + t('l_cancel') + '</span><b>' + t('l_a2hs') + '</b><span class="ig-addb ig-hit">' + t('l_add') + '</span></div>' +
        '<div class="ig-card">' + ICON + '<span><b>LOWiSPIKE</b><small>' + URLT + '</small></span></div>' +
        '<div class="ig-card ig-tg"><span>' + t('l_webapp') + '</span><i class="ig-switch"></i></div></div>';
      case 'home': case 'ahome': return '<div class="ig-home' + (sc.f === 'ahome' ? ' ig-and' : '') + '">' + Array.from({ length: 7 }, (_, i) => '<i class="ig-app c' + (i % 5) + '"></i>').join('') +
        '<span class="ig-mine ig-hit">' + ICON + '<em>LOWiSPIKE</em></span>' + Array.from({ length: 4 }, (_, i) => '<i class="ig-app c' + ((i + 2) % 5) + '"></i>').join('') + '</div>';
      case 'abar': {
        if (sc.b === 'samsung') return page() + '<div class="ig-abot"><span>‹</span><span>›</span><span>' + I.home + '</span><span>☆</span><span class="ig-tabs">2</span><span class="ig-btn ig-hit">' + I.burger + '</span></div>';
        if (sc.b === 'edge') return page() + '<div class="ig-abot"><span>‹</span><span>›</span><span class="ig-btn ig-hit">' + I.dots + '</span><span class="ig-tabs">2</span><span>' + I.home + '</span></div>';
        return '<div class="ig-atop">' + I.home + '<span class="ig-pill">' + URLT + '</span><span class="ig-tabs">2</span><span class="ig-btn ig-hit">' + I.kebab + '</span></div>' + page();
      }
      case 'amenu': {
        if (sc.b === 'samsung') return page(true) + '<div class="ig-sheet ig-grid">' + ['l_bmA', 'l_history', 'l_dl', 'l_addto', 'l_sharew', 'l_settings'].map(k => '<div class="ig-gi' + (k === 'l_addto' ? ' ig-hit' : '') + '"><i></i><span>' + t(k) + '</span></div>').join('') + '</div>';
        if (sc.b === 'edge') return page(true) + '<div class="ig-sheet ig-grid">' + ['l_bmA', 'l_history', 'l_dl', 'l_phone', 'l_sharew', 'l_settings'].map(k => '<div class="ig-gi' + (k === 'l_phone' ? ' ig-hit' : '') + '"><i></i><span>' + t(k) + '</span></div>').join('') + '</div>';
        return '<div class="ig-atop">' + I.home + '<span class="ig-pill">' + URLT + '</span><span class="ig-tabs">2</span><span class="ig-btn">' + I.kebab + '</span></div>' + page(true) +
          '<div class="ig-drop"><div class="ig-icons"><i></i><i></i><i></i><i></i></div>' + row(tx('l_newtab', L)) + row(tx('l_history', L)) + row(tx('l_dl', L)) + row(tx('l_bmA', L)) + row(tx('l_sharew', L)) + row(tx('l_a2hsA', L), true, I.home) + row(tx('l_settings', L)) + '</div>';
      }
      case 'asub': return page(true) + '<div class="ig-sheet"><div class="ig-sht">' + t('l_addto') + '</div>' + row(tx('l_bmA', L)) + row(tx('l_homescr', L), true, I.home) + '</div>';
      case 'adlg': return page(true) + '<div class="ig-dlg"><b>' + (sc.btn === 'install' ? t('l_installT') : t('l_a2hsA')) + '</b><div class="ig-card">' + ICON + '<span><b>LOWiSPIKE</b><small>' + URLT + '</small></span></div>' +
        '<div class="ig-dbt"><span>' + t('l_cancel') + '</span><span class="ig-hit">' + (sc.btn === 'install' ? t('l_install') : t('l_add')) + '</span></div></div>';
    }
    return page();
  }

  /* ---------- player ---------- */
  function pickDefault() { return ENV.device === 'android' ? 'android' : 'ios'; }
  function scenesFor(dev) {
    const br = dev === ENV.device ? ENV.browser : (dev === 'ios' ? 'safari' : 'chrome');
    return flow(dev, br, ENV.inapp, dev === 'ios' && ENV.ipad);
  }
  function inner(dev, L) {
    const sc = scenesFor(dev);
    return '<div class="ig-pick" role="group" aria-label="' + esc(tx('pick', L)) + '">' +
      ['ios', 'android'].map(d => '<button type="button" class="ig-pb' + (d === dev ? ' on' : '') + '" data-ig="dev" data-v="' + d + '" aria-pressed="' + (d === dev) + '">' + (d === 'ios' ? 'iPhone' : 'Android') + '</button>').join('') + '</div>' +
      '<div class="ig-stage" aria-hidden="true"><div class="ig-phone ig-' + dev + '"><div class="ig-scr">' + sc.map((s, i) => '<div class="ig-f ig-f-' + s.f + (i === 0 ? ' on' : '') + '">' + frame(s, L) + '</div>').join('') + '</div></div></div>' +
      '<div class="ig-cap" aria-live="polite"><span class="ig-n">1</span><span class="ig-ct">' + esc(tx(sc[0].cap, L)) + '</span></div>' +
      '<div class="ig-dots">' + sc.map((s, i) => '<button type="button" class="ig-dot' + (i === 0 ? ' on' : '') + '" data-ig="go" data-i="' + i + '" aria-label="' + esc(tx('step', L) + ' ' + (i + 1) + ': ' + tx(s.cap, L)) + '"></button>').join('') + '</div>';
  }
  /* HTML for a player; it starts itself right after it is put on the page */
  function player(opts) {
    opts = opts || {};
    const dev = opts.dev || pickDefault(), L = lang();
    try { if (!standalone()) localStorage.setItem(Core.SEEN, '1'); } catch (e) {}
    setTimeout(boot, 0);
    return '<div class="ig' + (opts.cls ? ' ' + opts.cls : '') + '" data-noi18n data-ig-dev="' + dev + '" data-ig-lang="' + L + '" data-ig-new="1">' + inner(dev, L) + '</div>';
  }
  const live = new Set();
  let timer = 0;
  const STEP_MS = 2600, TAP_AT = 1250;
  function boot() {
    D.querySelectorAll('.ig[data-ig-new]').forEach(el => { el.removeAttribute('data-ig-new'); el.__i = 0; el.__t0 = Date.now(); el.__hold = 0; live.add(el); show(el, 0); });
    if (live.size && !timer) timer = setInterval(tick, 200);
  }
  function show(el, i) {
    const fs = el.querySelectorAll('.ig-f'); if (!fs.length) return;
    i = ((i % fs.length) + fs.length) % fs.length; el.__i = i; el.__t0 = Date.now();
    fs.forEach((f, k) => { f.classList.toggle('on', k === i); f.classList.remove('tap'); });
    el.querySelectorAll('.ig-dot').forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('past', k < i); });
    const sc = scenesFor(el.getAttribute('data-ig-dev'))[i], L = el.getAttribute('data-ig-lang');
    const n = el.querySelector('.ig-n'), c = el.querySelector('.ig-ct');
    if (n) n.textContent = String(i + 1); if (c && sc) c.textContent = tx(sc.cap, L);
  }
  function tick() {
    if (D.hidden) return;
    const L = lang();
    live.forEach(el => {
      if (!el.isConnected) { live.delete(el); return; }
      if (el.getAttribute('data-ig-lang') !== L) { rebuild(el, el.getAttribute('data-ig-dev'), L); return; }
      const dt = Date.now() - el.__t0, wait = el.__hold > Date.now() ? 1e9 : STEP_MS;
      const f = el.querySelectorAll('.ig-f')[el.__i];
      if (f && dt > TAP_AT && !f.classList.contains('tap') && !reduced()) f.classList.add('tap');
      if (dt > wait + (el.__i === el.querySelectorAll('.ig-f').length - 1 ? 900 : 0)) show(el, el.__i + 1);
    });
    if (!live.size) { clearInterval(timer); timer = 0; }
  }
  function rebuild(el, dev, L) { el.setAttribute('data-ig-dev', dev); el.setAttribute('data-ig-lang', L); el.innerHTML = inner(dev, L); show(el, 0); }

  D.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-ig]'); if (!b) return;
    const el = b.closest('.ig'), a = b.getAttribute('data-ig');
    if (a === 'dev' && el) { rebuild(el, b.getAttribute('data-v'), lang()); e.preventDefault(); }
    else if (a === 'go' && el) { show(el, +b.getAttribute('data-i')); el.__hold = Date.now() + 6000; e.preventDefault(); }
    else if (a === 'close') closeOverlay();
    else if (a === 'later') { try { sessionStorage.setItem(Core.A2HS_X, '1'); } catch (x) {} const h = D.getElementById('lcA2hs'); if (h) h.remove(); closeOverlay(); }
    else if (a === 'done') setTimeout(closeOverlay, 0);
    else if (a === 'install') promptInstall();
    else if (a === 'open') openOut(b.closest('#igOv'));
    else if (a === 'copy') copyLink(b.closest('#igOv'));
    else if (a === 'where') { closeOverlay(); coach(true); }
    else if (a === 'coachx') coach(false);
    else if (a === 'welcome') welcomeClose();
  });

  /* ---------- shortcuts ---------- */
  /* While the sign-in gate is up, index.html hides and inerts everything in <body> except #r2gate (gate-boot / lockApp),
     so the guide's overlay, arrow and welcome live inside the gate then, or nobody could see or tap them. */
  function host() { const g = D.getElementById('r2gate'), H = D.documentElement; if (!g || g.hidden || !(H.classList.contains('gate-up') || H.classList.contains('gate-boot') || D.querySelector('body > [data-gate-inert]'))) return D.body; const c = getComputedStyle(g); return c.display !== 'none' && c.visibility !== 'hidden' ? g : D.body; }
  function promptInstall() {
    const p = bip; if (!p) return false;
    try { p.prompt(); Promise.resolve(p.userChoice).then(c => { bip = null; paintInstall(); if (c && c.outcome === 'accepted') closeOverlay(); }).catch(() => {}); } catch (x) { bip = null; paintInstall(); return false; }
    return true;
  }
  function paintInstall() { D.querySelectorAll('#igOv [data-ig="install"]').forEach(b => { b.hidden = !bip; }); }
  function url() { return location.origin + location.pathname; }
  function toast(box, msg) { const t = box && box.querySelector('.ig-toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); }
  async function copyLink(box) {
    const u = url(); let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(u); ok = true; } } catch (e) {}
    if (!ok) { try { const t = D.createElement('textarea'); t.value = u; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0'; host().appendChild(t); t.select(); ok = D.execCommand('copy'); t.remove(); } catch (e) {} }
    toast(box, ok ? tx(ENV.device === 'android' ? 't_copied_c' : 't_copied_s', lang()) : tx('t_noopen', lang()));
  }
  /* in-app browser: try the direct jump (Android intent to Chrome; x-safari-https on iPhone, which some apps block), then the video's path */
  function openOut(box) {
    const u = url();
    if (ENV.device === 'android') location.href = 'intent://' + u.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(u) + ';end';
    else location.href = 'x-safari-' + u;
    setTimeout(() => { if (!D.hidden) toast(box, tx('t_noopen', lang())); }, 1600);
  }

  /* ---------- overlay (Today hint, Profile) ---------- */
  function open(opts) {
    opts = opts || {};
    if (standalone()) return false;
    closeOverlay();
    const L = lang(), dev = pickDefault(), T = k => esc(tx(k, L));
    let pri = '';
    if (ENV.inapp) pri = '<button type="button" class="ig-b pri" data-ig="open">' + T(ENV.device === 'android' ? 'o_chrome' : 'o_safari') + '</button><button type="button" class="ig-b" data-ig="copy">' + I.link + T('l_copylink') + '</button>';
    else if (ENV.device === 'android') pri = '<button type="button" class="ig-b pri" data-ig="install"' + (bip ? '' : ' hidden') + '>' + I.home + T('o_install') + '</button>';
    else if (ENV.device === 'ios' && ENV.browser === 'safari') pri = '<button type="button" class="ig-b' + (opts.signed ? '' : ' pri') + '" data-ig="where">' + T('o_where') + '</button>';
    const fin = opts.signed ? '<button type="button" class="ig-b pri" data-hof="go" data-ig="done">' + T('o_signed') + '</button>' : (pri ? '' : '<button type="button" class="ig-b pri" data-ig="done">' + T('o_done') + '</button>');
    const o = D.createElement('div'); o.id = 'igOv'; o.className = 'ig-ov'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'igOvH'); o.setAttribute('data-noi18n', '');
    o.innerHTML = '<div class="ig-ovcard"><button type="button" class="ig-ovx" data-ig="close" aria-label="' + T('o_close') + '">' + I.x + '</button>' +
      '<h3 id="igOvH">' + T('o_h') + '</h3><p class="ig-why">' + T(opts.signed ? 'o_whys' : 'o_why') + '</p>' + player({ dev, cls: 'ig-inov' }) +
      '<div class="ig-acts">' + pri + fin + '<button type="button" class="ig-link" data-ig="later">' + T('o_later') + '</button></div><div class="ig-toast" role="status"></div></div>';
    host().appendChild(o);
    if (!reduced()) requestAnimationFrame(() => o.classList.add('in')); else o.classList.add('in');
    return true;
  }
  function closeOverlay() { const o = D.getElementById('igOv'); if (o) o.remove(); }
  D.addEventListener('keydown', e => { if (e.key === 'Escape' && D.getElementById('igOv')) closeOverlay(); });

  /* ---------- coach: a pulsing arrow at Safari's real ••• button (iPhone: bottom right; iPad: Share, top right) ---------- */
  let coachT = 0;
  function coach(on, mini) {
    const old = D.getElementById('igCoach'); if (old) old.remove(); clearTimeout(coachT);
    if (!on || standalone() || ENV.device !== 'ios' || ENV.browser !== 'safari') return false;
    const L = lang(), c = D.createElement('div'); c.id = 'igCoach'; c.className = 'ig-coach' + (ENV.ipad ? ' up' : '') + (mini ? ' mini' : ''); c.setAttribute('data-noi18n', '');
    c.innerHTML = (mini ? '' : '<div class="ig-cb" role="status"><b>' + esc(tx(ENV.ipad ? 'c_ipad' : 'c_ios', L)) + '</b><small>' + esc(tx(ENV.ipad ? 'c_pathpad' : 'c_path', L)) + '</small><button type="button" data-ig="coachx" aria-label="' + esc(tx('o_close', L)) + '">' + I.x + '</button></div>') +
      '<span class="ig-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v15M5.5 11.5 12 18l6.5-6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
    host().appendChild(c);
    if (!mini) coachT = setTimeout(() => coach(false), 45000);
    return true;
  }
  /* the small arrow also shows while the A1 guide is up in iPhone Safari */
  setInterval(() => {
    if (D.hidden) return;
    const a1 = D.querySelector('#r2gate .a1:not(.a1-done) .ig'), c = D.getElementById('igCoach');
    if (a1 && !c) coach(true, true); else if (!a1 && c && c.classList.contains('mini')) coach(false);
  }, 600);

  /* ---------- success moment: first start from the Home Screen ---------- */
  function welcomeWanted() {
    if (!standalone()) return false;
    try { if (localStorage.getItem(Core.WELCOME)) return false; return FRESH || localStorage.getItem(Core.SEEN) === '1'; } catch (e) { return false; }
  }
  function welcome(force) {
    if (!force && !welcomeWanted()) return false;
    try { localStorage.setItem(Core.WELCOME, String(Date.now())); localStorage.removeItem(Core.SEEN); } catch (e) {}
    const L = lang(), w = D.createElement('div'); w.id = 'igWelcome'; w.className = 'ig-welcome'; w.setAttribute('data-noi18n', ''); w.setAttribute('role', 'status');
    w.innerHTML = '<button type="button" class="ig-wcard" data-ig="welcome"><span class="ig-misty" aria-hidden="true"><i class="e l"></i><i class="e r"></i><i class="m"></i></span>' +
      '<span class="ig-wt"><b>' + esc(tx('w_h', L)) + '</b><small>' + esc(tx('w_t', L)) + '</small></span></button>' +
      '<span class="ig-fizz" aria-hidden="true">' + '<i></i>'.repeat(8) + '</span>';
    host().appendChild(w);
    requestAnimationFrame(() => w.classList.add('in'));
    setTimeout(welcomeClose, 6500);
    return true;
  }
  function welcomeClose() { const w = D.getElementById('igWelcome'); if (!w) return; w.classList.remove('in'); w.classList.add('out'); setTimeout(() => w.remove(), 450); }
  /* the gate hides <body> while it boots: wait (max ~8 s) until #r2gate exists or the boot lock is gone, so the bubble is visible */
  function welcomeSoon() { let n = 0; const go = () => { const H = D.documentElement; if (n++ < 16 && H.classList.contains('gate-boot') && !D.getElementById('r2gate')) return setTimeout(go, 500); welcome(false); }; setTimeout(go, 1400); }
  if (D.readyState === 'complete') welcomeSoon(); else W.addEventListener('load', welcomeSoon);

  W.LowiIG = Object.assign({}, Core, { env: () => ENV, player, open, close: closeOverlay, coach, welcome, canInstall: () => !!bip, prompt: promptInstall, scenes: scenesFor, lang });
})(typeof window !== 'undefined' ? window : globalThis);
