// 22 Nov 2026 (Emmanuel): the chat photo preview gets Edit -> Recalculate (lowi-ai mealfix) before it is sent.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');
test('a food read in the composer has an Edit button that opens a dictation box', () => { assert.match(js, /data-csfix="open"/); assert.match(js, /<textarea data-mic class="cs-fix-ta"/); assert.match(js, /edit:'Bearbeiten'/); });
test('Recalculate sends the foods and the words to mealfix and rebuilds the card', () => { assert.match(js, /action:'mealfix'/); assert.match(js, /const card=foodCard\(Object\.assign\(\{\},r,\{isFood:true,dishes/); assert.match(js, /pin\.fv=\(pin\.fv\|\|0\)\+1/); });
