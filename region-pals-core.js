/* LOWiSPIKE region companions core (Oct 16, 2026; handoff task 10). Pure data and maths, no DOM (node tests load it).
   E-man: inside Gut, Pancreas, Brain and the other regions, each place gets its own small glass companion creature. It swims
   along with you and tells you about the place in a Misty-style speech bubble, instead of the leftover gold info cards.
   Rules: these are guides, not pets. No collection, no XP, no microbe buddies (the gut guide is a villus, a fold of the gut
   wall, not a microbe). Misty stays the blue comet and the only companion with an XP ledger. Facts come from arrival-core.js
   (the reviewed place facts); this file adds only names, shapes and the greeting. */
(function (root) {
    'use strict';
    /* shape: drawn by region-pals.js as a small inline SVG inside a glass orb; rgb: the region's light (body-world-regions.js) */
    const PALS = {
        brain: { shape: 'spark', rgb: '28,247,249', name: ['Spark', 'Funke', 'Chispa'], kind: ['a little nerve-spark', 'ein kleiner Nervenfunke', 'una chispa nerviosa'] },
        lung: { shape: 'puff', rgb: '168,224,255', name: ['Puff', 'Hauch', 'Soplo'], kind: ['a little air sac', 'ein kleines Lungenbl\u00e4schen', 'un alv\u00e9olo peque\u00f1o'] },
        heart: { shape: 'beat', rgb: '241,71,112', name: ['Pulse', 'Puls', 'Pulso'], kind: ['a little heartbeat', 'ein kleiner Herzschlag', 'un latido peque\u00f1o'] },
        liver: { shape: 'hex', rgb: '231,134,49', name: ['Hexa', 'Hexa', 'Hexa'], kind: ['a little liver cell', 'eine kleine Leberzelle', 'una celulita del h\u00edgado'] },
        pancreas: { shape: 'islet', rgb: '248,234,64', name: ['Isla', 'Isla', 'Isla'], kind: ['a little islet', 'eine kleine Zellinsel', 'un islote peque\u00f1o'] },
        gut: { shape: 'villus', rgb: '46,248,182', name: ['Villo', 'Zotti', 'Velli'], kind: ['a little villus from your gut wall', 'eine kleine Zotte deiner Darmwand', 'una vellosidad de tu pared intestinal'] },
        muscle: { shape: 'fibre', rgb: '159,235,37', name: ['Flex', 'Flex', 'Flex'], kind: ['a little muscle fibre', 'eine kleine Muskelfaser', 'una fibra muscular'] }
    };
    const IDS = Object.keys(PALS);
    const ALIAS = { lungs: 'lung', muscles: 'muscle', intestine: 'gut', darm: 'gut' };
    const pid = id => { id = String(id || '').toLowerCase(); id = ALIAS[id] || id; return PALS[id] ? id : null; };
    const li3 = li => (li === 0 || li === 1 || li === 2) ? li : ({ en: 0, de: 1, es: 2 }[String(li || '').slice(0, 2)] ?? 1);
    const COPY = {
        hi: ['Hi, I\u2019m {n}, {k}. I\u2019ll swim along with you here.', 'Hallo, ich bin {n}, {k}. Ich schwimme hier mit dir mit.', 'Hola, soy {n}, {k}. Nadar\u00e9 contigo por aqu\u00ed.'],
        tap: ['Tap me for more.', 'Tipp mich an f\u00fcr mehr.', 'T\u00f3came para saber m\u00e1s.'],
        aria: ['{n}, your guide here. Tap for a fact.', '{n}, dein Guide hier. Tippen f\u00fcr einen Fakt.', '{n}, tu gu\u00eda aqu\u00ed. Toca para un dato.'],
        bye: ['See you next time.', 'Bis zum n\u00e4chsten Mal.', 'Hasta la pr\u00f3xima.']
    };
    /* ---------- cell-guide (Oct 17, 2026). E-man: in a world the top toast ("Got one", "Warmer...") covered the Daily Quest and
       didn't look like the app; the little cell says two or three things and then nothing. Now the CELL guide says the hunt
       lines itself, in its own bubble next to it, and keeps teaching: three more reviewed facts per place, a nudge towards the
       nearest crumb while you steer, and the hunt rules. Game vs body: the crumbs are game-only, said plainly once. ---------- */
    const MORE = {
        brain: [['Your brain can\u2019t store much sugar itself, so it depends on a steady supply from your blood.', 'Dein Gehirn kann selbst kaum Zucker speichern. Es braucht einen gleichm\u00e4\u00dfigen Nachschub aus dem Blut.', 'Tu cerebro casi no puede guardar az\u00facar, as\u00ed que depende de un suministro constante desde la sangre.'],
            ['During a long fast, your brain can run partly on ketones that your liver makes from fat.', 'Bei langem Fasten kann dein Gehirn zum Teil mit Ketonen laufen, die deine Leber aus Fett macht.', 'En un ayuno largo, tu cerebro puede funcionar en parte con cetonas que tu h\u00edgado fabrica a partir de grasa.'],
            ['Sleep seems to help your brain clear away waste that builds up during the day.', 'Schlaf scheint deinem Gehirn zu helfen, Abfall wegzur\u00e4umen, der sich tags\u00fcber ansammelt.', 'Dormir parece ayudar a tu cerebro a limpiar los desechos que se acumulan durante el d\u00eda.']],
        lung: [['At rest, most adults breathe about 12 to 20 times a minute.', 'In Ruhe atmen die meisten Erwachsenen etwa 12- bis 20-mal pro Minute.', 'En reposo, la mayor\u00eda de los adultos respira unas 12 a 20 veces por minuto.'],
            ['Every breath out carries away carbon dioxide, the leftover from burning sugar and fat for energy.', 'Jeder Atemzug nach drau\u00dfen tr\u00e4gt Kohlendioxid weg, den Rest vom Verbrennen von Zucker und Fett.', 'Cada vez que exhalas sacas di\u00f3xido de carbono, lo que sobra al quemar az\u00facar y grasa para obtener energ\u00eda.'],
            ['Your right lung has three lobes and your left only two, to make room for your heart.', 'Deine rechte Lunge hat drei Lappen, die linke nur zwei, damit dein Herz Platz hat.', 'Tu pulm\u00f3n derecho tiene tres l\u00f3bulos y el izquierdo solo dos, para dejar sitio al coraz\u00f3n.']],
        heart: [['At rest your heart muscle runs mostly on fat, and it can switch to sugar and other fuels when needed.', 'In Ruhe l\u00e4uft dein Herzmuskel vor allem mit Fett und kann bei Bedarf auf Zucker und andere Brennstoffe umschalten.', 'En reposo, tu m\u00fasculo card\u00edaco usa sobre todo grasa, y puede cambiar a az\u00facar y otros combustibles cuando hace falta.'],
            ['Your heart has its own pacemaker, a small cluster of cells that starts every beat.', 'Dein Herz hat einen eigenen Taktgeber, eine kleine Zellgruppe, die jeden Schlag startet.', 'Tu coraz\u00f3n tiene su propio marcapasos, un peque\u00f1o grupo de c\u00e9lulas que inicia cada latido.'],
            ['At rest, your blood makes a full loop around your body in about a minute.', 'In Ruhe macht dein Blut in etwa einer Minute eine ganze Runde durch deinen K\u00f6rper.', 'En reposo, tu sangre da una vuelta completa por tu cuerpo en m\u00e1s o menos un minuto.']],
        liver: [['When you haven\u2019t eaten for a while, your liver can make new sugar from other building blocks.', 'Wenn du eine Weile nichts gegessen hast, kann deine Leber neuen Zucker aus anderen Bausteinen bauen.', 'Cuando llevas un rato sin comer, tu h\u00edgado puede fabricar az\u00facar nuevo a partir de otras piezas.'],
            ['Blood from your gut passes through your liver first, so it gets the first look at what you absorb.', 'Blut aus deinem Darm flie\u00dft zuerst durch die Leber. So sieht sie als Erste, was du aufnimmst.', 'La sangre de tu intestino pasa primero por el h\u00edgado, as\u00ed que \u00e9l ve primero lo que absorbes.'],
            ['Your liver can regrow lost tissue, something very few organs can do.', 'Deine Leber kann verlorenes Gewebe nachwachsen lassen. Das k\u00f6nnen nur ganz wenige Organe.', 'Tu h\u00edgado puede regenerar tejido perdido, algo que muy pocos \u00f3rganos pueden hacer.']],
        pancreas: [['Your pancreas also makes glucagon, which tells your liver to release sugar when your blood sugar drops.', 'Deine Bauchspeicheldr\u00fcse macht auch Glukagon. Es sagt der Leber, Zucker freizugeben, wenn dein Blutzucker sinkt.', 'Tu p\u00e1ncreas tambi\u00e9n produce glucag\u00f3n, que le dice al h\u00edgado que libere az\u00facar cuando baja tu az\u00facar en sangre.'],
            ['The islets are only about 1 to 2 percent of your pancreas.', 'Die Inselzellen machen nur etwa 1 bis 2 Prozent deiner Bauchspeicheldr\u00fcse aus.', 'Los islotes son solo un 1 a 2 por ciento de tu p\u00e1ncreas.'],
            ['Your pancreas sits tucked away behind your stomach.', 'Deine Bauchspeicheldr\u00fcse liegt gut versteckt hinter deinem Magen.', 'Tu p\u00e1ncreas est\u00e1 escondido detr\u00e1s de tu est\u00f3mago.']],
        gut: [['Fibre in a meal can slow down how fast its sugar reaches your blood.', 'Ballaststoffe in einer Mahlzeit k\u00f6nnen bremsen, wie schnell ihr Zucker ins Blut kommt.', 'La fibra de una comida puede frenar lo r\u00e1pido que su az\u00facar llega a la sangre.'],
            ['The inner lining of your gut renews itself every few days.', 'Die innere Schicht deines Darms erneuert sich alle paar Tage.', 'El revestimiento interno de tu intestino se renueva cada pocos d\u00edas.'],
            ['Your gut has its own web of nerves, sometimes called the second brain.', 'Dein Darm hat ein eigenes Nervennetz, manchmal das zweite Gehirn genannt.', 'Tu intestino tiene su propia red de nervios, a veces llamada el segundo cerebro.']],
        muscle: [['Your muscles keep their own sugar store, glycogen, ready for when you move.', 'Deine Muskeln haben einen eigenen Zuckervorrat, Glykogen, bereit f\u00fcr wenn du dich bewegst.', 'Tus m\u00fasculos guardan su propia reserva de az\u00facar, el gluc\u00f3geno, lista para cuando te mueves.'],
            ['Even a short walk after a meal gets your muscles using sugar from your blood.', 'Schon ein kurzer Spaziergang nach dem Essen bringt deine Muskeln dazu, Zucker aus dem Blut zu nutzen.', 'Incluso un paseo corto despu\u00e9s de comer hace que tus m\u00fasculos usen az\u00facar de la sangre.'],
            ['Your muscles make up roughly a third of your body weight.', 'Deine Muskeln machen ungef\u00e4hr ein Drittel deines K\u00f6rpergewichts aus.', 'Tus m\u00fasculos son m\u00e1s o menos un tercio de tu peso corporal.']]
    };
    /* the hunt, in the guide's own voice ({n} = Misty's name, {k} = a number, {d} = a direction) */
    const GUIDE = {
        sense: ['I can feel {k} sugar crumbs hiding in this world\u2019s corners. Steer {n} right up to one and she gobbles it.', 'Ich sp\u00fcre {k} Zuckerkr\u00fcmel in den Ecken dieser Welt. Steuer {n} ganz nah ran, dann futtert sie ihn weg.', 'Siento {k} migas de az\u00facar en los rincones de este mundo. Lleva a {n} muy cerca y se la come.'],
        warm: ['Warmer! One is close, keep going.', 'W\u00e4rmer! Einer ist ganz nah, weiter so.', '\u00a1Caliente! Hay una cerca, sigue.'],
        found: ['{n} got one! {k} left in this world.', '{n} hat einen erwischt! Noch {k} in dieser Welt.', '\u00a1{n} atrap\u00f3 una! Quedan {k} en este mundo.'],
        found1: ['{n} got one! Just one left here.', '{n} hat einen erwischt! Nur noch einer hier.', '\u00a1{n} atrap\u00f3 una! Solo queda una aqu\u00ed.'],
        clean: ['That was the last one. This world is sparkling again!', 'Das war der letzte. Diese Welt gl\u00e4nzt wieder!', 'Era la \u00faltima. \u00a1Este mundo vuelve a brillar!'],
        level: ['Level up! {n} is now level {k} and a little stronger.', 'Level up! {n} ist jetzt Level {k} und ein bisschen st\u00e4rker.', '\u00a1Sube de nivel! {n} ya es nivel {k} y un poco m\u00e1s fuerte.'],
        full: ['{n} is full of power for today. The crumbs still get cleared!', '{n} hat f\u00fcr heute volle Kraft. Die Kr\u00fcmel r\u00e4umt sie trotzdem weg!', '{n} ya tiene todo su poder por hoy. \u00a1Igual limpia las migas!'],
        entered: ['You steered {n} in yourself, so she got a little power-up.', 'Du hast {n} selbst reingesteuert, das gibt ihr einen kleinen Kraftschub.', 'T\u00fa llevaste a {n} adentro, as\u00ed que recibi\u00f3 un peque\u00f1o impulso.'],
        auto: ['Crumbs only count when you steer {n} yourself. On autopilot she just looks around.', 'Kr\u00fcmel z\u00e4hlen nur, wenn du {n} selbst steuerst. Mit Autopilot schaut sie sich nur um.', 'Las migas solo cuentan si gu\u00edas t\u00fa a {n}. Con el piloto autom\u00e1tico solo mira.'],
        real: ['These crumbs only exist in the game. Catching them doesn\u2019t change anything in your real body.', 'Diese Kr\u00fcmel gibt es nur im Spiel. Wegfuttern \u00e4ndert nichts in deinem echten K\u00f6rper.', 'Estas migas solo existen en el juego. Atraparlas no cambia nada en tu cuerpo real.'],
        dir: ['Try {d}. The fog looks thicker over there.', 'Versuch\u2019s mal {d}. Dort ist der Nebel dichter.', 'Prueba {d}. All\u00ed la niebla se ve m\u00e1s espesa.'],
        behind: ['One is hiding behind us. Turn the world a little.', 'Einer versteckt sich hinter uns. Dreh die Welt ein bisschen.', 'Hay una escondida detr\u00e1s. Gira un poco el mundo.'],
        left: ['{k} crumbs are still hiding here.', 'Hier verstecken sich noch {k} Kr\u00fcmel.', 'Aqu\u00ed a\u00fan se esconden {k} migas.'],
        back: ['Back in here! Here\u2019s one more thing:', 'Wieder hier! Noch etwas f\u00fcr dich:', '\u00a1De vuelta! Una cosa m\u00e1s:']
    };
    /* screen directions, clockwise from up (0) in 45 degree steps */
    const DIRS = [['up', 'up and to the right', 'to the right', 'down and to the right', 'down', 'down and to the left', 'to the left', 'up and to the left'],
        ['nach oben', 'nach oben rechts', 'nach rechts', 'nach unten rechts', 'nach unten', 'nach unten links', 'nach links', 'nach oben links'],
        ['hacia arriba', 'arriba a la derecha', 'a la derecha', 'abajo a la derecha', 'hacia abajo', 'abajo a la izquierda', 'a la izquierda', 'arriba a la izquierda']];
    /* x right, y up (screen), any length -> 0..7 */
    function dirIndex(x, y) { const a = Math.atan2(+x || 0, +y || 0); return ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }
    function guide(key, li, v) {
        const a = GUIDE[key]; if (!a) return '';
        li = li3(li); v = v || {};
        return a[li].replace(/\{(\w)\}/g, (m, x) => x === 'd' ? (v.d != null ? DIRS[li][dirIndex(v.d[0], v.d[1])] : m) : (v[x] != null ? String(v[x]) : m));
    }
    /* hunt event -> guide line key + priority (higher may cut in; lower waits). Returns null for events the guide doesn't voice. */
    const HUNT = { clean: 3, level: 3, sense: 2, found: 2, entered: 2, full: 2, auto: 2, real: 1, warm: 1, dir: 1, behind: 1 };
    function huntLine(key, li, v) {
        v = v || {}; if (!(key in HUNT)) return null;
        let k = key; const n = v.n || 'Misty';
        if (key === 'found' && +v.left === 1) k = 'found1';
        const num = key === 'level' ? v.L : key === 'found' ? v.left : v.k;
        return { key: k, prio: HUNT[key], text: guide(k, li, { n, k: num, d: v.d }) };
    }
    /* how long a line stays: readable at a calm pace, never forever; hunt lines are short and go faster */
    function showMs(text, kind) { const n = String(text || '').length; return kind === 'hunt' ? clamp0(2600 + n * 50, 3000, 7000) : clamp0(4000 + n * 45, 4500, 11000); }
    /* the shortest time a line stays before another line may replace it (a higher-priority one cuts in sooner) */
    function minRead(text, prio, newPrio) { const n = String(text || '').length; const base = clamp0(1400 + n * 22, 1600, 4200); return newPrio > prio ? Math.min(base, 1200) : base; }
    function clamp0(v, a, b) { return Math.max(a, Math.min(b, v)); }
    /* next line the guide teaches: the first fact (index into lines) not said yet this session; null when all are said */
    function nextFact(total, seen, from) { for (let k = 0; k < total; k++) { const i = (from || 0) + k; if (i < total && !(seen && seen.has ? seen.has(i) : seen && seen[i])) return i; } return null; }
    /* ---------- where the bubble goes ----------
       Pure placement: pal = {x, y} centre on screen; b = {w, h} bubble size; obs = [{l, t, r, b, w}] rects to keep clear (w = weight);
       view = {w, h, top, bottom} usable area; prev = the last spot (kept unless another is clearly better).
       Spots: above/below the guide, extending right or left of it, slid sideways to stay on screen. */
    const SPOTS = ['ar', 'al', 'br', 'bl', 'sr', 'sl'];
    function overlap(a, o) { const w = Math.min(a.r, o.r) - Math.max(a.l, o.l), h = Math.min(a.b, o.b) - Math.max(a.t, o.t); return w > 0 && h > 0 ? w * h : 0; }
    function spotRect(s, pal, b, view, gap) {
        gap = gap || { up: 44, down: 40, side: 26, beside: 40 };
        let l, t;
        if (s[0] === 's') { l = s[1] === 'r' ? pal.x + gap.beside : pal.x - gap.beside - b.w; t = pal.y - b.h / 2; }
        else { l = s[1] === 'r' ? pal.x - gap.side : pal.x + gap.side - b.w; t = s[0] === 'a' ? pal.y - gap.up - b.h : pal.y + gap.down; }
        const m = 10, lo = m, hi = view.w - m - b.w; const shift = hi < lo ? lo - l : Math.min(hi, Math.max(lo, l)) - l; l += shift;
        /* tail: where the guide is, along the bubble's edge (x for above/below, y for beside), kept off the round corners */
        const tail = s[0] === 's' ? Math.max(16, Math.min(b.h - 16, pal.y - t)) : Math.max(18, Math.min(b.w - 18, pal.x - l));
        return { spot: s, l, t, r: l + b.w, b: t + b.h, shift, tail };
    }
    function place(pal, b, obs, view, prev) {
        const all = SPOTS.map(s => {
            const q = spotRect(s, pal, b, view);
            let score = 0;
            for (const o of obs || []) score += overlap(q, o) * (o.w || 1);
            const top = view.top || 0, bot = view.h - (view.bottom || 0);
            const out = Math.max(0, top - q.t) + Math.max(0, q.b - bot) + Math.max(0, -q.l) + Math.max(0, q.r - view.w);
            score += out * Math.max(b.w, b.h) * 4;
            /* a sideways bubble that had to slide back over its own guide no longer comes out of it */
            if (s[0] === 's' && Math.abs(q.shift) > 8) score += Math.abs(q.shift) * b.h * 2;
            if (s[0] === 'b') score += 120; else if (s[0] === 's') score += 220; /* above reads most naturally */
            if (s[0] !== 's' && s[1] !== (pal.x > view.w * 0.55 ? 'l' : 'r')) score += 60; /* opens towards the roomier side */
            q.score = score; return q;
        });
        let best = all[0]; for (const q of all) if (q.score < best.score) best = q;
        /* no flapping: keep the current spot while it is still clear and nearly as good */
        const keep = prev && all.find(q => q.spot === prev);
        return keep && keep.score < 400 && keep.score <= best.score + 500 ? keep : best;
    }
    function tr(key, li, n, k) { const a = COPY[key]; return a ? a[li3(li)].replace('{n}', n || '').replace('{k}', k || '') : ''; }
    function pal(id, li) { const p = PALS[pid(id)]; if (!p) return null; li = li3(li); return { id: pid(id), shape: p.shape, rgb: p.rgb, name: p.name[li], kind: p.kind[li] }; }
    /* what the companion says, in order: greeting, the place's facts (arrival-core), today's line; tapping walks the list */
    function lines(id, li, A, todayText) {
        id = pid(id); if (!id) return [];
        li = li3(li); const p = pal(id, li), out = [tr('hi', li, p.name, p.kind)];
        const P = A && A.PLACES && A.PLACES[id];
        if (P && P.f) P.f.forEach(f => { if (f && f[li]) out.push(f[li]); });
        (MORE[id] || []).forEach(f => { if (f && f[li]) out.push(f[li]); });
        if (todayText) out.push(String(todayText));
        return out;
    }
    /* ---------- moving with you ---------- */
    /* the companion keeps a home spot in the view and follows your drags and steering with a soft spring (lagging behind,
       never leaving the safe area). Positions are fractions of the host (0..1). */
    const FOLLOW = { home: [0.24, 0.56], reach: 0.16, k: 0.075, damp: 0.82, back: 0.02, wander: 0.012, margin: [0.1, 0.2, 0.9, 0.78] };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    /* target from a drag offset (dx, dy as fractions of the host): it swims a little way in the direction you move */
    function target(home, off, M) {
        M = M || FOLLOW.margin; home = home || FOLLOW.home; off = off || [0, 0];
        const r = FOLLOW.reach;
        return [clamp(home[0] + clamp(off[0], -1, 1) * r, M[0], M[2]), clamp(home[1] + clamp(off[1], -1, 1) * r, M[1], M[3])];
    }
    /* one spring step: returns {p, v}; t is seconds since start for the idle wander (0 in reduced motion) */
    function step(p, v, tgt, t, reduced) {
        const wx = reduced ? 0 : Math.sin(t * 0.7) * FOLLOW.wander, wy = reduced ? 0 : Math.sin(t * 1.1 + 1) * FOLLOW.wander * 0.8;
        const ax = (tgt[0] + wx - p[0]) * FOLLOW.k, ay = (tgt[1] + wy - p[1]) * FOLLOW.k;
        const nv = [(v[0] + ax) * FOLLOW.damp, (v[1] + ay) * FOLLOW.damp];
        if (reduced) return { p: [tgt[0], tgt[1]], v: [0, 0] };
        return { p: [p[0] + nv[0], p[1] + nv[1]], v: nv };
    }
    /* the drag offset relaxes back towards home after you let go */
    function relax(off) { return [off[0] * (1 - FOLLOW.back * 4), off[1] * (1 - FOLLOW.back * 4)].map(x => Math.abs(x) < 0.002 ? 0 : x); }
    /* tilt (degrees) from velocity: it leans into the way it swims */
    function tilt(v) { return clamp(Math.round((v && v[0] || 0) * 900), -18, 18); }
    const api = { PALS, IDS, pid, li3, COPY, tr, pal, lines, FOLLOW, target, step, relax, tilt, awardsXp: false,
        MORE, GUIDE, DIRS, HUNT, dirIndex, guide, huntLine, showMs, minRead, nextFact, SPOTS, overlap, spotRect, place };
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.LowiRegionPalsCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
