import { useMemo, useState } from 'react'
import { Check, Info, MoreVertical, Paperclip, Save, Settings, X } from 'lucide-react'
import { formatMoney, nextId } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'

const freightTabs = [
  'GERAIS',
  'ROTA',
  'SERVICOS',
  'VALE PEDAGIO',
  'CONTAINERS',
  'CONTROLE DE DATAS',
  'DESPESAS PREVISTAS',
  'DESPESAS EXTRAS',
  'NOTAS FISCAIS',
  'SM',
  'DFE',
  'CIOT',
  'PROTOCOLO',
] as const

type FreightTab = typeof freightTabs[number]

type FreightForm = {
  customer: string
  process: string
  processType: string
  status: string
  customerIdentification: string
  serviceTakerDocument: string
  serviceTaker: string
  senderDocument: string
  sender: string
  product: string
  recipientDocument: string
  recipient: string
  urgent: boolean
  consolidateCargo: boolean
  routeName: string
  origin: string
  destination: string
  originLatitude: string
  originLongitude: string
  destinationLatitude: string
  destinationLongitude: string
  originZipCode: string
  destinationZipCode: string
  distance: string
  contractorDocument: string
  contractor: string
  negotiationCondition: string
  driver: string
  helper: string
  auxiliaryDriver: string
  tractorId: string
  trailerId: string
  auxiliaryPlate: string
  tollTag: string
  container: string
  cargoType: string
  shippingLineDocument: string
  shippingLine: string
  vessel: string
  tripNumber: string
  booking: string
  terminalEmpty: string
  terminalReturn: string
  deliveryForecast: string
  arrivalDate: string
  cntrUnloadingDate: string
  documentReleaseDate: string
  portWithdrawalDate: string
  destinationScheduleDate: string
  destinationScheduleTime: string
  destinationArrivalDate: string
  destinationArrivalTime: string
  destinationDepartureDate: string
  destinationDepartureTime: string
  cntrReturnDate: string
  plannedFreightCost: string
  plannedTollCost: string
  extraCost: string
  invoiceNumber: string
  invoiceValue: string
  smNumber: string
  ciotNumber: string
  dfeNumber: string
  protocolStatus: string
  value: string
}

const emptyForm: FreightForm = {
  customer: '',
  process: '',
  processType: 'Multimodal [M]',
  status: 'Em digitacao',
  customerIdentification: '',
  serviceTakerDocument: '',
  serviceTaker: '',
  senderDocument: '',
  sender: '',
  product: 'FRETE-MANAUS-BOA VISTA',
  recipientDocument: '',
  recipient: '',
  urgent: false,
  consolidateCargo: false,
  routeName: '',
  origin: '',
  destination: '',
  originLatitude: '0,0000000',
  originLongitude: '0,0000000',
  destinationLatitude: '0,0000000',
  destinationLongitude: '0,0000000',
  originZipCode: '',
  destinationZipCode: '',
  distance: '0,0000',
  contractorDocument: '',
  contractor: '',
  negotiationCondition: '7 DIAS [A] (per D)',
  driver: '',
  helper: '',
  auxiliaryDriver: '',
  tractorId: '',
  trailerId: '',
  auxiliaryPlate: '',
  tollTag: '',
  container: '',
  cargoType: 'CONTAINER',
  shippingLineDocument: '',
  shippingLine: '',
  vessel: '',
  tripNumber: '',
  booking: '',
  terminalEmpty: '',
  terminalReturn: '',
  deliveryForecast: '',
  arrivalDate: '',
  cntrUnloadingDate: '',
  documentReleaseDate: '',
  portWithdrawalDate: '',
  destinationScheduleDate: '',
  destinationScheduleTime: '',
  destinationArrivalDate: '',
  destinationArrivalTime: '',
  destinationDepartureDate: '',
  destinationDepartureTime: '',
  cntrReturnDate: '',
  plannedFreightCost: '0',
  plannedTollCost: '0',
  extraCost: '0',
  invoiceNumber: '',
  invoiceValue: '0',
  smNumber: '',
  ciotNumber: '',
  dfeNumber: '',
  protocolStatus: 'Aguardando',
  value: '0',
}

function textInputClass(disabled = false) {
  return `h-7 border border-zinc-300 px-2 text-xs outline-none ${disabled ? 'bg-zinc-200 text-zinc-500' : 'bg-white focus:border-zinc-500'}`
}

function Field({
  label,
  children,
  required = false,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label className="grid grid-cols-[135px_1fr] items-center gap-1 text-xs">
      <span className={`text-right ${required ? 'text-red-600' : 'text-zinc-900'}`}>{label}</span>
      {children}
    </label>
  )
}

function EmptyGridMessage({ text }: { text: string }) {
  return (
    <div className="grid h-56 place-items-center bg-white text-xs text-zinc-700">
      <div className="flex items-center gap-2">
        <Info size={25} />
        <span>{text}</span>
      </div>
    </div>
  )
}

