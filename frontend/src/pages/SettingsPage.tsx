import { Building2, FileKey2, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { defaultIssuerSettings, loadIssuerSettings, saveIssuerSettings, type IssuerSettings } from '../services/fiscalSettings'

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
  const [issuer, setIssuer] = useState<IssuerSettings>(() => loadIssuerSettings())
  const [savedAt, setSavedAt] = useState(localStorage.getItem('settings.savedAt') || '-')

  function updateIssuer(patch: Partial<IssuerSettings>) {
    setIssuer((current) => ({ ...current, ...patch }))
  }

  function save() {
    const now = new Date().toLocaleString('pt-BR')
    saveIssuerSettings(issuer)
    localStorage.setItem('settings.savedAt', now)
    localStorage.setItem('fiscal.environment', issuer.nfseEnvironment)
    localStorage.setItem('fiscal.provider', issuer.nfseProvider)
    setSavedAt(now)
    window.alert('Configuracoes fiscais salvas.')
  }

  function restore() {
    setIssuer(defaultIssuerSettings)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between border-b border-zinc-300 pb-3">
        <div>
          <h2 className="text-[22px] font-semibold text-zinc-900">Configuracoes</h2>
          <p className="text-sm text-zinc-600">Dados da empresa emissora, parametros NFS-e e checklist para producao fiscal.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={restore} className="inline-flex h-8 items-center gap-2 border border-zinc-400 bg-white px-3 text-sm text-zinc-700"><RotateCcw size={15} />Restaurar</button>
          <button onClick={save} className="inline-flex h-8 items-center gap-2 border border-[#003469] bg-[#004080] px-3 text-sm font-medium text-white"><Save size={15} />Salvar</button>
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
          <label className="field">Ambiente<select value={issuer.nfseEnvironment} onChange={(event) => updateIssuer({ nfseEnvironment: event.target.value })}><option>Homologacao</option><option>Producao bloqueada</option></select></label>
          <label className="field">Provider/API<select value={issuer.nfseProvider} onChange={(event) => updateIssuer({ nfseProvider: event.target.value })}><option>Mock</option><option>NFS-e Nacional</option><option>Provider contratado</option><option>Prefeitura Manaus</option></select></label>
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
          <label className="field md:col-span-2">Endpoint/API<input value={issuer.nfseEndpoint} onChange={(event) => updateIssuer({ nfseEndpoint: event.target.value })} placeholder="URL do provider, prefeitura ou API nacional" /></label>
          <label className="field md:col-span-2">Certificado A1<input value={issuer.certificateName} onChange={(event) => updateIssuer({ certificateName: event.target.value })} /></label>
          <label className="field">Vencimento certificado<input value={issuer.certificateExpiration} onChange={(event) => updateIssuer({ certificateExpiration: event.target.value })} type="date" /></label>
          <label className="field">Liberar producao<select value={issuer.productionReady} onChange={(event) => updateIssuer({ productionReady: event.target.value })}><option>Nao</option><option>Sim</option></select></label>
        </div>
      </section>

      <section className="border border-zinc-300 bg-white">
        <div className="flex items-center gap-2 border-b border-zinc-300 bg-[#f7f9fc] px-4 py-2.5">
          <ShieldCheck size={18} className="text-[#004080]" />
          <h3 className="text-sm font-semibold">Checklist para levar para producao</h3>
        </div>
        <div className="grid gap-2 p-4 text-sm md:grid-cols-2">
          {productionChecklist.map((item) => (
            <div key={item} className="border border-zinc-300 bg-[#f7f9fc] px-3 py-2">{item}</div>
          ))}
        </div>
      </section>
    </div>
  )
}
