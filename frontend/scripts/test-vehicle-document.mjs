import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/services/vehicleDocument.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText
const { parseVehicleDocument } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const item = (text, x, y, page = 1) => ({ text, x, y, page })
const fixture = [
  item('CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEICULO - DIGITAL', 30, 790),
  item('PLACA', 30, 720), item('ABC1D23', 30, 707),
  item('EXERCICIO', 103, 720), item('2025', 103, 707),
  item('ANO FABRICACAO', 30, 694), item('2002', 30, 681),
  item('ANO MODELO', 103, 694), item('2003', 103, 681),
  item('CODIGO RENAVAM', 30, 747), item('00123456789', 30, 733),
  item('MARCA / MODELO / VERSAO', 30, 564), item('VW/18.310', 30, 541),
  item('ESPECIE / TIPO', 30, 529), item('TRACAO CAMINHAO TRATOR', 30, 506),
  item('CHASSI', 130, 494), item('9BWZZZ377VT004251', 131, 471),
  item('COR PREDOMINANTE', 30, 458), item('BRANCA', 30, 436),
  item('COMBUSTIVEL', 103, 458), item('DIESEL', 103, 436),
  item('NOME', 317, 656), item('PROPRIETARIO DE TESTE', 316, 644),
  item('CPF / CNPJ', 463, 626), item('529.982.247-25', 463, 612),
  item('LOCAL', 317, 599), item('MANAUS AM', 316, 577),
  item('DATA', 510, 599), item('18/09/2025', 510, 577),
  item('CAPACIDADE', 511, 773), item('33.9', 510, 747),
  item('PESO BRUTO TOTAL', 510, 734), item('16.0', 510, 721),
  item('CMT', 453, 708), item('42.0', 454, 694),
  item('EIXOS', 504, 708), item('2', 504, 694),
]

test('reads both CRLV columns without mixing values', () => {
  const { fields } = parseVehicleDocument(fixture)
  assert.equal(fields.tractorPlate, 'ABC1D23')
  assert.equal(fields.vehicleType, 'Cavalo')
  assert.equal(fields.renavam, '00123456789')
  assert.equal(fields.manufactureYear, '2002')
  assert.equal(fields.yearModel, '2003')
  assert.equal(fields.ownerDocument, '529.982.247-25')
  assert.equal(fields.brand, 'VW')
  assert.equal(fields.model, '18.310')
  assert.equal(fields.fuel, 'DIESEL')
  assert.equal(fields.axles, '2')
  assert.equal(fields.crlvCapacity, '33.9')
  assert.equal(fields.grossWeight, '16.0')
  assert.equal(fields.cmt, '42.0')
  assert.equal(fields.cityPlate, 'MANAUS')
  assert.equal(fields.statePlate, 'AM')
  assert.equal(fields.crlvIssueDate, '2025-09-18')
})
test('does not rely on the order of the PDF text stream', () => {
  assert.deepEqual(parseVehicleDocument([...fixture].reverse()).fields, parseVehicleDocument(fixture).fields)
})
test('does not invent missing data or a licensing deadline', () => {
  const { fields } = parseVehicleDocument(fixture)
  for (const key of ['rntrc', 'tare', 'capacityKg', 'licensingExpiration']) assert.equal(fields[key], undefined)
})
test('recognizes trailers without assuming container equipment', () => {
  const trailer = fixture.map(entry => entry.text === 'TRACAO CAMINHAO TRATOR' ? { ...entry, text: 'CARGA SEMI-REBOQUE' } : entry)
  const { fields } = parseVehicleDocument(trailer)
  assert.equal(fields.vehicleType, 'Carreta')
  assert.equal(fields.trailerPlate, 'ABC1D23')
  assert.equal(fields.tractorPlate, '')
  assert.equal(fields.description, 'SEMI-REBOQUE')
})
test('leaves unrelated documents for manual entry', () => {
  const result = parseVehicleDocument([item('DANFE', 30, 790), item('PLACA', 30, 720), item('ABC1D23', 30, 707)])
  assert.equal(result.recognized, false)
  assert.deepEqual(result.fields, {})
})
test('does not mistake long numbers for a plate', () => {
  const result = parseVehicleDocument(fixture.map(entry => entry.text === 'ABC1D23' ? { ...entry, text: '1234567890123' } : entry))
  assert.equal(result.fields.tractorPlate, undefined)
  assert.ok(result.warnings.some(warning => warning.includes('placa')))
})
test('does not borrow values from another page', () => {
  const result = parseVehicleDocument(fixture.map(entry => entry.text === 'ABC1D23' ? { ...entry, page: 2 } : entry))
  assert.equal(result.fields.tractorPlate, undefined)
})

if (process.argv[2]) test('reads the supplied PDF model', async () => {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), useSystemFonts: true })
  try {
    const pdf = await task.promise
    const items = []
    for (let number = 1; number <= pdf.numPages; number++) {
      const content = await (await pdf.getPage(number)).getTextContent()
      for (const entry of content.items) if ('str' in entry) items.push(item(entry.str, entry.transform[4], entry.transform[5], number))
    }
    const result = parseVehicleDocument(items)
    assert.equal(result.recognized, true)
    assert.match(result.fields.tractorPlate || result.fields.trailerPlate || '', /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/)
    for (const key of ['renavam', 'chassis', 'brand', 'model', 'owner', 'ownerDocument', 'fuel', 'axles', 'licensingYear', 'cityPlate', 'statePlate']) assert.ok(result.fields[key], `missing ${key}`)
  } finally { await task.destroy() }
})
