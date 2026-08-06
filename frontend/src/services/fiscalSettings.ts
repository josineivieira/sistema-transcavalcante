export type IssuerSettings = {
  legalName: string
  tradeName: string
  document: string
  municipalRegistration: string
  stateRegistration: string
  taxRegime: string
  simplesNacional: string
  phone: string
  email: string
  zipCode: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  cityCode: string
  state: string
  country: string
  nationalServiceCode: string
  municipalServiceCode: string
  cnae: string
  nbs: string
  defaultServiceDescription: string
  issRate: string
  issWithheldDefault: string
  pisRate: string
  cofinsRate: string
  irrfRate: string
  csllRate: string
  nfseEnvironment: string
  nfseProvider: string
  nfseEndpoint: string
  nfseSeries: string
  nextDpsNumber: string
  certificateName: string
  certificateExpiration: string
  productionReady: string
}

export const defaultIssuerSettings: IssuerSettings = {
  legalName: 'TRANSCAVALCANTE TRANSPORTES DE CARGAS LTDA',
  tradeName: 'Transcavalcante',
  document: '10.872.023/0001-40',
  municipalRegistration: '13129201',
  stateRegistration: '',
  taxRegime: 'Simples Nacional',
  simplesNacional: 'Sim',
  phone: '(92) 9145-2669',
  email: 'CONTADORPERFIL@OUTLOOK.COM',
  zipCode: '69098-138',
  street: 'RUA BOA VENTURA',
  number: '10',
  complement: '',
  district: 'NOVO ALEIXO',
  city: 'Manaus',
  cityCode: '1302603',
  state: 'AM',
  country: 'Brasil',
  nationalServiceCode: '16.02',
  municipalServiceCode: '100',
  cnae: '',
  nbs: '',
  defaultServiceDescription: 'SERVICO PRESTADO DE TRANSPORTE - UNIDADES:',
  issRate: '5',
  issWithheldDefault: 'Nao',
  pisRate: '0.65',
  cofinsRate: '3',
  irrfRate: '0',
  csllRate: '0',
  nfseEnvironment: 'Homologacao',
  nfseProvider: 'Mock',
  nfseEndpoint: '',
  nfseSeries: '1',
  nextDpsNumber: '1',
  certificateName: 'Nao instalado',
  certificateExpiration: '',
  productionReady: 'Nao',
}
