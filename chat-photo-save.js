/* LOWiSPIKE · save a chat photo (7 Nov 2026, Emmanuel: "if you long press, then that you can save the image, and that should be done
   for, to be honest, every image inside of the chat room. Long press and save the image").
   A long press (HOLD_MS, finger still) on any picture inside a chat bubble shows one small button over it: Save photo. A tap on it
   hands the picture to the phone's share sheet (iPhone: "Save Image"; it may only open from a tap, so the hold alone cannot), or,
   where the phone cannot share files, shows the picture big so a long press there saves it the phone's own way; on a computer it
   downloads. The click that ends the hold never opens the photo viewer. Tap elsewhere, scroll or Escape closes the button. */
(function (W) {
    'use strict';
    const HOLD_MS = 480, SLOP = 10;
    const SEL = '#cmPaneChat .cm-bub img';
    /* pure: a file name for a saved picture, from its link and the day */
    function fileName(src, now) {
        const ext = (/\.(png|webp|jpe?g)(?:[?#]|$)/i.exec(String(src || '')) || [, 'jpg'])[1].toLowerCase().replace('jpeg', 'jpg');
        const d = new Date(+now || Date.now()), p = n => (n < 10 ? '0' : '') + n;
        return 'lowispike-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.' + ext;
    }
    const api = { HOLD_MS, SLOP, SEL, fileName };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!W || !W.document || W.LowiChatPhotoSave) return;
    const D = W.document;
    const li = () => { let l = ''; try { l = W.LowiLang && W.LowiLang.get ? W.LowiLang.get() : D.documentElement.lang; } catch (e) { l = ''; } l = String(l || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    const T = (en, de, es) => [en, de, es][li()];
    const standalone = () => { try { return !!(W.navigator.standalone || (W.matchMedia && W.matchMedia('(display-mode: standalone)').matches)); } catch (e) { return false; } };
    let hold = null, pill = null, swallow = null, busy = false, view = null;
    function closePill() { const p = pill; pill = null; if (p) { p.classList.remove('on'); setTimeout(() => { try { p.remove(); } catch (e) { } }, 150); } }
    function closeView() { const v = view; view = null; if (v) { try { v.remove(); } catch (e) { } } }
    function showPill(img) {
        closePill();
        const src = img.currentSrc || img.src; if (!src) return;
        const b = D.createElement('button'); b.type = 'button'; b.className = 'cps-pill';
        b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
        b.querySelector('span').textContent = T('Save photo', 'Foto sichern', 'Guardar foto');
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); closePill(); save(src); });
        D.body.appendChild(b); pill = b;
        const r = img.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, vw = D.documentElement.clientWidth || W.innerWidth, vh = W.innerHeight;
        b.style.left = Math.round(Math.max(10, Math.min(vw - w - 10, r.left + r.width / 2 - w / 2))) + 'px';
        b.style.top = Math.round(Math.max(10, Math.min(vh - h - 90, r.top + r.height / 2 - h / 2))) + 'px';
        requestAnimationFrame(() => { if (pill === b) b.classList.add('on'); });
        try { b.focus({ preventScroll: true }); } catch (e) { }
        try { if (W.navigator.vibrate) W.navigator.vibrate(10); } catch (e) { }
    }
    /* the picture big, so the phone's own long press can save it (iPhone Home Screen app without file sharing) */
    function bigView(src) {
        closeView();
        const v = D.createElement('div'); v.className = 'cps-view'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
        v.innerHTML = '<img alt=""><p></p><button type="button" class="cps-x"></button>';
        v.querySelector('img').src = src;
        v.querySelector('p').textContent = T('Hold the photo to save it', 'Halte das Foto gedrückt, um es zu sichern', 'Mantén pulsada la foto para guardarla');
        const x = v.querySelector('.cps-x'); x.textContent = '×'; x.setAttribute('aria-label', T('Close', 'Schließen', 'Cerrar'));
        x.addEventListener('click', e => { e.stopPropagation(); closeView(); });
        D.body.appendChild(v); view = v;
    }
    async function save(src) {
        if (busy) return; busy = true;
        try {
            let blob = null;
            try { const r = await fetch(src, { mode: 'cors', cache: 'force-cache' }); if (r.ok) blob = await r.blob(); } catch (e) { blob = null; }
            if (blob) {
                const f = new File([blob], fileName(src), { type: blob.type || 'image/jpeg' });
                let ok = false; try { ok = !!(W.navigator.canShare && W.navigator.share && W.navigator.canShare({ files: [f] })); } catch (e) { ok = false; }
                if (ok) { try { await W.navigator.share({ files: [f] }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
                if (!standalone()) { const a = D.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; D.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); return; }
            }
            bigView(src);   /* never a download in the Home Screen app: it would leave the app */
        } finally { busy = false; }
    }
    function cancel() { if (hold) { clearTimeout(hold.t); hold = null; } }
    D.addEventListener('pointerdown', e => {
        if (pill && !(e.target && pill.contains(e.target))) closePill();
        if (e.isPrimary === false) { cancel(); return; }
        const img = e.target && e.target.closest && e.target.closest(SEL);
        if (!img || (e.button && e.button !== 0)) return;
        cancel();
        hold = { img, x: e.clientX, y: e.clientY, t: setTimeout(() => { const i = hold && hold.img; hold = null; if (!i) return; swallow = { until: Date.now() + 900 }; showPill(i); }, HOLD_MS) };
    }, true);
    D.addEventListener('pointermove', e => { if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > SLOP) cancel(); }, true);
    ['pointerup', 'pointercancel'].forEach(n => D.addEventListener(n, cancel, true));
    /* the click that ends the hold opens neither the photo viewer nor the message menu */
    W.addEventListener('click', e => {
        if (!swallow || Date.now() > swallow.until) { swallow = null; return; }
        if (pill && e.target && pill.contains(e.target)) return;
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        swallow = null;
    }, true);
    D.addEventListener('contextmenu', e => { const img = e.target && e.target.closest && e.target.closest(SEL); if (img) { e.preventDefault(); showPill(img); } }, true);
    D.addEventListener('keydown', e => { if (e.key === 'Escape') { closePill(); closeView(); } });
    D.addEventListener('scroll', () => { cancel(); closePill(); }, true);
    W.LowiChatPhotoSave = Object.assign({}, api, { save, showPill, close: () => { closePill(); closeView(); } });
})(typeof window !== 'undefined' ? window : null);
