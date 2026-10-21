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
  };
  const ORDER = ['webdesign', 'ugc'];

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
    if (!L) return SERIES;
    const out = {};
    for (const id of ORDER) {
      const d = SERIES[id], x = L[id];
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
    linkCopied: ['Link copied.', 'Link kopiert.', 'Enlace copiado.']
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
  function scriptText(id, lang) {
    const s = series(lang)[id];
    if (!s) return '';
    const out = [t(lang || 'de', 'onScreen') + ': ' + s.onScreen, ''];
    for (const x of s.scenes) { out.push('[' + x.label + ']'); out.push(x.lines.join(' ')); if (x.note) out.push('(' + x.note + ')'); out.push(''); }
    return out.join('\n').trim();
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

  return { VERSION, PRICE, SERIES, ORDER, LANGS, STRINGS, normLang, pickLang, series, t, cleanId, shareUrl, TIERS, EXAMPLES, eur, pct, scriptText, placeholders, rateFor, perSale, totalFor, levels, examples };
});
