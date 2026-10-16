/* LOWiSPIKE XP for meaningful actions only, pure rules (Oct 15, 2026; replaces the 14:15 "every tap earns" rule after user feedback).
   No DOM, no storage: xp-tap.js wires it to the app.
   - Taps, tab switches, opening sheets, scrolling and plain navigation earn NOTHING. There is no click listener that pays.
   - XP comes from completed actions only. The app's own actions keep their own rewards and caps (meals, water, Move sessions,
     steps, fasts, body journeys, scans, swaps, cooking, check-ins, quests). This file adds the few completed actions that had
     no reward yet (the microbe buddy reward was removed with the buddies on Oct 16), each with its own category, a fixed amount and a cap so they can't be farmed:
       discover  first time ever you reach a body region            5 XP, once per region, ever
       care      care sent to a friend (costs care points)          5 XP, max 3 a day
       fastedit  fasting start corrected                            3 XP, max 1 a day (honest logging, never a reward for longer fasts)
   - category(entry) names the category of any ledger entry from its src first, so a Move entry is always 'move', never explore.
   - Healthy streak ("combo"): low-spike meals, water (max 3), Move, scans, swaps, cooking and the daily check-in, in a row
     today with no high-spike meal in between. 3 in a row +10 XP, 5 +20 XP, 8 +40 XP (fanfare). Fasting never counts.
   - Every XP goes through the app's one award() with an eventId; old tap entries (src 'tap') stay in the ledger, XP is kept. */
(function (root) {
    'use strict';
    const WATER_MAX = 3;
    const COMBO = [{ n: 3, xp: 10, tier: 'pop' }, { n: 5, xp: 20, tier: 'big' }, { n: 8, xp: 40, tier: 'fanfare' }];
    const ACTIONS = {
        discover: { amt: 5, once: true, src: 'discover' },
        care: { amt: 5, perDay: 3, src: 'care-sent' },
        fastedit: { amt: 3, perDay: 1, src: 'fast-edit' }
    };
    const pad = n => String(n).padStart(2, '0');
    const dayKey = ts => { const d = new Date(+ts || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const cleanId = id => String(id == null ? '' : id).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
    /* one completed action -> the award to make, or null when it isn't a known action, already paid, or capped today */
    function action(kind, id, ledger, now) {
        const rule = ACTIONS[kind]; if (!rule) return null;
        const day = dayKey(now), cid = cleanId(id);
        if (rule.once && !cid) return null;
        const L = Array.isArray(ledger) ? ledger : [];
        let eventId;
        if (rule.once) eventId = rule.src + ':' + cid;
        else {
            const n = L.filter(e => e && e.src === rule.src && (e.day ? e.day === day : dayKey(e.ts) === day)).length;
            if (n >= rule.perDay) return null;
            eventId = rule.src + ':' + day + ':' + n;
        }
        if (L.some(e => e && e.eventId === eventId)) return null;
        return { kind, amt: rule.amt, src: rule.src, eventId, id: cid };
    }
    /* the category a ledger entry belongs to; src decides first, the label only for plain awards */
    function category(e) {
        if (!e) return '';
        const src = String(e.src || ''), lab = String(e.label || '').toLowerCase();
        if (src === 'tap') return 'legacy-tap';
        if (src === 'combo') return 'streak';
        if (src === 'discover') return 'discover';
        if (src === 'care-sent' || /^care/.test(src)) return 'care';
        if (src === 'fast-edit' || /^r3a_fast|^f2_break|fast/.test(src)) return 'fast';
        if (/^move|^r3a_move/.test(src)) return 'move';
        if (/^meal|^plan-meal/.test(src)) return 'meal';
        if (/^body-trip/.test(src)) return 'journey';
        if (/^herb-care:water/.test(src)) return 'water';
        if (/^herb-quest|^hq|^quest|^f3|^rhythm|^sun-full|^e1:/.test(src)) return 'quest';
        if (/^swaflo|swap/.test(src)) return 'swap';
        if (/^tribe|^shelf/.test(src)) return 'community';
        if (/^macro/.test(src)) return 'meal';
        if (/check.?in/.test(lab)) return 'checkin';
        if (/streak badge/.test(lab)) return 'streak';
        if (/meal|essen|comida/.test(lab)) return 'meal';
        if (/swap|craving/.test(lab)) return 'swap';
        if (/water|wasser|agua/.test(lab)) return 'water';
        if (/move|walk|session/.test(lab)) return 'move';
        return 'action';
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
        if (/^f\d|^f3all|^f2_break|^e1:|^rhythm|^hq|^quest|^care|^macro-goal|^sun-full|^body-trip|^discover|^fast-edit|^r3a_fast/.test(src)) return '';
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
    const api = { WATER_MAX, COMBO, ACTIONS, dayKey, cleanId, action, category, isMinor, healthyKind, verdict, chain, comboDue, pick };
    root.LowiTapXPCore = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
