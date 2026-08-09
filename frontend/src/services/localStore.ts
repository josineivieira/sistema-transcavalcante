import { defaultIssuerSettings, type IssuerSettings } from './fiscalSettings'

export type Customer = {
  id: string
  document: string
  name: string
  tradeName?: string
  participantType?: string
  market?: string
  category?: string
  shortName?: string
  birthDate?: string
  anniversary?: string
  gender?: string
  rg?: string
  rgIssuer?: string
  rgState?: string
  notes?: string
  website?: string
  economicGroup?: string
  groupedCode?: string
  occupation?: string
  educationLevel?: string
  civilStatus?: string
  spouseName?: string
  employerDocument?: string
  employer?: string
  jobTitle?: string
  birthplace?: string
  nationality?: string
  motherName?: string
  fatherName?: string
  emailFiscal: string
  phone?: string
  phoneDdd?: string
  phoneExtension?: string
  hasWhatsapp?: string
  contactEmail?: string
  municipalRegistration?: string
  stateRegistration?: string
  zipCode?: string
  street?: string
  number?: string
  complement?: string
  district?: string
  reference?: string
  city: string
  cityCode?: string
  state: string
  country?: string
  taxRegime?: string
  serviceCode?: string
  serviceDescription?: string
  issRate?: string
  issWithheld?: string
  paymentTerm: string
  registrationDate?: string
  status: string
}

export type Driver = {
  id: string
  name: string
  cpf: string
  phone: string
  cnh: string
  category: string
  cnhExpiration: string
  carrier: string
  personType?: string
  tradeName?: string
  shortName?: string
  mainCommunication?: string
  city?: string
  state?: string
  registrationDate?: string
  grExpiration?: string
  email?: string
  birthDate?: string
  anniversary?: string
  gender?: string
  rg?: string
  rgIssuer?: string
  rgState?: string
  notes?: string
  nickname?: string
  website?: string
  economicGroup?: string
  groupedCode?: string
  inss?: string
  occupation?: string
  educationLevel?: string
  civilStatus?: string
  spouseName?: string
  employerDocument?: string
  employer?: string
  jobTitle?: string
  birthplace?: string
  nationality?: string
  motherName?: string
  fatherName?: string
  addressType?: string
  addressIdentification?: string
  street?: string
  number?: string
  complement?: string
  reference?: string
  district?: string
  zipCode?: string
  municipalRegistration?: string
  stateRegistration?: string
  communicationType?: string
  phoneDdd?: string
  phoneExtension?: string
  hasWhatsapp?: string
  contactEmail?: string
  status: string
}

export type Vehicle = {
  id: string
  vehicleType: 'Cavalo' | 'Carreta'
  fleetNumber?: string
  fleetRelation?: string
  fleetType?: string
  denatranType?: string
  description?: string
  tractorPlate: string
  trailerPlate: string
  type: string
  rntrc: string
  owner: string
  ownerDocument?: string
  carrier: string
  capacity: string
  brand?: string
  model?: string
  yearModel?: string
  manufactureYear?: string
  chassis?: string
  grExpiration?: string
  licensingExpiration?: string
  cityPlate?: string
  statePlate?: string
  color?: string
  axles?: string
  bodyType?: string
  renavam?: string
  tare?: string
  capacityM3?: string
  capacityKg?: string
  trackerUsed?: boolean
  trackerBrand?: string
  trackerProtocol?: string
  smFleet?: string
  driver?: string
  status: string
}

export type ContainerRecord = {
  id: string
  number: string
  type: string
  size: string
  seal: string
  shippingLine: string
  grossWeight: string
  tare: string
  condition: string
}

export type FreightTask = {
  id: string
  name: string
  description: string
  status: string
  sendToCustomer: string
  startDate: string
  endDate: string
  completionPercent: number
  internalUse: string
  time: string
  user: string
}

