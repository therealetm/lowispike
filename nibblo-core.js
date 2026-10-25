/* LOWiSPIKE inspiration bot "Nibblo": meal posts in Chat and For You, three times a day (pure logic + a small browser glue).
 * 25 Oct 2026, Emmanuel (voice, part German): "The bot that's supposed to send pictures into the chat room didn't actually send.
 * That also gets posted to the For You page simultaneously, just like a normal human posting what they ate ... morgens, mittags
 * und abends, was ist daraus passiert?"
 * What had happened: the inspiration bot was only ever built as a slide each phone draws for itself in For You (inspo-core.js,
 * one swap a day at 07:00). Nothing ran on the server, so it never wrote to the chat or the shared For You table, and nothing
 * posted at noon or in the evening. The Community cleanups did not hide it; there was simply nothing to hide.
 * Now: one real bot account ("Nibblo", profiles.bot = true, so Chat shows "Nibblo - Bot" and the Room/Ranking/Add-friend leave
 * it out) posts a Recipe Book meal photo with a short caption at 07:30, 12:30 and 18:30 Europe/Berlin. The server does it
 * (pg_cron job 'nibblo-meals' -> public.nibblo_tick(), supabase/proposals/nibblo_meals_20261025.sql, generated from this file
 * by tools/nibblo/gen-sql.cjs), exactly like a member who shares a logged meal: one chat message in the main room
 * ("🍽 <photo>#l=low&n=<dish> <caption>", id nb-YYYYMMDD-m|n|e) and the same meal in For You (posts row s<message id>, meta
 * {dish, from:'community', spike:'low', nb}, rec = the Recipe Book id rb_..., so the For You insulin rule lets it through).
 * The server writes the English text; each phone shows the dish and caption in its own language (chatMeal / post below).
 * Photos: the Recipe Book's own photos (FOOD_IMG in index.html / fy-img/), copied once to storage media/<bot>/meal-nb-<id>.webp.
 * No push: nothing here notifies anyone, and the For You nudge (n1-push) skips bot accounts. Owner's food rules: only Recipe
 * Book recipes with the "ja" verdict, no chocolate/cocoa, no sweetened products, no pork. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.LowiNibblo = api; try { api.install(root); } catch (e) { /* no window */ } }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const NAME = 'Nibblo';
  const UID = '59bb3615-b344-4c45-ab0f-0a5de5cd8df3';
  const EMAIL = 'nibblo@bot.lowispike.invalid';
  const LOOK = '1.2.3.2fbf71.ffd166.s.f.s.w.39u~Sprig';
  const MEDIA = 'https://vnfwmifmsfecascwaody.supabase.co/storage/v1/object/public/media/' + UID + '/';
  const TZ = 'Europe/Berlin';
  const LANGS = ['en', 'de', 'es'];
  /* slot -> Berlin wall-clock time; a slot is posted from that time until WINDOW_MIN later (so a late tick still posts, once) */
  const SLOTS = { m: '07:30', n: '12:30', e: '18:30' };
  const WINDOW_MIN = 120;
  const EPOCH = Date.UTC(2026, 0, 1);

  const INTROS = {
    m: [
      ['Morning! Breakfast that won\u2019t spike you:', 'Moin! Frühstück ohne Zuckerachterbahn:', '¡Buenos días! Un desayuno sin montaña rusa de azúcar:'],
      ['Rise and shine, your blood sugar says thanks:', 'Guten Morgen! Dein Blutzucker sagt danke:', '¡Arriba! Tu azúcar en sangre te lo agradece:'],
      ['Coffee\u2019s on? Here\u2019s breakfast:', 'Kaffee läuft? Dann hier das Frühstück:', '¿Ya hay café? Aquí va el desayuno:'],
      ['Breakfast idea before the day gets going:', 'Frühstücksidee, bevor der Tag losrennt:', 'Idea de desayuno antes de que arranque el día:']
    ],
    n: [
      ['Lunch break! Low spike, high crunch:', 'Mittagspause! Wenig Spike, viel Crunch:', '¡Hora de comer! Poco pico, mucho crujiente:'],
      ['Noon slump? Not with this:', 'Mittagstief? Nicht mit dem hier:', '¿Bajón de mediodía? Con esto no:'],
      ['Lunch idea, straight from the Recipe Book:', 'Mahlzeit! Hier die Mittagsidee:', '¡Buen provecho! La idea de hoy para comer:'],
      ['Skip the bakery queue today:', 'Heute mal an der Bäckerschlange vorbei:', 'Hoy pasamos de la cola de la panadería:']
    ],
    e: [
      ['Dinner time! Comfort food, rebuilt:', 'Feierabend! Soulfood, neu gebaut:', '¡A cenar! Comida reconfortante, reinventada:'],
      ['Evening craving? I\u2019ve got you:', 'Abendhunger? Ich hab da was:', '¿Antojo de noche? Te tengo cubierto:'],
      ['Tonight\u2019s plate, no sugar crash before bed:', 'Heute Abend auf dem Teller, ohne Zuckercrash vorm Schlafen:', 'El plato de esta noche, sin bajón de azúcar antes de dormir:'],
      ['Dinner idea, sofa-approved:', 'Abendessen-Idee, sofa-geprüft:', 'Idea de cena, aprobada por el sofá:']
    ]
  };

  /* r: the Recipe Book name (index.html RECIPE_BOOK, verdict "ja"); name: the app's own translations (index.html ROWS) */
  const MENU = {
    m: [
      { r: 'Cottage Cheese Pancake Bites', e: '🥞', name: ['Cottage Cheese Pancake Bites', 'Hüttenkäse-Pancake-Happen', 'Bocaditos de tortitas de requesón'],
        line: ['Little pancakes from cottage cheese, egg and almond flour, with smashed berries on top.', 'Mini-Pancakes aus Hüttenkäse, Ei und Mandelmehl, mit zerdrückten Beeren obendrauf.', 'Tortitas mini de requesón, huevo y harina de almendra, con frutos rojos chafados encima.'] },
      { r: 'Cabbage Egg Okonomiyaki', e: '🥞', name: ['Cabbage Egg Okonomiyaki', 'Kohl-Ei-Okonomiyaki', 'Okonomiyaki de col y huevo'],
        line: ['A thick savory pancake of cabbage, egg and shrimp. No flour, all crispy edges.', 'Ein dicker herzhafter Pfannkuchen aus Kohl, Ei und Garnelen. Kein Mehl, nur knusprige Ränder.', 'Una tortita salada y gruesa de col, huevo y gambas. Sin harina, todo bordes crujientes.'] },
      { r: 'Lemon Ricotta Berry Cups', e: '🍋', name: ['Lemon Ricotta Berry Cups', 'Zitronen-Ricotta-Beerenbecher', 'Vasitos de ricotta al limón con frutos rojos'],
        line: ['Whipped ricotta and yogurt with lemon zest, berries and chopped almonds.', 'Aufgeschlagener Ricotta mit Joghurt, Zitronenabrieb, Beeren und gehackten Mandeln.', 'Ricotta y yogur batidos con ralladura de limón, frutos rojos y almendras picadas.'] },
      { r: 'Cinnamon Baked Yogurt Custard', e: '🍮', name: ['Cinnamon Baked Yogurt Custard', 'Gebackener Zimt-Joghurt-Pudding', 'Natillas de yogur al horno con canela'],
        line: ['Greek yogurt and eggs, baked with cinnamon until just set. Cake vibes at breakfast.', 'Griechischer Joghurt und Eier, mit Zimt gebacken, bis alles gerade fest ist. Kuchen-Feeling zum Frühstück.', 'Yogur griego y huevos horneados con canela hasta que cuajan. Ambiente de bizcocho en el desayuno.'] },
      { r: 'Smoked Salmon Cucumber Bites', e: '🐟', name: ['Smoked Salmon Cucumber Bites', 'Räucherlachs-Gurken-Happen', 'Bocados de pepino con salmón ahumado'],
        line: ['Smoked salmon, Frischkäse and dill on cucumber slices. The bagel stayed at the bakery.', 'Räucherlachs, Frischkäse und Dill auf Gurkenscheiben. Der Bagel ist beim Bäcker geblieben.', 'Salmón ahumado, queso crema y eneldo sobre rodajas de pepino. El bagel se quedó en la panadería.'] },
      { r: 'Jammy Egg Nori Bites', e: '🍙', name: ['Jammy Egg Nori Bites', 'Wachsweiche Ei-Nori-Happen', 'Bocados de nori con huevo meloso'],
        line: ['Jammy eggs, cucumber and sesame wrapped in nori. Sushi-snack energy, no rice.', 'Wachsweiche Eier, Gurke und Sesam in Nori. Sushi-Snack-Gefühl, ganz ohne Reis.', 'Huevos melosos, pepino y sésamo envueltos en nori. Rollo snack de sushi, sin arroz.'] },
      { r: 'Frischkäse Cheesecake Jars', e: '🍰', name: ['Frischkäse Cheesecake Jars', 'Frischkäse-Cheesecake im Glas', 'Cheesecake de queso crema en vaso'],
        line: ['Frischkäse and yogurt layered with berries and almond crunch. Cheesecake for breakfast, legally.', 'Frischkäse und Joghurt im Glas, mit Beeren und Mandelcrunch. Käsekuchen zum Frühstück, ganz legal.', 'Queso crema y yogur en capas con frutos rojos y almendra crujiente. Tarta de queso para desayunar, y es legal.'] }
    ],
    n: [
      { r: 'Garlic Yogurt Chicken Box', e: '🍗', name: ['Garlic Yogurt Chicken Box', 'Knoblauch-Joghurt-Hähnchenbox', 'Caja de pollo con yogur al ajo'],
        line: ['Smoky chicken, garlic yogurt, cabbage and tomatoes. All the döner, none of the flatbread.', 'Rauchiges Hähnchen, Knoblauchjoghurt, Kohl und Tomaten. Der ganze Döner, nur ohne Fladenbrot.', 'Pollo ahumado, yogur al ajo, col y tomate. Todo el kebab, sin el pan.'] },
      { r: 'Konjak Sushi Crunch Bowl', e: '🍣', name: ['Konjak Sushi Crunch Bowl', 'Konjak-Sushi-Crunch-Bowl', 'Bowl crujiente de sushi con konjac'],
        line: ['Salmon, cucumber, avocado, nori and sesame over konjac rice. Chopsticks ready.', 'Lachs, Gurke, Avocado, Nori und Sesam auf Konjakreis. Stäbchen bereit.', 'Salmón, pepino, aguacate, nori y sésamo sobre arroz de konjac. Palillos listos.'] },
      { r: 'Tandoori Lettuce Wrap Plate', e: '🌯', name: ['Tandoori Lettuce Wrap Plate', 'Tandoori-Salatwraps', 'Wraps de lechuga con pollo tandoori'],
        line: ['Chicken in yogurt and spice, wrapped in cool lettuce with cucumber and mint. The naan gets the day off.', 'Hähnchen in Joghurt und Gewürzen, in kühlem Salat mit Gurke und Minze. Das Naan hat heute frei.', 'Pollo con yogur y especias, envuelto en lechuga fresca con pepino y menta. El naan se toma el día libre.'] },
      { r: 'Chicken Caesar Lettuce Boats', e: '🥗', name: ['Chicken Caesar Lettuce Boats', 'Hähnchen-Caesar-Salatschiffchen', 'Barquitas de lechuga César con pollo'],
        line: ['Chicken, parmesan and a lemony yogurt Caesar dressing in lettuce boats. Croutons not invited.', 'Hähnchen, Parmesan und ein zitroniges Joghurt-Caesar-Dressing in Salatschiffchen. Croutons sind nicht eingeladen.', 'Pollo, parmesano y una salsa César de yogur y limón en barquitas de lechuga. Los picatostes no están invitados.'] },
      { r: 'Shirataki Broth Bowl', e: '🍜', name: ['Shirataki Broth Bowl', 'Shirataki-Brühe-Bowl', 'Bol de caldo con shirataki'],
        line: ['Bone broth with shirataki, egg, chicken and mushrooms. Ramen comfort, gentle on the curve.', 'Knochenbrühe mit Shirataki, Ei, Hähnchen und Pilzen. Ramen-Gefühl, sanft zur Kurve.', 'Caldo de huesos con shirataki, huevo, pollo y setas. Consuelo de ramen, suave con la curva.'] },
      { r: 'Cauliflower Egg Wok Fry', e: '🍳', name: ['Cauliflower Egg Wok Fry', 'Blumenkohl-Ei-Wokpfanne', 'Salteado al wok de coliflor y huevo'],
        line: ['Cauliflower rice tossed hot with egg, shrimp, ginger and tamari. Fried-rice craving, handled.', 'Blumenkohlreis, heiß geschwenkt mit Ei, Garnelen, Ingwer und Tamari. Bratreis-Lust, erledigt.', 'Arroz de coliflor salteado con huevo, gambas, jengibre y tamari. Antojo de arroz frito, resuelto.'] },
      { r: 'Tuna Cucumber Crunch Boats', e: '🥒', name: ['Tuna Cucumber Crunch Boats', 'Thunfisch-Gurken-Boote', 'Barquitas crujientes de pepino con atún'],
        line: ['Tuna, yogurt, mustard and pickles in hollowed cucumber. Sandwich feeling, cold and crunchy.', 'Thunfisch, Joghurt, Senf und Gewürzgurke in ausgehöhlter Gurke. Sandwich-Feeling, kühl und knackig.', 'Atún, yogur, mostaza y pepinillos en pepino vaciado. Sensación de bocadillo, fresca y crujiente.'] },
      { r: 'Buffalo Chicken Lettuce Cups', e: '🥬', name: ['Buffalo Chicken Lettuce Cups', 'Buffalo-Chicken-Salatschalen', 'Cuencos de lechuga con pollo buffalo'],
        line: ['Hot-sauce chicken in lettuce cups with a cool yogurt and feta dip.', 'Hähnchen in scharfer Soße in Salatschalen, mit kühlem Joghurt-Feta-Dip.', 'Pollo con salsa picante en cuencos de lechuga, con un dip fresco de yogur y feta.'] }
    ],
    e: [
      { r: 'Nori Smash Burger Stack', e: '🍔', name: ['Nori Smash Burger Stack', 'Nori-Smash-Burger-Stapel', 'Torre de smash burger con nori'],
        line: ['A crispy smash patty with all your toppings, wrapped in nori instead of a bun. Same bite, new trick.', 'Ein knuspriges Smash-Patty mit allen Toppings, in Nori statt im Brötchen. Gleicher Biss, neuer Trick.', 'Una hamburguesa smash crujiente con todos tus toppings, envuelta en nori en vez de pan. Mismo bocado, nuevo truco.'] },
      { r: 'Zucchini Ribbon Beef Ragout', e: '🍝', name: ['Zucchini Ribbon Beef Ragout', 'Zucchini-Bänder mit Rinder-Ragout', 'Ragú de ternera con cintas de calabacín'],
        line: ['Beef ragout in tomato sauce over zucchini ribbons, with parmesan. Bolognese night, rebuilt.', 'Rinder-Ragout in Tomatensoße auf Zucchinibändern, mit Parmesan. Bolognese-Abend, neu gebaut.', 'Ragú de ternera con tomate sobre cintas de calabacín, con parmesano. Noche de boloñesa, reinventada.'] },
      { r: 'Frischkäse Pepper Pizza Boats', e: '🫑', name: ['Frischkäse Pepper Pizza Boats', 'Frischkäse-Paprika-Pizzaboote', 'Barquitas de pimiento pizza con queso crema'],
        line: ['Pepper halves with tomato, Frischkäse and melted mozzarella. The pepper is the crust now, and it\u2019s thriving.', 'Paprikahälften mit Tomate, Frischkäse und geschmolzenem Mozzarella. Die Paprika ist jetzt der Boden, und sie liebt es.', 'Mitades de pimiento con tomate, queso crema y mozzarella fundida. Ahora el pimiento es la masa, y le sienta genial.'] },
      { r: 'Shirataki Carbonara Pull', e: '🍝', name: ['Shirataki Carbonara Pull', 'Shirataki-Carbonara', 'Carbonara de shirataki'],
        line: ['Silky egg and parmesan sauce with chicken over shirataki noodles. Creamy comfort, rebuilt.', 'Seidige Ei-Parmesan-Soße mit Hähnchen auf Shirataki. Cremiges Soulfood, neu gebaut.', 'Salsa sedosa de huevo y parmesano con pollo sobre shirataki. Cremosa y reconfortante, reinventada.'] },
      { r: 'Spiced Beef Lettuce Shells', e: '🌮', name: ['Spiced Beef Lettuce Shells', 'Würzige Rindfleisch-Salatschiffchen', 'Hojas de lechuga con ternera especiada'],
        line: ['Smoky beef, salsa, avocado and cheddar in crunchy lettuce shells. Taco night, no tortilla.', 'Rauchiges Rindfleisch, Salsa, Avocado und Cheddar in knackigen Salatblättern. Taco-Abend ohne Tortilla.', 'Ternera ahumada, salsa, aguacate y cheddar en hojas de lechuga crujientes. Noche de tacos sin tortilla.'] },
      { r: 'Cauliflower Nacho Smash Tray', e: '🌮', name: ['Cauliflower Nacho Smash Tray', 'Blumenkohl-Nacho-Blech', 'Bandeja de nachos de coliflor'],
        line: ['Roasted cauliflower with beef, melted cheddar, salsa and avocado. No tortilla chips, all the party.', 'Gerösteter Blumenkohl mit Rindfleisch, geschmolzenem Cheddar, Salsa und Avocado. Keine Tortilla-Chips, volle Party.', 'Coliflor asada con ternera, cheddar fundido, salsa y aguacate. Sin totopos, con toda la fiesta.'] },
      { r: 'Zucchini Turkey Burger Melt', e: '🥒', name: ['Zucchini Turkey Burger Melt', 'Zucchini-Puten-Burger-Melt', 'Burger melt de pavo con calabacín'],
        line: ['A turkey patty with melted cheddar and pickles on zucchini ribbons. Burger-bowl energy.', 'Ein Puten-Patty mit geschmolzenem Cheddar und Gewürzgurke auf Zucchinibändern. Burger-Bowl-Energie.', 'Una hamburguesa de pavo con cheddar fundido y pepinillos sobre cintas de calabacín. Energía de burger en bol.'] }
    ]
  };

  /* the Recipe Book photo id the app already uses (FOOD_IMG / fy-img): rb_<name in snake case> */
  function bookId(r) { return 'rb_' + String(r).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''); }
  function photoFile(r) { return 'meal-nb-' + bookId(r).slice(3) + '.webp'; }
  function photoUrl(r) { return MEDIA + photoFile(r); }
  const li = l => Math.max(0, LANGS.indexOf(String(l || 'en').slice(0, 2).toLowerCase()));

  /* day number of a Berlin calendar day 'YYYYMMDD' (or 'YYYY-MM-DD'), counted from 1 Jan 2026 */
  function dayNum(day) { const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(String(day || '')); if (!m) return -1; return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - EPOCH) / 864e5); }
  const mod = (a, n) => ((a % n) + n) % n;
  /* which dish and which intro a slot of a day gets: the same rule the server uses (nibblo_tick, idx = day number mod count) */
  function pick(day, slot) {
    const dn = dayNum(day), list = MENU[slot], intros = INTROS[slot];
    if (dn < 0 || !list) return null;
    return { day: String(day).replace(/-/g, ''), slot, dish: list[mod(dn, list.length)], intro: intros[mod(dn, intros.length)], mi: mod(dn, list.length), ii: mod(dn, intros.length) };
  }
  function texts(p, lang) {
    const i = li(lang), d = p.dish;
    return { name: d.name[i], caption: p.intro[i] + ' ' + d.line[i], cap: p.intro[i] + ' ' + d.e + ' ' + d.name[i] + '. ' + d.line[i] };
  }
  const msgId = (day, slot) => 'nb-' + String(day).replace(/-/g, '') + '-' + slot;
  const postId = (day, slot) => 's' + msgId(day, slot);
  /* the chat body, exactly what a member's "Log a meal" share writes (community-chat-core.js mealBody) */
  /* mealBody: community-chat-core.js's own (LowiChatCore.mealBody), so the bot's message is byte for byte what a member's share writes */
  function chatBody(day, slot, mealBody) { const p = pick(day, slot); if (!p || typeof mealBody !== 'function') return ''; const t = texts(p, 'en'); return mealBody(photoUrl(p.dish.r), t.name, 'low', t.caption); }
  function postRow(day, slot) {
    const p = pick(day, slot); if (!p) return null; const t = texts(p, 'en');
    return { id: postId(day, slot), user_id: UID, who: NAME, cap: t.cap, photo_url: photoUrl(p.dish.r), rec: bookId(p.dish.r), art: [p.dish.e, 150, 200],
      meta: { dish: t.name, from: 'community', spike: 'low', nb: { d: p.day, s: slot } } };
  }

  /* ---- the viewer's side: the same post in their language ---- */
  const MSG_RX = /^nb-(\d{8})-([mne])$/;
  function viewLang(W) {
    try { const l = (W.document && W.document.documentElement && W.document.documentElement.lang) || 'en'; return LANGS[li(l)]; } catch (e) { return 'en'; }
  }
  /* chat: ml is LowiChatCore.meal()'s {src,lvl,name,caption}; m the message {id, uid}. Anything not Nibblo's comes back as it was. */
  function chatMeal(ml, m, lang) {
    if (!ml || !m || m.uid !== UID) return ml;
    const k = MSG_RX.exec(String(m.id || '')); if (!k) return ml;
    const p = pick(k[1], k[2]); if (!p || ml.src !== photoUrl(p.dish.r)) return ml;
    const t = texts(p, lang || 'en');
    return { src: ml.src, lvl: ml.lvl, name: t.name, caption: t.caption, nb: true };
  }
  /* community-chat.js photoOf(): the bot's meal message as Chat's {src, caption, meal}, in this phone's language; null for anything else */
  function chatPhoto(K, m, u) {
    if (!K || !K.meal || !m || m.uid !== UID) return null;
    const x = chatMeal(K.meal(m.t, u), m, api.lang());
    return x && x.nb ? { src: x.src, caption: x.caption, meal: x } : null;
  }
  function isPost(p) { return !!(p && p.uid === UID && p.meta && p.meta.nb && MSG_RX.test('nb-' + p.meta.nb.d + '-' + p.meta.nb.s)); }
  /* For You: a mapped cloud post (index.html mapPost). Nibblo's own gets its caption in the viewer's language (read each time it
   * is drawn, so switching the language switches it) and nb: 1, which draws the small "Bot" tag next to the name. */
  function post(p, langOf) {
    if (!isPost(p)) return p;
    const k = pick(p.meta.nb.d, p.meta.nb.s); if (!k) return p;
    const fn = typeof langOf === 'function' ? langOf : () => langOf || 'en';
    p.nb = 1; p.who = NAME;
    try { Object.defineProperty(p, 'cap', { enumerable: true, configurable: true, get() { return texts(k, fn()).cap; }, set() { /* the server's English stays put */ } }); } catch (e) { p.cap = texts(k, fn()).cap; }
    return p;
  }
  const BOT_TAG = ['Bot', 'Bot', 'Bot'];

  /* Berlin wall clock for an instant: {day:'YYYYMMDD', min: minutes since midnight} */
  function berlin(t) {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const o = {}; f.formatToParts(new Date(t)).forEach(x => { o[x.type] = x.value; });
    return { day: o.year + o.month + o.day, min: (+o.hour) * 60 + (+o.minute) };
  }
  /* the slot the server posts at instant t (or null): mirrors nibblo_tick() */
  function dueSlot(t) {
    const b = berlin(t);
    for (const s of Object.keys(SLOTS)) { const [h, mi] = SLOTS[s].split(':').map(Number), at = h * 60 + mi; if (b.min >= at && b.min < at + WINDOW_MIN) return { day: b.day, slot: s }; }
    return null;
  }

  function install(W) {
    if (!W || W.__lowiNibblo) return; W.__lowiNibblo = 1;
    W.LowiNibblo = api;
    api.lang = () => viewLang(W);
  }

  const api = { NAME, UID, EMAIL, LOOK, MEDIA, TZ, LANGS, SLOTS, WINDOW_MIN, INTROS, MENU, BOT_TAG, bookId, photoFile, photoUrl, dayNum, pick, texts, msgId, postId, chatBody, postRow, chatMeal, chatPhoto, isPost, post, berlin, dueSlot, install, lang: () => 'en' };
  return api;
});
