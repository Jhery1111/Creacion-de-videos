// Recorre SISCOP como la secretaria ficticia y guarda las capturas del tutorial.
//
// Cada captura: caps/<nombre>.png a 3200x1800 (viewport 1600x900 con escala 2) y las
// coordenadas de los controles que el video señala, tomadas del DOM (no de OCR):
//   build/targets.json -> { <captura>: { <clave>: [x0, y0, x1, y1] } } en píxeles de la captura.
//
// Uso: node capturar.cjs [--hasta <captura>]   (requiere SISCOP local en :5050 y datos/preparar.sh)
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const RAIZ = __dirname
const BASE = 'http://127.0.0.1:5050'
const tok = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos', 'sesiones.json'), 'utf8'))
const HASTA = process.argv.includes('--hasta') ? process.argv[process.argv.indexOf('--hasta') + 1] : null
const PDF = path.join(RAIZ, 'datos', 'CITE-DNTT-221-2026.pdf')
const PDF_RESP = path.join(RAIZ, 'datos', 'CITE-DNTT-230-2026.pdf')
const ESCALA = 2

let page
const TJSON = path.join(RAIZ, 'build', 'targets.json')
const targets = fs.existsSync(TJSON) ? JSON.parse(fs.readFileSync(TJSON, 'utf8')) : {}
const espera = (ms) => page.waitForTimeout(ms)

/** Captura la pantalla y las cajas de los objetivos (locators o funciones que devuelven uno). */
async function cap(nombre, objetivos = {}) {
  await espera(700)
  await page.screenshot({ path: path.join(RAIZ, 'caps', `${nombre}.png`) })
  const t = {}
  for (const [k, loc] of Object.entries(objetivos)) {
    const l = typeof loc === 'function' ? loc() : loc
    const bb = await l.first().boundingBox()
    if (!bb) throw new Error(`${nombre}.${k}: no visible`)
    t[k] = [bb.x, bb.y, bb.x + bb.width, bb.y + bb.height].map((v) => Math.round(v * ESCALA))
  }
  targets[nombre] = t
  console.log('✓', nombre, Object.keys(t).join(', '))
  if (HASTA === nombre) throw new Error('HASTA')
}

const txt = (s, exact = true) => page.getByText(s, { exact })
const btn = (name) => page.getByRole('button', { name })
const css = (s) => page.locator(s)
const ir = async (ruta) => { await page.goto(BASE + ruta, { waitUntil: 'networkidle' }); await espera(900) }
const nav = (titulo) => css('.layout-vertical-nav .nav-link').filter({ hasText: titulo })
/** Contenedor completo (borde, icono y etiqueta) del campo con esa etiqueta. */
const campo = (label) => page.getByLabel(label, { exact: true }).locator('xpath=ancestor::div[contains(@class,"v-input")][1]')
const pestana = (t) => css('.app-step-header__item').filter({ hasText: t })

/** Para depurar: guarda la pantalla actual en build/dbg-<n>.png y corta el recorrido. */
async function DEBUG(n) {
  await page.screenshot({ path: path.join(RAIZ, 'build', `dbg-${n}.png`), scale: 'css' })
  throw new Error('HASTA')
}

// ------------------------------------------------------------------------------------------
const SECCIONES = []
const seccion = (nombre, fn) => SECCIONES.push([nombre, fn])

seccion('inicio', async () => {
  await ir('/')
  await cap('01-inicio', {
    menu: css('.layout-vertical-nav'),
    kpis: css('.v-row').filter({ hasText: 'PENDIENTES' }).first(),
    campana: css('.layout-navbar .v-badge').first(),
    avatar: css('.avatar-topbar'),
    nueva: css('.hero-card .v-btn'),
  })
})

