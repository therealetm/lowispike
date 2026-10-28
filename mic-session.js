/* Oct 28 2026 mic fix (owner: "wieso funktioniert das Mikrofon nicht?").
   Root cause: the sound unlock in index.html sets navigator.audioSession.type = 'ambient' on the first tap so app sounds mix with
   the user's music. On iPhone / iPad WebKit that is a category override (AVAudioSessionCategoryAmbient), and while an override is
   set WebKit never switches the session to PlayAndRecord for capture (AudioSession::setCategory returns early). Ambient has no
   input, so getUserMedia and the speech recognition both failed straight away, without the iOS permission prompt, and the app
   showed "Mikrofon ist aus". Every mic now calls LowiMicSession.begin() synchronously inside the tap, before getUserMedia or
   SpeechRecognition.start(), which puts the session back to 'auto' (WebKit then picks PlayAndRecord for capture), and end() when
   the mic is released, which restores 'ambient' if the app had set it. The sound unlock asks LowiMicSession.ambient() instead of
   writing the type itself, so it can never flip the session back to ambient in the middle of a recording. */
(function (W) {
    'use strict';
    if (W.LowiMicSession) return;
    var N = W.navigator || {}, holds = 0, wantAmbient = false, restoreT = 0;
    function as() { try { return N.audioSession || null; } catch (e) { return null; } }
    function setType(t) { var s = as(); if (!s) return false; try { if (s.type !== t) s.type = t; return true; } catch (e) { return false; } }
    var API = {
        /* called by the sound unlock instead of audioSession.type = 'ambient' */
        ambient: function () { wantAmbient = true; if (!holds) setType('ambient'); },
        /* call synchronously in the tap, before getUserMedia / SpeechRecognition.start() */
        begin: function () { holds++; clearTimeout(restoreT); setType('auto'); return API; },
        /* call once per begin() when the mic is released (stopped, cancelled or failed) */
        end: function () {
            if (holds > 0) holds--;
            if (holds) return;
            clearTimeout(restoreT);
            /* small delay: WebKit tears the capture unit down asynchronously after track.stop() */
            restoreT = setTimeout(function () { if (!holds && wantAmbient) setType('ambient'); }, 400);
        },
        active: function () { return holds > 0; },
        type: function () { var s = as(); return s ? s.type : null; },
        /* 'granted' | 'denied' | 'prompt' | null (unknown). Only a real 'denied' may show the "Mikrofon ist aus" help. */
        permission: function () {
            try {
                if (!N.permissions || !N.permissions.query) return Promise.resolve(null);
                return N.permissions.query({ name: 'microphone' }).then(function (r) { return r && r.state || null; }, function () { return null; });
            } catch (e) { return Promise.resolve(null); }
        }
    };
    W.LowiMicSession = API;
})(window);
