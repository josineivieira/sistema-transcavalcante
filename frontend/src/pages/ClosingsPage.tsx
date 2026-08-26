import { useEffect, useMemo, useState } from 'react'
import { MoreVertical } from 'lucide-react'
import { formatMoney, nextId, type Freight } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { LoadingRow, LoadingState } from '../components/LoadingState'
import { api } from '../services/api'

const steps = [
  ['1', 'Selecao', 'Cliente e periodo'],
  ['2', 'Fretes', 'Entrega concluida'],
  ['3', 'Conferencia', 'Duplo cheque antes de fechar'],
  ['4', 'Fiscal', 'Documento e pre-validacao'],
  ['5', 'Aprovacao', 'Conferencia formal'],
  ['6', 'Emissao', 'Fila e acompanhamento'],
]

type OperationalFreightsResponse = {
  items: Freight[]
}

const CLOSING_ELIGIBLE_STATUS = 'ENTREGA CONCLUIDA 50'
const CLOSING_LINKED_STATUS = 'INCLUIDO EM FECHAMENTO'

type Notice = {
  title: string
  message: string
  tone?: 'info' | 'danger'
}

function isClosingEligible(freight: Freight) {
  return freight.operationalStatus === CLOSING_ELIGIBLE_STATUS && !freight.closing
}

function freightScheduleDate(freight: Freight) {
  return freight.destinationScheduleDate || freight.date || '-'
}

function freightCiot(freight: Freight) {
  return freight.ciotEntries?.find((entry) => entry.number)?.number || freight.ciotNumber || '-'
}

function freightInvoiceLabel(freight: Freight) {
  const entries = freight.invoiceEntries?.filter((entry) => entry.invoiceNumber) || []
  if (entries.length) {
    return entries.map((entry) => (
      entry.invoiceSeries ? `${entry.invoiceNumber}/${entry.invoiceSeries}` : entry.invoiceNumber
    )).join(', ')
  }
  if (freight.invoiceNumber) {
    return freight.invoiceSeries ? `${freight.invoiceNumber}/${freight.invoiceSeries}` : freight.invoiceNumber
  }
  return '-'
}

