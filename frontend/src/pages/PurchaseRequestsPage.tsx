import { useMemo, useState } from 'react'
import { Check, CreditCard, Save, Search, Settings, Trash2, X } from 'lucide-react'
import { LoadingRow } from '../components/LoadingState'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege, getAuthUser } from '../services/authSession'
import { formatMoney, nextId, type PurchaseRequest } from '../services/localStore'

const emptyRequest: PurchaseRequest = {
  id: '',
  number: '',
  requestDate: '',
  dueDate: '',
  type: 'Compra',
  category: 'Operacional',
  description: '',
  requester: '',
  supplierDocument: '',
  supplier: '',
  freightProcess: '',
  vehiclePlate: '',
  driver: '',
  costCenter: 'Operacao',
  paymentMethod: 'A definir',
  expectedValue: 0,
  approvedValue: 0,
  paidValue: 0,
  status: 'Aberta',
  notes: '',
}

function inputClass(disabled = false) {
  return `h-7 w-full min-w-0 border border-zinc-300 px-2 text-xs outline-none ${disabled ? 'bg-zinc-200 text-zinc-500' : 'bg-white focus:border-zinc-500'}`
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[135px_minmax(0,1fr)] items-center gap-1 text-xs">
      <span className="text-right text-zinc-900">{label}</span>
      {children}
    </label>
  )
}

