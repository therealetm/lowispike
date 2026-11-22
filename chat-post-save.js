/* LOWiSPIKE · chat-post-save.js (22 Nov 2026, Emmanuel: "when you click on the image ... there should be a save photo button that
   saves not just the picture, but the picture with the text on the image" and "if they want to save someone else's picture into that
   saved folder, when they click on the image, next to the download button should be the save button").
   community-chat.js mealDetail() opens the meal details panel and calls LowiChatPost.attach(panel, post). This adds two buttons at the
   top of that panel:
     - Foto speichern: the post drawn as one 1080x1920 picture (photo filling the frame, the poster's own words big in the middle,
       name with the spike pill, the numbers line), no watermark, no time. It is drawn as soon as the panel opens, so the tap can hand
       it straight to the phone's share sheet (iPhone: "Save Image"); where sharing files is not possible it downloads.
     - Speichern: keeps the post in My posts > Saved (on this phone, key lowi.chatSaved.v1; index.html listSheet reads LowiChatPost.saved()).
   Pure helpers (wrap, fileName) are exported for the tests. */
(function (W) {
    'use strict';
    const KEY = 'lowi.chatSaved.v1', MAX = 200;
    function fileName(now) { const d = new Date(+now || Date.now()), p = n => (n < 10 ? '0' : '') + n; return 'lowispike-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.jpg'; }
    /* split text into lines that fit width (measure(text) -> px), at most max lines, the last one ending in … when cut */
    function wrap(text, width, measure, max) {
        const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean), lines = [];
        let cur = '';
        for (let i = 0; i < words.length; i++) {
            const t = cur ? cur + ' ' + words[i] : words[i];
            if (measure(t) <= width || !cur) { cur = t; continue; }
            lines.push(cur); cur = words[i];
            if (lines.length === max) { let last = lines[max - 1]; while (last && measure(last + '…') > width) last = last.replace(/\s*\S+$/, ''); lines[max - 1] = (last || lines[max - 1]) + '…'; return lines; }
        }
        if (cur) lines.push(cur);
        return lines.slice(0, max);
    }
    const api = { fileName, wrap, KEY };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!W || !W.document || W.LowiChatPost) return;
    const D = W.document;
    const lang = () => { const l = String((D.documentElement.lang || 'en')).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const T = { edit: { en: 'Text on screen', de: 'Text aufs Bild', es: 'Texto en pantalla' }, editPh: { en: 'Write your text on screen…', de: 'Schreib deinen Text aufs Bild…', es: 'Escribe tu texto…' }, done: { en: 'Done', de: 'Fertig', es: 'Listo' }, editFail: { en: 'Could not save the text. Check your connection.', de: 'Text nicht gespeichert. Prüf deine Verbindung.', es: 'No se pudo guardar el texto.' }, savePhoto: { en: 'Save photo', de: 'Foto speichern', es: 'Guardar foto' }, save: { en: 'Save', de: 'Speichern', es: 'Guardar' }, saved: { en: 'Saved', de: 'Gespeichert', es: 'Guardado' },
        wait: { en: 'One moment…', de: 'Einen Moment…', es: 'Un momento…' }, fail: { en: 'Could not save the photo. Try again.', de: 'Foto konnte nicht gespeichert werden. Versuch es nochmal.', es: 'No se pudo guardar la foto. Inténtalo de nuevo.' } };
    const t = k => T[k][lang()];
    function list() { try { const a = JSON.parse(W.localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function store(a) { try { W.localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); } catch (e) {} }
    function isSaved(id) { return list().some(x => x.id === id); }
    function toggle(p) { const a = list(), i = a.findIndex(x => x.id === p.id); if (i >= 0) a.splice(i, 1); else a.unshift({ id: p.id, src: p.src, by: p.by, caption: p.caption, label: p.label, nums: p.nums, ts: p.ts, at: Date.now() }); store(a); try { W.dispatchEvent(new CustomEvent('lowi:chat-saved')); } catch (e) {} return i < 0; }
    function remove(id) { store(list().filter(x => x.id !== id)); }
    /* the post drawn as one picture */
    function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = no; i.src = src; }); }
    async function render(p) {
        const img = await loadImg(p.src), Wd = 1080, Ht = 1920, c = D.createElement('canvas'); c.width = Wd; c.height = Ht;
        const g = c.getContext('2d'), s = Math.max(Wd / img.naturalWidth, Ht / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
        g.fillStyle = '#05070c'; g.fillRect(0, 0, Wd, Ht); g.drawImage(img, (Wd - w) / 2, (Ht - h) / 2, w, h);
        let gr = g.createLinearGradient(0, Ht * 0.55, 0, Ht); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.72)'); g.fillStyle = gr; g.fillRect(0, Ht * 0.55, Wd, Ht * 0.45);
        const F = '-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 18; g.shadowOffsetY = 3;
        if (p.caption) { g.font = '700 74px ' + F; const ls = wrap(p.caption, Wd - 160, x => g.measureText(x).width, 5), lh = 90, y0 = Ht * 0.46 - (ls.length - 1) * lh / 2; ls.forEach((l, i) => g.fillText(l, Wd / 2, y0 + i * lh)); }
        g.textAlign = 'left'; g.shadowBlur = 10; const x0 = 56; let y = Ht - 150;
        g.font = '700 50px ' + F; const nm = String(p.by || ''); g.fillText(nm, x0, y);
        if (p.label) {
            const nw = g.measureText(nm).width; g.font = '600 36px ' + F; const lw = g.measureText(p.label).width, px = x0 + nw + 22, bw = lw + 78, bh = 58;
            g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.18)'; g.strokeStyle = 'rgba(255,255,255,.42)'; g.lineWidth = 2; const r = bh / 2, by = y - bh / 2; g.beginPath(); g.moveTo(px + r, by); g.arcTo(px + bw, by, px + bw, by + bh, r); g.arcTo(px + bw, by + bh, px, by + bh, r); g.arcTo(px, by + bh, px, by, r); g.arcTo(px, by, px + bw, by, r); g.closePath(); g.fill(); g.stroke(); g.shadowColor = p.lvl === 'high' ? '#ff5a4a' : p.lvl === 'mid' ? '#e6c98a' : '#3ee07a'; g.shadowBlur = 16;
            g.fillStyle = p.lvl === 'high' ? '#f0a08a' : p.lvl === 'mid' ? '#e6c98a' : '#5fd37a'; g.beginPath(); g.arc(px + 30, y, 9, 0, Math.PI * 2); g.fill();
            g.shadowBlur = 6; g.shadowColor = 'rgba(0,0,0,.4)'; g.fillStyle = '#fff'; g.fillText(p.label, px + 52, y + 1);
        }
        if (p.nums) { g.shadowBlur = 10; g.font = '500 40px ' + F; g.fillStyle = 'rgba(255,255,255,.92)'; g.fillText(wrap(p.nums, Wd - 112, x => g.measureText(x).width, 1)[0] || '', x0, y + 72); }
        return new Promise((ok, no) => c.toBlob(b => (b ? ok(b) : no(new Error('blob'))), 'image/jpeg', 0.92));
    }
    async function share(blob) {
        const f = new File([blob], fileName(), { type: 'image/jpeg' });
        if (W.navigator.canShare && W.navigator.canShare({ files: [f] }) && W.navigator.share) { try { await W.navigator.share({ files: [f] }); return true; } catch (e) { if (e && e.name === 'AbortError') return true; } }
        const u = URL.createObjectURL(blob), a = D.createElement('a'); a.href = u; a.download = f.name; D.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return true;
    }
    function toast(m) { try { if (W.LowiR2 && W.LowiR2.toast) return W.LowiR2.toast(m); } catch (e) {} }
    const ICON = { dl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>', bm: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z"/></svg>', ed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>' };
    function attach(ov, p) {
        if (!ov || !p || !p.src) return;
        const sh = ov.querySelector('.r2-sh') || ov; if (sh.querySelector('.cps-acts')) return;
        const box = D.createElement('div'); box.className = 'cps-acts';
        box.innerHTML = '<button type="button" class="cps-b" data-cps="photo">' + ICON.dl + '<span>' + t('savePhoto') + '</span></button>' +
            '<button type="button" class="cps-b" data-cps="save" aria-pressed="' + isSaved(p.id) + '">' + ICON.bm + '<span>' + t(isSaved(p.id) ? 'saved' : 'save') + '</span></button>' +
            (p.edit ? '<button type="button" class="cps-b" data-cps="edit">' + ICON.ed + '<span>' + t('edit') + '</span></button><form class="cps-edit" hidden><input maxlength="140" enterkeyhint="done" autocomplete="off"><button type="submit" class="cps-b cps-pri">' + t('done') + '</button></form>' : '');
        const hd = sh.querySelector('.r2-hd, .md-hd, h2'); if (hd && hd.parentNode) hd.parentNode.insertBefore(box, hd.nextSibling); else sh.insertBefore(box, sh.firstChild);
        let ready = null; ready = render(p).catch(() => null); /* drawn now, so the tap can share at once */
        const ef = box.querySelector('.cps-edit');
        if (ef) ef.addEventListener('submit', async e => { e.preventDefault(); const i = ef.querySelector('input'), v = i.value.replace(/\s+/g, ' ').trim(), btn = ef.querySelector('button');
            btn.disabled = true; try { await p.edit(v); p.caption = v; ef.hidden = true; ready = render(p).catch(() => null); toast(t('saved')); } catch (x) { toast(t('editFail')); } btn.disabled = false; });
        box.addEventListener('click', async e => {
            const b = e.target.closest('[data-cps]'); if (!b) return; e.preventDefault(); e.stopPropagation();
            if (b.dataset.cps === 'edit') { const f = box.querySelector('.cps-edit'), i = f.querySelector('input'); f.hidden = !f.hidden; i.value = p.caption || ''; i.placeholder = t('editPh'); if (!f.hidden) setTimeout(() => i.focus(), 30); return; }
            if (b.dataset.cps === 'save') { const on = toggle(p); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.querySelector('span').textContent = t(on ? 'saved' : 'save'); return; }
            const sp = b.querySelector('span'), was = sp.textContent; sp.textContent = t('wait');
            const blob = await ready; sp.textContent = was;
            if (!blob) { toast(t('fail')); ready = render(p).catch(() => null); return; }
            try { await share(blob); } catch (x) { toast(t('fail')); }
        });
    }
    W.LowiChatPost = { attach, saved: list, isSaved, remove, toggle, render };
})(typeof window !== 'undefined' ? window : null);
