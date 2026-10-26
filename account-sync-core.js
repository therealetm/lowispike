/* account-sync-core.js — the same data on every device (Eman, 23 Oct 2026: iPhone and iPad showed different numbers on one account).
   Before this, every device only PUSHED its whole backup to user_state and read it back only at sign-in, so the last device to
   write won and the other one never saw it. Now each device pulls, merges and pushes (on open, on coming back to the app and
   instead of every blind backup).

   The merge is a three-way merge per unit, with no clocks involved (phone and iPad clocks can differ):
     unit  = a key, or for a key holding a JSON object, each top-level field of it ("lowispike.v2#meals").
     base  = the hash of the unit as both sides last agreed (kept on the device in lowi.sync.v1, never uploaded).
     only this device changed it   -> keep it (it gets pushed)
     only the other device changed -> take theirs (deletes included, so a reset on one device is a reset on both)
     both changed (or first sync)  -> combine: lists of entries are joined by id (nothing logged twice), numbers keep the higher,
                                      a dated object keeps the newer day, anything else keeps this device's value.
   Pure: no DOM, no storage. index.html does the reading, writing and the network. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiSyncCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
    'use strict';
    const SEP = '#';
    const GONE = '-';
    /* account data that lives under lowi.* (and the two older lowi_ keys: fasting + water, the reward book) (lowispike.* is synced whole, minus chat). Device settings (theme, sound, hints,
       update prompts, caches, the Apple Health bridge) stay per device on purpose. */
    const LOWI_KEYS = Object.freeze([
        'lowi.herb.tamagotchi.v2:', 'lowi.energy.v1', 'lowi.energy.land.v2', 'lowi.lvFloor', 'lowi.hs.v1', 'lowi.f2.v1',
        'lowi.n1.log', 'lowi.dex.v1', 'lowi.bucket.v1', 'lowi.xptap.v1', 'lowi.sleep.v1', 'lowi.discovery.v1:', 'lowi.guides.v1',
        'lowi.mealsnap.log', 'lowi.portion.v1', 'lowi.grocery.v1', 'lowi.recipe-book.', 'lowi.cm.profile.v1', 'lowi.snackBuy.v1',
        'lowi.storePicks.v1', 'lowi_fast_v1', 'lowi_r3w_v1'
    ]);
    const NEVER = Object.freeze(['lowispike.chat.v1', 'lowi.sync.v1']);
    /* backed up (a new device gets them at sign-in) but each device keeps its own: Eman runs the iPhone in English and the iPad
       in German; which tab or period was open last; pending Apple Health writes */
    const DEVICE = Object.freeze(['lowispike.lang', 'lowispike.community.tabs', 'lowispike.cook.tabs', 'lowispike.ranking.period', 'lowispike.ranking.moves',
        'lowispike.rk.mixcol', 'lowispike.hs-pending.v1']);
    function synced(k) {
        if (typeof k !== 'string' || NEVER.indexOf(k) >= 0) return false;
        if (k.indexOf('lowispike.') === 0) return true;
        for (let i = 0; i < LOWI_KEYS.length; i++) {
            const p = LOWI_KEYS[i];
            if (/[:.]$/.test(p) ? (k.indexOf(p) === 0 && k.length > p.length) : k === p) return true;
        }
        return false;
    }
    /* FNV-1a, 32 bit, plus the length: enough to notice a change, cheap on a 250 KB backup */
    function hash(s) {
        if (s === undefined || s === null) return GONE;
        s = String(s);
        let h = 0x811c9dc5;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
        return h.toString(36) + '.' + s.length.toString(36);
    }
    const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
    function parseObj(v) {
        if (typeof v !== 'string' || v.charAt(0) !== '{') return null;
        try { const o = JSON.parse(v); return isObj(o) ? o : null; } catch (e) { return null; }
    }
    /* {key: string} -> {unit: string}; an object key becomes key#field units plus a key# marker for its existence */
    function units(snap) {
        const u = {};
        Object.keys(snap || {}).forEach(k => {
            const v = snap[k];
            if (v === undefined || v === null) return;
            const o = parseObj(v);
            if (!o) { u[k] = String(v); return; }
            u[k + SEP] = '{}';
            Object.keys(o).forEach(f => { u[k + SEP + f] = JSON.stringify(o[f]); });
        });
        return u;
    }
    /* the reverse: units back to {key: string} */
    function join(u) {
        const out = {}, objs = {};
        Object.keys(u).forEach(id => {
            const v = u[id];
            if (v === undefined) return;
            const i = id.indexOf(SEP);
            if (i < 0) { out[id] = v; return; }
            const k = id.slice(0, i), f = id.slice(i + 1);
            const o = objs[k] = objs[k] || {};
            if (f === '') return;
            try { o[f] = JSON.parse(v); } catch (e) { }
        });
        Object.keys(objs).forEach(k => { if (u[k + SEP] !== undefined) out[k] = JSON.stringify(objs[k]); });
        return out;
    }
    function hashes(u) { const h = {}; Object.keys(u).forEach(id => { if (u[id] !== undefined) h[id] = hash(u[id]); }); return h; }
    /* order-free signature of one key's value, so {a,b} and {b,a} count as the same */
    function sig(k, v) {
        if (v === undefined || v === null) return GONE;
        const h = hashes(units({ [k]: v }));
        return Object.keys(h).sort().map(id => id + '=' + h[id]).join('|');
    }

    /* ---------- combining two values both devices changed ---------- */
    const ID_KEYS = ['id', 'uid', 'k', 'key', 'code', 'ts', 't', 'at', 'when', 'date', 'd'];
    function idOf(x) {
        if (!isObj(x)) return 'v:' + JSON.stringify(x);
        for (let i = 0; i < ID_KEYS.length; i++) {
            const k = ID_KEYS[i];
            if (x[k] !== undefined && x[k] !== null && x[k] !== '') return k + ':' + JSON.stringify(x[k]);
        }
        return 'j:' + JSON.stringify(x);
    }
    const DAY_KEYS = ['date', 'day', 'today', 'd', 'ymd'];
    function dayOf(o) {
        for (let i = 0; i < DAY_KEYS.length; i++) {
            const v = o[DAY_KEYS[i]];
            if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v;
        }
        return null;
    }
    const tOf = x => isObj(x) ? (+(x.ts || x.t || x.at || x.when || 0) || 0) : 0;
    function combine(a, b, depth) {
        depth = depth || 0;
        if (a === undefined) return b;
        if (b === undefined) return a;
        if (JSON.stringify(a) === JSON.stringify(b)) return a;
        if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
        if (typeof a === 'boolean' && typeof b === 'boolean') return a || b;
        if (Array.isArray(a) && Array.isArray(b)) {
            const seen = new Map();
            a.forEach(x => seen.set(idOf(x), x));
            b.forEach(x => { const id = idOf(x); seen.set(id, seen.has(id) ? combine(seen.get(id), x, depth + 1) : x); });
            const all = Array.from(seen.values());
            /* entries with a time keep time order, so "the last meal" is still last */
            if (all.length && all.every(x => tOf(x) > 0)) all.sort((x, y) => tOf(x) - tOf(y));
            return all;
        }
        if (isObj(a) && isObj(b)) {
            const da = dayOf(a), db = dayOf(b);
            if (da && db && da !== db) return da > db ? a : b;
            if (depth > 6) return a;
            const o = {};
            Object.keys(a).forEach(k => { o[k] = a[k]; });
            Object.keys(b).forEach(k => { o[k] = (k in a) ? combine(a[k], b[k], depth + 1) : b[k]; });
            return o;
        }
        return a;
    }
    function combineUnit(id, l, r) {
        if (l === undefined) return r;
        if (r === undefined) return l;
        if (id.charAt(id.length - 1) === SEP) return l;
        let a, b;
        try { a = JSON.parse(l); b = JSON.parse(r); } catch (e) { return l; }
        return JSON.stringify(combine(a, b));
    }

    /* local, remote: {key: string} snapshots. base: {unit: hash} from the last agreement (empty on a first sync).
       Returns the merged snapshot, which keys must change or go on this device, whether the cloud copy must be replaced,
       and the new base. */
    function merge(local, remote, base) {
        local = local || {}; base = base || {};
        remote = Object.assign({}, remote || {});
        DEVICE.forEach(k => { if (local[k] !== undefined) remote[k] = local[k]; else delete remote[k]; });
        const L = units(local), R = units(remote), M = {};
        const ids = new Set(Object.keys(L).concat(Object.keys(R)));
        let conflicts = 0;
        ids.forEach(id => {
            const l = L[id], r = R[id], hl = hash(l), hr = hash(r), hb = base[id];
            if (hl === hr) { M[id] = l; return; }
            const lc = hb === undefined ? l !== undefined : hl !== hb;
            const rc = hb === undefined ? r !== undefined : hr !== hb;
            if (lc && !rc) M[id] = l;
            else if (rc && !lc) M[id] = r;
            else { M[id] = combineUnit(id, l, r); conflicts++; }
        });
        /* a field whose object marker is gone goes with it */
        Object.keys(M).forEach(id => {
            const i = id.indexOf(SEP);
            if (i > 0 && i < id.length - 1 && M[id.slice(0, i + 1)] === undefined) M[id] = undefined;
        });
        const changedUnits = Object.keys(M).filter(id => hash(M[id]) !== hash(L[id])).concat(Object.keys(L).filter(id => !(id in M)));
        const merged = join(M);
        const changedKeys = [], removedKeys = [];
        new Set(Object.keys(local).concat(Object.keys(merged))).forEach(k => {
            if (merged[k] === undefined) { if (local[k] !== undefined) removedKeys.push(k); }
            else if (sig(k, local[k]) !== sig(k, merged[k])) changedKeys.push(k);
        });
        let pushNeeded = false;
        new Set(Object.keys(remote).concat(Object.keys(merged))).forEach(k => { if (sig(k, remote[k]) !== sig(k, merged[k])) pushNeeded = true; });
        return { merged, changedKeys, removedKeys, pushNeeded, conflicts, changedUnits, base: hashes(units(merged)) };
    }
    return { LOWI_KEYS, DEVICE, synced, hash, units, join, hashes, sig, combine, merge, SEP };
});
