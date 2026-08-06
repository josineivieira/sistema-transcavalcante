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

export type Freight = {
  id: string
  number: string
  date: string
  customer: string
  process: string
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

export type UserPermission = 'none' | 'view' | 'edit'

export type SystemUser = {
  id: string
  name: string
  email: string
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
  closings: Closing[]
  fiscalDocuments: FiscalDocument[]
  receivables: Receivable[]
  users: SystemUser[]
}

const storageKey = 'transcavalcante.appData.v2'

const seedData: AppData = {
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
  closings: [],
  fiscalDocuments: [],
  receivables: [],
  users: [
    {
      id: 'usr-1',
      name: 'Administrador SF',
      email: 'admin@transcavalcante.local',
      role: 'Administrador',
      department: 'Administracao',
      status: 'Ativo',
      permissions: {
        dashboard: 'view',
        freights: 'edit',
        customers: 'edit',
        drivers: 'edit',
        vehicles: 'edit',
        containers: 'edit',
        closings: 'edit',
        fiscalDocuments: 'edit',
        finance: 'edit',
        reports: 'view',
        users: 'edit',
        settings: 'edit',
      },
    },
  ],
}

function normalizeData(data: Partial<AppData>): AppData {
  const normalizedVehicles = (data.vehicles ?? seedData.vehicles).flatMap((vehicle) => {
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
    customers: (data.customers ?? seedData.customers).map((customer) => ({
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
    drivers: (data.drivers ?? seedData.drivers).map((driver) => ({
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
    containers: data.containers ?? seedData.containers,
    freights: (data.freights ?? seedData.freights).map((freight) => {
      const legacyFreight = freight as Partial<Freight>
      return {
        ...legacyFreight,
        driver: legacyFreight.driver ?? '',
        tractorPlate: legacyFreight.tractorPlate ?? '',
        trailerPlate: legacyFreight.trailerPlate ?? '',
      } as Freight
    }),
    closings: data.closings ?? [],
    fiscalDocuments: data.fiscalDocuments ?? [],
    receivables: data.receivables ?? [],
    users: data.users ?? seedData.users,
  }
}

export function loadData(): AppData {
  const raw = localStorage.getItem(storageKey) || localStorage.getItem('transcavalcante.appData.v1')
  if (!raw) {
    return seedData
  }

  try {
    return normalizeData(JSON.parse(raw) as Partial<AppData>)
  } catch {
    return seedData
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(storageKey, JSON.stringify(data))
  window.dispatchEvent(new Event('app-data-changed'))
}

export function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function nextId(prefix: string) {
  return `${prefix}-${Date.now()}`
}
