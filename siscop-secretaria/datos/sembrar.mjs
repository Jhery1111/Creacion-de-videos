// Datos de ejemplo para grabar el tutorial de Secretarias en un SISCOP LOCAL.
// Todas las personas son ficticias. Las unidades son las del organigrama real.
//
// Uso (desde cualquier carpeta):
//   BACKEND=/ruta/siscop-v2/backend API=http://127.0.0.1:5050/api node sembrar.mjs
// Escribe datos/sesiones.json con un token por usuario (solo para este entorno local).
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const BACKEND = process.env.BACKEND
const API = process.env.API || 'http://127.0.0.1:5050/api'
const require = createRequire(path.join(BACKEND, 'package.json'))
const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')
const PDFDocument = require('pdfkit')

// Variables del .env local del backend
for (const l of fs.readFileSync(path.join(BACKEND, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z_]+)="?(.*?)"?$/.exec(l.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}
const prisma = new PrismaClient()

const U = {
  COMANDO: 15, TELEMATICA: 37, PERSONAL: 24, LA_PAZ: 45, ADMINISTRATIVA: 27,
  INFORMATICA: 349, TELECOM: 348, SOPORTE: 345,
}
// Catalogos oficiales (pnpm seed:catalogos): se buscan por nombre, nunca por id.
let T, C, I
async function cargarCatalogos() {
  const porNombre = (filas) => Object.fromEntries(filas.map((f) => [f.nombre, f.id]))
  T = porNombre(await prisma.tipoDocumento.findMany({ where: { activo: true } }))
  C = porNombre(await prisma.clasificacion.findMany({ where: { activo: true } }))
  I = porNombre(await prisma.instruccion.findMany({ where: { activo: true } }))
  const pedidos = [[T, ['INSTRUCTIVO', 'INFORME', 'OFICIO', 'MEMORANDUM', 'MEMORANDUM CIRCULAR']],
    [C, ['CORRIENTE', 'URGENTE', 'RESERVADO']], [I, ['INFORMAR', 'DAR RESPUESTA', 'COORDINAR', 'DAR CURSO', 'A CONOCIMIENTO DE']]]
  for (const [m, nombres] of pedidos) for (const n of nombres) if (!m[n]) throw new Error(`Falta "${n}" en los catálogos: correr pnpm seed:catalogos`)
}

const USUARIOS = {
  carla: { nombre: 'CARLA ANDREA VARGAS ROJAS', grado: 'Sof. 1ro.', usuario: 'cvargas', ci: '6845213', rol: 'SECRETARIA', unidad: U.TELEMATICA },
  elena: { nombre: 'ELENA PATRICIA SUAREZ ROCHA', grado: 'Sof. My.', usuario: 'esuarez', ci: '4389615', rol: 'SECRETARIA', unidad: U.COMANDO },
  luis: { nombre: 'LUIS FERNANDO MAMANI CHOQUE', grado: 'Sgto. 1ro.', usuario: 'lmamani', ci: '4721986', rol: 'SECRETARIA', unidad: U.PERSONAL },
  rosa: { nombre: 'ROSA ELENA CONDORI APAZA', grado: 'Sof. 2do.', usuario: 'rcondori', ci: '5390147', rol: 'SECRETARIA', unidad: U.LA_PAZ },
  marco: { nombre: 'MARCO ANTONIO GUTIERREZ LIMA', grado: 'Sgto.', usuario: 'mgutierrez', ci: '6012375', rol: 'SECRETARIA', unidad: U.ADMINISTRATIVA },
  diego: { nombre: 'DIEGO ARMANDO QUISPE TICONA', grado: 'Cbo.', usuario: 'dquispe', ci: '7314520', rol: 'PERSONAL', unidad: U.TELEMATICA, dependencia: U.INFORMATICA },
  paola: { nombre: 'PAOLA ANDREA FLORES CRUZ', grado: 'Sgto. 2do.', usuario: 'pflores', ci: '6658041', rol: 'PERSONAL', unidad: U.TELEMATICA, dependencia: U.TELECOM },
  rodrigo: { nombre: 'RODRIGO JAVIER CHOQUE MENDOZA', grado: 'Sgto.', usuario: 'rchoque', ci: '5986230', rol: 'PERSONAL', unidad: U.TELEMATICA, dependencia: U.SOPORTE },
  juan: { nombre: 'JUAN CARLOS ALIAGA PEREZ', grado: 'Pol.', usuario: 'jaliaga', ci: '8120364', rol: 'PERSONAL', unidad: null, solicita: U.TELEMATICA },
  lucia: { nombre: 'LUCIA FERNANDA RAMOS QUIROGA', grado: 'Sgto. 2do.', usuario: 'lramos', ci: '7265093', rol: 'SECRETARIA', unidad: U.TELEMATICA },
}

const lectura = ['VER_INICIO', 'VER_BANDEJA_ENTRADA', 'VER_BANDEJA_SALIDA']
const operacion = ['CREAR_CORRESPONDENCIA', 'EDITAR_CORRESPONDENCIA', 'ATENDER_CORRESPONDENCIA']
const ventanilla = ['ENVIAR_CORRESPONDENCIA', 'RECEPCIONAR_CORRESPONDENCIA', 'DERIVAR_CORRESPONDENCIA', 'RESPONDER_CORRESPONDENCIA']
const administracion = ['ARCHIVAR_CORRESPONDENCIA', 'RECEPCION_TERCEROS', 'VER_RECEPCION', 'VER_CONFIGURACION', 'GESTIONAR_ADSCRIPCIONES', 'VER_ORGANIGRAMA']
const permisos = (rol, unidad) => !unidad ? [] : rol === 'SECRETARIA'
  ? [...lectura, ...operacion, ...ventanilla, ...administracion] : [...lectura, ...operacion]

async function crearUsuarios() {
  const ids = {}
  for (const [k, u] of Object.entries(USUARIOS)) {
    const datos = {
      kerberosUuid: `video-${u.usuario}`, nombreUsuario: u.usuario, nombreCompleto: u.nombre, grado: u.grado,
      email: `${u.usuario}@policia.example`, ci: u.ci, estructuraId: u.unidad, dependenciaId: u.dependencia ?? null,
      rolKerberos: u.rol, rolVerificadoEn: new Date(), activo: true,
    }
    const fila = await prisma.usuario.upsert({ where: { kerberosUuid: datos.kerberosUuid }, update: datos, create: datos })
    // Sin fila de tokens de Kerberos el gateway cierra el socket (se considera sesión cerrada).
    await prisma.usuarioKerberos.upsert({ where: { usuarioId: fila.id }, update: {}, create: { usuarioId: fila.id, accessToken: 'video', refreshToken: 'video' } })
    if (u.solicita) {
      const pendiente = await prisma.solicitudAdscripcion.findFirst({ where: { usuarioId: fila.id, estado: 'PENDIENTE' } })
      if (!pendiente) await prisma.solicitudAdscripcion.create({ data: { usuarioId: fila.id, estructuraId: u.solicita } })
    }
    ids[k] = fila
  }
  return ids
}

function token(f, u) {
  return jwt.sign({
    sub: f.id, kerberosUuid: f.kerberosUuid, username: f.nombreUsuario, email: f.email, fullName: f.nombreCompleto,
    uni: u.unidad, rol: u.rol, permisos: permisos(u.rol, u.unidad), type: 'access',
  }, process.env.JWT_SECRET, { expiresIn: '12h', algorithm: 'HS256', jwtid: randomUUID() })
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fechaLarga = (iso) => { const [a, m, d] = iso.split('-').map(Number); return `La Paz, ${d} de ${MESES[m - 1]} de ${a}` }

function pdfOficio(unidad, cite, referencia, cuerpo, anexos = 0) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 64 })
    const partes = []
    doc.on('data', (b) => partes.push(b)); doc.on('end', () => resolve(Buffer.concat(partes)))
    doc.font('Helvetica-Bold').fontSize(13).text('POLICÍA BOLIVIANA', { align: 'center' })
    doc.font('Helvetica').fontSize(10).text(unidad, { align: 'center' }).moveDown(2)
    doc.font('Helvetica-Bold').fontSize(10).text(cite).moveDown(0.4)
    doc.font('Helvetica').text(fechaLarga(HOY)).moveDown(1.2)
    doc.font('Helvetica-Bold').text(`REF.: ${referencia.toUpperCase()}`).moveDown(1.2)
    doc.font('Helvetica').fontSize(11).text(cuerpo, { align: 'justify', lineGap: 4 }).moveDown(4)
    doc.text('Documento de ejemplo para el tutorial de SISCOP.', { align: 'center', oblique: true })
    for (let n = 1; n <= anexos; n++) {
      doc.addPage()
      doc.font('Helvetica-Bold').fontSize(54).text(`ANEXO ${n}`, 64, 250, { align: 'center' })
      doc.font('Helvetica').fontSize(14).text(cite, { align: 'center' })
    }
    doc.end()
  })
}

