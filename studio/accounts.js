/* LOWiSPIKE Studio > Profile (22 Nov 2026, Emmanuel: "add one more thing here, which is profile ... I manage multiple accounts ...
   for each of my accounts I should be able to manage my strategy ... it's just creating a folder that looks like a profile feed ...
   for that specific account, the content creator that I'm trying to emulate ... add inspo from the swipe file ... paste in their
   profile link and it takes the bio and their profile picture ... click on the name and switch from account to account, like TikTok
   or YouTube").
   - Everyone can add their own accounts (only the owner adds to the shared Swipe file). Each account: picture, name, @handle, bio,
     numbers when the profile link gave them, and its own grid of inspo videos picked from the Swipe file.
   - Tap the name at the top to switch accounts or add one (a sheet like TikTok's account switcher).
   - Saved on this phone (lowi.studio.accounts.v1) and, when signed in to the app, in public.studio_accounts (one row per person,
     only they can read it), so the accounts follow them to another phone.
   - The inspo grid opens the usual video view (Transcript, Translate, Copy for agent); its "+ @handle" button adds or removes the
     video for the current account. */
(function () {
  'use strict';
  var S = window.STUDIO; if (!S || window.StudioAcc) return;
  var D = document, KEY = 'lowi.studio.accounts.v1', esc = S.esc, $ = S.$, L = S.L;
  var W = {
    accounts: ['Accounts', 'Accounts', 'Cuentas'], switchT: ['Switch account', 'Account wechseln', 'Cambiar de cuenta'], addAcc: ['Add account', 'Account hinzufügen', 'Añadir cuenta'],
    cloudLater: ['Saved on this phone. The cloud copy will follow.', 'Auf diesem Handy gespeichert. Die Cloud-Kopie folgt.', 'Guardado en este móvil. La copia en la nube llegará.'],
    trTo: ['Translate into', 'Übersetzen in', 'Traducir a'], trAny: ['Any language', 'Jede Sprache', 'Cualquier idioma'], trGo: ['Translate', 'Übersetzen', 'Traducir'],
    trWait: ['Translating…', 'Übersetze…', 'Traduciendo…'], trFail: ['Could not translate. Try again.', 'Übersetzen ging nicht. Nochmal versuchen.', 'No se pudo traducir. Inténtalo de nuevo.'],
    orig: ['Original', 'Original', 'Original'], other: ['Other', 'Andere', 'Otro'],
    trUndo: ['Back to original', 'Zurück zum Original', 'Volver al original'], copyTx: ['Copy text', 'Text kopieren', 'Copiar texto'], copiedTx: ['Copied ✓', 'Kopiert ✓', 'Copiado ✓'],
    editAcc: ['Edit profile', 'Profil bearbeiten', 'Editar perfil'], delAcc: ['Delete account', 'Account löschen', 'Eliminar cuenta'], delAccQ: ['Delete this account and its inspo list? The Swipe file stays.', 'Diesen Account und seine Inspo-Liste löschen? Die Swipe-Datei bleibt.', '¿Eliminar esta cuenta y su lista? El archivo de swipe se queda.'],
    plink: ['Profile link (TikTok or Instagram, optional)', 'Profil-Link (TikTok oder Instagram, optional)', 'Enlace del perfil (TikTok o Instagram, opcional)'], getP: ['Get profile', 'Profil holen', 'Obtener perfil'], getting: ['Getting…', 'Hole…', 'Obteniendo…'],
    gotP: ['Profile filled in. Check it and save.', 'Profil ausgefüllt. Prüf es und speichere.', 'Perfil rellenado. Revísalo y guarda.'], noP: ['Could not read that profile. Type the name yourself.', 'Profil nicht lesbar. Tipp den Namen selbst ein.', 'No se pudo leer el perfil. Escribe el nombre.'],
    name: ['Name (what this account is for)', 'Name (wofür der Account ist)', 'Nombre (para qué es la cuenta)'], handle: ['@handle', '@Handle', '@usuario'], bio: ['Bio', 'Bio', 'Bio'], needName: ['Give the account a name or @handle.', 'Gib dem Account einen Namen oder @Handle.', 'Pon un nombre o @usuario.'],
    inspo: ['Inspo', 'Inspo', 'Inspo'], followers: ['Followers', 'Follower', 'Seguidores'], likes: ['Likes', 'Likes', 'Me gusta'], addInspo: ['+ Add inspo', '+ Inspo hinzufügen', '+ Añadir inspo'],
    remove: ['Remove', 'Entfernen', 'Quitar'], done: ['Done', 'Fertig', 'Listo'], openOn: ['Open profile', 'Profil öffnen', 'Abrir perfil'],
    pickT: ['Pick videos to copy for {h}', 'Videos für {h} auswählen', 'Elige vídeos para {h}'], saveN: ['Save ({n})', 'Speichern ({n})', 'Guardar ({n})'], search: ['Search the Swipe file', 'Swipe-Datei durchsuchen', 'Buscar en el archivo'],
    emptyT: ['Your accounts', 'Deine Accounts', 'Tus cuentas'], emptyP: ['Add each account you run. Then pick the videos from the Swipe file you want to copy for it, so every account has its own plan.', 'Füg jeden Account hinzu, den du führst. Dann wähl aus der Swipe-Datei die Videos, die du dafür nachmachen willst. So hat jeder Account seinen eigenen Plan.', 'Añade cada cuenta que llevas. Luego elige del archivo de swipe los vídeos que quieres copiar para ella.'],
    noInspo: ['No inspo yet. Tap “+ Add inspo” and pick videos from the Swipe file.', 'Noch keine Inspo. Tipp auf „+ Inspo hinzufügen“ und wähl Videos aus der Swipe-Datei.', 'Aún no hay inspo. Toca «+ Añadir inspo».'],
    added: ['Added to {h}', 'Zu {h} hinzugefügt', 'Añadido a {h}'], removed: ['Removed from {h}', 'Von {h} entfernt', 'Quitado de {h}'], local: ['Sign in to the app to keep your accounts on every phone.', 'Melde dich in der App an, damit deine Accounts auf jedem Handy da sind.', 'Inicia sesión para tener tus cuentas en cada móvil.'],
    cancel: ['Cancel', 'Abbrechen', 'Cancelar'], drafts: ['Drafts', 'Entwürfe', 'Borradores'], noDrafts: ['Your ideas go here', 'Hier landen deine Ideen', 'Aquí van tus ideas'], idea: ['Idea', 'Idee', 'Idea'],
    newIdea: ['New idea', 'Neue Idee', 'Nueva idea'], editDraft: ['Draft', 'Entwurf', 'Borrador'], ideaPh: ['Type your idea, the text on screen or what you will say…', 'Schreib deine Idee, den Text fürs Video oder was du sagen willst…', 'Escribe tu idea, el texto en pantalla o lo que dirás…'],
    speak: ['Tap and speak your idea', 'Tippen und Idee sagen', 'Toca y di tu idea'], listening: ['Listening… tap to stop', 'Hört zu… tippen zum Stoppen', 'Escuchando… toca para parar'], kbMic: ['Tip: tap the microphone on your keyboard to speak.', 'Tipp: Tippe aufs Mikrofon deiner Tastatur, um zu sprechen.', 'Consejo: toca el micrófono del teclado para hablar.'],
    saveDraft: ['Save draft', 'Als Entwurf speichern', 'Guardar borrador'], delDraft: ['Delete draft', 'Entwurf löschen', 'Borrar borrador'], delDraftQ: ['Delete this draft?', 'Diesen Entwurf löschen?', '¿Borrar este borrador?'], ideaEmpty: ['Write or say your idea first.', 'Schreib oder sag zuerst deine Idee.', 'Escribe o di tu idea primero.'], drafted: ['Saved in Drafts', 'In Entwürfen gespeichert', 'Guardado en borradores'], order: ['Change order', 'Reihenfolge ändern', 'Cambiar orden'], up: ['Move up', 'Nach oben', 'Subir'], down: ['Move down', 'Nach unten', 'Bajar'], pic: ['Change picture', 'Bild ändern', 'Cambiar foto'], save: ['Save', 'Speichern', 'Guardar'], back: ['Back', 'Zurück', 'Atrás']
  };
  var t = function (k, v) { var r = W[k], s = r ? r[L === 'de' ? 1 : L === 'es' ? 2 : 0] : S.t(k); if (v) for (var q in v) s = s.replace('{' + q + '}', v[q]); return s; };
  var DV = false, IDEA = null, recog = null;
  var A = {t: 0, cur: '', list: []}, SB = null, UID = '', RM = false, PICK = null, saveT = 0, signed = false;
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && Array.isArray(raw.list)) A = raw; } catch (e) {}
  try { signed = !!localStorage.getItem('lowi.auth'); } catch (e) {}

  function cur() { for (var i = 0; i < A.list.length; i++) if (A.list[i].id === A.cur) return A.list[i]; return A.list[0] || null; }
  function label(a) { return a ? (a.handle || a.name || '') : ''; }
  function persist() { A.t = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} clearTimeout(saveT); saveT = setTimeout(push, 600); }
  /* 23 Nov 2026 bug (Emmanuel: "Not saved. Check your connection ... keeps appearing even though the things have been saved"): the doc had
     outgrown the database's size check (raised, supabase/proposals/studio_accounts_size_20261123.sql). Everything is always kept on the
     phone first; when the cloud copy fails it says so once and tries again a little later, instead of a scary toast on every save. */
  var failSaid = false, retryT = 0;
  function push() { if (!SB || !UID) return; SB.from('studio_accounts').upsert({user_id: UID, doc: A, updated_at: new Date().toISOString()}).then(function (r) {
    if (r && r.error) { if (!failSaid) { failSaid = true; S.toast(t('cloudLater')); } clearTimeout(retryT); retryT = setTimeout(push, 60000); } else { failSaid = false; clearTimeout(retryT); } }, function () { clearTimeout(retryT); retryT = setTimeout(push, 60000); }); }
  function cloud(sb) {
    SB = sb; sb.auth.getSession().then(function (r) { var s = r && r.data && r.data.session; if (!s) return; UID = s.user.id;
      return sb.from('studio_accounts').select('doc').eq('user_id', UID).maybeSingle().then(function (q) { var d = q && q.data && q.data.doc;
        if (d && Array.isArray(d.list) && (d.t || 0) > (A.t || 0)) { A = d; try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} if (S.tab() === 'profile') S.render(); }
        else if (A.list.length && (!d || (d.t || 0) < (A.t || 0))) push(); }); }).catch(function () {});
  }
  function avatar(a, size) { var n = (a && (a.name || a.handle) || '?').replace(/^@/, ''), h = S.hue((a && a.id) || 'x');
    return a && a.avatar ? '<span class="av" style="width:' + size + 'px;height:' + size + 'px;background-image:url(&quot;' + esc(a.avatar) + '&quot;)"></span>'
      : '<span class="av" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .42) + 'px;background:linear-gradient(150deg,hsl(' + h + ' 55% 46%),hsl(' + ((h + 50) % 360) + ' 55% 26%))">' + esc(n.charAt(0).toUpperCase()) + '</span>'; }
  function num(n) { return S.fmtViews(n) || '0'; }
  function items(SW) { var a = cur(); if (!a) return []; var by = {}; SW.forEach(function (x) { by[x.id] = x; }); return (a.inspo || []).map(function (id) { return by[id]; }).filter(Boolean); }

  function render(main) {
    var a = cur();
    if (!a) { main.innerHTML = '<div class="ap-empty">' + avatar(null, 76) + '<h2>' + esc(t('emptyT')) + '</h2><p>' + esc(t('emptyP')) + '</p><button class="btn pri" data-acc="add">+ ' + esc(t('addAcc')) + '</button>' + (signed ? '' : '<small>' + esc(t('local')) + '</small>') + '</div>'; return; }
    var list = items(S.sw()), stats = [[list.length, t('inspo')]];
    if (a.followers) stats.push([num(a.followers), t('followers')]); if (a.likes) stats.push([num(a.likes), t('likes')]);
    var h = '<div class="ap"><button class="ap-sw" data-acc="switch" aria-haspopup="dialog" aria-label="' + esc(t('switchT')) + '"><b>' + esc(a.name || a.handle) + '</b><span aria-hidden="true">▾</span>' + (A.list.length > 1 ? '<i>' + A.list.length + '</i>' : '') + '</button>' +
      avatar(a, 96) + (a.handle ? '<div class="ap-h">' + esc(a.handle) + '</div>' : '') +
      '<div class="ap-st">' + stats.map(function (s) { return '<span><b>' + esc(String(s[0])) + '</b>' + esc(s[1]) + '</span>'; }).join('') + '</div>' +
      '<div class="ap-bt"><button class="btn pri" data-acc="pick">' + esc(t('addInspo')) + '</button><button class="btn" data-acc="idea">＋ ' + esc(t('idea')) + '</button><button class="btn" data-acc="edit">' + esc(t('editAcc')) + '</button>' + (a.link ? '<a class="btn ap-ln" href="' + esc(a.link) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(t('openOn')) + '">↗</a>' : '') + '</div>' +
      (window.StudioVM ? '<button class="btn pri ap-vw" data-acc="vm">' + esc(StudioVM.label()) + '</button>' : '') +   /* 24 Nov 2026: video-machine.js */
      (window.StudioWords ? '<button class="btn ap-vw" data-acc="words">' + esc(StudioWords.label()) + '</button>' : '') +   /* 23 Nov 2026: video-words.js */
      (a.bio ? '<p class="ap-bio">' + esc(a.bio) + '</p>' : '') +
      (list.length ? '<div class="ap-gh"><span>' + esc(t('inspo')) + '</span><button class="pill' + (RM ? ' acc' : '') + '" data-acc="rm">' + esc(RM ? t('done') : t('remove')) + '</button></div>' : '') + '</div>';
    /* 23 Nov 2026 (Emmanuel: "quickly note down my content ideas ... speak ... it writes it ... click on draft ... like TikTok has
       the drafts on the left ... in the form of that text on screen thingy"): the first tile is Drafts (like TikTok); it opens this
       account's drafts as text-on-screen tiles. "+ Idea" (and the + tile in Drafts) opens a page to type or speak an idea. */
    var drafts = (a.drafts || []);
    if (DV) {
      h += '<div class="ap-gh"><button class="pill" data-acc="dback">‹ ' + esc(t('inspo')) + '</button><span>' + esc(t('drafts')) + ' · ' + drafts.length + '</span></div><div class="grid">' +
        '<button class="tile add" data-acc="idea"><span>+</span>' + esc(t('idea')) + '</button>' + drafts.map(draftTile).join('') + '</div>';
      main.innerHTML = h; return;
    }
    var dTile = '<button class="tile dr dtile" data-acc="drafts" aria-label="' + esc(t('drafts') + ': ' + drafts.length) + '">' + (drafts[0] ? '<div class="cv nf" style="background-image:' + grad(drafts[0].id) + '"><q>' + esc(drafts[0].text) + '</q></div>' : '<div class="cv nf dempty"><q>' + esc(t('noDrafts')) + '</q></div>') + '<span class="dlab">' + esc(t('drafts')) + ': ' + drafts.length + '</span></button>';
    h += '<div class="grid">' + (RM ? '' : dTile) + list.map(function (x) { var v = S.fmtViews(x.views);
      return '<button class="tile" ' + (RM ? 'data-acc="rmone" data-x="' + esc(x.id) + '"' : 'data-id="' + esc(x.id) + '"') + ' aria-label="' + esc((RM ? t('remove') + ': ' : '') + x.creator) + '">' + S.cover(x) + (RM ? '<span class="xb on">✕</span>' : '') + (v ? '<span class="vw">' + S.EYE + esc(v) + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      (list.length ? '' : '<div class="empty">' + esc(t('noInspo')) + '</div>');
    main.innerHTML = h;
  }

  function grad(id) { var h = S.hue(String(id || 'd')); return 'linear-gradient(160deg,hsl(' + h + ' 46% 24%),hsl(' + ((h + 40) % 360) + ' 50% 12%))'; }
  function draftTile(d) { return '<button class="tile dr" data-acc="dopen" data-x="' + esc(d.id) + '" aria-label="' + esc(d.text.slice(0, 80)) + '"><div class="cv nf" style="background-image:' + grad(d.id) + '"><q>' + esc(d.text) + '</q></div><span class="vw dt">' + esc(dayTxt(d.ts)) + '</span></button>'; }
  function dayTxt(ts) { try { return new Date(ts).toLocaleDateString(L === 'de' ? 'de-DE' : L === 'es' ? 'es-ES' : 'en-GB', {day: 'numeric', month: 'short'}); } catch (e) { return ''; } }
  /* the idea page: a big box to type in, and a big mic that writes what you say (the phone's own speech recognition; where the browser
     has none, the keyboard's mic works in the box). Save draft keeps it on this account. */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  /* 24 Nov 2026 (Emmanuel: "when I add an English text, and I translate it to German, I should be able to still see the English text and
     the German text, and any other text I translate it to ... the interface here looks very inconvenient and scattered"): the original
     stays in the box; every translation is its own card under it (language, the text, Copy, ✕) and is kept with the draft. One row of
     language buttons; "Other" opens a field for any language. Each card's text can be corrected by hand. */
  var LN = {en: 'English', de: 'Deutsch', es: 'Español'};
  function trCards() {
    return (IDEA.tr || []).map(function (r, i) {
      return '<div class="idea-card"><div class="idea-ch"><b>' + esc(LN[r.l] || r.l) + '</b><button type="button" class="pill" data-acc="icopy" data-i="' + i + '">' + esc(t('copyTx')) + '</button><button type="button" class="ib idea-x" data-acc="itrdel" data-i="' + i + '" aria-label="' + esc(t('del')) + '">✕</button></div>' +
        '<textarea class="idea-ct" data-i="' + i + '" rows="3">' + esc(r.text) + '</textarea></div>';
    }).join('');
  }
  function grow(x) { x.style.height = 'auto'; x.style.height = (x.scrollHeight + 2) + 'px'; }
  function paintTr() { var w = $('#ideaCards'); if (w) { w.innerHTML = trCards(); w.querySelectorAll('.idea-ct').forEach(grow); } }
  function ideaPage(d) {
    IDEA = d ? {id: d.id, text: d.text, tr: (d.tr || []).slice()} : {id: '', text: '', tr: []};
    var el = $('#accidea'); if (!el) { el = D.createElement('section'); el.id = 'accidea'; el.className = 'view'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); D.body.appendChild(el);
      el.addEventListener('input', function (e) { var x = e.target; if (!IDEA) return; if (x.id === 'ideaTx') IDEA.text = x.value; else if (x.classList.contains('idea-ct') && IDEA.tr[+x.dataset.i]) { IDEA.tr[+x.dataset.i].text = x.value; grow(x); } }); }
    el.innerHTML = '<div class="vtop"><button class="ib" data-acc="iclose" aria-label="' + esc(t('back')) + '">‹</button><span class="cnt">' + esc(d ? t('editDraft') : t('newIdea')) + '</span>' + (d ? '<button class="ib idea-trash" data-acc="idel" aria-label="' + esc(t('delDraft')) + '">🗑</button>' : '<span style="width:46px"></span>') + '</div>' +
      '<div class="vbody"><div class="idea-card idea-orig"><div class="idea-ch"><b>' + esc(t('orig')) + '</b><button type="button" class="pill" data-acc="icopy" data-i="-1">' + esc(t('copyTx')) + '</button></div>' +
      '<textarea id="ideaTx" class="idea-tx" placeholder="' + esc(t('ideaPh')) + '">' + esc(IDEA.text) + '</textarea></div>' +
      (SR ? '<button type="button" class="idea-mic" data-acc="imic"><span class="idea-dot" aria-hidden="true"></span><b>' + esc(t('speak')) + '</b></button>' : '<p class="note">' + esc(t('kbMic')) + '</p>') +
      '<div class="idea-tr"><span>' + esc(t('trTo')) + '</span><button type="button" class="pill" data-acc="itr" data-l="en">English</button><button type="button" class="pill" data-acc="itr" data-l="de">Deutsch</button><button type="button" class="pill" data-acc="itr" data-l="es">Español</button><button type="button" class="pill" data-acc="iother">+ ' + esc(t('other')) + '</button></div>' +
      '<div class="idea-tra" hidden><input id="ideaAny" type="text" autocomplete="off" placeholder="' + esc(t('trAny')) + '"><button type="button" class="btn pri" data-acc="itrany">' + esc(t('trGo')) + '</button></div>' +
      '<div id="ideaCards">' + trCards() + '</div></div>' +
      '<div class="vnav"><button class="btn" data-acc="iclose">' + esc(t('cancel')) + '</button><button class="btn pri" data-acc="isave">' + esc(t('saveDraft')) + '</button></div>';
    el.classList.add('on'); D.body.style.overflow = 'hidden'; el.querySelectorAll('.idea-ct').forEach(grow);
    if (!d) setTimeout(function () { var tx = $('#ideaTx'); try { if (tx) tx.focus(); } catch (e) { } }, 60);
  }
  function micStop() { if (recog) { try { recog.stop(); } catch (e) { } recog = null; } var b = D.querySelector('.idea-mic'); if (b) { b.classList.remove('on'); b.querySelector('b').textContent = t('speak'); } }
  function micToggle() {
    if (recog) return micStop();
    var tx = $('#ideaTx'); if (!SR || !tx) return; var base = tx.value ? tx.value.replace(/\s*$/, ' ') : '';
    var r = new SR(); r.lang = L === 'de' ? 'de-DE' : L === 'es' ? 'es-ES' : 'en-US'; r.continuous = true; r.interimResults = true;
    r.onresult = function (e) { var s = ''; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; tx.value = base + s; IDEA.text = tx.value; };
    r.onerror = function (e) { if (e && /not-allowed|service-not-allowed/.test(e.error)) S.toast(t('kbMic')); micStop(); };
    r.onend = function () { if (recog === r) micStop(); };
    recog = r; try { r.start(); } catch (e) { recog = null; return; }
    var b = D.querySelector('.idea-mic'); if (b) { b.classList.add('on'); b.querySelector('b').textContent = t('listening'); }
  }
  function ideaTr(to, b) {
    to = String(to || '').trim(); var src = String((IDEA && IDEA.text) || '').trim(); if (!to) return; if (!src) return S.toast(t('ideaEmpty'));
    var lab = b.textContent; b.disabled = true; b.textContent = t('trWait');
    S.ai({action: 'translate', text: src.slice(0, 6000), to: to}).then(function (j) {
      if (!IDEA) return; var key = LN[to] ? to : to.slice(0, 40), row = {l: key, text: j.text || ''};
      IDEA.tr = (IDEA.tr || []).filter(function (r) { return r.l.toLowerCase() !== key.toLowerCase(); }).concat([row]); paintTr();
      var w = $('#ideaCards'); if (w && w.lastElementChild) w.lastElementChild.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    }, function () { S.toast(t('trFail')); }).then(function () { b.disabled = false; b.textContent = lab; });
  }
  function ideaCopy(b) { var i = +b.dataset.i, v = i < 0 ? (IDEA && IDEA.text) || '' : ((IDEA.tr || [])[i] || {}).text || '';
    var ok = function () { b.textContent = t('copiedTx'); setTimeout(function () { b.textContent = t('copyTx'); }, 1500); };
    try { navigator.clipboard.writeText(v).then(ok, ok); } catch (e) { ok(); } }
  function ideaClose() { micStop(); var el = $('#accidea'); if (el) el.classList.remove('on'); D.body.style.overflow = ''; IDEA = null; }
  function ideaSave() {
    micStop(); var a = cur(); if (!a || !IDEA) return; var txt = String(IDEA.text || '').trim(); if (!txt) return S.toast(t('ideaEmpty'));
    a.drafts = a.drafts || [];
    var trs = (IDEA.tr || []).filter(function (r) { return String(r.text || '').trim(); }).map(function (r) { return {l: r.l, text: String(r.text).slice(0, 4000)}; });
    if (IDEA.id) a.drafts = a.drafts.map(function (q) { return q.id === IDEA.id ? {id: q.id, text: txt, tr: trs, ts: Date.now()} : q; }).sort(function (x, y) { return y.ts - x.ts; });
    else a.drafts.unshift({id: 'd' + Date.now().toString(36), text: txt.slice(0, 4000), tr: trs, ts: Date.now()});
    persist(); ideaClose(); DV = true; S.render(); S.toast(t('drafted'));
  }

  /* the switcher, like TikTok / YouTube: tap the name, pick an account or add one */
  /* 23 Nov 2026 (Emmanuel: "I want to be able to puzzle my profiles ... manually which profile is first, second, third ... and I don't
     want my @ name in there ... edit the name to a name so I instantly understand what the account is for"): the switcher shows the
     account's name only (the name is free text, Edit profile changes it), and "Change order" gives every row up / down arrows. */
  var ORD = false;
  function switcher() {
    S.dlg('<div class="ac-head"><h2>' + esc(t('switchT')) + '</h2>' + (A.list.length > 1 ? '<button class="pill' + (ORD ? ' acc' : '') + '" data-acc="ord">' + esc(ORD ? t('done') : t('order')) + '</button>' : '') + '</div><div class="ac-list">' + A.list.map(function (a, i) { var on = a.id === (cur() || {}).id, n = A.list.length;
      var inner = avatar(a, 46) + '<span><b>' + esc(a.name || a.handle) + '</b><small>' + esc((a.inspo || []).length + ' ' + t('inspo')) + '</small></span>';
      if (ORD) return '<div class="ac-row ord">' + inner + '<span class="ac-mv"><button class="ac-ar" data-acc="up" data-k="' + esc(a.id) + '"' + (i ? '' : ' disabled') + ' aria-label="' + esc(t('up') + ': ' + (a.name || a.handle)) + '">↑</button><button class="ac-ar" data-acc="down" data-k="' + esc(a.id) + '"' + (i < n - 1 ? '' : ' disabled') + ' aria-label="' + esc(t('down') + ': ' + (a.name || a.handle)) + '">↓</button></span></div>';
      return '<button class="ac-row' + (on ? ' on' : '') + '" data-acc="use" data-k="' + esc(a.id) + '">' + inner + (on ? '<em aria-hidden="true">✓</em>' : '') + '</button>'; }).join('') +
      (ORD ? '' : '<button class="ac-row add" data-acc="add"><span class="av ac-plus">+</span><span><b>' + esc(t('addAcc')) + '</b></span></button>') + '</div>' + (signed ? '' : '<p class="note">' + esc(t('local')) + '</p>') +
      '<div class="btns"><button class="btn" data-acc="cancel">' + esc(t('back')) + '</button></div>');
  }
  function move(id, d) { var i = A.list.findIndex(function (q) { return q.id === id; }), j = i + d; if (i < 0 || j < 0 || j >= A.list.length) return; var x = A.list[i]; A.list[i] = A.list[j]; A.list[j] = x; persist(); switcher(); }
  /* a picture from the phone, made small (192 px JPEG) so it fits the saved accounts */
  function pickPic() {
    var f = D.createElement('input'); f.type = 'file'; f.accept = 'image/*';
    f.onchange = function () { var file = f.files && f.files[0]; if (!file) return; var r = new FileReader();
      r.onload = function () { var img = new Image(); img.onload = function () { var c = D.createElement('canvas'), s0 = Math.min(img.width, img.height); c.width = c.height = 192;
        c.getContext('2d').drawImage(img, (img.width - s0) / 2, (img.height - s0) / 2, s0, s0, 0, 0, 192, 192); var u = c.toDataURL('image/jpeg', 0.82);
        $('#a_av').value = u; $('#acPrev').innerHTML = avatar({id: 'n', name: v('a_nm') || v('a_hd'), avatar: u}, 72); }; img.src = r.result; }; r.readAsDataURL(file); };
    f.click();
  }
  function accDlg(a) {
    a = a || {};
    S.dlg('<h2>' + esc(a.id ? t('editAcc') : t('addAcc')) + '</h2><button type="button" class="ac-prev" id="acPrev" data-acc="pic" aria-label="' + esc(t('pic')) + '">' + avatar(a.id ? a : null, 72) + '</button><button type="button" class="ac-picb" data-acc="pic">' + esc(t('pic')) + '</button>' +
      '<label for="a_ln">' + esc(t('plink')) + '</label><div class="ac-lrow"><input id="a_ln" inputmode="url" autocapitalize="off" placeholder="https://www.tiktok.com/@…" value="' + esc(a.link || '') + '"><button class="btn" data-acc="fetch">' + esc(t('getP')) + '</button></div>' +
      '<label for="a_nm">' + esc(t('name')) + '</label><input id="a_nm" value="' + esc(a.name || '') + '"><label for="a_hd">' + esc(t('handle')) + '</label><input id="a_hd" autocapitalize="off" value="' + esc(a.handle || '') + '">' +
      '<label for="a_bio">' + esc(t('bio')) + '</label><textarea id="a_bio" style="min-height:80px">' + esc(a.bio || '') + '</textarea><input type="hidden" id="a_av" value="' + esc(a.avatar || '') + '"><input type="hidden" id="a_st" value="' + esc(JSON.stringify({f: a.followers || 0, l: a.likes || 0})) + '">' +
      (a.id ? '<div class="btns"><button class="btn ac-del" data-acc="delacc" data-k="' + esc(a.id) + '">' + esc(t('delAcc')) + '</button></div>' : '') +
      '<div class="btns pin"><button class="btn" data-acc="cancel">' + esc(t('cancel')) + '</button><button class="btn pri" data-acc="saveacc" data-k="' + esc(a.id || '') + '">' + esc(t('save')) + '</button></div>');
  }
  function v(id) { var e = $('#' + id); return e ? e.value.trim() : ''; }
  function fetchProfile(b) {
    var link = v('a_ln'); if (!/^https:\/\/([a-z0-9-]+\.)*(tiktok\.com\/@|instagram\.com\/)/i.test(link)) return S.toast(t('noP'));
    var lab = b.textContent; b.disabled = true; b.textContent = t('getting');
    S.ai({action: 'profile', link: link}).then(function (j) { var p = j.profile || {}, set = function (id, val) { var e = $('#' + id); if (e && val) e.value = val; };
      if (!v('a_nm')) set('a_nm', p.name); set('a_hd', p.handle); set('a_bio', p.bio); set('a_av', p.avatar); $('#a_st').value = JSON.stringify({f: p.followers || 0, l: p.likes || 0});
      $('#acPrev').innerHTML = avatar({id: 'n', name: p.name || p.handle, avatar: p.avatar}, 72); S.toast(p.name || p.avatar ? t('gotP') : t('noP')); })
      .catch(function () { S.toast(t('noP')); }).then(function () { b.disabled = false; b.textContent = lab; });
  }
  function saveAcc(id) {
    var name = v('a_nm'), hd = v('a_hd').replace(/^@?/, '@').replace(/^@$/, ''); if (!name && !hd) return S.toast(t('needName'));
    var st = {}; try { st = JSON.parse(v('a_st') || '{}'); } catch (e) {}
    var a = id ? A.list.filter(function (q) { return q.id === id; })[0] : null;
    if (!a) { a = {id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), inspo: [], ts: Date.now()}; A.list.push(a); }
    a.name = name; a.handle = hd; a.bio = v('a_bio'); a.link = v('a_ln'); a.avatar = v('a_av'); a.followers = st.f || 0; a.likes = st.l || 0; A.cur = a.id;
    persist(); S.dlgClose(); S.setTab('profile');
  }

  /* pick inspo from the Swipe file for the current account */
  function picker() {
    var a = cur(); if (!a) return accDlg(); PICK = {}; (a.inspo || []).forEach(function (id) { PICK[id] = 1; });
    var el = $('#accpick'); if (!el) { el = D.createElement('section'); el.id = 'accpick'; el.className = 'view'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); D.body.appendChild(el); }
    el.innerHTML = '<div class="vtop"><button class="ib" data-acc="pclose" aria-label="' + esc(t('back')) + '">‹</button><span class="cnt">' + esc(t('pickT', {h: label(a)})) + '</span><span style="width:46px"></span></div>' +
      '<div class="vbody"><label class="search ap-ps"><input id="apq" type="search" autocomplete="off" placeholder="' + esc(t('search')) + '"></label><div class="grid" id="apgrid"></div></div>' +
      '<div class="vnav"><button class="btn pri" data-acc="psave" id="apsave"></button></div>';
    el.classList.add('on'); D.body.style.overflow = 'hidden'; paintPick();
    $('#apq').addEventListener('input', paintPick);
  }
  function paintPick() {
    var q = ($('#apq') || {}).value || ''; q = q.trim().toLowerCase();
    var list = S.sw().filter(function (x) { return !x.hide && (!q || [x.creator, x.hook, x.transcript].join(' ').toLowerCase().indexOf(q) >= 0); }).slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
    $('#apgrid').innerHTML = list.map(function (x) { var v2 = S.fmtViews(x.views), on = !!PICK[x.id];
      return '<button class="tile' + (on ? ' picked' : '') + '" data-acc="ptog" data-x="' + esc(x.id) + '" role="checkbox" aria-checked="' + on + '" aria-label="' + esc(x.creator) + '">' + S.cover(x) + '<span class="xb' + (on ? ' ok' : '') + '">' + (on ? '✓' : '') + '</span>' + (v2 ? '<span class="vw">' + S.EYE + esc(v2) + '</span>' : '') + '</button>'; }).join('');
    $('#apsave').textContent = t('saveN', {n: Object.keys(PICK).length});
  }
  function pclose() { var el = $('#accpick'); if (el) el.classList.remove('on'); D.body.style.overflow = ''; PICK = null; }

  /* "+ @handle" in the open video */
  function addBtn(x) { var a = cur(); if (!a) return '<button class="btn" data-a="toacc">＋ ' + esc(t('addAcc')) + '</button>'; var on = (a.inspo || []).indexOf(x.id) >= 0;
    return '<button class="btn" data-a="toacc" aria-pressed="' + on + '">' + (on ? '✓ ' : '＋ ') + esc(label(a)) + '</button>'; }
  function addTo(x, b) { var a = cur(); if (!a) { S.setTab('profile'); return accDlg(); } a.inspo = a.inspo || []; var i = a.inspo.indexOf(x.id), on = i < 0;
    if (on) a.inspo.unshift(x.id); else a.inspo.splice(i, 1); persist(); b.setAttribute('aria-pressed', on); b.textContent = (on ? '✓ ' : '＋ ') + label(a); S.toast(t(on ? 'added' : 'removed', {h: label(a)})); }

  D.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acc]'); if (!b) return; var k = b.dataset.acc; e.preventDefault(); e.stopPropagation();
    if (k === 'switch') { ORD = false; return switcher(); }
    if (k === 'ord') { ORD = !ORD; return switcher(); }
    if (k === 'up' || k === 'down') return move(b.dataset.k, k === 'up' ? -1 : 1);
    if (k === 'pic') return pickPic();
    if (k === 'use') { A.cur = b.dataset.k; RM = false; DV = false; persist(); S.dlgClose(); return S.setTab('profile'); }
    if (k === 'add') return accDlg();
    if (k === 'edit') return accDlg(cur());
    if (k === 'cancel') return S.dlgClose();
    if (k === 'fetch') return fetchProfile(b);
    if (k === 'saveacc') return saveAcc(b.dataset.k);
    if (k === 'delacc') { if (!confirm(t('delAccQ'))) return; A.list = A.list.filter(function (q) { return q.id !== b.dataset.k; }); A.cur = A.list[0] ? A.list[0].id : ''; persist(); S.dlgClose(); return S.setTab('profile'); }
    if (k === 'rm') { RM = !RM; return S.render(); }
    if (k === 'rmone') { var a = cur(); if (a) { a.inspo = (a.inspo || []).filter(function (id) { return id !== b.dataset.x; }); persist(); if (!a.inspo.length) RM = false; } return S.render(); }
    if (k === 'pick') return picker();
    if (k === 'drafts') { DV = true; return S.render(); }
    if (k === 'dback') { DV = false; return S.render(); }
    if (k === 'idea') return ideaPage(null);
    if (k === 'words') return window.StudioWords && StudioWords.open();
    if (k === 'vm') return window.StudioVM && StudioVM.open();
    if (k === 'itr') return ideaTr(b.dataset.l, b);
    if (k === 'itrany') return ideaTr(($('#ideaAny') || {}).value, b);
    if (k === 'icopy') return ideaCopy(b);
    if (k === 'iother') { var ow = D.querySelector('.idea-tra'); if (ow) { ow.hidden = !ow.hidden; if (!ow.hidden) { var ai0 = $('#ideaAny'); try { ai0.focus(); } catch (e) { } } } return; }
    if (k === 'itrdel') { if (IDEA) { IDEA.tr.splice(+b.dataset.i, 1); paintTr(); } return; }
    if (k === 'dopen') { var ad = cur(), dd = ad && (ad.drafts || []).filter(function (q) { return q.id === b.dataset.x; })[0]; return dd ? ideaPage(dd) : null; }
    if (k === 'imic') return micToggle();
    if (k === 'iclose') return ideaClose();
    if (k === 'isave') return ideaSave();
    if (k === 'idel') { if (!confirm(t('delDraftQ'))) return; var ax = cur(); if (ax && IDEA) { ax.drafts = (ax.drafts || []).filter(function (q) { return q.id !== IDEA.id; }); persist(); } ideaClose(); return S.render(); }
    if (k === 'pclose') return pclose();
    if (k === 'ptog') { var id = b.dataset.x; if (PICK[id]) delete PICK[id]; else PICK[id] = 1; return paintPick(); }
    if (k === 'psave') { var c = cur(); if (c) { var keep = (c.inspo || []).filter(function (id2) { return PICK[id2]; }), add = Object.keys(PICK).filter(function (id2) { return keep.indexOf(id2) < 0; }); c.inspo = add.concat(keep); persist(); } pclose(); return S.setTab('profile'); }
  }, true);

  /* 23 Nov 2026: Video link -> words (video-words.js) keeps its result as a draft on the current account */
  /* 24 Nov 2026: the Video machine's "Your style" text (the AI's memory) lives on the account, synced like the rest */
  function style(v) { var a = cur(); if (!a) return ''; if (v === undefined) return a.style || ''; a.style = String(v).slice(0, 4000); persist(); return a.style; }
  function addDraft(txt) { var a = cur(); txt = String(txt || '').trim(); if (!a || !txt) return false; a.drafts = a.drafts || []; a.drafts.unshift({id: 'd' + Date.now().toString(36), text: txt.slice(0, 4000), ts: Date.now()}); persist(); DV = true; S.render(); return true; }
  window.StudioAcc = {render: render, items: items, addBtn: addBtn, addTo: addTo, cloud: cloud, addDraft: addDraft, style: style};
  if (S.tab() === 'profile') S.render();
})();
