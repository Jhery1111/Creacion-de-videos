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
    # Presentacion
    0: [[s("SISCOP, el Sistema de Correspondencia Policial.")],
        [s("En esta guía vas a ver todo lo que hace la secretaria de una unidad,"),
         s("y cómo hacerlo correctamente.")]],
    # 1 · Inicio
    1: [[s("Al ingresar llegás al panel de correspondencia."),
         s("Arriba ves los pendientes de tu unidad, lo que lleva más de tres días sin atender"),
         s("y el tiempo promedio de atención.")],
        [s("En el menú están las bandejas, la recepción de terceros y la nueva correspondencia;"),
         s("y en Ajustes, las adscripciones, el organigrama y la configuración.")]],
    # 2 · Configuracion
    2: [[s("Antes de empezar, configurá tu unidad."),
         s("En Configuración, pestaña Remitente,"),
         s("cargá el nombre, el cargo y el teléfono de quien firma los documentos.")],
        [s("Hacé clic en Guardar cambios:"),
         s("estos datos se completan solos en cada documento nuevo.")],
        [s("En Hoja de ruta podés activar la numeración automática,"),
         s("con un número inicial y un prefijo para tu unidad.")]],
    # 3 · Nueva correspondencia: tipo y documento
    3: [[s("Para registrar un documento, hacé clic en Nueva correspondencia."),
         s("El registro tiene cinco pasos.")],
        [s("Primero elegí el tipo: Interno, si va a las dependencias de tu propia unidad;"),
         s("Externo, si va a otra unidad de la Policía."),
         s("Este oficio va a otras unidades: marcá Externo y la clasificación; por ejemplo, Corriente.")],
        [s("En el paso dos cargá el número de documento, la fecha y el tipo."),
         s("La lista de tipos es la oficial de la institución."),
         s("Al ser externo, no lleva hoja de ruta.")],
        [s("Adjuntá el PDF escaneado del documento firmado.")],
        [s("Apenas lo cargás, el sistema te muestra hoja por hoja lo que tiene adentro"),
         s("y cuenta las hojas por vos."),
         s("Si el conteo no coincide con el documento en papel, podés corregirlo a mano.")],
        [s("Si el escaneo salió desordenado o trae hojas de más, usá Ordenar y quitar hojas:"),
         s("acomodá las hojas, sacá lo que sobra y aplicá.")],
        [s("Revisá siempre el desglose antes de seguir:"),
         s("lo que registres acá es lo que va a ver la unidad de destino.")]],
    # 4 · Nueva correspondencia: referencia e instrucciones
    4: [[s("En el paso tres, el remitente ya viene de la configuración."),
         s("Solo escribí la referencia: de qué trata el documento.")],
        [s("El paso cuatro es opcional: anexos o enlaces a archivos pesados.")],
        [s("El paso cinco depende del tipo."),
         s("En un documento Externo no se marcan instrucciones:"),
         s("las disposiciones son internas de la Policía, y a otra unidad se le manda el documento, no la orden.")],
        [s("Ahí solo revisás el resumen de lo que cargaste.")],
        [s("En cambio, si el documento fuera Interno, en este paso marcás las disposiciones"),
         s("para la dependencia que lo recibe; por ejemplo, Coordinar o Informar."),
         s("La lista es la oficial de la institución.")],
        [s("Hacé clic en Registrar correspondencia."),
         s("El sistema le asigna un código único.")]],
    # 5 · Enviar
    5: [[s("Registrar no es enviar."),
         s("Hacé clic en Enviar a unidades y buscá el destino por su nombre.")],
        [s("Cada unidad aparece con su emblema, para que no te equivoques de destino.")],
        [s("Podés marcar varias a la vez."),
         s("En un documento Externo, el envío va a unidades de nivel uno.")],
        [s("Confirmá con Sí, enviar."),
         s("El envío no se puede deshacer: revisá los destinos antes de confirmar.")],
        [s("Listo: la correspondencia quedó enviada.")],
        [s("Si el documento es Interno, el mismo botón te ofrece las dependencias de tu propia unidad.")]],
    # 6 · Bandeja de entrada
    6: [[s("Lo que llega a tu unidad aparece en la Bandeja de entrada."),
         s("Las carpetas filtran por estado: pendientes, por responder, recepcionados y más.")],
        [s("Hacé clic en un documento para ver su detalle en el panel lateral.")],
        [s("Ahí leés las instrucciones que dispuso quien lo envió, con su nombre completo.")],
        [s("Y con Ver PDF lo mirás sin salir de la bandeja:"),
         s("se abre encima, lo cerrás y seguís donde estabas.")]],
    # 7 · Recepcionar
    7: [[s("Cuando el documento llega a tu unidad, hacé clic en Recepcionar."),
         s("Si no corresponde, elegí Rechazar y explicá el motivo en observaciones.")],
        [s("Confirmá la recepción:"),
         s("quien lo envió ve al instante que tu unidad ya lo recibió.")],
        [s("Recepcioná lo antes posible: el panel mide el tiempo de atención.")]],
    # 8 · Derivar
    8: [[s("Con Abrir completo ves el documento entero y todas sus acciones:"),
         s("derivar, responder o marcarlo como atendido.")],
        [s("Esta pantalla es para leer."),
         s("Acomodar las hojas de un PDF se hace al cargarlo o al responder, no acá.")],
        [s("Derivar es interno: lo pasa a una dependencia de tu unidad."),
         s("Hacé clic en Derivar y elegí si va con un documento nuevo o sin documento."),
         s("Ojo: solo podés derivar una vez.")],
        [s("Marcá la dependencia de destino, revisá la hoja de ruta"),
         s("y confirmá con Derivar.")],
        [s("El documento queda en estado Derivado.")]],
    # 9 · Seguimiento
    9: [[s("En Seguimiento ves el avance y la ruta del documento,"),
         s("con la fecha de cada paso.")],
        [s("En Árbol completo, cada unidad y dependencia que lo tiene, con su estado.")],
        [s("Y en Datos, de un vistazo, cuántas respuestas lleva el documento desde que se creó"),
         s("y cuántas hojas suma el expediente.")]],
    # 10 · Responder
    10: [[s("Para contestar, hacé clic en Responder."),
          s("La respuesta llega a la bandeja de quien te envió el documento.")],
         [s("Como vuelve a otra unidad, elegí Externo y la clasificación;"),
          s("cargá los datos de tu oficio de respuesta y adjuntá su PDF.")],
         [s("Tu respuesta se une al documento que recibiste, así la otra unidad lee todo junto.")],
         [s("Las hojas que te mandaron aparecen con candado:"),
          s("no las podés mover ni quitar, porque son el documento de la otra unidad.")],
         [s("Las tuyas sí: podés sumar varios PDF, ordenarlos y sacar lo que no va.")],
         [s("El remitente se completa solo: escribí la referencia,"),
          s("agregá anexos si hace falta y hacé clic en Enviar respuesta.")],
         [s("El documento queda Atendido.")],
         [s("En el expediente, cada unidad que respondió tiene su propia tarjeta,"),
          s("con su escudo y su documento.")],
         [s("Tocá una y se abre esa respuesta con el original adelante, tal como esa unidad la mandó."),
          s("Las respuestas no se mezclan entre sí.")]],
    # 11 · Bandeja de salida
    11: [[s("En la Bandeja de salida está lo que tu unidad registró y envió."),
          s("La barra muestra cuántos destinos ya lo procesaron.")],
         [s("Al abrir uno, en Seguimiento ves el estado de cada unidad:"),
          s("quién lo tiene pendiente y quién ya lo recepcionó.")]],
    # 12 · Recepcion de terceros
    12: [[s("Cuando una persona civil entrega documentación en ventanilla,"),
          s("usá Recepción de terceros.")],
         [s("Cargá los datos de quien entrega: nombre, carnet y teléfono;"),
          s("y los del documento: tipo, fecha, hojas, clasificación y referencia.")],
         [s("Hacé clic en Registrar recepción.")],
         [s("Dictale el código de seguimiento a la persona e imprimí su comprobante."),
          s("El documento ya está en tu bandeja de entrada.")]],
    # 13 · Adscripciones
    13: [[s("En Adscripciones gestionás al personal de tu unidad."),
          s("Las solicitudes pendientes aparecen primero.")],
         [s("Hacé clic en Asignar y aprobar, y elegí la dependencia.")],
         [s("Un departamento, una división o una sección admiten una sola persona a cargo.")],
         [s("Si el cargo que elegiste ya está ocupado, el sistema te avisa y no deja guardar:"),
          s("designá un reemplazo o liberalo primero.")],
         [s("La unidad en sí es distinta: ahí van las secretarías, y una unidad puede tener varias.")],
         [s("Guardá la asignación."),
          s("En Integrantes de mi unidad podés cambiar su dependencia, reemplazarlo o desvincularlo.")],
         [s("Podés desvincular a alguien aunque tenga trámites sin terminar:"),
          s("los documentos quedan en la dependencia, no en la persona,"),
          s("y los ve quien ocupe el cargo después.")],
         [s("Y cuando una fila no tiene acciones, el sistema te explica por qué.")]],
    # 14 · Organigrama
    14: [[s("En Organigrama recorrés la estructura de tu unidad por niveles.")],
         [s("Ves solo tu unidad, con su emblema y los de sus dependencias,"),
          s("en dos columnas: la unidad a la izquierda y sus dependencias a la derecha.")],
         [s("Cada dependencia tiene sus acciones: ver, añadir hija, modificar o inactivar.")],
         [s("Para crear una nueva, hacé clic en Añadir hija,"),
          s("escribí el nombre y guardá.")],
         [s("La nueva división aparece dentro de su departamento.")]],
    # 15 · Avisos
    15: [[s("La campana te avisa en tiempo real de cada documento nuevo.")],
         [s("Cada aviso trae el código completo, sin cortar, y el estado en que está el documento.")],
         [s("Podés ver solo las no leídas o marcarlas todas."),
          s("Los avisos no se acumulan para siempre: los viejos se van solos.")],
         [s("En tu avatar ves tus datos y tu unidad."),
          s("Al terminar la jornada, salí con Cerrar sistema.")]],
    # Cierre
    16: [[s("Recordá: configurá tu unidad, recepcioná a tiempo,"),
          s("revisá antes de enviar, derivá una sola vez"),
          s("y elegí bien entre Interno y Externo.")],
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
