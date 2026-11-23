/* LOWiSPIKE install replay (23 Nov 2026, Emmanuel, after Get had opened the wrong share menu: "there has to be a better way so that
   my grandma (80) doesn't get confused and my nephew (8) can easily do it ... depending on the phone ... an animation that shows
   exactly what they have to do, how many seconds, how many clicks, where exactly they find it ... that animation needs to almost
   look like someone is taking over control of their phone. The UI gotta look like the one in my screenshot ... so that they think,
   wait, is this happening by itself? And then they realize, oh, no, this is just a loop showing me how to do this").
   Why a replay: no web page can open Safari's own share menu, the only one with "Add to Home Screen" (the menu navigator.share
   opens has no such row; checked on his iPhone, 23 Nov 2026; WebKit bugs 198673, 193959). Android can: Get uses the browser's own
   install prompt when it offers one (store-page.js), and this replay is the fallback there.
   What it is: a full-screen loop drawn over the real page, in the phone's own look and words (navigator.language): a touch circle
   taps the real button in the browser bar (the bar itself is outside the page, so the circle sits at the edge right above / below
   it), then the real-looking menu, share sheet, Add to Home Screen sheet and Home Screen follow, step by step, with a caption
   "Step 2 of 5 · Tap Share" and "5 taps · about 15 seconds". After each round: "Your turn" with an arrow at the real button,
   Watch again, Continue in the browser, and "My phone looks different" (switches to the next way).
   Ways (picked from the browser, switchable):
     ios26     Safari 26, Compact bar as on his phone: ≡ in the address field -> Share -> View More -> Add to Home Screen -> Add
     ios26dots Safari 26 with ••• at the bottom right -> Share -> View More -> Add to Home Screen -> Add
     classic   Safari 15-18 (or the Bottom layout): Share button in the toolbar -> scroll -> Add to Home Screen -> Add
     chromeios Chrome / Edge / Firefox on iPhone: Share in the address bar -> scroll -> Add to Home Screen -> Add
     android   Chrome on Android: ⋮ -> Add to Home screen -> Install
   API: LowiInstallReplay.open(host, {variant, lang, onBrowser, onClose}) / .variantFor(ua) / .close() */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiInstallReplay) return;
  /* the phone's own words (the language the phone is set to, not the app's) */
  const UI = {
    share: ['Share', 'Teilen', 'Compartir'], addbm: ['Add to Bookmarks', 'Lesezeichen hinzufügen', 'Añadir a marcadores'], addbmto: ['Add Bookmark to…', 'Lesezeichen hinzufügen zu …', 'Añadir marcador a…'],
    zoom: ['Page Zoom', 'Seitenzoom', 'Zoom de la página'], find: ['Find on Page', 'Auf der Seite suchen', 'Buscar en la página'], notify: ['Notify Me', 'Mitteilen', 'Notificarme'],
    reading: ['Add to Reading List', 'Zur Leseliste hinzufügen', 'Añadir a la lista de lectura'], favs: ['Add to Favourites', 'Zu Favoriten hinzufügen', 'Añadir a favoritos'],
    a2hs: ['Add to Home Screen', 'Zum Home-Bildschirm', 'Añadir a pantalla de inicio'], more: ['View More', 'Mehr anzeigen', 'Ver más'], less: ['View Less', 'Weniger anzeigen', 'Ver menos'],
    copy: ['Copy', 'Kopieren', 'Copiar'], options: ['Options', 'Optionen', 'Opciones'], cancel: ['Cancel', 'Abbrechen', 'Cancelar'], add: ['Add', 'Hinzufügen', 'Añadir'],
    webapp: ['Open as Web App', 'Als Web-App öffnen', 'Abrir como app web'], markup: ['Markup', 'Markierungen', 'Marcación'], print: ['Print', 'Drucken', 'Imprimir'],
    note: ['An icon will be added to your Home Screen so you can quickly access this website.', 'Ein Symbol wird zu deinem Home-Bildschirm hinzugefügt, damit du schnell auf diese Website zugreifen kannst.', 'Se añadirá un icono a tu pantalla de inicio para que puedas acceder rápidamente a este sitio web.'],
    newtab: ['New Tab', 'Neuer Tab', 'Nueva pestaña'], newpriv: ['New Private Tab', 'Neuer privater Tab', 'Nueva pestaña privada'], bookmarks: ['Bookmarks', 'Lesezeichen', 'Marcadores'], alltabs: ['All Tabs', 'Alle Tabs', 'Todas las pestañas'],
    airdrop: ['AirDrop', 'AirDrop', 'AirDrop'], messages: ['Messages', 'Nachrichten', 'Mensajes'], mail: ['Mail', 'Mail', 'Mail'], notes: ['Notes', 'Notizen', 'Notas'],
    aNewTab: ['New tab', 'Neuer Tab', 'Nueva pestaña'], aIncog: ['New Incognito tab', 'Neuer Inkognito-Tab', 'Nueva pestaña de incógnito'], aHistory: ['History', 'Verlauf', 'Historial'],
    aDownloads: ['Downloads', 'Downloads', 'Descargas'], aBookmarks: ['Bookmarks', 'Lesezeichen', 'Marcadores'], aShare: ['Share…', 'Teilen…', 'Compartir…'], aFind: ['Find in page', 'In Seite suchen', 'Buscar en la página'],
    aA2hs: ['Add to Home screen', 'Zum Startbildschirm hinzufügen', 'Añadir a pantalla de inicio'], aSettings: ['Settings', 'Einstellungen', 'Ajustes'], aInstall: ['Install', 'Installieren', 'Instalar']
  };
  /* the captions, in the app's language */
  const CAP = {
    en: { replay: 'Replay', of: 'Step {i} of {n}', taps: '{n} taps · about {s} seconds', skip: 'Skip', first: 'Watch, then do the same:',
      s_menu: 'Tap ≡ in the address bar', s_dots: 'Tap ••• at the bottom right', s_shareBtn: 'Tap the Share button at the bottom', s_shareTop: 'Tap Share in the address bar', s_kebab: 'Tap ⋮ at the top right',
      s_share: 'Tap Share', s_more: 'Tap View More', s_a2hs: 'Tap Add to Home Screen', s_scroll: 'Scroll down, tap Add to Home Screen', s_add: 'Leave “Open as Web App” on, tap Add', s_addOld: 'Tap Add', s_open: 'Open LOWiSPIKE from your Home Screen',
      s_aA2hs: 'Tap Add to Home screen', s_install: 'Tap Install',
      turnH: 'Your turn', turn_bottom: 'Start with this button down here', turn_top: 'Start with this button up here',
      again: 'Watch again', browser: 'Continue in the browser', other: 'My phone looks different', note: 'This is a replay. Your phone is not being changed.', then: 'Then you sign up in the app, once.' },
    de: { replay: 'Vorführung', of: 'Schritt {i} von {n}', taps: '{n} Tipper · ca. {s} Sekunden', skip: 'Überspringen', first: 'Zuschauen, dann genauso machen:',
      s_menu: 'Tippe auf ≡ in der Adressleiste', s_dots: 'Tippe unten rechts auf •••', s_shareBtn: 'Tippe unten auf Teilen', s_shareTop: 'Tippe in der Adressleiste auf Teilen', s_kebab: 'Tippe oben rechts auf ⋮',
      s_share: 'Tippe auf Teilen', s_more: 'Tippe auf Mehr anzeigen', s_a2hs: 'Tippe auf Zum Home-Bildschirm', s_scroll: 'Runterscrollen, auf Zum Home-Bildschirm tippen', s_add: '„Als Web-App öffnen“ anlassen, auf Hinzufügen tippen', s_addOld: 'Tippe auf Hinzufügen', s_open: 'Öffne LOWiSPIKE auf deinem Home-Bildschirm',
      s_aA2hs: 'Tippe auf Zum Startbildschirm hinzufügen', s_install: 'Tippe auf Installieren',
      turnH: 'Jetzt du', turn_bottom: 'Fang mit diesem Knopf hier unten an', turn_top: 'Fang mit diesem Knopf hier oben an',
      again: 'Nochmal ansehen', browser: 'Im Browser weitermachen', other: 'Bei mir sieht es anders aus', note: 'Das ist nur eine Vorführung. An deinem Handy wird nichts verändert.', then: 'Danach registrierst du dich in der App, einmal.' },
    es: { replay: 'Demostración', of: 'Paso {i} de {n}', taps: '{n} toques · unos {s} segundos', skip: 'Saltar', first: 'Mira y luego haz lo mismo:',
      s_menu: 'Toca ≡ en la barra de direcciones', s_dots: 'Toca ••• abajo a la derecha', s_shareBtn: 'Toca el botón Compartir abajo', s_shareTop: 'Toca Compartir en la barra de direcciones', s_kebab: 'Toca ⋮ arriba a la derecha',
      s_share: 'Toca Compartir', s_more: 'Toca Ver más', s_a2hs: 'Toca Añadir a pantalla de inicio', s_scroll: 'Desliza y toca Añadir a pantalla de inicio', s_add: 'Deja «Abrir como app web» activado y toca Añadir', s_addOld: 'Toca Añadir', s_open: 'Abre LOWiSPIKE desde tu pantalla de inicio',
      s_aA2hs: 'Toca Añadir a pantalla de inicio', s_install: 'Toca Instalar',
      turnH: 'Ahora tú', turn_bottom: 'Empieza con este botón de aquí abajo', turn_top: 'Empieza con este botón de aquí arriba',
      again: 'Ver otra vez', browser: 'Seguir en el navegador', other: 'Mi móvil se ve distinto', note: 'Esto es una demostración. Tu móvil no cambia.', then: 'Después te registras en la app, una vez.' }
  };
  /* the ways. anchor: the real button in the browser bar (edge of the page, x as a share of the width, the glyph drawn by the circle) */
  const V = {
    ios26: { anchor: { edge: 'bottom', x: 0.265, g: '≡' }, steps: [['s_menu', '@', 'menu'], ['s_share', '[data-k=share]', 'sheet'], ['s_more', '[data-k=more]', 'full'], ['s_a2hs', '[data-k=a2hs]', 'a2hs'], ['s_add', '[data-k=add]', 'home'], ['s_open', '[data-k=icon]', 'launch']] },
    ios26dots: { anchor: { edge: 'bottom', x: 0.935, g: '•••' }, menu: 'dots', steps: [['s_dots', '@', 'menu'], ['s_share', '[data-k=share]', 'sheet'], ['s_more', '[data-k=more]', 'full'], ['s_a2hs', '[data-k=a2hs]', 'a2hs'], ['s_add', '[data-k=add]', 'home'], ['s_open', '[data-k=icon]', 'launch']] },
    classic: { anchor: { edge: 'bottom', x: 0.5, g: 'share' }, old: true, steps: [['s_shareBtn', '@', 'list'], ['s_scroll', '[data-k=a2hs]', 'a2hs'], ['s_addOld', '[data-k=add]', 'home'], ['s_open', '[data-k=icon]', 'launch']] },
    chromeios: { anchor: { edge: 'top', x: 0.9, g: 'share' }, old: true, steps: [['s_shareTop', '@', 'list'], ['s_scroll', '[data-k=a2hs]', 'a2hs'], ['s_addOld', '[data-k=add]', 'home'], ['s_open', '[data-k=icon]', 'launch']] },
    android: { anchor: { edge: 'top', x: 0.955, g: '⋮' }, droid: true, steps: [['s_kebab', '@', 'amenu'], ['s_aA2hs', '[data-k=aa2hs]', 'adlg'], ['s_install', '[data-k=ainstall]', 'home'], ['s_open', '[data-k=icon]', 'launch']] }
  };
  const ORDER = { ios: ['ios26', 'ios26dots', 'classic'], chrome: ['chromeios', 'classic', 'ios26'], android: ['android'] };
  function variantFor(ua) {
    ua = String(ua || '');
    if (/Android/i.test(ua)) return 'android';
    if (/CriOS|FxiOS|EdgiOS/.test(ua)) return 'chromeios';
    const m = /Version\/(\d+)/.exec(ua);
    return m && +m[1] < 26 ? 'classic' : 'ios26';
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let root = null, timer = 0, opts = null, cur = '', capL = 'en', uiL = 0, run = 0;
  const u = k => (UI[k] || [k])[uiL] || UI[k][0];
  const c = (k, v) => { let s = (CAP[capL] || CAP.en)[k] || k; if (v) for (const q in v) s = s.replace('{' + q + '}', v[q]); return s; };
  const reduce = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const IC = {
    share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>',
    bm: '<svg viewBox="0 0 24 24"><path d="M7 3.5h10v17l-5-3.6-5 3.6z"/></svg>', book: '<svg viewBox="0 0 24 24"><path d="M3.5 5.5c3-1 6-1 8.5 1 2.5-2 5.5-2 8.5-1v13c-3-1-6-1-8.5 1-2.5-2-5.5-2-8.5-1z"/><path d="M12 6.5v13"/></svg>',
    zoom: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20.5 20.5M10.5 7.5v6M7.5 10.5h6"/></svg>', find: '<svg viewBox="0 0 24 24"><path d="M6 3.5h9l4 4v13H6z"/><circle cx="12" cy="13" r="3"/><path d="M14.2 15.2 17 18"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>', glasses: '<svg viewBox="0 0 24 24"><circle cx="6.5" cy="13" r="3.5"/><circle cx="17.5" cy="13" r="3.5"/><path d="M10 13h4M3 13h0M21 13h0"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/></svg>', plus: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="12" rx="2"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg>', down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>', tab: '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="12" height="13" rx="2.5"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4H18a2 2 0 0 1 2 2v9a1.5 1.5 0 0 1-1.5 1.5H16"/></svg>',
    priv: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 0 16 0M4 12a8 8 0 0 1 16 0"/><path d="M9 12h6"/></svg>', bms: '<svg viewBox="0 0 24 24"><path d="M3.5 5.5c3-1 6-1 8.5 1 2.5-2 5.5-2 8.5-1v13c-3-1-6-1-8.5 1-2.5-2-5.5-2-8.5-1z"/></svg>',
    tabs: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>', clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>', dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6"/></svg>', home: '<svg viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M12 9v6M9 12h6"/></svg>'
  };
  const row = (k, icon, label) => '<div class="rpr" data-k="' + k + '"><i>' + IC[icon] + '</i><span>' + esc(label) + '</span></div>';
  const appIc = (cls, label, glyph) => '<div class="rpapp"><b class="rpai ' + cls + '">' + (glyph || '') + '</b><span>' + esc(label) + '</span></div>';
  function screenHTML(v) {
    const title = 'LOWiSPIKE · ' + (capL === 'de' ? 'Klüger essen, gesünder werden' : capL === 'es' ? 'Come mejor, vive más sano' : 'Eat smarter, become your healthiest self');
    const head = '<div class="rps-h"><img src="icon-512.png" alt=""><div><b>' + esc(title) + '</b><small>lowispike.com</small>' + (v.old ? '' : '<span class="rps-opt">' + esc(u('options')) + ' ›</span>') + '</div></div>';
    const people = '<div class="rps-ppl">' + ['a', 'b', 'c', 'd'].map(k => '<div><b class="rpp rpp-' + k + '"></b><span></span></div>').join('') + '</div>';
    const apps = '<div class="rps-apps">' + appIc('ad', u('airdrop'), '<i></i>') + appIc('ms', u('messages'), '<i></i>') + appIc('ml', u('mail'), '<i></i>') + appIc('nt', u('notes'), '<i></i>') + '</div>';
    const acts = '<div class="rps-acts"><div class="rpact"><b>' + IC.copy + '</b><span>' + esc(u('copy')) + '</span></div><div class="rpact"><b>' + IC.glasses + '</b><span>' + esc(u('reading')) + '</span></div><div class="rpact"><b>' + IC.find + '</b><span>' + esc(u('find')) + '</span></div>' +
      '<div class="rpact rp-more" data-k="more"><b class="rp-mv">' + IC.down + '</b><b class="rp-lv">' + IC.up + '</b><span class="rp-mv">' + esc(u('more')) + '</span><span class="rp-lv">' + esc(u('less')) + '</span></div></div>';
    const list = '<div class="rps-list">' + row('bm', 'bm', u('addbm')) + row('rd', 'glasses', u('reading')) + row('bmto', 'book', u('addbmto')) + row('fav', 'star', u('favs')) + row('find', 'find', u('find')) + row('a2hs', 'plus', u('a2hs')) + '</div>' +
      '<div class="rps-list rps-list2">' + row('mk', 'bm', u('markup')) + row('pr', 'copy', u('print')) + '</div>';
    const menu = v.menu === 'dots'
      ? '<div class="rp-menu rp-menu-r">' + row('share', 'share', u('share')) + row('bm', 'bm', u('addbm')) + row('bmto', 'book', u('addbmto')) + '<hr>' + row('nt', 'tab', u('newtab')) + row('np', 'priv', u('newpriv')) + '<hr>' + row('bms', 'bms', u('bookmarks')) + row('at', 'tabs', u('alltabs')) + '</div>'
      : '<div class="rp-menu">' + row('share', 'share', u('share')) + row('bm', 'bm', u('addbm')) + row('bmto', 'book', u('addbmto')) + '<hr>' + row('zoom', 'zoom', u('zoom')) + '<hr>' + row('find', 'find', u('find')) + row('ntf', 'bell', u('notify')) + '</div>';
    const sheet = v.droid ? '' : '<div class="rp-sheet' + (v.old ? ' rp-old' : '') + '"><div class="rps-in">' + (v.old ? '' : '<b class="rps-x">' + IC.x + '</b>') + head + people + apps + (v.old ? '<div class="rps-list rps-oldlist">' + row('copy', 'copy', u('copy')) + row('rd', 'glasses', u('reading')) + row('bm', 'book', u('addbm')) + row('fav', 'star', u('favs')) + row('find', 'find', u('find')) + row('a2hs', 'plus', u('a2hs')) + row('mk', 'bm', u('markup')) + '</div>' : acts + list) + '</div></div>';
    const a2 = v.droid ? '' : '<div class="rp-a2' + (v.old ? ' rp-old' : '') + '"><div class="rpa-bar">' + (v.old ? '<span class="rpa-c">' + esc(u('cancel')) + '</span>' : '<b class="rpa-x">' + IC.x + '</b>') + '<b class="rpa-t">' + esc(u('a2hs')) + '</b><span class="rpa-add" data-k="add">' + esc(u('add')) + '</span></div>' +
      '<div class="rpa-card"><img src="icon-512.png" alt=""><div><span class="rpa-name">LOWiSPIKE</span><small>https://lowispike.com/</small></div></div>' + (v.old ? '' : '<div class="rpa-row"><span>' + esc(u('webapp')) + '</span><i class="rpa-tg"></i></div>') + '<p class="rpa-note">' + esc(u('note')) + '</p></div>';
    const droid = v.droid ? '<div class="rp-amenu"><div class="rpam-top"><i>→</i><i>☆</i><i>' + IC.dl + '</i><i>ⓘ</i><i>↻</i></div>' + ['aNewTab', 'aIncog', 'aHistory', 'aDownloads', 'aBookmarks', 'aShare', 'aFind'].map(k => '<div class="rpr">' + esc(u(k)) + '</div>').join('') + '<div class="rpr" data-k="aa2hs">' + esc(u('aA2hs')) + '</div><div class="rpr">' + esc(u('aSettings')) + '</div></div>' +
      '<div class="rp-adlg"><b>' + esc(u('aA2hs')) + '</b><div class="rpad-r"><img src="icon-512.png" alt=""><span>LOWiSPIKE</span></div><div class="rpad-b"><span>' + esc(u('cancel')) + '</span><span class="rpad-i" data-k="ainstall">' + esc(u('aInstall')) + '</span></div></div>' : '';
    const grid = []; for (let i = 0; i < 20; i++) grid.push(i === 7 ? '<div class="rph-app rph-me" data-k="icon"><img src="icon-512.png" alt=""><span>LOWiSPIKE</span></div>' : '<div class="rph-app"><b style="--h:' + ((i * 47) % 360) + '"></b><span></span></div>');
    const home = '<div class="rp-home' + (v.droid ? ' rp-dhome' : '') + '"><div class="rph-grid">' + grid.join('') + '</div><div class="rph-dock"><b></b><b></b><b></b><b></b></div></div>' +
      '<div class="rp-launch"><img src="icon-512.png" alt=""></div>';
    return '<div class="rp-dim"></div>' + menu + sheet + a2 + droid + home + '<span class="rp-touch" aria-hidden="true"></span>';
  }
  function anchorHTML(a) {
    const glyph = a.g === 'share' ? IC.share : '<em>' + esc(a.g) + '</em>';
    return '<div class="rp-anchor rp-' + a.edge + '" style="--x:' + (a.x * 100) + '%"><span class="rpan-g">' + glyph + '</span><span class="rpan-ar">' + (a.edge === 'bottom' ? '↓' : '↑') + '</span></div>';
  }
  function paint() {
    const v = V[cur];
    const n = v.steps.length, secs = Math.round(v.steps.length * 2.6 + 1);
    root.className = 'rp rp-' + cur + ' st-page';
    root.innerHTML = '<div class="rp-screen">' + screenHTML(v) + '</div>' + anchorHTML(v.anchor) +
      '<div class="rp-cap" aria-live="polite"><div class="rpc-top"><span class="rpc-badge"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1 9 5 2 9z"/></svg>' + esc(c('replay')) + '</span><span class="rpc-taps">' + esc(c('taps', { n, s: secs })) + '</span><button type="button" class="rpc-skip" data-rp="skip">' + esc(c('skip')) + '</button></div>' +
      '<div class="rpc-step"><b class="rpc-n"></b><span class="rpc-t">' + esc(c('first')) + '</span></div></div>' +
      '<div class="rp-end"><div class="rpe-card"><h2>' + esc(c('turnH')) + '</h2><p class="rpe-go">' + esc(c(v.anchor.edge === 'bottom' ? 'turn_bottom' : 'turn_top')) + '</p><p class="rpe-then">' + esc(c('then')) + '</p>' +
      '<button type="button" class="rpe-again" data-rp="again">↻ ' + esc(c('again')) + '</button>' + (ORDER[group()].length > 1 ? '<button type="button" class="rpe-other" data-rp="other">' + esc(c('other')) + '</button>' : '') +
      '<button type="button" class="rpe-browser" data-rp="browser">' + esc(c('browser')) + '</button><small>' + esc(c('note')) + '</small></div></div>';
  }
  function group() { return cur === 'android' ? 'android' : cur === 'chromeios' ? 'chrome' : 'ios'; }
  const wait = ms => new Promise(r => { timer = setTimeout(r, reduce() ? ms * 1.4 : ms); });
  function touchTo(target, me) {
    const t = root.querySelector('.rp-touch'); if (!t) return;
    let x, y; const R = root.getBoundingClientRect();
    if (target === '@') { const a = V[cur].anchor; x = R.width * a.x; y = a.edge === 'bottom' ? R.height - 4 : 4; }
    else { const el = root.querySelector('.rp-screen ' + target); if (!el) return; const r = el.getBoundingClientRect(); x = r.left - R.left + r.width / 2; y = r.top - R.top + r.height / 2; }
    t.style.setProperty('--tx', x + 'px'); t.style.setProperty('--ty', y + 'px'); t.classList.add('on'); t.classList.toggle('edge', target === '@');
    return me === run;
  }
  /* the sheet scrolls so the Add to Home Screen row is in view, like a thumb would */
  function scrollTo(sel) {
    const sh = root.querySelector('.rp-sheet .rps-in'), el = root.querySelector('.rp-screen ' + sel); if (!sh || !el) return;
    const R = root.getBoundingClientRect(), r = el.getBoundingClientRect(), cap = root.querySelector('.rp-cap'), cr = cap && cap.getBoundingClientRect();
    const limit = cr && cr.top > R.top + R.height / 2 ? cr.top - 24 : R.bottom - 56, need = r.bottom - limit;
    if (need > 0) sh.style.transform = 'translateY(' + (-need) + 'px)';
  }
  async function loop(me) {
    const v = V[cur];
    while (me === run && root) {
      root.className = 'rp rp-' + cur + ' st-page'; const sh = root.querySelector('.rp-sheet .rps-in'); if (sh) sh.style.transform = '';
      const tch = root.querySelector('.rp-touch'); if (tch) tch.className = 'rp-touch';
      setCap(0, c('first')); await wait(1300); if (me !== run) return;
      for (let i = 0; i < v.steps.length; i++) {
        const [k, target, state] = v.steps[i];
        setCap(i + 1, c(k));
        if (state === 'a2hs' && (v.old || cur === 'ios26' || cur === 'ios26dots')) { scrollTo('[data-k=a2hs]'); await wait(700); if (me !== run) return; }
        touchTo(target, me); await wait(1100); if (me !== run) return;
        const t = root.querySelector('.rp-touch'); t.classList.add('press'); const hit = target !== '@' && root.querySelector('.rp-screen ' + target); if (hit) hit.classList.add('hit');
        await wait(380); if (me !== run) return;
        t.classList.remove('press'); if (hit) hit.classList.remove('hit');
        root.className = 'rp rp-' + cur + ' st-' + state; if (target === '@' || state === 'home' || state === 'launch') t.classList.remove('on');
        await wait(state === 'home' ? 1500 : 1000); if (me !== run) return;
      }
      await wait(900); if (me !== run) return;
      root.className = 'rp rp-' + cur + ' st-end'; setCap(-1, '');
      await wait(6500);
    }
  }
  function setCap(i, text) {
    const n = root && root.querySelector('.rpc-n'), t = root && root.querySelector('.rpc-t'); if (!n || !t) return;
    const total = V[cur].steps.length; n.textContent = i > 0 ? c('of', { i: Math.min(i, total), n: total }) : ''; n.hidden = !(i > 0); t.textContent = text;
  }
  function start() { clearTimeout(timer); run++; paint(); loop(run); }
  function open(host, o) {
    opts = o || {}; capL = CAP[opts.lang] ? opts.lang : 'en';
    let nl = 'en'; try { nl = String(navigator.language || 'en').slice(0, 2).toLowerCase(); } catch (e) { }
    uiL = nl === 'de' ? 1 : nl === 'es' ? 2 : 0;
    cur = V[opts.variant] ? opts.variant : variantFor(navigator.userAgent);
    close(true);
    root = D.createElement('div'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('data-noi18n', '');
    root.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-rp]'); if (!b) return; const k = b.dataset.rp;
      if (k === 'again') start();
      else if (k === 'other') { const L = ORDER[group()]; cur = L[(L.indexOf(cur) + 1) % L.length]; start(); }
      else if (k === 'browser') { const f = opts.onBrowser; close(); if (f) f(); }
      else if (k === 'skip') { const f = opts.onClose; close(); if (f) f(); } });
    (host || D.body).appendChild(root); start();
    return root;
  }
  function close(keep) { clearTimeout(timer); run++; if (root) { root.remove(); root = null; } if (!keep) opts = null; }
  W.LowiInstallReplay = { open, close, variantFor, VARIANTS: V, _UI: UI, _CAP: CAP, current: () => cur };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
