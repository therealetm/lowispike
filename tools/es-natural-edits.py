#!/usr/bin/env python3
"""One-off: natural Spanish copy pass (Oct 2026). Each (file, old, new) must match exactly once,
either as written or with non-ASCII characters escaped as \\uXXXX (several JS files store escapes)."""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

def esc(s):
    return ''.join(c if ord(c) < 128 else '\\u%04x' % ord(c) for c in s)

E = [
 # --- herb-start.js: the first screens ---
 ('herb-start.js', "'Moverte','Pausa (ayuno)'", "'Movimiento','Pausa (ayuno)'"),
 ('herb-start.js', "playH:'Lo haces volar por mundos vivos.'", "playH:'Tú lo guías volando por mundos llenos de vida.'"),
 ('herb-start.js', "'Arrastra el mando para volar. Mantenlo para avanzar.'", "'Arrastra el mando para volar. Mantenlo pulsado para avanzar.'"),
 ('herb-start.js', "'Tres toques rápidos: piloto automático. Explora solo.'", "'Toca tres veces rápido y se activa el piloto automático: explora solo.'"),
 ('herb-start.js', "'Toca una burbuja como Comida o Move para abrirla.'", "'Toca una burbuja, como Comida o Movimiento, para abrirla.'"),
 ('herb-start.js', "'Vuela al mundo celular o aleja el zoom hasta el mundo espíritu.'", "'Vuela al mundo celular o aleja la cámara hasta el mundo espiritual.'"),
 ('herb-start.js', "'En la tienda, escanea productos para estimar el pico y caza combos de poder.'", "'En la tienda, escanea productos para ver si te subirían el azúcar y busca combos de poder.'"),
 ('herb-start.js', "Aleja el zoom y encontrarás el mundo espiritual", "Aleja la cámara y encontrarás el mundo espiritual"),
 ('herb-start.js', "saveBtn:'Guarda el mundo de tu ser de luz: cuenta gratis'", "saveBtn:'Crea una cuenta gratis y guarda el mundo de tu ser de luz'"),
 ('herb-start.js', "fine:'Gratis. Tarda 20 segundos.'", "fine:'Es gratis y solo te lleva 20 segundos.'"),
 ('herb-start.js', "ivP:'Hasta 4 preguntas rápidas para que tus primeros pasos encajen en tu día. Todas opcionales. Sin preguntas de salud.'", "ivP:'Hasta 4 preguntas rápidas para que tus primeros pasos encajen en tu día. Todas son opcionales y ninguna es sobre tu salud.'"),
 ('herb-start.js', "planP:'Están en Hoy. Cada uno abre la parte de la app que lo hace.'", "planP:'Los tienes en Hoy. Al tocar uno, se abre la parte de la app donde se hace.'"),
 ('herb-start.js', "qThanks:'Entendido. Ajusté tus pasos.'", "qThanks:'Entendido. He ajustado tus pasos.'"),
 # --- companion-birth.js: the reveal ---
 ('companion-birth.js', "over:'Tu compañía ya está aquí'", "over:'Tu compañero ya está aquí'"),
 ('companion-birth.js', "myth:'Nace de {myth}, tu color estelar y la energía de tus células.'", "myth:'Nace de {myth}, de tu color estelar y de la energía de tus células.'"),
 # --- shop-plan.js: setup shopping step ---
 # --- index.html: account + setup dictionary (DOM translator rows) ---
 ('index.html', '"Skip the spike.", "Spike vermeiden.", "Sin el pico."]', None),
 ('index.html', '"Three fields. That\'s it.", "Drei Felder. Mehr nicht.", "Tres campos. Eso es todo."]', None),
]

