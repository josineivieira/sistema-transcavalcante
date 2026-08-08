import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Check, Eraser, Filter, Info, MoreVertical, Paperclip, Save, Search, Settings, X } from 'lucide-react'
import { formatMoney, nextId, type Freight, type FreightTask } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege, getAuthUser } from '../services/authSession'

const freightTabs = [
  'GERAIS',
  'ROTA',
  'CONTAINERS',
  'CONTROLE DE DATAS',
  'DESPESAS PREVISTAS',
  'DESPESAS EXTRAS',
  'NOTAS FISCAIS',
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
  recordDates: boolean
  deliveryForecast: string
  arrivalDate: string
  cntrUnloadingDate: string
  documentReleaseDate: string
  portWithdrawalDate: string
  scheduleStartDate: string
  scheduleEndDate: string
  integrationType: string
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
  extraExpenses: ExtraExpense[]
  invoiceNumber: string
  invoiceSeries: string
  invoiceIssueDate: string
  invoiceGoodsValue: string
  invoiceValue: string
  invoiceAccessKey: string
  smNumber: string
  ciotNumber: string
  dfeNumber: string
  protocolStatus: string
  taskHistory: FreightTask[]
  value: string
}

type ExtraExpense = {
  id: string
  reference: string
  product: string
  justificationType: string
  observation: string
  supplierDocument: string
  supplier: string
  currency: string
  exchangeRate: string
  expenseValue: string
  cteBillingValue: string
  purchaseExtraDays: string
  purchaseFreeDays: string
  calculatedPurchaseExtraDays: string
}

type ExtraProduct = {
  reference: string
  product: string
  structuredCode: string
  createdAt: string
}

type InvoiceImport = {
  fileName: string
  senderDocument: string
  sender: string
  recipientDocument: string
  recipient: string
  invoiceNumber: string
  invoiceSeries: string
  invoiceIssueDate: string
  invoiceGoodsValue: string
  invoiceValue: string
  invoiceAccessKey: string
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
  recordDates: false,
  deliveryForecast: '',
  arrivalDate: '',
  cntrUnloadingDate: '',
  documentReleaseDate: '',
  portWithdrawalDate: '',
  scheduleStartDate: '',
  scheduleEndDate: '',
  integrationType: '',
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
  extraExpenses: [],
  invoiceNumber: '',
  invoiceSeries: '',
  invoiceIssueDate: '',
  invoiceGoodsValue: '0',
  invoiceValue: '0',
  invoiceAccessKey: '',
  smNumber: '',
  ciotNumber: '',
  dfeNumber: '',
  protocolStatus: 'Aguardando',
  taskHistory: [],
  value: '0',
}

const emptyInvoiceImport: InvoiceImport = {
  fileName: '',
  senderDocument: '',
  sender: '',
  recipientDocument: '',
  recipient: '',
  invoiceNumber: '',
  invoiceSeries: '',
  invoiceIssueDate: '',
  invoiceGoodsValue: '0',
  invoiceValue: '0',
  invoiceAccessKey: '',
}

const emptyExtraExpense: ExtraExpense = {
  id: '',
  reference: '',
  product: '',
  justificationType: '',
  observation: '',
  supplierDocument: '',
  supplier: '',
  currency: 'BRL  REAL/BI',
  exchangeRate: '1,00000',
  expenseValue: '0,00',
  cteBillingValue: '0,00',
  purchaseExtraDays: '',
  purchaseFreeDays: '',
  calculatedPurchaseExtraDays: '',
}

const extraProducts: ExtraProduct[] = [
  ['DIESEL', 'ABASTECIMENTO EXTERNO', 'EXT-DIESEL', '24/04/2019'],
  ['EXT044', 'ADICIONAL BI-TREM', 'EXT044', '25/03/2026'],
  ['EXT022', 'AGENDAMENTO EXPRESSO', 'EXT022', '10/05/2019'],
  ['ARLA 32E MANAUS', 'ARLA 32 GRANEL EXTERNO MANAUS', 'ARLA32', '17/07/2018'],
  ['EXT31', 'ARMAZENAGEM DESTINO', 'EXT31', '08/11/2019'],
  ['EXT42', 'ARMAZENAGEM ORIGEM', 'EXT42', '16/02/2022'],
  ['EXT010', 'AVARIA', 'EXT010', '21/08/2018'],
  ['EXT02025', 'BALSA MANAUS', 'EXT02025', '10/09/2025'],
  ['EXT008', 'CARREGAMENTO', 'EXT008', '02/08/2018'],
  ['COLETA / ENTREGA ADIC', 'COLETA / ENTREGA ADICIONAL', 'COLETA-ENTREGA', '16/02/2022'],
  ['COLETA DE CNTR VAZIO', 'COLETA DE CNTR VAZIO - PULMAO', 'COLETA-CNTR', '15/08/2018'],
  ['EXT35', 'COMISSAO', 'EXT35', '10/08/2020'],
  ['EXT30', 'CONFERENTE', 'EXT30', '06/11/2019'],
  ['EXT28', 'DEMURRAGE', 'EXT28', '16/10/2019'],
  ['DETENTION', 'DETENTION', 'DETENTION', '16/02/2022'],
  ['ENTREGA DE CONTAINER', 'DEVOLUCAO DE CONTAINER', 'DEV-CNTR', '10/03/2021'],
  ['EXT015', 'DIARIA DO VEICULO NA ENTREGA', 'EXT015', '08/08/2018'],
  ['EXT006', 'DIARIA DO VEICULO NO CARREGAMENTO', 'EXT006', '08/08/2018'],
  ['EXT016', 'DIVERGENCIA VGM', 'EXT016', '31/10/2018'],
  ['EXT41', 'ESCOLTA ARMADA', 'EXT41', '02/08/2022'],
  ['EXTRAS001', 'ESTACIONAMENTO', 'EXTRAS001', '02/12/2025'],
  ['EXT043', 'FRETE ADICIONAL (COMPLEMENTO)', 'EXT043', '16/08/2018'],
  ['SER005', 'FRETE MORTO', 'SER005', '16/01/2019'],
  ['EXT27', 'FRETE RESGATE', 'EXT27', '11/10/2019'],
  ['EXT021', 'HANDLING IN/OUT', 'EXT021', '24/04/2019'],
  ['EXT005', 'ISCA MOVEL', 'EXT005', '21/08/2018'],
  ['EXT024', 'LAVAGEM DE CONTAINER SIMPLES', 'EXT024', '04/07/2019'],
  ['MATERIAL DE PEACAO E', 'MATERIAL DE PEACAO E DESPEACAO', 'MAT-PEACAO', '17/10/2019'],
  ['EXT011', 'MULTA', 'EXT011', '21/08/2018'],
  ['EXT004', 'NO SHOW', 'EXT004', '21/08/2018'],
  ['S10E MANAUS', 'OLEO DIESEL B S10 EXTERNO MANAUS', 'S10E-MAO', '16/07/2018'],
  ['S500E MANAUS', 'OLEO DIESEL B S500 EXTERNO MANAUS', 'S500E-MAO', '16/07/2018'],
  ['EXT025', 'OVA/DESOVA/CAPATAZIA', 'EXT025', '17/07/2019'],
  ['TRA014', 'PEDAGIO', 'TRA014', '16/07/2018'],
  ['EXT013', 'PEDAGIO ADICIONAL', 'EXT013', '21/08/2018'],
  ['EXT023', 'PLANTAO TERMINAL DE APOIO', 'EXT023', '26/06/2019'],
  ['POSICIONAMENTO DE C', 'POSICIONAMENTO DE CONTAINER', 'POS-CNTR', '20/01/2020'],
  ['EXT34', 'PRONTA RESPOSTA', 'EXT34', '08/04/2020'],
  ['TRA018', 'PULMAO DRY (ORIGEM)', 'TRA018', '04/02/2019'],
  ['EXT012', 'RASTREADOR', 'EXT012', '21/08/2018'],
  ['EXTR2025', 'REATIVACAO DE GUIA', 'EXTR2025', '24/09/2025'],
  ['EXT018', 'RECEBIMENTO DE CONTEINER APOS DEAD-LINE DO NAVIO', 'EXT018', '12/02/2019'],
  ['REDESTINACAO', 'REDESTINACAO', 'REDESTINACAO', '16/02/2022'],
  ['EXT33', 'REEMBOLSO', 'EXT33', '12/03/2020'],
  ['EXT32', 'REEMBOLSO DIFERENCA DIESEL', 'EXT32', '03/02/2020'],
  ['EXT020', 'REMOCAO MUDANCA DE NAVIO', 'EXT020', '12/02/2019'],
  ['EXT40', 'REPARO CONTAINER', 'EXT40', '28/01/2021'],
  ['RETIRADA DE VAZIO', 'RETIRADA DE VAZIO', 'RET-VAZIO', '09/12/2019'],
  ['EXT002', 'TAXA ADMINISTRATIVA', 'EXT002', '09/08/2018'],
  ['EXT', 'TAXA DE TRIAGEM', 'EXT', '23/01/2021'],
  ['TERMOGRAFO', 'TERMOGRAFO', 'TERMOGRAFO', '16/02/2022'],
  ['EXT001', 'TRANSFERENCIA', 'EXT001', '09/08/2018'],
].map(([reference, product, structuredCode, createdAt]) => ({ reference, product, structuredCode, createdAt }))