seccion('configuracion', async () => {
  await nav('Configuración').click(); await espera(900)
  await pestana('Remitente').click(); await espera(500)
  await cap('02-config-vacia', {
    menu: nav('Configuración'),
    tab: pestana('Remitente'),
    nombre: campo('Nombre del remitente'),
    cargo: campo('Cargo del remitente'),
    telefono: campo('Teléfono / Celular institucional'),
    guardar: btn(/Guardar Cambios/i),
  })
  await page.getByLabel('Nombre del remitente').fill('Cnl. DESP. FREDDY ARANCIBIA MOLINA')
  await page.getByLabel('Cargo del remitente').fill('DIRECTOR NACIONAL DE TECNOLOGIA Y TELEMATICA')
  await page.getByLabel('Teléfono / Celular institucional').fill('2-2157310')
  await css('h4').first().click()
  await cap('03-config-llena', {
    nombre: campo('Nombre del remitente'),
    cargo: campo('Cargo del remitente'),
    telefono: campo('Teléfono / Celular institucional'),
    guardar: btn(/Guardar Cambios/i),
  })
  await btn(/Guardar Cambios/i).click(); await espera(900)
  await cap('04-config-guardada', { aviso: css('.v-alert').filter({ hasText: /guardad/i }).first() })

  await pestana('Hoja de Ruta').click(); await espera(700)
  await txt('Activar autonumeración de hoja de ruta').click()
  await page.getByLabel('Prefijo (opcional)').fill('DNTT-')
  await page.getByLabel('Número inicial').fill('420')
  await css('h4').first().click(); await espera(300)
  await cap('05-config-hr', {
    tab: pestana('Hoja de Ruta'),
    activar: txt('Activar autonumeración de hoja de ruta'),
    inicial: campo('Número inicial'),
    prefijo: campo('Prefijo (opcional)'),
    proxima: campo('Próxima hoja de ruta'),
    guardar: btn(/Guardar Cambios/i),
  })
  await btn(/Guardar Cambios/i).click(); await espera(900)
})

seccion('nueva', async () => {
  await nav('Nueva correspondencia').click(); await espera(1000)
  const pasos = css('.nueva-corr-card .v-row > div').first()
  const chip = (t) => css('.clasificacion-chip').filter({ hasText: t })
  await chip('NORMAL').click(); await espera(300)
  await cap('06-nueva-p1', {
    menu: nav('Nueva correspondencia'),
    pasos,
    interno: css('.option-card').nth(0),
    externo: css('.option-card').nth(1),
    clasificaciones: css('.clasificacion-chip').first().locator('xpath=..'),
    normal: chip('NORMAL'),
    siguiente: btn(/Siguiente/),
  })
  await btn(/Siguiente/).click(); await espera(700)
  await cap('07-nueva-p2-vacia', {
    numero: campo('Número de documento *'),
    fecha: campo('Fecha del documento *'),
    tipo: campo('Tipo de documento *'),
    hojaRuta: campo('Nº de hoja de ruta *'),
    hojas: campo('Número de hojas *'),
    pdf: css('.dropzone').first(),
  })
  await page.getByLabel('Número de documento *', { exact: true }).fill('CITE DNTT N° 221/2026')
  await page.getByLabel('Tipo de documento *', { exact: true }).click(); await espera(400)
  await page.getByRole('option', { name: 'CITE', exact: true }).click(); await espera(300)
  const hr = page.getByLabel('Nº de hoja de ruta *', { exact: true })
  if (!(await hr.inputValue())) await hr.fill('DNTT-420')
  await page.getByLabel('Número de hojas *', { exact: true }).fill('2')
  await css('input[type=file][accept="application/pdf"]').setInputFiles(PDF); await espera(500)
  await css('h4').first().click()
  await cap('08-nueva-p2-llena', {
    numero: campo('Número de documento *'),
    tipo: campo('Tipo de documento *'),
    hojaRuta: campo('Nº de hoja de ruta *'),
    hojas: campo('Número de hojas *'),
    pdf: css('.v-card').filter({ hasText: 'CITE-DNTT-221-2026.pdf' }).last(),
    siguiente: btn(/Siguiente/),
  })
  await btn(/Siguiente/).click(); await espera(700)
  await page.getByLabel('Referencia / Asunto *', { exact: true })
    .fill('Solicitud de información sobre equipos de radiocomunicación en uso')
  await css('h4').first().click()
  await cap('09-nueva-p3', {
    nombre: campo('Nombre del remitente *'),
    cargo: campo('Cargo del remitente *'),
    telefono: campo('Teléfono / Celular institucional *'),
    referencia: campo('Referencia / Asunto *'),
    siguiente: btn(/Siguiente/),
  })
  await btn(/Siguiente/).click(); await espera(700)
  await cap('10-nueva-p4', {
    archivos: css('.dropzone').first(),
    enlace: btn(/Agregar enlace/i),
    siguiente: btn(/Siguiente/),
  })
  await btn(/Siguiente/).click(); await espera(700)
  const instr = (t) => css('.instruccion-item').filter({ hasText: t })
  await instr('INFORMAR').click(); await instr('RESPONDER').click(); await espera(300)
  await cap('11-nueva-p5', {
    grilla: css('.instrucciones-grid'),
    informar: instr('INFORMAR'),
    responder: instr('RESPONDER'),
    registrar: btn(/Registrar correspondencia/i),
  })
  await btn(/Registrar correspondencia/i).click(); await espera(1800)
  await cap('12-registrada', {
    aviso: css('.app-toast .v-snackbar__wrapper'),
    codigo: css('.text-h4').first(),
    estado: css('.v-chip').filter({ hasText: 'Pendiente' }).first(),
    editar: btn(/Editar/),
    enviar: btn(/Enviar a unidades/i),
    hojaRuta: btn(/Hoja de Ruta/i),
    pestanas: css('.app-step-header'),
  })
})

