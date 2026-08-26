import { formatMoney } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { LoadingRow } from '../components/LoadingState'

export function FinancePage() {
  const data = useLocalData()

  function generateReceivables() {
    const newItems = data.fiscalDocuments
      .filter((document) => !data.receivables.some((item) => item.document === document.number))
      .map((document) => ({
        id: `rec-${document.id}`,
        customer: document.customer,
        closing: document.closing,
        document: document.number,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        netValue: document.value,
        paidValue: 0,
        status: 'Em aberto',
      }))

    if (!newItems.length) {
      window.alert('Nenhum documento novo para gerar contas a receber.')
      return
    }

    data.update({ ...data, receivables: [...data.receivables, ...newItems] })
  }

  function markAsPaid(id: string) {
    data.update({
      ...data,
      receivables: data.receivables.map((item) => item.id === id ? { ...item, paidValue: item.netValue, status: 'Pago' } : item),
    })
  }

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
        <h2 className="text-lg font-normal text-red-600">Consulta financeiro</h2>
        <button onClick={generateReceivables} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Gerar contas</button>
      </div>
      <table className="system-grid w-full text-xs">
        <thead className="bg-zinc-50"><tr>{['Cliente', 'Fechamento', 'Documento', 'Vencimento', 'Valor líquido', 'Pago', 'Saldo', 'Situação', 'Ações'].map((h) => <th key={h} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">{h}</th>)}</tr></thead>
        <tbody>
          {!data.loading && data.receivables.map((item) => (
            <tr key={item.id}>
              <td className="border-b border-zinc-200 px-3 py-2">{item.customer}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{item.closing}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{item.document}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{item.dueDate}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(item.netValue)}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(item.paidValue)}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(item.netValue - item.paidValue)}</td>
              <td className="border-b border-zinc-200 px-3 py-2">{item.status}</td>
              <td className="border-b border-zinc-200 px-3 py-2"><button onClick={() => markAsPaid(item.id)} className="border border-zinc-300 px-2 py-1 text-xs">Baixar</button></td>
            </tr>
          ))}
          {data.loading && <LoadingRow colSpan={9} label="Carregando financeiro..." />}
          {!data.loading && !data.receivables.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-zinc-500">Nenhuma conta gerada.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
