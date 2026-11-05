# Nov 5 2026 (owner, after listening to the new tour: "sometimes it wrote things that isn't really a sentence ... so brüchig ... als
# würden da Wörter fehlen"): every card's words as whole spoken sentences, EN / DE / ES. The voice reads title + '. ' + text, so the
# title is a short phrase that still sounds right on its own and the text has no colon lists, no fragments, no symbols the voice skips.
# One-off helper: python3 tools/tutorial-voice/sentences-20261105.py rewrites tutorial-steps.js in place (words only, by step id).
import re, sys, os

NEW = {
 'claim': dict(
  title=('Make me yours', 'Mach mich zu deinem Begleiter', 'Hazme tuyo'),
  text=('Tell me your birthday, and I become your very own companion.',
        'Sag mir deinen Geburtstag, dann werde ich dein ganz eigener Begleiter.',
        'Dime tu cumpleaños y me convierto en tu propio compañero.')),
 'hello': dict(
  title=('Hi, I’m {name}', 'Hi, ich bin {name}', 'Hola, soy {name}'),
  text=('I’m your companion. Hold me, and my card opens. It shows my energy, my level and what I still need.',
        'Ich bin dein Begleiter. Halt mich gedrückt, dann öffnet sich meine Karte. Dort siehst du meine Energie, mein Level und was mir noch fehlt.',
        'Soy tu compañero. Mantenme pulsado y se abre mi tarjeta. Ahí ves mi energía, mi nivel y lo que todavía me falta.')),
 'scan': dict(
  title=('Scan', 'Scannen', 'Escanear'),
  text=('Tap Scan and point the camera at your meal or at a product. I show you how big the spike is. Then you log it as eaten or put it in your cart.',
        'Tipp auf Scannen und richte die Kamera auf dein Essen oder auf ein Produkt. Ich zeige dir, wie groß der Spike ist. Dann trägst du es als gegessen ein oder legst es in den Korb.',
        'Toca Escanear y apunta la cámara a tu comida o a un producto. Te digo cuánto te sube el azúcar. Luego lo anotas como comido o lo pones en el carrito.')),
 'gap': dict(
  title=('Gap', 'Gap', 'Gap'),
  text=('Tap Gap, and then tap Last meal to start the timer. Tap First meal to stop it.',
        'Tipp auf Gap und dann auf Letzte Mahlzeit, um die Uhr zu starten. Mit Erste Mahlzeit stoppst du sie.',
        'Toca Gap y luego Última comida para poner el reloj en marcha. Con Primera comida lo paras.')),
 'day': dict(
  title=('Water, Move and Sleep', 'Wasser, Bewegung und Schlaf', 'Agua, Movimiento y Sueño'),
  text=('Tap Water to log 10 sips, a glass or a bottle. Tap Move to pick Casual, Steady or Epic. Tap Sleep to log your night.',
        'Tipp auf Wasser, um 10 Sips, ein Glas oder eine Flasche einzutragen. Tipp auf Bewegung und wähl Locker, Stetig oder Episch. Tipp auf Schlaf, um deine Nacht einzutragen.',
        'Toca Agua para anotar 10 sorbos, un vaso o una botella. Toca Movimiento para elegir Tranquilo, Constante o Épico. Toca Sueño para anotar tu noche.')),
 'mirror': dict(
  title=('Mirror mode', 'Spiegel-Modus', 'Modo espejo'),
  text=('Hold Move to open your Move page. Mirror mode is the first card there. You move along with the camera, and your workouts are below it.',
        'Halt Bewegung gedrückt, dann öffnet sich deine Bewegungsseite. Ganz oben ist der Spiegel-Modus. Dort bewegst du dich mit der Kamera mit, und darunter findest du deine Workouts.',
        'Mantén pulsado Movimiento y se abre tu página de movimiento. Arriba está el modo espejo, donde te mueves con la cámara. Debajo tienes tus entrenamientos.')),
 'fuel': dict(
  title=('Shopping', 'Einkaufen', 'Compras'),
  text=('Tap Shopping to find three places. In the Supermarket, you shop and plan. Seller Zone has ready snacks. And with Help out, you can pay for someone’s food.',
        'Tipp auf Einkaufen, dort gibt es drei Bereiche. Im Supermarkt kaufst du ein und planst. In der Seller Zone gibt es fertige Snacks. Und bei Hilf mit kannst du jemandem das Essen mitbezahlen.',
        'Toca Compras y verás tres zonas. En Súper compras y planeas. En Seller Zone hay snacks listos. Y en Ayudar puedes pagar la comida de otra persona.')),
 'shop-week': dict(
  title=('Supermarket', 'Supermarkt', 'Supermercado'),
  text=('In the Supermarket, tap the plus sign to put a product in your cart. Plan my week makes your dinners, a budget and a shopping list.',
        'Im Supermarkt tippst du auf das Plus, dann kommt ein Produkt in den Warenkorb. Meine Woche planen macht dir Abendessen, ein Budget und eine Einkaufsliste.',
        'En el súper, toca el signo más para poner un producto en el carrito. Planear mi semana te prepara cenas, un presupuesto y una lista de la compra.')),
 'community': dict(
  title=('Community', 'Community', 'Comunidad'),
  text=('Tap Community to play and chat with everyone else and their companions. You also find For You and the Ranking there.',
        'Tipp auf Community, um mit allen anderen und ihren Begleitern zu spielen und zu chatten. Dort findest du auch Für dich und die Rangliste.',
        'Toca Comunidad para jugar y chatear con todos los demás y sus compañeros. Ahí también están Para ti y el Ranking.')),
 'settings': dict(
  title=('Settings', 'Einstellungen', 'Ajustes'),
  text=('Hold Community, or tap its name inside Community. In Settings, you change the look and weather, your aura, the language, Body sound and VR. You can also send feedback there.',
        'Halt Community gedrückt oder tipp drinnen auf ihren Namen. In den Einstellungen änderst du Design und Wetter, Aura, Sprache, Körperklang und VR. Dort kannst du auch Feedback senden.',
        'Mantén pulsada Comunidad o toca su nombre dentro. En Ajustes cambias el aspecto y el tiempo, tu aura, el idioma, Sonido del cuerpo y RV. Ahí también puedes enviar comentarios.')),
 'new-intro': dict(
  title=('New in this update', 'Neu in diesem Update', 'Novedades de esta versión'),
  text=('There are a few new things. I’ll show you where they are, and you can skip at any time.',
        'In diesem Update gibt es ein paar neue Sachen. Ich zeige dir, wo sie sind, und du kannst jederzeit überspringen.',
        'Hay algunas novedades. Te enseño dónde están, y puedes saltarlo cuando quieras.')),
 'new-look-weather': dict(
  title=('Look, time of day and weather', 'Design, Tageszeit und Wetter', 'Aspecto, hora y tiempo'),
  text=('Dark is now the look for everyone. You also find Day, Night and Auto here, together with the time of day and the weather.',
        'Dunkel ist jetzt das Design für alle. Hier findest du auch Tag, Nacht und Auto, zusammen mit der Tageszeit und dem Wetter.',
        'Oscuro es ahora el aspecto para todos. Aquí también tienes Día, Noche y Auto, junto con la hora del día y el tiempo.')),
 'new-still-galaxy': dict(
  title=('Calm mode', 'Ruhemodus', 'Modo calma'),
  text=('Calm mode is new in Settings, right under the look. Step by step, the world stays put, the background goes still or away, and in the end nothing moves. Your taps always keep working.',
        'Der Ruhemodus ist neu in den Einstellungen, direkt unter dem Design. Stufe für Stufe bleibt die Welt stehen, der Hintergrund ruht oder verschwindet, und am Ende steht alles still. Tippen geht immer.',
        'El Modo calma es nuevo en Ajustes, justo debajo del aspecto. Paso a paso, el mundo se queda fijo, el fondo se calma o desaparece, y al final nada se mueve. Tocar sigue funcionando siempre.')),
 'new-my-day': dict(
  title=('A simpler My day', 'Mein Tag ist einfacher', 'Mi día es más simple'),
  text=('My day is now one calm page. It starts with a Today card, followed by short lists. If a photo isn’t food, you simply get the option to retake it.',
        'Mein Tag ist jetzt eine ruhige Seite. Oben steht eine Heute-Karte, darunter kommen kurze Listen. Ist auf einem Foto kein Essen, machst du einfach ein neues Foto.',
        'Mi día es ahora una página tranquila. Arriba hay una tarjeta Hoy y debajo, listas cortas. Si una foto no es comida, solo te ofrece repetirla.')),
 'new-cart-total': dict(
  title=('The whole cart with the real total', 'Der ganze Warenkorb mit der echten Summe', 'Todo el carrito con el total real'),
  text=('The Cart now keeps every food with its real amount. When you tap Someone else pays, it asks for the cart’s total, and never for five euros.',
        'Der Warenkorb behält jetzt jedes Essen mit der echten Menge. Wenn du auf Jemand anderes zahlt tippst, geht es um die ganze Summe und nie mehr um fünf Euro.',
        'El carrito ahora guarda cada alimento con su cantidad real. Si tocas Que pague otra persona, pide el total del carrito y nunca cinco euros.')),
 'new-meal-curve': dict(
  title=('After your meal', 'Nach dem Essen', 'Después de comer'),
  text=('Gap has something new. It shows what your blood sugar typically does after a meal, phase by phase, and easy ways to lower the spike.',
        'In Gap gibt es etwas Neues. Du siehst, was dein Blutzucker nach dem Essen typischerweise macht, Phase für Phase, und einfache Wege, den Spike zu senken.',
        'Hay algo nuevo en Gap. Ves lo que suele hacer tu azúcar después de comer, fase a fase, y formas fáciles de bajar el pico.')),
 'new-meal-speaker': dict(
  title=('Listen instead of reading', 'Hören statt lesen', 'Escuchar en vez de leer'),
  text=('In Gap, tap the speaker on an After your meal card, and the tutorial voice reads it to you. Tap it again to stop.',
        'Du kannst Karten jetzt hören statt lesen. Tipp in Gap bei einer Nach-dem-Essen-Karte auf den Lautsprecher, dann wird sie vorgelesen. Tipp noch mal, um zu stoppen.',
        'En Gap, toca el altavoz de una tarjeta de Después de comer y la voz del tutorial te la lee. Toca otra vez para parar.')),
 'new-cart-swipe': dict(
  title=('Your cart', 'Dein Warenkorb', 'Tu carrito'),
  text=('The Supermarket has a Cart with amounts and a total. In Give a hand, swipe a basket right to open its pay link, or left to skip it.',
        'Im Supermarkt gibt es einen Warenkorb mit Mengen und Summe. Bei Hilf mit wischst du einen Korb nach rechts, um den Zahlungslink zu öffnen, oder nach links, um ihn zu überspringen.',
        'En el súper tienes un carrito con cantidades y total. En Echa una mano, desliza una cesta a la derecha para abrir su enlace de pago, o a la izquierda para saltarla.')),
 'new-quick-add': dict(
  title=('Add while you scroll', 'Beim Scrollen hinzufügen', 'Añade mientras bajas'),
  text=('While you scroll through the Supermarket, tap the plus sign on any product, and it goes into your Cart. If you already have it at home, tap the house.',
        'Beim Scrollen durch den Supermarkt tippst du bei einem Produkt auf das Plus, dann landet es im Warenkorb. Hast du es schon zu Hause, tipp auf das Haus.',
        'Mientras bajas por el súper, toca el signo más en cualquier producto y va a tu carrito. Si ya lo tienes en casa, toca la casita.')),
 'new-week-shop': dict(
  title=('Plan my week', 'Meine Woche planen', 'Planear mi semana'),
  text=('In the Supermarket, tap Plan my week. Pick the people, your budget and the dinners. You get a low-spike week with estimated prices, and then you fill your Cart.',
        'Tipp im Supermarkt auf Meine Woche planen. Wähl Personen, Budget und Abendessen. Du bekommst eine Low-Spike-Woche mit geschätzten Preisen und legst alles in den Warenkorb.',
        'En el súper, toca Planear mi semana. Elige personas, presupuesto y cenas. Recibes una semana low-spike con precios estimados y lo pasas todo al carrito.')),
 'new-one-scanner': dict(
  title=('One scanner everywhere', 'Ein Scanner überall', 'Un solo escáner en todas partes'),
  text=('Every scan now shows the same short card. It gives you one verdict, a better pick when that helps, and everything else under Details.',
        'Jeder Scan zeigt jetzt dieselbe kurze Karte. Du bekommst ein Urteil, eine bessere Wahl, wenn sie hilft, und alles andere unter Details.',
        'Cada escaneo muestra ahora la misma tarjeta corta. Te da un veredicto, una opción mejor cuando ayuda, y todo lo demás en Detalles.')),
 'new-shop-finds': dict(
  title=('Simpler shop finds', 'Einfachere Ladenfunde', 'Hallazgos más simples'),
  text=('Shop finds is simpler now. Scan food while you shop to earn XP for your companion. Power combos are right at the top.',
        'Ladenfunde ist jetzt einfacher. Scanne Essen beim Einkaufen und sammle XP für deinen Begleiter. Die Power-Kombis stehen ganz oben.',
        'Hallazgos es ahora más simple. Escanea comida mientras compras y gana XP para tu compañero. Los combos de poder están arriba del todo.')),
 'new-scan-why': dict(
  title=('How often, and why', 'Wie oft und warum', 'Cada cuánto y por qué'),
  text=('When you scan a food, a small curve shows the estimated rise. How often tells you how often it fits, and the Why button explains it in plain words.',
        'Wenn du ein Essen scannst, zeigt eine kleine Kurve den geschätzten Anstieg. Unter Wie oft siehst du, wie oft es passt, und der Button Warum erklärt es in einfachen Worten.',
        'Cuando escaneas un alimento, una curva pequeña muestra la subida estimada. En Cada cuánto ves cuántas veces encaja, y el botón Por qué te lo explica con palabras sencillas.')),
 'new-mic-dictation': dict(
  title=('Speak instead of typing', 'Sprechen statt tippen', 'Habla en vez de escribir'),
  text=('Do you see the small mic in a text field? Tap it and just say your food, and I write it down. In the Home Screen app, tap the mic on your keyboard instead.',
        'Siehst du das kleine Mikro im Textfeld? Tipp drauf und sag einfach dein Essen, dann schreibe ich es auf. In der App auf dem Home-Bildschirm tippst du stattdessen auf das Mikro der Tastatur.',
        '¿Ves el pequeño micro en el campo de texto? Tócalo y di tu comida, y yo la escribo. En la app de la pantalla de inicio, toca mejor el micro del teclado.')),
 'new-cart-ask': dict(
  title=('Someone else pays', 'Jemand anderes zahlt', 'Que pague otra persona'),
  text=('In your Cart, tap Someone else pays, and the whole cart becomes a Give a hand basket. It asks for the cart’s total. Add your pay link and share it.',
        'Tipp im Warenkorb auf Jemand anderes zahlt, dann landet der ganze Warenkorb bei Hilf mit. Er fragt nach der Summe des Warenkorbs. Füg deinen Zahlungslink hinzu und teile ihn.',
        'En tu carrito, toca Que pague otra persona y todo el carrito pasa a ser una cesta de Echa una mano. Pide el total del carrito. Añade tu enlace de pago y compártela.')),
 'new-give-hand': dict(
  title=('Give a hand', 'Hilf mit', 'Echa una mano'),
  text=('Give a hand now has its own tab in the shop, right next to Seller Zone. You can pay for someone’s healthy groceries, or share your own basket.',
        'Hilf mit hat jetzt einen eigenen Tab im Shop, direkt neben der Seller Zone. Du kannst jemandem gesunde Lebensmittel bezahlen oder deinen eigenen Korb teilen.',
        'Echa una mano tiene ahora su propia pestaña en la tienda, junto a Seller Zone. Puedes pagar la compra sana de alguien o compartir tu propia cesta.')),
 'new-voice-speed': dict(
  title=('Voice speed', 'Sprechtempo', 'Velocidad de voz'),
  text=('Tap my picture, and I read aloud. Tap the speed next to Pause, and I talk one and a half or two times as fast, like a voice note. I remember your choice.',
        'Tipp auf mein Bild, dann lese ich vor. Tipp auf das Tempo neben Pause, dann spreche ich anderthalbmal oder doppelt so schnell, wie bei einer Sprachnachricht. Ich merke mir deine Wahl.',
        'Toca mi imagen y leo en voz alta. Toca la velocidad junto a Pausa y hablo una vez y media o el doble de rápido, como una nota de voz. Recuerdo tu elección.')),
 'new-move-finish': dict(
  title=('Finish strong', 'Stark ins Ziel', 'Termina a lo grande'),
  text=('When you finish any Move session, including Mirror mode and Deadlift, you get the biggest reward in the app and a big celebration.',
        'Wenn du eine Bewegungs-Einheit beendest, auch im Spiegel-Modus oder beim Kreuzheben, bekommst du die größte Belohnung der App und ein großes Fest.',
        'Cuando terminas cualquier sesión de Movimiento, también en modo espejo o con peso muerto, recibes la mayor recompensa de la app y una gran celebración.')),
 'new-day-recap': dict(
  title=('Looking back on your day', 'Dein Tag im Rückblick', 'Tu día en resumen'),
  text=('Open My day in Settings and tap Day recap. You see your meals, your longest gap, Move and care, one tip for tomorrow and a line for your journal.',
        'Öffne in den Einstellungen Mein Tag und tipp auf Tagesrückblick. Du siehst deine Mahlzeiten, deine längste Pause, Bewegung und Fürsorge, einen Tipp für morgen und eine Zeile fürs Tagebuch.',
        'Abre Mi día en Ajustes y toca Resumen del día. Ves tus comidas, tu pausa más larga, el movimiento y el cuidado, un consejo para mañana y una línea para tu diario.')),
 'new-quick-tour': dict(
  title=('Quick tour', 'Kurze Tour', 'Tour rápido'),
  text=('The quick tour shows the whole app in one short video. You find it on the very first screen when you set up the app. It starts muted, so tap it for sound.',
        'Die kurze Tour zeigt die ganze App in einem kurzen Video. Du findest sie auf dem ersten Bildschirm, wenn du die App einrichtest. Sie startet ohne Ton, also tipp drauf, um sie zu hören.',
        'El tour rápido muestra toda la app en un vídeo corto. Lo encuentras en la primera pantalla cuando configuras la app. Empieza sin sonido, así que tócalo para oírlo.')),
 'new-evening-catchup': dict(
  title=('Catch up on today', 'Heute nachtragen', 'Completar hoy'),
  text=('Couldn’t log during the day? Open My day in Settings and tap Catch up on today. You get one big bubble at a time, tap what you had, and then tap Save.',
        'Bist du tagsüber nicht zum Eintragen gekommen? Öffne in den Einstellungen Mein Tag und tipp auf Heute nachtragen. Tipp in jeder großen Blase an, was du hattest, und am Ende auf Speichern.',
        '¿No pudiste anotar durante el día? Abre Mi día en Ajustes y toca Completar hoy. Verás una burbuja grande cada vez. Toca lo que tomaste y luego Guardar.')),
 'new-deadlift': dict(
  title=('Deadlift in Mirror mode', 'Kreuzheben im Spiegel-Modus', 'Peso muerto en modo espejo'),
  text=('For a deadlift in Mirror mode, stand sideways to your phone. The glowing outline shows you the move and counts every clean rep.',
        'Für Kreuzheben im Spiegel-Modus stellst du dich seitlich zum Handy. Der leuchtende Umriss macht dir die Bewegung vor und zählt jede saubere Wiederholung.',
        'Para el peso muerto en modo espejo, ponte de lado al móvil. La silueta brillante te enseña el movimiento y cuenta cada repetición limpia.')),
 'new-seller': dict(
  title=('Seller Zone', 'Seller Zone', 'Seller Zone'),
  text=('In Seller Zone, you can order real snacks, like chips, chocolate and gummies. Every snack is strictly checked and has a photo and a price. Shops near you come first.',
        'In der Seller Zone bestellst du echte Snacks, etwa Chips, Schokolade und Gummibärchen. Jeder Snack ist streng geprüft und hat ein Foto und einen Preis. Shops in deiner Nähe kommen zuerst.',
        'En Seller Zone puedes pedir snacks de verdad, como patatas, chocolate y gominolas. Cada uno está revisado a fondo y tiene foto y precio. Primero salen las tiendas cerca de ti.')),
 'new-sleep': dict(
  title=('Sleep in your ring', 'Schlaf in deinem Ring', 'El sueño en tu anillo'),
  text=('Sleep now lives in the ring with your other bubbles, in the same lively style.',
        'Schlaf wohnt jetzt mit deinen anderen Blasen im Ring, im selben lebendigen Stil.',
        'El sueño ahora vive en el anillo con tus otras burbujas, con el mismo estilo vivo.')),
 'new-people': dict(
  title=('Everyone in LOWiSPIKE', 'Alle bei LOWiSPIKE', 'Todos en LOWiSPIKE'),
  text=('In the Ranking, there is a new round button called Members. It opens People, with everyone in the app, even when they are offline, and who is online right now.',
        'In der Rangliste gibt es einen neuen runden Knopf namens Mitglieder. Er öffnet Leute, mit allen in der App, auch wenn sie offline sind, und wer gerade online ist.',
        'En el Ranking hay un botón redondo nuevo llamado Miembros. Abre Personas, con todos en la app, también sin conexión, y quién está en línea ahora.')),
 'new-humans': dict(
  title=('Only real people', 'Nur echte Menschen', 'Solo personas reales'),
  text=('The Ranking, Add a friend and the chat show only real people. Bot posts, like Nibblo’s meals, are in For You.',
        'Das Ranking, Freund hinzufügen und der Chat zeigen nur echte Menschen. Bot-Posts, wie Nibblos Mahlzeiten, findest du in Für dich.',
        'El Ranking, Añadir un amigo y el chat muestran solo personas reales. Los posts de bots, como las comidas de Nibblo, están en Para ti.')),
 'new-sync': dict(
  title=('iPhone and iPad in sync', 'iPhone und iPad synchron', 'iPhone y iPad sincronizados'),
  text=('If you are signed in on your iPhone and your iPad, your companion, your level and your logs stay in sync on both.',
        'Bist du auf iPhone und iPad angemeldet, dann bleiben dein Begleiter, dein Level und deine Einträge auf beiden synchron.',
        'Si inicias sesión en tu iPhone y en tu iPad, tu compañero, tu nivel y tus registros se quedan sincronizados en los dos.')),
 'done': dict(
  title=('You’re all set', 'Du bist startklar', 'Todo listo'),
  text=('Drag the joystick, and I fly. Tap it three times for autopilot, or fly me past the edge into the galaxy.',
        'Zieh am Joystick, dann fliege ich. Tipp dreimal für den Autopiloten, oder flieg mit mir über den Rand in die Galaxie.',
        'Arrastra el joystick y vuelo. Tócalo tres veces para el piloto automático, o llévame más allá del borde, hasta la galaxia.')),
}

