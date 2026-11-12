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
    /* Nov 5 2026 (owner: "Why is it even leaving out stuff? Everything in a freaking Warenkorb should go in there"; screenshots:
       Halloumi "not low-spike", Courgette and Mint "can't rate it yet"). The app used to let only foods its rating calls low-spike
       into a basket, which was stricter than the live server. Now the app takes every food and only mirrors what the live server
       still refuses (gift_items_ok() in supabase/proposals/gift_baskets_20261025.sql) until the open-cart setup file has run.
       This word list is the one source: tools/gift-basket/deny.cjs builds the server SQL from it.
       Each term: [word, must start at a word start, must end at a word end]. */
    const DENY_TERMS = Object.freeze([
      // drinks
      ['cola', 1, 0], ['coca', 1, 0], ['pepsi', 1, 0], ['fanta', 1, 0], ['sprite', 1, 1], ['limo', 1, 1], ['limonade', 0, 1], ['eistee', 1, 0], ['ice tea', 1, 1], ['iced tea', 1, 1],
      ['softdrink', 1, 0], ['soft drink', 1, 0], ['energy drink', 1, 0], ['energydrink', 1, 0], ['red bull', 1, 1], ['monster energy', 1, 1], ['refresco', 1, 0],
      ['saft', 0, 1], ['juice', 1, 1], ['zumo', 1, 1], ['nektar', 0, 1], ['nectar', 1, 1], ['smoothie', 1, 0],
      ['bier', 1, 1], ['beer', 1, 1], ['cerveza', 1, 0], ['wein', 1, 1], ['wine', 1, 1], ['vino', 1, 1], ['vodka', 1, 0], ['wodka', 1, 0], ['schnaps', 1, 0], ['likör', 0, 1], ['rum', 1, 1], ['sekt', 1, 1],
      // sugar and sweets
      ['zucker', 1, 1], ['sugar', 1, 1], ['azucar', 1, 1], ['azúcar', 1, 1], ['traubenzucker', 1, 0], ['puderzucker', 1, 0],
      ['süßigkeit', 1, 0], ['suessigkeit', 1, 0], ['süssigkeit', 1, 0], ['candy', 1, 0], ['sweets', 1, 1], ['caramelo', 1, 0], ['golosina', 1, 0], ['dulces', 1, 1],
      ['bonbon', 1, 0], ['lolli', 1, 0], ['lollipop', 1, 0], ['gummibär', 1, 0], ['gummibaer', 1, 0], ['weingummi', 1, 0], ['fruchtgummi', 1, 0], ['haribo', 1, 0], ['gummy bear', 1, 0],
      ['nutella', 1, 0], ['schokoriegel', 1, 0], ['chocolate bar', 1, 0], ['milchschokolade', 1, 0], ['milk chocolate', 1, 1], ['snickers', 1, 0], ['mars', 1, 1], ['twix', 1, 0], ['kitkat', 1, 0], ['kit kat', 1, 0], ['milchschnitte', 1, 0], ['kinder', 1, 1],
      ['honig', 1, 1], ['honey', 1, 1], ['miel', 1, 1], ['marmelade', 1, 0], ['konfitüre', 1, 0], ['jam', 1, 1], ['mermelada', 1, 0], ['sirup', 0, 1], ['syrup', 1, 1], ['sirope', 1, 0],
      ['eiscreme', 1, 0], ['speiseeis', 1, 0], ['ice cream', 1, 1], ['helado', 1, 0],
      ['kuchen', 0, 1], ['torte', 0, 1], ['cake', 1, 1], ['cupcake', 1, 0], ['tarta', 1, 1], ['pastel', 1, 1], ['keks', 1, 0], ['kekse', 0, 1], ['cookie', 1, 0], ['galleta', 1, 0], ['waffel', 1, 0], ['waffle', 1, 0],
      ['donut', 1, 0], ['doughnut', 1, 0], ['berliner', 1, 1], ['croissant', 1, 0], ['muffin', 1, 0], ['brownie', 1, 0], ['churro', 1, 0], ['pudding', 1, 1],
      // white flour, potatoes, fast food
      ['toast', 1, 0], ['toastbrot', 1, 0], ['weißbrot', 1, 0], ['weissbrot', 1, 0], ['white bread', 1, 0], ['pan blanco', 1, 0], ['pan de molde', 1, 0], ['brötchen', 0, 1], ['broetchen', 0, 1], ['baguette', 1, 0], ['brezel', 1, 0], ['pretzel', 1, 0], ['bagel', 1, 0],
      ['cornflakes', 1, 0], ['frosties', 1, 0], ['choco pops', 1, 0], ['cereal', 1, 0],
      ['chips', 0, 1], ['crisps', 1, 1], ['patatas fritas', 1, 0], ['pommes', 1, 0], ['french fries', 1, 0], ['fries', 1, 1], ['pizza', 1, 0], ['burger', 1, 0], ['hamburguesa', 1, 0], ['hot dog', 1, 1], ['nachos', 1, 0], ['popcorn', 1, 0], ['palomitas', 1, 0],
      // high-sugar fruit the app refuses
      ['banane', 1, 0], ['bananen', 1, 0], ['banana', 1, 0], ['platano', 1, 0], ['plátano', 1, 0], ['weintraube', 1, 0], ['trauben', 0, 1], ['grapes', 1, 1], ['uvas', 1, 1], ['datteln', 1, 0], ['dates', 1, 1], ['dátiles', 1, 0], ['rosinen', 1, 0], ['raisins', 1, 0], ['pasas', 1, 1]
    ]);
    const DENY_EXCEPT = Object.freeze(['zuckerschote', 'zuckerschoten', 'zuckererbse', 'zuckererbsen', 'zuckerhut', 'zuckerfrei', 'ohne zucker', 'ohne zuckerzusatz', 'sugar free', 'sugar-free', 'no sugar', 'no added sugar', 'sugar snap', 'sin azúcar', 'sin azucar', 'sin azúcares', 'rum steak', 'without sugar', 'less sugar', 'weniger zucker', 'menos az\u00facar', 'menos azucar']);
    const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ -]?');
    let denyRe = null, exceptRe = null;
    /* no lookbehind (older iPhones): "(?:^|[^letter or digit])" does the same job for test() */
    function denyRes() {
        if (denyRe) return [denyRe, exceptRe];
        try {
            denyRe = new RegExp(DENY_TERMS.map(([t, s, e]) => (s ? '(?:^|[^\\p{L}\\p{N}])' : '') + reEsc(t) + (e ? '(?![\\p{L}\\p{N}])' : '')).join('|'), 'iu');
            exceptRe = new RegExp(DENY_EXCEPT.map(reEsc).join('|'), 'giu');
        } catch (e) { denyRe = /$^/; exceptRe = /$^/g; }
        return [denyRe, exceptRe];
    }
    /* true when the live server (old rules) would refuse this food name */
    function serverRefuses(name) { const r = denyRes(); return r[0].test(String(name || '').toLowerCase().replace(r[1], ' ')); }
    /* rate: (name) => {verdict:'JA'|'SELTEN'|'NEIN'|null}. Only JA (low-spike) foods go in a basket. */
    function itemCheck(name, rate) {
        const n = cleanText(name, 40);
        if (n.length < 2) return { ok: false, why: 'empty', name: n };
        let v = null;
        try { const r = rate ? rate(n) : null; v = r && r.verdict ? r.verdict : null; } catch (e) { v = null; }
        if (v === 'JA') return { ok: true, name: n, verdict: v };
        return { ok: false, why: v ? 'spike' : 'unknown', name: n, verdict: v };
    }
    /* how many of one food (cart quantity): a whole number 1..99, anything else is 1 */
    function qty(raw) { const q = Math.floor(Number(raw)); return q >= 1 ? Math.min(99, q) : 1; }
    /* Oct 26 2026 (MAYA-HANDOFF 0.34, Emmanuel): "someone else pays" turns the WHOLE cart into a basket, no typing.
       lines: the cart [{n, q}]. name(n): the name to show and store (app language). Same rule as build(): only foods the
       rating calls low-spike go in. Returns {items:[{n,q}], left:[{n, why:'spike'|'unknown'|'full'}]}; same food twice adds up. */
    /* Nov 5 2026 (owner walkthrough: "Why is it even leaving out stuff? Everything in a freaking Warenkorb should go in there"):
       lim = what the server takes, from the gift_limits() function (supabase/proposals/gift_baskets_open_cart_20261105.sql).
       {anyFood:true, maxItems:60} once that file has run: every food in the cart goes in. Until then the live database still
       refuses spike foods and more than 12 foods, so those are listed plainly as left out, never dropped silently. */
    const OLD_LIMITS = Object.freeze({ anyFood: false, maxItems: MAX_ITEMS });
    function limitsOf(raw) {
        if (!raw || typeof raw !== 'object') return OLD_LIMITS;
        const mi = Math.floor(Number(raw.max_items != null ? raw.max_items : raw.maxItems));
        return { anyFood: !!(raw.any_food != null ? raw.any_food : raw.anyFood), maxItems: mi >= 1 ? Math.min(60, mi) : MAX_ITEMS };
    }
    const anyCheck = name => { const n = cleanText(name, 40); return n.length < 2 ? { ok: false, why: 'empty', name: n } : { ok: true, name: n, verdict: null }; };
    /* Nov 5 2026: until the open-cart file runs, take what the live server takes: every food but its short spike word list */
    const serverCheck = name => { const c = anyCheck(name); return c.ok && serverRefuses(c.name) ? { ok: false, why: 'server', name: c.name } : c; };
    const checkFor = L => L.anyFood ? anyCheck : serverCheck;
    /* one food typed or picked by hand, same rule as the whole cart */
    function basketCheck(name, lim) { return checkFor(lim && lim.maxItems ? lim : OLD_LIMITS)(name); }
    function fromCart(lines, rate, name, lim) {
        const L = lim && lim.maxItems ? lim : OLD_LIMITS;
        const items = [], left = [], at = new Map();
        (Array.isArray(lines) ? lines : []).forEach(l => {
            const raw = cleanText(l && l.n, 40); if (raw.length < 2) return;
            const shown = cleanText(name ? name(raw) : raw, 40) || raw;
            const c = checkFor(L)(shown), k = norm(shown), q = qty(l && l.q);
            if (!c.ok) { if (!left.some(x => norm(x.n) === k)) left.push({ n: shown, why: c.why === 'empty' ? 'unknown' : c.why }); return; }
            if (at.has(k)) { const it = items[at.get(k)]; it.q = Math.min(99, it.q + q); return; }
            if (items.length >= L.maxItems) { left.push({ n: shown, why: 'full' }); return; }
            at.set(k, items.length); items.push({ n: c.name, q });
        });
        return { items, left };
    }
    function total(raw) {
        const s = String(raw == null ? '' : raw).replace(/€|eur/gi, '').replace(/\s/g, '').replace(',', '.');
        if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
        const n = Math.round(parseFloat(s) * 100) / 100;
        return n >= MIN_EUR && n <= MAX_EUR ? n : null;
    }
    /* draft: {items:[name], firstName, anon, city, total, payUrl}. Returns {ok, row, errors:[key]} (row = DB insert columns). */
    function build(draft, rate, lim) {
        const L = lim && lim.maxItems ? lim : OLD_LIMITS;
        const d = draft || {}, errors = [];
        const seen = new Set(), items = [];
        (Array.isArray(d.items) ? d.items : []).forEach(x => {
            const c = checkFor(L)(typeof x === 'string' ? x : x && x.n);
            const k = norm(c.name);
            if (!c.ok || !k || seen.has(k)) return;
            const q = qty(x && x.q);
            seen.add(k); items.push(q > 1 ? { n: c.name, q } : { n: c.name });
        });
        if (!items.length) errors.push('items');
        if (items.length > L.maxItems) items.length = L.maxItems;
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
        const good = (Array.isArray(row.items) ? row.items : []).filter(x => cleanText(x && x.n, 40)).slice(0, 60);
        const items = good.map(x => cleanText(x.n, 40)), qtys = good.map(x => qty(x.q));
        return {
            id: String(row.id), owner: row.user_id || '', anon: !!row.anon,
            name: row.anon ? '' : cleanText(row.first_name, 24), city: cleanText(row.city, 40), items, qtys,
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
    /* Oct 26 (.agents/skills/apple-design, sections 3, 5 and 6): Apple's momentum projection from "Designing Fluid Interfaces".
       Where a released card would come to rest, in px, for a release velocity in px/s. 0.99 = the snappier deceleration. */
    function project(v, rate) { const d = rate || 0.99; return ((+v || 0) / 1000) * d / (1 - d); }
    /* the finger's speed at release (px/s) from the last ~100 ms of [{x, t}] samples; 0 if it rested before letting go */
    function releaseVelocity(hist, now, win) {
        win = win || 100; if (!Array.isArray(hist) || hist.length < 2) return 0;
        const last = hist[hist.length - 1]; if (now != null && now - last.t > win) return 0;
        let first = last; for (let i = hist.length - 2; i >= 0; i--) { if (last.t - hist[i].t > win) break; first = hist[i]; }
        if (first === last) first = hist[hist.length - 2];
        const dt = last.t - first.t; return dt > 0 ? (last.x - first.x) / dt * 1000 : 0;
    }
    /* the live on-screen x of a computed CSS transform ('none' | matrix(...) | matrix3d(...)), to grab a card mid-flight */
    function txOf(s) {
        const m = /^matrix(3d)?\(([^)]*)\)/.exec(String(s || '').trim()); if (!m) return 0;
        const n = m[2].split(',').map(Number); const x = m[1] ? n[12] : n[4]; return isFinite(x) ? x : 0;
    }
    /* a horizontal drag decides: past the threshold (or a quick flick) right = pay, left = skip, else it springs back.
       With the release velocity vx (px/s): a flick back against the drag is a change of mind (back), otherwise the card
       commits if where it is thrown (dx + project(vx)) is past the threshold. */
    function swipeDecision(dx, dy, ms, width, vx) {
        const th = Math.max(80, Math.min(140, (width || 360) * 0.28));
        if (Math.abs(dy) > Math.abs(dx) * 1.2) return 'back';
        if (typeof vx === 'number' && isFinite(vx)) {
            if (Math.abs(vx) > 150 && dx !== 0 && Math.sign(vx) !== Math.sign(dx)) return 'back';
            const end = dx + project(vx);
            return end >= th ? 'pay' : end <= -th ? 'skip' : 'back';
        }
        const fast = ms > 0 && Math.abs(dx) / ms > 0.6 && Math.abs(dx) > 40;
        if (dx >= th || (fast && dx > 0)) return 'pay';
        if (dx <= -th || (fast && dx < 0)) return 'skip';
        return 'back';
    }

    /* Nov 11 2026 (Emmanuel: "the giver hand should be looking more like Tinder, because that was the whole point"): the swipe card
       shows the basket like a profile photo: up to six big food tiles, each with a food symbol, then "+ N". The symbol is picked
       from the food's name (English, German or Spanish words); an unknown food gets the basket. Nothing here rates a food. */
    const FOOD_EMOJI = [
        [/\b(eggs?|eier|ei|huevos?)\b/, '\u{1F95A}'], [/brokkoli|broccoli|brocoli/, '\u{1F966}'], [/lachs|salmon|fisch|fish|thunfisch|tuna|atun|sardine|hering|forelle|pescado|makrele/, '\u{1F41F}'],
        [/garnele|shrimp|prawn|gamba/, '\u{1F364}'], [/gurke|cucumber|pepino|zucchini|calabacin/, '\u{1F952}'], [/kase|cheese|queso|feta|mozzarella|halloumi|parmesan|gouda/, '\u{1F9C0}'],
        [/joghurt|yogh?urt|yogur|skyr|quark|milch|milk|leche|kefir|sahne|cream|nata/, '\u{1F95B}'], [/butter|mantequilla|ghee/, '\u{1F9C8}'],
        [/hahnchen|huhn|chicken|pollo|pute|turkey|pavo/, '\u{1F357}'], [/rind|beef|steak|hack|fleisch|meat|carne|schwein|pork|cerdo|lamm|lamb|schinken|ham|jamon|speck|bacon/, '\u{1F969}'],
        [/avocado|aguacate/, '\u{1F951}'], [/tomate|tomato/, '\u{1F345}'], [/paprika|pepper|pimiento/, '\u{1FAD1}'], [/pilz|champignon|mushroom|seta/, '\u{1F344}'],
        [/spinat|spinach|espinaca|salat|salad|lettuce|lechuga|rucola|kohl|kale|mangold/, '\u{1F96C}'], [/karotte|mohre|carrot|zanahoria/, '\u{1F955}'], [/zwiebel|onion|cebolla/, '\u{1F9C5}'], [/knoblauch|garlic|ajo/, '\u{1F9C4}'],
        [/olive|aceituna|\bol\b|\boil\b|aceite/, '\u{1FAD2}'], [/nuss|nusse|nut|nuts|mandel|almond|almendra|walnuss|cashew|erdnuss|peanut|nuez|samen|seeds?|semilla|leinsa|chia/, '\u{1F95C}'],
        [/beere|berry|berries|himbeer|erdbeer|blaubeer|heidelbeer|fresa|frambuesa|arandano/, '\u{1FAD0}'], [/zitrone|lemon|limon|limette|lime/, '\u{1F34B}'], [/kokos|coconut|coco/, '\u{1F965}'],
        [/tofu|tempeh|edamame|bohne|bean|linse|lentil|kichererbse|chickpea|frijol|lenteja/, '\u{1FAD8}'], [/aubergine|eggplant|berenjena/, '\u{1F346}'], [/kaffee|coffee|cafe/, '\u2615'], [/\btee\b|\btea\b|\bte\b/, '\u{1F375}'],
        [/wasser|water|agua/, '\u{1F4A7}'], [/kakao|cacao|schoko|chocolate/, '\u{1F36B}'], [/nori|alge|seaweed|alga/, '\u{1F33F}'], [/blumenkohl|cauliflower|coliflor|spargel|asparagus|esparrago|sellerie|celery|apio|fenchel|rosenkohl/, '\u{1F966}']
    ];
    function foodEmoji(name) { const k = norm(name); for (const [rx, e] of FOOD_EMOJI) if (rx.test(k)) return e; return '\u{1F9FA}'; }
    const MOSAIC = 6;
    function mosaic(items, qtys, max) {
        max = max || MOSAIC; const all = Array.isArray(items) ? items : [], many = all.length > max, n = many ? max - 1 : all.length;
        return { tiles: all.slice(0, n).map((x, i) => ({ n: x, q: qtys && qtys[i] > 1 ? qtys[i] : 1, e: foodEmoji(x) })), more: all.length - n };
    }
    /* "Someone else pays" in one tap: allowed when the cart built a complete basket (food, total within range, the saved pay link)
       and nothing from the cart had to stay out. Otherwise the short form shows what is missing. */
    function oneTap(built, pick) { return !!(built && built.ok && pick && Array.isArray(pick.items) && pick.items.length && !(pick.left && pick.left.length)); }
    return { foodEmoji, mosaic, MOSAIC, oneTap, DAY, WINDOW_DAYS, MAX_ITEMS, MIN_EUR, MAX_EUR, MAX_URL, PAY_RE_SQL, KOFI_RESERVED,
        payLink, linkName, itemCheck, basketCheck, serverRefuses, DENY_TERMS, DENY_EXCEPT, qty, fromCart, limitsOf, OLD_LIMITS, total, build, view, status, canReceipt, canVerdict, daysLeft, trust, fromCounts, careEventId, norm, SKIP_MS, deck, freshSkips, swipeDecision, project, releaseVelocity, txOf };
});
