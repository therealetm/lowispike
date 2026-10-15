/* LOWiSPIKE universal interaction XP, pure rules (Oct 15, 2026). No DOM, no storage: xp-tap.js wires it to the app.
   The user asked for points on every purposeful tap, a streak bonus for healthy actions in a row, and tiered feedback.
   - Tap tier: the first tap on each distinct control per day earns 1 XP ("Curiosity"). Explore tier: the first visit to a
     place (a tab, a body region, a learned fact, a room) per day earns 3 XP. Together they stop at DAY_CAP XP a day, so
     points can't be farmed by tapping; real actions (meals, water, Move, scans, cooking ...) keep their own rewards.
   - Repeats of the same control the same day earn nothing and are shown as "already counted", never as points.
   - Close, cancel, back, delete, sign out and similar controls never earn (no reward for undoing or leaving).
   - Healthy streak ("combo"): low-spike meals, water (max 3), Move, scans, swaps, cooking and the daily check-in, in a row
     today with no high-spike meal in between. 3 in a row +10 XP, 5 +20 XP, 8 +40 XP (fanfare). Fasting never counts.
   - Every XP goes through the app's one award(); ids are tap:<day>:<seq> (batched taps) and combo:<day>:<n>. */
(function (root) {
    'use strict';
    const TAP_XP = 1, EXPLORE_XP = 3, DAY_CAP = 40, MIN_GAP_MS = 350, WATER_MAX = 3;
    const COMBO = [{ n: 3, xp: 10, tier: 'pop' }, { n: 5, xp: 20, tier: 'big' }, { n: 8, xp: 40, tier: 'fanfare' }];
    const pad = n => String(n).padStart(2, '0');
    const dayKey = ts => { const d = new Date(+ts || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    /* controls that close, cancel, go back, undo or destroy: no reward (en / de / es) */
    const NEG = /(^|[^a-z])(close|dismiss|cancel|abort|back|undo|delete|remove|reset|clear|sign ?out|log ?out|logout|leave|block|report|skip|later|not now|no thanks|schlie(ß|ss)en|abbrechen|zur(ü|u)ck|l(ö|o)schen|entfernen|zur(ü|u)cksetzen|abmelden|verlassen|blockieren|melden|(ü|u)berspringen|sp(ä|a)ter|nicht jetzt|cerrar|cancelar|volver|atr(á|a)s|borrar|eliminar|quitar|restablecer|cerrar sesi(ó|o)n|salir|bloquear|denunciar|omitir|m(á|a)s tarde)([^a-z]|$)/i;
    const NEG_GLYPH = /^\s*(×|✕|✖|x|←|‹|<|⟵|−)\s*$/i;
    function negative(text) { const t = String(text || '').trim(); return !!t && (NEG_GLYPH.test(t) || NEG.test(t)); }
    /* a stable key for a control: area + its id / data hook / label, digits folded so list rows don't explode the key space */
    function keyFor(area, ident) {
        const clean = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\d+/g, '#').replace(/[^a-z#\u00df]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
        const a = clean(area) || 'app', i = clean(ident);
        return i ? a + ':' + i : '';
    }
    function fresh(day) { return { v: 1, day, keys: {}, xp: 0, seq: 0, pend: 0, pendN: 0, last: 0, capSaid: 0 }; }
    /* read the stored state for today; a new day starts clean; seq never reuses an id that is already in the ledger */
    function norm(raw, day, ledger) {
        let s = raw && typeof raw === 'object' && raw.v === 1 && raw.day === day ? Object.assign(fresh(day), raw) : fresh(day);
        if (!s.keys || typeof s.keys !== 'object') s.keys = {};
        const pre = 'tap:' + day + ':';
        let used = -1;
        for (const e of ledger || []) { const id = String(e && e.eventId || ''); if (id.indexOf(pre) === 0) { const n = parseInt(id.slice(pre.length), 10); if (n > used) used = n; } }
        if (s.seq <= used) s.seq = used + 1;
        return s;
    }
    /* one tap or visit: earn / repeat / cap / spam. Pure: returns a new store. */
    function decide(store, ev) {
        ev = ev || {};
        const s = Object.assign({}, store, { keys: Object.assign({}, store.keys) });
        const now = +ev.now || Date.now(), tier = ev.tier === 'explore' ? 'explore' : 'tap', key = String(ev.key || '');
        if (!key) return { store: s, outcome: 'none', amt: 0 };
        if (s.keys[key]) return { store: s, outcome: 'repeat', amt: 0 };
        if (tier === 'tap' && s.last && now - s.last < MIN_GAP_MS) return { store: s, outcome: 'spam', amt: 0 };
        const want = tier === 'explore' ? EXPLORE_XP : TAP_XP, room = Math.max(0, DAY_CAP - s.xp), amt = Math.min(want, room);
        if (!amt) return { store: s, outcome: 'cap', amt: 0 };
        s.keys[key] = tier === 'explore' ? 2 : 1; s.xp += amt; s.pend += amt; s.pendN += 1; s.last = now;
        return { store: s, outcome: 'earn', amt, tier };
    }
    /* the pending points go into the ledger as one entry; ids stay unique per day */
    function flush(store) {
        if (!(store.pend > 0)) return { store, award: null };
        const award = { amt: store.pend, n: store.pendN, eventId: 'tap:' + store.day + ':' + store.seq };
        return { store: Object.assign({}, store, { pend: 0, pendN: 0, seq: store.seq + 1 }), award };
    }
    const isMinor = e => !!e && /^(tap|combo)$/.test(String(e.src || ''));
    /* healthy kinds that a real action leaves in the ledger (meals come from the logs, so a low-spike verdict decides) */
    function healthyKind(e) {
        if (!e || !(+e.amt > 0) || isMinor(e)) return '';
        const src = String(e.src || ''), id = String(e.eventId || ''), txt = (src + ' ' + (e.label || '')).toLowerCase();
        if (/^meal|^plan-meal/.test(src) || /^meal:|^plan-meal:/.test(id)) return '';
        if (!src) { /* plain awards are mostly quest bonuses; only these known labels are real healthy actions */
            const lab = String(e.label || '').trim().toLowerCase();
            if (/check.?in/.test(lab)) return 'checkin';
            if (/^(swap saved|craving handled)$/.test(lab)) return 'swap';
            return '';
        }
        if (/^f\d|^f3all|^f2_break|^e1:|^rhythm|^hq|^quest|^care|^macro-goal|^sun-full|^body-trip|^buddy|^r3a_fast/.test(src)) return '';
        if (/fast|badge|streak|level|quest/.test(txt) && !/breakfast/.test(txt)) return '';
        if (/check.?in/.test(txt)) return 'checkin';
        if (/water|wasser|agua|hydrat/.test(txt)) return 'water';
        if (/move|walk|workout|steps|dance|yoga|stretch|training|sport/.test(txt)) return 'move';
        if (/scan|capture|product|barcode|dex/.test(txt)) return 'scan';
        if (/swap|swaflo|tausch/.test(txt)) return 'swap';
        if (/recipe|cook|gekocht|bloom/.test(txt)) return 'cook';
        return '';
    }
    function verdict(log) {
        if (!log) return '';
        const lvl = String(log.lvl || '').toLowerCase(), r = String(log.r || '').toLowerCase();
        if (lvl === 'high' || r === 'nein' || r === 'spike') return 'spike';
        if (lvl === 'low' || r === 'ja' || r === 'ok') return 'low';
        if (lvl === 'medium' || lvl === 'mid' || r === 'selten' || r === 'jein' || r === 'better') return 'medium';
        const sugar = log.macros && log.macros.sugar;
        if (sugar != null && sugar !== '' && Number.isFinite(+sugar) && +sugar >= 25) return 'spike';
        return '';
    }
    /* today's healthy actions in a row, after the last high-spike meal */
    function chain(input) {
        input = input || {};
        const now = +input.now || Date.now(), day = dayKey(now), vd = typeof input.verdict === 'function' ? input.verdict : verdict;
        const isToday = x => (x.day ? x.day === day : dayKey(+x.ts) === day) && +x.ts > 0 && +x.ts <= now + 60000;
        let breakAt = 0; const ev = [];
        for (const l of input.logs || []) {
            if (!l || l.voided || !isToday(l)) continue;
            let v = ''; try { v = vd(l) || ''; } catch (e) { v = verdict(l); }
            if (v === 'spike') breakAt = Math.max(breakAt, +l.ts);
            else if (v === 'low') ev.push({ ts: +l.ts, kind: 'meal' });
        }
        for (const e of input.ledger || []) { if (!e || !isToday(e)) continue; const k = healthyKind(e); if (k) ev.push({ ts: +e.ts, kind: k }); }
        ev.sort((a, b) => a.ts - b.ts);
        let water = 0; const out = [];
        for (const x of ev) { if (x.ts <= breakAt) continue; if (x.kind === 'water' && ++water > WATER_MAX) continue; out.push(x); }
        return { day, count: out.length, events: out, brokeAt: breakAt };
    }
    /* combo milestones reached and not yet in the ledger (once each per day, retries and reloads add nothing) */
    function comboDue(input) {
        const c = chain(input), have = new Set((input.ledger || []).map(e => String(e && e.eventId || '')));
        return COMBO.filter(m => c.count >= m.n && !have.has('combo:' + c.day + ':' + m.n)).map(m => Object.assign({ eventId: 'combo:' + c.day + ':' + m.n, day: c.day }, m));
    }
    /* never the same animation twice in a row */
    function pick(list, last, rnd) {
        const r = typeof rnd === 'function' ? rnd : Math.random;
        const opts = list.length > 1 ? list.filter(x => x !== last) : list.slice();
        return opts[Math.min(opts.length - 1, Math.floor(r() * opts.length))];
    }
    const api = { TAP_XP, EXPLORE_XP, DAY_CAP, MIN_GAP_MS, WATER_MAX, COMBO, dayKey, negative, keyFor, fresh, norm, decide, flush, isMinor, healthyKind, verdict, chain, comboDue, pick };
    root.LowiTapXPCore = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
