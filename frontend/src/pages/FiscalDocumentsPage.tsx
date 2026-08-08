import { useMemo, useState } from 'react'
import { formatMoney, nextId } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { LoadingRow } from '../components/LoadingState'

export function FiscalDocumentsPage() {
  const data = useLocalData()
  const { customers, closings, freights, fiscalDocuments } = data
  const canEditPage = canEdit('fiscalDocuments')
  const issuer = data.issuerSettings
  const [showPreview, setShowPreview] = useState(false)
  const [selectedClosingNumber, setSelectedClosingNumber] = useState('')
  const [documentType, setDocumentType] = useState('NFS-e')
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null)

  const approvedClosings = useMemo(
    () => closings.filter((closing) =>
      closing.status === 'Aprovado'
      && !fiscalDocuments.some((document) => document.closing === closing.number),
    ),
    [closings, fiscalDocuments],
  )

  const selectedClosing = approvedClosings.find((closing) => closing.number === selectedClosingNumber)
  const selectedCustomer = customers.find((customer) => customer.name === selectedClosing?.customer)
  const selectedFreights = freights.filter((freight) => freight.closing === selectedClosingNumber)
  const viewingDocument = fiscalDocuments.find((document) => document.id === viewingDocumentId)
  const viewingClosing = closings.find((closing) => closing.number === viewingDocument?.closing)
  const viewingCustomer = customers.find((customer) => customer.name === viewingDocument?.customer)
  const viewingFreights = freights.filter((freight) => freight.closing === viewingDocument?.closing)
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

  function openPreview() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!approvedClosings.length) {
      window.alert('Aprove um fechamento sem documento fiscal antes de emitir.')
      return
    }

    setSelectedClosingNumber(approvedClosings[0].number)
    setDocumentType('NFS-e')
    setShowPreview(true)
  }

  function confirmIssueDocument() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!selectedClosing) {
      window.alert('Selecione um fechamento para emitir.')
      return
    }

    if (fiscalDocuments.some((document) => document.closing === selectedClosing.number)) {
      window.alert('Ja existe documento para este fechamento. Idempotencia aplicada.')
      return
    }

    if (!selectedCustomer || missingCustomerFields.length) {
      window.alert(`Cadastro do cliente incompleto para NFS-e: ${missingCustomerFields.map(([label]) => label).join(', ')}`)
      return
    }

    if (missingIssuerFields.length) {
      window.alert(`Cadastro da empresa emissora incompleto para NFS-e: ${missingIssuerFields.map(([label]) => label).join(', ')}`)
      return
    }

    const number = String(fiscalDocuments.length + 1).padStart(6, '0')
    data.update({
      ...data,
      closings: closings.map((item) => item.id === selectedClosing.id ? { ...item, status: 'Emitido' } : item),
      freights: freights.map((freight) =>
        freight.closing === selectedClosing.number ? { ...freight, fiscalStatus: 'Emitido' } : freight,
      ),
      fiscalDocuments: [
        ...fiscalDocuments,
        {
          id: nextId('doc'),
          type: documentType,
          number,
          series: issuer.nfseSeries,
          customer: selectedClosing.customer,
          date: new Date().toISOString().slice(0, 10),
          value: selectedClosing.netTotal,
          environment: 'Homologacao',
          status: 'Autorizado mock',
          protocol: `NFSE-SIMULADA-${issuer.cityCode}-${selectedCustomer.cityCode}-${number}`,
          closing: selectedClosing.number,
        },
      ],
    })

    setShowPreview(false)
    setSelectedClosingNumber('')
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-300 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Documentos fiscais</h2>
            <p className="text-xs text-zinc-500">Emissao com pre-visualizacao do fechamento antes de gerar o documento fiscal.</p>
          </div>
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
          <button onClick={() => window.alert('Consulta local atualizada. Integracao fiscal real entra no backend/worker.')} className="border border-zinc-400 bg-zinc-100 px-3 py-1.5 text-sm font-medium">Consultar</button>
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
                Confirmar emissao
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
                <option>CT-e</option>
              </select>
            </label>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Fretes no fechamento</div>
              <div className="font-semibold">{selectedFreights.length}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Valor liquido</div>
              <div className="font-semibold">{formatMoney(selectedClosing?.netTotal ?? 0)}</div>
            </div>
            <div className="border border-zinc-300 bg-white px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Ambiente</div>
              <div className="font-semibold">Homologacao</div>
            </div>
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
                <div><span className="text-zinc-500">Discriminacao:</span> {selectedCustomer?.serviceDescription || '-'}</div>
                <div className={missingCustomerFields.length ? 'text-red-700' : 'text-emerald-700'}>
                  {missingCustomerFields.length
                    ? `Faltando: ${missingCustomerFields.map(([label]) => label).join(', ')}`
                    : 'Cadastro fiscal completo para simulacao.'}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="system-grid w-full min-w-[1120px] text-xs">
              <thead className="bg-zinc-50">
                <tr>
                  {['Numero', 'Data', 'Processo', 'Conteiner', 'Motorista', 'Cavalo', 'Carreta', 'Origem', 'Destino', 'Valor'].map((heading) => (
                    <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedFreights.map((freight) => (
                  <tr key={freight.id}>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.number}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.date}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.process}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.container || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.driver || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.tractorPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.trailerPlate || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.origin || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{freight.destination || '-'}</td>
                    <td className="border-b border-zinc-200 px-3 py-2">{formatMoney(freight.value)}</td>
                  </tr>
                ))}
                {!selectedFreights.length && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-zinc-500">Nenhum frete vinculado ao fechamento selecionado.</td>
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
                    <button onClick={() => setViewingDocumentId(document.id)} className="border border-zinc-300 px-2 py-1 text-xs">Ver</button>
                  </td>
                </tr>
              ))}
              {data.loading && <LoadingRow colSpan={11} />}
              {!data.loading && !fiscalDocuments.length && (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-zinc-500">Nenhum documento fiscal emitido.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingDocument && (
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
                  {viewingCustomer?.serviceDescription || issuer.defaultServiceDescription}
                  {' '}UNIDADES: {viewingFreights.map((freight) => `${freight.number} ${freight.container || ''} ${freight.origin || ''}/${freight.destination || ''}`).join(' / ')}
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
    </div>
  )
}
