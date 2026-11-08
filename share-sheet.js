/* LOWiSPIKE · share a post link (8 Nov 2026).
   Emmanuel: "when I go into my app and I try to copy it, nothing happens, it doesn't work". The phone's share sheet alone was not
   reliable inside the installed app, so Teilen opens this small card: the link to read, WhatsApp (opens WhatsApp with the text and the
   link), Link kopieren (copies in the same tap; if the phone refuses, the link is selected so a long-press copies it) and Mehr (the
   phone's own share sheet). */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiShareSheet) return;
  const H = D.documentElement, L = (en, de) => ((H.lang || 'de').slice(0, 2) === 'en' ? en : de);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let ov = null, cur = null;
  function close() { if (ov) { ov.remove(); ov = null; cur = null; } }
  function say(t) { const n = ov && ov.querySelector('.shs-msg'); if (n) n.textContent = t; }
  function copy() {
    const inp = ov && ov.querySelector('.shs-url'); if (!inp || !cur) return;
    const ok = () => say(L('Copied. Paste it in WhatsApp.', 'Kopiert. Einfach in WhatsApp einfügen.'));
    const manual = () => { try { inp.focus(); inp.select(); inp.setSelectionRange(0, 9999); const r = D.execCommand && D.execCommand('copy'); if (r) { ok(); return; } } catch (e) { }
      say(L('Hold the link and tap Copy.', 'Halte den Link gedrückt und tippe auf Kopieren.')); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(cur.url).then(ok, manual); return; } } catch (e) { }
    manual();
  }
  function open(o) {
    close(); cur = o || {}; if (!cur.url) return;
    const text = (cur.text ? cur.text + '\n' : '') + cur.url;
    ov = D.createElement('div'); ov.className = 'shs-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', L('Share', 'Teilen'));
    ov.innerHTML = '<div class="shs-card"><button type="button" class="shs-x" aria-label="' + L('Close', 'Schließen') + '">×</button>' +
      '<h3>' + L('Share this post', 'Post teilen') + '</h3>' +
      '<input class="shs-url" readonly value="' + esc(cur.url) + '" aria-label="Link">' +
      '<a class="shs-wa" href="https://wa.me/?text=' + encodeURIComponent(text) + '" target="_blank" rel="noopener">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.1-4.7-4.1-4.9-4.3-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.1 2.1 1.3.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.2 1.3z"/></svg>WhatsApp</a>' +
      '<button type="button" class="shs-copy">' + L('Copy link', 'Link kopieren') + '</button>' +
      /* Nov 8 2026 (roadmap 1): the post as a ready story picture, and its description with hashtags (story-card.js) */
      (cur.story && W.LowiStoryCard ? '<div class="shs-row"><button type="button" class="shs-story">' + L('Save as story', 'Als Story speichern') + '</button><button type="button" class="shs-desc">' + L('Copy description', 'Beschreibung kopieren') + '</button></div>' : '') +
      (navigator.share ? '<button type="button" class="shs-more">' + L('More…', 'Mehr…') + '</button>' : '') +
      '<p class="shs-msg" role="status"></p></div>';
    D.body.appendChild(ov);
  }
  D.addEventListener('click', e => {
    if (!ov) return; const t = e.target; if (!t || !t.closest) return;
    if (t === ov || t.closest('.shs-x')) { close(); return; }
    if (t.closest('.shs-copy')) { copy(); return; }
    if (t.closest('.shs-story') && cur && cur.story) {
      const b = t.closest('.shs-story'), st = cur.story; b.disabled = true; say(L('Making your story picture…', 'Dein Story-Bild wird gemacht…'));
      W.LowiStoryCard.save(Object.assign({ lang: L('en', 'de') }, st)).then(r => { b.disabled = false;
        say(r === 'fail' ? L('Could not make the picture.', 'Das Bild konnte nicht gemacht werden.') : r === 'cancel' ? '' : L('Done. Post it in your story.', 'Fertig. Jetzt in deiner Story posten.')); });
      return;
    }
    if (t.closest('.shs-desc') && cur && cur.story) {
      const txt = W.LowiStoryCard.caption(Object.assign({ url: cur.url }, cur.story), L('en', 'de'));
      try { navigator.clipboard.writeText(txt).then(() => say(L('Description copied.', 'Beschreibung kopiert.')), () => say(txt)); } catch (er) { say(txt); }
      return;
    }
    if (t.closest('.shs-more') && cur) { navigator.share({ title: cur.title || 'LOWiSPIKE', text: cur.text || '', url: cur.url }).catch(() => { }); return; }
    if (t.closest('.shs-url')) { try { t.select(); } catch (er) { } }
  });
  D.addEventListener('keydown', e => { if (ov && e.key === 'Escape') close(); });
  W.LowiShareSheet = { open, close };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
