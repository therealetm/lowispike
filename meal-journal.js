/* Meal journal (Oct 22, Seven: "When the meal is logged, it should save the picture, and also the estimate they received. It should
   also give them an option to share into the community.")
   - Save: a photo meal keeps its photo (about 1024 px JPEG) on this device in IndexedDB 'lowi-meal-photos', keyed by the log id, and a
     small thumbnail on the log itself (log.photo). The full estimate it received (dish, foods, nutrition, spike, note) is log.ai.
     Typed meals keep their estimate (log.est / log.macros / log.lvl) as before. Photos are private: they never leave the phone
     unless the user shares that one meal. Deleting the account wipes the database (home-settings-sleep-v2.js wipeDevice).
   - Show: open(id) shows the photo with its saved estimate; Delete removes the meal (LowiVitalsBridge.deleteMeal) and its photo.
   - Share: share(id) is opt-in every time: a preview card, an optional caption, then Post. It posts only the photo, the dish name
     and the spike rating to the Community room (LowiCommunity.shareMeal). Never weight or other health data.
   The pure parts (estimate, levels, strings) run in node tests (tests/meal-journal.test.cjs). */
(function (root) {
    'use strict';
    const DB = 'lowi-meal-photos', ST = 'photos', FULL = 1024, THUMB = 160;
    const STR = {
        en: {
            title: 'Your meal', share: 'Share to Community', shareT: 'Share this meal', del: 'Delete meal', delQ: 'Delete this meal and its photo?',
            delS: 'The XP it earned goes with it.', keep: 'Keep', delGo: 'Delete', deleted: 'Meal deleted', post: 'Post to Community',
            cap: 'Caption (optional)', capPh: 'Say something about it', foot: 'Only this meal is shared: the photo, its name and the spike rating. Never your weight or other health data.',
            posting: 'Posting…', posted: 'Shared to Community', noPhoto: 'This meal has no photo to share.', signin: 'Sign in to share in Community.',
            name: 'Pick a nickname in Community first.', offline: 'You are offline. Try again when you are back online.', failed: 'Could not share it. Try again.',
            low: 'Low spike', mid: 'Medium spike', high: 'Likely spike', bs: 'Blood sugar', ing: 'Foods', est: 'Estimate from your photo. Not medical advice.',
            photoOnly: 'Photo saved on this phone only', open: 'Open meal', kcal: 'kcal', carbs: 'Carbs', protein: 'Protein', fiber: 'Fiber', sugar: 'Sugar', fat: 'Fat',
            saved: 'Photo and estimate saved with your meal.'
        },
        de: {
            title: 'Deine Mahlzeit', share: 'In der Community teilen', shareT: 'Diese Mahlzeit teilen', del: 'Mahlzeit löschen', delQ: 'Diese Mahlzeit und ihr Foto löschen?',
            delS: 'Die XP dafür werden mit entfernt.', keep: 'Behalten', delGo: 'Löschen', deleted: 'Mahlzeit gelöscht', post: 'In der Community posten',
            cap: 'Text (optional)', capPh: 'Schreib etwas dazu', foot: 'Geteilt wird nur diese Mahlzeit: das Foto, ihr Name und die Spike-Einschätzung. Nie dein Gewicht oder andere Gesundheitsdaten.',
            posting: 'Wird gepostet…', posted: 'In der Community geteilt', noPhoto: 'Diese Mahlzeit hat kein Foto zum Teilen.', signin: 'Melde dich an, um in der Community zu teilen.',
            name: 'Wähle zuerst einen Spitznamen in der Community.', offline: 'Du bist offline. Versuch es wieder, wenn du online bist.', failed: 'Teilen hat nicht geklappt. Versuch es noch einmal.',
            low: 'Kleiner Spike', mid: 'Mittlerer Spike', high: 'Wahrscheinlich Spike', bs: 'Blutzucker', ing: 'Lebensmittel', est: 'Schätzung aus deinem Foto. Keine medizinische Beratung.',
            photoOnly: 'Foto nur auf diesem Handy gespeichert', open: 'Mahlzeit öffnen', kcal: 'kcal', carbs: 'Kohlenhydrate', protein: 'Eiweiß', fiber: 'Ballaststoffe', sugar: 'Zucker', fat: 'Fett',
            saved: 'Foto und Schätzung sind bei deiner Mahlzeit gespeichert.'
        },
        es: {
            title: 'Tu comida', share: 'Compartir en la Comunidad', shareT: 'Compartir esta comida', del: 'Borrar comida', delQ: '¿Borrar esta comida y su foto?',
            delS: 'La XP que ganaste con ella también se quita.', keep: 'Conservar', delGo: 'Borrar', deleted: 'Comida borrada', post: 'Publicar en la Comunidad',
            cap: 'Texto (opcional)', capPh: 'Escribe algo sobre ella', foot: 'Solo se comparte esta comida: la foto, su nombre y la estimación del pico. Nunca tu peso ni otros datos de salud.',
            posting: 'Publicando…', posted: 'Compartida en la Comunidad', noPhoto: 'Esta comida no tiene foto para compartir.', signin: 'Inicia sesión para compartir en la Comunidad.',
            name: 'Elige primero un apodo en la Comunidad.', offline: 'No tienes conexión. Inténtalo cuando vuelvas a estar en línea.', failed: 'No se pudo compartir. Inténtalo de nuevo.',
            low: 'Pico bajo', mid: 'Pico medio', high: 'Pico probable', bs: 'Azúcar en sangre', ing: 'Alimentos', est: 'Estimación a partir de tu foto. No es consejo médico.',
            photoOnly: 'Foto guardada solo en este teléfono', open: 'Abrir comida', kcal: 'kcal', carbs: 'Carbohidratos', protein: 'Proteína', fiber: 'Fibra', sugar: 'Azúcar', fat: 'Grasa',
            saved: 'La foto y la estimación se guardaron con tu comida.'
        }
    };
    const KEYS = ['kcal', 'carbs', 'protein', 'fiber', 'sugar', 'fat'];
    const doc = () => root.document || null;
    function lang() { const d = doc(); const l = String(d && d.documentElement && d.documentElement.lang || 'en').slice(0, 2).toLowerCase(); return STR[l] ? l : 'en'; }
    function t(k, l) { const L = STR[l || lang()] || STR.en; return L[k] != null ? L[k] : STR.en[k]; }
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const str = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
    const num = (v, max) => { const x = +v; return Number.isFinite(x) && x > 0 ? Math.min(max, Math.round(x * 10) / 10) : 0; };

    /* ---------- pure: the estimate a meal keeps, and its spike level ---------- */
    // src: LowiMealSnap.meal() shape ({name, items:[{name, portion}], total, bs}) plus note/low/lvl -> what log.ai keeps
    function estimate(src, extra) {
        src = src && typeof src === 'object' ? src : {}; extra = extra && typeof extra === 'object' ? extra : {};
        const raw = Array.isArray(src.items) ? src.items : Array.isArray(src.dishes) ? src.dishes : [];
        const items = raw.map(d => d && typeof d === 'object' ? { name: str(d.name, 60), portion: str(d.portion, 40) } : null).filter(d => d && d.name).slice(0, 12);
        const tot = src.total && typeof src.total === 'object' ? src.total : {};
        const total = {}; for (const k of KEYS) total[k] = k === 'kcal' ? Math.round(num(tot[k], 5000)) : num(tot[k], 500);
        const name = str(src.name, 100) || items.map(d => d.name).join(', ').slice(0, 100);
        if (!name && !items.length) return null;
        const out = { v: 1, name, items, total };
        const bs = level(extra.lvl || src.lvl || src.bs); if (bs) out.bs = bs;
        const note = str(extra.note != null ? extra.note : src.note, 160); if (note) out.note = note;
        if (extra.low || src.low) out.low = true;
        out.ts = Date.now();
        return out;
    }
    // any spike word the app uses -> low | mid | high ('' when unknown)
    function level(v) { const s = String(v || '').toLowerCase(); return s === 'low' ? 'low' : s === 'mid' || s === 'medium' ? 'mid' : s === 'high' ? 'high' : ''; }
    function levelOf(log) { return log ? (level(log.lvl) || level(log.ai && log.ai.bs)) : ''; }
    // what a share carries: never weight, macros, goals or anything else, only this meal's photo, name, spike rating and the caption typed
    function shareOf(log, caption) {
        if (!log) return null;
        const name = str(log.ai && log.ai.name || log.t, 80), lvl = levelOf(log);
        if (!name || !lvl) return null;
        return { name, lvl, caption: str(caption, 140) };
    }

    /* ---------- device photo store (IndexedDB) ---------- */
    let dbp = null;
    function idb() {
        if (dbp) return dbp;
        dbp = new Promise((res, rej) => {
            const I = root.indexedDB; if (!I) return rej(new Error('no-idb'));
            let rq; try { rq = I.open(DB, 1); } catch (e) { return rej(e); }
            rq.onupgradeneeded = () => { try { rq.result.createObjectStore(ST); } catch (e) {} };
            rq.onsuccess = () => { const d = rq.result; d.onversionchange = () => { try { d.close(); } catch (e) {} dbp = null; }; res(d); };
            rq.onerror = () => rej(rq.error || new Error('idb'));
            rq.onblocked = () => rej(new Error('blocked'));
        }).catch(e => { dbp = null; throw e; });
        return dbp;
    }
    function tx(mode, fn) { return idb().then(d => new Promise((res, rej) => { const x = d.transaction(ST, mode), s = x.objectStore(ST); let out; try { out = fn(s); } catch (e) { return rej(e); } x.oncomplete = () => res(out && 'result' in out ? out.result : undefined); x.onerror = x.onabort = () => rej(x.error || new Error('tx')); })); }
    /* bytes, not a Blob: Blobs inside IndexedDB are unreliable on some WebKit builds; an ArrayBuffer always stores */
    const putPhoto = (id, blob) => blob.arrayBuffer().then(buf => tx('readwrite', s => s.put({ buf, type: blob.type || 'image/jpeg', ts: Date.now() }, String(id))));
    const getPhoto = id => tx('readonly', s => s.get(String(id))).then(v => v && v.buf ? new Blob([v.buf], { type: v.type || 'image/jpeg' }) : null).catch(() => null);
    const delPhoto = id => tx('readwrite', s => s.delete(String(id))).catch(() => {});

    /* ---------- pictures: one JPEG at most `max` px on its longest side ---------- */
    function load(src) {
        return new Promise((res, rej) => {
            const I = root.Image; if (!I || !src) return rej(new Error('bad'));
            let url = '', own = false;
            if (typeof src === 'string') url = src; else { try { url = URL.createObjectURL(src); own = true; } catch (e) { return rej(e); } }
            const img = new I();
            img.onload = () => { res({ img, done: () => { if (own) try { URL.revokeObjectURL(url); } catch (e) {} } }); };
            img.onerror = () => { if (own) try { URL.revokeObjectURL(url); } catch (e) {} rej(new Error('bad')); };
            img.src = url;
        });
    }
    function draw(img, max) {
        const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height; if (!w0 || !h0) throw new Error('bad');
        const k = Math.min(1, max / Math.max(w0, h0)), c = doc().createElement('canvas');
        c.width = Math.max(1, Math.round(w0 * k)); c.height = Math.max(1, Math.round(h0 * k));
        const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        return c;
    }
    // -> {blob (about 1024 px JPEG), thumb (160 px data URL)}
    async function pictures(src) {
        const { img, done } = await load(src);
        try {
            const c = draw(img, FULL), tc = draw(c, THUMB), thumb = tc.toDataURL('image/jpeg', .62); tc.width = tc.height = 0;
            const blob = await new Promise(r => c.toBlob(b => { c.width = c.height = 0; r(b); }, 'image/jpeg', .8));
            return { blob, thumb };
        } finally { done(); }
    }
    function blobOf(dataURL) {
        const m = /^data:([^;,]+);base64,(.*)$/.exec(String(dataURL || '')); if (!m) return null;
        try { const b = atob(m[2]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: m[1] }); } catch (e) { return null; }
    }
    // spirit.js finishMeal: the thumbnail for the log (synchronous enough to go in the seed) and the full photo once the id is known
    async function prepare(src) { try { return await pictures(src); } catch (e) { return null; } }
    async function keep(id, pic) { if (!id || !pic || !pic.blob) return false; try { await putPhoto(id, pic.blob); return true; } catch (e) { return false; } }

    /* ---------- the logs ---------- */
    const VB = () => root.LowiVitalsBridge || null;
    function logOf(id) { const v = VB(), s = v && v.state && v.state(); const logs = s && Array.isArray(s.logs) ? s.logs : []; return logs.find(l => l && (l.id === id || l.eventId === id)) || null; }
    async function photoURL(log) {
        if (!log) return '';
        const b = await getPhoto(log.id);
        if (b) { try { return URL.createObjectURL(b); } catch (e) {} }
        return /^data:image\//.test(String(log.photo || '')) ? log.photo : '';
    }
    async function photoBlob(log) { if (!log) return null; const b = await getPhoto(log.id); return b || blobOf(log.photo); }

    /* ---------- UI ---------- */
    const R = () => root.LowiR2 || null;
    function toast(m) { try { const r = R(); if (r && r.toast) r.toast(m); } catch (e) {} }
    function chip(lvl, l) { return lvl ? '<span class="mj-bs mj-bs-' + lvl + '"><i aria-hidden="true"></i>' + esc(t(lvl, l)) + '</span>' : ''; }
    function hhmm(ts) { if (!ts) return ''; const d = new Date(+ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    function factsHTML(log, l) {
        const ai = log.ai, items = ai && ai.items || [], total = ai && ai.total || log.macros || null;
        let h = '';
        if (items.length) h += '<p class="mj-ing"><span>' + esc(t('ing', l)) + ':</span> ' + items.map(d => esc(d.name) + (d.portion ? ' <small>(' + esc(d.portion) + ')</small>' : '')).join(', ') + '</p>';
        if (total) {
            const cells = KEYS.filter(k => total[k] != null && +total[k] >= 0 && (k !== 'fat' || +total[k] > 0)).map(k => '<span class="mj-n"><b>' + (k === 'kcal' ? Math.round(+total[k]) : Math.round(+total[k]) + ' g') + '</b> ' + esc(t(k, l)) + '</span>').join('');
            if (cells) h += '<div class="mj-nut">' + cells + '</div>';
        }
        if (ai && ai.note) h += '<p class="mj-note">' + esc(ai.note) + '</p>';
        if (ai) h += '<p class="mj-est">' + esc(t('est', l)) + '</p>';
        return h;
    }
    async function open(id) {
        const log = logOf(id), r = R(); if (!log || !r || !r.sheet) return null;
        const l = lang(), lvl = levelOf(log), src = await photoURL(log), canShare = !!src && !!shareOf(log);
        const html = '<div class="mj-sheet" data-noi18n data-mj-id="' + esc(log.id) + '">' +
            (src ? '<figure class="mj-photo"><img alt="" src="' + esc(src) + '"><figcaption>' + esc(t('photoOnly', l)) + '</figcaption></figure>' : '') +
            '<h3 class="mj-name">' + esc(log.ai && log.ai.name || log.t || t('title', l)) + '</h3>' +
            '<p class="mj-when">' + esc(hhmm(log.ts)) + '</p>' + chip(lvl, l) + factsHTML(log, l) +
            '<div class="mj-acts">' + (canShare ? '<button type="button" class="r2-btn pri" data-mj="share">' + esc(t('share', l)) + '</button>' : '') +
            '<button type="button" class="r2-btn mj-del" data-mj="del">' + esc(t('del', l)) + '</button></div>' +
            '<div class="mj-confirm" hidden><p><b>' + esc(t('delQ', l)) + '</b><small>' + esc(t('delS', l)) + '</small></p><div class="mj-row"><button type="button" class="r2-btn" data-mj="keep">' + esc(t('keep', l)) + '</button><button type="button" class="r2-btn mj-danger" data-mj="delgo">' + esc(t('delGo', l)) + '</button></div></div></div>';
        const ov = r.sheet(html, { cls: 'mj-ov', onClose: () => { if (/^blob:/.test(src)) setTimeout(() => { try { URL.revokeObjectURL(src); } catch (e) {} }, 600); } });
        if (!ov) return null;
        ov.addEventListener('click', e => {
            const b = e.target.closest && e.target.closest('[data-mj]'); if (!b) return;
            const k = b.getAttribute('data-mj'), acts = ov.querySelector('.mj-acts'), cf = ov.querySelector('.mj-confirm');
            if (k === 'share') { try { r.close(ov); } catch (x) {} setTimeout(() => share(log.id), 80); }
            else if (k === 'del') { acts.hidden = true; cf.hidden = false; }
            else if (k === 'keep') { cf.hidden = true; acts.hidden = false; }
            else if (k === 'delgo') { remove(log.id).then(ok => { try { r.close(ov); } catch (x) {} if (ok) toast(t('deleted', l)); }); }
        });
        return ov;
    }
    async function remove(id) {
        const v = VB(); if (!v || !v.deleteMeal) return false;
        const log = v.deleteMeal(id); if (!log) return false;
        await delPhoto(log.id);
        try { doc().querySelectorAll('[data-mj-open="' + String(log.id).replace(/["\\]/g, '') + '"]').forEach(b => { const li = b.closest('li'); if (li) li.remove(); }); } catch (e) {}
        try { root.dispatchEvent(new CustomEvent('lowi:meal-deleted', { detail: { id: log.id } })); } catch (e) {}
        return true;
    }
    async function share(id) {
        const log = logOf(id), r = R(); if (!log || !r || !r.sheet) return null;
        const l = lang(), sh = shareOf(log), src = await photoURL(log);
        if (!sh || !src) { toast(t('noPhoto', l)); return null; }
        const html = '<div class="mj-share" data-noi18n><h3>' + esc(t('shareT', l)) + '</h3>' +
            '<div class="mj-card"><img alt="" src="' + esc(src) + '"><div><b>' + esc(sh.name) + '</b>' + chip(sh.lvl, l) + '</div></div>' +
            '<label class="mj-cap"><span>' + esc(t('cap', l)) + '</span><input type="text" maxlength="140" enterkeyhint="send" autocomplete="off" placeholder="' + esc(t('capPh', l)) + '"></label>' +
            '<p class="mj-foot">' + esc(t('foot', l)) + '</p>' +
            '<button type="button" class="r2-btn pri" data-mj="post">' + esc(t('post', l)) + '</button><p class="mj-msg" role="status" aria-live="polite"></p></div>';
        const ov = r.sheet(html, { cls: 'mj-ov', onClose: () => { if (/^blob:/.test(src)) setTimeout(() => { try { URL.revokeObjectURL(src); } catch (e) {} }, 600); } });
        if (!ov) return null;
        const btn = ov.querySelector('[data-mj="post"]'), msg = ov.querySelector('.mj-msg'), inp = ov.querySelector('.mj-cap input');
        let busy = false;
        async function post() {
            if (busy) return; busy = true; btn.disabled = true; msg.textContent = t('posting', l);
            try {
                const C = root.LowiCommunity; if (!C || !C.shareMeal) throw new Error('signin');
                const blob = await photoBlob(log); if (!blob) throw new Error('photo');
                const s = shareOf(log, inp && inp.value);
                await C.shareMeal({ blob, name: s.name, lvl: s.lvl, caption: s.caption });
                try { r.close(ov); } catch (x) {}
                toast(t('posted', l));
                try { root.dispatchEvent(new CustomEvent('lowi:meal-shared', { detail: { id: log.id } })); } catch (e) {}
            } catch (e) {
                const k = String(e && e.message || '');
                msg.textContent = t(k === 'signin' ? 'signin' : k === 'name' ? 'name' : k === 'offline' ? 'offline' : k === 'photo' ? 'noPhoto' : 'failed', l);
                busy = false; btn.disabled = false;
            }
        }
        btn.addEventListener('click', post);
        if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); post(); } });
        return ov;
    }
    // a thumbnail button for a meal row (Fuel's today list, the Saved sheet)
    function thumbHTML(log, l) {
        if (!log) return '';
        const src = /^data:image\/(jpeg|png|webp);base64,/.test(String(log.photo || '')) ? log.photo : '';
        return '<button type="button" class="mj-thumb' + (src ? '' : ' mj-thumb-none') + '" data-mj-open="' + esc(log.id) + '" aria-label="' + esc(t('open', l || lang()) + ': ' + (log.t || '')) + '">' + (src ? '<img alt="" src="' + esc(src) + '">' : '<span aria-hidden="true">\u{1F37D}</span>') + '</button>';
    }
    if (root.document && root.document.addEventListener) {
        root.document.addEventListener('click', e => {
            const b = e.target && e.target.closest && e.target.closest('[data-mj-open],[data-mj-share]'); if (!b) return;
            e.preventDefault(); e.stopPropagation();
            const id = b.getAttribute('data-mj-open') || b.getAttribute('data-mj-share');
            const go = () => b.hasAttribute('data-mj-share') ? share(id) : open(id);
            /* from the Log a meal "Saved" sheet: close it first so the new sheet sits on top */
            const sp = b.closest('.r2-ov.sp-sheet'), r = R();
            if (sp && r && r.close) { try { r.close(sp); } catch (x) {} setTimeout(go, 120); } else go();
        }, true);
    }

    const api = { STR, KEYS, t, estimate, level, levelOf, shareOf, prepare, keep, getPhoto, delPhoto, open, share, remove, thumbHTML, blobOf, DB };
    if (typeof module === 'object' && module.exports) module.exports = api; else root.LowiMealJournal = api;
})(typeof window === 'object' ? window : globalThis);
