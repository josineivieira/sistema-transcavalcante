import { useMemo, useState } from 'react'
import { FileText, MoreVertical, Plus, Printer, Save, X } from 'lucide-react'
import { LoadingRow } from '../components/LoadingState'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { formatMoney, nextId, type PayrollClosing, type PayrollItem, type PayrollProfile } from '../services/localStore'

const months = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const currentYear = String(new Date().getFullYear())
type PayrollTab = 'COLABORADORES' | 'FECHAMENTOS' | 'CONTRACHEQUES'
type PayrollForm = Omit<PayrollClosing, 'grossTotal' | 'discountTotal' | 'netTotal'>
type PayrollTotals = { grossTotal: number, discountTotal: number, netTotal: number }

const emptyProfile: PayrollProfile = {
  id: '',
  employeeId: '',
  employeeName: '',
  category: 'Motorista',
  admissionDate: '',
  salary: 0,
  dailyRate: 0,
  paymentType: 'PIX',
  bank: '',
  agency: '',
  account: '',
  pixKey: '',
  status: 'Ativo',
}

const emptyForm: PayrollForm = {
  id: '',
  employeeId: '',
  employeeName: '',
  category: 'Motorista',
  admissionDate: '',
  month: months[new Date().getMonth()],
  year: currentYear,
  salary: 0,
  dailyRate: 0,
  firstFortnightSalary: 0,
  firstFortnightOvertime: 0,
  firstFortnightDiscount: 0,
  secondFortnightSalary: 0,
  secondFortnightOvertime: 0,
  transport: 0,
  average: 0,
  basket: 0,
  inss: 0,
  otherDiscounts: 0,
  otherEarnings: 0,
  tripQuantity: 0,
  tripExpenses: 0,
  vacationBonus: 0,
  items: [],
  status: 'Em conferencia',
  createdAt: '',
}

function parseNumber(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0
}

function totals(form: PayrollForm) {
  const itemEarnings = form.items.filter((item) => item.type === 'earning').reduce((total, item) => total + item.amount, 0)
  const itemDiscounts = form.items.filter((item) => item.type === 'discount').reduce((total, item) => total + item.amount, 0)
  const grossTotal = form.firstFortnightSalary
    + form.firstFortnightOvertime
    + form.secondFortnightSalary
    + form.secondFortnightOvertime
    + form.transport
    + form.average
    + form.basket
    + form.tripExpenses
    + form.vacationBonus
    + form.otherEarnings
    + itemEarnings
  const discountTotal = form.firstFortnightDiscount + form.inss + form.otherDiscounts + itemDiscounts
  return { grossTotal, discountTotal, netTotal: grossTotal - discountTotal }
}

function inputClass(disabled = false) {
  return `h-7 w-full border border-zinc-300 px-2 text-xs outline-none focus:border-sky-600 ${disabled ? 'bg-zinc-200 text-zinc-500' : 'bg-white'}`
}

function moneyClass() {
  return 'h-7 w-full border border-zinc-300 bg-white px-2 text-right text-xs outline-none focus:border-sky-600'
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[130px_minmax(0,1fr)] items-center gap-2">
      <span className="text-right text-xs text-red-600">{label}</span>
      {children}
    </label>
  )
}

