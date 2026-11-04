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
  TELEMATICA: 37, PERSONAL: 24, LA_PAZ: 45, ADMINISTRATIVA: 27,
  INFORMATICA: 349, TELECOM: 348, SOPORTE: 345,
}
const T = { MEMO: 1, CITE: 2, NOTA: 3, INFORME: 4, OFICIO: 5, CIRCULAR: 6, SOLICITUD: 8 }
const C = { RESERVADO: 2, URGENTE: 5, NORMAL: 6 }
const I = { DERIVAR: 1, ATENDER: 2, URGENTE: 3, INFORMAR: 5, COORDINAR: 6, CONOCIMIENTO: 7, RESPONDER: 8 }

const USUARIOS = {
  carla: { nombre: 'CARLA ANDREA VARGAS ROJAS', grado: 'Sof. 1ro.', usuario: 'cvargas', ci: '6845213', rol: 'SECRETARIA', unidad: U.TELEMATICA },
  luis: { nombre: 'LUIS FERNANDO MAMANI CHOQUE', grado: 'Sgto. 1ro.', usuario: 'lmamani', ci: '4721986', rol: 'SECRETARIA', unidad: U.PERSONAL },
  rosa: { nombre: 'ROSA ELENA CONDORI APAZA', grado: 'Sof. 2do.', usuario: 'rcondori', ci: '5390147', rol: 'SECRETARIA', unidad: U.LA_PAZ },
  marco: { nombre: 'MARCO ANTONIO GUTIERREZ LIMA', grado: 'Sgto.', usuario: 'mgutierrez', ci: '6012375', rol: 'SECRETARIA', unidad: U.ADMINISTRATIVA },
  diego: { nombre: 'DIEGO ARMANDO QUISPE TICONA', grado: 'Cbo.', usuario: 'dquispe', ci: '7314520', rol: 'PERSONAL', unidad: U.TELEMATICA, dependencia: U.INFORMATICA },
  paola: { nombre: 'PAOLA ANDREA FLORES CRUZ', grado: 'Sgto. 2do.', usuario: 'pflores', ci: '6658041', rol: 'PERSONAL', unidad: U.TELEMATICA, dependencia: U.TELECOM },
  rodrigo: { nombre: 'RODRIGO JAVIER CHOQUE MENDOZA', grado: 'Sgto.', usuario: 'rchoque', ci: '5986230', rol: 'PERSONAL', unidad: U.TELEMATICA, dependencia: U.SOPORTE },
  juan: { nombre: 'JUAN CARLOS ALIAGA PEREZ', grado: 'Pol.', usuario: 'jaliaga', ci: '8120364', rol: 'PERSONAL', unidad: null, solicita: U.TELEMATICA },
  ana: { nombre: 'ANA MARIA ROJAS VILLCA', grado: 'Pol.', usuario: 'arojas', ci: '8047719', rol: 'PERSONAL', unidad: null, solicita: U.TELEMATICA },
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

function pdfOficio(unidad, cite, referencia, cuerpo) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 64 })
    const partes = []
    doc.on('data', (b) => partes.push(b)); doc.on('end', () => resolve(Buffer.concat(partes)))
    doc.font('Helvetica-Bold').fontSize(13).text('POLICÍA BOLIVIANA', { align: 'center' })
    doc.font('Helvetica').fontSize(10).text(unidad, { align: 'center' }).moveDown(2)
    doc.font('Helvetica-Bold').fontSize(10).text(`CITE: ${cite}`).moveDown(0.4)
    doc.font('Helvetica').text('La Paz, 4 de noviembre de 2026').moveDown(1.2)
    doc.font('Helvetica-Bold').text(`REF.: ${referencia.toUpperCase()}`).moveDown(1.2)
    doc.font('Helvetica').fontSize(11).text(cuerpo, { align: 'justify', lineGap: 4 }).moveDown(4)
    doc.text('Documento de ejemplo para el tutorial de SISCOP.', { align: 'center', oblique: true })
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

async function crearCorr(tok, unidadNombre, d) {
  const f = new FormData()
  const campos = { tipoRegistro: 'INTERNO', fechaDocumento: '2026-11-04', numeroHojas: 2, ...d.campos }
  for (const [k, v] of Object.entries(campos)) if (v != null) f.append(k, String(v))
  const pdf = await pdfOficio(unidadNombre, campos.numeroDocumento, campos.referencia, d.cuerpo)
  f.append('pdf', new Blob([pdf], { type: 'application/pdf' }), `${campos.numeroDocumento.replace(/\W+/g, '-')}.pdf`)
  return api(tok, 'POST', '/correspondencia', f)
}

