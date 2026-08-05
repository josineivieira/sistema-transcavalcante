export type Customer = {
  id: string
  document: string
  name: string
  tradeName?: string
  emailFiscal: string
  phone?: string
  municipalRegistration?: string
  stateRegistration?: string
  zipCode?: string
  street?: string
  number?: string
  complement?: string
  district?: string
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
  status: string
}

export type Vehicle = {
  id: string
  vehicleType: 'Cavalo' | 'Carreta'
  tractorPlate: string
  trailerPlate: string
  type: string
  rntrc: string
  owner: string
  carrier: string
  capacity: string
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

export type AppData = {
  customers: Customer[]
  drivers: Driver[]
  vehicles: Vehicle[]
  containers: ContainerRecord[]
  freights: Freight[]
  closings: Closing[]
  fiscalDocuments: FiscalDocument[]
  receivables: Receivable[]
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
}

function normalizeData(data: Partial<AppData>): AppData {
  const normalizedVehicles = (data.vehicles ?? seedData.vehicles).flatMap((vehicle) => {
    const legacyVehicle = vehicle as Partial<Vehicle>
    if (legacyVehicle.vehicleType) {
      return [{
        ...legacyVehicle,
        tractorPlate: legacyVehicle.tractorPlate ?? '',
        trailerPlate: legacyVehicle.trailerPlate ?? '',
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
      phone: customer.phone ?? '',
      municipalRegistration: customer.municipalRegistration ?? '123456',
      stateRegistration: customer.stateRegistration ?? '',
      zipCode: customer.zipCode ?? '69000-000',
      street: customer.street ?? 'Avenida Industrial',
      number: customer.number ?? '1000',
      complement: customer.complement ?? '',
      district: customer.district ?? 'Distrito Industrial',
      cityCode: customer.cityCode ?? '1302603',
      country: customer.country ?? 'Brasil',
      taxRegime: customer.taxRegime ?? 'Simples Nacional',
      serviceCode: customer.serviceCode ?? '16.02',
      serviceDescription: customer.serviceDescription ?? 'Servico de transporte municipal de cargas e apoio logistico operacional.',
      issRate: customer.issRate ?? '5',
      issWithheld: customer.issWithheld ?? 'Nao',
    })),
    drivers: data.drivers ?? seedData.drivers,
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
