import { useMemo, useState } from 'react'
import { formatMoney, nextId } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'

export function FreightsPage() {
  const { customers, drivers, vehicles, containers, freights, setFreights } = useLocalData()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
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

        {showForm && (
          <div className="grid gap-3 border-b border-zinc-300 bg-zinc-50 p-3 md:grid-cols-8">
            <select value={form.customer} onChange={(event) => setForm({ ...form, customer: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-2">
              {customers.map((customer) => <option key={customer.id}>{customer.name}</option>)}
            </select>
            <input value={form.process} onChange={(event) => setForm({ ...form, process: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Processo" />
            <select value={form.container} onChange={(event) => setForm({ ...form, container: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm">
              {containers.map((container) => <option key={container.id}>{container.number}</option>)}
            </select>
            <select value={form.driver} onChange={(event) => setForm({ ...form, driver: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm">
              {drivers.map((driver) => <option key={driver.id}>{driver.name}</option>)}
            </select>
            <select value={form.tractorId} onChange={(event) => setForm({ ...form, tractorId: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="">Cavalo</option>
              {tractors.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.tractorPlate}</option>)}
            </select>
            <select value={form.trailerId} onChange={(event) => setForm({ ...form, trailerId: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="">Carreta</option>
              {trailers.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.trailerPlate}</option>)}
            </select>
            <input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" type="number" placeholder="Valor" />
            <input value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-2" placeholder="Origem" />
            <input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-2" placeholder="Destino" />
            <div className="border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-600 md:col-span-2">
              Cavalo: {selectedTractor?.tractorPlate ?? '-'} | Carreta: {selectedTrailer?.trailerPlate ?? '-'}
            </div>
            <div className="flex gap-2 md:col-span-2">
              <button onClick={saveFreight} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">Salvar</button>
              <button onClick={() => setShowForm(false)} className="border border-zinc-400 bg-white px-3 py-1.5 text-sm font-medium">Cancelar</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-sm">
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
                  <td className="border-b border-zinc-200 px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => updateFreight(freight.id, { operationalStatus: 'Aprovado para faturamento' })} className="border border-zinc-300 px-2 py-1 text-xs">Aprovar</button>
                      <button onClick={() => setFreights([...freights, { ...freight, id: nextId('fr'), number: `FRT-${String(freights.length + 1).padStart(6, '0')}`, closing: undefined }])} className="border border-zinc-300 px-2 py-1 text-xs">Duplicar</button>
                      <button onClick={() => updateFreight(freight.id, { operationalStatus: 'Cancelado' })} className="border border-zinc-300 px-2 py-1 text-xs text-red-700">Cancelar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
