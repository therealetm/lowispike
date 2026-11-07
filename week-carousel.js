/* LOWiSPIKE · week carousel (7 Nov 2026, Emmanuel: "My carousels usually start in a way where you see my grocery card ... the grocery
   Einkaufswagen ... I usually edit the price in there ... then you swipe right, and then you see the first Monday meal, Tuesday meal ...
   I wanted to be able to post a carousel in that style on my For You page").
   From "Deine Woche" (week-basket.js) one tap draws the slides on the phone and opens New post with them, ready to post:
   slide 1 the cart (the week's price, the store, how many dinners, a thumbnail of each), then one slide per dinner still to come
   (its photo, the day, the name, about what it costs). Drawn in a canvas at 1080 x 1350 (4:5, the Instagram/TikTok photo size),
   JPEG. Nothing is uploaded until you press Posten; prices stay labelled as estimates. */
(function (root) {
    'use strict';
    const W_ = 1080, H_ = 1350;
    /* pure: which dinners get a slide (the cart takes the first of max slides) */
    function pick(days, max) {
        const n = Math.max(1, (+max || 8) - 1);
        return (Array.isArray(days) ? days : []).filter(d => d && d.name).slice(0, n);
    }
    /* pure: break a name into at most `lines` lines of about `width` characters */
    function wrap(text, width, lines) {
        const words = String(text || '').split(/\s+/).filter(Boolean), out = [];
        let cur = '';
        for (const w of words) {
            if ((cur + ' ' + w).trim().length > width && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
        }
        if (cur) out.push(cur);
        if (out.length > lines) { const keep = out.slice(0, lines); keep[lines - 1] = keep[lines - 1].replace(/\s*\S*$/, '') + '…'; return keep; }
        return out;
    }
    const api = { W: W_, H: H_, pick, wrap };
    if (typeof module === 'object' && module.exports) module.exports = api;
    const W = root; if (!W || !W.document || W.LowiWeekCarousel) return;
    const D = W.document, F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
    function load(src) {
        return new Promise(ok => { if (!src) return ok(null); const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    }
    /* the backgrounds go in as a picture: Dark (true-black.js) redraws every navy fill and gradient on a canvas grey, but a slide
       you post keeps its own colours whatever look the app is in */
    const BG = {
        cart: '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b2a5c"/><stop offset=".55" stop-color="#0f4a6e"/><stop offset="1" stop-color="#0c6b5e"/></linearGradient><radialGradient id="b" cx=".5" cy=".32" r=".5"><stop offset="0" stop-color="#8fe7ff" stop-opacity=".35"/><stop offset="1" stop-color="#8fe7ff" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1350" fill="url(#a)"/><rect width="1080" height="1350" fill="url(#b)"/></svg>',
        day: '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123a6e"/><stop offset="1" stop-color="#0d5b57"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#a)"/></svg>'
    };
    const bgOf = k => load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BG[k]));
    /* the dish name in at most two lines, smaller type before anything is cut */
    function fitName(g, text, maxW) {
        for (let px = 80; px >= 48; px -= 4) {
            g.font = '800 ' + px + 'px ' + F;
            const words = String(text || '').split(/\s+/).filter(Boolean), out = []; let cur = '';
            for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
            if (cur) out.push(cur);
            if (out.length <= 2 && out.every(l => g.measureText(l).width <= maxW)) return { px, lines: out };
        }
        g.font = '800 48px ' + F; return { px: 48, lines: wrap(text, 30, 2) };
    }
    function canvas() { const c = D.createElement('canvas'); c.width = W_; c.height = H_; return c; }
    function cover(g, im, x, y, w, h) {
        const r = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / r, sh = h / r;
        g.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
    }
    function round(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function brand(g, dark) { g.font = '800 34px ' + F; g.textAlign = 'right'; g.fillStyle = dark ? 'rgba(255,255,255,.75)' : '#fff'; g.fillText('LOWiSPIKE', W_ - 56, 82); g.textAlign = 'left'; }
    /* a simple drawn shopping cart, so no picture is needed */
    function cart(g, cx, cy, s) {
        g.save(); g.translate(cx, cy); g.scale(s, s); g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#ffffff';
        g.beginPath(); g.moveTo(-110, -70); g.lineTo(-80, -70); g.lineTo(-50, 40); g.lineTo(80, 40); g.lineTo(100, -40); g.lineTo(-62, -40); g.stroke();
        g.beginPath(); g.arc(-35, 72, 13, 0, Math.PI * 2); g.arc(65, 72, 13, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
        g.restore();
    }
    async function cartSlide(o, thumbs, days) {
        const c = canvas(), g = c.getContext('2d');
        const bg = await bgOf('cart'); if (bg) g.drawImage(bg, 0, 0, W_, H_);
        brand(g, true);
        g.fillStyle = 'rgba(255,255,255,.12)'; round(g, W_ / 2 - 170, 230, 340, 340, 170); g.fill();
        cart(g, W_ / 2, 400, 1.35);
        g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 50px ' + F; g.fillText(o.title, W_ / 2, 680);
        g.fillStyle = '#ffffff'; g.font = '800 168px ' + F; g.fillText(o.price, W_ / 2, 860);
        g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 44px ' + F; g.fillText(o.sub, W_ / 2, 940);
        /* the dinners as a row of small round photos */
        const n = thumbs.length, d = Math.min(120, Math.floor((W_ - 160) / Math.max(1, n)) - 16), gap = 16, w = n * d + (n - 1) * gap;
        let x = (W_ - w) / 2;
        for (let k = 0; k < thumbs.length; k++) { const im = thumbs[k];
            g.save(); g.beginPath(); g.arc(x + d / 2, 1080 + d / 2, d / 2, 0, Math.PI * 2); g.closePath(); g.clip();
            if (im) cover(g, im, x, 1080, d, d); else { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x, 1080, d, d); g.font = Math.round(d * .55) + 'px ' + F; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.fillText((days[k] && days[k].e) || '\ud83c\udf7d\ufe0f', x + d / 2, 1080 + d * .7); g.textAlign = 'center'; }
            g.restore(); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x + d / 2, 1080 + d / 2, d / 2, 0, Math.PI * 2); g.stroke();
            x += d + gap;
        }
        g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '500 30px ' + F; g.fillText(o.note, W_ / 2, 1290); g.textAlign = 'left';
        return c.toDataURL('image/jpeg', .86);
    }
    async function daySlide(d, im) {
        const c = canvas(), g = c.getContext('2d');
        if (im) cover(g, im, 0, 0, W_, H_);
        else { const bg = await bgOf('day'); if (bg) g.drawImage(bg, 0, 0, W_, H_); g.font = '260px ' + F; g.textAlign = 'center'; g.fillStyle = '#ffffff'; g.fillText(d.e || '\ud83c\udf7d\ufe0f', W_ / 2, 640); g.textAlign = 'left'; }
        const sh = g.createLinearGradient(0, H_ * .5, 0, H_); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.78)'); g.fillStyle = sh; g.fillRect(0, 0, W_, H_);
        const top = g.createLinearGradient(0, 0, 0, 220); top.addColorStop(0, 'rgba(0,0,0,.45)'); top.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = top; g.fillRect(0, 0, W_, 220);
        brand(g, false);
        g.font = '800 44px ' + F; const day = String(d.day || '').toUpperCase(), dw = g.measureText(day).width;
        g.fillStyle = 'rgba(255,255,255,.92)'; round(g, 56, 44, dw + 56, 74, 37); g.fill(); g.fillStyle = '#0b1d3f'; g.fillText(day, 84, 96);
        const fit = fitName(g, d.name, W_ - 120), lh = Math.round(fit.px * 1.15), lines = fit.lines; g.fillStyle = '#ffffff';
        let y = H_ - 120 - (lines.length - 1) * lh - (d.meta ? 70 : 0);
        for (const l of lines) { g.fillText(l, 60, y); y += lh; }
        if (d.meta) { g.font = '600 42px ' + F; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(d.meta, 60, y + 4); }
        return c.toDataURL('image/jpeg', .86);
    }
    /* o = { title, price, sub, note, days: [{ day, name, img, meta }] } -> data URLs, cart first */
    async function make(o) {
        const max = W.LowiCarousel ? W.LowiCarousel.MAX : 8, days = pick(o.days, max), ims = await Promise.all(days.map(d => load(d.img)));
        const out = [await cartSlide(o, ims, days)];
        for (let i = 0; i < days.length; i++) out.push(await daySlide(days[i], ims[i]));
        return out;
    }
    /* draw the slides and open New post with them (cover = the cart); nothing goes out until Posten */
    async function post(o) {
        const list = await make(o);
        if (!W.LowiR3F || !W.LowiR3F.postSheet || !W.TRIBE || !W.TRIBE.setPhotos) return false;
        W.LowiR3F.postSheet('', o.caption || '');
        W.TRIBE.setPhotos(list);
        return list.length;
    }
    W.LowiWeekCarousel = Object.assign({}, api, { make, post });
})(typeof window !== 'undefined' ? window : null);
