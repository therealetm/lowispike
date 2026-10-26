#!/bin/bash
# Resolve the build-stamp conflict in the script-tag block / sw.js: keep main's side of each conflict hunk
# (the rest of my change auto-merges), then re-add better-pick-core.js.
set -e
cd /home/sprite/wt-better-pick
python3 - <<'EOF'
import re
def keep_head(t):
    return re.sub(r'^<<<<<<< [^\n]*\n(.*?)^=======\n.*?^>>>>>>> [^\n]*\n', lambda m: m.group(1), t, flags=re.S | re.M)
s=keep_head(open('index.html').read())
if '<script src="better-pick-core.js' not in s:
    s=re.sub(r'(<script src="scan-swap-core\.js\?v=([0-9-]+)"></script>)', lambda m: m.group(1)+'\n<script src="better-pick-core.js?v='+m.group(2)+'"></script>', s, count=1)
open('index.html','w').write(s)
w=keep_head(open('sw.js').read())
if 'better-pick-core.js' not in w:
    w=w.replace('"scan-swap-core.js", ','"scan-swap-core.js", "better-pick-core.js", ',1)
open('sw.js','w').write(w)
EOF
! grep -n '^<<<<<<<\|^>>>>>>>' index.html sw.js
grep -c 'better-pick-core' index.html sw.js
grep -c 'LowiBetterPick\|function bpRegion' index.html
git add index.html sw.js
GIT_EDITOR=true git rebase --continue >/dev/null
