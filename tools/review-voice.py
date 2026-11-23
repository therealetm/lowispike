#!/usr/bin/env python3
"""Records the review ask (review-ask.js) in the tutorial's approved voices (tools/tutorial-voice/build.py, DECISIONS 24 Oct 2026).
Usage: python3 tools/review-voice.py   -> review-voice/<lang>.mp3. The words come from review-ask.js SAY so app and clip agree."""
import asyncio, json, os, subprocess
import edge_tts
APPROVED = {'en': 'en-US-AvaNeural', 'de': 'de-DE-SeraphinaMultilingualNeural', 'es': 'es-ES-XimenaNeural'}
PROXY = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy') or None
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SAY = json.loads(subprocess.check_output(['node', '-e', "process.stdout.write(JSON.stringify(require('./review-ask.js').SAY))"], cwd=ROOT))
async def main():
    for lang, voice in APPROVED.items():
        c = edge_tts.Communicate(SAY[lang], voice, rate='+0%', pitch='+0Hz', volume='+0%', proxy=PROXY)
        await c.save(os.path.join(ROOT, 'review-voice', lang + '.mp3'))
        print(lang, 'ok')
asyncio.run(main())