export function ClosingsPage() {
  const data = useLocalData()
  const { closings, fiscalDocuments } = data
  const canEditPage = canEdit('closings')
  const [eligibleFreights, setEligibleFreights] = useState<Freight[]>([])
  const [eligibleLoading, setEligibleLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [period, setPeriod] = useState('Semana atual')
  const [selectedFreightIds, setSelectedFreightIds] = useState<string[]>([])
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [viewingClosingNumber, setViewingClosingNumber] = useState<string | null>(null)
  const [viewingFreights, setViewingFreights] = useState<Freight[]>([])
  const [viewingLoading, setViewingLoading] = useState(false)
  const [savingLabel, setSavingLabel] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

  function loadEligibleFreights() {
    setEligibleLoading(true)
    return api.get<OperationalFreightsResponse>('/operational-freights', {
      params: { status: CLOSING_ELIGIBLE_STATUS, unclosed: true, limit: 1000 },
    }).then((response) => {
      setEligibleFreights((response.data.items || []).filter(isClosingEligible))
    }).catch(() => {
      setEligibleFreights([])
    }).finally(() => {
      setEligibleLoading(false)
    })
  }

  useEffect(() => {
    void loadEligibleFreights()
  }, [])

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

  function openPreview() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (eligibleLoading) {
      return
    }
    if (!eligibleFreights.length) {
      setNotice({
        title: 'Fechamento indisponivel',
        message: 'Nao ha fretes com entrega concluida disponiveis para fechamento.',
      })
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

  async function confirmClosing() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!selectedFreights.length) {
      setNotice({
        title: 'Selecao obrigatoria',
        message: 'Selecione pelo menos um frete para fechar.',
      })
      return
    }

    const number = `FEC-${String(closings.length + 1).padStart(6, '0')}`
    const closing = {
      id: nextId('fec'),
      number,
      customer: selectedCustomer,
      period,
      freights: selectedFreights.length,
      subtotal,
      retentions: 0,
      netTotal: subtotal,
      status: 'Aguardando aprovacao',
    }

    try {
      setSavingLabel('Confirmando fechamento...')
      await Promise.all(selectedFreights.map((freight) =>
        data.saveFreightRecord({ ...freight, closing: number, operationalStatus: CLOSING_LINKED_STATUS }),
      ))
      data.setClosings([...closings, closing])
      setEligibleFreights((current) => current.filter((freight) => !selectedFreightIds.includes(freight.id)))
      setShowPreview(false)
      setSelectedFreightIds([])
    } catch {
      setNotice({
        title: 'Falha ao confirmar',
        message: 'Nao foi possivel salvar o fechamento no banco. Tente novamente.',
        tone: 'danger',
      })
    } finally {
      setSavingLabel('')
    }
  }

  async function approveClosing(id: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const closing = closings.find((item) => item.id === id)
    if (!closing) return
    if (closing.status === 'Cancelado') {
      setNotice({
        title: 'Aprovacao bloqueada',
        message: 'Este fechamento foi cancelado e nao pode mais voltar para aprovado.',
        tone: 'danger',
      })
      setOpenActionId(null)
      return
    }
    setSavingLabel('Aprovando fechamento...')
    try {
      await data.update({
        ...data,
        closings: closings.map((closing) => closing.id === id ? { ...closing, status: 'Aprovado' } : closing),
      })
      setOpenActionId(null)
    } finally {
      setSavingLabel('')
    }
  }

  async function cancelClosing(id: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const closing = closings.find((item) => item.id === id)
    if (!closing) return
    const hasIssuedDocument = closing.status === 'Emitido'
      || fiscalDocuments.some((document) => document.closing === closing.number)
    if (hasIssuedDocument) {
      setNotice({
        title: 'Cancelamento bloqueado',
        message: 'Este fechamento ja tem documento fiscal emitido e nao pode ser cancelado.',
        tone: 'danger',
      })
      setOpenActionId(null)
      return
    }

    try {
      setSavingLabel('Cancelando fechamento...')
      const response = await api.get<OperationalFreightsResponse>('/operational-freights', {
        params: { closing: closing.number, limit: 1000 },
      })
      const restoredFreights = (response.data.items || [])
        .map((freight) => ({ ...freight, closing: undefined, operationalStatus: CLOSING_ELIGIBLE_STATUS }))

      await Promise.all(restoredFreights.map((freight) => data.saveFreightRecord(freight)))
      data.setClosings(closings.map((item) => item.id === id ? { ...item, status: 'Cancelado' } : item))
      setEligibleFreights((current) => {
        const byId = new Map<string, Freight>()
        ;[...restoredFreights, ...current].filter(isClosingEligible).forEach((freight) => byId.set(freight.id, freight))
        return [...byId.values()]
      })
      setOpenActionId(null)
      if (viewingClosingNumber === closing.number) {
        setViewingClosingNumber(null)
      }
    } catch {
      setNotice({
        title: 'Falha ao cancelar',
        message: 'Nao foi possivel cancelar o fechamento no banco. Tente novamente.',
        tone: 'danger',
      })
    } finally {
      setSavingLabel('')
    }
  }

  async function viewClosing(number: string) {
    setViewingClosingNumber(number)
    setOpenActionId(null)
    setViewingLoading(true)
    setViewingFreights([])
    try {
      const response = await api.get<OperationalFreightsResponse>('/operational-freights', {
        params: { closing: number, limit: 1000 },
      })
      setViewingFreights(response.data.items || [])
    } catch {
      setViewingFreights([])
    } finally {
      setViewingLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-300 bg-white">
        <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
          <h2 className="text-lg font-normal text-red-600">Fechamento semanal</h2>
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
                  {['Processo', 'Dt. agendamento entrega', 'Conteiner', 'Motorista', 'Cavalo', 'Carreta', 'CIOT', 'Nr. nfe/serie', 'Origem', 'Destino', 'Valor'].map((heading) => (
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
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.process}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightScheduleDate(freight)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.container || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.driver || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.tractorPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.trailerPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightCiot(freight)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightInvoiceLabel(freight)}</td>
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
                      <button onClick={() => void viewClosing(closing.number)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">
                        Visualizar
                      </button>
                      {closing.status !== 'Cancelado' && (
                        <button onClick={() => void approveClosing(closing.id)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">
                          Aprovar
                        </button>
                      )}
                      <button onClick={() => void cancelClosing(closing.id)} className="block w-full px-3 py-2 text-left text-red-700 hover:bg-zinc-100">
                        Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {data.loading && <LoadingRow colSpan={9} label="Carregando fechamentos..." />}
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
                  {['Processo', 'Dt. agendamento entrega', 'Conteiner', 'Motorista', 'Cavalo', 'Carreta', 'CIOT', 'Nr. nfe/serie', 'Origem', 'Destino', 'Valor'].map((heading) => (
                    <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewingLoading && <LoadingRow colSpan={11} label="Carregando fretes do fechamento..." />}
                {!viewingLoading && viewingFreights.map((freight) => (
                  <tr key={freight.id}>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.process}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightScheduleDate(freight)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.container || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.driver || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.tractorPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.trailerPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightCiot(freight)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightInvoiceLabel(freight)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.origin || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.destination || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(freight.value)}</td>
                  </tr>
                ))}
                {!viewingLoading && !viewingFreights.length && (
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
      {savingLabel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20">
          <div className="border border-zinc-400 bg-white shadow-xl">
            <LoadingState label={savingLabel} />
          </div>
        </div>
      )}
      {notice && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
          <div className="w-[420px] max-w-[calc(100vw-32px)] border border-zinc-500 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 px-4 py-2">
              <h3 className={`text-lg ${notice.tone === 'danger' ? 'text-red-700' : 'text-red-600'}`}>{notice.title}</h3>
              <button onClick={() => setNotice(null)} className="grid h-7 w-7 place-items-center bg-black text-white">X</button>
            </div>
            <div className="px-5 py-6 text-sm leading-6">{notice.message}</div>
            <div className="flex justify-end border-t border-zinc-300 bg-zinc-50 px-4 py-3">
              <button onClick={() => setNotice(null)} className="border border-zinc-900 bg-zinc-900 px-5 py-1.5 text-xs font-semibold text-white">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
