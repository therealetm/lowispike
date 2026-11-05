#!/usr/bin/env python3
"""Resolve an index.html rebase conflict that only comes from main's release bumping every ?v= : take main's block and add the
Misty sheet scripts (misty-sheet-core.js, misty-sheet.js, misty-history.js) right before adventure-tiers.js with main's version."""
import re, sys
p = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
s = open(p).read()
FILES = ['misty-sheet-core.js', 'misty-sheet.js', 'misty-history.js']
while True:
    m = re.search(r'<<<<<<< [^\n]*\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n', s, flags=re.S)
    if not m: break
    ours, theirs = m.group(1), m.group(2)
    want = [f for f in FILES if f in theirs and f not in ours]
    if want:
        ver = re.search(r'\?v=(\d{8}-\d{6})', ours).group(1)
        i = ours.index('<script src="adventure-tiers.js')
        ours = ours[:i] + ''.join('<script src="%s?v=%s"></script>\n' % (f, ver) for f in want) + ours[i:]
    s = s[:m.start()] + ours + s[m.end():]
open(p, 'w').write(s)
print('ok', sum(s.count(f) for f in FILES))
