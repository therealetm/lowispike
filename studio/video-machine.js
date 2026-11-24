/* LOWiSPIKE Studio · Video machine, phase 1: text tweeters (24 Nov 2026, Emmanuel: "I want my own editing app inside of this, but like
   almost automated ... upload that 60-second video and it will automatically be cut into different length ... 5 seconds ... 8 ... 13
   ... 21 ... I should be able to see all the chopped up versions, just like a TikTok profile ... the text on screen was already on
   there ... so the text doesn't cover the profile picture or the like button ... click on the video and move it with my finger ...
   these magnets ... clicks into the center ... a text on screen bio, I can just talk in there, just ramble ... the AI is able to take
   that text as their memory ... one is in I form, one is in U form ... one is teaching, one is relatable ... funny ... save all the
   clips into my gallery ... my daily task simply becomes clicking a button ... like GTA ... the CDs ... swipe through them").
   - Your style: the creator's own words (typed or spoken), kept per Studio account (StudioAcc.style), the AI's memory.
   - B-rolls: videos from the phone, kept ON THIS PHONE only (IndexedDB 'lowi-studio' / 'broll'), on a swipe shelf like CDs.
   - Cut & write: the picked B-roll is cut into 8 / 13 / 5 / 21 s pieces (plan()), each with its own style (I, you, general,
     teaching, relatable, funny); studio-ai "captions" writes one text per piece from the style + the picked playlist's videos.
   - Clips: a TikTok-profile grid. A clip opens the editor: the piece loops with its text; drag the text (it snaps to the centre
     lines and stays inside the safe zone that TikTok's buttons, name and caption never cover); edit the words, size and look.
   - Save: the piece is drawn with its text into a 1080x1920 video on the phone (canvas + MediaRecorder, sound kept where the
     browser allows), then "Save to phone" opens the share sheet (iPhone: Save Video). Nothing is uploaded.
   Phase 2 (spoken tweeters: camera, teleprompter) and phase 3 (3 for today per playlist) follow. */
