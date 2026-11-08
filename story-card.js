/* LOWiSPIKE · a post as a ready Instagram / TikTok story picture (8 Nov 2026, roadmap item 1).
   Emmanuel: "it should look so aesthetically, so nice ... that they will want to screenshot it, or we even give them an option to save
   it so that they can now post it on, for example, Instagram or TikTok. And everything's already done ... an automatic description
   ... that they could copy". From the share card (share-sheet.js): "Als Story speichern" draws a 1080 x 1920 picture on the phone
   (the post's picture in a glass frame, the name, the caption, "gemacht mit LOWiSPIKE") and hands it to the phone's share sheet
   (Instagram, TikTok, Fotos sichern), or downloads it; "Beschreibung kopieren" copies the caption with hashtags and the link.
   Nothing is uploaded. The background is drawn from an SVG picture so Dark mode's canvas recolouring (true-black.js) leaves it alone. */
(function (W, D) {
  'use strict';
  const SW = 1080, SH = 1920;
  const TAGS = { de: '#lowispike #blutzuckerfreundlich #ohnezucker #gesundessen #foodswap', en: '#lowispike #bloodsugarfriendly #nosugar #healthyfood #foodswap' };
  /* pure: the copy text (caption, hashtags, link) */
  function caption(o, lang) {
    const l = lang === 'en' ? 'en' : 'de', c = String((o && o.cap) || '').trim();
    return (c ? c + '\n\n' : '') + TAGS[l] + (o && o.url ? '\n' + o.url : '');
  }
  /* pure: wrap words into lines no wider than max (measure = width function) */
  function wrap(text, max, measure, lines) {
    const words = String(text || '').split(/\s+/).filter(Boolean), out = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (measure(t) > max && cur) { out.push(cur); cur = w; } else cur = t; }
    if (cur) out.push(cur);
    if (out.length > lines) { const k = out.slice(0, lines); k[lines - 1] = k[lines - 1].replace(/\s*\S*$/, '') + '…'; return k; }
    return out;
  }
  const api = { caption, wrap, SW, SH };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!W || !D || W.LowiStoryCard) return;
  const F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
  const BG = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1a3e"/><stop offset=".55" stop-color="#071331"/><stop offset="1" stop-color="#03070f"/></linearGradient><radialGradient id="b" cx=".5" cy=".38" r=".6"><stop offset="0" stop-color="#8fe7ff" stop-opacity=".22"/><stop offset="1" stop-color="#8fe7ff" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#a)"/><rect width="1080" height="1920" fill="url(#b)"/></svg>';
  function img(src, cors) {
    return new Promise(ok => { if (!src) return ok(null); const i = new Image(); if (cors) i.crossOrigin = 'anonymous'; i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  }
  function round(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  /* o = {img, name, cap, lang} -> Promise<Blob|null> (JPEG) */
  async function make(o) {
    o = o || {};
    const c = D.createElement('canvas'); c.width = SW; c.height = SH; const g = c.getContext('2d');
    const bg = await img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(BG)); if (bg) g.drawImage(bg, 0, 0, SW, SH);
    const de = o.lang !== 'en';
    let ph = await img(o.img, /^https:/.test(o.img || ''));
    /* the picture: 4:5 glass card, whole picture visible (contain) on a dark plate */
    const cw = 920, chh = 1150, cx = (SW - cw) / 2, cy = 250;
    g.save(); g.shadowColor = 'rgba(143,231,255,.35)'; g.shadowBlur = 60; round(g, cx, cy, cw, chh, 56); g.fillStyle = '#05070c'; g.fill(); g.restore();
    g.save(); round(g, cx, cy, cw, chh, 56); g.clip();
    if (ph) { const r = Math.min(cw / ph.naturalWidth, chh / ph.naturalHeight), w = ph.naturalWidth * r, h = ph.naturalHeight * r; g.drawImage(ph, cx + (cw - w) / 2, cy + (chh - h) / 2, w, h); }
    g.restore();
    g.lineWidth = 4; g.strokeStyle = 'rgba(143,231,255,.55)'; round(g, cx, cy, cw, chh, 56); g.stroke();
    /* top: brand */
    g.fillStyle = '#ffffff'; g.font = '800 44px ' + F; g.textAlign = 'center'; g.fillText('LOWiSPIKE', SW / 2, 160);
    g.fillStyle = 'rgba(143,231,255,.9)'; g.font = '700 30px ' + F; g.fillText(de ? 'blutzuckerfreundlich essen' : 'blood-sugar-friendly food', SW / 2, 205);
    /* name and caption */
    const name = String(o.name || 'LOWiSPIKE').slice(0, 40); let y = cy + chh + 110;
    g.textAlign = 'left'; g.font = '800 46px ' + F;
    const nw = g.measureText(name).width, ax = SW / 2 - (nw + 86) / 2;
    g.fillStyle = '#2fbf71'; g.beginPath(); g.arc(ax + 34, y - 15, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#04210f'; g.font = '800 34px ' + F; g.textAlign = 'center'; g.fillText(name.charAt(0).toUpperCase(), ax + 34, y - 3);
    g.fillStyle = '#ffffff'; g.font = '800 46px ' + F; g.textAlign = 'left'; g.fillText(name, ax + 86, y);
    g.font = '500 40px ' + F; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.88)';
    const lines = wrap(o.cap, 900, t => g.measureText(t).width, 3);
    y += 76; for (const l of lines) { g.fillText(l, SW / 2, y); y += 54; }
    /* footer */
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '600 30px ' + F; g.fillText(de ? 'gemacht mit LOWiSPIKE' : 'made with LOWiSPIKE', SW / 2, SH - 90);
    return new Promise(ok => { try { c.toBlob(b => ok(b), 'image/jpeg', .9); } catch (e) { ok(null); } });
  }
  /* save or share the picture: the phone's share sheet with the file (Instagram, TikTok, Fotos), else a download */
  async function save(o) {
    const b = await make(o); if (!b) return 'fail';
    const file = typeof File === 'function' ? new File([b], 'lowispike-story.jpg', { type: 'image/jpeg' }) : null;
    try { if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return 'shared'; } } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    try { const u = URL.createObjectURL(b), a = D.createElement('a'); a.href = u; a.download = 'lowispike-story.jpg'; D.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return 'saved'; } catch (e) { return 'fail'; }
  }
  W.LowiStoryCard = Object.assign({}, api, { make, save });
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
