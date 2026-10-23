/* Oct 23, 2026: Seller Zone logic, no DOM (tests/seller-zone.test.cjs). Which junk snack a scanned product is, which region the
   person shops in, and which checked products from seller-zone-data.js to offer as the swap. */
(function (W) {
    'use strict';
    if (!W || W.LowiSellerZoneCore) return;
    const fold = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u00df/g, 'ss');
    /* order matters: a chocolate cookie is a biscuit, chocolate gummies are gummies */
    const KINDS = [
        ['biscuit', /\b(kekse?|cookies?|biscuits?|biscotti|oreo|leibniz|prinzen ?rolle|butterkeks|waffel\w*|wafers?|crackers?|tuc|zwieback|brownies?|muffins?|kuchen|cake|cupcakes?|donuts?|doughnuts?|croissants?|galletas?|bizcochos?|lebkuchen|spekulatius|madeleines?|shortbread|digestives?|hobnobs?|pick ?up|choco ?leibniz|hanuta|knoppers|bahlsen|magdalenas?)\b/],
        ['gummy', /\b(haribo|gummi\w*|gummy|gummies|fruchtgummi|weingummi|lakritz\w*|licorice|liquorice|maoam|skittles|starburst|trolli|katjes|bonbons?|candy|candies|gominolas?|chuches|golosinas?|marshmallows?|jelly ?beans?|mentos|nimm ?2|goldbaren|goldbears?|fruit ?gums?|sour ?patch|airheads|sweeties|nerds)\b/],
        ['chips', /\b(chips|crisps|pringles|lays|lay s|doritos|funny ?frisch|chio|lorenz|crunchips|pombar|flips|erdnussflips|nachos|popcorn|patatas fritas|snack ?mix|salzstangen|salzbrezeln?|pretzels?|cheetos|ruffles|wotsits|quavers|monster munch|hula hoops|tyrrells|walkers|takis|saltletts)\b/],
        ['choc', /\b(schoko\w*|chocolate\w*|chocolat\w*|milka|ritter ?sport|kinder|snickers|mars|twix|bounty|kit ?kat|m ?& ?m s?|toblerone|nutella|pralinen?|ferrero|raffaello|duplo|yogurette|merci|lindor|milky ?way|cadbury|galaxy|hershey\w*|reese s?|rocher|kitkat|celebrations|smarties|aero|ovomaltine|nougat|marzipan|turron)\b/]
    ];
    /* a product that already is one of ours, or a real food (cheese, nuts, seaweed), is not a junk snack */
    const NOT_JUNK = /\b(100 ?% ?(kakao|cacao|cocoa)|cacao nibs|kakaonibs|biltong|cheesies|moon cheese|knusperkase|nori|seaweed|algen|mandeln|almonds|pistazi\w*|pistachios?|macadamia\w*|walnuss\w*|walnuts?|kokoschips)\b/;
    function kindOf(p) {
        if (!p) return null;
        const txt = fold([p.name, p.brand, p.generic, p.cat === 'sweets' ? 'sweets' : ''].filter(Boolean).join(' ')).replace(/[^a-z0-9%& ]+/g, ' ');
        if (!txt.trim() || NOT_JUNK.test(txt)) return null;
        for (const [k, re] of KINDS) if (re.test(txt)) return k;
        if (p.cat === 'sweets') return 'choc';
        return null;
    }
    /* the region the shops below deliver to: from the phone's locale (de-DE, en-GB, en-US ...) */
    const EU = /^(de|at|ch|fr|es|it|nl|be|lu|dk|se|fi|ie|pt|pl|cz|sk|si|hr|hu|ro|bg|gr|ee|lv|lt|mt|cy|no|li)$/;
    /* Oct 23 live check: a phone set to English (en-US) in Flensburg got the USA shelf first. Where the phone is (its time zone)
       decides first, the locale only when the time zone says nothing clear. */
    const TZ_UK = /^Europe\/(London|Belfast|Guernsey|Jersey|Isle_of_Man)$/;
    const TZ_NOT_EU = /^Europe\/(Moscow|Minsk|Istanbul|Kyiv|Kiev|Kaliningrad|Samara|Volgograd|Ulyanovsk|Kirov|Saratov|Astrakhan|Simferopol|Chisinau|Belgrade|Sarajevo|Skopje|Tirane|Podgorica)$/;
    const TZ_US = /^(America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Adak|Boise|Detroit|Juneau|Sitka|Metlakatla|Nome|Yakutat|Menominee|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+)|Pacific\/Honolulu|US\/.+)$/;
    function regionOfTz(tz) {
        const z = String(tz || '');
        if (TZ_UK.test(z)) return 'uk';
        if (TZ_US.test(z)) return 'us';
        if (/^Europe\//.test(z) && !TZ_NOT_EU.test(z)) return 'eu';
        if (/^Atlantic\/(Canary|Madeira|Azores)$/.test(z)) return 'eu';
        return '';
    }
    function regionOf(locale, tz) {
        const byTz = regionOfTz(tz);
        if (byTz) return byTz;
        const s = String(locale || '').replace('_', '-');
        const m = s.match(/-([a-z]{2})\b/i), c = m ? m[1].toLowerCase() : '';
        if (c === 'gb' || c === 'uk') return 'uk';
        if (c === 'us') return 'us';
        if (c && EU.test(c)) return 'eu';
        if (!c) { const l = s.slice(0, 2).toLowerCase(); if (l === 'de' || l === 'es' || l === 'fr' || l === 'it' || l === 'nl') return 'eu'; }
        return 'ww';
    }
    const AMZ = { eu: 'https://www.amazon.de/s?k=', uk: 'https://www.amazon.co.uk/s?k=', us: 'https://www.amazon.com/s?k=', ww: 'https://www.amazon.com/s?k=' };
    function amazonUrl(q, region) { return (AMZ[region] || AMZ.ww) + encodeURIComponent(String(q || '')).replace(/%20/g, '+'); }
    /* what each craving gets: its own shelf first, then the closest other shelf */
    const SHELVES = { chips: ['chips', 'nuts'], choc: ['choc', 'nuts'], gummy: ['gummy', 'choc'], biscuit: ['biscuit', 'choc', 'nuts'], nuts: ['nuts'] };
    function list(data, cat, region) {
        const P = (data && data.P) || [];
        const rank = x => (region && region !== 'ww' && x.r.indexOf(region) < 0 ? 2 : 0) + (x.v === 'ja' ? 0 : 1);
        return P.filter(x => !cat || cat === 'all' || x.cat === cat).map((x, i) => ({ x, i })).sort((a, b) => rank(a.x) - rank(b.x) || a.i - b.i).map(o => o.x);
    }
    function swapsFor(data, kind, region, n) {
        const shelves = SHELVES[kind] || [];
        const out = [];
        for (const s of shelves) for (const x of list(data, s, region)) if (out.indexOf(x) < 0) out.push(x);
        /* in the shopper's region first, then the rest; never more than n */
        const mine = out.filter(x => region === 'ww' || x.r.indexOf(region) >= 0), rest = out.filter(x => mine.indexOf(x) < 0);
        return mine.concat(rest).slice(0, n || 3);
    }
    function tx(o, lang) { if (o == null) return ''; if (typeof o === 'string') return o; return o[lang] || o.en || ''; }
    W.LowiSellerZoneCore = { kindOf, regionOf, regionOfTz, amazonUrl, list, swapsFor, tx, SHELVES };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
