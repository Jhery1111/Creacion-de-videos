# SISCOP · Guía del rol Secretaria

Video tutorial (1920x1080, ~6 min 26 s, voz es-BO, subtítulos) con todo lo que hace la
secretaria de una unidad en SISCOP v2: configuración, nueva correspondencia, envío,
bandeja de entrada, recepción, derivación, seguimiento, respuesta, bandeja de salida y
archivo, recepción de terceros, adscripciones, organigrama, notificaciones y perfil.

Resultado: `renders/siscop-secretaria.mp4` y `renders/siscop-secretaria.srt`.

Las pantallas son capturas reales de SISCOP v2 corriendo en local con **datos ficticios**
(personas, CI, teléfonos y documentos inventados).

**Interno y externo.** Regla de la institución: *Interno* va a las dependencias de la propia
unidad; *Externo* va a otra unidad de la Policía. Por eso los documentos entre unidades se
siembran y se registran como EXTERNO. Las tarjetas Interno/Externo de SISCOP hoy describen
otra cosa; `capturar.cjs` reemplaza ese texto **solo en la captura** (la aplicación no se
modificó).

## Cómo se regenera

1. SISCOP local: backend NestJS en `:3000` (base `siscop_video`) y el frontend compilado
   servido con `node datos/servidor.mjs <frontend/dist> 5050`.
2. Datos: `BACKEND=<ruta>/siscop-v2/backend ./datos/preparar.sh`
   (vacía la correspondencia, siembra usuarios y documentos, genera `datos/sesiones.json`).
3. Capturas: `node capturar.cjs` (opcional `--solo <secciones>`) → `caps/*.png` y
   `build/targets.json` con las cajas de cada control, tomadas del DOM.
4. Voz: `python3 narration.py` → `audio/*.mp3` y `build/narration_h.json`.
5. Tiempos: `python3 timeline.py` → `build/timeline_h.json`.
6. Efectos y mezcla: `node preview.cjs --eventos` y luego `python3 audio.py` → `build/mix_h.wav`.
7. Render: `node render.cjs --workers 4`.

`node preview.cjs t1 t2 …` guarda cuadros sueltos en `build/preview/` para revisar.
`python3 revisar.py [prefijos]` arma una hoja con las capturas y sus objetivos marcados.
