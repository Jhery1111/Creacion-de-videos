"""Calcula la linea de tiempo global a partir de la narracion.

Cada escena: pausa inicial (lead), frases con pausas entre ellas (gaps) y
pausa final (tail) para que la demostracion se vea completa.
Salida: build/timeline.js (TL) usado por la pagina y por la mezcla de audio.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent
VERTICAL = "--vertical" in sys.argv
SUF = "_v" if VERTICAL else ""
narr = json.loads((ROOT / "build" / f"narration{SUF}.json").read_text())

# escena: (lead, [pausa despues de cada frase salvo la ultima], tail)
PACING = {
    1: (2.8, [0.7], 3.2),
    2: (1.6, [], 5.0),
    3: (1.4, [2.6, 2.4], 3.0),
    4: (2.2, [2.0], 3.6),
    5: (1.2, [1.6], 5.0),
    6: (2.8, [], 4.4),
    7: (2.2, [0.5], 3.6),
    8: (1.2, [3.0, 2.2], 4.4),
    9: (1.8, [1.2], 4.4),
    10: (1.4, [2.2, 2.8], 6.2),
    11: (1.6, [1.6], 6.8),
}
PACING_V = {
    1: (0.9, [], 2.2),
    2: (0.6, [0.6], 2.4),
    3: (0.5, [], 1.8),
    4: (0.6, [0.4, 0.4], 2.6),
    5: (0.6, [0.6], 2.6),
    6: (0.5, [], 4.4),
}
if VERTICAL:
    PACING = PACING_V

scenes, cues, t = [], [], 0.0
for sid in sorted(PACING, key=int):
    lead, gaps, tail = PACING[sid]
    utts = narr[str(sid)]
    lt, placed = lead, []
    for i, u in enumerate(utts):
        segs = [{"text": s["text"], "start": round(lt + s["start"], 3), "end": round(lt + s["end"], 3)}
                for s in u["segments"]]
        placed.append({"file": u["file"], "start": round(lt, 3), "dur": u["dur"], "segments": segs})
        for s in segs:
            cues.append({"text": s["text"], "start": round(t + s["start"], 3), "end": round(t + s["end"], 3)})
        lt += u["dur"] + (gaps[i] if i < len(gaps) else 0)
    dur = round(lt + tail, 3)
    scenes.append({"id": sid, "start": round(t, 3), "dur": dur, "utts": placed})
    t += dur

# subtitulos: mantener cada linea un poco mas (lectura) sin pisar la siguiente
for i, c in enumerate(cues):
    nxt = cues[i + 1]["start"] if i + 1 < len(cues) else c["end"] + 1.0
    c["end"] = round(min(c["end"] + 0.7, nxt - 0.05), 3)

W, H = (1080, 1920) if VERTICAL else (1920, 1080)
TL = {"fps": 30, "width": W, "height": H, "duration": round(t, 3), "scenes": scenes, "cues": cues}
(ROOT / "build" / f"timeline{SUF}.json").write_text(json.dumps(TL, ensure_ascii=False, indent=1))
(ROOT / "build" / f"timeline{SUF}.js").write_text("window.TL = " + json.dumps(TL, ensure_ascii=False) + ";\n")
for s in scenes:
    print(f"escena {s['id']:>2}: {s['start']:7.2f}s  dur {s['dur']:5.2f}s")
print(f"TOTAL {t:.1f}s = {int(t // 60)}:{int(t % 60):02d}")
