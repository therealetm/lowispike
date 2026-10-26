/* kitchen-game-core.js — the Kitchen game in Cook (Oct 26 2026, Emmanuel: "almost like a kitchen wardrobe... I click on meat, it opens.
   I see all my meat. I click on fruits, it opens... maybe it's a cabinet"; MAYA-HANDOFF 0.19, HANDOFF-kitchen-pantry.md).
   One kitchen = a fridge (meat & fish, yogurt & dairy, eggs & tofu, vegetables) and a cabinet (fruit, bread & grains, snacks & sweets,
   drinks, jars & more). Every entry of lowispike.kitchen.v1 (kitchen-core.js) lands on one shelf: the shelf the person chose (c),
   else the product database's category, else words in its name (EN/DE/ES, German compounds too).
   Health = the scanner's own verdict words (Lower / Moderate / Higher impact, Not enough data), never a medical claim.
   Points: a daily look, binning what ran out (it goes on the shopping list), a kitchen that is mostly lower impact. Each one is capped
   per day, so nothing can be farmed. Pure: no DOM, no storage. kitchen-game.js draws it. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiKitchenGameCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
    'use strict';
    const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\u00df/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();

    /* where: 'fridge' or 'cabinet'. Order = the order on screen. */
    const SHELVES = [
        { id: 'meat', where: 'fridge', ic: '\u{1F969}', t: ['Meat & fish', 'Fleisch & Fisch', 'Carne y pescado'] },
        { id: 'dairy', where: 'fridge', ic: '\u{1F95B}', t: ['Yogurt & dairy', 'Joghurt & Milch', 'Yogur y l\u00e1cteos'] },
        { id: 'eggs', where: 'fridge', ic: '\u{1F95A}', t: ['Eggs & tofu', 'Eier & Tofu', 'Huevos y tofu'] },
        { id: 'veg', where: 'fridge', ic: '\u{1F966}', t: ['Vegetables', 'Gem\u00fcse', 'Verduras'] },
        { id: 'fruit', where: 'cabinet', ic: '\u{1F34E}', t: ['Fruit', 'Obst', 'Fruta'] },
        { id: 'grains', where: 'cabinet', ic: '\u{1F35E}', t: ['Bread & grains', 'Brot & Getreide', 'Pan y cereales'] },
        { id: 'snacks', where: 'cabinet', ic: '\u{1F36B}', t: ['Snacks & sweets', 'Snacks & S\u00fc\u00dfes', 'Snacks y dulces'] },
        { id: 'drinks', where: 'cabinet', ic: '\u{1F9C3}', t: ['Drinks', 'Getr\u00e4nke', 'Bebidas'] },
        { id: 'other', where: 'cabinet', ic: '\u{1FAD9}', t: ['Jars & more', 'Gl\u00e4ser & mehr', 'Botes y m\u00e1s'] }
    ];
    const IDS = SHELVES.map(s => s.id);
    const byId = id => SHELVES.find(s => s.id === id) || null;

    /* words, checked in this order (first hit wins). Short words (<= 3 letters) and words marked = only as a whole word; 4 letters at the start or the end
       of a word (Vollkornbrot); 5 or more anywhere, so German compounds work (Fruchtjoghurt -> dairy, Haferflocken -> grains). */
    const WORDS = [
        ['fruit', 'watermelon|wassermelone|sandia'],
        ['other', 'peanut butter|nut butter|erdnussbutter|nussmus|mantequilla de cacahuete|jam|marmelade|konfituere|mermelada|honey|honig|miel|olive oil|olivenoel|aceite|oil|essig|vinegar|vinagre|spice|gewuerz|especia|salt|salz|sal|sauce|sosse|salsa|ketchup|mustard|senf|mostaza|pesto|mayo|mayonnaise|mayonesa|stock|bruehe|caldo|canned|dose|lata'],
        ['drinks', 'juice|saft|zumo|jugo|water|wasser|agua|soda|cola|coffee|kaffee|cafe|tea|tee|te|smoothie|lemonade|limonade|limonada|refresco|=beer|=bier|cerveza|=wine|=wein|rotwein|weisswein|vino|kombucha|energy drink'],
        ['snacks', 'chocolate|schokolade|schoko|chips|crisps|patatas fritas|cookie|biscuit|keks|galleta|candy|caramelo|gummy|gummi|cake|kuchen|pastel|ice cream|eis|helado|popcorn|palomitas|nuts|nuesse|nusse|frutos secos|almond|mandel|almendra|cracker|reiswaffel|rice cake|protein bar|riegel|barrita|bar|donut|croissant|cereal bar|muesliriegel|sweets|suessigkeit|dulces'],
        ['meat', 'chicken|haehnchen|hahnchen|huhn|haehnchenbrust|pollo|beef|rind|ternera|vacuno|pork|schwein|cerdo|turkey|pute|pavo|ham|schinken|jamon|salami|sausage|wurst|wuerstchen|salchicha|chorizo|bacon|speck|mince|hackfleisch|hack|carne picada|carne|meat|fleisch|steak|lamb|lamm|cordero|fish|fisch|pescado|salmon|lachs|tuna|thunfisch|atun|shrimp|prawn|garnele|gamba|cod|kabeljau|bacalao|sardine|sardina|mackerel|makrele|caballa'],
        ['eggs', 'egg|eggs|ei|eier|huevo|huevos|tofu|tempeh|seitan'],
        ['dairy', 'yogurt|yoghurt|joghurt|yogur|milk|milch|leche|cheese|kaese|kase|queso|feta|mozzarella|parmesan|butter|mantequilla|cream|sahne|nata|skyr|quark|kefir|pudding|cottage|frischkaese|ricotta|cuajada|requeson|creme fraiche|schmand|gouda|emmentaler|cheddar|brie|camembert|manchego|edamer|halloumi|burrata|ayran'],
        ['grains', 'bread|brot|broetchen|pan|toast|rice|reis|arroz|pasta|nudel|spaghetti|noodle|fideo|oat|oats|hafer|haferflocken|avena|flour|mehl|harina|cereal|cereales|muesli|musli|granola|quinoa|couscous|tortilla|wrap|lentil|linsen|lenteja|bean|beans|bohnen|judia|alubia|frijol|chickpea|kichererbse|garbanzo|bulgur|polenta|semola|cracker'],
        ['veg', 'sweet potato|suesskartoffel|susskartoffel|batata|boniato|vegetable|gemuese|gemuse|verdura|broccoli|brokkoli|brocoli|spinach|spinat|espinaca|salad|salat|ensalada|lettuce|lechuga|tomato|tomate|cucumber|gurke|pepino|carrot|karotte|moehre|mohre|zanahoria|pepper|paprika|pimiento|onion|zwiebel|cebolla|garlic|knoblauch|ajo|zucchini|courgette|calabacin|potato|kartoffel|patata|cauliflower|blumenkohl|coliflor|cabbage|kohl|col|repollo|mushroom|pilz|champignon|champinon|seta|kale|gruenkohl|avocado|aguacate|aubergine|eggplant|berenjena|leek|lauch|puerro|asparagus|spargel|esparrago|pumpkin|kuerbis|calabaza|celery|sellerie|apio|radish|radieschen|rabano|beetroot|rote bete|remolacha|peas|erbsen|guisantes'],
        ['fruit', 'fruit|obst|fruta|apple|apfel|manzana|banana|banane|platano|berry|berries|beere|beeren|baya|strawberr|erdbeer|fresa|blueberr|heidelbeer|blaubeer|arandano|raspberr|himbeer|frambuesa|orange|naranja|lemon|zitrone|limon|lime|limette|lima|grape|traube|uva|pear|birne|pera|kiwi|mango|pineapple|ananas|pina|melon|melone|cherry|kirsche|cereza|peach|pfirsich|melocoton|plum|pflaume|ciruela|apricot|aprikose|albaricoque|date|dattel|datil|fig|feige|higo|pomegranate|granatapfel|granada']
    ];
    const RX = WORDS.map(([id, list]) => [id, list.split('|').map(w => {
        const whole = w[0] === '=', k = norm(whole ? w.slice(1) : w), e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s');
        return new RegExp(whole || k.length <= 3 ? '(?:^|\\s)' + e + '(?:$|\\s)' : k.length === 4 ? '(?:^|\\s)' + e + '|' + e + '(?:$|\\s)' : e);
    })]);
    /* the product database's categories (index.html catOf) */
    const PCAT = { drink: 'drinks', cereal: 'grains', bread: 'grains', staple: 'grains', sweets: 'snacks', snack: 'snacks', dairy: 'dairy' };

    function shelfOf(entry, pcat) {
        const e = entry || {};
        if (e.c && byId(e.c)) return e.c;
        const t = norm(e.n);
        if (t) for (const [id, rs] of RX) if (rs.some(r => r.test(t))) return id;
        if (pcat && PCAT[pcat]) return PCAT[pcat];
        return 'other';
    }
    /* the kitchen sorted onto its shelves: [{shelf, items}] in screen order, every shelf present (empty ones too) */
    function shelve(items) {
        const m = {}; IDS.forEach(id => { m[id] = []; });
        (Array.isArray(items) ? items : []).forEach(i => { if (i && i.n) m[shelfOf(i)].push(i); });
        IDS.forEach(id => m[id].sort((a, b) => (b.at || 0) - (a.at || 0)));
        return SHELVES.map(s => ({ shelf: s, items: m[s.id] }));
    }
    const LV = ['ok', 'better', 'spike', 'unknown'];
    const levelOf = i => (i && i.p && LV.indexOf(i.p.v) >= 0 ? i.p.v : 'unknown');
    /* how healthy the kitchen is, in the scanner's words. share = lower-impact share of the entries that have a verdict */
    function health(items) {
        const c = { ok: 0, better: 0, spike: 0, unknown: 0 };
        (Array.isArray(items) ? items : []).forEach(i => { c[levelOf(i)]++; });
        const rated = c.ok + c.better + c.spike;
        return { counts: c, rated, total: rated + c.unknown, share: rated ? c.ok / rated : 0 };
    }
    /* points, each capped per day (index.html LowiHost.award(src, el, {amt, perDay, eventId}) enforces perDay and eventId) */
    const POINTS = {
        look: { src: 'kitchen-look', amt: 5, perDay: 1 },
        bin: { src: 'kitchen-bin', amt: 2, perDay: 3 },
        healthy: { src: 'kitchen-healthy', amt: 10, perDay: 1 }
    };
    const HEALTHY_MIN = 5, HEALTHY_SHARE = 0.6;
    /* the daily "healthy kitchen" bonus: at least 5 entries with a verdict, and at least 60 % of them lower impact */
    function healthy(items) { const h = health(items); return h.rated >= HEALTHY_MIN && h.share >= HEALTHY_SHARE; }
    /* looking only counts with something in the kitchen */
    const canLook = items => Array.isArray(items) && items.length > 0;
    const dayKey = now => { const d = new Date(Number(now) || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    function award(kind, now, extra) {
        const P = POINTS[kind]; if (!P) return null;
        return { src: P.src, amt: P.amt, perDay: P.perDay, eventId: P.src + ':' + dayKey(now) + (extra ? ':' + norm(extra).slice(0, 40) : '') };
    }
    /* a product (LowiDex search result / scanner card) -> the fields kitchen-core addProduct() keeps */
    function fromProduct(p, level) {
        p = p || {};
        const n = String(p.name || p.n || '').trim();
        return { n, bc: String(p.barcode || p.bc || ''), img: String(p.img || ''), br: String(p.brand || p.br || ''), v: level || '', est: !!p.est, pcat: p.cat || '' };
    }
    return Object.freeze({ SHELVES, IDS, byId, shelfOf, shelve, health, levelOf, POINTS, HEALTHY_MIN, HEALTHY_SHARE, healthy, canLook, award, dayKey, fromProduct, norm });
});