async function api(tok, metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: { Authorization: `Bearer ${tok}` } }
  if (cuerpo instanceof FormData) opciones.body = cuerpo
  else if (cuerpo) { opciones.headers['Content-Type'] = 'application/json'; opciones.body = JSON.stringify(cuerpo) }
  const r = await fetch(API + ruta, opciones)
  const texto = await r.text()
  if (!r.ok) throw new Error(`${metodo} ${ruta} -> ${r.status} ${texto.slice(0, 300)}`)
  return texto ? JSON.parse(texto) : null
}

// Fecha de hoy en Bolivia (AAAA-MM-DD).
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date())

async function crearCorr(tok, unidadNombre, d) {
  const f = new FormData()
  const anexos = d.anexos || 0
  // Entre unidades distintas la correspondencia es EXTERNA (INTERNO es solo hacia las dependencias propias).
  const campos = { tipoRegistro: 'EXTERNO', fechaDocumento: HOY, numeroHojas: 1 + anexos, ...d.campos }
  for (const [k, v] of Object.entries(campos)) if (v != null) f.append(k, String(v))
  const pdf = await pdfOficio(unidadNombre, campos.numeroDocumento, campos.referencia, d.cuerpo, anexos)
  f.append('pdf', new Blob([pdf], { type: 'application/pdf' }), `${campos.numeroDocumento.replace(/\W+/g, '-')}.pdf`)
  return api(tok, 'POST', '/correspondencia', f)
}

