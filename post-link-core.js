/* LOWiSPIKE · a For You post as a link (8 Nov 2026).
   Emmanuel: "the share button, I should be able to send it, copy it, and then send that directly to someone on WhatsApp so they can
   see it, open it, scroll through it". The post travels inside the link: post/#d=<base64url JSON>, so the page post/ needs no account,
   no server and no database rule. Only pictures and videos from the app's own media storage are allowed (the same rule as chat photos),
   the caption is plain text, at most 8 pictures. Pure: encode(post) / decode(hash). */
(function (root) {
  'use strict';
  const MEDIA = /^https:\/\/[a-z0-9-]{8,40}\.supabase\.co\/storage\/v1\/object\/public\/media\/[A-Za-z0-9_\-\/.]{4,200}$/;
  const okUrl = u => typeof u === 'string' && u.length < 400 && MEDIA.test(u) && u.indexOf('..') < 0;
  function b64e(s) {
    const bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Buffer.from(s, 'utf8');
    let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
    return (typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
    const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : Buffer.from(bytes).toString('utf8');
  }
  /* the shared start of the picture links is sent once (b), each picture only by its end */
  function prefix(list) { if (!list.length) return ''; let p = list[0]; list.forEach(u => { while (u.indexOf(p) !== 0) p = p.slice(0, -1); }); return p.slice(0, p.lastIndexOf('/') + 1); }
  /* {who, cap, slides|photo, vurl, poster} -> the payload, or null when nothing can be shown to someone without the app */
  function pack(p) {
    if (!p) return null;
    const s = (Array.isArray(p.slides) && p.slides.length ? p.slides : p.photo ? [p.photo] : []).filter(okUrl).slice(0, 8);
    const v = p.vurl && okUrl(p.vurl) ? p.vurl : '';
    const c = String(p.cap || '').replace(/\s+/g, ' ').trim().slice(0, 400), w = String(p.who || '').trim().slice(0, 40);
    if (p.vid && !v) return null;              /* a video still only on the phone */
    if (!s.length && !v && !c) return null;
    if (!s.length && !v && (p.photo || (p.slides && p.slides.length))) return null; /* pictures not uploaded yet */
    const o = { w, c };
    const all = s.concat(v ? [v] : []), b = prefix(all);
    if (b) o.b = b;
    if (s.length) o.s = s.map(u => u.slice(b.length));
    if (v) o.v = v.slice(b.length);
    return o;
  }
  /* Nov 8 2026 (Emmanuel: "the link ... looks horrible ... They're gonna think I'm hacking them ... shorter"): an uploaded post is
     found by its place in the app's media storage, which always follows one pattern (carousel-core.js path()): <user>/<post>.jpg,
     <user>/<post>-2.jpg ... So the link only needs the user id (16 bytes, 22 letters), how many pictures (or which video kind) and the
     post id: post/?k=<about 37 letters>. The caption travels in the share message, not the link. */
  const HOST = 'https://vnfwmifmsfecascwaody.supabase.co/storage/v1/object/public/media/';
  const VK = { mp4: 'm', mov: 'q', webm: 'w' }, KV = { m: 'mp4', q: 'mov', w: 'webm' };
  function bytesB64(arr) { let bin = ''; arr.forEach(b => { bin += String.fromCharCode(b); }); return (typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64Bytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); return Array.from(bin, c => c.charCodeAt(0)); }
  function short(p) {
    if (!p) return '';
    const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([A-Za-z0-9_-]{2,40})\.(jpg|mp4|mov|webm)$/;
    let kind = '', u = '', id = '';
    if (p.vid) { const v = String(p.vurl || ''); if (v.indexOf(HOST) !== 0) return ''; const x = m.exec(v.slice(HOST.length)); if (!x || !VK[x[3]]) return ''; u = x[1]; id = x[2]; kind = VK[x[3]]; }
    else {
      const c = String(p.photo || ''); if (c.indexOf(HOST) !== 0) return ''; const x = m.exec(c.slice(HOST.length)); if (!x || x[3] !== 'jpg') return '';
      u = x[1]; id = x[2];
      const sl = Array.isArray(p.slides) && p.slides.length ? p.slides : [c];
      if (sl.length > 8) return '';
      for (let i = 0; i < sl.length; i++) if (sl[i] !== HOST + u + '/' + id + (i ? '-' + (i + 1) : '') + '.jpg') return '';
      kind = String(sl.length);
    }
    const hex = u.replace(/-/g, ''), bytes = []; for (let i = 0; i < 32; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
    return bytesB64(bytes) + kind + id;
  }
  function unshort(k) {
    const m = /^([A-Za-z0-9_-]{22})([1-8mqw])([A-Za-z0-9_-]{2,40})$/.exec(String(k || '')); if (!m) return null;
    const b = b64Bytes(m[1]); if (b.length !== 16) return null;
    const h = b.map(x => (x < 16 ? '0' : '') + x.toString(16)).join(''), u = h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    const id = m[3], base = HOST + u + '/' + id;
    if (KV[m[2]]) return { w: '', c: '', s: [], v: base + '.' + KV[m[2]] };
    const n = +m[2], s = []; for (let i = 0; i < n; i++) s.push(base + (i ? '-' + (i + 1) : '') + '.jpg');
    return { w: '', c: '', s, v: '' };
  }
  function encode(p, base) {
    const k = short(p); if (k) return (base || '') + '?k=' + k;
    const o = pack(p); return o ? (base || '') + '#d=' + b64e(JSON.stringify(o)) : '';
  }
  /* a link: ?k= (short) or #d= (a post with only text, or older links) */
  function fromUrl(search, hash) { const m = /[?&]k=([A-Za-z0-9_-]{25,64})/.exec(String(search || '')); return m ? unshort(m[1]) : decode(hash); }
  function decode(hash) {
    const m = /[#&]d=([A-Za-z0-9_-]{4,8000})/.exec(String(hash || '')); if (!m) return null;
    let o; try { o = JSON.parse(b64d(m[1])); } catch (e) { return null; }
    if (!o || typeof o !== 'object') return null;
    const b = typeof o.b === 'string' ? o.b : '';
    const s = Array.isArray(o.s) ? o.s.slice(0, 8).map(x => b + String(x)).filter(okUrl) : [];
    const v = typeof o.v === 'string' && okUrl(b + o.v) ? b + o.v : '';
    const c = typeof o.c === 'string' ? o.c.slice(0, 400) : '', w = typeof o.w === 'string' ? o.w.slice(0, 40) : '';
    if (!s.length && !v && !c) return null;
    return { w, c, s, v };
  }
  const api = { encode, decode, pack, okUrl, short, unshort, fromUrl };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.LowiPostLink = api;
})(typeof self !== 'undefined' ? self : this);
