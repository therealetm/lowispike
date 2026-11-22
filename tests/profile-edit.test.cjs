// 22 Nov 2026 (Emmanuel): My posts has an Edit mode to remove saved items and delete own photos and links easily.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
test('profile shows an Edit / Done button', () => { assert.match(html, /data-tr="prof-edit"/); assert.match(html, /fyT\(profEdit \? "Done" : "Edit"\)/); });
test('edit mode tiles carry prof-x and a red minus', () => { assert.match(html, /profEdit \? ' data-tr="prof-x"/); assert.match(html, /class="fy-gx"/); });
test('saved removes in one tap, own posts need a second tap', () => { const i = html.indexOf('case "prof-x"'); assert.ok(i > 0); const c = html.slice(i, i + 1200);
  assert.match(c, /k === "saved"/); assert.match(c, /delete T\.saved\[id\]/); assert.match(c, /LowiChatPost\.remove/); assert.match(c, /profArm !== id/); assert.match(c, /LOWI_CLOUD\.unpublish\(id\)/); });
test('edit wobble respects reduced motion', () => { assert.match(html, /prefers-reduced-motion:reduce\)\{\.fy-gt\.edit\{animation:none\}/); });
test('new words exist in DE and ES', () => { for (const w of ['"Edit", "Bearbeiten", "Editar"', '"Delete?", "Löschen?", "¿Borrar?"', '"Deleted", "Gelöscht", "Borrado"']) assert.ok(html.includes(w), w); });
