await h.page.evaluate(() => { localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-0000000000aa', email: 'newuser@example.invalid' } })); localStorage.setItem('lowi.gate', 'done'); sessionStorage.setItem('lowi.a2hs.x','1'); });
await h.page.reload({ waitUntil: 'load' }); await L.sleep(7000);
const snap = await h.page.evaluate(() => { const s = (window.LowiR2 && LowiR2.S && LowiR2.S()) || {}; return { setupDone: s.setupDone, ledger: (s.ledger || []).map(x => x.eventId), txt: document.body.innerText.slice(0, 700), ob: !!document.getElementById('r2ob') }; });
return snap;
