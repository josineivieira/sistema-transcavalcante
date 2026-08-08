import { useEffect, useState } from 'react'
import { loadData, normalizeData } from '../services/localStore'
import { api } from '../services/api'
import type { AppData, Closing, ContainerRecord, Customer, Driver, FiscalDocument, Freight, PriceList, Receivable, SystemUser, Vehicle } from '../services/localStore'
import type { IssuerSettings } from '../services/fiscalSettings'

type OperationalFreightsResponse = {
  items: Freight[]
  total: number
  limit: number
  offset: number
}

export function useLocalData() {
  const [data, setData] = useState(loadData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    api.get<{ data: AppData | null }>('/operational-data')
      .then(async (response) => {
        if (!active) {
          return
        }

        let nextData: AppData
        if (response.data.data) {
          nextData = normalizeData(response.data.data)
        } else {
          const initialData = loadData()
          await api.put('/operational-data', { data: { ...initialData, freights: [] } })
          nextData = initialData
        }

        const freightsResponse = await api.get<OperationalFreightsResponse>('/operational-freights', {
          params: { limit: 1000 },
        })
        nextData = normalizeData({ ...nextData, freights: freightsResponse.data.items || [] })

        if (active) {
          setData(nextData)
          setError('')
        }
      })
      .catch(() => {
        if (active) {
          setError('Nao foi possivel conectar ao banco de dados.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  function update(nextData: AppData) {
    const normalized = normalizeData(nextData)
    setData(normalized)
    api.put('/operational-data', { data: { ...normalized, freights: [] } }).then(() => {
      setError('')
    }).catch(() => {
      setError('Nao foi possivel salvar no banco de dados.')
    })
  }

  function setFreights(freights: Freight[]) {
    const normalized = normalizeData({ ...data, freights })
    const currentIds = new Set(data.freights.map((freight) => freight.id))
    const nextIds = new Set(freights.map((freight) => freight.id))
    const removedIds = [...currentIds].filter((id) => !nextIds.has(id))

    setData(normalized)

    const requests = [
      ...freights.map((freight) => api.put(`/operational-freights/${encodeURIComponent(freight.id)}`, { data: freight })),
      ...removedIds.map((id) => api.delete(`/operational-freights/${encodeURIComponent(id)}`)),
    ]

    Promise.all(requests).then(() => {
      setError('')
    }).catch(() => {
      setError('Nao foi possivel salvar fretes no banco de dados.')
    })
  }

  return {
    ...data,
    loading,
    error,
    setCustomers: (customers: Customer[]) => update({ ...data, customers }),
    setDrivers: (drivers: Driver[]) => update({ ...data, drivers }),
    setVehicles: (vehicles: Vehicle[]) => update({ ...data, vehicles }),
    setContainers: (containers: ContainerRecord[]) => update({ ...data, containers }),
    setFreights,
    setClosings: (closings: Closing[]) => update({ ...data, closings }),
    setFiscalDocuments: (fiscalDocuments: FiscalDocument[]) => update({ ...data, fiscalDocuments }),
    setReceivables: (receivables: Receivable[]) => update({ ...data, receivables }),
    setPriceLists: (priceLists: PriceList[]) => update({ ...data, priceLists }),
    setUsers: (users: SystemUser[]) => update({ ...data, users }),
    setIssuerSettings: (issuerSettings: IssuerSettings, settingsSavedAt = data.settingsSavedAt) => update({ ...data, issuerSettings, settingsSavedAt }),
    update,
  }
}
