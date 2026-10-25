import type { Customer, Driver, Vehicle } from './localStore'

export type DetailSection = { title: string; fields: Array<[string, string]>; defaultShare?: boolean }
function section(title: string, fields: Array<[string, unknown]>, defaultShare = true): DetailSection {
  return { title, fields: fields.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '').map(([label, value]) => [label, String(value)]), defaultShare }
}
const date = (value?: string) => value ? value.slice(0, 10).split('-').reverse().join('/') : ''
const address = (record: Customer | Driver) => [record.street, record.number, record.complement, record.district, record.city, record.state, record.zipCode].filter(Boolean).join(', ')
const phone = (record: Customer | Driver) => [record.phoneDdd, record.phone].filter(Boolean).join(' ')

export function customerDetails(record: Customer): DetailSection[] {
  return [
    section('Identificação', [['Nome / razão social', record.name], ['CPF/CNPJ', record.document], ['Nome fantasia', record.tradeName], ['Situação', record.status]]),
    section('Contato e endereço', [['Telefone', phone(record)], ['E-mail fiscal', record.emailFiscal], ['Endereço', address(record)]]),
    section('Faturamento', [['Inscrição estadual', record.stateRegistration], ['Inscrição municipal', record.municipalRegistration], ['Prazo de pagamento', record.paymentTerm]], false),
    section('Observações', [['Observações', record.notes]], false),
  ].filter((item) => item.fields.length)
}

export function driverDetails(record: Driver): DetailSection[] {
  return [
    section('Identificação', [['Nome', record.name], ['CPF', record.cpf], ['Situação', record.status]]),
    section('Contato', [['Telefone', phone(record)], ['E-mail', record.email || record.contactEmail]]),
    section('Habilitação', [['CNH', record.cnh], ['Categoria', record.category], ['Validade da CNH', date(record.cnhExpiration)], ['Validade do gerenciamento de risco', date(record.grExpiration)]]),
    section('Endereço e documentos pessoais', [['Endereço', address(record)], ['Nascimento', date(record.birthDate)], ['RG', record.rg], ['Órgão / UF', [record.rgIssuer, record.rgState].filter(Boolean).join(' / ')]], false),
    section('Vínculo profissional', [['Transportadora', record.carrier], ['Cargo', record.jobTitle || record.occupation], ['Empregador', record.employer], ['INSS / PIS / NIT', record.inss]], false),
    section('Observações', [['Observações', record.notes]], false),
  ].filter((item) => item.fields.length)
}

export function vehicleDetails(record: Vehicle): DetailSection[] {
  const plate = record.vehicleType === 'Cavalo' ? record.tractorPlate : record.trailerPlate
  return [
    section('Identificação', [['Placa', plate], ['Código da frota', record.fleetNumber], ['Tipo', record.description || record.type], ['Marca / modelo', [record.brand, record.model].filter(Boolean).join(' / ')], ['Fabricação / modelo', [record.manufactureYear, record.yearModel].filter(Boolean).join(' / ')], ['Cor', record.color], ['Situação', record.status]]),
    section('Documentos', [['Renavam', record.renavam], ['Chassi', record.chassis], ['RNTRC', record.rntrc], ['Proprietário', record.owner], ['CPF/CNPJ do proprietário', record.ownerDocument], ['Emplacamento', [record.cityPlate, record.statePlate].filter(Boolean).join(' / ')], ['Exercício do CRLV', record.licensingYear]]),
    section('Operação', [['Eixos', record.axles], ['Tara (kg)', record.tare], ['Capacidade útil (kg)', record.capacityKg || record.capacity], ['Carroceria', record.bodyType], ['Motorista habitual', record.driver], ['Validade do gerenciamento de risco', date(record.grExpiration)]]),
    section('Licenciamentos', (record.licensingRecords || []).map((item) => [`Exercício ${item.year}`, [item.status, item.dueDate ? `Vencimento: ${date(item.dueDate)}` : ''].filter(Boolean).join(' · ')])),
    section('Seguro', [['Seguradora', record.insurer], ['Apólice', record.insurancePolicy], ['Fim da vigência', date(record.insuranceEnd)]], false),
    section('Compra', [['Data', date(record.purchaseDate)], ['Valor (R$)', record.purchaseValue], ['Vendedor', record.seller]], false),
    section('Observações', [['Observações', record.notes]], false),
  ].filter((item) => item.fields.length)
}

export function recordText(title: string, name: string, sections: DetailSection[]) {
  return [title + ' — Transcavalcante', name, ...sections.map((item) => '\n' + item.title + '\n' + item.fields.map(([label, value]) => `${label}: ${value}`).join('\n'))].join('\n')
}