const remitentes = {
  luis: { nombreProveniente: 'Cnl. DESP. JAVIER ORTIZ SALAZAR', cargoProveniente: 'DIRECTOR NACIONAL DE PERSONAL', telefonoRemitente: '2-2154870' },
  rosa: { nombreProveniente: 'Gral. RICARDO PEÑA ARCE', cargoProveniente: 'COMANDANTE DEPARTAMENTAL LA PAZ', telefonoRemitente: '2-2285601' },
  marco: { nombreProveniente: 'Cnl. DESP. HUGO LEDEZMA VACA', cargoProveniente: 'DIRECTOR NACIONAL ADMINISTRATIVO', telefonoRemitente: '2-2144032' },
  carla: { nombreProveniente: 'Cnl. DESP. FREDDY ARANCIBIA MOLINA', cargoProveniente: 'DIRECTOR NACIONAL DE TECNOLOGIA Y TELEMATICA', telefonoRemitente: '2-2157310' },
}

async function main() {
  const f = await crearUsuarios()
  const tok = Object.fromEntries(Object.entries(f).map(([k, fila]) => [k, token(fila, USUARIOS[k])]))
  const nombreUnidad = async (id) => (await prisma.estructura.findUnique({ where: { id } })).nombre

  // Correspondencia que llega a Telemática desde otras unidades
  const llegan = [
    ['marco', { numeroDocumento: 'CIRC. DNA N° 041/2026', tipoDocumentoId: T.CIRCULAR, clasificacionId: C.NORMAL, hojaRuta: '1187',
      referencia: 'Instructivo para el inventario anual de activos fijos gestión 2026', instrucciones: `${I.CONOCIMIENTO},${I.INFORMAR}` },
     'Se instruye a todas las direcciones nacionales realizar el inventario anual de activos fijos conforme al cronograma adjunto.', [U.TELEMATICA, U.PERSONAL, U.LA_PAZ]],
    ['rosa', { numeroDocumento: 'INF. CDLP N° 318/2026', tipoDocumentoId: T.INFORME, clasificacionId: C.URGENTE, hojaRuta: '2264',
      referencia: 'Informe de conectividad de los módulos policiales EPI de la ciudad de El Alto', instrucciones: `${I.ATENDER},${I.URGENTE}` },
     'Se remite el informe de fallas de conectividad registradas en los módulos EPI, para su atención por la unidad técnica.', [U.TELEMATICA]],
    ['luis', { numeroDocumento: 'MEMO DNP N° 095/2026', tipoDocumentoId: T.MEMO, clasificacionId: C.NORMAL, hojaRuta: '0932',
      referencia: 'Requerimiento de cuentas de correo institucional para personal nuevo', instrucciones: `${I.ATENDER},${I.RESPONDER}` },
     'Se solicita la habilitación de cuentas de correo institucional para el personal que se incorpora en la presente gestión.', [U.TELEMATICA]],
    ['rosa', { numeroDocumento: 'OF. CDLP N° 327/2026', tipoDocumentoId: T.OFICIO, clasificacionId: C.NORMAL, hojaRuta: '2271',
      referencia: 'Solicitud de soporte técnico para el sistema de registro de denuncias', instrucciones: `${I.ATENDER}` },
     'Se solicita asistencia técnica para el sistema de registro de denuncias de las estaciones policiales integrales.', [U.TELEMATICA]],
    ['luis', { numeroDocumento: 'SOL. DNP N° 112/2026', tipoDocumentoId: T.SOLICITUD, clasificacionId: C.NORMAL, hojaRuta: '0948',
      referencia: 'Solicitud de mantenimiento preventivo de equipos de computación', instrucciones: `${I.ATENDER},${I.DERIVAR}` },
     'Se solicita el mantenimiento preventivo de los equipos de computación de la Dirección Nacional de Personal.', [U.TELEMATICA]],
  ]
  const recibidas = []
  for (const [quien, campos, cuerpo, destinos] of llegan) {
    const c = await crearCorr(tok[quien], await nombreUnidad(USUARIOS[quien].unidad), { campos: { ...remitentes[quien], ...campos }, cuerpo })
    await api(tok[quien], 'POST', `/correspondencia/${c.id}/enviar`, { unidadesDestino: destinos })
    recibidas.push(c)
    console.log('recibida', c.codigo, campos.referencia)
  }

  // Historia de la bandeja de entrada de Telemática
  const detalles = await prisma.detalleCorrespondencia.findMany({
    where: { estructuraDestinatarioId: U.TELEMATICA, detallePadreId: null }, orderBy: { id: 'asc' },
  })
  const det = (corr) => detalles.find((d) => d.correspondenciaId === corr.id)
  const [circular, informe, memo] = recibidas
  await api(tok.carla, 'PATCH', `/detalle/${det(circular).id}/recepcionar`, { estado: 'RECEPCIONADO' })
  await api(tok.carla, 'PATCH', `/detalle/${det(circular).id}/atender`)
  await api(tok.carla, 'PATCH', `/detalle/${det(informe).id}/recepcionar`, { estado: 'RECEPCIONADO' })
  {
    const d = new FormData()
    for (const [k, v] of Object.entries({ estadoArchivo: 'SIN_ADJUNTO', instrucciones: `${I.ATENDER},${I.URGENTE}`, referencia: informe.referencia }))
      d.append(k, v)
    for (const u of [U.INFORMATICA, U.TELECOM]) d.append('unidadesDestino[]', String(u))
    await api(tok.carla, 'POST', `/detalle/${det(informe).id}/derivar`, d)
  }
  await api(tok.carla, 'PATCH', `/detalle/${det(memo).id}/recepcionar`, { estado: 'RECEPCIONADO' })
  {
    const d = new FormData()
    for (const [k, v] of Object.entries({ referencia: 'Habilitación de cuentas de correo institucional solicitadas', numeroDocumento: 'NOTA DNTT N° 211/2026',
      tipoRegistro: 'INTERNO', clasificacionId: C.NORMAL, tipoDocumentoId: T.NOTA, fechaDocumento: '2026-11-04', numeroHojas: 1, ...remitentes.carla }))
      d.append(k, String(v))
    await api(tok.carla, 'POST', `/detalle/${det(memo).id}/responder`, d)
  }

  // Bandeja de salida de Telemática: dos enviadas antes
  const salen = [
    [{ numeroDocumento: 'CITE DNTT N° 205/2026', tipoDocumentoId: T.CITE, clasificacionId: C.NORMAL, hojaRuta: '0412',
      referencia: 'Cronograma de mantenimiento de la red de radiocomunicaciones', instrucciones: `${I.CONOCIMIENTO},${I.COORDINAR}` },
     'Se remite el cronograma de mantenimiento de la red de radiocomunicaciones para su coordinación.', [U.LA_PAZ, U.PERSONAL]],
    [{ numeroDocumento: 'CITE DNTT N° 208/2026', tipoDocumentoId: T.CITE, clasificacionId: C.RESERVADO, hojaRuta: '0415',
      referencia: 'Actualización de credenciales de acceso a sistemas institucionales', instrucciones: `${I.ATENDER},${I.RESPONDER}` },
     'Se instruye la actualización de credenciales de acceso a los sistemas institucionales del personal a su cargo.', [U.ADMINISTRATIVA]],
  ]
  for (const [campos, cuerpo, destinos] of salen) {
    const c = await crearCorr(tok.carla, await nombreUnidad(U.TELEMATICA), { campos: { ...remitentes.carla, ...campos }, cuerpo })
    await api(tok.carla, 'POST', `/correspondencia/${c.id}/enviar`, { unidadesDestino: destinos })
    console.log('enviada', c.codigo)
  }
  // La Paz ya recepcionó la primera
  const enviadaLaPaz = await prisma.detalleCorrespondencia.findFirst({ where: { estructuraDestinatarioId: U.LA_PAZ, estructuraRemitenteId: U.TELEMATICA } })
  if (enviadaLaPaz) await api(tok.rosa, 'PATCH', `/detalle/${enviadaLaPaz.id}/recepcionar`, { estado: 'RECEPCIONADO' })

  fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'sesiones.json'), JSON.stringify(tok, null, 1))
  console.log('listo')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