const cerrarAviso = async () => {
  const x = css('.app-toast .v-btn')
  if (await x.count() && await x.first().isVisible()) { await x.first().click(); await espera(400) }
}

seccion('enviar', async () => {
  await cerrarAviso()
  await btn(/Enviar a unidades/i).click(); await espera(900)
  const dlg = css('.v-overlay--active .v-card').last()
  const buscar = dlg.getByPlaceholder(/Buscar por nombre/)
  const fila = (t) => dlg.getByText(t, { exact: true })
  await buscar.fill('personal'); await espera(600)
  await fila('DIRECCION NACIONAL DE PERSONAL').click(); await espera(400)
  await cap('13-enviar-buscar', {
    buscar: buscar.locator('xpath=ancestor::div[contains(@class,"v-input")][1]'),
    fila: fila('DIRECCION NACIONAL DE PERSONAL'),
    dialogo: dlg,
  })
  await buscar.fill('la paz'); await espera(600)
  await fila('COMANDO DEPARTAMENTAL DE POLICIA LA PAZ').click(); await espera(400)
  await cap('14-enviar-seleccion', {
    buscar: buscar.locator('xpath=ancestor::div[contains(@class,"v-input")][1]'),
    fila: fila('COMANDO DEPARTAMENTAL DE POLICIA LA PAZ'),
    enviar: dlg.getByRole('button', { name: /Enviar/ }),
  })
  await dlg.getByRole('button', { name: /Enviar/ }).click(); await espera(800)
  const conf = css('.v-overlay--active .v-card').last()
  await cap('15-enviar-confirmar', {
    lista: conf.getByText('Se enviará a:').locator('xpath=..'),
    aviso: conf.locator('.v-alert'),
    cancelar: conf.getByRole('button', { name: 'Cancelar' }),
    confirmar: conf.getByRole('button', { name: /Si, enviar/i }),
  })
  await conf.getByRole('button', { name: /Si, enviar/i }).click(); await espera(1600)
  await cap('16-enviada', {
    aviso: css('.app-toast .v-snackbar__wrapper'),
    estado: css('.v-chip').filter({ hasText: /Enviado/ }).first(),
  })
  await cerrarAviso()
})

const MANT = 'Solicitud de mantenimiento preventivo de equipos de computación'
const fila = (t) => css('.bandeja-row').filter({ hasText: t }).first()

