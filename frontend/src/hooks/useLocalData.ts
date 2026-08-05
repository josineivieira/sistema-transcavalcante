import { useEffect, useState } from 'react'
import { loadData, saveData } from '../services/localStore'
import type { AppData, Closing, ContainerRecord, Customer, Driver, FiscalDocument, Freight, Receivable, Vehicle } from '../services/localStore'

export function useLocalData() {
  const [data, setData] = useState(loadData)

  useEffect(() => {
    const sync = () => setData(loadData())
    window.addEventListener('app-data-changed', sync)
    return () => window.removeEventListener('app-data-changed', sync)
  }, [])

  function update(nextData: AppData) {
    setData(nextData)
    saveData(nextData)
  }

  return {
    ...data,
    setCustomers: (customers: Customer[]) => update({ ...data, customers }),
    setDrivers: (drivers: Driver[]) => update({ ...data, drivers }),
    setVehicles: (vehicles: Vehicle[]) => update({ ...data, vehicles }),
    setContainers: (containers: ContainerRecord[]) => update({ ...data, containers }),
    setFreights: (freights: Freight[]) => update({ ...data, freights }),
    setClosings: (closings: Closing[]) => update({ ...data, closings }),
    setFiscalDocuments: (fiscalDocuments: FiscalDocument[]) => update({ ...data, fiscalDocuments }),
    setReceivables: (receivables: Receivable[]) => update({ ...data, receivables }),
    update,
  }
}
