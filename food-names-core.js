/* Oct 26 2026 (MAYA-HANDOFF 0.34, Emmanuel's iPad screenshot): the cart chips in Give a hand said "Lettuce, Lean beef mince,
   Smoked paprika" in the German app. Shopping-list and cart names come from recipe cards, many written in English.
   name(n, lang) shows a grocery name in the app language: a whole-name match in any of EN / DE / ES gives that food's
   name in lang. A name it doesn't know stays exactly as the person typed it (never a wrong guess). Pure, no DOM. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiFoodNames = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    /* [en, de, es, ...more spellings that mean the same food] */
    const ROWS = [
        // vegetables + salad
        ['Lettuce', 'Kopfsalat', 'Lechuga', 'salad lettuce', 'Salat', 'iceberg lettuce', 'Eisbergsalat', 'romaine lettuce', 'Romanasalat'],
        ['Mixed salad', 'Gemischter Salat', 'Ensalada mixta', 'salad mix', 'Salatmischung', 'mixed greens'],
        ['Rocket', 'Rucola', 'Rúcula', 'arugula'],
        ['Spinach', 'Spinat', 'Espinacas', 'baby spinach', 'Babyspinat', 'espinaca'],
        ['Kale', 'Grünkohl', 'Kale', 'col rizada'],
        ['Cucumber', 'Gurke', 'Pepino', 'Salatgurke'],
        ['Tomatoes', 'Tomaten', 'Tomates', 'tomato', 'Tomate'],
        ['Cherry tomatoes', 'Cherrytomaten', 'Tomates cherry', 'cherry tomato', 'Kirschtomaten'],
        ['Chopped tomatoes', 'Gehackte Tomaten', 'Tomate troceado', 'tinned tomatoes', 'canned tomatoes', 'diced tomatoes', 'Dosentomaten'],
        ['Bell pepper', 'Paprika', 'Pimiento', 'bell peppers', 'red pepper', 'red bell pepper', 'rote Paprika', 'pimiento rojo', 'green pepper', 'grüne Paprika', 'pimiento verde', 'peppers', 'Paprikaschoten'],
        ['Onion', 'Zwiebel', 'Cebolla', 'onions', 'Zwiebeln', 'cebollas', 'yellow onion', 'brown onion'],
        ['Red onion', 'Rote Zwiebel', 'Cebolla morada', 'red onions', 'rote Zwiebeln', 'cebolla roja'],
        ['Spring onions', 'Frühlingszwiebeln', 'Cebolletas', 'spring onion', 'green onions', 'scallions', 'Lauchzwiebeln', 'Frühlingszwiebel'],
        ['Garlic', 'Knoblauch', 'Ajo', 'garlic cloves', 'Knoblauchzehen', 'dientes de ajo', 'ajos'],
        ['Ginger', 'Ingwer', 'Jengibre', 'fresh ginger'],
        ['Broccoli', 'Brokkoli', 'Brócoli', 'brocoli'],
        ['Cauliflower', 'Blumenkohl', 'Coliflor'],
        ['Courgette', 'Zucchini', 'Calabacín', 'zucchini', 'calabacin'],
        ['Aubergine', 'Aubergine', 'Berenjena', 'eggplant'],
        ['Mushrooms', 'Champignons', 'Champiñones', 'mushroom', 'Pilze', 'setas'],
        ['Carrots', 'Karotten', 'Zanahorias', 'carrot', 'Möhren', 'Karotte', 'zanahoria'],
        ['Celery', 'Staudensellerie', 'Apio', 'Sellerie'],
        ['Leek', 'Lauch', 'Puerro', 'Porree'],
        ['Green beans', 'Grüne Bohnen', 'Judías verdes', 'Bohnen grün'],
        ['Asparagus', 'Spargel', 'Espárragos', 'green asparagus', 'grüner Spargel'],
        ['Cabbage', 'Kohl', 'Col', 'white cabbage', 'Weißkohl', 'repollo'],
        ['Red cabbage', 'Rotkohl', 'Lombarda', 'Blaukraut'],
        ['Brussels sprouts', 'Rosenkohl', 'Coles de Bruselas'],
        ['Avocado', 'Avocado', 'Aguacate', 'avocados'],
        ['Radishes', 'Radieschen', 'Rábanos', 'radish'],
        ['Fennel', 'Fenchel', 'Hinojo'],
        ['Pak choi', 'Pak Choi', 'Pak choi', 'bok choy'],
        ['Sauerkraut', 'Sauerkraut', 'Chucrut'],
        ['Olives', 'Oliven', 'Aceitunas', 'black olives', 'green olives'],
        ['Pickles', 'Gewürzgurken', 'Pepinillos', 'gherkins'],
        ['Jalapeños', 'Jalapeños', 'Jalapeños', 'jalapenos', 'jalapeño'],
        ['Chilli', 'Chili', 'Guindilla', 'chili', 'chili pepper', 'red chilli', 'Chilischote', 'chile'],
        ['Sweet potato', 'Süßkartoffel', 'Boniato', 'sweet potatoes', 'Süßkartoffeln', 'batata'],
        ['Potatoes', 'Kartoffeln', 'Patatas', 'potato', 'Kartoffel', 'patata'],
        ['Lemon', 'Zitrone', 'Limón', 'lemons', 'Zitronen'],
        ['Lime', 'Limette', 'Lima', 'limes', 'Limetten'],
        // herbs + spices
        ['Fresh herbs', 'Frische Kräuter', 'Hierbas frescas', 'herbs', 'Kräuter'],
        ['Parsley', 'Petersilie', 'Perejil', 'fresh parsley'],
        ['Basil', 'Basilikum', 'Albahaca', 'fresh basil'],
        ['Coriander', 'Koriander', 'Cilantro', 'cilantro', 'fresh coriander'],
        ['Dill', 'Dill', 'Eneldo'],
        ['Chives', 'Schnittlauch', 'Cebollino'],
        ['Mint', 'Minze', 'Menta', 'fresh mint'],
        ['Oregano', 'Oregano', 'Orégano', 'dried oregano', 'getrockneter Oregano', 'oregano seco'],
        ['Thyme', 'Thymian', 'Tomillo', 'dried thyme'],
        ['Rosemary', 'Rosmarin', 'Romero'],
        ['Bay leaves', 'Lorbeerblätter', 'Hojas de laurel', 'bay leaf', 'Lorbeerblatt'],
        ['Paprika', 'Paprikapulver', 'Pimentón', 'paprika powder', 'sweet paprika', 'Paprika edelsüß'],
        ['Smoked paprika', 'Geräuchertes Paprikapulver', 'Pimentón ahumado', 'Paprika geräuchert', 'smoked paprika powder'],
        ['Cumin', 'Kreuzkümmel', 'Comino', 'ground cumin', 'comino molido'],
        ['Turmeric', 'Kurkuma', 'Cúrcuma', 'ground turmeric'],
        ['Chilli powder', 'Chilipulver', 'Chile en polvo', 'chili powder', 'chili flakes', 'chilli flakes', 'Chiliflocken'],
        ['Curry powder', 'Currypulver', 'Curry en polvo'],
        ['Black pepper', 'Schwarzer Pfeffer', 'Pimienta negra', 'pepper', 'Pfeffer', 'pimienta', 'ground black pepper'],
        ['Salt', 'Salz', 'Sal', 'sea salt', 'Meersalz', 'sal marina'],
        ['Cinnamon', 'Zimt', 'Canela', 'ground cinnamon'],
        ['Nutmeg', 'Muskatnuss', 'Nuez moscada', 'Muskat'],
        ['Garlic powder', 'Knoblauchpulver', 'Ajo en polvo'],
        ['Onion powder', 'Zwiebelpulver', 'Cebolla en polvo'],
        ['Italian herbs', 'Italienische Kräuter', 'Hierbas italianas', 'Italian seasoning', 'Kräuter der Provence', 'herbes de Provence'],
        // sauces, oils, condiments
        ['No-sugar salsa', 'Salsa ohne Zucker', 'Salsa sin azúcar', 'sugar-free salsa', 'zuckerfreie Salsa', 'no sugar salsa'],
        ['Salsa', 'Salsa', 'Salsa', 'tomato salsa', 'Tomatensalsa', 'salsa de tomate fresca'],
        ['Olive oil', 'Olivenöl', 'Aceite de oliva', 'extra virgin olive oil', 'natives Olivenöl extra', 'aceite de oliva virgen extra'],
        ['Rapeseed oil', 'Rapsöl', 'Aceite de colza', 'canola oil'],
        ['Butter', 'Butter', 'Mantequilla'],
        ['Vinegar', 'Essig', 'Vinagre'],
        ['Mustard', 'Senf', 'Mostaza', 'Dijon mustard', 'Dijon-Senf'],
        ['Soy sauce', 'Sojasauce', 'Salsa de soja', 'Sojasoße'],
        ['Tomato paste', 'Tomatenmark', 'Concentrado de tomate', 'tomato purée', 'tomate concentrado'],
        ['Passata', 'Passierte Tomaten', 'Tomate triturado', 'tomato passata'],
        ['Pesto', 'Pesto', 'Pesto', 'basil pesto'],
        ['Hummus', 'Hummus', 'Hummus', 'houmous'],
        ['Mayonnaise', 'Mayonnaise', 'Mayonesa', 'mayo'],
        // protein
        ['Eggs', 'Eier', 'Huevos', 'egg', 'Ei', 'huevo', 'free-range eggs', 'Freilandeier'],
        ['Lean beef mince', 'Mageres Rinderhack', 'Carne picada de ternera magra', 'lean ground beef', 'lean minced beef', 'mageres Rinderhackfleisch'],
        ['Beef mince', 'Rinderhack', 'Carne picada de ternera', 'ground beef', 'minced beef', 'Rinderhackfleisch', 'Hackfleisch'],
        ['Chicken breast', 'Hähnchenbrust', 'Pechuga de pollo', 'chicken breasts', 'Hühnerbrust', 'chicken breast fillet', 'Hähnchenbrustfilet'],
        ['Chicken thighs', 'Hähnchenschenkel', 'Muslos de pollo', 'chicken thigh'],
        ['Turkey breast', 'Putenbrust', 'Pechuga de pavo', 'turkey'],
        ['Turkey mince', 'Putenhack', 'Carne picada de pavo', 'ground turkey'],
        ['Steak', 'Steak', 'Filete', 'beef steak', 'Rindersteak'],
        ['Salmon', 'Lachs', 'Salmón', 'salmon fillet', 'Lachsfilet'],
        ['Tuna', 'Thunfisch', 'Atún', 'canned tuna', 'tinned tuna', 'Thunfisch in der Dose'],
        ['Cod', 'Kabeljau', 'Bacalao', 'cod fillet'],
        ['Prawns', 'Garnelen', 'Gambas', 'shrimp', 'Shrimps', 'langostinos'],
        ['Sardines', 'Sardinen', 'Sardinas'],
        ['Tofu', 'Tofu', 'Tofu', 'firm tofu'],
        ['Tempeh', 'Tempeh', 'Tempeh'],
        ['Bacon', 'Speck', 'Beicon', 'Bacon', 'bacon'],
        ['Ham', 'Schinken', 'Jamón', 'cooked ham', 'Kochschinken'],
        // dairy
        ['Greek yogurt', 'Griechischer Joghurt', 'Yogur griego', 'greek yoghurt', 'Greek-style yogurt', 'yogur natural griego'],
        ['Natural yogurt', 'Naturjoghurt', 'Yogur natural', 'plain yogurt', 'yogurt', 'Joghurt', 'yogur'],
        ['Quark', 'Magerquark', 'Queso quark', 'low-fat quark', 'Quark'],
        ['Cottage cheese', 'Hüttenkäse', 'Requesón', 'körniger Frischkäse'],
        ['Cream cheese', 'Frischkäse', 'Queso crema'],
        ['Feta', 'Feta', 'Queso feta', 'feta cheese', 'Schafskäse'],
        ['Mozzarella', 'Mozzarella', 'Mozzarella'],
        ['Parmesan', 'Parmesan', 'Parmesano', 'grated parmesan'],
        ['Cheddar', 'Cheddar', 'Cheddar', 'cheddar cheese', 'grated cheddar'],
        ['Grated cheese', 'Geriebener Käse', 'Queso rallado', 'shredded cheese', 'Reibekäse'],
        ['Cheese', 'Käse', 'Queso'],
        ['Milk', 'Milch', 'Leche', 'whole milk', 'Vollmilch'],
        ['Cream', 'Sahne', 'Nata', 'double cream', 'heavy cream', 'Schlagsahne', 'nata para montar'],
        ['Sour cream', 'Saure Sahne', 'Nata agria', 'Schmand'],
        ['Crème fraîche', 'Crème fraîche', 'Crème fraîche', 'creme fraiche'],
        ['Unsweetened almond milk', 'Ungesüßte Mandelmilch', 'Bebida de almendra sin azúcar', 'almond milk', 'Mandelmilch'],
        // legumes, nuts, seeds
        ['Chickpeas', 'Kichererbsen', 'Garbanzos', 'chickpea'],
        ['Lentils', 'Linsen', 'Lentejas', 'red lentils', 'rote Linsen'],
        ['Black beans', 'Schwarze Bohnen', 'Frijoles negros', 'alubias negras'],
        ['Kidney beans', 'Kidneybohnen', 'Alubias rojas', 'red kidney beans'],
        ['White beans', 'Weiße Bohnen', 'Alubias blancas', 'cannellini beans'],
        ['Almonds', 'Mandeln', 'Almendras', 'almond'],
        ['Walnuts', 'Walnüsse', 'Nueces', 'walnut'],
        ['Mixed nuts', 'Gemischte Nüsse', 'Frutos secos', 'nuts', 'Nüsse', 'Nussmischung'],
        ['Peanut butter', 'Erdnussbutter', 'Crema de cacahuete', 'Erdnussmus'],
        ['Chia seeds', 'Chiasamen', 'Semillas de chía', 'chia'],
        ['Flaxseeds', 'Leinsamen', 'Semillas de lino', 'linseed', 'flax seeds'],
        ['Pumpkin seeds', 'Kürbiskerne', 'Pipas de calabaza'],
        ['Sunflower seeds', 'Sonnenblumenkerne', 'Pipas de girasol'],
        // grains + carbs (the rating decides; names only)
        ['Tortilla wraps', 'Tortilla-Wraps', 'Tortillas de trigo', 'tortillas', 'wraps', 'Wraps', 'flour tortillas'],
        ['Low-carb wraps', 'Low-Carb-Wraps', 'Wraps bajos en carbohidratos', 'low carb wraps', 'low carb tortillas'],
        ['Rice', 'Reis', 'Arroz', 'white rice', 'weißer Reis', 'arroz blanco'],
        ['Brown rice', 'Vollkornreis', 'Arroz integral', 'Naturreis'],
        ['Pasta', 'Nudeln', 'Pasta', 'spaghetti', 'Spaghetti', 'espaguetis'],
        ['Wholegrain pasta', 'Vollkornnudeln', 'Pasta integral', 'whole wheat pasta', 'whole-grain pasta'],
        ['Bread', 'Brot', 'Pan', 'white bread', 'Weißbrot', 'pan blanco'],
        ['Wholegrain bread', 'Vollkornbrot', 'Pan integral', 'whole wheat bread', 'wholemeal bread'],
        ['Oats', 'Haferflocken', 'Copos de avena', 'rolled oats', 'porridge oats', 'avena'],
        ['Quinoa', 'Quinoa', 'Quinoa'],
        ['Flour', 'Mehl', 'Harina', 'plain flour', 'Weizenmehl'],
        ['Almond flour', 'Mandelmehl', 'Harina de almendra', 'ground almonds', 'gemahlene Mandeln'],
        ['Sugar', 'Zucker', 'Azúcar'],
        ['Honey', 'Honig', 'Miel'],
        // fruit
        ['Berries', 'Beeren', 'Frutos rojos', 'mixed berries', 'Beerenmischung'],
        ['Blueberries', 'Heidelbeeren', 'Arándanos', 'Blaubeeren', 'blueberry'],
        ['Raspberries', 'Himbeeren', 'Frambuesas'],
        ['Strawberries', 'Erdbeeren', 'Fresas'],
        ['Apples', 'Äpfel', 'Manzanas', 'apple', 'Apfel', 'manzana'],
        ['Bananas', 'Bananen', 'Plátanos', 'banana', 'Banane', 'plátano'],
        ['Oranges', 'Orangen', 'Naranjas', 'orange', 'Orange', 'naranja'],
        // drinks
        ['Sparkling water', 'Mineralwasser', 'Agua con gas', 'Sprudelwasser', 'mineral water', 'water', 'Wasser', 'agua'],
        ['Coffee', 'Kaffee', 'Café'],
        ['Tea', 'Tee', 'Té', 'green tea', 'grüner Tee', 'té verde']
    ];
    const COL = { en: 0, de: 1, es: 2 };
    const key = s => String(s == null ? '' : s).toLowerCase().normalize('NFC').replace(/[’'`]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    const INDEX = new Map();
    ROWS.forEach((r, i) => r.forEach(s => { const k = key(s); if (k && !INDEX.has(k)) INDEX.set(k, i); }));
    /* words that mean different foods in different languages (EN paprika = the spice, DE Paprika = the vegetable) */
    const AMBIG = new Set(['paprika', 'pepper', 'peppers', 'chile', 'salat', 'water']);
    function find(n) {
        const k = key(n); if (!k || AMBIG.has(k)) return -1;
        if (INDEX.has(k)) return INDEX.get(k);
        /* English plurals and "fresh …" / "frische …" / "… fresco" only; anything else stays as typed */
        const tries = [k.replace(/es$/, ''), k.replace(/s$/, ''), k.replace(/^(fresh|frische[rn]?|organic|bio) /, ''), k.replace(/ (fresco|fresca|frescos|frescas)$/, '')];
        for (const t of tries) if (t && t !== k && INDEX.has(t)) return INDEX.get(t);
        return -1;
    }
    function name(n, lang) {
        const raw = String(n == null ? '' : n).trim();
        const i = find(raw); if (i < 0) return raw;
        const c = COL[String(lang || 'en').slice(0, 2).toLowerCase()];
        return c == null ? raw : ROWS[i][c];
    }
    /* the English name, for the food rating (its words are richest in English) when the typed name is not rated */
    function english(n) { const i = find(n); return i < 0 ? null : ROWS[i][0]; }
    return { name, english, find, ROWS };
});
