/* Nov 5 2026, Still galaxy, the browser part (pure part, words and storage layout: galaxy-still-core.js).

   Owner: "an optional Settings battery-save mode that turns active galaxy exploration into a beautiful static background, not an
   animated screensaver", then: hold Community to open Settings, switch it on, go back Home, zoom and frame the galaxy while the
   interface stays on screen, tap Save in the corner, and that exact view becomes the background.

   Flow:
   - Settings > Still galaxy (community-me.js row) while it is off: Settings closes, Home opens with the live galaxy and a small bar
     at the top (Cancel, a one-line hint, Save in the corner). Everything else on Home stays where it is and works.
   - Save: LowiWorld3D.stillShot() draws the view once without the companion's 3D sprite and copies it (before anything is released),
     the picture is stored (IndexedDB full size + a small copy in localStorage), painted behind the app, and only then
     LowiWorld3D.release('still') lets the world go: frame loop stopped, input listeners off, every geometry, material and texture
     disposed, graphics context given up, canvas removed. Home then uses its own calm layout (the one without the 3D world) with the
     companion as Home shows her, so she stays visible at her usual size whatever the zoom of the picture.
   - Next launches: this file runs in <head>, before body-world-3d.js, so the world is never built (worldAtLaunch 'off'); the small
     copy paints at once and the full picture replaces it when IndexedDB answers. A picture the browser dropped falls back to the small
     copy, then to the plain calm background, and Settings says the picture is missing.
   - Settings > Still galaxy while it is on: a sheet with Choose a new view (one reload with the live world, then the bar again),
     Explore the galaxy again (everything stored is removed, one reload with the live world) and Keep it still.
   A reload is the restart on purpose: the world is built fresh the way the app always builds it, not stitched back together. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement, C = W.LowiGalaxyStillCore;
    if (!C || W.LowiGalaxyStill) return;
    const ls = (() => { try { return W.localStorage; } catch (e) { return null; } })();
    const ss = (() => { try { return W.sessionStorage; } catch (e) { return null; } })();
    const get = (s, k) => { try { return s ? s.getItem(k) : null; } catch (e) { return null; } };
    const set = (s, k, v) => { try { s.setItem(k, v); return true; } catch (e) { return false; } };
    const del = (s, k) => { try { s.removeItem(k); } catch (e) { } };
    const lang = () => { const l = (H.lang || 'en').slice(0, 2); return C.TX[l] ? l : 'en'; };

    let saved = C.parse(get(ls, C.KEY));
    const framingLaunch = get(ss, C.FRAME_KEY) === '1';
    if (framingLaunch) del(ss, C.FRAME_KEY);   /* one launch only: a crash or a reload after this one keeps the still background */
    const st = { shown: 'plain', url: '', bar: null, busy: false, back: null };

    /* ---------- the background ---------- */
    function backEl() {
        if (st.back && st.back.isConnected) return st.back;
        const b = D.getElementById('gsBack') || D.createElement('div'); b.id = 'gsBack'; b.setAttribute('aria-hidden', 'true');
        const app = D.getElementById('app'), main = D.getElementById('main');
        if (app && main && main.parentElement === app) app.insertBefore(b, main); else if (D.body) D.body.insertBefore(b, D.body.firstChild);
        st.back = b; return b;
    }
    function paint(url, kind) {
        if (st.url && st.url.startsWith('blob:') && st.url !== url) { try { URL.revokeObjectURL(st.url); } catch (e) { } }
        st.url = url || ''; st.shown = url ? kind : 'plain';
        H.classList.add('gs-on'); H.classList.toggle('gs-pic', !!url);
        const put = () => { if (!H.classList.contains('gs-on')) return; const b = backEl(), u = st.url; b.style.backgroundImage = u ? 'url("' + u + '")' : ''; };
        if (D.body) put(); else D.addEventListener('DOMContentLoaded', put, { once: true });
    }
    function unpaint() {
        H.classList.remove('gs-on', 'gs-pic');
        if (st.back) { st.back.remove(); st.back = null; }
        if (st.url && st.url.startsWith('blob:')) { try { URL.revokeObjectURL(st.url); } catch (e) { } }
        st.url = ''; st.shown = 'plain';
    }

    /* ---------- storage ---------- */
    function db() {
        return new Promise((res, rej) => {
            if (!W.indexedDB) { rej(new Error('no-idb')); return; }
            let r; try { r = W.indexedDB.open(C.DB, 1); } catch (e) { rej(e); return; }
            r.onupgradeneeded = () => { try { r.result.createObjectStore(C.STORE); } catch (e) { } };
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || new Error('idb-open')); r.onblocked = () => rej(new Error('idb-blocked'));
        });
    }
    function idb(mode, fn) {
        return db().then(d => new Promise((res, rej) => {
            let out; const tx = d.transaction(C.STORE, mode), s = tx.objectStore(C.STORE);
            const q = fn(s); if (q) q.onsuccess = () => { out = q.result; };
            tx.oncomplete = () => { d.close(); res(out); }; tx.onerror = tx.onabort = () => { d.close(); rej(tx.error || new Error('idb-tx')); };
        }));
    }
    const putPic = rec => idb('readwrite', s => s.put(rec, C.PIC)).then(() => true, () => false);
    const getPic = () => idb('readonly', s => s.get(C.PIC)).then(r => (r && r.blob ? r : null), () => null);
    const dropPic = () => idb('readwrite', s => s.delete(C.PIC)).catch(() => { });
    const blobOf = (cv, q) => new Promise(res => { try { cv.toBlob(b => res(b || null), 'image/jpeg', q); } catch (e) { res(null); } });
    function thumbOf(cv) {
        try {
            const k = Math.min(1, C.THUMB_W / cv.width), t = D.createElement('canvas');
            t.width = Math.max(1, Math.round(cv.width * k)); t.height = Math.max(1, Math.round(cv.height * k));
            t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height);
            return t.toDataURL('image/jpeg', 0.72);
        } catch (e) { return ''; }
    }
    /* one flat colour is no picture (a canvas the browser had already cleared): nothing is saved then */
    function blank(cv) {
        try {
            const x = cv.getContext('2d'), w = cv.width, h = cv.height, d = x.getImageData(0, 0, w, h).data, step = Math.max(4, Math.floor(d.length / 4 / 4000)) * 4;
            for (let i = step; i < d.length; i += step) if (Math.abs(d[i] - d[0]) + Math.abs(d[i + 1] - d[1]) + Math.abs(d[i + 2] - d[2]) > 6) return false;
            return true;
        } catch (e) { return false; }
    }
    const decoded = url => new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = url; if (i.decode) i.decode().then(() => res(true), () => { }); });

    /* ---------- launch: paint what was saved (before the world would have started) ---------- */
    function launchPaint() {
        const th = get(ls, C.THUMB_KEY);
        paint(th || '', th ? 'thumb' : 'plain');
        getPic().then(r => {
            if (!saved || !H.classList.contains('gs-on')) return;
            if (r) { const u = URL.createObjectURL(r.blob); decoded(u).then(ok => { if (ok && saved) paint(u, 'full'); else { try { URL.revokeObjectURL(u); } catch (e) { } } }); }
        });
    }
    if (saved && !framingLaunch) launchPaint();

    /* ---------- the framing bar ---------- */
    const w3 = () => W.LowiWorld3D;
    function toast(m) { try { if (W.LowiR2 && W.LowiR2.toast) { W.LowiR2.toast(m); return; } } catch (e) { } try { if (typeof W.toast === 'function') W.toast(m); } catch (e) { } }
    function goHome() { try { if (typeof W.lowiOpen === 'function') W.lowiOpen('home'); else if (typeof W.goTab === 'function') W.goTab('home'); } catch (e) { } }
    function whenReady(ms) {
        return new Promise(res => {
            const t0 = Date.now();
            (function poll() { const a = w3(); if (a && a.state === 'ready' && !a.lost) { res(true); return; } if (!a || a.state === 'fallback' || Date.now() - t0 > ms) { res(false); return; } setTimeout(poll, 250); })();
        });
    }
    function bar() {
        if (st.bar) return st.bar;
        const l = lang(), b = D.createElement('div');
        b.className = 'gs-bar'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', C.t(l, 'row')); b.setAttribute('data-noi18n', '');
        b.innerHTML = '<button type="button" class="gs-btn gs-cancel" data-gs="cancel">' + C.t(l, 'cancel') + '</button><p class="gs-hint">' + C.t(l, 'hint') + '</p><button type="button" class="gs-btn gs-save" data-gs="save">' + C.t(l, 'save') + '</button>';
        b.addEventListener('click', e => { const k = e.target.closest('[data-gs]'); if (!k) return; e.preventDefault(); e.stopPropagation(); if (k.dataset.gs === 'save') save(); else cancel(); });
        D.body.appendChild(b); H.classList.add('gs-framing');
        st.bar = b; return b;
    }
    function hideBar() { if (st.bar) { st.bar.remove(); st.bar = null; } H.classList.remove('gs-framing'); }
    function startFraming() {
        goHome();
        return whenReady(9000).then(ok => {
            if (!ok) { toast(C.t(lang(), 'no3d')); if (saved) launchPaint(); return false; }
            bar(); try { st.bar.querySelector('.gs-save').focus({ preventScroll: true }); } catch (e) { }
            return true;
        });
    }
    function cancel() {
        hideBar();
        if (saved) { launchPaint(); setTimeout(() => { try { w3() && w3().release('still'); } catch (e) { } }, 0); }   /* choosing a new view was called off: the old picture stays */
    }
    function save() {
        if (st.busy) return; st.busy = true;
        const a = w3(), l = lang(), btn = st.bar && st.bar.querySelector('.gs-save');
        if (btn) btn.disabled = true;
        st.t0 = Date.now();
        const shot = a && a.stillShot ? a.stillShot(C.FULL_MAX) : null;   /* the picture first, while the world is still whole */
        if (!shot || blank(shot.canvas)) { st.busy = false; if (btn) btn.disabled = false; toast(C.t(l, 'fail')); return Promise.resolve(false); }
        const cv = shot.canvas, thumb = thumbOf(cv);
        return blobOf(cv, 0.9).then(blob => {
            const thumbOk = !!thumb && set(ls, C.THUMB_KEY, thumb);
            if (!thumbOk) del(ls, C.THUMB_KEY);
            return (blob ? putPic({ blob, at: Date.now(), w: cv.width, h: cv.height }) : Promise.resolve(false)).then(idbOk => {
                const rec = C.record({ w: cv.width, h: cv.height, pic: C.storedAs(idbOk, thumbOk) });
                const ok = set(ls, C.KEY, JSON.stringify(rec));
                saved = ok ? rec : null;
                const url = idbOk && blob ? URL.createObjectURL(blob) : thumbOk ? thumb : '';
                return (url ? decoded(url) : Promise.resolve(true)).then(() => {
                    hideBar();
                    paint(url, idbOk ? 'full' : thumbOk ? 'thumb' : 'plain');
                    /* only now, with the picture on screen, is the world let go */
                    let freed = null; try { freed = a.release('still'); } catch (e) { }
                    st.lastRelease = freed; st.ms = Date.now() - st.t0;
                    st.busy = false;
                    toast(ok ? C.savedText(rec.pic, l) : C.t(l, 'savedNone'));
                    try { W.dispatchEvent(new CustomEvent('lowi:galaxy-still', { detail: { on: true, pic: rec.pic } })); } catch (e) { }
                    return true;
                });
            });
        }).catch(() => { st.busy = false; if (btn) btn.disabled = false; toast(C.t(l, 'fail')); return false; });
    }

    /* ---------- turning it off / choosing again ---------- */
    function clearAll() { del(ls, C.KEY); del(ls, C.THUMB_KEY); saved = null; return dropPic(); }
    function reload() { try { W.location.reload(); } catch (e) { } }
    function reframe() { set(ss, C.FRAME_KEY, '1'); reload(); }
    function explore() { return clearAll().then(() => { unpaint(); reload(); }); }
    function onSheet(back) {
        const l = lang(), R2 = W.LowiR2;
        if (!R2 || typeof R2.sheet !== 'function') { reframe(); return; }
        const ov = R2.sheet('<div class="gs-sheet" data-noi18n><h2>' + C.t(l, 'title') + '</h2><p>' + C.t(l, 'body') + '</p>' +
            '<button type="button" class="gs-opt" data-gso="reframe">' + C.t(l, 'reframe') + '</button>' +
            '<button type="button" class="gs-opt" data-gso="explore">' + C.t(l, 'explore') + '</button>' +
            '<button type="button" class="gs-opt gs-keep" data-gso="keep">' + C.t(l, 'keep') + '</button></div>', { cls: 'gs-ov', onClose: () => { if (!ov.__gsGo && typeof back === 'function') back(); } });
        ov.addEventListener('click', e => {
            const k = e.target.closest('[data-gso]'); if (!k) return;
            const go = k.dataset.gso; ov.__gsGo = go !== 'keep';
            try { R2.close(ov); } catch (e2) { }
            if (go === 'reframe') reframe(); else if (go === 'explore') explore(); else if (typeof back === 'function') back();
        });
    }

    const api = {
        worldAtLaunch: () => C.worldAtLaunch(saved, framingLaunch),
        on: () => !!saved,
        shown: () => st.shown,
        missing: () => !!saved && saved.pic !== 'none' && st.shown === 'plain' && H.classList.contains('gs-on'),
        available: () => { if (saved) return true; const a = w3(); return !(a && a.state === 'fallback'); },
        label: l => C.t(l || lang(), 'row'), sub: l => C.t(l || lang(), 'sub'),
        status: l => { l = l || lang(); return !saved ? C.t(l, 'off') : api.missing() ? C.t(l, 'missing') : C.t(l, 'on'); },
        tap: o => { const back = o && o.back; if (saved) onSheet(back); else startFraming(); },
        startFraming, save, cancel, explore, reframe,
        lastRelease: () => st.lastRelease || null,
        busy: () => st.busy, saveMs: () => st.ms || 0
    };
    W.LowiGalaxyStill = api;
    /* the one launch that was asked for to choose a new view: the bar comes up once the live world is there */
    if (saved && framingLaunch) { const go = () => setTimeout(startFraming, 600); if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', go, { once: true }); else go(); }
})();
