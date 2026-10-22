/* Oct 17, 2026 (E-man, grocery shopping: "I would love a little emergency button ... based on the products that
   are actually out there within my location or within the store that I'm buying right now ... see all the snacks that I can
   buy in the shop, all the meat ... all the bread" and "even before entering the shop, be able to see every product that I can
   buy if I only eat insulin-friendly food, every product. In all categories ... sweets, if there is any").

   Pure logic for the store picks list (store-picks.js draws it). Products come from data/shop/<range>.json, built from real
   ranges by tools/shop-data/build.py. Every product is rated with one formula from its label:

     serving   = a typical portion for its food group (100 g meat, 30 g cheese, 40 g bread, 250 ml drink ...)
     carbs     = label carbohydrate per 100 g x serving / 100   (EU labels already list fibre separately)
     GI (est.) = a base for the food group, lowered by fibre, protein and fat (they slow the sugar down), 20 to 90
     GL        = carbs x GI / 100   (glycemic load of one serving)
     passes    = GL <= 5 and sugar <= 6 g per serving      best = GL <= 2

   Labels give carbs, sugar, fibre, protein and fat; the GI is an estimate, so the GL is an estimate made from real label data. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiStorePicksCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const LIMIT = { gl: 5, best: 2, sugar: 6 };

    /* food groups in the order the list shows them; serving in g (ml for drinks), GI base before fibre/protein/fat */
    const GROUPS = [
        { id: 'snacks', serve: 30, gi: 55, ic: '\u{1F95C}', en: 'Snacks & nuts', de: 'Snacks & Nüsse', es: 'Snacks y frutos secos' },
        { id: 'meat', serve: 100, gi: 50, ic: '\u{1F969}', en: 'Meat & cold cuts', de: 'Fleisch & Aufschnitt', es: 'Carne y embutidos' },
        { id: 'fish', serve: 100, gi: 50, ic: '\u{1F41F}', en: 'Fish & seafood', de: 'Fisch & Meeresfrüchte', es: 'Pescado y marisco' },
        { id: 'dairy', serve: 150, gi: 35, ic: '\u{1F95B}', en: 'Dairy & eggs', de: 'Milchprodukte & Eier', es: 'Lácteos y huevos' },
        { id: 'cheese', serve: 30, gi: 35, ic: '\u{1F9C0}', en: 'Cheese', de: 'Käse', es: 'Queso' },
        { id: 'veg', serve: 100, gi: 35, ic: '\u{1F966}', en: 'Vegetables', de: 'Gemüse', es: 'Verduras' },
        { id: 'fruit', serve: 100, gi: 40, ic: '\u{1F353}', en: 'Fruit & berries', de: 'Obst & Beeren', es: 'Fruta y bayas' },
        { id: 'bread', serve: 40, gi: 70, ic: '\u{1F35E}', en: 'Bread & crispbread', de: 'Brot & Knäcke', es: 'Pan y tostadas' },
        { id: 'sweets', serve: 25, gi: 65, ic: '\u{1F36B}', en: 'Sweets, chocolate & ice cream', de: 'Süßes, Schokolade & Eis', es: 'Dulces, chocolate y helado' },
        { id: 'drinks', serve: 250, gi: 65, ic: '\u{1F964}', en: 'Drinks', de: 'Getränke', es: 'Bebidas' },
        { id: 'pantry', serve: 50, gi: 65, ic: '\u{1F96B}', en: 'Pantry, sauces & spreads', de: 'Vorrat, Soßen & Aufstriche', es: 'Despensa, salsas y untables' },
        { id: 'meals', serve: 300, gi: 60, ic: '\u{1F372}', en: 'Ready meals', de: 'Fertiggerichte', es: 'Platos preparados' },
        { id: 'other', serve: 50, gi: 60, ic: '\u{1F6D2}', en: 'Other', de: 'Sonstiges', es: 'Otros' }
    ];
    const G = {};
    GROUPS.forEach(g => { G[g.id] = g; });

    const has = (s, re) => re.test(s);
    /* Salling (Danish shop path "Kød & fisk > Fisk & skaldyr > Laks"): mapped by its own aisles */
    function groupDK(path, name) {
        const seg = String(path).split(' > '), s0 = seg[0], s1 = seg[1] || '', s2 = seg[2] || '';
        const n = String(name || '').toLowerCase();
        if (s0 === 'Drikkevarer') return 'drinks';
        if (s0 === 'Slik & snacks') return /Chips, nødder|Tørret frugt/.test(s1) ? 'snacks' : 'sweets';
        if (s0 === 'Frugt & grønt') return s1 === 'Frugt' ? 'fruit' : 'veg';
        if (s0 === 'Kød & fisk') return s1 === 'Fisk & skaldyr' ? 'fish' : (s1 === 'Alternativer til kød' ? 'veg' : 'meat');
        if (s0 === 'Brød & kager') return (s1 === 'Kager' || s2 === 'Bagerens kager' || s2 === 'Kiks') ? 'sweets' : 'bread';
        if (s0 === 'Frost') {
            if (s1 === 'Brød & kager') return /Kager|Æbleskiver/.test(s2) ? 'sweets' : 'bread';
            if (s1 === 'Frugt & bær') return 'fruit';
            if (s1 === 'Færdigretter på frost') return 'meals';
            if (s1 === 'Grøntsager' || s1 === 'Kartofler & pommes frites') return 'veg';
            if (s1 === 'Is') return 'sweets';
            if (s1 === 'Kød & fisk') return s2 === 'Fisk & skaldyr' ? 'fish' : 'meat';
            return 'other';
        }
        if (s0 === 'Kolonial') {
            if (s1 === 'Færdigretter & supper') return 'meals';
            if (s1 === 'Nødder, kerner & frø') return 'snacks';
            if (s2 === 'Fiskekonserves') return 'fish';
            if (s2 === 'Kødkonserves') return 'meat';
            if (/Konserveret frugt & grønt|Bønner|Oliven|Kikærter|Veganske/.test(s2)) return 'veg';
            if (/^Desserter$|Kageblandinger|Pålægschokolade|chokoladesmørepålæg/.test(s2)) return 'sweets';
            return 'pantry';
        }
        if (s0 === 'Mad fra hele verden') {
            if (s2 === 'Nachos & tortillachips') return 'snacks';
            if (s2 === 'Tofu') return 'veg';
            if (s2 === 'Tortillas & tacoskaller') return 'bread';
            return 'pantry';
        }
        if (s0 === 'Mejeri & køl') {
            if (s1 === 'Bacon, pølser & toppings') return 'meat';
            if (s1 === 'Færdigretter på køl') return 'meals';
            if (s1 === 'Mejeri') {
                if (s2 === 'Ost') return 'cheese';
                if (s2 === 'Dessert & snacks') return 'sweets';
                if (s2 === 'Kolde kaffedrikke & kakao') return 'drinks';
                return 'dairy';
            }
            if (s1 === 'Pålæg') return s2 === 'Fiskepålæg' ? 'fish' : (s2 === 'Plantebaseret pålæg' ? 'veg' : 'meat');
            if (s1 === 'Tapas & specialiteter') return /Specialpålæg|Specialpølser/.test(s2) ? 'meat' : (/Oliven/.test(s2) ? 'veg' : 'pantry');
            if (s1 === 'Æg & gær') return s2 === 'Gær' ? 'pantry' : 'dairy';
            return 'pantry';
        }
        return /æg\b/.test(n) ? 'dairy' : 'other';
    }
    /* Open Food Facts category tags ("dairies|cheeses|hard-cheeses"), most telling first */
    function groupOFF(tags, name) {
        const t = '|' + String(tags || '').toLowerCase() + '|', n = String(name || '').toLowerCase();
        const any = re => re.test(t);
        /* shopper-made tags are sometimes wrong; a clear product name wins */
        if (/\b(salami|schinken|bresaola|prosciutto|speck|leberwurst|fleischwurst|mettwurst|bratwurst|wiener würstchen|aufschnitt)\b/.test(n) && !/vegan|vegetar/.test(n)) return 'meat';
        if (/(käse|gouda|emmentaler|parmesan|grana padano|mozzarella|camembert|feta|harzer|maasdamer|cheddar)/.test(n) && !/kuchen|torte|cracker|brot|chips/.test(n)) return 'cheese';
        if (/\b(eier|eggs|œufs)\b/.test(n) && !/nudel|likör|salat|schoko/.test(n)) return 'dairy';
        if (any(/alcoholic|\|wines|\|beers|spirits|liqueurs/)) return null;
        if (any(/baby-foods|food-supplements|dietary-supplements|pet-food/)) return null;
        if (any(/\|cheeses|-cheeses\||cheese\|/)) return 'cheese';
        if (any(/yogurts|\|milks|-milks\||\|eggs|\|butters|creams\||\|quarks|skyrs|kefir|fermented-milk|dairy-desserts/) && !any(/ice-creams|chocolates/)) return 'dairy';
        if (any(/confectioner|chocolates|candies|\|sweets|biscuits|cakes|ice-creams|frozen-desserts|pastries|sweet-spreads|cocoa-and-chocolate|gummies|\|desserts\|/)) return 'sweets';
        if (any(/\|breads|crispbreads|-breads\||\|rolls|toasts|rusks|wraps\||tortillas/)) return 'bread';
        if (any(/fishes|seafood|\|fish|tunas|salmons|herrings|mackerels|sardines|shrimps|prawns/)) return 'fish';
        if (any(/\|meats|-meats\||poultry|sausages|hams|bacon|salamis|chicken|beef|pork/)) return 'meat';
        if (any(/salty-snacks|\|nuts|-nuts\||nuts-and|\|seeds|-seeds\||crisps|chips|popcorn|\|bars|cereal-bars|protein-bars|\|snacks\|/)) return 'snacks';
        if (any(/beverages|getranke|drinks|waters|juices|safte|sodas|nectars|teas\||coffees/) && !any(/coffee-beans|ground-coffee/)) return 'drinks';
        if (any(/\|vegetables|-vegetables\||leaf-vegetables|salads|legumes|mushrooms|tofu|olives|pulses|herbs|potatoes|asparagus|cabbages|sauerkraut/)) return 'veg';
        if (any(/\|fruits\||fresh-fruits|berries|apples|bananas|citrus|\|pears|grapes|kiwis/) && !any(/dried|jams|juices|compotes|yogurts|vinegars/)) return 'fruit';
        if (any(/\|meals|pizzas|soups|sandwiches|prepared-|lasagne|ready/)) return 'meals';
        if (any(/cereals|pastas|rices|\|rice|sauces|condiments|spreads|oils|fats|groceries|flours|sugars|honeys|jams|spices|vinegars|dressings|mustards|ketchup|canned/)) return 'pantry';
        if (any(/vegetables-based|fruits-and-vegetables/)) return 'veg';
        if (/\b(thunfisch|lachs|hering|makrele|sardinen|forelle|garnelen)\b/.test(n)) return 'fish';
        return 'other';
    }
    function groupOf(path, name) {
        const p = String(path || '');
        return / > /.test(p) || /^(Drikkevarer|Kolonial|Frost|Brød & kager|Slik & snacks|Mejeri & køl|Kød & fisk|Frugt & grønt|Mad fra hele verden)$/.test(p) ? groupDK(p, name) : groupOFF(p, name);
    }

    /* typical values per 100 g for fresh food sold without a label online (marked "typical" in the list) */
    const TYPICAL = [
        [/agurk|gurke/, 2.5, 1.7, 0.7, 0.7, 0.1], [/cherrytomat|tomat/, 3, 2.6, 1.2, 0.9, 0.2], [/rucola|salat|spinat|spinach|feldsalat/, 1.5, 0.8, 1.6, 2, 0.3],
        [/broccoli|brokkoli/, 2.5, 1.7, 2.6, 2.8, 0.4], [/blomkål|blumenkohl/, 2.5, 2, 2, 1.9, 0.3], [/squash|zucchini|courgette/, 2.5, 2, 1, 1.2, 0.3],
        [/champignon|svamp|pilze/, 0.5, 0.3, 1.5, 3, 0.3], [/avocado/, 1.9, 0.7, 6.7, 2, 15], [/aubergine/, 3, 2.8, 3, 1, 0.2],
        [/grønkål|grünkohl|kale/, 2, 1.7, 4, 4, 0.9], [/spidskål|hvidkål|rosenkål|kål\b|kohl/, 4, 3.5, 2.5, 1.5, 0.2], [/asparges|spargel/, 2, 1.5, 2, 2.2, 0.1],
        [/peberfrugt|paprika/, 5, 4, 1.8, 1, 0.3], [/bladselleri|selleri|sellerie/, 2, 1.5, 1.6, 0.7, 0.2], [/radise|radies/, 2, 1.9, 1.6, 0.7, 0.1],
        [/bønner|bohnen/, 4, 2, 3, 1.8, 0.2], [/porre|lauch/, 6, 3, 2, 1.5, 0.3], [/løg\b|zwiebel/, 7, 5, 1.7, 1.1, 0.1], [/gulerod|gulerødder|karotte|möhre/, 7, 5, 2.8, 0.9, 0.2],
        [/persille|basilikum|dild|purløg|koriander|krydderurt|mynte|kräuter/, 1, 0.5, 3, 3, 0.6],
        [/hindbær|himbeer/, 5, 4.4, 6.5, 1.2, 0.7], [/brombeer|brombe?r|brombær/, 5, 4.9, 5.3, 1.4, 0.5], [/jordbær|erdbeer/, 6, 5, 2, 0.7, 0.3],
        [/blåbær|heidelbeer|blaubeer/, 10, 9, 2.4, 0.7, 0.3], [/citron|lime|zitrone/, 3, 2.5, 2.8, 1, 0.3], [/æble|æbler|apfel/, 11, 10, 2.4, 0.3, 0.2],
        [/pære|birne/, 11, 9, 3, 0.4, 0.1], [/appelsin|orange|mandarin|klementin/, 8, 8, 2, 0.9, 0.1], [/kiwi/, 10, 9, 3, 1.1, 0.5],
        [/banan/, 20, 17, 2.6, 1.1, 0.3], [/vindruer|druer|trauben/, 16, 16, 0.9, 0.7, 0.2], [/mango/, 13, 12, 1.6, 0.8, 0.4], [/ananas/, 12, 10, 1.4, 0.5, 0.1],
        [/kartof|kartoffel/, 15, 0.8, 1.8, 2, 0.1], [/søde kartofler|batat/, 17, 4, 3, 1.6, 0.1]
    ];
    function typical(name, group, path) {
        const n = String(name || '').toLowerCase(), p = String(path || '').toLowerCase();
        if (group === 'veg' || group === 'fruit') {
            for (const t of TYPICAL) if (t[0].test(n)) return { c: t[1], s: t[2], f: t[3], p: t[4], fat: t[5], typical: true };
            return null;
        }
        /* plain fresh meat and fish carry no carbohydrate; marinated, breaded or mixed products are left unrated */
        if ((group === 'meat' || group === 'fish') && !/marin|panere|paniert|frikadel|farsbrød|paté|postej|leverpostej|dressing|sauce|salat|gratin|burger|nugget|fiskefrikadel|fiskefilet i|rejesalat/.test(n + ' ' + p)) {
            return { c: 0, s: 0, f: 0, p: group === 'fish' ? 20 : 19, fat: group === 'fish' ? 6 : 10, typical: true };
        }
        if (group === 'dairy' && /\bæg\b|æggebakke|øko æg|fritgående|skrabe|eier\b/.test(n)) return { c: 0.7, s: 0.7, f: 0, p: 12.5, fat: 10, typical: true };
        return null;
    }

    /* Oct 18, 2026 (E-man relaying his custom lowiSPIKE GPT and the ebook behind his 55 kg loss: avoid big spikes and high carb
       loads, favour minimally processed, protein-forward, LOW-STARCH food, judge the food and the whole portion, not one nutrient;
       swap fries for crunchy veggie sticks, pasta for zucchini or konjac). An audit of the Lidl list found potato salad, fries,
       crisps, microwave rice, muesli and sweetcorn marked Good (rated as low-GI vegetables or 30 g handfuls), cake, churros and a
       Magnum bar marked Good as a 25 g bite, and zero-sugar colas marked Best like water. These rules close those gaps. */
    const STARCH_NAME = /kartoffel|potato|pommes|frites|\bfries\b|kroket|rösti|gnocchi|chips|crisps|popcorn|\breis|[^p]reis\b|\brice\b|risotto|nudel|spaghetti|\bpenne\b|fusilli|tortellini|ravioli|lasagne|couscous|bulgur|polenta|\bmais\b|zuckermais|maiskolben|sweetcorn|\bcorn\b|müsli|muesli|granola|cornflakes|porridge|haferflocken|\bpasta\b/;
    const STARCH_TAG = /\|potatoes\||prepared-potatoes|potato-(crisps|dishes|salads|purees)|fried-potatoes|\|fries\||frozen-fries|\|rices\||precooked-rices|\|pastas\||breakfast-cereals|\|mueslis|popcorn|canned-corn|sweet-corn|sweetcorn/;
    /* not starchy staples: vegetable and legume swaps, seasonings and sauces that only carry the word */
    const NOT_STARCH = /blumenkohl|cauliflower|brokkoli|broccoli|konjac|konjak|shirataki|zucchini|gemüse-?nudel|linsen|lentil|kichererbse|chickpea|erbse|bohne|\bbean|soja|edamame|kokos|coconut|salami|parmesan|käsli|crispsalat|squash|kürbis|spegepølse|essig|vinegar|reiswein|gewürz|würz|seasoning|sauce|soße|sosse|sugo|pesto|dressing|\bdip\b/;
    const SNACK_STARCH = /chips|crisps|popcorn|tortilla|waffel|waffeln/;
    const CEREAL = /müsli|muesli|granola|cornflakes|porridge|haferflocken|breakfast-cereals|mueslis/;
    /* a slice of cake, a pastry, a pancake or churros is eaten as a portion, not as a 25 g bite (Lebkuchen stay a piece) */
    const CAKE = /kuchen|torte|\bcake|cakes\b|muffin|donut|doughnut|berliner|croissant|plunder|strudel|churros|waffel|waffle|pancake|pfannkuchen|cr[eèê]pe|windbeutel|bienenstich|brownie|tiramisu|eclair|éclair|cheesecake|profiterole/;
    const CAKE_TAG = /\|cakes\||cheesecakes|\|pancakes\||crepes|tiramisu|frozen-cakes/;
    /* chocolate bars whose label is per bar, entered as per 100 g (real chocolate is 400+ kcal per 100 g) */
    const CHOC_BAR = /chocolates|chocolate-candies|bars-covered-with-chocolate/;
    /* sweetened zero / light / energy drinks: no sugar load, but processed, so Good at most; water and plain tea stay Best */
    const SWEETENED_DRINK = /artificially-sweetened|diet-beverages|diet-sodas|energy-drinks|energy drink|sugar.?free|zuckerfrei|ohne zucker|\bzero\b|\blight\b|\bmax\b|\bultra\b|\bcola\b|\blimo|sodas/;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const r1 = v => Math.round(v * 10) / 10;
    const nz = v => (typeof v === 'number' && isFinite(v) ? v : 0);

    /* one product: {n,b,k,c,s,f,p,fat,kcal,u,q,g} -> rating, or {rated:false} when the label has no carbohydrate value */
    function rate(prod) {
        const group = /gavekurv|gave\u00e6ske|isterning|eiswürfel/i.test(String(prod.n)) ? null : groupOf(prod.k, prod.n);
        if (!group) return { group: null, rated: false, skip: true };
        let nu = prod, typ = false;
        if (typeof prod.c !== 'number') {
            const t = typical(prod.n, group, prod.k);
            if (!t) return { group, rated: false };
            nu = t; typ = true;
        }
        /* a label whose carbs, protein and fat cannot add up to its calories is incomplete online: leave it unrated */
        if (!typ && typeof prod.kcal === 'number' && prod.kcal > 80 && (4 * nz(prod.c) + 4 * nz(prod.p) + 9 * nz(prod.fat) + 2 * nz(prod.f)) < prod.kcal * 0.5) return { group, rated: false, incomplete: true };
        /* all zeros on food that cannot be zero (cake mix, bread, cheese ...) is an empty label, not a free food */
        if (!typ && !nz(prod.c) && !nz(prod.p) && !nz(prod.fat) && !nz(prod.kcal) && /sweets|bread|snacks|meals|dairy|cheese|meat|fish/.test(group)) return { group, rated: false, incomplete: true };
        const name = String(prod.n || '').toLowerCase(), tags = '|' + String(prod.k || '').toLowerCase() + '|', txt = name + ' ' + tags;
        /* see CHOC_BAR: a chocolate bar cannot have under 300 kcal per 100 g; the label online is per bar */
        if (!typ && group === 'sweets' && CHOC_BAR.test(tags) && typeof prod.kcal === 'number' && prod.kcal > 0 && prod.kcal < 300) return { group, rated: false, incomplete: true };
        const g = G[group];
        const liquid = prod.u === 'ml' || group === 'drinks';
        let serve = g.serve;
        if (group === 'dairy' && liquid) serve = 200;          /* a glass of milk */
        if (group === 'drinks') serve = 250;
        /* a pudding, mousse or ice cream is eaten by the bowl, not by the 25 g piece (Open Food Facts writes "ice-creams") */
        if (group === 'sweets' && !/frozen-fruits/.test(tags) && /budding|pudding|dessert|mousse|\bis\b|isvaffel|eis\b|ice.?cream|yoghurt|joghurt|skyr|creme|cr\u00e8me/i.test(String(prod.n) + ' ' + String(prod.k))) serve = 125;
        else if (group === 'sweets' && !/lebkuchen|gingerbread|(linsen|reis|mais|dinkel|hirse|quinoa)waffel|cookie|keks|konfekt/.test(name) && (CAKE.test(name) || CAKE_TAG.test(tags))) serve = 80;
        /* starchy staples (see STARCH_NAME): a starchy GI base, and a plate for ready potato, fries, rice or pasta */
        const starch = group !== 'drinks' && (STARCH_NAME.test(name) || STARCH_TAG.test(tags)) && !NOT_STARCH.test(name);
        if (starch) {
            const cv = nz(nu.c);
            if (CEREAL.test(txt)) serve = Math.max(serve, 45);
            else if ((/pommes|frites|\bfries\b|kroket/.test(name) || (!SNACK_STARCH.test(name) && !/potato-crisps|\|crisps\||popcorn|corn-chips/.test(tags))) && cv < 40) serve = Math.max(serve, 150);
        }
        const c = Math.max(0, nz(nu.c)), s = Math.max(0, nz(nu.s)), f = Math.max(0, nz(nu.f)), p = Math.max(0, nz(nu.p)), fat = Math.max(0, nz(nu.fat));
        let base = starch ? Math.max(g.gi, 70) : g.gi;
        /* milk drinks behave like dairy, not like soda */
        if (group === 'drinks' && /mælk|milk|milch|kefir|skyr|protein/.test(String(prod.n + ' ' + prod.k).toLowerCase())) base = 35;
        const gi = Math.round(clamp(base - Math.min(20, 2.5 * f) - Math.min(12, 0.4 * p) - Math.min(10, 0.25 * fat), 20, 90));
        const carbs = c * serve / 100, sugar = s * serve / 100;
        const gl = r1(carbs * gi / 100);
        const pass = gl <= LIMIT.gl && sugar <= LIMIT.sugar;
        const sweetened = group === 'drinks' && SWEETENED_DRINK.test(txt) && !/\|waters\||mineral|wasser|\|teas\||herbal-teas|coffees|kaffee/.test(txt);
        return {
            group, rated: true, typical: typ, serve, unit: liquid ? 'ml' : 'g', gi, gl, carbs: r1(carbs), sugar: r1(sugar),
            protein: r1(p * serve / 100), fibre: r1(f * serve / 100), pass, best: pass && gl <= LIMIT.best && !sweetened, sweetened, starch,
            fail: pass ? '' : (gl > LIMIT.gl ? 'gl' : 'sugar')
        };
    }

    /* the JSON file's rows -> product objects */
    function rows(data) {
        const cols = (data && data.cols) || [];
        return ((data && data.rows) || []).map(r => { const o = {}; cols.forEach((k, i) => { o[k] = r[i]; }); return o; });
    }

    /* Oct 18, 2026 (E-man in Lidl: "a little window next to best. Just like Amazon, so we can actually see ... an image of the
       product"). Photos: tools/shop-data/add-images.py stores the front photo Open Food Facts returned for the barcode in `im`,
       minus the host and ".200.jpg". Only that host and that file shape are accepted, so the data file cannot point anywhere else. */
    const IMG = 'https://images.openfoodfacts.org/images/products/';
    function offFolder(code) {
        const c = String(code);
        return c.length > 8 ? c.slice(0, 3) + '/' + c.slice(3, 6) + '/' + c.slice(6, 9) + '/' + c.slice(9) : c;
    }
    function photo(p, size) {
        const im = p && p.im, g = p && String(p.g || '');
        if (!im || !/^[0-9]+$/.test(g)) return null;
        if (!/^(?:[0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[0-9]+\/|[0-9]+\/)?(?:front|image)[A-Za-z0-9_.-]*$/.test(im)) return null;
        return IMG + (im.indexOf('/') >= 0 ? im : offFolder(g) + '/' + im) + '.' + (size === 400 ? 400 : 200) + '.jpg';
    }
    /* the page a shopper can open for this product: the Open Food Facts page the label came from (or, for the Salling
       range, the OFF page only when OFF has the same barcode with a photo); null when there is no real page to link */
    function link(p, data) {
        const g = p && String(p.g || '');
        if (!/^[0-9]+$/.test(g)) return null;
        const off = /^Open Food Facts/.test(String(data && data.source || ''));
        if (off || (p.im && photo(p))) return { url: 'https://world.openfoodfacts.org/product/' + g, site: 'Open Food Facts' };
        return null;
    }
    /* why a product is Best / Good / left out: the same numbers rate() used, plus the limits */
    function explain(r) {
        if (!r || !r.rated) return null;
        return {
            verdict: r.best ? 'best' : r.pass ? 'good' : r.fail === 'sugar' ? 'sugar' : 'spikes',
            gl: r.gl, gi: r.gi, serve: r.serve, unit: r.unit, carbs: r.carbs, sugar: r.sugar, protein: r.protein, fibre: r.fibre,
            typical: !!r.typical, sweetened: !!r.sweetened, starch: !!r.starch, estimatedGI: true, limits: { best: LIMIT.best, gl: LIMIT.gl, sugar: LIMIT.sugar }
        };
    }

    /* rate a whole range; groups in display order, passing products best first */
    function build(data, opts) {
        opts = opts || {};
        const q = String(opts.q || '').trim().toLowerCase();
        const out = {}, counts = { total: 0, rated: 0, pass: 0, fail: 0, unrated: 0 };
        GROUPS.forEach(g => { out[g.id] = { id: g.id, pass: [], fail: [], unrated: 0 }; });
        const seen = new Set();
        rows(data).forEach(p => {
            const key = (String(p.n || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + String(p.b || '').toLowerCase() + '|' + (p.q || ''));
            if (!p.n || seen.has(key)) return;
            seen.add(key);
            const r = rate(p);
            if (r.skip || !r.group) return;
            if (q && (p.n + ' ' + (p.b || '')).toLowerCase().indexOf(q) < 0) return;
            counts.total++;
            const bucket = out[r.group];
            if (!r.rated) { bucket.unrated++; counts.unrated++; return; }
            counts.rated++;
            const item = { p, r };
            if (r.pass) { bucket.pass.push(item); counts.pass++; } else { bucket.fail.push(item); counts.fail++; }
        });
        const score = it => it.r.gl * 10 - Math.min(30, it.r.protein) * 0.15 - Math.min(10, it.r.fibre) * 0.2 + (it.r.typical ? 0.05 : 0);
        GROUPS.forEach(g => {
            out[g.id].pass.sort((a, b) => score(a) - score(b) || a.p.n.localeCompare(b.p.n));
            out[g.id].fail.sort((a, b) => a.r.gl - b.r.gl || a.p.n.localeCompare(b.p.n));
        });
        return { groups: GROUPS.map(g => out[g.id]), counts };
    }

    /* stores -------------------------------------------------------------------------- */
    function km(a, b) {
        const R = 6371, t = x => x * Math.PI / 180;
        const dLa = t(b.lat - a.lat), dLo = t(b.lon - a.lon);
        const h = Math.sin(dLa / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLo / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }
    function nearest(stores, at, n) {
        return (stores || []).map(s => Object.assign({}, s, { km: km(at, s) })).sort((a, b) => a.km - b.km).slice(0, n || 12);
    }
    /* Oct 22, 2026 (Emmanuel: "it's showing only [my town]. That's mine, the maker's location ... when they click on share my
       location, they should see their address and the nearest grocery shopping options ... Don't make this based on my location,
       the creator"). No shop list, town list or fixed place ships with the app any more. Shops come live from OpenStreetMap around
       the person's own position (or the town or postcode they type), sorted by distance on the phone. Nothing here knows a city. */
    function town(s) {
        if (!s) return '';
        if (s.town) return s.town;
        if (s.addr && /,/.test(s.addr)) return s.addr.split(',').pop().trim().replace(/^\d{4,5}\s+/, '');
        return '';
    }
    /* there is no Føtex in Germany; Føtex, Bilka and Danish Netto share the Salling range */
    function findStore(stores, text) {
        const t = String(text || '').toLowerCase().replace(/foetex|fötex|fotex/g, 'føtex').trim();
        if (!t) return [];
        return (stores || []).filter(s => ((s.brand || '') + ' ' + (s.name || '') + ' ' + (s.addr || '') + ' ' + town(s)).toLowerCase().indexOf(t) >= 0);
    }

    /* which product range a shop from the map belongs to (data/shop/<range>.json); null = no chain data, show the general list */
    const CHAINS = [
        ['salling', /f(?:ø|o|oe)tex|\bbilka\b|salling/],
        ['netto', /\bnetto\b/],
        ['edeka', /\bedeka\b|marktkauf|nah ?(?:&|und) ?gut|\bnp[- ]?markt\b|\bdiska\b|\bspar express\b/],
        ['rewe', /\brewe\b|\bnahkauf\b|\btemma\b/],
        ['lidl', /\blidl\b/], ['aldi', /\baldi\b/], ['kaufland', /\bkaufland\b/], ['penny', /\bpenny\b/], ['famila', /\bfamila\b/]
    ];
    function chainOf(tags, cc) {
        tags = tags || {};
        const txt = [tags.brand, tags.name, tags.operator].filter(Boolean).join(' ').toLowerCase();
        if (!txt) return null;
        const dk = String(tags['addr:country'] || cc || '').toUpperCase() === 'DK';
        for (const c of CHAINS) {
            if (!c[1].test(txt)) continue;
            if (c[0] === 'netto') return dk && !/marken/.test(txt) ? 'salling' : 'netto';
            return c[0];
        }
        return null;
    }
    function addrOf(tags) {
        tags = tags || {};
        const street = [tags['addr:street'] || tags['addr:place'] || '', tags['addr:housenumber'] || ''].join(' ').trim();
        const place = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:suburb'] || '';
        const pl = [tags['addr:postcode'] || '', place].join(' ').trim();
        return { addr: [street, pl].filter(Boolean).join(', '), town: place };
    }
    /* coordinates leave the phone only rounded to about 100 m (3 decimals); distances are worked out here with the exact ones */
    const round3 = x => Math.round(Number(x) * 1000) / 1000;
    const SHOP_KINDS = '^(supermarket|convenience|discount|discounter|grocery|wholesale)$';
    function overpassQuery(at, radius) {
        const r = Math.max(300, Math.min(30000, Math.round(+radius || 2500)));
        return '[out:json][timeout:25];nwr["shop"~"' + SHOP_KINDS + '"](around:' + r + ',' + round3(at.lat) + ',' + round3(at.lon) + ');out center tags 300;';
    }
    function parseShops(json, at, opts) {
        opts = opts || {};
        const out = [];
        ((json && json.elements) || []).forEach(e => {
            const t = e && e.tags || {};
            const lat = typeof e.lat === 'number' ? e.lat : e.center && e.center.lat, lon = typeof e.lon === 'number' ? e.lon : e.center && e.center.lon;
            if (typeof lat !== 'number' || typeof lon !== 'number') return;
            const name = String(t.name || t.brand || '').trim();
            if (!name) return;
            const a = addrOf(t), chain = chainOf(t, opts.cc);
            out.push({ id: 'osm:' + String(e.type || 'n').charAt(0) + e.id, chain, brand: String(t.brand || name).trim(), name, kind: t.shop || '',
                addr: a.addr, town: a.town, lat, lon, km: at ? km(at, { lat, lon }) : null });
        });
        out.sort((a, b) => (a.km || 0) - (b.km || 0) || a.name.localeCompare(b.name));
        /* one shop is often both a point and a building outline on the map: keep the nearer one */
        const kept = [];
        out.forEach(s => { if (!kept.some(k => k.name.toLowerCase() === s.name.toLowerCase() && km(k, s) < 0.06)) kept.push(s); });
        return kept.slice(0, opts.n || 25);
    }
    /* Nominatim's supermarket search (inside a box round the person) -> the same shape as an Overpass answer */
    function nomToElements(arr) {
        return { elements: (Array.isArray(arr) ? arr : []).map(j => {
            const a = j.address || {}, x = j.extratags || {};
            return { type: String(j.osm_type || 'node'), id: j.osm_id, lat: +j.lat, lon: +j.lon, tags: {
                shop: j.type || 'supermarket', name: j.name || x.brand || '', brand: x.brand || '', operator: x.operator || '',
                'addr:street': a.road || a.pedestrian || '', 'addr:housenumber': a.house_number || '', 'addr:postcode': a.postcode || '',
                'addr:city': a.city || a.town || a.village || a.municipality || a.suburb || '', 'addr:country': String(a.country_code || '').toUpperCase() } };
        }).filter(e => isFinite(e.lat) && isFinite(e.lon)) };
    }
    function viewbox(at, d) {
        const k = Math.max(0.2, Math.cos(at.lat * Math.PI / 180));
        const r = v => Math.round(v * 1000) / 1000;
        return [r(at.lon - d / k), r(at.lat + d), r(at.lon + d / k), r(at.lat - d)].join(',');
    }
    /* Nominatim reverse lookup -> the person's own address, shown as one line */
    function placeOf(j) {
        if (!j || j.error) return null;
        const a = j.address || {};
        const street = [a.road || a.pedestrian || a.footway || a.square || '', a.house_number || ''].join(' ').trim();
        const city = a.city || a.town || a.village || a.municipality || a.suburb || a.county || '';
        const pl = [a.postcode || '', city].join(' ').trim();
        const line = [street, pl].filter(Boolean).join(', ') || String(j.display_name || '').split(',').slice(0, 3).join(',').trim();
        const lat = +j.lat, lon = +j.lon;
        return { line, city, cc: String(a.country_code || '').toUpperCase(), lat: isFinite(lat) ? lat : null, lon: isFinite(lon) ? lon : null };
    }
    /* Nominatim search for a typed town or postcode -> a place to look around */
    function placeFromSearch(arr) {
        const j = Array.isArray(arr) ? arr[0] : null;
        if (!j || !isFinite(+j.lat) || !isFinite(+j.lon)) return null;
        const p = placeOf(j) || {};
        return { lat: +j.lat, lon: +j.lon, line: p.line || String(j.display_name || ''), city: p.city || '', cc: p.cc || '' };
    }
    /* The live lookups. Free, keyless OpenStreetMap services called from the phone: Nominatim (address, at most one request a
       second, answers kept in memory for this session) and Overpass (shops). Nothing is sent to our server or stored. */
    const NOMINATIM = 'https://nominatim.openstreetmap.org/';
    const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
    const RADII = [3000, 12000];
    const BOXES = [0.012, 0.04, 0.12, 0.4]; /* half-widths in degrees of latitude: about 1.3, 4.5, 13 and 45 km */
    function lookup(fetchImpl, opt) {
        opt = opt || {};
        const f = fetchImpl, memo = {}, gap = opt.gap == null ? 1100 : opt.gap, ms = opt.timeout || 15000;
        let nextNom = 0;
        const wait = () => { const now = Date.now(), w = Math.max(0, nextNom - now); nextNom = Math.max(now, nextNom) + gap; return w ? new Promise(r => setTimeout(r, w)) : Promise.resolve(); };
        function get(url, init, wait) {
            const ac = typeof AbortController === 'function' ? new AbortController() : null;
            const tm = ac ? setTimeout(() => ac.abort(), wait || ms) : 0;
            return Promise.resolve(f(url, Object.assign({ headers: { Accept: 'application/json' } }, init || {}, ac ? { signal: ac.signal } : {})))
                .then(r => { if (!r || !r.ok) throw new Error('http ' + (r && r.status)); return r.json(); })
                .finally(() => { if (tm) clearTimeout(tm); });
        }
        function once(key, make) { if (!memo[key]) memo[key] = make().catch(e => { delete memo[key]; throw e; }); return memo[key]; }
        function nom(path, lang) { return wait().then(() => get(NOMINATIM + path + '&accept-language=' + encodeURIComponent(lang || 'en'))); }
        return {
            address(at, lang) {
                const lat = Math.round(at.lat * 1e4) / 1e4, lon = Math.round(at.lon * 1e4) / 1e4;
                return once('r' + lat + ',' + lon + lang, () => nom('reverse?format=jsonv2&addressdetails=1&zoom=18&lat=' + lat + '&lon=' + lon, lang).then(placeOf));
            },
            search(text, lang) {
                const q = String(text || '').trim().slice(0, 80);
                if (q.length < 2) return Promise.resolve(null);
                return once('s' + q.toLowerCase() + lang, () => nom('search?format=jsonv2&addressdetails=1&limit=1&q=' + encodeURIComponent(q), lang).then(placeFromSearch));
            },
            /* Nearest supermarkets. Nominatim first (fast; a small box round the person, wider until at least six shops), the
               Overpass servers only when Nominatim fails (they can take half a minute when busy). Sorted by distance here. */
            shops(at, cc) {
                const key = 'o' + round3(at.lat) + ',' + round3(at.lon);
                const viaNom = () => {
                    let k = 0;
                    const step = () => nom('search?format=jsonv2&addressdetails=1&extratags=1&bounded=1&limit=40&q=supermarket&viewbox=' + viewbox(at, BOXES[k]), opt.lang || 'en')
                        .then(arr => { const n = Array.isArray(arr) ? arr.length : 0; if (n >= 6 || k >= BOXES.length - 1) return nomToElements(arr); k++; return step(); });
                    return step();
                };
                const one = radius => {
                    let i = 0;
                    const tryNext = () => get(OVERPASS[i], { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Accept: 'application/json' }, body: 'data=' + encodeURIComponent(overpassQuery(at, radius)) }, opt.overpassTimeout || 35000)
                        .catch(e => { if (++i < OVERPASS.length) return tryNext(); throw e; });
                    return tryNext();
                };
                const viaOverpass = () => {
                    let k = 0;
                    const step = () => one(RADII[k]).then(j => { const n = ((j && j.elements) || []).length; if (n >= 6 || k >= RADII.length - 1) return j; k++; return step(); });
                    return step();
                };
                const raw = once(key, () => viaNom().catch(() => viaOverpass()));
                return raw.then(j => parseShops(j, at, { cc }));
            }
        };
    }

    /* the general list: REWE and EDEKA together, for a shop with no chain data (supermarkets mostly carry the same items) */
    const GENERAL = ['rewe', 'edeka'];
    function merge(list) {
        list = (list || []).filter(d => d && Array.isArray(d.rows));
        if (!list.length) return null;
        const cols = list[0].cols || [];
        const rows = [];
        list.forEach(d => {
            const idx = cols.map(c => (d.cols || []).indexOf(c));
            d.rows.forEach(r => rows.push(idx.map(i => (i < 0 ? null : r[i]))));
        });
        return { chain: 'general', general: true, name: list.map(d => d.name).filter(Boolean).join(' · '), country: list[0].country || '',
            source: 'Open Food Facts: products shoppers tagged as sold at ' + list.map(d => d.name).filter(Boolean).join(' and ') + ' in Germany',
            note: list[0].note || '', built: list.map(d => d.built).filter(Boolean).sort().pop() || '', cols, rows, count: rows.length };
    }

    /* Oct 18, 2026 (E-man: "I clicked on cook, and then what can I buy? And the app crashed and sent me back to the beginning").
       The list is shown a page at a time: 15 rows per group when it opens, 40 more per tap, never the whole range in one go
       ("Show all" put up to 1,012 rows of one group, 35,000+ elements and a 510,000 px tall list on the phone at once). */
    const PAGE = { first: 15, more: 40 };
    function page(total, asked) {
        const n = Math.max(0, total | 0), want = Math.max(PAGE.first, asked | 0), show = Math.min(n, want), left = n - show;
        return { show, left, next: Math.min(PAGE.more, left), ask: show + Math.min(PAGE.more, left) };
    }

    /* Oct 19, 2026 (E-man: in Einkaufen a Snacks spot for "Snacks, die ich einkaufen werde", "nicht die schon bereits drin waren").
       A small list of snacks TO BUY. Ticking one = bought: it leaves the list (it is at home now) and waits under "Again?" for one tap
       next time ("du isst jedes Mal die gleiche Paprika"). Pure: every call returns a new list, the page stores it. */
    const SNACK_MAX = 40;
    const snackName = n => String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, 60);
    function snackAdd(list, name, now) {
        list = Array.isArray(list) ? list : [];
        const n = snackName(name), k = n.toLowerCase();
        if (!n) return list;
        now = +now || Date.now();
        const rest = list.filter(i => !(i.got && i.n.toLowerCase() === k));
        if (rest.some(i => !i.got && i.n.toLowerCase() === k)) return list;
        return rest.concat([{ id: 'sn' + now.toString(36) + rest.length, n, at: now, got: 0 }]).slice(-SNACK_MAX);
    }
    function snackGot(list, id, now) {
        return (Array.isArray(list) ? list : []).map(i => i.id === id ? Object.assign({}, i, { got: i.got ? 0 : (+now || Date.now()) }) : i);
    }
    function snackDrop(list, id) { return (Array.isArray(list) ? list : []).filter(i => i.id !== id); }
    /* buy = still to buy (oldest first, the order you added them); again = bought before or snacked lately, newest first, never one already on the list */
    function snackView(list, logged, max) {
        list = Array.isArray(list) ? list : []; max = max || 6;
        const buy = list.filter(i => !i.got), on = new Set(buy.map(i => i.n.toLowerCase())), seen = new Set(), again = [];
        const push = n => { n = snackName(n); const k = n.toLowerCase(); if (!n || on.has(k) || seen.has(k) || again.length >= max) return; seen.add(k); again.push(n); };
        list.filter(i => i.got).sort((a, b) => b.got - a.got).forEach(i => push(i.n));
        (logged || []).forEach(push);
        return { buy, again };
    }

    return { LIMIT, GROUPS, G, groupOf, typical, rate, rows, build, km, nearest, town, findStore, chainOf, addrOf, overpassQuery, parseShops, nomToElements, viewbox, placeOf, placeFromSearch, lookup, GENERAL, merge, photo, link, explain, PAGE, page, SNACK_MAX, snackAdd, snackGot, snackDrop, snackView };
});
