import { useMemo, useState } from 'react'
import { MoreVertical, Save, X } from 'lucide-react'
import { formatMoney, nextId } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'

export function FreightsPage() {
  const { customers, drivers, vehicles, containers, freights, setFreights } = useLocalData()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer: customers[0]?.name ?? '',
    process: '',
    container: containers[0]?.number ?? '',
    driver: drivers[0]?.name ?? '',
    tractorId: vehicles.find((vehicle) => vehicle.vehicleType === 'Cavalo')?.id ?? '',
    trailerId: vehicles.find((vehicle) => vehicle.vehicleType === 'Carreta')?.id ?? '',
    origin: '',
    destination: '',
    value: '0',
  })

  const tractors = useMemo(() => vehicles.filter((vehicle) => vehicle.vehicleType === 'Cavalo'), [vehicles])
  const trailers = useMemo(() => vehicles.filter((vehicle) => vehicle.vehicleType === 'Carreta'), [vehicles])
  const selectedTractor = tractors.find((vehicle) => vehicle.id === form.tractorId)
  const selectedTrailer = trailers.find((vehicle) => vehicle.id === form.trailerId)

  const visibleFreights = useMemo(() => {
    const term = search.toLowerCase()
    return freights.filter((freight) =>
      [freight.customer, freight.process, freight.container, freight.driver, freight.tractorPlate, freight.trailerPlate, freight.origin, freight.destination]
        .some((value) => value.toLowerCase().includes(term)),
    )
  }, [freights, search])

  function resetForm() {
    setForm({
      customer: customers[0]?.name ?? '',
      process: '',
      container: containers[0]?.number ?? '',
      driver: drivers[0]?.name ?? '',
      tractorId: tractors[0]?.id ?? '',
      trailerId: trailers[0]?.id ?? '',
      origin: '',
      destination: '',
      value: '0',
    })
  }

  function saveFreight() {
    const value = Number(form.value)
    const tractor = tractors.find((item) => item.id === form.tractorId)
    const trailer = trailers.find((item) => item.id === form.trailerId)
    if (!form.customer || !form.process || !form.driver || !tractor || value <= 0) {
      window.alert('Informe cliente, processo, motorista, cavalo e valor maior que zero.')
      return
    }

    const nextNumber = `FRT-${String(freights.length + 1).padStart(6, '0')}`
    setFreights([
      ...freights,
      {
        id: nextId('fr'),
        number: nextNumber,
        date: new Date().toISOString().slice(0, 10),
        customer: form.customer,
        process: form.process,
        container: form.container,
        driver: form.driver,
        tractorPlate: tractor.tractorPlate,
        trailerPlate: trailer?.trailerPlate ?? '',
        origin: form.origin,
        destination: form.destination,
        value,
        operationalStatus: 'Aguardando aprovação',
        fiscalStatus: 'Pendente',
      },
    ])
    setShowForm(false)
    resetForm()
  }

  function updateFreight(id: string, patch: Partial<(typeof freights)[number]>) {
    setFreights(freights.map((freight) => (freight.id === id ? { ...freight, ...patch } : freight)))
    setOpenActionId(null)
  }

  function duplicateFreight(freight: (typeof freights)[number]) {
    setFreights([...freights, { ...freight, id: nextId('fr'), number: `FRT-${String(freights.length + 1).padStart(6, '0')}`, closing: undefined }])
    setOpenActionId(null)
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-300 bg-white">
        <div className="grid gap-3 border-b border-zinc-300 p-3 md:grid-cols-6">
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-2" placeholder="Processo, cliente, motorista, placa ou contêiner" />
          <select className="border border-zinc-300 px-2 py-1.5 text-sm">
            <option>Situação</option>
            <option>Aguardando aprovação</option>
            <option>Aprovado para faturamento</option>
          </select>
          <input className="border border-zinc-300 px-2 py-1.5 text-sm" type="date" />
          <button onClick={() => setSearch('')} className="border border-zinc-400 bg-zinc-100 px-3 py-1.5 text-sm font-medium">Limpar</button>
        </div>
        <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Fretes</h2>
            <p className="text-xs text-zinc-500">Controle operacional com motorista, cavalo, carreta, contêiner e elegibilidade para fechamento.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.alert('Importação CSV será ligada ao backend na próxima etapa.')} className="border border-zinc-400 bg-white px-3 py-1.5 text-xs font-medium">Importar CSV</button>
            <button onClick={() => setShowForm(true)} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Novo frete</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="system-grid w-full min-w-[1320px] text-xs">
            <thead className="bg-zinc-50">
              <tr>
                {['Número', 'Data', 'Cliente', 'Processo', 'Contêiner', 'Motorista', 'Cavalo', 'Carreta', 'Origem', 'Destino', 'Valor', 'Operacional', 'Fiscal', 'Fechamento', 'Ações'].map((h) => (
                  <th key={h} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleFreights.map((freight) => (
                <tr key={freight.id}>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.number}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.date}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.customer}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.process}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.container || '-'}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.driver || '-'}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.tractorPlate || '-'}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.trailerPlate || '-'}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.origin || '-'}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.destination || '-'}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(freight.value)}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.operationalStatus}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.fiscalStatus}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{freight.closing || '-'}</td>
                  <td className="relative border-b border-zinc-200 px-3 py-2">
                    <button
                      onClick={() => setOpenActionId(openActionId === freight.id ? null : freight.id)}
                      className="grid h-7 w-8 place-items-center border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      aria-label={`Acoes do frete ${freight.number}`}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openActionId === freight.id && (
                      <div className="absolute right-3 top-9 z-20 w-36 border border-zinc-300 bg-white py-1 text-xs shadow-lg">
                        <button onClick={() => updateFreight(freight.id, { operationalStatus: 'Aprovado para faturamento' })} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">
                          Aprovar
                        </button>
                        <button onClick={() => duplicateFreight(freight)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">
                          Duplicar
                        </button>
                        <button onClick={() => updateFreight(freight.id, { operationalStatus: 'Cancelado' })} className="block w-full px-3 py-2 text-left text-red-700 hover:bg-zinc-100">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-6">
          <div className="system-modal max-h-[calc(100vh-48px)] w-full max-w-6xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Frete</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={saveFreight} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => setShowForm(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="grid items-start gap-x-12 gap-y-2 p-3 md:grid-cols-2">
              <div className="grid content-start grid-cols-[130px_1fr] items-center gap-1 text-xs">
                <label className="text-right text-red-600">Cliente</label>
                <select value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} className="h-7 border border-zinc-300 px-2">
                  {customers.map((customer) => <option key={customer.id}>{customer.name}</option>)}
                </select>
                <label className="text-right text-red-600">Processo</label>
                <input value={form.process} onChange={(event) => setForm({ ...form, process: event.target.value.toUpperCase() })} className="h-7 border border-zinc-300 px-2" />
                <label className="text-right">Conteiner</label>
                <select value={form.container} onChange={(event) => setForm({ ...form, container: event.target.value })} className="h-7 border border-zinc-300 px-2">
                  {containers.map((container) => <option key={container.id}>{container.number}</option>)}
                </select>
                <label className="text-right text-red-600">Motorista</label>
                <select value={form.driver} onChange={(event) => setForm({ ...form, driver: event.target.value })} className="h-7 border border-zinc-300 px-2">
                  {drivers.map((driver) => <option key={driver.id}>{driver.name}</option>)}
                </select>
              </div>
              <div className="grid content-start grid-cols-[130px_1fr] items-center gap-1 text-xs">
                <label className="text-right text-red-600">Cavalo</label>
                <select value={form.tractorId} onChange={(event) => setForm({ ...form, tractorId: event.target.value })} className="h-7 border border-zinc-300 px-2">
                  <option value="">Selecione...</option>
                  {tractors.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.tractorPlate}</option>)}
                </select>
                <label className="text-right">Carreta</label>
                <select value={form.trailerId} onChange={(event) => setForm({ ...form, trailerId: event.target.value })} className="h-7 border border-zinc-300 px-2">
                  <option value="">Selecione...</option>
                  {trailers.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.trailerPlate}</option>)}
                </select>
                <label className="text-right text-red-600">Valor</label>
                <input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} className="h-7 border border-zinc-300 px-2" type="number" />
                <label className="text-right">Composicao</label>
                <div className="h-7 border border-zinc-400 bg-white px-2 leading-7 text-zinc-700">
                  Cavalo: {selectedTractor?.tractorPlate ?? '-'} | Carreta: {selectedTrailer?.trailerPlate ?? '-'}
                </div>
              </div>
              <div className="grid content-start grid-cols-[130px_1fr] items-center gap-1 text-xs md:col-span-2">
                <label className="text-right">Origem</label>
                <input value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value.toUpperCase() })} className="h-7 border border-zinc-300 px-2" />
                <label className="text-right">Destino</label>
                <input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value.toUpperCase() })} className="h-7 border border-zinc-300 px-2" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
