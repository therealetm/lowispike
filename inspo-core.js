/* LOWiSPIKE inspiration bot "Nibblo" (pure logic, no DOM).
 * Oct 24 2026 (Emmanuel): "the bot's recommendations should only reach the For You page, so that's one thing together."
 * The bot lives in For You (Community > For You / "Für dich") and nowhere else: no Chat message, no People entry, no push,
 * no unread badge. One slide a day: a swap of the day from the LOWiSPIKE Recipe Book (the owner's craving -> recipe map in
 * data/food-policy/master-knowledge.v3.md, section 10/102) and, every other day, a Gold Rush product picked by hand from
 * data/shop (Open Food Facts labels; tests/inspo.test.cjs checks every number against that data and the app's own Shop
 * rating). Every swap recipe carries the Recipe Book's own "ja" verdict, so the slide passes the For You insulin-friendly
 * rule (foryou-core.js) like any other post. Nothing is posted to the server: each phone builds the same slides locally,
 * in its own language. For You shows today's slide and the few before it (feed()).
 * Photos: the Recipe Book's own generated photos (FOOD_IMG in index.html) or, for recipes that had none, photos generated
 * for the app on 24 Oct 2026 in fy-img/<recipe id>.webp (FILES below).
 * Name: "Nibblo" (same in every language). "Sprouty" clashed with the default companion name "Sprout". */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.LowiInspoCore=api;
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const NAME='Nibblo';
  const BOT_ID='bot:nibblo';
  const LANGS=['en','de','es'];
  const CARD_HOUR=7;            // the day's card is dated 07:00 local
  const SHOW_DAYS=5;            // For You shows today's slide and the 4 before it
  const DAY=86400000;

  const L={
    swap:['Swap of the day','Tausch des Tages','Cambio del día'],
    craving:['Craving','Lust auf','Antojo de'],
    tryIt:['Try','Probier','Prueba'],
    book:['In the LOWiSPIKE Recipe Book','Im LOWiSPIKE-Rezeptbuch','En el recetario de LOWiSPIKE'],
    gold:['Gold Rush','Goldrausch','Fiebre del oro'],
    spotted:['Spotted on the shelf','Im Regal entdeckt','Visto en la estantería'],
    per100:['per 100 g','pro 100 g','por 100 g'],
    carbs:['carbs','Kohlenhydrate','hidratos'],
    sugar:['sugar','Zucker','azúcar'],
    protein:['protein','Eiweiß','proteína'],
    fibre:['fibre','Ballaststoffe','fibra'],
    store:['{s} in Germany','{s} in Deutschland','{s} en Alemania'],
    goldSrc:['Label values from Open Food Facts. Check the pack, recipes change.',
      'Werte vom Etikett laut Open Food Facts. Schau auf die Packung, Rezepturen ändern sich.',
      'Valores de la etiqueta según Open Food Facts. Mira el envase, las recetas cambian.'],
    bot:['Bot','Bot','Bot'],
    aria:['Nibblo, the For You food bot','Nibblo, der Food-Bot in Für dich','Nibblo, el bot de comida de Para ti'],
    recipe:['Recipe','Rezept','Receta'],
  };

  const INTROS=[
    ['Morning, team! Your daily bite of inspiration is here.','Moin, Team! Hier kommt dein täglicher Happen Inspiration.','¡Buenos días, equipo! Aquí va tu bocado diario de inspiración.'],
    ['Psst. Today’s swap is a sneaky good one.','Psst. Der heutige Tausch ist ziemlich raffiniert.','Psst. El cambio de hoy es un truquito genial.'],
    ['Hungry? Same. Here’s today’s idea.','Hunger? Ich auch. Hier ist die Idee des Tages.','¿Hambre? Yo también. Aquí va la idea del día.'],
    ['Plot twist: comfort food, rebuilt.','Plot-Twist: Soulfood, neu gebaut.','Giro de guion: comida reconfortante, reinventada.'],
    ['New day, new swap. We’ve got this, together.','Neuer Tag, neuer Tausch. Wir packen das zusammen.','Nuevo día, nuevo cambio. Juntos lo tenemos.'],
    ['Cravings love a good disguise. So do we.','Heißhunger liebt Verkleidungen. Wir auch.','A los antojos les encanta un buen disfraz. A nosotros también.']
  ];

  /* Swap of the day: craving -> Recipe Book recipe. Recipe names are the
   * app's own names and translations (index.html recipe table). The "why"
   * only says what the recipe leaves out and what it keeps, as the recipe
   * itself is written; no nutrition or medical claims. */
  const SWAPS=[
    {k:'doner',e:'🍗',r:'Garlic Yogurt Chicken Box',
      from:['Döner kebab','Döner','Döner kebab'],
      to:['Garlic Yogurt Chicken Box','Knoblauch-Joghurt-Hähnchenbox','Caja de pollo con yogur al ajo'],
      why:['All the döner feels: spiced chicken and garlic yogurt sauce, served over crunchy salad instead of flatbread and fries.',
        'Volles Döner-Gefühl: gewürztes Hähnchen und Knoblauch-Joghurtsoße, auf knackigem Salat statt Fladenbrot und Pommes.',
        'Todo el sabor del döner: pollo especiado y salsa de yogur con ajo, sobre ensalada crujiente en vez de pan y patatas fritas.']},
    {k:'bolognese',e:'🍝',r:'Zucchini Ribbon Beef Ragout',
      from:['Spaghetti bolognese','Spaghetti Bolognese','Espaguetis a la boloñesa'],
      to:['Zucchini Ribbon Beef Ragout','Zucchini-Bänder mit Rinder-Ragout','Ragú de ternera con cintas de calabacín'],
      why:['The slow beef ragout stays. The spaghetti becomes zucchini ribbons. Twirl away, nobody’s judging.',
        'Das Rinderragout bleibt. Die Spaghetti werden zu Zucchini-Bändern. Aufwickeln erlaubt, keiner guckt.',
        'El ragú de ternera se queda. Los espaguetis se vuelven cintas de calabacín. Enrolla tranquilo, nadie mira.']},
    {k:'friedrice',e:'🍳',r:'Cauliflower Egg Wok Fry',
      from:['Fried rice','Gebratener Reis','Arroz frito'],
      to:['Cauliflower Egg Wok Fry','Blumenkohl-Ei-Wokpfanne','Salteado al wok de coliflor y huevo'],
      why:['Same wok, same egg, same sizzle. Grated cauliflower plays the rice, and honestly? It’s a natural.',
        'Gleicher Wok, gleiches Ei, gleiches Brutzeln. Geraspelter Blumenkohl spielt den Reis, und zwar richtig gut.',
        'Mismo wok, mismo huevo, mismo chisporroteo. La coliflor rallada hace de arroz, y lo borda.']},
    {k:'ramen',e:'🍜',r:'Shirataki Broth Bowl',
      from:['Ramen','Ramen','Ramen'],
      to:['Shirataki Broth Bowl','Shirataki-Brühe-Bowl','Bol de caldo con shirataki'],
      why:['A big steaming bowl of broth with egg and slurpable shirataki noodles instead of wheat noodles. Slurping fully allowed.',
        'Eine große dampfende Schale Brühe mit Ei und Shirataki statt Weizennudeln. Schlürfen ausdrücklich erlaubt.',
        'Un buen bol de caldo humeante con huevo y fideos shirataki en vez de fideos de trigo. Sorber está permitido.']},
    {k:'tacos',e:'🌮',r:'Spiced Beef Lettuce Shells',
      from:['Taco night','Taco-Abend','Noche de tacos'],
      to:['Spiced Beef Lettuce Shells','Würzige Rindfleisch-Salatschiffchen','Hojas de lechuga con ternera especiada'],
      why:['Spiced beef, all the toppings, and crisp lettuce leaves as the shells. Taco night is still taco night.',
        'Würziges Rind, alle Toppings und knackige Salatblätter als Schalen. Taco-Abend bleibt Taco-Abend.',
        'Ternera especiada, todos los toppings y hojas de lechuga crujientes como tortilla. La noche de tacos sigue en pie.']},
    {k:'chips',e:'🥬',r:'Smoky Kale Crunch',
      from:['Potato chips','Kartoffelchips','Patatas fritas de bolsa'],
      to:['Smoky Kale Crunch','Rauchiger Grünkohl-Crunch','Crujiente de kale ahumado'],
      why:['Baked kale with smoky seasoning. The crunch is real, the potato is on holiday.',
        'Gebackener Grünkohl mit rauchiger Würze. Der Crunch ist echt, die Kartoffel hat Urlaub.',
        'Kale horneado con un toque ahumado. El crujido es real, la patata está de vacaciones.']},
    {k:'caesar',e:'🥗',r:'Chicken Caesar Lettuce Boats',
      from:['Caesar salad with croutons','Caesar Salad mit Croûtons','Ensalada César con picatostes'],
      to:['Chicken Caesar Lettuce Boats','Hähnchen-Caesar-Salatschiffchen','Barquitas de lechuga César con pollo'],
      why:['Chicken, parmesan and Caesar dressing in little lettuce boats. The croutons can sit this one out.',
        'Hähnchen, Parmesan und Caesar-Dressing in kleinen Salatbooten. Die Croûtons dürfen heute zuschauen.',
        'Pollo, parmesano y aliño César en barquitas de lechuga. Los picatostes hoy miran desde el banquillo.']},
    {k:'bagel',e:'🐟',r:'Smoked Salmon Cucumber Bites',
      from:['Bagel with salmon','Bagel mit Lachs','Bagel con salmón'],
      to:['Smoked Salmon Cucumber Bites','Räucherlachs-Gurken-Happen','Bocados de pepino con salmón ahumado'],
      why:['Smoked salmon and cream cheese on crunchy cucumber rounds instead of a bagel. Fancy brunch, zero effort.',
        'Räucherlachs und Frischkäse auf knackigen Gurkenscheiben statt Bagel. Schicker Brunch, null Aufwand.',
        'Salmón ahumado y queso crema sobre rodajas de pepino en vez de bagel. Brunch elegante sin esfuerzo.']},
    {k:'tiramisu',e:'🍮',r:'Espresso Cottage Cream Cups',
      from:['Tiramisu','Tiramisu','Tiramisú'],
      to:['Espresso Cottage Cream Cups','Espresso-Hüttenkäse-Cremebecher','Vasitos de crema de requesón y espresso'],
      why:['Espresso, cocoa and a creamy cottage cheese layer. No ladyfingers, no added sugar, still very much tiramisu energy.',
        'Espresso, Kakao und eine cremige Hüttenkäse-Schicht. Keine Löffelbiskuits, kein zugesetzter Zucker, trotzdem volle Tiramisu-Energie.',
        'Espresso, cacao y una capa cremosa de requesón. Sin bizcochos ni azúcar añadido, pero con toda la energía del tiramisú.']},
    {k:'cheesecake',e:'🍋',r:'Lemon Ricotta Berry Cups',
      from:['Lemon cheesecake','Zitronen-Käsekuchen','Tarta de queso al limón'],
      to:['Lemon Ricotta Berry Cups','Zitronen-Ricotta-Beerenbecher','Vasitos de ricotta al limón con frutos rojos'],
      why:['Lemony ricotta cream with a few berries and no biscuit base. Cheesecake mood in a cup.',
        'Zitronige Ricottacreme mit ein paar Beeren und ohne Keksboden. Käsekuchen-Laune im Becher.',
        'Crema de ricota con limón y unos frutos rojos, sin base de galleta. Ganas de tarta de queso en un vasito.']},
    {k:'icelolly',e:'🍓',r:'Strawberry Skyr Freeze Pops',
      from:['Ice lolly','Eis am Stiel','Polo helado'],
      to:['Strawberry Skyr Freeze Pops','Erdbeer-Skyr-Eis am Stiel','Polos helados de skyr y fresa'],
      why:['Skyr and strawberries, frozen on a stick. No syrup needed, just a bit of patience and a freezer.',
        'Skyr und Erdbeeren, am Stiel gefroren. Kein Sirup nötig, nur etwas Geduld und ein Gefrierfach.',
        'Skyr y fresas congelados en un palito. Sin sirope, solo un poco de paciencia y un congelador.']},
    {k:'lemonade',e:'🫧',r:'Ginger Lemon Fizz',
      from:['Lemonade','Limonade','Limonada'],
      to:['Ginger Lemon Fizz','Ingwer-Zitronen-Fizz','Refresco de jengibre y limón'],
      why:['Sparkling water with fresh ginger and lemon instead of a sugary lemonade. Fizzy, zingy, done.',
        'Sprudelwasser mit frischem Ingwer und Zitrone statt zuckriger Limo. Prickelnd, frisch, fertig.',
        'Agua con gas con jengibre fresco y limón en vez de limonada azucarada. Burbujas, chispa y listo.']},
    {k:'chai',e:'🍵',r:'Iced Cardamom Spice Tea',
      from:['Chai latte','Chai Latte','Chai latte'],
      to:['Iced Cardamom Spice Tea','Eistee mit Kardamom und Gewürzen','Té helado de cardamomo y especias'],
      why:['All the chai spices, brewed and iced, without the sweet syrup. Your taste buds get the whole spice rack.',
        'Alle Chai-Gewürze, aufgebrüht und auf Eis, ohne süßen Sirup. Deine Geschmacksknospen bekommen das ganze Gewürzregal.',
        'Todas las especias del chai, infusionadas y con hielo, sin sirope dulce. Tu paladar se lleva todo el especiero.']},
    {k:'burger',e:'🍔',r:'Nori Smash Burger Stack',
      from:['Burger','Burger','Hamburguesa'],
      to:['Nori Smash Burger Stack','Nori-Smash-Burger-Stapel','Torre de smash burger con nori'],
      why:['A crispy smash patty with all your toppings, wrapped in nori instead of a bun. Same bite, new trick.',
        'Ein knuspriges Smash-Patty mit allen Toppings, in Nori statt im Brötchen. Gleicher Biss, neuer Trick.',
        'Una hamburguesa smash crujiente con todos tus toppings, envuelta en nori en vez de pan. Mismo bocado, nuevo truco.']},
    {k:'pizza',e:'🫑',r:'Frischkäse Pepper Pizza Boats',
      from:['Pizza','Pizza','Pizza'],
      to:['Frischkäse Pepper Pizza Boats','Frischkäse-Paprika-Pizzaboote','Barquitas de pimiento pizza con queso crema'],
      why:['Pepper halves with tomato, cream cheese and melted cheese on top. The pepper is the crust now, and it’s thriving.',
        'Paprikahälften mit Tomate, Frischkäse und geschmolzenem Käse obendrauf. Die Paprika ist jetzt der Boden, und sie liebt es.',
        'Mitades de pimiento con tomate, queso crema y queso fundido. Ahora el pimiento es la masa, y le sienta genial.']},
    {k:'nachos',e:'🌮',r:'Cauliflower Nacho Smash Tray',
      from:['Nachos','Nachos','Nachos'],
      to:['Cauliflower Nacho Smash Tray','Blumenkohl-Nacho-Blech','Bandeja de nachos de coliflor'],
      why:['Roasted cauliflower with melted cheese, salsa and all the nacho toppings. No tortilla chips, all the party.',
        'Gerösteter Blumenkohl mit geschmolzenem Käse, Salsa und allen Nacho-Toppings. Keine Tortilla-Chips, volle Party.',
        'Coliflor asada con queso fundido, salsa y todos los toppings de nachos. Sin totopos, con toda la fiesta.']},
    {k:'sushi',e:'🍣',r:'Konjak Sushi Crunch Bowl',
      from:['Sushi','Sushi','Sushi'],
      to:['Konjak Sushi Crunch Bowl','Konjak-Sushi-Crunch-Bowl','Bowl crujiente de sushi con konjac'],
      why:['Fish, cucumber, nori and sesame over konjac rice instead of sushi rice. Chopsticks ready.',
        'Fisch, Gurke, Nori und Sesam auf Konjakreis statt Sushireis. Stäbchen bereit.',
        'Pescado, pepino, nori y sésamo sobre arroz de konjac en vez de arroz de sushi. Palillos listos.']},
    {k:'pudding',e:'🍫',r:'Cocoa Cottage Cheese Pudding',
      from:['Chocolate pudding','Schokopudding','Natillas de chocolate'],
      to:['Cocoa Cottage Cheese Pudding','Kakao-Hüttenkäse-Pudding','Pudin de cacao y requesón'],
      why:['Blended cottage cheese with unsweetened cocoa. Spoon-licking chocolate vibes, no added sugar.',
        'Pürierter Hüttenkäse mit ungesüßtem Kakao. Löffel-ablecken-Schokolaune, ohne zugesetzten Zucker.',
        'Requesón batido con cacao sin azúcar. Ganas de chupar la cuchara, sin azúcar añadido.']},
    {k:'carbonara',e:'🍝',r:'Shirataki Carbonara Pull',
      from:['Creamy pasta','Cremige Pasta','Pasta cremosa'],
      to:['Shirataki Carbonara Pull','Shirataki-Carbonara','Carbonara de shirataki'],
      why:['Silky egg and parmesan sauce over shirataki noodles instead of pasta. Creamy comfort, rebuilt.',
        'Seidige Ei-Parmesan-Soße auf Shirataki statt Pasta. Cremiges Soulfood, neu gebaut.',
        'Salsa sedosa de huevo y parmesano sobre shirataki en vez de pasta. Cremosa y reconfortante, reinventada.']}
  ];

  /* Gold Rush: products from data/shop (Open Food Facts labels) that the
   * app's own Shop rating (store-picks-core.js) marks as a pass and best,
   * hand-picked to match the owner's food rules (no chocolate, no sweetened
   * products, no pork). Numbers are per 100 g, straight from the label data;
   * tests check each one against data/shop. */
  const WHY={
    pasta:['Pasta night, rebuilt: {c} g carbs per 100 g on the label. Twirl responsibly.',
      'Nudelabend, neu gebaut: {c} g Kohlenhydrate pro 100 g laut Etikett. Bitte verantwortungsvoll aufwickeln.',
      'Noche de pasta, reinventada: {c} g de hidratos por 100 g según la etiqueta. Enrolla con responsabilidad.'],
    rice:['Fried-rice or sushi night without the rice: {c} g carbs per 100 g on the label.',
      'Bratreis- oder Sushi-Abend ohne Reis: {c} g Kohlenhydrate pro 100 g laut Etikett.',
      'Noche de arroz frito o sushi sin arroz: {c} g de hidratos por 100 g según la etiqueta.'],
    skyr:['Plain and unsweetened: {p} g protein and {s} g sugar per 100 g. A dessert base with superpowers.',
      'Natur und ungesüßt: {p} g Eiweiß und {s} g Zucker pro 100 g. Eine Dessertbasis mit Superkräften.',
      'Natural y sin endulzar: {p} g de proteína y {s} g de azúcar por 100 g. Una base de postre con superpoderes.'],
    quark:['Plain quark: {p} g protein and {s} g sugar per 100 g. Cheesecake cups, here we come.',
      'Magerquark natur: {p} g Eiweiß und {s} g Zucker pro 100 g. Käsekuchenbecher, wir kommen.',
      'Quark natural: {p} g de proteína y {s} g de azúcar por 100 g. Vasitos de tarta de queso, allá vamos.'],
    soy:['Plant-based and unsweetened: {s} g sugar per 100 g. A few berries on top and done.',
      'Pflanzlich und ungesüßt: {s} g Zucker pro 100 g. Ein paar Beeren drauf, fertig.',
      'Vegetal y sin endulzar: {s} g de azúcar por 100 g. Unos frutos rojos encima y listo.'],
    nuts:['A small handful (about 30 g) makes a crunchy snack: {c} g carbs per 100 g. Crunch squad, assemble!',
      'Eine kleine Handvoll (etwa 30 g) ist ein knackiger Snack: {c} g Kohlenhydrate pro 100 g. Crunch-Team, angetreten!',
      'Un puñado pequeño (unos 30 g) es un snack crujiente: {c} g de hidratos por 100 g. ¡Escuadrón crujiente, adelante!'],
    almonds:['For baking and crumble toppings: {c} g carbs and {p} g protein per 100 g instead of flour.',
      'Zum Backen und für Streusel: {c} g Kohlenhydrate und {p} g Eiweiß pro 100 g statt Mehl.',
      'Para hornear y para crumbles: {c} g de hidratos y {p} g de proteína por 100 g en vez de harina.'],
    chia:['Tiny seeds, big pudding energy: {c} g carbs and {p} g protein per 100 g. Stir, wait, spoon.',
      'Kleine Samen, große Pudding-Energie: {c} g Kohlenhydrate und {p} g Eiweiß pro 100 g. Umrühren, warten, löffeln.',
      'Semillas pequeñas, mucha energía de pudin: {c} g de hidratos y {p} g de proteína por 100 g. Remueve, espera y a la cuchara.'],
    cocoa:['Unsweetened cocoa, {s} g sugar per 100 g: the secret agent behind Cocoa Cottage Cheese Pudding.',
      'Ungesüßter Kakao, {s} g Zucker pro 100 g: der Geheimagent hinter dem Kakao-Hüttenkäse-Pudding.',
      'Cacao sin azúcar, {s} g de azúcar por 100 g: el agente secreto detrás del pudin de cacao y requesón.'],
    cauli:['Grate it and you’ve got cauliflower rice: {c} g carbs per 100 g. Rice who?',
      'Raspeln, und schon hast du Blumenkohlreis: {c} g Kohlenhydrate pro 100 g. Reis wer?',
      'Rállala y ya tienes arroz de coliflor: {c} g de hidratos por 100 g. ¿Arroz, quién?']
  };
  const GOLD=[
    {chain:'lidl',store:'Lidl',g:'4056489376194',n:'Konjak Nudeln',b:'Vitasia',cat:'pasta',c:1.2,s:0,p:0,photo:'https://images.openfoodfacts.org/images/products/405/648/937/6194/front_fr.59.200.jpg'},
    {chain:'aldi',store:'Aldi',g:'4061458229838',n:'Skyr',b:'Milsani',cat:'skyr',c:4,s:4,p:11,photo:'https://images.openfoodfacts.org/images/products/406/145/822/9838/front_de.42.200.jpg'},
    {chain:'lidl',store:'Lidl',g:'20816438',n:'Walnusskerne, naturbelassen',b:'Alesto',cat:'nuts',c:3.7,s:3,p:15.5,photo:'https://images.openfoodfacts.org/images/products/20816438/front_de.76.200.jpg'},
    {chain:'edeka',store:'EDEKA',g:'5411188134756',n:'Bio Joghurtalternative Soja ohne Zucker',b:'Provamel',cat:'soy',c:0.5,s:0,p:4,photo:'https://images.openfoodfacts.org/images/products/541/118/813/4756/front_de.3.200.jpg'},
    {chain:'lidl',store:'Lidl',g:'4056489123347',n:'Blumenkohl',b:'Freshona',cat:'cauli',c:2.5,s:2.3,p:1.3,photo:'https://images.openfoodfacts.org/images/products/405/648/912/3347/front_de.42.200.jpg'},
    {chain:'rewe',store:'REWE',g:'4388844185067',n:'Chia-Samen',b:'Rewe Bio',cat:'chia',c:4.5,s:0.8,p:21.2,photo:'https://images.openfoodfacts.org/images/products/438/884/418/5067/front_en.3.200.jpg'},
    {chain:'lidl',store:'Lidl',g:'4056489932796',n:'Konjak Reis',b:'Vitasia',cat:'rice',c:0.8,s:0,p:0,photo:'https://images.openfoodfacts.org/images/products/405/648/993/2796/front_de.4.200.jpg'},
    {chain:'lidl',store:'Lidl',g:'20001933',n:'Speisequark Magerstufe',b:'Milbona',cat:'quark',c:4.3,s:4.3,p:12,photo:'https://images.openfoodfacts.org/images/products/20001933/front.20.200.jpg'},
    {chain:'aldi',store:'Aldi',g:'4061458145183',n:'Bio-Kakao',b:'Gut Bio',cat:'cocoa',c:13,s:0,p:22,photo:'https://images.openfoodfacts.org/images/products/406/145/814/5183/front_de.9.200.jpg'},
    {chain:'rewe',store:'REWE',g:'4337256169240',n:'Skyr Natur',b:'ja!',cat:'skyr',c:4.4,s:4.4,p:10.6,photo:'https://images.openfoodfacts.org/images/products/433/725/616/9240/front_de.42.200.jpg'},
    {chain:'edeka',store:'EDEKA',g:'8053904630011',n:'Konjac Linguine',b:'WokFoods',cat:'pasta',c:1.2,s:0,p:0,photo:'https://images.openfoodfacts.org/images/products/805/390/463/0011/front_it.10.200.jpg'},
    {chain:'aldi',store:'Aldi',g:'22138262',n:'Gemahlene Mandeln',b:'Back Family',cat:'almonds',c:7,s:5.5,p:21,photo:'https://images.openfoodfacts.org/images/products/22138262/front_de.12.200.jpg'},
    {chain:'edeka',store:'EDEKA',g:'4036300136626',n:'Skyr Natur',b:'Milram',cat:'skyr',c:4,s:4,p:11,photo:'https://images.openfoodfacts.org/images/products/403/630/013/6626/front_de.21.200.jpg'},
    {chain:'lidl',store:'Lidl',g:'20692285',n:'Skyr Natural',b:'Milbona',cat:'skyr',c:4,s:4,p:11,photo:'https://images.openfoodfacts.org/images/products/20692285/front.7.200.jpg'},
    {chain:'lidl',store:'Lidl',g:'20068110',n:'Backkakao',b:'Belbake',cat:'cocoa',c:8.7,s:0.5,p:19.8,photo:'https://images.openfoodfacts.org/images/products/20068110/front_de.66.200.jpg'}
  ];

  /* Same id rule as index.html bookId(): Recipe Book recipe name -> "rb_<slug>". */
  function bookId(n){return 'rb_'+String(n).toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/[^a-z]+/g,'_').replace(/^_|_$/g,'');}
  /* Recipes whose photo was generated for the app on 24 Oct 2026 (fy-img/<id>.webp); the rest use FOOD_IMG. */
  const FILES=['rb_garlic_yogurt_chicken_box','rb_zucchini_ribbon_beef_ragout','rb_cauliflower_egg_wok_fry','rb_shirataki_broth_bowl',
    'rb_spiced_beef_lettuce_shells','rb_smoky_kale_crunch','rb_chicken_caesar_lettuce_boats','rb_smoked_salmon_cucumber_bites',
    'rb_espresso_cottage_cream_cups','rb_lemon_ricotta_berry_cups','rb_strawberry_skyr_freeze_pops','rb_ginger_lemon_fizz','rb_iced_cardamom_spice_tea'];
  function fileImg(id){return FILES.indexOf(id)>=0?'fy-img/'+id+'.webp':'';}
  function li(lang){const i=LANGS.indexOf(String(lang||'en').slice(0,2).toLowerCase());return i<0?0:i;}
  function pick(arr,lang){return arr[li(lang)]||arr[0];}
  function pad(n){return String(n).padStart(2,'0');}
  /* Local calendar day the card belongs to: before 07:00 it is still
   * yesterday's card, so the day never flips in the middle of the night. */
  function cardDate(now){
    const d=new Date(typeof now==='number'?now:Date.now());
    if(d.getHours()<CARD_HOUR)d.setDate(d.getDate()-1);
    d.setHours(CARD_HOUR,0,0,0);
    return d;
  }
  function dayKey(now){const d=cardDate(now);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  /* Whole days since 2026-01-01 for the card's calendar day (DST-safe: works
   * on calendar fields, not on millisecond differences). */
  function dayNum(key){const [y,m,d]=String(key).split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(2026,0,1))/DAY);}
  function mod(a,n){return ((a%n)+n)%n;}
  // A fixed stride that is coprime with the list length walks every item
  // before repeating, and keeps neighbouring days from feeling samey.
  function walk(n,len,stride){return mod(n*stride,len);}
  function swapFor(key){return SWAPS[walk(dayNum(key),SWAPS.length,7)];}
  function hasGold(key){return mod(dayNum(key),2)===0;}
  function goldFor(key){return hasGold(key)?GOLD[walk(Math.floor(dayNum(key)/2),GOLD.length,4)]:null;}
  function introFor(key){return INTROS[mod(dayNum(key),INTROS.length)];}
  function num(v,lang){const s=(Math.round(Number(v)*10)/10).toString();return li(lang)===0?s:s.replace('.',',');}
  function fill(t,o,lang){return String(t).replace(/\{(\w)\}/g,(m,k)=>o[k]==null?m:num(o[k],lang));}

  /* The one card for the day, as plain data in the reader's language. */
  function card(opts){
    const o=opts||{};const now=typeof o.now==='number'?o.now:Date.now();const lang=o.lang||'en';
    const key=dayKey(now);const sw=swapFor(key);const gd=goldFor(key);

    const c={
      id:'inspo-'+key,day:key,ts:cardDate(now).getTime(),uid:BOT_ID,by:NAME,lang:LANGS[li(lang)],
      label:{bot:pick(L.bot,lang),recipe:pick(L.recipe,lang),aria:pick(L.aria,lang),swap:pick(L.swap,lang),craving:pick(L.craving,lang),tryIt:pick(L.tryIt,lang),book:pick(L.book,lang)},
      intro:pick(introFor(key),lang),
      swap:{k:sw.k,e:sw.e,r:sw.r,rec:bookId(sw.r),from:pick(sw.from,lang),to:pick(sw.to,lang),why:pick(sw.why,lang)},
      gold:null
    };
    if(gd){
      const parts=[num(gd.c,lang)+' g '+pick(L.carbs,lang),num(gd.s,lang)+' g '+pick(L.sugar,lang)];
      if(gd.p>0)parts.push(num(gd.p,lang)+' g '+pick(L.protein,lang));
      c.gold={g:gd.g,title:pick(L.gold,lang),spotted:pick(L.spotted,lang),name:gd.n,brand:gd.b,store:pick(L.store,lang).replace('{s}',gd.store),
        nums:pick(L.per100,lang)+': '+parts.join(' · '),why:fill(pick(WHY[gd.cat],lang),gd,lang),src:pick(L.goldSrc,lang),photo:gd.photo};
    }
    return c;
  }

  /* The bot's For You slides: today's card and the SHOW_DAYS-1 before it, newest first, as For You posts.
   * A post is plain data: the slide renderer (inspo.js) draws it, the For You rule (foryou-core.js) checks p.rec. */
  function post(c){
    const cap=c.swap.e+' '+c.label.craving+' '+c.swap.from+'? '+c.label.tryIt+' '+c.swap.to+'.';
    return {id:c.id,ts:c.ts,who:NAME,uid:BOT_ID,bot:true,rec:c.swap.rec,img:fileImg(c.swap.rec),cap,inspo:c,art:[c.swap.e,150,200]};
  }
  function feed(opts){
    const o=opts||{};const now=typeof o.now==='number'?o.now:Date.now();const n=Math.max(1,Math.min(14,o.days||SHOW_DAYS));
    const out=[];const d=cardDate(now);
    for(let i=0;i<n;i++){const x=new Date(d.getTime());x.setDate(x.getDate()-i);x.setHours(CARD_HOUR+1,0,0,0);out.push(post(card({now:x.getTime(),lang:o.lang})));}
    return out;
  }

  return {NAME,BOT_ID,LANGS,CARD_HOUR,SHOW_DAYS,SWAPS,GOLD,WHY,INTROS,L,FILES,bookId,fileImg,dayKey,dayNum,cardDate,swapFor,goldFor,hasGold,card,post,feed};
});
