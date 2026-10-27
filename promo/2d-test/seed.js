(() => { try {
  if (sessionStorage.getItem('p6.seeded')) return; sessionStorage.setItem('p6.seeded', '1');
  const now = Date.now();
  localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Connie', bday: '1993-06-14' }, xp: 2400, settings: { lang: 'en' }, ledger: [], logs: [], saved: [] }));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({ v: 1, bday: '1993-06-14', btime: '08:30', n: 0, name: 'Nova', created: 1 }));
  localStorage.setItem('lowispike.companionprefs.v1', JSON.stringify({ share: true, traits: true, born: now - 20 * 86400e3 }));
  localStorage.setItem('lowi.pad.hint', '1'); localStorage.setItem('lowi.wh.hint.v1', '{"travelled":1,"opens":9}'); localStorage.setItem('lowi.hint.holdCommunity', '1'); localStorage.setItem('lowi.hint.communityHold', '1');
  localStorage.setItem('lowispike.tutorial-auto.v1', JSON.stringify({ s: 'done' })); localStorage.setItem('lowi.g1.auto', '1');
} catch (e) { } })();
