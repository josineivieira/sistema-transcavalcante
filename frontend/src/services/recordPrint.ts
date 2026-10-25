import type { DetailSection } from './recordDetails'

export function renderRecordPrint(doc: Document, title: string, name: string, sections: DetailSection[], logoUrl: string, now = new Date()) {
  doc.open()
  doc.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ficha cadastral</title></head><body></body></html>')
  doc.close()
  doc.title = `${title} - ${name}`
  const style = doc.createElement('style')
  style.textContent = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html { background: #fff; }
    body { margin: 0; padding: 14mm 16mm; color: #182b42; font: 12px Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet-header { display: grid; grid-template-columns: 106px minmax(0, 1fr) auto; align-items: center; gap: 18px; padding-bottom: 18px; border-bottom: 3px solid #183650; }
    .sheet-logo { width: 102px; height: 60px; object-fit: contain; }
    .sheet-brand { font-size: 18px; font-weight: 700; letter-spacing: .5px; }
    .sheet-subtitle { margin-top: 6px; color: #667384; font-size: 10px; }
    .sheet-kind { text-align: right; font-size: 9px; line-height: 1.7; letter-spacing: 1px; color: #667384; }
    .sheet-kind strong { display: block; color: #183650; font-size: 12px; letter-spacing: .6px; }
    .sheet-identity { padding: 22px 0 20px; border-bottom: 1px solid #cdd5df; margin-bottom: 22px; }
    .sheet-identity-label { margin: 0 0 7px; color: #667384; font-size: 9px; letter-spacing: .7px; text-transform: uppercase; }
    h1 { margin: 0; color: #142d48; font-size: 22px; line-height: 1.25; font-weight: 700; overflow-wrap: anywhere; }
    section { margin: 0 0 22px; break-inside: avoid; }
    h2 { display: flex; align-items: center; gap: 10px; margin: 0; padding: 9px 11px; border: 1px solid #cdd5df; background: #edf1f5; color: #183650; font-size: 11px; font-weight: 700; }
    .section-number { color: #667384; font-size: 9px; font-weight: 400; }
    dl { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 0; border-left: 1px solid #d8dee6; }
    .sheet-field { grid-column: span 2; min-width: 0; padding: 11px 12px 12px; border-right: 1px solid #d8dee6; border-bottom: 1px solid #d8dee6; }
    .sheet-field-half { grid-column: span 3; }
    .sheet-field-full { grid-column: 1 / -1; }
    dt { margin-bottom: 6px; color: #667384; font-size: 8px; line-height: 1.4; letter-spacing: .45px; text-transform: uppercase; }
    dd { margin: 0; color: #182b42; font-size: 12px; line-height: 1.5; font-weight: 600; white-space: pre-wrap; overflow-wrap: anywhere; }
    .sheet-footer { display: flex; justify-content: space-between; gap: 20px; margin-top: 30px; padding-top: 10px; border-top: 1px solid #cdd5df; color: #667384; font-size: 9px; line-height: 1.5; }
    @media screen { body { max-width: 210mm; margin: 0 auto; } }
    @media print { a { color: inherit; text-decoration: none; } }
  `
  doc.head.appendChild(style)
  const element = (tag: string, text = '', className = '') => {
    const node = doc.createElement(tag)
    if (text) node.textContent = text
    if (className) node.className = className
    return node
  }
  const kind = title.replace(/^Ficha (?:do|da) /i, '').toLocaleUpperCase('pt-BR')
  const header = element('header', '', 'sheet-header')
  const logo = doc.createElement('img'); logo.src = logoUrl; logo.alt = 'Transcavalcante'; logo.className = 'sheet-logo'
  const brand = element('div')
  brand.append(element('div', 'TRANSCAVALCANTE', 'sheet-brand'), element('div', 'Centro Operacional', 'sheet-subtitle'))
  const documentKind = element('div', 'FICHA CADASTRAL', 'sheet-kind'); documentKind.appendChild(element('strong', kind))
  header.append(logo, brand, documentKind)
  doc.body.appendChild(header)
  const identity = element('div', '', 'sheet-identity')
  identity.append(element('p', kind === 'VEÍCULO' ? 'Identificação do veículo' : kind === 'MOTORISTA' ? 'Nome completo' : 'Nome / razão social', 'sheet-identity-label'), element('h1', name))
  doc.body.appendChild(identity)
  let index = 0
  sections.forEach((item) => {
    const fields = item.fields.filter(([label, value]) => !(/^(Nome|Nome \/ razão social|Placa)$/i.test(label) && value.trim().toUpperCase() === name.trim().toUpperCase()))
    if (!fields.length) return
    const section = element('section')
    const heading = element('h2'); heading.append(element('span', String(++index).padStart(2, '0'), 'section-number'), doc.createTextNode(item.title))
    const grid = element('dl')
    let row: Array<{ element: HTMLElement; span: number }> = []
    let used = 0
    const finishRow = () => {
      let remaining = 6 - used
      for (let index = 0; remaining > 0 && row.length; index = (index + 1) % row.length) { row[index].span++; remaining-- }
      row.forEach((cell) => { cell.element.style.gridColumn = `span ${cell.span}` })
      row = []; used = 0
    }
    fields.forEach(([label, value]) => {
      const wide = /endereço|observaç/i.test(label) || value.length > 85
      const cell = element('div', '', `sheet-field${wide ? ' sheet-field-full' : value.length > 35 ? ' sheet-field-half' : ''}`)
      const span = wide ? 6 : value.length > 35 ? 3 : 2
      if (used + span > 6) finishRow()
      cell.append(element('dt', label), element('dd', value)); grid.appendChild(cell)
      row.push({ element: cell, span }); used += span
      if (used === 6) finishRow()
    })
    finishRow()
    section.append(heading, grid); doc.body.appendChild(section)
  })
  const issued = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(now)
  const footer = element('footer', '', 'sheet-footer')
  footer.append(element('span', 'Transcavalcante · ' + title), element('span', 'Emitido em ' + issued))
  doc.body.appendChild(footer)
  return logo
}