async function responder(tok, detalleId, unidadNombre, campos, cuerpo) {
  const f = new FormData()
  const todo = { tipoRegistro: 'EXTERNO', fechaDocumento: HOY, numeroHojas: 1, ...campos }
  for (const [k, v] of Object.entries(todo)) if (v != null) f.append(k, String(v))
  const pdf = await pdfOficio(unidadNombre, todo.numeroDocumento, todo.referencia, cuerpo)
  f.append('pdf', new Blob([pdf], { type: 'application/pdf' }), `${todo.numeroDocumento.replace(/\W+/g, '-')}.pdf`)
  return api(tok, 'POST', `/detalle/${detalleId}/responder`, f)
}

const remitentes = {
  elena: { nombreProveniente: 'Gral. HECTOR DANIEL VILLARROEL SOSA', cargoProveniente: 'JEFE DE ESTADO MAYOR GENERAL', telefonoRemitente: '2-2120045' },
  luis: { nombreProveniente: 'Cnl. DESP. JAVIER ORTIZ SALAZAR', cargoProveniente: 'DIRECTOR NACIONAL DE PERSONAL', telefonoRemitente: '2-2154870' },
  rosa: { nombreProveniente: 'Gral. RICARDO PEÑA ARCE', cargoProveniente: 'COMANDANTE DEPARTAMENTAL LA PAZ', telefonoRemitente: '2-2285601' },
  marco: { nombreProveniente: 'Cnl. DESP. HUGO LEDEZMA VACA', cargoProveniente: 'DIRECTOR NACIONAL ADMINISTRATIVO', telefonoRemitente: '2-2144032' },
  carla: { nombreProveniente: 'Cnl. DESP. FREDDY ARANCIBIA MOLINA', cargoProveniente: 'DIRECTOR NACIONAL DE TECNOLOGIA Y TELEMATICA', telefonoRemitente: '2-2157310' },
}

