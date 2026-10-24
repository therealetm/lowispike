#!/usr/bin/env python3
"""Oct 24: resize the generic LOWiSPIKE mark (tools/brand/make-generic-icon.cjs) into icon-180/192/512.png (opaque RGB, iOS fills
transparency with black) and swap the two inline data URIs (apple-touch-icon 180 px, favicon 64 px) in index.html.
usage: python3 tools/brand/make-generic-icon.py [/tmp/lowi-icon-1024.png]"""
import base64, io, os, re, sys
from PIL import Image

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
src = Image.open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/lowi-icon-1024.png').convert('RGB')

def png(n):
    b = io.BytesIO()
    src.resize((n, n), Image.LANCZOS).save(b, 'PNG', optimize=True)
    return b.getvalue()

for n in (180, 192, 512):
    open(os.path.join(root, 'icon-%d.png' % n), 'wb').write(png(n))
p = os.path.join(root, 'index.html')
s = open(p, encoding='utf-8').read()
for rel, n in (('apple-touch-icon', 180), ('icon', 64)):
    uri = 'data:image/png;base64,' + base64.b64encode(png(n)).decode()
    s, k = re.subn(r'<link rel="%s" href="data:image/png;base64,[^"]+"' % re.escape(rel), lambda m: '<link rel="%s" href="%s"' % (rel, uri), s, count=1)
    assert k == 1, rel
open(p, 'w', encoding='utf-8').write(s)
print('icons written')
