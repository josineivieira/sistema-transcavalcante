import { useEffect, useState } from 'react'
import { loadData, normalizeData, seedData } from '../services/localStore'
import { api } from '../services/api'
import type { AppData, Closing, ContainerRecord, Customer, Driver, FiscalDocument, Freight, PriceList, Receivable, SystemUser, Vehicle } from '../services/localStore'
import type { IssuerSettings } from '../services/fiscalSettings'

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

        if (response.data.data) {
          setData(normalizeData(response.data.data))
          setError('')
          return
        }

        const initialData = normalizeData(seedData)
        await api.put('/operational-data', { data: initialData })
        if (active) {
          setData(initialData)
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
    api.put('/operational-data', { data: normalized }).then(() => {
      setError('')
    }).catch(() => {
      setError('Nao foi possivel salvar no banco de dados.')
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
    setFreights: (freights: Freight[]) => update({ ...data, freights }),
    setClosings: (closings: Closing[]) => update({ ...data, closings }),
    setFiscalDocuments: (fiscalDocuments: FiscalDocument[]) => update({ ...data, fiscalDocuments }),
    setReceivables: (receivables: Receivable[]) => update({ ...data, receivables }),
    setPriceLists: (priceLists: PriceList[]) => update({ ...data, priceLists }),
    setUsers: (users: SystemUser[]) => update({ ...data, users }),
    setIssuerSettings: (issuerSettings: IssuerSettings, settingsSavedAt = data.settingsSavedAt) => update({ ...data, issuerSettings, settingsSavedAt }),
    update,
  }
}
