import { nextId, type Freight, type FreightTask } from './localStore'

export const freightStatuses = {
  newFreight: 'NOVO FRETE',
  scheduledDelivery: 'ENTREGA PROGRAMADA',
  containerMounted: 'CONTAINER MONTADO',
  customerArrival: 'CHEGADA NO CLIENTE',
  customerDeparture: 'SAIDA DO CLIENTE',
  deliveryCompleted: 'ENTREGA CONCLUIDA',
  includedInClosing: 'INCLUIDO EM FECHAMENTO',
  awaitingPayment: 'AGUARDANDO PAGAMENTO',
  paid: 'ENCERRADO - FRETE PAGO',
} as const

export const freightStatusFlow: string[] = Object.values(freightStatuses)

export function addFreightStatus(
  freight: Freight,
  status: string,
  user = 'Sistema',
  description = 'Status atualizado pelo fluxo do frete.',
): Freight {
  if (freight.operationalStatus === status) return freight

  const now = new Date().toLocaleString('pt-BR')
  const history: FreightTask = {
    id: nextId('status'),
    name: status,
    description,
    status: 'ENCERRADO',
    sendToCustomer: 'N',
    startDate: now,
    endDate: now,
    completionPercent: 100,
    internalUse: 'S',
    time: 'Hoje',
    user,
  }

  return {
    ...freight,
    operationalStatus: status,
    taskHistory: [history, ...(freight.taskHistory ?? [])],
  }
}
