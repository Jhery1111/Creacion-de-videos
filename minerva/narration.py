"""Narracion del tutorial MINERVA (edge-tts) con tiempos por segmento para subtitulos.

Dos guiones con el mismo flujo: horizontal ("hace clic") y vertical ("toca").
Uso: python3 narration.py [--vertical]  ->  audio/{h,v}NN_uM.mp3 + build/narration_{h,v}.json
"""
import asyncio
import json
import os
import ssl
import subprocess
import sys
from pathlib import Path

import edge_tts
import edge_tts.communicate

# El proxy de la sesion re-firma TLS: confiar en su CA si existe.
_CA = "/root/.ccr/ca-bundle.crt"
if os.path.exists(_CA):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=_CA)

VOICE = "es-BO-SofiaNeural"
RATE = "+4%"  # ritmo agil
ROOT = Path(__file__).parent


def s(text, spoken=None):
    return (text, spoken or text)


def script(v):
    """v=True: version vertical (gestos de toque)."""
    clic = "tocá" if v else "hacé clic en"
    press = "tocá" if v else "presioná"
    return {
        0: [[s("MINERVA, el Sistema de Evaluación Psicológica de la Policía Boliviana.")],
            [s("Te mostramos cómo ingresar y rendir tu examen, paso a paso.")]],
        1: [[s(f"Paso uno: en la pantalla de inicio, {clic} el portal Policía.")]],
        2: [[s("Escribí tu número de carnet y tu escalafón,"), s("tal como figuran en tu credencial,")],
            [s(f"y {press} Ingresar al Sistema.")]],
        3: [[s("En la sala, tu sesión aparece en la pestaña En Inscripción.")],
            [s(f"{'Tocá' if v else 'Hacé clic en'} Descargar Consentimiento.")]],
        4: [[s("Verificá tus datos."), s("Si tu grado o tu departamento no son correctos, corregilos aquí.")],
            [s("Luego confirmá con: Mis datos son correctos, Descargar.")]],
        5: [[s("Se descarga tu Consentimiento Informado oficial,"), s("con tus datos y el espacio para tu firma.")]],
        6: [[s("Cuando el examen se habilita,"),
             s("la sesión pasa a Disponibles ahora." if v else "la sesión pasa a la pestaña Ya Disponibles.")],
            [s(f"{'Tocá' if v else 'Hacé clic en'} Entrar al Examen.")]],
        7: [[s("En el lobby revisá la duración, tus intentos"), s("y leé los términos y condiciones.")],
            [s(f"{'Tocá' if v else 'Marcá'} la casilla He leído y acepto:"), s("así se habilita Iniciar Examen.")]],
        8: [[s("Respondé una pregunta a la vez."),
             s("Arriba ves el tiempo restante y tu avance." if v else "Arriba ves el tiempo restante y, a la derecha, tu progreso.")],
            [s("Elegí tu respuesta y avanzá con la flecha." if v else "Elegí tu respuesta y avanzá con Siguiente.")]],
        9: [[s(f"Al {'tocar' if v else 'presionar'} Enviar, si te faltan preguntas, el sistema te avisa.")],
            [s("Podés responder las que faltan"), s("o confirmar con Enviar Examen.")]],
        10: [[s("Tu examen se envía de forma segura,")],
             [s("y verás el resumen: intento, preguntas, duración y fecha.")]],
        11: [[s("¡Listo! Tu examen quedó registrado."), s("Consultá tu resultado en el sistema.")]],
    }


def words(text):
    return [w for w in text.replace(",", " ").replace(".", " ").replace(":", " ").split() if w.strip("¿?¡!-")]


async def synth(spoken, out):
    com = edge_tts.Communicate(spoken, VOICE, rate=RATE, boundary="WordBoundary")
    bounds = []
    with open(out, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                bounds.append((chunk["offset"] / 1e7, (chunk["offset"] + chunk["duration"]) / 1e7))
    return bounds


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]))


async def main(v):
    pre = "v" if v else "h"
    (ROOT / "audio").mkdir(exist_ok=True)
    (ROOT / "build").mkdir(exist_ok=True)
    data = {}
    for scene, utts in script(v).items():
        data[scene] = []
        for ui, segs in enumerate(utts):
            path = ROOT / "audio" / f"{pre}{scene:02d}_u{ui}.mp3"
            bounds = await synth(" ".join(x[1] for x in segs), path)
            dur = duration(path)
            counts = [len(words(x[1])) for x in segs]
            ok = len(bounds) == sum(counts)
            out, idx = [], 0
            for k, (disp, _) in enumerate(segs):
                if ok:
                    start = bounds[idx][0] if k else 0.0
                    idx += counts[k]
                    end = bounds[idx - 1][1]
                else:
                    tot = sum(counts)
                    start, end = dur * sum(counts[:k]) / tot, dur * sum(counts[:k + 1]) / tot
                out.append({"text": disp, "start": round(start, 3), "end": round(end, 3)})
            data[scene].append({"file": path.name, "dur": round(dur, 3), "segments": out})
            print(f"{pre}{scene} u{ui}: {dur:.2f}s aligned={ok}")
    (ROOT / "build" / f"narration_{pre}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print("total voz:", round(sum(u["dur"] for x in data.values() for u in x), 1), "s")


asyncio.run(main("--vertical" in sys.argv))
