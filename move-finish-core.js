/* move-finish-core.js: what finishing a Move session is worth, and the words of its finish celebration (MAYA-HANDOFF 0.37, Mon 26 Oct 2026).
   Emmanuel: "This should be giving me the most points ever. The most points that can be reached should be finishing one of those
   movements. And then the animation should be grandiose."
   - The reward: a session that really ran at least MIN_MIN minutes pays BASE + PER_MIN per minute moved, counting at most MAX_MIN
     minutes (no reward for overdoing it), for at most PER_DAY sessions a day (LowiHost.award perDay). Minutes are the time that really
     ran: the Move player's moved seconds (paused or skipped blocks never count), Mirror mode's and Kreuzheben's running time.
     3 min = 165 XP, 5 = 175, 10 = 200, 20 = 250, 30 = 300, 60 = 450. The biggest any other single action pays is TOP_OTHER
     (a Pathfinder scan, PF_XP 100); tests/move-finish.test.cjs reads the app's award() calls and keeps every one of them below xpFor(MIN_MIN).
   - Sunbeams/Ranking: the session is one 'move:session' ledger entry, which sun-meter.js already rates as a Move (+4, the most of any single
     action), so the sun and Ranking stay as they are.
   - The words: EN/DE/ES, the companion's own name (never a fixed name), three shuffled spoken lines per language (recorded voice,
     tools/app-voice/phrases.cjs reads SAY), none of them with a number or a name in it so every one has a clip.
   Pure: shared by move-finish.js, index.html's Move player, mirror-move.js and the tests through module.exports. */
(function (root) {
    'use strict';
    const BASE = 150, PER_MIN = 5, MIN_MIN = 3, MAX_MIN = 60, PER_DAY = 3, TOP_OTHER = 100;
    const L = l => { l = String(l || 'en').slice(0, 2).toLowerCase(); return l === 'de' || l === 'es' ? l : 'en'; };
    /* whole minutes from seconds that really ran (the Move player rounds the same way) */
    const minutesOf = sec => Math.max(0, Math.round((+sec || 0) / 60));
    /* XP for one finished session; 0 when it was too short to count */
    function xpFor(min) {
        min = Math.floor(+min || 0);
        if (!(min >= MIN_MIN)) return 0;
        return BASE + PER_MIN * Math.min(MAX_MIN, min);
    }
    /* the count-up: 0..1 eased (ease-out cubic) */
    const ease = p => { p = Math.max(0, Math.min(1, +p || 0)); return 1 - Math.pow(1 - p, 3); };
    const countAt = (ms, total, dur) => Math.round(ease((+ms || 0) / (dur || 1)) * (+total || 0));

    const TXT = {
        title: { en: 'Done!', de: 'Geschafft!', es: '¡Lo lograste!' },
        capTitle: { en: 'Done!', de: 'Geschafft!', es: '¡Hecho!' },
        min: { en: '{n} min moved', de: '{n} Min bewegt', es: '{n} min de movimiento' },
        min1: { en: '1 min moved', de: '1 Min bewegt', es: '1 min de movimiento' },
        xp: { en: 'XP', de: 'XP', es: 'XP' },
        biggest: { en: 'The biggest reward in the app', de: 'Die größte Belohnung in der App', es: 'La mayor recompensa de la app' },
        capped: { en: 'Today\'s 3 big Move rewards are collected. This one still counts for your week.', de: 'Die 3 großen Bewegungs-Belohnungen für heute hast du schon. Diese zählt trotzdem für deine Woche.', es: 'Ya tienes las 3 grandes recompensas de movimiento de hoy. Esta sigue contando para tu semana.' },
        glow: [
            { en: '{name} is glowing with you', de: '{name} leuchtet mit dir', es: '{name} brilla contigo' },
            { en: '{name} felt every minute of that', de: '{name} hat jede Minute mitgefühlt', es: '{name} sintió cada minuto' },
            { en: '{name} is doing a happy loop', de: '{name} dreht vor Freude eine Runde', es: '{name} da una vuelta de alegría' }
        ],
        more: { en: 'Continue', de: 'Weiter', es: 'Continuar' },
        dialog: { en: 'Session done', de: 'Einheit geschafft', es: 'Sesión hecha' },
        tap: { en: 'Tap anywhere to continue', de: 'Tippe irgendwo, um weiterzumachen', es: 'Toca en cualquier sitio para seguir' }
    };
    /* spoken by the companion (recorded clips; no numbers or names so every sentence has its clip) */
    const SAY = {
        en: ['You did it! That was the best move of your day.', 'Session done! I am glowing with you.', 'Look at you go! I felt every minute of that.'],
        de: ['Geschafft! Das war die beste Bewegung deines Tages.', 'Einheit geschafft! Ich leuchte mit dir.', 'Wow, schau dich an! Ich habe jede Minute mitgefühlt.'],
        es: ['¡Lo lograste! Fue el mejor movimiento de tu día.', '¡Sesión hecha! Estoy brillando contigo.', '¡Mírate! Sentí cada minuto.']
    };
    const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
    const t = (k, lang, o) => { const v = TXT[k]; return fill(v[L(lang)] || v.en, o); };
    /* everything the celebration shows, for one finish; pick (0..2) shuffles the companion line and the spoken line */
    function words(o) {
        o = o || {}; const lang = L(o.lang), n = Math.max(0, Math.floor(+o.min || 0)), xp = Math.max(0, Math.floor(+o.xp || 0));
        const pick = ((Math.floor(+o.pick || 0) % 3) + 3) % 3, name = String(o.name || '').trim();
        return {
            lang, xp, min: n, capped: !xp && n >= MIN_MIN,
            title: t(xp ? 'title' : 'capTitle', lang),
            minutes: n === 1 ? t('min1', lang) : t('min', lang, { n }),
            glow: name ? fill(TXT.glow[pick][lang], { name }) : '',
            note: xp ? t('biggest', lang) : (n >= MIN_MIN ? t('capped', lang) : ''),
            more: t('more', lang), dialog: t('dialog', lang), tap: t('tap', lang), xpWord: t('xp', lang),
            say: SAY[lang][pick]
        };
    }
    const api = { BASE, PER_MIN, MIN_MIN, MAX_MIN, PER_DAY, TOP_OTHER, minutesOf, xpFor, ease, countAt, words, SAY, TXT, t, L };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiMoveFinishCore = api;
})(typeof window !== 'undefined' ? window : null);
