'use strict';
/* Oct 23 (Eman, plantain chips 7862112310162): "I would like it so that they don't have to scroll down ... it's not a Pokémon,
   because that's already copyrighted. We use ... a metabolic bubble catch ... with a really nice animation. And they can only do
   this with insulin-friendly products ... I think we should focus more on just having a database of insulin-friendly" foods. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a); assert.ok(i >= 0, 'missing ' + a); const j = html.indexOf(b, i + a.length); assert.ok(j > i, 'missing end ' + b); return html.slice(i, j); };
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'\\])\/\/[^\n]*/g, '$1').replace(/<!--[\s\S]*?-->/g, '');

test('no Pokémon, Pokéball or Pokédex anywhere a user can read it', () => {
  const files = [path.join(root, 'index.html'), ...fs.readdirSync(root).filter(f => /\.(js|css|json)$/.test(f)).map(f => path.join(root, f))];
  for (const f of files) { const s = noComments(fs.readFileSync(f, 'utf8'));
    assert.doesNotMatch(s, /Pok[eé](mon|ball|dex)/i, path.basename(f) + ' still says Pokémon / Pokéball / Pokédex'); }
  assert.doesNotMatch(html, /b3-pb\b/, 'the Pokéball icon class is gone');
  assert.doesNotMatch(html, /#d8463a 0 46%,#1b1b1f/, 'no red/black/white ball on the catch button');
  assert.doesNotMatch(html, /#e9cb88 0 4[78]%,#1b1b1f/, 'no banded ball in the Bubble Dex');
  assert.match(html, /catch: \["Bubble catch", "Bubble-Fang", "Atrapar en burbuja"\]/);
  assert.match(html, /dex: \["Bubble Dex", "Bubble-Dex", "Bubble Dex"\]/);
});

test('the not-found sheet: compact one-screen layout, bubble catch and Don\'t save side by side', () => {
  const src = cut('function nfTick(k){', '/* prod-verdict');
  const T = { notFound: 'Not in any database yet', nfSub: 'Friendly foods get a bubble.', deepNf: 'Deep analyze', nfDeepS: 'LOWiSPIKE GPT', nfPh: 'Label photos', nfPhS: 'Nutrition + ingredients', orAdd: 'Or add it yourself', brandPh: 'Brand (optional)', nfQ: 'Tick what the label lists:', dontSave: "Don't save", catch: 'Bubble catch', noReach: 'No connection', noReachS: 'offline',
    m_sugar: 'Sugar or syrup (Zucker, Sirup, Dextrose, Honig)', m_sweet: 'Sweetener (Sucralose, Aspartam)', m_carb: 'Flour, rice, corn or potato near the top', m_none: 'None of these' };
  const ctx = { esc: s => String(s), t: k => T[k] || k, net: k => k, nameBoxHTML: () => '<div class="ne-box"><div class="ne-row-in"><input id="b3MName"><button class="ne-by ne-inl">Analyze</button></div></div>',
    deepLink: (c, a, ti, su) => '<a class="' + c + '" ' + a + '><b>' + ti + '</b><small>' + su + '</small></a>', lpAskHTML: () => '<div class="lp-ask"></div>' };
  vm.createContext(ctx); vm.runInContext(src + ';this.manualHTML=manualHTML;', ctx);
  const out = ctx.manualHTML({ barcode: '7862112310162' });
  assert.match(out, /class="b3-man nf2"/);
  assert.match(out, /<span class="nf-bc">7862112310162<\/span>Friendly foods get a bubble\./, 'barcode sits in the sub line');
  assert.match(out, /<div class="nf-row"><a class="b3-nfdeep b3-nftile"[^>]*><b>Deep analyze<\/b>.*?<button type="button" class="b3-nftile nf-ph" data-b3="lphoto">/, 'Deep analyze and Label photos share one row');
  /* Oct 25 (Emmanuel, plantain chips): online, the next step is a photo of the pack (same photo check as Snap food), not
     sugar / syrup / sweetener / starch ticks; the ticks + Bubble catch stay for offline, where no photo check can run */
  assert.match(out, /<label class="b3-nftile nf-ph nf-snap"[^>]*><input type="file" accept="image\/\*" capture="environment" id="b3NfSnap"/, 'online: Photo of the pack is the next step');
  assert.match(out, /<b>snap<\/b><small>snapS<\/small>/);
  assert.doesNotMatch(out, /data-k="sugar"|b3-ticks|id="b3MCatch"/, 'online: no ingredient ticks and no tick-based catch');
  assert.match(out, /<div class="nf-act"><button class="r2-link b3-skip" data-b3="close">Don't save<\/button><\/div>/, 'online: Don\'t save stays in the sticky footer');
  assert.doesNotMatch(out, /lp-ask/, 'the long label-photo box is a tile here');
  const off = ctx.manualHTML({ barcode: '1', offline: true });
  assert.match(off, /No connection/); assert.doesNotMatch(off, /nf-row/); assert.doesNotMatch(off, /b3NfSnap/, 'offline: no photo check offered');
  assert.match(off, /<div class="nf-act"><button class="r2-link b3-skip" data-b3="close">Don't save<\/button><button class="r2-btn pri big b3-catch" data-b3="mcatch" id="b3MCatch" disabled><span class="b3-bub" aria-hidden="true"><\/span>Bubble catch<\/button><\/div>/, 'offline: Don\'t save and Bubble catch side by side');
  assert.match(off, /data-k="sugar" aria-pressed="false" aria-label="Sugar or syrup \(Zucker, Sirup, Dextrose, Honig\)"><b>Sugar or syrup<\/b><small>Zucker, Sirup, Dextrose, Honig<\/small>/, 'offline: ticks are two-line chips');
  assert.match(off, /data-k="none"[^>]*><b>None of these<\/b><\/button>/);
  // CSS: sticky footer, small-screen squeeze, keyboard mode
  assert.match(html, /\.nf2 \.nf-act\{position:sticky;bottom:0;/);
  assert.match(html, /@media \(max-height:720px\)\{\.nf2 \.ne-exl,\.nf2 \.b3-or\{display:none\}/);
  assert.match(html, /\.b3-ov\.nfkb \.r2-sh\{max-height:calc\(100% - 8px\)\}/);
  assert.match(html, /function nfKb\(\)\{[\s\S]{0,400}ov\.style\.height = Math\.round\(vv\.height\) \+ "px"/);
});

test('only insulin-friendly products can be caught or published', () => {
  assert.match(cut('async function doCatch(p){', '\n}'), /if \(!p \|\| p\.verdict !== "ok"\) return \{pending:false, first:false, nocatch:true\}/);
  assert.match(html, /if \(p\.verdict !== "ok"\) throw new Error\("Only insulin-friendly products join the shared database\."\);/);
  assert.match(html, /const list = Object\.values\(D\.mine\)\.filter\(m => m\.pending && m\.id && m\.verdict === "ok"\);/);
  assert.match(html, /D\.comm = D\.comm\.filter\(x => x\.verdict === "ok"\);/);
  assert.match(html, /if \(p\.verdict !== "ok"\) \{ nfNoCatch\(Object\.assign\(\{\}, p, \{manual:man\}\)\); break; \}/, 'the sheet rates first and only catches green');
  assert.match(html, /if \(!mine && p\.verdict !== "ok" && p\.verdict !== "unknown"\) cat = noCatchHTML\(/, 'scan card: no catch button for yellow/spike');
  assert.match(html, /if \(!mine && p\.verdict !== "ok"\) return '<div class="b3-acts">' \+ noCatchHTML\(p\) \+ '<\/div>';/, 'full card: same');
  // noCatchHTML renders the reason and Skip
  const src = cut('function noCatchHTML(p, noSkip){', '\nfunction ');
  const ctx = { esc: s => String(s), t: k => ({ ncT: 'No bubble for this one', ncS: 'Only insulin-friendly foods go into a bubble.', ncSkip: 'Skip it' })[k], nameSwapHTML: () => '<div class="ne-swap">Try strawberries</div>' };
  vm.createContext(ctx); vm.runInContext(src + ';this.noCatchHTML=noCatchHTML;', ctx);
  const a = ctx.noCatchHTML({ verdict: 'spike', name: 'Plantain chips' });
  assert.match(a, /b3-nocatch v-spike/); assert.match(a, /No bubble for this one/); assert.match(a, /Try strawberries/); assert.match(a, /data-b3="skip">Skip it/);
  assert.doesNotMatch(ctx.noCatchHTML({ verdict: 'better' }, true), /data-b3="skip"/, 'no second Skip next to the bucket row');
  assert.doesNotMatch(ctx.noCatchHTML({ verdict: 'spike', nameEst: {} }), /ne-swap/, 'a name card already shows its swap');
  for (const k of ['ncT', 'ncS', 'ncSkip', 'nfSub', 'nfQ', 'nfPh', 'nfPhS', 'nfDeepS']) assert.match(html, new RegExp('\\n  ' + k + ': \\["[^"]+", "[^"]+", "[^"]+"\\],'), k + ' in English, German and Spanish');
});

test('the bubble catch animation runs while the catch is saved, and not with reduced motion', () => {
  const fx = cut('function bubbleFX(btn, p){', '\nfunction nfNoCatch');
  assert.match(fx, /if \(RM\(\) \|\| !btn \|\| !document\.body\.animate\) return Promise\.resolve\(\);/);
  assert.match(fx, /bc-bubble/); assert.match(fx, /bc-ring/); assert.match(fx, /bc-dot/);
  assert.match(html, /const fx = bubbleFX\(btn, p\);[^\n]*\n  const res = await doCatch\(p\); await fx;/);
  assert.match(html, /@media \(prefers-reduced-motion:reduce\)\{\.b3-bub,\.bc-bubble::before,\.b3-caught \.bc-pop\{animation:none!important\}\}/);
});

test('cleanup SQL for the shared database is a saved proposal for the owner', () => {
  const sql = fs.readFileSync(path.join(root, 'supabase/proposals/products_friendly_only_20261023.sql'), 'utf8');
  assert.match(sql, /FOR THE OWNER TO RUN/);
  assert.match(sql, /insert into private\.products_removed_20261023/, 'keeps a private copy first');
  assert.match(sql, /delete from public\.products where coalesce\(verdict, ''\) <> 'ok';/);
  assert.match(sql, /create trigger products_friendly_only before insert or update of verdict on public\.products/);
  assert.doesNotMatch(sql, /drop table|truncate|delete from public\.(?!products\b|product_catches\b)/i, 'never touches personal logs');
});
