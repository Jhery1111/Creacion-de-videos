"""Genera la narracion (edge-tts, voz boliviana) y los tiempos de subtitulos.

Cada escena tiene "frases" (utterances). Cada frase se divide en segmentos de
subtitulo: (texto en pantalla, texto hablado). El texto hablado deletrea los
dominios para que la voz los lea bien. Los tiempos de cada segmento salen de
los WordBoundary de edge-tts.

Salida: audio/sNN_uM.mp3 y build/narration.json
"""
import asyncio
import json
import subprocess
from pathlib import Path

import os
import ssl

import edge_tts
import edge_tts.communicate

# El proxy de la sesion re-firma TLS: confiar en su CA si existe.
_CA = "/root/.ccr/ca-bundle.crt"
if os.path.exists(_CA):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=_CA)

VOICE = "es-BO-SofiaNeural"
RATE = "-6%"
ROOT = Path(__file__).parent

MAIL = ("mail.policia.bo", "méil punto policía punto bo")
KERB = ("kerberos-produccion.policia.bo", "kérberos guion producción punto policía punto bo")


def same(text):
    return (text, text)


SCRIPT = {
    1: [
        [same("Bienvenido a esta guía.")],
        [same("Aprenderás paso a paso cómo ingresar a tu correo institucional de la Policía Boliviana,"),
         same("actualizar tu contraseña, configurar Carbonio Mail y acceder al sistema Kerberos.")],
    ],
    2: [
        [(f"Primero, abre tu navegador e ingresa la dirección {MAIL[0]}",
          f"Primero, abre tu navegador e ingresa la dirección {MAIL[1]}"),
         same("para acceder al correo institucional de la Policía Boliviana.")],
    ],
    3: [
        [same("En el primer campo escribe tu correo institucional completo.")],
        [same("En el segundo campo introduce tu contraseña inicial.")],
        [same("Una vez completados ambos espacios, presiona Iniciar sesión.")],
    ],
    4: [
        [same("En tu primer ingreso, el sistema te solicitará establecer una nueva contraseña.")],
        [same("Escríbela en el primer espacio y repítela exactamente en el segundo para confirmarla.")],
    ],
    5: [
        [same("Tu nueva contraseña debe tener más de quince caracteres"),
         same("y combinar letras mayúsculas, minúsculas, números y símbolos.")],
        [same("Además, no debe contener tu nombre, apellidos"),
         same("ni información relacionada con tu correo institucional.")],
    ],
    6: [
        [same("Una vez actualizada tu contraseña, podrás ingresar a tu correo institucional"),
         same("directamente desde el navegador o, como alternativa, usar la aplicación Carbonio Mail.")],
    ],
    7: [
        [same("Como alternativa, para mayor comodidad,"),
         same("también puedes usar la aplicación Carbonio Mail en tu celular.")],
        [same("Pero recuerda: primero debes validar tu cuenta"),
         same("y actualizar tu contraseña desde el navegador.")],
    ],
    8: [
        [(f"Al abrir Carbonio Mail, introduce el dominio {MAIL[0]} y presiona continuar.",
          f"Al abrir Carbonio Mail, introduce el dominio {MAIL[1]} y presiona continuar.")],
        [same("Después, escribe tu correo institucional completo"),
         same("y la nueva contraseña que configuraste desde el navegador.")],
        [same("Finalmente, inicia sesión.")],
    ],
    9: [
        [same("Para ingresar al sistema Kerberos, abre tu navegador"),
         (f"y escribe {KERB[0]}.", f"y escribe {KERB[1]}.")],
        [same("Encontrarás una nueva pantalla de inicio de sesión.")],
    ],
    10: [
        [same("Para acceder a Kerberos debes escribir tu correo institucional"),
         same("y la contraseña específica de este sistema.")],
        [same("Recuerda que no es la misma contraseña de tu correo.")],
        [same("La contraseña de Kerberos será proporcionada por el personal encargado del sistema"),
         same("o llegará directamente a tu correo institucional.")],
    ],
    11: [
        [same("Recuerda: primero debes configurar tu correo institucional,"),
         same("luego, si lo prefieres, podrás utilizar Carbonio Mail"),
         same("y finalmente ingresar a Kerberos con su contraseña independiente.")],
        [same("Mantén siempre tus credenciales protegidas.")],
    ],
}


# Version vertical corta (TikTok / Reels)
SCRIPT_V = {
    1: [
        [same("Accede a tus sistemas institucionales en tres pasos.")],
    ],
    2: [
        [(f"Paso uno: abre tu navegador e ingresa a {MAIL[0]}.",
          f"Paso uno: abre tu navegador e ingresa a {MAIL[1]}.")],
        [same("Escribe tu correo institucional completo"), same("y tu contraseña inicial.")],
    ],
    3: [
        [same("En tu primer ingreso, crea una nueva contraseña:"),
         same("más de quince caracteres, con mayúsculas, minúsculas, números y símbolos,"),
         same("sin tu nombre ni datos de tu correo.")],
    ],
    4: [
        [same("Paso dos, opcional: para mayor comodidad,"), same("usa la aplicación Carbonio Mail.")],
        [same("Primero valida tu cuenta en el navegador.")],
        [(f"Luego escribe el dominio {MAIL[0]},", f"Luego escribe el dominio {MAIL[1]},"),
         same("tu correo y tu nueva contraseña.")],
    ],
    5: [
        [(f"Paso tres: ingresa a {KERB[0]}", f"Paso tres: ingresa a {KERB[1]}"),
         same("con tu correo institucional.")],
        [same("Su contraseña es diferente a la del correo:"),
         same("la proporciona el personal encargado del sistema"),
         same("o llega a tu correo institucional.")],
    ],
    6: [
        [same("Protege siempre tus credenciales.")],
    ],
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
                bounds.append((chunk["offset"] / 1e7, (chunk["offset"] + chunk["duration"]) / 1e7, chunk["text"]))
    return bounds


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", str(path)])
    return float(out)


async def main(variant):
    script, pre, out_name = (SCRIPT_V, "v", "narration_v.json") if variant == "vertical" else (SCRIPT, "s", "narration.json")
    data = {}
    for scene, utts in script.items():
        data[scene] = []
        for ui, segs in enumerate(utts):
            path = ROOT / "audio" / f"{pre}{scene:02d}_u{ui}.mp3"
            spoken = " ".join(s[1] for s in segs)
            bounds = await synth(spoken, path)
            dur = duration(path)
            # tiempos por segmento a partir del conteo de palabras
            counts = [len(words(s[1])) for s in segs]
            seg_times, idx = [], 0
            ok = len(bounds) == sum(counts)
            for k, (disp, sp) in enumerate(segs):
                if ok:
                    start = bounds[idx][0] if k else 0.0
                    idx += counts[k]
                    end = bounds[idx - 1][1]
                else:  # respaldo proporcional
                    tot = sum(counts)
                    start = dur * sum(counts[:k]) / tot
                    end = dur * sum(counts[:k + 1]) / tot
                seg_times.append({"text": disp, "start": round(start, 3), "end": round(end, 3)})
            data[scene].append({"file": path.name, "dur": round(dur, 3), "segments": seg_times,
                                "aligned": ok})
            print(f"s{scene} u{ui}: {dur:.2f}s aligned={ok} ({len(bounds)} vs {sum(counts)})")
    (ROOT / "build" / out_name).write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print("total voz:", round(sum(u["dur"] for s in data.values() for u in s), 1), "s")


import sys  # noqa: E402

asyncio.run(main("vertical" if "--vertical" in sys.argv else "horizontal"))
