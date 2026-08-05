import { useLocalData } from '../hooks/useLocalData'
import { formatMoney } from '../services/localStore'

const productionChecks = [
  ['Certificado A1', 'Não configurado', 'Impeditivo'],
  ['Provedor NFS-e', 'Mock em desenvolvimento', 'Atenção'],
  ['Provedor CT-e', 'Não configurado', 'Impeditivo'],
  ['Armazenamento S3', 'Pendente', 'Atenção'],
]

export function DashboardPage() {
  const data = useLocalData()
  const approvedFreights = data.freights.filter((freight) => freight.operationalStatus === 'Aprovado para faturamento')
  const authorizedDocuments = data.fiscalDocuments.filter((document) => document.status.includes('Autorizado'))
  const weekTotal = data.freights.reduce((sum, freight) => sum + freight.value, 0)

  const indicators = [
    ['Fretes na semana', String(data.freights.length), 'Operação'],
    ['Aguardando conferência', String(data.freights.filter((freight) => freight.operationalStatus === 'Aguardando aprovação').length), 'Operação'],
    ['Aprovados para faturamento', String(approvedFreights.length), 'Faturamento'],
    ['Fechamentos pendentes', String(data.closings.filter((closing) => closing.status !== 'Emitido').length), 'Faturamento'],
    ['Documentos autorizados', String(authorizedDocuments.length), 'Fiscal'],
    ['Total da semana', formatMoney(weekTotal), 'Financeiro'],
  ]

  return (
    <div className="space-y-5">
      <div className="border border-zinc-300 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Painel operacional</h2>
            <p className="text-xs text-zinc-500">Indicadores calculados a partir dos módulos de frete, fechamento, fiscal e financeiro.</p>
          </div>
          <button onClick={() => window.dispatchEvent(new Event('app-data-changed'))} className="border border-zinc-400 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-800">Atualizar</button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200 md:grid-cols-6">
          {indicators.map(([title, value, group]) => (
            <div key={title} className="min-h-24 px-4 py-3">
              <div className="text-[11px] font-medium uppercase text-zinc-500">{group}</div>
              <div className="mt-2 text-xl font-semibold text-zinc-950">{value}</div>
              <div className="mt-1 text-xs text-zinc-600">{title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="border border-zinc-300 bg-white">
          <div className="border-b border-zinc-300 px-4 py-3 text-sm font-semibold">Pendências para produção fiscal</div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600">
              <tr>
                <th className="border-b border-zinc-300 px-3 py-2 text-left font-medium">Item</th>
                <th className="border-b border-zinc-300 px-3 py-2 text-left font-medium">Situação</th>
                <th className="border-b border-zinc-300 px-3 py-2 text-left font-medium">Criticidade</th>
              </tr>
            </thead>
            <tbody>
              {productionChecks.map(([item, status, criticality]) => (
                <tr key={item}>
                  <td className="border-b border-zinc-200 px-3 py-2">{item}</td>
                  <td className="border-b border-zinc-200 px-3 py-2 text-zinc-600">{status}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">
                    <span className={criticality === 'Impeditivo' ? 'text-red-700' : 'text-amber-700'}>{criticality}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-zinc-300 bg-white">
          <div className="border-b border-zinc-300 px-4 py-3 text-sm font-semibold">Fila fiscal</div>
          <div className="divide-y divide-zinc-200 text-sm">
            {[
              ['Aguardando emissão', data.closings.filter((closing) => closing.status === 'Aprovado').length],
              ['Processando consulta', 0],
              ['Rejeitados com ação', 0],
              ['Cancelamentos pendentes', 0],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-zinc-700">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
