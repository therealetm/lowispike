/* world-sci-core.js — the real science of the cell worlds, as data (Oct 23, 2026).
   E-man's tester (studying human body science): "It would have been nice if things will be labeled, so that when she's playing
   the game, she's almost passively learning ... When we enter a cellular world, it doesn't even say what cellular world we're
   entering."
   WORLDS: what each world stands for. place = the organ (small label), name = the tissue you are inside (the value).
   TAGS: the key objects of each world. k = the mesh name in body-world-regions.js ('sci:' + k), name = the scientific term,
   say = one short plain sentence about what is happening. All three languages: [en, de, es].
   Universal text rule: a small label and one short value; nothing longer than one sentence.
   Readings chosen where the world was not explicit:
     gut     -> the small intestine (the world shows villi, which only the small intestine has)
     heart   -> inside a ventricle (red cells in a chamber, muscle ridges on the wall = trabeculae carneae)
     lung    -> the guide is a type I alveolar cell (the thin wall cell of an air sac, where gas exchange happens)
     muscle  -> skeletal muscle (long parallel fibres; a muscle fibre is one cell)
   Every term and sentence was checked against the SOURCES below. Pure: no DOM; tests/world-sci.test.cjs. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiWorldSciCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const WORLDS = {
        brain: { place: ['Brain', 'Gehirn', 'Cerebro'], name: ['Nerve tissue', 'Nervengewebe', 'Tejido nervioso'] },
        lung: { place: ['Lungs', 'Lunge', 'Pulmones'], name: ['Alveoli', 'Lungenbl\u00e4schen', 'Alv\u00e9olos'] },
        heart: { place: ['Heart', 'Herz', 'Coraz\u00f3n'], name: ['Ventricle', 'Herzkammer', 'Ventr\u00edculo'] },
        liver: { place: ['Liver', 'Leber', 'H\u00edgado'], name: ['Liver lobule', 'Leberl\u00e4ppchen', 'Lobulillo hep\u00e1tico'] },
        pancreas: { place: ['Pancreas', 'Bauchspeicheldr\u00fcse', 'P\u00e1ncreas'], name: ['Islet of Langerhans', 'Langerhans-Insel', 'Islote de Langerhans'] },
        gut: { place: ['Small intestine', 'D\u00fcnndarm', 'Intestino delgado'], name: ['Villi', 'Darmzotten', 'Vellosidades'] },
        muscle: { place: ['Skeletal muscle', 'Skelettmuskel', 'M\u00fasculo esquel\u00e9tico'], name: ['Muscle fibres', 'Muskelfasern', 'Fibras musculares'] }
    };

    const TAGS = {
        brain: [
            { k: 'neuron', name: ['Neuron', 'Neuron', 'Neurona'], say: ['A nerve cell. Its branches pass signals on to other neurons.', 'Eine Nervenzelle. Ihre Forts\u00e4tze geben Signale an andere Neuronen weiter.', 'Una c\u00e9lula nerviosa. Sus ramas pasan se\u00f1ales a otras neuronas.'] },
            { k: 'signal', name: ['Nerve impulse', 'Nervenimpuls', 'Impulso nervioso'], say: ['An electrical signal racing along a nerve fibre to the next cell.', 'Ein elektrisches Signal, das eine Nervenfaser entlang zur n\u00e4chsten Zelle rast.', 'Una se\u00f1al el\u00e9ctrica que corre por una fibra nerviosa hasta la siguiente c\u00e9lula.'] }
        ],
        lung: [
            { k: 'alveolus', name: ['Alveolus', 'Alveole', 'Alv\u00e9olo'], say: ['A tiny air sac. Oxygen crosses its thin wall into your blood.', 'Ein winziges Lungenbl\u00e4schen. Sauerstoff wandert durch seine d\u00fcnne Wand ins Blut.', 'Un saco de aire diminuto. El ox\u00edgeno cruza su pared fina hacia tu sangre.'] },
            { k: 'capillary', name: ['Capillary', 'Kapillare', 'Capilar'], say: ['A hair-thin blood vessel. It takes up oxygen and gives off carbon dioxide.', 'Ein haarfeines Blutgef\u00e4\u00df. Es nimmt Sauerstoff auf und gibt Kohlendioxid ab.', 'Un vaso sangu\u00edneo finísimo. Recoge ox\u00edgeno y suelta di\u00f3xido de carbono.'] },
            { k: 'oxygen', name: ['Oxygen', 'Sauerstoff', 'Ox\u00edgeno'], say: ['From the air you breathe in, on its way into your blood.', 'Aus der Luft, die du einatmest, auf dem Weg in dein Blut.', 'Del aire que respiras, de camino a tu sangre.'] }
        ],
        heart: [
            { k: 'rbc', name: ['Red blood cell', 'Rotes Blutk\u00f6rperchen', 'Gl\u00f3bulo rojo'], say: ['It carries oxygen, bound to haemoglobin.', 'Es tr\u00e4gt Sauerstoff, gebunden an H\u00e4moglobin.', 'Lleva ox\u00edgeno unido a la hemoglobina.'] },
            { k: 'trabecula', name: ['Trabeculae', 'Trabekel', 'Trab\u00e9culas'], say: ['Ridges of heart muscle on the inner wall of the ventricle.', 'Leisten aus Herzmuskel an der Innenwand der Herzkammer.', 'Crestas de m\u00fasculo card\u00edaco en la pared interna del ventr\u00edculo.'] }
        ],
        liver: [
            { k: 'hepatocyte', name: ['Hepatocyte', 'Hepatozyt', 'Hepatocito'], say: ['A liver cell. It stores sugar as glycogen and releases it when you need it.', 'Eine Leberzelle. Sie speichert Zucker als Glykogen und gibt ihn ab, wenn du ihn brauchst.', 'Una c\u00e9lula del h\u00edgado. Guarda az\u00facar como gluc\u00f3geno y lo suelta cuando lo necesitas.'] },
            { k: 'glycogen', name: ['Glycogen', 'Glykogen', 'Gluc\u00f3geno'], say: ['Stored glucose. Your liver breaks it down to keep blood sugar steady.', 'Gespeicherte Glukose. Deine Leber baut es ab, damit dein Blutzucker stabil bleibt.', 'Glucosa guardada. Tu h\u00edgado lo descompone para mantener estable el az\u00facar en sangre.'] },
            { k: 'vein', name: ['Central vein', 'Zentralvene', 'Vena central'], say: ['Blood flows past the liver cells and drains out here.', 'Das Blut str\u00f6mt an den Leberzellen vorbei und flie\u00dft hier ab.', 'La sangre pasa junto a las c\u00e9lulas del h\u00edgado y sale por aqu\u00ed.'] }
        ],
        pancreas: [
            { k: 'islet', name: ['Islet of Langerhans', 'Langerhans-Insel', 'Islote de Langerhans'], say: ['A cluster of hormone cells. Its beta cells release insulin.', 'Ein Haufen Hormonzellen. Seine Betazellen geben Insulin ab.', 'Un grupo de c\u00e9lulas hormonales. Sus c\u00e9lulas beta liberan insulina.'] },
            { k: 'insulin', name: ['Insulin', 'Insulin', 'Insulina'], say: ['A hormone that helps your cells take sugar out of the blood.', 'Ein Hormon, das deinen Zellen hilft, Zucker aus dem Blut aufzunehmen.', 'Una hormona que ayuda a tus c\u00e9lulas a sacar az\u00facar de la sangre.'] },
            { k: 'acinar', name: ['Acinar cells', 'Azinuszellen', 'C\u00e9lulas acinares'], say: ['They make digestive enzymes, not hormones. Most of your pancreas is them.', 'Sie bilden Verdauungsenzyme, keine Hormone. Der Gro\u00dfteil deiner Bauchspeicheldr\u00fcse sind sie.', 'Fabrican enzimas digestivas, no hormonas. Son casi todo tu p\u00e1ncreas.'] }
        ],
        gut: [
            { k: 'villus', name: ['Villus', 'Darmzotte', 'Vellosidad'], say: ['A tiny finger of the gut wall. Millions of them give room to absorb food.', 'Ein winziger Finger der Darmwand. Millionen davon schaffen Fl\u00e4che, um Nahrung aufzunehmen.', 'Un dedito de la pared del intestino. Millones de ellos dan superficie para absorber la comida.'] },
            { k: 'nutrient', name: ['Nutrients', 'N\u00e4hrstoffe', 'Nutrientes'], say: ['Sugars, amino acids and fatty acids, small enough to be absorbed.', 'Zucker, Aminos\u00e4uren und Fetts\u00e4uren, klein genug, um aufgenommen zu werden.', 'Az\u00facares, amino\u00e1cidos y \u00e1cidos grasos, tan peque\u00f1os que se pueden absorber.'] },
            { k: 'microbe', name: ['Gut bacteria', 'Darmbakterien', 'Bacterias intestinales'], say: ['A few live here. Most live in your large intestine, feeding on fibre.', 'Ein paar leben hier. Die meisten leben im Dickdarm und fressen Ballaststoffe.', 'Aqu\u00ed viven pocas. La mayor\u00eda vive en el intestino grueso y come fibra.'] }
        ],
        muscle: [
            { k: 'fibre', name: ['Muscle fibre', 'Muskelfaser', 'Fibra muscular'], say: ['One long cell. Inside, protein filaments slide past each other to contract.', 'Eine lange Zelle. Innen gleiten Eiwei\u00dff\u00e4den aneinander vorbei, so zieht sie sich zusammen.', 'Una c\u00e9lula larga. Dentro, filamentos de prote\u00edna se deslizan entre s\u00ed para contraerse.'] },
            { k: 'mito', name: ['Mitochondrion', 'Mitochondrium', 'Mitocondria'], say: ['It uses sugar and fat to make ATP, the energy your muscle runs on.', 'Es nutzt Zucker und Fett, um ATP zu bilden, die Energie f\u00fcr deinen Muskel.', 'Usa az\u00facar y grasa para producir ATP, la energ\u00eda de tu m\u00fasculo.'] },
            { k: 'glucose', name: ['Glucose', 'Glukose', 'Glucosa'], say: ['Sugar from your blood. Working muscle takes it in, even with little insulin.', 'Zucker aus deinem Blut. Arbeitende Muskeln nehmen ihn auf, sogar mit wenig Insulin.', 'Az\u00facar de tu sangre. El m\u00fasculo activo lo absorbe incluso con poca insulina.'] }
        ]
    };

    /* where each term and sentence was checked (Oct 23, 2026) */
    const SOURCES = [
        'OpenStax, Anatomy and Physiology 2e (openstax.org): neurons and nerve impulses, alveoli and type I alveolar cells, heart chambers, liver lobule with hepatocyte plates and central vein, pancreatic islets and acinar cells, small intestine villi, skeletal muscle fibres and the sliding filament model, red blood cells and haemoglobin',
        'NIH / NCBI Bookshelf (nih.gov): islet cells (beta cells make insulin, alpha cells glucagon; acinar tissue is most of the pancreas), hepatocytes and glycogen, haemoglobin, mitochondria and ATP',
        'Pancreapedia (pancreapedia.org) and TeachMePhysiology (teachmephysiology.com): islet and acinar cells, enterocytes and absorption into the portal vein',
        'IMAIOS e-Anatomy (imaios.com): trabeculae carneae, the muscle ridges inside both ventricles',
        'PNAS / Diabetes journals: muscle contraction moves GLUT4 to the cell surface and takes up glucose without insulin',
        'Stanford Medicine and Cleveland Clinic: the enteric nervous system (100 to 600 million neurons); most gut bacteria live in the large intestine',
        'Britannica and Wikipedia (cross-check): cardiac notch of the left lung; enterocytes; skeletal muscle fibre as one multinucleated cell'
    ];

    const LI = { en: 0, de: 1, es: 2 };
    const li = (lang) => (typeof lang === 'number' ? lang : (LI[String(lang || 'en').slice(0, 2)] || 0));
    function world(id, lang) {
        const w = WORLDS[id]; if (!w) return null;
        const i = li(lang);
        return { id, place: w.place[i], name: w.name[i] };
    }
    function tags(id, lang) {
        const i = li(lang);
        return (TAGS[id] || []).map(t => ({ k: t.k, name: t.name[i], say: t.say[i] }));
    }
    function tag(id, k, lang) { return tags(id, lang).find(t => t.k === k) || null; }
    /* the nearest candidate that is in front of the camera and on screen, within reach.
       c: [{ k, x, y (screen px), z (NDC depth), d (distance)}], w/h the screen, near = reach in world units */
    function pick(c, w, h, near, pad) {
        pad = pad == null ? 40 : pad;
        let best = null;
        for (const p of c || []) {
            if (!p || !(p.z > -1 && p.z < 1) || !(p.d <= near)) continue;
            if (p.x < pad || p.x > w - pad || p.y < pad || p.y > h - pad) continue;
            if (!best || p.d < best.d) best = p;
        }
        return best;
    }
    return { WORLDS, TAGS, SOURCES, world, tags, tag, pick, li };
});
