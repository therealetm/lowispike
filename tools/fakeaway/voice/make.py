#!/usr/bin/env python3
"""Nov 8 2026: the spoken cooking guides of the Weekly Challenge (Emmanuel: "almost like your grandma talking to you through how
you're supposed to prepare the food ... it's important that it's not just text to speech, but it's a script"). The scripts are
written by hand in scripts.json (no exact amounts: those change with the number of people and stay on the screen). This turns them
into media/challenge/<recipe>-<lang>.mp3 and writes challenge-voice-data.js (file, a hash of the script, the script itself).
Run: python3 tools/fakeaway/voice/make.py  (needs edge_tts and network)."""
import asyncio, hashlib, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
VOICES = {'de': 'de-DE-SeraphinaMultilingualNeural', 'en': 'en-US-AvaNeural'}
RATE = '-6%'
async def main():
    import edge_tts
    S = json.load(open(os.path.join(HERE, 'scripts.json'), encoding='utf-8'))
    out = {}
    for lang, rec in S.items():
        out[lang] = {}
        for rid, text in rec.items():
            h = hashlib.sha1(text.encode('utf-8')).hexdigest()[:10]
            f = 'media/challenge/' + rid + '-' + lang + '.mp3'
            p = os.path.join(ROOT, f)
            if not os.path.exists(p) or '--all' in sys.argv:
                c = edge_tts.Communicate(text, VOICES[lang], rate=RATE)
                px = os.environ.get('HTTPS_PROXY')
                if px: c.proxy = px
                await c.save(p)
            out[lang][rid] = {'f': f, 'h': h, 's': text}
    js = ('/* built by tools/fakeaway/voice/make.py from scripts.json: do not edit by hand */\n'
          '(function (root) { const DATA = ' + json.dumps(out, ensure_ascii=False) + ';\n'
          'if (typeof module === "object" && module.exports) module.exports = DATA; else root.LOWI_CHALLENGE_VOICE = DATA; })(typeof self !== "undefined" ? self : this);\n')
    open(os.path.join(ROOT, 'challenge-voice-data.js'), 'w', encoding='utf-8').write(js)
    print('ok', {k: len(v) for k, v in out.items()})
asyncio.run(main())
