import { useMemo, useState } from 'react'
import { useLocalData } from '../hooks/useLocalData'
import { nextId, type Vehicle } from '../services/localStore'

type VehicleType = 'Cavalo' | 'Carreta'

type VehicleForm = {
  vehicleType: VehicleType
  plate: string
  rntrc: string
  owner: string
  carrier: string
  capacity: string
}

const emptyForm: VehicleForm = {
  vehicleType: 'Cavalo',
  plate: '',
  rntrc: '',
  owner: 'Transcavalcante',
  carrier: 'Transcavalcante',
  capacity: '',
}

export function VehiclesPage() {
  const { vehicles, setVehicles } = useLocalData()
  const [activeTab, setActiveTab] = useState<VehicleType>('Cavalo')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<VehicleForm>(emptyForm)

  const tractors = useMemo(() => vehicles.filter((vehicle) => vehicle.vehicleType === 'Cavalo'), [vehicles])
  const trailers = useMemo(() => vehicles.filter((vehicle) => vehicle.vehicleType === 'Carreta'), [vehicles])

  const activeRows = activeTab === 'Cavalo' ? tractors : trailers
  const activeTitle = activeTab === 'Cavalo' ? 'Cavalos mecanicos' : 'Carretas'
  const activeDescription = activeTab === 'Cavalo'
    ? 'Unidades de tracao cadastradas para operacao.'
    : 'Equipamentos vinculados separadamente do cavalo.'

  function openForm(type = activeTab) {
    setForm({ ...emptyForm, vehicleType: type })
    setShowForm(true)
  }

  function changeTab(type: VehicleType) {
    setActiveTab(type)
    setShowForm(false)
    setForm({ ...emptyForm, vehicleType: type })
  }

  function saveVehicle() {
    if (!form.plate) {
      window.alert('Informe a placa.')
      return
    }

    const vehicle: Vehicle = {
      id: nextId(form.vehicleType === 'Cavalo' ? 'cav' : 'car'),
      vehicleType: form.vehicleType,
      tractorPlate: form.vehicleType === 'Cavalo' ? form.plate : '',
      trailerPlate: form.vehicleType === 'Carreta' ? form.plate : '',
      type: form.vehicleType === 'Cavalo' ? 'Cavalo mecanico' : 'Carreta porta-conteiner',
      rntrc: form.rntrc,
      owner: form.owner,
      carrier: form.carrier,
      capacity: form.capacity,
      status: 'Ativo',
    }

    setVehicles([...vehicles, vehicle])
    setShowForm(false)
    setForm({ ...emptyForm, vehicleType: activeTab })
  }

  function renderTable(rows: Vehicle[]) {
    return (
      <section className="border border-zinc-300 bg-white">
        <div className="border-b border-zinc-300 px-4 py-3">
          <h3 className="text-sm font-semibold">{activeTitle}</h3>
          <p className="text-xs text-zinc-500">{activeDescription}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-zinc-50">
              <tr>
                {['Placa', 'Tipo', 'RNTRC', 'Proprietario', 'Transportadora', 'Capacidade', 'Situacao', 'Acoes'].map((heading) => (
                  <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((vehicle) => {
                const plate = vehicle.vehicleType === 'Cavalo' ? vehicle.tractorPlate : vehicle.trailerPlate
                return (
                  <tr key={vehicle.id}>
                    <td className="border-b border-zinc-200 px-3 py-2 font-medium">{plate}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{vehicle.type}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{vehicle.rntrc || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{vehicle.owner || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{vehicle.carrier || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{vehicle.capacity || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2 text-emerald-700">{vehicle.status}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">
                      <button onClick={() => window.alert(`${vehicle.vehicleType}: ${plate}`)} className="border border-zinc-300 px-2 py-1 text-xs">
                        Ver
                      </button>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="border-b border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">
                    Nenhum cadastro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-300 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Veiculos</h2>
            <p className="text-xs text-zinc-500">Cadastre cavalos e carretas em abas separadas. A composicao e escolhida depois no frete.</p>
          </div>
          <button onClick={() => openForm()} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
            Novo cadastro
          </button>
        </div>

        <div className="flex border-b border-zinc-300 bg-zinc-50 px-4 pt-3">
          {[
            { type: 'Cavalo' as const, label: 'Cavalos mecanicos', count: tractors.length },
            { type: 'Carreta' as const, label: 'Carretas', count: trailers.length },
          ].map((tab) => {
            const selected = activeTab === tab.type
            return (
              <button
                key={tab.type}
                onClick={() => changeTab(tab.type)}
                className={`border border-b-0 px-4 py-2 text-sm font-medium ${
                  selected
                    ? 'border-zinc-300 bg-white text-zinc-950'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-xs ${selected ? 'text-zinc-500' : 'text-zinc-400'}`}>{tab.count}</span>
              </button>
            )
          })}
        </div>

        {showForm && (
          <div className="grid gap-3 border-b border-zinc-300 bg-zinc-50 p-3 md:grid-cols-7">
            <div className="border border-zinc-300 bg-white px-2 py-1.5 text-sm font-medium">{form.vehicleType}</div>
            <input
              value={form.plate}
              onChange={(event) => setForm({ ...form, plate: event.target.value.toUpperCase() })}
              className="border border-zinc-300 px-2 py-1.5 text-sm"
              placeholder={form.vehicleType === 'Cavalo' ? 'Placa do cavalo' : 'Placa da carreta'}
            />
            <input value={form.rntrc} onChange={(event) => setForm({ ...form, rntrc: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="RNTRC" />
            <input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Proprietario" />
            <input value={form.carrier} onChange={(event) => setForm({ ...form, carrier: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Transportadora" />
            <input value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Capacidade" />
            <div className="flex gap-2">
              <button onClick={saveVehicle} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">Salvar</button>
              <button onClick={() => setShowForm(false)} className="border border-zinc-400 bg-white px-3 py-1.5 text-sm font-medium">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {renderTable(activeRows)}
    </div>
  )
}
