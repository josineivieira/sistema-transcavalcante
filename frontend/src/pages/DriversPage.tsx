import { RecordDetails } from '../components/RecordDetails'
import { driverDetails } from '../services/recordDetails'
import { cloneElement, useId, useMemo, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { FileSpreadsheet, Save, Search, Trash2, X } from 'lucide-react'
import { useLocalData } from '../hooks/useLocalData'
import { formatMoney, nextId, type Driver } from '../services/localStore'
import { canEdit, canView, denyNoPrivilege } from '../services/authSession'
import { customerDocumentError, formatCustomerDocument } from '../services/customerDocument'
import { LoadingRow } from '../components/LoadingState'

const emptyDriver: Driver = {
  id: '',
  name: '',
  cpf: '',
  phone: '',
  cnh: '',
  category: 'E',
  cnhExpiration: '',
  carrier: 'Transcavalcante',
  personType: 'Fisica',
  tradeName: '',
  shortName: '',
  mainCommunication: '',
  city: 'Manaus',
  state: 'AM',
  registrationDate: '',
  grExpiration: '',
  email: '',
  birthDate: '',
  anniversary: '',
  gender: 'Masculino',
  rg: '',
  rgIssuer: '',
  rgState: 'AM',
  notes: '',
  nickname: '',
  website: '',
  economicGroup: '',
  groupedCode: '',
  inss: '',
  occupation: 'Motorista',
  educationLevel: '',
  civilStatus: '',
  spouseName: '',
  employerDocument: '',
  employer: '',
  jobTitle: 'Motorista',
  birthplace: 'Manaus',
  nationality: 'Brasil',
  motherName: '',
  fatherName: '',
  addressType: 'RESIDENCIAL',
  addressIdentification: '',
  street: '',
  number: '',
  complement: '',
  reference: '',
  district: '',
  zipCode: '',
  municipalRegistration: '',
  stateRegistration: '',
  communicationType: 'Celular',
  phoneDdd: '',
  phoneExtension: '',
  hasWhatsapp: 'S',
  contactEmail: '',
  status: 'Ativo',
}

function formatDate(value?: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function driverForEdit(driver?: Driver): Driver {
  if (!driver) {
    return { ...emptyDriver, id: nextId('cond'), registrationDate: new Date().toISOString().slice(0, 10) }
  }

  return {
    ...emptyDriver,
    ...driver,
    personType: driver.personType || 'Fisica',
    tradeName: driver.tradeName || driver.name,
    shortName: driver.shortName || driver.name.split(' ')[0],
    mainCommunication: driver.mainCommunication || driver.phone,
    city: driver.city || 'Manaus',
    state: driver.state || 'AM',
    grExpiration: driver.grExpiration || driver.cnhExpiration,
    contactEmail: driver.contactEmail || driver.email,
  }
}

export function DriversPage() {
  const { drivers, payrollProfiles, loading, setDrivers } = useLocalData()
  const canEditPage = canEdit('drivers')
  const [viewing, setViewing] = useState<Driver | null>(null)
  const [editing, setEditing] = useState<Driver | null>(null)
  const [mainTab, setMainTab] = useState('CADASTRO')
  const [query, setQuery] = useState('')
  const [cpfError, setCpfError] = useState('')
  const financialProfile = payrollProfiles.find((profile) => profile.employeeId === editing?.id)

  const rows = useMemo(() => {
    return drivers.filter((driver) => {
      const text = [
        driver.cpf,
        driver.name,
        driver.tradeName,
        driver.shortName,
        driver.phone,
        driver.city,
        driver.state,
      ].join(' ').toLowerCase()
      return text.includes(query.toLowerCase())
    })
  }, [drivers, query])

  function openDriver(driver?: Driver) {
    setCpfError('')
    setMainTab('CADASTRO')
    setEditing(driverForEdit(driver))
  }

  function updateEditing(field: keyof Driver, value: string) {
    if (!editing) return
    const next = { ...editing, [field]: value }
    if (field === 'cpf') { next.cpf = formatCustomerDocument(value, 'Fisica'); setCpfError('') }
    if (field === 'email') next.contactEmail = value

    if (field === 'name') {
      next.tradeName = next.tradeName || value
      next.shortName = next.shortName || value.split(' ')[0]
    }

    if (field === 'phone') {
      next.mainCommunication = value
    }

    setEditing(next)
  }

  function saveDriver(closeAfterSave = true) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    if (!editing.name || !editing.cpf) {
      window.alert('Informe nome completo e CPF.')
      return
    }

    const error = customerDocumentError(editing.cpf, 'Fisica')
    if (error) { setCpfError(error); setMainTab('CADASTRO'); return }
    const normalized = {
      ...editing,
      cpf: formatCustomerDocument(editing.cpf, 'Fisica'),
      tradeName: editing.tradeName || editing.name,
      shortName: editing.shortName || editing.name.split(' ')[0],
      mainCommunication: editing.mainCommunication || editing.phone,
      grExpiration: editing.grExpiration || editing.cnhExpiration,
      status: editing.status || 'Ativo',
    }

    const exists = drivers.some((driver) => driver.id === normalized.id)
    setDrivers(exists ? drivers.map((driver) => driver.id === normalized.id ? normalized : driver) : [...drivers, normalized])
    if (closeAfterSave) setEditing(null)
  }

  function deleteDriver(driver: Driver) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (window.confirm(`Excluir condutor ${driver.name}?`)) {
      setDrivers(drivers.filter((item) => item.id !== driver.id))
      setEditing(null)
    }
  }

  return (
    <div className="border border-zinc-500 bg-zinc-100">
      <div className="flex items-center justify-between border-b-4 border-zinc-400 px-2 py-1">
        <h2 className="text-lg font-normal text-red-600">Consulta motoristas</h2>
        <div className="flex items-center gap-4 text-xs">
          <button className="inline-flex items-center gap-1"><FileSpreadsheet size={15} /> GERAR EXCEL</button>
          <button className="inline-flex items-center gap-1"><FileSpreadsheet size={15} /> GERAR EXCEL SEM FORMATACAO</button>
          <button
            onClick={() => canEditPage ? openDriver() : denyNoPrivilege()}
            className="grid h-7 w-7 place-items-center bg-black text-lg font-bold text-white"
            title="Novo condutor"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 bg-zinc-50 px-4 py-2">
        <div className="text-xs text-zinc-600">{loading ? 'Carregando...' : `${rows.length} de ${drivers.length} registros`}</div>
        <label className="flex h-8 items-center border border-zinc-300 bg-white px-2 text-xs text-zinc-500">
          <Search size={15} className="mr-2" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-full w-64 border-0 p-0 outline-none" placeholder="Busca rapida" />
        </label>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-[1180px] text-xs">
          <thead className="bg-zinc-100">
            <tr>
              {['CNPJ/CPF/Codigo', 'Empresa ou Pessoa', 'Dt. vencimento GR', 'Tipo de p.', 'Comunicacao princ', 'Cidade', 'Estado', 'Dt. cadastro'].map((heading) => (
                <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.map((driver) => (
              <tr
                key={driver.id}
                onClick={() => setViewing(driver)}
                className="cursor-pointer hover:bg-sky-100"
              >
                <td className="border-b border-r border-zinc-200 px-2 py-2 font-medium">{driver.cpf}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2"><button className="text-left hover:underline" aria-label={`Visualizar motorista ${driver.name}`} onClick={(event) => { event.stopPropagation(); setViewing(driver) }}>{driver.name}</button></td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{formatDate(driver.grExpiration || driver.cnhExpiration)}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.personType || 'Fisica'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.mainCommunication || driver.phone}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.city || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.state || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{formatDate(driver.registrationDate)}</td>
              </tr>
            ))}
            {loading && <LoadingRow colSpan={8} label="Carregando condutores..." />}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="border-b border-zinc-200 px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhum condutor encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && <RecordDetails title="Ficha do motorista" name={viewing.name} sections={driverDetails(viewing)} onClose={() => setViewing(null)} onEdit={canEditPage ? () => { openDriver(viewing); setViewing(null) } : undefined} />}

      {editing && (
        <div className="customer-editor-overlay">
          <section className="customer-editor" role="dialog" aria-modal="true" aria-labelledby="driver-editor-title">
            <header className="customer-editor-header">
              <h3 id="driver-editor-title">{drivers.some((driver) => driver.id === editing.id) ? 'Editar motorista' : 'Novo motorista'}</h3>
              <div className="customer-editor-actions">
                <button onClick={() => saveDriver(false)} disabled={!canEditPage}><Save size={15} /> Salvar</button>
                <button onClick={() => saveDriver(true)} disabled={!canEditPage}><Save size={15} /> Salvar e sair</button>
                {drivers.some((driver) => driver.id === editing.id) && <button onClick={() => deleteDriver(editing)} disabled={!canEditPage}><Trash2 size={15} /> Excluir</button>}
                <button onClick={() => setEditing(null)} aria-label="Fechar cadastro de motorista"><X size={18} /></button>
              </div>
            </header>
            <div className="flex flex-wrap gap-1 border-b border-zinc-300 bg-white px-4 pt-2 text-xs" role="tablist" aria-label="Cadastro do motorista">
              {['CADASTRO', 'DOCUMENTOS E VÍNCULO', ...(canView('payroll') ? ['PAGAMENTO'] : [])].map((tab) => <button key={tab} id={`driver-tab-${encodeURIComponent(tab)}`} role="tab" aria-selected={mainTab === tab} aria-controls="driver-tab-content" onClick={() => setMainTab(tab)} className={`border-b-2 px-3 py-3 ${mainTab === tab ? 'border-[#244761] font-semibold text-[#244761]' : 'border-transparent text-zinc-500 hover:bg-zinc-50'}`}>{tab}</button>)}
            </div>
            <div className="customer-editor-body" role="tabpanel" id="driver-tab-content" aria-labelledby={`driver-tab-${encodeURIComponent(mainTab)}`}>
              {mainTab === 'CADASTRO' && <>
                <fieldset><legend>Identificação</legend><div className="customer-editor-grid">
                  <DriverField label="Nome completo" required className="customer-editor-wide"><input value={editing.name} onChange={(event) => updateEditing('name', event.target.value.toUpperCase())} /></DriverField>
                  <DriverField label="CPF" required error={cpfError}><input value={editing.cpf} maxLength={14} inputMode="numeric" aria-invalid={Boolean(cpfError)} aria-describedby={cpfError ? 'driver-cpf-error' : undefined} onBlur={() => setCpfError(customerDocumentError(editing.cpf, 'Fisica'))} onChange={(event) => updateEditing('cpf', event.target.value)} /></DriverField>
                  <DriverField label="Situação"><select value={editing.status} onChange={(event) => updateEditing('status', event.target.value)}><option>Ativo</option><option>Inativo</option></select></DriverField>
                </div></fieldset>
                <fieldset><legend>Contato</legend><div className="customer-editor-grid">
                  <DriverField label="E-mail"><input type="email" value={editing.email} onChange={(event) => updateEditing('email', event.target.value)} /></DriverField>
                  <div className="customer-editor-field"><span>Telefone</span><div className="customer-editor-phone"><input type="tel" aria-label="DDD" maxLength={3} placeholder="DDD" value={editing.phoneDdd} onChange={(event) => updateEditing('phoneDdd', event.target.value)} /><input type="tel" aria-label="Número do telefone" value={editing.phone} onChange={(event) => updateEditing('phone', event.target.value)} /></div></div>
                  <DriverField label="WhatsApp"><select value={editing.hasWhatsapp} onChange={(event) => updateEditing('hasWhatsapp', event.target.value)}><option value="S">Sim</option><option value="N">Não</option></select></DriverField>
                </div></fieldset>
                <fieldset><legend>Endereço</legend><div className="customer-editor-grid">
                  <DriverField label="CEP"><input value={editing.zipCode} onChange={(event) => updateEditing('zipCode', event.target.value)} /></DriverField>
                  <DriverField label="Logradouro" className="customer-editor-wide"><input value={editing.street} onChange={(event) => updateEditing('street', event.target.value.toUpperCase())} /></DriverField>
                  <DriverField label="Número"><input value={editing.number} onChange={(event) => updateEditing('number', event.target.value)} /></DriverField>
                  <DriverField label="Complemento"><input value={editing.complement} onChange={(event) => updateEditing('complement', event.target.value.toUpperCase())} /></DriverField>
                  <DriverField label="Bairro"><input value={editing.district} onChange={(event) => updateEditing('district', event.target.value.toUpperCase())} /></DriverField>
                  <DriverField label="Cidade" className="customer-editor-wide"><input value={editing.city} onChange={(event) => updateEditing('city', event.target.value.toUpperCase())} /></DriverField>
                  <DriverField label="UF"><input maxLength={2} value={editing.state} onChange={(event) => updateEditing('state', event.target.value.toUpperCase())} /></DriverField>
                </div></fieldset>
                <DriverField label="Observações"><textarea rows={2} value={editing.notes} onChange={(event) => updateEditing('notes', event.target.value)} /></DriverField>
              </>}

              {mainTab === 'DOCUMENTOS E VÍNCULO' && <>
                <fieldset><legend>Habilitação</legend><div className="customer-editor-grid">
                  <DriverField label="Número da CNH"><input value={editing.cnh} inputMode="numeric" maxLength={11} onChange={(event) => updateEditing('cnh', event.target.value.replace(/\D/g, '').slice(0, 11))} /></DriverField>
                  <DriverField label="Categoria da CNH"><select value={editing.category} onChange={(event) => updateEditing('category', event.target.value)}>{['A', 'B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'].map((category) => <option key={category}>{category}</option>)}</select></DriverField>
                  <DriverField label="Validade da CNH"><input type="date" value={editing.cnhExpiration} onChange={(event) => updateEditing('cnhExpiration', event.target.value)} /></DriverField>
                  <DriverField label="Validade do gerenciamento de risco"><input type="date" value={editing.grExpiration} onChange={(event) => updateEditing('grExpiration', event.target.value)} /></DriverField>
                </div></fieldset>
                <fieldset><legend>Documentos pessoais</legend><div className="customer-editor-grid">
                  <DriverField label="Data de nascimento"><input type="date" value={editing.birthDate} onChange={(event) => updateEditing('birthDate', event.target.value)} /></DriverField>
                  <DriverField label="RG"><input value={editing.rg} onChange={(event) => updateEditing('rg', event.target.value)} /></DriverField>
                  <DriverField label="Órgão emissor"><input value={editing.rgIssuer} onChange={(event) => updateEditing('rgIssuer', event.target.value.toUpperCase())} /></DriverField>
                  <DriverField label="UF do RG"><input maxLength={2} value={editing.rgState} onChange={(event) => updateEditing('rgState', event.target.value.toUpperCase())} /></DriverField>
                </div></fieldset>
                <fieldset><legend>Vínculo profissional</legend><div className="customer-editor-grid">
                  <DriverField label="Empresa / transportadora" className="customer-editor-wide"><input value={editing.carrier} onChange={(event) => updateEditing('carrier', event.target.value.toUpperCase())} /></DriverField>
                  <DriverField label="Cargo"><input value={editing.jobTitle} onChange={(event) => updateEditing('jobTitle', event.target.value)} /></DriverField>
                  <DriverField label="INSS / PIS / NIT"><input value={editing.inss} onChange={(event) => updateEditing('inss', event.target.value)} /></DriverField>
                  <DriverField label="Empregador"><input value={editing.employer} onChange={(event) => updateEditing('employer', event.target.value.toUpperCase())} /></DriverField>
                  <DriverField label="CPF/CNPJ do empregador"><input value={editing.employerDocument} onChange={(event) => updateEditing('employerDocument', event.target.value)} /></DriverField>
                </div></fieldset>
              </>}

              {mainTab === 'PAGAMENTO' && canView('payroll') && <>
                <fieldset><legend>Cadastro financeiro vinculado</legend>
                  {financialProfile ? <dl className="customer-editor-grid text-xs">{[
                    ['Salário', formatMoney(financialProfile.salary)], ['Diária', formatMoney(financialProfile.dailyRate)], ['Admissão', formatDate(financialProfile.admissionDate) || '—'],
                    ['Forma de pagamento', financialProfile.paymentType], ['Chave PIX', financialProfile.pixKey || '—'], ['Banco', financialProfile.bank || '—'],
                    ['Agência', financialProfile.agency || '—'], ['Conta', financialProfile.account || '—'], ['Situação na folha', financialProfile.status],
                  ].map(([label, value]) => <div key={label} className="min-w-0 border-b border-zinc-200 py-2"><dt className="mb-2 text-zinc-500">{label}</dt><dd className="break-words font-semibold text-zinc-800">{value}</dd></div>)}</dl> : <p className="py-4 text-sm text-zinc-600">{drivers.some((driver) => driver.id === editing.id) ? 'Este motorista ainda não tem cadastro financeiro na folha.' : 'Salve o motorista para vinculá-lo ao cadastro financeiro na folha.'}</p>}
                </fieldset>
                <p className="text-xs text-zinc-500">Salário, diária e dados de recebimento são alterados na Folha de pagamento.</p>
                <Link to="/payroll" target="_blank" rel="noopener noreferrer" className="w-fit border border-[#244761] bg-[#244761] px-3 py-2 text-xs text-white">Abrir folha de pagamento</Link>
              </>}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function DriverField({ label, children, required = false, className = '', error = '' }: { label: string; children: ReactElement<{ id?: string }>; required?: boolean; className?: string; error?: string }) {
  const id = useId()
  return <div className={`customer-editor-field ${className}`}><label htmlFor={id}>{label}{required && <span className="customer-required"> *</span>}</label>{cloneElement(children, { id })}{error && <p id="driver-cpf-error" role="alert" className="mt-1 text-xs text-red-700">{error}</p>}</div>
}
