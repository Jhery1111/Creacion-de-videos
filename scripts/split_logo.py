"""Divide el logo (blanco sobre negro) en 3 capas con alfa: emblema, titulo y cinta."""
import sys
import numpy as np
from PIL import Image

src, out_dir = sys.argv[1], sys.argv[2]
lum = np.asarray(Image.open(src).convert("L")).astype(np.float32)
h, w = lum.shape
yy, xx = np.mgrid[0:h, 0:w]

alpha = np.clip((lum - 20) / 200, 0, 1)  # negro -> transparente
emblem = yy < 622
title = (
    ((yy >= 622) & (yy < 788) & (xx > 470) & (xx < 1100))
    | ((yy >= 650) & (yy < 705))  # lineas laterales
    | ((yy >= 600) & (yy < 622) & (xx > 940) & (xx < 1000))  # tilde de la I
)
emblem &= ~title
ribbon = ~emblem & ~title

for name, mask in [("emblem", emblem), ("title", title), ("ribbon", ribbon)]:
    a = (alpha * mask * 255).astype(np.uint8)
    rgba = np.dstack([np.full_like(a, 255)] * 3 + [a])
    Image.fromarray(rgba, "RGBA").save(f"{out_dir}/{name}.png")
