/* Nutrition policy guard (docs/NUTRITION-POLICY.md, Emmanuel's nutrition audit, 24 Oct 2026).
   Scans what people read in the app (root .js files and index.html, code comments stripped) for claims the audit
   keeps out: cooled rice / resistant starch as a pass, smaller-carb-portion or small-portion tips for Skip-it food,
   cure language for diabetes, exogenous ketones, methylene blue, seed oils are poison, calories don't matter,
   glucose causing ADHD or dementia, and the old kidneys and "helps most" lines. affiliates/ has its own test. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['app-voice-data.js', 'tutorial-voice-data.js', 'sw.js']);
const files = fs.readdirSync(ROOT).filter(f => (f.endsWith('.js') || f === 'index.html') && !SKIP.has(f));
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');

const BANNED = [
    [/resistant starch|resistente st\u00e4rke|almid\u00f3n resistente/i, 'resistant starch as a pass'],
    [/cooked and cooled|cooled (rice|potato)|abgek\u00fchlte[rn]? (Reis|Kartoffel)|(arroz|patata)s? cocid[ao]s? y enfriad/i, 'cooled rice or potatoes'],
    [/smaller carb portions?|kleinere Kohlenhydrat-?Portion|raciones de carbohidratos m\u00e1s peque\u00f1as/i, 'smaller carb portions'],
    [/A small portion right after a meal|Kleine Portion direkt nach einer Mahlzeit|Una porci\u00f3n peque\u00f1a justo despu\u00e9s/i, 'small-portion tip for a Skip-it food'],
    [/\bcures? (type 2 )?diabetes|diabetes (is )?cured|Heilung (von|des) (Typ-2-)?Diabetes|heilt (Typ-2-)?Diabetes|curar la diabetes/i, 'cure language (say remission)'],
    [/exogenous ketones?|exogene Ketone|cetonas ex\u00f3genas/i, 'exogenous ketones'],
    [/methylene blue|Methylenblau|azul de metileno/i, 'methylene blue'],
    [/seed oils? (is|are) (poison|toxic)|Samen\u00f6le sind (Gift|giftig)/i, 'seed oils are poison'],
    [/calories (don.t|do not) matter|Kalorien sind egal|las calor\u00edas no importan/i, 'calories don\'t matter'],
    [/(spikes?|glucose|blood sugar) (cause|causes) (ADHD|dementia|depression|infertility)/i, 'glucose causes disease X'],
    [/kidneys clear extra sugar|Nieren, \u00fcbersch\u00fcssigen Zucker/i, 'kidneys claim'],
    [/It helps most\.|Das hilft am meisten\.|Es lo que m\u00e1s ayuda\./, '"helps most" overclaim'],
];

test('no text in the app breaks the nutrition audit', () => {
    assert.ok(files.length > 20, 'scans the app files');
    const hits = [];
    for (const f of files) {
        const s = strip(fs.readFileSync(path.join(ROOT, f), 'utf8'));
        for (const [re, why] of BANNED) {
            const m = s.match(re);
            if (m) hits.push(f + ': ' + why + ' -> "' + m[0] + '"');
        }
    }
    assert.deepStrictEqual(hits, []);
});

test('vinegar is only ever optional, never a fix', () => {
    const herb = fs.readFileSync(path.join(ROOT, 'herb-shop.js'), 'utf8');
    const line = herb.split('\n').find(l => /vinegar/i.test(l) && /Essig/.test(l));
    assert.ok(line && /Optional/.test(line), 'the spike tip says vinegar is optional');
    assert.doesNotMatch(herb, /vinegar before a meal can soften the spike/i);
});

test('the policy file exists and the handoff points to it', () => {
    const pol = fs.readFileSync(path.join(ROOT, 'docs', 'NUTRITION-POLICY.md'), 'utf8');
    assert.match(pol, /Resistant starch makes rice, pasta or potatoes LOWiSPIKE-friendly/);
    assert.match(pol, /remission/i);
    assert.match(fs.readFileSync(path.join(ROOT, 'MAYA-HANDOFF.md'), 'utf8'), /docs\/NUTRITION-POLICY\.md/);
    assert.match(fs.readFileSync(path.join(ROOT, 'DECISIONS.md'), 'utf8'), /docs\/NUTRITION-POLICY\.md/);
});
