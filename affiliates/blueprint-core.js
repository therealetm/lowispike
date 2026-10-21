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

  function eur(v) { const n = Math.round(Number(v) * 100) / 100; return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '\u00a0\u20ac'; }
  function pct(rate) { return String(Math.round(rate * 1000) / 10).replace('.', ',') + '\u00a0%'; }

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

  /* Copy-ready script: on-screen title, then each scene with its shot and spoken lines. */
  function scriptText(id) {
    const s = SERIES[id];
    if (!s) return '';
    const out = ['Text auf dem Bildschirm: ' + s.onScreen, ''];
    for (const x of s.scenes) { out.push('[' + x.label + ']'); out.push(x.lines.join(' ')); if (x.note) out.push('(' + x.note + ')'); out.push(''); }
    return out.join('\n').trim();
  }
  /* The bracketed placeholders a series uses, in order of first appearance. */
  function placeholders(id) {
    const s = SERIES[id]; if (!s) return [];
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
  function levels(price) {
    return TIERS.map((t, i) => ({ level: i + 1, range: t.to === Infinity ? 'ab ' + t.from : t.from + '\u2013' + t.to, rate: t.rate, pct: pct(t.rate), perSale: perSale(t.rate, price) }));
  }
  const EXAMPLES = [10, 50, 150, 200];
  function examples(price) { return EXAMPLES.map(n => ({ sales: n, total: totalFor(n, price), level: TIERS.findIndex(t => n >= t.from && n <= t.to) + 1 })); }

  return { VERSION, PRICE, SERIES, ORDER, TIERS, EXAMPLES, eur, pct, scriptText, placeholders, rateFor, perSale, totalFor, levels, examples };
});
