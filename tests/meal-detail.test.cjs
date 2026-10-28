// Oct 25 2026 (E-man: "On the pictures that people are posting, it says something like likely spike or no spike. I want to be able to
// click on that and then read about the ingredients or the details of whatever they're eating."): the spike label on a meal post
// opens the poster's own photo check. Task 31c545da.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
global.LowiMealSnap = require('../meal-photo.js');
global.LowiFoodKnowledge = require('../food-knowledge-core.js');
const M = require('../meal-detail-core.js');
const K = require('../community-chat-core.js');
const J = require('../meal-journal.js');
const idx = R('index.html'), chat = R('community-chat.js'), core = R('community-chat-core.js'), cloud = R('community-chat-cloud.js'),
    mj = R('meal-journal.js'), fy = R('foryou.js'), dom = R('meal-detail.js'), css = R('meal-detail.css'), sw = R('sw.js'),
    sql = R('supabase/proposals/meal_detail_20261025.sql');

const log = {
    id: 'm1', t: 'Salmon bowl', lvl: 'low',
    ai: J.estimate({ name: 'Salmon bowl', items: [{ name: 'Salmon', portion: '150 g' }, { name: 'Avocado', portion: '1/2' }, { name: 'Cucumber' }], total: { kcal: 520, carbs: 14, protein: 38, fiber: 8, sugar: 4, fat: 32 } }, { lvl: 'low', note: 'Great protein and fat, very few carbs.' }),
    // things that must NEVER travel with a post, even if they sit next to the meal on the phone
    cycle: { day: 3, phase: 'rest' }, sleep: { h: 7 }, weight: 92, goals: { kcal: 1800 }
};

test('fromLog keeps only this meal: name, verdict and why, foods, the numbers, the tip; never cycle, sleep, weight or goals', () => {
    const d = M.fromLog(log, 'low');
    assert.equal(d.v, 1); assert.equal(d.name, 'Salmon bowl'); assert.equal(d.lvl, 'low'); assert.equal(d.bs, 'low');
    assert.equal(d.net, 6, 'net carbs = carbs - fiber, from the stored analysis');
    assert.equal(d.verdict, 'JA'); assert.ok(d.rule);
    assert.deepEqual(d.items.map(x => x.name), ['Salmon', 'Avocado', 'Cucumber']);
    assert.equal(d.items[0].portion, '150 g');
    assert.deepEqual(d.total, { kcal: 520, carbs: 14, protein: 38, fiber: 8, sugar: 4, fat: 32 });
    assert.equal(d.note, 'Great protein and fat, very few carbs.');
    const s = JSON.stringify(d);
    for (const k of ['cycle', 'phase', 'sleep', 'weight', 'goals', '1800', '92']) assert.ok(!s.includes(k), k + ' never travels');
    for (const k of Object.keys(d)) assert.ok(M.WHITE.includes(k), k + ' is whitelisted');
    assert.ok(Buffer.byteLength(s) < 4096);
});

test('a meal logged without a photo check carries only its name and label (nothing invented)', () => {
    const d = M.fromLog({ id: 'x', t: 'Pizza', lvl: 'high' }, 'high');
    assert.deepEqual(d, { v: 1, name: 'Pizza', lvl: 'high' });
    assert.equal(M.hasDetail(d), false);
    assert.equal(M.fromLog(null), null);
});

test('pork gets the food verdict and its reason even when the glucose level alone would be low', () => {
    const d = M.fromLog({ t: 'Pork chop', ai: J.estimate({ name: 'Pork chop', items: [{ name: 'Pork chop', portion: '200 g' }], total: { kcal: 480, carbs: 0, protein: 50, fat: 30 } }, { lvl: 'high' }) }, 'high');
    assert.equal(d.verdict, 'NEIN'); assert.match(d.rule, /pork/);
    const h = M.sheetHTML(d, { by: 'Antje', l: 'en' });
    assert.match(h, /Not insulin-friendly/); assert.match(h, /Pork/i);
});

