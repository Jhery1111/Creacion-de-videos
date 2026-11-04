"""Linea de tiempo del tutorial SISCOP (Secretaria) a partir de la narracion.

Entrada corta (rotulo del capitulo), pausas entre frases para que se vea cada
accion y una cola que deja leer el resultado.
Uso: python3 timeline.py  ->  build/timeline_h.json y .js (window.TL)
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
narr = json.loads((ROOT / "build" / "narration_h.json").read_text())

# escena: (entrada, [pausa tras cada frase], cola)
PACING = {
    0: (1.8, [0.4], 1.6),
    1: (1.0, [0.5], 1.4),
    2: (1.0, [0.6, 0.6], 1.6),
    3: (1.0, [0.6, 0.6, 0.4], 1.6),
    4: (1.0, [0.6, 0.6, 0.6], 1.8),
    5: (1.0, [0.6, 0.6, 0.6], 1.6),
    6: (1.0, [0.6], 1.6),
    7: (1.0, [0.6, 0.6], 1.4),
    8: (1.0, [0.6, 0.6, 0.6], 1.6),
    9: (1.0, [0.6], 1.6),
    10: (1.0, [0.6, 0.8, 0.6], 1.8),
    11: (1.0, [0.6, 0.6], 1.8),
    12: (1.0, [0.6, 0.6, 0.6], 1.8),
    13: (1.0, [0.6, 0.6], 1.8),
    14: (1.0, [0.6, 0.6], 1.8),
    15: (1.0, [0.6], 1.6),
    16: (0.8, [0.6], 3.6),
}

scenes, cues, t = [], [], 0.0
for sid in sorted(PACING):
    lead, gaps, tail = PACING[sid]
    lt, placed = lead, []
    for i, u in enumerate(narr[str(sid)]):
        segs = [{"text": x["text"], "start": round(lt + x["start"], 3), "end": round(lt + x["end"], 3)} for x in u["segments"]]
        placed.append({"file": u["file"], "start": round(lt, 3), "dur": u["dur"], "segments": segs})
        cues += [{"text": x["text"], "start": round(t + x["start"], 3), "end": round(t + x["end"], 3)} for x in segs]
        lt += u["dur"] + (gaps[i] if i < len(gaps) else 0)
    dur = round(lt + tail, 3)
    scenes.append({"id": sid, "start": round(t, 3), "dur": dur, "utts": placed})
    t += dur

for i, c in enumerate(cues):
    nxt = cues[i + 1]["start"] if i + 1 < len(cues) else c["end"] + 1.0
    c["end"] = round(min(c["end"] + 0.5, nxt - 0.05), 3)

TL = {"fps": 30, "width": 1920, "height": 1080, "duration": round(t, 3), "scenes": scenes, "cues": cues}
(ROOT / "build" / "timeline_h.json").write_text(json.dumps(TL, ensure_ascii=False, indent=1))
(ROOT / "build" / "timeline_h.js").write_text("window.TL = " + json.dumps(TL, ensure_ascii=False) + ";\n")
print(" ".join(f"{s['id']}:{s['dur']:.1f}" for s in scenes), f"| TOTAL {t:.1f}s")
