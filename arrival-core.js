/* LOWiSPIKE arrival cards, pure core (Oct 15, 2026; body-universe depth layer).
   When your cell arrives in a body place (3D world region, cell ride, body journey) one card names the place,
   gives one short real fact about it and says how today's logged entries show up there.
   - Place ids follow the whole-world regions: blood gut liver pancreas muscle heart lung brain
     (aliases from other builds: hub -> blood, muscles -> muscle, lungs -> lung, display names in en/de/es).
   - Facts: two accurate ones per place, the day picks which (same card all day, the other one tomorrow).
   - Today line: built from LowiWorldHealth.dayParts(state, today) (the one shared reading of meals, water, Move, XP);
     kind wording, no shame, and an honest line when nothing is logged yet. A picture of your entries, not a measurement.
   No DOM. Tested in tests/arrival-cards.test.cjs. */
(function (root) {
    'use strict';
    const PLACES = {
        blood: { hue: '#e0475a', n: ['Bloodstream', 'Blutbahn', 'Torrente sangu\u00edneo'], f: [
            ['You have about 5 litres of blood, and it makes a full lap of your body in roughly a minute.', 'Du hast etwa 5 Liter Blut, und es dreht in rund einer Minute eine ganze Runde durch deinen K\u00f6rper.', 'Tienes unos 5 litros de sangre y da una vuelta completa a tu cuerpo en m\u00e1s o menos un minuto.'],
            ['A red blood cell lives about 120 days and carries oxygen on roughly 270 million haemoglobin molecules.', 'Ein rotes Blutk\u00f6rperchen lebt etwa 120 Tage und tr\u00e4gt Sauerstoff auf rund 270 Millionen H\u00e4moglobin-Molek\u00fclen.', 'Un gl\u00f3bulo rojo vive unos 120 d\u00edas y lleva ox\u00edgeno en unos 270 millones de mol\u00e9culas de hemoglobina.']] },
        gut: { hue: '#2ef8b6', n: ['Gut', 'Darm', 'Intestino'], f: [
            ['Trillions of microbes live in your gut and turn fibre into short-chain fatty acids that feed your gut wall.', 'Billionen Mikroben leben in deinem Darm und machen aus Ballaststoffen kurzkettige Fetts\u00e4uren, die deine Darmwand n\u00e4hren.', 'Billones de microbios viven en tu intestino y convierten la fibra en \u00e1cidos grasos de cadena corta que alimentan su pared.'],
            ['Your small intestine is about 6 metres long, folded into tiny villi that give it a huge surface.', 'Dein D\u00fcnndarm ist etwa 6 Meter lang und in winzige Zotten gefaltet, die ihm eine riesige Oberfl\u00e4che geben.', 'Tu intestino delgado mide unos 6 metros y est\u00e1 plegado en vellosidades que le dan una superficie enorme.']] },
        liver: { hue: '#e78631', n: ['Liver', 'Leber', 'H\u00edgado'], f: [
            ['Your liver stores sugar as glycogen and releases it between meals and overnight to keep your blood sugar steady.', 'Deine Leber speichert Zucker als Glykogen und gibt ihn zwischen den Mahlzeiten und nachts ab, damit dein Blutzucker stabil bleibt.', 'Tu h\u00edgado guarda az\u00facar como gluc\u00f3geno y lo libera entre comidas y de noche para mantener estable tu az\u00facar en sangre.'],
            ['Your liver does hundreds of jobs, from making bile for fat digestion to storing vitamins.', 'Deine Leber erledigt Hunderte Aufgaben, von Galle f\u00fcr die Fettverdauung bis zum Speichern von Vitaminen.', 'Tu h\u00edgado hace cientos de tareas, desde producir bilis para digerir grasas hasta guardar vitaminas.']] },
        pancreas: { hue: '#f8ea40', n: ['Pancreas', 'Bauchspeicheldr\u00fcse', 'P\u00e1ncreas'], f: [
            ['Tiny islands of cells in your pancreas, the islets of Langerhans, release insulin when your blood sugar rises.', 'Winzige Zellinseln in deiner Bauchspeicheldr\u00fcse, die Langerhans-Inseln, geben Insulin ab, wenn dein Blutzucker steigt.', 'Peque\u00f1as islas de c\u00e9lulas en tu p\u00e1ncreas, los islotes de Langerhans, liberan insulina cuando sube tu az\u00facar.'],
            ['Your pancreas also makes about 1.5 litres of digestive juice a day.', 'Deine Bauchspeicheldr\u00fcse bildet au\u00dferdem rund 1,5 Liter Verdauungssaft am Tag.', 'Tu p\u00e1ncreas tambi\u00e9n produce unos 1,5 litros de jugo digestivo al d\u00eda.']] },
        muscle: { hue: '#9feb25', n: ['Muscles', 'Muskeln', 'M\u00fasculos'], f: [
            ['After a meal, your muscles take up most of the sugar that insulin clears from your blood.', 'Nach einer Mahlzeit nehmen deine Muskeln den gr\u00f6\u00dften Teil des Zuckers auf, den Insulin aus dem Blut holt.', 'Despu\u00e9s de comer, tus m\u00fasculos absorben la mayor parte del az\u00facar que la insulina saca de tu sangre.'],
            ['Working muscles can pull sugar from your blood even without much insulin.', 'Arbeitende Muskeln ziehen Zucker aus dem Blut, sogar ohne viel Insulin.', 'Los m\u00fasculos en movimiento sacan az\u00facar de la sangre incluso sin mucha insulina.']] },
        heart: { hue: '#f14770', n: ['Heart', 'Herz', 'Coraz\u00f3n'], f: [
            ['Your heart beats about 100,000 times a day.', 'Dein Herz schl\u00e4gt etwa 100.000 Mal am Tag.', 'Tu coraz\u00f3n late unas 100.000 veces al d\u00eda.'],
            ['Each beat pushes out about 70 ml of blood, around 5 litres a minute at rest.', 'Jeder Schlag pumpt etwa 70 ml Blut, in Ruhe rund 5 Liter pro Minute.', 'Cada latido impulsa unos 70 ml de sangre, unos 5 litros por minuto en reposo.']] },
        lung: { hue: '#a8e0ff', n: ['Lungs', 'Lunge', 'Pulmones'], f: [
            ['Your lungs hold hundreds of millions of tiny air sacs, the alveoli, where oxygen slips into your blood.', 'Deine Lunge hat Hunderte Millionen winzige Bl\u00e4schen, die Alveolen, in denen Sauerstoff ins Blut \u00fcbergeht.', 'Tus pulmones tienen cientos de millones de alv\u00e9olos, donde el ox\u00edgeno pasa a tu sangre.'],
            ['Spread flat, the inner surface of your lungs would cover about 70 square metres.', 'Ausgebreitet w\u00e4re die Innenfl\u00e4che deiner Lunge etwa 70 Quadratmeter gro\u00df.', 'Extendida, la superficie interna de tus pulmones cubrir\u00eda unos 70 metros cuadrados.']] },
        brain: { hue: '#1cf7f9', n: ['Brain', 'Gehirn', 'Cerebro'], f: [
            ['Your brain is about 2% of your body weight but uses around 20% of your energy, mostly from glucose.', 'Dein Gehirn macht etwa 2 % deines Gewichts aus, verbraucht aber rund 20 % deiner Energie, vor allem Glukose.', 'Tu cerebro es un 2 % de tu peso, pero usa alrededor del 20 % de tu energ\u00eda, sobre todo glucosa.'],
            ['Your brain has about 86 billion nerve cells.', 'Dein Gehirn hat etwa 86 Milliarden Nervenzellen.', 'Tu cerebro tiene unos 86 mil millones de neuronas.']] }
    };
    const IDS = Object.keys(PLACES);
    const ALIAS = { hub: 'blood', bloodstream: 'blood', muscles: 'muscle', lungs: 'lung', microbiome: 'gut' };
    /* extra display names other builds send (body journeys send the place name, not the id) */
    const NAMES = { 'gut & microbiome': 'gut', 'darm & mikrobiom': 'gut', 'intestino y microbiota': 'gut' };
    const fold = s => String(s == null ? '' : s).trim().toLowerCase();
    function pid(x) {
        if (x && typeof x === 'object') x = x.place || x.id;
        const k = fold(x); if (!k) return null;
        if (PLACES[k]) return k;
        if (ALIAS[k]) return ALIAS[k];
        if (NAMES[k]) return NAMES[k];
        for (const id of IDS) if (PLACES[id].n.some(n => fold(n) === k)) return id;
        return null;
    }
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const dayNo = t => { const d = new Date(t); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
    const li3 = li => (li === 0 || li === 1 || li === 2) ? li : ({ en: 0, de: 1, es: 2 }[String(li || '').slice(0, 2)] ?? 1);

    /* today's counts from the shared world-health reading (wh = LowiWorldHealth api, injected for tests) */
    function today(state, now, wh) {
        now = +now || Date.now();
        let p = null;
        try { if (wh && wh.dayParts) p = wh.dayParts(state || {}, dayKey(now)); } catch (e) { p = null; }
        if (!p) return { any: false, meals: 0, spikes: 0, good: 0, water: 0, move: false, xp: 0 };
        return { any: true, meals: p.meals | 0, spikes: p.spikes | 0, good: p.good | 0, water: Math.round((+p.water || 0) * 4), move: (+p.move || 0) > 0, xp: Math.round((+p.xp || 0) * 90) };
    }
    const plural = (n, one, many) => n === 1 ? one : many;
    /* one line per place, how today's entries show up there */
    function todayLine(id, t, li) {
        li = li3(li); id = pid(id) || 'blood'; t = t || { any: false };
        const s = t.spikes | 0, g = t.good | 0, m = t.meals | 0, w = t.water | 0;
        const L = (en, de, es) => [en, de, es][li];
        switch (id) {
            case 'blood':
                if (s) return L(s + ' spiky ' + plural(s, 'meal', 'meals') + ' today sent sugar waves through here, and your cell is clearing them.', s + ' ' + plural(s, 'Spike-Mahlzeit', 'Spike-Mahlzeiten') + ' heute haben Zuckerwellen hierher geschickt, deine Zelle r\u00e4umt sie weg.', s + ' ' + plural(s, 'comida con pico', 'comidas con pico') + ' hoy mandaron olas de az\u00facar aqu\u00ed, y tu c\u00e9lula las limpia.');
                if (g) return L('Your ' + g + ' low-spike ' + plural(g, 'meal', 'meals') + ' kept the stream calm and clear today.', 'Deine ' + g + ' Low-Spike-' + plural(g, 'Mahlzeit', 'Mahlzeiten') + ' halten den Strom heute ruhig und klar.', plural(g, 'Tu comida', 'Tus ' + g + ' comidas') + ' sin pico ' + plural(g, 'mantuvo', 'mantuvieron') + ' el torrente tranquilo y claro hoy.');
                if (m) return L(m + ' ' + plural(m, 'meal', 'meals') + ' logged today, and the stream runs steady.', m + ' ' + plural(m, 'Mahlzeit', 'Mahlzeiten') + ' heute eingetragen, der Strom flie\u00dft gleichm\u00e4\u00dfig.', m + ' ' + plural(m, 'comida anotada', 'comidas anotadas') + ' hoy, y el torrente fluye estable.');
                return L('Nothing logged yet today, so the stream runs on its calm baseline.', 'Heute noch nichts eingetragen, der Strom flie\u00dft im ruhigen Grundtempo.', 'Hoy a\u00fan no hay nada anotado, as\u00ed que el torrente va en calma.');
            case 'pancreas':
                if (s) return L(s + ' spiky ' + plural(s, 'meal', 'meals') + ' today meant extra insulin bursts from here.', s + ' ' + plural(s, 'Spike-Mahlzeit', 'Spike-Mahlzeiten') + ' heute hie\u00dfen extra Insulin-St\u00f6\u00dfe von hier.', s + ' ' + plural(s, 'comida con pico', 'comidas con pico') + ' hoy pidieron r\u00e1fagas extra de insulina desde aqu\u00ed.');
                if (m) return L('Low-spike eating today, so insulin went out in gentle waves.', 'Heute Low-Spike gegessen, das Insulin kam in sanften Wellen.', 'Hoy comiste sin picos, as\u00ed que la insulina sali\u00f3 en olas suaves.');
                return L('No meals logged yet today, just a quiet trickle of insulin.', 'Heute noch keine Mahlzeit eingetragen, nur ein leises Rinnsal Insulin.', 'Hoy a\u00fan no hay comidas anotadas, solo un hilo tranquilo de insulina.');
            case 'liver':
                if (s) return L('After today\'s spike it is packing the extra sugar away as glycogen.', 'Nach dem Spike heute packt sie den Extra-Zucker als Glykogen weg.', 'Tras el pico de hoy est\u00e1 guardando el az\u00facar extra como gluc\u00f3geno.');
                if (m) return L('It is topping up its glycogen from today\'s ' + m + ' ' + plural(m, 'meal', 'meals') + '.', 'Sie f\u00fcllt ihr Glykogen aus deinen ' + m + ' ' + plural(m, 'Mahlzeit', 'Mahlzeiten') + ' von heute auf.', 'Est\u00e1 rellenando su gluc\u00f3geno con ' + plural(m, 'tu comida', 'tus ' + m + ' comidas') + ' de hoy.');
                return L('No meals logged yet today, so it releases stored sugar to keep you steady.', 'Heute noch keine Mahlzeit eingetragen, sie gibt gespeicherten Zucker ab und h\u00e4lt dich stabil.', 'Hoy a\u00fan no hay comidas, as\u00ed que libera az\u00facar guardado para mantenerte estable.');
            case 'gut':
                if (g) return L(g + ' low-spike ' + plural(g, 'meal', 'meals') + ' today, and the fibre is a feast for your microbes.', g + ' Low-Spike-' + plural(g, 'Mahlzeit', 'Mahlzeiten') + ' heute, die Ballaststoffe sind ein Festmahl f\u00fcr deine Mikroben.', g + ' ' + plural(g, 'comida', 'comidas') + ' sin pico hoy, y la fibra es un fest\u00edn para tus microbios.');
                if (m) return L(m + ' ' + plural(m, 'meal', 'meals') + ' logged today. A bit more fibre would feed your microbes.', m + ' ' + plural(m, 'Mahlzeit', 'Mahlzeiten') + ' heute eingetragen. Etwas mehr Ballaststoffe w\u00fcrden deine Mikroben f\u00fcttern.', m + ' ' + plural(m, 'comida anotada', 'comidas anotadas') + ' hoy. Algo m\u00e1s de fibra alimentar\u00eda a tus microbios.');
                return L('Nothing logged yet today, and your microbes are waiting for fibre.', 'Heute noch nichts eingetragen, deine Mikroben warten auf Ballaststoffe.', 'Hoy a\u00fan no hay nada anotado, y tus microbios esperan fibra.');
            case 'muscle':
                if (t.move) return L('Your Move today opened the sugar doors in your muscles.', 'Deine Bewegung heute hat die Zuckert\u00fcren in deinen Muskeln ge\u00f6ffnet.', 'Tu movimiento de hoy abri\u00f3 las puertas del az\u00facar en tus m\u00fasculos.');
                return L('No Move logged yet today. A short walk opens their sugar doors.', 'Heute noch keine Bewegung eingetragen. Ein kurzer Spaziergang \u00f6ffnet ihre Zuckert\u00fcren.', 'Hoy a\u00fan no hay movimiento anotado. Un paseo corto abre sus puertas del az\u00facar.');
            case 'heart':
                if (t.move) return L('Your Move today got it pumping stronger for a while.', 'Deine Bewegung heute hat es eine Weile kr\u00e4ftiger pumpen lassen.', 'Tu movimiento de hoy lo hizo latir con m\u00e1s fuerza un rato.');
                return L('A calm beat today. A brisk walk would give it a good workout.', 'Heute ein ruhiger Schlag. Ein flotter Spaziergang w\u00e4re gutes Training.', 'Hoy late tranquilo. Un paseo a buen ritmo ser\u00eda un buen entrenamiento.');
            case 'lung':
                if (t.move) return L('Your Move today pulled in extra oxygen here.', 'Deine Bewegung heute hat hier extra Sauerstoff hereingeholt.', 'Tu movimiento de hoy trajo ox\u00edgeno extra aqu\u00ed.');
                return L('Steady breathing today. A brisk walk makes it breathe deeper.', 'Heute ruhiges Atmen. Ein flotter Spaziergang l\u00e4sst sie tiefer atmen.', 'Hoy respiras tranquilo. Un paseo a buen ritmo te hace respirar m\u00e1s hondo.');
            case 'brain':
                if (w >= 4) return L('4 or more glasses of water logged today, so it stays well supplied.', 'Heute 4 oder mehr Gl\u00e4ser Wasser eingetragen, es ist gut versorgt.', 'Hoy anotaste 4 vasos de agua o m\u00e1s, as\u00ed que est\u00e1 bien abastecido.');
                if (s) return L('After today\'s sugar spike, focus can dip for a while.', 'Nach dem Zucker-Spike heute kann die Konzentration eine Weile sinken.', 'Tras el pico de az\u00facar de hoy, la concentraci\u00f3n puede bajar un rato.');
                if (w) return L(w + ' ' + plural(w, 'glass', 'glasses') + ' of water so far today. A bit more helps your focus.', 'Heute bisher ' + w + ' ' + plural(w, 'Glas', 'Gl\u00e4ser') + ' Wasser. Etwas mehr hilft deiner Konzentration.', 'Hoy llevas ' + w + ' ' + plural(w, 'vaso', 'vasos') + ' de agua. Un poco m\u00e1s ayuda a tu concentraci\u00f3n.');
                return L('No water logged yet today. A glass helps your focus.', 'Heute noch kein Wasser eingetragen. Ein Glas hilft deiner Konzentration.', 'Hoy a\u00fan no hay agua anotada. Un vaso ayuda a tu concentraci\u00f3n.');
        }
        return '';
    }
    const COPY = {
        over: ['You arrived', 'Angekommen', 'Has llegado'], fact: ['Did you know?', 'Wusstest du?', '\u00bfSab\u00edas que?'],
        today: ['Today here', 'Heute hier', 'Hoy aqu\u00ed'], close: ['Close', 'Schlie\u00dfen', 'Cerrar'],
        note: ['A picture of your entries, not a measurement.', 'Ein Bild deiner Eintr\u00e4ge, keine Messung.', 'Una imagen de tus registros, no una medici\u00f3n.']
    };
    const tr = (k, li) => (COPY[k] || [k])[li3(li)];
    function fact(id, now, li) { const p = PLACES[pid(id) || 'blood']; const f = p.f[((dayNo(+now || Date.now()) % p.f.length) + p.f.length) % p.f.length]; return f[li3(li)]; }
    /* everything a card shows */
    function card(id, state, now, li, wh) {
        id = pid(id); if (!id) return null; li = li3(li); now = +now || Date.now();
        const p = PLACES[id], t = today(state, now, wh);
        return { id, hue: p.hue, name: p.n[li], over: tr('over', li), factLabel: tr('fact', li), fact: fact(id, now, li), todayLabel: tr('today', li), today: todayLine(id, t, li), counts: t, note: tr('note', li), close: tr('close', li) };
    }
    const api = { PLACES, IDS, pid, dayKey, today, todayLine, fact, card, tr, COPY };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.LowiArrivalCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
