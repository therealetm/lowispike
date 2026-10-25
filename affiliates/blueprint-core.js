/* LOWiSPIKE Affiliates core (simplified 21 Oct 2026, Eman: "this is confusing, why so complicated"). Pure data and logic, no DOM.
   The page is a template now: pick Webdesign or UGC, get the baseline script built on Burak's proven series (the one that sold),
   bring your own personality on camera, and see what you earn per level. No forms, no niche generator, no tracking, no manual sales.
   Affiliates get their personal link from Eman directly on WhatsApp, so the page has no link field.
   Placeholders such as [Branche] or [Marke] stay inline as plain bracketed text the affiliate swaps in.
   Used by affiliates/blueprint.js (the page) and tests/affiliates-blueprint.test.cjs. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LowiBlueprint = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VERSION = 2;
  const PRICE = 99;

  const LANGS = ['en', 'de', 'es'];
  function normLang(l) { l = String(l || '').slice(0, 2).toLowerCase(); return LANGS.indexOf(l) >= 0 ? l : ''; }
  /* Language rule (Eman, 21 Oct: "the language should be set based on what language the user already picked for the whole app"):
     an explicit ?lang= in a shared link, else the app's own choice (localStorage lowispike.lang, same key the app writes),
     else the browser's languages, else English. Never German by default. */
  function pickLang(o) {
    o = o || {};
    const order = [o.param, o.stored].concat(o.nav || []);
    for (const x of order) { const l = normLang(x); if (l) return l; }
    return 'en';
  }
  function eur(v, lang) {
    const n = (Math.round(Number(v) * 100) / 100).toFixed(2);
    if (lang === 'en') return '\u20ac' + n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return n.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '\u00a0\u20ac';
  }
  function pct(rate, lang) { const n = String(Math.round(rate * 1000) / 10); return lang === 'en' ? n + '%' : n.replace('.', ',') + '\u00a0%'; }

  /* ---------- The two series. One shell, only the product, the proof and the keyword change. ---------- */
  const SERIES = {
    webdesign: {
      id: 'webdesign', title: 'Webdesign', product: 'AI Website Client System', price: PRICE, keyword: 'Webdesign',
      blurb: 'ChatGPT findet Kunden, baut ihre neue Website und pitcht sie per E-Mail.',
      onScreen: 'Tag [X] auf dem Weg zu 30.000\u00a0\u20ac im Monat mit Websites',
      scenes: [
        { shot: 'talk', label: 'Opening \u00b7 Talking Head, iPad zeigt das Produkt', lines: ['Tag [X] meiner Challenge, diesen Monat 30.000 Euro mit Websites zu machen.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Branche w\u00e4hlen', lines: ['[Branche]. Okay. Los geht\u2019s.'], note: 'Optional: Branche per Zufallsgenerator oder ChatGPT w\u00e4hlen lassen, oder die Szene weglassen.' },
        { shot: 'screen', label: 'POV Laptop \u00b7 Lead-Skill', lines: ['Als Erstes aktiviere ich meinen Lead-Skill. Der sucht mir automatisch [Branche] in meiner N\u00e4he raus und findet die Unternehmen, bei denen sich eine neue Website tats\u00e4chlich lohnen k\u00f6nnte.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Website-Skill', lines: ['Dann nehme ich meinen zweiten ChatGPT-Skill und lasse ihn direkt eine komplett neue Website bauen.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Ergebnis', lines: ['Und das ist das Ergebnis.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Proposal-Skill', lines: ['Aber ich schicke dem Besitzer nat\u00fcrlich nicht einfach nur irgendeinen Link.', 'Daf\u00fcr habe ich noch meinen Proposal-Skill. Der nimmt das Unternehmen, die neue Website und mein Angebot und baut daraus automatisch eine animierte Pr\u00e4sentation, mit der ich die Website pitche.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 E-Mail', lines: ['Das Ganze geht jetzt per E-Mail an den Besitzer.'] },
        { shot: 'outro', label: 'Outro \u00b7 Talking Head + iPad', lines: ['Glaubt ihr, dass ich damit den Kunden lande?', 'Kommentiert \u201eWebdesign\u201c, wenn ihr meine kompletten ChatGPT-Workflows und Skills auch haben wollt.'] }
      ],
      shots: [
        { title: 'Opening', how: 'Talking Head. Halte das iPad mit der Produktseite in die Kamera, Text oben einblenden.' },
        { title: 'POV Laptop, eine Aufnahme am St\u00fcck', how: 'Bildschirm aufnehmen, Voiceover selbst sprechen oder per KI-Stimme.', beats: ['Branche zeigen (optional)', 'Lead-Skill in ChatGPT, Trefferliste', 'Website-Skill baut die Seite', 'Fertige Website durchscrollen', 'Proposal-Skill: animierte Pr\u00e4sentation', 'E-Mail an den Besitzer, Adresse unkenntlich'] },
        { title: 'Outro', how: 'Zur\u00fcck zum Talking Head, iPad zeigt \u201eKommentiere WEBDESIGN\u201c.' }
      ],
      caption: 'Tag [X] auf dem Weg zu 30.000\u00a0\u20ac im Monat mit Websites. Kommentiere \u201eWebdesign\u201c f\u00fcr meine Workflows und Skills. #werbung #ki #chatgpt #webdesign'
    },
    ugc: {
      id: 'ugc', title: 'UGC', product: 'AI Sponsoren-Agent', price: PRICE, keyword: 'Sponsor',
      blurb: 'ChatGPT schreibt Marken an und verhandelt UGC-Deals f\u00fcr dich.',
      onScreen: 'Tag [X] auf dem Weg zu 30.000\u00a0\u20ac im Monat mit UGC',
      scenes: [
        { shot: 'talk', label: 'Opening \u00b7 Talking Head, iPad zeigt das Produktbild', lines: ['Heute hat ChatGPT mit meinem Agency-Skill wieder [Anzahl] potenzielle Sponsoren angeschrieben. Unter anderem die Marke hinter diesem [Produkt].'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Sponsorensuche', lines: ['[Marke]. Mein Agent hat die Marke gefunden, weil das Produkt zu meinem Alltag passt.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Gesendete E-Mail', lines: ['Er bietet denen ein Video an: [Videoidee]. [Preis] Euro f\u00fcr den fertigen Clip.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Learning', lines: ['Merkt euch: Pitcht nicht nur ein Produkt. Zeigt der Marke, welches Problem ihr damit im Video l\u00f6st.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Agency-PDF', lines: ['Die Preisberechnung, mein Stop-Loss und die Verhandlungsregeln kommen aus meinem Agency-Skill. Diese PDF gibt ChatGPT den Ablauf f\u00fcr Recherche, E-Mails und Verhandlungen.'] },
        { shot: 'screen', label: 'POV Laptop \u00b7 Versand\u00fcbersicht', lines: ['Das l\u00e4uft im Hintergrund weiter. Bei Geldangeboten komme ich dazu. Und f\u00fcr UGC brauche ich keine gro\u00dfe Community: Die Marke bezahlt f\u00fcr mein Video.'] },
        { shot: 'outro', label: 'Outro \u00b7 Talking Head + iPad', lines: ['Folgt mir, um an Tag 30 herauszufinden, wie viel Geld ich tats\u00e4chlich verdient habe und ob ich die 30K geschafft habe.', 'Kommentiert \u201eSponsor\u201c f\u00fcr meinen Agency-Skill.'] }
      ],
      shots: [
        { title: 'Opening', how: 'Talking Head. Halte das iPad mit dem Produktbild der Marke in die Kamera, Text oben einblenden.' },
        { title: 'POV Laptop, eine Aufnahme am St\u00fcck', how: 'Bildschirm aufnehmen, Voiceover selbst sprechen oder per KI-Stimme.', beats: ['Sponsorensuche in ChatGPT', 'Produktseite der Marke', 'Gesendete E-Mail, Preis hervorheben', 'Agency-PDF und Preisregeln', 'Versand\u00fcbersicht, Adressen unkenntlich'] },
        { title: 'Outro', how: 'Zur\u00fcck zum Talking Head, iPad zeigt \u201eKommentiere SPONSOR\u201c.' }
      ],
      caption: 'Tag [X] auf dem Weg zu 30.000\u00a0\u20ac im Monat mit UGC. Kommentiere \u201eSponsor\u201c f\u00fcr meinen Agency-Skill. #werbung #ki #chatgpt #ugc'
    }
    ,
    /* Third track, rewritten 24 Oct 2026 to Eman's exact six steps (the old 30-day script was "komplett Blödsinn"). The creator
       uses the app and really loses weight; each video is one day of their own series:
         1. "Day X: lose [kg] within [time]" (their own goal; time in days OR months), while the app's Shuffle runs
         2. the Shuffle stops
         3. "Nice. Today's insulin-friendly meal is [dish]."
         4. cut to cooking (cook it yourself or with our AI video tool)
         5. cut to the mukbang, rate the food
         6. CTA: the e-book, comment "Rezept" / "recipe" / "receta".
       No figure of Eman's in the script, and never a weight promise for viewers (see DECISIONS.md). Business model: only one
       thing is sold, Eman's e-book; the Shuffle and the app stay free, and creators earn when people who come through their
       link use the app and upgrade (freeTrack). */
    lowispike: {
      id: 'lowispike', title: 'LOWiSPIKE', product: 'LOWiSPIKE App + E-Book', price: null, free: true, keyword: 'Rezept',
      langs: {
        en: {
          keyword: 'recipe',
          blurb: 'You film your journey with the app: your own goal, the shuffle, cooking, eating, your rating. People comment \u201crecipe\u201d for the e-book.',
          onScreen: 'Day [X] \u00b7 [Goal] kilos down within [Time]',
          vars: { day: '[X]', kg: '[Goal]', time: '[Time]', food: '[Meal]', rating: '[Rating]', keyword: 'recipe' },
          scenes: [
            { shot: 'talk', label: 'Opening \u00b7 Talking head, the shuffle runs on your phone', lines: ['Day [X]: losing [Goal] kilos within [Time].'], note: 'Your own goal: you pick the kilos and the time, in days or months, for example 10 kilos within 90 days or within 3 months. Start Shuffle my food while you say it. Never promise viewers a number.' },
            { shot: 'screen', label: 'POV phone \u00b7 The shuffle stops', lines: ['And stop.'] },
            { shot: 'screen', label: 'POV phone \u00b7 Today\u2019s meal', lines: ['Nice. Today\u2019s insulin-friendly meal is [Meal].'] },
            { shot: 'cook', label: 'Cut to cooking \u00b7 yourself or with our AI video tool', lines: ['Time to cook.'], note: 'Cook it yourself and film cooking clips, or use our AI video tool in the Creation tab to show how it\u2019s cooked.' },
            { shot: 'talk', label: 'Cut to the mukbang \u00b7 eat and rate it', lines: ['Let\u2019s try it.', '[Rating] out of 10.'], note: 'Eat on camera and talk about whatever you like, or nothing at all. Rate the food at the end.' },
            { shot: 'outro', label: 'Ending \u00b7 CTA, phone shows \u201cComment recipe\u201d', lines: ['If you want the e-book with the recipes from the shuffle, comment \u201crecipe\u201d.'], note: 'One video a day: your series shows how much you lose along the way.' }
          ],
          shots: [
            { title: 'Opening', how: 'Talking head. Hold the phone to the camera while the shuffle runs, title text on top.' },
            { title: 'Phone and kitchen', how: 'Record the phone screen, then cut to the kitchen. Speak the voiceover yourself or with an AI voice.', beats: ['The shuffle stops', 'Nice: today\u2019s meal', 'Cut to cooking: yourself or with our AI video tool (Creation)', 'The finished plate'] },
            { title: 'Mukbang and CTA', how: 'Back on camera: eat, talk or just enjoy it, rate it out of 10, then the phone with \u201cComment recipe\u201d.' }
          ],
          caption: 'Day [X] \u00b7 my goal: [Goal] kilos down within [Time]. Today: [Meal]. Comment \u201crecipe\u201d for the e-book with the recipes from the shuffle. #ad #lowispike #insulinfriendly #weightlossjourney'
        },
        de: {
          keyword: 'Rezept',
          blurb: 'Du filmst deinen Weg mit der App: dein eigenes Ziel, der Shuffle, kochen, essen, bewerten. Die Leute kommentieren \u201eRezept\u201c für das E-Book.',
          onScreen: 'Tag [X] \u00b7 [Ziel] Kilo weniger in [Zeitraum]',
          vars: { day: '[X]', kg: '[Ziel]', time: '[Zeitraum]', food: '[Mahlzeit]', rating: '[Note]', keyword: 'Rezept' },
          scenes: [
            { shot: 'talk', label: 'Opening \u00b7 Talking Head, auf dem Handy läuft der Shuffle', lines: ['Tag [X]: [Ziel] Kilo abnehmen innerhalb von [Zeitraum].'], note: 'Dein eigenes Ziel: Kilo und Zeitraum wählst du selbst, in Tagen oder Monaten, zum Beispiel 10 Kilo innerhalb von 90 Tagen oder 3 Monaten. Während du das sagst, läuft in der App Essen mischen. Versprich Zuschauern nie eine Zahl.' },
            { shot: 'screen', label: 'POV Handy \u00b7 Der Shuffle bleibt stehen', lines: ['Und stopp.'] },
            { shot: 'screen', label: 'POV Handy \u00b7 Die Mahlzeit von heute', lines: ['Nice. Die heutige insulinfreundliche Mahlzeit ist [Mahlzeit].'] },
            { shot: 'cook', label: 'Cut zum Kochen \u00b7 selbst oder mit dem KI-Video-Tool', lines: ['Jetzt wird gekocht.'], note: 'Koch selbst und film Kochclips, oder nutz unser KI-Video-Tool im Tab Creation, das zeigt, wie es gekocht wird.' },
            { shot: 'talk', label: 'Cut zum Mukbang \u00b7 essen und bewerten', lines: ['Mal probieren.', '[Note] von 10.'], note: 'Iss vor der Kamera und rede, worüber du willst, oder gar nicht. Am Ende bewertest du das Essen.' },
            { shot: 'outro', label: 'Ende \u00b7 CTA, Handy zeigt \u201eKommentiere Rezept\u201c', lines: ['Wenn du das E-Book mit den Rezepten aus dem Shuffle willst, kommentier \u201eRezept\u201c.'], note: 'Jeden Tag ein Video: Deine Serie zeigt, wie viel du nach und nach abnimmst.' }
          ],
          shots: [
            { title: 'Opening', how: 'Talking Head. Halte das Handy in die Kamera, während der Shuffle läuft. Text oben einblenden.' },
            { title: 'Handy und Küche', how: 'Handybildschirm aufnehmen, dann Cut in die Küche. Voiceover selbst sprechen oder per KI-Stimme.', beats: ['Der Shuffle bleibt stehen', 'Nice: die Mahlzeit von heute', 'Cut zum Kochen: selbst oder mit dem KI-Video-Tool (Creation)', 'Der fertige Teller'] },
            { title: 'Mukbang und CTA', how: 'Zurück vor die Kamera: essen, reden oder einfach genießen, von 1 bis 10 bewerten, dann das Handy mit \u201eKommentiere Rezept\u201c.' }
          ],
          caption: 'Tag [X] \u00b7 mein Ziel: [Ziel] Kilo weniger in [Zeitraum]. Heute: [Mahlzeit]. Kommentiere \u201eRezept\u201c für das E-Book mit den Rezepten aus dem Shuffle. #werbung #lowispike #insulinfreundlich #abnehmen'
        },
        es: {
          keyword: 'receta',
          blurb: 'Grabas tu camino con la app: tu propia meta, la mezcla, cocinar, comer y puntuar. La gente comenta \u201creceta\u201d para el e-book.',
          onScreen: 'Día [X] \u00b7 [Meta] kilos menos en [Tiempo]',
          vars: { day: '[X]', kg: '[Meta]', time: '[Tiempo]', food: '[Comida]', rating: '[Nota]', keyword: 'receta' },
          scenes: [
            { shot: 'talk', label: 'Apertura \u00b7 A cámara, la mezcla corre en el móvil', lines: ['Día [X]: perder [Meta] kilos en [Tiempo].'], note: 'Tu propia meta: los kilos y el tiempo los eliges tú, en días o en meses, por ejemplo 10 kilos en 90 días o en 3 meses. Mientras lo dices, pon Mezclar comida en la app. Nunca prometas una cifra a quien te ve.' },
            { shot: 'screen', label: 'POV móvil \u00b7 La mezcla se para', lines: ['Y para.'] },
            { shot: 'screen', label: 'POV móvil \u00b7 La comida de hoy', lines: ['¡Genial! La comida de hoy, amigable con la insulina, es [Comida].'] },
            { shot: 'cook', label: 'Corte a cocinar \u00b7 tú o con nuestra herramienta de vídeo con IA', lines: ['A cocinar.'], note: 'Cocina tú y graba clips, o usa nuestra herramienta de vídeo con IA en la pestaña Creation para mostrar cómo se cocina.' },
            { shot: 'talk', label: 'Corte al mukbang \u00b7 comer y puntuar', lines: ['A probarlo.', 'Un [Nota] de 10.'], note: 'Come a cámara y habla de lo que quieras, o de nada. Al final, puntúa la comida.' },
            { shot: 'outro', label: 'Cierre \u00b7 CTA, el móvil muestra \u201cComenta receta\u201d', lines: ['Si quieres el e-book con las recetas de la mezcla, comenta \u201creceta\u201d.'], note: 'Un vídeo al día: tu serie enseña cuánto adelgazas por el camino.' }
          ],
          shots: [
            { title: 'Apertura', how: 'A cámara. Sostén el móvil frente a la cámara mientras corre la mezcla, título arriba.' },
            { title: 'Móvil y cocina', how: 'Graba la pantalla del móvil y luego corta a la cocina. Pon la voz tú o con una voz de IA.', beats: ['La mezcla se para', '¡Genial!: la comida de hoy', 'Corte a cocinar: tú o con nuestra herramienta de vídeo con IA (Creation)', 'El plato terminado'] },
            { title: 'Mukbang y cierre', how: 'Vuelve a cámara: come, habla o simplemente disfruta, pon nota del 1 al 10 y luego el móvil con \u201cComenta receta\u201d.' }
          ],
          caption: 'Día [X] \u00b7 mi meta: [Meta] kilos menos en [Tiempo]. Hoy: [Comida]. Comenta \u201creceta\u201d para el e-book con las recetas de la mezcla. #publicidad #lowispike #amigableconlainsulina #adelgazar'
        }
      }
    }

  };
  const ORDER = ['webdesign', 'ugc', 'lowispike'];
  /* LOWiSPIKE carries its own copy per language (langs.en/de/es). Its top level mirrors the German copy, like the other two
     series, so callers that read SERIES[id].scenes / .shots / .caption keep working. */
  (function () { const L = SERIES.lowispike, LD = L.langs.de; L.blurb = LD.blurb; L.onScreen = LD.onScreen; L.scenes = LD.scenes; L.shots = LD.shots; L.caption = LD.caption; L.vars = LD.vars; L.keyword = LD.keyword; })();
  function langsOf(id) { const s = SERIES[id]; return s && s.langs ? LANGS.filter(l => s.langs[l]) : LANGS.slice(); }
  function copyOf(id, lang) { const s = SERIES[id]; if (!s) return null; return s.langs ? (s.langs[normLang(lang)] || s.langs.de) : (series(lang)[id]); }
  /* Swap the plug-in variables into a text: { day: 7, food: 'Lachs', rating: 8, spike: 'Low spike' }. Unknown ones stay bracketed. */
  function fill(text, vars, values) {
    let x = String(text);
    if (vars && values) for (const k of Object.keys(vars)) if (values[k] != null && values[k] !== '' && /^\[[^\]]+\]$/.test(vars[k])) x = x.split(vars[k]).join(String(values[k]));
    return x;
  }
  /* The follow line for a given day: a different one each day, back to the first after day 20. */
  function followLine(id, lang, day) {
    const c = copyOf(id, lang); if (!c || !c.follow) return '';
    const i = (Math.max(1, Math.floor(Number(day) || 1)) - 1) % c.follow.length;
    return c.followLead + c.follow[i];
  }

  /* English and Spanish versions of both series: same shell, same keyword (the comment trigger stays "Webdesign" / "Sponsor"). */
  const SCRIPTS = {
    en: {
      webdesign: {
        blurb: 'ChatGPT finds clients, builds their new website and pitches it by email.',
        onScreen: 'Day [X] on the way to \u20ac30,000 a month with websites',
        scenes: [
          ['Opening \u00b7 talking head, iPad shows the product', ['Day [X] of my challenge to make \u20ac30,000 with websites this month.']],
          ['POV laptop \u00b7 pick an industry', ['[Industry]. Okay. Let\u2019s go.'], 'Optional: let a random generator or ChatGPT pick the industry, or skip this scene.'],
          ['POV laptop \u00b7 lead skill', ['First I turn on my lead skill. It automatically finds [Industry] businesses near me and spots the ones where a new website would really pay off.']],
          ['POV laptop \u00b7 website skill', ['Then I take my second ChatGPT skill and have it build a completely new website right away.']],
          ['POV laptop \u00b7 result', ['And this is the result.']],
          ['POV laptop \u00b7 proposal skill', ['But of course I don\u2019t just send the owner some random link.', 'For that I have my proposal skill. It takes the business, the new website and my offer and automatically turns them into an animated presentation that pitches the website.']],
          ['POV laptop \u00b7 email', ['And now the whole thing goes to the owner by email.']],
          ['Outro \u00b7 talking head + iPad', ['Do you think I\u2019ll land this client?', 'Comment \u201cWebdesign\u201d if you want my complete ChatGPT workflows and skills too.']]
        ],
        shots: [
          ['Opening', 'Talking head. Hold the iPad with the product page up to the camera and add the text at the top.'],
          ['POV laptop, one continuous take', 'Record the screen, then speak the voiceover yourself or use an AI voice.', ['Show the industry (optional)', 'Lead skill in ChatGPT, list of matches', 'Website skill builds the site', 'Scroll through the finished website', 'Proposal skill: animated presentation', 'Email to the owner, address blurred']],
          ['Outro', 'Back to the talking head, the iPad shows \u201cComment WEBDESIGN\u201d.']
        ],
        caption: 'Day [X] on the way to \u20ac30,000 a month with websites. Comment \u201cWebdesign\u201d for my workflows and skills. #ad #ai #chatgpt #webdesign'
      },
      ugc: {
        blurb: 'ChatGPT emails brands and negotiates UGC deals for you.',
        onScreen: 'Day [X] on the way to \u20ac30,000 a month with UGC',
        scenes: [
          ['Opening \u00b7 talking head, iPad shows the product photo', ['Today ChatGPT used my agency skill to email [Number] potential sponsors again. One of them is the brand behind this [Product].']],
          ['POV laptop \u00b7 sponsor search', ['[Brand]. My agent found the brand because the product fits my everyday life.']],
          ['POV laptop \u00b7 sent email', ['It offers them a video: [Video idea]. [Price] euros for the finished clip.']],
          ['POV laptop \u00b7 learning', ['Remember: don\u2019t just pitch a product. Show the brand which problem you solve with it in the video.']],
          ['POV laptop \u00b7 agency PDF', ['The pricing, my stop-loss and the negotiation rules come from my agency skill. This PDF gives ChatGPT the process for research, emails and negotiations.']],
          ['POV laptop \u00b7 outreach overview', ['This keeps running in the background. When there\u2019s a money offer, I step in. And for UGC I don\u2019t need a big community: the brand pays for my video.']],
          ['Outro \u00b7 talking head + iPad', ['Follow me to find out on day 30 how much money I actually made and whether I hit 30K.', 'Comment \u201cSponsor\u201d for my agency skill.']]
        ],
        shots: [
          ['Opening', 'Talking head. Hold the iPad with the brand\u2019s product photo up to the camera and add the text at the top.'],
          ['POV laptop, one continuous take', 'Record the screen, then speak the voiceover yourself or use an AI voice.', ['Sponsor search in ChatGPT', 'The brand\u2019s product page', 'Sent email, highlight the price', 'Agency PDF and pricing rules', 'Outreach overview, addresses blurred']],
          ['Outro', 'Back to the talking head, the iPad shows \u201cComment SPONSOR\u201d.']
        ],
        caption: 'Day [X] on the way to \u20ac30,000 a month with UGC. Comment \u201cSponsor\u201d for my agency skill. #ad #ai #chatgpt #ugc'
      }
    },
    es: {
      webdesign: {
        blurb: 'ChatGPT encuentra clientes, les crea su web nueva y se la presenta por email.',
        onScreen: 'D\u00eda [X] camino a 30.000\u00a0\u20ac al mes con webs',
        scenes: [
          ['Apertura \u00b7 a c\u00e1mara, el iPad muestra el producto', ['D\u00eda [X] de mi reto de ganar 30.000 euros este mes con p\u00e1ginas web.']],
          ['POV port\u00e1til \u00b7 elegir sector', ['[Sector]. Vale. Vamos all\u00e1.'], 'Opcional: deja que un generador aleatorio o ChatGPT elija el sector, o quita esta escena.'],
          ['POV port\u00e1til \u00b7 skill de leads', ['Primero activo mi skill de leads. Me busca autom\u00e1ticamente negocios de [Sector] cerca de m\u00ed y encuentra los que de verdad sacar\u00edan partido a una web nueva.']],
          ['POV port\u00e1til \u00b7 skill de webs', ['Despu\u00e9s uso mi segundo skill de ChatGPT y le pido que construya directamente una web completamente nueva.']],
          ['POV port\u00e1til \u00b7 resultado', ['Y este es el resultado.']],
          ['POV port\u00e1til \u00b7 skill de propuestas', ['Pero claro, al due\u00f1o no le mando un enlace cualquiera.', 'Para eso tengo mi skill de propuestas. Toma el negocio, la web nueva y mi oferta, y crea autom\u00e1ticamente una presentaci\u00f3n animada con la que vendo la web.']],
          ['POV port\u00e1til \u00b7 email', ['Y ahora todo esto le llega al due\u00f1o por email.']],
          ['Cierre \u00b7 a c\u00e1mara + iPad', ['\u00bfCre\u00e9is que consigo al cliente?', 'Comentad \u201cWebdesign\u201d si tambi\u00e9n quer\u00e9is mis workflows y skills de ChatGPT completos.']]
        ],
        shots: [
          ['Apertura', 'A c\u00e1mara. Ense\u00f1a el iPad con la p\u00e1gina del producto y pon el texto arriba.'],
          ['POV port\u00e1til, una sola toma', 'Graba la pantalla y pon la voz t\u00fa o con una voz de IA.', ['Mostrar el sector (opcional)', 'Skill de leads en ChatGPT, lista de resultados', 'El skill de webs construye la p\u00e1gina', 'Recorrer la web terminada', 'Skill de propuestas: presentaci\u00f3n animada', 'Email al due\u00f1o, direcci\u00f3n difuminada']],
          ['Cierre', 'Vuelve a c\u00e1mara, el iPad muestra \u201cComenta WEBDESIGN\u201d.']
        ],
        caption: 'D\u00eda [X] camino a 30.000\u00a0\u20ac al mes con webs. Comenta \u201cWebdesign\u201d para tener mis workflows y skills. #publicidad #ia #chatgpt #webdesign'
      },
      ugc: {
        blurb: 'ChatGPT escribe a marcas y negocia acuerdos UGC por ti.',
        onScreen: 'D\u00eda [X] camino a 30.000\u00a0\u20ac al mes con UGC',
        scenes: [
          ['Apertura \u00b7 a c\u00e1mara, el iPad muestra la foto del producto', ['Hoy ChatGPT ha vuelto a escribir con mi skill de agencia a [N\u00famero] posibles patrocinadores. Entre ellos, la marca de este [Producto].']],
          ['POV port\u00e1til \u00b7 b\u00fasqueda de patrocinadores', ['[Marca]. Mi agente encontr\u00f3 la marca porque el producto encaja con mi d\u00eda a d\u00eda.']],
          ['POV port\u00e1til \u00b7 email enviado', ['Les ofrece un v\u00eddeo: [Idea del v\u00eddeo]. [Precio] euros por el clip terminado.']],
          ['POV port\u00e1til \u00b7 aprendizaje', ['Recordad: no vend\u00e1is solo un producto. Ense\u00f1ad a la marca qu\u00e9 problema resolv\u00e9is con \u00e9l en el v\u00eddeo.']],
          ['POV port\u00e1til \u00b7 PDF de agencia', ['El c\u00e1lculo de precios, mi stop-loss y las reglas de negociaci\u00f3n salen de mi skill de agencia. Este PDF le da a ChatGPT el proceso para investigar, escribir emails y negociar.']],
          ['POV port\u00e1til \u00b7 resumen de env\u00edos', ['Esto sigue funcionando en segundo plano. Cuando hay ofertas de dinero, entro yo. Y para UGC no necesito una gran comunidad: la marca paga por mi v\u00eddeo.']],
          ['Cierre \u00b7 a c\u00e1mara + iPad', ['Seguidme para descubrir el d\u00eda 30 cu\u00e1nto dinero he ganado de verdad y si he llegado a los 30K.', 'Comentad \u201cSponsor\u201d para tener mi skill de agencia.']]
        ],
        shots: [
          ['Apertura', 'A c\u00e1mara. Ense\u00f1a el iPad con la foto del producto de la marca y pon el texto arriba.'],
          ['POV port\u00e1til, una sola toma', 'Graba la pantalla y pon la voz t\u00fa o con una voz de IA.', ['B\u00fasqueda de patrocinadores en ChatGPT', 'P\u00e1gina del producto de la marca', 'Email enviado, resalta el precio', 'PDF de agencia y reglas de precios', 'Resumen de env\u00edos, direcciones difuminadas']],
          ['Cierre', 'Vuelve a c\u00e1mara, el iPad muestra \u201cComenta SPONSOR\u201d.']
        ],
        caption: 'D\u00eda [X] camino a 30.000\u00a0\u20ac al mes con UGC. Comenta \u201cSponsor\u201d para tener mi skill de agencia. #publicidad #ia #chatgpt #ugc'
      }
    }
  };
  /* The series in one language: German is SERIES itself; English and Spanish swap every text, keep id, product, price, keyword, shot types. */
  function series(lang) {
    const L = SCRIPTS[normLang(lang)];
    if (!L) return SERIES; /* German: SERIES itself (LOWiSPIKE's top level is its German copy) */
    const out = {};
    for (const id of ORDER) {
      const d = SERIES[id], x = L[id];
      if (d.langs) { out[id] = Object.assign({}, d, d.langs[normLang(lang)] || d.langs.de); continue; }
      out[id] = Object.assign({}, d, {
        blurb: x.blurb, onScreen: x.onScreen, caption: x.caption,
        scenes: d.scenes.map((sc, i) => { const r = { shot: sc.shot, label: x.scenes[i][0], lines: x.scenes[i][1].slice() }; if (x.scenes[i][2]) r.note = x.scenes[i][2]; return r; }),
        shots: d.shots.map((sh, i) => { const r = { title: x.shots[i][0], how: x.shots[i][1] }; if (x.shots[i][2]) r.beats = x.shots[i][2].slice(); return r; })
      });
    }
    return out;
  }

  /* ---------- Every visible word of the page, in English, German and Spanish ---------- */
  const STRINGS = {
    docTitle: ['Affiliates \u00b7 Video template \u00b7 LOWiSPIKE', 'Affiliates \u00b7 Video-Template \u00b7 LOWiSPIKE', 'Afiliados \u00b7 Plantilla de v\u00eddeo \u00b7 LOWiSPIKE'],
    metaDesc: ['Pick Webdesign or UGC and get the ready video script. Plus what you earn per sale and how you level up.', 'W\u00e4hle Webdesign oder UGC und hol dir das fertige Video-Skript. Dazu siehst du, was du pro Verkauf verdienst und wie du im Level aufsteigst.', 'Elige Webdesign o UGC y consigue el guion de v\u00eddeo listo. Adem\u00e1s, lo que ganas por venta y c\u00f3mo subes de nivel.'],
    noscript: ['This page needs JavaScript.', 'Diese Seite braucht JavaScript.', 'Esta p\u00e1gina necesita JavaScript.'],
    pickSeries: ['Choose a series', 'Serie w\u00e4hlen', 'Elige una serie'],
    earnAria: ['What you earn', 'Was du verdienst', 'Lo que ganas'],
    pill: ['Free \u00b7 about three minutes', 'Kostenlos \u00b7 etwa drei Minuten', 'Gratis \u00b7 unos tres minutos'],
    startTitle: ['Let\u2019s build your video.', 'Lass uns dein Video bauen.', 'Vamos a crear tu v\u00eddeo.'],
    startLead: ['Get the script, record, earn.', 'Skript holen, aufnehmen, verdienen.', 'Coge el guion, graba, gana.'],
    rowScript: ['Your script', 'Dein Skript', 'Tu guion'],
    rowScriptSub: ['Every scene ready to copy.', 'Jede Szene fertig zum Kopieren.', 'Cada escena lista para copiar.'],
    rowShots: ['Recording & caption', 'Aufnahme & Caption', 'Grabaci\u00f3n y caption'],
    rowShotsSub: ['Shot list and caption.', 'Shotliste und Caption.', 'Lista de tomas y caption.'],
    rowEarn: ['What you earn', 'Dein Verdienst', 'Lo que ganas'],
    rowEarnSub: ['Up to {pct} per sale.', 'Bis zu {pct} pro Verkauf.', 'Hasta un {pct} por venta.'],
    start: ['Start', 'Start', 'Empezar'],
    linkLine: ['You get your personal affiliate link straight from Eman on WhatsApp.', 'Deinen pers\u00f6nlichen Affiliate-Link bekommst du direkt von Eman per WhatsApp.', 'Tu enlace de afiliado personal te lo da Eman directamente por WhatsApp.'],
    back: ['Back', 'Zur\u00fcck', 'Atr\u00e1s'],
    step1: ['Step 1 of 3', 'Schritt 1 von 3', 'Paso 1 de 3'],
    scriptTitle: ['Your script.', 'Dein Skript.', 'Tu guion.'],
    scriptLead: ['{title} \u00b7 {product}. Swap the square brackets for your own details, for example {ph}.', '{title} \u00b7 {product}. Eckige Klammern tauschst du gegen deine eigenen Angaben, zum Beispiel {ph}.', '{title} \u00b7 {product}. Cambia los corchetes por tus propios datos, por ejemplo {ph}.'],
    or: [' or ', ' oder ', ' o '],
    onScreen: ['On-screen text', 'Text auf dem Bildschirm', 'Texto en pantalla'],
    copyScript: ['Copy script', 'Skript kopieren', 'Copiar guion'],
    scriptCopied: ['Script copied.', 'Skript kopiert.', 'Guion copiado.'],
    toShots: ['Next: recording ', 'Weiter: Aufnahme ', 'Siguiente: grabaci\u00f3n '],
    step2: ['Step 2 of 3', 'Schritt 2 von 3', 'Paso 2 de 3'],
    shotsTitle: ['How to record it.', 'So nimmst du es auf.', 'As\u00ed lo grabas.'],
    shotsLead: ['{title} \u00b7 three shots, one continuous take.', '{title} \u00b7 drei Einstellungen, eine Aufnahme am St\u00fcck.', '{title} \u00b7 tres planos, una sola toma.'],
    shotsNote: ['You don\u2019t have to switch between iPad and laptop: iPad only in the opening and the outro, laptop the whole time in between.', 'Du musst nicht zwischen iPad und Laptop wechseln: iPad nur im Opening und im Outro, dazwischen durchgehend der Laptop.', 'No tienes que cambiar entre iPad y port\u00e1til: el iPad solo en la apertura y el cierre, y en medio todo el rato el port\u00e1til.'],
    caption: ['Caption', 'Caption', 'Caption'],
    copyCaption: ['Copy caption', 'Caption kopieren', 'Copiar caption'],
    captionCopied: ['Caption copied.', 'Caption kopiert.', 'Caption copiado.'],
    tipB: ['This is your template.', 'Das ist dein Template.', 'Esta es tu plantilla.'],
    tip: [' Bring your own personality: whoever comes across better on camera sells more. Record it yourself or use an AI avatar like HeyGen or Higgsfield. The template is free.', ' Bring deine eigene Pers\u00f6nlichkeit rein: Wer sich vor der Kamera besser pr\u00e4sentiert, verkauft mehr. Nimm es selbst auf oder nutze einen KI-Avatar wie HeyGen oder Higgsfield. Das Template ist kostenlos.', ' Pon tu propia personalidad: quien se presenta mejor ante la c\u00e1mara vende m\u00e1s. Gr\u00e1balo t\u00fa o usa un avatar de IA como HeyGen o Higgsfield. La plantilla es gratis.'],
    toEarn: ['Next: what you earn ', 'Weiter: Dein Verdienst ', 'Siguiente: lo que ganas '],
    step3: ['Step 3 of 3', 'Schritt 3 von 3', 'Paso 3 de 3'],
    earnTitle: ['What you earn.', 'Was du verdienst.', 'Lo que ganas.'],
    earnLead: ['You get your share of every sale ({price}). The more sales, the higher your level. Each sale counts at the rate of its level.', 'Pro Verkauf ({price}) bekommst du deinen Anteil. Je mehr Verk\u00e4ufe, desto h\u00f6her dein Level. Jeder Verkauf z\u00e4hlt mit dem Prozentsatz seines Levels.', 'Recibes tu parte de cada venta ({price}). Cuantas m\u00e1s ventas, m\u00e1s alto tu nivel. Cada venta cuenta con el porcentaje de su nivel.'],
    thLevel: ['Level', 'Level', 'Nivel'],
    thSales: ['Sales', 'Verk\u00e4ufe', 'Ventas'],
    thRate: ['Commission', 'Provision', 'Comisi\u00f3n'],
    thPer: ['Per sale', 'Pro Verkauf', 'Por venta'],
    levelWord: ['Level ', 'Level ', 'Nivel '],
    examples: ['Examples', 'Beispiele', 'Ejemplos'],
    salesN: ['{n} sales', '{n} Verk\u00e4ufe', '{n} ventas'],
    from: ['from {n}', 'ab {n}', 'desde {n}'],
    done: ['Done', 'Fertig', 'Listo'],
    terms: ['Terms from the partner dashboard as of 21 Oct 2026, at {price} per sale. The examples are totals across all sales. The \u20ac30,000 in the script is the challenge goal, not a promised result.', 'Konditionen laut Partner-Dashboard, Stand 21.10.2026, bei {price} pro Verkauf. Die Beispiele sind Summen \u00fcber alle Verk\u00e4ufe. Die 30.000\u00a0\u20ac im Skript sind das Ziel der Challenge, kein versprochenes Ergebnis.', 'Condiciones seg\u00fan el panel de socios, a 21/10/2026, con {price} por venta. Los ejemplos son totales de todas las ventas. Los 30.000\u00a0\u20ac del guion son el objetivo del reto, no un resultado prometido.'],
    copyFail: ['Copying didn\u2019t work. Press and hold the text to copy it by hand.', 'Kopieren ging nicht. Halte den Text gedr\u00fcckt und kopiere ihn von Hand.', 'No se pudo copiar. Mant\u00e9n pulsado el texto para copiarlo a mano.'],
    share: ['Share this page', 'Diese Seite teilen', 'Compartir esta p\u00e1gina'],
    shareText: ['{title} video template from LOWiSPIKE: ready script, shot list and what you earn per sale.', '{title}-Video-Template von LOWiSPIKE: fertiges Skript, Shotliste und was du pro Verkauf verdienst.', 'Plantilla de v\u00eddeo {title} de LOWiSPIKE: guion listo, lista de tomas y lo que ganas por venta.'],
    linkCopied: ['Link copied.', 'Link kopiert.', 'Enlace copiado.'],
    /* Buy-to-unlock (21 Oct 2026): scene 1 is a free preview, the rest opens with the product or an invite code. */
    preview: ['Free preview: scene 1', 'Gratis-Vorschau: Szene 1', 'Vista previa gratis: escena 1'],
    lockedScene: ['Locked: unlock this track to see it.', 'Gesperrt: schalte diesen Track frei, um sie zu sehen.', 'Bloqueada: desbloquea este track para verla.'],
    gateTitle: ['Unlock {title}', '{title} freischalten', 'Desbloquear {title}'],
    gateLead: ['You get the full script, the shot list and the caption once you own the product or have an invite code.', 'Das ganze Skript, die Shotliste und die Caption bekommst du, sobald du das Produkt hast oder einen Einladungscode.', 'Recibes el guion completo, la lista de tomas y el caption cuando tienes el producto o un código de invitación.'],
    buyFor: ['Get {product} for {price}', '{product} holen für {price}', 'Conseguir {product} por {price}'],
    buyAsk: ['Ask Eman on WhatsApp for the buy link.', 'Den Kauflink bekommst du von Eman über WhatsApp.', 'Pídele a Eman el enlace de compra por WhatsApp.'],
    afterBuy: ['After buying you get your unlock code with the purchase. Type it in here.', 'Nach dem Kauf bekommst du deinen Freischaltcode mit der Bestellung. Gib ihn hier ein.', 'Tras la compra recibes tu código con el pedido. Escríbelo aquí.'],
    codeLabel: ['Unlock or invite code', 'Freischalt- oder Einladungscode', 'Código de desbloqueo o invitación'],
    unlockBtn: ['Unlock', 'Freischalten', 'Desbloquear'],
    checking: ['Checking…', 'Prüfe…', 'Comprobando…'],
    codeWrong: ['That code doesn’t work. Check the spelling, or ask Eman for a new one.', 'Dieser Code passt nicht. Prüf die Schreibweise oder frag Eman nach einem neuen.', 'Ese código no funciona. Revisa cómo lo escribiste o pídele uno nuevo a Eman.'],
    codeOther: ['That code is for {title}. It’s unlocked now; this track still needs its own code.', 'Dieser Code ist für {title}. Der ist jetzt frei; dieser Track braucht seinen eigenen Code.', 'Ese código es para {title}. Ya está desbloqueado; este track necesita su propio código.'],
    checkFail: ['Couldn’t check the code on this device. Try again in another browser.', 'Der Code ließ sich auf diesem Gerät nicht prüfen. Versuch es in einem anderen Browser.', 'No se pudo comprobar el código en este dispositivo. Prueba en otro navegador.'],
    unlocked: ['Unlocked. The whole track is yours.', 'Freigeschaltet. Der ganze Track gehört dir.', 'Desbloqueado. Todo el track es tuyo.'],
    /* Recruit levels: people you bring in lift your commission level faster. */
    recruitTitle: ['Level up faster with recruits', 'Schneller aufsteigen mit Recruits', 'Sube más rápido con reclutas'],
    recruitRule: ['Someone who joins through your link and both buys a product and publishes a video counts as an active recruit. Each active recruit counts like {n} sales toward your level, and every {k} active recruits lift you one more level.', 'Wer über deinen Link einsteigt, ein Produkt kauft und ein Video veröffentlicht, zählt als aktiver Recruit. Jeder aktive Recruit zählt wie {n} Verkäufe für dein Level, und je {k} aktive Recruits bringen dich ein Level höher.', 'Quien entra por tu enlace, compra un producto y publica un vídeo cuenta como recluta activo. Cada recluta activo cuenta como {n} ventas para tu nivel, y cada {k} reclutas activos te suben un nivel más.'],
    recruitYou: ['You have {n} active recruits. That alone puts you on level {level} ({rate}), and every sale of your own adds on top.', 'Du hast {n} aktive Recruits. Das allein bringt dich auf Level {level} ({rate}), und jeder eigene Verkauf kommt obendrauf.', 'Tienes {n} reclutas activos. Solo con eso est\u00e1s en el nivel {level} ({rate}), y cada venta propia suma encima.'],
    recruitEx: ['Example: 3 active recruits count like {n} sales, which is level {base}, plus one level for the 3 recruits: that\u2019s level {level} ({rate}) before your own first sale.', 'Beispiel: 3 aktive Recruits zählen wie {n} Verkäufe, also Level {base}, plus ein Level für die 3 Recruits: Level {level} ({rate}) noch vor deinem ersten eigenen Verkauf.', 'Ejemplo: 3 reclutas activos cuentan como {n} ventas, o sea nivel {base}, más un nivel por los 3 reclutas: nivel {level} ({rate}) antes de tu primera venta propia.'],
    recruitHow: ['Share any page with the share button: your link is in it. Eman checks the buys and videos and counts your recruits.', 'Teile eine Seite mit dem Teilen-Knopf: dein Link steckt darin. Eman prüft Käufe und Videos und zählt deine Recruits.', 'Comparte cualquier página con el botón de compartir: tu enlace va dentro. Eman revisa compras y vídeos y cuenta tus reclutas.'],
    /* Third track: LOWiSPIKE, the 30-day shuffle challenge (21 Oct 2026). */
    followHead: ['Follow line (a different one each day, before the comment line):', 'Folge-Zeile (jeden Tag eine andere, vor dem Kommentar-Satz):', 'Frase de seguir (una distinta cada d\u00eda, antes de la frase del comentario):'],
    outroHead: ['Outro for day 30:', 'Outro f\u00fcr Tag 30:', 'Cierre del d\u00eda 30:'],
    dayOf: ['Day {n} of 30', 'Tag {n} von 30', 'D\u00eda {n} de 30'],
    dayPrev: ['Previous day', 'Tag davor', 'D\u00eda anterior'],
    dayNext: ['Next day', 'N\u00e4chster Tag', 'D\u00eda siguiente'],
    followToday: ['Today\u2019s follow line:', 'Folge-Zeile f\u00fcr heute:', 'Frase de seguir de hoy:'],
    freeTrack: ['Your viewers get the app and the shuffle for free. Only one thing is sold: Eman\u2019s e-book. You earn when people who join through your link use the app and upgrade.', 'App und Shuffle sind f\u00fcr deine Zuschauer gratis. Verkauft wird nur eins: Emans E-Book. Du verdienst mit, wenn Leute \u00fcber deinen Link die App nutzen und upgraden.', 'La app y la mezcla son gratis para quien te ve. Solo se vende una cosa: el e-book de Eman. Ganas cuando quien entra por tu enlace usa la app y hace el upgrade.']
  };
  function t(lang, key, vars) {
    const i = Math.max(0, LANGS.indexOf(normLang(lang)));
    let s = (STRINGS[key] || [key])[i]; if (s == null) s = STRINGS[key][0];
    for (const k in vars || {}) s = s.split('{' + k + '}').join(String(vars[k]));
    return s;
  }

  /* ---------- Share link: exactly the open track, in the open language, credited to the sharer ----------
     Own id: an affiliate opens their personal page link with ?aff=<id> (the partner dashboard's affiliate link id works too); the page keeps it.
     A visitor who arrives through a shared link (?ref=<id>) is remembered as referred by that id (first one wins) and
     never becomes that affiliate themselves, so passing a link on cannot steal someone else's credit. */
  function cleanId(v) { v = String(v == null ? '' : v).trim(); return /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : ''; }
  function shareUrl(o) {
    o = o || {};
    const base = String(o.base || 'https://therealetm.github.io/lowispike/affiliates/').split('#')[0].split('?')[0];
    const q = [];
    if (SERIES[o.track]) q.push('track=' + o.track);
    if (normLang(o.lang)) q.push('lang=' + normLang(o.lang));
    const ref = cleanId(o.ref); if (ref) q.push('ref=' + encodeURIComponent(ref));
    const view = o.view === 'script' || o.view === 'shots' || o.view === 'earn' ? o.view : '';
    return base + (q.length ? '?' + q.join('&') : '') + (view && SERIES[o.track] ? '#' + o.track + (view === 'script' ? '' : '/' + view) : '');
  }

  /* Copy-ready script: on-screen title, then each scene with its shot and spoken lines. */
  function scriptText(id, lang, values) {
    const s = series(lang)[id];
    if (!s) return '';
    const lg = normLang(lang) || 'de';
    const out = [t(lg, 'onScreen') + ': ' + s.onScreen, ''];
    for (const x of s.scenes) { out.push('[' + x.label + ']'); out.push(x.lines.join(' ')); if (x.note) out.push('(' + x.note + ')'); out.push(''); }
    /* LOWiSPIKE adds the 20 follow lines (one per day) and the day-30 outro. */
    if (s.follow) {
      out.push(t(lg, 'followHead'));
      s.follow.forEach((f, i) => out.push((i + 1) + '. ' + s.followLead + f));
      out.push(''); out.push(t(lg, 'outroHead')); out.push(s.outro30);
    }
    return fill(out.join('\n').trim(), s.vars, values);
  }
  /* The bracketed placeholders a series uses, in order of first appearance. */
  function placeholders(id, lang) {
    const s = series(lang)[id]; if (!s) return [];
    const all = (s.onScreen + ' ' + s.scenes.map(x => x.lines.join(' ')).join(' ') + ' ' + s.caption).match(/\[[^\]]+\]/g) || [];
    return all.filter((p, i) => all.indexOf(p) === i);
  }

  /* ---------- Commission levels (from Eman's partner dashboard, 21 Oct 2026) ----------
     Each sale pays the rate of the level it falls in: sales 1-10 pay 10 %, the 11th to 50th 15 %, and so on. */
  const TIERS = [{ from: 1, to: 10, rate: 0.10 }, { from: 11, to: 50, rate: 0.15 }, { from: 51, to: 150, rate: 0.25 }, { from: 151, to: Infinity, rate: 0.45 }];
  function rateFor(nth) { return (TIERS.find(t => nth >= t.from && nth <= t.to) || TIERS[TIERS.length - 1]).rate; }
  function perSale(rate, price) { return Math.round((price == null ? PRICE : price) * rate * 100) / 100; }
  function totalFor(sales, price) {
    let sum = 0;
    for (let i = 1; i <= Math.max(0, Math.floor(sales)); i++) sum += perSale(rateFor(i), price);
    return Math.round(sum * 100) / 100;
  }
  function levels(price, lang) {
    lang = lang || 'de';
    return TIERS.map((x, i) => ({ level: i + 1, range: x.to === Infinity ? t(lang, 'from', { n: x.from }) : x.from + '\u2013' + x.to, rate: x.rate, pct: pct(x.rate, lang), perSale: perSale(x.rate, price) }));
  }
  const EXAMPLES = [10, 50, 150, 200];
  function examples(price) { return EXAMPLES.map(n => ({ sales: n, total: totalFor(n, price), level: TIERS.findIndex(t => n >= t.from && n <= t.to) + 1 })); }

  return { VERSION, PRICE, SERIES, ORDER, LANGS, STRINGS, normLang, pickLang, series, t, cleanId, shareUrl, langsOf, copyOf, fill, followLine, TIERS, EXAMPLES, eur, pct, scriptText, placeholders, rateFor, perSale, totalFor, levels, examples };
});
