import { useMemo, useState } from 'react'
import { FileText, MoreVertical, Plus, Printer, Save, X } from 'lucide-react'
import { LoadingRow } from '../components/LoadingState'
import { useLocalData } from '../hooks/useLocalData'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { formatMoney, nextId, type PayrollClosing, type PayrollItem } from '../services/localStore'

const months = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

type PayrollForm = Omit<PayrollClosing, 'grossTotal' | 'discountTotal' | 'netTotal'>

const currentYear = String(new Date().getFullYear())

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

function numberValue(value: string) {
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

function moneyInputClass() {
  return 'h-7 w-full border border-zinc-300 bg-white px-2 text-right text-xs outline-none focus:border-sky-600'
}

function textInputClass(disabled = false) {
  return `h-7 w-full border border-zinc-300 px-2 text-xs outline-none focus:border-sky-600 ${disabled ? 'bg-zinc-200 text-zinc-500' : 'bg-white'}`
}

export function PayrollPage() {
  const { drivers, payrollClosings, loading, setPayrollClosings } = useLocalData()
  const canEditPage = canEdit('payroll')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [payslipOpen, setPayslipOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<PayrollForm>(emptyForm)

  const rows = useMemo(() => {
    const term = search.toLowerCase()
    return payrollClosings.filter((closing) => (
      (!term || [closing.employeeName, closing.category, closing.month, closing.year, closing.status].join(' ').toLowerCase().includes(term))
      && (!statusFilter || closing.status === statusFilter)
      && (!monthFilter || closing.month === monthFilter)
    ))
  }, [monthFilter, payrollClosings, search, statusFilter])

  const editingTotals = totals(editing)

  function openNew() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditing({ ...emptyForm, id: nextId('pay'), createdAt: new Date().toISOString().slice(0, 10) })
    setFormOpen(true)
  }

  function openEdit(closing: PayrollClosing) {
    setEditing({ ...closing })
    setFormOpen(true)
  }

  function updateNumber(field: keyof PayrollForm, value: string) {
    setEditing((current) => ({ ...current, [field]: numberValue(value) }))
  }

  function save(closeAfter = false) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing.employeeId || !editing.employeeName) {
      window.alert('Informe o colaborador.')
      return
    }
    const finalTotals = totals(editing)
    const record: PayrollClosing = { ...editing, ...finalTotals }
    const exists = payrollClosings.some((closing) => closing.id === record.id)
    const nextRows = exists
      ? payrollClosings.map((closing) => closing.id === record.id ? record : closing)
      : [record, ...payrollClosings]
    setPayrollClosings(nextRows)
    setEditing(record)
    if (closeAfter) {
      setFormOpen(false)
    }
  }

  function changeStatus(id: string, status: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setPayrollClosings(payrollClosings.map((closing) => closing.id === id ? { ...closing, status } : closing))
    setActionOpen(null)
  }

  function addItem(type: PayrollItem['type']) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    setEditing((current) => ({
      ...current,
      items: [...current.items, { id: nextId('item'), type, description: '', reference: '', amount: 0 }],
    }))
  }

  function updateItem(id: string, field: keyof PayrollItem, value: string) {
    setEditing((current) => ({
      ...current,
      items: current.items.map((item) => item.id === id ? {
        ...item,
        [field]: field === 'amount' ? numberValue(value) : value,
      } : item),
    }))
  }

  function removeItem(id: string) {
    setEditing((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }))
  }

  function printPayslip() {
    window.print()
  }

  return (
    <div className="space-y-3 text-xs">
      {!formOpen && (
        <div className="border border-zinc-500 bg-zinc-100">
          <div className="flex items-center justify-between border-b-4 border-zinc-400 px-2 py-1">
            <h2 className="text-lg font-normal text-red-600">Fechamento de folha de pagamento</h2>
            <button onClick={openNew} className="grid h-7 w-7 place-items-center bg-black text-white" title="Novo fechamento"><Plus size={18} /></button>
          </div>

          <div className="border-b border-zinc-300 bg-white px-3 py-3">
            <div className="grid gap-3 md:grid-cols-[220px_180px_180px_1fr]">
              <label className="grid gap-1">
                <span>Mes referencia</span>
                <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} className={textInputClass()}>
                  <option value="">Todos</option>
                  {months.map((month) => <option key={month}>{month}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span>Situacao</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={textInputClass()}>
                  <option value="">Todas</option>
                  <option>Em conferencia</option>
                  <option>Fechado</option>
                  <option>Pago</option>
                  <option>Cancelado</option>
                </select>
              </label>
              <label className="grid gap-1 md:col-span-2">
                <span>Busca rapida</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} className={textInputClass()} placeholder="Funcionario, categoria, competencia ou situacao" />
              </label>
            </div>
          </div>

          <div className="overflow-auto bg-white">
            <div className="flex h-8 items-center border-b border-zinc-400 bg-zinc-400 px-2">
              <span className="font-semibold">Demonstrativos de pagamento</span>
              <span className="ml-auto">{loading ? '' : `${rows.length} registros`}</span>
            </div>
            <table className="w-full min-w-[1180px] text-xs">
              <thead>
                <tr className="bg-white">
                  {['Competencia', 'Funcionario', 'Categoria', 'Admissao', 'Salario', 'Qtde viagem', 'Proventos', 'Descontos', 'Liquido', 'Situacao', 'Acoes'].map((heading) => (
                    <th key={heading} className="border-b border-r border-zinc-300 px-2 py-2 text-left font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <LoadingRow colSpan={11} label="Carregando folha..." />}
                {!loading && rows.map((closing, index) => (
                  <tr key={closing.id} onDoubleClick={() => openEdit(closing)} className={`${index % 2 ? 'bg-zinc-100' : 'bg-white'} hover:bg-sky-100`}>
                    <td className="border-b border-r px-2 py-2">{closing.month}/{closing.year}</td>
                    <td className="border-b border-r px-2 py-2">{closing.employeeName}</td>
                    <td className="border-b border-r px-2 py-2">{closing.category}</td>
                    <td className="border-b border-r px-2 py-2">{closing.admissionDate || '-'}</td>
                    <td className="border-b border-r px-2 py-2 text-right">{formatMoney(closing.salary)}</td>
                    <td className="border-b border-r px-2 py-2 text-right">{closing.tripQuantity}</td>
                    <td className="border-b border-r px-2 py-2 text-right">{formatMoney(closing.grossTotal)}</td>
                    <td className="border-b border-r px-2 py-2 text-right">{formatMoney(closing.discountTotal)}</td>
                    <td className="border-b border-r px-2 py-2 text-right font-semibold">{formatMoney(closing.netTotal)}</td>
                    <td className="border-b border-r px-2 py-2">{closing.status}</td>
                    <td className="relative border-b px-2 py-2">
                      <button onClick={() => setActionOpen(actionOpen === closing.id ? null : closing.id)} className="grid h-6 w-8 place-items-center border border-zinc-300 bg-white"><MoreVertical size={15} /></button>
                      {actionOpen === closing.id && (
                        <div className="absolute right-2 top-8 z-20 w-40 border border-zinc-400 bg-white py-1 shadow-lg">
                          <button onClick={() => openEdit(closing)} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Visualizar</button>
                          <button onClick={() => { setEditing({ ...closing }); setPayslipOpen(true); setActionOpen(null) }} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Contracheque</button>
                          <button onClick={() => changeStatus(closing.id, 'Fechado')} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Fechar folha</button>
                          <button onClick={() => changeStatus(closing.id, 'Pago')} className="block w-full px-3 py-2 text-left hover:bg-zinc-100">Marcar pago</button>
                          <button onClick={() => changeStatus(closing.id, 'Cancelado')} className="block w-full px-3 py-2 text-left text-red-700 hover:bg-zinc-100">Cancelar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && !rows.length && <tr><td colSpan={11} className="px-3 py-12 text-center text-zinc-500">Nenhum fechamento de folha encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="border border-zinc-500 bg-zinc-100">
          <div className="flex items-center justify-between border-b-4 border-zinc-400 px-2 py-1">
            <h2 className="text-lg font-normal text-red-600">Demonstrativo de pagamento</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => save(false)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR</button>
              <button onClick={() => save(true)} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
              <button onClick={() => { save(false); setPayslipOpen(true) }} className="inline-flex items-center gap-1"><FileText size={15} /> CONTRACHEQUE</button>
              <button onClick={() => setFormOpen(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
            </div>
          </div>

          <div className="border-b border-zinc-400 bg-[#31c64b] px-3 py-2">
            <div className="grid gap-2 md:grid-cols-4">
              <label className="grid gap-1">
                <span>Funcionario</span>
                <select value={editing.employeeId} onChange={(event) => {
                  const driver = drivers.find((item) => item.id === event.target.value)
                  setEditing((current) => ({
                    ...current,
                    employeeId: driver?.id ?? '',
                    employeeName: driver?.name ?? '',
                    category: driver?.jobTitle || driver?.occupation || current.category,
                  }))
                }} className={textInputClass()}>
                  <option value="">Selecione...</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1"><span>Categoria</span><input value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })} className={textInputClass()} /></label>
              <label className="grid gap-1"><span>Data admissao</span><input type="date" value={editing.admissionDate} onChange={(event) => setEditing({ ...editing, admissionDate: event.target.value })} className={textInputClass()} /></label>
              <label className="grid gap-1"><span>Situacao</span><select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })} className={textInputClass()}><option>Em conferencia</option><option>Fechado</option><option>Pago</option><option>Cancelado</option></select></label>
              <label className="grid gap-1"><span>Mes ref.</span><select value={editing.month} onChange={(event) => setEditing({ ...editing, month: event.target.value })} className={textInputClass()}>{months.map((month) => <option key={month}>{month}</option>)}</select></label>
              <label className="grid gap-1"><span>Ano</span><input value={editing.year} onChange={(event) => setEditing({ ...editing, year: event.target.value })} className={textInputClass()} /></label>
              <label className="grid gap-1"><span>Salario mensal</span><input value={editing.salary || ''} onChange={(event) => updateNumber('salary', event.target.value)} className={moneyInputClass()} /></label>
              <label className="grid gap-1"><span>Diaria</span><input value={editing.dailyRate || ''} onChange={(event) => updateNumber('dailyRate', event.target.value)} className={moneyInputClass()} /></label>
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
                  {['Salario', 'HE', 'Desconto', 'Total', 'Salario', 'HE', 'Transp', 'Media', 'Cesta', 'INSS', 'Out (+)', 'Out (-)', 'Qtde viagem', 'Despesa (+)', 'Ferias/decimo', 'Total recebido'].map((heading) => (
                    <th key={heading} className="border-r px-2 py-2">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="border-b border-r px-2 py-2 font-semibold">{editing.month.toUpperCase()}</td>
                  <td className="border-b border-r p-1"><input value={editing.firstFortnightSalary || ''} onChange={(event) => updateNumber('firstFortnightSalary', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.firstFortnightOvertime || ''} onChange={(event) => updateNumber('firstFortnightOvertime', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.firstFortnightDiscount || ''} onChange={(event) => updateNumber('firstFortnightDiscount', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r px-2 py-2 text-right">{formatMoney(editing.firstFortnightSalary + editing.firstFortnightOvertime - editing.firstFortnightDiscount)}</td>
                  <td className="border-b border-r p-1"><input value={editing.secondFortnightSalary || ''} onChange={(event) => updateNumber('secondFortnightSalary', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.secondFortnightOvertime || ''} onChange={(event) => updateNumber('secondFortnightOvertime', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.transport || ''} onChange={(event) => updateNumber('transport', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.average || ''} onChange={(event) => updateNumber('average', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.basket || ''} onChange={(event) => updateNumber('basket', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.inss || ''} onChange={(event) => updateNumber('inss', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.otherEarnings || ''} onChange={(event) => updateNumber('otherEarnings', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.otherDiscounts || ''} onChange={(event) => updateNumber('otherDiscounts', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.tripQuantity || ''} onChange={(event) => updateNumber('tripQuantity', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.tripExpenses || ''} onChange={(event) => updateNumber('tripExpenses', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b border-r p-1"><input value={editing.vacationBonus || ''} onChange={(event) => updateNumber('vacationBonus', event.target.value)} className={moneyInputClass()} /></td>
                  <td className="border-b px-2 py-2 text-right font-semibold">{formatMoney(editingTotals.netTotal)}</td>
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
                  {editing.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-r p-1"><select value={item.type} onChange={(event) => updateItem(item.id, 'type', event.target.value)} className={textInputClass()}><option value="earning">Provento</option><option value="discount">Desconto</option></select></td>
                      <td className="border-b border-r p-1"><input value={item.description} onChange={(event) => updateItem(item.id, 'description', event.target.value.toUpperCase())} className={textInputClass()} /></td>
                      <td className="border-b border-r p-1"><input value={item.reference} onChange={(event) => updateItem(item.id, 'reference', event.target.value)} className={textInputClass()} /></td>
                      <td className="border-b border-r p-1"><input value={item.amount || ''} onChange={(event) => updateItem(item.id, 'amount', event.target.value)} className={moneyInputClass()} /></td>
                      <td className="border-b p-1 text-center"><button onClick={() => removeItem(item.id)} className="text-red-700"><X size={15} /></button></td>
                    </tr>
                  ))}
                  {!editing.items.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-500">Nenhum lancamento avulso.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="border border-zinc-400 bg-zinc-50 p-3">
              <div className="grid gap-2">
                <div className="flex justify-between"><span>Total bruto</span><strong>{formatMoney(editingTotals.grossTotal)}</strong></div>
                <div className="flex justify-between"><span>Descontos</span><strong>{formatMoney(editingTotals.discountTotal)}</strong></div>
                <div className="border-t border-zinc-400 pt-2 text-base">
                  <div className="flex justify-between"><span>Total liquido</span><strong>{formatMoney(editingTotals.netTotal)}</strong></div>
                </div>
              </div>
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
                <button onClick={printPayslip} className="inline-flex items-center gap-1"><Printer size={15} /> IMPRIMIR</button>
                <button onClick={() => setPayslipOpen(false)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6 text-xs">
              <div className="border border-zinc-700">
                <div className="bg-cyan-700 px-3 py-2 text-center text-sm font-bold uppercase text-white">Demonstrativo de pagamento</div>
                <div className="grid grid-cols-2 gap-px bg-zinc-700">
                  <div className="bg-white p-3"><strong>Funcionario:</strong> {editing.employeeName}</div>
                  <div className="bg-white p-3"><strong>Competencia:</strong> {editing.month}/{editing.year}</div>
                  <div className="bg-white p-3"><strong>Categoria:</strong> {editing.category}</div>
                  <div className="bg-white p-3"><strong>Admissao:</strong> {editing.admissionDate || '-'}</div>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="bg-zinc-200"><th className="border px-2 py-2 text-left">Descricao</th><th className="border px-2 py-2 text-right">Proventos</th><th className="border px-2 py-2 text-right">Descontos</th></tr></thead>
                  <tbody>
                    <tr><td className="border px-2 py-2">Salarios e adicionais</td><td className="border px-2 py-2 text-right">{formatMoney(editingTotals.grossTotal)}</td><td className="border px-2 py-2 text-right">-</td></tr>
                    <tr><td className="border px-2 py-2">Descontos</td><td className="border px-2 py-2 text-right">-</td><td className="border px-2 py-2 text-right">{formatMoney(editingTotals.discountTotal)}</td></tr>
                    {editing.items.map((item) => <tr key={item.id}><td className="border px-2 py-2">{item.description || 'Lancamento avulso'} {item.reference && `- ${item.reference}`}</td><td className="border px-2 py-2 text-right">{item.type === 'earning' ? formatMoney(item.amount) : '-'}</td><td className="border px-2 py-2 text-right">{item.type === 'discount' ? formatMoney(item.amount) : '-'}</td></tr>)}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-100 font-bold"><td className="border px-2 py-2">Total liquido</td><td className="border px-2 py-2 text-right" colSpan={2}>{formatMoney(editingTotals.netTotal)}</td></tr>
                  </tfoot>
                </table>
                <div className="grid grid-cols-2 gap-12 p-8">
                  <div className="border-t border-zinc-700 pt-2 text-center">Assinatura do colaborador</div>
                  <div className="border-t border-zinc-700 pt-2 text-center">Responsavel financeiro</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
