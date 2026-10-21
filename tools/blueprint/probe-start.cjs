/* Quick size probe for the Affiliates start screen: does it fit one screen? node tools/blueprint/probe-start.cjs [url] */
const { webkit, devices } = require('/tmp/pw/node_modules/playwright');
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8799/affiliates/';
  const b = await webkit.launch();
  for (const d of ['iPhone SE', 'iPhone 13', 'iPad (gen 7)']) {
    const c = await b.newContext({ ...devices[d] }); const p = await c.newPage();
    await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ vh: innerHeight, doc: document.documentElement.scrollHeight, h1: Math.round(document.querySelector('#startTitle').getBoundingClientRect().height), lead: Math.round(document.querySelector('#startLead').getBoundingClientRect().height), btn: Math.round(document.querySelector('#startBtn').getBoundingClientRect().bottom), fab: Math.round(document.querySelector('#fabEarn').getBoundingClientRect().top), link: Math.round(document.querySelector('#linkLine').getBoundingClientRect().bottom) }));
    console.log(d, JSON.stringify(r)); await c.close();
  }
  await b.close();
})();
