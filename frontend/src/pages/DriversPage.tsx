import { useState } from 'react'
import { useLocalData } from '../hooks/useLocalData'
import { nextId } from '../services/localStore'

export function DriversPage() {
  const { drivers, setDrivers } = useLocalData()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', cpf: '', phone: '', cnh: '', category: 'E', cnhExpiration: '', carrier: 'Transcavalcante' })

  function saveDriver() {
    if (!form.name || !form.cpf || !form.cnh) {
      window.alert('Informe nome, CPF e CNH.')
      return
    }
    setDrivers([...drivers, { id: nextId('mot'), ...form, status: 'Ativo' }])
    setShowForm(false)
    setForm({ name: '', cpf: '', phone: '', cnh: '', category: 'E', cnhExpiration: '', carrier: 'Transcavalcante' })
  }

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Motoristas</h2>
          <p className="text-xs text-zinc-500">Cadastro de motoristas, CNH, transportadora vinculada e situação operacional.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Novo motorista</button>
      </div>
      {showForm && (
        <div className="grid gap-3 border-b border-zinc-300 bg-zinc-50 p-3 md:grid-cols-7">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-2" placeholder="Nome completo" />
          <input value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="CPF" />
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Telefone" />
          <input value={form.cnh} onChange={(event) => setForm({ ...form, cnh: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="CNH" />
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm">
            <option>C</option><option>D</option><option>E</option>
          </select>
          <input value={form.cnhExpiration} onChange={(event) => setForm({ ...form, cnhExpiration: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" type="date" />
          <div className="flex gap-2 md:col-span-7">
            <button onClick={saveDriver} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">Salvar</button>
            <button onClick={() => setShowForm(false)} className="border border-zinc-400 bg-white px-3 py-1.5 text-sm font-medium">Cancelar</button>
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>{['Nome', 'CPF', 'Telefone', 'CNH', 'Categoria', 'Validade', 'Transportadora', 'Situação', 'Ações'].map((h) => <th key={h} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>)}</tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id}>
              <td className="border-b border-zinc-200 px-3 py-2">{driver.name}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{driver.cpf}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{driver.phone}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{driver.cnh}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{driver.category}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{driver.cnhExpiration || '-'}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{driver.carrier}</td>
              <td className="border-b border-zinc-200 px-3 py-2 text-emerald-700">{driver.status}</td>
              <td className="border-b border-zinc-200 px-3 py-2"><button onClick={() => window.alert(driver.name)} className="border border-zinc-300 px-2 py-1 text-xs">Ver</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
