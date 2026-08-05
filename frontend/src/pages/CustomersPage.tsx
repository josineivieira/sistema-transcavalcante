import { useMemo, useState } from 'react'
import { nextId, type Customer } from '../services/localStore'
import { useLocalData } from '../hooks/useLocalData'

type CustomerForm = Omit<Customer, 'id' | 'status'>

const emptyForm: CustomerForm = {
  document: '',
  name: '',
  tradeName: '',
  emailFiscal: '',
  phone: '',
  municipalRegistration: '',
  stateRegistration: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: 'Manaus',
  cityCode: '1302603',
  state: 'AM',
  country: 'Brasil',
  taxRegime: 'Simples Nacional',
  serviceCode: '16.02',
  serviceDescription: 'Servico de transporte municipal de cargas e apoio logistico operacional.',
  issRate: '5',
  issWithheld: 'Nao',
  paymentTerm: '7 dias',
}

export function CustomersPage() {
  const { customers, setCustomers } = useLocalData()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<CustomerForm>(emptyForm)

  const visibleCustomers = useMemo(() => {
    const term = search.toLowerCase()
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(term)
      || customer.document.includes(search)
      || (customer.city ?? '').toLowerCase().includes(term),
    )
  }, [customers, search])

  function saveCustomer() {
    if (!form.document || !form.name || !form.emailFiscal || !form.city || !form.state) {
      window.alert('Informe documento, razao social, e-mail fiscal, municipio e UF.')
      return
    }

    if (!form.street || !form.number || !form.district || !form.zipCode || !form.cityCode) {
      window.alert('Para NFS-e, informe endereco completo e codigo IBGE do municipio.')
      return
    }

    setCustomers([
      ...customers,
      {
        id: nextId('cli'),
        ...form,
        status: 'Ativo',
      },
    ])
    setShowForm(false)
    setForm(emptyForm)
  }

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-300 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Clientes</h2>
          <p className="text-xs text-zinc-500">Cadastro do tomador com dados exigidos para simulacao de NFS-e.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white">Novo cliente</button>
      </div>

      {showForm && (
        <div className="border-b border-zinc-300 bg-zinc-50">
          <div className="border-b border-zinc-300 px-4 py-2 text-xs font-semibold uppercase text-zinc-500">Dados fiscais do tomador</div>
          <div className="grid gap-3 p-3 md:grid-cols-6">
            <input value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="CPF/CNPJ" />
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-2" placeholder="Razao social / Nome" />
            <input value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Nome fantasia" />
            <input value={form.emailFiscal} onChange={(event) => setForm({ ...form, emailFiscal: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="E-mail fiscal" />
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Telefone" />
            <input value={form.municipalRegistration} onChange={(event) => setForm({ ...form, municipalRegistration: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Inscricao municipal" />
            <input value={form.stateRegistration} onChange={(event) => setForm({ ...form, stateRegistration: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Inscricao estadual" />
            <select value={form.taxRegime} onChange={(event) => setForm({ ...form, taxRegime: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm">
              <option>Simples Nacional</option>
              <option>Lucro Presumido</option>
              <option>Lucro Real</option>
              <option>MEI</option>
              <option>Exterior</option>
            </select>
            <select value={form.paymentTerm} onChange={(event) => setForm({ ...form, paymentTerm: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm">
              <option>7 dias</option>
              <option>15 dias</option>
              <option>30 dias</option>
              <option>A vista</option>
            </select>
          </div>

          <div className="border-y border-zinc-300 px-4 py-2 text-xs font-semibold uppercase text-zinc-500">Endereco do tomador</div>
          <div className="grid gap-3 p-3 md:grid-cols-8">
            <input value={form.zipCode} onChange={(event) => setForm({ ...form, zipCode: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="CEP" />
            <input value={form.street} onChange={(event) => setForm({ ...form, street: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-3" placeholder="Logradouro" />
            <input value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Numero" />
            <input value={form.complement} onChange={(event) => setForm({ ...form, complement: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Complemento" />
            <input value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-2" placeholder="Bairro" />
            <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-2" placeholder="Municipio" />
            <input value={form.cityCode} onChange={(event) => setForm({ ...form, cityCode: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Codigo IBGE" />
            <input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="UF" maxLength={2} />
            <input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Pais" />
          </div>

          <div className="border-y border-zinc-300 px-4 py-2 text-xs font-semibold uppercase text-zinc-500">Padrao de servico para NFS-e</div>
          <div className="grid gap-3 p-3 md:grid-cols-8">
            <input value={form.serviceCode} onChange={(event) => setForm({ ...form, serviceCode: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Item servico" />
            <input value={form.issRate} onChange={(event) => setForm({ ...form, issRate: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Aliquota ISS %" />
            <select value={form.issWithheld} onChange={(event) => setForm({ ...form, issWithheld: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm">
              <option>Nao</option>
              <option>Sim</option>
            </select>
            <input value={form.serviceDescription} onChange={(event) => setForm({ ...form, serviceDescription: event.target.value })} className="border border-zinc-300 px-2 py-1.5 text-sm md:col-span-4" placeholder="Discriminacao padrao do servico" />
            <div className="flex gap-2">
              <button onClick={saveCustomer} className="border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">Salvar</button>
              <button onClick={() => setShowForm(false)} className="border border-zinc-400 bg-white px-3 py-1.5 text-sm font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 border-b border-zinc-300 p-3 md:grid-cols-5">
        <input value={search} onChange={(event) => setSearch(event.target.value)} className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="CPF/CNPJ, razao social ou municipio" />
        <input className="border border-zinc-300 px-2 py-1.5 text-sm" placeholder="Municipio" />
        <select className="border border-zinc-300 px-2 py-1.5 text-sm">
          <option>Situacao</option>
          <option>Ativo</option>
        </select>
        <button onClick={() => setSearch('')} className="border border-zinc-400 bg-zinc-100 px-3 py-1.5 text-sm font-medium">Limpar</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-zinc-50">
            <tr>
              {['Documento', 'Razao social', 'E-mail fiscal', 'Municipio', 'UF', 'Cod. IBGE', 'Item servico', 'ISS', 'Pagamento', 'Situacao', 'Acoes'].map((heading) => (
                <th key={heading} className="border-b border-zinc-300 px-3 py-2 text-left text-xs font-medium text-zinc-600">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.map((customer) => (
              <tr key={customer.id}>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.document}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.name}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.emailFiscal || '-'}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.city || '-'}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.state}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.cityCode || '-'}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.serviceCode || '-'}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.issRate ? `${customer.issRate}%` : '-'}</td>
                <td className="border-b border-zinc-200 px-3 py-2">{customer.paymentTerm}</td>
                <td className="border-b border-zinc-200 px-3 py-2 text-emerald-700">{customer.status}</td>
                <td className="border-b border-zinc-200 px-3 py-2">
                  <button onClick={() => window.alert(`Cliente: ${customer.name}\nCNPJ/CPF: ${customer.document}\nEndereco: ${customer.street ?? '-'}, ${customer.number ?? '-'} - ${customer.city ?? '-'}\nServico: ${customer.serviceCode ?? '-'} | ISS ${customer.issRate ?? '-'}%`)} className="border border-zinc-300 px-2 py-1 text-xs">Ver</button>
                </td>
              </tr>
            ))}
            {!visibleCustomers.length && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-zinc-500">Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
