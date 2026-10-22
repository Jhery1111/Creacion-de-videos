"""Censura las capturas reales de MINERVA antes de usarlas en el video.

- Datos personales -> datos demo claramente ficticios (JUAN PEREZ, CI 0000000,
  escalafon 0000-XX, iniciales JP). El grado se pixela.
- Nombres de herramientas externas ("Libelula") -> "el portal externo".
- Ejemplos de carnet/escalafon en los campos -> formatos ficticios.
- Barra flotante de Vue DevTools -> se reconstruye el fondo (inpainting).
- Vertical: las opciones del examen se pixelan (pedido del usuario).

Las ubicaciones salen de OCR (tesseract) sobre cada captura, asi el script
sigue funcionando si se recapturan las pantallas con el mismo layout.

Uso: python3 censor.py <dir_capturas_originales> [--check]
     (espera subcarpetas escritorio/ y movil/; escribe caps/desktop y caps/mobile)
Las capturas originales NO deben guardarse en el repositorio.
"""
import csv
import io
import subprocess
import sys
import unicodedata
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).parent
FONT = {
    "regular": "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
    "medium": "/usr/share/fonts/opentype/inter/Inter-Medium.otf",
    "semibold": "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
    "bold": "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
    "doc": "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "docbold": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
}
CAP = 0.727  # altura de mayuscula de Inter (fraccion del em)


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def ocr(im, box=None, psm=11, invert=False, scale=1):
    """Palabras OCR con cajas absolutas: [(texto, x0, y0, x1, y1)]."""
    ox, oy = 0, 0
    if box:
        im = im.crop(box)
        ox, oy = box[0], box[1]
    g = im.convert("L")
    if invert:
        g = Image.fromarray(255 - np.asarray(g))
    if scale != 1:
        g = g.resize((g.width * scale, g.height * scale), Image.LANCZOS)
    buf = io.BytesIO()
    g.save(buf, "PNG")
    out = subprocess.run(["tesseract", "stdin", "stdout", "-l", "spa", "--psm", str(psm), "tsv"],
                         input=buf.getvalue(), capture_output=True, check=True).stdout.decode()
    words = []
    for r in csv.DictReader(io.StringIO(out), delimiter="\t", quoting=csv.QUOTE_NONE):
        t = (r.get("text") or "").strip()
        if not t or float(r.get("conf") or -1) < 0:
            continue
        x, y, w, h = (int(r[k]) / scale for k in ("left", "top", "width", "height"))
        words.append((t, ox + x, oy + y, ox + x + w, oy + y + h))
    return words


def find(words, *keys):
    """Union de las cajas de palabras que contienen alguna de las claves."""
    hits = [w for w in words if any(k in norm(w[0]) for k in keys)]
    if not hits:
        return None
    return (min(w[1] for w in hits), min(w[2] for w in hits), max(w[3] for w in hits), max(w[4] for w in hits))