test('clean() is the gate on read too: unknown keys, nested extras, bad numbers and markup are dropped', () => {
    const d = M.clean({ v: 9, name: '<img src=x onerror=alert(1)>Soup', lvl: 'medium', cycle: { day: 2 }, sleep: 8, net: -4, verdict: 'MAYBE', rule: 'DROP TABLE',
        items: [{ name: 'Lentils', portion: '1 cup', v: 'SELTEN', cycle: 1 }, { name: '' }, 'x', ...Array(20).fill({ name: 'Pea' })],
        total: { kcal: 'NaN', carbs: 30, protein: 99999, weight: 90, fiber: -2 }, html: '<b>' });
    assert.equal(d.name.includes('<'), false);
    assert.equal(d.lvl, 'mid'); assert.equal(d.net, undefined); assert.equal(d.verdict, undefined); assert.equal(d.rule, undefined);
    assert.equal(d.cycle, undefined); assert.equal(d.sleep, undefined); assert.equal(d.html, undefined);
    assert.equal(d.items.length, 8); assert.deepEqual(d.items[0], { name: 'Lentils', portion: '1 cup', v: 'SELTEN' });
    assert.deepEqual(d.total, { carbs: 30, protein: 400 });
    assert.equal(M.clean('x'), null); assert.equal(M.clean([]), null); assert.equal(M.clean({ foo: 1 }), null);
});

test('the sheet shows only what was stored, escaped, in EN, DE and ES; an old post says "No details for this meal"', () => {
    const d = M.fromLog(log, 'low');
    for (const l of ['en', 'de', 'es']) {
        const h = M.sheetHTML(d, { by: 'Antje', name: 'Salmon bowl', lvl: 'low', l });
        assert.ok(h.includes(M.t('title', l))); assert.ok(h.includes(M.t('low', l)));
        assert.ok(h.includes(M.t('from', l, { n: 'Antje' }).replace(/’/g, '’')));
        assert.ok(h.includes(M.t('ing', l)) && h.includes('Salmon') && h.includes('150 g'));
        assert.ok(h.includes(M.whyText(d, l)) && h.includes(M.t('whyLow', l, { net: 6 }).replace(/\.$/, '')), l + ' why line (28 Oct 2026: with the carbs-minus-fibre sum when stored)');
        assert.ok(h.includes('520') && h.includes(M.t('protein', l)));
        assert.ok(!h.includes(M.t('none', l)));
        const none = M.sheetHTML(null, { by: 'Q', name: 'Toast', lvl: 'high', l });
        assert.ok(none.includes(M.t('none', l)) && none.includes('Toast') && none.includes(M.t('high', l)));
        assert.ok(!/undefined|NaN|null/.test(h + none));
    }
    for (const k of Object.keys(M.STR.en)) for (const l of ['de', 'es']) assert.ok(M.STR[l][k], l + ' has ' + k);
    const evil = M.sheetHTML({ name: '"><script>x</script>', items: [{ name: '<b>x</b>' }] }, { by: '<i>', photo: 'javascript:alert(1)' });
    assert.ok(!/<script|<b>x|<i>|javascript:/.test(evil));
    // numbers only where the analysis stored them
    const part = M.sheetHTML({ name: 'Tea', total: { kcal: 2 } }, { l: 'en' });
    assert.ok(part.includes('kcal') && !part.includes(M.t('protein', 'en')) && !part.includes(M.t('why', 'en')));
});

