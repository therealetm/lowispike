/* LOWiSPIKE microbe collection book, adventure log and friend care (Oct 15, 2026). Pure logic, no DOM.
   - Microbes: numbered body buddies found only through real, counted actions in the XP ledger (and body journeys once
     they ship). Each buddy has 3 colour variants, reached by repeating its action. Undiscovered = silhouette + hint.
   - Adventure log: every finished body journey (ledger eventId body-trip:<...> or a lowi:body-trip-done event) with one
     "your cell discovered ..." line per journey.
   - Care: supportive sends to real friends only (friends list from the friends tree, lowispike.friends.v1). A small
     daily spark budget, one send per friend, kind and day. Nothing about health is stored or sent. */
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

    /* ---------- the buddies ---------- */
    /* m = metric from counts(), at = [found, colour 2, colour 3], hue = base colour, shape = drawing */
    const BUDDIES = [
        { id: 'insulin', shape: 'hex', hue: 48, m: 'meal', at: [1, 10, 30], n: T('Insulin messenger', 'Insulin-Bote', 'Mensajero insulina'), sub: T('Hormone', 'Hormon', 'Hormona'),
          fact: T('Insulin comes from the pancreas and helps muscle and fat cells take up sugar from the blood.', 'Insulin kommt aus der Bauchspeicheldrüse und hilft Muskel- und Fettzellen, Zucker aus dem Blut aufzunehmen.', 'La insulina viene del páncreas y ayuda a las células musculares y grasas a tomar azúcar de la sangre.') },
        { id: 'rbc', shape: 'disc', hue: 352, m: 'water', at: [1, 15, 50], n: T('Red blood cell', 'Rotes Blutkörperchen', 'Glóbulo rojo'), sub: T('Erythrocyte', 'Erythrozyt', 'Eritrocito'),
          fact: T('Red blood cells carry oxygen with haemoglobin and live about 120 days.', 'Rote Blutkörperchen tragen Sauerstoff mit Hämoglobin und leben etwa 120 Tage.', 'Los glóbulos rojos llevan oxígeno con la hemoglobina y viven unos 120 días.') },
        { id: 'mito', shape: 'bean', hue: 28, m: 'move', at: [1, 10, 30], n: T('Mitochondrion', 'Mitochondrium', 'Mitocondria'), sub: T('Power plant', 'Kraftwerk', 'Central de energía'),
          fact: T('Mitochondria turn sugar and fat into ATP, the energy currency of your cells.', 'Mitochondrien verwandeln Zucker und Fett in ATP, die Energiewährung deiner Zellen.', 'Las mitocondrias convierten azúcar y grasa en ATP, la moneda de energía de tus células.') },
        { id: 'villus', shape: 'finger', hue: 330, m: 'meal', at: [5, 25, 60], n: T('Gut villus', 'Darmzotte', 'Vellosidad'), sub: T('Small intestine', 'Dünndarm', 'Intestino delgado'),
          fact: T('Millions of villi fold the small intestine so nutrients can pass into the blood.', 'Millionen Zotten falten den Dünndarm auf, damit Nährstoffe ins Blut gelangen.', 'Millones de vellosidades pliegan el intestino delgado para que los nutrientes pasen a la sangre.') },
        { id: 'bifido', shape: 'rod', hue: 140, m: 'fiber', at: [1, 5, 15], n: T('Bifidobacterium', 'Bifidobakterie', 'Bifidobacteria'), sub: T('Gut bacterium', 'Darmbakterie', 'Bacteria intestinal'),
          fact: T('Gut bacteria like bifidobacteria ferment fibre, which makes short-chain fatty acids.', 'Darmbakterien wie Bifidobakterien vergären Ballaststoffe, dabei entstehen kurzkettige Fettsäuren.', 'Bacterias intestinales como las bifidobacterias fermentan la fibra y producen ácidos grasos de cadena corta.') },
        { id: 'beta', shape: 'island', hue: 200, m: 'scan', at: [3, 15, 40], n: T('Beta cell', 'Beta-Zelle', 'Célula beta'), sub: T('Pancreas', 'Bauchspeicheldrüse', 'Páncreas'),
          fact: T('Beta cells in the islets of Langerhans sense blood sugar and release insulin.', 'Beta-Zellen in den Langerhans-Inseln messen den Blutzucker und geben Insulin ab.', 'Las células beta de los islotes de Langerhans miden el azúcar en sangre y liberan insulina.') },
        { id: 'glucagon', shape: 'tri', hue: 268, m: 'fast', at: [1, 5, 15], n: T('Glucagon messenger', 'Glukagon-Bote', 'Mensajero glucagón'), sub: T('Hormone', 'Hormon', 'Hormona'),
          fact: T('When you have not eaten for a while, glucagon tells the liver to release stored sugar.', 'Wenn du länger nichts isst, lässt Glukagon die Leber gespeicherten Zucker freigeben.', 'Cuando llevas rato sin comer, el glucagón hace que el hígado libere azúcar guardado.') },
        { id: 'glut4', shape: 'gate', hue: 172, m: 'move', at: [3, 15, 40], n: T('GLUT4 gate', 'GLUT4-Tor', 'Puerta GLUT4'), sub: T('Muscle cell', 'Muskelzelle', 'Célula muscular'),
          fact: T('Exercise moves GLUT4 sugar gates to the surface of muscle cells, even without insulin.', 'Bewegung holt GLUT4-Zuckertore an die Oberfläche der Muskelzellen, sogar ohne Insulin.', 'El ejercicio lleva las puertas de azúcar GLUT4 a la superficie del músculo, incluso sin insulina.') },
        { id: 'builder', shape: 'chain', hue: 15, m: 'protein', at: [1, 5, 15], n: T('Amino builder', 'Aminosäure-Baumeister', 'Constructor de aminoácidos'), sub: T('Protein', 'Eiweiß', 'Proteína'),
          fact: T('From the amino acids in protein your body builds muscle, enzymes and messengers.', 'Aus den Aminosäuren im Eiweiß baut dein Körper Muskeln, Enzyme und Botenstoffe.', 'Con los aminoácidos de la proteína tu cuerpo construye músculo, enzimas y mensajeros.') },
        { id: 'goblet', shape: 'cup', hue: 190, m: 'sugar', at: [1, 5, 15], n: T('Goblet cell', 'Becherzelle', 'Célula caliciforme'), sub: T('Gut wall', 'Darmwand', 'Pared intestinal'),
          fact: T('Goblet cells make the mucus that shields the gut wall from germs.', 'Becherzellen bilden den Schleim, der die Darmwand vor Keimen schützt.', 'Las células caliciformes forman la mucosidad que protege la pared intestinal de los gérmenes.') },
        { id: 'liver', shape: 'hexcell', hue: 12, m: 'fast', at: [3, 10, 25], n: T('Liver cell', 'Leberzelle', 'Célula hepática'), sub: T('Hepatocyte', 'Hepatozyt', 'Hepatocito'),
          fact: T('The liver stores sugar as glycogen and releases it into the blood when needed.', 'Die Leber speichert Zucker als Glykogen und gibt ihn bei Bedarf ins Blut ab.', 'El hígado guarda azúcar como glucógeno y lo libera a la sangre cuando hace falta.') },
        { id: 'neuron', shape: 'star', hue: 230, m: 'sun', at: [1, 5, 15], n: T('Nerve cell', 'Nervenzelle', 'Neurona'), sub: T('Brain', 'Gehirn', 'Cerebro'),
          fact: T('Your brain uses about 20% of your energy, though it is only about 2% of your weight.', 'Dein Gehirn verbraucht etwa 20 % deiner Energie, obwohl es nur rund 2 % deines Gewichts ausmacht.', 'Tu cerebro usa cerca del 20 % de tu energía, aunque es solo un 2 % de tu peso.') },
        { id: 'wbc', shape: 'blob', hue: 210, m: 'days', at: [3, 14, 30], n: T('White blood cell', 'Weißes Blutkörperchen', 'Glóbulo blanco'), sub: T('Defender', 'Abwehr', 'Defensa'),
          fact: T('White blood cells patrol blood and tissue and fight off germs.', 'Weiße Blutkörperchen patrouillieren durch Blut und Gewebe und wehren Keime ab.', 'Los glóbulos blancos patrullan la sangre y los tejidos y combaten los gérmenes.') },
        { id: 'ketone', shape: 'spark', hue: 290, m: 'fast', at: [5, 15, 40], n: T('Ketone spark', 'Ketonkörper-Funke', 'Chispa cetónica'), sub: T('Fasting fuel', 'Fasten-Treibstoff', 'Combustible del ayuno'),
          fact: T('After many hours without food, the liver makes ketones from fat that brain and muscles can use.', 'Nach vielen Stunden ohne Essen bildet die Leber aus Fett Ketonkörper, die Gehirn und Muskeln nutzen können.', 'Tras muchas horas sin comer, el hígado produce cetonas a partir de grasa que el cerebro y los músculos pueden usar.') },
        { id: 'brownfat', shape: 'grape', hue: 34, m: 'move', at: [7, 25, 60], n: T('Brown fat cell', 'Braune Fettzelle', 'Célula de grasa parda'), sub: T('Heater', 'Heizung', 'Calefacción'),
          fact: T('Brown fat is packed with mitochondria and can turn energy into heat.', 'Braunes Fett steckt voller Mitochondrien und kann Energie in Wärme umwandeln.', 'La grasa parda está llena de mitocondrias y puede convertir energía en calor.') },
        { id: 'leptin', shape: 'drop', hue: 316, m: 'days', at: [7, 21, 60], n: T('Leptin messenger', 'Leptin-Bote', 'Mensajero leptina'), sub: T('Hormone', 'Hormon', 'Hormona'),
          fact: T('Leptin comes from fat cells and tells the brain how much energy is stored.', 'Leptin kommt aus Fettzellen und meldet dem Gehirn, wie viel Energie gespeichert ist.', 'La leptina viene de las células grasas y le dice al cerebro cuánta energía hay guardada.') },
        { id: 'alveolus', shape: 'cluster', hue: 186, m: 'trip', at: [1, 5, 15], n: T('Alveolus', 'Lungenbläschen', 'Alvéolo'), sub: T('Lung', 'Lunge', 'Pulmón'),
          fact: T('In hundreds of millions of tiny air sacs, oxygen passes from the lungs into the blood.', 'In Hunderten Millionen Lungenbläschen wandert Sauerstoff aus der Lunge ins Blut.', 'En cientos de millones de alvéolos el oxígeno pasa de los pulmones a la sangre.') },
        { id: 'heartcell', shape: 'heart', hue: 0, m: 'trip', at: [3, 10, 25], n: T('Heart muscle cell', 'Herzmuskelzelle', 'Célula del corazón'), sub: T('Heart', 'Herz', 'Corazón'),
          fact: T('Heart muscle cells contract for a whole lifetime, roughly 100,000 times a day.', 'Herzmuskelzellen ziehen sich ein Leben lang zusammen, rund 100.000 Mal am Tag.', 'Las células del corazón se contraen toda la vida, unas 100.000 veces al día.') }
    ];
    /* the hint says what to do, with the real action and the number still missing */
    const HINT = {
        meal: T('Log {n} meal(s)', '{n} Mahlzeit(en) eintragen', 'Registra {n} comida(s)'),
        water: T('Log {n} glass(es) of water', '{n} Glas Wasser eintragen', 'Registra {n} vaso(s) de agua'),
        move: T('Finish {n} Move session(s)', '{n} Bewegung(en) abschließen', 'Completa {n} sesión(es) de movimiento'),
        scan: T('Scan {n} food(s)', '{n} Lebensmittel scannen', 'Escanea {n} alimento(s)'),
        fast: T('Reach {n} fasting milestone(s)', '{n} Fasten-Etappe(n) erreichen', 'Alcanza {n} etapa(s) de ayuno'),
        fiber: T('Reach your fibre goal {n}×', 'Ballaststoff-Ziel {n}× erreichen', 'Alcanza tu meta de fibra {n}×'),
        protein: T('Reach your protein goal {n}×', 'Eiweiß-Ziel {n}× erreichen', 'Alcanza tu meta de proteína {n}×'),
        sugar: T('Close {n} day(s) under your sugar goal', '{n} Tag(e) unter dem Zucker-Ziel abschließen', 'Cierra {n} día(s) bajo tu meta de azúcar'),
        sun: T('Fill your sun {n}×', 'Deine Sonne {n}× füllen', 'Llena tu sol {n}×'),
        days: T('Be active on {n} more day(s)', 'An {n} weiteren Tag(en) aktiv sein', 'Activo {n} día(s) más'),
        trip: T('Finish {n} body journey(s)', '{n} Körperreise(n) beenden', 'Termina {n} viaje(s) por el cuerpo')
    };
    function variantHues(b) { return [b.hue, (b.hue + 48) % 360, (b.hue + 168) % 360]; }
    /* external buddies (body depth layer) can join the book: {id, n|names:[en,de,es], fact?, hue?, shape?} found by event only */
    function merge(list, extra) {
        const out = list.slice(), ids = new Set(out.map(b => b.id));
        for (const x of extra || []) {
            if (!x || typeof x.id !== 'string' || !/^[a-z0-9_-]{2,24}$/.test(x.id) || ids.has(x.id)) continue;
            const n = Array.isArray(x.names) ? x.names : Array.isArray(x.n) ? x.n : [String(x.name || x.id)];
            const f = Array.isArray(x.fact) ? x.fact : x.fact ? [String(x.fact)] : [''];
            out.push({ id: x.id, shape: x.shape || 'blob', hue: Number.isFinite(+x.hue) ? +x.hue : 160, m: 'event', at: [1, 99999, 99999], n: n, sub: x.sub || T('Body buddy', 'Körper-Buddy', 'Compañero'), fact: f, ext: true });
            ids.add(x.id);
        }
        return out;
    }
    /* the whole book from counts + the stored finds (finds stay even if an old ledger is trimmed) */
    function book(c, stored, list) {
        list = list || BUDDIES;
        stored = stored && typeof stored === 'object' ? stored : {};
        const found = stored.found || {};
        const cards = list.map((b, i) => {
            const v = b.m === 'event' ? 0 : (+c[b.m] || 0), keep = found[b.id] || null;
            let vars = b.at.filter(t => v >= t).length;
            if (keep && +keep.v > vars) vars = Math.min(3, +keep.v);
            const isFound = vars > 0;
            const next = vars < 3 ? b.at[vars] : 0, left = next ? Math.max(0, next - v) : 0;
            return { no: i + 1, id: b.id, b, found: isFound, vars, value: v, next, left, hues: variantHues(b), since: keep && keep.ts || 0 };
        });
        return { cards, n: cards.filter(x => x.found).length, total: cards.length };
    }
    /* what changed since the stored state: new finds and new colours, for a one-time toast */
    function diff(stored, bk, now) {
        stored = stored && typeof stored === 'object' ? stored : {};
        const found = Object.assign({}, stored.found || {}), fresh = [], colours = [];
        for (const c of bk.cards) {
            if (!c.found) continue;
            const had = found[c.id];
            if (!had) { fresh.push(c); found[c.id] = { ts: now || Date.now(), v: c.vars }; }
            else if (c.vars > (+had.v || 0)) { colours.push(c); found[c.id] = { ts: had.ts, v: c.vars }; }
        }
        return { fresh, colours, state: Object.assign({}, stored, { found }) };
    }
    function hint(c, L) {
        const b = c.b, tpl = HINT[b.m] || T('Keep exploring', 'Weiter erkunden', 'Sigue explorando');
        if (b.m === 'event') return [T('Find it on a body journey', 'Auf einer Körperreise zu finden', 'Se encuentra en un viaje por el cuerpo')][0][L] || '';
        return (tpl[L] || tpl[0]).replace('{n}', String(Math.max(1, c.left)));
    }

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
            map.set(id, { id, key: String(t.place || t.key || old.key || t.id), ts: +t.ts || old.ts || 0, day: t.day || old.day || dayKey(+t.ts || 0), saw: t.saw ? [cleanText(t.saw)] : old.saw, name: t.name ? [cleanText(t.name)] : old.name });
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
        { id: 'hug', e: '\u{1F917}', cost: 1, n: T('Hug', 'Umarmung', 'Abrazo'), say: T('I’d love to send {n} a warm hug!', 'Ich schick {n} gern eine warme Umarmung!', '¡Me encantaría mandarle a {n} un abrazo cálido!'), got: T('{w} sent you a hug', '{w} hat dir eine Umarmung geschickt', '{w} te mandó un abrazo') },
        { id: 'water', e: '\u{1F4A7}', cost: 1, n: T('Drink water', 'Trink Wasser', 'Bebe agua'), say: T('I’ll remind {n} to have a glass of water!', 'Ich erinnere {n} an ein Glas Wasser!', '¡Le recuerdo a {n} que beba un vaso de agua!'), got: T('{w} reminds you: drink some water', '{w} erinnert dich: Trink ein Glas Wasser', '{w} te recuerda: bebe un vaso de agua') },
        { id: 'morning', e: '\u2600\uFE0F', cost: 1, from: 4, to: 12, n: T('Good morning', 'Guten Morgen', 'Buenos días'), say: T('I want to wish {n} a bright start to the day!', 'Ich wünsch {n} einen hellen Start in den Tag!', '¡Quiero desearle a {n} un buen comienzo del día!'), got: T('{w} wishes you a good morning', '{w} wünscht dir einen guten Morgen', '{w} te desea buenos días') },
        { id: 'night', e: '\u{1F319}', cost: 1, from: 18, to: 4, n: T('Sweet dreams', 'Gute Nacht', 'Dulces sueños'), say: T('I’d love to help {n} get a good night’s sleep!', 'Ich würde {n} gern beim Einschlafen helfen!', '¡Me encantaría ayudar a {n} a dormir bien!'), got: T('{w} wishes you a good night', '{w} wünscht dir eine gute Nacht', '{w} te desea buenas noches') },
        { id: 'thanks', e: '\u{1F64F}', cost: 2, lv: 3, n: T('Gratitude', 'Dankbarkeit', 'Gratitud'), say: T('I want to tell {n} thank you!', 'Ich will {n} Danke sagen!', '¡Quiero darle las gracias a {n}!'), got: T('{w} is grateful for you', '{w} ist dankbar für dich', '{w} está agradecido por ti') },
        { id: 'cheer', e: '\u{1F4AA}', cost: 2, lv: 5, n: T('Encouragement', 'Motivation', 'Ánimo'), say: T('I’m cheering {n} on today!', 'Ich feuere {n} heute an!', '¡Hoy animo a {n}!'), got: T('{w} is cheering you on', '{w} feuert dich an', '{w} te está animando') }
    ];
    const SPARK_BASE = 3, SPARK_MAX = 8;
    /* sparks: 3 a day plus one per counted action today, up to 8 */
    function sparks(ledger, spent, now) {
        const key = dayKey(now || Date.now());
        const acts = (ledger || []).filter(e => e && +e.amt > 0 && (e.day || dayKey(+e.ts || 0)) === key && /^(meal|scan|move|fast|water|macro)$/.test(kind(e))).length;
        const total = Math.min(SPARK_MAX, SPARK_BASE + acts), used = +((spent || {})[key]) || 0;
        return { total, used, left: Math.max(0, total - used), key };
    }
    function inWindow(k, hour) {
        if (k.from == null) return true;
        return k.from < k.to ? hour >= k.from && hour < k.to : hour >= k.from || hour < k.to;
    }
    const okUid = u => typeof u === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(u);
    function careId(toUid, kindId, day) { return okUid(toUid) && CARE.some(k => k.id === kindId) && /^\d{4}-\d{2}-\d{2}$/.test(day) ? 'care:' + toUid + ':' + kindId + ':' + day : ''; }
    function parseCare(id) { const m = /^care:([A-Za-z0-9_-]{6,64}):([a-z]+):(\d{4}-\d{2}-\d{2})$/.exec(String(id || '')); return m && CARE.some(k => k.id === m[2]) ? { to: m[1], kind: m[2], day: m[3] } : null; }
    /* can this kind go to this friend now? reason: 'sent' | 'locked' | 'time' | 'sparks' | '' */
    function canCare(st, f, k, ctx) {
        ctx = ctx || {};
        if (!f || !okUid(f.uid) || !k) return { ok: false, why: 'none' };
        const id = careId(f.uid, k.id, ctx.day);
        if ((st && st.sent || {})[id]) return { ok: false, why: 'sent' };
        if (k.lv && (+ctx.level || 1) < k.lv) return { ok: false, why: 'locked' };
        if (!inWindow(k, +ctx.hour || 0)) return { ok: false, why: 'time' };
        if ((+ctx.left || 0) < k.cost) return { ok: false, why: 'sparks' };
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

    const api = { dayKey, kind, counts, BUDDIES, HINT, merge, book, diff, hint, variantHues, PLACES, place, journeys, journeyLine, journeyTitle, CARE, SPARK_BASE, SPARK_MAX, sparks, inWindow, careId, parseCare, canCare, incoming, okUid, pick };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.LowiMicroCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
