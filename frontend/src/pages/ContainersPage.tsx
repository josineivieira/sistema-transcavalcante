import { useState } from 'react'
import { useLocalData } from '../hooks/useLocalData'
import { nextId } from '../services/localStore'

export function ContainersPage() {
  const { containers, setContainers } = useLocalData()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ number: '', type: 'Dry', size: '40 HC', seal: '', shippingLine: '', grossWeight: '', tare: '', condition: 'Cheio' })

  function saveContainer() {
    if (!form.number) {
      window.alert('Informe o número do contêiner.')
      return
    }
    setContainers([...containers, { id: nextId('cnt'), ...form }])
    setShowForm(false)
    setForm({ number: '', type: 'Dry', size: '40 HC', seal: '', shippingLine: '', grossWeight: '', tare: '', condition: 'Cheio' })
  }

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
        <div><h2 className="text-sm font-semibold">Contêineres</h2><p className="text-xs text-zinc-500">Cadastro e rastreio de contêineres, lacres, armador, peso e condição.</p></div>
        <button onClick={() => setShowForm(true)} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Novo contêiner</button>
      </div>
      {showForm && <div className="grid gap-3 border-b border-zinc-300 bg-zinc-50 p-3 md:grid-cols-8">
        <input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value.toUpperCase() })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Número" />
        <input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Tipo" />
        <input value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Tamanho" />
        <input value={form.seal} onChange={(event) => setForm({ ...form, seal: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Lacre" />
        <input value={form.shippingLine} onChange={(event) => setForm({ ...form, shippingLine: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Armador" />
        <input value={form.grossWeight} onChange={(event) => setForm({ ...form, grossWeight: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Peso bruto" />
        <input value={form.tare} onChange={(event) => setForm({ ...form, tare: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Tara" />
        <button onClick={saveContainer} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">Salvar</button>
      </div>}
      <table className="w-full text-sm"><thead className="bg-zinc-50"><tr>{['Número', 'Tipo', 'Tamanho', 'Lacre', 'Armador', 'Peso bruto', 'Tara', 'Condição', 'Ações'].map((h) => <th key={h} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>)}</tr></thead>
        <tbody>{containers.map((container) => <tr key={container.id}><td className="border-b border-zinc-200 px-3 py-2">{container.number}</td><td className="border-b border-zinc-200 px-3 py-2">{container.type}</td><td className="border-b border-zinc-200 px-3 py-2">{container.size}</td><td className="border-b border-zinc-200 px-3 py-2">{container.seal}</td><td className="border-b border-zinc-200 px-3 py-2">{container.shippingLine}</td><td className="border-b border-zinc-200 px-3 py-2">{container.grossWeight}</td><td className="border-b border-zinc-200 px-3 py-2">{container.tare}</td><td className="border-b border-zinc-200 px-3 py-2">{container.condition}</td><td className="border-b border-zinc-200 px-3 py-2"><button onClick={() => window.alert(container.number)} className="border border-zinc-300 px-2 py-1 text-xs">Ver</button></td></tr>)}</tbody></table>
    </div>
  )
}
