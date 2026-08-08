import { useMemo, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { formatMoney, nextId } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { LoadingRow } from '../components/LoadingState'

const steps = [
  ['1', 'Selecao', 'Cliente e periodo'],
  ['2', 'Fretes', 'Elegiveis para faturamento'],
  ['3', 'Conferencia', 'Duplo cheque antes de fechar'],
  ['4', 'Fiscal', 'Documento e pre-validacao'],
  ['5', 'Aprovacao', 'Conferencia formal'],
  ['6', 'Emissao', 'Fila e acompanhamento'],
]

export function ClosingsPage() {
  const data = useLocalData()
  const { freights, closings } = data
  const canEditPage = canEdit('closings')
  const [showPreview, setShowPreview] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [period, setPeriod] = useState('Semana atual')
  const [selectedFreightIds, setSelectedFreightIds] = useState<string[]>([])
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [viewingClosingNumber, setViewingClosingNumber] = useState<string | null>(null)

  const eligibleFreights = useMemo(
    () => freights.filter((freight) => freight.operationalStatus === 'Aprovado para faturamento' && !freight.closing),
    [freights],
  )

  const customers = useMemo(
    () => Array.from(new Set(eligibleFreights.map((freight) => freight.customer))),
    [eligibleFreights],
  )

  const previewRows = useMemo(
    () => eligibleFreights.filter((freight) => freight.customer === selectedCustomer),
    [eligibleFreights, selectedCustomer],
  )

  const selectedFreights = useMemo(
    () => previewRows.filter((freight) => selectedFreightIds.includes(freight.id)),
    [previewRows, selectedFreightIds],
  )

  const subtotal = selectedFreights.reduce((sum, freight) => sum + freight.value, 0)
  const viewingClosing = closings.find((closing) => closing.number === viewingClosingNumber)
  const viewingFreights = freights.filter((freight) => freight.closing === viewingClosingNumber)

  function openPreview() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!eligibleFreights.length) {
      window.alert('Nao ha fretes aprovados disponiveis para fechamento.')
      return
    }

    const customer = selectedCustomer || eligibleFreights[0].customer
    const rows = eligibleFreights.filter((freight) => freight.customer === customer)
    setSelectedCustomer(customer)
    setSelectedFreightIds(rows.map((freight) => freight.id))
    setShowPreview(true)
  }

  function changeCustomer(customer: string) {
    const rows = eligibleFreights.filter((freight) => freight.customer === customer)
    setSelectedCustomer(customer)
    setSelectedFreightIds(rows.map((freight) => freight.id))
  }

  function toggleFreight(id: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setSelectedFreightIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleAll(checked: boolean) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setSelectedFreightIds(checked ? previewRows.map((freight) => freight.id) : [])
  }

  function confirmClosing() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!selectedFreights.length) {
      window.alert('Selecione pelo menos um frete para fechar.')
      return
    }

    const number = `FEC-${String(closings.length + 1).padStart(6, '0')}`

    data.update({
      ...data,
      freights: freights.map((freight) =>
        selectedFreightIds.includes(freight.id)
          ? { ...freight, closing: number, operationalStatus: 'Incluido em fechamento' }
          : freight,
      ),
      closings: [
        ...closings,
        {
          id: nextId('fec'),
          number,
          customer: selectedCustomer,
          period,
          freights: selectedFreights.length,
          subtotal,
          retentions: 0,
          netTotal: subtotal,
          status: 'Aguardando aprovacao',
        },
      ],
    })

    setShowPreview(false)
    setSelectedFreightIds([])
  }

  function approveClosing(id: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    data.update({
      ...data,
      closings: closings.map((closing) => closing.id === id ? { ...closing, status: 'Aprovado' } : closing),
    })
    setOpenActionId(null)
  }

  function cancelClosing(id: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const closing = closings.find((item) => item.id === id)
    if (!closing) return

    data.update({
      ...data,
      closings: closings.map((item) => item.id === id ? { ...item, status: 'Cancelado' } : item),
      freights: freights.map((freight) =>
        freight.closing === closing.number
          ? { ...freight, closing: undefined, operationalStatus: 'Aprovado para faturamento' }
          : freight,
      ),
    })
    setOpenActionId(null)
    if (viewingClosingNumber === closing.number) {
      setViewingClosingNumber(null)
    }
  }

  function viewClosing(number: string) {
    setViewingClosingNumber(number)
    setOpenActionId(null)
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-300 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Fechamento semanal</h2>
            <p className="text-xs text-zinc-500">Fluxo com pre-visualizacao, selecao de fretes e duplo cheque antes de fechar.</p>
          </div>
          <button onClick={openPreview} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
            Criar fechamento
          </button>
        </div>
        <div className="grid divide-y divide-zinc-200 md:grid-cols-6 md:divide-x md:divide-y-0">
          {steps.map(([number, title, desc]) => (
            <div key={number} className="px-4 py-3">
              <div className="text-xs font-semibold text-zinc-500">Etapa {number}</div>
              <div className="mt-1 text-sm font-semibold">{title}</div>
              <div className="mt-1 text-xs leading-5 text-zinc-600">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {showPreview && (
        <section className="border border-zinc-300 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Previa do fechamento</h3>
              <p className="text-xs text-zinc-500">Confira cliente, periodo, fretes e valor antes de confirmar.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPreview(false)} className="border border-zinc-400 bg-white px-3 py-1.5 text-xs font-medium">
                Cancelar
              </button>
              <button onClick={confirmClosing} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
                Confirmar fechamento
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-zinc-300 bg-zinc-50 p-3 md:grid-cols-5">
            <label className="field">
              Cliente
              <select value={selectedCustomer} onChange={(event) => changeCustomer(event.target.value)}>
                {customers.map((customer) => <option key={customer}>{customer}</option>)}
              </select>
            </label>
            <label className="field">
              Periodo
              <input value={period} onChange={(event) => setPeriod(event.target.value)} />
            </label>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Fretes selecionados</div>
              <div className="font-semibold">{selectedFreights.length} de {previewRows.length}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Subtotal</div>
              <div className="font-semibold">{formatMoney(subtotal)}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Situacao inicial</div>
              <div className="font-semibold">Aguardando aprovacao</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="system-grid w-full min-w-[1120px] text-xs">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                    <input
                      type="checkbox"
                      checked={previewRows.length > 0 && selectedFreightIds.length === previewRows.length}
                      onChange={(event) => toggleAll(event.target.checked)}
                    />
                  </th>
                  {['Numero', 'Data', 'Processo', 'Conteiner', 'Motorista', 'Cavalo', 'Carreta', 'Origem', 'Destino', 'Valor'].map((heading) => (
                    <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((freight) => (
                  <tr key={freight.id} className={selectedFreightIds.includes(freight.id) ? 'bg-white' : 'bg-zinc-50 text-zinc-400'}>
                    <td className="border-b border-zinc-200 px-3 py-2">
                      <input type="checkbox" checked={selectedFreightIds.includes(freight.id)} onChange={() => toggleFreight(freight.id)} />
                    </td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.number}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.date}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.process}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.container || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.driver || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.tractorPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.trailerPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.origin || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.destination || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(freight.value)}</td>
                  </tr>
                ))}
                {!previewRows.length && (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-zinc-500">Nenhum frete elegivel para este cliente.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="border border-zinc-300 bg-white">
        <table className="system-grid w-full text-xs">
          <thead className="bg-zinc-50">
            <tr>
              {['Numero', 'Cliente', 'Periodo', 'Fretes', 'Subtotal', 'Retencoes', 'Liquido', 'Situacao', 'Acoes'].map((heading) => (
                <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data.loading && closings.map((closing) => (
              <tr key={closing.id}>
                <td className="border-b border-zinc-200 px-3 py-2">{closing.number}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{closing.customer}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{closing.period}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{closing.freights}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(closing.subtotal)}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(closing.retentions)}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(closing.netTotal)}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{closing.status}</td>
                <td className="relative border-b border-zinc-200 px-3 py-2">
                  <button
                    onClick={() => setOpenActionId(openActionId === closing.id ? null : closing.id)}
                    className="grid h-7 w-8 place-items-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    aria-label={`Acoes do fechamento ${closing.number}`}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {openActionId === closing.id && (
                    <div className="absolute right-3 top-9 z-20 w-36 border border-zinc-300 bg-white py-1 text-xs shadow-lg">
                      <button onClick={() => viewClosing(closing.number)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">
                        Visualizar
                      </button>
                      <button onClick={() => approveClosing(closing.id)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">
                        Aprovar
                      </button>
                      <button onClick={() => cancelClosing(closing.id)} className="block w-full px-3 py-2 text-left text-red-700 hover:bg-zinc-100">
                        Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data.loading && <LoadingRow colSpan={9} />}
            {!data.loading && !closings.length && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-zinc-500">Nenhum fechamento criado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewingClosing && (
        <section className="border border-zinc-300 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Fechamento {viewingClosing.number}</h3>
              <p className="text-xs text-zinc-500">
                {viewingClosing.customer} | {viewingClosing.period} | {viewingFreights.length} frete(s)
              </p>
            </div>
            <button onClick={() => setViewingClosingNumber(null)} className="border border-zinc-400 bg-white px-3 py-1.5 text-xs font-medium">
              Fechar
            </button>
          </div>

          <div className="grid gap-3 border-b border-zinc-300 bg-zinc-50 p-3 md:grid-cols-4">
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Subtotal</div>
              <div className="font-semibold">{formatMoney(viewingClosing.subtotal)}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Retencoes</div>
              <div className="font-semibold">{formatMoney(viewingClosing.retentions)}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Liquido</div>
              <div className="font-semibold">{formatMoney(viewingClosing.netTotal)}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Situacao</div>
              <div className="font-semibold">{viewingClosing.status}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="system-grid w-full min-w-[1120px] text-xs">
              <thead className="bg-zinc-50">
                <tr>
                  {['Numero', 'Data', 'Processo', 'Conteiner', 'Motorista', 'Cavalo', 'Carreta', 'Origem', 'Destino', 'Valor', 'Fiscal'].map((heading) => (
                    <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewingFreights.map((freight) => (
                  <tr key={freight.id}>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.number}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.date}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.process}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.container || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.driver || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.tractorPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.trailerPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.origin || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.destination || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(freight.value)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.fiscalStatus}</td>
                  </tr>
                ))}
                {!viewingFreights.length && (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-zinc-500">
                      Nenhum frete vinculado a este fechamento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
