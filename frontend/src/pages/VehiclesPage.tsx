import { useMemo, useState } from 'react'
import { Check, Pencil, Save, Search, Trash2, X } from 'lucide-react'
import { useLocalData } from '../hooks/useLocalData'
import { nextId, type Vehicle } from '../services/localStore'

type VehicleType = 'Cavalo' | 'Carreta'

const vehicleCatalog = [
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

  const catalog = vehicleCatalog.find((item) => item.vehicleType === type) ?? vehicleCatalog[0]
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
  const { vehicles, setVehicles } = useLocalData()
  const [activeTab, setActiveTab] = useState<VehicleType>('Cavalo')
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [modalTab, setModalTab] = useState('GERAL')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    return vehicles
      .filter((vehicle) => vehicle.vehicleType === activeTab)
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
  }, [activeTab, query, vehicles])

  const tractorsCount = vehicles.filter((vehicle) => vehicle.vehicleType === 'Cavalo').length
  const trailersCount = vehicles.filter((vehicle) => vehicle.vehicleType === 'Carreta').length

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

  function saveVehicle(closeAfterSave = true) {
    if (!editing) return
    const plate = plateOf(editing).trim()
    if (!plate) {
      window.alert('Informe a placa.')
      return
    }

    const normalized = {
      ...editing,
      tractorPlate: editing.vehicleType === 'Cavalo' ? plate.toUpperCase() : '',
      trailerPlate: editing.vehicleType === 'Carreta' ? plate.toUpperCase() : '',
      type: editing.fleetType || editing.description || editing.type,
      status: editing.status || 'Ativo',
    }

    const exists = vehicles.some((vehicle) => vehicle.id === normalized.id)
    setVehicles(exists ? vehicles.map((vehicle) => vehicle.id === normalized.id ? normalized : vehicle) : [...vehicles, normalized])
    if (closeAfterSave) setEditing(null)
  }

  function deleteVehicle(vehicle: Vehicle) {
    if (window.confirm(`Excluir veiculo ${plateOf(vehicle)}?`)) {
      setVehicles(vehicles.filter((item) => item.id !== vehicle.id))
      setEditing(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="border border-zinc-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Frota de veiculos</h2>
            <p className="text-xs text-zinc-500">Cadastro de cavalos, carretas, proprietarios, documentos e licenciamento.</p>
          </div>
          <button onClick={() => setEditing(openVehicle(activeTab))} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
            Novo veiculo
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 bg-zinc-50 px-4 py-2">
          <div className="flex">
            {[
              { type: 'Cavalo' as const, label: 'Cavalos mecanicos', count: tractorsCount },
              { type: 'Carreta' as const, label: 'Carretas', count: trailersCount },
            ].map((tab) => (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`border px-4 py-2 text-sm font-medium ${activeTab === tab.type ? 'border-zinc-300 bg-white text-zinc-950' : 'border-transparent text-zinc-500'}`}
              >
                {tab.label} <span className="text-xs text-zinc-500">{tab.count}</span>
              </button>
            ))}
          </div>
          <label className="flex h-8 items-center border border-zinc-300 bg-white px-2 text-xs text-zinc-500">
            <Search size={15} className="mr-2" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-full w-64 border-0 p-0 outline-none" placeholder="Buscar na frota" />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1320px] text-xs">
            <thead className="bg-zinc-100">
              <tr>
                {['Numero', 'Tipo de frota', 'Descricao', 'Dt. vencimento GR', 'Placa', 'Proprietario', 'CNPJ/CPF propriet.', 'Marca', 'Modelo', 'Ano/Modelo', 'Chassi', 'Acoes'].map((heading) => (
                  <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-sky-50">
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
                  <td className="border-b border-zinc-200 px-2 py-1">
                    <button onClick={() => setEditing(openVehicle(activeTab, vehicle))} className="border border-zinc-300 bg-white px-2 py-1" title="Editar">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="border-b border-zinc-200 px-3 py-8 text-center text-sm text-zinc-500">
                    Nenhum veiculo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-8">
          <div className="max-h-[calc(100vh-64px)] w-full max-w-6xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Frota (veiculo)</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => saveVehicle(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
                <button onClick={() => saveVehicle(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => deleteVehicle(editing)} className="inline-flex items-center gap-1"><Trash2 size={15} /> EXCLUIR</button>
                <button onClick={() => setEditing(null)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-110px)] overflow-y-auto p-2">
              <div className="grid gap-x-12 gap-y-2 md:grid-cols-2">
                <div className="grid grid-cols-[132px_1fr] items-center gap-1 text-xs">
                  <label className="text-right text-red-600">Relacao</label>
                  <select value={editing.fleetRelation} onChange={(event) => updateEditing('fleetRelation', event.target.value)} className="h-7 border border-zinc-300 px-2">
                    <option>Equiparado</option>
                    <option>TAC</option>
                    <option>ETC</option>
                    <option>Proprio</option>
                  </select>
                  <label className="text-right text-red-600">Codigo</label>
                  <input value={editing.fleetNumber} onChange={(event) => updateEditing('fleetNumber', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Tipo de frota</label>
                  <select value={editing.description} onChange={(event) => updateEditing('description', event.target.value)} className="h-7 border border-zinc-300 px-2">
                    {vehicleCatalog.map((item) => <option key={item.description}>{item.description}</option>)}
                  </select>
                  <label className="text-right text-red-600">Marca</label>
                  <input value={editing.brand} onChange={(event) => updateEditing('brand', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Modelo</label>
                  <input value={editing.model} onChange={(event) => updateEditing('model', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                </div>

                <div className="grid grid-cols-[132px_1fr] items-center gap-1 text-xs">
                  <label className="text-right">Numero</label>
                  <input value={editing.fleetNumber} onChange={(event) => updateEditing('fleetNumber', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">Desativar?</label>
                  <input type="checkbox" checked={editing.status !== 'Ativo'} onChange={(event) => updateEditing('status', event.target.checked ? 'Inativo' : 'Ativo')} className="h-4 w-4" />
                  <label />
                  <div className="flex h-7 items-center gap-2 border border-zinc-400 bg-white px-2 text-emerald-700"><Check size={15} /> Registro ativo</div>
                  <label className="text-right text-red-600">Placa</label>
                  <input value={plateOf(editing)} onChange={(event) => updateEditing(editing.vehicleType === 'Cavalo' ? 'tractorPlate' : 'trailerPlate', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Cidade emplacamento</label>
                  <input value={editing.cityPlate} onChange={(event) => updateEditing('cityPlate', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">UF emplacamento</label>
                  <input value={editing.statePlate} onChange={(event) => updateEditing('statePlate', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" maxLength={2} />
                </div>
              </div>

              <div className="mt-6 flex border-b border-zinc-400 text-xs">
                {['GERAL', 'DOCUMENTOS', 'SEGURO', 'COMPRA', 'OBSERVACAO', 'LICENCIAMENTOS'].map((tab) => (
                  <button key={tab} onClick={() => setModalTab(tab)} className={`border border-b-0 px-3 py-1 ${modalTab === tab ? 'bg-zinc-300' : 'border-transparent bg-zinc-100'}`}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="grid gap-x-16 gap-y-2 border-b border-zinc-500 py-2 md:grid-cols-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-1 text-xs">
                  <label className="text-right">Combustivel</label>
                  <select className="h-7 border border-zinc-300 px-2"><option>Selecione...</option><option>Diesel</option></select>
                  <label className="text-right text-red-600">Ano/Modelo</label>
                  <input value={editing.yearModel} onChange={(event) => updateEditing('yearModel', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Ano/Fabricacao</label>
                  <input value={editing.manufactureYear} onChange={(event) => updateEditing('manufactureYear', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Cor</label>
                  <input value={editing.color} onChange={(event) => updateEditing('color', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Qt. eixos</label>
                  <input value={editing.axles} onChange={(event) => updateEditing('axles', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">CNPJ/CPF</label>
                  <input value={editing.ownerDocument} onChange={(event) => updateEditing('ownerDocument', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Proprietario</label>
                  <input value={editing.owner} onChange={(event) => updateEditing('owner', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-1 text-xs">
                  <label className="text-right text-red-600">Chassi</label>
                  <input value={editing.chassis} onChange={(event) => updateEditing('chassis', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">Renavam</label>
                  <input value={editing.renavam} onChange={(event) => updateEditing('renavam', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">RNTRC</label>
                  <input value={editing.rntrc} onChange={(event) => updateEditing('rntrc', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">Tara</label>
                  <input value={editing.tare} onChange={(event) => updateEditing('tare', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Capacidade em kg</label>
                  <input value={editing.capacityKg || editing.capacity} onChange={(event) => updateEditing('capacityKg', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right text-red-600">Tipo de carroceria</label>
                  <input value={editing.denatranType} onChange={(event) => updateEditing('denatranType', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                </div>
              </div>

              <div className="grid gap-x-16 gap-y-2 pt-2 md:grid-cols-2">
                <div className="grid grid-cols-[140px_1fr] items-center gap-1 text-xs">
                  <label className="text-right">Utiliza rastreador</label>
                  <input type="checkbox" checked={editing.trackerUsed} onChange={(event) => updateEditing('trackerUsed', event.target.checked)} className="h-4 w-4" />
                  <label className="text-right">Marca</label>
                  <input value={editing.trackerBrand} onChange={(event) => updateEditing('trackerBrand', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">Nr. protocolo</label>
                  <input value={editing.trackerProtocol} onChange={(event) => updateEditing('trackerProtocol', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">Frota SM</label>
                  <input value={editing.smFleet} onChange={(event) => updateEditing('smFleet', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                </div>

                <div className="grid grid-cols-[140px_1fr] items-center gap-1 text-xs">
                  <label className="text-right">Tecnologia</label>
                  <input className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">Modelo</label>
                  <input className="h-7 border border-zinc-300 px-2" />
                  <label className="text-right">Dt. validade</label>
                  <input type="date" value={editing.grExpiration} onChange={(event) => updateEditing('grExpiration', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[140px_1fr_120px_1fr] items-center gap-1 border-t border-zinc-500 pt-2 text-xs">
                <label className="text-right">Condutor</label>
                <input value={editing.driver} onChange={(event) => updateEditing('driver', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                <label className="text-right">Placa</label>
                <input value={plateOf(editing)} readOnly className="h-7 border border-zinc-300 bg-zinc-200 px-2" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
