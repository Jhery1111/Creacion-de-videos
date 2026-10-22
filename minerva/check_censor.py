"""Verifica la censura: busca con OCR restos de datos sensibles y arma una hoja
de recortes para revision visual. Uso: python3 check_censor.py <salida.png>"""
import glob
import re
import subprocess
import sys
import unicodedata

from PIL import Image, ImageDraw

PAT = re.compile(r"carlos|gomez|lopez|10000001|esc00|esco0|tcnl|deap|libelula|5520468|5801")
CROPS = [("desktop/04-sala-default", (0, 0, 480, 400)), ("desktop/09-confirmar-datos", (880, 250, 1700, 1100)),
         ("desktop/09-confirmar-datos", (0, 0, 480, 400)), ("desktop/03-form-lleno", (1560, 780, 2600, 1120)),
         ("desktop/02-form-vacio", (1560, 780, 2600, 1120)), ("desktop/10-consentimiento", (300, 1180, 1050, 1320)),
         ("desktop/04-sala-default", (1400, 1640, 1800, 1800)), ("mobile/04-sala-default", (0, 0, 780, 140)),
         ("mobile/09-confirmar-datos", (60, 300, 720, 1688)), ("mobile/08-examen", (0, 450, 780, 800)),
         ("mobile/02-form-vacio", (40, 990, 740, 1270)), ("mobile/03-form-lleno", (40, 990, 740, 1270)),
         ("mobile/04-sala-default", (200, 1560, 580, 1688))]


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def main(out):
    bad = 0
    for f in sorted(glob.glob("caps/*/*.png")):
        txt = subprocess.run(["tesseract", f, "stdout", "-l", "spa", "--psm", "11"], capture_output=True).stdout.decode()
        hits = sorted(set(m.group(0) for m in PAT.finditer(norm(txt))))
        if hits:
            bad += 1
            print("RESTO", f, hits)
    print("archivos con restos:", bad)
    tiles = []
    for f, b in CROPS:
        im = Image.open(f"caps/{f}.png").crop(b)
        sc = min(1, 700 / im.width)
        tiles.append((f, im.resize((int(im.width * sc), int(im.height * sc)))))
    c = Image.new("RGB", (720, sum(t[1].height + 22 for t in tiles)), "white")
    d = ImageDraw.Draw(c)
    y = 0
    for lab, im in tiles:
        d.text((4, y + 3), lab, fill="red")
        c.paste(im, (0, y + 18))
        y += im.height + 22
    half = c.height // 2
    c.crop((0, 0, 720, half)).save(out.replace(".png", "_1.png"))
    c.crop((0, half, 720, c.height)).save(out.replace(".png", "_2.png"))


if __name__ == "__main__":
    main(sys.argv[1])
