/* LOWiSPIKE body journeys (Oct 15, 2026): Finch-style adventures for the living cell, set inside the human body.
   Adventure bar on Home (#btBar, under the sun row): the cell is out exploring one body place, a countdown, progress dots,
   and a ? surprise at the end (a body fact card + a small XP reward, ledger eventId body-trip:<day>:<n>).
   "Körperreisen" sheet: Finch-style tickets, one per place, with an illustrated inside-the-body scene, a name and
   "Noch nie besucht!" / "16 % erkundet". Explored % grows with what the user really does:
   fiber meal -> gut, sugary meal / high spike verdict -> pancreas + bloodstream (the scene shows the spike),
   Move -> muscles + heart + lungs, fasting hours -> liver (+ brain on long fasts), water -> bloodstream, scan -> pancreas + brain.
   State lives in S.body (account data, synced with the rest). Pure model at the top is tested in tests/body-trips.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;
    if (W.LowiBodyTrips) return;
    const TRIP_MS = 30 * 60000, TRIPS_PER_DAY = 3, DAY_CAP = 30, TRIP_GAIN = 10, XP = 5, DOTS = 8;
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

    /* ---------- places + facts (en, de, es). Facts are short, general physiology, no health claims. ---------- */
    const PLACES = [
        { id: 'blood', hue: 354, n: ['Bloodstream', 'Blutbahn', 'Torrente sanguíneo'], sub: ['Your cell’s home', 'Zuhause deiner Zelle', 'El hogar de tu célula'],
          how: ['Every meal and glass of water', 'Jede Mahlzeit und jedes Glas Wasser', 'Cada comida y cada vaso de agua'],
          f: [['An adult has about 5 litres of blood, yet only about 4 to 5 grams of sugar float in it: roughly one teaspoon.', 'Ein Erwachsener hat etwa 5 Liter Blut, darin schwimmen aber nur rund 4 bis 5 Gramm Zucker: ungefähr ein Teelöffel.', 'Un adulto tiene unos 5 litros de sangre, pero en ella solo flotan unos 4 o 5 gramos de azúcar: más o menos una cucharadita.'],
              ['Red blood cells are flat discs with a dip in the middle. Each one lives about 120 days.', 'Rote Blutkörperchen sind flache Scheiben mit einer Delle in der Mitte. Jedes lebt etwa 120 Tage.', 'Los glóbulos rojos son discos planos con un hueco en el centro. Cada uno vive unos 120 días.'],
              ['After a meal blood sugar rises, and in healthy people it is usually close to where it started 2 to 3 hours later.', 'Nach dem Essen steigt der Blutzucker. Bei Gesunden ist er meist 2 bis 3 Stunden später wieder nahe am Ausgangswert.', 'Después de comer sube el azúcar en sangre, y en personas sanas suele volver cerca del inicio en 2 o 3 horas.'],
              ['HbA1c measures sugar stuck to red blood cells, so it looks back over roughly the last 2 to 3 months.', 'Der HbA1c-Wert misst Zucker, der an roten Blutkörperchen klebt. Er blickt so etwa 2 bis 3 Monate zurück.', 'La HbA1c mide el azúcar pegado a los glóbulos rojos, así que refleja más o menos los últimos 2 o 3 meses.']] },
        { id: 'gut', hue: 160, n: ['Gut & microbiome', 'Darm & Mikrobiom', 'Intestino y microbiota'], sub: ['Villi and trillions of bacteria', 'Zotten und Billionen Bakterien', 'Vellosidades y billones de bacterias'],
          how: ['Log a meal with fiber', 'Logg eine Mahlzeit mit Ballaststoffen', 'Registra una comida con fibra'],
          f: [['Your small intestine is covered in millions of tiny finger-like villi. They make the surface huge so nutrients can reach the blood.', 'Dein Dünndarm ist mit Millionen winziger Zotten bedeckt. Sie machen die Oberfläche riesig, damit Nährstoffe ins Blut gelangen.', 'Tu intestino delgado está cubierto de millones de vellosidades diminutas. Agrandan muchísimo la superficie para que los nutrientes pasen a la sangre.'],
              ['Trillions of bacteria live in your large intestine, roughly as many as your body has cells of its own.', 'In deinem Dickdarm leben Billionen Bakterien, ungefähr so viele, wie dein Körper eigene Zellen hat.', 'En tu intestino grueso viven billones de bacterias, más o menos tantas como células propias tiene tu cuerpo.'],
              ['Fiber is food for gut bacteria. They turn it into short-chain fatty acids like butyrate, which feeds the gut wall.', 'Ballaststoffe sind Futter für Darmbakterien. Sie machen daraus kurzkettige Fettsäuren wie Butyrat, das die Darmwand nährt.', 'La fibra es alimento para las bacterias. La convierten en ácidos grasos de cadena corta como el butirato, que nutre la pared intestinal.'],
              ['Fiber slows down how fast sugar from a meal reaches the blood, so the curve after eating gets flatter.', 'Ballaststoffe bremsen, wie schnell Zucker aus dem Essen ins Blut geht. Die Kurve nach dem Essen wird flacher.', 'La fibra frena la velocidad con la que el azúcar llega a la sangre, así que la curva después de comer es más plana.']] },
        { id: 'liver', hue: 28, n: ['Liver', 'Leber', 'Hígado'], sub: ['Your sugar store', 'Dein Zuckerspeicher', 'Tu almacén de azúcar'],
          how: ['Fast: every 4 hours count', 'Fasten: alle 4 Stunden zählen', 'Ayuna: cada 4 horas cuentan'],
          f: [['The liver stores sugar as glycogen, about 100 grams in an adult.', 'Die Leber speichert Zucker als Glykogen, bei Erwachsenen etwa 100 Gramm.', 'El hígado guarda azúcar como glucógeno, unos 100 gramos en un adulto.'],
              ['While you fast, the liver releases stored sugar bit by bit and keeps your blood sugar steady.', 'Während du fastest, gibt die Leber gespeicherten Zucker nach und nach ab und hält deinen Blutzucker stabil.', 'Mientras ayunas, el hígado libera poco a poco el azúcar guardado y mantiene estable tu azúcar en sangre.'],
              ['After about a day without food its glycogen is mostly used up, and the liver makes more ketones from fat.', 'Nach etwa einem Tag ohne Essen ist das Glykogen weitgehend aufgebraucht, und die Leber bildet mehr Ketone aus Fett.', 'Tras más o menos un día sin comer, el glucógeno casi se ha agotado y el hígado produce más cetonas a partir de grasa.'],
              ['Inside, the liver is built from tiny six-sided lobules, each with a vein in the middle.', 'Innen besteht die Leber aus winzigen sechseckigen Läppchen, jedes mit einer Vene in der Mitte.', 'Por dentro, el hígado está hecho de lobulillos diminutos de seis lados, cada uno con una vena en el centro.']] },
        { id: 'pancreas', hue: 54, n: ['Pancreas', 'Bauchspeicheldrüse', 'Páncreas'], sub: ['Where insulin is made', 'Hier entsteht Insulin', 'Aquí se fabrica la insulina'],
          how: ['Sweet meals and scans show the spike', 'Süßes und Scans zeigen den Spike', 'Lo dulce y los escaneos muestran el pico'],
          f: [['Your pancreas holds about a million tiny cell clusters: the islets of Langerhans.', 'In deiner Bauchspeicheldrüse liegen etwa eine Million kleiner Zellgruppen: die Langerhans-Inseln.', 'Tu páncreas tiene alrededor de un millón de grupitos de células: los islotes de Langerhans.'],
              ['Beta cells in the islets sense rising blood sugar and release insulin within minutes.', 'Beta-Zellen in den Inseln spüren steigenden Blutzucker und schütten innerhalb von Minuten Insulin aus.', 'Las células beta de los islotes notan que sube el azúcar y liberan insulina en cuestión de minutos.'],
              ['Insulin works like a key: it helps muscle, fat and liver cells take sugar out of the blood.', 'Insulin wirkt wie ein Schlüssel: Es hilft Muskel-, Fett- und Leberzellen, Zucker aus dem Blut aufzunehmen.', 'La insulina funciona como una llave: ayuda a las células del músculo, la grasa y el hígado a sacar azúcar de la sangre.'],
              ['Alpha cells make the opposite signal, glucagon. It tells the liver to release sugar when levels drop.', 'Alpha-Zellen machen das Gegensignal, Glukagon. Es sagt der Leber, Zucker freizugeben, wenn der Spiegel sinkt.', 'Las células alfa fabrican la señal contraria, el glucagón. Le dice al hígado que libere azúcar cuando el nivel baja.']] },
        { id: 'muscle', hue: 84, n: ['Muscles', 'Muskeln', 'Músculos'], sub: ['The big sugar sponge', 'Der große Zuckerschwamm', 'La gran esponja de azúcar'],
          how: ['Move: a workout, a walk, steps', 'Bewegung: Training, Spaziergang, Schritte', 'Movimiento: entreno, paseo, pasos'],
          f: [['After a meal, your muscles take up a large share of the sugar in your blood.', 'Nach dem Essen nehmen deine Muskeln einen großen Teil des Zuckers aus dem Blut auf.', 'Después de comer, tus músculos absorben una gran parte del azúcar de la sangre.'],
              ['When you move, muscles pull sugar inside even without insulin, through doors called GLUT4.', 'Wenn du dich bewegst, holen Muskeln Zucker auch ohne Insulin herein, durch Türen namens GLUT4.', 'Cuando te mueves, los músculos meten azúcar incluso sin insulina, por unas puertas llamadas GLUT4.'],
              ['All your muscles together store about 400 grams of glycogen, more than the liver.', 'Alle Muskeln zusammen speichern etwa 400 Gramm Glykogen, mehr als die Leber.', 'Todos tus músculos juntos guardan unos 400 gramos de glucógeno, más que el hígado.'],
              ['A short walk after eating can make the sugar rise after a meal flatter.', 'Ein kurzer Spaziergang nach dem Essen kann den Zuckeranstieg danach flacher machen.', 'Un paseo corto después de comer puede hacer más plana la subida de azúcar.']] },
        { id: 'heart', hue: 348, n: ['Heart', 'Herz', 'Corazón'], sub: ['The pump in the middle', 'Die Pumpe in der Mitte', 'La bomba del centro'],
          how: ['Move: anything that gets your pulse up', 'Bewegung: alles, was den Puls hebt', 'Movimiento: todo lo que sube el pulso'],
          f: [['Your heart beats about 100,000 times a day.', 'Dein Herz schlägt etwa 100.000 Mal am Tag.', 'Tu corazón late unas 100.000 veces al día.'],
              ['All your blood vessels together, the tiniest included, are often estimated at around 100,000 km long.', 'Alle deine Blutgefäße zusammen, die winzigsten mitgezählt, werden auf rund 100.000 km Länge geschätzt.', 'Todos tus vasos sanguíneos juntos, los más finos incluidos, se calculan en unos 100.000 km.'],
              ['Heart muscle cells branch and are linked by special contact points, so they beat together in one rhythm.', 'Herzmuskelzellen sind verzweigt und über besondere Kontaktstellen verbunden, damit sie gemeinsam im Takt schlagen.', 'Las células del músculo cardíaco se ramifican y se unen por puntos de contacto especiales, para latir juntas al mismo ritmo.'],
              ['Regular exercise often lowers the resting pulse: the heart gets more done per beat.', 'Regelmäßige Bewegung senkt oft den Ruhepuls: Das Herz schafft mehr pro Schlag.', 'El ejercicio regular suele bajar el pulso en reposo: el corazón hace más en cada latido.']] },
        { id: 'lung', hue: 205, n: ['Lungs', 'Lunge', 'Pulmones'], sub: ['Millions of tiny air bubbles', 'Millionen winziger Luftbläschen', 'Millones de burbujas de aire'],
          how: ['Move and breathe deeper', 'Beweg dich und atme tiefer', 'Muévete y respira más hondo'],
          f: [['Your lungs hold hundreds of millions of tiny air sacs called alveoli.', 'Deine Lunge hat Hunderte Millionen winziger Lungenbläschen, die Alveolen.', 'Tus pulmones tienen cientos de millones de sacos de aire diminutos, los alvéolos.'],
              ['Spread out, their inner surface is roughly 70 square metres, about the size of a small flat.', 'Ausgebreitet ist ihre Innenfläche etwa 70 Quadratmeter groß, ungefähr wie eine kleine Wohnung.', 'Extendida, su superficie interior mide unos 70 metros cuadrados, como un piso pequeño.'],
              ['Oxygen crosses into the blood through a wall only about a thousandth of a millimetre thin.', 'Sauerstoff wandert durch eine Wand ins Blut, die nur etwa ein Tausendstel Millimeter dünn ist.', 'El oxígeno pasa a la sangre a través de una pared de apenas una milésima de milímetro.'],
              ['When you move you breathe faster and deeper, so more oxygen reaches your muscles.', 'Wenn du dich bewegst, atmest du schneller und tiefer, damit mehr Sauerstoff zu deinen Muskeln kommt.', 'Al moverte respiras más rápido y más hondo, para que llegue más oxígeno a tus músculos.']] },
        { id: 'brain', hue: 181, n: ['Brain', 'Gehirn', 'Cerebro'], sub: ['The hungriest organ', 'Das hungrigste Organ', 'El órgano más hambriento'],
          how: ['Scan and learn, long fasts', 'Scannen und lernen, lange Fasten', 'Escanea y aprende, ayunos largos'],
          f: [['Your brain is about 2 % of your body weight but uses around 20 % of its energy.', 'Dein Gehirn macht etwa 2 % deines Körpergewichts aus, verbraucht aber rund 20 % der Energie.', 'Tu cerebro es un 2 % de tu peso, pero usa alrededor del 20 % de la energía.'],
              ['In a day your brain uses about 120 grams of sugar.', 'An einem Tag verbraucht dein Gehirn etwa 120 Gramm Zucker.', 'En un día tu cerebro usa unos 120 gramos de azúcar.'],
              ['About 86 billion nerve cells are linked by trillions of synapses.', 'Rund 86 Milliarden Nervenzellen sind über Billionen Synapsen verbunden.', 'Unos 86.000 millones de neuronas se conectan por billones de sinapsis.'],
              ['During a longer fast, the brain can get part of its energy from ketones.', 'Bei längerem Fasten kann das Gehirn einen Teil seiner Energie aus Ketonen holen.', 'En un ayuno largo, el cerebro puede sacar parte de su energía de las cetonas.']] }
    ];
    const byId = id => PLACES.find(p => p.id === id) || null;

    /* ---------- pure model ---------- */
    const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(+v)) ? null : +v;
    function mealGains(m) {
        m = m || {};
        const mac = m.macros || m, fiber = num(mac.fiber), sugar = num(mac.sugar), protein = num(mac.protein), g = { blood: 5 };
        if (fiber !== null && fiber >= 4) g.gut = 10;
        if ((sugar !== null && sugar >= 15) || m.lvl === 'high') { g.pancreas = 10; g.blood = 8; }
        else if (m.lvl === 'low' && fiber === null) g.gut = 4;
        if (protein !== null && protein >= 20) g.muscle = 4;
        return g;
    }
    function kindOf(e) {
        if (!e) return '';
        const src = String(e.src || ''), txt = (src + ' ' + (e.label || '')).toLowerCase();
        if (/^body-trip|^sun-full|^meal|^macro-goal/.test(src)) return '';
        if (/scan|capture|product|dex/.test(txt)) return 'scan';
        if (/water|wasser|agua|hydrat/.test(txt)) return 'water';
        if (/move|walk|workout|steps|dance|yoga|stretch|schritte|training/.test(txt)) return 'move';
        if (/fast/.test(txt)) return 'fast';
        return '';
    }
    const KIND_GAINS = { move: { muscle: 10, heart: 6, lung: 6 }, water: { blood: 4 }, scan: { pancreas: 4, brain: 4 }, fast: { liver: 6, brain: 2 } };
    const entryGains = e => (e && +e.amt > 0 && KIND_GAINS[kindOf(e)]) ? Object.assign({}, KIND_GAINS[kindOf(e)]) : {};
    /* every 4 fasted hours explore the liver; from 16 h the brain joins in (ketones) */
    function fastGains(hours, already) {
        const blocks = Math.max(0, Math.floor((+hours || 0) / 4)), add = Math.max(0, blocks - (+already || 0));
        if (!add) return { blocks, g: {} };
        const g = { liver: 8 * add };
        let brain = 0;
        for (let b = (+already || 0) + 1; b <= blocks; b++) if (b >= 4) brain += 4;
        if (brain) g.brain = brain;
        return { blocks, g };
    }
    function fresh(st) {
        st = st && typeof st === 'object' ? st : {};
        st.p = st.p && typeof st.p === 'object' ? st.p : {};
        PLACES.forEach(pl => { const x = st.p[pl.id]; st.p[pl.id] = x && typeof x === 'object' ? x : { x: 0, seen: 0, day: '', dx: 0, v: 0 }; });
        st.trips = st.trips && typeof st.trips === 'object' ? st.trips : {};
        st.recent = st.recent && typeof st.recent === 'object' ? st.recent : {};
        st.fast = st.fast && typeof st.fast === 'object' ? st.fast : {};
        return st;
    }
    /* adds explored %, max DAY_CAP per place per local day from actions, never past 100 */
    function apply(st, gains, now, trip) {
        st = fresh(st);
        const key = dayKey(now || Date.now()), out = {};
        for (const [id, raw] of Object.entries(gains || {})) {
            const p = st.p[id];
            if (!p || !(+raw > 0)) continue;
            if (p.day !== key) { p.day = key; p.dx = 0; }
            const room = trip ? 100 - p.x : Math.min(100 - p.x, DAY_CAP - p.dx);
            const add = Math.max(0, Math.min(+raw, room));
            if (!add) continue;
            p.x = Math.round((p.x + add) * 10) / 10;
            if (!trip) p.dx += add;
            out[id] = add;
        }
        return out;
    }
    const unlocked = x => x > 0 ? Math.min(4, 1 + Math.floor(x / 25)) : 0;
    const tripsOn = (st, key) => Object.values(fresh(st).trips).filter(t => t && t.day === key).length;
    function current(st) {
        const t = fresh(st).trips;
        return Object.keys(t).sort().map(k => Object.assign({ id: k }, t[k])).filter(x => !x.got).pop() || null;
    }
    function canStart(st, now) {
        return !current(st) && tripsOn(st, dayKey(now)) < TRIPS_PER_DAY;
    }
    function start(st, place, now) {
        st = fresh(st);
        if (!byId(place) || !canStart(st, now)) return null;
        const key = dayKey(now), n = tripsOn(st, key) + 1, id = key + ':' + n;
        st.trips[id] = { day: key, n, place, start: now, back: now + TRIP_MS, got: false };
        const ids = Object.keys(st.trips).sort();
        while (ids.length > 30) delete st.trips[ids.shift()];
        return Object.assign({ id }, st.trips[id]);
    }
    function view(st, now) {
        st = fresh(st);
        const t = current(st), visited = PLACES.filter(p => st.p[p.id].x > 0 || st.p[p.id].v > 0).length;
        if (!t) return { status: 'idle', visited, left: TRIPS_PER_DAY - tripsOn(st, dayKey(now)) };
        const ratio = Math.max(0, Math.min(1, (now - t.start) / Math.max(1, t.back - t.start)));
        return { status: now >= t.back ? 'back' : 'away', trip: t, ratio, dots: Math.min(DOTS, Math.floor(ratio * DOTS)), leftMs: Math.max(0, t.back - now), visited };
    }
    /* the surprise: explored +TRIP_GAIN, the next unseen fact (or a known one again), marks the trip collected */
    function claim(st, now) {
        st = fresh(st);
        const t = current(st);
        if (!t || now < t.back) return null;
        const p = st.p[t.place];
        apply(st, { [t.place]: TRIP_GAIN }, now, true);
        p.v = (+p.v || 0) + 1;
        const avail = unlocked(p.x);
        /* never repeat a fact: once everything unlocked here is learned, the trip says so and points at the next unlock.
           Oct 17 (E-man): showing the fact does not learn it. It joins the facts list only through learn(), after the
           deliberate "Into the collection" tap; closed unread, the same fact comes back on the next trip here. */
        let fact = -1, isNew = false;
        if (p.seen < avail) { fact = p.seen; isNew = true; }
        st.trips[t.id].got = true;
        st.trips[t.id].fact = fact;
        const n = unlocked(p.x), nextAt = n < 4 ? (n === 0 ? 1 : n * 25) : 0;
        return { id: t.id, place: t.place, fact, isNew, learned: fact < 0, nextAt, x: p.x, eventId: 'body-trip:' + t.id };
    }
    /* which place a set of gains sends the cell to: the biggest gain, ties go to the order of PLACES */
    /* the deliberate tap: the shown fact joins this place's learned list (in order, never twice) */
    function learn(st, place, fact) {
        st = fresh(st);
        const p = st.p[place]; fact = +fact;
        if (!p || !(fact >= 0) || fact !== p.seen || fact >= unlocked(p.x)) return false;
        p.seen = fact + 1; return true;
    }
    function destination(g) {
        let best = null;
        for (const p of PLACES) if ((+g[p.id] || 0) > 0 && (!best || g[p.id] > g[best])) best = p.id;
        return best;
    }
    function fmtLeft(ms) {
        const s = Math.max(1, Math.ceil(Math.max(0, +ms || 0) / 1000)), m = Math.floor(s / 60);
        return Math.floor(m / 60) + ':' + pad(m % 60) + ':' + pad(s % 60);
    }
    /* Oct 16 (E-man): "it doesn't tell me when the next journey is going to start, and I can't click 'start next journey'".
       next() says what comes after a journey: 'away'/'back' while one runs, 'ready' (with the place a tap on
       "Start next journey" sends Misty to: the least explored one, the bloodstream last since every trip passes it),
       'tired' (no energy yet, see tooTired) or 'tomorrow' (today's 3 are used; inMs = time to local midnight). */
    function msToMidnight(now) {
        const d = new Date(now), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
        return Math.max(0, m.getTime() - now);
    }
    function suggest(st) {
        st = fresh(st);
        const order = PLACES.filter(p => p.id !== 'blood').concat(PLACES.filter(p => p.id === 'blood'));
        let best = null;
        for (const p of order) if (!best || (+st.p[p.id].x || 0) < (+st.p[best].x || 0)) best = p.id;
        return best;
    }
    function next(st, now, tired) {
        st = fresh(st);
        const v = view(st, now);
        if (v.status !== 'idle') return { kind: v.status, place: v.trip.place, leftMs: v.leftMs || 0 };
        if (v.left <= 0) return { kind: 'tomorrow', inMs: msToMidnight(now) };
        if (tired) return { kind: 'tired', left: v.left };
        return { kind: 'ready', left: v.left, place: suggest(st) };
    }
    function fmtHM(ms) {
        const m = Math.max(1, Math.ceil(Math.max(0, +ms || 0) / 60000));
        return Math.floor(m / 60) + ':' + pad(m % 60);
    }
    const core = { PLACES, TRIP_MS, TRIPS_PER_DAY, DAY_CAP, TRIP_GAIN, XP, DOTS, dayKey, mealGains, kindOf, entryGains, fastGains, fresh, apply, unlocked, current, canStart, start, view, claim, learn, destination, fmtLeft, fmtHM, msToMidnight, suggest, next, byId };

    /* ---------- scenes: science-class views of the inside, drawn see-through and glowing ---------- */
    let sid = 0;
    function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
    const f1 = v => Math.round(v * 10) / 10;
    function scene(id, o) {
        o = o || {};
        const pl = byId(id) || PLACES[0], h = pl.hue, u = 'bt' + (++sid), r = rnd(id.length * 97 + h), live = !!o.live;
        let g = '';
        const glu = (n, x0, x1, y0, y1, cls) => { let s = ''; for (let i = 0; i < n; i++) { const x = f1(x0 + r() * (x1 - x0)), y = f1(y0 + r() * (y1 - y0)), k = f1(1.6 + r() * 1.2); s += '<polygon class="bt-glu ' + (cls || '') + '" style="--d:' + f1(r() * 6) + 's" points="' + [0, 60, 120, 180, 240, 300].map(a => f1(x + k * Math.cos(a * Math.PI / 180)) + ',' + f1(y + k * Math.sin(a * Math.PI / 180))).join(' ') + '"/>'; } return s; };
        if (id === 'blood') {
            g += '<path class="bt-wall" d="M0 14 C40 6 80 22 160 10 L160 0 L0 0Z"/><path class="bt-wall" d="M0 88 C50 96 110 80 160 92 L160 100 L0 100Z"/>';
            g += '<g class="bt-flow">';
            for (let i = 0; i < 9; i++) { const x = f1(10 + i * 17 + r() * 6), y = f1(28 + r() * 46), a = Math.round(r() * 180), rx = 9 + r() * 2; g += '<g transform="translate(' + x + ' ' + y + ') rotate(' + a + ')"><ellipse class="bt-rbc" rx="' + f1(rx) + '" ry="' + f1(rx * .72) + '"/><ellipse class="bt-rbc-in" rx="' + f1(rx * .45) + '" ry="' + f1(rx * .28) + '"/></g>'; }
            g += '<circle class="bt-wbc" cx="118" cy="52" r="11"/><path class="bt-wbc-n" d="M112 50 q3 -5 6 0 q3 5 6 0"/>';
            g += glu(o.spike ? 26 : 9, 4, 156, 22, 80, o.spike ? 'hot' : '') + '</g>';
        } else if (id === 'gut') {
            for (let i = 0; i < 7; i++) { const x = 6 + i * 23, hh = 46 + r() * 16; g += '<path class="bt-villus" d="M' + x + ' 100 L' + x + ' ' + f1(100 - hh + 9) + ' Q' + f1(x + 9) + ' ' + f1(100 - hh - 7) + ' ' + f1(x + 18) + ' ' + f1(100 - hh + 9) + ' L' + f1(x + 18) + ' 100Z"/><path class="bt-cap" d="M' + f1(x + 6) + ' 100 L' + f1(x + 6) + ' ' + f1(100 - hh + 12) + ' Q' + f1(x + 9) + ' ' + f1(100 - hh + 2) + ' ' + f1(x + 12) + ' ' + f1(100 - hh + 12) + ' L' + f1(x + 12) + ' 100"/>'; }
            g += '<g class="bt-flow">';
            const fed = !!o.fiber;
            for (let i = 0; i < (fed ? 16 : 10); i++) { const x = f1(8 + r() * 144), y = f1(8 + r() * 34), a = Math.round(r() * 180); g += i % 3 ? '<rect class="bt-bac' + (fed ? ' fed' : '') + '" x="' + f1(x - 4.5) + '" y="' + f1(y - 1.8) + '" width="9" height="3.6" rx="1.8" transform="rotate(' + a + ' ' + x + ' ' + y + ')"/>' : '<circle class="bt-bac b2' + (fed ? ' fed' : '') + '" cx="' + x + '" cy="' + y + '" r="2.4"/>'; }
            for (let i = 0; i < (fed ? 4 : 2); i++) { const y = f1(14 + r() * 26), x = f1(r() * 60); g += '<path class="bt-fiber" d="M' + x + ' ' + y + ' q12 -7 24 0 t24 0 t24 0"/>'; }
            g += '</g>';
        } else if (id === 'liver') {
            const hex = (cx, cy, R) => { let p = '', c = ''; for (let i = 0; i < 6; i++) { const a = (60 * i + 30) * Math.PI / 180, x = f1(cx + R * Math.cos(a)), y = f1(cy + R * Math.sin(a)); p += (i ? ' ' : '') + x + ',' + y; c += '<line class="bt-cord" x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '"/>'; } return '<polygon class="bt-lob" points="' + p + '"/>' + c + '<circle class="bt-cv" cx="' + cx + '" cy="' + cy + '" r="4.2"/>'; };
            [[34, 30], [80, 30], [126, 30], [57, 70], [103, 70], [149, 70], [11, 70]].forEach(([x, y]) => { g += hex(x, y, 24); });
            g += '<g class="bt-flow">';
            const n = o.fasting ? 6 : 16;
            for (let i = 0; i < n; i++) { const x = f1(8 + r() * 144), y = f1(10 + r() * 80); g += '<g class="bt-gly"><circle cx="' + x + '" cy="' + y + '" r="1.5"/><circle cx="' + f1(x + 2.4) + '" cy="' + f1(y + 1) + '" r="1.2"/><circle cx="' + f1(x + .8) + '" cy="' + f1(y + 2.6) + '" r="1.1"/></g>'; }
            if (o.fasting) g += glu(10, 20, 140, 20, 80, 'out');
            g += '</g>';
        } else if (id === 'pancreas') {
            for (let i = 0; i < 14; i++) { const x = f1(r() * 160), y = f1(r() * 100); g += '<circle class="bt-acin" cx="' + x + '" cy="' + y + '" r="' + f1(8 + r() * 5) + '"/>'; }
            g += '<ellipse class="bt-islet" cx="80" cy="52" rx="38" ry="30"/>';
            for (let i = 0; i < 22; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 26, x = f1(80 + Math.cos(a) * d * 1.25), y = f1(52 + Math.sin(a) * d), al = i % 5 === 0; g += '<circle class="bt-' + (al ? 'alpha' : 'beta') + (o.spike && !al ? ' on' : '') + '" cx="' + x + '" cy="' + y + '" r="4.4"/>'; }
            g += '<path class="bt-vessel" d="M0 92 C40 80 120 98 160 86"/>';
            g += '<g class="bt-flow">';
            const k = o.spike ? 14 : 4;
            for (let i = 0; i < k; i++) { const a = r() * Math.PI * 2, d = 32 + r() * 22, x = f1(80 + Math.cos(a) * d * 1.3), y = f1(52 + Math.sin(a) * d * .9); g += '<g class="bt-ins" style="--d:' + f1(r() * 4) + 's" transform="translate(' + x + ' ' + y + ')"><circle r="2.6"/><path d="M2 0 h5 M5 0 v2"/></g>'; }
            if (o.spike) g += glu(12, 4, 156, 70, 98, 'hot');
            g += '</g>';
        } else if (id === 'muscle') {
            for (let i = 0; i < 5; i++) {
                const y = 8 + i * 18;
                g += '<rect class="bt-fib" x="-6" y="' + y + '" width="172" height="15" rx="7.5"/>';
                for (let x = 4 + (i % 2) * 3; x < 160; x += 6) g += '<line class="bt-stri" x1="' + x + '" y1="' + (y + 2) + '" x2="' + x + '" y2="' + (y + 13) + '"/>';
                for (let j = 0; j < 3; j++) { const x = f1(18 + j * 52 + r() * 18); g += '<rect class="bt-door' + (o.moved ? ' on' : '') + '" x="' + x + '" y="' + f1(y - 1.2) + '" width="5" height="2.6" rx="1"/>'; }
            }
            g += '<g class="bt-flow">' + glu(o.moved ? 18 : 8, 4, 156, 4, 96, o.moved ? 'in' : '') + '</g>';
        } else if (id === 'heart') {
            g += '<path class="bt-heart" d="M80 88 C46 66 30 52 32 36 C34 22 50 16 62 22 C70 26 76 32 80 38 C84 32 90 26 98 22 C110 16 126 22 128 36 C130 52 114 66 80 88Z"/>';
            g += '<path class="bt-aorta" d="M76 30 C74 14 84 6 96 8 C106 10 108 18 106 24"/><path class="bt-aorta v" d="M66 26 C62 14 54 10 46 12"/>';
            g += '<path class="bt-septum" d="M80 40 C78 54 80 70 80 86"/><path class="bt-septum" d="M46 48 C60 52 100 52 116 48"/>';
            g += '<g class="bt-pulse"><path class="bt-ecg" d="M0 70 H18 l4 -8 l4 14 l5 -26 l5 30 l4 -10 H50"/><path class="bt-ecg" d="M110 70 H122 l4 -8 l4 14 l5 -26 l5 30 l4 -10 H160"/></g>';
            g += '<g class="bt-flow">';
            for (let i = 0; i < 7; i++) { const x = f1(46 + r() * 68), y = f1(32 + r() * 36); g += '<ellipse class="bt-rbc sm" cx="' + x + '" cy="' + y + '" rx="3.4" ry="2.4"/>'; }
            g += '</g>';
        } else if (id === 'lung') {
            g += '<path class="bt-bronch" d="M80 0 V26 M80 26 C70 34 52 36 40 46 M80 26 C90 34 108 36 120 46 M40 46 C34 54 26 58 20 66 M40 46 C44 56 50 60 56 68 M120 46 C114 56 108 60 104 68 M120 46 C126 54 134 58 140 66"/>';
            [[20, 74], [56, 76], [104, 76], [140, 74], [80, 62]].forEach(([cx, cy]) => {
                for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7, x = f1(cx + Math.cos(a) * 9), y = f1(cy + Math.sin(a) * 8); g += '<circle class="bt-alv" cx="' + x + '" cy="' + y + '" r="6.5"/>'; }
                g += '<circle class="bt-alv c" cx="' + cx + '" cy="' + cy + '" r="6"/>';
            });
            g += '<path class="bt-capnet" d="M4 90 C30 84 40 96 70 90 S120 84 156 92 M8 60 C20 56 30 66 46 62"/>';
            g += '<g class="bt-flow">';
            for (let i = 0; i < (o.moved ? 16 : 9); i++) { const x = f1(6 + r() * 148), y = f1(50 + r() * 46); g += '<circle class="bt-o2" style="--d:' + f1(r() * 5) + 's" cx="' + x + '" cy="' + y + '" r="1.4"/>'; }
            g += '</g>';
        } else if (id === 'brain') {
            const ns = [[34, 34], [96, 24], [130, 66], [62, 74]];
            ns.forEach(([x, y], i) => {
                for (let k = 0; k < 5; k++) { const a = r() * Math.PI * 2, l = 14 + r() * 12, mx = f1(x + Math.cos(a) * l * .55), my = f1(y + Math.sin(a) * l * .55), ex = f1(x + Math.cos(a) * l), ey = f1(y + Math.sin(a) * l); g += '<path class="bt-dend" d="M' + x + ' ' + y + ' L' + mx + ' ' + my + ' L' + ex + ' ' + ey + ' M' + mx + ' ' + my + ' l' + f1(Math.cos(a + .7) * 6) + ' ' + f1(Math.sin(a + .7) * 6) + '"/>'; }
                const nx = ns[(i + 1) % ns.length];
                g += '<path class="bt-axon" d="M' + x + ' ' + y + ' Q' + f1((x + nx[0]) / 2 + 10) + ' ' + f1((y + nx[1]) / 2 - 12) + ' ' + nx[0] + ' ' + nx[1] + '"/>';
            });
            ns.forEach(([x, y]) => { g += '<path class="bt-soma" d="M' + (x - 7) + ' ' + y + ' Q' + (x - 4) + ' ' + (y - 8) + ' ' + (x + 2) + ' ' + (y - 7) + ' Q' + (x + 8) + ' ' + (y - 3) + ' ' + (x + 7) + ' ' + (y + 3) + ' Q' + (x + 3) + ' ' + (y + 8) + ' ' + (x - 3) + ' ' + (y + 6) + ' Q' + (x - 8) + ' ' + (y + 4) + ' ' + (x - 7) + ' ' + y + 'Z"/><circle class="bt-nuc" cx="' + x + '" cy="' + y + '" r="2.4"/>'; });
            g += '<g class="bt-flow">';
            for (let i = 0; i < 6; i++) { const x = f1(10 + r() * 140), y = f1(10 + r() * 80); g += '<circle class="bt-spark" style="--d:' + f1(r() * 3) + 's" cx="' + x + '" cy="' + y + '" r="1.8"/>'; }
            g += glu(6, 6, 154, 6, 94, '') + '</g>';
        }
        return '<svg class="bt-scene' + (live ? ' live' : '') + '" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" style="--h:' + h + '" aria-hidden="true"><defs><radialGradient id="' + u + 'g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="hsl(' + h + ' 45% 24%)"/><stop offset=".55" stop-color="#1d2d58"/><stop offset="1" stop-color="#0d1636"/></radialGradient></defs><rect width="160" height="100" fill="url(#' + u + 'g)"/><g class="bt-art">' + g + '</g></svg>';
    }
    core.scene = scene;
    if (!D) {
        if (typeof module !== 'undefined' && module.exports) module.exports = core;
        return;
    }

    /* ---------- copy ---------- */
    const lang = () => { try { return (W.LowiLang.get() || 'de').slice(0, 2); } catch (e) { return ((D.documentElement.lang) || 'de').slice(0, 2); } };
    const L = () => ({ en: 0, de: 1, es: 2 }[lang()] ?? 1);
    const copy = {
        title: ['Body journeys', 'Körperreisen', 'Viajes por el cuerpo'],
        intro: ['Your cell travels through your body. What you do decides where it goes: fiber leads to the gut, Move to the muscles, fasting to the liver, sweet food to the pancreas.', 'Deine Zelle reist durch deinen Körper. Was du tust, bestimmt, wohin: Ballaststoffe führen in den Darm, Bewegung in die Muskeln, Fasten in die Leber, Süßes in die Bauchspeicheldrüse.', 'Tu célula viaja por tu cuerpo. Lo que haces decide adónde va: la fibra lleva al intestino, el Movimiento a los músculos, el ayuno al hígado y lo dulce al páncreas.'],
        away: ['Exploring', 'Unterwegs', 'Explorando'],
        backIn: ['back in', 'zurück in', 'vuelve en'],
        back: ['Back! Open your surprise', 'Zurück! Überraschung öffnen', '¡De vuelta! Abre tu sorpresa'],
        idle: ['Body journeys', 'Körperreisen', 'Viajes por el cuerpo'],
        places: ['places discovered', 'Orte entdeckt', 'lugares descubiertos'],
        pick: ['Pick a trip', 'Reise wählen', 'Elige un viaje'],
        doneToday: ['Back tomorrow', 'Morgen wieder', 'Mañana más'],
        nextGo: ['Start next journey', 'Nächste Reise starten', 'Empezar el próximo viaje'],
        nextTomorrow: ['Next journey tomorrow', 'Nächste Reise morgen', 'Próximo viaje mañana'],
        nextIn: ['in', 'in', 'en'],
        nextTired: ['Next journey: Misty needs energy', 'Nächste Reise: Misty braucht Energie', 'Próximo viaje: Misty necesita energía'],
        nextTo: ['to', 'nach', 'a'],
        never: ['Never visited!', 'Noch nie besucht!', '¡Nunca visitado!'],
        explored: ['explored', 'erkundet', 'explorado'],
        full: ['Fully explored', 'Ganz erkundet', 'Explorado del todo'],
        here: ['Your cell is here', 'Deine Zelle ist hier', 'Tu célula está aquí'],
        go: ['Travel here', 'Hinreisen', 'Viajar aquí'],
        busy: ['Your cell is already on a trip.', 'Deine Zelle ist schon unterwegs.', 'Tu célula ya está de viaje.'],
        tired: ['Misty is too tired to travel right now. A meal, a glass of water or a Move gives Misty energy.', 'Misty ist gerade zu müde zum Reisen. Eine Mahlzeit, ein Glas Wasser oder Bewegung gibt Misty Kraft.', 'Misty no tiene energía para viajar ahora. Una comida, un vaso de agua o moverte le da energía.'],
        limit: ['That was today’s 3 trips. Tomorrow your cell travels again.', 'Das waren heute 3 Reisen. Morgen reist deine Zelle wieder.', 'Ya van 3 viajes hoy. Mañana tu célula vuelve a viajar.'],
        how: ['How to explore it', 'So erkundest du es', 'Cómo explorarlo'],
        facts: ['What your cell found', 'Was deine Zelle entdeckt hat', 'Lo que encontró tu célula'],
        locked: ['Explore to', 'Erkunde bis', 'Explora hasta'],
        lockedT: ['for the next fact', 'für den nächsten Fakt', 'para el siguiente dato'],
        firstFact: ['The first visit brings the first fact.', 'Der erste Besuch bringt den ersten Fakt.', 'La primera visita trae el primer dato.'],
        surprise: ['Your cell is back from', 'Deine Zelle ist zurück aus:', 'Tu célula volvió de'],
        newFact: ['New discovery', 'Neu entdeckt', 'Nuevo hallazgo'],
        oldFact: ['Already learned', 'Schon gelernt', 'Ya aprendido'],
        learnedAll: ['Your cell already knows everything here for now. No repeats: the next fact unlocks at', 'Deine Zelle kennt hier schon alles, was es gerade gibt. Keine Wiederholung: der nächste Fakt kommt bei', 'Tu célula ya conoce todo lo de aquí por ahora. Sin repetir: el próximo dato llega al'],
        learnedDone: ['Your cell has learned every fact about this place. Try another place for something new.', 'Deine Zelle hat jeden Fakt über diesen Ort gelernt. Probier einen anderen Ort für etwas Neues.', 'Tu célula aprendió todos los datos de este lugar. Prueba otro lugar para algo nuevo.'],
        learnedN: ['learned', 'gelernt', 'aprendidos'],
        keep: ['Into the collection', 'In die Sammlung', 'A la colección'],
        list: ['All places', 'Alle Orte', 'Todos los lugares'],
        spike: ['Right now, after your sweet meal: beta cells are sending out insulin and extra sugar is in the blood.', 'Gerade nach deiner süßen Mahlzeit: Beta-Zellen schicken Insulin los, und im Blut ist mehr Zucker unterwegs.', 'Justo ahora, tras tu comida dulce: las células beta liberan insulina y hay más azúcar en la sangre.'],
        fiberNow: ['Your fiber just arrived: the gut bacteria are busy.', 'Deine Ballaststoffe sind angekommen: Die Darmbakterien haben zu tun.', 'Tu fibra acaba de llegar: las bacterias del intestino están ocupadas.'],
        movedNow: ['You moved: the GLUT4 doors are open and sugar flows into the muscle.', 'Du hast dich bewegt: Die GLUT4-Türen sind offen, Zucker fließt in den Muskel.', 'Te moviste: las puertas GLUT4 están abiertas y el azúcar entra en el músculo.'],
        fastNow: ['You are fasting: the liver is releasing its stored sugar.', 'Du fastest: Die Leber gibt ihren Zuckervorrat frei.', 'Estás en ayuno: el hígado libera su azúcar guardado.'],
        sent: ['Off it goes to', 'Ab geht’s:', 'Rumbo a'],
        xpL: ['Body journey', 'Körperreise', 'Viaje por el cuerpo']
    };
    const tr = k => (copy[k] || [k])[L()] || (copy[k] || [k])[0];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const nm = p => p.n[L()] || p.n[0];
    const pct = x => Math.floor(x) + (lang() === 'en' ? '%' : ' %');
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

    /* ---------- state ---------- */
    const B = () => W.LowiVitalsBridge;
    const S = () => { try { return B().state() || {}; } catch (e) { return {}; } };
    const save = () => { try { B().save(); } catch (e) {} };
    const body = () => { const s = S(); s.body = fresh(s.body); return s.body; };
    function moods(now) {
        const r = body().recent, near = (k, h) => +r[k] > 0 && now - +r[k] < h * 36e5;
        return { spike: near('sugar', 3), fiber: near('fiber', 6), moved: near('move', 3), fasting: fastHours() >= 12 };
    }
    function fastHours() {
        let start = 0;
        try { start = W.LowiFastStop && LowiFastStop.startOf ? +LowiFastStop.startOf() || 0 : 0; } catch (e) {}
        if (!start) { try { start = +(JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}).last || 0; } catch (e) {} }
        return start && start <= Date.now() ? (Date.now() - start) / 36e5 : 0;
    }
    function fastStart() {
        try { const s = W.LowiFastStop && LowiFastStop.startOf ? +LowiFastStop.startOf() || 0 : 0; if (s) return s; } catch (e) {}
        try { return +(JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}).last || 0; } catch (e) { return 0; }
    }

    /* ---------- adventure bar on Home ---------- */
    let bar = null, last = '';
    function mount() {
        const home = D.getElementById('spHome'), log = home && home.querySelector('.sp-log');
        if (!log) return null;
        if (!bar) {
            bar = D.createElement('button');
            bar.type = 'button';
            bar.id = 'btBar';
            bar.className = 'bt-bar';
            bar.dataset.bt = 'bar';
        }
        /* the sun row must stay right before #lvDash (sun-meter.js re-inserts it there), so the bar goes right before the sun row */
        if (bar.parentNode !== log || !placed(log)) { const before = log.querySelector('#lsSun') || log.querySelector('#lvDash'); if (before) log.insertBefore(bar, before); else log.appendChild(bar); last = ''; }
        return bar;
    }
    /* in place = right before the sun row (or #lvDash); micro-book.js puts its #mbAdv row right after the bar, which is fine */
    function placed(log) {
        const target = log.querySelector('#lsSun') || log.querySelector('#lvDash');
        if (!target) return true;
        let n = bar.nextSibling;
        while (n && n.id === 'mbAdv') n = n.nextSibling;
        return n === target;
    }
    const cellIco = '<svg class="bt-cell" viewBox="0 0 24 24" aria-hidden="true"><circle class="bt-cell-m" cx="12" cy="12" r="9"/><circle class="bt-cell-n" cx="13.5" cy="10.5" r="3.3"/><circle class="bt-cell-o" cx="8" cy="14.5" r="1.3"/><circle class="bt-cell-o" cx="15" cy="16" r="1"/></svg>';
    function render() {
        if (!mount()) return;
        const now = Date.now(), v = view(body(), now);
        let label, right, dots = '', aria;
        const pl = v.trip && byId(v.trip.place);
        if (v.status === 'away') {
            label = tr('away') + ' · ' + nm(pl);
            right = fmtLeft(v.leftMs);
            aria = label + ', ' + tr('backIn') + ' ' + right;
        } else if (v.status === 'back') {
            label = tr('back');
            right = '';
            aria = label + ', ' + nm(pl);
        } else {
            const nx = next(body(), now, tooTired());
            if (nx.kind === 'ready') {
                label = tr('nextGo');
                right = nm(byId(nx.place));
                aria = label + ' ' + tr('nextTo') + ' ' + right;
            } else if (nx.kind === 'tomorrow') {
                label = tr('nextTomorrow');
                right = tr('nextIn') + ' ' + fmtHM(nx.inMs);
                aria = label + ', ' + right;
            } else {
                label = tr('nextTired'); try { const B = window.LowiBirthCompanion; if (B && B.withName) label = B.withName(label); } catch (e) { } /* Oct 19: her own name */
                right = v.visited + '/' + PLACES.length;
                aria = label + ', ' + right + ' ' + tr('places');
            }
            v.next = nx.kind;
        }
        if (v.status !== 'idle') {
            for (let i = 0; i < DOTS; i++) dots += '<i class="bt-dot' + (v.status === 'back' || i < v.dots ? ' on' : '') + '"></i>';
            dots = '<span class="bt-dots" aria-hidden="true">' + dots + '<b class="bt-q' + (v.status === 'back' ? ' on' : '') + '">?</b></span>';
        } else {
            dots = '<span class="bt-mini" aria-hidden="true">' + PLACES.map(p => '<i style="--h:' + p.hue + '" class="' + (body().p[p.id].x > 0 || body().p[p.id].v > 0 ? 'on' : '') + '"></i>').join('') + '</span>';
        }
        const sig = [v.status, v.next || '', label, right, v.dots, lang(), dots.length].join('|');
        if (sig === last) return;
        last = sig;
        bar.className = 'bt-bar ' + v.status + (v.next ? ' next-' + v.next : '');
        if (v.next) bar.dataset.next = v.next; else delete bar.dataset.next;
        if (pl) bar.style.setProperty('--h', pl.hue); else bar.style.removeProperty('--h');
        bar.setAttribute('aria-label', aria);
        bar.innerHTML = cellIco + '<span class="bt-name">' + esc(label) + '</span>' + dots + (right ? '<span class="bt-num num">' + esc(right) + '</span>' : '');
    }

    /* ---------- sheets ---------- */
    const R = () => W.LowiR2;
    function ticket(p, st, cur) {
        const x = st.p[p.id].x, v = st.p[p.id].v, here = cur && cur.place === p.id;
        const status = x <= 0 && !v ? '<span class="bt-st never">' + esc(tr('never')) + '</span>' : x >= 100 ? '<span class="bt-st done">' + esc(tr('full')) + '</span>' : '<span class="bt-st"><b class="num">' + pct(x) + '</b> ' + esc(tr('explored')) + '</span>';
        return '<button type="button" class="bt-ticket' + (here ? ' here' : '') + '" data-bt="place" data-id="' + p.id + '" style="--h:' + p.hue + '"><span class="bt-thumb">' + scene(p.id, moods(Date.now())) + '</span><span class="bt-tk"><b class="bt-tn">' + esc(nm(p)) + '</b><small class="bt-ts">' + esc(p.sub[L()] || p.sub[0]) + '</small>' + status +
            '<span class="bt-pbar" aria-hidden="true"><i style="width:' + Math.min(100, x) + '%"></i></span>' + (here ? '<small class="bt-here">' + esc(tr('here')) + '</small>' : '') + '</span></button>';
    }
    function listSheet() {
        if (!R() || !R().sheet) return;
        const st = body(), cur = current(st), now = Date.now(), v = view(st, now);
        let head = '';
        if (cur) {
            const pl = byId(cur.place);
            head = '<button type="button" class="bt-now ' + v.status + '" data-bt="bar" style="--h:' + pl.hue + '">' + scene(pl.id, Object.assign({ live: true }, moods(now))) + '<span class="bt-now-t"><b>' + esc(v.status === 'back' ? tr('back') : tr('away') + ' · ' + nm(pl)) + '</b>' + (v.status === 'away' ? '<small class="num" data-bt-left>' + esc(tr('backIn')) + ' ' + fmtLeft(v.leftMs) + '</small>' : '') + '</span></button>';
        }
        else {
            const nx = next(st, now, tooTired());
            head = nx.kind === 'ready' ? '<button type="button" class="bt-cta bt-next" data-bt="next" data-id="' + nx.place + '">' + esc(tr('nextGo')) + ' · ' + esc(nm(byId(nx.place))) + '</button>'
                : '<p class="bt-note bt-next">' + esc(nx.kind === 'tomorrow' ? tr('nextTomorrow') + ' (' + tr('nextIn') + ' ' + fmtHM(nx.inMs) + '). ' + tr('limit') : tr('tired')) + '</p>';
        }
        R().sheet('<div class="bt-sheet"><h2>' + esc(tr('title')) + '</h2><p class="bt-intro">' + esc(tr('intro')) + '</p>' + head + '<div class="bt-list">' + PLACES.map(p => ticket(p, st, cur)).join('') + '</div></div>', { cls: 'bt-ov' });
    }
    function placeSheet(id) {
        const p = byId(id);
        if (!p || !R() || !R().sheet) return;
        const st = body(), now = Date.now(), pr = st.p[id], cur = current(st), m = moods(now), n = unlocked(pr.x), shown = Math.max(pr.seen, 0);
        let note = '';
        if ((id === 'pancreas' || id === 'blood') && m.spike) note = tr('spike');
        else if (id === 'gut' && m.fiber) note = tr('fiberNow');
        else if (id === 'muscle' && m.moved) note = tr('movedNow');
        else if (id === 'liver' && m.fasting) note = tr('fastNow');
        const facts = p.f.slice(0, Math.max(shown, Math.min(n, 4))).map((f, i) => '<li><b class="num">' + (i + 1) + '</b><span>' + esc(f[L()] || f[0]) + '</span></li>').join('');
        const nextAt = n < 4 ? (n === 0 ? 1 : n * 25) : 0;
        const lockedLi = !nextAt ? '' : '<li class="lock"><b>?</b><span>' + (n === 0 ? esc(tr('firstFact')) : esc(tr('locked')) + ' ' + pct(nextAt) + ' ' + esc(tr('lockedT'))) + '</span></li>';
        let action;
        if (cur && cur.place === id) action = '<p class="bt-note num">' + esc(tr('here')) + '</p>';
        else if (cur) action = '<p class="bt-note">' + esc(tr('busy')) + '</p>';
        else if (!canStart(st, now)) action = '<p class="bt-note">' + esc(tr('limit')) + '</p>';
        else if (tooTired()) action = '<p class="bt-note">' + esc(tr('tired')) + '</p>';
        else action = '<button type="button" class="bt-cta" data-bt="go" data-id="' + id + '">' + esc(tr('go')) + '</button>';
        R().sheet('<div class="bt-sheet bt-place" style="--h:' + p.hue + '"><div class="bt-hero">' + scene(id, Object.assign({ live: true }, m)) + '</div><h2>' + esc(nm(p)) + '</h2><p class="bt-sub">' + esc(p.sub[L()] || p.sub[0]) + ' · <b class="num">' + (pr.x <= 0 && !pr.v ? esc(tr('never')) : pct(pr.x) + ' ' + esc(tr('explored'))) + '</b></p>' +
            '<div class="bt-pbar big" aria-hidden="true"><i style="width:' + Math.min(100, pr.x) + '%"></i></div>' + (note ? '<p class="bt-live">' + esc(note) + '</p>' : '') +
            '<h3>' + esc(tr('how')) + '</h3><p class="bt-note">' + esc(p.how[L()] || p.how[0]) + '</p>' +
            '<h3>' + esc(tr('facts')) + (shown ? ' · ' + shown + ' ' + esc(tr('learnedN')) : '') + '</h3><ol class="bt-facts">' + facts + lockedLi + '</ol>' + action + '</div>', { cls: 'bt-ov' });
    }
    function surpriseSheet(res) {
        const p = byId(res.place);
        if (!p || !R() || !R().sheet) return;
        const f = res.fact >= 0 ? (p.f[res.fact] || p.f[0]) : null;
        const cardTx = f ? (f[L()] || f[0]) : (res.nextAt ? tr('learnedAll') + ' ' + pct(res.nextAt) + '.' : tr('learnedDone'));
        R().sheet('<div class="bt-sheet bt-surprise" style="--h:' + p.hue + '"><div class="bt-hero">' + scene(p.id, Object.assign({ live: true }, moods(Date.now()))) + '</div><p class="bt-sub">' + esc(tr('surprise')) + '</p><h2>' + esc(nm(p)) + '</h2>' +
            '<div class="bt-card' + (f ? '' : ' bt-learned') + '"><small>' + esc(res.isNew ? tr('newFact') : tr('oldFact')) + '</small><p>' + esc(cardTx) + '</p></div>' +
            '<p class="bt-reward num">' + (res.xp ? '+' + res.xp + ' XP · ' : '') + '+' + TRIP_GAIN + (lang() === 'en' ? '% ' : ' % ') + esc(tr('explored')) + ' · ' + pct(res.x) + '</p>' +
            '<button type="button" class="bt-cta" data-bt="close"' + (f && res.isNew ? ' data-learn="' + esc(res.place) + ':' + res.fact + '"' : '') + '>' + esc(tr('keep')) + '</button> <button type="button" class="bt-link" data-bt="list">' + esc(tr('list')) + '</button></div>', { cls: 'bt-ov' });
    }

    /* ---------- flow ---------- */
    /* Oct 16 (E-man): Misty only travels with energy (LowiSun.energyNow: tracked meals by verdict, water, Move).
       Exploring progress from logs still counts; she just doesn't set off while she's too tired. */
    function tooTired() { try { const en = W.LowiSun && LowiSun.energyNow && LowiSun.energyNow(); return !!(en && !en.canTravel); } catch (e) { return false; } }
    function gain(g, why) {
        const st = body(), now = Date.now(), got = apply(st, g, now);
        if (why) st.recent[why] = now;
        let sent = null;
        if (Object.keys(got).length && canStart(st, now) && !tooTired()) {
            const dest = destination(got);
            if (dest) sent = start(st, dest, now);
        }
        if (Object.keys(got).length || why || sent) save();
        render();
        if (sent && W.LowiPraise && LowiPraise.say) setTimeout(() => { try { LowiPraise.say(tr('sent') + ' ' + nm(byId(sent.place)) + '!'); } catch (e) {} }, 1900);
        return got;
    }
    let lastMeal = { k: '', t: 0 };
    function onMeal(e) {
        const d = (e && e.detail) || {}, k = String(d.title || d.id || ''), now = Date.now();
        /* two loggers can announce the same meal; count it once */
        if (k && lastMeal.k === k && now - lastMeal.t < 4000) { if (d.macros) mergeMacros(d); return; }
        lastMeal = { k, t: now };
        const g = mealGains(d), mac = d.macros || {};
        if (g.gut && num(mac.fiber) !== null) body().recent.fiber = now;
        gain(g, g.pancreas ? 'sugar' : '');
    }
    function mergeMacros(d) {
        const g = mealGains(d), st = body();
        delete g.blood;
        if (g.gut) st.recent.fiber = Date.now();
        if (Object.keys(g).length) gain(g, g.pancreas ? 'sugar' : '');
        return st;
    }
    function onReward(e) {
        const en = e && e.detail && e.detail.entry;
        if (!en) return;
        const k = kindOf(en), g = entryGains(en);
        if (Object.keys(g).length) gain(g, k === 'move' ? 'move' : '');
    }
    function checkFast() {
        const s0 = fastStart(), h = fastHours();
        if (!s0 || !h) return;
        const st = body(), seen = +st.fast[s0] || 0, r = fastGains(h, seen);
        if (r.blocks > seen) {
            for (const k of Object.keys(st.fast)) if (k !== String(s0)) delete st.fast[k];
            st.fast[s0] = r.blocks;
            gain(r.g, '');
        }
    }
    function goPlace(id) {
        const st = body(), now = Date.now();
        if (tooTired()) { try { if (W.LowiPraise && LowiPraise.say) LowiPraise.say(tr('tired')); } catch (e) {} return false; }
        const t = start(st, id, now);
        if (!t) return false;
        save();
        render();
        return true;
    }
    /* "Start next journey": starts the trip, closes the sheets and the Today sheet, and lets Misty fly her galaxy
       on autopilot (misty-pad.js) so you watch her travel in the real world, with the countdown in the journey row. */
    function startNext(id) {
        const st = body(), now = Date.now(), nx = next(st, now, tooTired());
        if (nx.kind !== 'ready') { if (nx.kind === 'tired') { try { if (W.LowiPraise && LowiPraise.say) LowiPraise.say(tr('tired')); } catch (e) {} } return false; }
        if (!goPlace(byId(id) ? id : nx.place)) return false;
        try { if (R()) R().closeAll(); } catch (e) {}
        try { const H = W.LowiWorldHome; if (H && H.state && H.state.today && H.openToday) H.openToday(false); } catch (e) {}
        let calm = false; try { calm = W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
        setTimeout(() => { try { if (W.LowiPad && W.LowiPad.mode) W.LowiPad.mode('auto'); } catch (e) {} }, calm ? 0 : 480);
        return true;
    }
    function collect() {
        const st = body(), now = Date.now(), v = view(st, now);
        if (v.status !== 'back') return null;
        const res = claim(st, now);
        if (!res) return null;
        let xp = 0;
        try { if (W.LowiHost && LowiHost.award) xp = LowiHost.award('body-trip', null, { amt: XP, label: tr('xpL') + ' · ' + nm(byId(res.place)), eventId: res.eventId, perDay: TRIPS_PER_DAY }) || 0; } catch (e) {}
        res.xp = xp;
        save();
        /* the adventure log in micro-book.js keeps one entry per journey */
        /* Oct 16: no 'saw' here. It used to carry the fact, cut at 88 characters, so the log read
           "Your cell discovered While you fast, t…". micro-book.js names what the cell saw from the place itself. */
        try { W.dispatchEvent(new CustomEvent('lowi:body-trip-done', { detail: { id: res.eventId, place: nm(byId(res.place)), ts: now } })); } catch (e) {}
        render();
        surpriseSheet(res);
        return res;
    }
    D.addEventListener('click', e => {
        const c = e.target.closest && e.target.closest('[data-bt]');
        if (!c) return;
        const a = c.dataset.bt, ov = c.closest('.r2-ov');
        if (a === 'bar') {
            e.preventDefault();
            const st0 = view(body(), Date.now()).status;
            if (st0 === 'back') { if (ov && R()) R().close(ov); collect(); }
            else if (st0 === 'idle' && next(body(), Date.now(), tooTired()).kind === 'ready') startNext();
            else if (!ov) listSheet();
            else if (current(body())) placeSheet(current(body()).place);
        } else if (a === 'place') { e.preventDefault(); placeSheet(c.dataset.id); }
        else if (a === 'go' || a === 'next') { e.preventDefault(); startNext(c.dataset.id); } else if (a === 'close') {
            if (c.dataset.learn) { const [pl, fi] = c.dataset.learn.split(':'); if (learn(body(), pl, +fi)) { save(); render(); } }
            if (ov && R()) R().close(ov);
        }
        else if (a === 'list') { if (ov && R()) R().close(ov); setTimeout(listSheet, 340); }
    }, true);

    let queued = 0;
    const schedule = () => { if (queued) return; queued = requestAnimationFrame(() => { queued = 0; try { render(); } catch (e) {} }); };
    W.addEventListener('lowi:meal-logged', e => { try { onMeal(e); } catch (x) {} });
    D.addEventListener('lowi:meal-logged', e => { try { onMeal(e); } catch (x) {} });
    W.addEventListener('lowi:reward', e => { try { onReward(e); } catch (x) {} });
    ['lowi:lang', 'lowi:state', 'lowi:companion', 'storage', 'focus'].forEach(n => W.addEventListener(n, schedule));
    D.addEventListener('visibilitychange', schedule);
    function tick() {
        if (D.hidden) return;
        render();
        const el = D.querySelector('.r2-ov.on [data-bt-left]');
        if (el) { const v = view(body(), Date.now()); if (v.status === 'away') el.textContent = tr('backIn') + ' ' + fmtLeft(v.leftMs); }
    }
    function boot() {
        if (!D.getElementById('btCss')) {
            const l = D.createElement('link');
            l.id = 'btCss'; l.rel = 'stylesheet';
            const me = D.querySelector('script[src*="body-trips.js"]');
            l.href = me ? me.getAttribute('src').replace('body-trips.js', 'body-trips.css') : 'body-trips.css';
            D.head.appendChild(l);
        }
        const tab = D.getElementById('tab-home');
        if (tab && W.MutationObserver) new MutationObserver(() => { if (!bar || !bar.isConnected || (bar.parentNode && !placed(bar.parentNode))) schedule(); }).observe(tab, { childList: true, subtree: true });
        schedule();
        setTimeout(checkFast, 2500);
        setInterval(tick, 1000);
        setInterval(() => { if (!D.hidden) checkFast(); }, 60000);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

    W.LowiBodyTrips = Object.assign({}, core, { render, list: listSheet, place: placeSheet, collect, go: goPlace, startNext, gain, state: body, checkFast });
    if (typeof module !== 'undefined' && module.exports) module.exports = W.LowiBodyTrips;
})();
