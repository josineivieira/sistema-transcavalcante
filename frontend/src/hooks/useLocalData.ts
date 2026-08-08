import { useCallback, useEffect, useRef, useState } from 'react'
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

type OperationalFreightRecordResponse = {
  data: Freight
}

type FreightQuery = {
  search?: string
  status?: string
  process_number?: string
  process_code?: string
  date_start?: string
  date_end?: string
  process_description?: string
  supplier?: string
  process_type?: string
  container?: string
  origin_date_start?: string
  origin_date_end?: string
  limit?: number
  offset?: number
}

export function useLocalData() {
  const [data, setData] = useState(loadData)
  const [loading, setLoading] = useState(true)
  const [freightsLoading, setFreightsLoading] = useState(true)
  const [freightsTotal, setFreightsTotal] = useState(0)
  const [error, setError] = useState('')
  const deletedFreightIdsRef = useRef(new Set<string>())

  const loadFreights = useCallback((params: FreightQuery = {}) => {
    setFreightsLoading(true)
    return api.get<OperationalFreightsResponse>('/operational-freights', {
      params: { limit: 500, offset: 0, ...params },
    }).then((response) => {
      const items = (response.data.items || []).filter((freight) => !deletedFreightIdsRef.current.has(freight.id))
      setData((current) => normalizeData({ ...current, freights: items }))
      setFreightsTotal(Math.max(0, (response.data.total ?? items.length) - deletedFreightIdsRef.current.size))
      setError('')
    }).catch(() => {
      setError('Nao foi possivel carregar fretes.')
    }).finally(() => {
      setFreightsLoading(false)
    })
  }, [])

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
          params: { limit: 500 },
        })
        const freights = (freightsResponse.data.items || []).filter((freight) => !deletedFreightIdsRef.current.has(freight.id))
        nextData = normalizeData({ ...nextData, freights })

        if (active) {
          setData(nextData)
          setFreightsTotal(freightsResponse.data.total ?? nextData.freights.length)
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
        setFreightsLoading(false)
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

  function saveFreightRecord(freight: Freight) {
    setData((current) => {
      const exists = current.freights.some((item) => item.id === freight.id)
      const freights = exists
        ? current.freights.map((item) => item.id === freight.id ? freight : item)
        : [freight, ...current.freights]
      return normalizeData({ ...current, freights })
    })

    return api.put<OperationalFreightRecordResponse>(`/operational-freights/${encodeURIComponent(freight.id)}`, { data: freight }).then((response) => {
      const saved = response.data.data
      setData((current) => {
        const exists = current.freights.some((item) => item.id === saved.id)
        const freights = exists
          ? current.freights.map((item) => item.id === saved.id ? saved : item)
          : [saved, ...current.freights]
        return normalizeData({ ...current, freights })
      })
      setError('')
      return saved
    }).catch((reason) => {
      setError('Nao foi possivel salvar frete no banco de dados.')
      throw reason
    })
  }

  function deleteFreightRecord(id: string) {
    const previousFreights = data.freights
    deletedFreightIdsRef.current.add(id)
    setData((current) => normalizeData({ ...current, freights: current.freights.filter((freight) => freight.id !== id) }))
    setFreightsTotal((current) => Math.max(0, current - 1))

    return api.delete(`/operational-freights/${encodeURIComponent(id)}`).then(() => {
      setError('')
    }).catch((reason) => {
      deletedFreightIdsRef.current.delete(id)
      setData((current) => normalizeData({ ...current, freights: previousFreights }))
      setFreightsTotal(previousFreights.length)
      setError('Nao foi possivel excluir frete no banco de dados.')
      throw reason
    })
  }

  return {
    ...data,
    loading,
    freightsLoading,
    freightsTotal,
    error,
    setCustomers: (customers: Customer[]) => update({ ...data, customers }),
    setDrivers: (drivers: Driver[]) => update({ ...data, drivers }),
    setVehicles: (vehicles: Vehicle[]) => update({ ...data, vehicles }),
    setContainers: (containers: ContainerRecord[]) => update({ ...data, containers }),
    setFreights,
    loadFreights,
    saveFreightRecord,
    deleteFreightRecord,
    setClosings: (closings: Closing[]) => update({ ...data, closings }),
    setFiscalDocuments: (fiscalDocuments: FiscalDocument[]) => update({ ...data, fiscalDocuments }),
    setReceivables: (receivables: Receivable[]) => update({ ...data, receivables }),
    setPriceLists: (priceLists: PriceList[]) => update({ ...data, priceLists }),
    setUsers: (users: SystemUser[]) => update({ ...data, users }),
    setIssuerSettings: (issuerSettings: IssuerSettings, settingsSavedAt = data.settingsSavedAt) => update({ ...data, issuerSettings, settingsSavedAt }),
    update,
  }
}
