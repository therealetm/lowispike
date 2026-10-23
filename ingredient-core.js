/* LOWiSPIKE Food Intelligence Engine: ingredient parser + flags (queue step scanfe-c, spec queue/FOOD-ENGINE-SPEC.md section 3).
   Pure, node-testable UMD module: window.LowiIngredients. Loaded before food-engine-core.js and spike-core.js.

   analyzeIngredients(text, {name, claims}) reads the whole list, brackets included ("Süßungsmittel (Aspartam, ...)",
   "Erdbeerzubereitung (..., Zucker)"), and flags:
   - addedSugar: sugar, syrups, honey, agave, rice syrup, dextrose, glucose, fructose, maltodextrin, malt extract, juice concentrates
   - refinedStarch: refined flour, semolina, rice, starch (incl. modified/maize starch), maltodextrin, potato flakes, puffed grains
   - wholeGrain, sweeteners (incl. E950-E969), sugarAlcohols (E420/E421/E953/E965-E968), protein (whole vs isolate),
     nuts, seeds, veg, fruit, coating/filling, pork, alcohol, and the EU-14 allergens.
   Every hit carries its top-level position `i` (an ingredient inside brackets takes its parent's position), `depth`
   and `top` (one of the first three). Marketing claims (High Protein, Low Carb, Keto, Zero, Sugar free, Organic,
   Gluten free, ...) are recognised and always carry approves:false: a claim never approves a product.
   No list -> status 'missing'; text that cannot be read -> 'unusable'. Nothing is ever guessed: a missing list means
   the ingredient assessment is incomplete, never "no added sugar". */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiIngredients = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    const VERSION = 'ingredient-core c 2026-10-22';
    const NOT_SUGAR = /ohne zucker|zuckerfrei|no added sugar|sugar[- ]?free|sin azúcar|sin azucar|ohne zuckerzusatz|sans sucre|kulör|couleur|colou?r|färbend|farbstoff|zuckerrüben?faser/;
    const RX = {
        addedSugar: /zucker|sugar|sucre|azúcar|azucar|sirup|syrup|sirop|jarabe|dextros|glukose|glucose|fruktose|fructose|saccharose|sucrose|honig|honey|\bmiel\b|agave|maltodextrin|malzextrakt|malt extract|gerstenmalz|invertzucker|melasse|molasses|karamell|caramel|traubensüße|saftkonzentrat|juice concentrate|concentrado de zumo|dicksaft|kandis/,
        refinedStarch: /mehl|flour|harina|farine|grieß|griess|semolina|sémola|\breis|reis\b|reismehl|\brice\b|arroz|stärke|staerke|starch|almidón|almidon|amidon|maltodextrin|kartoffelflocken|kartoffelpüree|potato flakes|puffreis|puffed|cornflakes|paniermehl|breadcrumb/,
        notRefined: /vollkorn|whole ?grain|wholegrain|wholemeal|whole ?wheat|integral|mandelmehl|kokosmehl|lupinenmehl|kichererbsenmehl|linsenmehl|sojamehl|erdnussmehl|almond flour|coconut flour|reissirup|rice syrup|johannisbrotkernmehl|guarkernmehl|sirup|syrup|essig|vinegar|reiswein/,
        wholeGrain: /vollkorn|whole ?grain|wholegrain|wholemeal|whole ?wheat|integral|hafer|\boats?\b|avena|haferflocken|quinoa|buchweizen|buckwheat|dinkelvollkorn/,
        sweetener: /sucralos|aspartam|acesulfam|stevi|saccharin|cyclamat|neotam|advantam|thaumatin|süßstoff|suessstoff|süßungsmittel|suessungsmittel|sweetener|edulcorante|édulcorant|\be ?95[0-24579]\b|\be ?96[0-29]\b/,
        sugarAlcohol: /erythrit|xylit|sorbit|maltit|isomalt|lactit|laktit|mannit|polyol|\be ?42[01]\b|\be ?953\b|\be ?96[5-8]\b/,
        proteinIsolate: /eiweiß|eiweiss|protein|molkenprotein|whey|caseinat|kaseinat|kollagen|collagen|isolat|isolate/,
        proteinWhole: /\beier?\b|vollei|hühnerei|\begg|hähnchen|haehnchen|huhn|chicken|pute|truthahn|turkey|rind|beef|kalb|lamm|fisch|fish|lachs|salmon|thunfisch|tuna|forelle|kabeljau|garnele|shrimp|quark|joghurt|yogh?urt|skyr|hüttenkäse|cottage|käse|cheese|milch|milk|linsen|lentil|kichererbs|chickpea|bohnen|beans?\b|tofu|tempeh|erbsen/,
        nuts: /nuss|nüsse|nuesse|\bnuts?\b|mandel|almond|erdnuss|peanut|haselnuss|hazelnut|walnuss|walnut|cashew|pistazie|pistachio|paranuss|brazil nut|macadamia|pekan|pecan|almendra|cacahuete|avellana|nuez/,
        notNut: /muskatnuss|nutmeg|kokosnuss|coconut|kokos/,
        seeds: /kürbiskern|kuerbiskern|sonnenblumenkern|sunflower seed|chia|leinsamen|flaxseed|linseed|sesam|sesame|hanfsamen|hemp seed|samen|seeds?\b|semillas/,
        veg: /gemüse|gemuese|vegetable|verdura|zucchini|paprika|tomate|tomato|aubergine|brokkoli|broccoli|spinat|spinach|zwiebel|onion|karotte|möhre|carrot|blumenkohl|cauliflower|gurke|cucumber|salat|lettuce|pilz|mushroom|champignon|\bkohl\b|rotkohl|weißkohl|grünkohl|rosenkohl|kohlrabi|cabbage|lauch|leek|sellerie|celery|bohne|espinaca|cebolla|zanahoria/,
        fruit: /frucht|früchte|fruit|fruta|erdbeer|strawberr|banane|banana|apfel|apple|manzana|cranberr|papaya|orange|naranja|zitrone|lemon|beere|berry|berries|traube|grape|mango|ananas|pineapple|kirsch|cherr|pfirsich|peach|aprikose|apricot|dattel|\bdates?\b|feige|\bfigs?\b|rosine|raisin/,
        coating: /überzug|ueberzug|überzugsmittel|glasur|glaze|glasiert|mantel|coating|coated|kuvertüre|couverture|schokolade|chocolate|chocolat|karamellisiert|caramelised|caramelized|gebrannt|kandiert|candied|dragee|füllung|fuellung|filling|creme(?!fraiche)|cream filling|relleno/,
        pork: /schwein|pork|cerdo|porc|\bspeck|bacon|schinkenspeck|schmalz|\blard|salam[ei]|chorizo|mortadella|leberwurst|mett\b/,
        notPork: /pute|truthahn|turkey|geflügel|gefluegel|poultry|hähnchen|chicken|rind|beef|vegan|vegetar|veggie|pflanzlich|plant[- ]based/,
        alcohol: /alkohol|alcohol|\bwein\b|\bwine\b|rotwein|weißwein|weisswein|\brum\b|likör|liqueur|\bbier\b|\bbeer\b|wodka|vodka|whisk(e)?y|brandy|cognac|sekt|prosecco|champagner|ethanol|spirituose|spirits\b|\bvino\b|cerveza|licor/,
        notAlcohol: /essig|vinegar|weinsäure|weinsaeure|weinstein|alkoholfrei|alcohol[- ]free|sin alcohol|bierhefe|zuckeralkohol|sugar alcohol|polyol/
    };
    // EU-14 allergens (Regulation 1169/2011 Annex II). Key -> pattern; `not` patterns stop false hits.
    const ALLERGENS = {
        gluten: {rx: /weizen|wheat|roggen|\brye\b|gerste|barley|hafer|\boats?\b|dinkel|spelt|kamut|emmer|einkorn|gluten|trigo|cebada|centeno|grieß|griess|semolina|paniermehl/, not: /glutenfrei|gluten[- ]free|sin gluten|weizenstärke glutenfrei/},
        crustaceans: {rx: /krebstier|krustentier|garnele|shrimp|prawn|krabbe|crab|hummer|lobster|langust|crustacea|gamba/},
        eggs: {rx: /\beier?\b|vollei|hühnerei|huehnerei|eigelb|eiklar|hühnereiweiß|hühnereiweiss|\begg|huevo|œuf|oeuf/, not: /milcheiweiß|milcheiweiss|molkeneiweiß|sojaeiweiß|erbseneiweiß/},
        fish: {rx: /fisch|fish|lachs|salmon|thunfisch|tuna|sardelle|anchov|kabeljau|\bcod\b|forelle|trout|hering|herring|makrele|mackerel|pescado|sardin/},
        peanuts: {rx: /erdn(u|ü|ue)ss|peanut|cacahuete|cacahuète|arachide/},
        soy: {rx: /soja|\bsoy|tofu|edamame/},
        milk: {rx: /milch|milk|joghurt|yogh?urt|sahne|\bcream\b|rahm|butter|käse|kaese|cheese|quark|molke|whey|lakto|lacto|laktose|lactose|kasein|casein|skyr|leche|lait|nata\b/, not: /laktase|lactase|kokosmilch|coconut milk|mandelmilch|hafermilch|sojamilch|milchsäure|milchsaeure|lactic acid|lactat|laktat|kakaobutter|cocoa butter|erdnussbutter|peanut butter|sheabutter/},
        nuts: {rx: /mandel|almond|haseln(u|ü|ue)ss|hazelnut|waln(u|ü|ue)ss|walnut|cashew|pekan|pecan|paran(u|ü|ue)ss|brazil|pistazie|pistachio|macadamia|queenslandnuss|almendra|avellana|nuez|\bnüsse\b|\bnuesse\b|schalenfrücht/, not: /muskatnuss|nutmeg|kokos|coconut|erdn(u|ü|ue)ss|peanut/},
        celery: {rx: /sellerie|celery|apio|céleri/},
        mustard: {rx: /senf|mustard|mostaza|moutarde/},
        sesame: {rx: /sesam|sesame|tahin/},
        sulphites: {rx: /schwefeldioxid|schwefel-dioxid|sulfit|sulphit|sulfite|sulphite|disulfit|\be ?22[0-8]\b|sulfitos/},
        lupin: {rx: /lupine|lupin|altramuz/},
        molluscs: {rx: /weichtier|mollus|muschel|mussel|auster|oyster|tintenfisch|squid|calamar|oktopus|octopus|schnecke|snail|sepia/}
    };
    // Marketing claims, read from the product name / claim text. A claim never approves (spec section 3).
    const CLAIMS = [
        ['high_protein', /high[- ]?protein|protein[- ]?(pudding|riegel|bar|joghurt|drink|shake)|\bproteína\b|eiweißreich|eiweissreich|mit protein|\bprotein\b/],
        ['low_carb', /low[- ]?carb|kohlenhydratarm|kohlenhydratreduziert|bajo en carbohidratos/],
        ['keto', /\bketo/],
        ['zero_sugar', /\bzero\b|0\s?% zucker|0\s?% sugar|\bnull zucker/],
        ['sugar_free', /zuckerfrei|sugar[- ]?free|sin azúcar|sin azucar|ohne zucker\b|sans sucre/],
        ['no_added_sugar', /ohne zuckerzusatz|no added sugar|sin azúcares añadidos|ohne zugesetzten zucker/],
        ['organic', /\bbio\b|bio-|organic|(?<![a-zà-ÿ])öko(?![a-zà-ÿ])|oeko|ecológico|ecologico/],
        ['gluten_free', /glutenfrei|gluten[- ]?free|sin gluten/],
        ['vegan', /\bvegan/],
        ['light', /\blight\b|\blite\b|\bleicht\b/],
        ['fitness', /\bfit\b|fitness|\bbalance\b|vital/]
    ];

    const low = s => String(s == null ? '' : s).toLowerCase().normalize('NFC');

    // Split one level of a list at , and ; (and ". " between items), keeping bracket contents together.
    function splitTop(s) {
        const out = []; let depth = 0, cur = '';
        for (let k = 0; k < s.length; k++) {
            const ch = s[k];
            if (ch === '(' || ch === '[' || ch === '{') depth++;
            else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
            if (depth === 0 && ((ch === ',' && !(/\d/.test(s[k - 1] || '') && /\d/.test(s[k + 1] || ''))) || ch === ';' || ch === '•' || ch === '·' || (ch === '.' && /\s/.test(s[k + 1] || '') && !/\d/.test(s[k - 1] || '')))) {
                out.push(cur); cur = '';
            } else cur += ch;
        }
        out.push(cur);
        return out;
    }
    // "Erdbeerzubereitung (Erdbeeren 60%, Zucker" -> head "Erdbeerzubereitung", inner "Erdbeeren 60%, Zucker"; unbalanced brackets tolerated.
    function headAndInner(item) {
        const open = item.search(/[([{]/);
        if (open < 0) return {head: item.replace(/[)\]}]/g, ' '), inner: ''};
        let depth = 0, end = -1;
        for (let k = open; k < item.length; k++) {
            const ch = item[k];
            if (ch === '(' || ch === '[' || ch === '{') depth++;
            else if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) { end = k; break; } }
        }
        const inner = end < 0 ? item.slice(open + 1) : item.slice(open + 1, end);
        const head = (item.slice(0, open) + ' ' + (end < 0 ? '' : item.slice(end + 1))).replace(/[)\]}]/g, ' ');
        return {head, inner, truncated: end < 0};
    }
    const clean = s => s.replace(/[_*]/g, ' ').replace(/\d+([.,]\d+)?\s*%/g, ' ').replace(/\s+/g, ' ').trim();
    const pctOf = s => { const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(s); return m ? +m[1].replace(',', '.') : null; };

    // parse(text) -> {items: [{text, i, depth, parent, pct, cls}], top: number of top-level items, truncated}
    function parse(text) {
        const src = low(text).replace(/^\s*(zutaten|ingredients?|ingredientes|ingrédients)\s*:\s*/, '').replace(/\s+/g, ' ').trim();
        const items = []; let truncated = /(\.\.\.|…)\s*$/.test(src);
        let top = 0;
        function walk(s, depth, parentIdx, topIdx) {
            for (const raw of splitTop(s)) {
                const r = raw.trim(); if (!r) continue;
                const hi = headAndInner(r);
                if (hi.truncated) truncated = true;
                // "Süßungsmittel: Aspartam" -> class "süßungsmittel", text "aspartam" (both kept for matching)
                let head = clean(hi.head), cls = null;
                const colon = head.indexOf(':');
                if (colon > 0) { cls = head.slice(0, colon).trim(); head = head.slice(colon + 1).trim(); }
                if (!head && !cls && !hi.inner) continue;
                if (/%-anteile|abfülltechnisch|kann spuren|may contain|puede contener/.test(head)) continue;
                const i = depth === 0 ? top++ : topIdx;
                const idx = items.length;
                items.push({text: head || cls || '', cls, i, depth, parent: parentIdx, pct: pctOf(r)});
                if (hi.inner) walk(hi.inner, depth + 1, idx, i);
            }
        }
        if (src) walk(src, 0, null, 0);
        return {items: items.filter(it => it.text.length > 1 || it.cls), top, truncated};
    }

    function hits(items, rx, not) {
        const out = [];
        for (const it of items) {
            const t = it.cls ? it.cls + ' ' + it.text : it.text;
            if (!rx.test(t)) continue;
            if (not && not.test(t)) continue;
            out.push({w: it.text.slice(0, 40) || (it.cls || '').slice(0, 40), i: it.i, depth: it.depth, top: it.i < 3});
        }
        return out;
    }

    function detectClaims(text) {
        const s = low(text);
        if (!s.trim()) return [];
        return CLAIMS.filter(([, rx]) => rx.test(s)).map(([key]) => ({key, approves: false}));
    }

    // Words that make a list unreadable for us (garbled OCR): almost no letters, or nothing matched as words.
    function readable(src) {
        const letters = (src.match(/\p{L}/gu) || []).length;
        return letters >= 3 && letters / Math.max(1, src.length) > 0.4;
    }

    function analyzeIngredients(text, opts) {
        const o = opts || {};
        const raw = text == null ? '' : String(text);
        const claims = detectClaims([o.name, o.brand, o.claims].filter(Boolean).join(' '));
        const base = {version: VERSION, claims, claimsApprove: false};
        if (!raw.trim()) {
            return Object.assign(base, {status: 'missing', complete: false, items: [], count: 0, truncated: false, flags: emptyFlags(), allergens: [], allergenHits: {}});
        }
        if (!readable(raw)) {
            return Object.assign(base, {status: 'unusable', complete: false, items: [], count: 0, truncated: false, flags: emptyFlags(), allergens: [], allergenHits: {}});
        }
        const p = parse(raw);
        const it = p.items;
        const sugarAlcohols = hits(it, RX.sugarAlcohol);
        const sweeteners = hits(it, RX.sweetener);
        const flags = {
            addedSugar: hits(it, RX.addedSugar, NOT_SUGAR),
            refinedStarch: hits(it, RX.refinedStarch, RX.notRefined),
            wholeGrain: hits(it, RX.wholeGrain),
            sweeteners,
            sugarAlcohols,
            proteinIsolate: hits(it, RX.proteinIsolate, /eiweißgehalt|milcheiweißfrei/),
            proteinWhole: hits(it, RX.proteinWhole),
            nuts: hits(it, RX.nuts, RX.notNut),
            seeds: hits(it, RX.seeds),
            veg: hits(it, RX.veg),
            fruit: hits(it, RX.fruit, /saftkonzentrat|konzentrat|aroma|flavou?r|färbend|farbstoff/),
            coating: hits(it, RX.coating),
            pork: hits(it, RX.pork, RX.notPork),
            alcohol: hits(it, RX.alcohol, RX.notAlcohol)
        };
        const allergenHits = {};
        for (const k of Object.keys(ALLERGENS)) {
            const h = hits(it, ALLERGENS[k].rx, ALLERGENS[k].not);
            if (h.length) allergenHits[k] = h.map(x => x.w);
        }
        const first = (arr, top) => arr.find(h => !top || h.top) || null;
        return Object.assign(base, {
            status: 'complete',
            complete: true,
            truncated: p.truncated,
            items: it,
            count: p.top,
            flags,
            allergens: Object.keys(allergenHits),
            allergenHits,
            summary: {
                addedSugar: flags.addedSugar.length > 0,
                addedSugarTop: first(flags.addedSugar, true),
                sugarFirst: flags.addedSugar.some(h => h.i === 0 && h.depth === 0),
                refinedStarch: flags.refinedStarch.length > 0,
                refinedTop: first(flags.refinedStarch, true),
                wholeGrainTop: first(flags.wholeGrain, true),
                sweetener: flags.sweeteners.length + flags.sugarAlcohols.length > 0,
                sweetenerHit: first(flags.sweeteners) || first(flags.sugarAlcohols),
                proteinIsolate: flags.proteinIsolate.length > 0,
                nutsTop: first(flags.nuts, true),
                coating: flags.coating.length > 0,
                pork: flags.pork.length > 0,
                alcohol: flags.alcohol.length > 0
            }
        });
    }
    function emptyFlags() {
        const f = {};
        for (const k of ['addedSugar', 'refinedStarch', 'wholeGrain', 'sweeteners', 'sugarAlcohols', 'proteinIsolate', 'proteinWhole', 'nuts', 'seeds', 'veg', 'fruit', 'coating', 'pork', 'alcohol']) f[k] = [];
        return f;
    }

    return {VERSION, RX, ALLERGENS, CLAIMS, parse, analyzeIngredients, detectClaims};
});
