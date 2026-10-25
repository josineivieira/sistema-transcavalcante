export function cleanCustomerDocument(value: string) {
  return value.toUpperCase().replace(/[.\/\s-]/g, '')
}

export function formatCustomerDocument(value: string, type: string) {
  if (type === 'Exterior') return value.slice(0, 30)
  const raw = type === 'Fisica' ? value.replace(/\D/g, '').slice(0, 11) : value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)
  const groups = type === 'Fisica' ? [3, 3, 3, 2] : [2, 3, 3, 4, 2]
  const separators = type === 'Fisica' ? ['.', '.', '-'] : ['.', '.', '/', '-']
  let offset = 0
  return groups.reduce((result, size, index) => {
    const chunk = raw.slice(offset, offset + size)
    offset += size
    return result + (chunk && index ? separators[index - 1] : '') + chunk
  }, '')
}

export function customerDocumentError(value: string, type: string): string {
  const raw = cleanCustomerDocument(value)
  if (!raw) return 'Informe o documento.'
  if (type === 'Exterior') return value.trim().length <= 30 ? '' : 'Informe um documento com até 30 caracteres.'
  const cpf = type === 'Fisica'
  const label = cpf ? 'CPF' : 'CNPJ'
  if (!(cpf ? /^\d{11}$/ : /^[A-Z0-9]{12}\d{2}$/).test(raw)) return `Informe um ${label} completo e válido.`
  if (/^(.)\1+$/.test(raw)) return `${label} inválido.`
  const base = raw.slice(0, -2)
  const calculate = (text: string) => {
    const sum = [...text].reduce((total, char, index) => {
      const weight = cpf ? text.length + 1 - index : (text.length - 1 - index) % 8 + 2
      return total + (char.charCodeAt(0) - 48) * weight
    }, 0)
    const remainder = sum % 11
    return remainder < 2 ? '0' : String(11 - remainder)
  }
  const first = calculate(base)
  const second = calculate(base + first)
  return raw.slice(-2) === first + second ? '' : `${label} inválido. Confira os dígitos.`
}
