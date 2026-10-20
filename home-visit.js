/* Companion visits on Home (Oct 19 2026, MAYA-HANDOFF item 23).
   Emmanuel, on the call: "Their companions appear ... on my homepage ... one of those outer bubbles ... we see them flying
   towards the homepage. And then we see the text bubble." Whose messages: "Whoever messaged me ... like a hologram ...
   instead of it just appearing out of nowhere ... it should look like they just entered my world."

   So: when someone writes TO you (an @mention of you or a reply to your message: the same test as the Community
   "is talking to you" alert) and you are looking at Home, their own companion flies in from outside your world inside a
   small glass bubble, the bubble breaks on arrival, the companion stands there like a light hologram, and a speech bubble
   shows their real message. Tap it (Reply) to open that message in Community (the reply goes to them); x lets them go.
   Item 30 (20 Oct 2026), Emmanuel: "The hologram appeared, and then it disappeared way too fast for me to even click on
   reply ... update that." So a visitor no longer leaves on a reading timer: they stay until you tap Reply or the x (or
   Escape). If Home is covered for a moment (a sheet, another tab, the app in the background, a rotation mid-flight) they
   step out and come back when Home is in front again, without flying in a second time. Others wait their turn behind them.

   Rules: only real messages from the room (community-chat.js LowiCommunity.directed()), never invented; one visitor at a
   time, several messages from one person become one visit, at most 4 waiting, the rest is a "+N more" line; old history
   is never replayed (only messages you have not seen yet, under 12 hours old, and never again on this device once you
   answered or closed the visit);
   nothing is marked read (the room and the Community badge stay as they were). Light: plain DOM + compositor-only
   animations, no WebGL, no animation loop, one small timer only while a visit is waiting or showing, all removed after. */