# Rows in index.html whose Spanish column changes: (english key, old es, new es)
ROWS = [
 ("Skip the spike.", "Sin el pico.", "Sin subidones de azúcar."),
 ("Three fields. That's it.", "Tres campos. Eso es todo.", "Solo tres datos y listo."),
 ("Create a free account so your meals, streak and profile are kept safe. Everything you've done so far stays.", "Crea una cuenta gratis para guardar tus comidas, tu racha y tu perfil. Todo lo que has hecho se queda.", "Crea una cuenta gratis para guardar tus comidas, tu racha y tu perfil. No perderás nada de lo que llevas hecho."),
 ("Make an account once. The app remembers you, on any phone.", "Crea una cuenta una vez. La app te recuerda en cualquier móvil.", "Crea tu cuenta una sola vez y la app te reconocerá en cualquier móvil."),
 ("Sign in to get all your stuff back.", "Inicia sesión para recuperar todo.", "Inicia sesión para recuperar todas tus cosas."),
 ("Already have one?", "¿Ya tienes una?", "¿Ya tienes cuenta?"),
 ("Forgot your password? Ask Emmanuel and he'll reset it for you.", "¿Olvidaste tu contraseña? Pídele a Emmanuel que la restablezca.", "¿Has olvidado tu contraseña? Pídele a Emmanuel que te la restablezca."),
 ("Nice to meet you", "Encantado de conocerte", "Encantados de conocerte"),
 ("Your star sign shows up here", "Aquí aparece tu signo", "Aquí aparecerá tu signo del zodiaco"),
 ("It sets the colour of your app.", "Define el color de tu app.", "Decide el color de tu app."),
 ("Your app takes on your sign's colour.", "Tu app toma el color de tu signo.", "Tu app se tiñe del color de tu signo."),
 ("It shapes your companion and the colour of your app.", "Da forma a tu compañía y al color de tu app.", "Con él nacen tu compañero y el color de tu app."),
 ("Your companion and your app take on your sign's colour.", "Tu compañía y tu app toman el color de tu signo.", "Tu compañero y tu app se tiñen del color de tu signo."),
 ("Looks good", "Se ve bien", "Me gusta"),
 ("Change later", "Cambiar luego", "La cambio luego"),
 ("People in Community see it next to your messages.", "La gente de la Comunidad la ve junto a tus mensajes.", "En la Comunidad aparece junto a tus mensajes."),
 ("What do you want most?", "¿Qué quieres más?", "¿Qué es lo que más quieres?"),
 ("Pick any. You can change it in Profile.", "Elige las que quieras. Puedes cambiarlo en Perfil.", "Elige las que quieras. Puedes cambiarlas en Perfil."),
 ("Add birthday for your star sign", "Añade tu cumpleaños para tu signo", "Añade tu cumpleaños para ver tu signo"),
 ("Saved · syncs when you're online", "Guardado · se sincroniza cuando estés en línea", "Guardado · se sincronizará cuando tengas conexión"),
 ("No connection. Try again when you're online.", "Sin conexión. Inténtalo cuando estés en línea.", "Sin conexión. Inténtalo cuando vuelvas a tener internet."),
 ("Your password can't be shown, not even by LOWiSPIKE.", "Tu contraseña no se puede mostrar, ni siquiera LOWiSPIKE puede.", "Nadie puede ver tu contraseña, ni siquiera LOWiSPIKE."),
 ("It is only stored as a scrambled code that can't be turned back into your password.", "Solo se guarda como un código cifrado que no se puede convertir de nuevo en tu contraseña.", "Solo se guarda como un código cifrado del que no se puede recuperar."),
 ("You're signed in, so you don't need the old one. Set a new password here. Your account and everything in it stay.", "Has iniciado sesión, así que no necesitas la antigua. Pon una contraseña nueva aquí. Tu cuenta y todo lo que tiene se quedan.", "Ya has iniciado sesión, así que no te hace falta la antigua. Pon aquí una nueva. Tu cuenta y todo lo que tienes se mantienen."),
 ("Low spike, made by you.", "Low spike, hecho por ti.", "Sin subidón de azúcar, y hecho por ti."),
 ("Put these out first", "Saca esto primero", "Ten esto a mano"),
 ("Probably at home", "Seguramente ya lo tienes", "Seguramente ya lo tienes en casa"),
 ("Nothing yet. Tap what you have below.", "Nada aún. Toca abajo lo que tienes.", "Aún nada. Marca abajo lo que ya tienes."),
 ("Tap one to see its low-spike swap.", "Toca uno para ver su cambio low-spike.", "Toca uno para ver con qué cambiarlo sin subidón de azúcar."),
 ("Quick picks", "Rápidos", "Opciones rápidas"),
 ("Not OK", "No OK", "No está bien"),
 ("Until it's checked, treat it as a no.", "Hasta que se revise, toma la respuesta como no.", "Mientras no esté revisado, mejor tómalo como un no."),
 ("All three are fine? Then it's probably OK.", "¿Las tres bien? Entonces seguramente está bien.", "¿Cumple las tres? Entonces seguramente está bien."),
 # scanner verdicts: they estimate a blood sugar spike, not insulin
 ("Will likely spike insulin", "Probablemente sube la insulina", "Probablemente te sube el azúcar"),
 ("Likely won't spike insulin", "Probablemente no sube la insulina", "Probablemente no te sube el azúcar"),
 ("Blood sugar and insulin impact", "Impacto en azúcar e insulina", "Efecto en el azúcar y la insulina"),
]

E = [e for e in E if e[2] is not None]