seccion('entrada', async () => {
  await nav('Bandeja de entrada').click(); await espera(1200)
  await cap('17-entrada', {
    menu: nav('Bandeja de entrada'),
    carpetas: css('.bandeja-layout .v-navigation-drawer').first(),
    pendientes: txt('Pendientes').first(),
    buscar: page.getByPlaceholder(/Buscar código/),
    fila: fila(MANT),
    estado: fila(MANT).getByText('Pendiente', { exact: true }),
    campana: css('.layout-navbar .v-badge').first(),
  })
  await fila(MANT).click(); await espera(900)
  const panel = css('.v-navigation-drawer--right, .v-navigation-drawer--location-right, .v-navigation-drawer--end').filter({ hasText: 'Recepcionar' }).last()
  await cap('18-panel', {
    panel,
    recepcionar: panel.getByRole('button', { name: /Recepcionar/ }),
    rechazar: panel.getByRole('button', { name: /Rechazar/ }),
    abrir: panel.getByRole('button', { name: /Abrir completo/i }),
    pdf: panel.getByText('Documento adjunto disponible').locator('xpath=ancestor::div[contains(@class,"v-alert") or contains(@class,"v-card")][1]'),
  })
  await panel.getByRole('button', { name: /Recepcionar/ }).click(); await espera(800)
  const dlg = css('.v-overlay--active .v-card').last()
  await cap('19-recepcionar', {
    dialogo: dlg,
    opciones: dlg.locator('.v-radio-group'),
    rechazar: dlg.getByText('Rechazar', { exact: true }),
    observaciones: dlg.locator('.v-textarea'),
    confirmar: dlg.getByRole('button', { name: /Confirmar recepción/i }),
  })
  await dlg.getByRole('button', { name: /Confirmar recepción/i }).click(); await espera(1400)
  await cap('20-recepcionada', {
    aviso: css('.app-toast .v-snackbar__wrapper'),
    estado: fila(MANT).getByText('Recepcionado', { exact: true }),
    carpeta: txt('Recepcionados').first(),
  })
  await cerrarAviso()
  await fila(MANT).click(); await espera(900)
  const panel2 = css('.v-navigation-drawer').filter({ hasText: 'Abrir Completo' }).last()
  await panel2.getByRole('button', { name: /Abrir completo/i }).click(); await espera(1500)
  const acciones = css('.v-card-actions').filter({ hasText: 'Responder' }).first()
  await cap('21-detalle', {
    codigo: txt('2404112600002IN').first(),
    estado: css('.v-chip').filter({ hasText: /^RECEPCIONADO$/ }).first(),
    pdf: btn(/Ver PDF original/i),
    hojaRuta: acciones.getByRole('button', { name: /Hoja de Ruta/i }),
    derivar: acciones.getByRole('button', { name: /^Derivar$/i }),
    responder: acciones.getByRole('button', { name: /^Responder$/i }),
    atendido: btn(/Marcar como atendido/i),
    pestanas: css('.app-step-header').first(),
    instrucciones: txt('Instrucciones:').locator('xpath=..'),
  })
  await acciones.getByRole('button', { name: /^Derivar$/i }).click(); await espera(900)
  const dd = css('.v-overlay--active .v-card').filter({ hasText: 'Derivar correspondencia' }).last()
  await cap('22-derivar-modo', {
    dialogo: dd,
    con: dd.locator('.derivar-opcion').nth(0),
    sin: dd.locator('.derivar-opcion').nth(1),
    unaVez: dd.getByText(/solo puede derivar/),
  })
  await dd.locator('.derivar-opcion').nth(1).click(); await espera(1200)
  const soporte = dd.locator('.selector-unidades__item').filter({ hasText: 'SOPORTE TECNICO' })
  await soporte.click(); await espera(500)
  await page.mouse.move(1500, 860); await espera(300)
  await cap('23-derivar-seleccion', {
    dialogo: dd,
    modo: dd.locator('.v-chip').filter({ hasText: /Derivando/ }),
    buscar: dd.getByPlaceholder(/Buscar por nombre/),
    lista: dd.locator('.selector-unidades__lista'),
    soporte,
    hojaRuta: campo('Nº de hoja de ruta'),
    derivar: dd.getByRole('button', { name: /^Derivar/ }),
  })
  await dd.getByRole('button', { name: /^Derivar/ }).click(); await espera(1600)
  await cap('24-derivada', {
    aviso: css('.app-toast .v-snackbar__wrapper'),
    estado: css('.v-chip').filter({ hasText: /^DERIVADO$/ }).first(),
    arbol: pestana('Árbol completo'),
  })
  await cerrarAviso()
  await pestana('Seguimiento').click(); await espera(1200)
  await cap('25-seguimiento', {
    pestana: pestana('Seguimiento'),
    avance: txt('Avance del documento').locator('xpath=ancestor::div[contains(@class,"v-card")][1]'),
    ruta: txt('Ruta del documento').locator('xpath=ancestor::div[contains(@class,"v-card")][1]'),
    derivado: txt('Derivado').last(),
  })
  await pestana('Árbol completo').click(); await espera(1200)
  await btn(/Expandir/).click(); await espera(800)
  await cap('26-arbol', {
    pestana: pestana('Árbol completo'),
    filtros: txt('Todos (1)').locator('xpath=..'),
    expandir: btn(/Expandir/),
    soporte: css('text=DEPARTAMENTO NACIONAL SOPORTE TECNICO >> visible=true').locator('xpath=ancestor::div[1]'),
  })
  await btn(/^Responder$/).click(); await espera(1500)
  await css('.clasificacion-chip').filter({ hasText: 'NORMAL' }).click(); await espera(300)
  await cap('27-responder-p1', {
    destino: txt(/la respuesta llega a la bandeja de/, false).first(),
    pasos: css('.app-step-header').first(),
    interno: css('.option-card').nth(0),
    normal: css('.clasificacion-chip').filter({ hasText: 'NORMAL' }),
    siguiente: btn(/Siguiente/),
  })
  await btn(/Siguiente/).click(); await espera(700)
  await page.getByLabel('Número de documento *', { exact: true }).fill('CITE DNTT N° 230/2026')
  await page.getByLabel('Tipo de documento *', { exact: true }).click(); await espera(400)
  await page.getByRole('option', { name: 'CITE', exact: true }).click(); await espera(300)
  await page.getByLabel('Número de hojas *', { exact: true }).fill('1')
  await css('input[type=file][accept="application/pdf"]').first().setInputFiles(PDF_RESP); await espera(500)
  await page.mouse.click(1500, 330); await espera(300)
  await cap('28-responder-p2', {
    numero: campo('Número de documento *'),
    fecha: campo('Fecha del documento *'),
    tipo: campo('Tipo de documento *'),
    hojas: campo('Número de hojas *'),
    pdf: css('.v-card').filter({ hasText: 'CITE-DNTT-230-2026.pdf' }).last(),
    siguiente: btn(/Siguiente/),
  })
  await btn(/Siguiente/).click(); await espera(700)
  await page.getByLabel('Referencia / Asunto *', { exact: true })
    .fill('Respuesta: mantenimiento preventivo programado para la semana del 9 de noviembre')
  await page.mouse.click(1500, 330); await espera(300)
  await cap('29-responder-p3', {
    nombre: campo('Nombre del remitente *'),
    cargo: campo('Cargo del remitente *'),
    referencia: campo('Referencia / Asunto *'),
    siguiente: btn(/Siguiente/),
  })
  await btn(/Siguiente/).click(); await espera(700)
  await cap('30-responder-p4', {
    archivos: css('.dropzone').first(),
    enlace: btn(/Agregar enlace/i),
    resumen: txt('Resumen').first(),
  })
  await btn(/Enviar respuesta/).scrollIntoViewIfNeeded(); await espera(500)
  await cap('31-responder-enviar', {
    resumen: txt('Responde a').locator('xpath=ancestor::div[contains(@class,"v-card") or contains(@class,"v-sheet")][1]'),
    enviar: btn(/Enviar respuesta/),
  })
  await btn(/Enviar respuesta/).click(); await espera(2500)
  await cap('32-respondida', {
    aviso: css('.app-toast .v-snackbar__wrapper'),
    estado: css('.v-chip').filter({ hasText: /^ATENDIDO$/ }).first(),
    respuesta: css('.v-alert, .v-card').filter({ hasText: /Respondido — Doc/ }).last(),
  })
  await cerrarAviso()
})

