import { useEffect, useMemo, useState } from 'react'
import { formatMoney, type Freight, type FiscalDocument } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { LoadingRow } from '../components/LoadingState'
import { api } from '../services/api'

type OperationalFreightsResponse = {
  items: Freight[]
}

type Notice = {
  title: string
  message: string
  tone?: 'info' | 'danger'
}

function freightScheduleDate(freight: Freight) {
  return freight.destinationScheduleDate || freight.date || '-'
}

function freightCiot(freight: Freight) {
  return freight.ciotEntries?.find((entry) => entry.number)?.number || freight.ciotNumber || '-'
}

function freightInvoiceLabel(freight: Freight) {
  const entries = freight.invoiceEntries?.filter((entry) => entry.invoiceNumber) || []
  if (entries.length) {
    return entries.map((entry) => (
      entry.invoiceSeries ? `${entry.invoiceNumber}/${entry.invoiceSeries}` : entry.invoiceNumber
    )).join(', ')
  }
  if (freight.invoiceNumber) {
    return freight.invoiceSeries ? `${freight.invoiceNumber}/${freight.invoiceSeries}` : freight.invoiceNumber
  }
  return '-'
}

export function FiscalDocumentsPage() {
  const data = useLocalData()
  const { customers, closings, freights, fiscalDocuments: legacyDocuments } = data
  const canEditPage = canEdit('fiscalDocuments')
  const issuer = data.issuerSettings
  const [showPreview, setShowPreview] = useState(false)
  const [selectedClosingNumber, setSelectedClosingNumber] = useState('')
  const [documentType, setDocumentType] = useState('NFS-e')
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null)
  const [selectedFreights, setSelectedFreights] = useState<Freight[]>([])
  const [selectedFreightsLoading, setSelectedFreightsLoading] = useState(false)
  const [viewingFreights, setViewingFreights] = useState<Freight[]>([])
  const [viewingFreightsLoading, setViewingFreightsLoading] = useState(false)
  const [savingLabel, setSavingLabel] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [nationalDocuments, setNationalDocuments] = useState<FiscalDocument[]>([])
  const [nfseError, setNfseError] = useState('')
  const [competence, setCompetence] = useState(new Date().toLocaleDateString('en-CA'))
  const [cancelTarget, setCancelTarget] = useState<FiscalDocument | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelCode, setCancelCode] = useState('1')
  const [substituteId, setSubstituteId] = useState('')
  const [substitutionReason, setSubstitutionReason] = useState('')
  const [substitutionCode, setSubstitutionCode] = useState('99')
  const fiscalDocuments = [...nationalDocuments, ...legacyDocuments.filter((document) => document.source !== 'national')]
  function upsertNational(document: FiscalDocument) {
    setNationalDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)])
  }
  async function loadNationalDocuments() {
    try {
      const response = await api.get<{ items: FiscalDocument[] }>('/operational-nfse')
      setNationalDocuments(response.data.items); setNfseError('')
    } catch { setNfseError('Não foi possível consultar o serviço de NFS-e Nacional. Confira o backend e as migrações antes de emitir.') }
  }
  useEffect(() => { void loadNationalDocuments() }, [])
  async function fiscalError(error: any) {
    let body = error.response?.data
    if (body instanceof Blob) { try { body = JSON.parse(await body.text()) } catch { body = {} } }
    return typeof body?.detail === 'string' ? body.detail : Array.isArray(body?.detail) ? body.detail.map((item: any) => item.msg).join('; ') : 'Falha na comunicação fiscal. Consulte a lista antes de tentar novamente.'
  }
  function notePath(document: FiscalDocument) { return '/operational-nfse/' + encodeURIComponent(document.id.replace(/^nfse:/, '')) }
  async function consultNational(document: FiscalDocument) {
    setSavingLabel('Consultando a NFS-e Nacional...')
    try { const response = await api.post<{ document: FiscalDocument }>(notePath(document) + '/consult'); upsertNational(response.data.document); setNotice({ title: response.data.document.status, message: response.data.document.message || 'Consulta fiscal concluída.' }) }
    catch (error) { setNotice({ title: 'Falha na consulta', message: await fiscalError(error), tone: 'danger' }) }
    finally { setSavingLabel('') }
  }
  async function downloadNational(document: FiscalDocument, kind: 'pdf' | 'xml' | 'dps') {
    setSavingLabel('Baixando documento fiscal...')
    try {
      const response = await api.get(notePath(document) + (kind === 'dps' ? '/xml?request=true' : '/' + kind), { responseType: 'blob' })
      const url = URL.createObjectURL(response.data); const link = window.document.createElement('a'); link.href = url; link.download = `${kind}-${document.number.replace(/[^a-zA-Z0-9]/g, '_')}.${kind === 'pdf' ? 'pdf' : 'xml'}`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setNotice({ title: 'Documento indisponível', message: await fiscalError(error), tone: 'danger' }) }
    finally { setSavingLabel('') }
  }
  async function confirmCancellation() {
    if (!cancelTarget || !canEditPage) return
    setSavingLabel('Solicitando cancelamento em homologação...')
    try {
      const response = await api.post<{ document: FiscalDocument }>(notePath(cancelTarget) + '/cancel', { justification: cancelReason, reason_code: cancelCode })
      upsertNational(response.data.document); setCancelTarget(null); setNotice({ title: response.data.document.status, message: response.data.document.message || 'Retorno do pedido de cancelamento recebido.' })
    } catch (error) { setNotice({ title: 'Cancelamento não concluído', message: await fiscalError(error), tone: 'danger' }) }
    finally { setSavingLabel('') }
  }

  const approvedClosings = useMemo(
    () => closings.filter((closing) =>
      closing.status === 'Aprovado'
      && !nationalDocuments.some((document) => document.closing === closing.number && !['rejected', 'not_found'].includes(document.statusCode || '')),
    ),
    [closings, nationalDocuments],
  )

  const selectedClosing = approvedClosings.find((closing) => closing.number === selectedClosingNumber)
  const selectedCustomer = customers.find((customer) => customer.name === selectedClosing?.customer)
  const viewingDocument = fiscalDocuments.find((document) => document.id === viewingDocumentId)
  const viewingClosing = closings.find((closing) => closing.number === viewingDocument?.closing)
  const viewingCustomer = customers.find((customer) => customer.name === viewingDocument?.customer)
  const viewingIssRate = Number(viewingCustomer?.issRate ?? issuer.issRate ?? 0)
  const viewingIssValue = viewingDocument ? viewingDocument.value * (viewingIssRate / 100) : 0
  const viewingPis = viewingDocument ? viewingDocument.value * (Number(issuer.pisRate || 0) / 100) : 0
  const viewingCofins = viewingDocument ? viewingDocument.value * (Number(issuer.cofinsRate || 0) / 100) : 0
  const missingCustomerFields = [
    ['CPF/CNPJ', selectedCustomer?.document],
    ['Razao social', selectedCustomer?.name],
    ['E-mail fiscal', selectedCustomer?.emailFiscal],
    ['CEP', selectedCustomer?.zipCode],
    ['Logradouro', selectedCustomer?.street],
    ['Numero', selectedCustomer?.number],
    ['Bairro', selectedCustomer?.district],
    ['Municipio', selectedCustomer?.city],
    ['Codigo IBGE', selectedCustomer?.cityCode],
    ['UF', selectedCustomer?.state],
    ['Item de servico', selectedCustomer?.serviceCode],
    ['Discriminacao do servico', selectedCustomer?.serviceDescription],
    ['Aliquota ISS', selectedCustomer?.issRate],
  ].filter(([, value]) => !value)
  const missingIssuerFields = [
    ['CNPJ prestador', issuer.document],
    ['Razao social prestador', issuer.legalName],
    ['Inscricao municipal', issuer.municipalRegistration],
    ['CEP prestador', issuer.zipCode],
    ['Endereco prestador', issuer.street],
    ['Numero prestador', issuer.number],
    ['Municipio prestador', issuer.city],
    ['Codigo IBGE prestador', issuer.cityCode],
    ['UF prestador', issuer.state],
    ['Item nacional servico', issuer.nationalServiceCode],
    ['Codigo municipal servico', issuer.municipalServiceCode],
    ['Aliquota ISS', issuer.issRate],
    ['Serie NFS-e', issuer.nfseSeries],
    ['Proxima DPS', issuer.nextDpsNumber],
  ].filter(([, value]) => !value || value === 'Nao instalado')

  const fiscalDescription = useMemo(() => {
    const baseDescription = selectedCustomer?.serviceDescription || issuer.defaultServiceDescription || 'Servico de transporte municipal de cargas e apoio logistico operacional.'
    const freightDetails = selectedFreights.map((freight) => {
      const parts = [
        `Processo ${freight.process || freight.number}`,
        freight.container ? `Conteiner ${freight.container}` : '',
        freightCiot(freight) !== '-' ? `CIOT ${freightCiot(freight)}` : '',
        freightInvoiceLabel(freight) !== '-' ? `NF-e ${freightInvoiceLabel(freight)}` : '',
        `${freight.origin || '-'} x ${freight.destination || '-'}`,
      ].filter(Boolean)
      return parts.join(' - ')
    })
    return `${baseDescription} Fechamento ${selectedClosing?.number || '-'}. ${freightDetails.length ? `Fretes: ${freightDetails.join('; ')}.` : ''}`
  }, [issuer.defaultServiceDescription, selectedClosing?.number, selectedCustomer?.serviceDescription, selectedFreights])

  async function loadClosingFreights(closingNumber: string, mode: 'selected' | 'viewing') {
    if (!closingNumber) {
      if (mode === 'selected') setSelectedFreights([])
      if (mode === 'viewing') setViewingFreights([])
      return
    }

    if (mode === 'selected') setSelectedFreightsLoading(true)
    if (mode === 'viewing') setViewingFreightsLoading(true)
    try {
      const response = await api.get<OperationalFreightsResponse>('/operational-freights', {
        params: { closing: closingNumber, limit: 1000 },
      })
      if (mode === 'selected') setSelectedFreights(response.data.items || [])
      if (mode === 'viewing') setViewingFreights(response.data.items || [])
    } catch {
      if (mode === 'selected') setSelectedFreights([])
      if (mode === 'viewing') setViewingFreights([])
      setNotice({
        title: 'Consulta indisponivel',
        message: 'Nao foi possivel carregar os fretes deste fechamento.',
        tone: 'danger',
      })
    } finally {
      if (mode === 'selected') setSelectedFreightsLoading(false)
      if (mode === 'viewing') setViewingFreightsLoading(false)
    }
  }

  useEffect(() => {
    if (showPreview && selectedClosingNumber) {
      void loadClosingFreights(selectedClosingNumber, 'selected')
    }
  }, [selectedClosingNumber, showPreview])

  function openPreview() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!approvedClosings.length) {
      setNotice({
        title: 'Emissao indisponivel',
        message: 'Aprove um fechamento sem documento fiscal antes de emitir.',
      })
      return
    }

    setSubstituteId(''); setSubstitutionReason(''); setSubstitutionCode('99')
    setSelectedClosingNumber(approvedClosings[0].number)
    setDocumentType('NFS-e')
    setSelectedFreights([])
    setShowPreview(true)
  }

  async function confirmIssueDocument() {
    if (!canEditPage) { denyNoPrivilege(); return }
    if (!selectedClosing || !selectedCustomer) { setNotice({ title: 'Cadastro incompleto', message: 'Selecione um fechamento aprovado e seu cliente.', tone: 'danger' }); return }
    if (selectedFreightsLoading || !selectedFreights.length) { setNotice({ title: 'Fretes não localizados', message: 'Confira os fretes vinculados ao fechamento antes de transmitir.', tone: 'danger' }); return }
    const payload = { closing_id: selectedClosing.id, customer_id: selectedCustomer.id, competence, description: fiscalDescription, substitute_note_id: substituteId || null, substitution_reason: substitutionReason, substitution_code: substitutionCode }
    setSavingLabel('Validando certificado e XML da DPS...')
    try {
      await api.post('/operational-nfse/validate', payload)
      setSavingLabel('Transmitindo DPS em homologação...')
      const response = await api.post<{ document: FiscalDocument }>('/operational-nfse/issue', payload)
      const note = response.data.document
      upsertNational(note)
      setShowPreview(false); setSelectedClosingNumber(''); setSelectedFreights([]); setViewingDocumentId(note.id)
      setNotice({ title: note.status, message: note.statusCode === 'authorized' ? `NFS-e ${note.number} autorizada em homologação. Chave: ${note.accessKey}` : note.message || 'Resultado ainda não confirmado. Use Consultar situação para verificar a DPS.', tone: note.statusCode === 'rejected' ? 'danger' : 'info' })
    } catch (error) {
      await loadNationalDocuments()
      setNotice({ title: 'Emissão não concluída', message: await fiscalError(error), tone: 'danger' })
    } finally { setSavingLabel('') }
  }

  function openDocument(documentId: string, closingNumber: string) {
    setViewingDocumentId(documentId)
    void loadClosingFreights(closingNumber, 'viewing')
  }

  return (
    <div className="space-y-4">
      <div className="border border-[#b8c9da] bg-[#edf3f9] px-4 py-3 text-xs text-[#244761]">NFS-e Nacional — produção restrita / homologação. A transmissão utiliza o A1 instalado no backend. Documentos antigos marcados como mock continuam sendo simulações.</div>
      {nfseError && <p role="alert" className="border border-red-300 bg-red-50 p-3 text-xs text-red-700">{nfseError}</p>}
      {savingLabel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20">
          <div className="border border-zinc-300 bg-white px-8 py-6 text-center shadow-lg">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-800" />
            <div className="text-sm">{savingLabel}</div>
          </div>
        </div>
      )}

      <div className="border border-zinc-300 bg-white">
        <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
          <h2 className="text-lg font-normal text-red-600">Consulta documentos fiscais</h2>
          <button onClick={openPreview} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
            Emitir documento
          </button>
        </div>

        <div className="grid gap-3 border-b border-zinc-300 p-3 md:grid-cols-6">
          <select className="border border-zinc-300 px-2 py-1.5 text-sm"><option>Tipo fiscal</option><option>NFS-e</option><option>CT-e</option></select>
          <select className="border border-zinc-300 px-2 py-1.5 text-sm"><option>Situacao</option></select>
          <input className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Cliente" />
          <input className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Numero ou referencia" />
          <input className="border border-zinc-300 px-2 py-1.5 text-sm" type="date" />
          <button onClick={() => void loadNationalDocuments()} className="border border-zinc-400 bg-zinc-100 px-3 py-1.5 text-sm font-medium">Consultar</button>
        </div>
      </div>

      {showPreview && (
        <section className="border border-zinc-300 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Previa da emissao fiscal</h3>
              <p className="text-xs text-zinc-500">Confirme o fechamento, tipo fiscal e fretes antes de emitir.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPreview(false)} className="border border-zinc-400 bg-white px-3 py-1.5 text-xs font-medium">
                Cancelar
              </button>
              <button onClick={confirmIssueDocument} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">
                Transmitir em homologação
              </button>
            </div>
          </div>

          <div className="grid gap-3 border-b border-zinc-300 bg-zinc-50 p-3 md:grid-cols-5">
            <label className="field">
              Fechamento
              <select value={selectedClosingNumber} onChange={(event) => setSelectedClosingNumber(event.target.value)}>
                {approvedClosings.map((closing) => (
                  <option key={closing.id} value={closing.number}>
                    {closing.number} - {closing.customer}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Tipo fiscal
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                <option>NFS-e</option>

              </select>
            </label>
            <label className="field">Competência do serviço<input type="date" value={competence} onChange={(event) => setCompetence(event.target.value)} /></label>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Fretes no fechamento</div>
              <div className="font-semibold">{selectedFreightsLoading ? 'Carregando...' : selectedFreights.length}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Valor dos serviços</div>
              <div className="font-semibold">{formatMoney(selectedClosing?.subtotal ?? selectedClosing?.netTotal ?? 0)}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Ambiente</div>
              <div className="font-semibold">Homologacao</div>
            </div>
          </div>

          <div className="grid gap-3 border-b border-zinc-300 p-3 md:grid-cols-3">
            <label className="field">Substituir uma NFS-e autorizada (opcional)<select value={substituteId} onChange={(event) => setSubstituteId(event.target.value)}><option value="">Emissão normal</option>{nationalDocuments.filter((item) => item.statusCode === 'authorized' && item.closing !== selectedClosingNumber).map((item) => <option key={item.id} value={item.id}>NFS-e {item.number} - {item.customer}</option>)}</select></label>
            {substituteId && <><label className="field">Motivo da substituição<select value={substitutionCode} onChange={(event) => setSubstitutionCode(event.target.value)}><option value="99">99 - Outros</option><option value="01">01 - Desenquadramento do SN</option><option value="02">02 - Enquadramento no SN</option><option value="03">03 - Inclusão retroativa de imunidade/isenção</option><option value="04">04 - Exclusão retroativa de imunidade/isenção</option><option value="05">05 - Rejeição pelo tomador/intermediário</option></select></label><label className="field">Justificativa (15 a 255 caracteres)<input maxLength={255} value={substitutionReason} onChange={(event) => setSubstitutionReason(event.target.value)} /></label></>}
          </div>
          <div className="grid gap-3 border-b border-zinc-300 p-3 md:grid-cols-2">
            <div className="border border-zinc-300 bg-white">
              <div className="border-b border-zinc-300 px-3 py-2 text-xs font-semibold uppercase text-zinc-500">Prestador / emissor</div>
              <div className="grid gap-2 p-3 text-sm md:grid-cols-2">
                <div><span className="text-zinc-500">CNPJ:</span> {issuer.document}</div>
                <div><span className="text-zinc-500">Razao:</span> {issuer.legalName}</div>
                <div><span className="text-zinc-500">IM:</span> {issuer.municipalRegistration}</div>
                <div><span className="text-zinc-500">Municipio:</span> {issuer.city} / {issuer.state}</div>
                <div><span className="text-zinc-500">Servico:</span> {issuer.nationalServiceCode} / {issuer.municipalServiceCode}</div>
                <div className={missingIssuerFields.length ? 'text-red-700' : 'text-emerald-700'}>
                  {missingIssuerFields.length ? `Faltando: ${missingIssuerFields.map(([label]) => label).join(', ')}` : 'Prestador completo.'}
                </div>
              </div>
            </div>

            <div className="border border-zinc-300 bg-white">
              <div className="border-b border-zinc-300 px-3 py-2 text-xs font-semibold uppercase text-zinc-500">Tomador da NFS-e</div>
              <div className="grid gap-2 p-3 text-sm md:grid-cols-2">
                <div><span className="text-zinc-500">Documento:</span> {selectedCustomer?.document || '-'}</div>
                <div><span className="text-zinc-500">Razao:</span> {selectedCustomer?.name || '-'}</div>
                <div><span className="text-zinc-500">E-mail:</span> {selectedCustomer?.emailFiscal || '-'}</div>
                <div><span className="text-zinc-500">Municipio:</span> {selectedCustomer?.city || '-'} / {selectedCustomer?.state || '-'}</div>
                <div><span className="text-zinc-500">Codigo IBGE:</span> {selectedCustomer?.cityCode || '-'}</div>
                <div><span className="text-zinc-500">Endereco:</span> {selectedCustomer?.street || '-'}, {selectedCustomer?.number || '-'}</div>
              </div>
            </div>

            <div className="border border-zinc-300 bg-white md:col-span-2">
              <div className="border-b border-zinc-300 px-3 py-2 text-xs font-semibold uppercase text-zinc-500">Servico e validacao</div>
              <div className="grid gap-2 p-3 text-sm">
                <div><span className="text-zinc-500">Item servico:</span> {selectedCustomer?.serviceCode || '-'}</div>
                <div><span className="text-zinc-500">ISS:</span> {selectedCustomer?.issRate ? `${selectedCustomer.issRate}%` : '-'} | Retido: {selectedCustomer?.issWithheld || '-'}</div>
                <div><span className="text-zinc-500">Discriminacao:</span> {fiscalDescription}</div>
                <div className={missingCustomerFields.length ? 'text-red-700' : 'text-emerald-700'}>
                  {missingCustomerFields.length
                    ? `Faltando: ${missingCustomerFields.map(([label]) => label).join(', ')}`
                    : 'Dados preenchidos. Certificado e XML serão validados no backend.'}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="system-grid w-full min-w-[1120px] text-xs">
              <thead className="bg-zinc-50">
                <tr>
                  {['Processo', 'Dt. agendamento entrega', 'Conteiner', 'Motorista', 'Cavalo', 'Carreta', 'CIOT', 'Nr. nfe/serie', 'Origem', 'Destino', 'Valor'].map((heading) => (
                    <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedFreightsLoading && <LoadingRow colSpan={11} label="Carregando fretes do fechamento..." />}
                {!selectedFreightsLoading && selectedFreights.map((freight) => (
                  <tr key={freight.id}>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.process}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightScheduleDate(freight)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.container || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.driver || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.tractorPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.trailerPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightCiot(freight)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freightInvoiceLabel(freight)}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.origin || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.destination || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(freight.value)}</td>
                  </tr>
                ))}
                {!selectedFreightsLoading && !selectedFreights.length && (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-zinc-500">Nenhum frete vinculado ao fechamento selecionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="border border-zinc-300 bg-white">
        <div className="overflow-x-auto">
          <table className="system-grid w-full min-w-[1050px] text-xs">
            <thead className="bg-zinc-50">
              <tr>
                {['Tipo', 'Numero', 'Serie', 'Cliente', 'Data', 'Valor', 'Ambiente', 'Situacao', 'Protocolo', 'Fechamento', 'Acoes'].map((heading) => (
                  <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data.loading && fiscalDocuments.map((document) => (
                <tr key={document.id}>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.type}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.number}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.series}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.customer}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.date}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(document.value)}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.environment}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.status}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.protocol}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">{document.closing}</td>
                  <td className="border-b border-zinc-200 px-3 py-2">
                    <button onClick={() => openDocument(document.id, document.closing)} className="border border-zinc-300 px-2 py-1 text-xs">Ver</button>
                  </td>
                </tr>
              ))}
              {data.loading && <LoadingRow colSpan={11} label="Carregando documentos fiscais..." />}
              {!data.loading && !fiscalDocuments.length && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-zinc-500">Nenhum documento fiscal emitido.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingDocument?.source === 'national' && <section className="border border-zinc-300 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">NFS-e Nacional — {viewingDocument.number}</h3><button onClick={() => setViewingDocumentId(null)} className="border border-zinc-300 px-3 py-2 text-xs">Fechar</button></div>
        <dl className="my-4 grid gap-3 text-xs md:grid-cols-3"><div><dt>Situação</dt><dd className="mt-1 font-semibold">{viewingDocument.status}</dd></div><div><dt>DPS / série</dt><dd className="mt-1">{viewingDocument.dpsNumber} / {viewingDocument.series}</dd></div><div><dt>Ambiente</dt><dd className="mt-1">Homologação</dd></div><div className="break-all md:col-span-3"><dt>Chave de acesso</dt><dd className="mt-1">{viewingDocument.accessKey || 'Ainda não recebida'}</dd></div></dl>
        {viewingDocument.message && <p role="status" className="mb-4 border border-zinc-200 bg-zinc-50 p-3 text-xs">{viewingDocument.message}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          <button disabled={!canEditPage} onClick={() => void consultNational(viewingDocument)} className="border border-zinc-300 px-3 py-2">Consultar situação</button>
          <button onClick={() => void downloadNational(viewingDocument, 'dps')} className="border border-zinc-300 px-3 py-2">Baixar DPS assinada</button>
          <button disabled={!viewingDocument.hasXml} onClick={() => void downloadNational(viewingDocument, 'xml')} className="border border-zinc-300 px-3 py-2">Baixar XML autorizado</button>
          <button disabled={!viewingDocument.hasXml} onClick={() => void downloadNational(viewingDocument, 'pdf')} className="border border-zinc-300 px-3 py-2">Baixar DANFSe oficial</button>
          {canEditPage && viewingDocument.statusCode === 'authorized' && <button onClick={() => { setCancelTarget(viewingDocument); setCancelReason(''); setCancelCode('1') }} className="border border-red-300 px-3 py-2 text-red-700">Cancelar NFS-e de homologação</button>}
        </div>
      </section>}

      {viewingDocument && viewingDocument.source !== 'national' && (
        <section className="border border-zinc-300 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">DANFSe simulado - NFS-e {viewingDocument.number}</h3>
              <p className="text-xs text-zinc-500">Modelo visual baseado no Documento Auxiliar da NFS-e de servico.</p>
            </div>
            <button onClick={() => setViewingDocumentId(null)} className="border border-zinc-400 bg-white px-3 py-1.5 text-xs font-medium">Fechar</button>
          </div>

          <div className="mx-auto my-4 w-[900px] max-w-[calc(100vw-340px)] border border-zinc-950 bg-white p-3 text-[11px] leading-tight text-zinc-950">
            <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-3 border-b border-zinc-900 pb-2">
              <div className="text-4xl font-bold text-zinc-500">NFSe</div>
              <div className="text-center">
                <div className="text-base font-bold">DANFSe v1.0</div>
                <div className="text-sm font-semibold">Documento Auxiliar da NFS-e</div>
              </div>
              <div className="text-right text-[10px]">
                <div className="font-semibold">Prefeitura de Manaus</div>
                <div>Secretaria Municipal de Financas</div>
                <div>nota.manaus.am.gov.br</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 border-b border-zinc-900 py-2">
              <div>
                <div className="font-bold">Chave de Acesso da NFS-e</div>
                <div>{viewingDocument.protocol}</div>
              </div>
              <div>
                <div className="font-bold">Numero da NFS-e</div>
                <div>{viewingDocument.number}</div>
              </div>
              <div>
                <div className="font-bold">Competencia da NFS-e</div>
                <div>{viewingDocument.date}</div>
              </div>
              <div>
                <div className="font-bold">Data e Hora da emissao</div>
                <div>{viewingDocument.date} 08:22:45</div>
              </div>
              <div>
                <div className="font-bold">Numero da DPS</div>
                <div>{viewingClosing?.number ?? '-'}</div>
              </div>
              <div>
                <div className="font-bold">Serie da DPS</div>
                <div>{viewingDocument.series}</div>
              </div>
              <div>
                <div className="font-bold">Data e Hora da DPS</div>
                <div>{viewingDocument.date} 08:22:45</div>
              </div>
              <div className="border border-zinc-900 p-2 text-center text-[10px]">QR CODE SIMULADO</div>
            </div>

            <div className="border-b border-zinc-900 py-1 text-sm font-bold">EMITENTE DA NFS-e</div>
            <div className="grid grid-cols-4 gap-3 border-b border-zinc-900 pb-2">
              <div>
                <div className="font-bold">Prestador do Servico</div>
                <div>Nome / Nome Empresarial</div>
                <div>{issuer.legalName}</div>
              </div>
              <div>
                <div className="font-bold">CNPJ / CPF / NIF</div>
                <div>{issuer.document}</div>
                <div className="mt-2 font-bold">Endereco</div>
                <div>{issuer.street}, {issuer.number}, {issuer.district}</div>
              </div>
              <div>
                <div className="font-bold">Inscricao Municipal</div>
                <div>{issuer.municipalRegistration}</div>
                <div className="mt-2 font-bold">Municipio</div>
                <div>{issuer.city} - {issuer.state}</div>
              </div>
              <div>
                <div className="font-bold">Telefone</div>
                <div>{issuer.phone}</div>
                <div className="mt-2 font-bold">E-mail</div>
                <div>{issuer.email}</div>
              </div>
            </div>

            <div className="border-b border-zinc-900 py-1 text-sm font-bold">TOMADOR DO SERVICO</div>
            <div className="grid grid-cols-4 gap-3 border-b border-zinc-900 pb-2">
              <div>
                <div className="font-bold">Nome / Nome Empresarial</div>
                <div>{viewingCustomer?.name ?? viewingDocument.customer}</div>
                <div className="mt-2 font-bold">Endereco</div>
                <div>{viewingCustomer?.street ?? '-'}, {viewingCustomer?.number ?? '-'}, {viewingCustomer?.district ?? '-'}</div>
              </div>
              <div>
                <div className="font-bold">CNPJ / CPF / NIF</div>
                <div>{viewingCustomer?.document ?? '-'}</div>
                <div className="mt-2 font-bold">CEP</div>
                <div>{viewingCustomer?.zipCode ?? '-'}</div>
              </div>
              <div>
                <div className="font-bold">Inscricao Municipal</div>
                <div>{viewingCustomer?.municipalRegistration ?? '-'}</div>
                <div className="mt-2 font-bold">Municipio</div>
                <div>{viewingCustomer?.city ?? '-'} - {viewingCustomer?.state ?? '-'}</div>
              </div>
              <div>
                <div className="font-bold">Telefone</div>
                <div>{viewingCustomer?.phone ?? '-'}</div>
                <div className="mt-2 font-bold">E-mail</div>
                <div>{viewingCustomer?.emailFiscal ?? '-'}</div>
              </div>
            </div>

            <div className="border-b border-zinc-900 py-1 text-center text-xs">INTERMEDIARIO DO SERVICO NAO IDENTIFICADO NA NFS-e</div>

            <div className="border-b border-zinc-900 py-1 text-sm font-bold">SERVICO PRESTADO</div>
            <div className="grid grid-cols-4 gap-3 border-b border-zinc-900 pb-2">
              <div>
                <div className="font-bold">Codigo de Tributacao Nacional</div>
                <div>{issuer.nationalServiceCode} - Outros servicos de transporte de natureza municipal.</div>
              </div>
              <div>
                <div className="font-bold">Codigo de Tributacao Municipal</div>
                <div>{issuer.municipalServiceCode} - Outros servicos de transporte de natureza municipal.</div>
              </div>
              <div>
                <div className="font-bold">Local da Prestacao</div>
                <div>{issuer.city} - {issuer.state}</div>
              </div>
              <div>
                <div className="font-bold">Pais da Prestacao</div>
                <div>{viewingCustomer?.country ?? 'Brasil'}</div>
              </div>
              <div className="col-span-4">
                <div className="font-bold">Descricao do Servico</div>
                <div>
                  {viewingDocument.description || viewingCustomer?.serviceDescription || issuer.defaultServiceDescription}
                  {' '}UNIDADES: {viewingFreights.map((freight) => `${freight.number} ${freight.container || ''} ${freight.origin || ''}/${freight.destination || ''}`).join(' / ')}
                  {viewingFreightsLoading ? ' Carregando fretes do fechamento...' : ''}
                </div>
              </div>
            </div>

            <div className="border-b border-zinc-900 py-1 text-sm font-bold">TRIBUTACAO MUNICIPAL</div>
            <div className="grid grid-cols-4 gap-3 border-b border-zinc-900 pb-2">
              <div><b>Tributacao do ISSQN</b><br />Operacao Tributavel</div>
              <div><b>Municipio de Incidencia do ISSQN</b><br />{issuer.city} - {issuer.state}</div>
              <div><b>Regime Especial de Tributacao</b><br />{viewingCustomer?.taxRegime ?? '-'}</div>
              <div><b>Retencao do ISSQN</b><br />{viewingCustomer?.issWithheld === 'Sim' ? 'Retido' : 'Nao Retido'}</div>
              <div><b>Valor do Servico</b><br />{formatMoney(viewingDocument.value)}</div>
              <div><b>Aliquota Aplicada</b><br />{viewingIssRate.toFixed(2)}%</div>
              <div><b>BC ISSQN</b><br />{formatMoney(viewingDocument.value)}</div>
              <div><b>ISSQN Apurado</b><br />{formatMoney(viewingIssValue)}</div>
            </div>

            <div className="border-b border-zinc-900 py-1 text-sm font-bold">TRIBUTACAO FEDERAL</div>
            <div className="grid grid-cols-4 gap-3 border-b border-zinc-900 pb-2">
              <div><b>IRRF</b><br />-</div>
              <div><b>PIS - Debito Apuracao Propria</b><br />{formatMoney(viewingPis)}</div>
              <div><b>COFINS - Debito Apuracao Propria</b><br />{formatMoney(viewingCofins)}</div>
              <div><b>Descricao Contrib. Sociais - Retidas</b><br />PIS/COFINS/CSLL Nao Retidos</div>
            </div>

            <div className="border-b border-zinc-900 py-1 text-sm font-bold">VALOR TOTAL DA NFS-e</div>
            <div className="grid grid-cols-4 gap-3 border-b border-zinc-900 pb-2">
              <div><b>Valor do Servico</b><br />{formatMoney(viewingDocument.value)}</div>
              <div><b>Desconto Condicionado</b><br />-</div>
              <div><b>Desconto Incondicionado</b><br />-</div>
              <div><b>Valor Liquido da NFS-e</b><br />{formatMoney(viewingDocument.value)}</div>
            </div>

            <div className="border-b border-zinc-900 py-1 text-sm font-bold">TOTAIS APROXIMADOS DOS TRIBUTOS</div>
            <div className="grid grid-cols-3 gap-3 border-b border-zinc-900 pb-2 text-center">
              <div><b>Federais</b><br />{formatMoney(viewingPis + viewingCofins)}</div>
              <div><b>Estaduais</b><br />R$ 0,00</div>
              <div><b>Municipais</b><br />{formatMoney(viewingIssValue)}</div>
            </div>

            <div className="min-h-32 py-1">
              <div className="text-sm font-bold">INFORMACOES COMPLEMENTARES</div>
              <div>Documento fiscal simulado em ambiente de homologacao. Nao possui validade fiscal.</div>
            </div>
          </div>
        </section>
      )}

      {cancelTarget && <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4"><section role="dialog" aria-modal="true" aria-labelledby="nfse-cancel-title" className="w-full max-w-lg border border-zinc-400 bg-white p-5">
        <h3 id="nfse-cancel-title" className="mb-4 text-sm font-semibold">Cancelar NFS-e {cancelTarget.number} em homologação</h3>
        <label className="field">Motivo<select value={cancelCode} onChange={(event) => setCancelCode(event.target.value)}><option value="1">Erro na emissão</option><option value="2">Serviço não prestado</option><option value="9">Outros</option></select></label>
        <label className="field mt-4">Justificativa (15 a 255 caracteres)<textarea rows={4} minLength={15} maxLength={255} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label>
        <footer className="mt-4 flex justify-end gap-3 text-xs"><button onClick={() => setCancelTarget(null)} className="border border-zinc-300 px-3 py-2">Voltar</button><button disabled={cancelReason.trim().length < 15} onClick={() => void confirmCancellation()} className="border border-red-600 bg-red-600 px-3 py-2 text-white">Solicitar cancelamento</button></footer>
      </section></div>}

      {notice && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
          <div className="w-[420px] border border-zinc-400 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 px-4 py-2">
              <h3 className={notice.tone === 'danger' ? 'text-lg text-red-700' : 'text-lg text-red-600'}>{notice.title}</h3>
              <button onClick={() => setNotice(null)} className="grid h-8 w-8 place-items-center bg-black text-white">X</button>
            </div>
            <div className="px-5 py-7 text-sm leading-6">{notice.message}</div>
            <div className="border-t border-zinc-300 px-4 py-3 text-right">
              <button onClick={() => setNotice(null)} className="border border-zinc-900 bg-zinc-900 px-6 py-2 text-xs font-semibold text-white">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
