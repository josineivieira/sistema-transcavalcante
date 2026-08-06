import { formatMoney } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'

export function ReportsPage() {
  const { freights, closings, fiscalDocuments, receivables } = useLocalData()
  const reports = [
    ['Fretes por período', 'Operacional', freights.length, formatMoney(freights.reduce((sum, item) => sum + item.value, 0))],
    ['Fechamentos semanais', 'Faturamento', closings.length, formatMoney(closings.reduce((sum, item) => sum + item.netTotal, 0))],
    ['Documentos fiscais', 'Fiscal', fiscalDocuments.length, formatMoney(fiscalDocuments.reduce((sum, item) => sum + item.value, 0))],
    ['Contas em aberto', 'Financeiro', receivables.filter((item) => item.status !== 'Pago').length, formatMoney(receivables.reduce((sum, item) => sum + item.netValue - item.paidValue, 0))],
  ]

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="border-b border-zinc-300 px-4 py-3"><h2 className="text-sm font-semibold">Relatórios</h2><p className="text-xs text-zinc-500">Relatórios operacionais, fiscais e financeiros com totais locais.</p></div>
      <table className="system-grid w-full text-xs">
        <thead className="bg-zinc-50"><tr>{['Relatório', 'Categoria', 'Registros', 'Total', 'Ações'].map((h) => <th key={h} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>)}</tr></thead>
        <tbody>{reports.map(([name, category, count, total]) => <tr key={name}><td className="border-b border-zinc-200 px-3 py-2">{name}</td><td className="border-b border-zinc-200 px-3 py-2">{category}</td><td className="border-b border-zinc-200 px-3 py-2">{count}</td><td className="border-b border-zinc-200 px-3 py-2">{total}</td><td className="border-b border-zinc-200 px-3 py-2"><button onClick={() => window.print()} className="border border-zinc-300 px-2 py-1 text-xs">Imprimir</button></td></tr>)}</tbody>
      </table>
    </div>
  )
}