STR = r"'((?:[^'\\]|\\.)*)'"

def js(s):
    assert "'" not in s and '\\' not in s, s
    return s

def apply(src, only=None):
    for sid, parts in NEW.items():
        if only and sid not in only:
            continue
        m = re.search(r"id: '" + re.escape(sid) + r"'", src)
        if not m:
            print('missing step', sid); continue
        nxt = re.search(r"\n\s*id: '", src[m.end():])
        a, b = m.start(), m.end() + (nxt.start() if nxt else len(src) - m.end())
        block = src[a:b]
        for field, vals in parts.items():
            fm = re.search(r'\b' + field + r': \{', block)
            if not fm:
                print('missing', sid, field); continue
            pos = fm.end()
            for lang, val in zip(('en', 'de', 'es'), vals):
                lm = re.compile(r'\b' + lang + r': ' + STR).search(block, pos)
                block = block[:lm.start()] + lang + ": '" + js(val) + "'" + block[lm.end():]
                pos = lm.start() + len(lang) + 4 + len(val)
        src = src[:a] + block + src[b:]
    return src

if __name__ == '__main__':
    f = os.path.join(os.path.dirname(__file__), '..', '..', 'tutorial-steps.js')
    only = sys.argv[1:] or None
    s = open(f, encoding='utf-8').read()
    open(f, 'w', encoding='utf-8').write(apply(s, only))
