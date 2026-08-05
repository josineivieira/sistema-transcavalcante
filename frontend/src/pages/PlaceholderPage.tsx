type PlaceholderPageProps = {
  title: string
  description: string
  columns: string[]
}

export function PlaceholderPage({ title, description, columns }: PlaceholderPageProps) {
  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <button className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Novo registro</button>
      </div>
      <div className="grid gap-3 border-b border-zinc-300 p-3 md:grid-cols-5">
        <input className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Busca" />
        <select className="border border-zinc-300 px-2 py-1.5 text-sm">
          <option>Situação</option>
        </select>
        <input className="border border-zinc-300 px-2 py-1.5 text-sm" type="date" />
        <input className="border border-zinc-300 px-2 py-1.5 text-sm" type="date" />
        <button className="border border-zinc-400 bg-zinc-100 px-3 py-1.5 text-sm font-medium">Filtrar</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-zinc-50">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-zinc-500">Nenhum registro carregado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