test('Chat and Circles: the spike label is a button with a visible "Details" chevron; the meal photo opens the sheet too', () => {
    assert.match(chat, /function mealHtml\(ml(?:,md)?\)\{[^\n]*id=ml&&ml\.mid\?String\(ml\.mid\):''/); /* Oct 27: + md for the key numbers line */
    assert.match(chat, /<button type="button" class="cs-meal-bs cs-meal-'\+esc\(ml\.lvl\)\+'" data-chat="meal-detail" data-id="/);
    assert.match(chat, /MD\.hintHTML\(\)/);
    assert.match(chat, /class="cs-photo" data-chat="photo" data-sfx="none"'\+\(md\?' data-md="'\+esc\(m\.id\)\+'" aria-haspopup="dialog"':''\)/);
    assert.match(chat, /else if\(a==='photo'&&b\.dataset\.md&&mealDetail\(b\.dataset\.md\)\)\{/);
    assert.match(chat, /else if\(a==='meal-detail'\)\{if\(!mealDetail\(b\.dataset\.id\)\)photoView/);
    assert.match(chat, /W\.LowiMealDetail\.open\(m\.md\|\|null,\{by:m\.by\|\|'',name:ph\.meal\.name,lvl:ph\.meal\.lvl,photo:ph\.src\}\)/);
    assert.match(chat, /,mealDetail,shareMeal\};/);
    assert.match(M.hintHTML('de'), /Details/); assert.match(M.hintHTML('es'), /Detalles/); assert.match(M.hintHTML(), /<svg/);
});

test('the detail is saved with the post: outbox -> insert -> select -> realtime map', () => {
    assert.match(chat, /MD\.clean\(o\.detail\):null;const row=await store\.submitPhoto\(name,body,id,null,md\)/);
    assert.match(core, /function submitPhoto\(by,text,id,reply\)\{[^\n]*const md=arguments\[4\];[^\n]*md:md&&meal\(text,scope\)\?md:null/);
    assert.match(core, /if\(pin\.md&&typeof pin\.md==='object'\)m\.md=pin\.md;/);
    assert.match(cloud, /fields='id,user_id,who,body,reply_to,created_at,room,meal'/);
    assert.match(cloud, /m\.md&&typeof m\.md==='object'\?\{meal:m\.md\}:\{\}/);
    assert.match(cloud, /md:r\.meal&&typeof r\.meal==='object'\?r\.meal:null/);
    assert.match(idx, /md:\(r\.meal && typeof r\.meal === "object"\) \? r\.meal : null/);
    assert.match(idx, /from\("messages"\)\.select\("id,user_id,who,body,reply_to,created_at,room,meal"\)/);
    // the outbox really carries it to send()
    const mem = {}, sent = [], ses = K.session({ scope: 'user01', storage: { getItem: k => mem[k] || null, setItem: (k, v) => mem[k] = v }, id: () => 'mx', send: async m => { sent.push(m); return m; }, changed() {} });
    const body = K.mealBody('https://vnfwmifmsfecascwaody.supabase.co/storage/v1/object/public/media/user01/meal-abcd01.jpg', 'Salmon bowl', 'low', '');
    assert.ok(body && K.meal(body, 'user01'), 'a real meal body');
    const md = M.fromLog(log, 'low');
    return ses.submitPhoto('Q', body, null, null, md).then(() => {
        assert.equal(sent.length, 1); assert.deepEqual(sent[0].md, md);
        return ses.submitPhoto('Q', K.mealBody('https://vnfwmifmsfecascwaody.supabase.co/storage/v1/object/public/media/user01/meal-abcd02.jpg', 'Toast', 'high', ''), null, null, null);
    }).then(() => { assert.equal(sent.length, 2); assert.equal(sent[1].md, undefined, 'no detail, no key'); });
});

test('the share builds the detail from that one log, and the For You copy keeps it in meta.detail', () => {
    assert.match(mj, /MD \? MD\.fromLog\(log, s\.lvl\) : null/);
    assert.match(mj, /C\.shareMeal\(\{ blob, name: s\.name, lvl: s\.lvl, caption: s\.caption, detail \}\)/);
    assert.match(mj, /fromCommunityShare\(\{ row, id: log\.id, name: s\.name, lvl: s\.lvl, caption: s\.caption \}\)/, 'For You takes the detail from the sent row (row.md)');
    for (const w of ['what the photo check found', 'was der Foto-Check gefunden hat', 'lo que encontró el análisis']) assert.ok(mj.includes(w), 'the share sheet says details go along: ' + w);
    assert.match(fy, /src0 = o\.detail \|\| \(o\.row && o\.row\.md\), d = MD && src0 \? MD\.clean\(src0\) : null; if \(d\) p\.meta\.detail = d;/);
    assert.match(idx, /\(window\.LowiMealDetail \? LowiMealDetail\.fyChip\(p\) : ""\)/);
});

test('For You: the chip is a real button, reads meta.detail or the meal card data, opens on tap and on the card blood sugar line', () => {
    global.window = global; global.LowiMealDetailCore = M; global.TRIBE = { post: (id) => posts[id] };
    let opened = null; global.LowiR2 = { sheet: (h) => { opened = h; return { querySelector: () => null, setAttribute() {} }; } };
    global.CustomEvent = class { constructor(n, o) { this.type = n; this.detail = o && o.detail; } }; global.dispatchEvent = () => true;
    const posts = {
        a: { id: 'a', who: 'Antje', photo: 'https://x/p.jpg', meta: { spike: 'low', dish: 'Salmon bowl', detail: M.fromLog(log, 'low') } },
        b: { id: 'b', who: 'Q', meta: { spike: 'mid', dish: 'Toast' } },
        c: { id: 'c', who: 'Bot', meta: { meal: { name: 'Eggs', items: [{ name: 'Eggs', portion: '2' }], total: { kcal: 160, protein: 12, fat: 10, carbs: 1 } } } },
        d: { id: 'd', who: 'X', meta: { kind: 'recipe' } }
    };
    delete require.cache[require.resolve('../meal-detail.js')]; require('../meal-detail.js');
    const D = global.LowiMealDetail;
    assert.match(D.fyChip(posts.a), /^<button type="button" class="md-fy" data-md-post="a" aria-haspopup="dialog" aria-label="Insulin-friendly\. Show meal details"/);
    assert.match(D.fyChip(posts.c), /md-fy-hint/);
    assert.equal(D.fyChip(posts.d), '');
    D.openPost('a'); assert.ok(opened.includes('Salmon') && opened.includes('From Antje'));
    D.openPost('b'); assert.ok(opened.includes('No details for this meal') && opened.includes('Toast'));
    D.openPost('c'); assert.ok(opened.includes('Eggs') && opened.includes('160') && !opened.includes('No details'));
    assert.match(dom, /closest\('\.fy-slide\[data-id\], \.tr-post\[data-id\]'\)/);
    assert.match(dom, /R\.sheet\(html, \{ cls: 'md-ov' \}\)/, 'the R2 sheet: swipe down, X, backdrop and Escape close it');
});

test('bot recipe posts (Nibblo) never open the details panel: plain without a route, routed to the recipe hook with one', () => {
    global.window = global; global.LowiMealDetailCore = M;
    global.LowiNibblo = require('../nibblo-core.js');
    const NB = global.LowiNibblo, day = '20261026', mid = NB.msgId ? NB.msgId(day, 'n') : 'nb-' + day + '-n';
    const bp = { id: 'p-nb', uid: NB.UID, who: NB.NAME, nb: 1, photo: 'https://x/r.jpg', meta: { spike: 'low', dish: 'Spiced beef lettuce shells', nb: { d: day, s: 'n' } } };
    const pp = { id: 'p-me', who: 'Antje', meta: { spike: 'low', dish: 'Salmon bowl', detail: M.fromLog(log, 'low') } };
    global.TRIBE = { post: (id) => ({ 'p-nb': bp, 'p-me': pp })[id] };
    let opened = null; global.LowiR2 = { sheet: (h) => { opened = h; return { querySelector: () => null, setAttribute() {} }; } };
    global.CustomEvent = class { constructor(n, o) { this.type = n; this.detail = o && o.detail; } }; global.dispatchEvent = () => true;
    delete require.cache[require.resolve('../meal-detail.js')]; require('../meal-detail.js');
    const D = global.LowiMealDetail;
    assert.equal(typeof D.routeBot, 'function'); assert.equal(D.hasBotRoute(), false);
    assert.ok(D.isBot({ uid: NB.UID }) && D.isBot({ uid: 'bot:x' }) && D.isBot(bp) && !D.isBot(pp) && !D.isBot({ uid: 'u1' }));
    // no route yet: no chip, and a tap opens nothing (never the details panel)
    assert.equal(D.fyChip(bp), '');
    opened = null; assert.equal(D.openPost('p-nb'), null); assert.equal(opened, null);
    // people's own posts keep the details panel
    D.openPost('p-me'); assert.ok(opened.includes('Salmon'));
    // with a route: the chip shows, the tap goes to the route with the recipe info, still no panel
    let got = null; D.routeBot((info) => { got = info; });
    assert.equal(D.hasBotRoute(), true);
    assert.match(D.fyChip(bp), /data-md-post="p-nb"/);
    opened = null; assert.equal(D.openPost('p-nb'), true); assert.equal(opened, null);
    assert.equal(got.source, 'foryou'); assert.deepEqual(got.nb, { day, slot: 'n' }); assert.ok(got.recipe.length > 0); assert.match(got.bookId, /^rb_/);
    const ci = D.botInfo('chat', { id: mid, uid: NB.UID }, { name: 'X', lvl: 'low' });
    assert.equal(ci.source, 'chat'); assert.deepEqual(ci.nb, { day, slot: 'n' }); assert.equal(ci.recipe, got.recipe);
    D.routeBot(null); assert.equal(D.hasBotRoute(), false);
    // Chat: bot messages only get the tappable label/photo when a route exists, and mealDetail sends them to openBot, never open()
    const chat = R('community-chat.js');
    assert.match(chat, /function botMeal\(m\)\{return !!\(m&&W\.LowiMealDetail&&W\.LowiMealDetail\.isBot/);
    assert.match(chat, /if\(botMeal\(m\)\)\{const MD=W\.LowiMealDetail;return MD\.openBot&&MD\.openBot\(MD\.botInfo\('chat'/);
    assert.match(chat, /m\.id&&\(!botMeal\(m\)\|\|\(W\.LowiMealDetail\.hasBotRoute&&W\.LowiMealDetail\.hasBotRoute\(\)\)\)/);
    assert.match(chat, /addEventListener\('lowi:meal-bot-route'/);
    delete global.LowiNibblo;
});

test('styles: tappable and readable (AA words, safe area, wraps on an SE), loaded and precached', () => {
    assert.match(css, /padding-bottom:max\(4px,env\(safe-area-inset-bottom\)\)/);
    assert.match(css, /overflow-wrap:anywhere/);
    assert.match(css, /button\.cs-meal-bs\{[^}]*min-height:28px/);
    assert.match(css, /\.md-fy\{[^}]*color:#fff;background:rgba\(8,12,20,\.62\)/);
    assert.match(idx, /<script src="meal-detail-core\.js\?v=[^"]+"><\/script>\n<script src="meal-detail\.js\?v=/);
    assert.match(idx, /<link rel="stylesheet" href="meal-detail\.css\?v=/);
    for (const f of ['meal-detail-core.js', 'meal-detail.js', 'meal-detail.css']) assert.ok(sw.includes('"' + f + '"'), f + ' precached');
});

test('server: one additive nullable column with a whitelist check that mirrors clean()', () => {
    assert.match(sql, /alter table public\.messages add column if not exists meal jsonb;/);
    assert.match(sql, /check \(public\.lowi_meal_detail_ok\(meal\)\)/);
    assert.match(sql, /octet_length\(j::text\) <= 4096/);
    for (const k of M.WHITE) assert.ok(sql.includes("'" + k + "'"), k + ' allowed on the server');
    for (const k of M.KEYS) assert.ok(sql.includes("'" + k + "'"));
    assert.ok(!/drop table|delete from|truncate/i.test(sql.split('-- rollback')[0]));
});
