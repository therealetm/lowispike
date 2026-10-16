/* LOWiSPIKE For You (in Cook): shared videos play right in the feed (Oct 16, 2026)
   Tapping a shared YouTube, TikTok, Instagram or Vimeo post (the play button or the source line) opens the
   platform's own official embedded player inside that slide, instead of leaving the app. The like/comment rail
   and the caption stay where they are. Only when a post cannot be embedded (a plain web link, a TikTok photo
   post, a short link that cannot be resolved) does the legacy handler open it outside, as before; an embedded
   player always shows a small "Open on ..." link as the fallback too.
   A thin layer over the legacy TRIBE feed: it listens in the capture phase for [data-tr="open"] inside #fyFeed
   and edits no legacy module. Sample posts keep their legacy "sample post" note. */
(function () {
    'use strict';
    const W = window, D = document;
    if (W.LowiFyEmbed) return;
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || D.documentElement.lang || 'en').slice(0, 2); } catch (e) { return 'en'; } };
    const T = (en, de, es) => ({ de, es })[lang()] || en;
    const NAME = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', vimeo: 'Vimeo' };

    /* ---------- which official player a link gets (pure, tested) ---------- */
    function parse(u) { try { return new URL(String(u || '').trim()); } catch (e) { return null; } }
    function seconds(t) {
        if (!t) return 0; if (/^\d+$/.test(t)) return +t;
        const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
    }
    function ytSrc(id, start) {
        return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&playsinline=1&rel=0&modestbranding=1' + (start ? '&start=' + start : '');
    }
    function ttSrc(id) {
        return 'https://www.tiktok.com/player/v1/' + id + '?autoplay=1&music_info=1&description=1&rel=0&native_context_menu=0';
    }
    /* returns {plat, src, ar} for an embeddable link, {plat:'tiktok', resolve:true} for a TikTok short link, or null */
    function embedFor(url) {
        const u = parse(url); if (!u || !/^https?:$/.test(u.protocol)) return null;
        const h = u.hostname.replace(/^(www|m|mobile)\./, '').toLowerCase(), path = u.pathname;
        let m;
        if (h === 'youtu.be' || h === 'youtube.com' || h === 'youtube-nocookie.com' || h === 'music.youtube.com') {
            const start = seconds(u.searchParams.get('t') || u.searchParams.get('start') || '');
            let id = '', shorts = false;
            if (h === 'youtu.be') id = path.slice(1).split('/')[0];
            else if ((m = /^\/(shorts|embed|live|v)\/([\w-]{11})/.exec(path))) { id = m[2]; shorts = m[1] === 'shorts'; }
            else id = u.searchParams.get('v') || '';
            return /^[\w-]{11}$/.test(id) ? { plat: 'youtube', src: ytSrc(id, start), ar: shorts ? 9 / 16 : 16 / 9 } : null;
        }
        if (h === 'tiktok.com') {
            if ((m = /\/(?:video|v|embed\/v2|player\/v1|embed)\/(\d{8,})/.exec(path))) return { plat: 'tiktok', src: ttSrc(m[1]), ar: 9 / 16 };
            if (/^\/t\/\w+/.test(path)) return { plat: 'tiktok', resolve: true, ar: 9 / 16 };
            return null; /* photo posts, profiles, sounds: not a video player */
        }
        if (h === 'vm.tiktok.com' || h === 'vt.tiktok.com') return { plat: 'tiktok', resolve: true, ar: 9 / 16 };
        if (h === 'instagram.com') {
            if ((m = /^\/(p|reel|reels|tv)\/([\w-]+)/.exec(path))) {
                const kind = m[1] === 'p' ? 'p' : m[1] === 'tv' ? 'tv' : 'reel';
                return { plat: 'instagram', src: 'https://www.instagram.com/' + kind + '/' + m[2] + '/embed/', ar: kind === 'p' ? 0.8 : 0.62 };
            }
            return null;
        }
        if (h === 'vimeo.com' || h === 'player.vimeo.com') {
            if ((m = /^\/(?:video\/)?(\d{5,})(?:\/([\da-f]{6,}))?/.exec(path))) {
                const hash = m[2] || u.searchParams.get('h') || '';
                return { plat: 'vimeo', src: 'https://player.vimeo.com/video/' + m[1] + '?autoplay=1&playsinline=1&dnt=1' + (hash ? '&h=' + hash : ''), ar: 16 / 9 };
            }
            return null;
        }
        return null;
    }
    /* a TikTok short link (vm.tiktok.com/...) has no video id in it: TikTok's own oEmbed answer carries it */
    function resolveTikTok(url) {
        const ctl = W.AbortController ? new AbortController() : null, timer = setTimeout(() => { if (ctl) ctl.abort(); }, 5000);
        return fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url), ctl ? { signal: ctl.signal } : {})
            .then(r => r.ok ? r.json() : null)
            .then(j => { const id = j && (j.embed_product_id || (/data-video-id="(\d+)"/.exec(j.html || '') || [])[1]); return id && /^\d{8,}$/.test(String(id)) ? ttSrc(String(id)) : ''; })
            .catch(() => '').finally(() => clearTimeout(timer));
    }

    /* ---------- the player inside a slide ---------- */
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const ICO = {
        x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/></svg>'
    };
    let io = null;
    function closeIn(slide) {
        if (!slide) return; const box = slide.querySelector(':scope > .fye');
        if (box) { const f = box.querySelector('iframe'); if (f) f.src = 'about:blank'; box.remove(); }
        slide.classList.remove('fye-on', 'fye-tall'); if (io) io.unobserve(slide);
    }
    function closeAll(except) { D.querySelectorAll('.fy-slide.fye-on').forEach(s => { if (s !== except) closeIn(s); }); }
    /* the free space of the slide: under the floating header, above the caption, left of the like rail */
    function place(slide) {
        const box = slide.querySelector(':scope > .fye'); if (!box) return;
        const sr = slide.getBoundingClientRect(); if (!sr.width || !sr.height) return;
        const meta = slide.querySelector('.fy-meta'), rail = slide.querySelector('.fy-rail');
        const layer = slide.closest('.nm-layer'), head = layer && layer.querySelector('.nm-head, .nm-top, header');
        const sat = parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--sat')) || 0;
        let top = Math.max(12, sat + 12), bottom = 120, right = 12;
        if (head) { const hr = head.getBoundingClientRect(); if (hr.height && hr.bottom > sr.top) top = Math.max(top, hr.bottom - sr.top + 10); }
        if (rail) { const rr = rail.getBoundingClientRect(); if (rr.width) right = Math.max(12, sr.right - rr.left + 8); }
        /* bar: the 44 px glass buttons + the 8 px gap above them */
        const left = 12, ar = +box.dataset.ar || 16 / 9, availW = Math.max(120, sr.width - left - right);
        const barEl = box.querySelector('.fye-bar'); let bar = 52;
        const fit = b => { const aH = Math.max(96, sr.height - top - b - bar); let w = availW, h = w / ar; if (h > aH) { h = aH; w = h * ar; } return { w, h, aH }; };
        let mb = bottom; slide.classList.remove('fye-tall');
        if (meta) { const mr = meta.getBoundingClientRect(); if (mr.height) { bottom = Math.max(16, sr.bottom - mr.top + 10); mb = Math.max(16, sr.bottom - mr.bottom + 8); } }
        let f = fit(bottom);
        /* a tall player (TikTok, Shorts, Reels) on a short screen: the caption steps aside so the video gets its room */
        if (ar < 1 && f.h < sr.height * 0.55 && mb < bottom) { f = fit(mb); slide.classList.add('fye-tall'); }
        const tall = slide.classList.contains('fye-tall'), apply = () => {
            const availH = f.aH; const w = Math.round(f.w), h = Math.round(f.h), bx = Math.round(left + (availW - w) / 2);
            box.style.left = bx + 'px'; box.style.top = Math.round(top + Math.max(0, (availH - h) / 2)) + 'px';
            box.style.width = w + 'px'; box.querySelector('.fye-frame').style.height = h + 'px';
            /* the buttons may use the whole free column (left edge to the like rail), centred under the player */
            if (barEl) { barEl.style.width = Math.round(availW) + 'px'; barEl.style.marginLeft = (left - bx) + 'px'; }
        };
        apply();
        if (barEl) {
            box.classList.remove('fye-narrow');
            if (barEl.offsetHeight > 48) box.classList.add('fye-narrow');
            /* still two rows: reserve their real height so they never reach the caption */
            if (barEl.offsetHeight > 48) { bar = barEl.offsetHeight + 8; f = fit(tall ? mb : bottom); apply(); }
        }
    }
    function frameHTML(emb) {
        return '<iframe class="fye-if" src="' + esc(emb.src) + '" title="' + esc(T('Video on ', 'Video auf ', 'V\u00eddeo en ') + NAME[emb.plat]) + '" ' +
            'allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share" allowfullscreen ' +
            'referrerpolicy="strict-origin-when-cross-origin" loading="eager"></iframe>';
    }
    function openIn(slide, p, emb) {
        closeAll(slide); closeIn(slide);
        const name = NAME[emb.plat] || T('the web', 'im Web', 'la web');
        const box = D.createElement('div'); box.className = 'fye fye-' + emb.plat; box.dataset.ar = String(emb.ar || 16 / 9); box.setAttribute('data-noi18n', '');
        box.innerHTML = '<div class="fye-frame"><div class="fye-load" role="status"><span class="fye-spin" aria-hidden="true"></span>' + esc(T('Loading video\u2026', 'Video l\u00e4dt\u2026', 'Cargando v\u00eddeo\u2026')) + '</div>' + (emb.src ? frameHTML(emb) : '') + '</div>' +
            '<div class="fye-bar"><button type="button" class="fye-btn fye-x" aria-label="' + esc(T('Close video', 'Video schlie\u00dfen', 'Cerrar v\u00eddeo')) + '">' + ICO.x + '<span>' + esc(T('Close', 'Schlie\u00dfen', 'Cerrar')) + '</span></button>' +
            '<a class="fye-btn fye-out" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' + esc(T('Open on ', '\u00d6ffnen auf ', 'Abrir en ') + name) + ICO.out + '</a></div>';
        slide.appendChild(box); slide.classList.add('fye-on');
        const wire = () => { const f = box.querySelector('iframe'); if (f) f.addEventListener('load', () => { if (f.src !== 'about:blank') box.classList.add('fye-ready'); }, { once: true }); };
        wire(); place(slide); requestAnimationFrame(() => box.classList.add('fye-in'));
        if (!io && W.IntersectionObserver) io = new IntersectionObserver(es => es.forEach(en => { if (en.intersectionRatio < 0.5) closeIn(en.target); }), { threshold: [0, 0.5] });
        if (io) io.observe(slide);
        if (!emb.src && emb.resolve) {
            resolveTikTok(p.url).then(src => {
                if (!box.isConnected) return;
                if (src) { box.querySelector('.fye-frame').insertAdjacentHTML('beforeend', frameHTML({ plat: emb.plat, src })); wire(); }
                else { box.classList.add('fye-fail'); const l = box.querySelector('.fye-load'); if (l) l.innerHTML = esc(T('This video can\u2019t play here. Open it on ', 'Dieses Video l\u00e4uft hier nicht. \u00d6ffne es auf ', 'Este v\u00eddeo no se puede ver aqu\u00ed. \u00c1brelo en ') + name + '.'); }
            });
        }
        try { const ld = W.FYV && D.querySelectorAll('video.fyv-v'); if (ld) ld.forEach(v => { try { v.pause(); } catch (e) {} }); } catch (e) {}
    }

    /* ---------- taps ---------- */
    function post(id) { try { return W.TRIBE && W.TRIBE.post ? W.TRIBE.post(id) : null; } catch (e) { return null; } }
    D.addEventListener('click', e => {
        const t = e.target; if (!t || !t.closest) return;
        const x = t.closest('.fye-x'); if (x) { e.preventDefault(); e.stopPropagation(); closeIn(x.closest('.fy-slide')); return; }
        if (t.closest('.fye')) { e.stopPropagation(); return; } /* taps on the player never like or open anything behind it */
        const b = t.closest('[data-tr="open"]'); if (!b) return;
        const slide = b.closest('.fy-slide[data-id]'); if (!slide || !slide.closest('#fyFeed')) return;
        const p = post(b.dataset.id || slide.dataset.id); if (!p || !p.url || p.demo || p.vid) return; /* legacy: sample note, uploads */
        if (W.navigator && W.navigator.onLine === false) return; /* offline: legacy behaviour */
        const emb = embedFor(p.url); if (!emb) return; /* cannot embed: the legacy handler opens it outside */
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        openIn(slide, p, emb);
    }, true);
    D.addEventListener('dblclick', e => { if (e.target && e.target.closest && e.target.closest('.fye')) e.stopPropagation(); }, true);
    let rq = 0;
    W.addEventListener('resize', () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(() => D.querySelectorAll('.fy-slide.fye-on').forEach(place)); });
    D.addEventListener('visibilitychange', () => { if (D.hidden) closeAll(null); });

    W.LowiFyEmbed = { embedFor, open: openIn, close: closeIn, closeAll, place };
})();
