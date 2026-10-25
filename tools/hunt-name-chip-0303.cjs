'use strict';
/* Bug hunt 2026-10-25 03:01 (Scan / spike rating): type everyday grocery names into the Scan food-name field in en/de/es and
   read the live chip (verdict class + text). Same food must get the same verdict in every language; text must be in the language.
   node tools/hunt-name-chip-0303.cjs <device> [url] [lang] */
const H = require('./sim/harness.cjs');
const FOODS = {
  en: ['apple', 'banana', 'white bread', 'whole grain bread', 'greek yogurt', 'cola', 'diet cola', 'orange juice', 'eggs', 'chicken breast', 'salmon', 'broccoli', 'potatoes', 'sweet potato', 'brown rice', 'pasta', 'chocolate', 'dark chocolate', 'almonds', 'peanut butter', 'cheese', 'milk', 'oat milk', 'ice cream', 'croissant', 'bagel', 'cornflakes', 'avocado', 'lentils', 'chickpeas', 'tofu', 'beer', 'wine', 'gummy bears', 'pretzel', 'hummus', 'tuna', 'blueberries', 'grapes', 'mango', 'honey', 'protein bar', 'energy drink', 'quark', 'cottage cheese', 'cucumber', 'tomato', 'carrot', 'dates', 'raisins'],
  de: ['Apfel', 'Banane', 'Weißbrot', 'Vollkornbrot', 'griechischer Joghurt', 'Cola', 'Cola Zero', 'Orangensaft', 'Eier', 'Hähnchenbrust', 'Lachs', 'Brokkoli', 'Kartoffeln', 'Süßkartoffel', 'Naturreis', 'Nudeln', 'Schokolade', 'Zartbitterschokolade', 'Mandeln', 'Erdnussbutter', 'Käse', 'Milch', 'Haferdrink', 'Eis', 'Croissant', 'Bagel', 'Cornflakes', 'Avocado', 'Linsen', 'Kichererbsen', 'Tofu', 'Bier', 'Wein', 'Gummibärchen', 'Brezel', 'Hummus', 'Thunfisch', 'Heidelbeeren', 'Trauben', 'Mango', 'Honig', 'Proteinriegel', 'Energydrink', 'Quark', 'Hüttenkäse', 'Gurke', 'Tomate', 'Karotte', 'Datteln', 'Rosinen'],
  es: ['manzana', 'plátano', 'pan blanco', 'pan integral', 'yogur griego', 'cola', 'cola zero', 'zumo de naranja', 'huevos', 'pechuga de pollo', 'salmón', 'brócoli', 'patatas', 'boniato', 'arroz integral', 'pasta', 'chocolate', 'chocolate negro', 'almendras', 'mantequilla de cacahuete', 'queso', 'leche', 'bebida de avena', 'helado', 'cruasán', 'bagel', 'copos de maíz', 'aguacate', 'lentejas', 'garbanzos', 'tofu', 'cerveza', 'vino', 'gominolas', 'pretzel', 'hummus', 'atún', 'arándanos', 'uvas', 'mango', 'miel', 'barrita de proteína', 'bebida energética', 'quark', 'requesón', 'pepino', 'tomate', 'zanahoria', 'dátiles', 'pasas']
};
(async () => {
  const device = process.argv[2] || 'iPhone 13', url = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en';
  const R = await H.open({ device, engine: 'chromium', members: 4, messages: 4, probe: false, lang, url }), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => { try { LowiDex.scan(); } catch (e) { } }); await H.sleep(1800);
  const out = [];
  for (const q of FOODS[lang]) {
    const r = await P.evaluate(async q => {
      const f = document.querySelector('#b3Nm'); if (!f) return { err: 'no field' };
      f.focus(); f.value = q; f.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 650));
      const c = document.querySelector('#b3NmLive .ne-chip'), l = document.querySelector('#b3NmLive');
      return { cls: c ? c.className : '', txt: ((c || l || {}).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120) };
    }, q);
    out.push([q, r.cls.replace(/ne-chip ?/, ''), r.txt]);
  }
  console.log(JSON.stringify({ device, lang, errs: R.errs.slice(0, 5), out }));
  await R.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
