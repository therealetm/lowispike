/* move-finish.js: the grand finish celebration of a Move session (MAYA-HANDOFF 0.37, Mon 26 Oct 2026).
   Emmanuel finished a session in Move and got "no points, no animation, no congrats ... the animation should be grandiose".
   LowiMoveFinish.celebrate({min, xp, lang, voice, onClose}) puts a full-screen glass/cosmic moment above everything (also above Mirror mode):
   your companion (its own art and name, LowiBirthCompanion) does a happy loop in a light burst, the XP counts up, "Geschafft!" with the
   minutes moved. Tap anywhere (after a short guard so the tap that ended the session can't close it), Continue or Escape closes it.
   - Smooth: one canvas, about 90 sparks for 2.4 s then the loop stops; size capped at 2x pixels; CSS only animates transform/opacity.
   - Reduce Motion: no sparks, no loop, no count-up; the final number and a calm fade.
   - Haptics where the app already uses them (navigator.vibrate, a no-op on iPhone). The finish sound stays the player's own.
   - The companion says one of three shuffled lines in the recorded voice (LowiVoice) when the caller's voice cues are on.
   - VoiceOver: role=dialog, the whole result is announced, focus goes to Continue and comes back where it was.
   Words: move-finish-core.js. Styles: move-finish.css. */
