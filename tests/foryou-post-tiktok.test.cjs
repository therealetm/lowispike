'use strict';
/* Nov 7 2026 (Emmanuel: "The whole FYP interface to posting ... looks completely overwhelming and just bad ... like TikTok or Instagram
   or Snapchat"; the Post row lay on the recipe field).
   - New post: one header with the title and Post top right (stays while you scroll), no second title and no explainer lines.
   - For You: the shelf find under a swap is one folded line until tapped; the swap reason keeps two lines; words and Save end above
     the round back button.
   Browser walk (scratch, Chromium, local site, network blocked, 393 x 852 with the iPhone's safe areas): Post at the top right, no field
   covered, the whole sheet visible; For You shows the photo with the folded find, nothing under the back button (screenshots checked). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');

test('New post: Post sits top right in the sheet header, the explainer lines are gone', () => {
    assert.ok(html.includes('<div class="r3f-head"><div class="h2 r3f-ph" data-noi18n>\' + esc(T("New post")) + \'</div><span class="r3f-postslot"></span></div>'));
    assert.ok(html.includes('{ const pf = $("#r3fCompose .ls-postfoot"), slot = $(".r3f-postslot", sh || document); if (pf && slot && slot.appendChild) slot.appendChild(pf); }'), 'the same #trPost moves, so updPost keeps working');
    assert.match(html, /\.r3f-post \.r3f-head\{position:sticky;top:20px;/);
    assert.match(html, /#sheet\.r3f-sheet \.r3f-head \.ls-postfoot\{position:static;/, 'no longer a sticky row over the fields');
    assert.ok(html.includes('.r3f-post .r3f-psub,.r3f-post #trCompose > .h3,.r3f-post #trCompose > .h3 + .small.muted,.r3f-post .ls-post > .foot{display:none}'));
    assert.ok(html.includes('["Upload a video", "Video hochladen", "Subir un vídeo"],'), 'the video card speaks German too');
});

test('For You: the shelf find folds to one line, opens on a tap', () => {
    const js = read('foryou.js'), css = read('foryou.css');
    assert.match(js, /closest\('\.fyb-gold'\); if \(!g\) return; g\.classList\.toggle\('fyb-open'\);/);
    assert.ok(css.includes('.fyb-gold:not(.fyb-open) .fyb-why,.fyb-gold:not(.fyb-open) .fyb-src,.fyb-gold:not(.fyb-open) .fyb-nums,.fyb-gold:not(.fyb-open) .fyb-img{display:none}'));
    assert.ok(css.includes('.fyb-slide .fyb-why{-webkit-line-clamp:2}'));
    assert.ok(read('community-rooms.css').includes('html.lw-bx-on #cmPaneChat .rm-fy .fy-rail,html.lw-bx-on #cmPaneChat .rm-fy .fy-meta{bottom:64px}'));
});
