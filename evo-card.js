/* evo-card.js (Nov 5 2026): every Misty form on the Evolution path opens as a collectible card.
   Eman: "each old evolution tappable, view it as a card and save it as a picture, like Pokémon / Yu-Gi-Oh cards".
   Our own design, no borrowed branding: a family-coloured frame (silver for reef spirits, gold for celestials), the form's own art
   from the same render as the path, its phase, what it grew, the XP it was reached at and ten power pips.
   Locked forms show a sealed card back, so evolving stays a reveal (the name stays ???).
   The card on screen IS the picture that gets saved (drawn once on a canvas), so what you see is what you save.
   companion.js opens it: LowiEvoCard.open({ forms, start, owner, fam, pal, art, lang, back }).
   Read-only: nothing here touches XP, stages, purchases or storage. */
(function (root) {
    'use strict';
    const PHASES = [
        { k: 'cell', stars: 1, l: ['Cell', 'Zelle', 'Célula'] },
        { k: 'swim', stars: 2, l: ['Swimmer', 'Schwimmer', 'Nadador'] },
        { k: 'reef', stars: 3, l: ['Reef spirit', 'Riffgeist', 'Espíritu de arrecife'] },
        { k: 'star', stars: 4, l: ['Celestial', 'Himmelswesen', 'Celestial'] }
    ];
    /* EVOLUTION.md: forms 1-2 cell, 3-5 swimmer, 6-7 reef spirit, 8-10 celestial */
    function phaseOf(i) { i = Math.max(0, Math.min(9, i | 0)); return PHASES[i < 2 ? 0 : i < 5 ? 1 : i < 7 ? 2 : 3]; }
    const li = lang => ({ de: 1, es: 2 }[lang] || 0);
    function nf(n, lang) { try { return Number(n).toLocaleString({ de: 'de-DE', es: 'es-ES' }[lang] || 'en-US'); } catch (e) { return String(n); } }
    const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
    function hex(c, d) { c = String(c || '').trim(); if (!HEX.test(c)) return d; return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.toLowerCase(); }
    /* frame colours: palette for cells and swimmers, silver-pearl for reef spirits, gold for celestials */
    function frameOf(i, pal) {
        const a = hex(pal && pal.a, '#7fe3c0'), b = hex(pal && pal.b, '#f2b8ff'), k = phaseOf(i).k;
        if (k === 'star') return { c: ['#fff1b8', '#d9a53a', '#8a5a12', '#f7d774'], ink: '#f7d774', a, b };
        if (k === 'reef') return { c: ['#ffffff', '#c9c9cf', '#7d7d86', a], ink: '#e6e6ea', a, b };
        return { c: [a, b, a, b], ink: a, a, b };
    }
    function slug(s) { return String(s || '').normalize ? String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) : 'misty'; }
    function fileName(f, owner) { return 'lowispike-' + (slug(owner) || 'misty') + '-form-' + ((f && f.i | 0) + 1) + (f && f.reached ? '-' + (slug(f.name) || 'card') : '') + '.png'; }
    /* the words on one card, in the user's language (pure: tested in tests/evo-card.test.cjs) */
    function cardText(f, d) {
        d = d || {}; const lang = d.lang || 'en', L = (en, de, es) => [en, de, es][li(lang)], ph = phaseOf(f.i), n = (f.i | 0) + 1;
        const no = (n < 10 ? '0' : '') + n + '/10';
        if (!f.reached) {
            return {
                locked: true, no, title: '???', sub: L('Form ', 'Form ', 'Forma ') + n + ' · ' + L('Sealed', 'Versiegelt', 'Sellada'),
                line1: L('Unlocks at ' + nf(f.xp, lang) + ' XP', 'Freigeschaltet ab ' + nf(f.xp, lang) + ' XP', 'Se desbloquea con ' + nf(f.xp, lang) + ' XP'),
                line2: f.next && f.left > 0 ? L(nf(f.left, lang) + ' XP to go', 'Noch ' + nf(f.left, lang) + ' XP', 'Faltan ' + nf(f.left, lang) + ' XP')
                    : f.next ? L('Ready to evolve', 'Bereit zur Entwicklung', 'Lista para evolucionar') : L('Keep going to reveal it', 'Bleib dran, dann zeigt sie sich', 'Sigue y se revelará'),
                alt: L('Sealed card, Form ' + n + ' of 10. Unlocks at ' + nf(f.xp, lang) + ' XP.', 'Versiegelte Karte, Form ' + n + ' von 10. Freigeschaltet ab ' + nf(f.xp, lang) + ' XP.', 'Carta sellada, forma ' + n + ' de 10. Se desbloquea con ' + nf(f.xp, lang) + ' XP.')
            };
        }
        const owner = String(d.owner || 'Misty').slice(0, 24), fam = String(d.fam || '');
        return {
            locked: false, no, title: String(f.name || ''), sub: owner + (fam ? ' · ' + fam : ''),
            phase: ph.l[li(lang)], stars: ph.stars, power: n,
            reached: L('Reached at ' + nf(f.xp, lang) + ' XP', 'Erreicht ab ' + nf(f.xp, lang) + ' XP', 'Alcanzada con ' + nf(f.xp, lang) + ' XP'),
            grewK: L('New at this form', 'Neu in dieser Form', 'Nuevo en esta forma'), grew: String(f.trait || '').replace(/^(\S+)\s+\1(?=\s|$)/i, '$1'), /* the Glow family's first trait reads "Glow glow core" */
            powerK: L('Power', 'Kraft', 'Poder'), now: f.current ? L('Now', 'Jetzt', 'Ahora') : '',
            alt: L(f.name + ', Form ' + n + ' of 10. ' + ph.l[0] + '. New at this form: ' + (f.trait || '') + '. Reached at ' + nf(f.xp, lang) + ' XP.',
                f.name + ', Form ' + n + ' von 10. ' + ph.l[1] + '. Neu in dieser Form: ' + (f.trait || '') + '. Erreicht ab ' + nf(f.xp, lang) + ' XP.',
                f.name + ', forma ' + n + ' de 10. ' + ph.l[2] + '. Nuevo en esta forma: ' + (f.trait || '') + '. Alcanzada con ' + nf(f.xp, lang) + ' XP.')
        };
    }
    const core = { phaseOf, frameOf, fileName, cardText, slug };
    if (typeof module !== 'undefined' && module.exports) module.exports = core;
    const W = typeof window !== 'undefined' ? window : null;
    if (!W || !W.document) return;
    const D = W.document;

    /* ---------- the form art as a clean, standalone SVG ----------
       The path art leans on page CSS (face variants hidden with display:none, var() colours), and an <img> of an SVG sees none of it,
       so the art is mounted off screen once and every visible part gets its computed paint written inline. */
    const PAINT = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stop-color', 'stop-opacity', 'mix-blend-mode'];
    function cleanSVG(html) {
        const host = D.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:360px;overflow:hidden;pointer-events:none;contain:strict';
        host.innerHTML = html;
        D.body.appendChild(host);
        try {
            const svg = host.querySelector('svg');
            if (!svg) return '';
            const clone = svg.cloneNode(true), a = [svg].concat([].slice.call(svg.querySelectorAll('*'))), b = [clone].concat([].slice.call(clone.querySelectorAll('*'))), drop = [];
            for (let k = 0; k < a.length; k++) {
                const el = a[k], cl = b[k];
                if (!cl || !el) continue;
                /* WebKit refuses the whole image on one bad attribute name (the art ships a stray =""): keep only clean names */
                [].slice.call(cl.attributes).forEach(at => { if (!/^[a-zA-Z_][\w:.-]*$/.test(at.name) || /^on/i.test(at.name)) cl.removeAttribute(at.name); });
                if (/^(script|foreignObject|animate|animateTransform|animateMotion|set)$/i.test(el.tagName)) { drop.push(cl); continue; }
                const cs = W.getComputedStyle(el);
                if (k > 0 && (cs.display === 'none' || cs.visibility === 'hidden')) { drop.push(cl); continue; }
                if (/^(defs|title|desc|clipPath|mask|linearGradient|radialGradient|pattern|filter|symbol|metadata)$/i.test(el.tagName) && !/stop/i.test(el.tagName)) continue;
                let st = '';
                PAINT.forEach(p => { const v = cs.getPropertyValue(p); if (v && v !== 'normal' && !(p === 'mix-blend-mode')) st += p + ':' + v + ';'; });
                if (!el.hasAttribute('transform') && k > 0 && cs.transform && cs.transform !== 'none') st += 'transform:' + cs.transform + ';transform-origin:' + cs.transformOrigin + ';transform-box:' + (cs.transformBox || 'view-box') + ';';
                cl.setAttribute('style', st);
                cl.removeAttribute('class');
            }
            drop.forEach(n => n.parentNode && n.parentNode.removeChild(n));
            clone.removeAttribute('class');
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            if (!clone.getAttribute('viewBox')) { const r = svg.getBBox ? svg.getBBox() : null; if (r && r.width) clone.setAttribute('viewBox', [r.x, r.y, r.width, r.height].join(' ')); }
            clone.setAttribute('width', '600'); clone.setAttribute('height', '600');
            clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            return new W.XMLSerializer().serializeToString(clone);
        } catch (e) { return ''; }
        finally { host.remove(); }
    }
    function loadImg(src) { return new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
    /* the visible extent of the art (the viewBox has empty margin): measured on the live mount so the card can frame it snugly */
    function artBox(html) {
        const host = D.createElement('div');
        host.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:360px;overflow:hidden;pointer-events:none';
        host.innerHTML = html; D.body.appendChild(host);
        try {
            const svg = host.querySelector('svg'); if (!svg || !svg.getBBox) return null;
            const vb = svg.viewBox && svg.viewBox.baseVal, r = svg.getBBox();
            if (!vb || !vb.width || !r || !r.width) return null;
            return { vb: { x: vb.x, y: vb.y, w: vb.width, h: vb.height }, bb: { x: r.x, y: r.y, w: r.width, h: r.height } };
        } catch (e) { return null; } finally { host.remove(); }
    }

    /* ---------- drawing the card ---------- */
    const CW = 900, CH = 1260, FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif';
    function rr(x, c, y, w, h, r) { x.beginPath(); x.moveTo(c + r, y); x.arcTo(c + w, y, c + w, y + h, r); x.arcTo(c + w, y + h, c, y + h, r); x.arcTo(c, y + h, c, y, r); x.arcTo(c, y, c + w, y, r); x.closePath(); }
    function fit(x, txt, max, size, weight) { let s = size; do { x.font = weight + ' ' + s + 'px ' + FONT; if (x.measureText(txt).width <= max) break; s -= 2; } while (s > 18); return s; }
    function wrap(x, txt, max, lines) {
        const words = String(txt).split(/\s+/), out = []; let cur = '';
        words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width <= max || !cur) cur = t; else { out.push(cur); cur = w; } });
        if (cur) out.push(cur);
        if (out.length > lines) { const keep = out.slice(0, lines); let l = keep[lines - 1]; while (l && x.measureText(l + '…').width > max) l = l.slice(0, -1); keep[lines - 1] = l + '…'; return keep; }
        return out;
    }
    function rgba(h, a) { h = hex(h, '#ffffff'); return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')'; }
    function frame(x, fr) {
        const g = x.createLinearGradient(0, 0, CW, CH);
        g.addColorStop(0, fr.c[0]); g.addColorStop(.35, fr.c[1]); g.addColorStop(.7, fr.c[2]); g.addColorStop(1, fr.c[3]);
        x.fillStyle = g; rr(x, 0, 0, CW, CH, 54); x.fill();
        /* inner body: true black, a faint wash of the family colour from the top */
        rr(x, 22, 22, CW - 44, CH - 44, 38); x.fillStyle = '#000'; x.fill();
        x.save(); rr(x, 22, 22, CW - 44, CH - 44, 38); x.clip();
        const w = x.createRadialGradient(CW / 2, 120, 20, CW / 2, 220, 760); w.addColorStop(0, rgba(fr.a, .2)); w.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = w; x.fillRect(0, 0, CW, CH); x.restore();
        x.lineWidth = 3; x.strokeStyle = rgba(fr.ink, .55); rr(x, 34, 34, CW - 68, CH - 68, 30); x.stroke();
    }
    function footer(x, t, fr) {
        x.textBaseline = 'alphabetic';
        x.font = '800 26px ' + FONT; x.fillStyle = 'rgba(255,255,255,.82)'; x.textAlign = 'left';
        try { x.letterSpacing = '4px'; } catch (e) { }
        x.fillText('LOWiSPIKE', 70, CH - 70);
        try { x.letterSpacing = '0px'; } catch (e) { }
        x.font = '700 26px ' + FONT; x.fillStyle = rgba(fr.ink, .95); x.textAlign = 'right';
        x.fillText('No. ' + t.no, CW - 70, CH - 70);
    }
    function drawFront(x, t, fr, im, box) {
        frame(x, fr);
        /* stars and phase on the right first, so the name and owner line never run into them (long German / Spanish words) */
        const stars = '\u2605'.repeat(t.stars);
        x.font = '700 40px ' + FONT; const sw = x.measureText(stars).width;
        const phs = fit(x, t.phase, 300, 24, '700'), pw = x.measureText(t.phase).width;
        x.textAlign = 'right'; x.textBaseline = 'alphabetic';
        x.font = '700 40px ' + FONT; x.fillStyle = fr.ink; x.fillText(stars, CW - 70, 118);
        x.font = '700 ' + phs + 'px ' + FONT; x.fillStyle = 'rgba(255,255,255,.72)'; x.fillText(t.phase, CW - 70, 164);
        x.textAlign = 'left'; x.fillStyle = '#fff';
        const tw = CW - 140 - sw - 28;
        fit(x, t.title, tw, 58, '800'); x.fillText(wrap(x, t.title, tw, 1)[0], 70, 122);
        x.font = '600 28px ' + FONT; x.fillStyle = 'rgba(255,255,255,.72)';
        x.fillText(wrap(x, t.sub, CW - 140 - pw - 28, 1)[0], 70, 166);
        /* art window */
        const ax = 62, ay = 196, aw = CW - 124, ah = 560;
        x.save(); rr(x, ax, ay, aw, ah, 30); x.clip();
        x.fillStyle = '#000'; x.fillRect(ax, ay, aw, ah);
        const gl = x.createRadialGradient(CW / 2, ay + ah / 2, 10, CW / 2, ay + ah / 2, ah * .62);
        gl.addColorStop(0, rgba(fr.a, .42)); gl.addColorStop(.55, rgba(fr.b, .14)); gl.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gl; x.fillRect(ax, ay, aw, ah);
        if (t.stars >= 3) { /* a few fixed sparkles for reef spirits and celestials */
            const P = [[.12, .18], [.86, .14], [.08, .74], [.92, .66], [.24, .9], [.78, .88], [.5, .07], [.95, .4], [.04, .42]];
            P.forEach((p, k) => { x.fillStyle = rgba(k % 2 ? fr.ink : '#ffffff', .5 + (k % 3) * .15); x.beginPath(); x.arc(ax + p[0] * aw, ay + p[1] * ah, 2.5 + (k % 3), 0, 6.3); x.fill(); });
        }
        if (im) {
            /* frame the drawn creature (not the empty viewBox margin) so every form fits whole, with room to breathe */
            const pad = 38; let sx = 0, sy = 0, sw = im.width, sh = im.height;
            if (box && box.vb && box.bb) {
                const k = im.width / box.vb.w, m = Math.max(box.bb.w, box.bb.h) * .06;
                sx = Math.max(0, (box.bb.x - box.vb.x - m) * k); sy = Math.max(0, (box.bb.y - box.vb.y - m) * k);
                sw = Math.min(im.width - sx, (box.bb.w + 2 * m) * k); sh = Math.min(im.height - sy, (box.bb.h + 2 * m) * k);
            }
            const s = Math.min((aw - 2 * pad) / sw, (ah - 2 * pad) / sh), dw = sw * s, dh = sh * s;
            x.drawImage(im, sx, sy, sw, sh, ax + (aw - dw) / 2, ay + (ah - dh) / 2, dw, dh);
        } else {
            x.fillStyle = rgba(fr.a, .85); x.beginPath(); x.arc(CW / 2, ay + ah / 2, 120, 0, 6.3); x.fill();
        }
        x.restore();
        x.lineWidth = 4; x.strokeStyle = rgba(fr.ink, .7); rr(x, ax, ay, aw, ah, 30); x.stroke();
        if (t.now) { /* "Now" chip on the current form */
            x.font = '800 26px ' + FONT; const w = x.measureText(t.now).width + 40;
            x.fillStyle = fr.ink; rr(x, ax + aw - w - 18, ay + 18, w, 48, 24); x.fill();
            x.fillStyle = '#000'; x.textAlign = 'center'; x.fillText(t.now, ax + aw - w / 2 - 18, ay + 52);
        }
        /* reached-at line */
        x.textAlign = 'left'; x.font = '600 27px ' + FONT; x.fillStyle = 'rgba(255,255,255,.72)';
        x.fillText(t.reached, 70, 808);
        /* what this form grew */
        rr(x, 62, 836, CW - 124, 196, 24); x.fillStyle = 'rgba(255,255,255,.07)'; x.fill();
        x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.14)'; x.stroke();
        x.font = '800 22px ' + FONT; x.fillStyle = fr.ink; try { x.letterSpacing = '3px'; } catch (e) { }
        x.fillText(t.grewK.toUpperCase(), 92, 884); try { x.letterSpacing = '0px'; } catch (e) { }
        x.font = '700 40px ' + FONT; x.fillStyle = '#fff';
        wrap(x, t.grew, CW - 184, 2).forEach((l, k) => x.fillText(l, 92, 942 + k * 52));
        /* power: ten pips, one per form reached */
        x.font = '800 22px ' + FONT; x.fillStyle = 'rgba(255,255,255,.72)'; try { x.letterSpacing = '3px'; } catch (e) { }
        x.fillText(t.powerK.toUpperCase(), 70, 1092); try { x.letterSpacing = '0px'; } catch (e) { }
        const px0 = 250, gap = 58;
        for (let k = 0; k < 10; k++) {
            x.beginPath(); x.arc(px0 + k * gap, 1084, 15, 0, 6.3);
            if (k < t.power) { x.fillStyle = fr.ink; x.fill(); } else { x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.28)'; x.stroke(); }
        }
        footer(x, t, fr);
    }
    function drawBack(x, t, fr) {
        frame(x, { c: ['#5a5a5e', '#2a2a2c', '#141414', '#4a4a4e'], ink: '#bdbdc4', a: fr.a, b: fr.b });
        /* a quiet ring pattern, then the sealed orb */
        x.save(); rr(x, 34, 34, CW - 68, CH - 68, 30); x.clip();
        x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 2;
        for (let r = 80; r < 900; r += 60) { x.beginPath(); x.arc(CW / 2, 520, r, 0, 6.3); x.stroke(); }
        x.restore();
        const g = x.createRadialGradient(CW / 2, 500, 10, CW / 2, 520, 200); g.addColorStop(0, rgba(fr.a, .35)); g.addColorStop(1, 'rgba(255,255,255,.04)');
        x.fillStyle = g; x.beginPath(); x.arc(CW / 2, 520, 190, 0, 6.3); x.fill();
        x.lineWidth = 4; x.strokeStyle = 'rgba(255,255,255,.35)'; x.setLineDash([14, 12]); x.stroke(); x.setLineDash([]);
        x.fillStyle = 'rgba(255,255,255,.9)'; x.font = '800 190px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('?', CW / 2, 530);
        x.textBaseline = 'alphabetic';
        x.font = '800 54px ' + FONT; x.fillStyle = '#fff'; x.fillText(t.title, CW / 2, 150);
        x.font = '600 30px ' + FONT; x.fillStyle = 'rgba(255,255,255,.72)'; x.fillText(t.sub, CW / 2, 200);
        fit(x, t.line1, CW - 180, 40, '700'); x.fillStyle = '#fff'; x.fillText(t.line1, CW / 2, 860);
        fit(x, t.line2, CW - 180, 32, '600'); x.fillStyle = 'rgba(255,255,255,.72)'; x.fillText(t.line2, CW / 2, 918);
        footer(x, t, { ink: '#bdbdc4' });
    }
    async function render(f, d) {
        const t = cardText(f, d), fr = frameOf(f.i, d.pal), cv = D.createElement('canvas');
        cv.width = CW; cv.height = CH;
        const x = cv.getContext('2d');
        if (!x) return null;
        let ok = true;
        if (t.locked) drawBack(x, t, fr);
        else {
            let html = '', im = null, box = null;
            try { html = d.art ? d.art(f.i) : ''; } catch (e) { html = ''; }
            if (html) {
                box = artBox(html);
                const svg = cleanSVG(html);
                if (svg) im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
            }
            ok = !!im;
            drawFront(x, t, fr, im, box);
        }
        const blob = await new Promise(res => { try { cv.toBlob(b => res(b), 'image/png'); } catch (e) { res(null); } });
        return blob ? { blob, url: URL.createObjectURL(blob), t, ok } : null;
    }

    /* ---------- the viewer ---------- */
    const S = { ov: null, d: null, i: 0, cache: {}, busy: false, back: null, tok: 0 };
    const L = (en, de, es) => [en, de, es][li(S.d && S.d.lang)];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function shell() {
        const ov = D.createElement('div');
        ov.className = 'evc-ov';
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', L('Evolution card', 'Entwicklungskarte', 'Carta de evolución'));
        ov.innerHTML = '<button type="button" class="evc-x" data-evc="close" aria-label="' + esc(L('Close', 'Schließen', 'Cerrar')) + '">×</button>' +
            '<div class="evc-stage"><button type="button" class="evc-nav evc-prev" data-evc="prev" aria-label="' + esc(L('Previous form', 'Vorherige Form', 'Forma anterior')) + '">‹</button>' +
            '<figure class="evc-card" data-evc="card"><img class="evc-img" alt="" draggable="false"><span class="evc-shine" aria-hidden="true"></span><span class="evc-load" aria-hidden="true"></span></figure>' +
            '<button type="button" class="evc-nav evc-next" data-evc="next" aria-label="' + esc(L('Next form', 'Nächste Form', 'Forma siguiente')) + '">›</button></div>' +
            '<p class="evc-pos" aria-live="polite"></p>' +
            '<div class="evc-actions"><button type="button" class="evc-save" data-evc="save">' + esc(L('Save picture', 'Bild speichern', 'Guardar imagen')) + '</button></div>' +
            '<p class="evc-msg" role="status"></p>';
        return ov;
    }
    function msg(t) { const m = S.ov && S.ov.querySelector('.evc-msg'); if (m) m.textContent = t || ''; }
    async function show(i, dir) {
        const d = S.d; if (!S.ov || !d) return;
        i = Math.max(0, Math.min(d.forms.length - 1, i | 0)); S.i = i;
        const f = d.forms[i], ov = S.ov, card = ov.querySelector('.evc-card'), img = ov.querySelector('.evc-img'), tok = ++S.tok;
        ov.querySelector('.evc-prev').disabled = i <= 0;
        ov.querySelector('.evc-next').disabled = i >= d.forms.length - 1;
        ov.querySelector('.evc-pos').textContent = L('Form ' + (i + 1) + ' of ' + d.forms.length, 'Form ' + (i + 1) + ' von ' + d.forms.length, 'Forma ' + (i + 1) + ' de ' + d.forms.length) + (f.reached ? '' : ' · ' + L('locked', 'gesperrt', 'bloqueada'));
        const save = ov.querySelector('.evc-save');
        save.hidden = !f.reached; msg('');
        card.classList.toggle('evc-locked', !f.reached);
        card.classList.remove('evc-in-l', 'evc-in-r'); void card.offsetWidth;
        if (dir) card.classList.add(dir > 0 ? 'evc-in-r' : 'evc-in-l');
        card.classList.add('evc-wait');
        let r = S.cache[i];
        if (!r) { try { r = await render(f, d); } catch (e) { r = null; } if (r) S.cache[i] = r; }
        if (tok !== S.tok || !S.ov) return;
        card.classList.remove('evc-wait');
        if (!r) { img.removeAttribute('src'); img.alt = ''; msg(L('This card could not be drawn here.', 'Diese Karte ließ sich hier nicht zeichnen.', 'No se pudo dibujar esta carta aquí.')); save.hidden = true; return; }
        img.src = r.url; img.alt = r.t.alt;
    }
    async function saveCard() {
        const d = S.d, f = d && d.forms[S.i], r = S.cache[S.i];
        if (!f || !f.reached || !r || S.busy) return;
        S.busy = true;
        const name = fileName(f, d.owner), file = (() => { try { return new File([r.blob], name, { type: 'image/png' }); } catch (e) { return null; } })();
        try {
            /* same order as the Misty photo (spirit.js): the share sheet (Save Image / Photos), else the picture to hold, else a download */
            if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
                try { await navigator.share({ files: [file], title: r.t.title }); msg(''); return; }
                catch (e) { if (e && e.name === 'AbortError') return; }
            }
            const touch = (W.matchMedia && W.matchMedia('(pointer: coarse)').matches) || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
            if (touch) { msg(L('Press and hold the card, then tap Save to Photos.', 'Halte die Karte gedrückt und tippe auf „In Fotos sichern“.', 'Mantén pulsada la carta y toca Guardar en Fotos.')); return; }
            const a = D.createElement('a'); a.href = r.url; a.download = name; D.body.appendChild(a); a.click(); a.remove();
            msg(L('Card saved as ' + name, 'Karte gespeichert als ' + name, 'Carta guardada como ' + name));
        } finally { S.busy = false; }
    }
    function close() {
        if (!S.ov) return;
        const back = S.back; S.ov.remove(); S.ov = null; S.tok++;
        Object.keys(S.cache).forEach(k => { try { URL.revokeObjectURL(S.cache[k].url); } catch (e) { } }); S.cache = {};
        D.documentElement.classList.remove('evc-open');
        if (back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch (e) { } }
    }
    function onKey(e) {
        if (!S.ov) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); show(S.i - 1, -1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); show(S.i + 1, 1); }
        else if (e.key === 'Tab') { /* keep focus inside the card viewer */
            /* the X is pressed through the app's bottom close button (bottom-close.js) when that one stands in for it */
            const f = [].slice.call(S.ov.querySelectorAll('button:not([disabled]):not([hidden])')).concat([].slice.call(D.querySelectorAll('.lw-bx.on'))).filter(b => b.offsetParent !== null && !b.classList.contains('lw-bx-src') && getComputedStyle(b).visibility !== 'hidden');
            if (!f.length) return; const a = D.activeElement, k = f.indexOf(a);
            if (e.shiftKey && (k <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (k === f.length - 1 || k < 0)) { e.preventDefault(); f[0].focus(); }
        }
    }
    function open(d) {
        if (!d || !Array.isArray(d.forms) || !d.forms.length) return false;
        if (S.ov) close();
        S.d = d; S.back = d.back || D.activeElement; S.cache = {};
        S.ov = shell(); D.body.appendChild(S.ov);
        D.documentElement.classList.add('evc-open');
        const ov = S.ov;
        ov.addEventListener('click', e => {
            const b = e.target.closest && e.target.closest('[data-evc]');
            const a = b && b.getAttribute('data-evc');
            if (e.target === ov || a === 'close') { e.stopPropagation(); close(); }
            else if (a === 'prev') { e.stopPropagation(); show(S.i - 1, -1); }
            else if (a === 'next') { e.stopPropagation(); show(S.i + 1, 1); }
            else if (a === 'save') { e.stopPropagation(); saveCard(); }
        });
        /* swipe left / right between forms; a press-and-hold still reaches the picture for Save to Photos */
        let sx = 0, sy = 0, on = false;
        const card = ov.querySelector('.evc-card');
        card.addEventListener('touchstart', e => { const t = e.touches[0]; if (!t || e.touches.length > 1) return; sx = t.clientX; sy = t.clientY; on = true; }, { passive: true });
        card.addEventListener('touchend', e => {
            if (!on) return; on = false; const t = e.changedTouches[0]; if (!t) return;
            const dx = t.clientX - sx, dy = t.clientY - sy;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) show(S.i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        }, { passive: true });
        /* a gentle tilt that follows the finger, like turning a real card in the light (off with Reduce Motion) */
        const still = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!still) {
            const tilt = (cx, cy) => { const r = card.getBoundingClientRect(); if (!r.width) return; const px = (cx - r.left) / r.width - .5, py = (cy - r.top) / r.height - .5; card.style.setProperty('--evc-rx', (-py * 10).toFixed(2) + 'deg'); card.style.setProperty('--evc-ry', (px * 12).toFixed(2) + 'deg'); card.style.setProperty('--evc-sx', ((px + .5) * 100).toFixed(1) + '%'); };
            card.addEventListener('pointermove', e => tilt(e.clientX, e.clientY));
            card.addEventListener('pointerleave', () => { card.style.removeProperty('--evc-rx'); card.style.removeProperty('--evc-ry'); card.style.removeProperty('--evc-sx'); });
        }
        show(d.start | 0, 0);
        setTimeout(() => { try { if (S.ov !== ov) return; (ov.querySelector('.evc-save:not([hidden])') || ov.querySelector('.evc-next:not([disabled])') || ov.querySelector('.evc-prev:not([disabled])') || ov.querySelector('.evc-x')).focus({ preventScroll: true }); } catch (e) { } }, 120);
        return true;
    }
    W.addEventListener('keydown', onKey, true);
    W.LowiEvoCard = Object.assign({ open, close, render, isOpen: () => !!S.ov, current: () => S.i }, core);
})(typeof window !== 'undefined' ? window : globalThis);
