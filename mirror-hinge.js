/* LOWiSPIKE Move: Mirror mode, deadlift (hip hinge) screen parts (Oct 23, 2026). Logic is in mirror-hinge-core.js; mirror-move.js
   owns the camera, the overlay and the lifecycle and calls in here when the routine is 'hinge'.
   - paint(): the side-view liquid-glass outline (same look as the front-view one), a bright "flat back" line along the back, a
     soft "hips back" arrow while it goes down, your own joints as dots while you get in place.
   - ui(): the card (set, reps, clean reps), the living rep bubble that pops on every rep (teal = clean, amber = a form cue),
     and Misty's little bubble with a line at each set. Speech: the rep number, the form cue, the set.
   - finishHTML(): the done sheet with sets, reps and clean reps. */
(function () {
    'use strict';
    const W = window, D = document, HC = W.LowiHingeCore;
    if (!HC) return;
    const rm = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const compName = () => { try { const c = W.LowiBirthCompanion && W.LowiBirthCompanion.get && W.LowiBirthCompanion.get(); return (c && c.name) || 'Misty'; } catch (e) { return 'Misty'; } };

    function placeArt(T, esc) {
        /* phone low on the floor, you side-on, 2.5 m away, hinging */
        return '<svg class="mm-art" viewBox="0 0 240 100" role="img" aria-label="' + esc(T('Phone low on the floor, you side-on, about 2.5 m away', 'Handy unten am Boden, du seitlich, etwa 2,5 m entfernt', 'Móvil abajo en el suelo, tú de lado, a unos 2,5 m')) + '"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M20 92h200" opacity=".35"/><rect x="40" y="64" width="13" height="24" rx="3"/><path d="M36 88h21" opacity=".5"/>' +
            '<circle cx="200" cy="40" r="8"/><path d="M193 46l-27 14M166 60l2 16l-4 16M166 60l-6 15l6 17M190 48l-2 30"/><circle cx="188" cy="80" r="5" opacity=".6"/>' +
            '<path d="M62 74l64 0" stroke-dasharray="4 6" opacity=".7"/><path d="M120 69l6 5-6 5" opacity=".7"/></g><text x="94" y="66" text-anchor="middle" fill="currentColor" font-size="13">2,5 m</text></svg>';
    }
    const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="5" r="2.2"/><path d="M15.5 7L8 11l1 5-1.5 5M8 11l-1.5 4.5L8 21M14.5 8l-.5 7"/><path d="M10 15.5h8"/></g></svg>';

    /* ---------- the outline ---------- */
    function stroke(c, pts, w, col) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
    let shown = 0;
    function paint(c, s, view, now, opt) {
        opt = opt || {};
        const A = s.anchor, still = rm();
        /* ease the shown depth so a jump (you were faster than the guide) glides instead of snapping */
        shown += (s.depth - shown) * (still ? 1 : 0.35);
        const G = HC.ghost(A, HC.pose(shown)), w = G.w;
        const aligning = s.phase === 'align' || s.phase === 'hold';
        const sync = s.phase === 'hold' || (s.a && (s.phase === 'follow') && Math.abs(s.a.tau - HC.pose(shown).tau) < 12);
        const formWarn = s.form && (s.hint === 'backr');
        const rim = sync ? 'rgba(150,255,226,' : 'rgba(205,236,255,', body = sync ? 'rgba(80,220,200,' : 'rgba(80,150,255,';
        c.save(); c.globalAlpha = aligning && s.phase !== 'hold' ? 0.62 : 1; c.lineCap = 'round'; c.lineJoin = 'round';
        const leg = [G.toe, G.ankle, G.knee, G.hip], arm = [G.sh, G.el, G.wr, G.hand];
        /* soft glow */
        stroke(c, [G.heel, G.toe], w * 0.36, 'rgba(110,180,255,.14)');
        stroke(c, leg.slice(1), w * 0.72, 'rgba(110,180,255,.14)');
        stroke(c, [G.hip, G.sh], w * 1.25, 'rgba(110,180,255,.14)');
        stroke(c, arm, w * 0.5, 'rgba(110,180,255,.14)');
        /* body: glass leg, torso, arm */
        stroke(c, [G.heel, G.toe], w * 0.2, body + '.36)');
        stroke(c, leg.slice(1), w * 0.5, rim + '.5)'); stroke(c, leg.slice(1), w * 0.42, body + '.32)');
        const g = c.createLinearGradient(G.sh[0], G.sh[1], G.hip[0], G.hip[1]); g.addColorStop(0, body + '.4)'); g.addColorStop(1, body + '.16)');
        stroke(c, [G.hip, G.sh], w * 1.02, rim + '.55)'); stroke(c, [G.hip, G.sh], w * 0.94, 'rgba(10,30,70,.25)'); stroke(c, [G.hip, G.sh], w * 0.94, g);
        stroke(c, [G.sh, G.neck], w * 0.36, body + '.34)');
        /* the flat back: a bright line along the back side of the torso, amber when the camera sees rounding */
        const tx = G.sh[0] - G.hip[0], ty = G.sh[1] - G.hip[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl * -G.dir, ny = tx / tl * -G.dir;
        const off = w * 0.5, bk = [[G.hip[0] + nx * off, G.hip[1] + ny * off], [G.sh[0] + nx * off, G.sh[1] + ny * off]];
        stroke(c, bk, Math.max(2, w * 0.07), formWarn ? 'rgba(255,196,92,.95)' : 'rgba(240,250,255,.75)');
        stroke(c, leg.slice(1), Math.max(1.5, w * 0.06), 'rgba(240,250,255,.62)');
        stroke(c, arm.slice(0, 3), w * 0.32, rim + '.5)'); stroke(c, arm.slice(0, 3), w * 0.25, body + '.38)'); stroke(c, arm.slice(0, 3), Math.max(1.5, w * 0.06), 'rgba(240,250,255,.62)');
        /* cells: hip, knee, shoulder, hand; the weight as a faint plate at the hands */
        const cell = (p, r, al) => { const rg = c.createRadialGradient(p[0] - r * 0.35, p[1] - r * 0.35, r * 0.1, p[0], p[1], r); rg.addColorStop(0, 'rgba(255,255,255,' + (0.75 * al) + ')'); rg.addColorStop(0.45, body + (0.42 * al) + ')'); rg.addColorStop(1, body + (0.12 * al) + ')'); c.fillStyle = rg; c.beginPath(); c.arc(p[0], p[1], r, 0, 6.283); c.fill(); c.lineWidth = Math.max(1, w * 0.025); c.strokeStyle = rim + (0.55 * al) + ')'; c.stroke(); };
        c.beginPath(); c.arc(G.hand[0], G.hand[1], w * 0.42, 0, 6.283); c.lineWidth = Math.max(1, w * 0.05); c.strokeStyle = rim + '.28)'; c.stroke();
        cell(G.hip, w * 0.24, 1); cell(G.knee, w * 0.16, 0.9); cell(G.sh, w * 0.2, 1); cell(G.hand, w * 0.12, 1);
        cell(G.head, G.headR, 1);
        c.beginPath(); c.arc(G.head[0] - G.headR * 0.3, G.head[1] - G.headR * 0.35, G.headR * 0.28, 0, 6.283); c.fillStyle = 'rgba(255,255,255,.28)'; c.fill();
        /* hips back: a soft arrow behind the hips while the outline goes down */
        if (s.phase === 'follow' && shown > 0.06 && shown < 0.96 && s.depth >= shown - 0.01) {
            const y = G.hip[1], x0 = G.hip[0] - G.dir * w * 0.45, x1 = x0 - G.dir * w * 0.9;
            c.setLineDash([w * 0.12, w * 0.14]); stroke(c, [[x0, y], [x1, y]], Math.max(2, w * 0.05), 'rgba(205,236,255,.7)'); c.setLineDash([]);
            stroke(c, [[x1 + G.dir * w * 0.2, y - w * 0.16], [x1, y], [x1 + G.dir * w * 0.2, y + w * 0.16]], Math.max(2, w * 0.05), 'rgba(205,236,255,.7)');
        }
        /* drifting cells inside the torso */
        for (let i = 0; i < 4; i++) {
            const k = (i + 0.5) / 4, ph = still ? 0 : now / 1000 * (0.35 + i * 0.07) + i * 1.7;
            const x = G.hip[0] + tx * k + nx * w * 0.2 * Math.sin(ph + i), y = G.hip[1] + ty * k + ny * w * 0.2 * Math.sin(ph + i);
            c.beginPath(); c.arc(x, y, w * (0.04 + 0.014 * (i % 3)), 0, 6.283); c.fillStyle = 'rgba(230,248,255,.35)'; c.fill();
        }
        c.restore();
        /* proof the tracking is real: dots on your own joints (near side) while you get in place */
        if (aligning && opt.sm) {
            const S = HC.measure(opt.sm, view.W, view.H);
            if (S && S.seen) { c.fillStyle = 'rgba(255,255,255,.85)'; for (const k of ['ear', 'sh', 'el', 'wr', 'hip', 'knee', 'ankle', 'toe']) { const p = S[k]; if (p && S['ok' + k[0].toUpperCase() + k.slice(1)]) { c.beginPath(); c.arc(p[0], p[1], 4, 0, 6.283); c.fill(); } } }
        }
    }

    /* ---------- the card, the rep bubble, Misty ---------- */
    let key = '', lastCount = 0, lastSet = 0, lastSpokenHint = '', streak = 0, mistyT = 0, els = null;
    function reset() { key = ''; lastCount = 0; lastSet = 0; lastSpokenHint = ''; streak = 0; shown = 0; clearTimeout(mistyT); if (els) { els.rep.className = 'mh-rep'; els.misty.className = 'mh-misty'; } }
    function ensure(ov) {
        if (els && els.ov === ov) return els;
        const stage = ov.querySelector('.mm-stage');
        let rep = stage.querySelector('.mh-rep'), misty = stage.querySelector('.mh-misty');
        if (!rep) { rep = D.createElement('div'); rep.className = 'mh-rep'; rep.setAttribute('aria-hidden', 'true'); rep.innerHTML = '<b>0</b><small></small><i class="mh-burst"></i>'; stage.appendChild(rep); }
        if (!misty) { misty = D.createElement('div'); misty.className = 'mh-misty'; misty.setAttribute('aria-hidden', 'true'); misty.innerHTML = '<i class="mh-orb"><em></em><em></em></i><span class="mh-say"></span><i class="mh-cells"><em></em><em></em><em></em><em></em><em></em><em></em></i>'; stage.appendChild(misty); }
        els = { ov, rep, misty };
        return els;
    }
    function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
    function mistySay(line, big) {
        if (!els) return;
        els.misty.querySelector('.mh-say').textContent = compName() + ': ' + line;
        els.misty.classList.add('on'); if (big) restart(els.misty, 'party');
        clearTimeout(mistyT); mistyT = setTimeout(() => { if (els) els.misty.classList.remove('on', 'party'); }, big ? 4200 : 2400);
    }
    function events(evs, d) {
        const T = d.T;
        for (const e of evs) {
            if (e.type === 'rep') {
                const b = els.rep; b.querySelector('b').textContent = e.inSet;
                b.classList.toggle('clean', !!e.clean); b.classList.toggle('fault', !e.clean);
                restart(b, 'pop');
                d.say(String(e.inSet), true);
                if (e.clean) { streak++; try { if (W.navigator.vibrate) W.navigator.vibrate(12); } catch (x) {} } else streak = 0;
                if (e.inSet === 1 && e.set === 1) mistySay(T('Here we go!', 'Los geht’s!', '¡Vamos!'));
                else if (e.clean && streak > 0 && streak % 3 === 0) mistySay(T(streak + ' clean in a row!', streak + ' saubere am Stück!', '¡' + streak + ' limpias seguidas!'));
            } else if (e.type === 'set') {
                const line = e.last ? T('All sets done. You looked after your back!', 'Alle Sätze geschafft. Gut auf deinen Rücken aufgepasst!', 'Todas las series. ¡Cuidaste tu espalda!')
                    : T('Set ' + e.set + ' done! ' + e.clean + ' of ' + e.reps + ' clean.', 'Satz ' + e.set + ' geschafft! ' + e.clean + ' von ' + e.reps + ' sauber.', '¡Serie ' + e.set + ' hecha! ' + e.clean + ' de ' + e.reps + ' limpias.');
                mistySay(line, true); restart(els.rep, 'setpop'); d.say(line, true); d.live(line);
            } else if (e.type === 'setstart') {
                els.rep.querySelector('b').textContent = '0'; els.rep.classList.remove('clean', 'fault');
                d.say(T('Set ' + e.set + '. Hips back, back long.', 'Satz ' + e.set + '. Hüfte nach hinten, Rücken lang.', 'Serie ' + e.set + '. Cadera atrás, espalda larga.'), true);
            } else if (e.type === 'cue') { d.say(e.text); d.live(e.text); lastSpokenHint = e.cue; }
        }
    }
    function ui(ov, s, flow, d) {
        const T = d.T, l = d.lang, R = HC.ROUTINE;
        ensure(ov);
        const evs = flow.drain(); if (evs.length) events(evs, d);
        const aligning = s.phase === 'align' || s.phase === 'hold', resting = s.phase === 'rest', going = s.phase === 'follow' || s.phase === 'lost';
        els.rep.classList.toggle('on', going || resting);
        els.rep.querySelector('small').textContent = '/' + s.reps;
        const k = [s.phase, s.set, s.rep, s.hint, s.count, s.canHere, s.paused, s.mode, s.restLeft, s.clean].join('|');
        if (k === key) return; key = k;
        ov.querySelector('.mm-title b').textContent = HC.txt(R.n, l);
        ov.querySelector('.mm-title small').textContent = s.mode === 'camera' ? T('Camera on, stays on this device', 'Kamera an, bleibt auf dem Gerät', 'Cámara activa, se queda en el dispositivo') : T('Without camera', 'Ohne Kamera', 'Sin cámara');
        ov.querySelector('.mm-move b').textContent = aligning ? T('Get in place, side-on', 'In Position, seitlich', 'Colócate, de lado') : resting ? T('Rest', 'Pause', 'Descanso') : HC.txt(R.short, l) + ' · ' + T('Set ', 'Satz ', 'Serie ') + s.set + '/' + s.sets;
        ov.querySelector('.mm-left').textContent = aligning || s.phase === 'done' ? '' : resting ? s.restLeft + ' s' : s.rep + '/' + s.reps + ' ' + T('reps', 'Wdh.', 'rep.');
        ov.querySelector('.mm-cue').textContent = aligning ? HC.txt(R.place[1], l) : resting ? T('Next: set ', 'Gleich: Satz ', 'Ahora: serie ') + (s.set + 1) + ' · ' + s.reps + ' ' + T('reps', 'Wdh.', 'rep.') : s.cue;
        ov.querySelector('.mm-bar i').style.transform = 'scaleX(' + (resting ? 1 - s.restLeft / s.restTotal : s.done / s.totalReps).toFixed(3) + ')';
        const pill = ov.querySelector('.mm-pill'); pill.textContent = s.paused ? T('Paused', 'Pausiert', 'En pausa') : s.hintText;
        pill.className = 'mm-pill' + (s.hintText || s.paused ? ' on' : '') + (s.hint === 'good' || s.hint === 'hold' ? ' good' : '') + (s.hint === 'lost' || s.hint === 'dark' ? ' warn' : '') + (s.form ? ' form' : '');
        const cnt = ov.querySelector('.mm-count'); cnt.textContent = s.phase === 'count' ? s.count : ''; cnt.classList.toggle('on', s.phase === 'count');
        const meter = ov.querySelector('.mm-meter'), showM = s.mode === 'camera' && (going || resting) && s.done > 0;
        meter.hidden = !showM;
        if (showM) { meter.querySelector('span').textContent = T('Clean reps ', 'Saubere Wdh. ', 'Rep. limpias ') + s.clean + '/' + s.done; meter.querySelector('em').style.transform = 'scaleX(' + (s.clean / Math.max(1, s.done)).toFixed(2) + ')'; }
        ov.querySelector('[data-mm="here"]').hidden = !s.canHere;
        ov.querySelector('[data-mm="free"]').hidden = s.mode !== 'camera' || resting;
        const sk = ov.querySelector('[data-mm="skiprest"]'); if (sk) sk.hidden = !resting;
        const pb = ov.querySelector('[data-mm="pause"]'); pb.innerHTML = (s.paused ? d.ICON.play : d.ICON.pause) + '<span>' + d.esc(s.paused ? T('Resume', 'Weiter', 'Seguir') : T('Pause', 'Pause', 'Pausa')) + '</span>'; pb.hidden = aligning;
        /* voice: the count, the set, framing hints (form cues are spoken from their event) */
        if (s.phase === 'count' && s.count !== lastCount) { lastCount = s.count; d.say(String(s.count), true); }
        if (s.phase === 'follow' && s.set !== lastSet) { lastSet = s.set; if (s.set === 1) { const t = HC.txt(R.short, l) + '. ' + s.cue; d.say(t, true); d.live(t); } }
        if (s.hint !== lastSpokenHint) {
            lastSpokenHint = s.hint;
            if (s.hint && !s.form && s.hint !== 'good' && s.hint !== 'hold' && s.hint !== 'rest') { d.live(s.hintText); d.say(s.hintText); }
        }
    }
    function finishHTML(s, d) {
        const T = d.T, esc = d.esc, reps = s.done, clean = s.clean, cam = s.mode === 'camera';
        const line = cam ? T(reps + ' reps in ' + s.sets + ' sets, ' + clean + ' of them clean.', reps + ' Wiederholungen in ' + s.sets + ' Sätzen, ' + clean + ' davon sauber.', reps + ' repeticiones en ' + s.sets + ' series, ' + clean + ' limpias.')
            : T(reps + ' reps in ' + s.sets + ' sets with the outline.', reps + ' Wiederholungen in ' + s.sets + ' Sätzen mit dem Umriss.', reps + ' repeticiones en ' + s.sets + ' series con la silueta.');
        const sets = (s.history || []).map(h => '<li><b>' + esc(T('Set ', 'Satz ', 'Serie ') + h.set) + '</b><span>' + h.reps + ' ' + esc(T('reps', 'Wdh.', 'rep.')) + (cam ? ' · ' + h.clean + ' ' + esc(T('clean', 'sauber', 'limpias')) : '') + '</span></li>').join('');
        return '<header class="mm-ph"><b>' + esc(T('Deadlifts done', 'Kreuzheben geschafft', 'Peso muerto hecho')) + '</b><button type="button" class="mm-ic" data-mm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '">' + d.ICON.x + '</button></header>' +
            '<div class="mh-done"><i class="mh-orb" aria-hidden="true"><em></em><em></em></i><p><b>' + esc(compName()) + ':</b> ' + esc(T('That is how you look after yourself.', 'So passt du gut auf dich auf.', 'Así te cuidas.')) + '</p></div>' +
            '<p class="mm-lead">' + esc(line) + ' ' + esc(T('Your camera is off again.', 'Deine Kamera ist wieder aus.', 'Tu cámara está apagada.')) + '</p><ul class="mh-sets">' + sets + '</ul>' +
            '<div class="mm-acts"><button type="button" class="mm-btn mm-pri" data-mm="close">' + esc(T('Close', 'Schließen', 'Cerrar')) + '</button><button type="button" class="mm-btn mm-ghostbtn" data-mm="open">' + esc(T('Another one', 'Noch eine', 'Otra')) + '</button></div>';
    }

    W.LowiMirrorHinge = { ID: HC.ID, ROUTINE: HC.ROUTINE, ICON, placeArt, paint, ui, finishHTML, reset, makeFlow: (mode, lang) => new HC.Flow({ mode, lang }), measure: HC.measure };
})();