(function (W, D) {
  'use strict';
  var S = W.STUDIO; if (!S || W.StudioVM) return;
  var I = {en: 0, de: 1, es: 2}[S.L] || 0, esc = S.esc;
  var T = {
    btn: ['🎬 Video machine', '🎬 Videomaschine', '🎬 Máquina de vídeos'], title: ['Video machine', 'Videomaschine', 'Máquina de vídeos'],
    style: ['Your style', 'Dein Stil', 'Tu estilo'], styleEmpty: ['Tell the AI who you are, what you post about and for whom. Type or just talk.', 'Erzähl der KI, wer du bist, worüber du postest und für wen. Tippen oder einfach reden.', 'Cuéntale a la IA quién eres, de qué publicas y para quién. Escribe o habla.'],
    edit: ['Edit', 'Bearbeiten', 'Editar'], save: ['Save', 'Speichern', 'Guardar'], speak: ['Talk', 'Sprechen', 'Hablar'], stop: ['Stop', 'Stopp', 'Parar'],
    brolls: ['Your B-rolls', 'Deine B-Rolls', 'Tus B-rolls'], add: ['Add B-roll', 'B-Roll hinzufügen', 'Añadir B-roll'], onPhone: ['Kept on this phone only.', 'Nur auf diesem Handy gespeichert.', 'Solo se guarda en este móvil.'],
    learn: ['Learn the style from', 'Stil lernen von', 'Aprender el estilo de'], none: ['No playlist', 'Keine Playlist', 'Sin lista'], lang: ['Text language', 'Sprache der Texte', 'Idioma de los textos'],
    go: ['✂️ Cut & write', '✂️ Schneiden & texten', '✂️ Cortar y escribir'], pick: ['Pick a B-roll first.', 'Wähl zuerst eine B-Roll.', 'Elige primero un B-roll.'],
    writing: ['Cutting and writing…', 'Schneide und schreibe…', 'Cortando y escribiendo…'], aiFail: ['The AI could not write right now. You can type the texts yourself.', 'Die KI konnte gerade nicht schreiben. Du kannst die Texte selbst eintippen.', 'La IA no pudo escribir ahora. Puedes escribir los textos tú.'],
    clips: ['Your clips', 'Deine Clips', 'Tus clips'], again: ['↻ New texts', '↻ Neue Texte', '↻ Textos nuevos'], saveAll: ['📲 Save all', '📲 Alle speichern', '📲 Guardar todos'],
    make: ['🎞 Make video', '🎞 Video machen', '🎞 Hacer vídeo'], making: ['Making the video… {p}%', 'Video wird gemacht… {p} %', 'Haciendo el vídeo… {p}%'], toPhone: ['📲 Save to phone', '📲 Aufs Handy speichern', '📲 Guardar en el móvil'],
    ready: ['Ready', 'Fertig', 'Listo'], size: ['Size', 'Größe', 'Tamaño'], plain: ['Plain', 'Schlicht', 'Simple'], box: ['Box', 'Box', 'Caja'],
    safe: ['Safe zone: TikTok’s buttons, name and caption never cover what is inside.', 'Sicherer Bereich: TikToks Knöpfe, Name und Beschreibung verdecken nichts darin.', 'Zona segura: los botones, nombre y descripción de TikTok no tapan lo de dentro.'],
    noRec: ['This browser cannot make videos. Open Studio in Safari or Chrome.', 'Dieser Browser kann keine Videos machen. Öffne Studio in Safari oder Chrome.', 'Este navegador no puede hacer vídeos. Abre Studio en Safari o Chrome.'],
    del: ['Delete this B-roll from the phone?', 'Diese B-Roll vom Handy löschen?', '¿Borrar este B-roll del móvil?'], back: ['Back', 'Zurück', 'Atrás'], all: ['All clips', 'Alle Clips', 'Todos los clips'],
    textPh: ['Text on screen', 'Text im Bild', 'Texto en pantalla'],
    ST: {I: ['I', 'Ich', 'Yo'], you: ['You', 'Du', 'Tú'], general: ['General', 'Allgemein', 'General'], teaching: ['Teaching', 'Lehrreich', 'Enseña'], relatable: ['Relatable', 'Nachfühlbar', 'Identificable'], funny: ['Funny', 'Lustig', 'Gracioso']}
  };
  var t = function (k, p) { var s = T[k][I]; return p != null ? s.replace('{p}', p) : s; };
  var STYLES = ['I', 'you', 'general', 'teaching', 'relatable', 'funny'];
  /* ---------- pure: cut plan (Fibonacci lengths the feed likes) ---------- */
  var LENS = [8, 13, 5, 21];
  function plan(dur) {
    var out = [], at = 0, k = 0, guard = 0; dur = Math.max(0, +dur || 0);
    while (dur - at >= 5 && guard++ < 40) {
      var left = dur - at, len = 0;
      for (var j = 0; j < LENS.length; j++) { var c = LENS[(k + j) % LENS.length]; if (c <= left) { len = c; k = (k + j + 1) % LENS.length; break; } }
      if (!len) break;
      out.push({start: Math.round(at * 100) / 100, end: Math.round((at + len) * 100) / 100, sec: len, style: STYLES[out.length % STYLES.length]});
      at += len;
    }
    if (!out.length && dur >= 2) out.push({start: 0, end: dur, sec: Math.round(dur), style: 'general'});
    return out;
  }
  /* the safe zone, as shares of the 9:16 frame (TikTok / Reels: top tabs, right buttons, bottom name + caption) */
  var SAFE = {l: 0.08, r: 0.84, t: 0.14, b: 0.68};
  function snap(v, to, d) { return Math.abs(v - to) < d ? to : v; }
  var core = {plan: plan, SAFE: SAFE, snap: snap, LENS: LENS, STYLES: STYLES};
  W.StudioVMCore = core;

  /* ---------- the phone's own store for B-rolls ---------- */
  function db() { return new Promise(function (res, rej) { var r = W.indexedDB.open('lowi-studio', 1); r.onupgradeneeded = function () { r.result.createObjectStore('broll', {keyPath: 'id'}); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var x = d.transaction('broll', mode), st = x.objectStore('broll'), out = fn(st); x.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); }; x.onerror = function () { rej(x.error); }; }); }); }
  var bAll = function () { return tx('readonly', function (s) { return s.getAll(); }); };
  var bPut = function (o) { return tx('readwrite', function (s) { s.put(o); }); };
  var bDel = function (id) { return tx('readwrite', function (s) { s.delete(id); }); };

  /* ---------- state ---------- */
  var SKEY = 'lowi.vm.v1', st = {sel: '', pl: '', lang: S.L, sess: null}, rolls = [], view = 'home', cur = -1, el = null, urls = {}, made = {}, busy = false, styleOpen = false, recog = null;
  try { var o = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (o && typeof o === 'object') st = Object.assign(st, o); } catch (e) { }
  function keep() { try { localStorage.setItem(SKEY, JSON.stringify({sel: st.sel, pl: st.pl, lang: st.lang, sess: st.sess})); } catch (e) { } }
  var url = function (r) { if (!r) return ''; if (!urls[r.id]) urls[r.id] = URL.createObjectURL(r.blob); return urls[r.id]; };
  var roll = function (id) { return rolls.filter(function (r) { return r.id === id; })[0] || null; };
  var styleText = function () { return W.StudioAcc && StudioAcc.style ? StudioAcc.style() : ''; };
  var fmt = function (s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function page() {
    if (el) return el;
    el = D.createElement('section'); el.id = 'vmach'; el.className = 'view vm'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.addEventListener('click', onClick); D.body.appendChild(el); return el;
  }
  function top(title, backTo) { return '<div class="vtop"><button class="ib" data-vm="' + (backTo || 'close') + '" aria-label="' + esc(t('back')) + '">‹</button><span class="cnt">' + esc(title) + '</span><span style="width:46px"></span></div>'; }
  function paint() {
    var p = page();
    if (view === 'home') {
      var s = styleText(), pls = S.lists ? S.lists() : [];
      p.innerHTML = top(t('title')) + '<div class="vbody">' +
        '<div class="vm-card"><div class="vm-ch"><b>' + esc(t('style')) + '</b>' + (styleOpen ? '' : '<button class="pill" data-vm="style">' + esc(t('edit')) + '</button>') + '</div>' +
        (styleOpen ? '<textarea id="vmStyle" class="vm-style" placeholder="' + esc(t('styleEmpty')) + '">' + esc(s) + '</textarea><div class="vm-row">' + (W.SpeechRecognition || W.webkitSpeechRecognition ? '<button class="btn" data-vm="mic">🎙 ' + esc(recog ? t('stop') : t('speak')) + '</button>' : '') + '<button class="btn pri" data-vm="styleSave">' + esc(t('save')) + '</button></div>'
          : '<p class="vm-styletx' + (s ? '' : ' empty') + '">' + esc(s ? s.slice(0, 220) + (s.length > 220 ? '…' : '') : t('styleEmpty')) + '</p>') + '</div>' +
        '<div class="vm-ch vm-h"><b>' + esc(t('brolls')) + '</b><small>' + esc(t('onPhone')) + '</small></div>' +
        '<div class="vm-shelf" id="vmShelf"><label class="vm-cd vm-add"><input type="file" accept="video/*" multiple hidden id="vmFile"><span>＋</span><b>' + esc(t('add')) + '</b></label>' +
        rolls.map(function (r) { return '<button class="vm-cd' + (r.id === st.sel ? ' on' : '') + '" data-vm="sel" data-id="' + esc(r.id) + '">' + (r.thumb ? '<img alt="" src="' + esc(r.thumb) + '">' : '') + '<i>' + fmt(r.dur) + '</i><em data-vm="rm" data-id="' + esc(r.id) + '" aria-label="✕">✕</em></button>'; }).join('') + '</div>' +
        '<div class="vm-ch vm-h"><b>' + esc(t('learn')) + '</b></div><div class="vm-chips">' + [{id: '', name: t('none')}].concat(pls).map(function (q) { return '<button class="pill' + (st.pl === q.id ? ' acc' : '') + '" data-vm="pl" data-id="' + esc(q.id) + '">' + esc(q.name) + '</button>'; }).join('') + '</div>' +
        '<div class="vm-ch vm-h"><b>' + esc(t('lang')) + '</b></div><div class="vm-chips">' + [['en', 'English'], ['de', 'Deutsch'], ['es', 'Español']].map(function (l) { return '<button class="pill' + (st.lang === l[0] ? ' acc' : '') + '" data-vm="lang" data-l="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div>' +
        (st.sess && roll(st.sess.id) ? '<button class="btn vm-wide" data-vm="clips">▦ ' + esc(t('clips')) + ' (' + st.sess.clips.length + ')</button>' : '') + '</div>' +
        '<div class="vnav"><button class="btn pri vm-wide" data-vm="go"' + (busy ? ' disabled' : '') + '>' + esc(busy ? t('writing') : t('go')) + '</button></div>';
      var f = D.getElementById('vmFile'); if (f) f.onchange = function () { addFiles(f.files); };
      var sh = D.getElementById('vmShelf'); if (sh) { sh.onscroll = cdFocus; setTimeout(function () { var on = sh.querySelector('.on'); if (on) on.scrollIntoView({inline: 'center', block: 'nearest'}); cdFocus(); }, 30); }
    } else if (view === 'clips') {
      var ss = st.sess;
      p.innerHTML = top(t('clips'), 'home') + '<div class="vbody"><div class="vm-grid">' + ss.clips.map(function (c, i) {
        return '<button class="vm-tile" data-vm="open" data-i="' + i + '"><span class="vm-fr" data-fr="' + i + '"></span><span class="vm-tt" style="top:' + (c.y * 100) + '%;left:' + (c.x * 100) + '%;--fs:' + c.size + '">' + esc(c.text).replace(/\n/g, '<br>') + '</span><i>' + fmt(c.sec) + '</i><em>' + esc(T.ST[c.style] ? T.ST[c.style][I] : c.style) + '</em>' + (made[i] ? '<b class="vm-ok">✓</b>' : '') + '</button>';
      }).join('') + '</div></div><div class="vnav"><button class="btn" data-vm="again"' + (busy ? ' disabled' : '') + '>' + esc(busy ? t('writing') : t('again')) + '</button><button class="btn pri" data-vm="saveAll">' + esc(t('saveAll')) + '</button></div>';
      frames();
    } else if (view === 'edit') {
      var c = st.sess.clips[cur];
      p.innerHTML = top((cur + 1) + ' / ' + st.sess.clips.length, 'clips') + '<div class="vbody vm-eb"><div class="vm-stage" id="vmStage"><video id="vmV" playsinline muted loop autoplay src="' + esc(url(roll(st.sess.id))) + '"></video>' +
        '<div class="vm-safe" aria-hidden="true"></div><i class="vm-gx" aria-hidden="true"></i><i class="vm-gy" aria-hidden="true"></i>' +
        '<div class="vm-text ' + (c.look === 'box' ? 'box' : '') + '" id="vmT" style="left:' + (c.x * 100) + '%;top:' + (c.y * 100) + '%;--fs:' + c.size + '">' + lines(c.text) + '</div></div>' +
        '<p class="note vm-safen">' + esc(t('safe')) + '</p>' +
        '<textarea id="vmTx" class="vm-tx" placeholder="' + esc(t('textPh')) + '">' + esc(c.text) + '</textarea>' +
        '<div class="vm-row"><span class="vm-l">' + esc(t('size')) + '</span><input type="range" id="vmSz" min="16" max="40" step="1" value="' + c.size + '"><button class="pill' + (c.look !== 'box' ? ' acc' : '') + '" data-vm="look" data-l="plain">' + esc(t('plain')) + '</button><button class="pill' + (c.look === 'box' ? ' acc' : '') + '" data-vm="look" data-l="box">' + esc(t('box')) + '</button></div>' +
        '<div id="vmOut"></div></div>' +
        '<div class="vnav"><button class="btn" data-vm="prev">‹</button><button class="btn pri vm-wide" data-vm="make">' + esc(t('make')) + '</button><button class="btn" data-vm="next">›</button></div>';
      wireEditor();
    }
  }
  function lines(s) { return esc(s || '').replace(/\n/g, '<br>'); }
  function cdFocus() { var sh = D.getElementById('vmShelf'); if (!sh) return; var mid = sh.getBoundingClientRect().left + sh.clientWidth / 2; sh.querySelectorAll('.vm-cd').forEach(function (c) { var r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); c.style.setProperty('--k', Math.max(0, 1 - d / (sh.clientWidth * 0.6)).toFixed(3)); }); }

  /* ---------- B-rolls ---------- */
  function meta(file) {
    return new Promise(function (res) {
      var v = D.createElement('video'), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = u;
      var done = function (thumb) { res({dur: v.duration || 0, thumb: thumb || ''}); URL.revokeObjectURL(u); };
      v.onloadedmetadata = function () { v.currentTime = Math.min(1, (v.duration || 1) / 3); };
      v.onseeked = function () { try { var c = D.createElement('canvas'), k = 240 / Math.max(v.videoWidth, v.videoHeight); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', 0.7)); } catch (e) { done(''); } };
      v.onerror = function () { done(''); }; setTimeout(function () { done(''); }, 8000);
    });
  }
  function addFiles(list) {
    var files = Array.prototype.slice.call(list || []); if (!files.length) return;
    files.reduce(function (p, f) { return p.then(function () { return meta(f).then(function (m) { var o = {id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: f.name, blob: f, dur: m.dur, thumb: m.thumb, ts: Date.now()}; rolls.unshift(o); st.sel = o.id; return bPut(o); }); }); }, Promise.resolve())
      .then(function () { keep(); paint(); }, function () { S.toast('✕'); paint(); });
  }

  /* ---------- AI ---------- */
  function examples() {
    if (!st.pl || !S.lists) return [];
    var q = S.lists().filter(function (z) { return z.id === st.pl; })[0]; if (!q) return [];
    var ids = {}; (q.items || []).forEach(function (i) { ids[i] = 1; });
    return (S.sw() || []).filter(function (x) { return ids[x.id]; }).slice(0, 14).map(function (x) { return {hook: x.hook || '', text: (x.transcript || (x.strategy || []).join(' ') || '').slice(0, 260)}; });
  }
  function write(clips) {
    busy = true; paint();
    return S.ai({action: 'captions', bio: styleText(), examples: examples(), clips: clips.map(function (c) { return {sec: c.sec, style: c.style}; }), lang: st.lang})
      .then(function (j) { (j.texts || []).forEach(function (x, i) { if (clips[i] && x) clips[i].text = x; }); }, function () { S.toast(t('aiFail')); })
      .then(function () { busy = false; keep(); });
  }
  function go() {
    var r = roll(st.sel); if (!r) return S.toast(t('pick'));
    var clips = plan(r.dur).map(function (c) { return Object.assign(c, {text: '', x: 0.5, y: 0.42, size: 24, look: 'plain'}); });
    st.sess = {id: r.id, clips: clips}; made = {}; keep();
    write(clips).then(function () { view = 'clips'; paint(); });
  }

  /* ---------- grid frames ---------- */
  function frames() {
    var r = roll(st.sess.id); if (!r) return; var v = D.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url(r);
    var cs = st.sess.clips, i = 0;
    var next = function () { if (i >= cs.length || view !== 'clips') return; v.currentTime = Math.min(cs[i].start + 0.2, (r.dur || 1) - 0.05); };
    v.onseeked = function () { var box = el && el.querySelector('[data-fr="' + i + '"]'); try { if (box) { var c = D.createElement('canvas'); c.width = 270; c.height = 480; cover(c.getContext('2d'), v, 270, 480); box.appendChild(c); } } catch (e) { } i++; next(); };
    v.onloadedmetadata = next;
  }
  function cover(ctx, v, w, h) { var vw = v.videoWidth || w, vh = v.videoHeight || h, k = Math.max(w / vw, h / vh), dw = vw * k, dh = vh * k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh); }

  /* ---------- editor: loop, drag with magnets, safe zone ---------- */
  function wireEditor() {
    var c = st.sess.clips[cur], v = D.getElementById('vmV'), tEl = D.getElementById('vmT'), stage = D.getElementById('vmStage');
    v.addEventListener('loadedmetadata', function () { v.currentTime = c.start; v.play().catch(function () { }); });
    v.addEventListener('timeupdate', function () { if (v.currentTime >= c.end || v.currentTime < c.start - 0.3) v.currentTime = c.start; });
    D.getElementById('vmTx').addEventListener('input', function (e) { c.text = e.target.value; tEl.innerHTML = lines(c.text); clampText(); keep(); delete made[cur]; });
    D.getElementById('vmSz').addEventListener('input', function (e) { c.size = +e.target.value; tEl.style.setProperty('--fs', c.size); clampText(); keep(); delete made[cur]; });
    var drag = null;
    tEl.addEventListener('pointerdown', function (e) { e.preventDefault(); tEl.setPointerCapture(e.pointerId); var r = stage.getBoundingClientRect(); drag = {ox: e.clientX - c.x * r.width, oy: e.clientY - c.y * r.height}; stage.classList.add('drag'); });
    tEl.addEventListener('pointermove', function (e) {
      if (!drag) return; var r = stage.getBoundingClientRect(), x = (e.clientX - drag.ox) / r.width, y = (e.clientY - drag.oy) / r.height;
      var sx = snap(x, 0.5, 0.035), sy = snap(y, 0.5, 0.03); stage.classList.toggle('gx', sx === 0.5); stage.classList.toggle('gy', sy === 0.5);
      if ((sx === 0.5 && x !== c.x && c.x !== 0.5) || (sy === 0.5 && y !== c.y && c.y !== 0.5)) { try { if (navigator.vibrate) navigator.vibrate(6); } catch (x2) { } }
      c.x = sx; c.y = sy; place(); clampText();
    });
    var end = function () { if (!drag) return; drag = null; stage.classList.remove('drag', 'gx', 'gy'); keep(); delete made[cur]; };
    tEl.addEventListener('pointerup', end); tEl.addEventListener('pointercancel', end);
    function place() { tEl.style.left = (c.x * 100) + '%'; tEl.style.top = (c.y * 100) + '%'; }
    function clampText() {
      var r = stage.getBoundingClientRect(), b = tEl.getBoundingClientRect(), hw = b.width / 2 / r.width, hh = b.height / 2 / r.height;
      var x = Math.min(SAFE.r - hw, Math.max(SAFE.l + hw, c.x)), y = Math.min(SAFE.b - hh, Math.max(SAFE.t + hh, c.y));
      if (hw * 2 > SAFE.r - SAFE.l) x = (SAFE.l + SAFE.r) / 2; c.x = Math.round(x * 1000) / 1000; c.y = Math.round(y * 1000) / 1000; place();
    }
    setTimeout(clampText, 50);
  }

  /* ---------- making the video on the phone ---------- */
  function wrap(ctx, text, max) {
    var out = []; String(text || '').split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = ''; if (!words.length) { out.push(''); return; }
      words.forEach(function (w) { var test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > max && line) { out.push(line); line = w; } else line = test; }); out.push(line);
    }); return out;
  }
  function drawText(ctx, c, w, h) {
    var fs = c.size * w / 390 * 1.0, lh = fs * 1.25; ctx.font = '700 ' + fs + 'px -apple-system, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var ls = wrap(ctx, c.text, w * (SAFE.r - SAFE.l) * 0.96), cx = c.x * w, y0 = c.y * h - (ls.length - 1) * lh / 2;
    ls.forEach(function (l, i) {
      var y = y0 + i * lh;
      if (c.look === 'box') { var tw = ctx.measureText(l).width, px = fs * 0.35; if (l) { ctx.fillStyle = '#fff'; round(ctx, cx - tw / 2 - px, y - lh / 2, tw + px * 2, lh, fs * 0.25); ctx.fill(); } ctx.fillStyle = '#000'; ctx.fillText(l, cx, y); }
      else { ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.12; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = fs * 0.3; ctx.strokeText(l, cx, y); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillText(l, cx, y); }
    });
  }
  function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function mime() { var M = W.MediaRecorder; if (!M) return ''; return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].filter(function (m) { try { return M.isTypeSupported(m); } catch (e) { return false; } })[0] || ''; }
  function render(c, onP) {
    return new Promise(function (res, rej) {
      var mt = mime(), r = roll(st.sess.id); if (!mt || !r) return rej(new Error('norec'));
      var W0 = 1080, H0 = 1920, cv = D.createElement('canvas'); cv.width = W0; cv.height = H0; var ctx = cv.getContext('2d');
      var v = D.createElement('video'); v.playsInline = true; v.preload = 'auto'; v.src = url(r); v.muted = false;
      var stream = cv.captureStream(30), ac = null;
      try { ac = new (W.AudioContext || W.webkitAudioContext)(); var src = ac.createMediaElementSource(v), dst = ac.createMediaStreamDestination(); src.connect(dst); dst.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); }); } catch (e) { v.muted = true; }
      var rec = new MediaRecorder(stream, {mimeType: mt, videoBitsPerSecond: 8e6}), parts = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () { try { if (ac) ac.close(); } catch (e) { } res(new Blob(parts, {type: mt.split(';')[0]})); };
      var draw = function () { cover(ctx, v, W0, H0); drawText(ctx, c, W0, H0); if (onP) onP(Math.min(99, Math.round((v.currentTime - c.start) / (c.end - c.start) * 100))); if (v.currentTime >= c.end || v.ended) { v.pause(); if (rec.state !== 'inactive') rec.stop(); return; } requestAnimationFrame(draw); };
      v.onloadedmetadata = function () { v.currentTime = c.start; };
      v.onseeked = function () { if (rec.state !== 'inactive') return; v.onseeked = null; cover(ctx, v, W0, H0); drawText(ctx, c, W0, H0); rec.start(250); v.play().then(function () { requestAnimationFrame(draw); }, rej); };
      v.onerror = function () { rej(new Error('video')); };
    });
  }
  function fileOf(blob, i) { var ext = /mp4/.test(blob.type) ? 'mp4' : 'webm'; return new File([blob], 'lowispike-clip-' + (i + 1) + '.' + ext, {type: blob.type}); }
  function share(files) {
    if (navigator.canShare && navigator.canShare({files: files})) return navigator.share({files: files}).catch(function () { });
    files.forEach(function (f) { var a = D.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; D.body.appendChild(a); a.click(); a.remove(); });
    return Promise.resolve();
  }
  function make(idxs, out) {
    if (!mime()) { S.toast(t('noRec')); return; }
    busy = true; var files = [], n = 0;
    return idxs.reduce(function (p, i) { return p.then(function () { return render(st.sess.clips[i], function (pc) { if (out) out.textContent = t('making', Math.round((n * 100 + pc) / idxs.length)); }).then(function (b) { made[i] = b; files.push(fileOf(b, i)); n++; }); }); }, Promise.resolve())
      .then(function () { busy = false; return files; }, function (e) { busy = false; S.toast(t('noRec')); throw e; });
  }
  function readyBtn(box, files) { box.innerHTML = '<button class="btn pri vm-wide" data-vm="share">' + esc(t('toPhone')) + (files.length > 1 ? ' (' + files.length + ')' : '') + '</button>'; box._files = files; }

  function onClick(e) {
    var b = e.target.closest('[data-vm]'); if (!b) return; var k = b.dataset.vm;
    if (k === 'close') return close();
    if (k === 'home') { view = 'home'; return paint(); }
    if (k === 'clips') { view = 'clips'; return paint(); }
    if (k === 'style') { styleOpen = true; paint(); var ta = D.getElementById('vmStyle'); if (ta) ta.focus(); return; }
    if (k === 'styleSave') { micStop(); if (W.StudioAcc && StudioAcc.style) StudioAcc.style((D.getElementById('vmStyle') || {}).value || ''); styleOpen = false; S.toast('✓'); return paint(); }
    if (k === 'mic') return mic();
    if (k === 'rm') { e.stopPropagation(); if (!confirm(t('del'))) return; var id = b.dataset.id; rolls = rolls.filter(function (r) { return r.id !== id; }); if (st.sel === id) st.sel = ''; if (st.sess && st.sess.id === id) st.sess = null; keep(); bDel(id).then(paint, paint); return; }
    if (k === 'sel') { st.sel = b.dataset.id; keep(); return paint(); }
    if (k === 'pl') { st.pl = b.dataset.id; keep(); return paint(); }
    if (k === 'lang') { st.lang = b.dataset.l; keep(); return paint(); }
    if (k === 'go') return go();
    if (k === 'again') return write(st.sess.clips).then(function () { made = {}; paint(); });
    if (k === 'open') { cur = +b.dataset.i; view = 'edit'; return paint(); }
    if (k === 'prev' || k === 'next') { var n = st.sess.clips.length; cur = (cur + (k === 'next' ? 1 : -1) + n) % n; return paint(); }
    if (k === 'look') { st.sess.clips[cur].look = b.dataset.l; keep(); delete made[cur]; return paint(); }
    if (k === 'make') { var box = D.getElementById('vmOut'); if (made[cur]) return readyBtn(box, [fileOf(made[cur], cur)]); b.disabled = true; var lab = b.textContent; make([cur], b).then(function (f) { b.disabled = false; b.textContent = lab; readyBtn(box, f); }, function () { b.disabled = false; b.textContent = lab; }); return; }
    if (k === 'saveAll') { var all = st.sess.clips.map(function (_c, i) { return i; }), lab2 = b.textContent; b.disabled = true; make(all.filter(function (i) { return !made[i]; }), b).then(function () { b.disabled = false; b.textContent = lab2; var nav = b.parentNode; readyBtn(nav, all.map(function (i) { return fileOf(made[i], i); })); }, function () { b.disabled = false; b.textContent = lab2; }); return; }
    if (k === 'share') { var holder = b.parentNode; return share(holder._files || []); }
  }
  function mic() {
    if (recog) return micStop(); var SR = W.SpeechRecognition || W.webkitSpeechRecognition, ta = D.getElementById('vmStyle'); if (!SR || !ta) return;
    var base = ta.value ? ta.value.replace(/\s*$/, ' ') : '', r = new SR(); r.lang = st.lang === 'de' ? 'de-DE' : st.lang === 'es' ? 'es-ES' : 'en-US'; r.continuous = true; r.interimResults = true;
    r.onresult = function (e) { var s = ''; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; ta.value = base + s; };
    r.onend = function () { if (recog === r) { recog = null; var b = el && el.querySelector('[data-vm=mic]'); if (b) b.textContent = '🎙 ' + t('speak'); } };
    recog = r; try { r.start(); } catch (e) { recog = null; return; } var mb = el.querySelector('[data-vm=mic]'); if (mb) mb.textContent = '■ ' + t('stop');
  }
  function micStop() { if (recog) { try { recog.stop(); } catch (e) { } recog = null; } }
  function open() { page(); view = 'home'; bAll().then(function (l) { rolls = (l || []).sort(function (a, b) { return b.ts - a.ts; }); if (!roll(st.sel) && rolls[0]) st.sel = rolls[0].id; paint(); }, function () { paint(); }); paint(); el.classList.add('on'); D.body.style.overflow = 'hidden'; }
  function close() { micStop(); if (el) el.classList.remove('on'); D.body.style.overflow = ''; view = 'home'; }
  W.StudioVM = {open: open, close: close, label: function () { return t('btn'); }, core: core, _T: T};
})(window, document);