const CRONO = 'Cronograma de mantenimiento de la red de radiocomunicaciones'

seccion('salida', async () => {
  await nav('Bandeja de salida').click(); await espera(1200)
  await cap('33-salida', {
    menu: nav('Bandeja de salida'),
    carpetas: css('.bandeja-layout .v-navigation-drawer').first(),
    pendientesEnvio: txt('Pendientes de envío').first(),
    esperando: txt('Esperando respuesta').first(),
    tipos: txt('Internos').locator('xpath=ancestor::div[contains(@class,"d-flex")][1]'),
    fila: fila(CRONO),
    avance: fila(CRONO).getByText('1/2', { exact: true }),
  })
  await fila(CRONO).click(); await espera(1500)
  await pestana('Seguimiento').click(); await espera(1200)
  await cap('34-salida-seguimiento', {
    codigo: css('.text-h5, .text-h4').filter({ hasText: /IN$/ }).first(),
    para: txt(/Para: 2 unidades/, false).first(),
    avance: txt('Avance del documento').locator('xpath=ancestor::div[contains(@class,"v-card")][1]'),
    pendientes: txt('Pendientes', true).locator('xpath=ancestor::div[contains(@class,"v-sheet") or contains(@class,"rounded")][1]').first(),
    unidades: txt('Estado por unidad'),
    archivar: btn(/^Archivar$/),
  })
  await btn(/^Archivar$/).click(); await espera(800)
  const da = css('.v-overlay--active .v-card').filter({ hasText: '¿Archivar esta correspondencia?' }).last()
  await cap('35-archivar', {
    dialogo: da,
    confirmar: da.getByRole('button', { name: /Si, archivar/ }),
    cancelar: da.getByRole('button', { name: /Cancelar/ }),
  })
  await da.getByRole('button', { name: /Si, archivar/ }).click(); await espera(1600)
  await cap('36-archivada', {
    aviso: css('.app-toast .v-snackbar__wrapper'),
    estado: css('.v-chip').filter({ hasText: /^Archivado$/ }).first(),
  })
  await cerrarAviso()
})