def inpaint(im, box, pad=4):
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    arr = cv2.cvtColor(np.asarray(im.convert("RGB")), cv2.COLOR_RGB2BGR)
    mask = np.zeros(arr.shape[:2], np.uint8)
    mask[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = 255
    res = cv2.inpaint(arr, mask, 6, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(res, cv2.COLOR_BGR2RGB))


def ring_bg(im, box, w=6):
    """Color de fondo: mediana de un anillo justo afuera de la caja."""
    a = np.asarray(im.convert("RGB")).astype(float)
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    H, W = a.shape[:2]
    X0, Y0, X1, Y1 = max(0, x0 - w), max(0, y0 - w), min(W, x1 + w), min(H, y1 + w)
    m = np.ones((Y1 - Y0, X1 - X0), bool)
    m[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = False
    return np.median(a[Y0:Y1, X0:X1][m], axis=0)


def text_color(im, box):
    """Color del texto: los pixeles de la caja mas alejados del fondo que la rodea."""
    bg = ring_bg(im, box)
    reg = np.asarray(im.convert("RGB").crop([int(v) for v in box])).reshape(-1, 3).astype(float)
    d = np.abs(reg - bg).sum(1)
    sel = reg[d >= np.percentile(d, 90)]
    return tuple(int(v) for v in np.median(sel, axis=0))


def replace(im, box, text, weight="medium", align="left", cap_h=None, color=None, pad=4, dx=0):
    """Borra las palabras de la caja y escribe el texto demo con estilo parecido."""
    col = color or text_color(im, box)
    im = inpaint(im, box, pad)
    x0, y0, x1, y1 = box
    ch = cap_h or (y1 - y0)
    font = ImageFont.truetype(FONT[weight], max(8, int(round(ch / CAP))))
    d = ImageDraw.Draw(im)
    tb = font.getbbox(text)
    hb = font.getbbox("H")
    w = tb[2] - tb[0]
    if align == "center":
        x = (x0 + x1) / 2 - w / 2 - tb[0]
    else:
        x = x0 - tb[0]
    d.text((x + dx, y0 - hb[1]), text, font=font, fill=col)
    return im


def mosaic(im, box, block=None, radius=None):
    """Pixelado prolijo dentro de una pildora redondeada (censura intencional)."""
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    reg = im.crop((x0, y0, x1, y1))
    b = block or max(6, (y1 - y0) // 3)
    small = reg.resize((max(1, reg.width // b), max(1, reg.height // b)), Image.BILINEAR)
    pix = small.resize(reg.size, Image.NEAREST).filter(ImageFilter.GaussianBlur(1.2))
    m = Image.new("L", reg.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, reg.width - 1, reg.height - 1), radius=radius or (y1 - y0) // 2, fill=255)
    im.paste(pix, (x0, y0), m)
    return im


AVATAR = {}  # posicion del avatar por tamano de captura (la sala no cambia de layout)


def avatar(im, region, initials, scale):
    """Busca el avatar circular (verde) en la region y cambia sus iniciales."""
    if im.size in AVATAR:
        cx, cy, rad = AVATAR[im.size]
    else:
        x0, y0, x1, y1 = region
        arr = np.asarray(im.convert("RGB"))[y0:y1, x0:x1].astype(int)
        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
        green = (g > r + 8) & (g > b + 8) & (g < 200)
        ys, xs = np.nonzero(green)
        if len(xs) < 50:
            return im
        cx, cy = x0 + (xs.min() + xs.max()) / 2, y0 + (ys.min() + ys.max()) / 2
        rad = (xs.max() - xs.min()) / 2
        AVATAR[im.size] = (cx, cy, rad)
    full = np.asarray(im.convert("RGB")).astype(int)
    yy, xx = np.mgrid[0:full.shape[0], 0:full.shape[1]]
    inner = (xx - cx) ** 2 + (yy - cy) ** 2 < (rad * 0.62) ** 2
    mask = inner.astype(np.uint8) * 255  # se reconstruye todo el disco central
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    bgr = cv2.cvtColor(full.astype(np.uint8), cv2.COLOR_RGB2BGR)
    res = Image.fromarray(cv2.cvtColor(cv2.inpaint(bgr, mask, 5, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB))
    font = ImageFont.truetype(FONT["bold"], int(rad * 0.62))
    d = ImageDraw.Draw(res)
    tb = font.getbbox(initials)
    d.text((cx - (tb[0] + tb[2]) / 2, cy - (tb[1] + tb[3]) / 2), initials, font=font, fill=(255, 255, 255))
    return res


# pildora flotante de Vue DevTools: misma posicion en todas las capturas
DEVTOOLS = {(3200, 1800): (1558, 1744, 1644, 1800), (780, 1688): (304, 1600, 476, 1680)}


def devtools(im):
    box = DEVTOOLS.get(im.size)
    return inpaint(im, box, pad=4) if box else im


def libelula(im, words, mobile):
    """'... ir a Libelula para esto.)' -> '... ir al portal externo para esto.)'."""
    lb = find(words, "libelula")
    if not lb:
        return im
    line = [w for w in words if abs((w[2] + w[4]) / 2 - (lb[1] + lb[3]) / 2) < (lb[3] - lb[1]) * 0.6]
    a_word = [w for w in line if norm(w[0]) == "a" and w[3] <= lb[0] + 2]
    start = a_word[-1] if a_word else None
    tail = [w for w in line if w[1] >= lb[0]]
    x0 = start[1] if start else lb[0]
    box = (x0, min(w[2] for w in tail), max(w[3] for w in tail), max(w[4] for w in tail))
    cap_h = (lb[3] - lb[1]) * 0.95
    return replace(im, box, "al portal externo para esto.)", weight="regular", cap_h=cap_h, pad=3)


def censor_desktop(name, im):
    W = im.width
    if name.startswith(("04-", "05-", "09-")):
        sb = ocr(im, (0, 0, 520, 420), psm=11, scale=2)
        nm = find(sb, "carlos", "gomez", "lopez")
        if nm:
            im = replace(im, nm, "Juan Pérez", weight="semibold", align="center", cap_h=(nm[3] - nm[1]) * 0.72)
        gr = find(sb, "tcnl", "deap")
        if gr:
            im = mosaic(im, (gr[0] - 8, gr[1] - 6, gr[2] + 8, gr[3] + 6))
        es = find(sb, "esc0", "esco")
        if es:
            im = replace(im, es, "0000-XX", align="center", cap_h=es[3] - es[1])
        ci = find(sb, "10000001")
        if ci:
            im = replace(im, ci, "0000000", weight="regular", cap_h=ci[3] - ci[1])
        im = avatar(im, (60, 20, 420, 210), "JP", 2)
    if name.startswith("09-"):
        words = ocr(im, (700, 150, 2500, 1600), psm=11)
        for keys, demo in [(("carlos",), "JUAN"), (("gomez",), "PÉREZ"), (("lopez",), "—"), (("10000001",), "0000000"), (("esc0", "esco"), "0000-XX")]:
            b = find(words, *keys)
            if b:
                im = replace(im, b, demo, weight="bold", cap_h=(b[3] - b[1]) * (0.78 if keys[0] in ("gomez", "lopez") else 1.0))
        dd = find(ocr(im, (900, 900, 1700, 1020), psm=6), "tcnl", "deap", "cnl")
        if dd:
            im = mosaic(im, (dd[0] - 10, dd[1] - 8, dd[2] + 10, dd[3] + 8))
        im = libelula(im, ocr(im, (850, 1000, 2400, 1100), psm=6), False)
    if name.startswith("10-"):
        im = consent(im)
    if name.startswith("02-"):
        im = placeholders(im)
    if name.startswith("03-"):
        im = field_values(im)
    return im


# cajas de texto de los campos carnet / escalafon (x, y, alto de los digitos)
FIELDS = {(3200, 1800): [(1672, 841, 23), (1672, 1041, 23)], (780, 1688): [(167, 1039, 23), (167, 1241, 23)]}


def placeholders(im):
    for (x, y, h), (demo, w) in zip(FIELDS[im.size], [("Ej: 0000000", 480), ("Ej: 0000-XX", 200)]):
        box = (x - 6, y - 6, x + w, y + h + 8)
        im = replace(im, box, demo, weight="regular", cap_h=h, color=text_color(im, box), pad=2, dx=6)
    return im


def field_values(im):
    for (x, y, h), (demo, w) in zip(FIELDS[im.size], [("0000000", 150), ("0000-XX", 120)]):
        box = (x - 2, y - 4, x + w, y + h + 6)
        im = replace(im, box, demo, weight="regular", cap_h=h, color=text_color(im, box), pad=2, dx=2)
    return im


def consent(im):
    words = ocr(im, (300, 1200, 1050, 1320), psm=6, scale=2)
    nm = find(words, "carlos", "gomez", "lopez", "tcnl", "deap")
    if nm:
        im = replace(im, nm, "JUAN PÉREZ", weight="docbold", align="center", cap_h=(nm[3] - nm[1]) * 0.75)
    for keys, demo in [(("10000001",), "0000000"), (("esc0", "esco"), "0000-XX")]:
        b = find(words, *keys)
        if b:
            im = replace(im, b, demo, weight="doc", cap_h=(b[3] - b[1]) * 0.95, pad=2)
    return im


def censor_mobile(name, im):
    if name.startswith("04-"):
        hd = ocr(im, (100, 0, 560, 110), psm=11, scale=2)
        nm = find(hd, "carlos", "gomez", "lopez")
        if nm:
            im = replace(im, nm, "Juan Pérez", weight="bold", cap_h=(nm[3] - nm[1]) * 0.72)
        gr = find(hd, "tcnl", "deap")
        if gr:
            im = mosaic(im, (gr[0] - 5, gr[1] - 4, gr[2] + 5, gr[3] + 4))
        ci = find(hd, "10000001")
        if ci:
            im = replace(im, ci, "0000000", weight="regular", cap_h=ci[3] - ci[1])
        im = avatar(im, (0, 0, 120, 110), "JP", 2)
    if name.startswith("09-"):
        words = ocr(im, (60, 300, 720, 1688), psm=11)
        for keys, demo in [(("carlos",), "JUAN"), (("gomez",), "PÉREZ"), (("lopez",), "—"), (("10000001",), "0000000"), (("esc0", "esco"), "0000-XX")]:
            b = find(words, *keys)
            if b:
                im = replace(im, b, demo, weight="bold", cap_h=(b[3] - b[1]) * (0.78 if keys[0] in ("gomez", "lopez") else 1.0))
        dd = find(ocr(im, (80, 1050, 640, 1160), psm=6), "tcnl", "deap", "cnl")
        if dd:
            im = mosaic(im, (dd[0] - 10, dd[1] - 8, dd[2] + 10, dd[3] + 8))
        im = libelula(im, ocr(im, (60, 1150, 720, 1260), psm=6), True)
    if name.startswith("10-"):
        im = consent(im)
    if name.startswith("02-"):
        im = placeholders(im)
    if name.startswith("03-"):
        im = field_values(im)
    if name.startswith("08-"):
        # opciones Likert encimadas en pantallas angostas: se pixelan como censura
        words = ocr(im, (0, 480, 780, 760), psm=11)
        b = find(words, "falso", "verdadero", "completame", "bastante", "ni")
        if b:
            im = mosaic(im, (14, b[1] - 30, im.width - 14, b[3] + 62), block=18, radius=22)
    return im


def main():
    src = Path(sys.argv[1])
    for sub, dst, fn in [("escritorio", "desktop", censor_desktop), ("movil", "mobile", censor_mobile)]:
        out = ROOT / "caps" / dst
        out.mkdir(parents=True, exist_ok=True)
        for f in sorted((src / sub).glob("*.png")):
            name = f.name.replace("Inscripción", "Inscripcion")
            # primero se quita la barra de DevTools para no borrar los datos demo
            im = fn(name, devtools(Image.open(f).convert("RGB")))
            im.save(out / name, optimize=True)
            print(dst, name)


if __name__ == "__main__":
    main()