async function main() {
  await cargarCatalogos()
  const f = await crearUsuarios()
  const tok = Object.fromEntries(Object.entries(f).map(([k, fila]) => [k, token(fila, USUARIOS[k])]))
  const nombreUnidad = async (id) => (await prisma.estructura.findUnique({ where: { id } })).nombre
  const detalleDe = (corrId, unidad) => prisma.detalleCorrespondencia.findFirst({
    where: { correspondenciaId: corrId, estructuraDestinatarioId: unidad, detallePadreId: null } })
  const recepcionar = async (quien, det) => api(tok[quien], 'PATCH', `/detalle/${det.id}/recepcionar`, { estado: 'RECEPCIONADO' })

  // Externos que llegan a Telematica desde otras unidades (sin instrucciones)
  const externos = [
    ['marco', { numeroDocumento: 'MEM. CIRC. DNA N° 041/2026', tipoDocumentoId: T['MEMORANDUM CIRCULAR'], clasificacionId: C.CORRIENTE,
      referencia: 'Instructivo para el inventario anual de activos fijos gestión 2026' },
     'Se instruye a todas las direcciones nacionales realizar el inventario anual de activos fijos conforme al cronograma adjunto.', [U.TELEMATICA, U.PERSONAL, U.LA_PAZ]],
    ['rosa', { numeroDocumento: 'INF. CDLP N° 318/2026', tipoDocumentoId: T.INFORME, clasificacionId: C.URGENTE,
      referencia: 'Informe de conectividad de los módulos policiales EPI de la ciudad de El Alto' },
     'Se remite el informe de fallas de conectividad registradas en los módulos EPI, para su atención por la unidad técnica.', [U.TELEMATICA]],
    ['luis', { numeroDocumento: 'MEMO DNP N° 095/2026', tipoDocumentoId: T.MEMORANDUM, clasificacionId: C.CORRIENTE,
      referencia: 'Requerimiento de cuentas de correo institucional para personal nuevo' },
     'Se solicita la habilitación de cuentas de correo institucional para el personal que se incorpora en la presente gestión.', [U.TELEMATICA]],
    ['rosa', { numeroDocumento: 'OF. CDLP N° 327/2026', tipoDocumentoId: T.OFICIO, clasificacionId: C.CORRIENTE,
      referencia: 'Solicitud de soporte técnico para el sistema de registro de denuncias' },
     'Se solicita asistencia técnica para el sistema de registro de denuncias de las estaciones policiales integrales.', [U.TELEMATICA]],
  ]
  const recibidas = []
  for (const [quien, campos, cuerpo, destinos] of externos) {
    const c = await crearCorr(tok[quien], await nombreUnidad(USUARIOS[quien].unidad), { campos: { ...remitentes[quien], ...campos }, cuerpo })
    await api(tok[quien], 'POST', `/correspondencia/${c.id}/enviar`, { unidadesDestino: destinos })
    recibidas.push(c)
  }
  const [circular, informe, memo] = recibidas
  await recepcionar('carla', await detalleDe(circular.id, U.TELEMATICA))
  await api(tok.carla, 'PATCH', `/detalle/${(await detalleDe(circular.id, U.TELEMATICA)).id}/atender`)
  await recepcionar('carla', await detalleDe(informe.id, U.TELEMATICA))
  {
    const d = new FormData()
    for (const [k, v] of Object.entries({ estadoArchivo: 'SIN_ADJUNTO', instrucciones: `${I['DAR CURSO']},${I.INFORMAR}`, referencia: informe.referencia }))
      d.append(k, v)
    for (const u of [U.INFORMATICA, U.TELECOM]) d.append('unidadesDestino[]', String(u))
    await api(tok.carla, 'POST', `/detalle/${(await detalleDe(informe.id, U.TELEMATICA)).id}/derivar`, d)
  }
  const detMemo = await detalleDe(memo.id, U.TELEMATICA)
  await recepcionar('carla', detMemo)
  await responder(tok.carla, detMemo.id, await nombreUnidad(U.TELEMATICA), { referencia: 'Habilitación de cuentas de correo institucional solicitadas',
    numeroDocumento: 'OF. DNTT N° 211/2026', clasificacionId: C.CORRIENTE, tipoDocumentoId: T.OFICIO, ...remitentes.carla },
  'Se informa que las cuentas de correo institucional solicitadas fueron habilitadas.')

  // Bandeja de salida de Telematica: dos externos enviados antes
  const salen = [
    [{ numeroDocumento: 'OF. DNTT N° 205/2026', tipoDocumentoId: T.OFICIO, clasificacionId: C.CORRIENTE,
      referencia: 'Cronograma de mantenimiento de la red de radiocomunicaciones' },
     'Se remite el cronograma de mantenimiento de la red de radiocomunicaciones para su coordinación.', [U.LA_PAZ, U.PERSONAL]],
    [{ numeroDocumento: 'OF. DNTT N° 208/2026', tipoDocumentoId: T.OFICIO, clasificacionId: C.RESERVADO,
      referencia: 'Actualización de credenciales de acceso a sistemas institucionales' },
     'Se instruye la actualización de credenciales de acceso a los sistemas institucionales del personal a su cargo.', [U.ADMINISTRATIVA]],
  ]
  for (const [campos, cuerpo, destinos] of salen) {
    const c = await crearCorr(tok.carla, await nombreUnidad(U.TELEMATICA), { campos: { ...remitentes.carla, ...campos }, cuerpo })
    await api(tok.carla, 'POST', `/correspondencia/${c.id}/enviar`, { unidadesDestino: destinos })
  }
  const enviadaLaPaz = await prisma.detalleCorrespondencia.findFirst({ where: { estructuraDestinatarioId: U.LA_PAZ, estructuraRemitenteId: U.TELEMATICA } })
  if (enviadaLaPaz) await recepcionar('rosa', enviadaLaPaz)

  // Un externo de Telematica que ya respondieron dos unidades: muestra una tarjeta por unidad
  const relev = await crearCorr(tok.carla, await nombreUnidad(U.TELEMATICA), { campos: { ...remitentes.carla,
    numeroDocumento: 'OF. DNTT N° 199/2026', tipoDocumentoId: T.OFICIO, clasificacionId: C.CORRIENTE,
    referencia: 'Relevamiento de necesidades de equipos informáticos gestión 2027' },
  cuerpo: 'Se solicita remitir el detalle de necesidades de equipos informáticos de su unidad para la gestión 2027.' })
  await api(tok.carla, 'POST', `/correspondencia/${relev.id}/enviar`, { unidadesDestino: [U.PERSONAL, U.LA_PAZ, U.ADMINISTRATIVA] })
  for (const [quien, unidad, num] of [['luis', U.PERSONAL, 'OF. DNP N° 129/2026'], ['rosa', U.LA_PAZ, 'OF. CDLP N° 336/2026']]) {
    const det = await detalleDe(relev.id, unidad)
    await recepcionar(quien, det)
    await responder(tok[quien], det.id, await nombreUnidad(unidad), { referencia: 'Necesidades de equipos informáticos gestión 2027',
      numeroDocumento: num, clasificacionId: C.CORRIENTE, tipoDocumentoId: T.OFICIO, ...remitentes[quien] },
    'Se remite el detalle de necesidades de equipos informáticos de la unidad para la gestión 2027.')
  }

  // Interno de Telematica todavia sin enviar: sirve para mostrar que se envia a las dependencias propias
  const interno = await crearCorr(tok.carla, await nombreUnidad(U.TELEMATICA), { campos: { ...remitentes.carla, tipoRegistro: 'INTERNO',
    numeroDocumento: 'MEMO DNTT N° 226/2026', tipoDocumentoId: T.MEMORANDUM, clasificacionId: C.CORRIENTE, instrucciones: `${I.COORDINAR}`,
    referencia: 'Respaldo semanal de la información de los servidores' },
  cuerpo: 'Se dispone el respaldo semanal de la información de los servidores institucionales a cargo de cada dependencia.' })

  // Documento principal: el Comando General envia un Instructivo INTERNO, con instrucciones.
  // Personal y La Paz ya respondieron; Telematica lo recibe pendiente.
  const cg = await crearCorr(tok.elena, await nombreUnidad(U.COMANDO), { anexos: 1, campos: { ...remitentes.elena, tipoRegistro: 'INTERNO',
    numeroDocumento: 'INST. CG N° 045/2026', tipoDocumentoId: T.INSTRUCTIVO, clasificacionId: C.CORRIENTE,
    instrucciones: `${I.INFORMAR},${I['DAR RESPUESTA']}`, referencia: 'Mantenimiento preventivo de equipos de computación' },
  cuerpo: 'Se instruye realizar el mantenimiento preventivo de los equipos de computación de cada unidad e informar su cronograma.' })
  await api(tok.elena, 'POST', `/correspondencia/${cg.id}/enviar`, { unidadesDestino: [U.TELEMATICA, U.PERSONAL, U.LA_PAZ] })
  for (const [quien, unidad, num, ref] of [
    ['luis', U.PERSONAL, 'OF. DNP N° 133/2026', 'Cronograma de mantenimiento de equipos de la Dirección Nacional de Personal'],
    ['rosa', U.LA_PAZ, 'OF. CDLP N° 341/2026', 'Cronograma de mantenimiento de equipos del Comando Departamental La Paz']]) {
    const det = await detalleDe(cg.id, unidad)
    await recepcionar(quien, det)
    await responder(tok[quien], det.id, await nombreUnidad(unidad), { referencia: ref, numeroDocumento: num,
      clasificacionId: C.CORRIENTE, tipoDocumentoId: T.OFICIO, ...remitentes[quien] }, 'Se remite el cronograma de mantenimiento preventivo de los equipos de la unidad.')
  }

  const dir = path.dirname(new URL(import.meta.url).pathname)
  fs.writeFileSync(path.join(dir, 'sesiones.json'), JSON.stringify(tok, null, 1))
  fs.writeFileSync(path.join(dir, 'ids.json'), JSON.stringify({ interno: interno.id, principal: cg.id, relevamiento: relev.id }, null, 1))
  console.log('listo')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
