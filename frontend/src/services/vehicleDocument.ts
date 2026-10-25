import type { Vehicle } from './localStore'

export type PositionedText = { text: string; x: number; y: number; page: number }
export type VehicleDocumentResult = { fields: Partial<Vehicle>; recognized: boolean; warnings: string[] }
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()

export function parseVehicleDocument(items: PositionedText[]): VehicleDocumentResult {
  const clean = items.filter((item) => item.text.trim()).map((item) => ({ ...item, text: item.text.trim() }))
  const recognized = clean.some((item) => /CERTIFICADO DE REGISTRO E LICENCIAMENTO|CRLV/.test(normalize(item.text)))
  if (!recognized) return { fields: {}, recognized: false, warnings: ['Documento anexado sem preenchimento: o arquivo não foi identificado como CRLV.'] }
  const fields: Partial<Vehicle> = {}
  const value = (label: RegExp, validate: (text: string) => boolean = () => true) => {
    const anchor = clean.find((item) => label.test(normalize(item.text)))
    if (!anchor) return ''
    // CRLV has two independent columns; use coordinates instead of concatenating unrelated values.
    const candidates = clean.filter((item) => item.page === anchor.page && item.y < anchor.y - 3 && anchor.y - item.y < 40 && Math.abs(item.x - anchor.x) < 14 && validate(item.text))
    candidates.sort((a, b) => b.y - a.y)
    return candidates[0]?.text || ''
  }
  const plate = value(/^PLACA$/, (text) => /^[A-Z]{3}[- ]?[0-9][A-Z0-9][0-9]{2}$/i.test(text)).replace(/[- ]/g, '').toUpperCase()
  const vehicleKind = value(/^ESPECIE \/ TIPO$/)
  if (plate) {
    if (/REBOQUE/.test(normalize(vehicleKind))) {
      fields.vehicleType = 'Carreta'; fields.trailerPlate = plate; fields.tractorPlate = ''
      fields.description = /SEMI/.test(normalize(vehicleKind)) ? 'SEMI-REBOQUE' : 'REBOQUE'
      fields.fleetType = fields.description; fields.type = fields.description
    } else if (/TRATOR/.test(normalize(vehicleKind))) {
      fields.vehicleType = 'Cavalo'; fields.tractorPlate = plate; fields.trailerPlate = ''
      fields.description = 'CAVALO MECANICO'; fields.fleetType = fields.description; fields.type = fields.description
    } else {
      // The user chooses the fleet type when the CRLV is not a tractor or trailer.
      fields.tractorPlate = plate
    }
  }
  const assign = (key: keyof Vehicle, text: string) => { if (text && !/^[*\s/]+$/.test(text)) Object.assign(fields, { [key]: text.toUpperCase() }) }
  assign('renavam', value(/^CODIGO RENAVAM$/, (text) => /^\d{9,11}$/.test(text)))
  assign('chassis', value(/^CHASSI$/, (text) => /^[A-HJ-NPR-Z0-9]{17}$/i.test(text)))
  assign('manufactureYear', value(/^ANO FABRICACAO$/, (text) => /^(19|20)\d{2}$/.test(text)))
  assign('yearModel', value(/^ANO MODELO$/, (text) => /^(19|20)\d{2}$/.test(text)))
  const fullModel = value(/^MARCA \/ MODELO \/ VERSAO$/)
  if (fullModel) {
    const parts = fullModel.split('/')
    assign('brand', parts[0])
    assign('model', parts.slice(1).join('/').trim() || fullModel)
  }
  assign('owner', value(/^NOME$/))
  assign('ownerDocument', value(/^CPF \/ CNPJ$/, (text) => /^[A-Z0-9.\/ -]{11,18}$/i.test(text) && /\d/.test(text)))
  assign('color', value(/^COR PREDOMINANTE$/))
  assign('fuel', value(/^COMBUSTIVEL$/))
  assign('axles', value(/^EIXOS$/, (text) => /^\d{1,2}$/.test(text)))
  assign('bodyType', value(/^CARROCERIA$/))
  assign('denatranType', vehicleKind)
  assign('crvNumber', value(/^NUMERO DO CRV$/, (text) => /^\d+$/.test(text)))
  assign('engineNumber', value(/^MOTOR$/))
  assign('crlvCapacity', value(/^CAPACIDADE$/, (text) => /^\d+(?:[.,]\d+)?$/.test(text)))
  assign('grossWeight', value(/^PESO BRUTO TOTAL$/, (text) => /^\d+(?:[.,]\d+)?$/.test(text)))
  assign('cmt', value(/^CMT$/, (text) => /^\d+(?:[.,]\d+)?$/.test(text)))
  assign('licensingYear', value(/^EXERCICIO$/, (text) => /^20\d{2}$/.test(text)))
  const local = value(/^LOCAL$/).match(/^(.+?)[,\/ ]+([A-Z]{2})$/i)
  if (local) { assign('cityPlate', local[1]); assign('statePlate', local[2]) }
  const issueDate = value(/^DATA$/, (text) => /^\d{2}\/\d{2}\/\d{4}$/.test(text))
  if (issueDate) { const [day, month, year] = issueDate.split('/'); fields.crlvIssueDate = `${year}-${month}-${day}` }
  const warnings = ['Tara, RNTRC, capacidade útil em kg e vencimento do licenciamento devem ser conferidos e informados separadamente.']
  if (!plate) warnings.unshift('Não foi possível localizar uma placa válida. Confira o documento.')
  return { fields, recognized, warnings }
}

export async function readVehiclePdf(file: File): Promise<VehicleDocumentResult> {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  let pdf: Awaited<typeof task.promise> | undefined
  try {
    pdf = await task.promise
    if (pdf.numPages > 10) throw new Error('Anexe um PDF com até 10 páginas.')
    const items: PositionedText[] = []
    for (let number = 1; number <= pdf.numPages; number++) {
      const content = await (await pdf.getPage(number)).getTextContent()
      for (const item of content.items) {
        if ('str' in item && 'transform' in item) items.push({ text: item.str, x: item.transform[4], y: item.transform[5], page: number })
      }
    }
    const result = parseVehicleDocument(items)
    if (!items.some((item) => item.text.trim())) result.warnings = ['Este PDF não possui texto selecionável. Ele pode ser anexado, mas os campos devem ser preenchidos manualmente.']
    return result
  } finally { await task.destroy() }
}
