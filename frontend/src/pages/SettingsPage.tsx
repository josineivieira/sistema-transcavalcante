import { FiscalCertificateSettings } from '../components/FiscalCertificateSettings'
import { Building2, FileKey2, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { defaultIssuerSettings, type IssuerSettings } from '../services/fiscalSettings'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'

const productionChecklist = [
  'CNPJ, razao social e inscricao municipal do prestador conferidos',
  'Certificado A1 e-CNPJ valido instalado e criptografado no backend',
  'Empresa credenciada na Prefeitura de Manaus ou no ambiente nacional aplicavel',
  'Codigo nacional, codigo municipal, CNAE/NBS e descricao do servico validados com contador',
  'Aliquota ISS, retencao ISS e regra PIS/COFINS/IRRF/CSLL validadas',
  'Serie, numero DPS, homologacao e numeracao inicial definidos',
  'Provider/API fiscal contratado ou API NFS-e Nacional liberada',
  'Consulta, cancelamento, substituicao, XML/PDF e protocolo implementados no backend',
]

export function SettingsPage() {
  const { issuerSettings, settingsSavedAt, setIssuerSettings, loading, error } = useLocalData()
  const canEditPage = canEdit('settings')
  const [issuer, setIssuer] = useState<IssuerSettings>(issuerSettings)
  const [savedAt, setSavedAt] = useState(settingsSavedAt)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    setIssuer(issuerSettings)
    setSavedAt(settingsSavedAt)
  }, [issuerSettings, settingsSavedAt])

  function updateIssuer(patch: Partial<IssuerSettings>) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setIssuer((current) => ({ ...current, ...patch }))
  }

  async function save() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    const now = new Date().toLocaleString('pt-BR')
    setSaving(true); setSaveMessage('')
    try { await setIssuerSettings(issuer, now); setSavedAt(now); setSaveMessage('Configurações salvas no backend.') }
    catch { setSaveMessage('Não foi possível salvar as configurações. Tente novamente.') }
    finally { setSaving(false) }
  }

  function restore() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setIssuer(defaultIssuerSettings)
  }

  return (
    <div className="space-y-4">
      {error && <div className="border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {saveMessage && <p role="status" className="border border-zinc-300 bg-white p-3 text-xs">{saveMessage}</p>}
      {loading && <div className="border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-600">Carregando configurações...</div>}
      <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
        <h2 className="text-lg font-normal text-red-600">Configuracoes</h2>
        <div className="flex gap-2">
          <button onClick={restore} className="inline-flex h-8 items-center gap-2 border border-zinc-400 bg-white px-3 text-xs text-zinc-700"><RotateCcw size={15} />Restaurar</button>
          <button onClick={save} disabled={saving} className="inline-flex h-8 items-center gap-2 border border-[#003469] bg-[#004080] px-3 text-xs font-medium text-white"><Save size={15} />Salvar</button>
        </div>
      </div>

      <section className="border border-zinc-300 bg-white">
        <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#f7f9fc] px-4 py-2.5">
          <Building2 size={18} className="text-[#004080]" />
          <h3 className="text-sm font-semibold">Empresa emissora da NFS-e</h3>
          <span className="ml-auto text-xs text-zinc-500">Prestador do servico no DANFSe</span>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-4">
          <label className="field md:col-span-2">Razao social<input value={issuer.legalName} onChange={(event) => updateIssuer({ legalName: event.target.value })} /></label>
          <label className="field">Nome fantasia<input value={issuer.tradeName} onChange={(event) => updateIssuer({ tradeName: event.target.value })} /></label>
          <label className="field">CNPJ<input value={issuer.document} onChange={(event) => updateIssuer({ document: event.target.value })} /></label>
          <label className="field">Inscricao municipal<input value={issuer.municipalRegistration} onChange={(event) => updateIssuer({ municipalRegistration: event.target.value })} /></label>
          <label className="field">Inscricao estadual<input value={issuer.stateRegistration} onChange={(event) => updateIssuer({ stateRegistration: event.target.value })} /></label>
          <label className="field">Regime tributario<select value={issuer.taxRegime} onChange={(event) => updateIssuer({ taxRegime: event.target.value })}><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option><option>MEI</option></select></label>
          <label className="field">Optante Simples<select value={issuer.simplesNacional} onChange={(event) => updateIssuer({ simplesNacional: event.target.value })}><option>Sim</option><option>Nao</option></select></label>
          <label className="field">E-mail fiscal<input value={issuer.email} onChange={(event) => updateIssuer({ email: event.target.value })} /></label>
          <label className="field">Telefone<input value={issuer.phone} onChange={(event) => updateIssuer({ phone: event.target.value })} /></label>
          <label className="field">CEP<input value={issuer.zipCode} onChange={(event) => updateIssuer({ zipCode: event.target.value })} /></label>
          <label className="field md:col-span-2">Logradouro<input value={issuer.street} onChange={(event) => updateIssuer({ street: event.target.value })} /></label>
          <label className="field">Numero<input value={issuer.number} onChange={(event) => updateIssuer({ number: event.target.value })} /></label>
          <label className="field">Complemento<input value={issuer.complement} onChange={(event) => updateIssuer({ complement: event.target.value })} /></label>
          <label className="field">Bairro<input value={issuer.district} onChange={(event) => updateIssuer({ district: event.target.value })} /></label>
          <label className="field">Municipio<input value={issuer.city} onChange={(event) => updateIssuer({ city: event.target.value })} /></label>
          <label className="field">Codigo IBGE<input value={issuer.cityCode} onChange={(event) => updateIssuer({ cityCode: event.target.value })} /></label>
          <label className="field">UF<input value={issuer.state} onChange={(event) => updateIssuer({ state: event.target.value.toUpperCase() })} maxLength={2} /></label>
          <label className="field">Pais<input value={issuer.country} onChange={(event) => updateIssuer({ country: event.target.value })} /></label>
        </div>
      </section>

      <section className="border border-zinc-300 bg-white">
        <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#f7f9fc] px-4 py-2.5">
          <FileKey2 size={18} className="text-[#004080]" />
          <h3 className="text-sm font-semibold">Parametros fiscais NFS-e</h3>
          <span className="ml-auto text-xs text-zinc-500">Ultima alteracao: {savedAt}</span>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-4">
          <label className="field">Ambiente<select value={issuer.nfseEnvironment} onChange={(event) => updateIssuer({ nfseEnvironment: event.target.value })}><option>Homologacao</option></select></label>
          <label className="field">Provider/API<select value={issuer.nfseProvider} onChange={(event) => updateIssuer({ nfseProvider: event.target.value })}><option>Mock</option><option>NFS-e Nacional</option></select></label>
          <label className="field">Serie NFS-e<input value={issuer.nfseSeries} onChange={(event) => updateIssuer({ nfseSeries: event.target.value })} /></label>
          <label className="field">Proxima DPS<input value={issuer.nextDpsNumber} onChange={(event) => updateIssuer({ nextDpsNumber: event.target.value })} /></label>
          <label className="field">Item nacional servico<input value={issuer.nationalServiceCode} onChange={(event) => updateIssuer({ nationalServiceCode: event.target.value })} /></label>
          <label className="field">Cod. municipal servico<input value={issuer.municipalServiceCode} onChange={(event) => updateIssuer({ municipalServiceCode: event.target.value })} /></label>
          <label className="field">CNAE<input value={issuer.cnae} onChange={(event) => updateIssuer({ cnae: event.target.value })} /></label>
          <label className="field">NBS<input value={issuer.nbs} onChange={(event) => updateIssuer({ nbs: event.target.value })} /></label>
          <label className="field">Aliquota ISS %<input value={issuer.issRate} onChange={(event) => updateIssuer({ issRate: event.target.value })} /></label>
          <label className="field">ISS retido padrao<select value={issuer.issWithheldDefault} onChange={(event) => updateIssuer({ issWithheldDefault: event.target.value })}><option>Nao</option><option>Sim</option></select></label>
          <label className="field">PIS %<input value={issuer.pisRate} onChange={(event) => updateIssuer({ pisRate: event.target.value })} /></label>
          <label className="field">COFINS %<input value={issuer.cofinsRate} onChange={(event) => updateIssuer({ cofinsRate: event.target.value })} /></label>
          <label className="field">IRRF %<input value={issuer.irrfRate} onChange={(event) => updateIssuer({ irrfRate: event.target.value })} /></label>
          <label className="field">CSLL %<input value={issuer.csllRate} onChange={(event) => updateIssuer({ csllRate: event.target.value })} /></label>
          <label className="field md:col-span-2">Descricao padrao do servico<input value={issuer.defaultServiceDescription} onChange={(event) => updateIssuer({ defaultServiceDescription: event.target.value })} /></label>
          <label className="field">Situação no Simples<select value={issuer.nationalSimpleRegime || (issuer.simplesNacional === 'Sim' ? '3' : '1')} onChange={(event) => updateIssuer({ nationalSimpleRegime: event.target.value })}><option value="1">1 - Não optante</option><option value="2">2 - MEI</option><option value="3">3 - ME/EPP</option></select></label>
          <label className="field">Regime de apuração SN<select value={issuer.simpleTaxRegime || '1'} onChange={(event) => updateIssuer({ simpleTaxRegime: event.target.value })}><option value="1">1 - Tributos e ISS pelo SN</option><option value="2">2 - ISS fora do SN</option><option value="3">3 - Tributos fora do SN</option></select></label>
          <label className="field">Regime especial (código)<input value={issuer.specialTaxRegime || '0'} onChange={(event) => updateIssuer({ specialTaxRegime: event.target.value })} /></label>
          <label className="field">Tributação ISSQN<select value={issuer.issTaxation || '1'} onChange={(event) => updateIssuer({ issTaxation: event.target.value })}><option value="1">1 - Operação tributável</option></select></label>
          <label className="field">Enviar alíquota ISS na DPS<select value={issuer.sendIssRate || 'Nao'} onChange={(event) => updateIssuer({ sendIssRate: event.target.value })}><option>Nao</option><option>Sim</option></select></label>
          <label className="field">Enviar IM do prestador<select value={issuer.sendMunicipalRegistration || 'Nao'} onChange={(event) => updateIssuer({ sendMunicipalRegistration: event.target.value })}><option>Nao</option><option>Sim</option></select></label>
          <label className="field">Total tributos SN % (se aplicável)<input value={issuer.totalTaxSimplesRate || ''} onChange={(event) => updateIssuer({ totalTaxSimplesRate: event.target.value })} /></label>
          <label className="field">Informar tributos federais na DPS<select value={issuer.sendFederalTaxes || 'Nao'} onChange={(event) => updateIssuer({ sendFederalTaxes: event.target.value })}><option>Nao</option><option>Sim</option></select></label>
          {issuer.sendFederalTaxes === 'Sim' && <>
            <label className="field">CST PIS/COFINS<input maxLength={2} value={issuer.pisCofinsCst || ''} onChange={(event) => updateIssuer({ pisCofinsCst: event.target.value })} /></label>
            <label className="field">Tipo de retenção PIS/COFINS (código)<input value={issuer.pisCofinsRetention || ''} onChange={(event) => updateIssuer({ pisCofinsRetention: event.target.value })} /></label>
            <label className="field">CP retida (valor R$)<input value={issuer.withheldSocialSecurityValue || ''} onChange={(event) => updateIssuer({ withheldSocialSecurityValue: event.target.value })} /></label>
          </>}
          <label className="field">Informar IBS/CBS<select value={issuer.ibsCbsEnabled || 'Nao'} onChange={(event) => updateIssuer({ ibsCbsEnabled: event.target.value })}><option>Nao</option><option>Sim</option></select></label>
          {issuer.ibsCbsEnabled === 'Sim' && <>
            <label className="field">CST IBS/CBS<input maxLength={3} value={issuer.ibsCbsCst || ''} onChange={(event) => updateIssuer({ ibsCbsCst: event.target.value })} /></label>
            <label className="field">cClassTrib (6 dígitos)<input maxLength={6} value={issuer.ibsCbsClass || ''} onChange={(event) => updateIssuer({ ibsCbsClass: event.target.value })} /></label>
            <label className="field">cIndOp (6 dígitos)<input maxLength={6} value={issuer.ibsCbsOperation || ''} onChange={(event) => updateIssuer({ ibsCbsOperation: event.target.value })} /></label>
            <label className="field">Uso / consumo pessoal<select value={issuer.ibsCbsFinal || '0'} onChange={(event) => updateIssuer({ ibsCbsFinal: event.target.value })}><option value="0">Não</option><option value="1">Sim</option></select></label>
          </>}
          <label className="flex items-center gap-2 text-xs md:col-span-4"><input type="checkbox" checked={issuer.nfseDataConfirmed === 'Sim'} onChange={(event) => updateIssuer({ nfseDataConfirmed: event.target.checked ? 'Sim' : 'Nao' })} /> Conferi os códigos de serviço, o regime e a tributação com o responsável fiscal.</label>
          <p className="text-xs text-zinc-500 md:col-span-4">O cTribNac exige 6 dígitos. O item da lista de serviços (ex.: 16.02) não substitui esse código. A seleção dos códigos e da tributação depende do enquadramento da empresa.</p>
          <label className="field md:col-span-2">Endpoint/API<input value={issuer.nfseEndpoint} onChange={(event) => updateIssuer({ nfseEndpoint: event.target.value })} placeholder="URL do provider, prefeitura ou API nacional" /></label>
        </div>
      </section>

      <FiscalCertificateSettings canEdit={canEditPage} dirty={JSON.stringify(issuer) !== JSON.stringify(issuerSettings)} issuerDocument={issuerSettings.document} />
      <section className="border border-zinc-300 bg-white">
        <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#f7f9fc] px-4 py-2.5">
          <ShieldCheck size={18} className="text-[#004080]" />
          <h3 className="text-sm font-semibold">Checklist para levar para producao</h3>
        </div>
        <div className="grid gap-2 p-4 text-xs md:grid-cols-2">
          {productionChecklist.map((item) => (
            <div key={item} className="border border-zinc-300 bg-[#f7f9fc] px-3 py-2">{item}</div>
          ))}
        </div>
      </section>
    </div>
  )
}
