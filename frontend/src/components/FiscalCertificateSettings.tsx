import { useEffect, useState } from 'react'
import { api } from '../services/api'

type CertificateInfo = { installed: boolean; details?: { cnpj: string; subject: string; validUntil: string; filename: string } }
export function FiscalCertificateSettings({ canEdit, dirty, issuerDocument }: { canEdit: boolean; dirty: boolean; issuerDocument: string }) {
  const [info, setInfo] = useState<CertificateInfo | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.get<CertificateInfo>('/operational-nfse/certificate').then((response) => setInfo(response.data)).catch(() => setMessage('Não foi possível consultar o certificado no backend. Confira o deploy e as migrações.'))
  }, [issuerDocument])
  async function install() {
    if (!canEdit || dirty || !file) return
    setBusy(true); setMessage('')
    try {
      const body = new FormData(); body.append('file', file); body.append('password', password)
      const response = await api.post<CertificateInfo>('/operational-nfse/certificate', body)
      setInfo(response.data); setFile(null); setMessage('A1 validado localmente e instalado. Use Testar conexão para conferir a aceitação pela API.')
    } catch (error: any) { setMessage(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : 'Não foi possível instalar o certificado.') }
    finally { setPassword(''); setBusy(false) }
  }
  async function connection() {
    setBusy(true); setMessage('')
    try {
      await api.post('/operational-nfse/connection-test')
      setMessage('Conexão autenticada com a NFS-e Nacional em homologação. Parâmetros municipais recebidos. Nenhuma nota foi emitida.')
    } catch (error: any) { setMessage(typeof error.response?.data?.detail === 'string' ? error.response.data.detail : 'Falha na conexão fiscal.') }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('Remover o certificado A1 instalado?')) return
    setBusy(true)
    try { await api.delete('/operational-nfse/certificate'); setInfo({ installed: false }); setMessage('Certificado removido.') }
    catch { setMessage('Não foi possível remover o certificado.') }
    finally { setBusy(false) }
  }
  return <section className="border border-zinc-300 bg-white">
    <header className="border-b border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-semibold">Certificado A1 e conexão fiscal</header>
    <div className="space-y-4 p-4 text-xs">
      <p>Ambiente: <strong>Produção restrita / homologação</strong></p>
      {info?.installed ? <div className="grid gap-2 border border-zinc-200 p-3 md:grid-cols-2"><span>Arquivo: {info.details?.filename}</span><span>CNPJ: {info.details?.cnpj}</span><span>Válido até: {info.details?.validUntil ? new Date(info.details.validUntil).toLocaleDateString('pt-BR') : '—'}</span><span className="break-all">Titular: {info.details?.subject}</span></div> : <p>Certificado ainda não instalado.</p>}
      {dirty && <p className="text-amber-800">Salve as configurações da empresa antes de instalar o certificado ou testar a conexão.</p>}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="field">Arquivo A1 (.pfx/.p12)<input type="file" accept=".pfx,.p12,application/x-pkcs12" disabled={!canEdit || busy || dirty} onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <label className="field">Senha do certificado<input type="password" autoComplete="new-password" value={password} disabled={!canEdit || busy || dirty} onChange={(event) => setPassword(event.target.value)} /></label>
        <button onClick={install} disabled={!canEdit || !file || busy || dirty} className="self-end border border-[#244761] bg-[#244761] px-3 py-2 text-white">{busy ? 'Aguarde...' : 'Instalar certificado'}</button>
      </div>
      <div className="flex flex-wrap gap-3"><button onClick={connection} disabled={!canEdit || !info?.installed || busy || dirty} className="border border-zinc-400 px-3 py-2">Testar conexão em homologação</button><button onClick={remove} disabled={!canEdit || !info?.installed || busy || dirty} className="border border-zinc-300 px-3 py-2">Remover certificado</button></div>
      {message && <p role="status" className="border border-zinc-200 bg-zinc-50 p-3 leading-5">{message}</p>}
    </div>
  </section>
}
