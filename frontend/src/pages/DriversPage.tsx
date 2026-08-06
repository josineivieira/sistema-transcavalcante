import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Pencil, Save, Search, Settings, Trash2, X } from 'lucide-react'
import { useLocalData } from '../hooks/useLocalData'
import { nextId, type Driver } from '../services/localStore'
import { canEdit, denyNoPrivilege } from '../services/authSession'

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
  const { drivers, setDrivers } = useLocalData()
  const canEditPage = canEdit('drivers')
  const [editing, setEditing] = useState<Driver | null>(null)
  const [mainTab, setMainTab] = useState('GERAIS')
  const [subTab, setSubTab] = useState('ENDERECOS')
  const [query, setQuery] = useState('')
  const [topSectionHeight, setTopSectionHeight] = useState(190)

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

  function updateEditing(field: keyof Driver, value: string) {
    if (!editing) return
    const next = { ...editing, [field]: value }

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

    const normalized = {
      ...editing,
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

  function startTopResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = topSectionHeight

    function resize(moveEvent: MouseEvent) {
      const nextHeight = Math.min(230, Math.max(72, startHeight + moveEvent.clientY - startY))
      setTopSectionHeight(nextHeight)
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Condutores</h2>
          <p className="text-xs text-zinc-500">Cadastro de motoristas, ficha de pessoa, comunicacoes, CNH e dados operacionais.</p>
        </div>
        <button onClick={() => canEditPage ? setEditing(driverForEdit()) : denyNoPrivilege()} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
          Novo condutor
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 bg-zinc-50 px-4 py-2">
        <div className="text-xs text-zinc-600">{rows.length} de {drivers.length} registros</div>
        <label className="flex h-8 items-center border border-zinc-300 bg-white px-2 text-xs text-zinc-500">
          <Search size={15} className="mr-2" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-full w-64 border-0 p-0 outline-none" placeholder="Busca rapida" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1260px] text-xs">
          <thead className="bg-zinc-100">
            <tr>
              {['CNPJ/CPF/Codigo', 'Empresa ou Pessoa', 'Dt. vencimento GR', 'Tipo de p.', 'Comunicacao princ', 'Cidade', 'Estado', 'Dt. cadastro', 'Acoes'].map((heading) => (
                <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((driver) => (
              <tr key={driver.id} className="hover:bg-sky-50">
                <td className="border-b border-r border-zinc-200 px-2 py-2 font-medium">{driver.cpf}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.name}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{formatDate(driver.grExpiration || driver.cnhExpiration)}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.personType || 'Fisica'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.mainCommunication || driver.phone}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.city || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{driver.state || '-'}</td>
                <td className="border-b border-r border-zinc-200 px-2 py-2">{formatDate(driver.registrationDate)}</td>
                <td className="border-b border-zinc-200 px-2 py-1">
                  <button onClick={() => canEditPage ? setEditing(driverForEdit(driver)) : denyNoPrivilege()} className="border border-zinc-300 bg-white px-2 py-1" title="Editar">
                    <Pencil size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="border-b border-zinc-200 px-3 py-8 text-center text-sm text-zinc-500">
                  Nenhum condutor encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-6">
          <div className="max-h-[calc(100vh-48px)] w-full max-w-7xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Condutor</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => saveDriver(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
                <button onClick={() => saveDriver(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => deleteDriver(editing)} className="inline-flex items-center gap-1"><Trash2 size={15} /> EXCLUIR</button>
                <Settings size={16} />
                <button onClick={() => setEditing(null)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-92px)] overflow-y-auto p-2">
              <div
                className="grid items-start gap-x-12 gap-y-2 overflow-hidden pb-1 md:grid-cols-2"
                style={{ height: topSectionHeight }}
              >
                <div className="grid content-start grid-cols-[128px_1fr] items-center gap-1 text-xs">
                  <label className="text-right text-red-600">Tipo de pessoa</label>
                  <select value={editing.personType} onChange={(event) => updateEditing('personType', event.target.value)} className="h-7 border border-zinc-300 px-2">
                    <option>Fisica</option>
                    <option>Juridica</option>
                  </select>
                  <label className="text-right text-red-600">Nome completo</label>
                  <input value={editing.name} onChange={(event) => updateEditing('name', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">E-mail principal</label>
                  <input value={editing.email} onChange={(event) => updateEditing('email', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                </div>

                <div className="grid content-start grid-cols-[138px_1fr] items-center gap-1 text-xs">
                  <label className="text-right">Categoria</label>
                  <select value={editing.category} onChange={(event) => updateEditing('category', event.target.value)} className="h-7 border border-zinc-300 px-2">
                    <option>A</option><option>B</option><option>C</option><option>D</option><option>E</option>
                  </select>
                  <label className="text-right text-red-600">CPF</label>
                  <input value={editing.cpf} onChange={(event) => updateEditing('cpf', event.target.value)} className="h-7 border border-zinc-300 px-2" />
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

              <div
                onMouseDown={startTopResize}
                onDoubleClick={() => setTopSectionHeight(topSectionHeight > 90 ? 72 : 190)}
                className="relative my-1 h-3 cursor-row-resize border-t-4 border-zinc-400"
                title="Arraste para ajustar a area superior"
              >
                <span className="absolute left-1/2 top-[-4px] h-2 w-12 -translate-x-1/2 border-x border-zinc-400 bg-zinc-100" />
              </div>

              <div className="flex border-b border-zinc-400 text-xs">
                {['GERAIS', 'FICHA CADASTRO', 'CONSELHO'].map((tab) => (
                  <button key={tab} onClick={() => setMainTab(tab)} className={`border border-b-0 px-3 py-1 ${mainTab === tab ? 'bg-zinc-300' : 'border-transparent bg-zinc-100'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {mainTab === 'GERAIS' && (
                <div className="grid items-start gap-x-12 border border-t-0 border-zinc-300 p-2 md:grid-cols-2">
                  <div className="grid content-start grid-cols-[130px_1fr_130px] items-center gap-1 text-xs">
                    <label className="text-right">Dt. nascimento</label>
                    <input type="date" value={editing.birthDate} onChange={(event) => updateEditing('birthDate', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <input value={editing.birthDate ? 'idade calculada' : ''} readOnly className="h-7 border border-zinc-300 bg-zinc-200 px-2" />
                    <label className="text-right">Aniversario</label>
                    <input value={editing.anniversary} onChange={(event) => updateEditing('anniversary', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <span />
                    <label className="text-right">Sexo</label>
                    <select value={editing.gender} onChange={(event) => updateEditing('gender', event.target.value)} className="h-7 border border-zinc-300 px-2">
                      <option>Masculino</option><option>Feminino</option><option>Nao informado</option>
                    </select>
                    <span />
                    <label className="text-right">RG</label>
                    <div className="grid grid-cols-[1fr_70px_60px] gap-1">
                      <input value={editing.rg} onChange={(event) => updateEditing('rg', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                      <input value={editing.rgIssuer} onChange={(event) => updateEditing('rgIssuer', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" placeholder="SSP" />
                      <input value={editing.rgState} onChange={(event) => updateEditing('rgState', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" maxLength={2} />
                    </div>
                    <span />
                    <label className="text-right">Observacao</label>
                    <textarea value={editing.notes} onChange={(event) => updateEditing('notes', event.target.value)} className="h-20 border border-zinc-300 px-2 py-1" />
                  </div>

                  <div className="grid content-start grid-cols-[138px_1fr] items-center gap-1 text-xs">
                    <label className="text-right">Nome abreviado</label>
                    <input value={editing.nickname} onChange={(event) => updateEditing('nickname', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Sitio (site) sem http://</label>
                    <input value={editing.website} onChange={(event) => updateEditing('website', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Grupo economico</label>
                    <input value={editing.economicGroup} onChange={(event) => updateEditing('economicGroup', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Codigo agrupador</label>
                    <input value={editing.groupedCode} onChange={(event) => updateEditing('groupedCode', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">INSS</label>
                    <input value={editing.inss} onChange={(event) => updateEditing('inss', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Ocupacao</label>
                    <input value={editing.occupation} onChange={(event) => updateEditing('occupation', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Grau escolaridade</label>
                    <select value={editing.educationLevel} onChange={(event) => updateEditing('educationLevel', event.target.value)} className="h-7 border border-zinc-300 px-2">
                      <option>Selecione...</option><option>Ensino medio</option><option>Superior</option>
                    </select>
                  </div>
                </div>
              )}

              {mainTab === 'FICHA CADASTRO' && (
                <div className="grid items-start gap-x-12 border border-t-0 border-zinc-300 p-2 md:grid-cols-2">
                  <div className="grid content-start grid-cols-[130px_1fr] items-center gap-1 text-xs">
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
                  <div className="grid content-start grid-cols-[130px_1fr] items-center gap-1 text-xs">
                    <label className="text-right">Nome da mae</label>
                    <input value={editing.motherName} onChange={(event) => updateEditing('motherName', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                    <label className="text-right">Nome do pai</label>
                    <input value={editing.fatherName} onChange={(event) => updateEditing('fatherName', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  </div>
                </div>
              )}

              {mainTab === 'CONSELHO' && (
                <div className="border border-t-0 border-zinc-300 p-8 text-sm text-zinc-500">
                  Dados de conselho profissional quando aplicavel.
                </div>
              )}

              <p className="mt-3 text-xs">Atencao! Este campo acima e compartilhado com todas as relacoes da pessoa.</p>

              <div className="mt-3 flex border-b border-zinc-400 text-xs">
                {['ENDERECOS', 'COMUNICACOES (TELEFONES/EMAIL)', 'CONTATOS'].map((tab) => (
                  <button key={tab} onClick={() => setSubTab(tab)} className={`border border-b-0 px-3 py-1 ${subTab === tab ? 'bg-zinc-300' : 'border-transparent bg-zinc-100'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {subTab === 'ENDERECOS' && (
                <div className="border border-t-0 border-zinc-300 p-2">
                  <div className="flex justify-between bg-zinc-300 px-2 py-1 text-xs"><span>Enderecos</span><span>1 registro</span></div>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="bg-white">
                        {['Tipo endereco', 'Identificacao', 'Logradouro', 'Numero', 'Complemento', 'Referencia', 'Bairro', 'CEP', 'Cidade', 'Estado', 'Inscricao municipal'].map((heading) => (
                          <td key={heading} className="border border-zinc-200 px-2 py-1 text-zinc-600">{heading}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.addressType} onChange={(event) => updateEditing('addressType', event.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.addressIdentification} onChange={(event) => updateEditing('addressIdentification', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.street} onChange={(event) => updateEditing('street', event.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.number} onChange={(event) => updateEditing('number', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.complement} onChange={(event) => updateEditing('complement', event.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.reference} onChange={(event) => updateEditing('reference', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.district} onChange={(event) => updateEditing('district', event.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.zipCode} onChange={(event) => updateEditing('zipCode', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.city} onChange={(event) => updateEditing('city', event.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.state} onChange={(event) => updateEditing('state', event.target.value.toUpperCase())} className="w-full border-0 bg-transparent" maxLength={2} /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.municipalRegistration} onChange={(event) => updateEditing('municipalRegistration', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {subTab === 'COMUNICACOES (TELEFONES/EMAIL)' && (
                <div className="border border-t-0 border-zinc-300 p-2">
                  <div className="flex justify-between bg-zinc-300 px-2 py-1 text-xs"><span>Comunicacoes</span><span>1 registro</span></div>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="bg-white">
                        {['Principal?', 'Tipo de comunicacao', 'DDD', 'Telefone', 'Ramal', 'Tem whats?', 'E-mail/Conta', 'Excluido?', 'Registrado por', 'Observacao'].map((heading) => (
                          <td key={heading} className="border border-zinc-200 px-2 py-1 text-zinc-600">{heading}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-zinc-200 px-2 py-1">S</td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.communicationType} onChange={(event) => updateEditing('communicationType', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.phoneDdd} onChange={(event) => updateEditing('phoneDdd', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.phone} onChange={(event) => updateEditing('phone', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.phoneExtension} onChange={(event) => updateEditing('phoneExtension', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.hasWhatsapp} onChange={(event) => updateEditing('hasWhatsapp', event.target.value.toUpperCase())} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1"><input value={editing.contactEmail} onChange={(event) => updateEditing('contactEmail', event.target.value)} className="w-full border-0 bg-transparent" /></td>
                        <td className="border border-zinc-200 px-2 py-1">N</td>
                        <td className="border border-zinc-200 px-2 py-1">Sistema</td>
                        <td className="border border-zinc-200 px-2 py-1" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {subTab === 'CONTATOS' && (
                <div className="border border-t-0 border-zinc-300 p-8 text-sm text-zinc-500">
                  Contatos adicionais do condutor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
