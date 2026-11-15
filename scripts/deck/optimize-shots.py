# PNG skrinshotlarni JPEG ga (sifat 85) o'tkazadi - aks holda PDF 24 MB bo'ladi. python3 optimize-shots.py
import os, sys
from PIL import Image
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')
total = 0
for f in sorted(os.listdir(d)):
    if not f.endswith('.png'): continue
    im = Image.open(os.path.join(d, f)).convert('RGB')
    out = os.path.join(d, f[:-4] + '.jpg')
    im.save(out, 'JPEG', quality=85, optimize=True, progressive=True)
    total += os.path.getsize(out)
    print(f'{f} -> {os.path.basename(out)} {os.path.getsize(out) // 1024} KB')
print('total', total // 1024, 'KB')
