const st = async (f) => { await f(); await L.sleep(1600); };
await st(() => C("text=Say hi")); await st(() => C("text=Got it")); await st(() => C("text=Next"));
await page.fill("#hsYou", "Ana"); await st(() => C("text=Nice to meet you")); await L.sleep(1500);
await st(() => C("button.r2-btn.pri")); await L.sleep(1000);
await page.evaluate(() => { localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-0000000000aa', email: 'newuser@example.invalid' } })); localStorage.setItem('lowi.gate', 'done'); sessionStorage.setItem('lowi.a2hs.x','1'); });
const p2 = await ctx.newPage(); p2.on('pageerror', e => h.log.pageerror.push(String(e.message).slice(0,300))); h.page.close({runBeforeUnload:false}).catch(()=>{}); h.page = p2; page = p2; await p2.goto(h.url, { waitUntil: 'load', timeout: 60000 }); await L.sleep(7000);
await page.fill("#r2obB", "1994-05-12"); await page.dispatchEvent("#r2obB", "change"); await L.sleep(600);
await st(() => C("text=Next")); await L.sleep(1200); await st(() => C("button.lc-cta")); await L.sleep(1000);
return (await S('p-photo')).text.slice(-120);
