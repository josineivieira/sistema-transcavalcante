import { useMemo, useState } from 'react'
import { FileSpreadsheet, Save, Search, Settings, Trash2, X } from 'lucide-react'
import { useLocalData } from '../hooks/useLocalData'
import { formatMoney, nextId, type PriceList } from '../services/localStore'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { LoadingRow } from '../components/LoadingState'

const emptyPrice: PriceList = {
  id: '',
  listName: '',
  originPort: '',
  originZipCode: '',
  destinationPort: '',
  product: 'CUSTO FRETE ROD, DESTINO',
  listValue: 0,
  taxPercent: 0,
  total: 0,
  status: 'Ativo',
}

function inputClass(disabled = false) {
  return `h-7 w-full min-w-0 border border-zinc-300 px-2 text-xs outline-none ${disabled ? 'bg-zinc-200 text-zinc-500' : 'bg-white focus:border-zinc-500'}`
}

function Field({ label, children, required = false }: { label: string, children: React.ReactNode, required?: boolean }) {
  return (
    <label className="grid grid-cols-[132px_minmax(0,1fr)] items-center gap-1 text-xs">
      <span className={`text-right ${required ? 'text-red-600' : 'text-zinc-900'}`}>{label}</span>
      {children}
    </label>
  )
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return Number(normalized) || 0
}

