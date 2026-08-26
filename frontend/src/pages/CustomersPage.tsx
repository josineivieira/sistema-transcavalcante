import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Pencil, Save, Search, Settings, Trash2, X } from 'lucide-react'
import { nextId, type Customer } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'
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
  const [editing, setEditing] = useState<Customer | null>(null)
  const [mainTab, setMainTab] = useState('GERAIS')
  const [subTab, setSubTab] = useState('ENDERECO')
  const [query, setQuery] = useState('')
  const [topSectionHeight, setTopSectionHeight] = useState(190)

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

  function updateEditing(field: keyof Customer, value: string) {
    if (!editing) return
    const next = { ...editing, [field]: value }
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
    const normalized = {
      ...editing,
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

  function startTopResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = topSectionHeight
    function resize(moveEvent: MouseEvent) {
      setTopSectionHeight(Math.min(230, Math.max(72, startHeight + moveEvent.clientY - startY)))
    }
    function stopResize() {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', resize)
    window.addEventListener('mouseup', stopResize)
  }

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
        <h2 className="text-lg font-normal text-red-600">Consulta clientes</h2>
        <button
          onClick={() => canEditPage ? setEditing(customerForEdit()) : denyNoPrivilege()}
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
              <tr key={customer.id} className="hover:bg-sky-50">
                <td className="border-b border-r border-zinc-200 px-2 py-2 font-medium">{customer.name}</td>
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
                  <button onClick={() => canEditPage ? setEditing(customerForEdit(customer)) : denyNoPrivilege()} className="border border-zinc-300 bg-white px-2 py-1" title="Editar">
                    <Pencil size={14} />
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-6">
          <div className="max-h-[calc(100vh-48px)] w-full max-w-7xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Cliente</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => saveCustomer(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
                <button onClick={() => saveCustomer(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => deleteCustomer(editing)} className="inline-flex items-center gap-1"><Trash2 size={15} /> EXCLUIR</button>
                <Settings size={16} />
                <button onClick={() => setEditing(null)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-92px)] overflow-y-auto p-2">
              <div className="grid items-start gap-x-12 overflow-hidden pb-1 md:grid-cols-2" style={{ height: topSectionHeight }}>
                <div className="grid content-start grid-cols-[140px_1fr] items-center gap-1 text-xs">
                  <label className="text-right">Mercado</label>
                  <input value={editing.market} onChange={(event) => updateEditing('market', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Tipo de participante</label>
                  <select value={editing.participantType} onChange={(event) => updateEditing('participantType', event.target.value)} className="h-7 border border-zinc-300 px-2">
                    <option>Fisica</option><option>Juridica</option><option>Exterior</option>
                  </select>
                  <label className="text-right text-red-600">Nome completo</label>
                  <input value={editing.name} onChange={(event) => updateEditing('name', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">E-mail principal</label>
                  <input value={editing.emailFiscal} onChange={(event) => updateEditing('emailFiscal', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                </div>
                <div className="grid content-start grid-cols-[140px_1fr] items-center gap-1 text-xs">
                  <label className="text-right">Categoria</label>
                  <input value={editing.category} onChange={(event) => updateEditing('category', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">CPF/CNPJ</label>
                  <input value={editing.document} onChange={(event) => updateEditing('document', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label />
                  <label className="inline-flex items-center gap-2"><input type="checkbox" /> Informar pesquisar por?</label>
                  <label className="text-right">Pesquisar por</label>
                  <input value={editing.name} readOnly className="h-7 border border-zinc-300 bg-zinc-200 px-2" />
                  <label className="text-right">Indicado por</label>
                  <input className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">Desativar?</label>
                  <input type="checkbox" checked={editing.status !== 'Ativo'} onChange={(event) => updateEditing('status', event.target.checked ? 'Inativo' : 'Ativo')} className="h-4 w-4" />
                  <label />
                  <div className="h-7 border border-zinc-400 bg-white px-2 leading-7 text-emerald-700">Registro ativo</div>
                </div>
              </div>

              <div onMouseDown={startTopResize} onDoubleClick={() => setTopSectionHeight(topSectionHeight > 90 ? 72 : 190)} className="relative my-1 h-3 cursor-row-resize border-t-4 border-zinc-400" title="Arraste para ajustar a area superior">
                <span className="absolute left-1/2 top-[-4px] h-2 w-12 -translate-x-1/2 border-x border-zinc-400 bg-zinc-100" />
              </div>

              <div className="flex border-b border-zinc-400 text-xs">
                {['GERAIS', 'FICHA CADASTRO', 'CONSELHO'].map((tab) => (
                  <button key={tab} onClick={() => setMainTab(tab)} className={`border border-b-0 px-3 py-1 ${mainTab === tab ? 'bg-zinc-300' : 'border-transparent bg-zinc-100'}`}>{tab}</button>
                ))}
              </div>

              {mainTab === 'GERAIS' && (
                <div className="grid items-start gap-x-12 border border-t-0 border-zinc-300 p-2 md:grid-cols-2">
                  <div className="grid content-start grid-cols-[140px_1fr_130px] items-center gap-1 text-xs">
                    <label className="text-right">Dt. nascimento</label>
                    <input type="date" value={editing.birthDate} onChange={(event) => updateEditing('birthDate', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <span />
                    <label className="text-right">Aniversario</label>
                    <input value={editing.anniversary} onChange={(event) => updateEditing('anniversary', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <span />
                    <label className="text-right">Sexo</label>
                    <select value={editing.gender} onChange={(event) => updateEditing('gender', event.target.value)} className="h-7 border border-zinc-300 px-2"><option>Selecione...</option><option>Masculino</option><option>Feminino</option></select>
                    <span />
                    <label className="text-right">RG</label>
                    <div className="grid grid-cols-[1fr_70px_60px] gap-1">
                      <input value={editing.rg} onChange={(event) => updateEditing('rg', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                      <input value={editing.rgIssuer} onChange={(event) => updateEditing('rgIssuer', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" placeholder="Orgao" />
                      <input value={editing.rgState} onChange={(event) => updateEditing('rgState', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    </div>
                    <span />
                    <label className="text-right">Observacao</label>
                    <textarea value={editing.notes} onChange={(event) => updateEditing('notes', event.target.value)} className="h-20 border border-zinc-300 px-2 py-1" />
                  </div>
                  <div className="grid content-start grid-cols-[140px_1fr] items-center gap-1 text-xs">
                    <label className="text-right">Nome reduzido</label>
                    <input value={editing.shortName || automaticShortName(editing.name)} onChange={(event) => updateEditing('shortName', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Sitio (site) sem http://</label>
                    <input value={editing.website} onChange={(event) => updateEditing('website', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Grupo economico</label>
                    <input value={editing.economicGroup} onChange={(event) => updateEditing('economicGroup', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Codigo agrupador</label>
                    <input value={editing.groupedCode} onChange={(event) => updateEditing('groupedCode', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Ocupacao</label>
                    <input value={editing.occupation} onChange={(event) => updateEditing('occupation', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Grau escolaridade</label>
                    <select value={editing.educationLevel} onChange={(event) => updateEditing('educationLevel', event.target.value)} className="h-7 border border-zinc-300 px-2"><option>Selecione...</option><option>Ensino medio</option><option>Superior</option></select>
                  </div>
                </div>
              )}

              {mainTab === 'FICHA CADASTRO' && (
                <div className="grid items-start gap-x-12 border border-t-0 border-zinc-300 p-2 md:grid-cols-2">
                  <div className="grid content-start grid-cols-[140px_1fr] items-center gap-1 text-xs">
                    <label className="text-right">Estado civil</label>
                    <select value={editing.civilStatus} onChange={(event) => updateEditing('civilStatus', event.target.value)} className="h-7 border border-zinc-300 px-2"><option>Selecione...</option><option>Solteiro</option><option>Casado</option></select>
                    <label className="text-right">Nome do conjuge</label>
                    <input value={editing.spouseName} onChange={(event) => updateEditing('spouseName', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Codigo/CNPJ</label>
                    <input value={editing.employerDocument} onChange={(event) => updateEditing('employerDocument', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Empregador</label>
                    <input value={editing.employer} onChange={(event) => updateEditing('employer', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Cargo</label>
                    <input value={editing.jobTitle} onChange={(event) => updateEditing('jobTitle', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Naturalidade</label>
                    <input value={editing.birthplace} onChange={(event) => updateEditing('birthplace', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Nacionalidade</label>
                    <input value={editing.nationality} onChange={(event) => updateEditing('nationality', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  </div>
                  <div className="grid content-start grid-cols-[140px_1fr] items-center gap-1 text-xs">
                    <label className="text-right">Nome da mae</label>
                    <input value={editing.motherName} onChange={(event) => updateEditing('motherName', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Nome do pai</label>
                    <input value={editing.fatherName} onChange={(event) => updateEditing('fatherName', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  </div>
                </div>
              )}

              {mainTab === 'CONSELHO' && <div className="border border-t-0 border-zinc-300 p-8 text-sm text-zinc-500">Dados de conselho quando aplicavel.</div>}

              <div className="mt-3 flex border-b border-zinc-400 text-xs">
                {['ENDERECO', 'COMUNICACOES (TELEFONES/EMAIL)', 'CONTATOS'].map((tab) => (
                  <button key={tab} onClick={() => setSubTab(tab)} className={`border border-b-0 px-3 py-1 ${subTab === tab ? 'bg-zinc-300' : 'border-transparent bg-zinc-100'}`}>{tab}</button>
                ))}
              </div>

              {subTab === 'ENDERECO' && (
                <div className="border border-t-0 border-zinc-300 p-2">
                  <div className="flex justify-between bg-zinc-300 px-2 py-1 text-xs"><span>Endereco</span><span>1 registro</span></div>
                  <table className="w-full text-xs"><tbody>
                    <tr className="bg-white">{['Logradouro', 'Numero', 'Complemento', 'Bairro', 'Cidade', 'Estado', 'Sg. pais', 'CEP', 'Inscricao estadual', 'Inscricao municipal'].map((h) => <td key={h} className="border border-zinc-200 px-2 py-1 text-zinc-600">{h}</td>)}</tr>
                    <tr>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.street} onChange={(e) => updateEditing('street', e.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.number} onChange={(e) => updateEditing('number', e.target.value)} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.complement} onChange={(e) => updateEditing('complement', e.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.district} onChange={(e) => updateEditing('district', e.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.city} onChange={(e) => updateEditing('city', e.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.state} onChange={(e) => updateEditing('state', e.target.value.toUpperCase())} className="w-full border-0 bg-transparent" maxLength={2} /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.country} onChange={(e) => updateEditing('country', e.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.zipCode} onChange={(e) => updateEditing('zipCode', e.target.value)} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.stateRegistration} onChange={(e) => updateEditing('stateRegistration', e.target.value)} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.municipalRegistration} onChange={(e) => updateEditing('municipalRegistration', e.target.value)} className="w-full border-0 bg-transparent" /></td>
                    </tr>
                  </tbody></table>
                </div>
              )}

              {subTab === 'COMUNICACOES (TELEFONES/EMAIL)' && (
                <div className="border border-t-0 border-zinc-300 p-2">
                  <div className="flex justify-between bg-zinc-300 px-2 py-1 text-xs"><span>Comunicacoes</span><span>1 registro</span></div>
                  <table className="w-full text-xs"><tbody>
                    <tr className="bg-white">{['Principal?', 'Tipo de comunicacao', 'DDD', 'Telefone', 'Ramal', 'Tem whats?', 'E-mail/Conta', 'Excluido?', 'Registrado por', 'Observacao'].map((h) => <td key={h} className="border border-zinc-200 px-2 py-1 text-zinc-600">{h}</td>)}</tr>
                    <tr>
                      <td className="border border-zinc-200 px-2 py-1">S</td>
                      <td className="border border-zinc-200 px-2 py-1">E-mail/Telefone</td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.phoneDdd} onChange={(e) => updateEditing('phoneDdd', e.target.value)} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.phone} onChange={(e) => updateEditing('phone', e.target.value)} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.phoneExtension} onChange={(e) => updateEditing('phoneExtension', e.target.value)} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.hasWhatsapp} onChange={(e) => updateEditing('hasWhatsapp', e.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1"><input value={editing.contactEmail} onChange={(e) => updateEditing('contactEmail', e.target.value)} className="w-full border-0 bg-transparent" /></td>
                      <td className="border border-zinc-200 px-2 py-1">N</td>
                      <td className="border border-zinc-200 px-2 py-1">Sistema</td>
                      <td className="border border-zinc-200 px-2 py-1" />
                    </tr>
                  </tbody></table>
                </div>
              )}

              {subTab === 'CONTATOS' && <div className="border border-t-0 border-zinc-300 p-8 text-sm text-zinc-500">Contatos adicionais do cliente.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