seccion('terceros', async () => {
  await nav('Recepción de terceros').click(); await espera(1200)
  await cap('37-terceros', {
    menu: nav('Recepción de terceros'),
    persona: txt('Persona que entrega').locator('xpath=ancestor::fieldset[1]'),
    documentacion: txt('Documentación entregada').locator('xpath=ancestor::fieldset[1]'),
  })
  await page.getByLabel('Nombre completo *', { exact: true }).fill('María Elena Quispe Condori')
  await page.getByLabel('Cédula de identidad *', { exact: true }).fill('9132457 LP')
  await page.getByLabel('Teléfono de contacto', { exact: true }).fill('71548236')
  await page.getByLabel('Tipo de documento *', { exact: true }).click(); await espera(400)
  await page.getByRole('option', { name: 'SOLICITUD', exact: true }).click(); await espera(300)
  const f = page.getByLabel('Fecha del documento *', { exact: true })
  if (!(await f.inputValue())) await f.fill('2026-11-04')
  await page.getByLabel('Número de hojas *', { exact: true }).fill('3')
  await css('.clasificacion-chip').filter({ hasText: 'NORMAL' }).click()
  await page.getByLabel('Referencia / Asunto *', { exact: true })
    .fill('Solicitud de certificado de trabajo para trámite de jubilación')
  await page.mouse.click(1500, 130); await espera(300)
  await cap('38-terceros-lleno', {
    nombre: campo('Nombre completo *'),
    ci: campo('Cédula de identidad *'),
    telefono: campo('Teléfono de contacto'),
    tipo: campo('Tipo de documento *'),
    fecha: campo('Fecha del documento *'),
    hojas: campo('Número de hojas *'),
    clasificacion: css('.clasificacion-chip').filter({ hasText: 'NORMAL' }),
    referencia: campo('Referencia / Asunto *'),
  })
  await btn(/Registrar recepción/).scrollIntoViewIfNeeded(); await espera(500)
  await cap('39-terceros-registrar', {
    escaneo: css('.dropzone').first(),
    registrar: btn(/Registrar recepción/),
  })
  await btn(/Registrar recepción/).click(); await espera(1800)
  await cap('40-terceros-registrado', {
    aviso: css('.app-toast .v-snackbar__wrapper'),
    codigo: css('.codigo-alerta'),
    imprimir: btn(/Imprimir comprobante/i),
    siguiente: btn(/Siguiente persona/i),
    bandeja: btn(/Ir a la bandeja/i),
  })
  await cerrarAviso()
})

