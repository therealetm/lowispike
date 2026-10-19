#!/usr/bin/env node
/* Builds data/meals/fndds.json, the meal database behind typed meal names (Scanner "What is it?" and Log meal > Manual).
   Source: USDA FoodData Central, Food and Nutrient Database for Dietary Studies (FNDDS 2021-2023, "survey foods"), public domain
   (U.S. government work, CC0). It holds ~5,400 foods as people eat them, mixed dishes included ("Chicken or turkey stew with potatoes and
   vegetables", "Soup, chicken noodle", "Pad Thai with chicken"), with nutrients per 100 g, the typical portion in grams and the recipe's
   ingredients. Dishes FNDDS lacks (fish and chips, jacket potato, jollof rice, ...) are composed from FNDDS foods in meal-db-core.js.

   Usage:
     curl -sLo /tmp/fndds.zip https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_csv_2024-10-31.zip
     unzip -o -q /tmp/fndds.zip -d /tmp/fndds
     node tools/meal-data/build.cjs /tmp/fndds/FoodData_Central_survey_food_csv_2024-10-31

   Output row: [description, serving grams, kcal, protein, carbs, fat, fiber, sugar, [ingredient indexes], grams per slice/piece] per typical serving. */
'use strict';
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, 'food.csv'))) { console.error('usage: build.cjs <FNDDS csv dir>'); process.exit(1); }

function* rows(file) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  let i = 0, field = '', row = [], q = false, head = null;
  const n = text.length;
  for (; i < n; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (!head) head = row; else if (row.length > 1) { const o = {}; head.forEach((h, j) => { o[h] = row[j]; }); yield o; }
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); if (head && row.length > 1) { const o = {}; head.forEach((h, j) => { o[h] = row[j]; }); yield o; } }
}

const SKIP = /^(baby|infant|toddler|human milk|formula|nutritional drink|nutrition bar|meal replacement|protein powder)/i;
const foods = new Map();
for (const r of rows('food.csv')) {
  if (SKIP.test(r.description) || /\bbaby food\b|infant formula/i.test(r.description)) continue;
  foods.set(r.fdc_id, { d: r.description, n: {}, g: 0, por: [], ing: [] });
}
/* FNDDS food_nutrient.nutrient_id holds the legacy nutrient numbers: 208 kcal, 203 protein, 205 carbs, 204 fat, 291 fiber, 269 sugars */
const NUT = { 208: 0, 203: 1, 205: 2, 204: 3, 291: 4, 269: 5 };
for (const r of rows('food_nutrient.csv')) {
  const f = foods.get(r.fdc_id); if (!f) continue;
  const k = NUT[r.nutrient_id]; if (k === undefined) continue;
  f.n[k] = +r.amount;
}
for (const r of rows('food_portion.csv')) {
  const f = foods.get(r.fdc_id); if (!f) continue;
  const g = +r.gram_weight; if (!(g > 0)) continue;
  f.por.push([r.portion_description, g]);
}
for (const r of rows('input_food.csv')) {
  const f = foods.get(r.fdc_id); if (!f) continue;
  f.ing.push([r.sr_description || '', +r.gram_weight || 0]);
}

/* the portion a person typically eats: FNDDS's "Quantity not specified" (the usual amount), else the first "1 ..." portion */
function serving(f) {
  const qns = f.por.find(p => /quantity not specified/i.test(p[0]));
  if (qns) return qns[1];
  const one = f.por.find(p => /^1 (serving|cup|piece|sandwich|burrito|taco|slice|medium|item|bowl|patty|order|link|egg|bar|roll|bun|muffin|cookie|fillet)/i.test(p[0]));
  if (one) return one[1];
  return f.por.length ? f.por[0][1] : 100;
}
/* grams in one slice or piece, for "two slices of pizza" (0 when FNDDS has no such portion) */
function unit(f) {
  const u = f.por.find(p => /^1 (slice|piece|small slice|medium slice|piece, medium)/i.test(p[0])) || f.por.find(p => /^1 (slice|piece)/i.test(p[0]));
  return u ? Math.round(u[1]) : 0;
}
/* short ingredient names: "Chicken, broilers or fryers, breast, meat only, cooked" -> "chicken" */
const ING_FIX = [[/^cereals?,? oats|^oats/i, 'oats'], [/^table fat|^margarine/i, 'butter'], [/^catsup/i, 'ketchup'], [/^rolls?\b/i, 'bread roll'], [/^mirepoix/i, 'vegetables'],
  [/^crustaceans/i, 'shellfish'], [/^soup/i, ''], [/^sauce, /i, 'sauce'], [/^salad dressing/i, 'dressing'], [/^oil\b|^vegetable oil|^canola|^olive oil/i, 'oil'], [/^beverages|^salt\b|^spices|^pepper, black|^water\b|^leavening|^baking/i, ''], [/^wheat flour|^flour/i, 'wheat flour'],
  [/^potatoes?\b/i, 'potato'], [/^tomato/i, 'tomato'], [/^cheese/i, 'cheese'], [/^chicken/i, 'chicken'], [/^beef/i, 'beef'], [/^pork/i, 'pork'], [/^rice/i, 'rice'],
  [/^pasta|^spaghetti|^noodles/i, 'pasta'], [/^egg/i, 'egg'], [/^milk/i, 'milk'], [/^butter/i, 'butter'], [/^onions?/i, 'onion'], [/^carrots?/i, 'carrot'], [/^beans?/i, 'beans'],
  [/^sugars?\b/i, 'sugar'], [/^bread/i, 'bread'], [/^fish|^cod|^salmon|^tuna|^tilapia|^pollock|^haddock/i, 'fish'], [/^lettuce/i, 'lettuce'], [/^cream\b/i, 'cream']];
function ingName(s) {
  for (const [re, v] of ING_FIX) if (re.test(s)) return v;
  const first = s.split(',')[0].replace(/\s*\(.*$/, '').trim().toLowerCase();
  if (!first || first.length > 28) return '';
  return first;
}
const ingIdx = new Map(), ingList = [];
const r1 = v => Math.round(v * 10) / 10;
const out = [];
for (const f of foods.values()) {
  if (f.n[0] === undefined || f.n[1] === undefined) continue;
  const g = serving(f), m = g / 100;
  const ing = [];
  f.ing.slice().sort((a, b) => b[1] - a[1]).forEach(([d]) => {
    const k = ingName(d); if (!k || ing.includes(k) || ing.length >= 5) return; ing.push(k);
  });
  const idx = ing.length > 1 ? ing.map(k => { if (!ingIdx.has(k)) { ingIdx.set(k, ingList.length); ingList.push(k); } return ingIdx.get(k); }) : [];
  out.push([f.d, Math.round(g), Math.round((f.n[0] || 0) * m), r1((f.n[1] || 0) * m), r1((f.n[2] || 0) * m), r1((f.n[3] || 0) * m), r1((f.n[4] || 0) * m), r1((f.n[5] || 0) * m), idx, unit(f)]);
}
out.sort((a, b) => a[0].localeCompare(b[0]));
const file = path.join(__dirname, '..', '..', 'data', 'meals', 'fndds.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({
  src: 'USDA FoodData Central, FNDDS 2021-2023 survey foods (public domain), built by tools/meal-data/build.cjs',
  cols: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'ing', 'slice/piece grams'],
  ing: ingList, f: out
}) + '\n');
console.log('wrote', file, out.length, 'foods,', ingList.length, 'ingredients,', fs.statSync(file).size, 'bytes');
