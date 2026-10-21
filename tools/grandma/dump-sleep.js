new Promise(done => {
  const s = document.querySelector('[data-orbit="sleep"]'); s && s.click();
  setTimeout(() => {
    const R = e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round).join(','); };
    const out = ['vh=' + innerHeight];
    document.querySelectorAll('.ss2-fan button').forEach(b => out.push('chip ' + R(b)));
    document.querySelectorAll('[data-orbit]').forEach(b => out.push(b.dataset.orbit + ' ' + R(b)));
    out.push('ask ' + !!document.querySelector('.ss2-ask'));
    done(out.join(' ; '));
  }, 1200);
})