(function (W, D) {
    'use strict';
    if (!W || !D || W.LowiMoveFinish) return;
    const C = () => W.LowiMoveFinishCore;
    const GUARD_MS = 450, BURST_MS = 2400, COUNT_MS = 1500;
    let cur = null;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en').slice(0, 2); } catch (e) { return 'en'; } };
    const reduced = () => { try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) || D.documentElement.classList.contains('reduce-motion'); } catch (e) { return false; } };
    const BC = () => W.LowiBirthCompanion || null;
    function companion() {
        const bc = BC(); let c = null, name = '', art = '';
        try { c = bc && bc.get ? bc.get() : null; } catch (e) { c = null; }
        try { name = bc && bc.displayName ? bc.displayName() : (c && c.name) || ''; } catch (e) { name = (c && c.name) || ''; }
        try { art = bc && bc.svg ? bc.svg(null, { size: 168, cls: 'mf-svg' }) : ''; } catch (e) { art = ''; }
        const pal = (c && c.palette) || { a: '#8fdcff', b: '#ffd27a' };
        return { name, art, a: pal.a || '#8fdcff', b: pal.b || '#ffd27a' };
    }

    function close(why) {
        const c = cur; if (!c) return; cur = null;
        /* BH-060: the tap that closes the card is spent, so a fast 2nd tap does not hit the Move screen under it */
        try { const F = window.LowiFreshScrim; if (F && F.closed) F.closed(c.el); } catch (e) { }
        c.dead = true; cancelAnimationFrame(c.raf); clearTimeout(c.tm);
        D.removeEventListener('keydown', c.onKey, true);
        c.el.classList.add('mf-out');
        setTimeout(() => { try { c.el.remove(); } catch (e) { } }, reduced() ? 120 : 260);
        try { if (c.prevFocus && c.prevFocus.focus && D.contains(c.prevFocus)) c.prevFocus.focus({ preventScroll: true }); } catch (e) { }
        try { if (typeof c.onClose === 'function') c.onClose(why || 'tap'); } catch (e) { }
    }

    /* the light burst: rays + sparks from the companion, in its colours and gold; stops by itself */
    function burst(c, cv, a, b) {
        const ctx = cv.getContext && cv.getContext('2d'); if (!ctx) return;
        const dpr = Math.min(2, W.devicePixelRatio || 1);
        const size = () => { const r = c.el.getBoundingClientRect(); cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr)); cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; return r; };
        const r = size(); const art = c.el.querySelector('.mf-art'); const ar = art ? art.getBoundingClientRect() : { left: r.width / 2 - 80, top: r.height * 0.3, width: 160, height: 160 };
        const cx = (ar.left - r.left + ar.width / 2) * dpr, cy = (ar.top - r.top + ar.height / 2) * dpr;
        const cols = [a, b, '#ffd27a', '#ffffff', '#ffe9a8'], N = r.width < 500 ? 80 : 110, P = [];
        for (let i = 0; i < N; i++) {
            const ang = Math.random() * Math.PI * 2, sp = (0.25 + Math.random() * 0.75) * Math.min(r.width, r.height) * 0.0016 * dpr;
            P.push({ x: cx, y: cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.05 * dpr, s: (1 + Math.random() * 2.4) * dpr, c: cols[i % cols.length], d: Math.random() * 380, life: 1300 + Math.random() * 1000 });
        }
        const RAYS = 14, t0 = performance.now();
        const frame = now => {
            if (c.dead) return; const t = now - t0; ctx.clearRect(0, 0, cv.width, cv.height);
            /* rays: a soft rotating crown that fades out */
            const ra = Math.max(0, 1 - t / 1700); if (ra > 0) {
                ctx.save(); ctx.translate(cx, cy); ctx.rotate(t / 2600); ctx.globalCompositeOperation = 'lighter';
                const len = Math.min(cv.width, cv.height) * (0.32 + 0.25 * Math.min(1, t / 700));
                for (let i = 0; i < RAYS; i++) {
                    ctx.rotate(Math.PI * 2 / RAYS); const g = ctx.createLinearGradient(0, 0, len, 0);
                    g.addColorStop(0, 'rgba(255,236,170,' + (0.32 * ra) + ')'); g.addColorStop(1, 'rgba(255,236,170,0)');
                    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -6 * dpr); ctx.lineTo(len, -1.5 * dpr); ctx.lineTo(len, 1.5 * dpr); ctx.lineTo(0, 6 * dpr); ctx.fill();
                }
                ctx.restore();
            }
            ctx.globalCompositeOperation = 'lighter';
            let alive = 0;
            for (const p of P) {
                const lt = t - p.d; if (lt < 0) { alive++; continue; } if (lt > p.life) continue; alive++;
                const k = lt / 16; const x = p.x + p.vx * k * 16 * (1 - lt / (p.life * 2.2)), y = p.y + p.vy * k * 16 + 0.00004 * lt * lt * dpr;
                const al = 1 - lt / p.life; ctx.globalAlpha = al; ctx.fillStyle = p.c;
                ctx.beginPath(); ctx.arc(x, y, p.s * (0.6 + al * 0.6), 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            if (t < BURST_MS && alive) c.raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
        };
        c.raf = requestAnimationFrame(frame);
    }

    function countUp(c, el, total) {
        const core = C(), t0 = performance.now();
        const step = now => {
            if (c.dead) return; const v = core ? core.countAt(now - t0, total, COUNT_MS) : total;
            el.textContent = '+' + v; if (now - t0 < COUNT_MS) requestAnimationFrame(step); else { el.textContent = '+' + total; el.classList.add('mf-pop'); }
        };
        requestAnimationFrame(step);
        /* the final number lands even when frames are throttled (low power, background) */
        setTimeout(() => { if (!c.dead && el.textContent !== '+' + total) { el.textContent = '+' + total; el.classList.add('mf-pop'); } }, COUNT_MS + 250);
    }

    /* o: {min, xp, complete?, lang?, voice?, onClose?} -> the overlay element (null when there is nothing to celebrate) */
    function celebrate(o) {
        o = o || {}; const core = C(); if (!core) return null;
        const min = Math.max(0, Math.floor(+o.min || 0)), xp = Math.max(0, Math.floor(+o.xp || 0));
        if (!(core.counts ? core.counts(min, o.complete) : min >= core.MIN_MIN)) return null;
        if (cur) close('replaced');
        const comp = companion(), rm = reduced(), pick = Math.floor(Math.random() * 3);
        const w = core.words({ lang: o.lang || lang(), min, xp, name: comp.name, pick, complete: !!o.complete });
        const el = D.createElement('div');
        el.className = 'mf-celebrate' + (rm ? ' mf-rm' : '') + (xp ? '' : ' mf-capped');
        el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', w.dialog);
        el.setAttribute('data-noi18n', ''); el.setAttribute('lang', w.lang);
        el.style.setProperty('--mf-a', comp.a); el.style.setProperty('--mf-b', comp.b);
        el.innerHTML = '<canvas class="mf-cv" aria-hidden="true"></canvas><div class="mf-halo" aria-hidden="true"></div>' +
            '<div class="mf-card">' +
            '<div class="mf-art" aria-hidden="true"><span class="mf-ring"></span><span class="mf-ring mf-ring2"></span><div class="mf-comp">' + comp.art + '</div></div>' +
            '<h2 class="mf-title">' + esc(w.title) + '</h2>' +
            (w.glow ? '<p class="mf-glow">' + esc(w.glow) + '</p>' : '') +
            (xp ? '<div class="mf-xp"><b class="mf-num">+' + (rm ? xp : 0) + '</b><span>' + esc(w.xpWord) + '</span></div>' : '') +
            '<div class="mf-chips"><span class="mf-chip">' + esc(w.minutes) + '</span></div>' +
            (w.note ? '<p class="mf-note">' + esc(w.note) + '</p>' : '') +
            '<button type="button" class="mf-go">' + esc(w.more) + '</button>' +
            '<p class="mf-tap" aria-hidden="true">' + esc(w.tap) + '</p>' +
            '<p class="mf-sr" aria-live="assertive"></p></div>';
        const c = cur = { el, dead: false, raf: 0, tm: 0, at: Date.now(), onClose: o.onClose, prevFocus: D.activeElement, words: w };
        el.addEventListener('click', e => { if (Date.now() - c.at < GUARD_MS) { e.preventDefault(); e.stopPropagation(); return; } e.preventDefault(); e.stopPropagation(); close(e.target.closest && e.target.closest('.mf-go') ? 'button' : 'tap'); });
        ['pointerdown', 'touchstart', 'touchend', 'pointerup'].forEach(t => el.addEventListener(t, e => e.stopPropagation(), { passive: true }));
        c.onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close('escape'); } else if (e.key === 'Tab') { e.preventDefault(); const b = el.querySelector('.mf-go'); if (b) b.focus(); } };
        D.addEventListener('keydown', c.onKey, true);
        D.body.appendChild(el);
        void el.offsetWidth; el.classList.add('mf-in'); /* a reflow, not a frame: a throttled or paused rAF must never leave it invisible */
        const go = el.querySelector('.mf-go'); setTimeout(() => { try { if (!c.dead && go) go.focus({ preventScroll: true }); } catch (e) { } }, 60);
        const sr = el.querySelector('.mf-sr'); setTimeout(() => { if (!c.dead && sr) sr.textContent = [w.title, w.glow, xp ? '+' + xp + ' ' + w.xpWord : '', w.minutes, w.note].filter(Boolean).join('. '); }, 120);
        if (!rm) {
            burst(c, el.querySelector('.mf-cv'), comp.a, comp.b);
            const num = el.querySelector('.mf-num'); if (num) c.tm = setTimeout(() => countUp(c, num, xp), 380);
        }
        try { if (navigator.vibrate) navigator.vibrate(rm ? 20 : [30, 40, 60, 40, 90]); } catch (e) { }
        if (o.voice) { try { if (W.LowiVoice && !(W.LowiAudio && LowiAudio.muted && LowiAudio.muted())) setTimeout(() => { if (!c.dead) LowiVoice.speak(w.say, { lang: w.lang, queue: false }); }, 500); } catch (e) { } }
        return el;
    }

    W.LowiMoveFinish = { celebrate, close, open: () => !!cur, current: () => cur && { words: cur.words } };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