function textInputClass(disabled = false) {
  return `h-7 w-full min-w-0 border border-zinc-300 px-2 text-xs outline-none ${disabled ? 'bg-zinc-200 text-zinc-500' : 'bg-white focus:border-zinc-500'}`
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
    <label className="grid grid-cols-[135px_minmax(0,1fr)] items-center gap-1 text-xs">
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

function parseBrazilianNumber(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value ?? '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function cityState(value: string | undefined) {
  const text = String(value || '')
  const parts = text.split('/')
  return {
    city: parts[0]?.trim() || text || '-',
    state: parts[1]?.trim() || '',
  }
}

const freightGridColumns = [
  { key: 'select', label: '', width: 30, locked: true },
  { key: 'code', label: 'Codigo', width: 118, minWidth: 82, locked: true },
  { key: 'dateStart', label: 'Dt. inicio', width: 132, minWidth: 96 },
  { key: 'status', label: 'Situacao', width: 190, minWidth: 128 },
  { key: 'customer', label: 'Cliente', width: 210, minWidth: 130 },
  { key: 'sender', label: 'Remetente', width: 210, minWidth: 130 },
  { key: 'recipient', label: 'Destinatario', width: 210, minWidth: 130 },
  { key: 'contractor', label: 'Contratado', width: 190, minWidth: 120 },
  { key: 'type', label: 'Tipo', width: 74, minWidth: 56 },
  { key: 'driver', label: 'Motorista', width: 190, minWidth: 120 },
  { key: 'tractor', label: 'Tracao', width: 96, minWidth: 76 },
  { key: 'trailer', label: 'Reboque', width: 96, minWidth: 76 },
  { key: 'origin', label: 'Origem', width: 160, minWidth: 100 },
  { key: 'originUf', label: 'UF coleta', width: 82, minWidth: 66 },
  { key: 'destination', label: 'Destino', width: 160, minWidth: 100 },
  { key: 'destinationUf', label: 'UF entrega', width: 86, minWidth: 70 },
  { key: 'payment', label: 'Pagamento', width: 100, minWidth: 80 },
  { key: 'value', label: 'Vl. frete lista', width: 122, minWidth: 100 },
  { key: 'fuelValue', label: 'Vl. abastecimento', width: 128, minWidth: 110 },
  { key: 'scheduleUnload', label: 'Dt. agendamento descarga', width: 170, minWidth: 138 },
  { key: 'arrivalDate', label: 'Dt. chegada', width: 112, minWidth: 92 },
  { key: 'unloadStartDate', label: 'Dt.Inicio Descarg.', width: 132, minWidth: 110 },
  { key: 'unloadStartHour', label: 'Hr.Inicio Descarg', width: 126, minWidth: 108 },
  { key: 'cntrDescent', label: 'Dt. descida CNTR', width: 132, minWidth: 108 },
  { key: 'pdWithdrawal', label: 'Dt. retirada P.D.', width: 128, minWidth: 108 },
  { key: 'unloadEnd', label: 'Dt. fim descarga', width: 128, minWidth: 106 },
  { key: 'cntrReturn', label: 'Dt. devolucao CNTR', width: 142, minWidth: 116 },
  { key: 'fiscalNumber', label: 'NFS-e', width: 116, minWidth: 96 },
  { key: 'ciot', label: 'No CIOT', width: 128, minWidth: 100 },
  { key: 'ciotStatus', label: 'Situacao CIOT', width: 122, minWidth: 100 },
  { key: 'actions', label: 'Acoes', width: 58, minWidth: 54, locked: true },
] as const

type FreightGridColumnKey = typeof freightGridColumns[number]['key']

const defaultFreightColumnWidths = freightGridColumns.reduce<Record<string, number>>((widths, column) => {
  widths[column.key] = column.width
  return widths
}, {})

const freightTaskOptions = [
  'AGENDAMENTO E CARREGAMENTO 15',
  'ABASTECIDO 17',
  'NOTA(S) FISCAL(IS) RECEBIDA(S) 20',
  'ENTREGA CONCLUIDA 50',
  'OPERACAO ENCERRADA 55',
  'PROCESSO INTERROMPIDO 60',
  'AUDITORIA INICIADA 65',
  'PROCESSO AUDITADO 70',
  'AUDITORIA ENCERRADA 75',
]

export function FreightsPage() {
  const { customers, drivers, vehicles, containers, freights, priceLists, issuerSettings, setFreights } = useLocalData()
  const canEditPage = canEdit('freights')
  const authUser = getAuthUser()
  const issuerName = issuerSettings.legalName || issuerSettings.tradeName || 'TRANSCAVALCANTE'
  const issuerDocument = issuerSettings.document || ''
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
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>({})
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultFreightColumnWidths)
  const [invoiceImportOpen, setInvoiceImportOpen] = useState(false)
  const [invoiceImport, setInvoiceImport] = useState<InvoiceImport>(emptyInvoiceImport)
  const [invoiceImportMessage, setInvoiceImportMessage] = useState('')
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(false)
  const [taskPickerOpen, setTaskPickerOpen] = useState(false)
  const [showPreviousTasks, setShowPreviousTasks] = useState(false)
  const [extraExpenseOpen, setExtraExpenseOpen] = useState(false)
  const [extraProductOpen, setExtraProductOpen] = useState(false)
  const [extraProductSearch, setExtraProductSearch] = useState('')
  const [editingExtraExpense, setEditingExtraExpense] = useState<ExtraExpense>(emptyExtraExpense)
  const [form, setForm] = useState<FreightForm>({
    ...emptyForm,
    customer: customers[0]?.name ?? '',
    serviceTakerDocument: issuerDocument,
    serviceTaker: issuerName,
    contractorDocument: issuerDocument,
    contractor: issuerName,
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
  const productOptions = useMemo(() => {
    const products = priceLists
      .filter((price) => price.status !== 'Inativo' && price.product)
      .map((price) => price.product)
    return Array.from(new Set(products)).sort()
  }, [priceLists])

  useEffect(() => {
    setForm((current) => ({
      ...current,
      serviceTakerDocument: issuerDocument,
      serviceTaker: issuerName,
      contractorDocument: issuerDocument,
      contractor: issuerName,
    }))
  }, [issuerDocument, issuerName])

  const generalReady = Boolean(form.process && form.processType && form.customer && form.serviceTaker)
  const routeReady = Boolean(form.routeName && form.origin && form.destination)
  const serviceReady = Boolean(generalReady && routeReady && form.driver && form.tractorId)
  const hasAbastecido = form.taskHistory.some((task) => task.name === 'ABASTECIDO 17')
  const hasNotasRecebidas = form.taskHistory.some((task) => task.name === 'NOTA(S) FISCAL(IS) RECEBIDA(S) 20')
  const containerReady = Boolean(serviceReady && form.container)
  const datesReady = Boolean(containerReady && form.deliveryForecast && form.destinationScheduleDate)
  const fiscalReady = Boolean(containerReady && form.invoiceNumber)
  const availableTaskOptions = freightTaskOptions.filter((task) => (
    showPreviousTasks || !form.taskHistory.some((history) => history.name === task)
  ))
  const filteredExtraProducts = useMemo(() => {
    const term = extraProductSearch.toLowerCase()
    return extraProducts.filter((product) =>
      [product.reference, product.product, product.structuredCode].some((value) => value.toLowerCase().includes(term)),
    )
  }, [extraProductSearch])

  const tabAvailability: Record<FreightTab, boolean> = {
    GERAIS: true,
    ROTA: true,
    CONTAINERS: serviceReady,
    'CONTROLE DE DATAS': containerReady,
    'DESPESAS PREVISTAS': hasAbastecido,
    'DESPESAS EXTRAS': hasAbastecido,
    'NOTAS FISCAIS': hasNotasRecebidas,
    CIOT: hasNotasRecebidas,
    PROTOCOLO: hasNotasRecebidas || fiscalReady || datesReady,
  }

  const visibleFreights = useMemo(() => {
    const term = search.toLowerCase()
    return freights.filter((freight) =>
      [freight.customer, freight.process, freight.sender ?? '', freight.recipient ?? '', freight.container, freight.driver, freight.tractorPlate, freight.trailerPlate, freight.origin, freight.destination]
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

  const visibleFreightColumns = useMemo(
    () => freightGridColumns.filter((column) => !hiddenColumns[column.key]),
    [hiddenColumns],
  )

  const freightGridMinWidth = visibleFreightColumns.reduce((total, column) => total + (columnWidths[column.key] ?? column.width), 0)

  function findPriceForProcess(product: string, origin: string, destination: string) {
    const selectedProduct = product.toUpperCase()
    const selectedOrigin = origin.toUpperCase()
    const selectedDestination = destination.toUpperCase()
    return priceLists.find((item) =>
      item.status !== 'Inativo'
      && item.product.toUpperCase() === selectedProduct
      && (!selectedOrigin || item.originPort.toUpperCase().includes(selectedOrigin) || selectedOrigin.includes(item.originPort.toUpperCase()))
      && (!selectedDestination || item.destinationPort.toUpperCase().includes(selectedDestination) || selectedDestination.includes(item.destinationPort.toUpperCase())),
    ) ?? priceLists.find((item) => item.status !== 'Inativo' && item.product.toUpperCase() === selectedProduct)
  }

  function priceValueForProcess(product: string, origin: string, destination: string) {
    const price = findPriceForProcess(product, origin, destination)
    return price ? String(price.total || price.listValue || 0) : ''
  }

  function startColumnResize(event: ReactMouseEvent<HTMLSpanElement>, column: typeof freightGridColumns[number]) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = columnWidths[column.key] ?? column.width
    const minWidth = 'minWidth' in column ? column.minWidth : 58

    const resize = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(minWidth, startWidth + moveEvent.clientX - startX)
      setColumnWidths((current) => ({ ...current, [column.key]: nextWidth }))
    }

    const stopResize = () => {
      document.removeEventListener('mousemove', resize)
      document.removeEventListener('mouseup', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', resize)
    document.addEventListener('mouseup', stopResize)
  }

  function toggleColumn(columnKey: FreightGridColumnKey) {
    const column = freightGridColumns.find((item) => item.key === columnKey)
    if (column && 'locked' in column && column.locked) return
    setHiddenColumns((current) => ({ ...current, [columnKey]: !current[columnKey] }))
  }

  function updateForm(field: keyof FreightForm, value: string | boolean) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'origin' || field === 'destination') {
        next.routeName = `${field === 'origin' ? value : next.origin} X ${field === 'destination' ? value : next.destination}`.replace(/^ X | X $/g, '')
      }
      if (field === 'customer') {
        next.recipient = next.recipient || String(value)
      }
      if (field === 'product' || field === 'origin' || field === 'destination') {
        const price = priceValueForProcess(
          String(field === 'product' ? value : next.product),
          String(field === 'origin' ? value : next.origin),
          String(field === 'destination' ? value : next.destination),
        )
        if (price) {
          next.value = price
          next.plannedFreightCost = price
        }
      }
      return next
    })
  }

  function resetForm() {
    setEditingFreightId(null)
    setForm({
      ...emptyForm,
      customer: customers[0]?.name ?? '',
      serviceTakerDocument: issuerDocument,
      serviceTaker: issuerName,
      contractorDocument: issuerDocument,
      contractor: issuerName,
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
    const savedForm = freight as unknown as Partial<FreightForm>
    setEditingFreightId(freight.id)
    setForm({
      ...emptyForm,
      ...savedForm,
      customer: freight.customer,
      process: freight.process,
      processType: freight.processType ?? 'Multimodal [M]',
      status: freight.operationalStatus,
      customerIdentification: freight.customerIdentification ?? '',
      serviceTakerDocument: freight.serviceTakerDocument || issuerDocument,
      serviceTaker: freight.serviceTaker || issuerName,
      senderDocument: freight.senderDocument ?? '',
      sender: freight.sender ?? '',
      contractorDocument: freight.contractorDocument || issuerDocument,
      contractor: freight.contractor || issuerName,
      product: freight.product || emptyForm.product,
      recipientDocument: freight.recipientDocument ?? '',
      recipient: freight.recipient ?? freight.customer,
      routeName: freight.routeName || `${freight.origin || ''} X ${freight.destination || ''}`.replace(/^ X | X $/g, ''),
      origin: freight.origin,
      destination: freight.destination,
      driver: freight.driver,
      tractorId: freight.tractorId || (tractor?.id ?? ''),
      trailerId: freight.trailerId || (trailer?.id ?? ''),
      container: freight.container,
      plannedFreightCost: freight.plannedFreightCost ?? String(freight.value),
      value: String(savedForm.value ?? freight.value),
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

  function addFlowTask(taskName: string) {
    const now = new Date()
    const startDate = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const task: FreightTask = {
      id: nextId('tarefa'),
      name: taskName,
      description: '',
      status: 'ENCERRADO',
      sendToCustomer: 'N',
      startDate,
      endDate: startDate,
      completionPercent: 0,
      internalUse: 'N',
      time: 'Hoje',
      user: authUser?.name || authUser?.email || 'Sistema',
    }
    setForm((current) => {
      const next = {
        ...current,
        status: taskName,
        taskHistory: [task, ...(current.taskHistory ?? [])],
      }
      if (editingFreightId) {
        setFreights(freights.map((freight) => freight.id === editingFreightId ? buildFreightRecord(next, freight) : freight))
      }
      return next
    })
    setTaskPickerOpen(false)
  }

  function buildFreightRecord(formSnapshot: FreightForm, existing?: Freight): Freight {
    const matchedPrice = priceValueForProcess(formSnapshot.product, formSnapshot.origin, formSnapshot.destination)
    const rawValue = parseBrazilianNumber(formSnapshot.value || formSnapshot.plannedFreightCost)
    const value = rawValue > 0 ? rawValue : parseBrazilianNumber(matchedPrice)
    const tractor = tractors.find((item) => item.id === formSnapshot.tractorId)
    const trailer = trailers.find((item) => item.id === formSnapshot.trailerId)
    const createdNumber = `FRT-${String(freights.length + 1).padStart(6, '0')}`
    return {
      ...formSnapshot,
      id: existing?.id ?? nextId('fr'),
      number: existing?.number ?? createdNumber,
      date: existing?.date ?? new Date().toISOString().slice(0, 10),
      customer: formSnapshot.customer,
      process: formSnapshot.process,
      processType: formSnapshot.processType,
      customerIdentification: formSnapshot.customerIdentification,
      serviceTakerDocument: formSnapshot.serviceTakerDocument,
      serviceTaker: formSnapshot.serviceTaker,
      senderDocument: formSnapshot.senderDocument,
      sender: formSnapshot.sender,
      product: formSnapshot.product,
      recipientDocument: formSnapshot.recipientDocument,
      recipient: formSnapshot.recipient,
      container: formSnapshot.container,
      driver: formSnapshot.driver,
      tractorPlate: tractor?.tractorPlate ?? existing?.tractorPlate ?? '',
      trailerPlate: trailer?.trailerPlate ?? existing?.trailerPlate ?? '',
      origin: formSnapshot.origin,
      destination: formSnapshot.destination,
      value,
      operationalStatus: formSnapshot.status || existing?.operationalStatus || 'Em digitacao',
      fiscalStatus: existing?.fiscalStatus ?? 'Pendente',
      closing: existing?.closing,
    }
  }

  function saveFreight(closeAfterSave = true) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!form.process || !form.processType || !form.customer || !form.serviceTaker) {
      window.alert('Informe Codigo do processo, Tipo processo, Cliente e Tomador do servico.')
      return
    }

    const formSnapshot = { ...form }

    setFreights(editingFreightId
      ? freights.map((freight) => freight.id === editingFreightId ? buildFreightRecord(formSnapshot, freight) : freight)
      : [...freights, buildFreightRecord(formSnapshot)],
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

  function getXmlText(parent: Element | null, tag: string) {
    return parent?.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''
  }

  function accessKeyFromText(text: string) {
    return text.match(/(?:\d[\s.-]*){44}/)?.[0]?.replace(/\D/g, '') ?? ''
  }

  function invoiceNumberFromAccessKey(accessKey: string) {
    return accessKey.length === 44 ? accessKey.slice(25, 34) : ''
  }

  function normalizeInvoiceNumber(value: string) {
    const digits = value.replace(/\D/g, '')
    return digits.replace(/^0+(?=\d)/, '') || digits
  }

  function formatIsoDate(value: string) {
    if (!value) return ''
    const isoDate = value.slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : value
  }

  function firstMoneyAfter(text: string, label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = text.match(new RegExp(`${escaped}[\\s\\S]{0,80}?(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2})`, 'i'))
    return match?.[1] ?? ''
  }

  function extractInvoiceFromXml(text: string, fileName: string): InvoiceImport | null {
    const xml = new DOMParser().parseFromString(text, 'application/xml')
    if (xml.getElementsByTagName('parsererror').length) return null

    const emit = xml.getElementsByTagName('emit')[0]
    const dest = xml.getElementsByTagName('dest')[0]
    const ide = xml.getElementsByTagName('ide')[0]
    const total = xml.getElementsByTagName('ICMSTot')[0]
    const infNfe = xml.getElementsByTagName('infNFe')[0]
    if (!emit && !dest) return null

    return {
      fileName,
      senderDocument: getXmlText(emit, 'CNPJ') || getXmlText(emit, 'CPF'),
      sender: getXmlText(emit, 'xNome'),
      recipientDocument: getXmlText(dest, 'CNPJ') || getXmlText(dest, 'CPF'),
      recipient: getXmlText(dest, 'xNome'),
      invoiceNumber: getXmlText(ide, 'nNF'),
      invoiceSeries: getXmlText(ide, 'serie'),
      invoiceIssueDate: formatIsoDate(getXmlText(ide, 'dhEmi') || getXmlText(ide, 'dEmi')),
      invoiceGoodsValue: getXmlText(total, 'vProd').replace('.', ','),
      invoiceValue: getXmlText(total, 'vNF').replace('.', ','),
      invoiceAccessKey: infNfe?.getAttribute('Id')?.replace(/^NFe/i, '') || accessKeyFromText(text),
    }
  }

  function extractAfterLabel(text: string, label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = text.match(new RegExp(`${escaped}\\s+([^\\n\\r]+)`, 'i'))
    return match?.[1]?.replace(/\s{2,}.*/, '').trim() ?? ''
  }

  function plainText(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  function formatCnpj(value: string) {
    const digits = value.replace(/\D/g, '')
    if (digits.length !== 14) return value
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }

  function firstFormattedDocument(text: string) {
    return text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2}/)?.[0] ?? ''
  }

  function documentFromAccessKey(text: string) {
    const accessKey = accessKeyFromText(text)
    return accessKey.length === 44 ? formatCnpj(accessKey.slice(6, 20)) : ''
  }

  function lineAfterPattern(lines: string[], pattern: RegExp) {
    const index = lines.findIndex((line) => pattern.test(line) || pattern.test(plainText(line)))
    if (index < 0) return ''
    const ignored = /^(CNPJ|CPF|FONE|DATA|HORA|MUNIC[IÍ]PIO|BAIRRO|ENDERE[CÇ]O|UF|CEP|INSCRI[CÇ][AÃ]O|NOME\s*\/|NOME\/)/i
    return lines.slice(index + 1).find((line) => line && !ignored.test(line)) ?? ''
  }

  async function extractTextFromPdf(file: File) {
    const [pdfjsLib, pdfWorker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs?url'),
    ])
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default
    const data = new Uint8Array(await file.arrayBuffer())
    const pdf = await pdfjsLib.getDocument({ data }).promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => {
        if (typeof item === 'object' && item !== null && 'str' in item) {
          return String((item as { str: string }).str)
        }
        return ''
      }).join('\n'))
    }
    return pages.join('\n')
  }

  function extractInvoiceFromDanfText(text: string, fileName: string): InvoiceImport | null {
    const normalized = text.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ')
    const lines = text
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const natureIndex = lines.findIndex((line) => /NATUREZA DA OPERA/i.test(plainText(line)))
    const issuerCandidates = (natureIndex > 0 ? lines.slice(0, natureIndex) : lines.slice(0, 25))
      .filter((line) => /LTDA|EIRELI|S\/A| SA | ME\b| EPP\b/i.test(line))
      .filter((line) => !/DANFE|NF-?E|DESTINAT/i.test(line))
    const destinationStart = lines.findIndex((line) => plainText(line).includes('DESTINATARIO/REMETENTE'))
    const relativeDestinationEnd = destinationStart >= 0
      ? lines.slice(destinationStart + 1).findIndex((line) => /TRANSPORTADOR\/VOLUMES|CALCULO DO IMPOSTO/i.test(plainText(line)))
      : -1
    const destinationEnd = relativeDestinationEnd >= 0 ? destinationStart + 1 + relativeDestinationEnd : lines.length
    const destinationLines = destinationStart >= 0 ? lines.slice(destinationStart, destinationEnd) : []
    const recipientContextLines = destinationStart >= 0
      ? lines.slice(Math.max(0, destinationStart - 20), destinationEnd)
      : destinationLines
    const destBlock = destinationLines.join('\n') || (normalized.match(/DESTINAT[ÁA]RIO\/REMETENTE([\s\S]*?)(?:C[ÁA]LCULO DO IMPOSTO|TRANSPORTADOR\/VOLUMES|FATURA|$)/i)?.[1] ?? '')
    const transportBlock = normalized.match(/TRANSPORTADOR\/VOLUMES TRANSPORTADOS([\s\S]*?)(?:DADOS DO PRODUTO|C[ÁA]LCULO DO ISSQN|$)/i)?.[1] ?? ''

    const senderFromReceipt = normalized.match(/RECEBEMOS DE\s+(.+?)\s+OS PRODUTOS/i)?.[1]?.trim() ?? ''
    const sender = senderFromReceipt || issuerCandidates[0] || extractAfterLabel(normalized, 'NOME / RAZAO SOCIAL') || extractAfterLabel(transportBlock, 'NOME / RAZAO SOCIAL')
    const senderDocument = documentFromAccessKey(normalized) || firstFormattedDocument(normalized) || extractAfterLabel(normalized, 'CNPJ')
    const recipient = lineAfterPattern(recipientContextLines, /NOME\s*\/?\s*RAZ/i) || extractAfterLabel(destBlock, 'NOME/RAZAO SOCIAL') || extractAfterLabel(destBlock, 'NOME / RAZAO SOCIAL')
    const recipientDocument = firstFormattedDocument(destBlock) || firstFormattedDocument(recipientContextLines.join('\n')) || extractAfterLabel(destBlock, 'CNPJ/CPF') || extractAfterLabel(destBlock, 'CNPJ / CPF')
    const invoiceAccessKey = accessKeyFromText(normalized)
    const invoiceNumberFromKey = invoiceNumberFromAccessKey(invoiceAccessKey)
    const invoiceNumberFromLabel = normalized.match(/N[ºo]\s*(?:NF-?E|NF)?\s*((?:\d[\s.]*){6,12})/i)?.[1]
      || normalized.match(/(?:NF-?e|NF)[\s\S]{0,30}?N[ºo]?\s*((?:\d[\s.]*){6,12})/i)?.[1]
      || ''
    const invoiceNumber = normalizeInvoiceNumber(invoiceNumberFromLabel || invoiceNumberFromKey)
    const invoiceSeries = normalized.match(/S[ÉE]RIE\s*:?\s*(\d+)/i)?.[1] || ''
    const invoiceGoodsValue = firstMoneyAfter(normalized, 'VALOR TOTAL DOS PRODUTOS')
    const invoiceValue = firstMoneyAfter(normalized, 'VALOR TOTAL DA NOTA') || invoiceGoodsValue
    const invoiceIssueDate = normalized.match(/DATA DA EMISS[ÃA]O\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? ''

    if (!sender && !recipient) return null
    return {
      fileName,
      senderDocument,
      sender,
      recipientDocument,
      recipient,
      invoiceNumber,
      invoiceSeries,
      invoiceIssueDate,
      invoiceGoodsValue,
      invoiceValue,
      invoiceAccessKey,
    }
  }

  function openInvoiceImport() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setInvoiceImport(emptyInvoiceImport)
    setInvoiceImportMessage('')
    setInvoiceImportOpen(true)
  }

  async function readInvoiceFile(file: File) {
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      const text = isPdf ? await extractTextFromPdf(file) : await file.text()
      const extracted = extractInvoiceFromXml(text, file.name) ?? extractInvoiceFromDanfText(text, file.name)
      if (!extracted) {
        setInvoiceImport({ ...emptyInvoiceImport, fileName: file.name })
        setInvoiceImportMessage('Nao consegui ler remetente/destinatario automaticamente. Se for PDF escaneado ou imagem, anexe o XML da NF-e ou preencha manualmente aqui.')
        return
      }
      setInvoiceImport(extracted)
      setInvoiceImportMessage('Dados extraidos. Confira antes de aplicar no frete.')
    } catch {
      setInvoiceImport({ ...emptyInvoiceImport, fileName: file.name })
      setInvoiceImportMessage('Nao foi possivel ler o arquivo anexado.')
    }
  }

  function applyInvoiceImport() {
    setForm((current) => {
      const next = {
        ...current,
        senderDocument: invoiceImport.senderDocument || current.senderDocument,
        sender: invoiceImport.sender || current.sender,
        recipientDocument: invoiceImport.recipientDocument || current.recipientDocument,
        recipient: invoiceImport.recipient || current.recipient,
        invoiceNumber: invoiceImport.invoiceNumber || current.invoiceNumber,
        invoiceSeries: invoiceImport.invoiceSeries || current.invoiceSeries,
        invoiceIssueDate: invoiceImport.invoiceIssueDate || current.invoiceIssueDate,
        invoiceGoodsValue: invoiceImport.invoiceGoodsValue || current.invoiceGoodsValue,
        invoiceValue: invoiceImport.invoiceValue || current.invoiceValue,
        invoiceAccessKey: invoiceImport.invoiceAccessKey || current.invoiceAccessKey,
      }
      if (editingFreightId) {
        setFreights(freights.map((freight) => freight.id === editingFreightId ? buildFreightRecord(next, freight) : freight))
      }
      return next
    })
    setInvoiceImportOpen(false)
  }

  function openExtraExpense() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditingExtraExpense({ ...emptyExtraExpense, id: nextId('extra') })
    setExtraProductSearch('')
    setExtraExpenseOpen(true)
  }

  function updateExtraExpense(field: keyof ExtraExpense, value: string) {
    setEditingExtraExpense((current) => ({ ...current, [field]: value }))
  }

  function selectExtraProduct(product: ExtraProduct) {
    setEditingExtraExpense((current) => ({
      ...current,
      reference: product.reference,
      product: product.product,
    }))
    setExtraProductOpen(false)
  }

  function saveExtraExpense(closeAfterSave = true) {
    if (!editingExtraExpense.reference || !editingExtraExpense.product) {
      window.alert('Escolha uma referencia/produto para a despesa extra.')
      return
    }
    setForm((current) => {
      const existing = current.extraExpenses.some((expense) => expense.id === editingExtraExpense.id)
      const extraExpenses = existing
        ? current.extraExpenses.map((expense) => expense.id === editingExtraExpense.id ? editingExtraExpense : expense)
        : [...current.extraExpenses, editingExtraExpense]
      const extraCost = extraExpenses
        .reduce((total, expense) => total + parseBrazilianNumber(expense.expenseValue), 0)
        .toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      const next = { ...current, extraExpenses, extraCost }
      if (editingFreightId) {
        setFreights(freights.map((freight) => freight.id === editingFreightId ? buildFreightRecord(next, freight) : freight))
      }
      return next
    })
    if (closeAfterSave) {
      setExtraExpenseOpen(false)
    }
  }

  function renderFreightCell(columnKey: FreightGridColumnKey, freight: (typeof freights)[number]) {
    const date = freight.date || ''
    const origin = cityState(freight.origin)
    const destination = cityState(freight.destination)
    const startDate = freight.deliveryForecast || freight.date || ''
    const scheduledUnload = freight.destinationScheduleDate
      ? `${freight.destinationScheduleDate}${freight.destinationScheduleTime ? ` ${freight.destinationScheduleTime}` : ''}`
      : ''
    const unloadStartDate = freight.destinationArrivalDate || freight.cntrUnloadingDate || freight.arrivalDate || ''
    const unloadStartHour = freight.destinationArrivalTime || freight.destinationScheduleTime || ''
    const unloadEnd = freight.destinationDepartureDate
      ? `${freight.destinationDepartureDate}${freight.destinationDepartureTime ? ` ${freight.destinationDepartureTime}` : ''}`
      : freight.cntrUnloadingDate || ''

    if (columnKey === 'select') {
      return <input type="checkbox" onClick={(event) => event.stopPropagation()} />
    }

    if (columnKey === 'code') {
      return (
        <button onClick={() => openFreightDetail(freight)} className="flex w-full items-center justify-between gap-2 text-left font-medium text-blue-950">
          <span className="truncate">{freight.process || freight.number}</span>
          <span className="text-red-600">▶</span>
        </button>
      )
    }

    if (columnKey === 'actions') {
      return (
        <div className="relative">
          <button onClick={(event) => { event.stopPropagation(); setOpenActionId(openActionId === freight.id ? null : freight.id) }} className="grid h-5 w-7 place-items-center border border-zinc-300 bg-white">
            <MoreVertical size={14} />
          </button>
          {openActionId === freight.id && (
            <div className="absolute right-0 top-6 z-20 w-36 border border-zinc-300 bg-white py-1 text-xs shadow-lg">
              <button onClick={() => openFreightDetail(freight)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Visualizar</button>
              <button onClick={() => updateFreight(freight.id, { operationalStatus: 'Aprovado para faturamento' })} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Aprovar</button>
              <button onClick={() => duplicateFreight(freight)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Duplicar</button>
              <button onClick={() => updateFreight(freight.id, { operationalStatus: 'Cancelado' })} className="block w-full px-3 py-2 text-left text-red-700 hover:bg-zinc-100">Cancelar</button>
            </div>
          )}
        </div>
      )
    }

    const values: Record<Exclude<FreightGridColumnKey, 'select' | 'code' | 'actions'>, string> = {
      dateStart: startDate,
      status: freight.operationalStatus || 'OPERACAO ENCERRADA',
      customer: freight.customer,
      sender: freight.sender || '-',
      recipient: freight.recipient || '-',
      contractor: freight.contractor || freight.serviceTaker || 'TRANS CAVALCANTE',
      type: 'ETC',
      driver: freight.driver || '-',
      tractor: freight.tractorPlate || '-',
      trailer: freight.trailerPlate || '-',
      origin: origin.city,
      originUf: origin.state || '-',
      destination: destination.city,
      destinationUf: destination.state || '-',
      payment: freight.negotiationCondition || '7 DIAS',
      value: freight.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      fuelValue: parseBrazilianNumber(freight.plannedTollCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      scheduleUnload: scheduledUnload,
      arrivalDate: freight.arrivalDate || '',
      unloadStartDate,
      unloadStartHour,
      cntrDescent: freight.cntrUnloadingDate || '',
      pdWithdrawal: freight.portWithdrawalDate || '',
      unloadEnd,
      cntrReturn: freight.cntrReturnDate || '',
      fiscalNumber: freight.invoiceNumber || '',
      ciot: freight.closing ? '5200029452035879' : '',
      ciotStatus: freight.closing ? 'REGISTRADO' : '',
    }

    return values[columnKey]
  }

  function renderActiveTab() {
    if (activeTab === 'GERAIS') {
      return (
        <div className="p-3">
          <div className="grid gap-x-24 gap-y-1 md:grid-cols-2">
            <div className="grid gap-1">
              <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">CONTRATADO</div>
              <Field label="CNPJ/CPF"><input value={form.contractorDocument} className={textInputClass(true)} disabled /></Field>
              <Field label="Contratado"><input value={form.contractor} className={textInputClass(true)} disabled /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Operador da origem"><input className={textInputClass()} /></Field>
              <Field label="Condicao de negociacao"><select value={form.negotiationCondition} onChange={(event) => updateForm('negotiationCondition', event.target.value)} className={textInputClass()}><option>Selecione...</option><option>7 DIAS [A] (per D)</option><option>A vista</option><option>15 DIAS</option></select></Field>
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
      const dateLocked = !form.recordDates
      return (
        <div className="p-3">
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={form.recordDates} onChange={(event) => updateForm('recordDates', event.target.checked)} /> GRAVAR DATAS
          </label>
          <div className="inline-flex border border-b-0 border-zinc-300 bg-zinc-300 px-2 py-1 text-xs">DESTINO</div>
          <div className="grid gap-x-24 gap-y-1 border border-zinc-300 bg-white p-3 md:grid-cols-2">
            <div className="grid gap-1">
              <Field label="Dt. liberacao documento"><input type="date" value={form.documentReleaseDate} onChange={(event) => updateForm('documentReleaseDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Dt. retirada porto destino"><input type="date" value={form.portWithdrawalDate} onChange={(event) => updateForm('portWithdrawalDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Dt. agendamento entrega" required><input type="date" value={form.destinationScheduleDate} onChange={(event) => updateForm('destinationScheduleDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Hr. agendamento entrega"><input value={form.destinationScheduleTime} onChange={(event) => updateForm('destinationScheduleTime', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Dt.chegada destinatario"><input type="date" value={form.destinationArrivalDate} onChange={(event) => updateForm('destinationArrivalDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Hr. chegada destinatario"><input value={form.destinationArrivalTime} onChange={(event) => updateForm('destinationArrivalTime', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Dt. saida destinatario"><input type="date" value={form.destinationDepartureDate} onChange={(event) => updateForm('destinationDepartureDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Hr. saida destinatario"><input value={form.destinationDepartureTime} onChange={(event) => updateForm('destinationDepartureTime', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Dt. devolucao CNTR"><input type="date" value={form.cntrReturnDate} onChange={(event) => updateForm('cntrReturnDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'DESPESAS PREVISTAS') {
      const listPrice = priceValueForProcess(form.product, form.origin, form.destination)
      const freightCost = form.plannedFreightCost || listPrice || '0'
      const total = parseBrazilianNumber(freightCost) + parseBrazilianNumber(form.plannedTollCost)
      return (
        <div className="p-3">
          <div className="overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center justify-between bg-zinc-400 px-3 text-xs"><span>DESPESA PREVISTA</span><Settings size={16} /></div>
            <table className="w-full min-w-[900px] text-xs">
              <thead><tr>{['Referencia', 'Produto', 'Fornecedor', 'Quantidade total', 'U.M.', 'Vlr. despesa'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody>
                <tr><td className="border-b border-r px-2 py-2">TRA010</td><td className="border-b border-r px-2 py-2">{form.product || 'CUSTO FRETE ROD. DESTINO'}</td><td className="border-b border-r px-2 py-2">{form.contractor || '-'}</td><td className="border-b border-r px-2 py-2 text-right">1,0000</td><td className="border-b border-r px-2 py-2">UN</td><td className="border-b px-2 py-2"><input value={freightCost} onChange={(event) => { updateForm('plannedFreightCost', event.target.value); updateForm('value', event.target.value) }} className={textInputClass()} /></td></tr>
                <tr><td className="border-b border-r px-2 py-2">TRA014</td><td className="border-b border-r px-2 py-2">PEDAGIO</td><td className="border-b border-r px-2 py-2">-</td><td className="border-b border-r px-2 py-2 text-right">1,0000</td><td className="border-b border-r px-2 py-2">UN</td><td className="border-b px-2 py-2"><input value={form.plannedTollCost} onChange={(event) => updateForm('plannedTollCost', event.target.value)} className={textInputClass()} /></td></tr>
              </tbody>
            </table>
            <div className="border-t border-emerald-500 bg-emerald-50 px-8 py-2 text-right text-xs">Total = {formatMoney(total)}</div>
          </div>
        </div>
      )
    }

    if (activeTab === 'DESPESAS EXTRAS') {
      const total = form.extraExpenses.reduce((sum, expense) => sum + parseBrazilianNumber(expense.expenseValue), 0)
      return (
        <div className="p-3">
          <div className="border border-zinc-300 bg-white">
            <div className="flex h-8 justify-end gap-2 bg-zinc-400 px-3 py-1"><Settings size={17} /><button onClick={openExtraExpense} className="grid h-5 w-5 place-items-center bg-black text-white">+</button></div>
            {form.extraExpenses.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-xs">
                  <thead>
                    <tr>{['Referencia', 'Produto', 'Fornecedor', 'Tipo justificativa', 'Observacao', 'Vlr. despesa', 'Vlr faturar CT-e'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr>
                  </thead>
                  <tbody>
                    {form.extraExpenses.map((expense, index) => (
                      <tr key={expense.id} className={index % 2 ? 'bg-zinc-100' : 'bg-white'}>
                        <td className="border-b border-r px-2 py-2">{expense.reference}</td>
                        <td className="border-b border-r px-2 py-2">{expense.product}</td>
                        <td className="border-b border-r px-2 py-2">{expense.supplier || '-'}</td>
                        <td className="border-b border-r px-2 py-2">{expense.justificationType || '-'}</td>
                        <td className="border-b border-r px-2 py-2">{expense.observation || '-'}</td>
                        <td className="border-b border-r px-2 py-2 text-right">{parseBrazilianNumber(expense.expenseValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="border-b px-2 py-2 text-right">{parseBrazilianNumber(expense.cteBillingValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyGridMessage text="Nao ha informacoes. Utilize o botao + para adicionar." />
            )}
            <div className="border-t border-emerald-500 bg-emerald-50 px-8 py-2 text-right text-xs">Total = {formatMoney(total)}</div>
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
              <tbody>
                <tr>
                  <td className="border-b border-r px-2 py-2"><input value={form.invoiceNumber} onChange={(event) => updateForm('invoiceNumber', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r px-2 py-2">NF-e</td>
                  <td className="border-b border-r px-2 py-2"><input value={form.invoiceSeries} onChange={(event) => updateForm('invoiceSeries', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r px-2 py-2"><input value={form.invoiceIssueDate} onChange={(event) => updateForm('invoiceIssueDate', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r px-2 py-2">{form.recipient || '-'}</td>
                  <td className="border-b border-r px-2 py-2"><input value={form.invoiceGoodsValue} onChange={(event) => updateForm('invoiceGoodsValue', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r px-2 py-2"><input value={form.invoiceValue} onChange={(event) => updateForm('invoiceValue', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b px-2 py-2">{form.invoiceAccessKey || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTab === 'CIOT') {
      const date = form.deliveryForecast || new Date().toISOString().slice(0, 10)
      const endDate = form.cntrReturnDate || form.destinationScheduleDate || date
      return (
        <div className="p-3">
          <Field label="Tipo de viagem"><input value="P-Padrao" className={`${textInputClass(true)} max-w-md`} disabled /></Field>
          <div className="mt-2 overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 px-2 text-xs">
              <div className="ml-auto">{form.ciotNumber ? '2' : '1'} de {form.ciotNumber ? '2' : '1'} registros</div>
              <input className="ml-2 h-6 w-32 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
              <div className="flex items-center gap-2 pl-3"><Settings size={18} /><span>&lt;-&gt;</span><span>☑</span><span>1:1</span></div>
            </div>
            <table className="w-full min-w-[980px] table-fixed text-xs">
              <thead className="bg-white">
                <tr>
                  {['', '', 'No CIOT', 'Situacao', 'Dt. Inicio viagem', 'Dt. fim viagem', 'Dt. registro', 'Dt. quitacao', 'Dt. retificacao'].map((heading, index) => (
                    <th key={`${heading}-${index}`} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                      {heading}
                      {heading && <span className="float-right text-zinc-400">▾</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-sky-300">
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="checkbox" defaultChecked /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1 text-zinc-500">⋮</td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input value={form.ciotNumber} onChange={(event) => updateForm('ciotNumber', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input value={form.ciotNumber ? 'REGISTRADO' : ''} className={textInputClass(true)} disabled /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" value={date} onChange={(event) => updateForm('deliveryForecast', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" value={endDate} onChange={(event) => updateForm('cntrReturnDate', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" value={date} className={textInputClass()} readOnly /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" className={textInputClass()} /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" className={textInputClass()} /></td>
                </tr>
                {form.ciotNumber && (
                  <tr>
                    <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="checkbox" /></td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1 text-zinc-500">⋮</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{form.ciotNumber}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">REGISTRADO</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{date}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{endDate}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{date}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1"></td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTab === 'PROTOCOLO') {
      const field = 'protocolStatus'
      const label = 'Situacao'
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

          <div
            className="grid min-h-[calc(100vh-150px)] transition-[grid-template-columns]"
            style={{ gridTemplateColumns: filtersCollapsed ? '30px minmax(0,1fr)' : '430px minmax(0,1fr)' }}
          >
            <aside className="overflow-hidden border-r border-zinc-500 bg-zinc-100">
              {filtersCollapsed ? (
                <button
                  onClick={() => setFiltersCollapsed(false)}
                  className="flex h-full w-full items-start justify-center bg-zinc-200 pt-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-300"
                  title="Abrir filtro"
                >
                  &gt;
                </button>
              ) : (
                <>
                  <div className="flex h-7 items-center justify-between border-b border-zinc-400 px-2 text-xs">
                    <span>Filtro</span>
                    <div className="flex items-center gap-2 text-zinc-800">
                      <Settings size={15} />
                      <button onClick={() => setFiltersCollapsed(true)} title="Recolher filtro"><X size={15} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[11px] text-red-600">INFORME PELO MENOS UM CAMPO PARA CONSULTAR OS DADOS</span>
                    <div className="flex items-center gap-2">
                      <Search size={22} strokeWidth={2.5} />
                      <button onClick={() => setFilters({ processNumber: '', processCode: '', dateStart: '', dateEnd: '', processDescription: '', status: '', supplier: '', processType: '', container: '', originDateStart: '', originDateEnd: '' })} title="Limpar filtro">
                        <Eraser size={20} strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>
                  <div className="mx-1 grid min-h-[calc(100vh-220px)] content-start gap-1 border border-dotted border-zinc-500 p-1 text-xs">
                    <Field label="Nr. do processo"><div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] gap-1"><input value={filters.processNumber} onChange={(event) => setFilters({ ...filters, processNumber: event.target.value })} className={textInputClass()} /><span className="text-center leading-7">ate</span><input className={textInputClass()} /></div></Field>
                    <Field label="Codigo do processo"><input value={filters.processCode} onChange={(event) => setFilters({ ...filters, processCode: event.target.value })} className={textInputClass()} /></Field>
                    <Field label="Data inicial"><div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] gap-1"><input type="date" value={filters.dateStart} onChange={(event) => setFilters({ ...filters, dateStart: event.target.value })} className={textInputClass()} /><span className="text-center leading-7">ate</span><input type="date" value={filters.dateEnd} onChange={(event) => setFilters({ ...filters, dateEnd: event.target.value })} className={textInputClass()} /></div></Field>
                    <Field label="Descricao do Processo"><input value={filters.processDescription} onChange={(event) => setFilters({ ...filters, processDescription: event.target.value })} className={textInputClass()} /></Field>
                    <Field label="Situacao"><input value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} className={textInputClass()} /></Field>
                    <div className="mt-2 border border-zinc-400">
                      <div className="flex h-7 items-center justify-between bg-zinc-100 px-2 text-xs"><span>Fornecedor</span><div className="flex gap-2"><Filter size={18} fill="currentColor" /><X size={18} /></div></div>
                      <select value={filters.supplier} onChange={(event) => setFilters({ ...filters, supplier: event.target.value })} className="h-7 w-full border-t border-zinc-300 bg-white px-2 text-xs">
                        <option value="">Selecione...</option>
                        {customers.map((customer) => <option key={customer.id}>{customer.name}</option>)}
                      </select>
                    </div>
                    <Field label="Tipo processo"><input value={filters.processType} onChange={(event) => setFilters({ ...filters, processType: event.target.value })} className={textInputClass()} /></Field>
                    <Field label="No Container"><input value={filters.container} onChange={(event) => setFilters({ ...filters, container: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                    <Field label="Dt. origem"><div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] gap-1"><input type="date" value={filters.originDateStart} onChange={(event) => setFilters({ ...filters, originDateStart: event.target.value })} className={textInputClass()} /><span className="text-center leading-7">ate</span><input type="date" value={filters.originDateEnd} onChange={(event) => setFilters({ ...filters, originDateEnd: event.target.value })} className={textInputClass()} /></div></Field>
                  </div>
                </>
              )}
            </aside>

            <section className="min-w-0 bg-white">
              <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 text-xs">
                <div className="px-2 font-semibold">Transportes de carga rodoviario</div>
                <div className="ml-auto px-2">{visibleFreights.length} registros</div>
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="mr-2 h-6 w-36 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
                <div className="relative flex items-center gap-2 pr-2">
                  <button onClick={() => setColumnMenuOpen(!columnMenuOpen)} className="inline-flex h-6 items-center gap-1 border border-zinc-500 bg-zinc-200 px-2 hover:bg-white">
                    <Settings size={16} /> Colunas
                  </button>
                  {columnMenuOpen && (
                    <div className="absolute right-10 top-7 z-30 max-h-80 w-64 overflow-auto border border-zinc-500 bg-white p-2 text-xs shadow-xl">
                      <div className="mb-2 border-b border-zinc-300 pb-1 font-semibold">Exibir colunas</div>
                      {freightGridColumns.filter((column) => column.label).map((column) => (
                        <label key={column.key} className="flex items-center justify-between gap-2 py-1">
                          <span>{column.label}</span>
                          <input
                            type="checkbox"
                            checked={!hiddenColumns[column.key]}
                            disabled={'locked' in column && column.locked}
                            onChange={() => toggleColumn(column.key)}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                  <span>&lt;-&gt;</span>
                  <span>1:1</span>
                  <span>XLS</span>
                  <button onClick={openNewFreight} className="grid h-6 w-6 place-items-center bg-black text-white">+</button>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="table-fixed text-xs" style={{ minWidth: freightGridMinWidth }}>
                  <thead className="bg-white">
                    <tr>
                      {visibleFreightColumns.map((column) => (
                        <th
                          key={column.key}
                          className="relative border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700"
                          style={{ width: columnWidths[column.key] ?? column.width }}
                        >
                          <span className="block truncate pr-5">{column.label}</span>
                          {column.label && <button onClick={() => toggleColumn(column.key)} disabled={'locked' in column && column.locked} className="absolute right-2 top-2 text-zinc-400 disabled:cursor-default disabled:opacity-40">▼</button>}
                          {!('locked' in column && column.locked) && <span onMouseDown={(event) => startColumnResize(event, column)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-sky-500" />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFreights.map((freight, index) => (
                      <tr key={freight.id} onDoubleClick={() => openFreightDetail(freight)} className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} cursor-default hover:bg-sky-100`}>
                        {visibleFreightColumns.map((column) => (
                          <td
                            key={column.key}
                            className={`border-b border-r border-zinc-200 px-2 py-1 ${column.key === 'value' || column.key === 'fuelValue' ? 'text-right' : ''}`}
                            style={{ width: columnWidths[column.key] ?? column.width }}
                          >
                            <div className="truncate">{renderFreightCell(column.key, freight)}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {!visibleFreights.length && <tr><td colSpan={visibleFreightColumns.length} className="px-3 py-10 text-center text-zinc-500">Nenhum transporte encontrado.</td></tr>}
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
                <button onClick={openInvoiceImport} className="inline-flex items-center gap-1"><Paperclip size={15} /> ANEXAR</button>
                <button onClick={() => setTaskHistoryOpen(true)} className="inline-flex items-center gap-1"><MoreVertical size={15} /> HISTORICO TAREFA</button>
                <button onClick={() => setShowForm(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div>
              <div className="grid gap-x-24 gap-y-1 border-b-4 border-zinc-400 p-3 md:grid-cols-2">
                <div className="grid gap-1">
                  <Field label="Codigo do processo" required><input value={form.process} onChange={(event) => updateForm('process', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                  <Field label="Situacao"><input value={form.status} onChange={(event) => updateForm('status', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="CNPJ/CPF"><input value={form.serviceTakerDocument} className={textInputClass(true)} disabled /></Field>
                  <Field label="Tomador do servico"><input value={form.serviceTaker} className={textInputClass(true)} disabled /></Field>
                  <Field label="CNPJ/CPF"><input value={form.senderDocument} className={textInputClass(true)} disabled /></Field>
                  <Field label="Remetente"><input value={form.sender} className={textInputClass(true)} disabled /></Field>
                </div>
                <div className="grid gap-1">
                  <Field label="Tipo processo" required><select value={form.processType} onChange={(event) => updateForm('processType', event.target.value)} className={textInputClass()}><option>Multimodal [M]</option><option>Rodoviario [R]</option></select></Field>
                  <Field label="Identificacao do cliente"><input value={form.customerIdentification} onChange={(event) => updateForm('customerIdentification', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="Cliente" required><select value={form.customer} onChange={(event) => updateForm('customer', event.target.value)} className={textInputClass()}><option value="">Selecione...</option>{customers.map((customer) => <option key={customer.id}>{customer.name}</option>)}</select></Field>
                  <Field label="Produto">
                    <select value={form.product} onChange={(event) => updateForm('product', event.target.value)} className={textInputClass()}>
                      <option value="">Selecione...</option>
                      {productOptions.map((product) => <option key={product} value={product}>{product}</option>)}
                      {form.product && !productOptions.includes(form.product) && <option value={form.product}>{form.product}</option>}
                    </select>
                  </Field>
                  <Field label="CNPJ/CPF"><input value={form.recipientDocument} className={textInputClass(true)} disabled /></Field>
                  <Field label="Destinatario"><input value={form.recipient} className={textInputClass(true)} disabled /></Field>
                </div>
              </div>

              <div className="flex flex-wrap items-end border-b border-zinc-300 px-2 pt-3 text-xs">
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
                <span className="px-2.5 py-1 text-zinc-400">ORIENTACAO INTERNA</span>
              </div>
              <div className="min-h-[calc(100vh-420px)] bg-zinc-100">{renderActiveTab()}</div>
            </div>
          </div>
        </div>
      )}

      {taskHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-zinc-950/30 px-4 py-8">
          <div className="max-h-[calc(100vh-64px)] w-full max-w-5xl overflow-hidden border-4 border-red-700 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-sm font-semibold text-red-600">TAREFAS DO FLUXO</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setTaskHistoryOpen(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 px-2 text-xs">
              <span>Historico Tarefa</span>
              <span className="ml-auto mr-2">{form.taskHistory.length} de {form.taskHistory.length} registros</span>
              <input className="mr-2 h-6 w-36 border border-zinc-300 bg-white px-2 outline-none" placeholder="Busca rapida" />
              <Settings size={17} />
              <span className="px-2">1:1</span>
              <X size={18} />
            </div>
            <div className="min-h-[430px] overflow-auto bg-white">
              <table className="w-full min-w-[980px] text-xs">
                <thead>
                  <tr className="bg-white">
                    {['Nome da tarefa', 'Situacao', 'Envia ao clier', 'Data de inicio', 'Tempo', 'Usuario'].map((heading) => (
                      <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">{heading} <span className="float-right text-zinc-400">▼</span></th>
                    ))}
                  </tr>
                  <tr className="bg-white">
                    {['Descricao', 'Conclusao %', 'Uso Interno?', 'Data fim', '', ''].map((heading, index) => (
                      <th key={`${heading}-${index}`} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">{heading} {heading && <span className="float-right text-zinc-400">▼</span>}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.taskHistory.map((task) => (
                    <tr key={task.id} className="odd:bg-zinc-100 even:bg-white">
                      <td className="border-b border-r border-zinc-200 px-2 py-2">
                        <div>{task.name}</div>
                        <div className="pt-3 text-zinc-700">{task.description}</div>
                      </td>
                      <td className="border-b border-r border-zinc-200 px-2 py-2">
                        <div>{task.status}</div>
                        <div className="pt-3 text-right">{task.completionPercent.toFixed(2).replace('.', ',')}</div>
                      </td>
                      <td className="border-b border-r border-zinc-200 px-2 py-2">
                        <div>{task.sendToCustomer}</div>
                        <div className="pt-3">{task.internalUse}</div>
                      </td>
                      <td className="border-b border-r border-zinc-200 px-2 py-2">
                        <div>{task.startDate}</div>
                        <div className="pt-3">{task.endDate}</div>
                      </td>
                      <td className="border-b border-r border-zinc-200 px-2 py-2">{task.time}</td>
                      <td className="border-b border-zinc-200 px-2 py-2">Incluido e Alterado por {task.user}</td>
                    </tr>
                  ))}
                  {!form.taskHistory.length && (
                    <tr><td colSpan={6} className="px-3 py-16 text-center text-zinc-500">Nenhuma tarefa no fluxo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex h-10 items-center justify-end border-t border-zinc-300 bg-white px-3">
              <button onClick={() => { setShowPreviousTasks(false); setTaskPickerOpen(true) }} className="inline-flex items-center gap-2 text-xs"><span className="grid h-5 w-5 place-items-center rounded-full bg-black text-white">+</span> ADICIONAR</button>
            </div>
          </div>
        </div>
      )}

      {taskPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-zinc-950/20 px-4 py-10">
          <div className="w-full max-w-4xl border-4 border-red-700 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Tarefa</h3>
              <button onClick={() => setTaskPickerOpen(false)} className="grid h-7 w-7 place-items-center rounded-full bg-black text-white"><X size={18} /></button>
            </div>
            <div className="h-8 border-b border-zinc-300 bg-zinc-400" />
            <label className="flex h-9 items-center gap-2 border-b border-zinc-300 px-6 text-xs">
              <input type="checkbox" checked={showPreviousTasks} onChange={(event) => setShowPreviousTasks(event.target.checked)} />
              Ver status anteriores
            </label>
            <div className="min-h-[360px] bg-white p-6 text-xs font-semibold">
              {availableTaskOptions.map((task) => (
                <button key={task} onClick={() => addFlowTask(task)} className="block px-2 py-1 text-left hover:bg-sky-100">
                  {task}
                </button>
              ))}
              {!availableTaskOptions.length && (
                <div className="px-2 py-1 font-normal text-zinc-500">Todos os status disponiveis ja foram adicionados.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {extraExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/25 px-4 py-6">
          <div className="system-modal max-h-[calc(100vh-48px)] w-full max-w-6xl overflow-auto border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Manutencao despesa extra</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={() => saveExtraExpense(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
                <button onClick={() => saveExtraExpense(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => setExtraExpenseOpen(false)} className="grid h-7 w-7 place-items-center rounded-full bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div className="relative p-2">
              <div className="grid gap-x-24 gap-y-1 border-b-4 border-zinc-400 pb-3 md:grid-cols-2">
                <div className="grid gap-1">
                  <Field label="Referencia" required>
                    <div className="flex">
                      <input value={editingExtraExpense.reference} onChange={(event) => updateExtraExpense('reference', event.target.value.toUpperCase())} className={textInputClass()} />
                      <button onClick={() => setExtraProductOpen(true)} className="grid h-7 w-8 place-items-center bg-white text-black" title="Consultar produto"><Filter size={18} fill="currentColor" /></button>
                      <button onClick={() => setEditingExtraExpense((current) => ({ ...current, reference: '', product: '' }))} className="grid h-7 w-7 place-items-center bg-white"><X size={18} /></button>
                    </div>
                  </Field>
                  <Field label="Produto" required><input value={editingExtraExpense.product} onChange={(event) => updateExtraExpense('product', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                  <div className="mt-6 grid grid-cols-[135px_90px_1fr_34px] items-center gap-1 text-xs">
                    <span className="text-right text-red-600">Sigla</span>
                    <select value={editingExtraExpense.currency} onChange={(event) => updateExtraExpense('currency', event.target.value)} className={textInputClass()}><option>BRL REAL/BI</option><option>USD DOLAR</option></select>
                    <input value={editingExtraExpense.exchangeRate} onChange={(event) => updateExtraExpense('exchangeRate', event.target.value)} className={`${textInputClass()} text-right`} />
                    <button className="h-7 border border-zinc-300 bg-zinc-200">▦</button>
                  </div>
                  <label className="ml-[145px] flex items-center gap-2 text-xs"><input type="checkbox" /> Ratear valor faturado?</label>
                </div>

                <div className="grid gap-1">
                  <Field label="Tipo de justificativa">
                    <div className="flex">
                      <input value={editingExtraExpense.justificationType} onChange={(event) => updateExtraExpense('justificationType', event.target.value.toUpperCase())} className={textInputClass()} />
                      <button className="grid h-7 w-8 place-items-center bg-white"><Filter size={18} fill="currentColor" /></button>
                      <button onClick={() => updateExtraExpense('justificationType', '')} className="grid h-7 w-7 place-items-center bg-white"><X size={18} /></button>
                    </div>
                  </Field>
                  <Field label="Observacao" required><input value={editingExtraExpense.observation} onChange={(event) => updateExtraExpense('observation', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                  <Field label="CNPJ/CPF/Codigo">
                    <div className="flex">
                      <input value={editingExtraExpense.supplierDocument} onChange={(event) => updateExtraExpense('supplierDocument', event.target.value)} className={textInputClass()} />
                      <button className="grid h-7 w-8 place-items-center bg-white"><Filter size={18} fill="currentColor" /></button>
                      <button onClick={() => updateExtraExpense('supplierDocument', '')} className="grid h-7 w-7 place-items-center bg-white"><X size={18} /></button>
                    </div>
                  </Field>
                  <Field label="Fornecedor"><input value={editingExtraExpense.supplier} onChange={(event) => updateExtraExpense('supplier', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                  <Field label="Vlr. despesa" required><input value={editingExtraExpense.expenseValue} onChange={(event) => updateExtraExpense('expenseValue', event.target.value)} className={`${textInputClass()} text-right`} /></Field>
                  <Field label="Vlr Faturar CT-e"><input value={editingExtraExpense.cteBillingValue} onChange={(event) => updateExtraExpense('cteBillingValue', event.target.value)} className={`${textInputClass()} text-right`} /></Field>
                </div>
              </div>

              <div className="mt-3 border-t-2 border-zinc-500 pt-1">
                <div className="mb-2 text-xs font-semibold">COMPRA</div>
                <div className="grid gap-x-24 gap-y-1 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Field label="Dias extra compra"><input value={editingExtraExpense.purchaseExtraDays} onChange={(event) => updateExtraExpense('purchaseExtraDays', event.target.value)} className={textInputClass()} /></Field>
                    <Field label="(-) Dias livre compra"><input value={editingExtraExpense.purchaseFreeDays} onChange={(event) => updateExtraExpense('purchaseFreeDays', event.target.value)} className={textInputClass()} /></Field>
                    <Field label="(=) Dias extra compra calc."><input value={editingExtraExpense.calculatedPurchaseExtraDays} onChange={(event) => updateExtraExpense('calculatedPurchaseExtraDays', event.target.value)} className={textInputClass()} /></Field>
                  </div>
                  <div className="grid gap-1">
                    <Field label="Vlr. dia compra"><input value="0,00" className={`${textInputClass(true)} text-right`} disabled /></Field>
                    <Field label="Valor extra compra"><input value={editingExtraExpense.expenseValue || '0,00'} className={`${textInputClass(true)} text-right`} disabled /></Field>
                  </div>
                </div>
              </div>

              {extraProductOpen && (
                <div className="absolute left-6 right-6 top-24 z-[70] border-4 border-red-700 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-3 py-2">
                    <h3 className="text-lg font-normal text-red-600">Produto</h3>
                    <button onClick={() => setExtraProductOpen(false)} className="grid h-7 w-7 place-items-center rounded-full bg-black text-white"><X size={18} /></button>
                  </div>
                  <div className="flex h-8 items-center bg-zinc-400 px-2 text-xs">
                    <div className="ml-auto">{filteredExtraProducts.length} de {extraProducts.length} registros</div>
                    <input value={extraProductSearch} onChange={(event) => setExtraProductSearch(event.target.value)} className="ml-2 h-6 w-36 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
                    <div className="flex items-center gap-2 pl-3"><Settings size={18} /><span>1:1</span><Filter size={18} fill="currentColor" /><span>▤</span></div>
                  </div>
                  <div className="max-h-[430px] overflow-auto">
                    <table className="w-full min-w-[820px] text-xs">
                      <thead><tr>{['Referencia', 'Produto', 'Codigo estruturado', 'Dt. cadastro'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
                      <tbody>
                        {filteredExtraProducts.map((product, index) => (
                          <tr key={`${product.reference}-${product.product}`} onDoubleClick={() => selectExtraProduct(product)} onClick={() => selectExtraProduct(product)} className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} cursor-default hover:bg-sky-200`}>
                            <td className="border-b border-r border-zinc-200 px-2 py-2">{product.reference}</td>
                            <td className="border-b border-r border-zinc-200 px-2 py-2">{product.product}</td>
                            <td className="border-b border-r border-zinc-200 px-2 py-2">{product.structuredCode}</td>
                            <td className="border-b border-zinc-200 px-2 py-2">{product.createdAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {invoiceImportOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-8">
          <div className="max-h-[calc(100vh-64px)] w-full max-w-5xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Anexar NF-e</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={applyInvoiceImport} className="inline-flex items-center gap-1"><Save size={15} /> APLICAR NO FRETE</button>
                <button onClick={() => setInvoiceImportOpen(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div className="p-3">
              <div className="grid gap-x-24 gap-y-2 border-b-4 border-zinc-400 pb-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <Field label="Arquivo">
                    <input
                      type="file"
                      accept=".xml,.txt,.pdf,application/xml,text/xml,application/pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) readInvoiceFile(file)
                      }}
                      className="h-7 w-full border border-zinc-300 bg-white px-2 text-xs"
                    />
                  </Field>
                  <Field label="Nome do arquivo"><input value={invoiceImport.fileName} className={textInputClass(true)} disabled /></Field>
                </div>
                <div className="text-xs text-zinc-700">
                  {invoiceImportMessage || 'Anexe o XML da NF-e ou um DANFE PDF com texto pesquisavel.'}
                </div>
              </div>

              <div className="grid gap-x-24 gap-y-1 pt-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">REMETENTE / EMITENTE DA NF</div>
                  <Field label="CNPJ/CPF"><input value={invoiceImport.senderDocument} onChange={(event) => setInvoiceImport({ ...invoiceImport, senderDocument: event.target.value })} className={textInputClass()} /></Field>
                  <Field label="Remetente"><input value={invoiceImport.sender} onChange={(event) => setInvoiceImport({ ...invoiceImport, sender: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                </div>
                <div className="grid gap-1">
                  <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">DESTINATARIO / RECEBEDOR</div>
                  <Field label="CNPJ/CPF"><input value={invoiceImport.recipientDocument} onChange={(event) => setInvoiceImport({ ...invoiceImport, recipientDocument: event.target.value })} className={textInputClass()} /></Field>
                  <Field label="Destinatario"><input value={invoiceImport.recipient} onChange={(event) => setInvoiceImport({ ...invoiceImport, recipient: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                </div>
              </div>
              <div className="mt-4 grid gap-x-24 gap-y-1 border-t border-zinc-400 pt-4 md:grid-cols-2">
                <div className="grid gap-1">
                  <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">DADOS DA NF-E</div>
                  <Field label="Nr. nfe"><input value={invoiceImport.invoiceNumber} onChange={(event) => setInvoiceImport({ ...invoiceImport, invoiceNumber: event.target.value })} className={textInputClass()} /></Field>
                  <Field label="Serie"><input value={invoiceImport.invoiceSeries} onChange={(event) => setInvoiceImport({ ...invoiceImport, invoiceSeries: event.target.value })} className={textInputClass()} /></Field>
                  <Field label="Dt. emissao"><input value={invoiceImport.invoiceIssueDate} onChange={(event) => setInvoiceImport({ ...invoiceImport, invoiceIssueDate: event.target.value })} className={textInputClass()} /></Field>
                </div>
                <div className="grid gap-1">
                  <Field label="Vlr. mercadoria"><input value={invoiceImport.invoiceGoodsValue} onChange={(event) => setInvoiceImport({ ...invoiceImport, invoiceGoodsValue: event.target.value })} className={textInputClass()} /></Field>
                  <Field label="Vlr. nf-e"><input value={invoiceImport.invoiceValue} onChange={(event) => setInvoiceImport({ ...invoiceImport, invoiceValue: event.target.value })} className={textInputClass()} /></Field>
                  <Field label="Chave"><input value={invoiceImport.invoiceAccessKey} onChange={(event) => setInvoiceImport({ ...invoiceImport, invoiceAccessKey: event.target.value })} className={textInputClass()} /></Field>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