(function (root) {
    'use strict';
    const KEY = 'lowispike.homeVisit.v1';
    const BACKLOG_MS = 12 * 3600e3;   /* older unseen messages stay in the room only */
    const BACKLOG_MAX = 2;            /* after a reload / time away: at most the two newest come by, the rest is "+N more" */
    const QUEUE_MAX = 4;              /* visitors waiting at once; more people than that become "+N more" */
    const PENDING_MS = 10 * 60e3;     /* a visit that could not happen within 10 minutes stays in the room only */
    const TRIES_MAX = 8;              /* a visitor sent away by something covering Home comes back at most this often */
    const KEEP = 120;                 /* remembered visit ids per account */
    /* old app / crowd pings "@Name ⚡ X sent you energy" are hidden in Community; never fly one in either */
    const ENERGY_LINE = /^(@\S[^\n]*?\s)?\u26a1\s[^\n]+\s(sent you energy|hat dir Energie geschickt|te envi\u00f3 energ\u00eda)[\s!.]*$/u;
    const UI = {
        en: { came: '{n} came into your world', open: 'Open the message from {n} in Community', reply: 'Reply', close: 'Close', more: '+{k} more for you in Community', count: '{k} messages', waiting: '{k} more waiting' },
        de: { came: '{n} ist in deine Welt gekommen', open: 'Nachricht von {n} in der Community öffnen', reply: 'Antworten', close: 'Schließen', more: '+{k} weitere für dich in der Community', count: '{k} Nachrichten', waiting: '{k} weitere warten' },
        es: { came: '{n} ha entrado en tu mundo', open: 'Abrir el mensaje de {n} en Comunidad', reply: 'Responder', close: 'Cerrar', more: '+{k} más para ti en Comunidad', count: '{k} mensajes', waiting: '{k} más esperando' }
    };

    /* ---------- pure core (tests/home-visit.test.cjs) ---------- */
    function energy(text) { return ENERGY_LINE.test(String(text || '').trim()); }
    function fresh() { return { scope: '', boot: 0, visited: [], known: {}, queue: [], current: null, more: 0, moreIds: [] }; }
    function seen(st, id) { return st.visited.indexOf(id) >= 0 || !!st.known[id]; }
    function visit(st, ids) { for (const id of [].concat(ids || [])) { if (!id || st.visited.indexOf(id) >= 0) continue; st.visited.push(id); } if (st.visited.length > KEEP) st.visited.splice(0, st.visited.length - KEEP); }
    function entry(m, now) { return { id: m.id, ids: [m.id], uid: m.uid, by: String(m.by || '').trim(), text: String(m.text || ''), ts: m.ts, count: 1, noted: now, tries: 0 }; }
    function add(st, m, now) {
        st.known[m.id] = 1;
        const cur = st.current;
        if (cur && cur.uid === m.uid && !cur.leaving) { cur.ids.push(m.id); cur.id = m.id; cur.text = String(m.text || ''); cur.ts = m.ts; cur.count++; cur.updated = now; return 'current'; }
        const same = st.queue.find(q => q.uid === m.uid);
        if (same) { same.ids.push(m.id); same.id = m.id; same.text = String(m.text || ''); same.ts = m.ts; same.count++; return 'merged'; }
        if (st.queue.length >= QUEUE_MAX) { st.more++; st.moreIds.push(m.id); return 'more'; }
        st.queue.push(entry(m, now)); return 'queued';
    }
    /* d = LowiCommunity.directed(): {scope, list:[{id, uid, by, ts, seen, text}]}. load(scope) gives remembered ids. */
    function intake(st, d, now, load) {
        const scope = (d && d.scope) || '';
        if (scope !== st.scope) {           /* another account (or signed out): nothing of the old one survives */
            const keep = fresh(); Object.assign(st, keep, { scope, boot: now, visited: scope && load ? (load(scope) || []).slice(-KEEP) : [] });
            st.reset = true;
        }
        if (!scope) return [];
        const list = ((d && d.list) || []).filter(m => m && m.id && m.uid && m.uid !== scope && !m.seen && !seen(st, m.id) && now - (+m.ts || 0) < BACKLOG_MS && !energy(m.text))
            .sort((a, b) => a.ts - b.ts);
        const out = [];
        const backlog = list.filter(m => m.ts < st.boot - 60000), live = list.filter(m => m.ts >= st.boot - 60000);
        if (backlog.length) {
            const come = backlog.slice(-BACKLOG_MAX), rest = backlog.slice(0, -BACKLOG_MAX);
            for (const m of rest) { st.known[m.id] = 1; st.more++; st.moreIds.push(m.id); }
            for (const m of come) out.push([m.id, add(st, m, now)]);
        }
        for (const m of live) out.push([m.id, add(st, m, now)]);
        return out;
    }
    /* pending visits that waited too long stay in the room only (and are remembered, so a reload does not bring them back) */
    /* a visitor you already saw (stepped out because Home was covered) keeps waiting as long as the message is fresh (12 h) */
    function stale(q, now) { return q.back ? now - (+q.ts || 0) >= BACKLOG_MS : now - q.noted > PENDING_MS; }
    function expire(st, now) {
        const old = st.queue.filter(q => stale(q, now));
        if (!old.length) return 0;
        st.queue = st.queue.filter(q => !stale(q, now));
        for (const q of old) visit(st, q.ids);
        if (!st.queue.length && !st.current && st.more) { visit(st, st.moreIds); st.more = 0; st.moreIds = []; }
        return old.length;
    }
    /* Community is open: everything waiting is in front of you there */
    function drop(st) { for (const q of st.queue) visit(st, q.ids); visit(st, st.moreIds); st.queue = []; st.more = 0; st.moreIds = []; }
    function next(st) { const e = st.queue.shift() || null; if (e) e.more = st.queue.length ? 0 : st.more; return e; }
    /* something covered Home while they were here: they step out and are first in line again (no second flight if you had
       already seen them). Only after TRIES_MAX comebacks, or while leaving, do they stay in the room only. */
    function requeue(st, e, now) {
        if (!e) return false;
        if (e.leaving || e.tries >= TRIES_MAX) { visit(st, e.ids); return false; }
        e.back = e.back || !!e.shownAt; e.shownAt = 0; e.noted = now; e.updated = 0; e.filled = 0; e.fill = null; e.layout = null; e.from = null;
        st.queue.unshift(e); return true;
    }
    /* the room is about to show its own "is talking to you" toast for this message: true = Home takes it instead */
    function claim(st, id, homeFront) {
        if (st.current && st.current.ids.indexOf(id) >= 0) return true;
        const q = st.queue.find(x => x.ids.indexOf(id) >= 0);
        if (!q) return false;
        if (homeFront) return true;
        q.ids.splice(q.ids.indexOf(id), 1); visit(st, id);
        if (!q.ids.length) st.queue.splice(st.queue.indexOf(q), 1);
        return false;
    }

    /* where the visitor lands: the free band under the Home ring (else above it, else beside it, else low over it) */
    function place(o) {
        const vw = o.vw, vh = o.vh, sat = o.sat || 0, sab = o.sab || 0, ring = o.ring, cardH = o.cardH || 96, orb = o.orb || 64;
        const cardW = Math.min(300, vw - 32), need = orb + 14 + cardH;
        const top = Math.max(sat + 10, o.topLimit || 0), bottom = Math.min(vh - sab - 10, o.bottomLimit || vh);
        const cx = ring ? (ring.left + ring.right) / 2 : vw / 2;
        const clampX = x => Math.max(16, Math.min(vw - 16 - cardW, x - cardW / 2));
        if (ring) {
            const below = bottom - ring.bottom, above = ring.top - top;
            if (below >= need) { const y = ring.bottom + Math.min(orb / 2 + 8, (below - need) / 2 + orb / 2); return { mode: 'below', x: cx, y, cardLeft: clampX(cx), cardTop: y + orb / 2 + 10, cardW }; }
            if (above >= need) { const y = ring.top - orb / 2 - 6; return { mode: 'above', x: cx, y, cardLeft: clampX(cx), cardBottom: vh - (y - orb / 2 - 10), cardW }; }
            const left = ring.left - 12, right = vw - ring.right - 12;
            if (Math.max(left, right) >= 190) {
                const w = Math.min(260, Math.max(left, right) - 16), x = right >= left ? ring.right + 12 + (right) / 2 : (left) / 2 + 6;
                const y = Math.max(top + orb / 2, Math.min((ring.top + ring.bottom) / 2 - need / 2 + orb / 2, bottom - need + orb / 2));
                return { mode: 'side', x, y, cardLeft: Math.max(8, Math.min(vw - 8 - w, x - w / 2)), cardTop: y + orb / 2 + 10, cardW: w };
            }
        }
        const y = Math.max(top + orb / 2, bottom - need + orb / 2);
        return { mode: 'over', x: cx, y, cardLeft: clampX(cx), cardTop: y + orb / 2 + 10, cardW };
    }
    /* where they come from: a fixed direction per person (always from the same side of the sky), well beyond the screen edge */
    function hash(s) { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function origin(uid, x, y, vw, vh) {
        const a = ((hash(uid) % 300) - 240) * Math.PI / 180;   /* -240..60 deg: the sides and the sky, never straight up from below */
        const c = Math.cos(a), s = Math.sin(a);
        const tx = c > 1e-6 ? (vw - x) / c : c < -1e-6 ? -x / c : Infinity, ty = s > 1e-6 ? (vh - y) / s : s < -1e-6 ? -y / s : Infinity;
        const dist = Math.max(80, Math.min(tx, ty)) + 48;   /* just past the screen edge, so the whole flight is in view */
        return { dx: c * dist, dy: s * dist, a };
    }
    /* the flight: a gentle curve from far away (small) to the landing spot (full size) */
    function path(dx, dy, n) {
        const out = [], cxp = dx * 0.5 - dy * 0.16, cyp = dy * 0.5 + dx * 0.16, N = n || 8;
        for (let i = 0; i <= N; i++) {
            const lin = i / N, t = 1 - Math.pow(1 - lin, 2.2);    /* fast from far away, slowing as they arrive */
            const u = 1 - t, x = u * u * dx + 2 * u * t * cxp, y = u * u * dy + 2 * u * t * cyp;
            out.push({ x: Math.round(x * 10) / 10 + 0, y: Math.round(y * 10) / 10 + 0, s: Math.round((0.16 + 0.84 * t) * 1000) / 1000, o: Math.min(1, lin * 3), offset: lin });
        }
        return out;
    }
    function lang(l) { l = String(l || 'en').slice(0, 2); return UI[l] ? l : 'en'; }
    function words(l, k, vars) { let s = (UI[lang(l)] || UI.en)[k] || UI.en[k] || ''; for (const v in vars || {}) s = s.split('{' + v + '}').join(String(vars[v])); return s; }
    function short(text, max) { const t = String(text || '').replace(/\s+/g, ' ').trim(); max = max || 160; return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '\u2026' : t; }

    const api = { KEY, BACKLOG_MS, BACKLOG_MAX, QUEUE_MAX, PENDING_MS, TRIES_MAX, UI, energy, fresh, intake, add, expire, drop, next, requeue, claim, visit, place, origin, path, words, short, hash };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!root || !root.document) return;

    /* ---------- page ---------- */
    const W = root, D = W.document, H = D.documentElement;
    if (W.LowiHomeVisit) return;
    const st = fresh();
    let layer = null, tickT = 0, scanT = 0, sizeT = 0, keyFn = null, anims = [];
    const C = () => W.LowiCommunity || null;
    const L = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || H.lang || 'en'; } catch (e) { } return lang(l); };
    const vis = el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
    const $ = s => { try { return D.querySelector(s); } catch (e) { return null; } };
    const calm = () => { try { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
    function load(scope) { try { const all = JSON.parse(localStorage.getItem(KEY) || '{}'); return Array.isArray(all[scope]) ? all[scope] : []; } catch (e) { return []; } }
    function save() { if (!st.scope) return; try { const all = JSON.parse(localStorage.getItem(KEY) || '{}'); all[st.scope] = st.visited.slice(-KEEP); localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { } }
    function done(ids) { visit(st, ids); save(); }

    /* Home is in front and nothing (setup, flight, tour, Day card, sheets, dialogs, Settings) is on top of it */
    function homeTab() { const h = D.getElementById('tab-home'); return !!(h && h.classList.contains('active')); }
    function homeFront() {
        if (D.hidden || !homeTab()) return false;
        if (!vis($('#whPad')) && !vis($('[data-home-misty]')) && !vis($('#spBubble'))) return false;
        if (vis($('#drDay')) || vis($('#drA2')) || vis($('#drPick')) || vis($('#ltTour'))) return false;
        const T = W.LowiTutorial; if (T && T.busyBy) { let b = ''; try { b = T.busyBy(); } catch (e) { b = 'error'; } if (b) return false; }
        else { for (const el of D.querySelectorAll('[aria-modal="true"]')) if (vis(el)) return false; if (H.classList.contains('ss2-open') || H.classList.contains('gate-up') || H.classList.contains('mf-on')) return false; }
        if (H.classList.contains('gx-out')) return false;
        return true;
    }
    function communityFront() { const t = D.getElementById('tab-foryou'); return !D.hidden && !!(t && t.classList.contains('active')); }

    function scan() {
        const c = C(); if (!c || !c.directed) return;
        let d = null; try { d = c.directed(); } catch (e) { return; }
        const before = st.scope;
        intake(st, d, Date.now(), load);
        if (st.reset) { st.reset = false; if (before !== st.scope) { clear(); } }
        const cur = st.current;
        if (cur && cur.fill) cur.fill();   /* the same person wrote again (new words in place), or someone else is now waiting */
        /* quiet hours you set yourself in Community also hold the visits back (the default hours do not: a visit is silent and only
           happens while you are looking at Home) */
        st.hold = !!(d && d.quiet && d.quietSet);
        if (communityFront()) { drop(st); save(); }
        if (st.queue.length || st.current) arm();
        tick();
    }
    function arm() { if (!tickT) tickT = setInterval(tick, 900); }
    function disarm() { if (tickT) { clearInterval(tickT); tickT = 0; } }
    function tick() {
        const now = Date.now();
        if (communityFront() && (st.queue.length || st.more)) { drop(st); save(); }
        if (st.current) {   /* the ones waiting behind a visitor are not "could not happen": their 10 minutes start when it is their turn */
            for (const q of st.queue) if (!q.back) q.noted = now;
            if (!homeFront() || st.hold) { interrupt(); return; }
            /* a resize event that came too early or never came (seen on a slow WebKit): the next check moves them on screen */
            const e = st.current;
            if (e.shownAt && e.nodes && !sizeT && (W.innerWidth !== e.vw || W.innerHeight !== e.vh)) placeNodes(e);
            return;
        }
        if (expire(st, now)) save();
        if (!st.queue.length) { if (st.more && !st.current) { done(st.moreIds); st.more = 0; st.moreIds = []; } disarm(); return; }
        if (st.hold || !homeFront()) return;
        if (W.innerWidth < 260 || W.innerHeight < 300) return;
        show(next(st));
    }

    /* ---------- the visit ---------- */
    function rect(e) { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; }
    function union(list) { if (!list.length) return null; return list.reduce((a, r) => ({ left: Math.min(a.left, r.left), top: Math.min(a.top, r.top), right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom) })); }
    function px(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }
    let safeEl = null;
    function safe() {   /* the notch / home-indicator insets, measured (the CSS vars hold env() text, not numbers) */
        if (!safeEl) { safeEl = el('div', 'hv-safe'); D.body.appendChild(safeEl); }
        const cs = getComputedStyle(safeEl); return { t: px(cs.paddingTop), b: px(cs.paddingBottom) };
    }
    function layout(cardH) {
        const vw = W.innerWidth, vh = W.innerHeight, ringEls = [];
        D.querySelectorAll('[data-orbit], #whPad, #spBubble').forEach(e => { if (vis(e)) ringEls.push(rect(e)); });
        const ring = union(ringEls);
        let topLimit = 0, bottomLimit = vh;
        D.querySelectorAll('#spHome .sp-top, #spHome .sp-weather, #whHud .wh-todaybtn, #whHud .wh-zoom, #whHud .wh-vr, #whHud .wa-btn, #hcLine, #f3Board, #tbTheme, #tabbar').forEach(e => {
            if (!vis(e)) return; const r = rect(e);
            if (ring && r.bottom <= ring.top + 4) topLimit = Math.max(topLimit, r.bottom + 6);
            else if (ring && r.top >= ring.bottom - 4) bottomLimit = Math.min(bottomLimit, r.top - 6);
        });
        const s = safe();
        return place({ vw, vh, ring, cardH, sat: s.t, sab: s.b, topLimit, bottomLimit, orb: vw >= 700 ? 84 : 64 });
    }
    function el(tag, cls, parent) { const e = D.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
    function anim(node, frames, opts) { if (!node || !node.animate) return null; try { const a = node.animate(frames, opts); anims.push(a); return a; } catch (e) { return null; } }

    function show(e) {
        if (!e) return;
        const c = C(), l = L();
        st.current = e; e.tries++;
        const name = e.by || 'Member';
        layer = el('div', 'hv-layer'); layer.id = 'hvLayer'; layer.setAttribute('data-noi18n', '');
        layer.dataset.uid = e.uid;
        let color = ''; try { color = (c && c.colorOf && c.colorOf(e.uid)) || ''; } catch (x) { }
        if (color) layer.style.setProperty('--hv-c', color);
        const sr = el('div', 'hv-sr', layer); sr.setAttribute('role', 'status'); sr.setAttribute('aria-live', 'polite');
        const ripple = el('div', 'hv-ripple', layer), base = el('div', 'hv-base', layer);
        const flier = el('div', 'hv-flier', layer), orb = el('div', 'hv-orb', flier), face = el('div', 'hv-face', orb);
        el('i', 'hv-glass', orb); el('i', 'hv-scan', orb);
        let svg = ''; try { svg = (c && c.face && c.face(e.uid, 'hv' + (hash(e.id) % 1e6).toString(36))) || ''; } catch (x) { svg = ''; }
        if (svg) face.innerHTML = svg; else face.textContent = (name.charAt(0) || '?').toUpperCase();   /* the room's own companion drawing; a letter only if it has none */
        const card = el('div', 'hv-card', layer);
        const open = el('button', 'hv-open', card); open.type = 'button';
        const who = el('b', 'hv-name', open), msg = el('span', 'hv-text', open), foot = el('span', 'hv-foot', open);
        const reply = el('span', 'hv-reply', foot), more = el('span', 'hv-more', foot);
        const x = el('button', 'hv-x', card); x.type = 'button'; x.textContent = '\u00d7';
        const set = (node, t) => { if (node.textContent !== t) node.textContent = t; };   /* unchanged words stay untouched (no re-announcement) */
        const fill = () => {
            const L2 = L();
            set(who, name); set(msg, short(e.text, 160));
            set(reply, words(L2, 'reply'));
            /* someone else waiting behind them is said on the card, so you know the x brings the next one */
            set(more, st.queue.length ? words(L2, 'waiting', { k: st.queue.length }) : st.more ? words(L2, 'more', { k: st.more }) : (e.count > 1 ? words(L2, 'count', { k: e.count }) : ''));
            const lab = words(L2, 'open', { n: name }) + ': ' + short(e.text, 160);
            if (open.getAttribute('aria-label') !== lab) open.setAttribute('aria-label', lab);
            if (x.getAttribute('aria-label') !== words(L2, 'close')) x.setAttribute('aria-label', words(L2, 'close'));
            set(sr, words(L2, 'came', { n: name }) + ': ' + short(e.text, 160));
        };
        fill(); e.fill = fill;
        D.body.appendChild(layer);
        e.nodes = { flier, ripple, base, card };
        const p = placeNodes(e);

        open.addEventListener('click', () => { const ids = e.ids.slice(), id = e.id, uid = e.uid; done(ids); remove(); try { if (c && c.openMessage) c.openMessage(uid, id); } catch (y) { } schedule(); });
        x.addEventListener('click', () => leave(true));
        keyFn = ev => { if (ev.key === 'Escape' && st.current === e) leave(true); };
        D.addEventListener('keydown', keyFn);

        const reduce = calm();
        const arrive = () => {
            if (st.current !== e || !layer) return;
            layer.classList.add('hv-here');
            if (!reduce) {
                anim(ripple, [{ transform: 'translate(-50%,-50%) scale(.25)', opacity: 0.85 }, { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
                anim(orb, [{ opacity: 1 }, { opacity: 0.35 }, { opacity: 0.95 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 520, easing: 'linear' });
            }
            anim(base, [{ opacity: 0, transform: 'translate(-50%,0) scaleX(.3)' }, { opacity: 1, transform: 'translate(-50%,0) scaleX(1)' }], { duration: reduce ? 200 : 420, easing: 'ease-out', fill: 'forwards' });
            const ca = anim(card, [{ opacity: 0, transform: 'translateY(' + (card.dataset.up ? -8 : 8) + 'px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: reduce ? 0 : 260, easing: 'cubic-bezier(.2,.9,.3,1.1)', fill: 'backwards' });
            card.classList.add('on');
            e.shownAt = Date.now() + (reduce ? 0 : 260);
            /* no reading timer (item 30): they stay until Reply, x or Escape; remembered as done only then */
            void ca;
        };
        if (reduce || e.back) {   /* reduced motion, or coming back after Home was covered: fade in in place, no second flight */
            anim(flier, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.92)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 320, easing: 'ease-out', fill: 'backwards' });
            arrive();
        } else {
            const o = origin(e.uid, p.x, p.y, W.innerWidth, W.innerHeight);
            e.from = o;
            const frames = path(o.dx, o.dy, 10).map(f => ({ transform: 'translate(calc(-50% + ' + f.x + 'px), calc(-50% + ' + f.y + 'px)) scale(' + f.s + ')', opacity: f.o, offset: f.offset }));
            const fa = anim(flier, frames, { duration: 1500, easing: 'linear', fill: 'backwards' });
            layer.classList.add('hv-flying');
            if (fa) fa.onfinish = () => { if (layer) layer.classList.remove('hv-flying'); arrive(); }; else arrive();
        }
        arm();
    }
    /* landing spot for the flier, ripple, beam and card; again in place when the screen size changes while they stand there */
    function placeNodes(e) {
        const n = e.nodes; if (!n || !layer) return null;
        const card = n.card;
        card.style.top = ''; card.style.bottom = ''; delete card.dataset.up;
        const p = layout(card.offsetHeight || 96);
        layer.dataset.mode = p.mode;
        const pos = (node, x0, y0) => { node.style.left = Math.round(x0) + 'px'; node.style.top = Math.round(y0) + 'px'; };
        pos(n.flier, p.x, p.y); pos(n.ripple, p.x, p.y); pos(n.base, p.x, p.y);
        card.style.left = Math.round(p.cardLeft) + 'px'; card.style.width = Math.round(p.cardW) + 'px';
        if (p.cardBottom != null) { card.style.bottom = Math.round(p.cardBottom) + 'px'; card.dataset.up = '1'; } else card.style.top = Math.round(p.cardTop) + 'px';
        card.style.setProperty('--hv-tail', Math.round(Math.max(18, Math.min(p.cardW - 18, p.x - p.cardLeft))) + 'px');
        e.layout = p; e.vw = W.innerWidth; e.vh = W.innerHeight;
        return p;
    }
    /* they go back the way they came */
    function leave(fast) {
        const e = st.current; if (!e || e.leaving) return;
        e.leaving = true;
        done(e.ids);
        const node = layer;
        if (!node) { st.current = null; schedule(); return; }
        const card = node.querySelector('.hv-card'), flier = node.querySelector('.hv-flier'), base = node.querySelector('.hv-base');
        const reduce = calm(), o = e.from;
        anim(card, [{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 140 : 220, fill: 'forwards' });
        anim(base, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
        const away = reduce || !o ? [{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.9)' }]
            : [{ opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: 0 }, { opacity: 0.4, transform: 'translate(-50%,-50%) scale(1.04)', offset: 0.15 }, { opacity: 0.9, transform: 'translate(-50%,-50%) scale(.98)', offset: 0.3 },
                { opacity: 0, transform: 'translate(calc(-50% + ' + Math.round(o.dx * 0.35) + 'px), calc(-50% + ' + Math.round(o.dy * 0.35) + 'px)) scale(.3)', offset: 1 }];
        const a = anim(flier, away, { duration: fast ? 380 : 750, easing: 'ease-in', fill: 'forwards' });
        const fin = () => { if (layer === node) remove(); else if (node.isConnected) node.remove(); schedule(); };
        if (a) { a.onfinish = fin; setTimeout(() => { if (node.isConnected) fin(); }, 1200); } else fin();
    }
    /* Home went away mid-visit (another tab, a sheet, the app in the background) */
    function interrupt() {
        const e = st.current; if (!e) return;
        remove();
        requeue(st, e, Date.now());   /* first in line again: comes back when Home is in front (no second flight once seen) */
        save();
        arm();
    }
    function remove() {
        for (const a of anims) { try { a.onfinish = null; a.cancel(); } catch (e) { } }
        anims = [];
        if (keyFn) { D.removeEventListener('keydown', keyFn); keyFn = null; }
        clearTimeout(sizeT); sizeT = 0;
        if (st.current) st.current.nodes = null;
        if (layer) { const f = D.activeElement; if (f && layer.contains(f) && f.blur) f.blur(); layer.remove(); }
        layer = null; st.current = null;
    }
    function clear() { remove(); st.queue = []; st.more = 0; st.moreIds = []; disarm(); }
    function schedule() { setTimeout(() => { if (st.queue.length) arm(); tick(); }, 600); }
    function later() { clearTimeout(scanT); scanT = setTimeout(scan, 250); }

    D.addEventListener('lowi:chat', later);
    D.addEventListener('visibilitychange', () => { if (D.hidden) { if (st.current) interrupt(); } else later(); });
    /* a rotation or the iOS bars changing size: a visitor standing there moves to the new spot; one still flying steps out and comes back */
    W.addEventListener('resize', () => {
        const e = st.current; if (!e) return;
        if (!e.shownAt) { interrupt(); return; }
        clearTimeout(sizeT); sizeT = setTimeout(() => { sizeT = 0; if (st.current === e && e.shownAt) placeNodes(e); }, 150);
    });
    D.addEventListener('lowi:lang', () => { if (st.current && st.current.fill) st.current.fill(); });
    setTimeout(scan, 1500);
    W.LowiHomeVisit = {
        has(id) { scan(); const r = claim(st, id, homeFront() && !st.hold); save(); return r; },
        scan, state: () => ({ scope: st.scope, queue: st.queue.map(q => ({ id: q.id, ids: q.ids.slice(), uid: q.uid, by: q.by, count: q.count })), current: st.current ? { id: st.current.id, ids: st.current.ids.slice(), uid: st.current.uid, by: st.current.by, mode: st.current.layout && st.current.layout.mode, shown: !!st.current.shownAt, back: !!st.current.back } : null, more: st.more, visited: st.visited.length, timer: !!tickT, hold: !!st.hold }),
        homeFront, dismiss: () => leave(true)
    };
})(typeof window !== 'undefined' ? window : null);
