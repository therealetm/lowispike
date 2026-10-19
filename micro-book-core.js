/* LOWiSPIKE adventure log and friend care (Oct 15, 2026; the microbe collection was removed Oct 16). Pure logic, no DOM.
   - Adventure log: every finished body journey (ledger eventId body-trip:<...> or a lowi:body-trip-done event) with one
     "your cell discovered ..." line per journey.
   - Care: supportive sends to real friends only (friends list from the friends tree, lowispike.friends.v1). Free (Oct 19,
     Emmanuel: the sparks budget is gone, no counter, no cost); one send per friend, kind and day, plus level unlocks and
     time windows. Nothing about health is stored or sent, and caring never takes XP or energy. */
(function (root) {
    'use strict';
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const T = (en, de, es) => [en, de, es];

    /* ---------- counting the ledger ---------- */
    function kind(e) {
        const src = String(e && e.src || ''), id = String(e && e.eventId || ''), txt = (src + ' ' + (e && e.label || '')).toLowerCase();
        if (/^sun-full:/.test(id) || /^sun-full/.test(src)) return 'sun';
        if (/^body-trip:/.test(id) || /^body-trip/.test(src)) return 'trip';
        if (/^macro-goal/.test(id) || /^macro-goal/.test(src)) return 'macro';
        if (!src || /^f\d|^f3all|^f2_break|^e1:|^rhythm|^hq|^quest|^care/.test(src)) return 'quest';
        if (/^meal/.test(src) || /^meal:|^plan-meal:/.test(id)) return 'meal';
        if (/scan|capture|product|dex/.test(txt)) return 'scan';
        if (/water|wasser|agua|hydrat/.test(txt)) return 'water';
        if (/move|walk|workout|steps|dance|yoga|stretch/.test(txt)) return 'move';
        if (/fast/.test(txt)) return 'fast';
        return 'other';
    }
    function counts(ledger, extraTrips) {
        const c = { meal: 0, scan: 0, move: 0, fast: 0, water: 0, protein: 0, fiber: 0, sugar: 0, sun: 0, trip: 0, days: 0 };
        const days = new Set(), trips = new Set();
        for (const e of ledger || []) {
            if (!e || !(+e.amt > 0)) continue;
            const k = kind(e);
            if (k === 'macro') { const m = /:(protein|fiber|sugar)$/.exec(String(e.eventId || '')); if (m) c[m[1]]++; }
            else if (k === 'trip') trips.add(String(e.eventId || e.ts));
            else if (k in c) c[k]++;
            if (/^(meal|scan|move|fast|water|macro)$/.test(k)) days.add(e.day || dayKey(+e.ts || 0));
        }
        for (const t of extraTrips || []) if (t && t.id) trips.add(String(t.id));
        c.trip = trips.size;
        c.days = days.size;
        return c;
    }

    /* (the microbe collection, its buddies, colour variants and hints were removed Oct 16 with the microbe buddies, user decision) */

    /* ---------- adventure log ---------- */
    const PLACES = [
        { re: /colon|dickdarm|biom|microb/, name: T('Large intestine', 'Dickdarm', 'Intestino grueso'), saw: T('the bacteria garden of the large intestine', 'den Bakteriengarten im Dickdarm', 'el jardín de bacterias del intestino grueso') },
        { re: /gut|darm|intestin|duoden|villi|small/, name: T('Small intestine', 'Dünndarm', 'Intestino delgado'), saw: T('the villi of the small intestine', 'die Zotten des Dünndarms', 'las vellosidades del intestino delgado') },
        { re: /stomach|magen|gastr/, name: T('Stomach', 'Magen', 'Estómago'), saw: T('the folds of the stomach wall', 'die Falten der Magenwand', 'los pliegues de la pared del estómago') },
        { re: /pancrea|pankrea|bauchspeichel|islet|insel/, name: T('Pancreas', 'Bauchspeicheldrüse', 'Páncreas'), saw: T('the islets of Langerhans', 'die Langerhans-Inseln', 'los islotes de Langerhans') },
        { re: /liver|leber|hepat/, name: T('Liver', 'Leber', 'Hígado'), saw: T('the glycogen stores of the liver', 'die Glykogen-Speicher der Leber', 'las reservas de glucógeno del hígado') },
        { re: /lung|lunge|alveol|breath|atem/, name: T('Lungs', 'Lunge', 'Pulmones'), saw: T('the tiny air sacs of the lungs', 'die Lungenbläschen', 'los alvéolos de los pulmones') },
        { re: /heart|herz|cardi/, name: T('Heart', 'Herz', 'Corazón'), saw: T('the valves of the heart', 'die Herzklappen', 'las válvulas del corazón') },
        { re: /muscle|muskel|musc/, name: T('Muscle', 'Muskel', 'Músculo'), saw: T('the mitochondria in the muscle fibres', 'die Mitochondrien in den Muskelfasern', 'las mitocondrias de las fibras musculares') },
        { re: /blood|blut|vessel|ader|vein|capill|sangre/, name: T('Bloodstream', 'Blutbahn', 'Torrente sanguíneo'), saw: T('the capillaries of the bloodstream', 'die Kapillaren der Blutbahn', 'los capilares del torrente sanguíneo') },
        { re: /brain|hirn|neuro|cerebr/, name: T('Brain', 'Gehirn', 'Cerebro'), saw: T('the synapses of the brain', 'die Synapsen im Gehirn', 'las sinapsis del cerebro') },
        { re: /kidney|niere|renal/, name: T('Kidneys', 'Niere', 'Riñones'), saw: T('the filters of the kidneys', 'die Filterkörperchen der Niere', 'los filtros de los riñones') },
        { re: /fat|fett|adipo/, name: T('Fat tissue', 'Fettgewebe', 'Tejido graso'), saw: T('the brown fat cells', 'die braunen Fettzellen', 'las células de grasa parda') }
    ];
    const SOMEWHERE = { name: T('Body', 'Körper', 'Cuerpo'), saw: T('a new place in your body', 'einen neuen Ort in deinem Körper', 'un lugar nuevo de tu cuerpo') };
    function place(key) { const k = String(key || '').toLowerCase(); return PLACES.find(p => p.re.test(k)) || SOMEWHERE; }
    const cleanText = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
    /* Oct 16: body-trips.js used to send the trip's fact as 'saw', cut at 88 characters ("Your cell discovered While you
       fast, t…"). A 'saw' only counts when it reads like a place ("the villi of the gut"): starts small, no full stop,
       short. Anything else (including those old saved entries) falls back to the place's own words. */
    const placeSaw = s => { const x = cleanText(s); return x && x.length <= 64 && !/[.!?\u2026:;]/.test(x) && x.charAt(0) === x.charAt(0).toLowerCase() && x.charAt(0) !== x.charAt(0).toUpperCase() ? x : ''; };
    /* journeys = ledger body-trip entries + logged events, one per id, oldest first */
    function journeys(ledger, logged) {
        const map = new Map();
        for (const e of ledger || []) {
            if (!e || kind(e) !== 'trip') continue;
            const id = String(e.eventId || ('body-trip:' + e.ts));
            if (!map.has(id)) map.set(id, { id, key: id.replace(/^body-trip:/, '') + ' ' + (e.label || ''), ts: +e.ts || 0, day: e.day || dayKey(+e.ts || 0) });
        }
        for (const t of logged || []) {
            if (!t || !t.id) continue;
            const id = /^body-trip:/.test(t.id) ? t.id : 'body-trip:' + t.id, old = map.get(id) || {};
            map.set(id, { id, key: String(t.place || t.key || old.key || t.id), ts: +t.ts || old.ts || 0, day: t.day || old.day || dayKey(+t.ts || 0), saw: placeSaw(t.saw) ? [placeSaw(t.saw)] : old.saw, name: t.name ? [cleanText(t.name)] : old.name });
        }
        const list = [...map.values()].sort((a, b) => a.ts - b.ts);
        return list.map((j, i) => { const p = place(j.key); return Object.assign({}, j, { no: i + 1, place: { name: j.name || p.name, saw: j.saw || p.saw } }); });
    }
    const ORD = T('{n}. journey done!', '{n}. Reise geschafft!', '¡Viaje n.º {n} completado!');
    const SAW = T('Your cell discovered {x} today.', 'Deine Zelle hat heute {x} entdeckt.', 'Tu célula descubrió hoy {x}.');
    const SAW_PAST = T('discovered {x}', '{x} entdeckt', 'descubrió {x}');
    const pick = (a, L) => (a && (a[L] || a[0])) || '';
    function journeyLine(j, L, today) { return (today ? pick(SAW, L) : pick(SAW_PAST, L)).replace('{x}', pick(j.place.saw, L)); }
    function journeyTitle(j, L) { return pick(ORD, L).replace('{n}', String(j.no)); }

    /* ---------- friend care ---------- */
    const CARE = [
        { id: 'hug', e: '\u{1F917}', n: T('Hug', 'Umarmung', 'Abrazo'), say: T('I’d love to send {n} a warm hug!', 'Ich schick {n} gern eine warme Umarmung!', '¡Me encantaría mandarle a {n} un abrazo cálido!'), got: T('{w} sent you a hug', '{w} hat dir eine Umarmung geschickt', '{w} te mandó un abrazo') },
        { id: 'water', e: '\u{1F4A7}', n: T('Drink water', 'Trink Wasser', 'Bebe agua'), say: T('I’ll remind {n} to have a glass of water!', 'Ich erinnere {n} an ein Glas Wasser!', '¡Le recuerdo a {n} que beba un vaso de agua!'), got: T('{w} reminds you: drink some water', '{w} erinnert dich: Trink ein Glas Wasser', '{w} te recuerda: bebe un vaso de agua') },
        { id: 'morning', e: '\u2600\uFE0F', from: 4, to: 12, n: T('Good morning', 'Guten Morgen', 'Buenos días'), say: T('I want to wish {n} a bright start to the day!', 'Ich wünsch {n} einen hellen Start in den Tag!', '¡Quiero desearle a {n} un buen comienzo del día!'), got: T('{w} wishes you a good morning', '{w} wünscht dir einen guten Morgen', '{w} te desea buenos días') },
        { id: 'night', e: '\u{1F319}', from: 18, to: 4, n: T('Sweet dreams', 'Gute Nacht', 'Dulces sueños'), say: T('I’d love to help {n} get a good night’s sleep!', 'Ich würde {n} gern beim Einschlafen helfen!', '¡Me encantaría ayudar a {n} a dormir bien!'), got: T('{w} wishes you a good night', '{w} wünscht dir eine gute Nacht', '{w} te desea buenas noches') },
        { id: 'thanks', e: '\u{1F64F}', lv: 3, n: T('Gratitude', 'Dankbarkeit', 'Gratitud'), say: T('I want to tell {n} thank you!', 'Ich will {n} Danke sagen!', '¡Quiero darle las gracias a {n}!'), got: T('{w} is grateful for you', '{w} ist dankbar für dich', '{w} está agradecido por ti') },
        { id: 'cheer', e: '\u{1F4AA}', lv: 5, n: T('Encouragement', 'Motivation', 'Ánimo'), say: T('I’m cheering {n} on today!', 'Ich feuere {n} heute an!', '¡Hoy animo a {n}!'), got: T('{w} is cheering you on', '{w} feuert dich an', '{w} te está animando') }
    ];
    /* (Oct 19: the daily sparks budget, 3 a day + 1 per logged action up to 8, was removed: care is free) */
    function inWindow(k, hour) {
        if (k.from == null) return true;
        return k.from < k.to ? hour >= k.from && hour < k.to : hour >= k.from || hour < k.to;
    }
    const okUid = u => typeof u === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(u);
    function careId(toUid, kindId, day) { return okUid(toUid) && CARE.some(k => k.id === kindId) && /^\d{4}-\d{2}-\d{2}$/.test(day) ? 'care:' + toUid + ':' + kindId + ':' + day : ''; }
    function parseCare(id) { const m = /^care:([A-Za-z0-9_-]{6,64}):([a-z]+):(\d{4}-\d{2}-\d{2})$/.exec(String(id || '')); return m && CARE.some(k => k.id === m[2]) ? { to: m[1], kind: m[2], day: m[3] } : null; }
    /* can this kind go to this friend now? reason: 'sent' | 'locked' | 'time' | '' (free: nothing to afford) */
    function canCare(st, f, k, ctx) {
        ctx = ctx || {};
        if (!f || !okUid(f.uid) || !k) return { ok: false, why: 'none' };
        const id = careId(f.uid, k.id, ctx.day);
        if ((st && st.sent || {})[id]) return { ok: false, why: 'sent' };
        if (k.lv && (+ctx.level || 1) < k.lv) return { ok: false, why: 'locked' };
        if (!inWindow(k, +ctx.hour || 0)) return { ok: false, why: 'time' };
        return { ok: true, why: '', id };
    }
    /* incoming care from reactions rows: only from friends, never from hidden people, one per id */
    function incoming(rows, myUid, friends, blocked, seen) {
        const fr = new Map((friends || []).map(f => [f.uid, f])), b = blocked || {}, s = seen || {}, out = [];
        for (const r of rows || []) {
            const c = r && parseCare(r.message_id);
            if (!c || c.to !== myUid || !fr.has(r.user_id) || b[r.user_id] || b[r.who]) continue;
            const id = r.message_id + ':' + r.user_id;
            if (s[id]) continue;
            out.push({ id, from: r.user_id, who: fr.get(r.user_id).n, kind: c.kind, day: c.day });
        }
        return out;
    }

    const api = { dayKey, kind, counts, PLACES, place, journeys, journeyLine, journeyTitle, CARE, inWindow, careId, parseCare, canCare, incoming, okUid, pick };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.LowiMicroCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
