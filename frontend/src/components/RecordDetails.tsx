import { useEffect, useRef, useState } from 'react'
import { Copy, Download, Pencil, Printer, Share2, X } from 'lucide-react'
import type { VehicleAttachment } from '../services/localStore'
import { renderRecordPrint } from '../services/recordPrint'
import { recordText, type DetailSection } from '../services/recordDetails'

export function RecordDetails({ title, name, sections, onClose, onEdit, attachments = [] }: { title: string; name: string; sections: DetailSection[]; onClose: () => void; onEdit?: () => void; attachments?: VehicleAttachment[] }) {
  const [selected, setSelected] = useState(() => sections.filter((item) => item.defaultShare !== false).map((item) => item.title))
  const [message, setMessage] = useState('')
  const dialog = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const selectedSections = sections.filter((item) => selected.includes(item.title))
  const text = recordText(title, name, selectedSections)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab') {
        const targets = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]') || [])
        const first = targets[0], last = targets[targets.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [])

  async function share(copyOnly = false) {
    setMessage('')
    try {
      if (!copyOnly && navigator.share) await navigator.share({ title: `${title} - ${name}`, text })
      else { await navigator.clipboard.writeText(text); setMessage('Ficha copiada. Cole na conversa ou mensagem para compartilhar.') }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setMessage('Não foi possível compartilhar automaticamente. Selecione o texto da ficha ou use Imprimir / PDF.')
    }
  }

  async function download(file: VehicleAttachment) {
    try {
      const blob = await (await fetch(file.dataUrl)).blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = file.name; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setMessage('Não foi possível baixar o documento. Tente novamente.') }
  }

  async function print() {
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;bottom:0;right:0'
    frame.title = 'Impressão da ficha'
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    const win = frame.contentWindow
    if (!doc || !win) { frame.remove(); return }
    const logo = renderRecordPrint(doc, title, name, selectedSections, new URL('/transcavalcante-logo-transparent.png', window.location.origin).href)
    try { await logo.decode() } catch { logo.style.visibility = 'hidden' }
    win.addEventListener('afterprint', () => frame.remove(), { once: true })
    win.focus(); win.print()
    window.setTimeout(() => frame.remove(), 120000)
  }

  return <div className="customer-editor-overlay">
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="record-details-title" className="customer-editor">
      <header className="customer-editor-header">
        <h3 id="record-details-title">{title}</h3>
        <div className="customer-editor-actions">
          {onEdit && <button onClick={onEdit}><Pencil size={15} /> Editar</button>}
          <button onClick={() => void share(true)} disabled={!selected.length}><Copy size={15} /> Copiar ficha</button>
          <button onClick={() => void share()} disabled={!selected.length}><Share2 size={15} /> Compartilhar</button>
          <button onClick={() => void print()} disabled={!selected.length}><Printer size={15} /> Imprimir / PDF</button>
          <button ref={closeButton} onClick={onClose} aria-label="Fechar visualização"><X size={18} /></button>
        </div>
      </header>
      <div className="customer-editor-body">
        <h4 className="text-lg font-semibold text-[#244761]">{name}</h4>
        <fieldset><legend>Incluir ao compartilhar ou imprimir</legend><div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">{sections.map((item) => <label key={item.title} className="inline-flex items-center gap-2"><input type="checkbox" checked={selected.includes(item.title)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.title] : current.filter((title) => title !== item.title))} />{item.title}</label>)}</div></fieldset>
        {message && <p role="status" className="border border-zinc-300 bg-white p-3 text-xs">{message}</p>}
        {!!attachments.length && <fieldset><legend>Documentos anexados</legend><div className="grid gap-2">{attachments.map((file) => <button key={file.id} onClick={() => void download(file)} className="flex items-center gap-2 text-left text-xs text-[#244761]"><Download size={15} /><span className="break-all">{file.name}</span></button>)}</div></fieldset>}
        {sections.map((item) => <fieldset key={item.title}><legend>{item.title}</legend><dl className="customer-editor-grid">{item.fields.map(([label, value], index) => <div key={`${label}-${index}`} className="min-w-0 text-xs"><dt className="mb-1 text-zinc-500">{label}</dt><dd className="whitespace-pre-wrap break-words font-medium text-zinc-900">{value}</dd></div>)}</dl></fieldset>)}
      </div>
    </section>
  </div>
}