function normalizeZipCode(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 8) return value.trim()
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function PriceListsPage() {
  const { priceLists, loading, setPriceLists } = useLocalData()
  const canEditPage = canEdit('priceLists')
  const [filters, setFilters] = useState({ originPort: '', destinationPort: '' })
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<PriceList | null>(null)

  const rows = useMemo(() => {
    const term = query.toLowerCase()
    return priceLists.filter((price) => {
      const text = [price.listName, price.originPort, price.destinationPort, price.product, price.status].join(' ').toLowerCase()
      return text.includes(term)
        && (!filters.originPort || price.originPort.toLowerCase().includes(filters.originPort.toLowerCase()))
        && (!filters.destinationPort || price.destinationPort.toLowerCase().includes(filters.destinationPort.toLowerCase()))
    })
  }, [filters, priceLists, query])

  function openNew() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditing({ ...emptyPrice, id: nextId('pl') })
  }

  function openEdit(price: PriceList) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditing({ ...emptyPrice, ...price })
  }

  function updateEditing(field: keyof PriceList, value: string | number) {
    if (!editing) return
    const next = { ...editing, [field]: value }
    if (field === 'listValue' || field === 'taxPercent') {
      const listValue = Number(field === 'listValue' ? value : next.listValue) || 0
      const taxPercent = Number(field === 'taxPercent' ? value : next.taxPercent) || 0
      next.total = listValue + (listValue * taxPercent / 100)
    }
    setEditing(next)
  }

  function save(closeAfterSave = true) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    if (!editing.listName || !editing.originPort || !editing.destinationPort) {
      window.alert('Informe lista de preco, porto de origem e porto de destino.')
      return
    }
    const normalized = {
      ...editing,
      originPort: editing.originPort.toUpperCase(),
      originZipCode: normalizeZipCode(editing.originZipCode || ''),
      destinationPort: editing.destinationPort.toUpperCase(),
      product: editing.product.toUpperCase(),
      total: editing.total || editing.listValue + (editing.listValue * editing.taxPercent / 100),
    }
    const exists = priceLists.some((price) => price.id === normalized.id)
    setPriceLists(exists ? priceLists.map((price) => price.id === normalized.id ? normalized : price) : [...priceLists, normalized])
    if (closeAfterSave) setEditing(null)
  }

  function remove(price: PriceList) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (window.confirm(`Excluir lista ${price.listName}?`)) {
      setPriceLists(priceLists.filter((item) => item.id !== price.id))
      setEditing(null)
    }
  }

  return (
    <div className="border border-zinc-500 bg-zinc-100">
      <div className="flex items-center justify-between border-b-4 border-zinc-400 px-2 py-1">
        <h2 className="text-lg font-normal text-red-600">Consulta despesas fixas lista de preco</h2>
        <div className="flex items-center gap-4 text-xs">
          <button className="inline-flex items-center gap-1"><FileSpreadsheet size={15} /> GERAR EXCEL</button>
          <button className="inline-flex items-center gap-1"><FileSpreadsheet size={15} /> GERAR EXCEL SEM FORMATACAO</button>
          <button onClick={openNew} className="grid h-7 w-7 place-items-center bg-black text-lg font-bold text-white" title="Novo preco">+</button>
        </div>
      </div>

      <div className="border-b border-zinc-400">
        <div className="flex h-7 items-center justify-between border-b border-zinc-300 bg-zinc-100 px-2 text-xs">
          <span>Filtro</span>
          <div className="flex items-center gap-2"><Search size={22} /><X size={16} /></div>
        </div>
        <div className="px-2 py-1 text-[11px] text-red-600">INFORME CRITERIO PARA CONSULTAR OS DADOS</div>
        <div className="grid gap-x-24 gap-y-1 px-3 pb-3 md:grid-cols-2">
          <Field label="Porto de origem"><input value={filters.originPort} onChange={(event) => setFilters({ ...filters, originPort: event.target.value })} className={inputClass()} /></Field>
          <Field label="Porto de destino"><input value={filters.destinationPort} onChange={(event) => setFilters({ ...filters, destinationPort: event.target.value })} className={inputClass()} /></Field>
        </div>
      </div>

      <div className="bg-white">
        <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 text-xs">
          <div className="px-2 font-semibold">CONSULTA ROTAS</div>
          <div className="ml-auto px-2">{loading ? 'Carregando...' : `${rows.length} de ${priceLists.length} registros`}</div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="mr-2 h-6 w-36 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
          <div className="flex items-center gap-2 pr-2"><Settings size={18} /><span>1:1</span><span>XLS</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-xs">
            <thead className="bg-white">
              <tr>
                {['Lista de preco', 'Cidade/Porto origem', 'Cidade/Porto destino', 'Produto', 'Vlr. lista', '% impostos', 'Total', 'Situacao'].map((heading) => (
                  <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                    {heading}<span className="float-right text-zinc-400">▼</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && rows.map((price, index) => (
                <tr key={price.id} onDoubleClick={() => openEdit(price)} className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} cursor-default hover:bg-sky-100`}>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{price.listName}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{price.originPort}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{price.destinationPort}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2">{price.product}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 text-right">{price.listValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 text-right">{price.taxPercent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-2 text-right">{price.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="border-b border-zinc-200 px-2 py-2">{price.status}</td>
                </tr>
              ))}
              {loading && <LoadingRow colSpan={8} label="Carregando lista de preços..." />}
              {!loading && !rows.length && <tr><td colSpan={8} className="px-3 py-10 text-center text-zinc-500">Nenhuma rota encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-8">
          <div className="max-h-[calc(100vh-64px)] w-full max-w-6xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Lista de preco</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => save(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
                <button onClick={() => save(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => remove(editing)} className="inline-flex items-center gap-1"><Trash2 size={15} /> EXCLUIR</button>
                <button onClick={() => setEditing(null)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-110px)] overflow-y-auto p-3">
              <div className="grid gap-x-24 gap-y-1 border-b-4 border-zinc-400 pb-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <Field label="Lista de preco" required><input value={editing.listName} onChange={(event) => updateEditing('listName', event.target.value.toUpperCase())} className={inputClass()} /></Field>
                  <Field label="Porto de origem" required><input value={editing.originPort} onChange={(event) => updateEditing('originPort', event.target.value.toUpperCase())} className={inputClass()} /></Field>
                  <Field label="CEP origem"><input value={editing.originZipCode || ''} onChange={(event) => updateEditing('originZipCode', event.target.value)} className={inputClass()} /></Field>
                  <Field label="Porto de destino" required><input value={editing.destinationPort} onChange={(event) => updateEditing('destinationPort', event.target.value.toUpperCase())} className={inputClass()} /></Field>
                  <Field label="Produto"><input value={editing.product} onChange={(event) => updateEditing('product', event.target.value.toUpperCase())} className={inputClass()} /></Field>
                </div>
                <div className="grid gap-1">
                  <Field label="Vlr. lista"><input value={editing.listValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={(event) => updateEditing('listValue', parseMoney(event.target.value))} className={inputClass()} /></Field>
                  <Field label="% impostos"><input value={String(editing.taxPercent).replace('.', ',')} onChange={(event) => updateEditing('taxPercent', parseMoney(event.target.value))} className={inputClass()} /></Field>
                  <Field label="Total"><input value={formatMoney(editing.total)} className={inputClass(true)} disabled /></Field>
                  <Field label="Situacao"><select value={editing.status} onChange={(event) => updateEditing('status', event.target.value)} className={inputClass()}><option>Ativo</option><option>Inativo</option></select></Field>
                </div>
              </div>

              <div className="pt-3">
                <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">VALIDADE E OBSERVACAO</div>
                <div className="mt-2 grid gap-x-24 gap-y-1 md:grid-cols-2">
                  <Field label="Tipo de calculo"><select className={inputClass()}><option>Por rota</option><option>Por container</option><option>Por viagem</option></select></Field>
                  <Field label="Moeda"><input value="BRL" className={inputClass(true)} disabled /></Field>
                  <Field label="Observacao"><input className={inputClass()} /></Field>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
