"""Narracion del tutorial SISCOP para el rol Secretaria (edge-tts, voz de Bolivia).

Cada escena es una lista de frases; cada frase, una lista de segmentos (texto en
pantalla, texto hablado). Los tiempos por palabra alimentan los subtitulos.
Uso: python3 narration.py  ->  audio/hNN_uM.mp3 + build/narration_h.json
"""
import asyncio
import json
import os
import ssl
import subprocess
from pathlib import Path

import edge_tts
import edge_tts.communicate

# El proxy de la sesion re-firma TLS: confiar en su CA si existe.
_CA = "/root/.ccr/ca-bundle.crt"
if os.path.exists(_CA):
    edge_tts.communicate._SSL_CTX = ssl.create_default_context(cafile=_CA)

VOICE = "es-BO-SofiaNeural"
RATE = "+4%"
ROOT = Path(__file__).parent


def s(text, spoken=None):
    return (text, spoken or text)


SCRIPT = {
    # 0 · presentacion
    0: [[s("SISCOP, el Sistema de Correspondencia Policial.")],
        [s("En esta guía vas a ver todo lo que hace la secretaria de una unidad,"),
         s("y cómo hacerlo correctamente.")]],
    # 1 · panel de inicio
    1: [[s("Al ingresar llegás al panel de correspondencia."),
         s("Arriba ves los pendientes de tu unidad, lo que lleva más de tres días sin atender"),
         s("y el tiempo promedio de atención.")],
        [s("En el menú están las bandejas, la recepción de terceros y la nueva correspondencia;"),
         s("y en Ajustes, las adscripciones, el organigrama y la configuración.")]],
    # 2 · configuracion
    2: [[s("Antes de empezar, configurá tu unidad."),
         s("En Configuración, pestaña Remitente,"),
         s("cargá el nombre, el cargo y el teléfono de quien firma los documentos.")],
        [s("Hacé clic en Guardar cambios:"),
         s("estos datos se completan solos en cada documento nuevo.")],
        [s("En Hoja de ruta podés activar la numeración automática,"),
         s("con un número inicial y un prefijo para tu unidad.")]],
    # 3 · nueva correspondencia (pasos 1 y 2)
    3: [[s("Para registrar un documento, hacé clic en Nueva correspondencia."),
         s("El registro tiene cinco pasos.")],
        [s("Primero elegí el origen: Interno, si va a otra unidad de la Policía,"),
         s("o Externo, si va a otra institución."),
         s("Y marcá la clasificación; por ejemplo, Normal.")],
        [s("En el paso dos cargá el número de documento, la fecha, el tipo y las hojas."),
         s("La hoja de ruta se sugiere sola.")],
        [s("Y adjuntá el PDF escaneado del documento firmado.")]],
    # 4 · nueva correspondencia (pasos 3 a 5)
    4: [[s("En el paso tres, el remitente ya viene de la configuración."),
         s("Solo escribí la referencia: de qué trata el documento.")],
        [s("El paso cuatro es opcional: anexos o enlaces a archivos pesados.")],
        [s("En el paso cinco marcá las instrucciones para quien lo recibe;"),
         s("por ejemplo, Informar y Responder.")],
        [s("Hacé clic en Registrar correspondencia."),
         s("El sistema le asigna un código único.")]],
    # 5 · enviar
    5: [[s("Registrar no es enviar."),
         s("Hacé clic en Enviar a unidades y buscá el destino por su nombre.")],
        [s("Podés marcar varias unidades a la vez."),
         s("El envío inicial siempre va a unidades de nivel uno.")],
        [s("Confirmá con Sí, enviar."),
         s("El envío no se puede deshacer: revisá los destinos antes de confirmar.")],
        [s("Listo: la correspondencia quedó enviada.")]],
    # 6 · bandeja de entrada
    6: [[s("Lo que llega a tu unidad aparece en la Bandeja de entrada."),
         s("Las carpetas filtran por estado: pendientes, por responder, recepcionados y más.")],
        [s("Hacé clic en un documento para ver su detalle en el panel lateral,"),
         s("con los datos y el PDF adjunto.")]],
    # 7 · recepcionar
    7: [[s("Cuando el documento llega a tu unidad, hacé clic en Recepcionar."),
         s("Si no corresponde, elegí Rechazar y explicá el motivo en observaciones.")],
        [s("Confirmá la recepción:"),
         s("quien lo envió ve al instante que tu unidad ya lo recibió.")],
        [s("Recepcioná lo antes posible: el panel mide el tiempo de atención.")]],
    # 8 · derivar
    8: [[s("Con Abrir completo ves el documento y todas sus acciones:"),
         s("el PDF, la hoja de ruta, derivar, responder o marcar como atendido.")],
        [s("Para pasarlo a una dependencia de tu unidad, hacé clic en Derivar"),
         s("y elegí si va con un documento nuevo o sin documento."),
         s("Ojo: solo podés derivar una vez.")],
        [s("Marcá la dependencia de destino, revisá la hoja de ruta"),
         s("y confirmá con Derivar.")],
        [s("El documento queda en estado Derivado.")]],
    # 9 · seguimiento
    9: [[s("En Seguimiento ves el avance y la ruta del documento,"),
         s("con la fecha de cada paso.")],
        [s("Y en Árbol completo, cada unidad y dependencia que lo tiene, con su estado.")]],
    # 10 · responder
    10: [[s("Para contestar, hacé clic en Responder."),
          s("La respuesta llega a la bandeja de quien te envió el documento.")],
         [s("Elegí el origen y la clasificación;"),
          s("cargá los datos de tu oficio de respuesta y adjuntá su PDF.")],
         [s("El remitente se completa solo: escribí la referencia,"),
          s("agregá anexos si hace falta y hacé clic en Enviar respuesta.")],
         [s("El documento queda Atendido, con la respuesta en su expediente.")]],
    # 11 · bandeja de salida y archivar
    11: [[s("En la Bandeja de salida está lo que tu unidad registró y envió."),
          s("La barra muestra cuántos destinos ya lo procesaron.")],
         [s("Al abrir uno, en Seguimiento ves el estado de cada unidad.")],
         [s("Cuando el trámite concluyó, hacé clic en Archivar y confirmá."),
          s("Un documento archivado ya no se puede modificar ni reenviar.")]],
    # 12 · recepcion de terceros
    12: [[s("Cuando una persona civil entrega documentación en ventanilla,"),
          s("usá Recepción de terceros.")],
         [s("Cargá los datos de quien entrega: nombre, carnet y teléfono;"),
          s("y los del documento: tipo, fecha, hojas, clasificación y referencia.")],
         [s("Hacé clic en Registrar recepción.")],
         [s("Dictale el código de seguimiento a la persona e imprimí su comprobante."),
          s("El documento ya está en tu bandeja de entrada.")]],
    # 13 · adscripciones
    13: [[s("En Adscripciones gestionás al personal de tu unidad."),
          s("Las solicitudes pendientes aparecen primero.")],
         [s("Hacé clic en Asignar y aprobar,"),
          s("y elegí la dependencia: cada cargo admite una sola persona.")],
         [s("Guardá la asignación."),
          s("En Integrantes de mi unidad podés cambiar su dependencia, reemplazarlo o desvincularlo.")]],
    # 14 · organigrama
    14: [[s("En Organigrama recorrés la estructura de tu unidad por niveles."),
          s("Cada dependencia tiene sus acciones: ver, añadir hija, modificar o inactivar.")],
         [s("Para crear una nueva, hacé clic en Añadir hija,"),
          s("escribí el nombre y guardá.")],
         [s("La nueva división aparece dentro de su departamento.")]],
    # 15 · notificaciones y perfil
    15: [[s("La campana te avisa en tiempo real de cada documento nuevo."),
          s("Podés ver solo las no leídas o marcarlas todas.")],
         [s("En tu avatar ves tus datos y tu unidad."),
          s("Al terminar la jornada, salí con Cerrar sistema.")]],
    # 16 · cierre y buenas practicas
    16: [[s("Recordá: configurá tu unidad, recepcioná a tiempo,"),
          s("revisá antes de enviar, derivá una sola vez"),
          s("y archivá solo lo concluido.")],
         [s("SISCOP: la correspondencia de tu unidad, en orden y a tiempo.")]],
}


def words(text):
    return [w for w in text.replace(",", " ").replace(".", " ").replace(":", " ").replace(";", " ").split() if w.strip("¿?¡!-")]


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


async def main():
    (ROOT / "audio").mkdir(exist_ok=True)
    (ROOT / "build").mkdir(exist_ok=True)
    data = {}
    for scene, utts in SCRIPT.items():
        data[scene] = []
        for ui, segs in enumerate(utts):
            path = ROOT / "audio" / f"h{scene:02d}_u{ui}.mp3"
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
            print(f"h{scene} u{ui}: {dur:.2f}s aligned={ok}")
    (ROOT / "build" / "narration_h.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print("total voz:", round(sum(u["dur"] for x in data.values() for u in x), 1), "s")


if __name__ == "__main__":
    asyncio.run(main())
