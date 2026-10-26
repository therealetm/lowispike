f = 'move-bubble.js'
s = open(f, encoding='utf8').read()
a = "    const T = (en, de, es) => [en, de, es][lang()];"
assert s.count(a) == 1
H = "const wnm = s => { try { const B = (typeof window !== 'undefined' ? window : globalThis).LowiBirthCompanion; return s && B && B.withName ? B.withName(s) : s; } catch (e) { return s; } }; /* BH-045: the user's own companion name, never the default \"Misty\" */"
s = s.replace(a, "    " + H + "\n    const T = (en, de, es) => wnm([en, de, es][lang()]);")
open(f, 'w', encoding='utf8').write(s)
print('ok')
