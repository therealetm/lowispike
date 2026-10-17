/* move-bubble.js — Oct 17 (E-man): the movement bubble on Home, next to Misty's water and fasting bubbles.
   Tap: four small bubbles bloom out of it — Quick, Medium, Long, Epic — pick how the walk FELT (no minutes, no steps).
   The pick pops into the bubble, its fill rises, Misty does her happy dance, and a small float says what it really added
   (XP and the Move energy change read back from LowiSun.energyNow, so the number always matches what was applied, caps included).
   Long press: today's estimates, each can be removed again (XP and energy go back with it). No separate edit button.
   Rules live in move-estimate-core.js. Only time on your feet or on a bike counts, never sitting on a bus or train. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiMoveBubble) return;
    const C = W.LowiMoveEstimateCore;
    if (!C) return;

    const lang = () => { const l = (D.documentElement.lang || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][lang()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pad = n => String(n).padStart(2, '0');
    const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const bridge = () => W.LowiVitalsBridge || null;
    const state = () => { try { return bridge() && bridge().state(); } catch (e) { return null; } };
    const ledger = () => { const s = state(); return (s && Array.isArray(s.ledger)) ? s.ledger : []; };
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const energy = () => { try { return W.LowiSun && W.LowiSun.energyNow ? +W.LowiSun.energyNow().value || 0 : null; } catch (e) { return null; } };

    const NAMES = {
        quick: () => T('Quick', 'Kurz', 'Rápido'),
        medium: () => T('Medium', 'Mittel', 'Medio'),
        long: () => T('Long', 'Lang', 'Largo'),
        epic: () => T('Epic', 'Episch', 'Épico')
    };
    const HINTS = {
        quick: () => T('kitchen, loo', 'Küche, Bad', 'cocina, baño'),
        medium: () => T('shop, bus stop', 'Laden, Bus', 'tienda, bus'),
        long: () => T('to work, school', 'Arbeit, Schule', 'trabajo, cole'),
        epic: () => T('big walk, ride', 'große Tour', 'gran paseo')
    };
    const label = () => T('Move', 'Bewegung', 'Movimiento');

    let el = null, bloom = null, timer = 0, lastDay = '', busy = false;

    /* ---------- the bubble ---------- */
    function ensure() {
        const hud = D.getElementById('whHud');
        if (!hud) return null;
        if (el && el.isConnected && el.parentNode === hud) return el;
        el = hud.querySelector('.wh-move');
        if (!el) {
            el = D.createElement('button');
            el.type = 'button';
            el.className = 'wh-cell wh-move';
            el.dataset.hb = 'move';
            el.innerHTML = '<span class="wh-cell-fill" aria-hidden="true"></span><span class="wh-cell-tx"><small></small><b></b></span><i class="wm-pop" aria-hidden="true"></i>';
            const water = hud.querySelector('.wh-water');
            if (water && water.nextSibling) hud.insertBefore(el, water.nextSibling); else hud.appendChild(el);
            wire(el);
            try { W.dispatchEvent(new CustomEvent('lowi:home-bubble-added', { detail: { el, kind: 'move' } })); } catch (e) {}
        }
        return el;
    }
    /* the shared living bubble (living-bubbles.js, loads after this file): Misty's 3D membrane, her squish and spring, and
       its long press, which here opens today's estimates */
    let living = false, longAt = 0, downAt = 0;   /* a long press, however long it is held, never also opens the bloom */
    function attachLiving(b) {
        if (living || !b) return;
        try { if (W.LowiLivingBubble && typeof W.LowiLivingBubble.attach === 'function') { W.LowiLivingBubble.attach(b, { kind: 'move', onLong: () => { longAt = performance.now(); editSheet(); return true; } }); living = true; } } catch (e) {}
    }
    const shared = () => !!(W.LowiBubbles && el && el.classList.contains('lb-bub'));
    function paint() {
        const b = ensure(); if (!b) return;
        if (!b.classList.contains('lb-bub')) living = false;
        attachLiving(b);
        const day = dayKey(); lastDay = day;
        const v = C.view(ledger(), day);
        const fill = String(Math.round(v.fill * 100) / 100);
        if (b.style.getPropertyValue('--wh-fill') !== fill) b.style.setProperty('--wh-fill', fill);
        const sm = b.querySelector('small'), bb = b.querySelector('b');
        if (sm && sm.textContent !== label()) sm.textContent = label();
        if (bb && bb.textContent !== v.text) bb.textContent = v.text;
        b.classList.toggle('wm-full', v.q >= C.FULL);
        const aria = label() + ' ' + v.q + ' / ' + C.FULL + '. ' + T('Tap to add a walk or ride, long press to edit today.', 'Tippen, um einen Weg einzutragen, lange drücken zum Bearbeiten.', 'Toca para añadir un paseo, mantén pulsado para editar hoy.');
        if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
    }

    /* Where it floats: mirror the water bubble upward (upper-right of Misty). On short or wide screens (iPhone SE, phones in
       landscape) that spot can hit the Daily Quest card or the water bubble, so try a few other spots around Misty and take the
       first one that touches nothing. Positions are written as --wm-x / --wm-y; without them the CSS default applies. */
    /* Misty's HOME cell, never where her cell drifts to: while the camera follows her flight (autopilot, steering, a world)
       misty-flight.js slides #spBubble by --mf-bx / --mf-by (html.mf-roam). Measuring that moved box made this bubble jump
       after her, into the middle where she used to sit. The other bubbles are pinned by CSS, so this one is too. */
    function homeRect(mi) {
        const q = mi.getBoundingClientRect();
        if (!D.documentElement.classList.contains('mf-roam')) return q;
        const dx = parseFloat(mi.style.getPropertyValue('--mf-bx')) || 0, dy = parseFloat(mi.style.getPropertyValue('--mf-by')) || 0;
        return { left: q.left - dx, top: q.top - dy, right: q.right - dx, bottom: q.bottom - dy, width: q.width, height: q.height };
    }
    function place() {
        const b = ensure(); if (!b) return;
        const hud = D.getElementById('whHud'), mi = D.getElementById('spBubble');
        if (!hud || !mi || !D.documentElement.classList.contains('wh-home')) return;
        /* while the UI is faded for Misty's flight the spot stays where it was: the faded cards would read as gone */
        if (D.documentElement.classList.contains('lw-clean')) return;
        const hr = hud.getBoundingClientRect(), mr = homeRect(mi);
        if (!mr.width || !hr.width) return;
        const r = b.offsetWidth / 2 || 46, gap = 8, vw = W.innerWidth, vh = W.innerHeight;
        const mcx = mr.left + mr.width / 2, mcy = mr.top + mr.height / 2, mR = mr.width / 2;
        const vis = e => { if (!e || e === b) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return null; const q = e.getBoundingClientRect(); return q.width > 4 ? q : null; };
        const water = vis(hud.querySelector('.wh-water')), fast = vis(D.getElementById('spFast'));
        const circles = [{ x: mcx, y: mcy, r: mR }];
        ['#spFast', '#whHud .wh-water'].forEach(sel => { const q = vis(D.querySelector(sel)); if (q) circles.push({ x: q.left + q.width / 2, y: q.top + q.height / 2, r: q.width / 2 }); });
        const rects = ['#f3Board', '#hcLine', '.sp-top', '.fe-bub', '#whHud .wh-todaybtn', '#whHud .wh-vr', '#whHud .wh-zoom', '#tabbar', '.tabbar'].map(sel => vis(D.querySelector(sel))).filter(Boolean);
        const sx = water ? water.left + water.width / 2 - mcx : mR * 1.35, sy = water ? water.top + water.height / 2 - mcy : mR;
        const cands = [
            [mcx + sx, mcy - sy], [mcx + mR + gap + r, mcy],
            water ? [water.right + gap + r, water.top + water.height / 2] : null,
            [mcx + mR + gap + r, mcy - r * 0.9], [mcx - sx, mcy - sy], [mcx - mR - gap - r, mcy],
            fast ? [fast.left - gap - r, fast.top + fast.height / 2] : null
        ].filter(Boolean);
        const clear = (x, y) => {
            if (x - r < 6 || x + r > vw - 6 || y - r < 6 || y + r > vh - 6) return false;
            for (const c of circles) if (Math.hypot(c.x - x, c.y - y) < c.r + r + gap) return false;
            for (const q of rects) { const nx = Math.max(q.left, Math.min(x, q.right)), ny = Math.max(q.top, Math.min(y, q.bottom)); if (Math.hypot(nx - x, ny - y) < r + 6) return false; }
            return true;
        };
        let pick = null;
        for (const c of cands) if (clear(c[0], c[1])) { pick = c; break; }
        if (!pick) {   /* nothing on the list fits (phone in landscape): nearest free spot around Misty, leaning toward the usual one */
            let best = null, bs = 1e9;
            for (let d = mR + r + gap; d < mR + r + gap + 320; d += 12) for (let a = 0; a < 360; a += 10) {
                const x = mcx + Math.cos(a * Math.PI / 180) * d, y = mcy + Math.sin(a * Math.PI / 180) * d;
                if (!clear(x, y)) continue;
                const sc = d + 0.35 * Math.hypot(x - cands[0][0], y - cands[0][1]);
                if (sc < bs) { bs = sc; best = [x, y]; }
            }
            const board = vis(D.getElementById('f3Board'));
            pick = best || [cands[0][0], Math.max(cands[0][1], board ? board.bottom + 10 + r : 0)];
        }
        const nx = Math.round(pick[0] - hr.left), ny = Math.round(pick[1] - hr.top);
        /* a fixed spot: the neighbours' own few-pixel wobble never nudges it, only a real change of layout does */
        const ox = parseFloat(b.style.getPropertyValue('--wm-x')), oy = parseFloat(b.style.getPropertyValue('--wm-y'));
        if (isFinite(ox) && isFinite(oy) && Math.abs(nx - ox) < 9 && Math.abs(ny - oy) < 9) return;
        b.style.setProperty('--wm-x', nx + 'px');
        b.style.setProperty('--wm-y', ny + 'px');
    }
    /* tap = bloom, long press = edit (same rule as the other Home bubbles) */
    function wire(b) {
        let down = 0, held = false, sx = 0, sy = 0;
        const clear = () => { if (down) clearTimeout(down); down = 0; b.classList.remove('wm-holding'); };
        b.addEventListener('pointerdown', e => {
            downAt = performance.now();
            if (e.button > 0 || shared()) return;   /* the living bubble does the press and the long press */
            held = false; sx = e.clientX; sy = e.clientY;
            b.classList.add('wm-press');
            clear(); b.classList.add('wm-holding');
            down = setTimeout(() => { down = 0; held = true; b.classList.remove('wm-holding', 'wm-press'); buzz(18); editSheet(); }, 560);
        });
        b.addEventListener('pointermove', e => { if (down && Math.hypot(e.clientX - sx, e.clientY - sy) > 12) { clear(); b.classList.remove('wm-press'); } });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => b.addEventListener(n, () => { clear(); b.classList.remove('wm-press'); }));
        b.addEventListener('contextmenu', e => { e.preventDefault(); if (shared()) return; });
        b.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            if (held) { held = false; return; }
            if (longAt && longAt >= downAt) { longAt = 0; return; }
            if (bloom) closeBloom(); else openBloom();
        });
        b.addEventListener('keydown', e => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); editSheet(); } });
    }
    function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

    /* ---------- the bloom: four small bubbles fan out toward the middle of the screen ---------- */
    function openBloom() {
        const b = ensure(); if (!b || bloom) return;
        const r = b.getBoundingClientRect(); if (!r.width) return;
        buzz(8);
        const vw = W.innerWidth, vh = W.innerHeight;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const orb = Math.round(Math.max(64, Math.min(84, Math.min(vw, vh) * 0.19)));
        const dist = r.width / 2 + orb / 2 + 22;
        const toward = Math.atan2(vh * 0.5 - cy, vw * 0.5 - cx);
        const step = (orb + 12) / dist;
        const pts = C.LEVELS.map((L, i) => {
            const a = toward + (i - 1.5) * step;
            let x = cx + Math.cos(a) * dist, y = cy + Math.sin(a) * dist;
            x = Math.max(orb / 2 + 6, Math.min(vw - orb / 2 - 6, x));
            y = Math.max(orb / 2 + 6, Math.min(vh - orb / 2 - 6, y));
            return { L, x, y };
        });
        /* keep clamped bubbles from sitting on each other */
        for (let k = 0; k < 6; k++) for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
            const p = pts[i], q = pts[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, need = orb + 6;
            if (d < need) { const m = (need - d) / 2, ux = dx / d, uy = dy / d; p.x -= ux * m; p.y -= uy * m; q.x += ux * m; q.y += uy * m; }
        }
        pts.forEach(p => { p.x = Math.max(orb / 2 + 6, Math.min(vw - orb / 2 - 6, p.x)); p.y = Math.max(orb / 2 + 6, Math.min(vh - orb / 2 - 6, p.y)); });
        const v = C.view(ledger(), dayKey());
        const ov = D.createElement('div');
        ov.className = 'wm-bloom';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-label', T('How did it feel?', 'Wie hat es sich angefühlt?', '¿Cómo se sintió?'));
        ov.style.setProperty('--wm-orb', orb + 'px');
        ov.innerHTML = '<button type="button" class="wm-scrim" data-wm="close" aria-label="' + esc(T('Close', 'Schließen', 'Cerrar')) + '"></button>' +
            pts.map((p, i) => '<button type="button" class="wm-orb wm-' + p.L.id + '" data-wm="pick" data-lvl="' + p.L.id + '" style="left:' + Math.round(p.x) + 'px;top:' + Math.round(p.y) + 'px;--wm-dx:' + Math.round(cx - p.x) + 'px;--wm-dy:' + Math.round(cy - p.y) + 'px;--wm-i:' + i + '" aria-label="' + esc(NAMES[p.L.id]() + ', ' + HINTS[p.L.id]() + ', +' + p.L.q + '/4') + '">' +
                '<span class="wm-orb-fill" style="--wm-q:' + (p.L.q / 4) + '" aria-hidden="true"></span><span class="wm-orb-tx"><b>' + esc(NAMES[p.L.id]()) + '</b><small>' + esc(HINTS[p.L.id]()) + '</small></span></button>').join('') +
            '<p class="wm-note" style="' + noteSpot(pts, orb, vw, vh) + '">' + esc(v.q >= C.FULL
                ? T('Move is full for today. Nice!', 'Bewegung ist heute voll. Stark!', 'Movimiento completo hoy. ¡Genial!')
                : T('Estimate, not steps · only walking or cycling counts, not sitting on a bus', 'Schätzung, keine Schritte · nur Gehen oder Radfahren zählt, nicht Sitzen im Bus', 'Estimación, no pasos · solo cuenta caminar o pedalear, no ir sentado en el bus')) + '</p>';
        D.body.appendChild(ov);
        bloom = ov;
        b.classList.add('wm-open'); b.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => { ov.classList.add('on'); const f = ov.querySelector('.wm-orb'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} });
        ov.addEventListener('click', onBloomClick);
        ov.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closeBloom(true); } });
    }
    function noteSpot(pts, orb, vw, vh) {
        const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
        const midX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const below = maxY + orb / 2 + 10, above = minY - orb / 2 - 44;
        const top = below + 40 < vh ? below : Math.max(8, above);
        const w = Math.min(260, vw - 24), left = Math.max(12, Math.min(vw - w - 12, midX - w / 2));
        return 'left:' + Math.round(left) + 'px;top:' + Math.round(top) + 'px;width:' + Math.round(w) + 'px';
    }
    function onBloomClick(e) {
        const t = e.target.closest && e.target.closest('[data-wm]'); if (!t) return;
        e.preventDefault(); e.stopPropagation();
        if (t.dataset.wm === 'close') closeBloom(true);
        else if (t.dataset.wm === 'pick') pick(t.dataset.lvl, t);
    }
    function closeBloom(focusBack, chosen) {
        const ov = bloom; if (!ov) return;
        bloom = null;
        if (el) { el.classList.remove('wm-open'); el.setAttribute('aria-expanded', 'false'); }
        ov.classList.remove('on'); ov.classList.add('off');
        if (chosen) chosen.classList.add('wm-chosen');
        setTimeout(() => ov.remove(), reduced() ? 0 : 420);
        if (focusBack && el) try { el.focus({ preventScroll: true }); } catch (e) {}
    }

    /* ---------- a pick ---------- */
    function pick(id, orbEl) {
        if (busy) return;
        const br = bridge(); if (!br || !br.awardWith) { closeBloom(true); return; }
        busy = true;
        try {
            const day = dayKey(), now = Date.now();
            const p = C.plan(ledger(), day, id, now);
            if (p.action === 'bad') { closeBloom(true); return; }
            if (p.action === 'full' || p.action === 'limit') {
                closeBloom(true, orbEl); buzz(10);
                float(p.action === 'limit'
                    ? T('That\'s plenty for today', 'Für heute ist das genug', 'Suficiente por hoy')
                    : (p.fromMovePage ? T('Already counted on Move · full', 'Schon unter Bewegung gezählt · voll', 'Ya contado en Movimiento · lleno') : T('Move is full today', 'Bewegung ist heute voll', 'Movimiento lleno hoy')), true);
                wobble();
                try { W.dispatchEvent(new CustomEvent('lowi:care', { detail: { kind: 'dance', id: 'move:full:' + day } })); } catch (e) {}
                return;
            }
            const before = energy();
            const back = (p.action === 'replace' && p.replaceId) ? (+br.unaward(p.replaceId) || 0) : 0;
            const name = NAMES[id](), lab = label() + ' · ' + name;
            const xp = br.awardWith(p.xp, lab, C.SRC, p.eventId, { mq: p.applied, lvl: id, est: 1 }, true);
            const after = energy();
            closeBloom(false, orbEl);
            paint();
            pop(); buzz([12, 40, 18]);
            const dE = before == null || after == null ? null : Math.round((after - before) * 100);
            const bits = [];
            if (p.action === 'replace') bits.push(T('changed to ', 'geändert: ', 'cambiado: ') + name);
            const net = (+xp || 0) - back;   /* a change of mind shows the net change, not the new total */
            bits.push((net >= 0 ? '+' : '') + net + ' XP');
            if (dE != null) bits.push(dE > 0 ? '+' + dE + '% ' + T('energy', 'Energie', 'energía') : (dE < 0 ? dE + '% ' + T('energy', 'Energie', 'energía') : T('energy already full', 'Energie schon voll', 'energía ya llena')));
            float(bits.join(' · '));
            if (el) try { el.focus({ preventScroll: true }); } catch (e) {}
            try { W.dispatchEvent(new CustomEvent('lowi:move-estimate', { detail: { level: id, applied: p.applied, xp, energyBefore: before, energyAfter: after, replaced: p.action === 'replace' } })); } catch (e) {}
        } finally { busy = false; }
    }
    function restart(node, cls) { if (!node) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }
    function pop() { restart(el, 'wm-pop-on'); }
    function wobble() { restart(el, 'wm-nope'); }
    function float(text, soft) {
        const b = ensure(); if (!b) return;
        const r = b.getBoundingClientRect();
        const f = D.createElement('div');
        f.className = 'wm-float' + (soft ? ' soft' : '');
        f.setAttribute('role', 'status');
        f.textContent = text;
        const w = Math.min(240, W.innerWidth - 16);
        f.style.width = w + 'px';
        f.style.left = Math.round(Math.max(8, Math.min(W.innerWidth - w - 8, r.left + r.width / 2 - w / 2))) + 'px';
        f.style.top = Math.round(Math.max(8, r.top - 30)) + 'px';
        D.body.appendChild(f);
        setTimeout(() => f.remove(), reduced() ? 2600 : 2400);
    }

    /* ---------- long press: today's estimates ---------- */
    function editSheet() {
        closeBloom(false);
        const R = W.LowiR2; if (!R || !R.sheet) return;
        const day = dayKey(), mine = C.estimates(ledger(), day), v = C.view(ledger(), day);
        const tm = ts => { const d = new Date(+ts || 0); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
        const rows = mine.length ? mine.map(e => '<li class="wm-row"><span><b>' + esc(NAMES[e.lvl] ? NAMES[e.lvl]() : label()) + '</b><small>' + esc(tm(e.ts) + ' · +' + (+e.mq || 0) + '/4 · ' + (+e.amt || 0) + ' XP') + '</small></span><button type="button" class="wm-rm" data-wm-rm="' + esc(e.eventId) + '">' + esc(T('Remove', 'Entfernen', 'Quitar')) + '</button></li>').join('')
            : '<li class="wm-row wm-empty">' + esc(T('No walks or rides added here today.', 'Heute hier noch nichts eingetragen.', 'Hoy aún no has añadido nada aquí.')) + '</li>';
        const html = '<div class="wm-sheet"><h3>' + esc(label() + ' · ' + v.text) + '</h3>' +
            '<p class="wm-why">' + esc(T('Quick, Medium, Long or Epic is your own estimate of time on your feet or on a bike. It is not a step count or a health measurement, and sitting on a bus or train does not count. Four quarters fill today\'s Move share of Misty\'s energy.',
                'Kurz, Mittel, Lang oder Episch ist deine eigene Schätzung der Zeit zu Fuß oder auf dem Rad. Das ist keine Schrittzahl und keine Gesundheitsmessung, und Sitzen im Bus oder Zug zählt nicht. Vier Viertel füllen den Bewegungsanteil von Mistys Energie für heute.',
                'Rápido, Medio, Largo o Épico es tu propia estimación del tiempo a pie o en bici. No es un conteo de pasos ni una medida de salud, e ir sentado en el bus o el tren no cuenta. Cuatro cuartos llenan la parte de Movimiento de la energía de Misty hoy.')) + '</p>' +
            (v.fromMovePage ? '<p class="wm-why">' + esc(T('A workout or steps from the Move page already fill today.', 'Ein Training oder Schritte von der Bewegungsseite füllen heute schon alles.', 'Un entrenamiento o pasos de la página Movimiento ya llenan hoy.')) + '</p>' : '') +
            '<ul class="wm-list">' + rows + '</ul></div>';
        const ov = R.sheet(html, { cls: 'wm-sheet-ov' });
        if (!ov) return;
        ov.addEventListener('click', e => {
            const btn = e.target.closest && e.target.closest('[data-wm-rm]'); if (!btn) return;
            e.preventDefault();
            const br = bridge(); if (!br || !br.unaward) return;
            const before = energy(), amt = br.unaward(btn.dataset.wmRm), after = energy();
            const row = btn.closest('li'); if (row) row.remove();
            paint();
            const dE = before == null || after == null ? null : Math.round((after - before) * 100);
            float(T('Removed', 'Entfernt', 'Quitado') + ' · -' + (amt || 0) + ' XP' + (dE ? ' · ' + dE + '% ' + T('energy', 'Energie', 'energía') : ''), true);
            const h = ov.querySelector('.wm-sheet h3'); if (h) h.textContent = label() + ' · ' + C.view(ledger(), dayKey()).text;
            if (!ov.querySelector('[data-wm-rm]')) { const ul = ov.querySelector('.wm-list'); if (ul) ul.innerHTML = '<li class="wm-row wm-empty">' + esc(T('No walks or rides added here today.', 'Heute hier noch nichts eingetragen.', 'Hoy aún no has añadido nada aquí.')) + '</li>'; }
        });
    }

    /* ---------- life cycle ---------- */
    let queued = 0;
    const soon = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; try { paint(); } catch (e) {} }); };
    const placeSoon = () => requestAnimationFrame(() => { try { place(); } catch (e) {} });
    function boot() {
        paint();
        let tries = 0; const wait = () => { if ((el && el.isConnected) || ++tries > 40) return; paint(); setTimeout(wait, 400); }; setTimeout(wait, 400);
        ['lowi:reward', 'lowi:state', 'lowi:lang', 'lowi:layout', 'storage', 'focus'].forEach(n => W.addEventListener(n, soon));
        D.addEventListener('visibilitychange', () => { if (!D.hidden) soon(); });
        /* the HUD can be rebuilt; re-attach, and repaint after midnight (fill goes back to 0/4) */
        timer = setInterval(() => { if (D.hidden) return; if (!el || !el.isConnected || dayKey() !== lastDay) paint(); place(); }, 15000);
        if (W.MutationObserver) { const hud = D.getElementById('whHud'); const target = hud || D.body; new MutationObserver(() => { if (!el || !el.isConnected) soon(); }).observe(target, { childList: true }); }
        W.addEventListener('resize', () => { if (bloom) closeBloom(false); placeSoon(); setTimeout(placeSoon, 400); });
        W.addEventListener('orientationchange', () => setTimeout(placeSoon, 300));
        W.addEventListener('lowi:layout', placeSoon);
        W.addEventListener('lowi:clean-view', e => { if (!(e.detail && e.detail.on)) setTimeout(placeSoon, 60); });   /* back from the clean flight view: catch up on a turn or resize */
        [300, 1200, 3000].forEach(ms => setTimeout(placeSoon, ms));
    }
    W.LowiMoveBubble = { paint, open: openBloom, close: closeBloom, edit: editSheet, pick: (id) => pick(id, null), el: () => ensure() };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true }); else setTimeout(boot, 0);
})();
