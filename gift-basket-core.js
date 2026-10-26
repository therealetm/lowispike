/* Oct 25 2026: "Give a hand" (Emmanuel): people pay for each other's HEALTHY groceries. Pure rules, no DOM, no network.
   LOWiSPIKE never touches money: a person shares a basket of low-spike staples, a rough euro total and their OWN payment link
   (Ko-fi page, Stripe Payment Link, PayPal.me). Givers are sent out to that link. Nothing here stores or sees card data.
   - payLink(): strict check of the person's link: https only, exact hosts ko-fi.com, buy.stripe.com, donate.stripe.com,
     paypal.me, a plain page path, no login, port, query or fragment (dropped). Same pattern as the server check constraint
     in supabase/proposals/gift_baskets_20261025.sql (PAY_RE_SQL), pinned by tests/gift-basket-core.test.cjs.
   - itemCheck()/build(): only foods the app's own rating calls low-spike (LowiFoodPolicy.rateName verdict JA) go in a basket.
   - trust(): the verified score (Emmanuel: "like Uber, you rate after the drive"). After a basket is helped the person has 7
     days to add the receipt photo. The giver taps Verified or Doesn't match; a receipt left unanswered 7 days counts as
     verified; no receipt in 7 days or Doesn't match counts against them. pct = verified / counted, "new" until something
     counted. Mirrors gift_trust() in the SQL. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiGiftBasketCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const DAY = 864e5;
    const WINDOW_DAYS = 7;
    const MAX_ITEMS = 12;
    const MIN_EUR = 5, MAX_EUR = 150;
    const MAX_URL = 120;
    /* Ko-fi pages that are not a person's page (the dashboard Emmanuel sent was ko-fi.com/Manage/) */
    const KOFI_RESERVED = ['manage', 'account', 'settings', 'home', 'explore', 'login', 'signin', 'signup', 'register', 'logout',
        'discover', 'feed', 'shop', 'about', 'blog', 'help', 'support', 'pricing', 'gold', 'search', 'notifications', 'messages',
        'commissions', 'memberships', 'donations', 'stream', 'streamalerts', 'legal', 'privacy', 'terms', 'checkout', 'cart'];
    const PAY_RE_SQL = '^https://((www\\.)?ko-fi\\.com/[A-Za-z0-9_]{2,40}|(buy|donate)\\.stripe\\.com/(test_)?[A-Za-z0-9]{8,40}|(www\\.)?paypal\\.me/[A-Za-z0-9]{1,20}(/[0-9]{1,4}([.][0-9]{1,2})?(EUR)?)?)$';
    const PAY_RE = new RegExp(PAY_RE_SQL);

    function payLink(raw) {
        let s = String(raw == null ? '' : raw).trim();
        if (!s) return { ok: false, why: 'empty' };
        if (/\s/.test(s)) return { ok: false, why: 'format' };
        if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) {
            /* "ko-fi.com/lena" typed without https:// is fine; "http://" and every other scheme is not */
            if (/^(www\.)?(ko-fi\.com|buy\.stripe\.com|donate\.stripe\.com|paypal\.me)\//i.test(s)) s = 'https://' + s;
            else return { ok: false, why: 'host' };
        }
        if (s.length > 300) return { ok: false, why: 'long' };
        let u;
        try { u = new URL(s); } catch (e) { return { ok: false, why: 'format' }; }
        if (u.protocol !== 'https:') return { ok: false, why: 'https' };
        if (u.username || u.password || u.port) return { ok: false, why: 'format' };
        const host = u.hostname.toLowerCase();
        let path = u.pathname.replace(/\/+$/, '');
        let kind = '';
        if (host === 'ko-fi.com' || host === 'www.ko-fi.com') {
            kind = 'kofi';
            const m = path.match(/^\/([A-Za-z0-9_]{2,40})$/);
            if (!m || KOFI_RESERVED.includes(m[1].toLowerCase())) return { ok: false, why: 'path', kind };
        } else if (host === 'buy.stripe.com' || host === 'donate.stripe.com') {
            kind = 'stripe';
            if (!/^\/(test_)?[A-Za-z0-9]{8,40}$/.test(path)) return { ok: false, why: 'path', kind };
        } else if (host === 'paypal.me' || host === 'www.paypal.me') {
            kind = 'paypal';
            path = path.replace(/^(\/[A-Za-z0-9]{1,20}\/\d{1,4}),(\d{1,2})/, '$1.$2');
            if (!/^\/[A-Za-z0-9]{1,20}(\/[0-9]{1,4}([.][0-9]{1,2})?(EUR)?)?$/.test(path)) return { ok: false, why: 'path', kind };
        } else return { ok: false, why: 'host' };
        const url = 'https://' + host + path;
        if (url.length > MAX_URL) return { ok: false, why: 'long', kind };
        if (!PAY_RE.test(url)) return { ok: false, why: 'path', kind };
        return { ok: true, url, kind };
    }
    const LINK_NAME = { kofi: 'Ko-fi', stripe: 'Stripe', paypal: 'PayPal' };
    function linkName(kind) { return LINK_NAME[kind] || ''; }

    function norm(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ß]+/g, ' ').trim();
    }
    function cleanText(s, max) {
        const t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
        return t ? t.slice(0, max).trim() : '';
    }
    /* rate: (name) => {verdict:'JA'|'SELTEN'|'NEIN'|null}. Only JA (low-spike) foods go in a basket. */
    function itemCheck(name, rate) {
        const n = cleanText(name, 40);
        if (n.length < 2) return { ok: false, why: 'empty', name: n };
        let v = null;
        try { const r = rate ? rate(n) : null; v = r && r.verdict ? r.verdict : null; } catch (e) { v = null; }
        if (v === 'JA') return { ok: true, name: n, verdict: v };
        return { ok: false, why: v ? 'spike' : 'unknown', name: n, verdict: v };
    }
    function total(raw) {
        const s = String(raw == null ? '' : raw).replace(/€|eur/gi, '').replace(/\s/g, '').replace(',', '.');
        if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
        const n = Math.round(parseFloat(s) * 100) / 100;
        return n >= MIN_EUR && n <= MAX_EUR ? n : null;
    }
    /* draft: {items:[name], firstName, anon, city, total, payUrl}. Returns {ok, row, errors:[key]} (row = DB insert columns). */
    function build(draft, rate) {
        const d = draft || {}, errors = [];
        const seen = new Set(), items = [];
        (Array.isArray(d.items) ? d.items : []).forEach(x => {
            const c = itemCheck(typeof x === 'string' ? x : x && x.n, rate);
            const k = norm(c.name);
            if (!c.ok || !k || seen.has(k)) return;
            seen.add(k); items.push({ n: c.name });
        });
        if (!items.length) errors.push('items');
        if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
        const t = total(d.total);
        if (t == null) errors.push('total');
        const link = payLink(d.payUrl);
        if (!link.ok) errors.push('link');
        const anon = !!d.anon;
        const first = anon ? '' : cleanText(d.firstName, 24);
        const city = cleanText(d.city, 40);
        if (errors.length) return { ok: false, errors };
        return { ok: true, errors, row: { first_name: first || null, anon, city: city || null, items, total_eur: t, pay_url: link.url } };
    }
    /* a row from the server, made safe to show: a link that fails the check is dropped, not shown */
    function view(row) {
        if (!row || !row.id) return null;
        const link = payLink(row.pay_url);
        const items = (Array.isArray(row.items) ? row.items : []).map(x => cleanText(x && x.n, 40)).filter(Boolean).slice(0, MAX_ITEMS);
        return {
            id: String(row.id), owner: row.user_id || '', anon: !!row.anon,
            name: row.anon ? '' : cleanText(row.first_name, 24), city: cleanText(row.city, 40), items,
            total: Number(row.total_eur) || 0, link: link.ok ? link.url : '', kind: link.ok ? link.kind : '',
            created: Date.parse(row.created_at) || 0, helper: row.helper_id || '', helped: Date.parse(row.helped_at) || 0,
            receipt: Date.parse(row.receipt_at) || 0, receiptPath: row.receipt_path || '', verdict: row.verdict || '',
            verdictAt: Date.parse(row.verdict_at) || 0
        };
    }

    /* One helped basket's state at time now (ms):
       'open' (not helped), 'await-receipt' (helped, receipt window open), 'missed' (no receipt in 7 days),
       'await-verdict' (receipt there, giver can still answer), 'auto-verified' (receipt unanswered 7 days),
       'verified', 'mismatch'. */
    function status(b, now) {
        const t = now == null ? Date.now() : now;
        if (!b || !b.helped) return 'open';
        if (b.verdict === 'verified') return 'verified';
        if (b.verdict === 'mismatch') return 'mismatch';
        if (b.receipt) return t > b.receipt + WINDOW_DAYS * DAY ? 'auto-verified' : 'await-verdict';
        return t > b.helped + WINDOW_DAYS * DAY ? 'missed' : 'await-receipt';
    }
    function canReceipt(b, now) { return status(b, now) === 'await-receipt'; }
    function canVerdict(b, now) { return status(b, now) === 'await-verdict'; }
    function daysLeft(b, now) {
        const t = now == null ? Date.now() : now, s = status(b, t);
        const from = s === 'await-receipt' ? b.helped : s === 'await-verdict' ? b.receipt : 0;
        if (!from) return 0;
        return Math.max(0, Math.ceil((from + WINDOW_DAYS * DAY - t) / DAY));
    }
    /* baskets: the person's helped baskets (view() shape). Returns {counted, verified, pending, pct, label}.
       label: 'new' while nothing counted yet (nobody starts at a free 100%), else 'pct'. */
    function trust(baskets, now) {
        let counted = 0, verified = 0, pending = 0;
        (baskets || []).forEach(b => {
            const s = status(b, now);
            if (s === 'open') return;
            if (s === 'await-receipt' || s === 'await-verdict') { pending++; return; }
            counted++;
            if (s === 'verified' || s === 'auto-verified') verified++;
        });
        return fromCounts(counted, verified, pending);
    }
    /* the same result from the server's gift_trust() counts */
    function fromCounts(counted, verified, pending) {
        const c = Math.max(0, counted | 0), v = Math.min(c, Math.max(0, verified | 0));
        return { counted: c, verified: v, pending: Math.max(0, pending | 0), pct: c ? Math.floor(v * 100 / c) : null, label: c ? 'pct' : 'new' };
    }
    function careEventId(id) { return 'gift:' + String(id || '').slice(0, 40); }
    /* Oct 26 (Emmanuel, MAYA-HANDOFF 0.22: "swipe through groceries to pay for"): the Give a hand swipe deck. The baskets you can
       help (not yours, with a pay link), minus the ones you swiped left in the last 24 hours; one you swiped right on stays on top
       until you help or skip it. Pure: skipped = { id: time }, picked = id or ''. */
    const SKIP_MS = 24 * 3600 * 1000;
    function deck(open, me, skipped, picked, now) {
        skipped = skipped || {}; now = now || Date.now();
        const list = (Array.isArray(open) ? open : []).filter(b => b && b.owner !== me && b.link && !(skipped[b.id] && now - skipped[b.id] < SKIP_MS));
        const k = picked ? list.findIndex(b => b.id === picked) : -1;
        if (k > 0) list.unshift(list.splice(k, 1)[0]);
        return list;
    }
    /* drop skips older than 24 hours so the saved map stays small */
    function freshSkips(skipped, now) { now = now || Date.now(); const o = {}; Object.keys(skipped || {}).forEach(id => { if (now - skipped[id] < SKIP_MS) o[id] = skipped[id]; }); return o; }
    /* a horizontal drag decides: past the threshold (or a quick flick) right = pay, left = skip, else it springs back */
    function swipeDecision(dx, dy, ms, width) {
        const th = Math.max(80, Math.min(140, (width || 360) * 0.28));
        if (Math.abs(dy) > Math.abs(dx) * 1.2) return 'back';
        const fast = ms > 0 && Math.abs(dx) / ms > 0.6 && Math.abs(dx) > 40;
        if (dx >= th || (fast && dx > 0)) return 'pay';
        if (dx <= -th || (fast && dx < 0)) return 'skip';
        return 'back';
    }

    return { DAY, WINDOW_DAYS, MAX_ITEMS, MIN_EUR, MAX_EUR, MAX_URL, PAY_RE_SQL, KOFI_RESERVED,
        payLink, linkName, itemCheck, total, build, view, status, canReceipt, canVerdict, daysLeft, trust, fromCounts, careEventId, norm, SKIP_MS, deck, freshSkips, swipeDecision };
});
