/* LOWiSPIKE Affiliates · Master Blueprint core (21 Oct 2026). Pure logic, no DOM: products, the shared 30-day challenge series,
   German spoken scripts with spelled-out numbers, the shot list, the Day video checklist, link checks, the funnel and the
   reference commission tiers. Used by affiliates/blueprint.js (the page) and tests/affiliates-blueprint.test.cjs.

   Honesty rules (Emmanuel's brief): one series shell, only the promoted product changes. Every number in a script comes from
   what the affiliate typed for that day; a missing fact stays a visible gap, never an invented figure. Sales the affiliate only
   reports are kept apart from sales they confirmed in their Beacons dashboard, and only confirmed sales count for tiers and
   conversion. The tool cannot see Beacons or TikTok: clicks and sales are typed in by hand and labelled that way. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LowiBlueprint = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VERSION = 1;
  const STORE_KEY = 'lowi.affiliates.v1';
  const CHALLENGE = { goalEur: 30000, days: 30 };
  const GAP = '\u2039FEHLT\u203a'; /* the visible marker for a fact the affiliate has not typed yet */

  /* ---------- German numbers, spelled out for speaking ---------- */
  const ONES = ['null', 'eins', 'zwei', 'drei', 'vier', 'f\u00fcnf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zw\u00f6lf',
    'dreizehn', 'vierzehn', 'f\u00fcnfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
  const TENS = ['', '', 'zwanzig', 'drei\u00dfig', 'vierzig', 'f\u00fcnfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
  function under100(n, tail) { /* tail: true when the word ends the number (eins), false inside it (ein) */
    if (n < 20) return n === 1 ? (tail ? 'eins' : 'ein') : ONES[n];
    const t = Math.floor(n / 10), o = n % 10;
    return o ? (o === 1 ? 'ein' : ONES[o]) + 'und' + TENS[t] : TENS[t];
  }
  function under1000(n, tail) {
    const h = Math.floor(n / 100), r = n % 100;
    return (h ? (h === 1 ? 'ein' : ONES[h]) + 'hundert' : '') + (r ? under100(r, tail) : '');
  }
  function numberWords(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 0 || n > 999999999) return String(n);
    if (n === 0) return 'null';
    const mio = Math.floor(n / 1e6), th = Math.floor((n % 1e6) / 1000), r = n % 1000;
    let s = '';
    if (mio) s += (mio === 1 ? 'eine Million' : under1000(mio, false) + ' Millionen') + (th || r ? ' ' : '');
    if (th) s += under1000(th, false) + 'tausend';
    if (r) s += under1000(r, true);
    return s;
  }
  /* A count with its noun, the way it is said: "einen Sponsor", "zw\u00f6lf Sponsoren", "keinen Sponsor". */
  function countWords(n, one, many, oneArticle) {
    n = Math.floor(Number(n));
    if (n === 1) return (oneArticle || 'einen') + ' ' + one;
    if (n === 0) return 'keine ' + many;
    return numberWords(n) + ' ' + many;
  }
  function euroWords(v) {
    const x = Math.round(Number(v) * 100);
    if (!isFinite(x) || x < 0) return GAP;
    const e = Math.floor(x / 100), c = x % 100;
    return (e === 1 ? 'einen' : numberWords(e)) + ' Euro' + (c ? ' ' + numberWords(c) : '');
  }
  /* Typed numbers: "12", " 12 ", "1.500", "249,50". Returns null for empty or not a number. */
  function parseNum(v, opts) {
    if (v == null) return null;
    let s = String(v).trim().replace(/\s|\u20ac/g, '');
    if (!s) return null;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    if (opts && opts.int && n !== Math.floor(n)) return null;
    if (opts && opts.max != null && n > opts.max) return null;
    return n;
  }
  function eur(v) { const n = Math.round(Number(v) * 100) / 100; return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' \u20ac'; }

  /* ---------- Products: the only thing that changes between series ---------- */
  const SPONSOR_PRODUCT_ID = '6ff76533-65e2-49bf-b1c0-d4d3d08aab88'; /* checked 21 Oct: this Beacons page is "AI Sponsoren-Agent" */
  const PRODUCTS = {
    website: {
      id: 'website', name: 'AI Website Client System', short: 'Website Client System', price: 99, keyword: 'Webdesign',
      beaconsId: null, /* the product address was not public on 21 Oct; the affiliate pastes their own link */
      pitch: 'ChatGPT findet Kunden, baut ihre neue Website und schreibt das Angebot.',
      cta: 'Kommentiert \u201eWebdesign\u201c, dann schicke ich euch meine Workflows und Skills.',
      shuffleLabel: 'Branche des Tages'
    },
    sponsor: {
      id: 'sponsor', name: 'AI Sponsoren-Agent', short: 'Sponsoren-Agent', price: 99, keyword: 'Sponsor',
      beaconsId: SPONSOR_PRODUCT_ID,
      pitch: 'ChatGPT schreibt Marken an und verhandelt UGC-Deals nach der PDF Agency Skill.',
      cta: 'Folgt mir, um herauszufinden, welche Antworten wirklich Geld wert sind, und kommentiert \u201eSponsor\u201c f\u00fcr meinen PDF Agency Skill.',
      shuffleLabel: 'Nische des Tages'
    }
  };

  /* Website series: every line of a day's script uses ONE industry record, so a jeweller day can never mention a hairdresser. */
  const INDUSTRIES = [
    { id: 'friseur', one: 'Friseursalon', many: 'Friseursalons', obj: 'den Friseursalon', idea: 'Online-Terminbuchung', words: ['friseur', 'salon', 'haar', 'barber'] },
    { id: 'juwelier', one: 'Juwelier', many: 'Juweliere', obj: 'den Juwelier', idea: 'Galerie f\u00fcr Ringe und Schmuck', words: ['juwelier', 'schmuck', 'gold', 'trauring'] },
    { id: 'zahnarzt', one: 'Zahnarztpraxis', many: 'Zahnarztpraxen', obj: 'die Zahnarztpraxis', idea: 'Online-Termine f\u00fcr Neupatienten', words: ['zahn', 'dental'] },
    { id: 'baeckerei', one: 'B\u00e4ckerei', many: 'B\u00e4ckereien', obj: 'die B\u00e4ckerei', idea: 'Vorbestellung f\u00fcrs Wochenende', words: ['b\u00e4ck', 'baeck', 'backstube', 'konditor'] },
    { id: 'fitness', one: 'Fitnessstudio', many: 'Fitnessstudios', obj: 'das Fitnessstudio', idea: 'Probetraining zum Buchen', words: ['fitness', 'gym', 'training'] },
    { id: 'physio', one: 'Physiotherapie-Praxis', many: 'Physiotherapie-Praxen', obj: 'die Physiotherapie-Praxis', idea: 'Terminanfrage mit Rezept-Upload', words: ['physio', 'therapie', 'reha'] },
    { id: 'kfz', one: 'Kfz-Werkstatt', many: 'Kfz-Werkst\u00e4tten', obj: 'die Kfz-Werkstatt', idea: 'Werkstatttermin online', words: ['kfz', 'werkstatt', 'auto', 'reifen'] },
    { id: 'restaurant', one: 'Restaurant', many: 'Restaurants', obj: 'das Restaurant', idea: 'Speisekarte und Tischreservierung', words: ['restaurant', 'trattoria', 'pizzeria', 'bistro', 'grill'] },
    { id: 'blumen', one: 'Blumenladen', many: 'Blumenl\u00e4den', obj: 'den Blumenladen', idea: 'Strau\u00df bestellen und abholen', words: ['blume', 'florist'] },
    { id: 'tattoo', one: 'Tattoo-Studio', many: 'Tattoo-Studios', obj: 'das Tattoo-Studio', idea: 'Portfolio und Anfrageformular', words: ['tattoo', 'ink'] },
    { id: 'kosmetik', one: 'Kosmetikstudio', many: 'Kosmetikstudios', obj: 'das Kosmetikstudio', idea: 'Behandlungen mit Preisen', words: ['kosmetik', 'beauty', 'nagel', 'nail', 'lash'] },
    { id: 'fahrschule', one: 'Fahrschule', many: 'Fahrschulen', obj: 'die Fahrschule', idea: 'Online-Anmeldung zum Theorieunterricht', words: ['fahrschule'] },
    { id: 'hundesalon', one: 'Hundesalon', many: 'Hundesalons', obj: 'den Hundesalon', idea: 'Terminbuchung nach Hundegr\u00f6\u00dfe', words: ['hund', 'pfote', 'dog'] }
  ];
  /* Sponsor series: the niche the agent searches today. The brand itself is a fact the affiliate types. */
  const NICHES = ['Fitness-Apps', 'Hautpflege', 'Kaffee', 'Gaming-Zubeh\u00f6r', 'Sprach-Apps', 'Nahrungserg\u00e4nzung', 'Mode', 'Tierbedarf',
    'Reisegep\u00e4ck', 'Software-Tools', 'Tech-Gadgets', 'Haushaltshelfer', 'Lern-Apps', 'Schlaf und Erholung'];
  function industry(id) { return INDUSTRIES.find(i => i.id === id) || null; }
  /* Which other industry a business name points to, if any ("Friseur M\u00fcller" typed on a jeweller day). */
  function industryClash(name, id) {
    const s = String(name || '').toLowerCase();
    if (!s) return null;
    const own = industry(id);
    if (own && own.words.some(w => s.indexOf(w) >= 0)) return null;
    return INDUSTRIES.find(i => i.id !== id && i.words.some(w => s.indexOf(w) >= 0)) || null;
  }
  /* Shuffle: a short visible run of candidates that settles on one, never the same as the current pick. */
  function shuffleRun(product, current, rnd, steps) {
    rnd = rnd || Math.random; steps = steps || 9;
    const pool = product === 'website' ? INDUSTRIES.map(i => i.id) : NICHES.slice();
    const run = [];
    let last = current;
    for (let k = 0; k < steps; k++) {
      let pick, guard = 0;
      do { pick = pool[Math.floor(rnd() * pool.length) % pool.length]; } while ((pick === last || (k === steps - 1 && pick === current)) && guard++ < 50);
      run.push(pick); last = pick;
    }
    return run;
  }
  function pickLabel(product, pick) {
    if (product === 'website') { const i = industry(pick); return i ? i.many : ''; }
    return NICHES.indexOf(pick) >= 0 ? pick : '';
  }

  /* ---------- Daily facts (what the affiliate types) ---------- */
  const FIELDS = {
    website: [
      { k: 'pick', label: 'Branche des Tages', kind: 'shuffle', need: true },
      { k: 'city', label: 'Stadt (optional)', kind: 'text', need: false, max: 40, hint: 'z. B. Hamburg' },
      { k: 'leads', label: 'Treffer vom Lead-Skill', kind: 'int', need: true, max: 999, hint: 'Zahl aus deinem Lead-Skill' },
      { k: 'business', label: 'Name des Gesch\u00e4fts (optional)', kind: 'text', need: false, max: 60, hint: 'nur mit Einverst\u00e4ndnis zeigen' },
      { k: 'emailSent', label: 'Pitch-E-Mail schon verschickt', kind: 'bool', need: false },
      { k: 'update', label: 'Update zum Kunden von gestern', kind: 'update', need: false, fromDay: 2 }
    ],
    sponsor: [
      { k: 'pick', label: 'Nische des Tages', kind: 'shuffle', need: false },
      { k: 'contacted', label: 'Heute angeschriebene Sponsoren', kind: 'int', need: true, max: 9999, hint: 'Zahl aus deinem Postausgang' },
      { k: 'brand', label: 'Marke, die du highlightest', kind: 'text', need: true, max: 50 },
      { k: 'idea', label: 'Angebot / Videoidee f\u00fcr die Marke', kind: 'text', need: true, max: 140, hint: 'z. B. drei Hooks f\u00fcr ihre neue App' },
      { k: 'price', label: 'Preis im Angebot (\u20ac)', kind: 'money', need: true, max: 100000 },
      { k: 'learning', label: 'Learning aus der PDF Agency Skill', kind: 'text', need: true, max: 200, hint: 'eine Regel, in deinen Worten' },
      { k: 'replies', label: 'Antworten bisher', kind: 'int', need: true, max: 9999 },
      { k: 'update', label: 'Update zu gestern', kind: 'update', need: false, fromDay: 2 }
    ]
  };
  const UPDATES = {
    website: { none: '', noReply: 'Der Kunde von gestern hat noch nicht geantwortet.', no: 'Der Kunde von gestern hat abgesagt.', interest: 'Der Kunde von gestern hat Interesse und will mehr wissen.', won: 'Der Kunde von gestern hat zugesagt.' },
    sponsor: { none: '', noReply: 'Von gestern ist noch keine Zusage da.', no: 'Die Marke von gestern hat abgesagt.', interest: 'Die Marke von gestern will mehr wissen.', won: 'Die Marke von gestern hat zugesagt.' }
  };
  const UPDATE_LABELS = { none: 'Kein Update', noReply: 'Noch keine Antwort', no: 'Absage', interest: 'Interesse', won: 'Zusage' };

  function missingFacts(product, day, facts) {
    facts = facts || {};
    const miss = [];
    for (const f of FIELDS[product]) {
      if (!f.need || (f.fromDay && day < f.fromDay)) continue;
      const v = facts[f.k];
      if (f.kind === 'int' || f.kind === 'money') { if (parseNum(v, { int: f.kind === 'int', max: f.max }) == null) miss.push(f.k); }
      else if (f.kind === 'shuffle') { if (!pickLabel(product, v)) miss.push(f.k); }
      else if (!String(v == null ? '' : v).trim()) miss.push(f.k);
    }
    if (product === 'sponsor') { const c = parseNum(facts.contacted, { int: true }); if (c === 0 && miss.indexOf('contacted') < 0) miss.push('contacted'); }
    return miss;
  }
  function factProblems(product, day, facts) {
    facts = facts || {};
    const out = [];
    for (const f of FIELDS[product]) {
      const v = facts[f.k];
      if ((f.kind === 'int' || f.kind === 'money') && String(v == null ? '' : v).trim() && parseNum(v, { int: f.kind === 'int', max: f.max }) == null)
        out.push({ k: f.k, msg: f.kind === 'int' ? 'Nur ganze Zahlen bis ' + f.max + '.' : 'Betrag wie 250 oder 249,50.' });
    }
    if (product === 'website') {
      const clash = industryClash(facts.business, facts.pick);
      if (clash) out.push({ k: 'business', msg: 'Der Name klingt nach ' + clash.one + ', heute ist aber ' + ((industry(facts.pick) || {}).one || 'eine andere Branche') + ' dran. Branche und Gesch\u00e4ft m\u00fcssen zusammenpassen.' });
    }
    if (product === 'sponsor') {
      const c = parseNum(facts.contacted, { int: true }), r = parseNum(facts.replies, { int: true });
      if (parseNum(facts.contacted, { int: true }) === 0) out.push({ k: 'contacted', msg: 'Mit null angeschriebenen Sponsoren passt die Hook nicht. Erst anschreiben, dann aufnehmen.' });
      if (c != null && r != null && r > c && !(day > 1)) out.push({ k: 'replies', msg: 'Mehr Antworten als Anfragen an Tag eins? Pr\u00fcf die Zahlen.' });
    }
    return out;
  }

  /* ---------- The script: one series shell, product steps inside ---------- */
  function onScreen(day) { return 'Challenge: 30.000 \u20ac in einem Monat mit ChatGPT \u00b7 Tag ' + day + '/' + CHALLENGE.days; }
  function val(v) { const s = String(v == null ? '' : v).trim(); return s || GAP; }
  function sentence(s) { s = String(s).trim(); return /[.!?\u2026]$/.test(s) ? s : s + '.'; }
  function dayWord(day) { return numberWords(day); }

  function buildScript(product, day, facts, prevFacts) {
    facts = facts || {}; day = Math.max(1, Math.floor(day) || 1);
    const P = PRODUCTS[product];
    const sec = [];
    const add = (id, shot, label, lines, screen) => sec.push({ id, shot, label, lines: lines.filter(Boolean), screen: screen || '' });
    const upd = day > 1 ? (UPDATES[product][facts.update] || '') : '';

    if (product === 'website') {
      const ind = industry(facts.pick);
      const leads = parseNum(facts.leads, { int: true, max: 999 });
      const city = String(facts.city || '').trim();
      const name = String(facts.business || '').trim();
      const prevName = prevFacts && String(prevFacts.business || '').trim();
      const updLine = upd && prevName ? upd.replace('Der Kunde von gestern', prevName) : upd;
      add('hook', 'talk', 'Opening \u00b7 Talking Head, iPad zeigt das Produkt', [
        day === 1 ? 'Tag eins. Ich versuche, mit ChatGPT in einem Monat drei\u00dfigtausend Euro zu verdienen.' : 'Tag ' + dayWord(day) + ' der Challenge: drei\u00dfigtausend Euro in einem Monat mit ChatGPT.',
        'Heute entscheidet der Zufall die Branche: ' + (ind ? ind.many : GAP) + '.'
      ]);
      if (updLine) add('update', 'talk', 'Update von gestern \u00b7 Talking Head', [updLine]);
      add('leads', 'screen', 'POV Laptop \u00b7 Lead-Skill', [
        'Mein Lead-Skill sucht ' + (ind ? ind.many : GAP) + (city ? ' in ' + city : '') + ' mit schwacher oder ohne Website.',
        leads == null ? 'Er hat ' + GAP + ' Treffer gefunden.' : leads === 0 ? 'Er hat keinen Treffer gefunden.' : leads === 1 ? 'Er hat einen Treffer gefunden.' : 'Er hat ' + numberWords(leads) + ' Treffer gefunden.',
        leads === 0 ? '' : name ? 'Ich nehme mir ' + name + ' vor.' : 'Ich nehme mir den ersten Treffer vor.'
      ]);
      add('build', 'screen', 'POV Laptop \u00b7 Website-Skill', ['Jetzt baut mein Website-Skill eine neue Website f\u00fcr ' + (name || (ind ? ind.obj : GAP)) + '.']);
      add('reveal', 'screen', 'POV Laptop \u00b7 Ergebnis', ['Und das ist das Ergebnis.'], ind ? 'Zeig: ' + ind.idea : '');
      add('pitch', 'screen', 'POV Laptop \u00b7 Proposal-Skill', [
        'Mein Proposal-Skill macht daraus einen animierten Pitch.',
        facts.emailSent ? 'Den habe ich per E-Mail verschickt.' : 'Den schicke ich jetzt per E-Mail raus.'
      ]);
      add('cliff', 'screen', 'POV Laptop \u00b7 Cliffhanger', ['Lande ich den Kunden?']);
      add('cta', 'outro', 'Outro \u00b7 Talking Head + iPad', ['Folgt mir, dann seht ihr es.', P.cta]);
    } else {
      const c = parseNum(facts.contacted, { int: true, max: 9999 });
      const r = parseNum(facts.replies, { int: true, max: 9999 });
      const price = parseNum(facts.price, { max: 100000 });
      const niche = pickLabel('sponsor', facts.pick);
      const cw = c == null || c === 0 ? GAP + ' Sponsoren' : c === 1 ? 'einen Sponsor' : numberWords(c) + ' Sponsoren';
      add('hook', 'talk', 'Opening \u00b7 Talking Head, iPad zeigt das Produkt', [
        (day === 1 ? 'Erster Tag, an dem ChatGPT autonom ' : 'Erneuter Tag, an dem ChatGPT autonom ') + cw + ' angeschrieben hat.'
      ]);
      if (upd) add('update', 'talk', 'Update von gestern \u00b7 Talking Head', [upd]);
      add('brand', 'screen', 'POV Laptop \u00b7 Marke', [
        niche ? 'Heute im Fokus: ' + niche + '.' : '',
        'Heute highlighten wir ' + val(facts.brand) + '.',
        'Die Idee: ' + sentence(val(facts.idea)),
        'Preis im Angebot: ' + (price == null ? GAP : euroWords(price)) + '.'
      ]);
      add('learning', 'screen', 'POV Laptop \u00b7 PDF Agency Skill', ['Das heutige Learning aus der PDF, die meine ChatGPT-Agentur nutzt: ' + sentence(val(facts.learning))]);
      add('replies', 'screen', 'POV Laptop \u00b7 Posteingang', [
        r == null ? 'Antworten bisher: ' + GAP + '.' : r === 0 ? 'Bisher hat noch keine Marke geantwortet.' : r === 1 ? 'Bisher hat eine Marke geantwortet.' : 'Bisher haben ' + numberWords(r) + ' Marken geantwortet.'
      ]);
      add('cta', 'outro', 'Outro \u00b7 Talking Head + iPad', [P.cta]);
    }
    const missing = missingFacts(product, day, facts);
    const text = sec.map(s => s.lines.join(' ')).join('\n');
    return { product, day, onScreen: onScreen(day), sections: sec, missing, ready: missing.length === 0 && text.indexOf(GAP) < 0, text };
  }

  /* Copy-ready script text, with the shot for each part. */
  function scriptText(s) {
    const out = ['Text auf dem Bildschirm: ' + s.onScreen, ''];
    for (const x of s.sections) { out.push('[' + x.label + ']'); out.push(x.lines.join(' ')); if (x.screen) out.push('(' + x.screen + ')'); out.push(''); }
    return out.join('\n').trim();
  }

  /* ---------- Shot list: talking head + iPad, one continuous laptop take, talking head + iPad ---------- */
  function shotList(product, day, facts) {
    facts = facts || {};
    const P = PRODUCTS[product];
    const ind = industry(facts.pick);
    const shots = [{ n: 1, kind: 'talk', title: 'Opening (0\u20133 s)', how: 'Talking Head. Halte das iPad mit der ' + P.short + '-Seite in die Kamera. Hook sprechen, Text oben einblenden.' }];
    if (day > 1 && facts.update && facts.update !== 'none') shots.push({ n: 0, kind: 'talk', title: 'Update', how: 'Gleiche Einstellung, ein Satz zum Stand von gestern.' });
    const pov = product === 'website'
      ? ['Zufall: Branche im Shuffle zeigen' + (ind ? ' (' + ind.many + ')' : ''), 'Lead-Skill in ChatGPT laufen lassen, Trefferliste zeigen', 'Website-Skill baut die Seite', 'Ergebnis durchscrollen' + (ind ? ': ' + ind.idea : ''), 'Proposal-Skill: animierten Pitch abspielen', 'E-Mail-Entwurf oder Gesendet-Ordner, Adresse unkenntlich']
      : ['Postausgang des Agenten mit der Zahl von heute, Adressen unkenntlich', 'Website der Marke und dein Angebot', 'Preis im Angebot zeigen', 'Die Seite der PDF mit dem Learning', 'Posteingang: Zahl der Antworten, Namen unkenntlich'];
    shots.push({ n: 0, kind: 'screen', title: 'POV Laptop, eine Aufnahme am St\u00fcck', how: 'Bildschirm aufnehmen und alles nacheinander zeigen. Voiceover selbst sprechen oder mit ElevenLabs. Kein Ger\u00e4tewechsel dazwischen.', beats: pov });
    shots.push({ n: 0, kind: 'outro', title: 'Outro mit CTA', how: 'Zur\u00fcck zum Talking Head, iPad mit der ' + P.short + '-Seite zeigen. Keyword \u201e' + P.keyword + '\u201c gro\u00df einblenden.' });
    shots.forEach((s, i) => { s.n = i + 1; });
    return shots;
  }

  /* ---------- The Day video checklist ---------- */
  const CHECKS = [
    { k: 'product', label: 'Produkt gew\u00e4hlt', auto: true },
    { k: 'link', label: 'Eigenen Affiliate-Link eingetragen', auto: true },
    { k: 'facts', label: 'Fakten von heute eingetragen, Skript ohne L\u00fccken', auto: true },
    { k: 'recOpen', label: 'Opening aufgenommen: Talking Head, iPad zeigt das Produkt' },
    { k: 'recScreen', label: 'Laptop-Aufnahme am St\u00fcck (POV)' },
    { k: 'recVoice', label: 'Voiceover eingesprochen (selbst oder ElevenLabs)' },
    { k: 'recOutro', label: 'Outro mit CTA aufgenommen: Talking Head + iPad' },
    { k: 'edit', label: 'Text auf dem Bildschirm und Untertitel drin, Adressen und Namen unkenntlich' },
    { k: 'ad', label: 'Als Werbung gekennzeichnet (Affiliate-Link)' },
    { k: 'posted', label: 'Gepostet und Link zum Video eingetragen', auto: true }
  ];
  function checklist(state, product, day) {
    const d = dayEntry(state, product, day);
    const link = checkLink(product, (state.links || {})[product]);
    const auto = {
      product: !!PRODUCTS[product],
      link: link.ok,
      facts: missingFacts(product, day, d.facts).length === 0 && factProblems(product, day, d.facts).length === 0,
      posted: !!(d.post && d.post.url)
    };
    const items = CHECKS.map(c => ({ k: c.k, label: c.label, auto: !!c.auto, done: c.auto ? !!auto[c.k] : !!(d.checks && d.checks[c.k]) }));
    return { items, done: items.filter(i => i.done).length, total: items.length };
  }

  /* ---------- Links ---------- */
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function checkLink(product, raw) {
    const s = String(raw || '').trim();
    if (!s) return { ok: false, level: 'empty', msg: 'Noch kein Link. F\u00fcge deinen Beacons-Affiliate-Link f\u00fcr ' + PRODUCTS[product].name + ' ein.' };
    let u;
    try { u = new URL(s); } catch (e) { return { ok: false, level: 'error', msg: 'Das ist kein vollst\u00e4ndiger Link. Er beginnt mit https://' }; }
    if (u.protocol !== 'https:' || u.hostname !== 'shop.beacons.ai') return { ok: false, level: 'error', msg: 'Der Link muss zu shop.beacons.ai f\u00fchren.' };
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'emanuristic' || !UUID.test(parts[1] || '')) return { ok: false, level: 'error', msg: 'Das ist keine Produktseite von @emanuristic.' };
    const pid = parts[1].toLowerCase();
    const P = PRODUCTS[product];
    if (P.beaconsId && pid !== P.beaconsId) return { ok: false, level: 'error', msg: 'Dieser Link f\u00fchrt zu einem anderen Produkt, nicht zu ' + P.name + '.' };
    if (product === 'website' && pid === SPONSOR_PRODUCT_ID) return { ok: false, level: 'error', msg: 'Dieser Link f\u00fchrt zum AI Sponsoren-Agent, nicht zum AI Website Client System.' };
    const aff = u.searchParams.get('affiliateLinkId') || '';
    if (!UUID.test(aff)) return { ok: false, level: 'warn', msg: 'Das ist der normale Produktlink ohne deine Partner-ID (affiliateLinkId). So werden Verk\u00e4ufe dir nicht zugeordnet.' };
    return { ok: true, level: 'ok', productChecked: !!P.beaconsId, msg: P.beaconsId ? 'Link passt zu ' + P.name + ' und enth\u00e4lt deine Partner-ID.' : 'Partner-ID gefunden. Pr\u00fcf einmal selbst, dass der Link ' + P.name + ' \u00f6ffnet.' };
  }
  function caption(product, day, state) {
    const P = PRODUCTS[product];
    return 'Tag ' + day + '/' + CHALLENGE.days + ': 30.000 \u20ac in einem Monat mit ChatGPT. Kommentiere \u201e' + P.keyword + '\u201c. #werbung #ki #chatgpt' + (product === 'website' ? ' #webdesign' : ' #ugc');
  }
  function agentPrompt(product, facts) {
    facts = facts || {};
    if (product === 'website') {
      const ind = industry(facts.pick), city = String(facts.city || '').trim();
      return 'Lead-Skill: Finde ' + (ind ? ind.many : '[BRANCHE]') + (city ? ' in ' + city : ' in [STADT]') + ', die keine oder eine veraltete Website haben. Liste Name, Adresse, aktuelle Website und \u00f6ffentliche gesch\u00e4ftliche Kontaktadresse. Erfinde keine Daten.';
    }
    const n = pickLabel('sponsor', facts.pick);
    return 'Sponsoren-Agent: Finde Marken aus dem Bereich ' + (n || '[NISCHE]') + ', die mit UGC-Creatorn arbeiten. Schreib jeder eine kurze, pers\u00f6nliche Anfrage nach der PDF Agency Skill mit einer konkreten Videoidee und einem Preis. Erfinde keine Zahlen oder Referenzen.';
  }

  /* ---------- State ---------- */
  function fresh() { return { v: VERSION, product: 'website', links: { website: '', sponsor: '' }, day: { website: 1, sponsor: 1 }, days: { website: {}, sponsor: {} }, clicks: { website: null, sponsor: null }, sales: [] }; }
  function dayEntry(state, product, day) {
    const all = (state.days && state.days[product]) || {};
    const d = all[String(day)] || {};
    return { facts: d.facts || {}, checks: d.checks || {}, post: d.post || null };
  }
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max || 300) : ''; }
  function sanitize(raw) {
    const s = fresh();
    if (!raw || typeof raw !== 'object') return s;
    if (PRODUCTS[raw.product]) s.product = raw.product;
    for (const p of Object.keys(PRODUCTS)) {
      if (raw.links) s.links[p] = str(raw.links[p], 500);
      const dd = raw.day && Math.floor(Number(raw.day[p]));
      if (dd >= 1 && dd <= 365) s.day[p] = dd;
      const days = raw.days && raw.days[p];
      if (days && typeof days === 'object') for (const k of Object.keys(days)) {
        const n = Math.floor(Number(k)); if (!(n >= 1 && n <= 365)) continue;
        const d = days[k] || {}, facts = {}, checks = {};
        for (const f of FIELDS[p]) { const v = d.facts && d.facts[f.k]; if (f.kind === 'bool') { if (v === true) facts[f.k] = true; } else if (v != null) facts[f.k] = str(String(v), f.max || 60); }
        for (const c of CHECKS) if (!c.auto && d.checks && d.checks[c.k] === true) checks[c.k] = true;
        const post = d.post && typeof d.post.url === 'string' && /^https:\/\//.test(d.post.url) ? { url: str(d.post.url, 500), date: str(d.post.date, 10) } : null;
        s.days[p][String(n)] = { facts, checks, post };
      }
      const ck = raw.clicks && raw.clicks[p];
      if (ck && Number.isInteger(ck.total) && ck.total >= 0 && ck.total < 1e7) s.clicks[p] = { total: ck.total, asOf: str(ck.asOf, 10) };
    }
    if (Array.isArray(raw.sales)) {
      const seen = new Set();
      for (const x of raw.sales.slice(0, 5000)) {
        const v = validSale(x, seen);
        if (v.ok) { s.sales.push(v.sale); if (v.sale.ref) seen.add(v.sale.ref.toLowerCase()); }
      }
    }
    return s;
  }
  function load(storage) {
    try { const t = storage.getItem(STORE_KEY); return t ? sanitize(JSON.parse(t)) : fresh(); } catch (e) { return fresh(); }
  }
  function save(storage, state) { try { storage.setItem(STORE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }

  /* ---------- Sales, clicks, funnel ---------- */
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  function validSale(x, seenRefs, today) {
    x = x || {};
    const product = PRODUCTS[x.product] ? x.product : null;
    const amount = typeof x.amount === 'number' ? x.amount : parseNum(x.amount, { max: 10000 });
    const date = str(x.date, 10), ref = str(String(x.ref == null ? '' : x.ref), 60).trim();
    const status = x.status === 'confirmed' ? 'confirmed' : 'reported';
    if (!product) return { ok: false, msg: 'Produkt fehlt.' };
    if (amount == null || !(amount > 0) || amount > 10000) return { ok: false, msg: 'Betrag zwischen 0,01 und 10.000 \u20ac.' };
    if (!ISO.test(date) || isNaN(Date.parse(date + 'T00:00:00Z'))) return { ok: false, msg: 'Datum fehlt.' };
    if (today && date > today) return { ok: false, msg: 'Das Datum liegt in der Zukunft.' };
    if (status === 'confirmed' && !ref) return { ok: false, msg: 'F\u00fcr \u201ebest\u00e4tigt\u201c brauchst du die Bestellnummer aus Beacons.' };
    if (ref && seenRefs && seenRefs.has(ref.toLowerCase())) return { ok: false, msg: 'Diese Bestellnummer ist schon eingetragen.' };
    const id = str(x.id, 40) || ('s' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
    return { ok: true, sale: { id, product, amount: Math.round(amount * 100) / 100, date, ref, status, at: Number(x.at) || Date.now() } };
  }
  function addSale(state, x, today) {
    const seen = new Set(state.sales.map(s => (s.ref || '').toLowerCase()).filter(Boolean));
    const v = validSale(Object.assign({}, x, { id: '' }), seen, today);
    if (v.ok) state.sales.push(v.sale);
    return v;
  }
  function setClicks(state, product, raw, today) {
    const s = String(raw == null ? '' : raw).trim();
    if (!s) { state.clicks[product] = null; return { ok: true }; }
    const n = parseNum(s, { int: true, max: 9999999 });
    if (n == null) return { ok: false, msg: 'Nur eine ganze Zahl, z. B. 340.' };
    state.clicks[product] = { total: n, asOf: today || '' };
    return { ok: true };
  }
  function funnel(state, product) {
    const prods = product ? [product] : Object.keys(PRODUCTS);
    let posts = 0, clicks = 0, clickKnown = 0, confirmed = 0, reported = 0, asOf = '';
    for (const p of prods) {
      const days = state.days[p] || {};
      for (const k of Object.keys(days)) if (days[k] && days[k].post && days[k].post.url) posts++;
      const ck = state.clicks[p];
      if (ck) { clicks += ck.total; clickKnown++; if (!asOf || ck.asOf < asOf) asOf = ck.asOf; }
    }
    for (const s of state.sales) if (prods.indexOf(s.product) >= 0) { if (s.status === 'confirmed') confirmed++; else reported++; }
    const haveClicks = clickKnown === prods.length;
    const warnings = [];
    if (!haveClicks) warnings.push(clickKnown ? 'Klicks fehlen f\u00fcr ein Produkt, darum keine Quote f\u00fcr beide zusammen.' : 'Trag die Link-Klicks aus deinem Beacons-Dashboard ein, dann siehst du die Quoten.');
    if (haveClicks && confirmed > clicks) warnings.push('Mehr best\u00e4tigte Verk\u00e4ufe als eingetragene Klicks: Die Klickzahl ist wahrscheinlich veraltet.');
    return {
      posts, clicks: haveClicks ? clicks : null, clicksAsOf: haveClicks ? asOf : '', confirmed, reported,
      clicksPerPost: haveClicks && posts > 0 ? clicks / posts : null,
      salesPerClick: haveClicks && clicks > 0 && confirmed <= clicks ? confirmed / clicks : null,
      warnings
    };
  }

  /* ---------- Reference commission terms (from the partner dashboard Emmanuel shared, 21 Oct 2026) ---------- */
  const TIERS = [{ from: 1, to: 10, rate: 0.10 }, { from: 11, to: 50, rate: 0.15 }, { from: 51, to: 150, rate: 0.25 }, { from: 151, to: Infinity, rate: 0.45 }];
  const MONTHLY_FEE = 150;
  function rateFor(nth) { return (TIERS.find(t => nth >= t.from && nth <= t.to) || TIERS[TIERS.length - 1]).rate; }
  function confirmedSorted(state) { return state.sales.filter(s => s.status === 'confirmed').slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.at - b.at); }
  function earnings(state) {
    const list = confirmedSorted(state);
    let revenue = 0, commission = 0;
    list.forEach((s, i) => { revenue += s.amount; commission += Math.round(s.amount * rateFor(i + 1) * 100) / 100; });
    const n = list.length, tier = TIERS.findIndex(t => n + 1 >= t.from && n + 1 <= t.to);
    const cur = TIERS[tier], next = TIERS[tier + 1] || null;
    const span = cur.to === Infinity ? 1 : cur.to - cur.from + 1;
    const intoTier = n - (cur.from - 1);
    const second = list[1] || null;
    return {
      count: n, revenue: Math.round(revenue * 100) / 100, commission: Math.round(commission * 100) / 100,
      rateNow: cur.rate, nextRate: next ? next.rate : null, toNext: next ? next.from - 1 - n : 0,
      progress: next ? Math.max(0, Math.min(1, intoTier / span)) : 1, tierIndex: tier,
      feeWaived: !!second, feeWaivedFrom: second ? second.date.slice(0, 7) : '', toWaiver: Math.max(0, 2 - n)
    };
  }
  function pct(x, digits) { return x == null ? '\u2013' : (Math.round(x * 1000) / 10).toFixed(digits == null ? 1 : digits).replace('.', ',') + ' %'; }

  return {
    VERSION, STORE_KEY, CHALLENGE, GAP, PRODUCTS, INDUSTRIES, NICHES, FIELDS, UPDATE_LABELS, CHECKS, TIERS, MONTHLY_FEE, SPONSOR_PRODUCT_ID,
    numberWords, countWords, euroWords, parseNum, eur, pct, industry, industryClash, shuffleRun, pickLabel,
    missingFacts, factProblems, buildScript, scriptText, shotList, checklist, checkLink, caption, agentPrompt,
    fresh, dayEntry, sanitize, load, save, validSale, addSale, setClicks, funnel, rateFor, earnings, onScreen
  };
});
