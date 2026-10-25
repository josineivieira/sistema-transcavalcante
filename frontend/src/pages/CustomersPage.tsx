import { RecordDetails } from '../components/RecordDetails'
import { customerDetails } from '../services/recordDetails'
import { cloneElement, useId, useMemo, useState, type ReactElement } from 'react'
import { Eye, Save, Search, Trash2, X } from 'lucide-react'
import { nextId, type Customer } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { customerDocumentError, formatCustomerDocument } from '../services/customerDocument'
import { LoadingRow } from '../components/LoadingState'

const emptyCustomer: Customer = {
  id: '',
  document: '',
  name: '',
  tradeName: '',
  participantType: 'Juridica',
  market: '',
  category: '',
  shortName: '',
  emailFiscal: '',
  phone: '',
  phoneDdd: '',
  phoneExtension: '',
  hasWhatsapp: 'S',
  contactEmail: '',
  municipalRegistration: '',
  stateRegistration: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  reference: '',
  district: '',
  city: 'Manaus',
  cityCode: '1302603',
  state: 'AM',
  country: 'BR',
  taxRegime: 'Simples Nacional',
  serviceCode: '16.02',
  serviceDescription: 'Servico de transporte municipal de cargas e apoio logistico operacional.',
  issRate: '5',
  issWithheld: 'Nao',
  paymentTerm: '7 dias',
  birthDate: '',
  anniversary: '',
  gender: '',
  rg: '',
  rgIssuer: '',
  rgState: '',
  notes: '',
  website: '',
  economicGroup: '',
  groupedCode: '',
  occupation: '',
  educationLevel: '',
  civilStatus: '',
  spouseName: '',
  employerDocument: '',
  employer: '',
  jobTitle: '',
  birthplace: '',
  nationality: 'Brasil',
  motherName: '',
  fatherName: '',
  registrationDate: '',
  status: 'Ativo',
}