export type FreightExtraExpense = {
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

export type FreightCiotEntry = {
  id: string
  number: string
  status: string
  startDate: string
  endDate: string
  registrationDate: string
  dischargeDate: string
  rectificationDate: string
}

export type FreightInvoiceEntry = {
  id: string
  fileName: string
  senderDocument: string
  sender: string
  recipientDocument: string
  invoiceNumber: string
  invoiceSeries: string
  invoiceIssueDate: string
  recipient: string
  invoiceGoodsValue: string
  invoiceValue: string
  invoiceAccessKey: string
}

export type FreightContainerEntry = {
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

export type Freight = {
  id: string
  number: string
  date: string
  customer: string
  process: string
  processType?: string
  customerIdentification?: string
  serviceTakerDocument?: string
  serviceTaker?: string
  senderDocument?: string
  sender?: string
  product?: string
  recipientDocument?: string
  recipient?: string
  urgent?: boolean
  consolidateCargo?: boolean
  routeName?: string
  originLatitude?: string
  originLongitude?: string
  destinationLatitude?: string
  destinationLongitude?: string
  originZipCode?: string
  destinationZipCode?: string
  distance?: string
  contractorDocument?: string
  contractor?: string
  negotiationCondition?: string
  helper?: string
  auxiliaryDriver?: string
  tractorId?: string
  trailerId?: string
  auxiliaryPlate?: string
  tollTag?: string
  cargoType?: string
  shippingLineDocument?: string
  shippingLine?: string
  vessel?: string
  tripNumber?: string
  booking?: string
  containerDraft?: string
  containerEntries?: FreightContainerEntry[]
  terminalEmpty?: string
  terminalReturn?: string
  recordDates?: boolean
  deliveryForecast?: string
  arrivalDate?: string
  cntrUnloadingDate?: string
  documentReleaseDate?: string
  portWithdrawalDate?: string
  scheduleStartDate?: string
  scheduleEndDate?: string
  integrationType?: string
  destinationScheduleDate?: string
  destinationScheduleTime?: string
  destinationArrivalDate?: string
  destinationArrivalTime?: string
  destinationDepartureDate?: string
  destinationDepartureTime?: string
  cntrReturnDate?: string
  plannedFreightCost?: string
  plannedTollCost?: string
  extraCost?: string
  extraExpenses?: FreightExtraExpense[]
  invoiceNumber?: string
  invoiceSeries?: string
  invoiceIssueDate?: string
  invoiceGoodsValue?: string
  invoiceValue?: string
  invoiceAccessKey?: string
  invoiceEntries?: FreightInvoiceEntry[]
  smNumber?: string
  ciotNumber?: string
  ciotEntries?: FreightCiotEntry[]
  dfeNumber?: string
  protocolStatus?: string
  taskHistory?: FreightTask[]
  container: string
  driver: string
  tractorPlate: string
  trailerPlate: string
  origin: string
  destination: string
  value: number
  operationalStatus: string
  fiscalStatus: string
  closing?: string
}

export type Closing = {
  id: string
  number: string
  customer: string
  period: string
  freights: number
  subtotal: number
  retentions: number
  netTotal: number
  status: string
}

export type FiscalDocument = {
  id: string
  type: string
  number: string
  series: string
  customer: string
  date: string
  value: number
  environment: string
  status: string
  protocol: string
  closing: string
}

export type Receivable = {
  id: string
  customer: string
  closing: string
  document: string
  dueDate: string
  netValue: number
  paidValue: number
  status: string
}

export type PriceList = {
  id: string
  listName: string
  originPort: string
  destinationPort: string
  product: string
  listValue: number
  taxPercent: number
  total: number
  status: string
}

export type PayrollItem = {
  id: string
  type: 'earning' | 'discount'
  description: string
  reference: string
  amount: number
}

export type PayrollProfile = {
  id: string
  employeeId: string
  employeeName: string
  category: string
  admissionDate: string
  salary: number
  dailyRate: number
  paymentType: string
  bank: string
  agency: string
  account: string
  pixKey: string
  status: string
}

export type PayrollClosing = {
  id: string
  employeeId: string
  employeeName: string
  category: string
  admissionDate: string
  month: string
  year: string
  salary: number
  dailyRate: number
  firstFortnightSalary: number
  firstFortnightOvertime: number
  firstFortnightDiscount: number
  secondFortnightSalary: number
  secondFortnightOvertime: number
  transport: number
  average: number
  basket: number
  inss: number
  irrf: number
  fgts: number
  dependents: number
  transportDiscount: number
  absenceDiscount: number
  advancePayment: number
  otherDiscounts: number
  otherEarnings: number
  tripQuantity: number
  tripExpenses: number
  vacationBonus: number
  items: PayrollItem[]
  grossTotal: number
  discountTotal: number
  netTotal: number
  status: string
  createdAt: string
}

export type UserPermission = 'none' | 'view' | 'edit'

export type SystemUser = {
  id: string
  name: string
  email: string
  password: string
  passwordConfigured?: boolean
  role: string
  department: string
  status: string
  permissions: Record<string, UserPermission>
}

export type AppData = {
  customers: Customer[]
  drivers: Driver[]
  vehicles: Vehicle[]
  containers: ContainerRecord[]
  freights: Freight[]
  deletedFreightIds: string[]
  closings: Closing[]
  fiscalDocuments: FiscalDocument[]
  receivables: Receivable[]
  priceLists: PriceList[]
  payrollProfiles: PayrollProfile[]
  payrollClosings: PayrollClosing[]
  users: SystemUser[]
  issuerSettings: IssuerSettings
  settingsSavedAt: string
}

export const seedData: AppData = {
  customers: [
    {
      id: 'cli-1',
      document: '12.345.678/0001-90',
      name: 'Cliente Demonstração Ltda',
      emailFiscal: 'fiscal@cliente.com',
      city: 'Manaus',
      state: 'AM',
      paymentTerm: '7 dias',
      status: 'Ativo',
    },
  ],
  drivers: [
    {
      id: 'mot-1',
      name: 'João Pereira',
      cpf: '123.456.789-00',
      phone: '(92) 99999-0000',
      cnh: '12345678900',
      category: 'E',
      cnhExpiration: '2027-12-31',
      carrier: 'Transcavalcante',
      status: 'Ativo',
    },
  ],
  vehicles: [
    {
      id: 'vei-cavalo-1',
      vehicleType: 'Cavalo',
      tractorPlate: 'ABC1D23',
      trailerPlate: '',
      type: 'Cavalo mecânico',
      rntrc: '12345678',
      owner: 'Transcavalcante',
      carrier: 'Transcavalcante',
      capacity: 'Tração',
      status: 'Ativo',
    },
    {
      id: 'vei-carreta-1',
      vehicleType: 'Carreta',
      tractorPlate: '',
      trailerPlate: 'XYZ9A87',
      type: 'Carreta porta-contêiner',
      rntrc: '12345678',
      owner: 'Transcavalcante',
      carrier: 'Transcavalcante',
      capacity: '32 t',
      status: 'Ativo',
    },
  ],
  containers: [
    {
      id: 'cnt-1',
      number: 'MSCU1234567',
      type: 'Dry',
      size: '40 HC',
      seal: 'LCR-1001',
      shippingLine: 'MSC',
      grossWeight: '25000',
      tare: '3800',
      condition: 'Cheio',
    },
  ],
  freights: [
    {
      id: 'fr-1',
      number: 'FRT-000001',
      date: new Date().toISOString().slice(0, 10),
      customer: 'Cliente Demonstração Ltda',
      process: 'PROC-1001',
      container: 'MSCU1234567',
      driver: 'João Pereira',
      tractorPlate: 'ABC1D23',
      trailerPlate: 'XYZ9A87',
      origin: 'Porto Chibatão/AM',
      destination: 'Distrito Industrial/AM',
      value: 2800,
      operationalStatus: 'Aguardando aprovação',
      fiscalStatus: 'Pendente',
    },
  ],
  deletedFreightIds: [],
  closings: [],
  fiscalDocuments: [],
  receivables: [],
  payrollProfiles: [],
  payrollClosings: [],
  priceLists: [
    { id: 'pl-1', listName: 'IMPORTACAO - ITAPOA TERM', originPort: 'ITAPOA/SC', destinationPort: 'BLUMENAU/SC', product: 'CUSTO FRETE ROD, DESTINO', listValue: 2100, taxPercent: 0, total: 2100, status: 'Ativo' },
    { id: 'pl-2', listName: 'IMPORTACAO - ITAPOA TERM', originPort: 'ITAPOA/SC', destinationPort: 'PALHOCA/SC', product: 'CUSTO FRETE ROD, DESTINO', listValue: 2782.55, taxPercent: 0, total: 2870.75, status: 'Ativo' },
    { id: 'pl-3', listName: 'GEO LOG MANAUS - MULTIMODAL', originPort: 'MANAUS/AM', destinationPort: 'BOA VISTA/RR', product: 'CUSTO FRETE ROD, DESTINO', listValue: 8400, taxPercent: 0, total: 8400, status: 'Ativo' },
    { id: 'pl-4', listName: 'LISTA LOGIN - MANAUS', originPort: 'MANAUS/AM', destinationPort: 'MANAUS - DISTRITO/AM', product: 'CUSTO FRETE ROD, DESTINO', listValue: 1400, taxPercent: 0, total: 1400, status: 'Ativo' },
  ],
  users: [
    {
      id: 'usr-1',
      name: 'Administrador SF',
      email: 'admin@transcavalcante.local',
      password: '',
      passwordConfigured: true,
      role: 'Administrador',
      department: 'Administracao',
      status: 'Ativo',
      permissions: {
        dashboard: 'view',
        freights: 'edit',
        customers: 'edit',
        drivers: 'edit',
        vehicles: 'edit',
        closings: 'edit',
        fiscalDocuments: 'edit',
        finance: 'edit',
        priceLists: 'edit',
        payroll: 'edit',
        reports: 'view',
        users: 'edit',
        settings: 'edit',
      },
    },
  ],
  issuerSettings: defaultIssuerSettings,
  settingsSavedAt: '-',
}

export function normalizeData(data: Partial<AppData>): AppData {
  const normalizedVehicles = (data.vehicles ?? []).flatMap((vehicle) => {
    const legacyVehicle = vehicle as Partial<Vehicle>
    if (legacyVehicle.vehicleType) {
      return [{
        ...legacyVehicle,
        fleetNumber: legacyVehicle.fleetNumber ?? '',
        fleetRelation: legacyVehicle.fleetRelation ?? (legacyVehicle.vehicleType === 'Cavalo' ? 'TAC' : 'Equiparado'),
        fleetType: legacyVehicle.fleetType ?? legacyVehicle.type ?? (legacyVehicle.vehicleType === 'Cavalo' ? 'CAVALO MECANICO' : 'PORTA CONTEINER 40'),
        description: legacyVehicle.description ?? legacyVehicle.type ?? '',
        denatranType: legacyVehicle.denatranType ?? '',
        tractorPlate: legacyVehicle.tractorPlate ?? '',
        trailerPlate: legacyVehicle.trailerPlate ?? '',
        ownerDocument: legacyVehicle.ownerDocument ?? '',
        brand: legacyVehicle.brand ?? '',
        model: legacyVehicle.model ?? '',
        yearModel: legacyVehicle.yearModel ?? '',
        manufactureYear: legacyVehicle.manufactureYear ?? '',
        chassis: legacyVehicle.chassis ?? '',
        grExpiration: legacyVehicle.grExpiration ?? '',
        licensingExpiration: legacyVehicle.licensingExpiration ?? '',
        cityPlate: legacyVehicle.cityPlate ?? '',
        statePlate: legacyVehicle.statePlate ?? '',
        color: legacyVehicle.color ?? '',
        axles: legacyVehicle.axles ?? '',
        bodyType: legacyVehicle.bodyType ?? '',
        renavam: legacyVehicle.renavam ?? '',
        tare: legacyVehicle.tare ?? '',
        capacityM3: legacyVehicle.capacityM3 ?? '',
        capacityKg: legacyVehicle.capacityKg ?? '',
        trackerUsed: legacyVehicle.trackerUsed ?? false,
        trackerBrand: legacyVehicle.trackerBrand ?? '',
        trackerProtocol: legacyVehicle.trackerProtocol ?? '',
        smFleet: legacyVehicle.smFleet ?? '',
        driver: legacyVehicle.driver ?? '',
      } as Vehicle]
    }

    if (legacyVehicle.tractorPlate && legacyVehicle.trailerPlate) {
      return [
        {
          ...legacyVehicle,
          id: `${legacyVehicle.id ?? nextId('vei')}-cavalo`,
          vehicleType: 'Cavalo',
          trailerPlate: '',
          type: 'Cavalo mecânico',
        } as Vehicle,
        {
          ...legacyVehicle,
          id: `${legacyVehicle.id ?? nextId('vei')}-carreta`,
          vehicleType: 'Carreta',
          tractorPlate: '',
          type: 'Carreta porta-contêiner',
        } as Vehicle,
      ]
    }

    return [{
      ...legacyVehicle,
      vehicleType: legacyVehicle.tractorPlate ? 'Cavalo' : 'Carreta',
      tractorPlate: legacyVehicle.tractorPlate ?? '',
      trailerPlate: legacyVehicle.trailerPlate ?? '',
    } as Vehicle]
  })

  return {
    customers: (data.customers ?? []).map((customer) => ({
      ...customer,
      tradeName: customer.tradeName ?? '',
      participantType: customer.participantType ?? (customer.document?.length > 14 ? 'Juridica' : 'Fisica'),
      market: customer.market ?? '',
      category: customer.category ?? '',
      shortName: customer.shortName ?? customer.tradeName ?? customer.name,
      birthDate: customer.birthDate ?? '',
      anniversary: customer.anniversary ?? '',
      gender: customer.gender ?? '',
      rg: customer.rg ?? '',
      rgIssuer: customer.rgIssuer ?? '',
      rgState: customer.rgState ?? '',
      notes: customer.notes ?? '',
      website: customer.website ?? '',
      economicGroup: customer.economicGroup ?? '',
      groupedCode: customer.groupedCode ?? '',
      occupation: customer.occupation ?? '',
      educationLevel: customer.educationLevel ?? '',
      civilStatus: customer.civilStatus ?? '',
      spouseName: customer.spouseName ?? '',
      employerDocument: customer.employerDocument ?? '',
      employer: customer.employer ?? '',
      jobTitle: customer.jobTitle ?? '',
      birthplace: customer.birthplace ?? '',
      nationality: customer.nationality ?? 'Brasil',
      motherName: customer.motherName ?? '',
      fatherName: customer.fatherName ?? '',
      phone: customer.phone ?? '',
      phoneDdd: customer.phoneDdd ?? '',
      phoneExtension: customer.phoneExtension ?? '',
      hasWhatsapp: customer.hasWhatsapp ?? 'S',
      contactEmail: customer.contactEmail ?? customer.emailFiscal ?? '',
      municipalRegistration: customer.municipalRegistration ?? '123456',
      stateRegistration: customer.stateRegistration ?? '',
      zipCode: customer.zipCode ?? '69000-000',
      street: customer.street ?? 'Avenida Industrial',
      number: customer.number ?? '1000',
      complement: customer.complement ?? '',
      district: customer.district ?? 'Distrito Industrial',
      reference: customer.reference ?? '',
      cityCode: customer.cityCode ?? '1302603',
      country: customer.country ?? 'Brasil',
      taxRegime: customer.taxRegime ?? 'Simples Nacional',
      serviceCode: customer.serviceCode ?? '16.02',
      serviceDescription: customer.serviceDescription ?? 'Servico de transporte municipal de cargas e apoio logistico operacional.',
      issRate: customer.issRate ?? '5',
      issWithheld: customer.issWithheld ?? 'Nao',
      registrationDate: customer.registrationDate ?? '',
    })),
    drivers: (data.drivers ?? []).map((driver) => ({
      ...driver,
      personType: driver.personType ?? 'Fisica',
      tradeName: driver.tradeName ?? driver.name,
      shortName: driver.shortName ?? driver.name.split(' ')[0],
      mainCommunication: driver.mainCommunication ?? driver.phone,
      city: driver.city ?? 'Manaus',
      state: driver.state ?? 'AM',
      registrationDate: driver.registrationDate ?? '',
      grExpiration: driver.grExpiration ?? driver.cnhExpiration,
      email: driver.email ?? '',
      birthDate: driver.birthDate ?? '',
      anniversary: driver.anniversary ?? '',
      gender: driver.gender ?? 'Masculino',
      rg: driver.rg ?? '',
      rgIssuer: driver.rgIssuer ?? '',
      rgState: driver.rgState ?? 'AM',
      notes: driver.notes ?? '',
      nickname: driver.nickname ?? driver.name.split(' ')[0],
      website: driver.website ?? '',
      economicGroup: driver.economicGroup ?? '',
      groupedCode: driver.groupedCode ?? '',
      inss: driver.inss ?? '',
      occupation: driver.occupation ?? 'Motorista',
      educationLevel: driver.educationLevel ?? '',
      civilStatus: driver.civilStatus ?? '',
      spouseName: driver.spouseName ?? '',
      employerDocument: driver.employerDocument ?? '',
      employer: driver.employer ?? driver.carrier,
      jobTitle: driver.jobTitle ?? 'Motorista',
      birthplace: driver.birthplace ?? 'Manaus',
      nationality: driver.nationality ?? 'Brasil',
      motherName: driver.motherName ?? '',
      fatherName: driver.fatherName ?? '',
      addressType: driver.addressType ?? 'RESIDENCIAL',
      addressIdentification: driver.addressIdentification ?? '',
      street: driver.street ?? '',
      number: driver.number ?? '',
      complement: driver.complement ?? '',
      reference: driver.reference ?? '',
      district: driver.district ?? '',
      zipCode: driver.zipCode ?? '',
      municipalRegistration: driver.municipalRegistration ?? '',
      stateRegistration: driver.stateRegistration ?? '',
      communicationType: driver.communicationType ?? 'Celular',
      phoneDdd: driver.phoneDdd ?? '',
      phoneExtension: driver.phoneExtension ?? '',
      hasWhatsapp: driver.hasWhatsapp ?? 'S',
      contactEmail: driver.contactEmail ?? driver.email ?? '',
    })),
    vehicles: normalizedVehicles,
    containers: data.containers ?? [],
    deletedFreightIds: [...new Set((data.deletedFreightIds ?? []).map((id) => String(id)).filter(Boolean))],
    freights: (data.freights ?? []).map((freight) => {
      const legacyFreight = freight as Partial<Freight>
      return {
        ...legacyFreight,
        driver: legacyFreight.driver ?? '',
        tractorPlate: legacyFreight.tractorPlate ?? '',
        trailerPlate: legacyFreight.trailerPlate ?? '',
        processType: legacyFreight.processType ?? 'Multimodal [M]',
        customerIdentification: legacyFreight.customerIdentification ?? '',
        serviceTakerDocument: legacyFreight.serviceTakerDocument ?? '',
        serviceTaker: legacyFreight.serviceTaker ?? '',
        senderDocument: legacyFreight.senderDocument ?? '',
        sender: legacyFreight.sender ?? '',
        product: legacyFreight.product ?? '',
        recipientDocument: legacyFreight.recipientDocument ?? '',
        recipient: legacyFreight.recipient ?? legacyFreight.customer ?? '',
        taskHistory: legacyFreight.taskHistory ?? [],
        extraExpenses: legacyFreight.extraExpenses ?? [],
        invoiceSeries: legacyFreight.invoiceSeries ?? '',
        invoiceIssueDate: legacyFreight.invoiceIssueDate ?? '',
        invoiceGoodsValue: legacyFreight.invoiceGoodsValue ?? legacyFreight.invoiceValue ?? '0',
        invoiceAccessKey: legacyFreight.invoiceAccessKey ?? '',
      } as Freight
    }),
    closings: data.closings ?? [],
    fiscalDocuments: data.fiscalDocuments ?? [],
    receivables: data.receivables ?? [],
    priceLists: (data.priceLists ?? []).map((price) => ({
      ...price,
      listName: price.listName ?? '',
      originPort: price.originPort ?? '',
      destinationPort: price.destinationPort ?? '',
      product: price.product ?? 'CUSTO FRETE ROD, DESTINO',
      listValue: Number(price.listValue ?? 0),
      taxPercent: Number(price.taxPercent ?? 0),
      total: Number(price.total ?? price.listValue ?? 0),
      status: price.status ?? 'Ativo',
    })),
    payrollProfiles: (data.payrollProfiles ?? []).map((profile) => ({
      ...profile,
      salary: Number(profile.salary ?? 0),
      dailyRate: Number(profile.dailyRate ?? 0),
      paymentType: profile.paymentType ?? 'PIX',
      bank: profile.bank ?? '',
      agency: profile.agency ?? '',
      account: profile.account ?? '',
      pixKey: profile.pixKey ?? '',
      status: profile.status ?? 'Ativo',
    })),
    payrollClosings: (data.payrollClosings ?? []).map((closing) => ({
      ...closing,
      salary: Number(closing.salary ?? 0),
      dailyRate: Number(closing.dailyRate ?? 0),
      firstFortnightSalary: Number(closing.firstFortnightSalary ?? 0),
      firstFortnightOvertime: Number(closing.firstFortnightOvertime ?? 0),
      firstFortnightDiscount: Number(closing.firstFortnightDiscount ?? 0),
      secondFortnightSalary: Number(closing.secondFortnightSalary ?? 0),
      secondFortnightOvertime: Number(closing.secondFortnightOvertime ?? 0),
      transport: Number(closing.transport ?? 0),
      average: Number(closing.average ?? 0),
      basket: Number(closing.basket ?? 0),
      inss: Number(closing.inss ?? 0),
      irrf: Number(closing.irrf ?? 0),
      fgts: Number(closing.fgts ?? 0),
      dependents: Number(closing.dependents ?? 0),
      transportDiscount: Number(closing.transportDiscount ?? 0),
      absenceDiscount: Number(closing.absenceDiscount ?? 0),
      advancePayment: Number(closing.advancePayment ?? 0),
      otherDiscounts: Number(closing.otherDiscounts ?? 0),
      otherEarnings: Number(closing.otherEarnings ?? 0),
      tripQuantity: Number(closing.tripQuantity ?? 0),
      tripExpenses: Number(closing.tripExpenses ?? 0),
      vacationBonus: Number(closing.vacationBonus ?? 0),
      items: closing.items ?? [],
      grossTotal: Number(closing.grossTotal ?? 0),
      discountTotal: Number(closing.discountTotal ?? 0),
      netTotal: Number(closing.netTotal ?? 0),
      status: closing.status ?? 'Em conferencia',
      createdAt: closing.createdAt ?? '',
    })),
    users: (data.users ?? seedData.users).map((user) => ({
      ...user,
      password: user.password ?? '',
      passwordConfigured: user.passwordConfigured ?? Boolean(user.password),
      permissions: { ...emptyUserPermissions(), ...(user.permissions ?? {}) },
    })),
    issuerSettings: { ...defaultIssuerSettings, ...(data.issuerSettings ?? {}) },
    settingsSavedAt: data.settingsSavedAt ?? '-',
  }
}

function emptyUserPermissions(): Record<string, UserPermission> {
  return {
    dashboard: 'none',
    freights: 'none',
    customers: 'none',
    drivers: 'none',
    vehicles: 'none',
    closings: 'none',
    fiscalDocuments: 'none',
    finance: 'none',
    priceLists: 'none',
    payroll: 'none',
    reports: 'none',
    users: 'none',
    settings: 'none',
  }
}

export function loadData(): AppData {
  return normalizeData({
    customers: [],
    drivers: [],
    vehicles: [],
    containers: [],
    freights: [],
    deletedFreightIds: [],
    closings: [],
    fiscalDocuments: [],
    receivables: [],
    priceLists: [],
    payrollProfiles: [],
    payrollClosings: [],
    users: [],
    issuerSettings: defaultIssuerSettings,
    settingsSavedAt: '-',
  })
}

export function saveData(data: AppData) {
  void data
  window.dispatchEvent(new Event('app-data-changed'))
}

export function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function nextId(prefix: string) {
  return `${prefix}-${Date.now()}`
}
