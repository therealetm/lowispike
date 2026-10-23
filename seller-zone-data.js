/* Oct 23, 2026 (Eman: "they still want a bag of chips, a chocolate bar, Haribo, biscuits ... give them actual good alternatives they
   would really buy, not 'go grab raspberries'"). The Seller Zone: real snacks you can order online that pass the strict scanner
   standard (data/food-policy/master-knowledge.v3.md). Every product below was checked against its own shop page on 23 Oct 2026
   (ingredients and, where the shop shows it, nutrition per 100 g). Only products that pass are listed; the ones that were checked
   and did not pass are in FAILED with the reason, so nobody adds them back by accident. No affiliate links.
   Rename the section in ONE place: NAME below (Eman may pick a better name). Research list for people: docs/seller-zone-research.md */
(function (W) {
    'use strict';
    if (!W || W.LowiSellerZoneData) return;
    const NAME = { en: 'Seller Zone', de: 'Seller Zone', es: 'Seller Zone' };
    const CHECKED = '2026-10-23';
    /* regions: eu = ships in Germany / EU, uk = United Kingdom, us = USA. The shop's own page decides; Amazon is a search link */
    const CATS = [
        { id: 'chips', e: '\u{1F9C0}', t: { en: 'Chips & crisps', de: 'Chips', es: 'Patatas fritas' } },
        { id: 'choc', e: '\u{1F36B}', t: { en: 'Chocolate', de: 'Schokolade', es: 'Chocolate' } },
        { id: 'gummy', e: '\u{1F36C}', t: { en: 'Gummies & chewy', de: 'Gummis & Kaubares', es: 'Gominolas y masticables' } },
        { id: 'biscuit', e: '\u{1F36A}', t: { en: 'Biscuits & crackers', de: 'Kekse & Cracker', es: 'Galletas y crackers' } },
        { id: 'nuts', e: '\u{1F95C}', t: { en: 'Nuts & on the go', de: 'Nüsse & unterwegs', es: 'Frutos secos y para llevar' } }
    ];
    const L = (en, de, es) => ({ en, de, es });
    const EU = L('Ships in Germany and the EU', 'Lieferung in Deutschland und der EU', 'Envío en Alemania y la UE');
    const DE = L('Ships in Germany', 'Lieferung in Deutschland', 'Envío en Alemania');
    const UK = L('Ships in the UK', 'Lieferung in Großbritannien', 'Envío en Reino Unido');
    const US = L('Ships in the USA', 'Lieferung in den USA', 'Envío en EE. UU.');
    const CHEESE = L('100% cheese, baked crunchy: protein and fat, almost no carbs. Cheese is fine up to about 30 g.',
        '100 % Käse, knusprig gebacken: Eiweiß und Fett, fast keine Kohlenhydrate. Käse ist bis etwa 30 g okay.',
        '100 % queso horneado crujiente: proteína y grasa, casi sin hidratos. El queso va bien hasta unos 30 g.');
    const P30 = L('About 30 g', 'Etwa 30 g', 'Unos 30 g');
    const HANDFUL = L('A handful, about 30 g', 'Eine Handvoll, etwa 30 g', 'Un puñado, unos 30 g');
    const NORI = L('Seaweed, oil and salt. Nori is an everyday food and a pack has almost no carbs.',
        'Algen, Öl und Salz. Nori ist ein Alltagslebensmittel, eine Packung hat fast keine Kohlenhydrate.',
        'Alga, aceite y sal. El nori es de diario y un paquete casi no tiene hidratos.');
    const CACAO = L('100% cacao, no sugar and no sweetener. Bitter, so it calms the craving without a sugar hit. Small portion: still a treat.',
        '100 % Kakao, ohne Zucker und ohne Süßstoff. Herb, stillt die Lust ohne Zuckerschub. Kleine Portion: bleibt ein Genuss.',
        '100 % cacao, sin azúcar ni edulcorante. Amargo, calma el antojo sin subidón de azúcar. Porción pequeña: sigue siendo un capricho.');
    const BILTONG = L('Air-dried beef with vinegar and spices, no sugar. Chewy like a gummy, but protein. Still a processed meat snack, so sometimes.',
        'Luftgetrocknetes Rindfleisch mit Essig und Gewürzen, ohne Zucker. Kaubar wie ein Gummi, aber Eiweiß. Bleibt ein verarbeiteter Fleischsnack, also ab und zu.',
        'Ternera secada al aire con vinagre y especias, sin azúcar. Masticable como una gominola, pero es proteína. Sigue siendo un snack cárnico procesado: de vez en cuando.');
    const P = [
        /* chips & crisps */
        { id: 'cheesies-cheddar', cat: 'chips', e: '\u{1F9C0}', n: 'Cheddar Cheesies', b: 'Cheesies', shop: 'cheesies.co.uk', url: 'https://cheesies.co.uk/products/cheddar-cheesies', r: ['uk'], ships: UK, price: '£16.99', v: 'ja', ing: '100% Cheddar', why: CHEESE, por: P30, amz: 'Cheesies cheddar crunchy cheese' },
        { id: 'mixit-knusperkaese', cat: 'chips', e: '\u{1F9C0}', n: 'Irischer Knusperkäse', b: 'mymuesli / mixit', shop: 'mixit.de', url: 'https://www.mixit.de/produkt/probierset-knusperkase-im-taschenformat-2836', r: ['eu'], ships: DE, price: '6,49 € / 80 g', v: 'ja', ing: '100 % irischer Cheddar (Milch, Salz, Kulturen, Lab)', why: CHEESE, por: P30, amz: 'Knusperkäse 100% Käse' },
        { id: 'mooncheese-cheddar', cat: 'chips', e: '\u{1F9C0}', n: 'Cheddar Believe It', b: 'Moon Cheese', shop: 'mooncheese.com', url: 'https://mooncheese.com/products/cheddar-believe-it-medium', r: ['us'], ships: US, price: '$14.99', v: 'ja', ing: '100% cheddar', why: CHEESE, por: P30, amz: 'Moon Cheese Cheddar' },
        { id: 'kulau-nori', cat: 'chips', e: '\u{1F33F}', n: 'Bio Nori Snack Sea Salt', b: 'KULAU', shop: 'kulau.de', url: 'https://www.kulau.de/KULAU-Bio-Nori-Snack-Sea-Salt-4-g', r: ['eu'], ships: DE, v: 'ja', ing: 'Geröstete Nori-Algen (47 %), Sonnenblumenöl, Meersalz (3 %), Bio', why: NORI, por: L('One 4 g pack', 'Eine 4-g-Packung', 'Un paquete de 4 g'), amz: 'Nori Snack Meersalz Bio' },
        { id: 'gimme-seasalt', cat: 'chips', e: '\u{1F33F}', n: 'Sea Salt Roasted Seaweed Snacks', b: 'gimMe', shop: 'gimmesnacks.com', url: 'https://gimmesnacks.com/products/grab-go-sea-salt-seaweed-snacks', r: ['us'], ships: US, price: '$5.49', v: 'ja', ing: 'Seaweed, sunflower oil, sea salt (organic)', why: NORI, por: L('One pack', 'Eine Packung', 'Un paquete'), amz: 'gimMe seaweed snacks sea salt' },
        { id: 'gimme-avocado', cat: 'chips', e: '\u{1F33F}', n: 'Avocado Oil Roasted Seaweed Snacks', b: 'gimMe', shop: 'gimmesnacks.com', url: 'https://gimmesnacks.com/products/grab-go-avocado-oil-seaweed-snacks', r: ['us'], ships: US, price: '$5.49', v: 'ja', ing: 'Seaweed, avocado oil, sea salt (organic)', why: NORI, por: L('One pack', 'Eine Packung', 'Un paquete'), amz: 'gimMe seaweed avocado oil' },
        /* chocolate */
        { id: 'koro-nibs', cat: 'choc', e: '\u{1F36B}', n: 'Bio Fairtrade Kakaonibs', b: 'KoRo', shop: 'korodrogerie.de', url: 'https://www.korodrogerie.de/bio-fairtrade-kakaonibs-500-g', r: ['eu'], ships: EU, price: '21,75 € / 500 g', v: 'selten', ing: '100 % Kakaobohnen (Bio)', why: L('Crushed cacao beans: 2 g sugar and 27 g fibre per 100 g, no sweetener. Chocolate taste with crunch. Sprinkle a spoon on yoghurt or eat a pinch.', 'Zerkleinerte Kakaobohnen: 2 g Zucker und 27 g Ballaststoffe pro 100 g, kein Süßstoff. Schoko-Geschmack mit Biss. Einen Löffel auf Joghurt oder eine Prise pur.', 'Cacao troceado: 2 g de azúcar y 27 g de fibra por 100 g, sin edulcorante. Sabor a chocolate crujiente. Una cucharada sobre yogur o un pellizco solo.'), por: L('1 tablespoon, about 10 g', '1 Esslöffel, etwa 10 g', '1 cucharada, unos 10 g'), amz: 'Kakaonibs Bio' },
        { id: 'pacari-raw100', cat: 'choc', e: '\u{1F36B}', n: 'Raw 100% Cacao', b: 'Pacari', shop: 'paccari.com', url: 'https://paccari.com/es/en/producto/raw-100-cacao/', r: ['eu'], ships: L('EU shop (Spain)', 'EU-Shop (Spanien)', 'Tienda UE (España)'), v: 'selten', ing: 'Organic cocoa mass and cocoa butter (Arriba Nacional)', why: CACAO, por: L('2 squares, about 10 g', '2 Stückchen, etwa 10 g', '2 onzas, unos 10 g'), amz: 'Pacari Raw 100% cacao' },
        { id: 'lindt-100', cat: 'choc', e: '\u{1F36B}', n: 'Excellence 100% Cocoa', b: 'Lindt', shop: 'lindtusa.com', url: 'https://www.lindtusa.com/100-percent-cocoa-dark-chocolate-excellence-bar-394002', r: ['us'], ships: US, v: 'selten', ing: 'Chocolate, cocoa powder, cocoa butter', why: CACAO, por: L('2 squares, about 10 g', '2 Stückchen, etwa 10 g', '2 onzas, unos 10 g'), amz: 'Lindt Excellence 100% cocoa' },
        /* gummies: none passes; chewy instead */
        { id: 'northern-biltong', cat: 'gummy', e: '\u{1F969}', n: 'Biltong Original', b: 'Northern Biltong', shop: 'northernbiltong.de', url: 'https://northernbiltong.de/products/biltong-original', r: ['eu'], ships: DE, price: '11,60 € / 100 g', v: 'selten', ing: 'Rindfleisch, Rotweinessig, Siedesalz, Pfeffer, Koriandersamen', why: BILTONG, por: P30, amz: 'Biltong ohne Zucker' },
        { id: 'grizzly-biltong', cat: 'gummy', e: '\u{1F969}', n: 'Biltong Classic', b: 'Grizzly Foods', shop: 'grizzlyfoods.de', url: 'https://grizzlyfoods.de/products/biltong-classic', r: ['eu'], ships: DE, price: '3,49 €', v: 'selten', ing: 'Nur Rindfleisch, Essig & Gewürze', why: BILTONG, por: L('One pack', 'Eine Packung', 'Un paquete'), amz: 'Biltong Classic' },
        { id: 'koro-coco', cat: 'gummy', e: '\u{1F965}', n: 'Bio Kokoschips ohne Zuckerzusatz', b: 'KoRo', shop: 'korodrogerie.de', url: 'https://www.korodrogerie.de/bio-kokoschips-ohne-zuckerzusatz-1-kg', r: ['eu'], ships: EU, price: '13,50 € / 1 kg', v: 'selten', ing: '100 % Kokosnuss (Bio)', why: L('Only coconut, no added sugar: 9 g carbs per 100 g. Sweet-ish and chewy-crunchy. Lots of saturated fat, so a small handful.', 'Nur Kokos, ohne Zuckerzusatz: 9 g Kohlenhydrate pro 100 g. Leicht süßlich, zäh-knusprig. Viel gesättigtes Fett, also eine kleine Handvoll.', 'Solo coco, sin azúcar añadido: 9 g de hidratos por 100 g. Dulzón y crujiente. Mucha grasa saturada: un puñado pequeño.'), por: L('A small handful, about 15 g', 'Eine kleine Handvoll, etwa 15 g', 'Un puñado pequeño, unos 15 g'), amz: 'Kokoschips ungesüßt Bio' },
        /* biscuits & crackers */
        { id: 'flackers-cheeze', cat: 'biscuit', e: '\u{1F36A}', n: 'Cheeze-Pleaze Multi Seed Crackers', b: 'Flackers', shop: 'flackers.com', url: 'https://flackers.com/products/cheeze-pleaze-multi-seed-crackers', r: ['us'], ships: US, price: '$6.99', v: 'selten', ing: 'Flax, sunflower, pepitas, chia, hemp, nutritional yeast, sea salt, garlic, spices', why: L('Crackers made only of seeds: no flour, no sugar. Lots of fibre. Still a packaged cracker, so sometimes.', 'Cracker nur aus Saaten: kein Mehl, kein Zucker. Viele Ballaststoffe. Bleibt ein Packungs-Cracker, also ab und zu.', 'Crackers solo de semillas: sin harina ni azúcar. Mucha fibra. Sigue siendo un cracker envasado: de vez en cuando.'), por: L('A few crackers, about 30 g', 'Ein paar Cracker, etwa 30 g', 'Unos crackers, unos 30 g'), amz: 'Flackers flax seed crackers' },
        /* nuts & on the go */
        { id: 'koro-almonds', cat: 'nuts', e: '\u{1F95C}', n: 'Geröstete & gesalzene Mandeln', b: 'KoRo', shop: 'korodrogerie.de', url: 'https://www.korodrogerie.de/geroestete-und-gesalzene-mandeln-1-kg', r: ['eu'], ships: EU, price: '17,50 € / 1 kg', v: 'ja', ing: '98,7 % Mandeln, Salz, Gummi arabicum', why: L('Almonds and salt: 10 g carbs and 20 g protein per 100 g. Crunchy and salty like chips.', 'Mandeln und Salz: 10 g Kohlenhydrate und 20 g Eiweiß pro 100 g. Knusprig und salzig wie Chips.', 'Almendras y sal: 10 g de hidratos y 20 g de proteína por 100 g. Crujientes y saladas como patatas.'), por: HANDFUL, amz: 'Mandeln geröstet gesalzen' },
        { id: 'koro-tamari', cat: 'nuts', e: '\u{1F95C}', n: 'Tamari-Mandeln', b: 'KoRo', shop: 'korodrogerie.de', url: 'https://www.korodrogerie.de/tamari-mandeln-1-kg', r: ['eu'], ships: EU, price: '25,50 € / 1 kg', v: 'ja', ing: '91 % Mandeln, 9 % Tamari (Wasser, Soja, Salz, Alkohol)', why: L('Almonds roasted in soy sauce, no sugar. Savoury like a party snack.', 'Mandeln in Sojasauce geröstet, ohne Zucker. Würzig wie ein Partysnack.', 'Almendras tostadas con salsa de soja, sin azúcar. Sabrosas como un snack de fiesta.'), por: HANDFUL, amz: 'Tamari Mandeln' },
        { id: 'koro-pistachio', cat: 'nuts', e: '\u{1F95C}', n: 'Geröstete & gesalzene Pistazienkerne', b: 'KoRo', shop: 'korodrogerie.de', url: 'https://www.korodrogerie.de/geroestete-und-gesalzene-pistazienkerne-1-kg', r: ['eu'], ships: EU, price: '22,50 € / 1 kg', v: 'ja', ing: '99 % Pistazien, 1 % Salz', why: L('Pistachios and salt, nothing else. Protein and fibre keep the curve flat.', 'Pistazien und Salz, sonst nichts. Eiweiß und Ballaststoffe halten die Kurve flach.', 'Pistachos y sal, nada más. Proteína y fibra mantienen la curva plana.'), por: HANDFUL, amz: 'Pistazienkerne geröstet gesalzen' },
        { id: 'koro-macadamia', cat: 'nuts', e: '\u{1F95C}', n: 'Geröstete & gesalzene Bio Macadamiakerne', b: 'KoRo', shop: 'korodrogerie.de', url: 'https://www.korodrogerie.de/geroestete-und-gesalzene-bio-macadamiakerne-500-g', r: ['eu'], ships: EU, price: '22,50 € / 500 g', v: 'ja', ing: '98,6 % Macadamia (Bio), 1,4 % Salz', why: L('Macadamias and salt: rich and buttery, a cookie-like treat with almost no sugar.', 'Macadamias und Salz: buttrig und reichhaltig, fast wie ein Keks, mit kaum Zucker.', 'Macadamias y sal: mantecosas, casi como una galleta, con muy poco azúcar.'), por: L('A small handful, about 20 g', 'Eine kleine Handvoll, etwa 20 g', 'Un puñado pequeño, unos 20 g'), amz: 'Macadamia geröstet gesalzen' }
    ];
    /* checked on 23 Oct 2026 and NOT passing the strict standard: stays out of the zone */
    const FAILED = [
        { n: 'KoRo Bio-Süßkartoffelchips (100 % Süßkartoffel)', url: 'https://www.korodrogerie.de/bio-suesskartoffelchips-ohne-zusatz-von-oel-und-salz-200-g', why: L('Only sweet potato, but dried it is 72 g carbs and 33 g sugar per 100 g: a starch and sugar snack.', 'Nur Süßkartoffel, aber getrocknet sind es 72 g Kohlenhydrate und 33 g Zucker pro 100 g: ein Stärke- und Zucker-Snack.', 'Solo boniato, pero seco tiene 72 g de hidratos y 33 g de azúcar por 100 g: un snack de almidón y azúcar.') },
        { n: 'Flackers Maple Multi Seed Crackers', url: 'https://flackers.com/products/maple-multi-seed-crackers', why: L('Maple syrup and lucuma: added sugar.', 'Ahornsirup und Lucuma: zugesetzter Zucker.', 'Sirope de arce y lúcuma: azúcar añadido.') },
        { n: 'Flackers Spicy Chili Lime', url: 'https://flackers.com/products/6-pack-spicy-chili-lime-multi-seed-crackers', why: L('Contains maltodextrin.', 'Enthält Maltodextrin.', 'Contiene maltodextrina.') },
        { n: L('Sugar-free gummies (e.g. SmartSweets, "zero" gummies)', 'Zuckerfreie Gummis (z. B. SmartSweets, „zero“-Gummis)', 'Gominolas sin azúcar (p. ej. SmartSweets, "zero")'), why: L('Sweeteners and fibre syrups instead of sugar: not standard choices in the scanner rules.', 'Süßstoffe und Ballaststoffsirup statt Zucker: laut Scanner-Regeln keine Standardwahl.', 'Edulcorantes y siropes de fibra en vez de azúcar: no son opciones estándar según las reglas del escáner.') },
        { n: L('Dark chocolate 85–90%', 'Zartbitter 85–90 %', 'Chocolate negro 85–90 %'), why: L('Still has added sugar. Only 100% cacao passes.', 'Hat immer noch zugesetzten Zucker. Nur 100 % Kakao besteht.', 'Aún lleva azúcar añadido. Solo pasa el 100 % cacao.') },
        { n: L('Keto / low-carb chocolate, cookies and brownies', 'Keto-/Low-Carb-Schokolade, -Kekse und -Brownies', 'Chocolate, galletas y brownies keto / low carb'), why: L('Sweeteners (erythritol, stevia, maltitol) and refined flours or starches: health halo, not a pass.', 'Süßstoffe (Erythrit, Stevia, Maltit) und Auszugsmehle oder Stärke: Gesundheits-Heiligenschein, kein Bestehen.', 'Edulcorantes (eritritol, stevia, maltitol) y harinas o almidones refinados: halo saludable, no pasa.') }
    ];
    /* honest notes per category: what a craving gets when no product of that kind passes */
    const NOTE = {
        gummy: L('No gummy candy passed: every one has sugar or sweeteners. Chewy instead: biltong, or coconut chips.', 'Kein Fruchtgummi hat bestanden: alle haben Zucker oder Süßstoff. Zum Kauen stattdessen: Biltong oder Kokoschips.', 'Ninguna gominola pasó: todas llevan azúcar o edulcorante. Para masticar: biltong o chips de coco.'),
        biscuit: L('No sweet biscuit, cookie or brownie passed. Savoury seed crackers did; for a sweet bite take 100% cacao or macadamias.', 'Kein süßer Keks und kein Brownie hat bestanden. Saaten-Cracker schon; für etwas Süßes: 100 % Kakao oder Macadamias.', 'Ninguna galleta dulce ni brownie pasó. Los crackers de semillas sí; para algo dulce: cacao 100 % o macadamias.'),
        choc: L('Only 100% cacao passes: no sugar, no sweetener.', 'Nur 100 % Kakao besteht: kein Zucker, kein Süßstoff.', 'Solo pasa el cacao 100 %: sin azúcar ni edulcorante.'),
        chips: L('Sweet potato chips did not pass (72 g carbs per 100 g). Cheese crisps and seaweed did.', 'Süßkartoffelchips haben nicht bestanden (72 g Kohlenhydrate pro 100 g). Käse-Chips und Algen schon.', 'Las chips de boniato no pasaron (72 g de hidratos por 100 g). Las de queso y alga sí.')
    };
    /* product photos: one per product, from the image on its own shop page (the page the card links to), 23 Oct 2026.
       Stored in the repo as small square webp files (seller-zone-img/<id>.webp, 400 px, about 15 KB), never hotlinked.
       PIC_FROM keeps where each photo came from. A product without a photo shows its emoji bubble instead. */
    const PIC_DIR = 'seller-zone-img/';
    const PIC_FROM = {
        'cheesies-cheddar': 'https://www.cheesies.co.uk/cdn/shop/products/4.jpg',
        'mixit-knusperkaese': 'https://img.mix.it/product/da0f7407-fadd-4c86-8f5d-b08f1bffcf24/jpeg_llg-854834bc627024835dfdfe07ba613d33.jpeg',
        'mooncheese-cheddar': 'https://mooncheese.com/cdn/shop/files/mediumcheddar3packcopy.jpg',
        'kulau-nori': 'https://www.kulau.de/media/image/product/620/lg/kulau-bio-nori-snack-sea-salt-4-g.jpg',
        'gimme-seasalt': 'https://gimmeseaweed.com/cdn/shop/files/gimme2026-product-gg-sea-salt.webp',
        'gimme-avocado': 'https://gimmeseaweed.com/cdn/shop/files/gimme2026-product-gg-avocado-oil.webp',
        'koro-nibs': 'https://koro.imgix.net/media/a5/98/72/1761144655/KAKAO_017_MAIN.jpg',
        'pacari-raw100': 'https://paccari.com/es/wp-content/uploads/2025/10/7862109270080-BARRA-RAW-100_-TIRO-scaled-e1766004449129-485x1024.webp',
        'lindt-100': 'https://www.lindtusa.com/media/catalog/product/f/4/f4b8bfcf0ad27e610877c2c1f5fe3c41e6e8a93a68e6be2428da330c8ed9e267.jpeg',
        'northern-biltong': 'https://www.northernbiltong.de/cdn/shop/files/Nothern-Biltong_Produktshooting_Original_100g_Packshot.jpg',
        'grizzly-biltong': 'https://grizzlyfoods.de/cdn/shop/files/single-bcl-30.jpg',
        'koro-coco': 'https://koro.imgix.net/media/5c/3a/65/1646342562/KOKOS_039_01hjqcwnRgElQUJ.jpg',
        'flackers-cheeze': 'https://flackers.com/cdn/shop/files/flackers_mutliseed_cheezepleazefront_1024x1024.png',
        'koro-almonds': 'https://koro.imgix.net/media/06/50/9a/1747072197/MAND_014_MAIN.jpg',
        'koro-tamari': 'https://koro.imgix.net/media/ce/10/7a/1646340734/MAND_022_01.jpg',
        'koro-pistachio': 'https://koro.imgix.net/media/c2/ea/34/1646338978/PIS_002_011.jpg',
        'koro-macadamia': 'https://koro.imgix.net/media/ae/da/7c/1649250231/MACA_010-01.jpg'
    };
    P.forEach(function (x) { if (PIC_FROM[x.id]) x.pic = PIC_DIR + x.id + '.webp'; });
    W.LowiSellerZoneData = { NAME, CHECKED, CATS, P, FAILED, NOTE, PIC_DIR, PIC_FROM };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