seccion('adscripciones', async () => {
  await nav('Adscripciones').click(); await espera(1300)
  const juan = css('.v-card').filter({ hasText: 'JUAN CARLOS ALIAGA PEREZ' }).last()
  await cap('41-adscripciones', {
    menu: nav('Adscripciones'),
    pestanas: css('.app-step-header').first(),
    solicitud: juan,
    aprobar: juan.getByRole('button', { name: /Asignar y aprobar/i }),
    rechazar: juan.getByRole('button', { name: /Rechazar/i }),
  })
  await juan.getByRole('button', { name: /Asignar y aprobar/i }).click(); await espera(1200)
  const dj = css('.v-overlay--active .v-card').filter({ hasText: 'Seleccionar dependencia' }).last()
  await page.getByLabel('Departamento · Nivel 2', { exact: true }).click(); await espera(600)
  const plan = page.getByRole('option', { name: 'DEPARTAMENTO NACIONAL PLANIFICACION', exact: true })
  await cap('42-adscribir-lista', {
    dialogo: dj,
    persona: dj.getByText(/JUAN CARLOS ALIAGA PEREZ/),
    unidad: campo('Unidad · Nivel 1'),
    departamento: campo('Departamento · Nivel 2'),
    lista: css('.v-overlay--active .v-list').last(),
    opcion: plan,
  })
  await plan.click(); await espera(800)
  await page.mouse.move(1500, 860); await espera(300)
  await cap('43-adscribir-elegido', {
    dialogo: dj,
    departamento: campo('Departamento · Nivel 2'),
    division: campo('División · Nivel 3'),
    nota: dj.getByText(/Los niveles inferiores son opcionales/),
    guardar: dj.getByRole('button', { name: /Guardar asignación/i }),
  })
  await dj.getByRole('button', { name: /Guardar asignación/i }).click(); await espera(1500)
  await pestana('Integrantes').click(); await espera(1200)
  const filaJuan = css('tr').filter({ hasText: 'JUAN CARLOS ALIAGA' })
  await cap('44-integrantes', {
    pestana: pestana('Integrantes'),
    buscar: campo('Buscar por nombre, CI, rol o cargo'),
    juan: filaJuan,
    cargo: filaJuan.getByText(/PLANIFICACION/),
    cambiar: filaJuan.getByRole('button', { name: /Seleccionar dependencia/i }),
    desvincular: filaJuan.getByRole('button', { name: /Desvincular/i }),
    reemplazar: filaJuan.locator('.reemplazo-select'),
  })
})

seccion('organigrama', async () => {
  await nav('Organigrama').click(); await espera(1500)
  await page.getByLabel('Buscar unidad', { exact: true }).fill('TECNOLOGIA'); await espera(700)
  await css('.organigrama-raiz').filter({ hasText: 'TECNOLOGIA Y TELEMATICA' }).first().click(); await espera(1500)
  const tarjeta = css('.organigrama-tarjeta').first()
  await cap('45-organigrama', {
    menu: nav('Organigrama'),
    buscar: campo('Buscar unidad'),
    raiz: css('.organigrama-raiz-activa'),
    unidad: txt('8 dependencias hijas').locator('xpath=..'),
    crear: btn(/Crear dependencia/i),
    tarjeta,
    ver: tarjeta.getByRole('button', { name: /Ver dependencias/i }),
    anadir: tarjeta.getByRole('button', { name: /Añadir hija/i }),
    modificar: tarjeta.getByRole('button', { name: /Modificar/i }),
    inactivar: tarjeta.getByRole('button', { name: /Inactivar/i }),
  })
  await page.getByLabel('Buscar dependencias', { exact: true }).fill('INFORMATICA'); await espera(700)
  const info = css('.organigrama-tarjeta').filter({ hasText: 'DEPARTAMENTO NACIONAL INFORMATICA' }).first()
  await page.mouse.move(1500, 860); await espera(300)
  await cap('45b-organigrama-filtro', {
    buscar: campo('Buscar dependencias'),
    tarjeta: info,
    anadir: info.getByRole('button', { name: /Añadir hija/i }),
  })
  await info.getByRole('button', { name: /Añadir hija/i }).click(); await espera(900)
  const dn = css('.v-overlay--active .v-card').filter({ hasText: 'Nueva división' }).last()
  await page.getByLabel('Nombre', { exact: true }).fill('DIVISION DE CAPACITACION TECNOLOGICA')
  await page.getByLabel('Descripción (opcional)', { exact: true }).fill('Capacitación del personal en el uso de los sistemas institucionales')
  await cap('46-nueva-division', {
    dialogo: dn,
    nombre: campo('Nombre'),
    padre: campo('Dependencia padre'),
    descripcion: campo('Descripción (opcional)'),
    guardar: dn.getByRole('button', { name: /^Guardar$/ }),
  })
  await dn.getByRole('button', { name: /^Guardar$/ }).click(); await espera(1500)
  await info.getByRole('button', { name: /Ver dependencias/i }).click(); await espera(1500)
  await page.getByLabel('Buscar dependencias', { exact: true }).fill('CAPACITACION'); await espera(700)
  await cap('47-division-creada', {
    migas: css('.organigrama-migas'),
    nivel: txt('DEPARTAMENTO NACIONAL INFORMATICA').nth(1),
    nueva: css('.organigrama-tarjeta').filter({ hasText: 'CAPACITACION TECNOLOGICA' }).first(),
  })
})

