import sys
from PIL import Image
p=sys.argv[1]; W=int(sys.argv[2]) if len(sys.argv)>2 else 70
im=Image.open(p).convert('RGBA'); w,h=im.size; H=int(h/w*W*0.5)
bg=Image.new('RGBA',im.size,(0,0,0,255)); bg.alpha_composite(im); g=bg.convert('L').resize((W,H))
ch=" .:-=+*#%@"
for y in range(H): print(''.join(ch[min(9,g.getpixel((x,y))*10//256)] for x in range(W)))