export function FreightsPage() {
  const { customers, drivers, vehicles, containers, freights, setFreights } = useLocalData()
  const canEditPage = canEdit('freights')
  const [showForm, setShowForm] = useState(false)
  const [editingFreightId, setEditingFreightId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FreightTab>('GERAIS')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    processNumber: '',
    processCode: '',
    dateStart: '',
    dateEnd: '',
    processDescription: '',
    status: '',
    supplier: '',
    processType: '',
    container: '',
    originDateStart: '',
    originDateEnd: '',
  })
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [form, setForm] = useState<FreightForm>({
    ...emptyForm,
    customer: customers[0]?.name ?? '',
    serviceTaker: customers[0]?.name ?? '',
    recipient: customers[0]?.name ?? '',
    driver: drivers[0]?.name ?? '',
    tractorId: vehicles.find((vehicle) => vehicle.vehicleType === 'Cavalo')?.id ?? '',
    trailerId: vehicles.find((vehicle) => vehicle.vehicleType === 'Carreta')?.id ?? '',
    container: containers[0]?.number ?? '',
  })

  const tractors = useMemo(() => vehicles.filter((vehicle) => vehicle.vehicleType === 'Cavalo'), [vehicles])
  const trailers = useMemo(() => vehicles.filter((vehicle) => vehicle.vehicleType === 'Carreta'), [vehicles])
  const selectedTractor = tractors.find((vehicle) => vehicle.id === form.tractorId)
  const selectedTrailer = trailers.find((vehicle) => vehicle.id === form.trailerId)
  const selectedContainer = containers.find((container) => container.number === form.container)

  const generalReady = Boolean(form.process && form.processType && form.customer && form.serviceTaker)
  const routeReady = Boolean(form.routeName && form.origin && form.destination)
  const serviceReady = Boolean(generalReady && routeReady && form.driver && form.tractorId)
  const containerReady = Boolean(serviceReady && form.container)
  const datesReady = Boolean(containerReady && form.deliveryForecast && form.destinationScheduleDate)
  const fiscalReady = Boolean(containerReady && (form.invoiceNumber || form.dfeNumber))

  const tabAvailability: Record<FreightTab, boolean> = {
    GERAIS: true,
    ROTA: true,
    SERVICOS: generalReady && routeReady,
    'VALE PEDAGIO': serviceReady,
    CONTAINERS: serviceReady,
    'CONTROLE DE DATAS': containerReady,
    'DESPESAS PREVISTAS': datesReady,
    'DESPESAS EXTRAS': datesReady,
    'NOTAS FISCAIS': containerReady,
    SM: serviceReady,
    DFE: fiscalReady,
    CIOT: serviceReady,
    PROTOCOLO: fiscalReady || datesReady,
  }

  const visibleFreights = useMemo(() => {
    const term = search.toLowerCase()
    return freights.filter((freight) =>
      [freight.customer, freight.process, freight.container, freight.driver, freight.tractorPlate, freight.trailerPlate, freight.origin, freight.destination]
        .some((value) => value.toLowerCase().includes(term))
      && (!filters.processNumber || freight.number.toLowerCase().includes(filters.processNumber.toLowerCase()))
      && (!filters.processCode || freight.process.toLowerCase().includes(filters.processCode.toLowerCase()))
      && (!filters.processDescription || [freight.customer, freight.origin, freight.destination].join(' ').toLowerCase().includes(filters.processDescription.toLowerCase()))
      && (!filters.status || freight.operationalStatus.toLowerCase().includes(filters.status.toLowerCase()))
      && (!filters.supplier || freight.customer.toLowerCase().includes(filters.supplier.toLowerCase()))
      && (!filters.container || freight.container.toLowerCase().includes(filters.container.toLowerCase()))
      && (!filters.dateStart || freight.date >= filters.dateStart)
      && (!filters.dateEnd || freight.date <= filters.dateEnd),
    )
  }, [filters, freights, search])

  function updateForm(field: keyof FreightForm, value: string | boolean) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'origin' || field === 'destination') {
        next.routeName = `${field === 'origin' ? value : next.origin} X ${field === 'destination' ? value : next.destination}`.replace(/^ X | X $/g, '')
      }
      if (field === 'customer') {
        next.serviceTaker = String(value)
        next.recipient = next.recipient || String(value)
      }
      return next
    })
  }

  function resetForm() {
    setEditingFreightId(null)
    setForm({
      ...emptyForm,
      customer: customers[0]?.name ?? '',
      serviceTaker: customers[0]?.name ?? '',
      recipient: customers[0]?.name ?? '',
      driver: drivers[0]?.name ?? '',
      tractorId: tractors[0]?.id ?? '',
      trailerId: trailers[0]?.id ?? '',
      container: containers[0]?.number ?? '',
    })
    setActiveTab('GERAIS')
  }

  function openNewFreight() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    resetForm()
    setShowForm(true)
  }

  function openFreightDetail(freight: (typeof freights)[number]) {
    const tractor = tractors.find((vehicle) => vehicle.tractorPlate === freight.tractorPlate)
    const trailer = trailers.find((vehicle) => vehicle.trailerPlate === freight.trailerPlate)
    setEditingFreightId(freight.id)
    setForm({
      ...emptyForm,
      customer: freight.customer,
      process: freight.process,
      status: freight.operationalStatus,
      serviceTaker: freight.customer,
      recipient: freight.customer,
      routeName: `${freight.origin || ''} X ${freight.destination || ''}`.replace(/^ X | X $/g, ''),
      origin: freight.origin,
      destination: freight.destination,
      driver: freight.driver,
      tractorId: tractor?.id ?? '',
      trailerId: trailer?.id ?? '',
      container: freight.container,
      plannedFreightCost: String(freight.value),
      value: String(freight.value),
    })
    setActiveTab('GERAIS')
    setShowForm(true)
  }

  function selectTab(tab: FreightTab) {
    if (tabAvailability[tab]) {
      setActiveTab(tab)
      return
    }
    window.alert('Preencha as etapas anteriores para liberar esta aba.')
  }

  function saveFreight(closeAfterSave = true) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const value = Number(form.value || form.plannedFreightCost || 0)
    const tractor = tractors.find((item) => item.id === form.tractorId)
    const trailer = trailers.find((item) => item.id === form.trailerId)
    if (!generalReady || !routeReady || !form.driver || !tractor || value <= 0) {
      window.alert('Informe GERAIS, ROTA, motorista, cavalo e valor maior que zero.')
      return
    }

    const nextRecord = {
        id: nextId('fr'),
        number: `FRT-${String(freights.length + 1).padStart(6, '0')}`,
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
        operationalStatus: 'Aguardando aprovacao',
        fiscalStatus: 'Pendente',
    }

    setFreights(editingFreightId
      ? freights.map((freight) => freight.id === editingFreightId ? {
        ...freight,
        customer: nextRecord.customer,
        process: nextRecord.process,
        container: nextRecord.container,
        driver: nextRecord.driver,
        tractorPlate: nextRecord.tractorPlate,
        trailerPlate: nextRecord.trailerPlate,
        origin: nextRecord.origin,
        destination: nextRecord.destination,
        value: nextRecord.value,
        operationalStatus: form.status || freight.operationalStatus,
      } : freight)
      : [...freights, nextRecord],
    )

    if (closeAfterSave) {
      setShowForm(false)
      resetForm()
    }
  }

  function updateFreight(id: string, patch: Partial<(typeof freights)[number]>) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setFreights(freights.map((freight) => (freight.id === id ? { ...freight, ...patch } : freight)))
    setOpenActionId(null)
  }

  function duplicateFreight(freight: (typeof freights)[number]) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setFreights([...freights, { ...freight, id: nextId('fr'), number: `FRT-${String(freights.length + 1).padStart(6, '0')}`, closing: undefined }])
    setOpenActionId(null)
  }

  function renderActiveTab() {
    if (activeTab === 'GERAIS') {
      return (
        <div className="grid gap-x-20 gap-y-1 p-3 md:grid-cols-2">
          <div className="grid gap-1">
            <Field label="Codigo do processo" required><input value={form.process} onChange={(event) => updateForm('process', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            <Field label="Situacao"><input value={form.status} onChange={(event) => updateForm('status', event.target.value)} className={textInputClass()} /></Field>
            <Field label="CNPJ/CPF"><input value={form.serviceTakerDocument} onChange={(event) => updateForm('serviceTakerDocument', event.target.value)} className={textInputClass()} /></Field>
            <Field label="Tomador do servico" required><input value={form.serviceTaker} onChange={(event) => updateForm('serviceTaker', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            <Field label="CNPJ/CPF"><input value={form.senderDocument} onChange={(event) => updateForm('senderDocument', event.target.value)} className={textInputClass()} /></Field>
            <Field label="Remetente"><input value={form.sender} onChange={(event) => updateForm('sender', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            <label className="ml-[140px] flex items-center gap-2 text-xs"><input type="checkbox" checked={form.consolidateCargo} onChange={(event) => updateForm('consolidateCargo', event.target.checked)} /> Consolidar carga?</label>
          </div>
          <div className="grid gap-1">
            <Field label="Tipo processo" required>
              <select value={form.processType} onChange={(event) => updateForm('processType', event.target.value)} className={textInputClass()}>
                <option>Multimodal [M]</option>
                <option>Rodoviario [R]</option>
                <option>Container [C]</option>
              </select>
            </Field>
            <Field label="Identificacao do cliente"><input value={form.customerIdentification} onChange={(event) => updateForm('customerIdentification', event.target.value)} className={textInputClass()} /></Field>
            <Field label="Cliente" required>
              <select value={form.customer} onChange={(event) => updateForm('customer', event.target.value)} className={textInputClass()}>
                <option value="">Selecione...</option>
                {customers.map((customer) => <option key={customer.id}>{customer.name}</option>)}
              </select>
            </Field>
            <Field label="Produto"><input value={form.product} onChange={(event) => updateForm('product', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            <Field label="CNPJ/CPF"><input value={form.recipientDocument} onChange={(event) => updateForm('recipientDocument', event.target.value)} className={textInputClass()} /></Field>
            <Field label="Destinatario"><input value={form.recipient} onChange={(event) => updateForm('recipient', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            <label className="ml-[140px] flex items-center gap-2 text-xs"><input type="checkbox" checked={form.urgent} onChange={(event) => updateForm('urgent', event.target.checked)} /> Urgente?</label>
          </div>
        </div>
      )
    }

    if (activeTab === 'ROTA') {
      return (
        <div className="p-3">
          <Field label="Rota" required><input value={form.routeName} onChange={(event) => updateForm('routeName', event.target.value.toUpperCase())} className={`${textInputClass()} max-w-md`} /></Field>
          <div className="mt-3 border border-zinc-300 bg-white p-3">
            <div className="grid gap-x-20 gap-y-2 md:grid-cols-2">
              <div className="grid gap-1">
                <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">ORIGEM</div>
                <Field label="Porto/Cidade origem" required><input value={form.origin} onChange={(event) => updateForm('origin', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                <Field label="Latitude"><input value={form.originLatitude} onChange={(event) => updateForm('originLatitude', event.target.value)} className={textInputClass()} /></Field>
                <Field label="Longitude"><input value={form.originLongitude} onChange={(event) => updateForm('originLongitude', event.target.value)} className={textInputClass()} /></Field>
                <Field label="CEP"><input value={form.originZipCode} onChange={(event) => updateForm('originZipCode', event.target.value)} className={textInputClass()} /></Field>
              </div>
              <div className="grid gap-1">
                <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">DESTINO</div>
                <Field label="Porto/Cidade destino" required><input value={form.destination} onChange={(event) => updateForm('destination', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                <Field label="Latitude"><input value={form.destinationLatitude} onChange={(event) => updateForm('destinationLatitude', event.target.value)} className={textInputClass()} /></Field>
                <Field label="Longitude"><input value={form.destinationLongitude} onChange={(event) => updateForm('destinationLongitude', event.target.value)} className={textInputClass()} /></Field>
                <Field label="CEP"><input value={form.destinationZipCode} onChange={(event) => updateForm('destinationZipCode', event.target.value)} className={textInputClass()} /></Field>
              </div>
            </div>
            <div className="mt-5 max-w-xl border-t border-zinc-400 pt-3">
              <Field label="Distancia percorrida"><input value={form.distance} onChange={(event) => updateForm('distance', event.target.value)} className={textInputClass()} /></Field>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'SERVICOS') {
      return (
        <div className="p-3">
          <div className="grid gap-x-24 gap-y-1 md:grid-cols-2">
            <div className="grid gap-1">
              <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">CONTRATADO</div>
              <Field label="CNPJ/CPF"><input value={form.contractorDocument} onChange={(event) => updateForm('contractorDocument', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Contratado"><input value={form.contractor} onChange={(event) => updateForm('contractor', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Operador da origem"><input className={textInputClass()} /></Field>
              <Field label="Condicao de negociacao"><select value={form.negotiationCondition} onChange={(event) => updateForm('negotiationCondition', event.target.value)} className={textInputClass()}><option>7 DIAS [A] (per D)</option><option>A vista</option><option>15 DIAS</option></select></Field>
            </div>
          </div>
          <div className="mt-4 grid gap-x-24 gap-y-1 border-t border-zinc-400 pt-3 md:grid-cols-2">
            <div className="grid gap-1">
              <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">CONDUTORES</div>
              <Field label="Motorista" required><select value={form.driver} onChange={(event) => updateForm('driver', event.target.value)} className={textInputClass()}><option value="">Selecione...</option>{drivers.map((driver) => <option key={driver.id}>{driver.name}</option>)}</select></Field>
              <Field label="Ajudante"><input value={form.helper} onChange={(event) => updateForm('helper', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Motorista auxiliar"><input value={form.auxiliaryDriver} onChange={(event) => updateForm('auxiliaryDriver', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
          </div>
          <div className="mt-4 grid gap-x-24 gap-y-1 border-t border-zinc-400 pt-3 md:grid-cols-2">
            <div className="grid gap-1">
              <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">FROTAS</div>
              <Field label="Placa" required><select value={form.tractorId} onChange={(event) => updateForm('tractorId', event.target.value)} className={textInputClass()}><option value="">Selecione...</option>{tractors.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.tractorPlate}</option>)}</select></Field>
              <Field label="Veiculo trator"><input value={selectedTractor?.description || selectedTractor?.type || ''} className={textInputClass(true)} disabled /></Field>
              <Field label="Tag de pedagio"><input value={form.tollTag} onChange={(event) => updateForm('tollTag', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Placa"><select value={form.trailerId} onChange={(event) => updateForm('trailerId', event.target.value)} className={textInputClass()}><option value="">Selecione...</option>{trailers.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.trailerPlate}</option>)}</select></Field>
              <Field label="Veiculo reboque"><input value={selectedTrailer?.description || selectedTrailer?.type || ''} className={textInputClass(true)} disabled /></Field>
              <Field label="Placa"><input value={form.auxiliaryPlate} onChange={(event) => updateForm('auxiliaryPlate', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'CONTAINERS') {
      return (
        <div className="p-3">
          <div className="grid gap-x-24 gap-y-1 md:grid-cols-2">
            <div className="grid gap-1">
              <Field label="Tipo de carga"><input value={form.cargoType} onChange={(event) => updateForm('cargoType', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
              <Field label="CNPJ/CPF"><input value={form.shippingLineDocument} onChange={(event) => updateForm('shippingLineDocument', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Armador"><input value={form.shippingLine} onChange={(event) => updateForm('shippingLine', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
              <Field label="Navio"><input value={form.vessel} onChange={(event) => updateForm('vessel', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
              <Field label="Nr. viagem"><input value={form.tripNumber} onChange={(event) => updateForm('tripNumber', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
              <Field label="Nr. booking"><input value={form.booking} onChange={(event) => updateForm('booking', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Terminal de vazio"><input value={form.terminalEmpty} onChange={(event) => updateForm('terminalEmpty', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
              <Field label="Terminal retro"><input value={form.terminalReturn} onChange={(event) => updateForm('terminalReturn', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center justify-between bg-zinc-400 px-3 text-xs text-zinc-950"><span>1 registro</span><Settings size={16} /></div>
            <table className="w-full min-w-[900px] text-xs">
              <thead><tr>{['Codigo', 'Tipo de Container', 'No Container', 'Tara', 'Peso maximo', 'MGW', 'No Lacre Cia', 'No Lacre export.'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody><tr><td className="border-b border-r px-2 py-2">{selectedContainer?.size || '40HC'}</td><td className="border-b border-r px-2 py-2">{selectedContainer?.type || 'CONTAINER'}</td><td className="border-b border-r px-2 py-2"><select value={form.container} onChange={(event) => updateForm('container', event.target.value)} className={textInputClass()}><option value="">Selecione...</option>{containers.map((container) => <option key={container.id}>{container.number}</option>)}</select></td><td className="border-b border-r px-2 py-2">{selectedContainer?.tare || '-'}</td><td className="border-b border-r px-2 py-2">{selectedContainer?.grossWeight || '-'}</td><td className="border-b border-r px-2 py-2">32.500,0000</td><td className="border-b border-r px-2 py-2">{selectedContainer?.seal || '-'}</td><td className="border-b px-2 py-2">-</td></tr></tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTab === 'CONTROLE DE DATAS') {
      return (
        <div className="p-3">
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" defaultChecked /> GRAVAR DATAS</label>
          <div className="grid gap-x-24 gap-y-1 border border-zinc-300 bg-white p-3 md:grid-cols-2">
            <div className="grid gap-1">
              <Field label="Dt. previsao de chegada"><input type="date" value={form.deliveryForecast} onChange={(event) => updateForm('deliveryForecast', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Dt. chegada"><input type="date" value={form.arrivalDate} onChange={(event) => updateForm('arrivalDate', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Dt. descarga CNTR/Carga"><input type="date" value={form.cntrUnloadingDate} onChange={(event) => updateForm('cntrUnloadingDate', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Dt. liberacao documento"><input type="date" value={form.documentReleaseDate} onChange={(event) => updateForm('documentReleaseDate', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Dt. retirada porto destino"><input type="date" value={form.portWithdrawalDate} onChange={(event) => updateForm('portWithdrawalDate', event.target.value)} className={textInputClass()} /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Dt. agendamento entrega" required><input type="date" value={form.destinationScheduleDate} onChange={(event) => updateForm('destinationScheduleDate', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Hr. agendamento entrega"><input value={form.destinationScheduleTime} onChange={(event) => updateForm('destinationScheduleTime', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Dt.chegada destinatario"><input type="date" value={form.destinationArrivalDate} onChange={(event) => updateForm('destinationArrivalDate', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Hr. chegada destinatario"><input value={form.destinationArrivalTime} onChange={(event) => updateForm('destinationArrivalTime', event.target.value)} className={textInputClass()} /></Field>
              <Field label="Dt. devolucao CNTR"><input type="date" value={form.cntrReturnDate} onChange={(event) => updateForm('cntrReturnDate', event.target.value)} className={textInputClass()} /></Field>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'DESPESAS PREVISTAS') {
      const total = Number(form.plannedFreightCost || 0) + Number(form.plannedTollCost || 0)
      return (
        <div className="p-3">
          <div className="overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center justify-between bg-zinc-400 px-3 text-xs"><span>DESPESA PREVISTA</span><Settings size={16} /></div>
            <table className="w-full min-w-[900px] text-xs">
              <thead><tr>{['Referencia', 'Produto', 'Fornecedor', 'Quantidade total', 'U.M.', 'Vlr. despesa'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody>
                <tr><td className="border-b border-r px-2 py-2">TRA010</td><td className="border-b border-r px-2 py-2">CUSTO FRETE ROD. DESTINO</td><td className="border-b border-r px-2 py-2">{form.contractor || '-'}</td><td className="border-b border-r px-2 py-2 text-right">1,0000</td><td className="border-b border-r px-2 py-2">UN</td><td className="border-b px-2 py-2"><input value={form.plannedFreightCost} onChange={(event) => { updateForm('plannedFreightCost', event.target.value); updateForm('value', event.target.value) }} className={textInputClass()} /></td></tr>
                <tr><td className="border-b border-r px-2 py-2">TRA014</td><td className="border-b border-r px-2 py-2">PEDAGIO</td><td className="border-b border-r px-2 py-2">-</td><td className="border-b border-r px-2 py-2 text-right">1,0000</td><td className="border-b border-r px-2 py-2">UN</td><td className="border-b px-2 py-2"><input value={form.plannedTollCost} onChange={(event) => updateForm('plannedTollCost', event.target.value)} className={textInputClass()} /></td></tr>
              </tbody>
            </table>
            <div className="border-t border-emerald-500 bg-emerald-50 px-8 py-2 text-right text-xs">Total = {formatMoney(total)}</div>
          </div>
        </div>
      )
    }

    if (activeTab === 'DESPESAS EXTRAS') {
      return (
        <div className="p-3">
          <div className="border border-zinc-300 bg-white">
            <div className="flex h-8 justify-end gap-2 bg-zinc-400 px-3 py-1"><Settings size={17} /><button className="grid h-5 w-5 place-items-center bg-black text-white">+</button></div>
            <EmptyGridMessage text="Nao ha informacoes. Utilize o botao + para adicionar." />
            <div className="border-t border-emerald-500 bg-emerald-50 px-8 py-2 text-right text-xs">Total = {formatMoney(Number(form.extraCost || 0))}</div>
          </div>
        </div>
      )
    }

    if (activeTab === 'NOTAS FISCAIS') {
      return (
        <div className="p-3">
          <Field label="Arquivo"><div className="flex gap-2"><input className={`${textInputClass()} w-72`} /><button className="border px-2">...</button><Paperclip size={18} /></div></Field>
          <div className="mt-3 overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center justify-between bg-zinc-400 px-3 text-xs"><span>Notas do embarcador importadas</span><Settings size={16} /></div>
            <table className="w-full min-w-[900px] text-xs">
              <thead><tr>{['Nr. nfe', 'Tipo de documento', 'Serie', 'Dt. emissao', 'Destinatario', 'Vlr. mercadoria', 'Vlr. nf-e', 'Chave'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody><tr><td className="border-b border-r px-2 py-2"><input value={form.invoiceNumber} onChange={(event) => updateForm('invoiceNumber', event.target.value)} className={textInputClass()} /></td><td className="border-b border-r px-2 py-2">NF-e</td><td className="border-b border-r px-2 py-2">1</td><td className="border-b border-r px-2 py-2">{new Date().toLocaleDateString('pt-BR')}</td><td className="border-b border-r px-2 py-2">{form.recipient || '-'}</td><td className="border-b border-r px-2 py-2"><input value={form.invoiceValue} onChange={(event) => updateForm('invoiceValue', event.target.value)} className={textInputClass()} /></td><td className="border-b border-r px-2 py-2">{form.invoiceValue}</td><td className="border-b px-2 py-2">-</td></tr></tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTab === 'SM' || activeTab === 'CIOT' || activeTab === 'DFE' || activeTab === 'PROTOCOLO' || activeTab === 'VALE PEDAGIO') {
      const field = activeTab === 'SM' ? 'smNumber' : activeTab === 'CIOT' ? 'ciotNumber' : activeTab === 'DFE' ? 'dfeNumber' : 'protocolStatus'
      const label = activeTab === 'SM' ? 'Nr. SM' : activeTab === 'CIOT' ? 'Nr. CIOT' : activeTab === 'DFE' ? 'Nr. averbacao' : 'Situacao'
      return (
        <div className="p-3">
          <Field label={label}><input value={String(form[field as keyof FreightForm])} onChange={(event) => updateForm(field as keyof FreightForm, event.target.value)} className={`${textInputClass()} max-w-md`} /></Field>
          <div className="mt-3 overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center justify-between bg-zinc-400 px-3 text-xs"><span>{activeTab}</span><Settings size={16} /></div>
            <table className="w-full min-w-[760px] text-xs">
              <thead><tr>{['Descricao usuario', 'Qtd documento', 'Classificacao', 'Situacao'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody><tr><td className="border-b border-r px-2 py-2">{activeTab}</td><td className="border-b border-r px-2 py-2">1</td><td className="border-b border-r px-2 py-2">Copia [C]</td><td className="border-b px-2 py-2">{form.protocolStatus}</td></tr></tbody>
            </table>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <div className="border border-zinc-500 bg-zinc-100">
          <div className="flex items-center justify-between border-b-4 border-zinc-400 px-2 py-1">
            <h2 className="text-lg font-normal text-red-600">Transportes de container no destino</h2>
            <button onClick={openNewFreight} className="grid h-7 w-7 place-items-center bg-black text-lg font-bold text-white" title="Novo transporte">+</button>
          </div>

          <div className="grid min-h-[calc(100vh-150px)] grid-cols-[430px_minmax(0,1fr)]">
            <aside className="border-r border-zinc-500 bg-zinc-100">
              <div className="flex h-7 items-center justify-between border-b border-zinc-400 px-2 text-xs">
                <span>Filtro</span>
                <div className="flex gap-2 text-zinc-800"><Settings size={15} /><X size={15} /></div>
              </div>
              <div className="p-2 text-[11px] text-red-600">INFORME PELO MENOS UM CAMPO PARA CONSULTAR OS DADOS</div>
              <div className="grid gap-1 px-2 text-xs">
                <Field label="Nr. do processo"><div className="grid grid-cols-[1fr_28px_1fr] gap-1"><input value={filters.processNumber} onChange={(event) => setFilters({ ...filters, processNumber: event.target.value })} className={textInputClass()} /><span className="text-center leading-7">ate</span><input className={textInputClass()} /></div></Field>
                <Field label="Codigo do processo"><input value={filters.processCode} onChange={(event) => setFilters({ ...filters, processCode: event.target.value })} className={textInputClass()} /></Field>
                <Field label="Data inicial"><div className="grid grid-cols-[1fr_28px_1fr] gap-1"><input type="date" value={filters.dateStart} onChange={(event) => setFilters({ ...filters, dateStart: event.target.value })} className={textInputClass()} /><span className="text-center leading-7">ate</span><input type="date" value={filters.dateEnd} onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value })} className={textInputClass()} /></div></Field>
                <Field label="Descricao do Processo"><input value={filters.processDescription} onChange={(event) => setFilters({ ...filters, processDescription: event.target.value })} className={textInputClass()} /></Field>
                <Field label="Situacao"><input value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className={textInputClass()} /></Field>
                <div className="mt-2 border border-zinc-400">
                  <div className="flex h-7 items-center justify-between bg-zinc-100 px-2 text-xs"><span>Fornecedor</span><div className="flex gap-2"><Settings size={14} /><X size={14} /></div></div>
                  <select value={filters.supplier} onChange={(event) => setFilters({ ...filters, supplier: event.target.value })} className="h-7 w-full border-t border-zinc-300 bg-white px-2 text-xs">
                    <option value="">Selecione...</option>
                    {customers.map((customer) => <option key={customer.id}>{customer.name}</option>)}
                  </select>
                </div>
                <Field label="Tipo processo"><input value={filters.processType} onChange={(event) => setFilters({ ...filters, processType: event.target.value })} className={textInputClass()} /></Field>
                <Field label="No Container"><input value={filters.container} onChange={(event) => setFilters({ ...filters, container: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                <Field label="Dt. origem"><div className="grid grid-cols-[1fr_28px_1fr] gap-1"><input type="date" value={filters.originDateStart} onChange={(event) => setFilters({ ...filters, originDateStart: event.target.value })} className={textInputClass()} /><span className="text-center leading-7">ate</span><input type="date" value={filters.originDateEnd} onChange={(event) => setFilters({ ...filters, originDateEnd: event.target.value })} className={textInputClass()} /></div></Field>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setFilters({ processNumber: '', processCode: '', dateStart: '', dateEnd: '', processDescription: '', status: '', supplier: '', processType: '', container: '', originDateStart: '', originDateEnd: '' })} className="border border-zinc-400 bg-white px-3 py-1">Limpar</button>
                </div>
              </div>
            </aside>

            <section className="min-w-0 bg-white">
              <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 text-xs">
                <div className="px-2 font-semibold">Transportes de carga rodoviario</div>
                <div className="ml-auto px-2">{visibleFreights.length} registros</div>
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="mr-2 h-6 w-36 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
                <div className="flex items-center gap-2 pr-2"><Settings size={18} /><span>↔</span><span>☑</span><span>1:1</span><span>XLS</span><button onClick={openNewFreight} className="grid h-6 w-6 place-items-center bg-black text-white">+</button></div>
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[2550px] text-xs">
                  <thead className="bg-white">
                    <tr>
                      {['', '', 'Codigo', '', '', '', 'Dt. inicio', 'Situacao', 'Cliente', 'Remetente', 'Destinatario', 'Contratado', 'Tipo', 'Motorista', 'Tracao', 'Reboque', 'Origem', 'UF coleta', 'Destino', 'UF entrega', 'Pagamento', 'Vl. frete lista', 'Vl. abastecimento', 'Dt. agendamento descarga', 'Dt. chegada', 'Dt.Inicio Descarg.', 'Hr.Inicio Descarg', 'Dt. descida CNTR', 'Dt. retirada P.D.', 'Dt. fim descarga', 'Dt. devolucao CNTR', 'Estab. CT-e/NFS-e', 'No CT-e/NFS-e', 'No averbacao CTE', 'No CIOT', 'Situacao CIOT'].map((heading, index) => (
                        <th key={`${heading}-${index}`} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                          <span>{heading}</span>
                          {heading && <span className="float-right text-zinc-400">▼</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFreights.map((freight, index) => (
                      <tr key={freight.id} onDoubleClick={() => openFreightDetail(freight)} className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} cursor-default hover:bg-sky-100`}>
                        <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="checkbox" /></td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1 text-zinc-400">⋮</td>
                        <td onClick={() => openFreightDetail(freight)} className="border-b border-r border-zinc-200 px-2 py-1 font-medium text-blue-950">{freight.process || freight.number}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1 text-center">▪</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1 text-red-600">▶</td>
                        <td className="relative border-b border-r border-zinc-200 px-2 py-1">
                          <button onClick={() => setOpenActionId(openActionId === freight.id ? null : freight.id)} className="grid h-5 w-6 place-items-center border border-zinc-300 bg-white"><MoreVertical size={14} /></button>
                          {openActionId === freight.id && (
                            <div className="absolute left-0 top-7 z-20 w-36 border border-zinc-300 bg-white py-1 text-xs shadow-lg">
                              <button onClick={() => openFreightDetail(freight)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Visualizar</button>
                              <button onClick={() => updateFreight(freight.id, { operationalStatus: 'Aprovado para faturamento' })} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Aprovar</button>
                              <button onClick={() => duplicateFreight(freight)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Duplicar</button>
                              <button onClick={() => updateFreight(freight.id, { operationalStatus: 'Cancelado' })} className="block w-full px-3 py-2 text-left text-red-700 hover:bg-zinc-100">Cancelar</button>
                            </div>
                          )}
                        </td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.date} 07:50</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.operationalStatus || 'OPERACAO ENCERRADA'}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.customer}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.customer}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.destination || '-'}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">TRANS CAVALCANTE</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">ETC</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.driver || '-'}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.tractorPlate || '-'}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.trailerPlate || '-'}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.origin || '-'}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">AM</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.destination || '-'}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">AM</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">7 DIAS</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1 text-right">{freight.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1 text-right">0,00</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.date} 10:00</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.date}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.date}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">07:30</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.date}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.date}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.date} 15:30</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.date}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">LAM</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.fiscalStatus === 'Emitido' ? '1296' : ''}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.fiscalStatus === 'Emitido' ? '0572007261938274900068' : ''}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.closing ? '5200029452035879' : ''}</td>
                        <td className="border-b border-r border-zinc-200 px-2 py-1">{freight.closing ? 'REGISTRADO' : ''}</td>
                      </tr>
                    ))}
                    {!visibleFreights.length && <tr><td colSpan={36} className="px-3 py-10 text-center text-zinc-500">Nenhum transporte encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}

      {showForm && (
        <div className="border border-zinc-500 bg-zinc-100">
          <div className="system-modal min-h-[calc(100vh-112px)] w-full overflow-hidden bg-zinc-100">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Transporte rodoviario de container</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <button onClick={() => saveFreight(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
                <button onClick={() => saveFreight(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => setShowForm(false)} className="inline-flex items-center gap-1"><X size={16} /> EXCLUIR</button>
                <button className="inline-flex items-center gap-1"><Check size={16} /> REGERAR PROCESSO</button>
                <Info size={16} />
                <Settings size={16} />
                <button className="inline-flex items-center gap-1"><Paperclip size={15} /> ANEXAR</button>
                <button onClick={() => setShowForm(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div>
              <div className="grid gap-x-24 gap-y-1 border-b-4 border-zinc-400 p-3 md:grid-cols-2">
                <div className="grid gap-1">
                  <Field label="Codigo do processo" required><input value={form.process} onChange={(event) => updateForm('process', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                  <Field label="Situacao"><input value={form.status} onChange={(event) => updateForm('status', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="CNPJ/CPF"><input value={form.serviceTakerDocument} onChange={(event) => updateForm('serviceTakerDocument', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="Tomador do servico"><input value={form.serviceTaker} onChange={(event) => updateForm('serviceTaker', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                  <Field label="CNPJ/CPF"><input value={form.senderDocument} onChange={(event) => updateForm('senderDocument', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="Remetente"><input value={form.sender} onChange={(event) => updateForm('sender', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                </div>
                <div className="grid gap-1">
                  <Field label="Tipo processo" required><select value={form.processType} onChange={(event) => updateForm('processType', event.target.value)} className={textInputClass()}><option>Multimodal [M]</option><option>Rodoviario [R]</option></select></Field>
                  <Field label="Identificacao do cliente"><input value={form.customerIdentification} onChange={(event) => updateForm('customerIdentification', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="Cliente" required><select value={form.customer} onChange={(event) => updateForm('customer', event.target.value)} className={textInputClass()}><option value="">Selecione...</option>{customers.map((customer) => <option key={customer.id}>{customer.name}</option>)}</select></Field>
                  <Field label="Produto"><input value={form.product} onChange={(event) => updateForm('product', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                  <Field label="CNPJ/CPF"><input value={form.recipientDocument} onChange={(event) => updateForm('recipientDocument', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="Destinatario"><input value={form.recipient} onChange={(event) => updateForm('recipient', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                </div>
              </div>

              <div className="px-3 pt-3 text-xs font-medium">ORIENTACAO INTERNA</div>
              <div className="flex flex-wrap border-b border-zinc-300 px-2 pt-1 text-xs">
                {freightTabs.map((tab) => {
                  const enabled = tabAvailability[tab]
                  return (
                    <button
                      key={tab}
                      onClick={() => selectTab(tab)}
                      className={`border border-b-0 px-2.5 py-1 ${activeTab === tab ? 'bg-zinc-300 text-zinc-950' : enabled ? 'border-transparent text-zinc-950 hover:bg-zinc-200' : 'border-transparent text-zinc-400'}`}
                    >
                      {tab}
                    </button>
                  )
                })}
              </div>
              <div className="min-h-[calc(100vh-420px)] bg-zinc-100">{renderActiveTab()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
