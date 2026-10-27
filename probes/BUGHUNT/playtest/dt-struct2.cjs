const D = require('./dt-lib.cjs');
(async () => {
    const h = await D.boot(process.argv[2] || 'chromium390');
    const kids = await h.page.evaluate(() => [...document.getElementById('app').children].map(e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect();
        return (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().replace(/\s+/g, '.') : '')).slice(0, 70) + ' pos=' + cs.position + ' disp=' + cs.display + ' z=' + cs.zIndex + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); }));
    console.log(kids.join('\n'));
    await h.browser.close(); h.srv.close();
})().catch(e => { console.error(e); process.exit(1); });