function formatDate(value?: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function automaticShortName(name: string) {
  return name.trim().toUpperCase()
}

function customerForEdit(customer?: Customer): Customer {
  if (!customer) {
    return { ...emptyCustomer, id: nextId('cli'), registrationDate: new Date().toISOString().slice(0, 10) }
  }

  return {
    ...emptyCustomer,
    ...customer,
    tradeName: customer.tradeName || customer.name,
    shortName: customer.shortName || customer.tradeName || customer.name,
    participantType: customer.participantType || (customer.document.length > 14 ? 'Juridica' : 'Fisica'),
    contactEmail: customer.contactEmail || customer.emailFiscal,
    country: customer.country || 'BR',
  }
}

export function CustomersPage() {
  const { customers, loading, setCustomers } = useLocalData()
  const canEditPage = canEdit('customers')
  const [viewing, setViewing] = useState<Customer | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [query, setQuery] = useState('')
  const [documentError, setDocumentError] = useState('')

  const rows = useMemo(() => {
    const term = query.toLowerCase()
    return customers.filter((customer) => [
      customer.name,
      customer.tradeName,
      customer.emailFiscal,
      customer.phone,
      customer.document,
      customer.stateRegistration,
      customer.street,
      customer.city,
      customer.state,
    ].join(' ').toLowerCase().includes(term))
  }, [customers, query])

  function openCustomer(customer?: Customer) {
    setDocumentError('')
    setEditing(customerForEdit(customer))
  }

  function updateEditing(field: keyof Customer, value: string) {
    if (!editing) return
    const next = { ...editing, [field]: value }
    if (field === 'document') {
      next.document = formatCustomerDocument(value, editing.participantType || 'Juridica')
      setDocumentError('')
    }
    if (field === 'participantType') setDocumentError(customerDocumentError(editing.document, value))
    if (field === 'name') {
      const previousAutoShortName = automaticShortName(editing.name)
      next.tradeName = next.tradeName || value
      if (!editing.shortName || editing.shortName === previousAutoShortName) {
        next.shortName = automaticShortName(value)
      }
    }
    if (field === 'emailFiscal') next.contactEmail = value
    setEditing(next)
  }

  function saveCustomer(closeAfterSave = true) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    if (!editing.document || !editing.name) {
      window.alert('Informe CPF/CNPJ e razao social/nome.')
      return
    }
    const error = customerDocumentError(editing.document, editing.participantType || 'Juridica')
    if (error) {
      setDocumentError(error)
      document.querySelector<HTMLInputElement>('[data-customer-document]')?.focus()
      return
    }
    const normalized = {
      ...editing,
      document: formatCustomerDocument(editing.document, editing.participantType || 'Juridica'),
      tradeName: editing.tradeName || editing.name,
      shortName: editing.shortName || automaticShortName(editing.name),
      contactEmail: editing.contactEmail || editing.emailFiscal,
      status: editing.status || 'Ativo',
    }
    const exists = customers.some((customer) => customer.id === normalized.id)
    setCustomers(exists ? customers.map((customer) => customer.id === normalized.id ? normalized : customer) : [...customers, normalized])
    if (closeAfterSave) setEditing(null)
  }

  function deleteCustomer(customer: Customer) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (window.confirm(`Excluir cliente ${customer.name}?`)) {
      setCustomers(customers.filter((item) => item.id !== customer.id))
      setEditing(null)
    }
  }

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
        <h2 className="text-lg font-normal text-red-600">Consulta clientes</h2>
        <button
          onClick={() => canEditPage ? openCustomer() : denyNoPrivilege()}
          className="grid h-7 w-7 place-items-center bg-black text-lg font-bold text-white"
          title="Novo cliente"
        >
          +
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 bg-zinc-50 px-4 py-2">
        <div className="text-xs text-zinc-600">{loading ? 'Carregando...' : `${rows.length} de ${customers.length} registros`}</div>
        <label className="flex h-8 items-center border border-zinc-300 bg-white px-2 text-xs text-zinc-500">
          <Search size={15} className="mr-2" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-full w-64 border-0 p-0 outline-none" placeholder="Busca rapida" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1420px] text-xs">
          <thead className="bg-zinc-100">
            <tr>
              <th rowSpan={2} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">Razao Social/Nome</th>
              <th colSpan={2} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-semibold text-zinc-800">COMUNICACAO</th>
              <th colSpan={7} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-semibold text-zinc-800">ENDERECO</th>
              <th rowSpan={2} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">Nome fantasia</th>
              <th rowSpan={2} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">Tipo de participante</th>
              <th rowSpan={2} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">CNPJ/CPF/Codigo</th>
              <th rowSpan={2} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">Inscricao estadual</th>
              <th rowSpan={2} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">Dt. cadastro</th>
              <th rowSpan={2} className="border-b border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">Acoes</th>
            </tr>
            <tr>
              {['E-mail', 'Telefone', 'Logradouro', 'Numero', 'Complemento', 'Bairro', 'Cidade', 'Estado', 'Sg. pais'].map((heading) => (
                <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.map((customer) => (
              <tr key={customer.id} onClick={() => setViewing(customer)} className="cursor-pointer hover:bg-sky-50">
                <td className="border-b border-r border-zinc-200 px-2 py-2 font-medium"><button className="text-left hover:underline" aria-label={`Visualizar cliente ${customer.name}`} onClick={(event) => { event.stopPropagation(); setViewing(customer) }}>{customer.name}</button></td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.emailFiscal || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.phone || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.street || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.number || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.complement || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.district || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.city || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.state || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.country || 'BR'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.tradeName || customer.name}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.participantType || 'Juridica'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.document}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{customer.stateRegistration || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{formatDate(customer.registrationDate)}</td>
                <td className="border-b border-zinc-200 px-2 py-1">
                  <button onClick={(event) => { event.stopPropagation(); setViewing(customer) }} className="border border-zinc-300 bg-white px-2 py-1" title="Visualizar cliente">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {loading && <LoadingRow colSpan={16} label="Carregando clientes..." />}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={16} className="px-3 py-10 text-center text-zinc-500">Nenhum cliente encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && <RecordDetails title="Ficha do cliente" name={viewing.name} sections={customerDetails(viewing)} onClose={() => setViewing(null)} onEdit={canEditPage ? () => { openCustomer(viewing); setViewing(null) } : undefined} />}

      {editing && (
        <div className="customer-editor-overlay">
          <section className="customer-editor" role="dialog" aria-modal="true" aria-labelledby="customer-editor-title">
            <header className="customer-editor-header">
              <h3 id="customer-editor-title">{customers.some((customer) => customer.id === editing.id) ? 'Editar cliente' : 'Novo cliente'}</h3>
              <div className="customer-editor-actions">
                <button type="button" onClick={() => saveCustomer(false)} disabled={!canEditPage}><Save size={15} /> Salvar</button>
                <button type="button" onClick={() => saveCustomer(true)} disabled={!canEditPage}><Save size={15} /> Salvar e sair</button>
                {customers.some((customer) => customer.id === editing.id) && <button type="button" onClick={() => deleteCustomer(editing)} disabled={!canEditPage}><Trash2 size={15} /> Excluir</button>}
                <button type="button" onClick={() => setEditing(null)} aria-label="Fechar cadastro"><X size={18} /></button>
              </div>
            </header>

            <div className="customer-editor-body">
              <fieldset>
                <legend>Identificação</legend>
                <div className="customer-editor-grid">
                  <CustomerField label="Tipo de pessoa">
                    <select value={editing.participantType} onChange={(event) => updateEditing('participantType', event.target.value)}>
                      <option value="Juridica">Pessoa jurídica</option><option value="Fisica">Pessoa física</option><option value="Exterior">Exterior</option>
                    </select>
                  </CustomerField>
                  <CustomerField label={editing.participantType === 'Exterior' ? 'Documento' : 'CPF/CNPJ'} required error={documentError}>
                    <input data-customer-document value={editing.document} required maxLength={editing.participantType === 'Exterior' ? 30 : editing.participantType === 'Fisica' ? 14 : 18} inputMode={editing.participantType === 'Fisica' ? 'numeric' : 'text'} autoCapitalize="characters" spellCheck={false} aria-invalid={Boolean(documentError)} aria-describedby={documentError ? 'customer-document-error' : undefined} onBlur={() => setDocumentError(customerDocumentError(editing.document, editing.participantType || 'Juridica'))} onChange={(event) => updateEditing('document', event.target.value)} />
                  </CustomerField>
                  <CustomerField label="Situação">
                    <select value={editing.status} onChange={(event) => updateEditing('status', event.target.value)}><option>Ativo</option><option>Inativo</option></select>
                  </CustomerField>
                  <CustomerField label={editing.participantType === 'Fisica' ? 'Nome completo' : 'Razão social'} required className="customer-editor-wide">
                    <input value={editing.name} required onChange={(event) => updateEditing('name', event.target.value.toUpperCase())} />
                  </CustomerField>
                  {editing.participantType !== 'Fisica' && <CustomerField label="Nome fantasia">
                    <input value={editing.tradeName} onChange={(event) => updateEditing('tradeName', event.target.value.toUpperCase())} />
                  </CustomerField>}
                </div>
              </fieldset>

              <fieldset>
                <legend>Contato</legend>
                <div className="customer-editor-grid">
                  <CustomerField label="E-mail fiscal">
                    <input type="email" value={editing.emailFiscal} onChange={(event) => updateEditing('emailFiscal', event.target.value)} />
                  </CustomerField>
                  <div className="customer-editor-field"><span>Telefone</span>
                    <div className="customer-editor-phone">
                      <input type="tel" aria-label="DDD" placeholder="DDD" maxLength={3} value={editing.phoneDdd} onChange={(event) => updateEditing('phoneDdd', event.target.value)} />
                      <input type="tel" aria-label="Número do telefone" value={editing.phone} onChange={(event) => updateEditing('phone', event.target.value)} />
                    </div>
                  </div>
                  <CustomerField label="WhatsApp">
                    <select value={editing.hasWhatsapp} onChange={(event) => updateEditing('hasWhatsapp', event.target.value)}><option value="S">Sim</option><option value="N">Não</option></select>
                  </CustomerField>
                </div>
              </fieldset>

              <fieldset>
                <legend>Endereço</legend>
                <div className="customer-editor-grid">
                  <CustomerField label="CEP"><input value={editing.zipCode} onChange={(event) => updateEditing('zipCode', event.target.value)} /></CustomerField>
                  <CustomerField label="Logradouro" className="customer-editor-wide"><input value={editing.street} onChange={(event) => updateEditing('street', event.target.value.toUpperCase())} /></CustomerField>
                  <CustomerField label="Número"><input value={editing.number} onChange={(event) => updateEditing('number', event.target.value)} /></CustomerField>
                  <CustomerField label="Complemento"><input value={editing.complement} onChange={(event) => updateEditing('complement', event.target.value.toUpperCase())} /></CustomerField>
                  <CustomerField label="Bairro"><input value={editing.district} onChange={(event) => updateEditing('district', event.target.value.toUpperCase())} /></CustomerField>
                  <CustomerField label="Cidade"><input value={editing.city} onChange={(event) => updateEditing('city', event.target.value.toUpperCase())} /></CustomerField>
                  <CustomerField label="UF"><input maxLength={2} value={editing.state} onChange={(event) => updateEditing('state', event.target.value.toUpperCase())} /></CustomerField>
                  <CustomerField label="País"><input maxLength={2} value={editing.country} onChange={(event) => updateEditing('country', event.target.value.toUpperCase())} /></CustomerField>
                </div>
              </fieldset>

              <fieldset>
                <legend>Faturamento</legend>
                <div className="customer-editor-grid">
                  <CustomerField label="Inscrição estadual"><input value={editing.stateRegistration} onChange={(event) => updateEditing('stateRegistration', event.target.value)} /></CustomerField>
                  <CustomerField label="Inscrição municipal"><input value={editing.municipalRegistration} onChange={(event) => updateEditing('municipalRegistration', event.target.value)} /></CustomerField>
                  <CustomerField label="Prazo de pagamento"><input value={editing.paymentTerm} onChange={(event) => updateEditing('paymentTerm', event.target.value)} /></CustomerField>
                </div>
              </fieldset>
              <CustomerField label="Observações"><textarea rows={2} value={editing.notes} onChange={(event) => updateEditing('notes', event.target.value)} /></CustomerField>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function CustomerField({ label, children, required = false, className = '', error = '' }: { label: string; children: ReactElement<{ id?: string }>; required?: boolean; className?: string; error?: string }) {
  const id = useId()
  return <div className={`customer-editor-field ${className}`}><label htmlFor={id}>{label}{required && <span className="customer-required"> *</span>}</label>{cloneElement(children, { id })}{error && <p id="customer-document-error" role="alert" className="mt-1 text-xs text-red-700">{error}</p>}</div>
}
