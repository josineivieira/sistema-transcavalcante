import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Check, Eraser, Filter, Info, MoreVertical, Paperclip, Save, Search, Settings, X } from 'lucide-react'
import { formatMoney, nextId, type Freight, type FreightCiotEntry, type FreightInvoiceEntry, type FreightTask } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege, getAuthUser } from '../services/authSession'
import { LoadingState } from '../components/LoadingState'
import { api } from '../services/api'

const freightTabs = [
  'GERAIS',
  'ROTA',
  'CONTAINERS',
  'CONTROLE DE DATAS',
  'DESPESAS PREVISTAS',
  'DESPESAS EXTRAS',
  'NOTAS FISCAIS',
  'CIOT',
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
  containerDraft: string
  containerEntries: FreightContainerEntry[]
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
  invoiceEntries: FreightInvoiceEntry[]
  smNumber: string
  ciotNumber: string
  ciotDraft: string
  ciotEntries: FreightCiotEntry[]
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

type FreightContainerEntry = {
  id: string
  code: string
  type: string
  number: string
  tare: string
  maxWeight: string
  mgw: string
  seal: string
  exportSeal: string
}

type ExtraProduct = {
  reference: string
  product: string
  structuredCode: string
  createdAt: string
}

type LookupKind = 'customer' | 'driver' | 'tractor' | 'trailer' | 'product' | 'supplier'
type LookupOption = {
  id?: string
  name?: string
  document?: string
  plate?: string
  description?: string
  value?: string
  label?: string
}
type FreightFormOptionsResponse = {
  customers: LookupOption[]
  drivers: LookupOption[]
  tractors: LookupOption[]
  trailers: LookupOption[]
  products: LookupOption[]
  suppliers: LookupOption[]
}

type InvoiceImport = {
  fileName: string
  invoices: FreightInvoiceEntry[]
  senderDocument: string
  sender: string
  senderAddress: string
  senderDistrict: string
  senderZipCode: string
  recipientDocument: string
  recipient: string
  recipientAddress: string
  recipientDistrict: string
  recipientZipCode: string
  recipientCity: string
  recipientState: string
  invoiceNumber: string
  invoiceSeries: string
  invoiceIssueDate: string
  invoiceGoodsValue: string
  invoiceValue: string
  invoiceAccessKey: string
}

type RouteDestinationResponse = {
  destination: string
  zipCode: string
  latitude: string
  longitude: string
}

type RouteDistanceResponse = {
  distanceKm: string
}

const emptyForm: FreightForm = {
  customer: '',
  process: '',
  processType: '',
  status: 'AGENDAMENTO E CARREGAMENTO 15',
  customerIdentification: '',
  serviceTakerDocument: '',
  serviceTaker: '',
  senderDocument: '',
  sender: '',
  product: '',
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
  containerDraft: '',
  containerEntries: [],
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
  invoiceEntries: [],
  smNumber: '',
  ciotNumber: '',
  ciotDraft: '',
  ciotEntries: [],
  dfeNumber: '',
  protocolStatus: 'Aguardando',
  taskHistory: [],
  value: '0',
}

const emptyInvoiceImport: InvoiceImport = {
  fileName: '',
  invoices: [],
  senderDocument: '',
  sender: '',
  senderAddress: '',
  senderDistrict: '',
  senderZipCode: '',
  recipientDocument: '',
  recipient: '',
  recipientAddress: '',
  recipientDistrict: '',
  recipientZipCode: '',
  recipientCity: '',
  recipientState: '',
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

function LookupInput({
  value,
  onChange,
  onLookup,
  onClear,
}: {
  value: string
  onChange: (value: string) => void
  onLookup: () => void
  onClear: () => void
}) {
  return (
    <div className="flex">
      <input value={value} onChange={(event) => onChange(event.target.value)} className={textInputClass()} />
      <button type="button" onClick={onLookup} className="grid h-7 w-8 place-items-center bg-white text-black" title="Consultar"><Filter size={18} fill="currentColor" /></button>
      <button type="button" onClick={onClear} className="grid h-7 w-7 place-items-center bg-white"><X size={18} /></button>
    </div>
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
  { key: 'container', label: 'Container', width: 132, minWidth: 100 },
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
  { key: 'documentRelease', label: 'Dt. liberacao doc.', width: 132, minWidth: 110 },
  { key: 'pdWithdrawal', label: 'Dt. retirada P.D.', width: 128, minWidth: 108 },
  { key: 'scheduleDelivery', label: 'Dt. agendamento entrega', width: 170, minWidth: 138 },
  { key: 'scheduleDeliveryHour', label: 'Hr. agendamento entrega', width: 160, minWidth: 128 },
  { key: 'destinationArrival', label: 'Dt.chegada destinatario', width: 160, minWidth: 128 },
  { key: 'destinationArrivalHour', label: 'Hr. chegada destinatario', width: 156, minWidth: 126 },
  { key: 'destinationDeparture', label: 'Dt. saida destinatario', width: 150, minWidth: 120 },
  { key: 'destinationDepartureHour', label: 'Hr. saida destinatario', width: 146, minWidth: 118 },
  { key: 'cntrReturn', label: 'Dt. devolucao CNTR', width: 142, minWidth: 116 },
  { key: 'fiscalNumber', label: 'NFS-e', width: 116, minWidth: 96 },
  { key: 'ciot', label: 'CIOT', width: 128, minWidth: 100 },
  { key: 'ciotStatus', label: 'Situacao CIOT', width: 122, minWidth: 100 },
  { key: 'actions', label: 'Acoes', width: 58, minWidth: 54, locked: true },
] as const

type FreightGridColumnKey = typeof freightGridColumns[number]['key']

const defaultFreightColumnWidths = freightGridColumns.reduce<Record<string, number>>((widths, column) => {
  widths[column.key] = column.width
  return widths
}, {})

const freightTaskOptions = [
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
  const {
    vehicles,
    freights,
    freightsLoading,
    freightsTotal,
    priceLists,
    issuerSettings,
    loading,
    loadFreights,
    saveFreightRecord,
    deleteFreightRecord,
  } = useLocalData()
  const canEditPage = canEdit('freights')
  const authUser = getAuthUser()
  const issuerName = issuerSettings.legalName || issuerSettings.tradeName || 'TRANSCAVALCANTE'
  const issuerDocument = issuerSettings.document || ''
  const [showForm, setShowForm] = useState(false)
  const [editingFreightId, setEditingFreightId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<FreightTab>('GERAIS')
  const [plannedExpenseEdit, setPlannedExpenseEdit] = useState<string | null>(null)
  const [savingFreightMode, setSavingFreightMode] = useState<'save' | 'save-close' | null>(null)
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
  const [lookupOpen, setLookupOpen] = useState<LookupKind | null>(null)
  const [lookupSearch, setLookupSearch] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupOptions, setLookupOptions] = useState<FreightFormOptionsResponse>({
    customers: [],
    drivers: [],
    tractors: [],
    trailers: [],
    products: [],
    suppliers: [],
  })
  const [editingExtraExpense, setEditingExtraExpense] = useState<ExtraExpense>(emptyExtraExpense)
  const [editingCiotId, setEditingCiotId] = useState<string | null>(null)
  const [form, setForm] = useState<FreightForm>({
    ...emptyForm,
    serviceTakerDocument: issuerDocument,
    serviceTaker: issuerName,
    contractorDocument: issuerDocument,
    contractor: issuerName,
  })

  const tractors = useMemo(() => vehicles.filter((vehicle) => vehicle.vehicleType === 'Cavalo'), [vehicles])
  const trailers = useMemo(() => vehicles.filter((vehicle) => vehicle.vehicleType === 'Carreta'), [vehicles])
  const selectedTractor = tractors.find((vehicle) => vehicle.id === form.tractorId)
  const selectedTrailer = trailers.find((vehicle) => vehicle.id === form.trailerId)
  const lookupTractor = lookupOptions.tractors.find((vehicle) => vehicle.id === form.tractorId)
  const lookupTrailer = lookupOptions.trailers.find((vehicle) => vehicle.id === form.trailerId)
  const tractorDescription = selectedTractor?.description || selectedTractor?.type || lookupTractor?.description || ''
  const trailerDescription = selectedTrailer?.description || selectedTrailer?.type || lookupTrailer?.description || ''
  useEffect(() => {
    setForm((current) => ({
      ...current,
      serviceTakerDocument: issuerDocument,
      serviceTaker: issuerName,
      contractorDocument: issuerDocument,
      contractor: issuerName,
    }))
  }, [issuerDocument, issuerName])

  useEffect(() => {
    if (!lookupOpen) return
    setLookupLoading(true)
    const timeout = window.setTimeout(() => {
      api.get<FreightFormOptionsResponse>('/operational-options/freight-form', {
        params: { search: lookupSearch, limit: 80 },
      }).then((response) => {
        setLookupOptions(response.data)
      }).catch(() => {
        setLookupOptions({ customers: [], drivers: [], tractors: [], trailers: [], products: [], suppliers: [] })
      }).finally(() => {
        setLookupLoading(false)
      })
    }, 200)

    return () => window.clearTimeout(timeout)
  }, [lookupOpen, lookupSearch])

  const generalReady = Boolean(form.process && form.processType && form.customer && form.serviceTaker)
  const routeReady = Boolean(form.routeName && form.origin && form.destination)
  const serviceReady = Boolean(generalReady && routeReady && form.driver && form.tractorId)
  const hasAbastecido = form.taskHistory.some((task) => task.name === 'ABASTECIDO 17')
  const hasNotasRecebidas = form.taskHistory.some((task) => task.name === 'NOTA(S) FISCAL(IS) RECEBIDA(S) 20')
  const containerRows = legacyContainerRows(form)
  const containerReady = Boolean(serviceReady && containerRows.length)
  const availableTaskOptions = freightTaskOptions.filter((task) => (
    showPreviousTasks || !form.taskHistory.some((history) => history.name === task)
  ))
  const filteredExtraProducts = useMemo(() => {
    const term = extraProductSearch.toLowerCase()
    return extraProducts.filter((product) =>
      [product.reference, product.product, product.structuredCode].some((value) => value.toLowerCase().includes(term)),
    )
  }, [extraProductSearch])
  const invoiceSenderOptions = useMemo(() => {
    const options = invoiceImport.invoices
      .map((invoice) => ({
        document: invoice.senderDocument,
        name: invoice.sender,
        address: invoice.senderAddress ?? '',
        district: invoice.senderDistrict ?? '',
        zipCode: invoice.senderZipCode ?? '',
      }))
      .filter((option) => option.document || option.name)
    return Array.from(new Map(options.map((option) => [`${option.document}|${option.name}`, option])).values())
  }, [invoiceImport])
  const invoiceRecipientOptions = useMemo(() => {
    const options = invoiceImport.invoices
      .map((invoice) => ({
        document: invoice.recipientDocument,
        name: invoice.recipient || `Nota ${invoice.invoiceNumber || invoice.fileName} - informar destinatario`,
        address: invoice.recipientAddress ?? '',
        district: invoice.recipientDistrict ?? '',
        zipCode: invoice.recipientZipCode ?? '',
        city: invoice.recipientCity ?? '',
        state: invoice.recipientState ?? '',
      }))
    return Array.from(new Map(options.map((option) => [`${option.document}|${option.name}`, option])).values())
  }, [invoiceImport.invoices])

  const tabAvailability: Record<FreightTab, boolean> = {
    GERAIS: true,
    ROTA: true,
    CONTAINERS: true,
    'CONTROLE DE DATAS': true,
    'DESPESAS PREVISTAS': hasAbastecido,
    'DESPESAS EXTRAS': hasAbastecido,
    'NOTAS FISCAIS': hasNotasRecebidas,
    CIOT: hasNotasRecebidas,
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadFreights({
        search,
        status: filters.status,
        process_number: filters.processNumber,
        process_code: filters.processCode,
        date_start: filters.dateStart,
        date_end: filters.dateEnd,
        process_description: filters.processDescription,
        supplier: filters.supplier,
        process_type: filters.processType,
        container: filters.container,
        origin_date_start: filters.originDateStart,
        origin_date_end: filters.originDateEnd,
        limit: 500,
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [
    filters.container,
    filters.dateEnd,
    filters.dateStart,
    filters.originDateEnd,
    filters.originDateStart,
    filters.processCode,
    filters.processDescription,
    filters.processNumber,
    filters.processType,
    filters.status,
    filters.supplier,
    loadFreights,
    search,
  ])

  const visibleFreights = freights
  const freightListLoading = loading || freightsLoading

  const visibleFreightColumns = useMemo(
    () => freightGridColumns.filter((column) => !hiddenColumns[column.key]),
    [hiddenColumns],
  )

  const freightGridMinWidth = visibleFreightColumns.reduce((total, column) => total + (columnWidths[column.key] ?? column.width), 0)

  function clearFreightFilters() {
    setSearch('')
    setFilters({
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
  }

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

  function nextProcessCode() {
    const maxNumber = freights.reduce((max, freight) => {
      const match = freight.process.match(/^TR(\d+)$/i)
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    return `TR${String(maxNumber + 1).padStart(2, '0')}`
  }

  function updateForm(field: keyof FreightForm, value: string | boolean) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'origin' || field === 'destination') {
        next.routeName = `${field === 'origin' ? value : next.origin} X ${field === 'destination' ? value : next.destination}`.replace(/^ X | X $/g, '')
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

  function openLookup(kind: LookupKind) {
    setLookupOpen(kind)
    setLookupSearch('')
  }

  function closeLookup() {
    setLookupOpen(null)
    setLookupSearch('')
  }

  function selectLookupOption(option: LookupOption) {
    if (!lookupOpen) return
    if (lookupOpen === 'customer') {
      updateForm('customer', option.name || option.label || '')
    }
    if (lookupOpen === 'driver') {
      updateForm('driver', option.name || option.label || '')
    }
    if (lookupOpen === 'tractor') {
      updateForm('tractorId', option.id || option.plate || '')
    }
    if (lookupOpen === 'trailer') {
      updateForm('trailerId', option.id || option.plate || '')
    }
    if (lookupOpen === 'product') {
      updateForm('product', option.value || option.label || '')
    }
    if (lookupOpen === 'supplier') {
      setFilters((current) => ({ ...current, supplier: option.label || option.name || option.value || '' }))
    }
    closeLookup()
  }

  function lookupRows() {
    if (lookupOpen === 'customer') return lookupOptions.customers
    if (lookupOpen === 'driver') return lookupOptions.drivers
    if (lookupOpen === 'tractor') return lookupOptions.tractors
    if (lookupOpen === 'trailer') return lookupOptions.trailers
    if (lookupOpen === 'product') return lookupOptions.products
    if (lookupOpen === 'supplier') return lookupOptions.suppliers
    return []
  }

  function lookupTitle() {
    if (lookupOpen === 'customer') return 'Cliente'
    if (lookupOpen === 'driver') return 'Motorista'
    if (lookupOpen === 'tractor') return 'Cavalo mecanico'
    if (lookupOpen === 'trailer') return 'Carreta'
    if (lookupOpen === 'product') return 'Produto'
    if (lookupOpen === 'supplier') return 'Fornecedor'
    return 'Consulta'
  }

  function persistFreightForm(snapshot: FreightForm) {
    if (!editingFreightId) return
    const currentFreight = freights.find((freight) => freight.id === editingFreightId)
    if (currentFreight) {
      void saveFreightRecord(buildFreightRecord(snapshot, currentFreight))
    }
  }

  function legacyCiotRows(snapshot: Partial<FreightForm>) {
    if (snapshot.ciotEntries?.length) return snapshot.ciotEntries
    if (!snapshot.ciotNumber) return []
    const startDate = snapshot.deliveryForecast || new Date().toISOString().slice(0, 10)
    const endDate = snapshot.cntrReturnDate || snapshot.destinationScheduleDate || startDate
    return [{
      id: 'ciot-legacy',
      number: snapshot.ciotNumber,
      status: 'REGISTRADO',
      startDate,
      endDate,
      registrationDate: startDate,
      dischargeDate: '',
      rectificationDate: '',
    }]
  }

  function materializeCiotDraft(snapshot: FreightForm, draftValue = snapshot.ciotDraft) {
    const number = draftValue.trim()
    const currentEntries = legacyCiotRows(snapshot).filter((entry) => entry.id !== 'ciot-legacy' || entry.number)
    if (!number) {
      return {
        ...snapshot,
        ciotDraft: '',
        ciotNumber: currentEntries[0]?.number ?? '',
        ciotEntries: currentEntries,
      }
    }

    const startDate = snapshot.deliveryForecast || new Date().toISOString().slice(0, 10)
    const endDate = snapshot.cntrReturnDate || snapshot.destinationScheduleDate || startDate
    const newEntry: FreightCiotEntry = {
      id: editingCiotId ?? nextId('ciot'),
      number,
      status: 'REGISTRADO',
      startDate,
      endDate,
      registrationDate: startDate,
      dischargeDate: '',
      rectificationDate: '',
    }
    const exists = currentEntries.some((entry) => entry.id === newEntry.id)
    const ciotEntries = exists
      ? currentEntries.map((entry) => entry.id === newEntry.id ? { ...entry, ...newEntry } : entry)
      : [...currentEntries, newEntry]

    return {
      ...snapshot,
      ciotDraft: '',
      ciotNumber: ciotEntries[0]?.number ?? '',
      ciotEntries,
    }
  }

  function legacyContainerRows(snapshot: Partial<FreightForm>) {
    if (snapshot.containerEntries?.length) return snapshot.containerEntries
    if (!snapshot.container) return []
    return [{
      id: 'container-legacy',
      code: '40 HC',
      type: 'Dry',
      number: snapshot.container,
      tare: '3800',
      maxWeight: '25000',
      mgw: '32.500,0000',
      seal: 'LCR-1001',
      exportSeal: '-',
    }]
  }

  function materializeContainerDraft(snapshot: FreightForm, draftValue = snapshot.containerDraft) {
    const number = draftValue.trim().toUpperCase()
    const currentEntries = legacyContainerRows(snapshot).filter((entry) => entry.id !== 'container-legacy' || entry.number)
    if (!number) {
      return {
        ...snapshot,
        containerDraft: '',
        container: currentEntries[0]?.number ?? '',
        containerEntries: currentEntries,
      }
    }

    const existsByNumber = currentEntries.some((entry) => entry.number.toUpperCase() === number)
    const containerEntries = existsByNumber
      ? currentEntries
      : [...currentEntries, {
        id: nextId('cntr'),
        code: '40 HC',
        type: 'Dry',
        number,
        tare: '3800',
        maxWeight: '25000',
        mgw: '32.500,0000',
        seal: 'LCR-1001',
        exportSeal: '-',
      }]

    return {
      ...snapshot,
      containerDraft: '',
      container: containerEntries[0]?.number ?? '',
      containerEntries,
    }
  }

  function commitContainerDraft(draftValue = form.containerDraft) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const number = draftValue.trim()
    if (!number) return
    const next = materializeContainerDraft({ ...form, containerDraft: number }, number)
    setForm(next)
    persistFreightForm(next)
  }

  function removeContainerEntry(id: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const containerEntries = legacyContainerRows(form).filter((entry) => entry.id !== id)
    const next = {
      ...form,
      container: containerEntries[0]?.number ?? '',
      containerEntries,
    }
    setForm(next)
    persistFreightForm(next)
  }

  function commitCiotDraft(draftValue = form.ciotDraft) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const number = draftValue.trim()
    if (!number) return
    const next = materializeCiotDraft({ ...form, ciotDraft: number }, number)
    setForm(next)
    setEditingCiotId(null)
    persistFreightForm(next)
  }

  function editCiotEntry(entry: FreightCiotEntry) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditingCiotId(entry.id)
    setForm((current) => ({ ...current, ciotDraft: entry.number }))
  }

  function resetForm() {
    setEditingFreightId(null)
    setEditingCiotId(null)
    setForm({
      ...emptyForm,
      process: nextProcessCode(),
      serviceTakerDocument: issuerDocument,
      serviceTaker: issuerName,
      contractorDocument: issuerDocument,
      contractor: issuerName,
      container: '',
      documentReleaseDate: new Date().toISOString().slice(0, 10),
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
    const ciotEntries = legacyCiotRows(savedForm)
    const containerEntries = legacyContainerRows(savedForm)
    setEditingFreightId(freight.id)
    setEditingCiotId(null)
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
      documentReleaseDate: savedForm.documentReleaseDate || freight.date,
      origin: freight.origin,
      destination: freight.destination,
      driver: freight.driver,
      tractorId: freight.tractorId || (tractor?.id ?? ''),
      trailerId: freight.trailerId || (trailer?.id ?? ''),
      container: containerEntries[0]?.number ?? freight.container,
      containerDraft: '',
      containerEntries,
      ciotDraft: '',
      ciotNumber: ciotEntries[0]?.number ?? '',
      ciotEntries,
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
        const currentFreight = freights.find((freight) => freight.id === editingFreightId)
        if (currentFreight) {
          void saveFreightRecord(buildFreightRecord(next, currentFreight))
        }
      }
      return next
    })
    setTaskPickerOpen(false)
  }

  function buildFreightRecord(formSnapshot: FreightForm, existing?: Freight): Freight {
    const createdDate = existing?.date ?? new Date().toISOString().slice(0, 10)
    const matchedPrice = priceValueForProcess(formSnapshot.product, formSnapshot.origin, formSnapshot.destination)
    const rawValue = parseBrazilianNumber(formSnapshot.value || formSnapshot.plannedFreightCost)
    const value = rawValue > 0 ? rawValue : parseBrazilianNumber(matchedPrice)
    const tractor = tractors.find((item) => item.id === formSnapshot.tractorId)
    const trailer = trailers.find((item) => item.id === formSnapshot.trailerId)
    const tractorOption = lookupOptions.tractors.find((item) => item.id === formSnapshot.tractorId || item.plate === formSnapshot.tractorId)
    const trailerOption = lookupOptions.trailers.find((item) => item.id === formSnapshot.trailerId || item.plate === formSnapshot.trailerId)
    return {
      ...formSnapshot,
      id: existing?.id ?? nextId('fr'),
      number: existing?.number ?? formSnapshot.process,
      date: createdDate,
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
      container: formSnapshot.containerEntries[0]?.number ?? formSnapshot.container,
      containerDraft: '',
      containerEntries: formSnapshot.containerEntries,
      driver: formSnapshot.driver,
      tractorPlate: tractor?.tractorPlate ?? tractorOption?.plate ?? existing?.tractorPlate ?? formSnapshot.tractorId,
      trailerPlate: trailer?.trailerPlate ?? trailerOption?.plate ?? existing?.trailerPlate ?? formSnapshot.trailerId,
      origin: formSnapshot.origin,
      destination: formSnapshot.destination,
      documentReleaseDate: formSnapshot.documentReleaseDate || createdDate,
      value,
      operationalStatus: formSnapshot.status || existing?.operationalStatus || 'AGENDAMENTO E CARREGAMENTO 15',
      fiscalStatus: existing?.fiscalStatus ?? 'Pendente',
      closing: existing?.closing,
    }
  }

  async function saveFreight(closeAfterSave = true) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (savingFreightMode) return
    setSavingFreightMode(closeAfterSave ? 'save-close' : 'save')
    const process = form.process || nextProcessCode()
    const existingByProcess = freights.find((freight) => freight.process.toUpperCase() === process.toUpperCase())
    const activeFreightId = editingFreightId || existingByProcess?.id || null
    const duplicatedProcess = freights.some((freight) => freight.process.toUpperCase() === process.toUpperCase() && freight.id !== activeFreightId)
    if (duplicatedProcess) {
      setSavingFreightMode(null)
      window.alert('Codigo do processo ja existe. Gere ou informe outro codigo.')
      return
    }
    if (!process || !form.processType || !form.customer || !form.serviceTaker) {
      setSavingFreightMode(null)
      window.alert('Informe Codigo do processo, Tipo processo, Cliente e Tomador do servico.')
      return
    }

    const formSnapshot = materializeCiotDraft(materializeContainerDraft({ ...form, process }))
    setForm(formSnapshot)
    setEditingCiotId(null)
    setPlannedExpenseEdit(null)

    try {
      if (activeFreightId) {
        const currentFreight = freights.find((freight) => freight.id === activeFreightId)
        const freightToSave = currentFreight
          ? buildFreightRecord(formSnapshot, currentFreight)
          : { ...buildFreightRecord(formSnapshot), id: activeFreightId, number: formSnapshot.process }
        await saveFreightRecord(freightToSave)
        setEditingFreightId(activeFreightId)
      } else {
        const createdFreight = buildFreightRecord(formSnapshot)
        const savedFreight = await saveFreightRecord(createdFreight)
        if (!closeAfterSave) {
          setEditingFreightId(savedFreight.id)
        }
      }

      if (closeAfterSave) {
        setShowForm(false)
        resetForm()
      }
    } catch {
      window.alert('Nao foi possivel salvar este frete no banco. Verifique os dados e tente novamente.')
    } finally {
      setSavingFreightMode(null)
    }
  }

  function updateFreight(id: string, patch: Partial<(typeof freights)[number]>) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const currentFreight = freights.find((freight) => freight.id === id)
    if (currentFreight) {
      void saveFreightRecord({ ...currentFreight, ...patch })
    }
    setOpenActionId(null)
  }

  function duplicateFreight(freight: (typeof freights)[number]) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    void saveFreightRecord({ ...freight, id: nextId('fr'), number: `FRT-${String(freights.length + 1).padStart(6, '0')}`, process: nextProcessCode(), closing: undefined })
    setOpenActionId(null)
  }

  function requestDeleteFreight() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editingFreightId) {
      setShowForm(false)
      resetForm()
      return
    }
    setDeleteConfirmOpen(true)
  }

  async function confirmDeleteFreight() {
    if (!editingFreightId) {
      setDeleteConfirmOpen(false)
      return
    }
    const currentFreight = freights.find((freight) => freight.id === editingFreightId || freight.process === form.process || freight.number === form.process)
    const deleteId = currentFreight?.id || editingFreightId
    try {
      await deleteFreightRecord(deleteId, [form.process, currentFreight?.process ?? '', currentFreight?.number ?? ''])
      setDeleteConfirmOpen(false)
      setShowForm(false)
      resetForm()
      await loadFreights({ limit: 500 })
    } catch {
      window.alert('Nao foi possivel excluir este frete no banco. Tente novamente.')
    }
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

  function invoiceSeriesFromAccessKey(accessKey: string) {
    return accessKey.length === 44 ? accessKey.slice(22, 25) : ''
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

  function formatDanfDate(value: string) {
    const match = value.match(/(\d{2})\/(\d{2})\/(\d{2,4})/)
    if (!match) return ''
    const [, day, month, rawYear] = match
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    return `${day}/${month}/${year}`
  }

  function firstMoneyAfter(text: string, label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = text.match(new RegExp(`${escaped}[\\s\\S]{0,220}?(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2})`, 'i'))
    return match?.[1] ?? ''
  }

  function lastMoneyAfter(text: string, label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const window = text.match(new RegExp(`${escaped}([\\s\\S]{0,260})`, 'i'))?.[1] ?? ''
    const values = [...window.matchAll(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g)].map((match) => match[1])
    return values.length ? values[values.length - 1] : ''
  }

  function firstDateAfter(text: string, label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = text.match(new RegExp(`${escaped}[\\s\\S]{0,120}?(\\d{2}\\/\\d{2}\\/\\d{2,4})`, 'i'))
    return formatDanfDate(match?.[1] ?? '')
  }

  function firstZipCode(text: string) {
    return text.match(/\b\d{5}-?\d{3}\b/)?.[0] ?? ''
  }

  function lineValueAfterPattern(lines: string[], pattern: RegExp) {
    return lineAfterPattern(lines, pattern)
      .replace(/\b\d{5}-?\d{3}\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  function ufFromLines(lines: string[]) {
    const joined = `\n${lines.join('\n')}\n`
    return joined.match(/\nUF\s*\n?\s*([A-Z]{2})\b/i)?.[1]?.toUpperCase() ?? ''
  }

  function invoiceEntryFromImport(invoice: InvoiceImport): FreightInvoiceEntry {
    return {
      id: nextId('nfe'),
      fileName: invoice.fileName,
      senderDocument: invoice.senderDocument,
      sender: invoice.sender,
      senderAddress: invoice.senderAddress,
      senderDistrict: invoice.senderDistrict,
      senderZipCode: invoice.senderZipCode,
      recipientDocument: invoice.recipientDocument,
      invoiceNumber: invoice.invoiceNumber,
      invoiceSeries: invoice.invoiceSeries,
      invoiceIssueDate: invoice.invoiceIssueDate,
      recipient: invoice.recipient,
      recipientAddress: invoice.recipientAddress,
      recipientDistrict: invoice.recipientDistrict,
      recipientZipCode: invoice.recipientZipCode,
      recipientCity: invoice.recipientCity,
      recipientState: invoice.recipientState,
      invoiceGoodsValue: invoice.invoiceGoodsValue,
      invoiceValue: invoice.invoiceValue,
      invoiceAccessKey: invoice.invoiceAccessKey,
    }
  }

  function extractInvoiceFromXml(text: string, fileName: string): InvoiceImport | null {
    const xml = new DOMParser().parseFromString(text, 'application/xml')
    if (xml.getElementsByTagName('parsererror').length) return null

    const emit = xml.getElementsByTagName('emit')[0]
    const dest = xml.getElementsByTagName('dest')[0]
    const enderEmit = emit?.getElementsByTagName('enderEmit')[0] ?? null
    const enderDest = dest?.getElementsByTagName('enderDest')[0] ?? null
    const ide = xml.getElementsByTagName('ide')[0]
    const total = xml.getElementsByTagName('ICMSTot')[0]
    const infNfe = xml.getElementsByTagName('infNFe')[0]
    if (!emit && !dest) return null

    const invoice = {
      fileName,
      invoices: [],
      senderDocument: getXmlText(emit, 'CNPJ') || getXmlText(emit, 'CPF'),
      sender: getXmlText(emit, 'xNome'),
      senderAddress: [getXmlText(enderEmit, 'xLgr'), getXmlText(enderEmit, 'nro')].filter(Boolean).join(', '),
      senderDistrict: getXmlText(enderEmit, 'xBairro'),
      senderZipCode: getXmlText(enderEmit, 'CEP'),
      recipientDocument: getXmlText(dest, 'CNPJ') || getXmlText(dest, 'CPF'),
      recipient: getXmlText(dest, 'xNome'),
      recipientAddress: [getXmlText(enderDest, 'xLgr'), getXmlText(enderDest, 'nro')].filter(Boolean).join(', '),
      recipientDistrict: getXmlText(enderDest, 'xBairro'),
      recipientZipCode: getXmlText(enderDest, 'CEP'),
      recipientCity: getXmlText(enderDest, 'xMun'),
      recipientState: getXmlText(enderDest, 'UF'),
      invoiceNumber: getXmlText(ide, 'nNF'),
      invoiceSeries: getXmlText(ide, 'serie'),
      invoiceIssueDate: formatIsoDate(getXmlText(ide, 'dhEmi') || getXmlText(ide, 'dEmi')),
      invoiceGoodsValue: getXmlText(total, 'vProd').replace('.', ','),
      invoiceValue: getXmlText(total, 'vNF').replace('.', ','),
      invoiceAccessKey: infNfe?.getAttribute('Id')?.replace(/^NFe/i, '') || accessKeyFromText(text),
    }
    return { ...invoice, invoices: [invoiceEntryFromImport(invoice)] }
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

  function looksLikeBusinessName(line: string) {
    return /\b(LTDA|EIRELI|S\/A|S\.A\.| ME\b| EPP\b|INDUSTRIA|COMERCIO|COMERCIAL|TRANSPORTES|LOGISTICA|ABATEDOURO|FRIGORIFICO|MERCANTIL|DISTRIBUIDORA)\b/i.test(plainText(line))
  }

  function cleanDanfLine(line: string) {
    return line
      .replace(/^(NOME\s*\/?\s*RAZ[AÃ]O\s*SOCIAL|RAZ[AÃ]O\s*SOCIAL|DESTINAT[AÃ]RIO\/REMETENTE)\s*/i, '')
      .replace(/\bC\.?N\.?P\.?J\.?\/?C\.?P\.?F\.?\b.*$/i, '')
      .replace(/\bCNPJ\/CPF\b.*$/i, '')
      .replace(/\bDATA\s+(?:DA\s+)?EMISS[AÁÃÂÀƒ]O\b.*$/i, '')
      .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*$/g, '')
      .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}.*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  function firstBusinessName(lines: string[], exclude?: string) {
    const normalizedExclude = plainText(exclude || '').toUpperCase()
    return lines
      .map(cleanDanfLine)
      .find((line) => {
        const normalized = plainText(line).toUpperCase()
        return line
          && looksLikeBusinessName(line)
          && !/^(DANFE|NF-?E|DOCUMENTO|CHAVE|PROTOCOLO|NATUREZA|INSCRICAO|CNPJ|CPF|ENDERECO|BAIRRO|CEP|MUNICIPIO|FONE|DATA|HORA|VALOR)/i.test(normalized)
          && (!normalizedExclude || normalized !== normalizedExclude)
      }) ?? ''
  }

  function recipientFromDanfSection(lines: string[], sender: string) {
    const destinationStart = lines.findIndex((line) => plainText(line).replace(/\s+/g, '').includes('DESTINATARIO/REMETENTE'))
    if (destinationStart < 0) return ''
    const section = lines.slice(destinationStart + 1, destinationStart + 24)
    const byLabel = lineAfterPattern(section, /NOME\s*\/?\s*RAZ/i)
    if (byLabel && looksLikeBusinessName(byLabel)) return cleanDanfLine(byLabel)
    return firstBusinessName(section, sender)
  }

  function recipientFromDanfText(normalized: string, sender: string) {
    const receiptRecipient = normalized.match(/DEST\/REME:\s*(.+?)\s+VALOR TOTAL/i)?.[1] ?? ''
    if (receiptRecipient && looksLikeBusinessName(receiptRecipient)) return cleanDanfLine(receiptRecipient)
    const searchable = plainText(normalized)
    const block = searchable.match(/DESTINATARIO\s*\/\s*REMETENTE([\s\S]{0,1000}?)(?:CALCULO DO IMPOSTO|TRANSPORTADOR\/VOLUMES|DADOS DO PRODUTO|FATURA|$)/i)?.[1] ?? ''
    const direct = block.match(/NOME\s*\/?\s*RAZAO\s*SOCIAL\s+(.+?)(?:\s+C\.?N\.?P\.?J| CNPJ| DATA\s+(?:DA\s+)?EMISSAO|\n|$)/i)?.[1] ?? ''
    if (direct && looksLikeBusinessName(direct)) return cleanDanfLine(direct)
    return firstBusinessName(block.split('\n'), sender)
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
      const positioned = content.items.map((item) => {
        if (typeof item === 'object' && item !== null && 'str' in item && 'transform' in item) {
          const typed = item as { str: string; transform: number[] }
          return {
            text: String(typed.str).trim(),
            x: typed.transform[4] ?? 0,
            y: typed.transform[5] ?? 0,
          }
        }
        return null
      }).filter((item): item is { text: string; x: number; y: number } => Boolean(item?.text))
      const rows: Array<{ y: number; items: Array<{ text: string; x: number }> }> = []
      positioned
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .forEach((item) => {
          const row = rows.find((candidate) => Math.abs(candidate.y - item.y) < 3)
          if (row) {
            row.items.push(item)
          } else {
            rows.push({ y: item.y, items: [item] })
          }
        })
      const visualText = rows
        .map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' '))
        .join('\n')
      const rawText = positioned.map((item) => item.text).join('\n')
      pages.push(`${visualText}\n${rawText}`)
    }
    return pages.join('\n')
  }

  function extractInvoiceFromDanfText(text: string, fileName: string): InvoiceImport | null {
    const normalized = text.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ')
    const searchableText = plainText(normalized)
    const lines = text
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const natureIndex = lines.findIndex((line) => /NATUREZA DA OPERA/i.test(plainText(line)))
    const issuerCandidates = (natureIndex > 0 ? lines.slice(0, natureIndex) : lines.slice(0, 25))
      .filter((line) => /LTDA|EIRELI|S\/A| SA | ME\b| EPP\b/i.test(line))
      .filter((line) => !/DANFE|NF-?E|DESTINAT/i.test(line))
    const destinationStart = lines.findIndex((line) => plainText(line).replace(/\s+/g, '').includes('DESTINATARIO/REMETENTE'))
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
    const issuerBlockLines = natureIndex > 0 ? lines.slice(0, natureIndex) : lines.slice(0, 25)
    const issuerBlock = issuerBlockLines.join('\n')
    const sender = senderFromReceipt || issuerCandidates[0] || extractAfterLabel(normalized, 'NOME / RAZAO SOCIAL') || extractAfterLabel(transportBlock, 'NOME / RAZAO SOCIAL')
    const senderDocument = documentFromAccessKey(normalized) || firstFormattedDocument(normalized) || extractAfterLabel(normalized, 'CNPJ')
    const senderAddress = issuerBlockLines.find((line) => /\b(RUA|AV\.?|AVENIDA|ROD\.?|RODOVIA|ESTRADA|TRAVESSA|ALAMEDA)\b/i.test(plainText(line))) ?? ''
    const senderZipCode = firstZipCode(issuerBlock)
    const recipient = recipientFromDanfText(normalized, sender)
      || recipientFromDanfSection(lines, sender)
      || lineAfterPattern(recipientContextLines, /NOME\s*\/?\s*RAZ/i)
      || extractAfterLabel(destBlock, 'NOME/RAZAO SOCIAL')
      || extractAfterLabel(destBlock, 'NOME / RAZAO SOCIAL')
    const recipientDocument = firstFormattedDocument(destBlock) || firstFormattedDocument(recipientContextLines.join('\n')) || extractAfterLabel(destBlock, 'CNPJ/CPF') || extractAfterLabel(destBlock, 'CNPJ / CPF')
    const recipientAddress = lineValueAfterPattern(destinationLines, /ENDERE[CÇ]O/i)
    const recipientDistrict = lineValueAfterPattern(destinationLines, /BAIRRO/i)
    const recipientZipCode = firstZipCode(destBlock)
    const recipientCity = lineValueAfterPattern(destinationLines, /MUNIC[IÍ]PIO/i)
    const recipientState = ufFromLines(destinationLines)
    const invoiceAccessKey = accessKeyFromText(normalized)
    const invoiceNumberFromKey = invoiceNumberFromAccessKey(invoiceAccessKey)
    const invoiceNumberFromLabel = normalized.match(/N[ºo]\s*(?:NF-?E|NF)?\s*((?:\d[\s.]*){6,12})/i)?.[1]
      || normalized.match(/(?:NF-?e|NF)[\s\S]{0,30}?N[ºo]?\s*((?:\d[\s.]*){6,12})/i)?.[1]
      || ''
    const invoiceNumber = normalizeInvoiceNumber(invoiceNumberFromLabel || invoiceNumberFromKey)
    const invoiceSeries = normalized.match(/S[ÉE]RIE\s*:?\s*(\d+)/i)?.[1] || ''
    const invoiceSeriesFromKey = invoiceSeriesFromAccessKey(invoiceAccessKey)
    const safeInvoiceSeries = normalizeInvoiceNumber((invoiceSeries.length <= 3 ? invoiceSeries : '') || invoiceSeriesFromKey)
    const invoiceGoodsValue = lastMoneyAfter(normalized, 'VALOR TOTAL DOS PRODUTOS')
      || lastMoneyAfter(normalized, 'TOTAL DOS PRODUTOS')
      || firstMoneyAfter(normalized, 'VALOR TOTAL DOS PRODUTOS')
    const invoiceValue = lastMoneyAfter(normalized, 'VALOR TOTAL DA NOTA')
      || lastMoneyAfter(normalized, 'TOTAL DA NOTA')
      || firstMoneyAfter(normalized, 'VALOR TOTAL DA NOTA')
      || invoiceGoodsValue
    const invoiceIssueDate = firstDateAfter(searchableText, 'DATA DA EMISSAO')
      || firstDateAfter(searchableText, 'DATA EMISSAO')
      || firstDateAfter(searchableText, 'DATA DE EMISSAO')
      || formatDanfDate(normalized.match(/DATA\s+(?:DA\s+)?EMISS[AÁÃÂÀ]O[\s\S]{0,120}?(\d{2}\/\d{2}\/\d{2,4})/i)?.[1] ?? '')

    if (!sender && !recipient) return null
    const invoice = {
      fileName,
      invoices: [],
      senderDocument,
      sender,
      senderAddress,
      senderDistrict: '',
      senderZipCode,
      recipientDocument,
      recipient,
      recipientAddress,
      recipientDistrict,
      recipientZipCode,
      recipientCity,
      recipientState,
      invoiceNumber,
      invoiceSeries: safeInvoiceSeries,
      invoiceIssueDate,
      invoiceGoodsValue,
      invoiceValue,
      invoiceAccessKey,
    }
    return { ...invoice, invoices: [invoiceEntryFromImport(invoice)] }
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

  function mergeInvoiceImport(current: InvoiceImport, extracted: InvoiceImport) {
    const invoices = [...current.invoices, ...extracted.invoices]
    return {
      ...extracted,
      fileName: invoices.map((invoice) => invoice.fileName).join(', '),
      senderDocument: current.senderDocument || extracted.senderDocument,
      sender: current.sender || extracted.sender,
      senderAddress: current.senderAddress || extracted.senderAddress,
      senderDistrict: current.senderDistrict || extracted.senderDistrict,
      senderZipCode: current.senderZipCode || extracted.senderZipCode,
      recipientDocument: current.recipientDocument || extracted.recipientDocument,
      recipient: current.recipient || extracted.recipient,
      recipientAddress: current.recipientAddress || extracted.recipientAddress,
      recipientDistrict: current.recipientDistrict || extracted.recipientDistrict,
      recipientZipCode: current.recipientZipCode || extracted.recipientZipCode,
      recipientCity: current.recipientCity || extracted.recipientCity,
      recipientState: current.recipientState || extracted.recipientState,
      invoices,
    }
  }

  function updateImportedInvoice(id: string, patch: Partial<FreightInvoiceEntry>) {
    setInvoiceImport((current) => {
      const invoices = current.invoices.map((invoice) => invoice.id === id ? { ...invoice, ...patch } : invoice)
      const selectedStillExists = invoices.some((invoice) =>
        invoice.recipientDocument === current.recipientDocument && invoice.recipient === current.recipient
      )
      const selectedInvoice = invoices.find((invoice) => invoice.id === id)
      return {
        ...current,
        invoices,
        recipientDocument: selectedStillExists ? current.recipientDocument : selectedInvoice?.recipientDocument ?? current.recipientDocument,
        recipient: selectedStillExists ? current.recipient : selectedInvoice?.recipient ?? current.recipient,
        recipientAddress: selectedStillExists ? current.recipientAddress : selectedInvoice?.recipientAddress ?? current.recipientAddress,
        recipientDistrict: selectedStillExists ? current.recipientDistrict : selectedInvoice?.recipientDistrict ?? current.recipientDistrict,
        recipientZipCode: selectedStillExists ? current.recipientZipCode : selectedInvoice?.recipientZipCode ?? current.recipientZipCode,
        recipientCity: selectedStillExists ? current.recipientCity : selectedInvoice?.recipientCity ?? current.recipientCity,
        recipientState: selectedStillExists ? current.recipientState : selectedInvoice?.recipientState ?? current.recipientState,
      }
    })
  }

  async function resolveImportedDestination(importData: InvoiceImport) {
    try {
      const response = await api.post<RouteDestinationResponse>('/operational-options/route-destination', {
        zip_code: importData.recipientZipCode,
        address: importData.recipientAddress,
        district: importData.recipientDistrict,
        city: importData.recipientCity,
        state: importData.recipientState,
      })
      return response.data
    } catch {
      return null
    }
  }

  async function resolveRouteDistanceKm(originLatitude: string, originLongitude: string, destinationLatitude: string, destinationLongitude: string) {
    try {
      const response = await api.post<RouteDistanceResponse>('/operational-options/route-distance', {
        origin_latitude: originLatitude,
        origin_longitude: originLongitude,
        destination_latitude: destinationLatitude,
        destination_longitude: destinationLongitude,
      })
      return response.data.distanceKm
    } catch {
      return ''
    }
  }

  async function resolveRouteZip(side: 'origin' | 'destination') {
    const zipCode = side === 'origin' ? form.originZipCode : form.destinationZipCode
    if (zipCode.replace(/\D/g, '').length < 8) return
    const place = side === 'origin' ? form.origin : form.destination
    const [city = '', state = ''] = place.split('/').map((part) => part.trim())
    try {
      const response = await api.post<RouteDestinationResponse>('/operational-options/route-destination', {
        zip_code: zipCode,
        city,
        state,
      })
      const data = response.data
      const resolvedLatitude = data.latitude && data.latitude !== '0,0000000' ? data.latitude : ''
      const resolvedLongitude = data.longitude && data.longitude !== '0,0000000' ? data.longitude : ''
      const originLatitude = side === 'origin' ? resolvedLatitude || form.originLatitude : form.originLatitude
      const originLongitude = side === 'origin' ? resolvedLongitude || form.originLongitude : form.originLongitude
      const destinationLatitude = side === 'destination' ? resolvedLatitude || form.destinationLatitude : form.destinationLatitude
      const destinationLongitude = side === 'destination' ? resolvedLongitude || form.destinationLongitude : form.destinationLongitude
      const distanceKm = await resolveRouteDistanceKm(originLatitude, originLongitude, destinationLatitude, destinationLongitude)
      setForm((current) => {
        const next = { ...current }
        if (side === 'origin') {
          next.origin = data.destination || current.origin
          next.originZipCode = data.zipCode || current.originZipCode
          next.originLatitude = resolvedLatitude || current.originLatitude
          next.originLongitude = resolvedLongitude || current.originLongitude
        } else {
          next.destination = data.destination || current.destination
          next.destinationZipCode = data.zipCode || current.destinationZipCode
          next.destinationLatitude = resolvedLatitude || current.destinationLatitude
          next.destinationLongitude = resolvedLongitude || current.destinationLongitude
        }
        if (distanceKm) {
          next.distance = distanceKm
        }
        next.routeName = `${next.origin} X ${next.destination}`.replace(/^ X | X $/g, '')
        return next
      })
    } catch {
      // CEP sem retorno mantem os campos atuais para o usuario conferir manualmente.
    }
  }

  async function readInvoiceFiles(files: FileList | File[]) {
    const fileList = Array.from(files)
    if (!fileList.length) return
    let nextImport = { ...emptyInvoiceImport }
    let extractedCount = 0
    const failedFiles: string[] = []
    for (const file of fileList) {
      try {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        const text = isPdf ? await extractTextFromPdf(file) : await file.text()
        const extracted = extractInvoiceFromXml(text, file.name) ?? extractInvoiceFromDanfText(text, file.name)
        if (extracted) {
          nextImport = mergeInvoiceImport(nextImport, extracted)
          extractedCount += 1
        } else {
          failedFiles.push(file.name)
        }
      } catch {
        failedFiles.push(file.name)
      }
    }
    if (!extractedCount) {
      setInvoiceImport({ ...emptyInvoiceImport, fileName: fileList.map((file) => file.name).join(', ') })
      setInvoiceImportMessage('Nao consegui ler as notas automaticamente. Se for PDF escaneado ou imagem, anexe o XML da NF-e ou preencha manualmente.')
      return
    }
    setInvoiceImport(nextImport)
    setInvoiceImportMessage(failedFiles.length ? `${extractedCount} nota(s) extraida(s). Falhou: ${failedFiles.join(', ')}.` : `${extractedCount} nota(s) extraida(s). Confira antes de aplicar no frete.`)
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

  async function applyInvoiceImport() {
    const routeDestination = await resolveImportedDestination(invoiceImport)
    const importedDistance = routeDestination
      ? await resolveRouteDistanceKm(form.originLatitude, form.originLongitude, routeDestination.latitude, routeDestination.longitude)
      : ''
    setForm((current) => {
      const importedInvoices = invoiceImport.invoices.length ? invoiceImport.invoices : [invoiceEntryFromImport(invoiceImport)]
      const existingInvoices = current.invoiceEntries ?? []
      const mergedInvoices = [
        ...existingInvoices,
        ...importedInvoices.filter((invoice) => {
          const key = invoice.invoiceAccessKey || `${invoice.invoiceNumber}-${invoice.invoiceSeries}-${invoice.fileName}`
          return !existingInvoices.some((existing) => (existing.invoiceAccessKey || `${existing.invoiceNumber}-${existing.invoiceSeries}-${existing.fileName}`) === key)
        }),
      ]
      const firstInvoice = mergedInvoices[0]
      const next = {
        ...current,
        senderDocument: invoiceImport.senderDocument || current.senderDocument,
        sender: invoiceImport.sender || current.sender,
        recipientDocument: invoiceImport.recipientDocument || current.recipientDocument,
        recipient: invoiceImport.recipient || current.recipient,
        invoiceNumber: firstInvoice?.invoiceNumber || current.invoiceNumber,
        invoiceSeries: firstInvoice?.invoiceSeries || current.invoiceSeries,
        invoiceIssueDate: firstInvoice?.invoiceIssueDate || current.invoiceIssueDate,
        invoiceGoodsValue: firstInvoice?.invoiceGoodsValue || current.invoiceGoodsValue,
        invoiceValue: firstInvoice?.invoiceValue || current.invoiceValue,
        invoiceAccessKey: firstInvoice?.invoiceAccessKey || current.invoiceAccessKey,
        invoiceEntries: mergedInvoices,
      }
      if (routeDestination?.destination) {
        next.destination = routeDestination.destination
        next.destinationZipCode = routeDestination.zipCode || current.destinationZipCode
        next.destinationLatitude = routeDestination.latitude || current.destinationLatitude
        next.destinationLongitude = routeDestination.longitude || current.destinationLongitude
        next.distance = importedDistance || current.distance
        next.routeName = `${next.origin || 'Manaus/AM'} X ${routeDestination.destination}`
      }
      if (editingFreightId) {
        const currentFreight = freights.find((freight) => freight.id === editingFreightId)
        if (currentFreight) {
          void saveFreightRecord(buildFreightRecord(next, currentFreight))
        }
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

  function openExtraExpenseEdit(expense: ExtraExpense) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditingExtraExpense({ ...expense })
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
        const currentFreight = freights.find((freight) => freight.id === editingFreightId)
        if (currentFreight) {
          void saveFreightRecord(buildFreightRecord(next, currentFreight))
        }
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
      container: freight.containerEntries?.length ? freight.containerEntries.map((entry) => entry.number).join(', ') : freight.container || '-',
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
      documentRelease: freight.documentReleaseDate || '',
      pdWithdrawal: freight.portWithdrawalDate || '',
      scheduleDelivery: freight.destinationScheduleDate || '',
      scheduleDeliveryHour: freight.destinationScheduleTime || '',
      destinationArrival: freight.destinationArrivalDate || '',
      destinationArrivalHour: freight.destinationArrivalTime || '',
      destinationDeparture: freight.destinationDepartureDate || '',
      destinationDepartureHour: freight.destinationDepartureTime || '',
      cntrReturn: freight.cntrReturnDate || '',
      fiscalNumber: freight.invoiceNumber || '',
      ciot: freight.ciotEntries?.length ? freight.ciotEntries.map((entry) => entry.number).join(', ') : freight.ciotNumber || '',
      ciotStatus: freight.ciotEntries?.length || freight.ciotNumber ? 'REGISTRADO' : '',
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
              <Field label="Motorista" required><LookupInput value={form.driver} onChange={(value) => updateForm('driver', value.toUpperCase())} onLookup={() => openLookup('driver')} onClear={() => updateForm('driver', '')} /></Field>
              <Field label="Ajudante"><input value={form.helper} onChange={(event) => updateForm('helper', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Motorista auxiliar"><input value={form.auxiliaryDriver} onChange={(event) => updateForm('auxiliaryDriver', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
          </div>
          <div className="mt-4 grid gap-x-24 gap-y-1 border-t border-zinc-400 pt-3 md:grid-cols-2">
            <div className="grid gap-1">
              <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">FROTAS</div>
              <Field label="Placa" required><LookupInput value={selectedTractor?.tractorPlate || lookupTractor?.plate || form.tractorId} onChange={(value) => updateForm('tractorId', value.toUpperCase())} onLookup={() => openLookup('tractor')} onClear={() => updateForm('tractorId', '')} /></Field>
              <Field label="Veiculo trator"><input value={tractorDescription} className={textInputClass(true)} disabled /></Field>
              <Field label="Tag de pedagio"><input value={form.tollTag} onChange={(event) => updateForm('tollTag', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
            </div>
            <div className="grid gap-1">
              <Field label="Placa"><LookupInput value={selectedTrailer?.trailerPlate || lookupTrailer?.plate || form.trailerId} onChange={(value) => updateForm('trailerId', value.toUpperCase())} onLookup={() => openLookup('trailer')} onClear={() => updateForm('trailerId', '')} /></Field>
              <Field label="Veiculo reboque"><input value={trailerDescription} className={textInputClass(true)} disabled /></Field>
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
                <Field label="CEP">
                  <input
                    value={form.originZipCode}
                    onChange={(event) => updateForm('originZipCode', event.target.value)}
                    onBlur={() => void resolveRouteZip('origin')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void resolveRouteZip('origin')
                      }
                    }}
                    className={textInputClass()}
                  />
                </Field>
              </div>
              <div className="grid gap-1">
                <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">DESTINO</div>
                <Field label="Porto/Cidade destino" required><input value={form.destination} onChange={(event) => updateForm('destination', event.target.value.toUpperCase())} className={textInputClass()} /></Field>
                <Field label="Latitude"><input value={form.destinationLatitude} onChange={(event) => updateForm('destinationLatitude', event.target.value)} className={textInputClass()} /></Field>
                <Field label="Longitude"><input value={form.destinationLongitude} onChange={(event) => updateForm('destinationLongitude', event.target.value)} className={textInputClass()} /></Field>
                <Field label="CEP">
                  <input
                    value={form.destinationZipCode}
                    onChange={(event) => updateForm('destinationZipCode', event.target.value)}
                    onBlur={() => void resolveRouteZip('destination')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void resolveRouteZip('destination')
                      }
                    }}
                    className={textInputClass()}
                  />
                </Field>
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
            <div className="flex h-8 items-center justify-between bg-zinc-400 px-3 text-xs text-zinc-950"><span>{containerRows.length} registro{containerRows.length === 1 ? '' : 's'}</span><Settings size={16} /></div>
            <table className="w-full min-w-[900px] text-xs">
              <thead><tr>{['Codigo', 'Tipo de Container', 'No Container', 'Tara', 'Peso maximo', 'MGW', 'No Lacre Cia', 'No Lacre export.', 'Acoes'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody>
                <tr className="bg-sky-300">
                  <td className="border-b border-r px-2 py-2"><input value="40 HC" className={textInputClass(true)} disabled /></td>
                  <td className="border-b border-r px-2 py-2"><input value="Dry" className={textInputClass(true)} disabled /></td>
                  <td className="border-b border-r px-2 py-2">
                    <input
                      value={form.containerDraft}
                      onChange={(event) => updateForm('containerDraft', event.target.value.toUpperCase())}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          commitContainerDraft()
                        }
                      }}
                      className={textInputClass()}
                      placeholder="MSCU1234567"
                    />
                  </td>
                  <td className="border-b border-r px-2 py-2"><input value="3800" className={textInputClass(true)} disabled /></td>
                  <td className="border-b border-r px-2 py-2"><input value="25000" className={textInputClass(true)} disabled /></td>
                  <td className="border-b border-r px-2 py-2"><input value="32.500,0000" className={textInputClass(true)} disabled /></td>
                  <td className="border-b border-r px-2 py-2"><input value="LCR-1001" className={textInputClass(true)} disabled /></td>
                  <td className="border-b border-r px-2 py-2"><input value="-" className={textInputClass(true)} disabled /></td>
                  <td className="border-b px-2 py-2">
                    <button type="button" onClick={() => commitContainerDraft()} className="border border-zinc-400 bg-white px-2 py-1 text-xs">Salvar</button>
                  </td>
                </tr>
                {containerRows.map((entry, index) => (
                  <tr key={entry.id} className={index % 2 ? 'bg-zinc-100' : 'bg-white'}>
                    <td className="border-b border-r px-2 py-2">{entry.code}</td>
                    <td className="border-b border-r px-2 py-2">{entry.type}</td>
                    <td className="border-b border-r px-2 py-2">{entry.number}</td>
                    <td className="border-b border-r px-2 py-2">{entry.tare}</td>
                    <td className="border-b border-r px-2 py-2">{entry.maxWeight}</td>
                    <td className="border-b border-r px-2 py-2">{entry.mgw}</td>
                    <td className="border-b border-r px-2 py-2">{entry.seal}</td>
                    <td className="border-b border-r px-2 py-2">{entry.exportSeal}</td>
                    <td className="border-b px-2 py-2">
                      <button type="button" onClick={() => removeContainerEntry(entry.id)} className="border border-zinc-400 bg-white px-2 py-1 text-xs text-red-700">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
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
          <div className="grid gap-x-14 gap-y-3 border border-zinc-300 bg-white p-3 md:grid-cols-2">
            <div className="grid gap-1">
              <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">DOCUMENTO / PORTO</div>
              <Field label="Dt. liberacao documento"><input type="date" value={form.documentReleaseDate} onChange={(event) => updateForm('documentReleaseDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Dt. retirada porto destino"><input type="date" value={form.portWithdrawalDate} onChange={(event) => updateForm('portWithdrawalDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Dt. agendamento entrega" required><input type="date" value={form.destinationScheduleDate} onChange={(event) => updateForm('destinationScheduleDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Hr. agendamento entrega"><input type="time" value={form.destinationScheduleTime} onChange={(event) => updateForm('destinationScheduleTime', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
            </div>
            <div className="grid gap-1">
              <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">DESTINATARIO / DEVOLUCAO</div>
              <Field label="Dt.chegada destinatario"><input type="date" value={form.destinationArrivalDate} onChange={(event) => updateForm('destinationArrivalDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Hr. chegada destinatario"><input type="time" value={form.destinationArrivalTime} onChange={(event) => updateForm('destinationArrivalTime', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Dt. saida destinatario"><input type="date" value={form.destinationDepartureDate} onChange={(event) => updateForm('destinationDepartureDate', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
              <Field label="Hr. saida destinatario"><input type="time" value={form.destinationDepartureTime} onChange={(event) => updateForm('destinationDepartureTime', event.target.value)} className={textInputClass(dateLocked)} disabled={dateLocked} /></Field>
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
      const freightExpenseLocked = plannedExpenseEdit !== 'freight'
      const tollExpenseLocked = plannedExpenseEdit !== 'toll'
      return (
        <div className="p-3">
          <div className="overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center justify-between bg-zinc-400 px-3 text-xs"><span>DESPESA PREVISTA</span><Settings size={16} /></div>
            <table className="w-full min-w-[900px] text-xs">
              <thead><tr>{['Referencia', 'Produto', 'Fornecedor', 'Quantidade total', 'U.M.', 'Vlr. despesa'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody>
                <tr onDoubleClick={() => setPlannedExpenseEdit('freight')} title="Dois cliques para editar"><td className="border-b border-r px-2 py-2">TRA010</td><td className="border-b border-r px-2 py-2">{form.product || 'CUSTO FRETE ROD. DESTINO'}</td><td className="border-b border-r px-2 py-2">{form.contractor || '-'}</td><td className="border-b border-r px-2 py-2 text-right">1,0000</td><td className="border-b border-r px-2 py-2">UN</td><td className="border-b px-2 py-2"><input value={freightCost} onChange={(event) => { updateForm('plannedFreightCost', event.target.value); updateForm('value', event.target.value) }} className={textInputClass(freightExpenseLocked)} disabled={freightExpenseLocked} /></td></tr>
                <tr onDoubleClick={() => setPlannedExpenseEdit('toll')} title="Dois cliques para editar"><td className="border-b border-r px-2 py-2">TRA014</td><td className="border-b border-r px-2 py-2">PEDAGIO</td><td className="border-b border-r px-2 py-2">-</td><td className="border-b border-r px-2 py-2 text-right">1,0000</td><td className="border-b border-r px-2 py-2">UN</td><td className="border-b px-2 py-2"><input value={form.plannedTollCost} onChange={(event) => updateForm('plannedTollCost', event.target.value)} className={textInputClass(tollExpenseLocked)} disabled={tollExpenseLocked} /></td></tr>
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
                      <tr
                        key={expense.id}
                        onDoubleClick={() => openExtraExpenseEdit(expense)}
                        title="Dois cliques para editar"
                        className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} cursor-default hover:bg-sky-100`}
                      >
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
      const invoiceRows = form.invoiceEntries.length
        ? form.invoiceEntries
        : [{
            id: 'invoice-draft',
            fileName: '',
            senderDocument: form.senderDocument,
            sender: form.sender,
            recipientDocument: form.recipientDocument,
            invoiceNumber: form.invoiceNumber,
            invoiceSeries: form.invoiceSeries,
            invoiceIssueDate: form.invoiceIssueDate,
            recipient: form.recipient,
            invoiceGoodsValue: form.invoiceGoodsValue,
            invoiceValue: form.invoiceValue,
            invoiceAccessKey: form.invoiceAccessKey,
          }]
      return (
        <div className="p-3">
          <Field label="Arquivo"><div className="flex gap-2"><input className={`${textInputClass()} w-72`} /><button className="border px-2">...</button><Paperclip size={18} /></div></Field>
          <div className="mt-3 overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center justify-between bg-zinc-400 px-3 text-xs"><span>Notas do embarcador importadas</span><Settings size={16} /></div>
            <table className="w-full min-w-[900px] text-xs">
              <thead><tr>{['Nr. nfe', 'Tipo de documento', 'Serie', 'Dt. emissao', 'Destinatario', 'Vlr. mercadoria', 'Vlr. nf-e', 'Chave'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
              <tbody>
                {invoiceRows.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="border-b border-r px-2 py-2">{invoice.invoiceNumber || '-'}</td>
                    <td className="border-b border-r px-2 py-2">NF-e</td>
                    <td className="border-b border-r px-2 py-2">{invoice.invoiceSeries || '-'}</td>
                    <td className="border-b border-r px-2 py-2">{invoice.invoiceIssueDate || '-'}</td>
                    <td className="border-b border-r px-2 py-2">{invoice.recipient || '-'}</td>
                    <td className="border-b border-r px-2 py-2 text-right">{invoice.invoiceGoodsValue || '0'}</td>
                    <td className="border-b border-r px-2 py-2 text-right">{invoice.invoiceValue || '0'}</td>
                    <td className="border-b px-2 py-2">{invoice.invoiceAccessKey || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTab === 'CIOT') {
      const date = form.deliveryForecast || new Date().toISOString().slice(0, 10)
      const endDate = form.cntrReturnDate || form.destinationScheduleDate || date
      const ciotRows = legacyCiotRows(form)
      return (
        <div className="p-3">
          <Field label="Tipo de viagem"><input value="P-Padrao" className={`${textInputClass(true)} max-w-md`} disabled /></Field>
          <div className="mt-2 overflow-x-auto border border-zinc-300 bg-white">
            <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 px-2 text-xs">
              <div className="ml-auto">{ciotRows.length + 1} de {ciotRows.length + 1} registros</div>
              <input className="ml-2 h-6 w-32 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
              <div className="flex items-center gap-2 pl-3"><Settings size={18} /><span>&lt;-&gt;</span><span>☑</span><span>1:1</span></div>
            </div>
            <table className="w-full min-w-[780px] table-fixed text-xs">
              <thead className="bg-white">
                <tr>
                  {['CIOT', 'Situacao', 'Dt. Inicio viagem', 'Dt. fim viagem', 'Dt. registro', 'Dt. quitacao', 'Dt. retificacao'].map((heading, index) => (
                    <th key={`${heading}-${index}`} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium text-zinc-700">
                      {heading}
                      {heading && <span className="float-right text-zinc-400">▾</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-sky-300">
                  <td className="border-b border-r border-zinc-200 px-2 py-1">
                    <input
                      value={form.ciotDraft}
                      onChange={(event) => updateForm('ciotDraft', event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitCiotDraft(event.currentTarget.value)
                        }
                      }}
                      className={textInputClass()}
                    />
                  </td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input value={form.ciotDraft ? 'REGISTRADO' : ''} className={textInputClass(true)} disabled /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" value={date} onChange={(event) => updateForm('deliveryForecast', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" value={endDate} onChange={(event) => updateForm('cntrReturnDate', event.target.value)} className={textInputClass()} /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" value={date} className={textInputClass()} readOnly /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" className={textInputClass()} /></td>
                  <td className="border-b border-r border-zinc-200 px-2 py-1"><input type="date" className={textInputClass()} /></td>
                </tr>
                {ciotRows.map((entry, index) => (
                  <tr key={entry.id} onDoubleClick={() => editCiotEntry(entry)} title="Dois cliques para editar" className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} cursor-default hover:bg-sky-100`}>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{entry.number}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{entry.status}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{entry.startDate}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{entry.endDate}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{entry.registrationDate}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{entry.dischargeDate}</td>
                    <td className="border-b border-r border-zinc-200 px-2 py-1">{entry.rectificationDate}</td>
                  </tr>
                ))}
              </tbody>
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
                      <button onClick={clearFreightFilters} title="Limpar filtro">
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
                      <div className="flex border-t border-zinc-300">
                        <input value={filters.supplier} onChange={(event) => setFilters({ ...filters, supplier: event.target.value.toUpperCase() })} className="h-7 min-w-0 flex-1 bg-white px-2 text-xs outline-none" placeholder="Selecione..." />
                        <button onClick={() => openLookup('supplier')} className="grid h-7 w-8 place-items-center bg-white" title="Consultar fornecedor"><Filter size={18} fill="currentColor" /></button>
                      </div>
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
                <div className="ml-auto px-2">{freightListLoading ? '' : `${freightsTotal} registros`}</div>
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
              <div className="relative min-h-[420px] overflow-auto">
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
                    {!freightListLoading && !visibleFreights.length && <tr><td colSpan={visibleFreightColumns.length} className="px-3 py-10 text-center text-zinc-500">Nenhum transporte encontrado.</td></tr>}
                  </tbody>
                </table>
                {freightListLoading && (
                  <div className="absolute inset-0 grid place-items-center bg-white">
                    <LoadingState label="Carregando fretes..." />
                  </div>
                )}
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
                <button onClick={() => saveFreight(false)} disabled={Boolean(savingFreightMode)} className="inline-flex items-center gap-1 disabled:opacity-70">
                  <Save size={15} /> SALVAR
                </button>
                <button onClick={() => saveFreight(true)} disabled={Boolean(savingFreightMode)} className="inline-flex items-center gap-1 disabled:opacity-70">
                  <Save size={15} /> SALVAR E SAIR
                </button>
                <button onClick={requestDeleteFreight} className="inline-flex items-center gap-1"><X size={16} /> EXCLUIR</button>
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
                  <Field label="Codigo do processo" required><input value={form.process} className={textInputClass(true)} disabled /></Field>
                  <Field label="Situacao"><input value={form.status} onChange={(event) => updateForm('status', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="CNPJ/CPF"><input value={form.serviceTakerDocument} className={textInputClass(true)} disabled /></Field>
                  <Field label="Tomador do servico"><input value={form.serviceTaker} className={textInputClass(true)} disabled /></Field>
                  <Field label="CNPJ/CPF"><input value={form.senderDocument} className={textInputClass(true)} disabled /></Field>
                  <Field label="Remetente"><input value={form.sender} className={textInputClass(true)} disabled /></Field>
                </div>
                <div className="grid gap-1">
                  <Field label="Tipo processo" required><select value={form.processType} onChange={(event) => updateForm('processType', event.target.value)} className={textInputClass()}><option value="">Selecione...</option><option>Multimodal [M]</option><option>Rodoviario [R]</option></select></Field>
                  <Field label="Identificacao do cliente"><input value={form.customerIdentification} onChange={(event) => updateForm('customerIdentification', event.target.value)} className={textInputClass()} /></Field>
                  <Field label="Cliente" required><LookupInput value={form.customer} onChange={(value) => updateForm('customer', value.toUpperCase())} onLookup={() => openLookup('customer')} onClear={() => updateForm('customer', '')} /></Field>
                  <Field label="Produto"><LookupInput value={form.product} onChange={(value) => updateForm('product', value.toUpperCase())} onLookup={() => openLookup('product')} onClear={() => updateForm('product', '')} /></Field>
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
              </div>
              <div className="min-h-[calc(100vh-420px)] bg-zinc-100">{renderActiveTab()}</div>
            </div>
          </div>
        </div>
      )}

      {showForm && savingFreightMode && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-zinc-950/15">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-900" />
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

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-zinc-950/30 px-4 py-24">
          <div className="w-full max-w-lg border border-zinc-600 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Confirmar exclusao</h3>
              <button onClick={() => setDeleteConfirmOpen(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
            </div>
            <div className="border-b border-zinc-300 bg-white px-4 py-5 text-xs">
              <div className="mb-3 font-semibold">Deseja excluir este processo?</div>
              <div className="grid gap-1">
                <div><span className="font-semibold">Codigo:</span> {form.process || '-'}</div>
                <div><span className="font-semibold">Cliente:</span> {form.customer || '-'}</div>
                <div><span className="font-semibold">Destinatario:</span> {form.recipient || '-'}</div>
              </div>
              <div className="mt-4 text-red-700">Esta acao remove o frete do banco de dados.</div>
            </div>
            <div className="flex justify-end gap-2 bg-zinc-100 px-3 py-3 text-xs">
              <button onClick={() => setDeleteConfirmOpen(false)} className="h-8 border border-zinc-400 bg-white px-4 hover:bg-zinc-200">Cancelar</button>
              <button onClick={confirmDeleteFreight} className="h-8 bg-black px-4 font-semibold text-white hover:bg-red-800">Excluir processo</button>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/25 p-2">
          <div className="system-modal h-[calc(100vh-16px)] w-full overflow-auto border border-zinc-500 bg-zinc-100 shadow-2xl">
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
                <div className="absolute left-5 right-5 top-24 z-[70] border-4 border-red-700 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-3 py-2">
                    <h3 className="text-lg font-normal text-red-600">Produto</h3>
                    <button onClick={() => setExtraProductOpen(false)} className="grid h-7 w-7 place-items-center rounded-full bg-black text-white"><X size={18} /></button>
                  </div>
                  <div className="flex h-8 items-center bg-zinc-400 px-2 text-xs">
                    <div className="ml-auto">{filteredExtraProducts.length} de {extraProducts.length} registros</div>
                    <input value={extraProductSearch} onChange={(event) => setExtraProductSearch(event.target.value)} className="ml-2 h-6 w-36 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
                    <div className="flex items-center gap-2 pl-3"><Settings size={18} /><span>1:1</span><Filter size={18} fill="currentColor" /><span>▤</span></div>
                  </div>
                  <div className="max-h-[calc(100vh-210px)] overflow-auto">
                    <table className="w-full min-w-[980px] text-xs">
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

      {lookupOpen && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-zinc-950/30 px-4 py-10">
          <div className="max-h-[calc(100vh-80px)] w-full max-w-5xl overflow-hidden border-4 border-red-700 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-3 py-2">
              <h3 className="text-lg font-normal text-red-600">{lookupTitle()}</h3>
              <button onClick={closeLookup} className="grid h-7 w-7 place-items-center rounded-full bg-black text-white"><X size={18} /></button>
            </div>
            <div className="flex h-8 items-center bg-zinc-400 px-2 text-xs">
              <div className="ml-auto">{lookupLoading ? 'Consultando...' : `${lookupRows().length} registros`}</div>
              <input value={lookupSearch} onChange={(event) => setLookupSearch(event.target.value)} className="ml-2 h-6 w-44 border border-zinc-300 bg-white px-2 text-xs outline-none" placeholder="Busca rapida" />
              <div className="flex items-center gap-2 pl-3"><Settings size={18} /><span>1:1</span><Filter size={18} fill="currentColor" /><span>|||</span></div>
            </div>
            <div className="max-h-[calc(100vh-170px)] overflow-auto">
              <table className="w-full min-w-[860px] text-xs">
                <thead>
                  <tr>
                    {(lookupOpen === 'tractor' || lookupOpen === 'trailer'
                      ? ['Placa', 'Descricao']
                      : lookupOpen === 'product' || lookupOpen === 'supplier'
                        ? ['Descricao']
                        : ['Nome', 'CNPJ/CPF']).map((heading) => (
                      <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lookupRows().map((option, index) => (
                    <tr
                      key={`${lookupOpen}-${option.id || option.value || option.plate || option.name || option.label}-${index}`}
                      onDoubleClick={() => selectLookupOption(option)}
                      onClick={() => selectLookupOption(option)}
                      className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} cursor-default hover:bg-sky-200`}
                    >
                      {lookupOpen === 'tractor' || lookupOpen === 'trailer' ? (
                        <>
                          <td className="border-b border-r border-zinc-200 px-2 py-2">{option.plate}</td>
                          <td className="border-b border-zinc-200 px-2 py-2">{option.description}</td>
                        </>
                      ) : lookupOpen === 'product' || lookupOpen === 'supplier' ? (
                        <td className="border-b border-zinc-200 px-2 py-2">{option.label || option.value}</td>
                      ) : (
                        <>
                          <td className="border-b border-r border-zinc-200 px-2 py-2">{option.name}</td>
                          <td className="border-b border-zinc-200 px-2 py-2">{option.document}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!lookupLoading && !lookupRows().length && (
                    <tr><td colSpan={2} className="px-3 py-12 text-center text-zinc-500">Nenhum registro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {invoiceImportOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-8">
          <div className="max-h-[calc(100vh-64px)] w-full max-w-5xl overflow-auto border border-zinc-500 bg-zinc-100 shadow-2xl">
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
                      multiple
                      accept=".xml,.txt,.pdf,application/xml,text/xml,application/pdf"
                      onChange={(event) => {
                        const files = event.target.files
                        if (files?.length) void readInvoiceFiles(files)
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
                  {invoiceImport.invoices.length > 1 && invoiceSenderOptions.length > 0 && (
                    <Field label="Escolher">
                      <select
                        value={`${invoiceImport.senderDocument}|${invoiceImport.sender}`}
                        onChange={(event) => {
                          const option = invoiceSenderOptions.find((item) => `${item.document}|${item.name}` === event.target.value)
                          if (option) {
                            setInvoiceImport({
                              ...invoiceImport,
                              senderDocument: option.document,
                              sender: option.name,
                              senderAddress: option.address,
                              senderDistrict: option.district,
                              senderZipCode: option.zipCode,
                            })
                          }
                        }}
                        className={textInputClass()}
                      >
                        {invoiceSenderOptions.map((option) => <option key={`${option.document}|${option.name}`} value={`${option.document}|${option.name}`}>{option.name} - {option.document}</option>)}
                      </select>
                    </Field>
                  )}
                  <Field label="CNPJ/CPF"><input value={invoiceImport.senderDocument} onChange={(event) => setInvoiceImport({ ...invoiceImport, senderDocument: event.target.value })} className={textInputClass()} /></Field>
                  <Field label="Remetente"><input value={invoiceImport.sender} onChange={(event) => setInvoiceImport({ ...invoiceImport, sender: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                  <Field label="Endereco"><input value={invoiceImport.senderAddress} onChange={(event) => setInvoiceImport({ ...invoiceImport, senderAddress: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                  <Field label="Bairro"><input value={invoiceImport.senderDistrict} onChange={(event) => setInvoiceImport({ ...invoiceImport, senderDistrict: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                  <Field label="CEP"><input value={invoiceImport.senderZipCode} onChange={(event) => setInvoiceImport({ ...invoiceImport, senderZipCode: event.target.value })} className={textInputClass()} /></Field>
                </div>
                <div className="grid gap-1">
                  <div className="border-b border-zinc-400 pb-1 text-xs font-semibold">DESTINATARIO / RECEBEDOR</div>
                  {invoiceImport.invoices.length > 1 && invoiceRecipientOptions.length > 0 && (
                    <Field label="Escolher">
                      <select
                        value={`${invoiceImport.recipientDocument}|${invoiceImport.recipient}`}
                        onChange={(event) => {
                          const option = invoiceRecipientOptions.find((item) => `${item.document}|${item.name}` === event.target.value)
                          if (option) {
                            setInvoiceImport({
                              ...invoiceImport,
                              recipientDocument: option.document,
                              recipient: option.name,
                              recipientAddress: option.address,
                              recipientDistrict: option.district,
                              recipientZipCode: option.zipCode,
                              recipientCity: option.city,
                              recipientState: option.state,
                            })
                          }
                        }}
                        className={textInputClass()}
                      >
                        {invoiceRecipientOptions.map((option) => <option key={`${option.document}|${option.name}`} value={`${option.document}|${option.name}`}>{option.name} - {option.document}</option>)}
                      </select>
                    </Field>
                  )}
                  <Field label="CNPJ/CPF"><input value={invoiceImport.recipientDocument} onChange={(event) => setInvoiceImport({ ...invoiceImport, recipientDocument: event.target.value })} className={textInputClass()} /></Field>
                  <Field label="Destinatario"><input value={invoiceImport.recipient} onChange={(event) => setInvoiceImport({ ...invoiceImport, recipient: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                  <Field label="Endereco"><input value={invoiceImport.recipientAddress} onChange={(event) => setInvoiceImport({ ...invoiceImport, recipientAddress: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                  <Field label="Bairro"><input value={invoiceImport.recipientDistrict} onChange={(event) => setInvoiceImport({ ...invoiceImport, recipientDistrict: event.target.value.toUpperCase() })} className={textInputClass()} /></Field>
                  <Field label="CEP"><input value={invoiceImport.recipientZipCode} onChange={(event) => setInvoiceImport({ ...invoiceImport, recipientZipCode: event.target.value })} className={textInputClass()} /></Field>
                </div>
              </div>
              {invoiceImport.invoices.length > 1 && (
                <div className="mt-4 overflow-x-auto border border-zinc-300 bg-white">
                  <div className="bg-zinc-400 px-2 py-1 text-xs">{invoiceImport.invoices.length} notas extraidas</div>
                  <table className="w-full min-w-[900px] text-xs">
                    <thead><tr>{['Nr. nfe', 'Serie', 'Dt. emissao', 'Destinatario', 'Vlr. nf-e', 'Chave'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
                    <tbody>
                      {invoiceImport.invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="border-b border-r px-2 py-1">{invoice.invoiceNumber}</td>
                          <td className="border-b border-r px-2 py-1"><input value={invoice.invoiceSeries} onChange={(event) => updateImportedInvoice(invoice.id, { invoiceSeries: event.target.value })} className={textInputClass()} /></td>
                          <td className="border-b border-r px-2 py-1"><input value={invoice.invoiceIssueDate} onChange={(event) => updateImportedInvoice(invoice.id, { invoiceIssueDate: event.target.value })} className={textInputClass()} /></td>
                          <td className="border-b border-r px-2 py-1"><input value={invoice.recipient} onChange={(event) => updateImportedInvoice(invoice.id, { recipient: event.target.value.toUpperCase() })} className={textInputClass()} placeholder="Informe o destinatario" /></td>
                          <td className="border-b border-r px-2 py-1 text-right"><input value={invoice.invoiceValue} onChange={(event) => updateImportedInvoice(invoice.id, { invoiceValue: event.target.value, invoiceGoodsValue: event.target.value })} className={`${textInputClass()} text-right`} /></td>
                          <td className="border-b px-2 py-1">{invoice.invoiceAccessKey}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