seccion('perfil', async () => {
  await nav('Inicio').click(); await espera(1500)
  await css('.layout-navbar .v-badge').first().click(); await espera(900)
  const notif = css('.v-overlay--active .v-card').filter({ hasText: 'Notificaciones' }).last()
  await cap('48-notificaciones', {
    campana: css('.layout-navbar .v-badge').first(),
    panel: notif,
    noLeidas: notif.getByText('No Leídas'),
    marcar: notif.getByRole('button', { name: /Marcar todas/i }),
    primera: notif.locator('.v-list-item').first(),
    verTodas: notif.getByRole('button', { name: /Ver todas/i }),
  })
  await page.keyboard.press('Escape'); await espera(500)
  await css('.layout-navbar .v-avatar').last().click(); await espera(800)
  const menu = css('.v-overlay--active .v-card').filter({ hasText: 'Usuario en sesion' }).last()
  await cap('49-perfil', {
    menu,
    usuario: menu.getByText(/CARLA ANDREA VARGAS ROJAS/),
    rol: menu.getByText('Secretaria', { exact: true }).locator('xpath=..'),
    unidad: menu.getByText('Datos Laborales').locator('xpath=..'),
    perfil: menu.getByRole('button', { name: /Perfil de usuario/i }),
    cerrar: menu.getByRole('button', { name: /Cerrar sistema/i }),
  })
})

// ------------------------------------------------------------------------------------------
async function recorrido() {
  const solo = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1] : null
  if (solo) await ir('/')
  for (const [nombre, fn] of SECCIONES) {
    if (solo && !solo.split(',').includes(nombre)) continue
    await fn()
  }
}

// ------------------------------------------------------------------------------------------
;(async () => {
  fs.mkdirSync(path.join(RAIZ, 'caps'), { recursive: true })
  fs.mkdirSync(path.join(RAIZ, 'build'), { recursive: true })
  const b = await chromium.launch({
    args: ['--lang=es-BO'],
    // Sin LANG el campo de fecha sale en formato de EE. UU. (mm/dd/aaaa).
    env: { ...process.env, LANG: 'es_BO.UTF-8', LANGUAGE: 'es_BO:es', LC_ALL: 'es_BO.UTF-8' },
  })
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: ESCALA, timezoneId: 'America/La_Paz', locale: 'es-BO' })
  await ctx.addCookies([
    { name: 'siscop_at', value: tok.carla, url: BASE },
    { name: 'SISCOP-theme', value: 'light', url: BASE },
  ])
  page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!/nodeType/.test(e.message)) console.log('ERROR página:', e.message) })
  try { await recorrido() }
  catch (e) { if (e.message !== 'HASTA') { console.error(e); await page.screenshot({ path: path.join(RAIZ, 'build', 'error.png') }); process.exitCode = 1 } }
  fs.writeFileSync(path.join(RAIZ, 'build', 'targets.json'), JSON.stringify(targets, null, 1))
  fs.writeFileSync(path.join(RAIZ, 'build', 'targets.js'), 'window.TARGETS = ' + JSON.stringify(targets) + ';\n')
  await b.close()
})()
