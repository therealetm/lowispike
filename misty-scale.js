/* LOWiSPIKE Misty's energy scale and her way back (Oct 17, 2026).
   E-man: "Right now she's unhealthy, and I can't even see how unhealthy she is. There should be a scale showing how much I need
   to get back to what type of health, and what I need to do. It's still confusing."
   - ONE formula: Misty's energy is LowiSun.energy() / energyNow() (sun-meter.js). Tiers come from LowiSun.ENERGY:
     below .4 = worn out (a spiky meal logged today) or low on energy, .4 = doing okay (she can travel), .75 = full of energy.
     This file never computes energy itself.
   - The way back is SIMULATED, not guessed: we add the candidate logs (glasses of water, a Move, a low-spike meal) to a copy
     of today's saved logs and run the real energy() and the real world weather (LowiWorldMoodCore.read, build 232510), with
     the same fair rules (LowiWorldHealth.fairDay: twins once, rapid taps once; water counts up to 4 glasses, a Move once a day,
     weather calm caps per kind). So what the scale promises is what the app will really do.
   - Hunt power-ups: the hunt game publishes window.LowiMistyPower.read() -> {level, xp, next, boost, label} and the window event
     'lowi:misty-power' (COORDINATOR.md "SHARED API: Misty power"). energy() already adds boost (capped .2), the scale shows it
     as its own lighter segment plus the hunt level.
   - Where it lives (design rule: no new controls): her % on her name tag (the thin ring on her bubble rim went on Oct 18), and the full scale as a card in Misty's long-press card and in the sun sheet on Today.
   - Kind wording, game world only, no health claims. No per-frame loop and no timer: it repaints on app events only. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiMistyScale) return;
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const COST = { water: 1, move: 2, meal: 2.5 };
    const MAX = { meal: 2 };

    /* ---------- pure ---------- */
    function power(src) {
        try {
            const P = src && src.LowiMistyPower, r = P && typeof P.read === 'function' ? P.read() : null;
            if (!r) return null;
            return { level: Math.max(0, Math.floor(+r.level || 0)), xp: Math.max(0, +r.xp || 0), next: Math.max(0, +r.next || 0), boost: Math.max(0, Math.min(0.2, +r.boost || 0)), label: r.label ? String(r.label).slice(0, 80) : '' };
        } catch (e) { return null; }
    }
    function tierOf(v, spikes, E) { return v >= E.strong ? 'thriving' : v >= E.travel ? 'ok' : spikes ? 'weak' : 'tired'; }
    /* candidate logs, placed after everything already saved (and 61 s apart, so no fair-play rule merges them) */
    function withAdds(input, add) {
        const now = +input.now || Date.now(), key = dayKey(now);
        const logs = (input.logs || []).slice(), ledger = (input.ledger || []).slice();
        let t = now;
        for (const e of logs.concat(ledger)) if (e && +e.ts > t && dayKey(+e.ts) === key) t = +e.ts;
        const end = new Date(now); end.setHours(23, 59, 0, 0);
        if (t + 12 * 61000 > end.getTime()) t = Math.max(now, end.getTime() - 12 * 61000);
        let i = 0; const ts = () => t + (++i) * 61000;
        for (let n = 0; n < (add.water || 0); n++) ledger.push({ day: key, ts: ts(), amt: 2, src: 'water', label: 'Glass of water', eventId: 'ms-sim:w' + n });
        for (let n = 0; n < (add.move || 0); n++) ledger.push({ day: key, ts: ts(), amt: 5, src: 'move:sim', label: 'Move', eventId: 'ms-sim:m' + n });
        for (let n = 0; n < (add.meal || 0); n++) logs.push({ day: key, ts: ts(), t: 'ms sim low spike meal ' + n, r: 'ja', lvl: 'low', eventId: 'ms-sim:l' + n });
        const water = input.water ? (+input.water || 0) + (add.water || 0) : 0;
        return { now, logs, ledger, water, boost: input.boost || 0 };
    }
    /* deps: { energy, ENERGY, mood?: LowiWorldMoodCore, wh?: LowiWorldHealth, state?: saved state (for the weather trend) } */
    function plan(input, deps) {
        const E = deps.ENERGY, run = add => deps.energy(withAdds(input, add));
        const cur = deps.energy(Object.assign({}, input));
        const weather = add => {
            if (!deps.mood || !deps.wh) return null;
            const x = withAdds(input, add), st = Object.assign({}, deps.state || {}, { logs: x.logs, ledger: x.ledger });
            try { return deps.mood.read(st, x.now, deps.wh); } catch (e) { return null; }
        };
        const out = { value: cur.value, tier: cur.tier, boost: +cur.boost || 0, cur, next: null, target: 0, need: 0, steps: [], reach: null, reachTier: '', full: false, wx: null };
        if (cur.value >= E.strong) { out.full = true; return out; }
        out.next = cur.value >= E.travel ? 'thriving' : 'ok';
        out.target = out.next === 'thriving' ? E.strong : E.travel;
        out.need = Math.max(0, out.target - cur.value);
        const wMax = Math.max(0, (E.waterGoal || 4) - (cur.water || 0)), mMax = cur.moves ? 0 : 1;
        let best = null, top = null;
        for (let w = 0; w <= wMax; w++) for (let m = 0; m <= mMax; m++) for (let l = 0; l <= MAX.meal; l++) {
            if (!w && !m && !l) continue;
            const add = { water: w, move: m, meal: l }, en = run(add), cost = w * COST.water + m * COST.move + l * COST.meal;
            const kinds = (w ? 1 : 0) + (m ? 1 : 0) + (l ? 1 : 0);
            const c = { add, en, cost, kinds };
            if (en.value + 1e-9 >= out.target) { if (!best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && en.value > best.en.value)) best = c; }
            if (!top || en.value > top.en.value + 1e-9 || (Math.abs(en.value - top.en.value) < 1e-9 && cost < top.cost)) top = c;
        }
        const pick = best || top;
        if (!pick || pick.en.value <= cur.value + 1e-9) return out;
        out.reached = !!best;
        /* steps in the order you'd do them, each with what it adds on top of the one before (they sum to the total) */
        let acc = { water: 0, move: 0, meal: 0 }, prev = cur.value;
        for (const k of ['move', 'water', 'meal']) {
            const n = pick.add[k]; if (!n) continue;
            acc = Object.assign({}, acc, { [k]: n });
            const v = run(acc).value;
            out.steps.push({ k, n, gain: Math.max(0, v - prev) });
            prev = v;
        }
        out.reach = pick.en.value; out.reachTier = tierOf(pick.en.value, pick.en.spikes, E);
        const w0 = weather({}), w1 = weather(pick.add);
        if (w0 && w1) out.wx = { from: w0.level, to: w1.level, was: w0.tier, now: w1.tier };
        return out;
    }

    /* ---------- copy ---------- */
    const STR = {
        title: ['{n}\u2019s energy', 'Energie von {n}', 'Energ\u00eda de {n}'],
        weak: ['Worn out', 'Ersch\u00f6pft', 'Agotada'], tired: ['Low on energy', 'Wenig Energie', 'Poca energ\u00eda'],
        ok: ['Doing okay', 'Geht so', 'Bien'], thriving: ['Full of energy', 'Voller Energie', 'Llena de energ\u00eda'],
        zLow: ['Low', 'Wenig', 'Poca'], zOk: ['Okay', 'Okay', 'Bien'], zFull: ['Full', 'Voll', 'Llena'],
        toGo: ['{p} to {t}', 'Noch {p} bis \u201e{t}\u201c', 'Faltan {p} para \u00ab{t}\u00bb'],
        way: ['Fastest way there now', 'So geht es jetzt am schnellsten', 'Lo m\u00e1s r\u00e1pido ahora'],
        water1: ['1 glass of water', '1 Glas Wasser', '1 vaso de agua'], waterN: ['{x} glasses of water', '{x} Gl\u00e4ser Wasser', '{x} vasos de agua'],
        move1: ['1 Move (a few minutes is enough)', '1 Bewegung (ein paar Minuten reichen)', '1 Movimiento (bastan unos minutos)'],
        meal1: ['1 low-spike meal', '1 Mahlzeit ohne Spike', '1 comida sin pico'], mealN: ['{x} low-spike meals', '{x} Mahlzeiten ohne Spike', '{x} comidas sin pico'],
        then: ['Then she\u2019s at {t} ({p}).', 'Dann ist sie bei \u201e{t}\u201c ({p}).', 'Entonces estar\u00e1 en \u00ab{t}\u00bb ({p}).'],
        partial: ['That gets her to {p} today. Her day starts fresh at midnight, so tomorrow the rest is easy.', 'Damit kommt sie heute auf {p}. Um Mitternacht f\u00e4ngt ihr Tag neu an, morgen geht der Rest leicht.', 'Con eso llega hoy a {p}. A medianoche su d\u00eda empieza de nuevo y ma\u00f1ana el resto es f\u00e1cil.'],
        clears: ['The storm in your world clears too.', 'Der Sturm in deiner Welt klart dabei auch auf.', 'La tormenta de tu mundo tambi\u00e9n se despeja.'],
        calms: ['The storm in your world calms down too.', 'Der Sturm in deiner Welt beruhigt sich dabei auch.', 'La tormenta de tu mundo tambi\u00e9n se calma.'],
        top: ['She\u2019s at the top. On trips she brings back a bonus find.', 'Sie ist ganz oben. Von Ausfl\u00fcgen bringt sie einen Extra-Fund mit.', 'Est\u00e1 arriba del todo. De sus viajes trae un hallazgo extra.'],
        drag: ['A spiky meal is weighing on her today. Low-spike meals lift her back up.', 'Eine Spike-Mahlzeit zieht sie heute runter. Mahlzeiten ohne Spike heben sie wieder an.', 'Una comida con pico la frena hoy. Las comidas sin pico la levantan.'],
        nothing: ['Nothing tracked yet today, so she\u2019s resting.', 'Heute ist noch nichts eingetragen, also ruht sie.', 'Hoy a\u00fan no hay nada registrado, as\u00ed que descansa.'],
        travel: ['From \u201cOkay\u201d she can go on adventures.', 'Ab \u201eOkay\u201c kann sie auf Abenteuer gehen.', 'Desde \u00abBien\u00bb puede irse de aventura.'],
        fair: ['Fair play: each glass counts once (up to 4 a day), a Move once a day, the same meal twice counts once, and quick repeat taps add nothing. Her day starts fresh at midnight.', 'Fair Play: Jedes Glas z\u00e4hlt einmal (bis 4 am Tag), eine Bewegung einmal am Tag, dieselbe Mahlzeit doppelt z\u00e4hlt einmal, schnelle Wiederholungen bringen nichts. Um Mitternacht f\u00e4ngt ihr Tag neu an.', 'Juego limpio: cada vaso cuenta una vez (hasta 4 al d\u00eda), un Movimiento una vez al d\u00eda, la misma comida dos veces cuenta una vez y los toques repetidos no suman. Su d\u00eda empieza de nuevo a medianoche.'],
        power: ['Hunt power', 'Jagd-Kraft', 'Poder de caza'], lv: ['Lv', 'Lv', 'Nv'], maxLv: ['top level', 'h\u00f6chstes Level', 'nivel m\u00e1ximo'],
        boost: ['+{p} from power-ups today', '+{p} durch Power-ups heute', '+{p} por potenciadores hoy'],
        aria: ['{n}\u2019s energy: {t}, {p}', 'Energie von {n}: {t}, {p}', 'Energ\u00eda de {n}: {t}, {p}']
    };
    const LI = l => ({ en: 0, de: 1, es: 2 })[String(l || 'en').slice(0, 2)];
    const tr = (k, l, vars) => {
        const a = STR[k] || [k], i = LI(l);
        let s = a[i == null ? 0 : i] || a[0];
        for (const v in (vars || {})) s = s.split('{' + v + '}').join(vars[v]);
        return s;
    };
    /* a level reads rounded DOWN and the distance rounded UP, so 39.9% never shows as "40%, Low" and the two always add up */
    const pct = v => Math.floor(Math.max(0, Math.min(1, +v || 0)) * 100 + 1e-6) + '%';
    const pctUp = v => Math.ceil(Math.max(0, Math.min(1, +v || 0)) * 100 - 1e-6) + '%';
    const pctR = v => Math.round(Math.max(0, Math.min(1, +v || 0)) * 100) + '%';
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    function stepText(s, l) {
        if (s.k === 'water') return s.n === 1 ? tr('water1', l) : tr('waterN', l, { x: s.n });
        if (s.k === 'move') return tr('move1', l);
        return s.n === 1 ? tr('meal1', l) : tr('mealN', l, { x: s.n });
    }
    /* the card: pure string so it can be tested; p = plan(), pw = power(), opts {name, lang, E} */
    function cardHTML(p, pw, opts) {
        const l = opts.lang, E = opts.E, n = opts.name || 'Misty', v = Math.max(0, Math.min(1, p.value));
        const tName = tr(p.tier, l), boost = Math.min(v, p.boost || 0);
        const zone = (a, b, k, cls) => '<span class="ms-z ' + cls + '" style="left:' + (a * 100).toFixed(1) + '%;width:' + ((b - a) * 100).toFixed(1) + '%"><em>' + esc(tr(k, l)) + '</em></span>';
        let h = '<section class="mh-card ms-card" data-ms-tier="' + p.tier + '" aria-label="' + esc(tr('title', l, { n })) + '">' +
            '<div class="ms-head"><h3>' + esc(tr('title', l, { n })) + '</h3><b class="ms-now num">' + esc(tName) + ' \u00b7 ' + pct(v) + '</b></div>' +
            '<div class="ms-scale" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(v * 100) + '" aria-valuetext="' + esc(tName + ', ' + pct(v)) + '" aria-label="' + esc(tr('title', l, { n })) + '" style="--ms-v:' + v.toFixed(3) + ';--ms-b:' + boost.toFixed(3) + ';--ms-ok:' + E.travel + ';--ms-full:' + E.strong + '">' +
            '<span class="ms-track">' + zone(0, E.travel, 'zLow', 'low') + zone(E.travel, E.strong, 'zOk', 'ok') + zone(E.strong, 1, 'zFull', 'full') +
            '<i class="ms-fill"></i>' + (boost > 0.004 ? '<i class="ms-boost"></i>' : '') + '<i class="ms-dot"></i></span></div>';
        if (p.full) h += '<p class="ms-line">' + esc(tr('top', l)) + '</p>';
        else {
            h += '<p class="ms-togo num"><b>' + esc(tr('toGo', l, { p: pctUp(p.need), t: tr(p.next, l) })) + '</b></p>';
            const why = p.cur && p.cur.spikes ? tr('drag', l) : (p.cur && !p.cur.meals && !p.cur.water && !p.cur.moves ? tr('nothing', l) : '');
            if (why) h += '<p class="ms-line">' + esc(why) + '</p>';
            if (p.steps.length) {
                h += '<h4>' + esc(tr('way', l)) + '</h4><ol class="ms-steps">' + p.steps.map(s => '<li data-ms-step="' + s.k + '"><span>' + esc(stepText(s, l)) + '</span><b class="num">+' + pctR(s.gain) + '</b></li>').join('') + '</ol>';
                h += '<p class="ms-line ms-then">' + esc(p.reached ? tr('then', l, { t: tr(p.reachTier, l), p: pct(p.reach) }) : tr('partial', l, { p: pct(p.reach) })) + (p.wx && p.wx.was === 'stormy' ? ' ' + esc(p.wx.now === 'clear' ? tr('clears', l) : p.wx.to < p.wx.from - 0.001 ? tr('calms', l) : '') : '') + '</p>';
            }
            if (p.next === 'ok') h += '<p class="ms-note">' + esc(tr('travel', l)) + '</p>';
        }
        if (pw && (pw.level || pw.xp || pw.boost)) {
            const r = pw.next ? Math.max(0, Math.min(1, pw.xp / pw.next)) : 1;
            h += '<div class="ms-power"><div class="ms-prow"><span>' + esc(tr('power', l)) + ' \u00b7 ' + esc(tr('lv', l)) + ' ' + pw.level + (pw.label ? ' \u00b7 ' + esc(pw.label) : '') + '</span><b class="num">' + (pw.next ? Math.round(pw.xp) + '/' + Math.round(pw.next) : esc(tr('maxLv', l))) + '</b></div>' +
                '<i class="ms-pbar" aria-hidden="true"><i style="width:' + Math.round(r * 100) + '%"></i></i>' +
                (pw.boost ? '<small class="num">' + esc(tr('boost', l, { p: pctR(pw.boost) })) + '</small>' : '') + '</div>';
        }
        h += '<p class="ms-note">' + esc(tr('fair', l)) + '</p></section>';
        return h;
    }
    const pure = { power, plan, withAdds, tierOf, cardHTML, stepText, STR, COST, MAX, dayKey };
    if (!D) { if (typeof module !== 'undefined' && module.exports) module.exports = pure; return; }

    /* ---------- live ---------- */
    const H = D.documentElement;
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'de').slice(0, 2); } catch (e) { return 'de'; } };
    const name = () => { try { const t = W.LowiHerbTamagotchi, c = t && t.current && t.current(); return c ? String(t.name(c.p, c.m) || 'Misty') : 'Misty'; } catch (e) { return 'Misty'; } };
    const state = () => { try { return W.LowiVitalsBridge.state() || {}; } catch (e) { return {}; } };
    function waterToday(now) { try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}; return +((f.water || {})[dayKey(now)]) || 0; } catch (e) { return 0; } }
    /* quick = only where she is now (for the name tag); the full read also simulates the way back (for the card) */
    function read(quick) {
        const S = W.LowiSun; if (!S || !S.energy || !S.ENERGY) return null;
        const s = state(), now = Date.now(), pw = power(W);
        const input = { now, logs: s.logs || [], ledger: s.ledger || [], water: waterToday(now), boost: pw ? pw.boost : 0 };
        if (quick) { const en = S.energy(input); return { value: en.value, tier: en.tier, boost: +en.boost || 0, power: pw }; }
        const p = plan(input, { energy: S.energy, ENERGY: S.ENERGY, mood: W.LowiWorldMoodCore, wh: W.LowiWorldHealth, state: s });
        p.power = pw;
        return p;
    }
    function html() { const p = read(); return p ? cardHTML(p, p.power, { lang: lang(), name: name(), E: W.LowiSun.ENERGY }) : ''; }

    /* her tier word + % on the name tag (inside her bubble: nothing else moves).
       Oct 18 (E-man, iPad screenshot: "straight lines ... the old design is still inside of the new design"): the thin energy ring
       with its two tier ticks is gone. Her bubble is the 3D living glass now (its membrane turns reddish when she is weak), so the
       ring was an old arc drawn inside it and the tick at "full of energy" showed as a straight line on her left. The reading itself
       stays: "Misty Moon \u00b7 55%" on the name tag and the whole scale in her long-press card. */
    let lastSig = '', lastBub = null;
    function paint() {
        const bub = D.getElementById('spBubble');
        if (!bub) return;
        const p = read(true); if (!p) return;
        const l = lang(), v = Math.max(0, Math.min(1, p.value)), b = Math.min(v, p.boost || 0);
        if (bub !== lastBub) { lastBub = bub; lastSig = ''; }
        const sig = [p.tier, v.toFixed(3), b.toFixed(3), l, name(), (p.power && [p.power.level, p.power.xp].join()) || ''].join('|');
        if (sig === lastSig) return;
        lastSig = sig;
        /* her name tag gets the reading: "Clover Leaf · 20%" (non-breaking, so it never splits off her name) */
        bub.style.setProperty('--ms-tag', '"\u00a0\u00b7\u00a0' + pct(v) + '"');
        bub.setAttribute('data-ms-tier', p.tier);
        /* an open card keeps up too */
        const card = D.querySelector('.r2-ov .ms-card');
        if (card) { const t = D.createElement('div'); t.innerHTML = html(); if (t.firstChild) card.replaceWith(t.firstChild); }
    }
    let soon = 0;
    const schedule = () => { if (soon) return; soon = setTimeout(() => { soon = 0; try { paint(); } catch (e) { } }, 120); };
    ['lowi:reward', 'lowi:state', 'lowi:care', 'lowi:lang', 'lowi:fast', 'lowi:water', 'lowi:meal', 'lowi:meal-logged', 'lowi:world-mood', 'lowi:misty-power', 'storage', 'focus'].forEach(n => { W.addEventListener(n, schedule); if (n.indexOf('lowi:') === 0) D.addEventListener(n, schedule); });
    D.addEventListener('visibilitychange', () => { if (!D.hidden) schedule(); });
    /* a rebuilt Home (after Community etc.) gets its name tag reading back: one cheap check per rebuild, no polling */
    function boot() {
        schedule();
        const tab = D.getElementById('tab-home');
        if (tab && W.MutationObserver) new MutationObserver(() => { const bub = D.getElementById('spBubble'); if (bub && (bub !== lastBub || !bub.style.getPropertyValue('--ms-tag'))) schedule(); }).observe(tab, { childList: true, subtree: true });
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    W.LowiMistyScale = Object.assign({}, pure, { read, html, paint });
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiMistyScale;
})();