export function PayrollPage() {
  const {
    drivers,
    payrollProfiles,
    payrollClosings,
    loading,
    setPayrollProfiles,
    setPayrollClosings,
  } = useLocalData()
  const canEditPage = canEdit('payroll')
  const [tab, setTab] = useState<PayrollTab>('FECHAMENTOS')
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [closingOpen, setClosingOpen] = useState(false)
  const [payslipOpen, setPayslipOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState<string | null>(null)
  const [profile, setProfile] = useState<PayrollProfile>(emptyProfile)
  const [closing, setClosing] = useState<PayrollForm>(emptyForm)

  const profileRows = useMemo(() => {
    const term = search.toLowerCase()
    return payrollProfiles.filter((item) => !term || [item.employeeName, item.category, item.status, item.paymentType].join(' ').toLowerCase().includes(term))
  }, [payrollProfiles, search])

  const closingRows = useMemo(() => {
    const term = search.toLowerCase()
    return payrollClosings.filter((item) => (
      (!term || [item.employeeName, item.category, item.month, item.year, item.status].join(' ').toLowerCase().includes(term))
      && (!monthFilter || item.month === monthFilter)
      && (!statusFilter || item.status === statusFilter)
    ))
  }, [monthFilter, payrollClosings, search, statusFilter])

  const payslipRows = useMemo(() => closingRows.filter((item) => item.status !== 'Cancelado'), [closingRows])
  const closingTotals = totals(closing)

  function openProfile(selected?: PayrollProfile) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setProfile(selected ?? { ...emptyProfile, id: nextId('payprof') })
    setProfileOpen(true)
  }

  function saveProfile() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!profile.employeeId || !profile.employeeName) {
      window.alert('Informe o colaborador.')
      return
    }
    const exists = payrollProfiles.some((item) => item.id === profile.id)
    setPayrollProfiles(exists ? payrollProfiles.map((item) => item.id === profile.id ? profile : item) : [profile, ...payrollProfiles])
    setProfileOpen(false)
  }

  function selectProfile(employeeId: string) {
    const driver = drivers.find((item) => item.id === employeeId)
    const currentProfile = payrollProfiles.find((item) => item.employeeId === employeeId)
    setProfile((current) => ({
      ...current,
      ...(currentProfile ?? {}),
      id: current.id || currentProfile?.id || nextId('payprof'),
      employeeId: driver?.id ?? '',
      employeeName: driver?.name ?? '',
      category: currentProfile?.category || driver?.jobTitle || driver?.occupation || 'Motorista',
    }))
  }

  function buildClosingFromProfile(selectedProfile: PayrollProfile): PayrollForm {
    const halfSalary = Number((selectedProfile.salary / 2).toFixed(2))
    return {
      ...emptyForm,
      id: nextId('pay'),
      employeeId: selectedProfile.employeeId,
      employeeName: selectedProfile.employeeName,
      category: selectedProfile.category,
      admissionDate: selectedProfile.admissionDate,
      salary: selectedProfile.salary,
      dailyRate: selectedProfile.dailyRate,
      firstFortnightSalary: halfSalary,
      secondFortnightSalary: halfSalary,
      createdAt: new Date().toISOString().slice(0, 10),
    }
  }

  function openClosing(selected?: PayrollClosing) {
    if (!canEditPage && !selected) {
      denyNoPrivilege()
      return
    }
    setClosing(selected ? { ...selected } : emptyForm)
    setClosingOpen(true)
  }

  function createClosingForProfile(selectedProfile: PayrollProfile) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setClosing(buildClosingFromProfile(selectedProfile))
    setClosingOpen(true)
  }

  function updateClosingNumber(field: keyof PayrollForm, value: string) {
    setClosing((current) => ({ ...current, [field]: parseNumber(value) }))
  }

  function saveClosing(closeAfter = false) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!closing.employeeId || !closing.employeeName) {
      window.alert('Escolha o colaborador pelo cadastro financeiro.')
      return
    }
    const record: PayrollClosing = { ...closing, ...totals(closing) }
    const exists = payrollClosings.some((item) => item.id === record.id)
    setPayrollClosings(exists ? payrollClosings.map((item) => item.id === record.id ? record : item) : [record, ...payrollClosings])
    setClosing(record)
    if (closeAfter) setClosingOpen(false)
  }

  function changeStatus(id: string, status: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setPayrollClosings(payrollClosings.map((item) => item.id === id ? { ...item, status } : item))
    setActionOpen(null)
  }

  function openPayslip(selected: PayrollClosing) {
    setClosing({ ...selected })
    setPayslipOpen(true)
    setActionOpen(null)
  }

  function addItem(type: PayrollItem['type']) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setClosing((current) => ({
      ...current,
      items: [...current.items, { id: nextId('item'), type, description: '', reference: '', amount: 0 }],
    }))
  }

  function updateItem(id: string, field: keyof PayrollItem, value: string) {
    setClosing((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? { ...item, [field]: field === 'amount' ? parseNumber(value) : value } : item),
    }))
  }

  function removeItem(id: string) {
    setClosing((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }))
  }

  function renderTabs() {
    return (
      <div className="flex border-b border-zinc-400 bg-white px-2 pt-2">
        {(['COLABORADORES', 'FECHAMENTOS', 'CONTRACHEQUES'] as PayrollTab[]).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`h-8 border border-b-0 border-zinc-300 px-4 text-xs ${tab === item ? 'bg-zinc-200 font-semibold' : 'bg-white text-zinc-600 hover:bg-zinc-100'}`}
          >
            {item}
          </button>
        ))}
      </div>
    )
  }

  function renderFilters() {
    return (
      <div className="grid gap-3 border-b border-zinc-300 bg-white px-3 py-3 md:grid-cols-[180px_180px_minmax(0,1fr)]">
        <label className="grid gap-1">
          <span>Mes referencia</span>
          <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className={inputClass()}>
            <option value="">Todos</option>
            {months.map((month) => <option key={month}>{month}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span>Situacao</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass()}>
            <option value="">Todas</option>
            <option>Em conferencia</option>
            <option>Fechado</option>
            <option>Pago</option>
            <option>Cancelado</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span>Busca rapida</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass()} placeholder="Funcionario, categoria, competencia ou situacao" />
        </label>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-xs">
      {!closingOpen && (
        <div className="border border-zinc-500 bg-zinc-100">
          <div className="flex items-center justify-between border-b-4 border-zinc-400 px-2 py-1">
            <h2 className="text-lg font-normal text-red-600">Folha de pagamento</h2>
            <button onClick={() => (tab === 'COLABORADORES' ? openProfile() : setTab('COLABORADORES'))} className="grid h-7 w-7 place-items-center bg-black text-white"><Plus size={18} /></button>
          </div>
          {renderTabs()}
          {tab !== 'COLABORADORES' && renderFilters()}
          {tab === 'COLABORADORES' && (
            <div className="bg-white">
              <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 px-2">
                <span className="font-semibold">Cadastro financeiro do colaborador</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="ml-auto h-6 w-52 border border-zinc-300 bg-white px-2 outline-none" placeholder="Busca rapida" />
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[1120px] text-xs">
                  <thead><tr>{['Colaborador', 'Categoria', 'Admissao', 'Salario', 'Diaria', 'Pagamento', 'Banco/Pix', 'Situacao', 'Acoes'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
                  <tbody>
                    {loading && <LoadingRow colSpan={9} label="Carregando colaboradores..." />}
                    {!loading && profileRows.map((item, index) => (
                      <tr key={item.id} onDoubleClick={() => openProfile(item)} className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} hover:bg-sky-100`}>
                        <td className="border-b border-r px-2 py-2">{item.employeeName}</td>
                        <td className="border-b border-r px-2 py-2">{item.category}</td>
                        <td className="border-b border-r px-2 py-2">{item.admissionDate || '-'}</td>
                        <td className="border-b border-r px-2 py-2 text-right">{formatMoney(item.salary)}</td>
                        <td className="border-b border-r px-2 py-2 text-right">{formatMoney(item.dailyRate)}</td>
                        <td className="border-b border-r px-2 py-2">{item.paymentType}</td>
                        <td className="border-b border-r px-2 py-2">{item.pixKey || [item.bank, item.agency, item.account].filter(Boolean).join(' / ') || '-'}</td>
                        <td className="border-b border-r px-2 py-2">{item.status}</td>
                        <td className="border-b px-2 py-2">
                          <button onClick={() => createClosingForProfile(item)} className="h-6 border border-zinc-400 bg-white px-2">Fechar folha</button>
                        </td>
                      </tr>
                    ))}
                    {!loading && !profileRows.length && <tr><td colSpan={9} className="px-3 py-12 text-center text-zinc-500">Nenhum cadastro financeiro encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'FECHAMENTOS' && (
            <PayrollGrid
              loading={loading}
              rows={closingRows}
              actionOpen={actionOpen}
              setActionOpen={setActionOpen}
              openEdit={openClosing}
              openPayslip={openPayslip}
              changeStatus={changeStatus}
            />
          )}

          {tab === 'CONTRACHEQUES' && (
            <PayrollGrid
              loading={loading}
              rows={payslipRows}
              actionOpen={actionOpen}
              setActionOpen={setActionOpen}
              openEdit={openClosing}
              openPayslip={openPayslip}
              changeStatus={changeStatus}
              payslipMode
            />
          )}
        </div>
      )}

      {closingOpen && (
        <div className="border border-zinc-500 bg-zinc-100">
          <div className="flex items-center justify-between border-b-4 border-zinc-400 px-2 py-1">
            <h2 className="text-lg font-normal text-red-600">Fechamento da folha</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => saveClosing(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
              <button onClick={() => saveClosing(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
              <button onClick={() => { saveClosing(false); setPayslipOpen(true) }} className="inline-flex items-center gap-1"><FileText size={15} /> CONTRACHEQUE</button>
              <button onClick={() => setClosingOpen(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
            </div>
          </div>

          <div className="border-b border-zinc-400 bg-[#31c64b] px-3 py-2">
            <div className="grid gap-2 md:grid-cols-4">
              <Field label="Funcionario"><input value={closing.employeeName} className={inputClass(true)} disabled /></Field>
              <Field label="Categoria"><input value={closing.category} onChange={(event) => setClosing({ ...closing, category: event.target.value })} className={inputClass()} /></Field>
              <Field label="Admissao"><input type="date" value={closing.admissionDate} onChange={(event) => setClosing({ ...closing, admissionDate: event.target.value })} className={inputClass()} /></Field>
              <Field label="Situacao"><select value={closing.status} onChange={(event) => setClosing({ ...closing, status: event.target.value })} className={inputClass()}><option>Em conferencia</option><option>Fechado</option><option>Pago</option><option>Cancelado</option></select></Field>
              <Field label="Mes ref."><select value={closing.month} onChange={(event) => setClosing({ ...closing, month: event.target.value })} className={inputClass()}>{months.map((month) => <option key={month}>{month}</option>)}</select></Field>
              <Field label="Ano"><input value={closing.year} onChange={(event) => setClosing({ ...closing, year: event.target.value })} className={inputClass()} /></Field>
              <Field label="Salario"><input value={closing.salary || ''} onChange={(event) => updateClosingNumber('salary', event.target.value)} className={moneyClass()} /></Field>
              <Field label="Diaria"><input value={closing.dailyRate || ''} onChange={(event) => updateClosingNumber('dailyRate', event.target.value)} className={moneyClass()} /></Field>
            </div>
          </div>

          <div className="overflow-auto bg-white">
            <table className="w-full min-w-[1220px] text-xs">
              <thead>
                <tr className="bg-cyan-700 text-white">
                  <th className="border-r px-2 py-2" rowSpan={2}>Mes</th>
                  <th className="border-r px-2 py-2" colSpan={4}>1a quinzena</th>
                  <th className="border-r px-2 py-2" colSpan={8}>2a quinzena</th>
                  <th className="border-r px-2 py-2" colSpan={4}>Totais</th>
                </tr>
                <tr className="bg-cyan-600 text-white">
                  {['Salario', 'HE', 'Desconto', 'Total', 'Salario', 'HE', 'Transp', 'Media', 'Cesta', 'INSS', 'Out (+)', 'Out (-)', 'Qtde viagem', 'Despesa (+)', 'Ferias/decimo', 'Total recebido'].map((heading) => <th key={heading} className="border-r px-2 py-2">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b border-r px-2 py-2 font-semibold">{closing.month.toUpperCase()}</td>
                  <td className="border-b border-r p-1"><input value={closing.firstFortnightSalary || ''} onChange={(event) => updateClosingNumber('firstFortnightSalary', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.firstFortnightOvertime || ''} onChange={(event) => updateClosingNumber('firstFortnightOvertime', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.firstFortnightDiscount || ''} onChange={(event) => updateClosingNumber('firstFortnightDiscount', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r px-2 py-2 text-right">{formatMoney(closing.firstFortnightSalary + closing.firstFortnightOvertime - closing.firstFortnightDiscount)}</td>
                  <td className="border-b border-r p-1"><input value={closing.secondFortnightSalary || ''} onChange={(event) => updateClosingNumber('secondFortnightSalary', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.secondFortnightOvertime || ''} onChange={(event) => updateClosingNumber('secondFortnightOvertime', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.transport || ''} onChange={(event) => updateClosingNumber('transport', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.average || ''} onChange={(event) => updateClosingNumber('average', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.basket || ''} onChange={(event) => updateClosingNumber('basket', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.inss || ''} onChange={(event) => updateClosingNumber('inss', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.otherEarnings || ''} onChange={(event) => updateClosingNumber('otherEarnings', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.otherDiscounts || ''} onChange={(event) => updateClosingNumber('otherDiscounts', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.tripQuantity || ''} onChange={(event) => updateClosingNumber('tripQuantity', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.tripExpenses || ''} onChange={(event) => updateClosingNumber('tripExpenses', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b border-r p-1"><input value={closing.vacationBonus || ''} onChange={(event) => updateClosingNumber('vacationBonus', event.target.value)} className={moneyClass()} /></td>
                  <td className="border-b px-2 py-2 text-right font-semibold">{formatMoney(closingTotals.netTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="border border-zinc-400">
              <div className="flex h-8 items-center bg-zinc-400 px-2 font-semibold">
                Lancamentos avulsos
                <button onClick={() => addItem('earning')} className="ml-auto h-6 border border-zinc-700 bg-white px-2">+ Provento</button>
                <button onClick={() => addItem('discount')} className="ml-2 h-6 border border-zinc-700 bg-white px-2">+ Desconto</button>
              </div>
              <table className="w-full text-xs">
                <thead><tr>{['Tipo', 'Descricao', 'Referencia', 'Valor', ''].map((heading) => <th key={heading} className="border-b border-r px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
                <tbody>
                  {closing.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-r p-1"><select value={item.type} onChange={(event) => updateItem(item.id, 'type', event.target.value)} className={inputClass()}><option value="earning">Provento</option><option value="discount">Desconto</option></select></td>
                      <td className="border-b border-r p-1"><input value={item.description} onChange={(event) => updateItem(item.id, 'description', event.target.value.toUpperCase())} className={inputClass()} /></td>
                      <td className="border-b border-r p-1"><input value={item.reference} onChange={(event) => updateItem(item.id, 'reference', event.target.value)} className={inputClass()} /></td>
                      <td className="border-b border-r p-1"><input value={item.amount || ''} onChange={(event) => updateItem(item.id, 'amount', event.target.value)} className={moneyClass()} /></td>
                      <td className="border-b p-1 text-center"><button onClick={() => removeItem(item.id)} className="text-red-700"><X size={15} /></button></td>
                    </tr>
                  ))}
                  {!closing.items.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-500">Nenhum lancamento avulso.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="border border-zinc-400 bg-zinc-50 p-3">
              <div className="grid gap-2">
                <div className="flex justify-between"><span>Total bruto</span><strong>{formatMoney(closingTotals.grossTotal)}</strong></div>
                <div className="flex justify-between"><span>Descontos</span><strong>{formatMoney(closingTotals.discountTotal)}</strong></div>
                <div className="border-t border-zinc-400 pt-2 text-base"><div className="flex justify-between"><span>Total liquido</span><strong>{formatMoney(closingTotals.netTotal)}</strong></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-12">
          <div className="w-full max-w-5xl border border-zinc-600 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Cadastro financeiro do colaborador</h3>
              <div className="flex items-center gap-3">
                <button onClick={saveProfile} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
                <button onClick={() => setProfileOpen(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="grid gap-x-16 gap-y-2 p-5 md:grid-cols-2">
              <Field label="Colaborador">
                <select value={profile.employeeId} onChange={(event) => selectProfile(event.target.value)} className={inputClass()}>
                  <option value="">Selecione...</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                </select>
              </Field>
              <Field label="Categoria"><input value={profile.category} onChange={(event) => setProfile({ ...profile, category: event.target.value })} className={inputClass()} /></Field>
              <Field label="Admissao"><input type="date" value={profile.admissionDate} onChange={(event) => setProfile({ ...profile, admissionDate: event.target.value })} className={inputClass()} /></Field>
              <Field label="Situacao"><select value={profile.status} onChange={(event) => setProfile({ ...profile, status: event.target.value })} className={inputClass()}><option>Ativo</option><option>Inativo</option></select></Field>
              <Field label="Salario"><input value={profile.salary || ''} onChange={(event) => setProfile({ ...profile, salary: parseNumber(event.target.value) })} className={moneyClass()} /></Field>
              <Field label="Diaria"><input value={profile.dailyRate || ''} onChange={(event) => setProfile({ ...profile, dailyRate: parseNumber(event.target.value) })} className={moneyClass()} /></Field>
              <Field label="Tipo pagto."><select value={profile.paymentType} onChange={(event) => setProfile({ ...profile, paymentType: event.target.value })} className={inputClass()}><option>PIX</option><option>Conta bancaria</option><option>Dinheiro</option></select></Field>
              <Field label="Chave PIX"><input value={profile.pixKey} onChange={(event) => setProfile({ ...profile, pixKey: event.target.value })} className={inputClass()} /></Field>
              <Field label="Banco"><input value={profile.bank} onChange={(event) => setProfile({ ...profile, bank: event.target.value.toUpperCase() })} className={inputClass()} /></Field>
              <Field label="Agencia"><input value={profile.agency} onChange={(event) => setProfile({ ...profile, agency: event.target.value })} className={inputClass()} /></Field>
              <Field label="Conta"><input value={profile.account} onChange={(event) => setProfile({ ...profile, account: event.target.value })} className={inputClass()} /></Field>
            </div>
          </div>
        </div>
      )}

      {payslipOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-8">
          <div className="w-full max-w-4xl border-4 border-red-700 bg-white shadow-2xl print:border-0 print:shadow-none">
            <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1 print:hidden">
              <h3 className="text-lg font-normal text-red-600">Contracheque</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => window.print()} className="inline-flex items-center gap-1"><Printer size={15} /> IMPRIMIR</button>
                <button onClick={() => setPayslipOpen(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>
            <Payslip closing={closing} payrollTotals={closingTotals} />
          </div>
        </div>
      )}
    </div>
  )
}

function PayrollGrid({
  loading,
  rows,
  actionOpen,
  setActionOpen,
  openEdit,
  openPayslip,
  changeStatus,
  payslipMode = false,
}: {
  loading: boolean
  rows: PayrollClosing[]
  actionOpen: string | null
  setActionOpen: (id: string | null) => void
  openEdit: (closing: PayrollClosing) => void
  openPayslip: (closing: PayrollClosing) => void
  changeStatus: (id: string, status: string) => void
  payslipMode?: boolean
}) {
  return (
    <div className="overflow-auto bg-white">
      <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 px-2"><span className="font-semibold">{payslipMode ? 'Contracheques gerados' : 'Fechamentos da folha'}</span><span className="ml-auto">{loading ? '' : `${rows.length} registros`}</span></div>
      <table className="w-full min-w-[1180px] text-xs">
        <thead><tr>{['Competencia', 'Funcionario', 'Categoria', 'Admissao', 'Salario', 'Qtde viagem', 'Proventos', 'Descontos', 'Liquido', 'Situacao', 'Acoes'].map((heading) => <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>)}</tr></thead>
        <tbody>
          {loading && <LoadingRow colSpan={11} label={payslipMode ? 'Carregando contracheques...' : 'Carregando fechamentos...'} />}
          {!loading && rows.map((item, index) => (
            <tr key={item.id} onDoubleClick={() => openEdit(item)} className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} hover:bg-sky-100`}>
              <td className="border-b border-r px-2 py-2">{item.month}/{item.year}</td>
              <td className="border-b border-r px-2 py-2">{item.employeeName}</td>
              <td className="border-b border-r px-2 py-2">{item.category}</td>
              <td className="border-b border-r px-2 py-2">{item.admissionDate || '-'}</td>
              <td className="border-b border-r px-2 py-2 text-right">{formatMoney(item.salary)}</td>
              <td className="border-b border-r px-2 py-2 text-right">{item.tripQuantity}</td>
              <td className="border-b border-r px-2 py-2 text-right">{formatMoney(item.grossTotal)}</td>
              <td className="border-b border-r px-2 py-2 text-right">{formatMoney(item.discountTotal)}</td>
              <td className="border-b border-r px-2 py-2 text-right font-semibold">{formatMoney(item.netTotal)}</td>
              <td className="border-b border-r px-2 py-2">{item.status}</td>
              <td className="relative border-b px-2 py-2">
                <button onClick={() => setActionOpen(actionOpen === item.id ? null : item.id)} className="grid h-6 w-8 place-items-center border border-zinc-300 bg-white"><MoreVertical size={15} /></button>
                {actionOpen === item.id && (
                  <div className="absolute right-2 top-8 z-20 w-40 border border-zinc-400 bg-white py-1 shadow-lg">
                    <button onClick={() => openEdit(item)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Visualizar</button>
                    <button onClick={() => openPayslip(item)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Contracheque</button>
                    {!payslipMode && <button onClick={() => changeStatus(item.id, 'Fechado')} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Fechar folha</button>}
                    {!payslipMode && <button onClick={() => changeStatus(item.id, 'Pago')} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Marcar pago</button>}
                    {!payslipMode && <button onClick={() => changeStatus(item.id, 'Cancelado')} className="block w-full px-3 py-2 text-left text-red-700 hover:bg-zinc-100">Cancelar</button>}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {!loading && !rows.length && <tr><td colSpan={11} className="px-3 py-12 text-center text-zinc-500">{payslipMode ? 'Nenhum contracheque encontrado.' : 'Nenhum fechamento encontrado.'}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Payslip({ closing, payrollTotals }: { closing: PayrollForm, payrollTotals: PayrollTotals }) {
  return (
    <div className="p-6 text-xs">
      <div className="border border-zinc-700">
        <div className="bg-cyan-700 px-3 py-2 text-center text-sm font-bold uppercase text-white">Demonstrativo de pagamento</div>
        <div className="grid grid-cols-2 gap-px bg-zinc-700">
          <div className="bg-white p-3"><strong>Funcionario:</strong> {closing.employeeName}</div>
          <div className="bg-white p-3"><strong>Competencia:</strong> {closing.month}/{closing.year}</div>
          <div className="bg-white p-3"><strong>Categoria:</strong> {closing.category}</div>
          <div className="bg-white p-3"><strong>Admissao:</strong> {closing.admissionDate || '-'}</div>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="bg-zinc-200"><th className="border px-2 py-2 text-left">Descricao</th><th className="border px-2 py-2 text-right">Proventos</th><th className="border px-2 py-2 text-right">Descontos</th></tr></thead>
          <tbody>
            <tr><td className="border px-2 py-2">1a quinzena</td><td className="border px-2 py-2 text-right">{formatMoney(closing.firstFortnightSalary + closing.firstFortnightOvertime)}</td><td className="border px-2 py-2 text-right">{closing.firstFortnightDiscount ? formatMoney(closing.firstFortnightDiscount) : '-'}</td></tr>
            <tr><td className="border px-2 py-2">2a quinzena e adicionais</td><td className="border px-2 py-2 text-right">{formatMoney(closing.secondFortnightSalary + closing.secondFortnightOvertime + closing.transport + closing.average + closing.basket + closing.tripExpenses + closing.vacationBonus + closing.otherEarnings)}</td><td className="border px-2 py-2 text-right">{formatMoney(closing.inss + closing.otherDiscounts)}</td></tr>
            {closing.items.map((item) => <tr key={item.id}><td className="border px-2 py-2">{item.description || 'Lancamento avulso'} {item.reference && `- ${item.reference}`}</td><td className="border px-2 py-2 text-right">{item.type === 'earning' ? formatMoney(item.amount) : '-'}</td><td className="border px-2 py-2 text-right">{item.type === 'discount' ? formatMoney(item.amount) : '-'}</td></tr>)}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-100"><td className="border px-2 py-2 font-bold">Totais</td><td className="border px-2 py-2 text-right font-bold">{formatMoney(payrollTotals.grossTotal)}</td><td className="border px-2 py-2 text-right font-bold">{formatMoney(payrollTotals.discountTotal)}</td></tr>
            <tr className="bg-zinc-100 font-bold"><td className="border px-2 py-2">Liquido a receber</td><td className="border px-2 py-2 text-right" colSpan={2}>{formatMoney(payrollTotals.netTotal)}</td></tr>
          </tfoot>
        </table>
        <div className="grid grid-cols-2 gap-12 p-8">
          <div className="border-t border-zinc-700 pt-2 text-center">Assinatura do colaborador</div>
          <div className="border-t border-zinc-700 pt-2 text-center">Responsavel financeiro</div>
        </div>
      </div>
    </div>
  )
}
