'use strict';
/* Oct 23 2026, 17:20 (Eman: "Dude why is my world still empty?"). Build 20261023-141633 deleted the living bloodstream in Home's
   3D world as "old Home": the red-cell discs, white cells, platelets, light shafts and the glowing body places. Home's universe was
   left an empty dark tube with only faint motes. The world must stay full; only the flat DOM leftovers of the old Home stay gone. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Home world keeps its living bloodstream (never an empty universe)', () => {
  const sc = read('body-world-3d-scene.js');
  assert.match(sc, /const rbc = new THREE\.InstancedMesh\(rbcGeo, rbcMat, RBC\);[\s\S]*?scene\.add\(rbc\);/, 'red cells are built and added');
  assert.match(sc, /const RBC = small \? 150 : 230;/, 'a full stream of red cells, fewer on small phones');
  assert.match(sc, /wbcs\.push\(m\)/, 'white cells');
  assert.match(sc, /scene\.add\(plat\);/, 'platelets');
  assert.match(sc, /scene\.add\(shafts\);/, 'light shafts');
  assert.match(sc, /g\.add\(glow, core, ring, hit\); scene\.add\(g\);/, 'glowing body places out in the fog');
  assert.match(sc, /rbc\.setMatrixAt\(i, tmpM\)/, 'the red cells flow every frame');
  assert.match(sc, /plat\.setMatrixAt\(i, tmpM\)/, 'the platelets flow every frame');
  assert.ok(!/nothing drawn: the old beacon orb/.test(sc), 'no empty beacon left over from the deletion');
});

test('the flat old Home stays deleted (banner, slot card, countdown)', () => {
  const idx = read('index.html'), cards = read('arrival-cards.js');
  assert.ok(!/<span class="f3-reset/.test(idx), 'no New-in countdown under the Daily Quest');
  assert.ok(!/function note\(/.test(cards), 'no Daily Quest line from the arrival cards on Home');
});
