/* LOWiSPIKE: Misty's hints (Oct 16, E-man: "her hints react to how the world is doing").
   No formula of its own: it only READS the existing signals
   - LowiWorldMood.tier / .why (world-mood-core.js, the world weather) and the 'lowi:world-mood' event
   - LowiSun.energyNow() (sun-meter.js; below ENERGY.travel = 0.4 she cannot go on trips or adventures)
   - LowiWorldHealth.forState() (world-health-core.js, the 4-day "Your inside" haze)
   and turns them into one short, kind line in her voice. Game world only: no body readings, no blame, no medical claims.
   Runs only on events (a world-mood change, a triple-tap on Misty's controller): no timers per frame, nothing off-screen. */
(function (root) {
    'use strict';
    const TRAVEL = 0.4;
    const STR = {
        stormFood: ['The sky turned stormy from food rated spiky today. It is only game weather. A Move or a low-spike meal next helps it clear.', 'Der Himmel ist heute stürmisch, weil Essen als Spike eingestuft wurde. Das ist nur Spielwetter. Eine Bewegung oder eine Low-Spike-Mahlzeit als Nächstes klärt ihn auf.', 'El cielo está tormentoso por comida calificada con picos hoy. Es solo el clima del juego. Un Movimiento o una comida sin picos ayuda a despejarlo.'],
        stormMoved: ['Your Move is calming the storm. I love watching it clear up.', 'Deine Bewegung beruhigt den Sturm. Ich schaue so gern zu, wie es aufklart.', 'Tu Movimiento está calmando la tormenta. Me encanta ver cómo se despeja.'],
        stormProducts: ['A spiky-rated product made the sky a little stormy. A Move or a low-spike meal next helps it clear.', 'Ein als Spike eingestuftes Produkt hat den Himmel etwas stürmisch gemacht. Eine Bewegung oder eine Low-Spike-Mahlzeit hilft beim Aufklaren.', 'Un producto calificado con picos nubló un poco el cielo. Un Movimiento o una comida sin picos ayuda a despejarlo.'],
        weak: ['I am a little wobbly and too low on energy for adventures right now. Water, a Move or a low-spike meal fills me up again.', 'Ich bin etwas wackelig und habe gerade zu wenig Energie für Abenteuer. Wasser, eine Bewegung oder eine Low-Spike-Mahlzeit füllen mich wieder auf.', 'Estoy un poco tambaleante y con poca energía para aventuras ahora. Agua, un Movimiento o una comida sin picos me recargan.'],
        tired: ['I am a bit sleepy for adventures right now. A glass of water, a Move or a meal you log gives me energy.', 'Ich bin gerade etwas müde für Abenteuer. Ein Glas Wasser, eine Bewegung oder eine eingetragene Mahlzeit geben mir Energie.', 'Tengo un poco de sueño para aventuras ahora. Un vaso de agua, un Movimiento o una comida registrada me dan energía.'],
        hazy: ['It is a bit hazy in here these days. ', 'Hier drin ist es in letzter Zeit etwas diesig. ', 'Aquí dentro está algo brumoso estos días. '],
        bright: ['Clear skies and I am full of light. Tap my controller three times and I go exploring.', 'Klarer Himmel und ich bin voller Licht. Tippe dreimal auf meine Steuerung und ich gehe auf Entdeckungstour.', 'Cielo despejado y estoy llena de luz. Toca tres veces mi control y salgo a explorar.'],
        calm: ['Calm weather today. I could drift around the worlds for a while.', 'Ruhiges Wetter heute. Ich könnte eine Weile durch die Welten treiben.', 'Clima tranquilo hoy. Podría flotar un rato por los mundos.'],
        cleared: ['The storm has passed. Thank you, it feels lighter in here.', 'Der Sturm ist vorbei. Danke, es fühlt sich hier leichter an.', 'La tormenta pasó. Gracias, aquí se siente más ligero.'],
        lost: ['Oh, where am I? ... Ah, there you are.', 'Oh, wo bin ich? ... Ah, da bist du ja.', 'Oh, ¿dónde estoy? ... Ah, ahí estás.'],
        t_food: ['A low-spike meal brightens it most.', 'Eine Low-Spike-Mahlzeit macht es am hellsten.', 'Una comida sin picos lo ilumina más.'],
        t_move: ['A short Move gets the flow going.', 'Eine kurze Bewegung bringt den Fluss in Schwung.', 'Un Movimiento corto activa el flujo.'],
        t_water: ['A glass of water clears the haze.', 'Ein Glas Wasser klärt den Dunst.', 'Un vaso de agua despeja la bruma.'],
        t_macro: ['Hitting protein or fiber lights it up.', 'Protein- oder Ballaststoff-Ziel lässt es leuchten.', 'Llegar a tu proteína o fibra lo enciende.'],
        t_log: ['Log a meal or a glass of water and watch it change.', 'Trag eine Mahlzeit oder ein Glas Wasser ein und schau zu.', 'Registra una comida o un vaso de agua y mira cómo cambia.']
    };
    const li = lang => { const l = String(lang || 'de').slice(0, 2); return l === 'en' ? 0 : l === 'es' ? 2 : 1; };
    const tr = (k, lang) => (STR[k] || STR.calm)[li(lang)];
    /* which hint fits right now. mood = {tier, why}, energy = {value, tier, canTravel}, health = {tier, empty, tip}. Pure. */
    function pick(o, lang) {
        o = o || {};
        const m = o.mood || {}, en = o.energy || null, h = o.health || null, why = Array.isArray(m.why) ? m.why : [];
        let k;
        if (o.prevTier === 'stormy' && m.tier !== 'stormy') k = 'cleared';
        else if (m.tier === 'stormy') k = why.indexOf('nomove') < 0 ? 'stormMoved' : why.indexOf('food') >= 0 ? 'stormFood' : 'stormProducts';
        else if (en && !(en.canTravel != null ? en.canTravel : +en.value >= TRAVEL)) k = en.tier === 'weak' ? 'weak' : 'tired';
        else if (h && !h.empty && h.tier === 'murky') k = 'hazy';
        else if (en && en.tier === 'thriving' && (!h || h.empty || h.tier === 'bright')) k = 'bright';
        else k = 'calm';
        let text = tr(k, lang);
        if (k === 'hazy') text += tr(STR['t_' + h.tip] ? 't_' + h.tip : 't_log', lang);
        return { k, text, canTravel: !en || (en.canTravel != null ? !!en.canTravel : +en.value >= TRAVEL) };
    }
    const core = { TRAVEL, STR, pick, tr };
    if (typeof module === 'object' && module.exports) module.exports = core;
    const W = root, D = W && W.document;
    if (!D || !D.addEventListener || W.LowiMistyHints) return;

    /* ---------- browser ---------- */
    const H = D.documentElement;
    const lang = () => String((W.LowiI18n && W.LowiI18n.lang) || H.lang || 'de').slice(0, 2);
    const S = () => { try { return (W.LowiVitalsBridge && W.LowiVitalsBridge.state && W.LowiVitalsBridge.state()) || W.S || null; } catch (e) { return null; } };
    function read() {
        let mood = null, energy = null, health = null;
        try { const M = W.LowiWorldMood; if (M) mood = { tier: M.tier, why: M.why, level: M.level }; } catch (e) { }
        try { if (W.LowiSun && W.LowiSun.energyNow) energy = W.LowiSun.energyNow(); } catch (e) { }
        try { if (W.LowiWorldHealth && W.LowiWorldHealth.forState) health = W.LowiWorldHealth.forState(S() || {}, Date.now(), li(lang())); } catch (e) { }
        return { mood, energy, health };
    }
    const now = extra => pick(Object.assign(read(), extra || {}), lang());
    /* item 3 (Oct 17): the guide is quiet while Misty travels between worlds (misty-flight.js sets html.mf-transit) */
    const say = t => { try { if (H.classList.contains('mf-transit')) return; if (W.LowiPraise && W.LowiPraise.say) W.LowiPraise.say(t); } catch (e) { } };
    const onToday = () => H.classList.contains('wh-home') && !D.hidden;
    let lastTier = null, lastSaid = 0, pend = 0;
    /* the weather changed: one hint a few seconds later, only while you are on Today, at most every 90 s */
    W.addEventListener('lowi:world-mood', e => {
        const d = (e && e.detail) || {}, prev = lastTier; lastTier = d.tier;
        if (prev == null || prev === d.tier) return; /* first reading after launch or no real change: stay quiet */
        clearTimeout(pend);
        pend = setTimeout(() => {
            if (!onToday() || Date.now() - lastSaid < 90000) return;
            lastSaid = Date.now(); say(now({ prevTier: prev }).text);
        }, 2500);
    });
    W.LowiMistyHints = Object.assign({}, core, { now, read, say: extra => { const h = now(extra); say(h.text); lastSaid = Date.now(); return h; }, lost: () => say(tr('lost', lang())) });
})(typeof window !== 'undefined' ? window : globalThis);