function parseMoney(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function PurchaseRequestsPage() {
  const { purchaseRequests, freights, vehicles, drivers, loading, setPurchaseRequests } = useLocalData()
  const canEditPage = canEdit('purchaseRequests')
  const authUser = getAuthUser()
  const [editing, setEditing] = useState<PurchaseRequest | null>(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ status: '', type: '', dateStart: '', dateEnd: '' })
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => {
    const term = query.toLowerCase()
    return purchaseRequests.filter((request) => {
      const text = [
        request.number,
        request.type,
        request.category,
        request.description,
        request.supplier,
        request.freightProcess,
        request.vehiclePlate,
        request.driver,
        request.status,
      ].join(' ').toLowerCase()

      return text.includes(term)
        && (!filters.status || request.status === filters.status)
        && (!filters.type || request.type === filters.type)
        && (!filters.dateStart || request.requestDate >= filters.dateStart)
        && (!filters.dateEnd || request.requestDate <= filters.dateEnd)
    })
  }, [filters, purchaseRequests, query])

  const totals = useMemo(() => {
    return rows.reduce((acc, request) => {
      acc.expected += request.expectedValue
      acc.approved += request.approvedValue
      acc.paid += request.paidValue
      if (!['Paga', 'Cancelada'].includes(request.status)) acc.open += request.approvedValue || request.expectedValue
      return acc
    }, { expected: 0, approved: 0, paid: 0, open: 0 })
  }, [rows])

  function nextRequestNumber() {
    const maxNumber = purchaseRequests.reduce((max, request) => {
      const match = request.number.match(/^REQ-(\d+)$/i)
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    return `REQ-${String(maxNumber + 1).padStart(6, '0')}`
  }

  function openNew() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditing({
      ...emptyRequest,
      id: nextId('req'),
      number: nextRequestNumber(),
      requestDate: today(),
      requester: authUser?.name || '',
    })
  }

  function openEdit(request: PurchaseRequest) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditing({ ...emptyRequest, ...request })
  }

  function updateEditing(field: keyof PurchaseRequest, value: string | number) {
    if (!editing) return
    const next = { ...editing, [field]: value }
    if (field === 'expectedValue') {
      next.approvedValue = next.approvedValue || Number(value)
    }
    setEditing(next)
  }

  function save(closeAfterSave = true) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    if (!editing.description || !editing.type || !editing.category || !editing.expectedValue) {
      setNotice({ title: 'Requisicao incompleta', message: 'Preencha tipo, categoria, descricao e valor antes de salvar.' })
      return
    }

    setSaving(true)
    const normalized = {
      ...editing,
      description: editing.description.toUpperCase(),
      supplier: editing.supplier.toUpperCase(),
      category: editing.category,
      approvedValue: editing.approvedValue || editing.expectedValue,
    }
    const exists = purchaseRequests.some((request) => request.id === normalized.id)
    setPurchaseRequests(exists ? purchaseRequests.map((request) => request.id === normalized.id ? normalized : request) : [normalized, ...purchaseRequests])
    window.setTimeout(() => {
      setSaving(false)
      if (closeAfterSave) setEditing(null)
    }, 250)
  }

  function changeStatus(status: string) {
    if (!editing) return
    if (status === 'Aprovada' && !editing.approvedValue) {
      setEditing({ ...editing, status, approvedValue: editing.expectedValue })
      return
    }
    if (status === 'Paga') {
      setEditing({ ...editing, status, paidValue: editing.paidValue || editing.approvedValue || editing.expectedValue })
      return
    }
    setEditing({ ...editing, status })
  }

  function removeEditing() {
    if (!editing) return
    setPurchaseRequests(purchaseRequests.filter((request) => request.id !== editing.id))
    setEditing(null)
  }

  function clearFilters() {
    setFilters({ status: '', type: '', dateStart: '', dateEnd: '' })
    setQuery('')
  }

  return (
    <div className="border border-zinc-500 bg-zinc-100">
      <div className="flex items-center justify-between border-b-4 border-zinc-400 px-2 py-1">
        <h2 className="text-lg font-normal text-red-600">Requisicoes de compra e despesas</h2>
        <button onClick={openNew} className="grid h-7 w-7 place-items-center bg-black text-lg font-bold text-white" title="Nova requisicao">+</button>
      </div>

      <div className="border-b border-zinc-400">
        <div className="flex h-7 items-center justify-between border-b border-zinc-300 bg-zinc-100 px-2 text-xs">
          <span>Filtro</span>
          <div className="flex items-center gap-2"><Search size={22} /><button onClick={clearFilters}><X size={16} /></button></div>
        </div>
        <div className="px-2 py-1 text-[11px] text-red-600">CONTROLE DE SAIDAS, COMPRAS, MANUTENCAO, ABASTECIMENTO E PAGAMENTOS</div>
        <div className="grid gap-x-12 gap-y-1 px-3 pb-3 md:grid-cols-4">
          <Field label="Situacao"><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className={inputClass()}><option value="">Todas</option><option>Aberta</option><option>Aguardando aprovacao</option><option>Aprovada</option><option>Paga</option><option>Cancelada</option></select></Field>
          <Field label="Tipo"><select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} className={inputClass()}><option value="">Todos</option><option>Compra</option><option>Manutencao</option><option>Abastecimento</option><option>Pneu</option><option>Servico terceiro</option><option>Outros</option></select></Field>
          <Field label="Dt. inicial"><input type="date" value={filters.dateStart} onChange={(event) => setFilters({ ...filters, dateStart: event.target.value })} className={inputClass()} /></Field>
          <Field label="Dt. final"><input type="date" value={filters.dateEnd} onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value })} className={inputClass()} /></Field>
        </div>
      </div>

      <div className="grid border-b border-zinc-300 bg-white text-xs md:grid-cols-4">
        <div className="border-r border-zinc-300 p-3"><div className="text-zinc-500">Previsto</div><div className="text-base font-semibold">{formatMoney(totals.expected)}</div></div>
        <div className="border-r border-zinc-300 p-3"><div className="text-zinc-500">Aprovado</div><div className="text-base font-semibold">{formatMoney(totals.approved)}</div></div>
        <div className="border-r border-zinc-300 p-3"><div className="text-zinc-500">Pago</div><div className="text-base font-semibold text-emerald-700">{formatMoney(totals.paid)}</div></div>
        <div className="p-3"><div className="text-zinc-500">Em aberto</div><div className="text-base font-semibold text-red-700">{formatMoney(totals.open)}</div></div>
      </div>

      <div className="bg-white">
        <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 text-xs">
          <div className="px-2 font-semibold">REQUISICOES</div>
          <div className="ml-auto px-2">{loading ? 'Carregando requisicoes...' : `${rows.length} de ${purchaseRequests.length} registros`}</div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="mr-2 h-6 w-40 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
          <div className="flex items-center gap-2 pr-2"><Settings size={18} /><span>1:1</span><span>XLS</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-xs">
            <thead className="bg-white">
              <tr>
                {['Numero', 'Data', 'Tipo', 'Categoria', 'Descricao', 'Fornecedor', 'Frete', 'Veiculo', 'Motorista', 'Previsto', 'Aprovado', 'Pago', 'Situacao'].map((heading) => (
                  <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                    {heading}<span className="float-right text-zinc-400">v</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && rows.map((request, index) => (
                <tr key={request.id} onDoubleClick={() => openEdit(request)} className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} cursor-default hover:bg-sky-100`}>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 font-medium">{request.number}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{request.requestDate}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{request.type}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{request.category}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{request.description}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{request.supplier || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{request.freightProcess || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{request.vehiclePlate || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{request.driver || '-'}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 text-right">{formatMoney(request.expectedValue)}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 text-right">{formatMoney(request.approvedValue)}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 text-right">{formatMoney(request.paidValue)}</td>
                  <td className="border-b border-zinc-200 px-2 py-2">{request.status}</td>
                </tr>
              ))}
              {loading && <LoadingRow colSpan={13} label="Carregando requisicoes..." />}
              {!loading && !rows.length && <tr><td colSpan={13} className="px-3 py-16 text-center text-zinc-500">Nenhuma requisicao encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-8">
          <div className="system-modal max-h-[calc(100vh-64px)] w-full max-w-6xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Requisicao de compra / despesa</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => save(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
                <button onClick={() => save(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => changeStatus('Aprovada')} className="inline-flex items-center gap-1"><Check size={15} /> APROVAR</button>
                <button onClick={() => changeStatus('Paga')} className="inline-flex items-center gap-1"><CreditCard size={15} /> PAGAR</button>
                <button onClick={removeEditing} className="inline-flex items-center gap-1"><Trash2 size={15} /> EXCLUIR</button>
                <button onClick={() => setEditing(null)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-3">
              <div className="grid gap-x-24 gap-y-1 border-b-4 border-zinc-400 pb-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <Field label="Numero"><input value={editing.number} className={inputClass(true)} disabled /></Field>
                  <Field label="Dt. requisicao"><input type="date" value={editing.requestDate} onChange={(event) => updateEditing('requestDate', event.target.value)} className={inputClass()} /></Field>
                  <Field label="Tipo"><select value={editing.type} onChange={(event) => updateEditing('type', event.target.value)} className={inputClass()}><option>Compra</option><option>Manutencao</option><option>Abastecimento</option><option>Pneu</option><option>Servico terceiro</option><option>Outros</option></select></Field>
                  <Field label="Categoria"><select value={editing.category} onChange={(event) => updateEditing('category', event.target.value)} className={inputClass()}><option>Operacional</option><option>Frota</option><option>Administrativo</option><option>Fiscal</option><option>Financeiro</option></select></Field>
                  <Field label="Solicitante"><input value={editing.requester} onChange={(event) => updateEditing('requester', event.target.value.toUpperCase())} className={inputClass()} /></Field>
                  <Field label="Situacao"><select value={editing.status} onChange={(event) => updateEditing('status', event.target.value)} className={inputClass()}><option>Aberta</option><option>Aguardando aprovacao</option><option>Aprovada</option><option>Paga</option><option>Cancelada</option></select></Field>
                </div>
                <div className="grid gap-1">
                  <Field label="Descricao"><input value={editing.description} onChange={(event) => updateEditing('description', event.target.value.toUpperCase())} className={inputClass()} /></Field>
                  <Field label="CNPJ/CPF fornecedor"><input value={editing.supplierDocument} onChange={(event) => updateEditing('supplierDocument', event.target.value)} className={inputClass()} /></Field>
                  <Field label="Fornecedor"><input value={editing.supplier} onChange={(event) => updateEditing('supplier', event.target.value.toUpperCase())} className={inputClass()} /></Field>
                  <Field label="Centro de custo"><input value={editing.costCenter} onChange={(event) => updateEditing('costCenter', event.target.value)} className={inputClass()} /></Field>
                  <Field label="Vencimento"><input type="date" value={editing.dueDate} onChange={(event) => updateEditing('dueDate', event.target.value)} className={inputClass()} /></Field>
                  <Field label="Forma pagto."><select value={editing.paymentMethod} onChange={(event) => updateEditing('paymentMethod', event.target.value)} className={inputClass()}><option>A definir</option><option>PIX</option><option>Boleto</option><option>Transferencia</option><option>Dinheiro</option><option>Cartao</option></select></Field>
                </div>
              </div>

              <div className="grid gap-x-24 gap-y-1 border-b-4 border-zinc-400 py-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <Field label="Frete"><select value={editing.freightProcess} onChange={(event) => updateEditing('freightProcess', event.target.value)} className={inputClass()}><option value="">Selecione...</option>{freights.map((freight) => <option key={freight.id} value={freight.process}>{freight.process} - {freight.customer}</option>)}</select></Field>
                  <Field label="Veiculo"><select value={editing.vehiclePlate} onChange={(event) => updateEditing('vehiclePlate', event.target.value)} className={inputClass()}><option value="">Selecione...</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.tractorPlate || vehicle.trailerPlate}>{vehicle.tractorPlate || vehicle.trailerPlate} - {vehicle.description || vehicle.type}</option>)}</select></Field>
                  <Field label="Motorista"><select value={editing.driver} onChange={(event) => updateEditing('driver', event.target.value)} className={inputClass()}><option value="">Selecione...</option>{drivers.map((driver) => <option key={driver.id} value={driver.name}>{driver.name}</option>)}</select></Field>
                </div>
                <div className="grid gap-1">
                  <Field label="Vlr. previsto"><input value={editing.expectedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={(event) => updateEditing('expectedValue', parseMoney(event.target.value))} className={`${inputClass()} text-right`} /></Field>
                  <Field label="Vlr. aprovado"><input value={editing.approvedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={(event) => updateEditing('approvedValue', parseMoney(event.target.value))} className={`${inputClass()} text-right`} /></Field>
                  <Field label="Vlr. pago"><input value={editing.paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={(event) => updateEditing('paidValue', parseMoney(event.target.value))} className={`${inputClass()} text-right`} /></Field>
                </div>
              </div>

              <div className="pt-3">
                <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">OBSERVACAO / JUSTIFICATIVA</div>
                <textarea value={editing.notes} onChange={(event) => updateEditing('notes', event.target.value)} className="mt-2 h-24 w-full border border-zinc-300 bg-white p-2 text-xs outline-none focus:border-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-zinc-950/15">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-900" />
        </div>
      )}

      {notice && (
        <div className="fixed inset-0 z-[95] flex items-start justify-center bg-zinc-950/30 px-4 py-24">
          <div className="w-full max-w-lg border border-zinc-600 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">{notice.title}</h3>
              <button onClick={() => setNotice(null)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
            </div>
            <div className="border-b border-zinc-300 bg-white px-5 py-6 text-sm leading-6">{notice.message}</div>
            <div className="flex justify-end bg-zinc-100 px-3 py-3 text-xs">
              <button onClick={() => setNotice(null)} className="h-8 bg-black px-5 font-semibold text-white hover:bg-zinc-800">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
