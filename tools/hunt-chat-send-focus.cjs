'use strict';
/* Bug hunt probe (Oct 23): in the Community chat, tap the field, type, tap Send, then type the next message straight away and tap
   Send again. Passes when focus stays on the field after each send (the keyboard stays up) and both messages land.
   node tools/hunt-chat-send-focus.cjs <device> [url|root] [lang] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1500);
  const mine = () => P.evaluate(() => [...document.querySelectorAll('#cmList .cm-msg.mine')].map(m => m.textContent.replace(/\s+/g, ' ')).join(' | '));
  const active = () => P.evaluate(() => document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null);
  const bad = [];
  await R.tap('#cmInput'); await H.sleep(500);
  for (const word of ['focus-one', 'focus-two', 'focus-three']) {
    if (await active() !== 'cmInput') { bad.push('field not focused before typing ' + word + ' (' + await active() + ')'); await R.tap('#cmInput'); await H.sleep(400); }
    await P.keyboard.type(word, { delay: 25 }); await H.sleep(400);
    await R.tap('#cmSend'); await H.sleep(1600);
    const a = await active(), m = await mine(), v = await P.evaluate(() => document.getElementById('cmInput').value);
    console.log('after sending', word, '| focus:', a, '| field:', JSON.stringify(v), '| landed:', m.includes(word));
    if (a !== 'cmInput') bad.push('focus left the field after sending ' + word + ' (' + a + ')');
    if (!m.includes(word)) bad.push(word + ' did not land');
    if (v) bad.push('field not cleared after ' + word);
  }
  await R.shot('/tmp/hunt/send-focus-' + device.replace(/\W/g, '') + '.png');
  console.log(JSON.stringify({ device, lang, pass: !bad.length && !R.errs.length && !R.crashed, bad, errs: R.errs, crashed: R.crashed }));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
