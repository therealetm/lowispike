#!/usr/bin/env node
// Copies data/food-policy/lowispike-policy.v1.json into food-policy-core.js (between the POLICY-JSON markers),
// so the app reads the policy without a fetch. Run after every change to the JSON; tests/food-policy.test.cjs checks it.
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const json = JSON.parse(fs.readFileSync(path.join(root, 'data/food-policy/lowispike-policy.v1.json'), 'utf8'));
const file = path.join(root, 'food-policy-core.js');
const src = fs.readFileSync(file, 'utf8');
const re = /\/\*POLICY-JSON\*\/[\s\S]*?\/\*END-POLICY-JSON\*\/;\n\n    const POLICY = [^;\n]*;/;
if (!re.test(src)) { console.error('markers not found in food-policy-core.js'); process.exit(1); }
const out = src.replace(re, () => '/*POLICY-JSON*/const POLICY_JSON = ' + JSON.stringify(json) + ';/*END-POLICY-JSON*/;\n\n    const POLICY = POLICY_JSON;');
fs.writeFileSync(file, out);
console.log('food-policy-core.js now carries ' + json.version + ' (' + json.rules.length + ' rules)');
