"""Linea de tiempo del tutorial MINERVA a partir de la narracion.

Ritmo agil: entrada corta (rotulo del paso), pausas breves entre frases y una
cola que deja ver la accion. Uso: python3 timeline.py [--vertical]
Salida: build/timeline_{h,v}.json y .js (window.TL)
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent
V = "--vertical" in sys.argv
PRE = "v" if V else "h"
narr = json.loads((ROOT / "build" / f"narration_{PRE}.json").read_text())

# escena: (entrada, [pausa tras cada frase], cola)
PACING = {
    0: (1.6, [0.3], 1.4),
    1: (0.9, [], 1.6),
    2: (0.9, [0.3], 1.8),
    3: (0.9, [0.3], 1.6),
    4: (0.9, [0.3], 1.6),
    5: (0.8, [], 1.6),
    6: (0.9, [0.4], 1.6),
    7: (0.9, [0.4], 1.8),
    8: (0.9, [0.4], 1.6),
    9: (0.9, [0.4], 1.8),
    10: (0.8, [0.6], 2.0),
    11: (0.6, [], 3.4),
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

W, H = (1080, 1920) if V else (1920, 1080)
TL = {"fps": 30, "width": W, "height": H, "duration": round(t, 3), "scenes": scenes, "cues": cues}
(ROOT / "build" / f"timeline_{PRE}.json").write_text(json.dumps(TL, ensure_ascii=False, indent=1))
(ROOT / "build" / f"timeline_{PRE}.js").write_text("window.TL = " + json.dumps(TL, ensure_ascii=False) + ";\n")
print(" ".join(f"{s['id']}:{s['dur']:.1f}" for s in scenes), f"| TOTAL {t:.1f}s")
