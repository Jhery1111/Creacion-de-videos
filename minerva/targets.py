"""Ubica con OCR los controles que el video toca o resalta en cada captura censurada.

Salida: build/targets.js -> window.TARGETS[fmt][captura][clave] = [x0, y0, x1, y1]
(coordenadas en pixeles de la captura). fmt: "desktop" | "mobile".
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from censor import norm, ocr  # noqa: E402

ROOT = Path(__file__).parent
# clave -> frase a buscar (palabras consecutivas, sin tildes)
WANT = {
    "01-portal": {"policia": "policia", "ingresar_pol": "carnet y escalafon policial"},
    "02-form-vacio": {"carnet": "numero de carnet", "escalafon": "escalafon policial", "ingresar": "ingresar al sistema"},
    "03-form-lleno": {"ingresar": "ingresar al sistema"},
    "04-sala-default": {"descargar": "descargar consentimiento", "entrar": "entrar al examen", "disponibles": "disponibles ahora",
                        "inscripcion": "inscripcion abierta"},
    "05-tab-0-Inscripcion": {"descargar": "descargar consentimiento", "tab_disp": "ya disponibles", "tab_insc": "en inscripcion"},
    "05-tab-2-Disponibles": {"entrar": "entrar al examen", "tab_disp": "ya disponibles"},
    "06-lobby": {"acepto": "he leido completamente", "iniciar": "iniciar examen", "duracion": "duracion", "disponible": "examen disponible"},
    "07-lobby-terminos-ok": {"acepto": "he leido completamente", "iniciar": "iniciar examen"},
    "08-examen": {"siguiente": "siguiente", "enviar": "enviar", "progreso": "progreso", "pregunta": "pregunta 1 de 132",
                  "opcion": "bastante verdadero", "timer": "39"},
    "09-confirmar-datos": {"correctos": "mis datos son correctos", "grado": "grado", "titulo": "verifique sus datos"},
    "11-confirmar-envio": {"enviar_examen": "enviar examen", "faltan": "le faltan", "responder": "responder las que faltan"},
    "12-examenfin": {"envio": "envio automatico"},
    "13-enviado-final": {"exito": "examen enviado exitosamente", "volver": "volver al perfil"},
}

# botones que el OCR no lee bien (texto claro sobre verde); medidos a mano
MANUAL = {
    "desktop": {
        "01-portal": {"card": [1290, 900, 1915, 1485], "card_link": [1520, 1395, 1650, 1440]},
        "02-form-vacio": {"ingresar": [1585, 1215, 2665, 1340]},
        "04-sala-default": {"descargar": [560, 615, 1135, 680]},
        "05-tab-0-Inscripcion": {"descargar": [560, 615, 1135, 680]},
        "06-lobby": {"check": [1690, 1425, 1722, 1457], "iniciar": [2200, 1680, 2560, 1735], "duracion": [180, 880, 440, 1090],
                     "intentos": [700, 880, 960, 1090], "terminos": [1640, 560, 3140, 1690]},
        "07-lobby-terminos-ok": {"check": [1690, 1425, 1722, 1457], "iniciar": [2200, 1680, 2560, 1735]},
        "13-enviado-final": {"resumen": [1190, 850, 2010, 1265]},
        "10-consentimiento": {"firma": [175, 1012, 1171, 1385], "encabezado": [90, 40, 1260, 330]},
        "03-form-lleno": {"ingresar": [1585, 1215, 2665, 1340]},
        "05-tab-2-Disponibles": {"entrar": [560, 565, 1135, 635]},
        "08-examen": {"siguiente": [1945, 705, 2180, 785], "enviar": [2675, 75, 2840, 140], "pregunta": [460, 270, 675, 305],
                      "opcion": [1450, 450, 1740, 610], "timer": [2150, 70, 2330, 140], "progreso": [2300, 210, 2850, 860]},
        "09-confirmar-datos": {"correctos": [1145, 1700, 1790, 1785]},
        "11-confirmar-envio": {"responder": [1190, 1270, 1615, 1345], "enviar_examen": [1640, 1270, 2010, 1345]},
    },
    "mobile": {
        "01-portal": {"card": [52, 1110, 728, 1448], "card_link": [560, 1370, 690, 1405]},
        "04-sala-default": {"entrar": [60, 710, 728, 775], "descargar": [60, 1396, 728, 1451]},
        "06-lobby": {"intentos": [40, 960, 740, 1200]},
        "13-enviado-final": {"resumen": [70, 640, 710, 1335]},
        "07-lobby-terminos-ok": {"check": [81, 1251, 115, 1285]},
        "10-consentimiento": {"firma": [175, 1012, 1171, 1385], "encabezado": [90, 40, 1260, 330]},
        "08-examen": {"siguiente": [637, 809, 725, 871], "enviar": [432, 143, 645, 195], "pregunta": [156, 360, 364, 392],
                      "timer": [100, 140, 250, 200]},
        "11-confirmar-envio": {"responder": [177, 1274, 603, 1352], "enviar_examen": [203, 1378, 572, 1477]},
    },
}


def phrase(words, text):
    toks = text.split()
    ws = [(norm(w[0]).strip(".,:;()¡!¿?✓"), w) for w in words]
    best = None
    for i in range(len(ws)):
        if not ws[i][0].startswith(toks[0][:5]):
            continue
        seq, j = [ws[i][1]], i + 1
        for t in toks[1:]:
            # siguiente palabra cercana en la misma linea
            cand = [k for k in range(j, min(len(ws), j + 4)) if ws[k][0].startswith(t[:4])
                    and abs(ws[k][1][2] - seq[-1][2]) < 30]
            if not cand:
                break
            j = cand[0] + 1
            seq.append(ws[cand[0]][1])
        if len(seq) == len(toks):
            box = [min(w[1] for w in seq), min(w[2] for w in seq), max(w[3] for w in seq), max(w[4] for w in seq)]
            if best is None:
                best = box
    return best


def main():
    out = {}
    for fmt in ("desktop", "mobile"):
        out[fmt] = {}
        for f in sorted((ROOT / "caps" / fmt).glob("*.png")):
            want = WANT.get(f.stem)
            im = Image.open(f)
            out[fmt][f.stem] = {"size": list(im.size)}
            out[fmt][f.stem].update(MANUAL[fmt].get(f.stem, {}))
            if not want:
                continue
            words = ocr(im, psm=11) + ocr(im, psm=11, invert=True)
            for key, text in want.items():
                if key in out[fmt][f.stem]:
                    continue
                box = phrase(words, text)
                if box:
                    out[fmt][f.stem][key] = [round(v) for v in box]
                else:
                    print("FALTA", fmt, f.stem, key)
    # color de fondo de los campos carnet/escalafon (para simular la escritura)
    for fmt, pts in (("desktop", [(2300, 852), (2300, 1052)]), ("mobile", [(620, 1050), (620, 1252)])):
        im = Image.open(ROOT / "caps" / fmt / "02-form-vacio.png").convert("RGB")
        out[fmt]["02-form-vacio"]["fieldbg"] = ["#%02x%02x%02x" % im.getpixel(p) for p in pts]
        out[fmt]["02-form-vacio"]["fields"] = {"desktop": [[1650, 820, 2650, 875], [1650, 1020, 2650, 1075]],
                                               "mobile": [[150, 1022, 720, 1076], [150, 1224, 720, 1278]]}[fmt]
    (ROOT / "build").mkdir(exist_ok=True)
    (ROOT / "build" / "targets.json").write_text(json.dumps(out, indent=1))
    (ROOT / "build" / "targets.js").write_text("window.TARGETS = " + json.dumps(out) + ";\n")
    print("ok")


if __name__ == "__main__":
    main()
