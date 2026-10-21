/* LOWiSPIKE Affiliates access + recruit levels (21 Oct 2026, Eman: "I'm giving out the thing they're selling for free. Anyone new has to buy the product.").
   Pure logic, no DOM. Used by affiliates/blueprint.js and tests/affiliates-access.test.cjs.
   - Access: the full script, shot list, caption and skill note of a series open only with an unlock code for that series.
     Codes are never in this repo: affiliates/access-list.js holds PBKDF2-SHA-256 hashes only (tools/affiliates/codes.cjs makes them).
   - Referral id: ?ref=<Beacons affiliateLinkId> (the UUID in an affiliate's Beacons link). It is kept on this device and goes into the Buy link.
   - Recruit levels: an active recruit (bought through your link AND published a video made with the template, checked by Eman)
     counts like 5 sales, and every 3 active recruits lift you one whole level. Numbers in DECISIONS.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LowiAffAccess = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STORE = 'lowi.aff.unlock.v1', REF = 'lowi.aff.ref', MINE = 'lowi.aff.me', SALES = 'lowi.aff.sales';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const RECRUIT = { salesPerRecruit: 5, recruitsPerLevel: 3 };
  const SITE = 'https://therealetm.github.io/lowispike/affiliates/';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /* Codes look like VIP-K7QM-9XDR-2HPW; spaces, dashes and case do not matter when typed. */
  function normalize(code) { return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function hex(buf) { return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join(''); }
  function subtle() { const c = (typeof crypto !== 'undefined' && crypto) || (typeof globalThis !== 'undefined' && globalThis.crypto); return c && c.subtle; }
  async function hash(code, list) {
    const s = subtle(); if (!s) throw new Error('crypto');
    const enc = new TextEncoder();
    const key = await s.importKey('raw', enc.encode(normalize(code)), 'PBKDF2', false, ['deriveBits']);
    return hex(await s.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(list.salt), iterations: list.iter }, key, 256));
  }
  function entry(h, list) { return (list && list.codes || []).find(c => c.h === h) || null; }
  /* -> { ok, tracks, h } . A code shorter than 12 letters is refused without hashing. */
  async function check(code, list) {
    if (normalize(code).length < 12) return { ok: false, tracks: [], h: '' };
    const h = await hash(code, list), e = entry(h, list);
    return e ? { ok: true, tracks: e.tracks.slice(), h } : { ok: false, tracks: [], h };
  }
  function newCode(prefix, rnd) {
    const r = rnd || (n => { const a = new Uint8Array(n); (globalThis.crypto).getRandomValues(a); return Array.from(a); });
    const b = r(12), g = b.map(x => ALPHABET[x % 32]).join('');
    return (prefix ? prefix + '-' : '') + g.slice(0, 4) + '-' + g.slice(4, 8) + '-' + g.slice(8, 12);
  }

  /* ---------- Unlocks on this device. Stored hashes are checked against the list on every load, so a removed code locks again. ---------- */
  function get(store, k) { try { return store && store.getItem(k); } catch (e) { return null; } }
  function set(store, k, v) { try { if (v == null) store.removeItem(k); else store.setItem(k, v); } catch (e) {} }
  function saved(store, list) {
    let hs = []; try { hs = JSON.parse(get(store, STORE) || '[]'); } catch (e) {}
    const open = {};
    for (const h of Array.isArray(hs) ? hs : []) { const e = entry(h, list); if (e) e.tracks.forEach(t => { open[t] = true; }); }
    return open;
  }
  function remember(store, h) {
    let hs = []; try { hs = JSON.parse(get(store, STORE) || '[]'); } catch (e) {}
    if (!Array.isArray(hs)) hs = [];
    if (hs.indexOf(h) < 0) hs.push(h);
    set(store, STORE, JSON.stringify(hs.slice(-8)));
  }
  function forget(store) { set(store, STORE, null); }

  /* ---------- Referral id = Beacons affiliateLinkId ---------- */
  function idFrom(text) {
    const s = String(text || '').trim();
    const m = s.match(/[?&](?:affiliateLinkId|ref)=([0-9a-f-]{36})/i);
    const id = m ? m[1] : s;
    return UUID.test(id) ? id.toLowerCase() : '';
  }
  function refFrom(search) { const m = String(search || '').match(/[?&]ref=([^&#]+)/); return m ? idFrom(decodeURIComponent(m[1])) : ''; }
  function keepRef(store, search) { const r = refFrom(search); if (r) set(store, REF, r); return r || idFrom(get(store, REF)); }
  function shareUrl(id) { return id ? SITE + '?ref=' + id : ''; }
  function buyUrl(track, ref, list) {
    const base = list && list.buy && list.buy[track];
    if (!base) return '';
    return ref ? base + (base.indexOf('?') < 0 ? '?' : '&') + 'affiliateLinkId=' + ref : base;
  }
  function waUrl(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }

  /* ---------- Recruits ---------- */
  function videoOk(url) {
    try { const u = new URL(String(url || '').trim()); return /^https?:$/.test(u.protocol) && /(^|\.)(tiktok\.com|instagram\.com)$/i.test(u.hostname) && u.pathname.length > 1; } catch (e) { return false; }
  }
  function submitText(o) {
    return 'LOWiSPIKE Video-Check: ' + String(o.video).trim() + '\nSerie: ' + o.series + (o.ref ? '\nGeworben von: ' + o.ref : '\nGeworben von: niemand (direkt gekauft)') + '\nBitte pr\u00fcfen und als aktiven Recruit eintragen.';
  }
  /* Verified recruits of one affiliate: one per video, entries Eman checked (affiliates/recruits.js). */
  function recruitsFor(id, data) {
    if (!id) return 0;
    const seen = new Set();
    for (const r of (data && data.verified) || []) if (r && r.by === id && r.video) seen.add(String(r.video).replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase());
    return seen.size;
  }

  /* ---------- Level with recruits. tiers = LowiBlueprint.TIERS ({from,to,rate}) ----------
     credit = sales + 5 x active recruits picks the level, then +1 level per 3 active recruits, capped at the top level. */
  function levelOf(credit, tiers) { const i = tiers.findIndex(t => credit >= t.from && credit <= t.to); return credit < tiers[0].from ? 1 : (i < 0 ? tiers.length : i + 1); }
  function progress(sales, recruits, tiers) {
    sales = Math.max(0, Math.floor(Number(sales) || 0)); recruits = Math.max(0, Math.floor(Number(recruits) || 0));
    const credit = sales + RECRUIT.salesPerRecruit * recruits;
    const base = levelOf(credit, tiers), bonus = Math.floor(recruits / RECRUIT.recruitsPerLevel);
    const level = Math.min(tiers.length, base + bonus);
    const top = level >= tiers.length;
    let need = null, needRecruits = null;
    if (!top) {
      for (let n = 1; n <= 1000; n++) if (Math.min(tiers.length, levelOf(credit + n, tiers) + bonus) > level) { need = n; break; }
      for (let n = 1; n <= 50; n++) if (progress1(sales, recruits + n, tiers) > level) { needRecruits = n; break; }
    }
    const lo = level === 1 ? 0 : tiers[Math.max(0, base - 1)].from - 1, hi = need == null ? credit : credit + need;
    return { sales, recruits, credit, base, bonus, level, rate: tiers[level - 1].rate, top, need, needRecruits,
      fill: top ? 1 : Math.max(0, Math.min(1, (credit - lo) / Math.max(1, hi - lo))) };
  }
  function progress1(sales, recruits, tiers) { return Math.min(tiers.length, levelOf(sales + RECRUIT.salesPerRecruit * recruits, tiers) + Math.floor(recruits / RECRUIT.recruitsPerLevel)); }

  return { STORE, REF, MINE, SALES, ALPHABET, RECRUIT, SITE, normalize, hash, entry, check, newCode, saved, remember, forget, get, set,
    idFrom, refFrom, keepRef, shareUrl, buyUrl, waUrl, videoOk, submitText, recruitsFor, levelOf, progress };
});
