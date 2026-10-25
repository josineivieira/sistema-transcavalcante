import { cloneElement, useId, useMemo, useRef, useState, type ReactElement } from 'react'
import { Download, Paperclip, Save, Search, Trash2, X } from 'lucide-react'
import { useLocalData } from '../hooks/useLocalData'
import { nextId, type Vehicle, type VehicleAttachment, type VehicleLicensing } from '../services/localStore'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { readVehiclePdf, type VehicleDocumentResult } from '../services/vehicleDocument'
import { LoadingRow } from '../components/LoadingState'

type VehicleType = 'Cavalo' | 'Carreta'

const vehicleCatalog = [
  { description: 'SEMI-REBOQUE', denatranType: 'SEMI-REBOQUE', vehicleType: 'Carreta' as const },
  { description: 'REBOQUE', denatranType: 'REBOQUE', vehicleType: 'Carreta' as const },
  { description: 'CAVALO MECANICO', denatranType: 'CAMINHAO TRATOR - TRACAO - NENHUMA', vehicleType: 'Cavalo' as const },
  { description: 'PORTA CONTEINER 40', denatranType: 'REBOQUE - CARGA - CONTEINER/C AB', vehicleType: 'Carreta' as const },
  { description: 'PORTA CONTEINER 20', denatranType: 'REBOQUE - CARGA - CONTEINER/C AB', vehicleType: 'Carreta' as const },
  { description: 'GRANELEIRA', denatranType: 'REBOQUE - CARGA - CARROC ABERTA', vehicleType: 'Carreta' as const },
  { description: 'GRANELEIRA 2', denatranType: 'SEMI-REBOQUE - CARGA - CARROC ABERTA', vehicleType: 'Carreta' as const },
  { description: 'CAMARA FRIA', denatranType: 'REBOQUE - CARGA - CARROC FECHADA', vehicleType: 'Carreta' as const },
]

const emptyVehicle: Vehicle = {
  id: '',
  vehicleType: 'Cavalo',
  fleetNumber: '',
  fleetRelation: 'TAC',
  fleetType: 'CAVALO MECANICO',
  denatranType: 'CAMINHAO TRATOR - TRACAO - NENHUMA',
  description: 'CAVALO MECANICO',
  tractorPlate: '',
  trailerPlate: '',
  type: 'CAVALO MECANICO',
  rntrc: '',
  owner: '',
  ownerDocument: '',
  carrier: 'Transcavalcante',
  capacity: '',
  brand: '',
  model: '',
  yearModel: '',
  manufactureYear: '',
  chassis: '',
  grExpiration: '',
  licensingExpiration: '',
  cityPlate: '',
  statePlate: '',
  color: '',
  axles: '',
  bodyType: '',
  renavam: '',
  tare: '',
  capacityM3: '',
  capacityKg: '',
  trackerUsed: false,
  trackerBrand: '',
  trackerProtocol: '',
  smFleet: '',
  driver: '',
  status: 'Ativo',
}

function plateOf(vehicle: Vehicle) {
  return vehicle.vehicleType === 'Cavalo' ? vehicle.tractorPlate : vehicle.trailerPlate
}

function formatDate(value?: string) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function openVehicle(type: VehicleType, vehicle?: Vehicle): Vehicle {
  if (vehicle) {
    return {
      ...emptyVehicle,
      ...vehicle,
      fleetType: vehicle.fleetType || vehicle.description || vehicle.type,
      description: vehicle.description || vehicle.fleetType || vehicle.type,
      denatranType: vehicle.denatranType || '',
    }
  }

  const catalog = vehicleCatalog.find((item) => item.description === (type === 'Cavalo' ? 'CAVALO MECANICO' : 'PORTA CONTEINER 40')) ?? vehicleCatalog[0]
  return {
    ...emptyVehicle,
    id: nextId(type === 'Cavalo' ? 'cav' : 'car'),
    vehicleType: type,
    fleetRelation: type === 'Cavalo' ? 'TAC' : 'Equiparado',
    fleetType: catalog.description,
    description: catalog.description,
    denatranType: catalog.denatranType,
    type: catalog.description,
  }
}

