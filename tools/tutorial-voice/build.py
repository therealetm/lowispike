#!/usr/bin/env python3
"""Records the tutorial's voice clips (tutorial-voice.js reads them; TUTORIAL.md "Voice").

Usage:  python3 tools/tutorial-voice/build.py            # records only cards whose words changed, removes clips no card uses
        python3 tools/tutorial-voice/build.py --all      # records everything again
Needs:  pip install --user edge-tts   (Microsoft's neural voices; the clips are committed, so the app needs nothing at runtime)

What is said for each card comes from tutorial-voice.js spoken() (via node), so the app and the clips can never disagree about the
words. Writes tutorial-voice/<lang>/<key>.mp3 and tutorial-voice-data.js (per clip: file, hash, the exact words said, length and
each word's start in ms with its place in the words). tests/tutorial-voice.test.cjs fails when a card's words and its clip differ.
"""
import asyncio, hashlib, json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'tutorial-voice')
DATA = os.path.join(ROOT, 'tutorial-voice-data.js')
SIDE = '/tmp/lowi-tutorial-voice'  # each clip's timings as soon as it is recorded, so an interrupted run picks up where it stopped


def plan():
    js = ("const V=require('./tutorial-voice.js'),S=require('./tutorial-steps.js');"
          "process.stdout.write(JSON.stringify({voices:V.VOICES,plan:V.plan(S.STEPS)}))")
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def load_old():
    if not os.path.exists(DATA):
        return {}
    js = "global.window=undefined;const d=require('./tutorial-voice-data.js');process.stdout.write(JSON.stringify(d.clips||{}))"
    try:
        return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))
    except Exception:
        return {}


def locate(text, words):
    """each spoken word's [start ms, char start, char end] in text"""
    out, pos = [], 0
    for ms, w in words:
        i = text.find(w, pos)
        if i < 0:
            i = text.lower().find(w.lower(), pos)
        if i < 0:
            continue
        out.append([ms, i, i + len(w)])
        pos = i + len(w)
    return out


async def record(voice, text, path):
    import edge_tts
    for attempt in range(4):
        try:
            com = edge_tts.Communicate(text, voice, boundary='WordBoundary')
            words, audio = [], bytearray()
            async for ch in com.stream():
                if ch['type'] == 'audio':
                    audio.extend(ch['data'])
                elif ch['type'] == 'WordBoundary':
                    words.append((round(ch['offset'] / 10000), ch['text']))
            if not audio:
                raise RuntimeError('no audio')
            with open(path, 'wb') as f:
                f.write(audio)
            return words
        except Exception as e:  # network hiccup: try again
            if attempt == 3:
                raise
            await asyncio.sleep(2 + attempt * 2)


def duration_ms(path):
    try:
        o = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path])
        return round(float(o.strip()) * 1000)
    except Exception:  # no ffprobe: stop instead of writing d = 0 (the voice test fails on it; Oct 22 2026)
        sys.exit('ffprobe is needed for clip lengths: sudo apt-get install -y ffmpeg')


async def main():
    every = '--all' in sys.argv
    p = plan()
    voices, old = p['voices'], load_old()
    clips, made, kept = {}, 0, 0
    todo = []
    for item in p['plan']:
        lang, key, text = item['lang'], item['key'], item['s']
        voice = voices[lang]
        h = hashlib.sha1((voice + '\n' + text).encode('utf-8')).hexdigest()[:10]
        fname = key.replace('~', '_') + '.mp3'
        path = os.path.join(OUT, lang, fname)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        prev = old.get(lang, {}).get(key)
        if not every and prev and prev.get('h') == h and os.path.exists(path):
            clips.setdefault(lang, {})[key] = prev
            kept += 1
            continue
        side = os.path.join(SIDE, '%s-%s-%s.json' % (lang, fname, h))
        if not every and os.path.exists(side) and os.path.exists(path):  # recorded by an earlier, interrupted run
            clips.setdefault(lang, {})[key] = json.load(open(side))
            kept += 1
            continue
        todo.append((lang, key, text, voice, h, fname, path))
    sem = asyncio.Semaphore(4)

    async def one(lang, key, text, voice, h, fname, path):
        async with sem:
            words = await record(voice, text, path)
        clips.setdefault(lang, {})[key] = c = {'f': fname, 'h': h, 's': text, 'd': duration_ms(path), 'w': locate(text, words)}
        os.makedirs(SIDE, exist_ok=True)
        with open(os.path.join(SIDE, '%s-%s-%s.json' % (lang, fname, h)), 'w') as f:
            json.dump(c, f, ensure_ascii=False)
        print('recorded', lang, key, len(text), 'chars', flush=True)
    await asyncio.gather(*(one(*t) for t in todo))
    made = len(todo)
    todo = []
    # clips no card uses any more
    used = {(l, c['f']) for l, m in clips.items() for c in m.values()}
    for lang in os.listdir(OUT):
        d = os.path.join(OUT, lang)
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            if (lang, f) not in used:
                os.remove(os.path.join(d, f))
                print('removed', lang, f)
    body = {'voices': voices, 'clips': {l: dict(sorted(clips[l].items())) for l in sorted(clips)}}
    js = ('/* tutorial-voice-data.js: GENERATED by tools/tutorial-voice/build.py, do not edit by hand. The tutorial\'s recorded voice:\n'
          '   per language and card, f = clip file in tutorial-voice/<lang>/, h = hash of voice + words, s = the exact words said,\n'
          '   d = length in ms, w = [start ms, first char, end char] for each word (the card lights up the word being said). */\n'
          '(function (root) {\n    const DATA = ' + json.dumps(body, ensure_ascii=False, separators=(',', ':')) + ';\n'
          "    if (typeof module === 'object' && module.exports) module.exports = DATA;\n"
          '    if (root) root.LowiTutorialVoiceData = DATA;\n'
          "})(typeof window !== 'undefined' ? window : null);\n")
    with open(DATA, 'w', encoding='utf-8') as f:
        f.write(js)
    print('clips: %d recorded, %d unchanged' % (made, kept))


if __name__ == '__main__':
    asyncio.run(main())
