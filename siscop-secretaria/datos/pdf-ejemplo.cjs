// PDF ficticios que se adjuntan durante la grabacion.
//  - OF-DNTT-221-2026.pdf: oficio + anexos desordenados + una hoja en blanco escaneada de mas
//    (para mostrar el desglose y el taller "Ordenar y quitar hojas").
//  - OF-DNTT-230-2026.pdf y ANX-DNTT-230-2026.pdf: la respuesta y un anexo (se unen al responder).
// Uso: BACKEND=/ruta/siscop-v2/backend node pdf-ejemplo.cjs
const path = require('path')
const fs = require('fs')
const { createRequire } = require('module')
const req = createRequire(path.join(process.env.BACKEND, 'package.json'))
const PDFDocument = req('pdfkit')

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()).split('-').map(Number)
const FECHA = `La Paz, ${hoy[2]} de ${MESES[hoy[1] - 1]} de ${hoy[0]}`

function crear(nombre, paginas) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 64, autoFirstPage: false })
  doc.pipe(fs.createWriteStream(path.join(__dirname, nombre)))
  for (const p of paginas) { doc.addPage(); p(doc) }
  doc.end()
}

const oficio = (cite, referencia, cuerpo) => (doc) => {
  doc.font('Helvetica-Bold').fontSize(13).text('POLICÍA BOLIVIANA', { align: 'center' })
  doc.font('Helvetica').fontSize(10).text('DIRECCIÓN NACIONAL DE TECNOLOGÍA Y TELEMÁTICA', { align: 'center' }).moveDown(2)
  doc.font('Helvetica-Bold').text(cite).moveDown(0.4)
  doc.font('Helvetica').text(FECHA).moveDown(1.2)
  doc.font('Helvetica-Bold').text(`REF.: ${referencia.toUpperCase()}`).moveDown(1.2)
  doc.font('Helvetica').fontSize(11).text(cuerpo, { align: 'justify', lineGap: 4 }).moveDown(4)
  doc.text('Documento de ejemplo para el tutorial de SISCOP.', { align: 'center', oblique: true })
}
const anexo = (titulo, sub) => (doc) => {
  doc.font('Helvetica-Bold').fontSize(54).text(titulo, 64, 250, { align: 'center' })
  doc.font('Helvetica').fontSize(16).text(sub, { align: 'center' })
}
const blanco = () => (doc) => {
  doc.font('Helvetica').fontSize(11).fillColor('#bbbbbb').text('(hoja en blanco escaneada de más)', 64, 380, { align: 'center' })
}

crear('OF-DNTT-221-2026.pdf', [
  oficio('OF. DNTT N° 221/2026', 'Solicitud de información sobre equipos de radiocomunicación en uso',
    'Se solicita a las unidades destinatarias remitir la información sobre los equipos de radiocomunicación en uso, conforme a los anexos adjuntos.'),
  anexo('ANEXO 2', 'Detalle de frecuencias'),
  anexo('ANEXO 1', 'Inventario de equipos'),
  blanco(),
])
crear('OF-DNTT-230-2026.pdf', [
  oficio('OF. DNTT N° 230/2026', 'Respuesta: mantenimiento preventivo programado',
    'En atención al instructivo de referencia, se informa que el mantenimiento preventivo de los equipos de computación de la unidad se realizará conforme al cronograma adjunto.'),
])
crear('ANX-DNTT-230-2026.pdf', [anexo('ANEXO', 'Cronograma de mantenimiento')])
console.log('pdf listos')
