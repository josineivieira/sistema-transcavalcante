import { useState } from 'react'
import { Pencil, Save, X } from 'lucide-react'
import { useLocalData } from '../hooks/useLocalData'
import { nextId } from '../services/localStore'
import { canEdit, denyNoPrivilege } from '../services/authSession'

const emptyContainer = { number: '', type: 'Dry', size: '40 HC', seal: '', shippingLine: '', grossWeight: '', tare: '', condition: 'Cheio' }

export function ContainersPage() {
  const { containers, setContainers } = useLocalData()
  const canEditPage = canEdit('containers')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyContainer)

  function openContainer(container?: (typeof containers)[number]) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (container) {
      setEditingId(container.id)
      setForm({
        number: container.number,
        type: container.type,
        size: container.size,
        seal: container.seal,
        shippingLine: container.shippingLine,
        grossWeight: container.grossWeight,
        tare: container.tare,
        condition: container.condition,
      })
    } else {
      setEditingId(null)
      setForm(emptyContainer)
    }
    setShowForm(true)
  }

  function saveContainer() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!form.number) {
      window.alert('Informe o numero do conteiner.')
      return
    }
    setContainers(editingId
      ? containers.map((container) => container.id === editingId ? { ...container, ...form } : container)
      : [...containers, { id: nextId('cnt'), ...form }],
    )
    setShowForm(false)
    setEditingId(null)
    setForm(emptyContainer)
  }

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Conteineres</h2>
          <p className="text-xs text-zinc-500">Cadastro e rastreio de conteineres, lacres, armador, peso e condicao.</p>
        </div>
        <button onClick={() => openContainer()} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Novo conteiner</button>
      </div>
      <table className="system-grid w-full text-xs">
        <thead className="bg-zinc-50">
          <tr>{['Numero', 'Tipo', 'Tamanho', 'Lacre', 'Armador', 'Peso bruto', 'Tara', 'Condicao', 'Acoes'].map((h) => <th key={h} className="border-b border-zinc-300 text-left font-medium text-zinc-600">{h}</th>)}</tr>
        </thead>
        <tbody>
          {containers.map((container) => (
            <tr key={container.id}>
              <td className="border-b border-zinc-200">{container.number}</td>
              <td className="border-b border-zinc-200">{container.type}</td>
              <td className="border-b border-zinc-200">{container.size}</td>
              <td className="border-b border-zinc-200">{container.seal}</td>
              <td className="border-b border-zinc-200">{container.shippingLine}</td>
              <td className="border-b border-zinc-200">{container.grossWeight}</td>
              <td className="border-b border-zinc-200">{container.tare}</td>
              <td className="border-b border-zinc-200">{container.condition}</td>
              <td className="border-b border-zinc-200">
                <button onClick={() => openContainer(container)} className="border border-zinc-300 bg-white px-2 py-1" title="Editar">
                  <Pencil size={14} />
                </button>
              </td>
            </tr>
          ))}
          {!containers.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-zinc-500">Nenhum conteiner encontrado.</td></tr>}
        </tbody>
      </table>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-6">
          <div className="system-modal max-h-[calc(100vh-48px)] w-full max-w-4xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Conteiner</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={saveContainer} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => setShowForm(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="grid items-start gap-x-12 gap-y-2 p-3 md:grid-cols-2">
              {[
                ['Numero', 'number'],
                ['Tipo', 'type'],
                ['Tamanho', 'size'],
                ['Lacre', 'seal'],
                ['Armador', 'shippingLine'],
                ['Peso bruto', 'grossWeight'],
                ['Tara', 'tare'],
                ['Condicao', 'condition'],
              ].map(([label, key]) => (
                <label key={key} className="grid grid-cols-[110px_1fr] items-center gap-1 text-xs">
                  <span className="text-right">{label}</span>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(event) => setForm({ ...form, [key]: key === 'number' ? event.target.value.toUpperCase() : event.target.value })}
                    className="h-7 border border-zinc-300 px-2"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
