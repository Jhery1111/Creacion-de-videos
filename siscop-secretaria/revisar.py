"""Hoja de control: miniaturas de las capturas con los objetivos marcados.
Uso: python3 revisar.py [prefijo...] -> build/revision.png"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).parent
tg = json.loads((ROOT / "build" / "targets.json").read_text())
pref = sys.argv[1:]
caps = [c for c in sorted(tg) if not pref or any(c.startswith(p) for p in pref)]
W = 800
cols = 2
filas = (len(caps) + cols - 1) // cols
hoja = Image.new("RGB", (W * cols, 470 * filas), "white")
for i, c in enumerate(caps):
    im = Image.open(ROOT / "caps" / f"{c}.png").convert("RGB")
    k = W / im.width
    im = im.resize((W, int(im.height * k)))
    d = ImageDraw.Draw(im)
    for key, (x0, y0, x1, y1) in tg[c].items():
        d.rectangle([x0 * k, y0 * k, x1 * k, y1 * k], outline="red", width=2)
        d.text((x0 * k + 3, y0 * k + 2), key, fill="red")
    d.text((6, 6), c, fill="blue")
    hoja.paste(im, ((i % cols) * W, (i // cols) * 470))
hoja.save(ROOT / "build" / "revision.png")
print(len(caps), "capturas")