E += [
 ('shop-scan-core.js', "'Probablemente sube tu insulina'", "'Probablemente te sube el azúcar'"),
 ('shop-scan-core.js', "'Es poco probable que suba tu insulina'", "'Es poco probable que te suba el azúcar'"),
 ('store-picks.js', "'Todos los productos amigables con la insulina de tu tienda'", "'Todos los productos de tu tienda que no disparan el azúcar'"),
 # legacy 'herb' words: in Spanish 'tu hierba' also reads as slang for weed
 ('spirit.js', "'El mundo de tu hierba'", "'El mundo de tu ser de luz'"),
 ('spirit.js', "'Escanear · tu hierba mira'", "'Escanear · tu ser de luz mira'"),
 ('spirit.js', "'Tu hierba'", "'Tu ser de luz'"),
 ('spirit.js', "'Alimenta tu hierba +15 XP'", "'Da energía a tu ser de luz +15 XP'"),
 ('daily-ritual.js', "Mitad de semana. Tu hierba lo ha notado.", "Mitad de semana. Tu ser de luz lo ha notado."),
 ('daily-ritual.js', "'Abre LOWiSPIKE desde inicio. Ahora tu hierba puede recordarte co", "'Abre LOWiSPIKE desde la pantalla de inicio. Ahora tu ser de luz puede recordarte co"),
 ('daily-ritual.js', "T('Your herb', 'Dein Kraut', 'Tu hierba')", "T('Your herb', 'Dein Kraut', 'Tu ser de luz')"),
 ('daily-ritual.js', "'Pantalla completa, se abre con un toque y tu hierba puede recordarte.'", "'Pantalla completa, se abre con un toque y tu ser de luz puede recordarte cosas.'"),
 ('herb-tamagotchi.js', "'Saluda a tu hierba'", "'Saluda a tu ser de luz'"),
 ('herb-quests.js', "'Tu hierba está completa. Cada acción la mantiene viva.'", "'Tu ser de luz ya está en su forma final. Cada acción lo mantiene lleno de vida.'"),
 ('herb-quests.js', "'Camino de la hierba'", "'Camino de tu ser de luz'"),
 ('herb-quests-core.js', "'Escanea antes de comprar o comer. La hierba te dice si da pico o no.'", "'Escanea antes de comprar o comer. Tu ser de luz te dice si te subirá el azúcar o no.'"),
 ('herb-shop-core.js', "'Todo lo importante: escanear, registrar, ayuno, tu hierba, el armario con XP, la tienda y el regalo diario'", "'Todo lo importante: escanear, registrar comidas, ayunar, tu ser de luz, el armario con XP, la tienda y el regalo diario'"),
 ('finch-extras.js', "'De tu hierba y de la gente de la sala. Toca para enviar buenas vibras.'", "'De tu ser de luz y de la gente de la sala. Toca para enviar buena energía.'"),
 ('finch-extras.js', "'hierba llegó al nivel'", "'ser de luz llegó al nivel'"),
 # starter plan wording
 ('starter-core.js', "'Esa comida disparó el azúcar. ¿Qué te lo pone difícil?'", "'Esa comida te subió el azúcar. ¿Qué te complica comer bien?'"),
 ('starter-core.js', "'Por la tarde tus antojos son más fuertes. Escanea tu snack y mira si dispara.'", "'Por la tarde tus antojos son más fuertes. Escanea tu snack y mira si te sube el azúcar.'"),
 ('starter-core.js', "'Escanear es la forma más rápida de saber qué te dispara. Uno al día basta.'", "'Escanear es la forma más rápida de saber qué te sube el azúcar. Con uno al día basta.'"),
 ('starter-core.js', "Un escaneo antes de cenar muestra el pico antes de que pase.", "Un escaneo antes de cenar te avisa del pico de azúcar antes de que llegue."),
 ('starter-core.js', "Registrar la primera comida marca el día.", "Registrar la primera comida marca el tono del día."),
]

def main():
    errs = []
    files = {}
    def get(f):
        if f not in files: files[f] = (ROOT / f).read_text(encoding='utf-8')
        return files[f]
    for f, old, new in E:
        s = get(f)
        for o, n in ((old, new), (esc(old), esc(new))):
            c = s.count(o)
            if c == 1:
                files[f] = s.replace(o, n); break
        else:
            errs.append('%s: %r found %d/%d' % (f, old[:70], s.count(old), s.count(esc(old))))
    s = get('index.html')
    for en, old, new in ROWS:
        enj = en.replace('"', '\\"')
        import re
        pat = re.compile(r'\["' + re.escape(enj) + r'", ("(?:[^"\\]|\\.)*"), "' + re.escape(old) + r'"\]')
        hits = pat.findall(s)
        if len(hits) != 1:
            errs.append('ROW %r hits %d' % (en[:60], len(hits))); continue
        s = pat.sub(lambda m: '["' + enj + '", ' + m.group(1) + ', "' + new + '"]', s)
    files['index.html'] = s
    if errs:
        print('\n'.join(errs)); sys.exit(1)
    for f, s in files.items(): (ROOT / f).write_text(s, encoding='utf-8')
    print('ok', len(E), 'edits +', len(ROWS), 'rows')

main()
