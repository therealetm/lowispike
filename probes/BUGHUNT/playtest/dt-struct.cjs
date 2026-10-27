const D = require('./dt-lib.cjs');
(async () => {
    const h = await D.boot(process.argv[2] || 'chromium390');
    const kids = await h.page.evaluate(() => [...document.body.children].map(e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        return (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().replace(/\s+/g, '.') : '')).slice(0, 60) + ' pos=' + cs.position + ' disp=' + cs.display + ' z=' + cs.zIndex + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); }));
    console.log(kids.join('\n'));
    const p = await D.at(h, 'button', '');
    console.log('btn', p);
    const g = await D.dbl(h, 195, 300, 120);
    console.log(JSON.stringify(g));
    console.log(JSON.stringify(h.log));
    await h.browser.close(); h.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
