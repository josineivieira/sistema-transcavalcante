type LoadingStateProps = {
  colSpan?: number
  label?: string
}

export function LoadingState({ label = 'Carregando informações...' }: LoadingStateProps) {
  return (
    <div className="grid min-h-48 place-items-center bg-white text-xs text-zinc-600">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-900" />
        <div className="font-medium text-zinc-700">{label}</div>
      </div>
    </div>
  )
}

export function LoadingRow({ colSpan = 1, label = 'Carregando informações...' }: LoadingStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="border-b border-zinc-200 p-0">
        <LoadingState label={label} />
      </td>
    </tr>
  )
}
