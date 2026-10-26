/* LOWiSPIKE Move: Mirror mode (Oct 16, 2026). Camera follow-along: you see yourself (mirrored) with a liquid-glass human outline
   drawn over your body. Put the phone where the guide says, step into the outline, hold still, 3-2-1, then move with it.
   - Pose tracking: MediaPipe Pose Landmarker lite, vendored in vendor/mediapipe-0.10.14, loaded only after "Turn on camera".
     Everything runs on this device. Nothing is recorded, saved or uploaded, nobody is recognised.
   - The camera stops on close, when the app goes to the background, when you pick "without camera" and when the routine ends.
   - Light on heat: 640x480 front camera, tracking 6 to 15 times a second (slows itself down when a frame costs more),
     drawing capped at 30 fps, devicePixelRatio capped at 2, the 3D world pauses behind it (html.mm-open).
   - Without camera: the same routine with the outline, timer, cues and voice. In bed stays camera-free.
   Logic and poses: mirror-move-core.js. Entry: the hero card at the top of the Move screen (renderScreen in index.html calls heroHTML; Oct 22 2026, it was a strip lower
   down) and the first bubble of the Move bloom on Home (move-bubble.js), so Mirror mode is two taps from Home. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement, C = W.LowiMirrorCore;
    if (!C) return;
    /* Oct 23 2026: deadlift / hip hinge lives in mirror-hinge-core.js + mirror-hinge.js (side view, rep counting, form cues) */
    const HG = () => W.LowiMirrorHinge || null;
    const isHinge = () => routine === 'hinge' && !!HG();
    /* Oct 24 2026: which deadlift (rdl / conv / sumo); mirror-hinge.js remembers the pick (only that word, never a frame); none or unknown = conventional */
    const dlv = () => { const G = HG(); return G ? G.getPick() : 'conv'; };
    const setDlv = v => { const G = HG(); if (G) G.setPick(v); };
    const MP_BASE = 'vendor/mediapipe-0.10.14/';
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'en').slice(0, 2); } catch (e) { return 'en'; } };
    const T = (en, de, es) => ({ de, es })[lang()] || en;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const rm = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const ICON = {
        cam: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="13" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M16 10.5l5-3v9l-5-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
        x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
        pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
        play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg>',
        voice: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
        chair: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="9" r="4.5" fill="currentColor"/><path d="M24 15v13M24 19l-8 6M24 19l8 6M24 28h-7v11M24 28h7v11" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M12 28h24" stroke="currentColor" stroke-width="2" opacity=".55"/></svg>',
        stand: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="8" r="4.5" fill="currentColor"/><path d="M24 14v15M24 18l-9-5M24 18l9-5M24 29l-5 12M24 29l5 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>',
        hinge: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="35" cy="11" r="4.5" fill="currentColor"/><path d="M31 14L17 21l2 9-3 11M17 21l-3 9 3 11M29 16l-1 13" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M20 30h15" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="30" r="4" fill="none" stroke="currentColor" stroke-width="2" opacity=".6"/></svg>',
        floor: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="10" r="4.5" fill="currentColor"/><path d="M24 16v14M24 20l-9 6M24 20l9 6M10 36c5-5 10-6 14-6s9 1 14 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/></svg>'
    };

    /* ---------- entry on the Move screen ---------- */
    function stripHTML() {
        return '<button type="button" class="mm-strip" data-mm="open">' + ICON.cam +
            '<span><b>' + esc(T('Mirror mode', 'Spiegel-Modus', 'Modo espejo')) + '</b><small>' + esc(T('Follow along with your camera', 'Mitmachen mit Kamera', 'Sigue con tu cámara')) + '</small></span><i aria-hidden="true">›</i></button>';
    }
    /* Oct 22 2026 (Emmanuel: "Move the mirror mode more up, because that's the most impressive part in the whole app, so that needs to
       be highlighted"): the hero card at the very top of the Move page, in the One UI dark glass (one-sheet.css --one-*, the same in
       Day and Night). A small looping preview: the guide outline moves, a second outline (you) follows it a beat later. Start opens
       the routine chooser (open()). The whole card is a tap target too; Start is the keyboard / screen reader button. */
    function heroHTML() {
        const fig = cls => '<g class="' + cls + '"><circle cx="40" cy="15" r="6.5"/><path d="M40 23v22M40 45l-8 18M40 45l8 18"/>' +
            '<path class="mm-hero-arm mm-hero-arml" d="M40 28l-15 8"/><path class="mm-hero-arm mm-hero-armr" d="M40 28l15 8"/></g>';
        return '<section class="mm-hero" data-mm="open" aria-label="' + esc(T('Mirror mode', 'Spiegel-Modus', 'Modo espejo')) + '">' +
            '<div class="mm-hero-row"><span class="mm-hero-art" aria-hidden="true"><i class="mm-hero-glow"></i><svg viewBox="0 0 80 72" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
            fig('mm-hero-guide') + fig('mm-hero-you') + '</svg><i class="mm-hero-scan"></i></span>' +
            '<span class="mm-hero-tx"><small class="mm-hero-tag">' + ICON.cam + esc(T('Camera workout', 'Kamera-Workout', 'Entreno con cámara')) + '</small>' +
            '<b>' + esc(T('Mirror mode', 'Spiegel-Modus', 'Modo espejo')) + '</b>' +
            '<span class="mm-hero-line">' + esc(T('Copy the moves on screen. Your coach talks you through every rep. Nothing is recorded.',
                'Mach die Bewegungen nach. Dein Coach sagt dir jede Wiederholung an. Nichts wird aufgenommen.',
                'Copia los movimientos. Tu coach te guía en cada repetición. No se graba nada.')) + '</span></span></div>' +
            '<button type="button" class="mm-hero-go" data-mm="open">' + ICON.play + '<span>' + esc(T('Start Mirror mode', 'Spiegel-Modus starten', 'Empezar modo espejo')) + '</span></button>' +
            (HG() ? '<button type="button" class="mm-hero-dl" data-mm="hinge">' + ICON.hinge + '<span>' + esc(T('Deadlift', 'Kreuzheben', 'Peso muerto')) + '</span><em>' + esc(T('New', 'Neu', 'Nuevo')) + '</em></button>' : '') + '</section>';
    }

    /* ---------- state ---------- */
    let ov = null, stage = null, video = null, cv = null, ctx = null, live = null, flow = null, routine = 'chair';
    /* camGen: every camera start gets a number; stopCamera() moves it on. A start that finishes after its number moved on (closed,
       "Without camera", the tracker failed, or a newer start) stops its own camera at once and paints nothing (bug hunt BH-019). */
    let camGen = 0;
    let stream = null, lmk = null, lmkP = null, delegate = 'GPU', triedGPU = false, nDet = 0, running = false, raf = 0, detT = 0, briT = 0, lastDraw = 0, lastVT = -1;
    let lms = null, sm = null, costAvg = 30, interval = 66, voiceOn = true, lastMoveSpoken = -1, lastHint = '', lastCount = 0, hiddenStop = false, dpr = 1, vw = 640, vh = 480;
    const say = (s, force) => {
        if (!voiceOn || !s) return;
        /* app-voice.js: the tutorial's human voice (recorded clips); the device voice only for a sentence with no clip */
        if (W.LowiVoice) { W.LowiVoice.speak(s, { lang: lang(), queue: !force }); return; }
        if (!('speechSynthesis' in W)) return;
        try { const u = new SpeechSynthesisUtterance(s); u.lang = ({ de: 'de-DE', es: 'es-ES' })[lang()] || 'en-US'; u.rate = 1; if (force) speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
    };
    const hushVoice = () => { try { if (W.LowiVoice) W.LowiVoice.cancel(); else speechSynthesis.cancel(); } catch (e) {} };

    const FINE = () => T('The outline helps you follow along. It cannot tell if your form is safe. Stop if anything hurts.', 'Der Umriss hilft dir mitzumachen. Er kann nicht prüfen, ob deine Haltung sicher ist. Hör auf, wenn etwas weh tut.', 'La silueta te ayuda a seguir el ritmo. No puede saber si tu postura es segura. Para si algo duele.');
    /* what mirror-hinge.js needs from here */
    const hd = () => ({ T, esc, lang: lang(), ICON, say, live: t => { if (live) live.textContent = t; } });
    /* seconds this session really ran (follow + rest between sets; never align, count, lost or paused), for the Move reward (MAYA-HANDOFF 0.37) */
    let activeSec = 0, lastActive = 0;
    function newFlow(mode) {
        activeSec = 0; lastActive = 0;
        const G = HG(); if (G) G.reset();
        return isHinge() ? G.makeFlow(mode, lang(), dlv()) : new C.Flow({ routine, mode, lang: lang() });
    }
    function build() {
        if (ov) return ov;
        ov = D.createElement('div'); ov.id = 'mmOv'; ov.className = 'mm-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', T('Mirror mode', 'Spiegel-Modus', 'Modo espejo'));
        ov.innerHTML = '<div class="mm-stage" hidden><video class="mm-video" playsinline muted autoplay></video><canvas class="mm-cv" aria-hidden="true"></canvas>' +
            '<header class="mm-top"><button type="button" class="mm-ic" data-mm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + ICON.x + '</button>' +
            '<div class="mm-title"><b></b><small></small></div><button type="button" class="mm-ic" data-mm="voice" aria-pressed="true" aria-label="' + esc(T('Voice cues', 'Sprachansagen', 'Voz')) + '">' + ICON.voice + '</button></header>' +
            '<div class="mm-pill" aria-hidden="true"></div><div class="mm-count" aria-hidden="true"></div>' +
            '<div class="mm-card"><div class="mm-move"><b></b><span class="mm-left"></span></div><p class="mm-cue"></p>' +
            '<div class="mm-bar"><i></i></div><div class="mm-meter" hidden><span></span><i><em></em></i></div>' +
            '<div class="mm-row"><button type="button" class="mm-btn mm-ghostbtn" data-mm="here" hidden>' + esc(T('Start where I am', 'Hier starten', 'Empezar aquí')) + '</button>' +
            '<button type="button" class="mm-btn mm-ghostbtn" data-mm="skiprest" hidden>' + esc(T('Skip rest', 'Pause überspringen', 'Saltar descanso')) + '</button>' +
            '<button type="button" class="mm-btn mm-ghostbtn" data-mm="free">' + esc(T('Without camera', 'Ohne Kamera', 'Sin cámara')) + '</button>' +
            '<button type="button" class="mm-btn mm-pri" data-mm="pause">' + ICON.pause + '<span>' + esc(T('Pause', 'Pause', 'Pausa')) + '</span></button></div>' +
            '<p class="mm-fine">' + esc(FINE()) + '</p></div>' +
            '<div class="mm-live" role="status" aria-live="polite"></div></div>' +
            '<div class="mm-sheet"></div>';
        D.body.appendChild(ov);
        stage = ov.querySelector('.mm-stage'); video = ov.querySelector('.mm-video'); cv = ov.querySelector('.mm-cv'); ctx = cv.getContext('2d'); live = ov.querySelector('.mm-live');
        return ov;
    }
    const sheet = () => ov.querySelector('.mm-sheet');
    function showSheet(html) { const s = sheet(); s.innerHTML = '<div class="mm-panel">' + html + '</div>'; s.hidden = false; const f = s.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
    const privacy = id => id === 'hinge' ? '<p class="mm-priv">' + esc(T('Your camera picture stays on this device. Nothing is recorded, saved or sent, and nobody is recognised. From the side, the app only looks for where your head, shoulders, hips, knees and feet are, to count your reps.', 'Dein Kamerabild bleibt auf diesem Gerät. Nichts wird aufgenommen, gespeichert oder gesendet, niemand wird erkannt. Die App sucht von der Seite nur, wo Kopf, Schultern, Hüfte, Knie und Füße sind, um deine Wiederholungen zu zählen.', 'La imagen de tu cámara se queda en este dispositivo. No se graba, guarda ni envía nada, y no se reconoce a nadie. De lado, la app solo busca dónde están tu cabeza, hombros, cadera, rodillas y pies, para contar tus repeticiones.')) + '</p>' : '<p class="mm-priv">' + esc(T('Your camera picture stays on this device. Nothing is recorded, saved or sent, and nobody is recognised. The app only looks for where your head, shoulders and arms are, so the outline can sit over you.', 'Dein Kamerabild bleibt auf diesem Gerät. Nichts wird aufgenommen, gespeichert oder gesendet, niemand wird erkannt. Die App sucht nur, wo Kopf, Schultern und Arme sind, damit der Umriss über dir liegt.', 'La imagen de tu cámara se queda en este dispositivo. No se graba, guarda ni envía nada, y no se reconoce a nadie. La app solo busca dónde están tu cabeza, hombros y brazos para colocar la silueta sobre ti.')) + '</p>';

    function chooser() {
        const R = C.ROUTINES, l = lang();
        showSheet('<header class="mm-ph"><b>' + esc(T('Mirror mode', 'Spiegel-Modus', 'Modo espejo')) + '</b><button type="button" class="mm-ic" data-mm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + ICON.x + '</button></header>' +
            '<p class="mm-lead">' + esc(T('See yourself with a glowing outline over you, step into it, then move with it.', 'Du siehst dich mit einem leuchtenden Umriss über dir, stellst dich hinein und bewegst dich mit ihm.', 'Te ves con una silueta brillante encima, te colocas dentro y te mueves con ella.')) + '</p>' +
            '<div class="mm-routines">' + Object.keys(R).map(k => '<button type="button" class="mm-rt" data-mm="pick" data-r="' + k + '">' + ICON[R[k].icon] + '<span><b>' + esc(C.txt(R[k].n, l)) + '</b><small>' + esc(C.txt(R[k].sub, l)) + '</small></span></button>').join('') + hingeCard() + '</div>' +
            '<p class="mm-note">' + esc(C.txt(C.BED, l)) + '</p>');
    }
    function hingeCard() {
        const G = HG(); if (!G) return '';
        const l = lang();
        return '<button type="button" class="mm-rt mm-rt-hinge" data-mm="pick" data-r="hinge">' + ICON.hinge + '<span><b>' + esc(C.txt(G.ROUTINE.n, l)) + '</b><small>' + esc(C.txt(G.ROUTINE.sub, l)) + '</small></span><em class="mm-new">' + esc(T('New', 'Neu', 'Nuevo')) + '</em></button>';
    }
    function setup(id) {
        routine = id === 'hinge' && HG() ? 'hinge' : C.ROUTINES[id] ? id : 'chair';
        const R = isHinge() ? HG().routineFor(dlv()) : C.ROUTINES[routine], l = lang();
        const fine = ov && ov.querySelector('.mm-fine'); if (fine) fine.textContent = isHinge() ? C.txt(R.fine, l) : FINE();
        showSheet('<header class="mm-ph"><button type="button" class="mm-ic" data-mm="back" aria-label="' + esc(T('Back', 'Zurück', 'Atrás')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><b>' + esc(C.txt(R.n, l)) + '</b><button type="button" class="mm-ic" data-mm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + ICON.x + '</button></header>' +
            (isHinge() ? HG().pickHTML(dlv(), T, esc, l) + HG().placeArt(T, esc) : placeArt(routine)) +
            '<ol class="mm-steps">' + R.place.map(p => '<li>' + esc(C.txt(p, l)) + '</li>').join('') + '</ol>' + privacy(routine) +
            '<div class="mm-acts"><button type="button" class="mm-btn mm-pri" data-mm="cam">' + ICON.cam + '<span>' + esc(T('Turn on camera', 'Kamera einschalten', 'Activar cámara')) + '</span></button>' +
            '<button type="button" class="mm-btn mm-ghostbtn" data-mm="nocam">' + esc(T('Follow without camera', 'Ohne Kamera mitmachen', 'Seguir sin cámara')) + '</button></div>');
    }
    /* a small picture of where the phone goes */
    function placeArt(id) {
        const person = id === 'stand' ? '<circle cx="196" cy="26" r="9"/><path d="M196 36v30M196 44l-12 12M196 44l12 12M196 66l-8 26M196 66l8 26"/>'
            : id === 'floor' ? '<circle cx="190" cy="46" r="9"/><path d="M190 56v24M190 62l-12 12M190 62l12 12M168 92c8-8 15-10 22-10s14 2 22 10"/>'
            : '<circle cx="178" cy="32" r="9"/><path d="M178 42v26M178 50l-11 10M178 50l11 10M178 68h-14v24M178 68h4v24"/><path d="M160 68h30M188 68v24" opacity=".5"/>';
        const base = id === 'floor' ? '<rect x="46" y="72" width="26" height="20" rx="3" opacity=".5"/><rect x="52" y="48" width="13" height="24" rx="3"/>' : '<path d="M24 62h64M32 62v30M80 62v30" opacity=".5"/><rect x="52" y="38" width="13" height="24" rx="3"/>';
        const dist = id === 'stand' ? '1.5–2 m' : id === 'floor' ? '1.5 m' : '1 m';
        return '<svg class="mm-art" viewBox="0 0 240 100" role="img" aria-label="' + esc(T('Phone facing you, about ', 'Handy zu dir gerichtet, etwa ', 'Móvil hacia ti, a unos ') + dist) + '"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + base + person +
            '<path d="M72 30l60 0" stroke-dasharray="4 6" opacity=".7"/><path d="M126 25l6 5-6 5" opacity=".7"/></g><text x="102" y="22" text-anchor="middle" fill="currentColor" font-size="13">' + dist + '</text></svg>';
    }

    /* ---------- open / close ---------- */
    function open() { build(); H.classList.add('mm-open'); ov.hidden = false; stage.hidden = true; chooser(); D.addEventListener('keydown', onKey); }
    function close() {
        stopAll();
        if (ov) { ov.hidden = true; sheet().innerHTML = ''; }
        H.classList.remove('mm-open', 'mm-cam');
        D.removeEventListener('keydown', onKey);
        hushVoice();
        const s = D.querySelector('#mv-screen .mm-hero-go, .mm-strip'); if (s && s.offsetParent) try { s.focus({ preventScroll: true }); } catch (e) {}
    }
    function onKey(e) {
        if (e.key === 'Escape') return close();
        /* the deadlift pills are a radio group: arrow keys move the pick */
        const cur = e.target && e.target.closest && e.target.closest('.mh-vb'), G = HG();
        if (cur && G && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
            e.preventDefault();
            const L = G.VORDER, i = L.indexOf(cur.getAttribute('data-v')), n = L[(i + (/Right|Down/.test(e.key) ? 1 : L.length - 1)) % L.length];
            setDlv(n); setup('hinge'); const on = ov && ov.querySelector('.mh-vb.on'); if (on) try { on.focus({ preventScroll: true }); } catch (x) {}
        }
    }
    function stopCamera() {
        camGen++;
        clearTimeout(detT); clearInterval(briT); detT = 0; briT = 0;
        if (stream) { stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); stream = null; }
        if (video) { try { video.pause(); } catch (e) {} video.srcObject = null; }
        lms = null; sm = null; H.classList.remove('mm-cam');
    }
    function stopAll() { running = false; cancelAnimationFrame(raf); raf = 0; stopCamera(); flow = null; }

    /* ---------- camera + model ---------- */
    function loadModel() {
        if (lmk) return Promise.resolve(lmk);
        if (lmkP) return lmkP;
        const base = new URL(MP_BASE, D.baseURI).href;
        lmkP = import(base + 'vision_bundle.mjs').then(async mp => {
            const files = await mp.FilesetResolver.forVisionTasks(base + 'wasm');
            const make = del => mp.PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: base + 'pose_landmarker_lite.task', delegate: del },
                runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
            const first = W.__mmForceCPU || triedGPU ? 'CPU' : 'GPU';
            try { lmk = await make(first); delegate = first; } catch (e) { lmk = await make('CPU'); delegate = 'CPU'; }
            nDet = 0;
            W.__mmDelegate = delegate;
            return lmk;
        }).catch(e => { lmkP = null; throw e; });
        return lmkP;
    }
    async function startCamera(gen) {
        const md = navigator.mediaDevices;
        if (!W.isSecureContext || !md || !md.getUserMedia) { const e = new Error('unsupported'); e.name = 'Unsupported'; throw e; }
        if (typeof WebAssembly !== 'object') { const e = new Error('nowasm'); e.name = 'Unsupported'; throw e; }
        const s = await md.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } } });
        if (gen !== camGen) { s.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); const e = new Error('stale'); e.name = 'Stale'; throw e; }
        if (stream && stream !== s) stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
        stream = s;
        video.srcObject = stream; video.muted = true; video.playsInline = true;
        await video.play().catch(() => {});
        if (!video.videoWidth) await new Promise(r => { video.onloadedmetadata = r; setTimeout(r, 2500); });
        vw = video.videoWidth || 640; vh = video.videoHeight || 480;
        const tr = s.getVideoTracks()[0]; if (tr) tr.onended = () => { if (flow && flow.mode === 'camera') problem('ended'); };
    }
    async function goCamera() {
        build(); stage.hidden = false; H.classList.add('mm-cam');
        flow = newFlow('camera');
        say(isHinge() ? T('Stand side-on, head to feet in view', 'Stell dich seitlich hin, Kopf bis Füße im Bild', 'Ponte de lado, de la cabeza a los pies') : T('Get into the outline', 'Stell dich in den Umriss', 'Ponte dentro de la silueta'), true);    /* speaks inside the tap, which unlocks voice on iPhone */
        showSheet('<div class="mm-wait"><span class="mm-spin" aria-hidden="true"></span><b>' + esc(T('Starting the camera…', 'Kamera startet…', 'Iniciando la cámara…')) + '</b><small>' + esc(T('The first time loads the tracker (about 9 MB), then it is quick.', 'Beim ersten Mal lädt der Tracker (etwa 9 MB), danach geht es schnell.', 'La primera vez se carga el detector (unos 9 MB), luego es rápido.')) + '</small></div>');
        const gen = ++camGen;
        try {
            await Promise.all([startCamera(gen), loadModel()]);
        } catch (e) { if (gen !== camGen) return; stopCamera(); return problem(e && e.name); }
        if (gen !== camGen) return;                                  /* closed, "Without camera" or a newer start meanwhile */
        if (!ov || ov.hidden || !flow) { stopCamera(); return; }   /* closed while starting */
        sheet().hidden = true; sheet().innerHTML = '';
        running = true; hiddenStop = false; lastMoveSpoken = -1; lastHint = ''; lastCount = 0;
        loopDetect(); briT = setInterval(brightness, 1500);
        if (!raf) raf = requestAnimationFrame(draw);
    }
    function goFree() {
        build(); stopCamera(); stage.hidden = false; sheet().hidden = true; sheet().innerHTML = '';
        if (flow) { flow.toFree(); flow.pause(false); } else flow = newFlow('free');
        say(T('Follow the outline', 'Folge dem Umriss', 'Sigue la silueta'), true);
        running = true; lastMoveSpoken = -1; if (!raf) raf = requestAnimationFrame(draw);
    }
    function problem(name) {
        running = false; cancelAnimationFrame(raf); raf = 0; stopCamera(); stage.hidden = true;
        const msg = name === 'NotAllowedError' || name === 'SecurityError'
            ? T('Camera access is off for LOWiSPIKE. To use Mirror mode, allow the camera: on iPhone or iPad open Settings, then Safari (or the app), then Camera, and choose Allow. Then try again.', 'Der Kamerazugriff ist für LOWiSPIKE aus. Erlaube die Kamera: auf iPhone oder iPad unter Einstellungen, dann Safari (oder die App), dann Kamera, Erlauben. Dann nochmal versuchen.', 'El acceso a la cámara está desactivado. Permítelo en Ajustes, Safari (o la app), Cámara, Permitir. Luego vuelve a intentarlo.')
            : name === 'NotFoundError' || name === 'OverconstrainedError' ? T('I could not find a front camera on this device.', 'Ich finde keine Frontkamera auf diesem Gerät.', 'No encuentro una cámara frontal en este dispositivo.')
            : name === 'NotReadableError' ? T('The camera is busy in another app. Close it there and try again.', 'Die Kamera wird gerade von einer anderen App benutzt. Schließ sie dort und versuch es nochmal.', 'Otra app está usando la cámara. Ciérrala y vuelve a intentarlo.')
            : name === 'Unsupported' ? T('This browser cannot do camera tracking. Safari on iPhone or iPad works best.', 'Dieser Browser kann kein Kamera-Tracking. Safari auf iPhone oder iPad geht am besten.', 'Este navegador no puede seguir la cámara. Safari en iPhone o iPad funciona mejor.')
            : name === 'ended' ? T('The camera stopped.', 'Die Kamera wurde beendet.', 'La cámara se detuvo.')
            : T('The tracker could not load. Check your connection and try again.', 'Der Tracker konnte nicht laden. Prüf deine Verbindung und versuch es nochmal.', 'El detector no pudo cargarse. Revisa tu conexión y vuelve a intentarlo.');
        showSheet('<header class="mm-ph"><b>' + esc(T('Camera not available', 'Kamera nicht verfügbar', 'Cámara no disponible')) + '</b><button type="button" class="mm-ic" data-mm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + ICON.x + '</button></header>' +
            '<p class="mm-lead" data-problem="' + esc(name || 'load') + '">' + esc(msg) + '</p><div class="mm-acts"><button type="button" class="mm-btn mm-pri" data-mm="nocam">' + esc(T('Follow without camera', 'Ohne Kamera mitmachen', 'Seguir sin cámara')) + '</button>' +
            '<button type="button" class="mm-btn mm-ghostbtn" data-mm="cam">' + esc(T('Try again', 'Nochmal versuchen', 'Reintentar')) + '</button></div>');
        flow = null;
    }

    /* ---------- tracking loop (adaptive) ---------- */
    function loopDetect() {
        detT = 0;
        if (!running || !stream || D.hidden || !flow || flow.mode !== 'camera') return;
        const t0 = performance.now();
        if (lmk && video.readyState >= 2 && video.currentTime !== lastVT && !flow.paused) {
            lastVT = video.currentTime;
            try { const r = lmk.detectForVideo(video, t0); lms = r && r.landmarks && r.landmarks[0] ? r.landmarks[0] : null; }
            catch (e) {
                if (delegate === 'GPU') { triedGPU = true; try { lmk.close(); } catch (e2) {} lmk = null; lmkP = null; delegate = 'CPU'; loadModel().catch(() => problem('load')); }
                lms = null;
            }
            const cost = performance.now() - t0; costAvg = nDet ? costAvg * 0.8 + cost * 0.2 : cost; nDet++;
            interval = costAvg > 200 ? 400 : costAvg > 70 ? 166 : costAvg > 40 ? 100 : 66;
            /* GPU tracking slow on this device: try the CPU version once */
            if (nDet > 8 && costAvg > 150 && delegate === 'GPU' && !triedGPU) { triedGPU = true; const old = lmk; lmk = null; lmkP = null; try { old.close(); } catch (e) {} loadModel().catch(() => problem('load')); }
        }
        detT = setTimeout(loopDetect, Math.max(16, interval - (performance.now() - t0)));
    }
    const bc = D.createElement('canvas'); bc.width = 24; bc.height = 18;
    function brightness() {
        if (!flow || !video || video.readyState < 2) return;
        try {
            const b = bc.getContext('2d', { willReadFrequently: true }); b.drawImage(video, 0, 0, 24, 18);
            const d = b.getImageData(0, 0, 24, 18).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            flow.setDark(s / (d.length / 4) < 45);
        } catch (e) {}
    }

    /* ---------- drawing ---------- */
    function size() {
        const r = stage.getBoundingClientRect(), d = Math.min(2, W.devicePixelRatio || 1);
        const w = Math.round(r.width), h = Math.round(r.height);
        if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
        dpr = d; return { W: w || 390, H: h || 844 };
    }
    function draw(now) {
        raf = 0;
        if (!running || !flow || !ov || ov.hidden) return;
        raf = requestAnimationFrame(draw);
        if (now - lastDraw < 31) return;      /* 30 fps is plenty for a slow outline */
        lastDraw = now;
        if (lastActive && !flow.paused && (flow.phase === 'follow' || flow.phase === 'rest')) activeSec += Math.min(1, Math.max(0, (now - lastActive) / 1000));
        lastActive = now;
        const view = size();
        let m = null;
        if (flow.mode === 'camera') {
            if (lms) {
                const pts = lms.map(p => C.toView(p, vw, vh, view.W, view.H, true));
                if (!sm || sm.length !== pts.length) sm = pts; else sm = sm.map((q, i) => ({ x: q.x + (pts[i].x - q.x) * 0.55, y: q.y + (pts[i].y - q.y) * 0.55, v: pts[i].v }));
                m = isHinge() ? HG().measure(sm, view.W, view.H) : C.measure(sm, view.W, view.H);
            } else { sm = null; m = { seen: false }; }
        }
        const s = flow.update(now, m, view);
        if (s.kind === 'hinge' && HG()) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, view.W, view.H); HG().paint(ctx, s, view, now, { sm }); HG().ui(ov, s, flow, hd()); }
        else { paint(s, view, now); ui(s); }
        if (s.phase === 'done') finish(s);
    }
    function paint(s, view, now) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, view.W, view.H);
        const A = s.phase === 'align' || s.phase === 'hold' ? C.defaultAnchor(view.W, view.H) : s.anchor;
        const G = C.ghost(A, s.pose);
        const aligning = s.phase === 'align' || s.phase === 'hold';
        drawGhost(ctx, G, A.w, { sync: s.sync || s.phase === 'hold', dim: aligning && s.phase !== 'hold', t: now / 1000, still: rm() });
        /* proof the tracking is real: small dots on your own joints while you get in place */
        if (aligning && sm) {
            ctx.fillStyle = 'rgba(255,255,255,.85)';
            for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24]) { const p = sm[i]; if (p && p.v >= 0.5) { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.283); ctx.fill(); } }
        }
    }
    function stroke(c, pts, w, col) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
    /* liquid-glass human: soft glow, light rim, see-through blue body, bright core line, a few drifting cells. Human head, no mascot. */
    function drawGhost(c, G, w, o) {
        const a = o.dim ? 0.62 : 1, rim = o.sync ? 'rgba(150,255,226,' : 'rgba(205,236,255,', body = o.sync ? 'rgba(80,220,200,' : 'rgba(80,150,255,';
        c.save(); c.globalAlpha = a; c.lineCap = 'round'; c.lineJoin = 'round';
        const limbs = [[G.L.sh, G.L.el, G.L.wr, G.L.hand], [G.R.sh, G.R.el, G.R.wr, G.R.hand]];
        /* torso */
        const sL = G.L.sh, sR = G.R.sh, hL = G.hipL, hR = G.hipR;
        const tp = () => { c.beginPath(); c.moveTo(sL[0], sL[1]); c.quadraticCurveTo(G.shMid[0] + G.up[0] * w * 0.08, G.shMid[1] + G.up[1] * w * 0.08, sR[0], sR[1]); c.quadraticCurveTo((sR[0] + hR[0]) / 2 + G.right[0] * w * 0.04, (sR[1] + hR[1]) / 2, hR[0], hR[1]); c.quadraticCurveTo(G.hip[0], G.hip[1] + w * 0.08, hL[0], hL[1]); c.quadraticCurveTo((sL[0] + hL[0]) / 2 - G.right[0] * w * 0.04, (sL[1] + hL[1]) / 2, sL[0], sL[1]); c.closePath(); };
        tp(); c.lineWidth = w * 0.22; c.strokeStyle = 'rgba(110,180,255,.14)'; c.stroke();
        for (const L of limbs) stroke(c, L, w * 0.52, 'rgba(110,180,255,.14)');
        stroke(c, [G.neck, G.shMid], w * 0.5, 'rgba(110,180,255,.14)');
        const g = c.createLinearGradient(G.shMid[0], G.shMid[1], G.hip[0], G.hip[1]); g.addColorStop(0, body + '.36)'); g.addColorStop(1, body + '.14)');
        tp(); c.fillStyle = g; c.fill(); c.lineWidth = Math.max(1.5, w * 0.035); c.strokeStyle = rim + '.62)'; c.stroke();
        /* neck, arms */
        stroke(c, [G.neck, G.shMid], w * 0.24, body + '.34)');
        for (const L of limbs) { stroke(c, L.slice(0, 3), w * 0.34, rim + '.5)'); stroke(c, L.slice(0, 3), w * 0.27, body + '.38)'); stroke(c, L.slice(0, 3), Math.max(1.5, w * 0.06), 'rgba(240,250,255,.62)'); }
        /* joints and hands as little cells */
        const cell = (p, r, al) => { const rg = c.createRadialGradient(p[0] - r * 0.35, p[1] - r * 0.35, r * 0.1, p[0], p[1], r); rg.addColorStop(0, 'rgba(255,255,255,' + (0.75 * al) + ')'); rg.addColorStop(0.45, body + (0.42 * al) + ')'); rg.addColorStop(1, body + (0.12 * al) + ')'); c.fillStyle = rg; c.beginPath(); c.arc(p[0], p[1], r, 0, 6.283); c.fill(); c.lineWidth = Math.max(1, w * 0.025); c.strokeStyle = rim + (0.55 * al) + ')'; c.stroke(); };
        for (const L of limbs) { cell(L[0], w * 0.17, 1); cell(L[3], w * 0.1, 1); }
        /* head: human, round, glassy */
        cell(G.head, G.headR, 1);
        c.beginPath(); c.arc(G.head[0] - G.headR * 0.3, G.head[1] - G.headR * 0.35, G.headR * 0.28, 0, 6.283); c.fillStyle = 'rgba(255,255,255,.28)'; c.fill();
        /* drifting cells inside the torso (still under reduced motion) */
        for (let i = 0; i < 5; i++) {
            const k = (i + 0.5) / 5, ph = o.still ? 0 : o.t * (0.35 + i * 0.07) + i * 1.7;
            const x = G.hip[0] + (G.shMid[0] - G.hip[0]) * k + G.right[0] * w * 0.18 * Math.sin(ph + i), y = G.hip[1] + (G.shMid[1] - G.hip[1]) * k + w * 0.06 * Math.cos(ph);
            c.beginPath(); c.arc(x, y, w * (0.035 + 0.012 * (i % 3)), 0, 6.283); c.fillStyle = 'rgba(230,248,255,.35)'; c.fill();
        }
        c.restore();
    }
    let uiKey = '';
    function ui(s) {
        const R = C.ROUTINES[routine] || C.ROUTINES.chair, l = lang();
        const key = [s.phase, s.i, s.left, s.hint, s.count, s.canHere, s.paused, s.mode, Math.round(s.score * 20)].join('|');
        if (key === uiKey) return; uiKey = key;
        ov.querySelector('.mm-title b').textContent = C.txt(R.n, l);
        ov.querySelector('.mm-title small').textContent = s.mode === 'camera' ? T('Camera on, stays on this device', 'Kamera an, bleibt auf dem Gerät', 'Cámara activa, se queda en el dispositivo') : T('Without camera', 'Ohne Kamera', 'Sin cámara');
        const rest = Math.max(0, Math.ceil(s.total - s.elapsed)), mm = Math.floor(rest / 60) + ':' + String(rest % 60).padStart(2, '0');
        const aligning = s.phase === 'align' || s.phase === 'hold';
        ov.querySelector('.mm-move b').textContent = aligning ? T('Get in place', 'In Position', 'Colócate') : s.moveName;
        ov.querySelector('.mm-left').textContent = aligning ? '' : (s.phase === 'done' ? '' : s.left + ' s · ' + mm);
        ov.querySelector('.mm-cue').textContent = aligning ? C.txt(R.place[2], l) : s.cue;
        ov.querySelector('.mm-bar i').style.transform = 'scaleX(' + (s.elapsed / s.total).toFixed(3) + ')';
        const pill = ov.querySelector('.mm-pill'); pill.textContent = s.paused ? T('Paused', 'Pausiert', 'En pausa') : s.hintText; pill.className = 'mm-pill' + (s.hintText || s.paused ? ' on' : '') + (s.hint === 'sync' || s.hint === 'hold' ? ' good' : '') + (s.hint === 'lost' || s.hint === 'dark' ? ' warn' : '');
        const cnt = ov.querySelector('.mm-count'); cnt.textContent = s.phase === 'count' ? s.count : ''; cnt.classList.toggle('on', s.phase === 'count');
        const meter = ov.querySelector('.mm-meter'), showM = s.mode === 'camera' && (s.phase === 'follow' || s.phase === 'lost') && !C.MOVES[s.move].rest;
        meter.hidden = !showM; if (showM) { meter.querySelector('span').textContent = T('Match with outline', 'Nähe zum Umriss', 'Cercanía a la silueta'); meter.querySelector('em').style.transform = 'scaleX(' + s.score.toFixed(2) + ')'; }
        ov.querySelector('[data-mm="here"]').hidden = !s.canHere;
        ov.querySelector('[data-mm="free"]').hidden = s.mode !== 'camera';
        const skr = ov.querySelector('[data-mm="skiprest"]'); if (skr) skr.hidden = true;
        const pb = ov.querySelector('[data-mm="pause"]'); pb.innerHTML = (s.paused ? ICON.play : ICON.pause) + '<span>' + esc(s.paused ? T('Resume', 'Weiter', 'Seguir') : T('Pause', 'Pause', 'Pausa')) + '</span>'; pb.hidden = aligning;
        /* voice + screen reader: say what changed, not every frame */
        if (s.phase === 'count' && s.count !== lastCount) { lastCount = s.count; say(String(s.count), true); }
        if (s.phase === 'follow' && s.i !== lastMoveSpoken) { lastMoveSpoken = s.i; say(s.moveName + '. ' + s.cue, true); live.textContent = s.moveName + '. ' + s.cue; }
        if (s.hint !== lastHint) {
            const prev = lastHint; lastHint = s.hint;
            if (s.hint && s.hint !== 'sync' && s.hint !== 'rest' && s.hint !== 'hold' && s.hint !== prev) { live.textContent = s.hintText; if (s.hint !== 'follow') say(s.hintText); }
        }
    }
    /* MAYA-HANDOFF 0.37 (26 Oct 2026): Emmanuel finished a Mirror session and got "no points, no animation, no congrats", and Bewegen still said
       "Diese Woche 0/10 Min, Verlauf: Noch keine". This only fired lowi:mirror-done, which nothing listened to. Now the session is saved and paid
       through index.html's Move (MOVE.record: Verlauf, Diese Woche, XP, your companion's day) and the grand finish celebration plays
       (move-finish.js). The event stays for anything that listens. */
    let finished = null;
    function recordFinish(s, name) {
        if (finished === flow) return null; finished = flow;
        const moved = Math.round(activeSec);
        try { if (W.MOVE && W.MOVE.record) return W.MOVE.record({ fmt: s.kind === 'hinge' ? 'hinge' : 'mirror', name, moved, complete: true, reps: s.kind === 'hinge' ? s.done : undefined, voice: voiceOn }); } catch (e) {}
        return null;
    }
    function finish(s) {
        running = false; cancelAnimationFrame(raf); raf = 0; stopCamera();
        const l = lang();
        if (s.kind === 'hinge' && HG()) {
            const res = recordFinish(s, C.txt(HG().routineFor(dlv()).n, l));
            try { W.dispatchEvent(new CustomEvent('lowi:mirror-done', { detail: { routine: 'hinge', variant: s.variant, reps: s.done, clean: s.clean, sets: s.sets, camera: s.mode === 'camera', minutes: res ? res.min : 0, xp: res ? res.xp : 0 } })); } catch (e) {}
            return showSheet(HG().finishHTML(s, hd()));
        }
        const R = C.ROUTINES[routine] || C.ROUTINES.chair;
        const res = recordFinish(s, C.txt(R.n, l));
        const mins = res && res.min ? res.min : Math.max(1, Math.round(activeSec / 60));
        if (!(res && W.LowiMoveFinish && W.LowiMoveFinish.open())) say(T('Done. Nice moving.', 'Geschafft. Gut bewegt.', 'Hecho. Bien movido.'), true);
        try { W.dispatchEvent(new CustomEvent('lowi:mirror-done', { detail: { routine, minutes: mins, camera: s.mode === 'camera', xp: res ? res.xp : 0 } })); } catch (e) {}
        const xpLine = res && res.xp ? ' ' + T('+' + res.xp + ' XP.', '+' + res.xp + ' XP.', '+' + res.xp + ' XP.') : '';
        showSheet('<header class="mm-ph"><b>' + esc(T('Done, nice moving', 'Geschafft, gut bewegt', 'Hecho, bien movido')) + '</b><button type="button" class="mm-ic" data-mm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + ICON.x + '</button></header>' +
            '<p class="mm-lead">' + esc(T('About ' + mins + ' minutes of moving. Your camera is off again.', 'Etwa ' + mins + ' Minuten Bewegung. Deine Kamera ist wieder aus.', 'Unos ' + mins + ' minutos de movimiento. Tu cámara está apagada.') + xpLine) + '</p>' +
            '<div class="mm-acts"><button type="button" class="mm-btn mm-pri" data-mm="close">' + esc(T('Close', 'Schließen', 'Cerrar')) + '</button><button type="button" class="mm-btn mm-ghostbtn" data-mm="open">' + esc(T('Another one', 'Noch eine', 'Otra')) + '</button></div>');
    }

    /* ---------- lifecycle ---------- */
    D.addEventListener('visibilitychange', () => {
        if (!flow || !ov || ov.hidden) return;
        if (D.hidden) {
            flow.pause(true); if (flow.mode === 'camera' && stream) { hiddenStop = true; stopCamera(); }
            hushVoice();
        } else if (hiddenStop) {
            hiddenStop = false; running = false; cancelAnimationFrame(raf); raf = 0;
            showSheet('<header class="mm-ph"><b>' + esc(T('Camera paused', 'Kamera pausiert', 'Cámara en pausa')) + '</b><button type="button" class="mm-ic" data-mm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + ICON.x + '</button></header><p class="mm-lead">' + esc(T('The camera turned off while the app was in the background.', 'Die Kamera war aus, während die App im Hintergrund war.', 'La cámara se apagó mientras la app estaba en segundo plano.')) + '</p>' +
                '<div class="mm-acts"><button type="button" class="mm-btn mm-pri" data-mm="resumecam">' + ICON.cam + '<span>' + esc(T('Turn camera back on', 'Kamera wieder an', 'Volver a activar')) + '</span></button><button type="button" class="mm-btn mm-ghostbtn" data-mm="nocam">' + esc(T('Continue without camera', 'Ohne Kamera weiter', 'Seguir sin cámara')) + '</button></div>');
        }
    });
    W.addEventListener('pagehide', () => { if (stream) stopCamera(); });
    async function resumeCam() {
        if (!flow) return goCamera();
        showSheet('<div class="mm-wait"><span class="mm-spin" aria-hidden="true"></span><b>' + esc(T('Starting the camera…', 'Kamera startet…', 'Iniciando la cámara…')) + '</b></div>');
        const gen = ++camGen;
        try { await Promise.all([startCamera(gen), loadModel()]); } catch (e) { if (gen !== camGen) return; stopCamera(); return problem(e && e.name); }
        if (gen !== camGen) return;
        if (!ov || ov.hidden || !flow) { stopCamera(); return; }   /* closed while starting */
        sheet().hidden = true; sheet().innerHTML = ''; H.classList.add('mm-cam');
        flow.pause(false); running = true; loopDetect(); briT = setInterval(brightness, 1500); if (!raf) raf = requestAnimationFrame(draw);
    }

    D.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-mm]'); if (!b) return;
        const k = b.getAttribute('data-mm');
        if (k === 'open') { if (flow || stream) stopAll(); open(); }
        else if (k === 'close') close();
        else if (k === 'pick') setup(b.getAttribute('data-r'));
        else if (k === 'hinge') { if (flow || stream) stopAll(); open(); setup('hinge'); }
        else if (k === 'dlv') { setDlv(b.getAttribute('data-v')); setup('hinge'); const on = ov && ov.querySelector('.mh-vb.on'); if (on) try { on.focus({ preventScroll: true }); } catch (x) {} }
        else if (k === 'skiprest') { if (flow && flow.skipRest) flow.skipRest(); }
        else if (k === 'back') chooser();
        else if (k === 'cam') goCamera();
        else if (k === 'nocam') goFree();
        else if (k === 'free') goFree();
        else if (k === 'here') { if (flow) flow.startHere(); }
        else if (k === 'pause') { if (flow) { flow.pause(); uiKey = ''; if (flow.paused) hushVoice(); } }
        else if (k === 'resumecam') resumeCam();
        else if (k === 'voice') { voiceOn = !voiceOn; b.setAttribute('aria-pressed', String(voiceOn)); b.classList.toggle('off', !voiceOn); if (!voiceOn) hushVoice(); }
    });

    W.LowiMirror = { stripHTML, heroHTML, open, close, _addActive: n => { activeSec += +n || 0; }, _state: () => ({ activeSec, flow, sm, running, stream: !!stream, delegate, interval, costAvg, lms: !!lms, phase: flow && flow.phase }) };
})();