export function VehiclesPage() {
  const { vehicles, loading, setVehicles } = useLocalData()
  const canEditPage = canEdit('vehicles')
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [modalTab, setModalTab] = useState('GERAL')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [pendingImport, setPendingImport] = useState<{ result: VehicleDocumentResult; attachment: VehicleAttachment } | null>(null)
  const importRequest = useRef(0)

  function editVehicle(vehicle?: Vehicle) {
    importRequest.current++
    setModalTab('GERAL'); setMessage(''); setImportOpen(false); setPendingImport(null)
    setEditing(openVehicle(vehicle?.vehicleType || 'Cavalo', vehicle))
  }

  function closeImport() {
    importRequest.current++; setImportOpen(false); setImporting(false); setPendingImport(null); setImportError('')
  }

  async function attachDocument(file?: File) {
    if (!file || !editing || !canEditPage) return
    const request = ++importRequest.current
    setImporting(true); setImportError(''); setPendingImport(null)
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('O PDF deve ter no máximo 5 MB.')
      const buffer = await file.arrayBuffer()
      if (new TextDecoder().decode(buffer.slice(0, 5)) !== '%PDF-') throw new Error('Selecione um arquivo PDF válido.')
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), (byte) => byte.toString(16).padStart(2, '0')).join('')
      if (editing.attachments?.some((item) => item.hash === hash)) throw new Error('Este PDF já está anexado ao veículo.')
      if ((editing.attachments || []).reduce((sum, item) => sum + item.size, 0) + file.size > 10 * 1024 * 1024) throw new Error('Os anexos deste veículo podem ocupar até 10 MB no total.')
      const result = await readVehiclePdf(file)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.')); reader.readAsDataURL(file)
      })
      if (request !== importRequest.current) return
      setPendingImport({ result, attachment: { id: nextId('vdoc'), name: file.name, size: file.size, kind: result.recognized ? 'CRLV' : 'Outro', uploadedAt: new Date().toISOString(), dataUrl, hash } })
    } catch (error) {
      if (request === importRequest.current) setImportError(error instanceof Error && !/Invalid PDF|password|worker|fetch/i.test(error.message) ? error.message : 'Não foi possível ler este PDF. Confira se ele está protegido por senha ou danificado.')
    } finally { if (request === importRequest.current) setImporting(false) }
  }

  function applyDocument() {
    if (!pendingImport || !editing || !canEditPage) return
    const { result, attachment } = pendingImport
    const patch = { ...result.fields }
    if (!patch.vehicleType && patch.tractorPlate && editing.vehicleType === 'Carreta') { patch.trailerPlate = patch.tractorPlate; delete patch.tractorPlate }
    const records = [...(editing.licensingRecords || [])]
    if (patch.licensingYear) {
      const index = records.findIndex((item) => item.year === patch.licensingYear)
      const record: VehicleLicensing = { id: nextId('lic'), year: patch.licensingYear, issueDate: patch.crlvIssueDate || '', dueDate: '', paidDate: '', amount: '', status: 'Documento recebido', ...(index >= 0 ? records[index] : {}), attachmentId: attachment.id }
      if (patch.crlvIssueDate) record.issueDate = patch.crlvIssueDate
      if (index >= 0) records[index] = record; else records.push(record)
    }
    setEditing({ ...editing, ...patch, attachments: [...(editing.attachments || []), attachment], licensingRecords: records })
    closeImport(); setModalTab('DOCUMENTOS'); setMessage('Documento anexado ao cadastro. Confira os dados e clique em Salvar para gravar.')
  }

  function changeLicensing(id: string, patch: Partial<VehicleLicensing>) {
    setEditing((current) => current ? { ...current, licensingRecords: (current.licensingRecords || []).map((item) => item.id === id ? { ...item, ...patch } : item) } : current)
  }

  async function downloadDocument(attachment: VehicleAttachment) {
    const blob = await (await fetch(attachment.dataUrl)).blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = attachment.name; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function removeDocument(id: string) {
    if (!canEditPage || saving) return
    setEditing((current) => current ? { ...current, attachments: (current.attachments || []).filter((item) => item.id !== id), licensingRecords: (current.licensingRecords || []).map((item) => item.attachmentId === id ? { ...item, attachmentId: undefined } : item) } : current)
  }

  const rows = useMemo(() => {
    return vehicles
      .filter((vehicle) => {
        const text = [
          vehicle.fleetNumber,
          vehicle.fleetType,
          vehicle.description,
          plateOf(vehicle),
          vehicle.owner,
          vehicle.ownerDocument,
          vehicle.brand,
          vehicle.model,
          vehicle.chassis,
        ].join(' ').toLowerCase()
        return text.includes(query.toLowerCase())
      })
  }, [query, vehicles])

  function updateEditing(field: keyof Vehicle, value: string | boolean) {
    if (!editing) return
    const next = { ...editing, [field]: value }

    if (field === 'description') {
      const catalog = vehicleCatalog.find((item) => item.description === value)
      if (catalog) {
        next.vehicleType = catalog.vehicleType
        next.fleetType = catalog.description
        next.type = catalog.description
        next.denatranType = catalog.denatranType
      }
    }

    setEditing(next)
  }

  async function saveVehicle(closeAfterSave = true) {
    if (saving) return
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    const plate = plateOf(editing).replace(/[^A-Z0-9]/gi, '').toUpperCase()
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(plate)) {
      setMessage('Informe uma placa válida, no padrão ABC1234 ou ABC1D23.')
      return
    }

    if (vehicles.some((vehicle) => vehicle.id !== editing.id && plateOf(vehicle).replace(/[^A-Z0-9]/gi, '').toUpperCase() === plate)) { setMessage('Esta placa já está cadastrada na frota.'); return }
    if ((editing.licensingRecords || []).some((item) => !/^20\d{2}$/.test(item.year))) { setMessage('Informe o exercício com quatro dígitos em todos os licenciamentos.'); setModalTab('LICENCIAMENTOS'); return }
    const licenseYears = (editing.licensingRecords || []).map((item) => item.year)
    if (new Set(licenseYears).size !== licenseYears.length) { setMessage('Existe mais de um licenciamento para o mesmo exercício. Confira os registros.'); setModalTab('LICENCIAMENTOS'); return }
    if (editing.insuranceStart && editing.insuranceEnd && editing.insuranceEnd < editing.insuranceStart) { setMessage('O fim da vigência do seguro deve ser igual ou posterior ao início.'); setModalTab('SEGURO'); return }
    if (['purchaseValue', 'insuranceValue', 'capacityKg', 'tare', 'axles'].some((key) => Number(editing[key as keyof Vehicle]) < 0) || editing.licensingRecords?.some((item) => Number(item.amount) < 0)) { setMessage('Valores, capacidades e quantidade de eixos não podem ser negativos.'); return }
    const latest = [...(editing.licensingRecords || [])].sort((a, b) => b.year.localeCompare(a.year))[0]
    const normalized = {
      ...editing,
      tractorPlate: editing.vehicleType === 'Cavalo' ? plate.toUpperCase() : '',
      trailerPlate: editing.vehicleType === 'Carreta' ? plate.toUpperCase() : '',
      type: editing.fleetType || editing.description || editing.type,
      capacity: editing.capacityKg || editing.capacity,
      licensingExpiration: latest ? latest.dueDate : editing.licensingExpiration,
      status: editing.status || 'Ativo',
    }

    const exists = vehicles.some((vehicle) => vehicle.id === normalized.id)
    setSaving(true); setMessage('')
    try {
      await setVehicles(exists ? vehicles.map((vehicle) => vehicle.id === normalized.id ? normalized : vehicle) : [...vehicles, normalized])
      if (closeAfterSave) setEditing(null); else { setEditing(normalized); setMessage('Veículo salvo.') }
    } catch { setMessage('Não foi possível salvar o veículo e seus anexos. Tente novamente.') }
    finally { setSaving(false) }
  }

  async function deleteVehicle(vehicle: Vehicle) {
    if (saving) return
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (window.confirm(`Excluir veiculo ${plateOf(vehicle)}?`)) {
      setSaving(true)
      try { await setVehicles(vehicles.filter((item) => item.id !== vehicle.id)); setEditing(null) }
      catch { setMessage('Não foi possível excluir o veículo. Tente novamente.') }
      finally { setSaving(false) }
    }
  }

  function field(label: string, key: keyof Vehicle, options: { type?: string; wide?: boolean; maxLength?: number } = {}) {
    if (!editing) return null
    return <VehicleField label={label} className={options.wide ? 'customer-editor-wide' : ''}><input type={options.type || 'text'} maxLength={options.maxLength} value={String(editing[key] ?? '')} onChange={(event) => updateEditing(key, event.target.value)} /></VehicleField>
  }

  return (
    <div className="space-y-3">
      <div className="border border-zinc-300 bg-white">
        <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
          <h2 className="text-lg font-normal text-red-600">Consulta frota de veiculos</h2>
          <button
            onClick={() => canEditPage ? editVehicle() : denyNoPrivilege()}
            className="grid h-7 w-7 place-items-center bg-black text-lg font-bold text-white"
            title="Novo veiculo"
          >
            +
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 bg-zinc-50 px-4 py-2">
          <div className="text-xs text-zinc-600">
            {loading ? 'Carregando...' : `${rows.length} veiculo${rows.length === 1 ? '' : 's'} listado${rows.length === 1 ? '' : 's'}`}
          </div>
          <label className="flex h-8 items-center border border-zinc-300 bg-white px-2 text-xs text-zinc-500">
            <Search size={15} className="mr-2" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-full w-64 border-0 p-0 outline-none" placeholder="Buscar na frota" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-xs">
            <thead className="bg-zinc-100">
              <tr>
                {['Numero', 'Tipo de frota', 'Descricao', 'Dt. vencimento GR', 'Placa', 'Proprietario', 'CNPJ/CPF propriet.', 'Marca', 'Modelo', 'Ano/Modelo', 'Chassi'].map((heading) => (
                  <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && rows.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  onDoubleClick={() => canEditPage ? editVehicle(vehicle) : denyNoPrivilege()}
                  className="cursor-default hover:bg-sky-100"
                >
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{vehicle.fleetNumber || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{vehicle.fleetRelation || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 font-medium">{vehicle.description || vehicle.fleetType || vehicle.type}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{formatDate(vehicle.grExpiration)}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 font-semibold">{plateOf(vehicle)}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{vehicle.owner || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{vehicle.ownerDocument || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{vehicle.brand || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{vehicle.model || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{vehicle.yearModel || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{vehicle.chassis || '-'}</td>
                </tr>
              ))}
              {loading && <LoadingRow colSpan={11} label="Carregando veiculos..." />}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="border-b border-zinc-200 px-3 py-8 text-center text-sm text-zinc-500">
                    Nenhum veiculo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="customer-editor-overlay">
          <section className="customer-editor vehicle-editor" role="dialog" aria-modal="true" aria-labelledby="vehicle-title" aria-busy={saving}>
            <header className="customer-editor-header">
              <h3 id="vehicle-title">{vehicles.some((vehicle) => vehicle.id === editing.id) ? 'Editar veículo' : 'Novo veículo'}</h3>
              <div className="customer-editor-actions">
                <button onClick={() => { setImportError(''); setPendingImport(null); setImportOpen(true) }} disabled={saving || !canEditPage}><Paperclip size={15} /> Anexar</button>
                <button onClick={() => saveVehicle(false)} disabled={saving || !canEditPage}><Save size={15} /> {saving ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => saveVehicle(true)} disabled={saving || !canEditPage}><Save size={15} /> Salvar e sair</button>
                {vehicles.some((vehicle) => vehicle.id === editing.id) && <button onClick={() => deleteVehicle(editing)} disabled={saving || !canEditPage}><Trash2 size={15} /> Excluir</button>}
                <button onClick={() => { importRequest.current++; setEditing(null) }} disabled={saving} aria-label="Fechar cadastro de veículo"><X size={18} /></button>
              </div>
            </header>
            <div className="vehicle-identity">
              <div className="customer-editor-grid">
                {field('Código da frota', 'fleetNumber')}
                <VehicleField label="Placa" required><input value={plateOf(editing)} maxLength={8} onChange={(event) => updateEditing(editing.vehicleType === 'Cavalo' ? 'tractorPlate' : 'trailerPlate', event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} /></VehicleField>
                <VehicleField label="Situação"><select value={editing.status} onChange={(event) => updateEditing('status', event.target.value)}><option>Ativo</option><option>Inativo</option></select></VehicleField>
                <VehicleField label="Tipo de frota" className="customer-editor-wide"><select value={editing.description} onChange={(event) => updateEditing('description', event.target.value)}>{!vehicleCatalog.some((item) => item.description === editing.description) && <option>{editing.description}</option>}{vehicleCatalog.map((item) => <option key={item.description}>{item.description}</option>)}</select></VehicleField>
                <VehicleField label="Relação com a frota"><select value={editing.fleetRelation} onChange={(event) => updateEditing('fleetRelation', event.target.value)}>{['Equiparado', 'TAC', 'ETC', 'Proprio'].map((item) => <option key={item}>{item}</option>)}</select></VehicleField>
              </div>
            </div>
            <div className="flex flex-wrap border-b border-zinc-300 bg-white px-4 text-xs" role="tablist" aria-label="Controle do veículo">
              {['GERAL', 'DOCUMENTOS', 'SEGURO', 'COMPRA', 'OBSERVAÇÃO', 'LICENCIAMENTOS'].map((tab) => <button key={tab} id={`vehicle-tab-${encodeURIComponent(tab)}`} role="tab" aria-selected={modalTab === tab} aria-controls="vehicle-tab-content" onClick={() => setModalTab(tab)} className={`border-b-2 px-3 py-3 ${modalTab === tab ? 'border-[#244761] font-semibold text-[#244761]' : 'border-transparent text-zinc-500 hover:bg-zinc-50'}`}>{tab}</button>)}
            </div>
            {message && <p role="status" className="border-b border-zinc-200 bg-amber-50 px-5 py-3 text-xs text-zinc-800">{message}</p>}
            <div className="customer-editor-body" role="tabpanel" id="vehicle-tab-content" aria-labelledby={`vehicle-tab-${encodeURIComponent(modalTab)}`}>
              {modalTab === 'GERAL' && <>
                <fieldset><legend>Características</legend><div className="customer-editor-grid">
                  {field('Marca', 'brand')}{field('Modelo / versão', 'model', { wide: true })}
                  {field('Ano de fabricação', 'manufactureYear', { maxLength: 4 })}{field('Ano do modelo', 'yearModel', { maxLength: 4 })}{field('Combustível', 'fuel')}
                  {field('Cor', 'color')}{field('Quantidade de eixos', 'axles', { type: 'number' })}{field('Carroceria', 'bodyType')}
                  {field('Tara (kg)', 'tare', { type: 'number' })}{field('Capacidade útil (kg)', 'capacityKg', { type: 'number' })}{field('Capacidade (m³)', 'capacityM3', { type: 'number' })}
                  {field('Capacidade informada no CRLV', 'crlvCapacity')}{field('Peso bruto total (CRLV)', 'grossWeight')}{field('CMT (CRLV)', 'cmt')}
                </div></fieldset>
                <fieldset><legend>Proprietário e operação</legend><div className="customer-editor-grid">
                  {field('Proprietário', 'owner', { wide: true })}{field('CPF/CNPJ do proprietário', 'ownerDocument', { maxLength: 18 })}
                  {field('Cidade de emplacamento', 'cityPlate', { wide: true })}{field('UF de emplacamento', 'statePlate', { maxLength: 2 })}
                  {field('Transportadora', 'carrier')}{field('Motorista habitual', 'driver', { wide: true })}
                </div></fieldset>
                <fieldset><legend>Rastreamento e gerenciamento de risco</legend><div className="customer-editor-grid">
                  <VehicleField label="Utiliza rastreador"><select value={editing.trackerUsed ? 'S' : 'N'} onChange={(event) => updateEditing('trackerUsed', event.target.value === 'S')}><option value="N">Não</option><option value="S">Sim</option></select></VehicleField>
                  {field('Marca do rastreador', 'trackerBrand')}{field('Protocolo', 'trackerProtocol')}
                  {field('Identificação na gerenciadora', 'smFleet')}{field('Validade do gerenciamento de risco', 'grExpiration', { type: 'date' })}
                </div></fieldset>
              </>}

              {modalTab === 'DOCUMENTOS' && <>
                <fieldset><legend>Identificação documental</legend><div className="customer-editor-grid">
                  {field('Renavam', 'renavam', { maxLength: 11 })}{field('Chassi', 'chassis', { maxLength: 17 })}{field('RNTRC', 'rntrc')}
                  {field('Número do CRV', 'crvNumber')}{field('Número do motor', 'engineNumber')}{field('Espécie / tipo (CRLV)', 'denatranType')}
                  {field('Exercício do CRLV', 'licensingYear', { maxLength: 4 })}{field('Data do CRLV', 'crlvIssueDate', { type: 'date' })}
                </div></fieldset>
                <fieldset><legend>Arquivos anexados</legend>
                  <p className="mb-3 text-xs text-zinc-500">Use Anexar para ler um CRLV ou guardar outro documento em PDF. Limite de 5 MB por arquivo.</p>
                  <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-xs"><thead className="bg-zinc-100"><tr>{['Arquivo', 'Tipo', 'Incluído em', 'Ações'].map((label) => <th key={label} className="border-b px-3 py-2 text-left">{label}</th>)}</tr></thead><tbody>
                    {(editing.attachments || []).map((attachment) => <tr key={attachment.id} className="border-b border-zinc-200">
                      <td className="max-w-[260px] break-words px-3 py-3">{attachment.name}<span className="block text-zinc-500">{Math.ceil(attachment.size / 1024)} KB</span></td>
                      <td className="px-3 py-3"><select aria-label={`Tipo do documento ${attachment.name}`} value={attachment.kind} onChange={(event) => setEditing({ ...editing, attachments: (editing.attachments || []).map((item) => item.id === attachment.id ? { ...item, kind: event.target.value } : item) })} className="border border-zinc-300 bg-white p-1">{['CRLV', 'Seguro', 'Compra', 'Outro'].map((kind) => <option key={kind}>{kind}</option>)}</select></td>
                      <td className="px-3 py-3">{new Date(attachment.uploadedAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-3"><div className="flex gap-3"><button onClick={() => void downloadDocument(attachment)} title={`Baixar ${attachment.name}`}><Download size={16} /></button><button onClick={() => removeDocument(attachment.id)} disabled={saving} title={`Remover ${attachment.name}`}><Trash2 size={16} /></button></div></td>
                    </tr>)}
                    {!editing.attachments?.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-zinc-500">Nenhum documento anexado.</td></tr>}
                  </tbody></table></div>
                </fieldset>
              </>}

              {modalTab === 'SEGURO' && <fieldset><legend>Seguro do veículo</legend><div className="customer-editor-grid">
                {field('Seguradora', 'insurer', { wide: true })}{field('Apólice', 'insurancePolicy')}
                {field('Início da vigência', 'insuranceStart', { type: 'date' })}{field('Fim da vigência', 'insuranceEnd', { type: 'date' })}{field('Valor segurado (R$)', 'insuranceValue', { type: 'number' })}
                {field('Contato da seguradora / corretora', 'insuranceContact', { wide: true })}
              </div><p className="mt-4 text-xs text-zinc-500">A apólice em PDF pode ser guardada na aba Documentos.</p></fieldset>}

              {modalTab === 'COMPRA' && <fieldset><legend>Aquisição do veículo</legend><div className="customer-editor-grid">
                {field('Data da compra', 'purchaseDate', { type: 'date' })}{field('Valor da compra (R$)', 'purchaseValue', { type: 'number' })}{field('Nota fiscal / contrato', 'purchaseInvoice')}
                {field('Vendedor', 'seller', { wide: true })}{field('CPF/CNPJ do vendedor', 'sellerDocument', { maxLength: 18 })}
                {field('Forma / condição de pagamento', 'purchasePayment', { wide: true })}
              </div></fieldset>}

              {modalTab === 'OBSERVAÇÃO' && <VehicleField label="Observações do veículo"><textarea rows={8} value={editing.notes || ''} onChange={(event) => updateEditing('notes', event.target.value)} /></VehicleField>}

              {modalTab === 'LICENCIAMENTOS' && <>
                <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-[#244761]">Controle por exercício</h4><button disabled={saving} onClick={() => setEditing({ ...editing, licensingRecords: [...(editing.licensingRecords || []), { id: nextId('lic'), year: String(new Date().getFullYear()), issueDate: '', dueDate: '', paidDate: '', amount: '', status: 'Pendente' }] })} className="border border-zinc-300 bg-white px-3 py-2 text-xs">Adicionar exercício</button></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-xs"><thead className="bg-zinc-100"><tr>{['Exercício', 'Data do CRLV', 'Vencimento', 'Pagamento', 'Valor (R$)', 'Situação', 'Documento', ''].map((label, index) => <th key={index} className="border-b px-2 py-2 text-left">{label}</th>)}</tr></thead><tbody>
                  {(editing.licensingRecords || []).map((record) => <tr key={record.id} className="border-b border-zinc-200">
                    {(['year', 'issueDate', 'dueDate', 'paidDate', 'amount'] as const).map((key) => <td key={key} className="px-1 py-2"><input aria-label={`${licensingLabels[key]} ${record.id}`} type={key.includes('Date') ? 'date' : key === 'amount' ? 'number' : 'text'} maxLength={key === 'year' ? 4 : undefined} value={record[key]} onChange={(event) => changeLicensing(record.id, { [key]: event.target.value })} className="h-8 w-full min-w-[70px] border border-zinc-300 px-1" /></td>)}
                    <td className="px-1 py-2"><select aria-label={`Situação ${record.id}`} value={record.status} onChange={(event) => changeLicensing(record.id, { status: event.target.value })} className="h-8 border border-zinc-300 bg-white">{['Pendente', 'Pago', 'Documento recebido'].map((value) => <option key={value}>{value}</option>)}</select></td>
                    <td className="px-2 py-2">{record.attachmentId && editing.attachments?.some((item) => item.id === record.attachmentId) ? <button onClick={() => { const file = editing.attachments?.find((item) => item.id === record.attachmentId); if (file) void downloadDocument(file) }} className="text-[#244761] underline">Baixar CRLV</button> : '—'}</td>
                    <td className="px-2 py-2"><button aria-label={`Remover exercício ${record.year}`} onClick={() => setEditing({ ...editing, licensingRecords: (editing.licensingRecords || []).filter((item) => item.id !== record.id) })}><Trash2 size={15} /></button></td>
                  </tr>)}
                  {!editing.licensingRecords?.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-zinc-500">Nenhum exercício registrado. Anexe o CRLV ou adicione um exercício.</td></tr>}
                </tbody></table></div>
                {!editing.licensingRecords?.length && field('Vencimento geral do licenciamento', 'licensingExpiration', { type: 'date' })}
                <p className="text-xs text-zinc-500">O exercício do CRLV não informa, sozinho, o prazo de vencimento. Preencha a data conforme o documento ou calendário aplicável.</p>
              </>}
            </div>
          </section>
        </div>
      )}

      {editing && importOpen && <div className="customer-editor-overlay" style={{ zIndex: 80 }}>
        <section role="dialog" aria-modal="true" aria-labelledby="vehicle-import-title" className="customer-editor" style={{ width: 700 }}>
          <header className="customer-editor-header"><h3 id="vehicle-import-title">Anexar documento do veículo</h3><button onClick={closeImport} aria-label="Fechar importação"><X size={18} /></button></header>
          <div className="customer-editor-body">
            <label className="text-xs text-zinc-700">Selecione o CRLV em PDF para preencher o cadastro, ou outro PDF para arquivar.<input type="file" accept="application/pdf,.pdf" aria-label="Selecionar documento PDF" disabled={importing} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void attachDocument(file) }} className="mt-3 block w-full border border-zinc-300 bg-white p-3" /></label>
            {importing && <p role="status" className="text-sm">Lendo documento...</p>}
            {importError && <p role="alert" className="text-sm text-red-700">{importError}</p>}
            {pendingImport && <>
              <div className="text-xs"><strong>{pendingImport.attachment.name}</strong><span className="ml-2 text-zinc-500">{Math.ceil(pendingImport.attachment.size / 1024)} KB</span></div>
              {!!Object.keys(pendingImport.result.fields).length && <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-zinc-100"><tr><th className="px-3 py-2 text-left">Campo</th><th className="px-3 py-2 text-left">Lido no documento</th></tr></thead><tbody>{Object.entries(pendingImport.result.fields).filter(([key, value]) => importLabels[key] && value !== '').map(([key, value]) => <tr key={key} className="border-b border-zinc-200"><td className="px-3 py-2 text-zinc-500">{importLabels[key]}</td><td className="px-3 py-2">{String(value)}</td></tr>)}</tbody></table></div>}
              {plateOf(editing) && (pendingImport.result.fields.tractorPlate || pendingImport.result.fields.trailerPlate) && plateOf(editing).replace(/[^A-Z0-9]/gi, '') !== (pendingImport.result.fields.tractorPlate || pendingImport.result.fields.trailerPlate) && <p className="text-xs text-amber-800">A placa do documento é diferente da placa do cadastro. Confira antes de aplicar.</p>}
              {pendingImport.result.warnings.map((warning) => <p key={warning} className="text-xs leading-5 text-zinc-600">{warning}</p>)}
              <p className="text-xs text-zinc-500">Somente os dados encontrados serão preenchidos. O arquivo será gravado ao salvar o veículo.</p>
            </>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-zinc-300 p-3 text-xs"><button onClick={closeImport} className="border border-zinc-300 px-3 py-2">Cancelar</button><button onClick={applyDocument} disabled={!pendingImport || importing} className="border border-[#244761] bg-[#244761] px-3 py-2 text-white">{pendingImport?.result.recognized ? 'Preencher e anexar' : 'Anexar arquivo'}</button></footer>
        </section>
      </div>}
    </div>
  )
}

const licensingLabels = { year: 'Exercício', issueDate: 'Data do CRLV', dueDate: 'Vencimento', paidDate: 'Pagamento', amount: 'Valor' }
const importLabels: Record<string, string> = {
  tractorPlate: 'Placa', trailerPlate: 'Placa', description: 'Tipo de frota', brand: 'Marca', model: 'Modelo', renavam: 'Renavam', chassis: 'Chassi',
  manufactureYear: 'Ano de fabricação', yearModel: 'Ano do modelo', owner: 'Proprietário', ownerDocument: 'CPF/CNPJ', color: 'Cor', fuel: 'Combustível',
  axles: 'Eixos', bodyType: 'Carroceria', denatranType: 'Espécie / tipo', crvNumber: 'Número do CRV', engineNumber: 'Motor', crlvCapacity: 'Capacidade (CRLV)',
  grossWeight: 'Peso bruto total (CRLV)', cmt: 'CMT', licensingYear: 'Exercício', cityPlate: 'Cidade', statePlate: 'UF', crlvIssueDate: 'Data do CRLV',
}

function VehicleField({ label, children, required = false, className = '' }: { label: string; children: ReactElement<{ id?: string }>; required?: boolean; className?: string }) {
  const id = useId()
  return <div className={`customer-editor-field ${className}`}><label htmlFor={id}>{label}{required && <span className="customer-required"> *</span>}</label>{cloneElement(children, { id })}</div>
}
