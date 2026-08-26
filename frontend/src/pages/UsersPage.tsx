import { useMemo, useState } from 'react'
import { Pencil, Save, Trash2, X } from 'lucide-react'
import { useLocalData } from '../hooks/useLocalData'
import { nextId, type SystemUser, type UserPermission } from '../services/localStore'
import { canEdit, denyNoPrivilege } from '../services/authSession'
import { LoadingRow } from '../components/LoadingState'

const modules = [
  ['dashboard', 'Visao geral'],
  ['freights', 'Fretes'],
  ['customers', 'Clientes'],
  ['drivers', 'Condutores'],
  ['vehicles', 'Veiculos'],
  ['closings', 'Fechamentos'],
  ['fiscalDocuments', 'Documentos fiscais'],
  ['finance', 'Financeiro'],
  ['priceLists', 'Lista de precos'],
  ['purchaseRequests', 'Requisicoes'],
  ['payroll', 'Folha de pagamento'],
  ['reports', 'Relatorios'],
  ['users', 'Usuarios'],
  ['settings', 'Configuracoes'],
] as const

function buildPermissions(permission: UserPermission) {
  const permissions: Record<string, UserPermission> = {}
  modules.forEach(([key]) => {
    permissions[key] = permission
  })
  return permissions
}

const emptyPermissions = buildPermissions('none')

const emptyUser: SystemUser = {
  id: '',
  name: '',
  email: '',
  password: '',
  role: 'Operador',
  department: 'Operacao',
  status: 'Ativo',
  permissions: emptyPermissions,
}

function permissionLabel(permission: UserPermission) {
  if (permission === 'edit') return 'Editar'
  if (permission === 'view') return 'Visualizar'
  return 'Sem acesso'
}

function userForEdit(user?: SystemUser): SystemUser {
  if (!user) {
    return {
      ...emptyUser,
      id: nextId('usr'),
      permissions: { ...emptyPermissions },
    }
  }

  return {
    ...emptyUser,
    ...user,
    permissions: { ...emptyPermissions, ...user.permissions },
  }
}

export function UsersPage() {
  const { users, loading, setUsers } = useLocalData()
  const canEditPage = canEdit('users')
  const [editing, setEditing] = useState<SystemUser | null>(null)
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const term = query.toLowerCase()
    return users.filter((user) => [user.name, user.email, user.role, user.department, user.status].join(' ').toLowerCase().includes(term))
  }, [query, users])

  function updateEditing(field: keyof SystemUser, value: string) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    setEditing({ ...editing, [field]: value })
  }

  function updatePermission(module: string, permission: UserPermission) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    setEditing({
      ...editing,
      permissions: {
        ...editing.permissions,
        [module]: permission,
      },
    })
  }

  function applyPreset(permission: UserPermission) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    setEditing({
      ...editing,
      permissions: buildPermissions(permission),
    })
  }

  function saveUser() {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (!editing) return
    if (!editing.name || !editing.email) {
      window.alert('Informe nome e e-mail do usuario.')
      return
    }
    const exists = users.some((user) => user.id === editing.id)
    if (!exists && !editing.password) {
      window.alert('Informe uma senha para o usuario acessar o sistema.')
      return
    }

    setUsers(exists ? users.map((user) => user.id === editing.id ? editing : user) : [...users, editing])
    setEditing(null)
  }

  function deleteUser(user: SystemUser) {
    if (!canEditPage) {
      denyNoPrivilege()
      return
    }
    if (window.confirm(`Excluir usuario ${user.name}?`)) {
      setUsers(users.filter((item) => item.id !== user.id))
      setEditing(null)
    }
  }

  return (
    <div className="border border-zinc-300 bg-white">
      <div className="flex items-center justify-between border-b-4 border-zinc-400 bg-zinc-100 px-2 py-1">
        <h2 className="text-lg font-normal text-red-600">Consulta usuarios</h2>
        <button
          onClick={() => canEditPage ? setEditing(userForEdit()) : denyNoPrivilege()}
          className="grid h-7 w-7 place-items-center bg-black text-lg font-bold text-white"
          title="Novo usuario"
        >
          +
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-300 bg-zinc-50 px-4 py-2">
        <div className="text-xs text-zinc-600">{loading ? 'Carregando...' : `${rows.length} de ${users.length} registros`}</div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 w-72 border border-zinc-300 px-2 text-xs outline-none" placeholder="Busca rapida" />
      </div>

      <div className="overflow-x-auto">
        <table className="system-grid w-full min-w-[980px] text-xs">
          <thead className="bg-zinc-50">
            <tr>{['Nome', 'E-mail', 'Perfil', 'Setor', 'Telas com acesso', 'Pode editar', 'Situacao', 'Acoes'].map((heading) => <th key={heading} className="border-b border-zinc-300 text-left font-medium text-zinc-600">{heading}</th>)}</tr>
          </thead>
          <tbody>
            {!loading && rows.map((user) => {
              const allowed = Object.values(user.permissions).filter((item) => item !== 'none').length
              const editable = Object.values(user.permissions).filter((item) => item === 'edit').length
              return (
                <tr key={user.id}>
                  <td className="border-b border-zinc-200 font-medium">{user.name}</td>
                  <td className="border-b border-zinc-200">{user.email}</td>
                  <td className="border-b border-zinc-200">{user.role}</td>
                  <td className="border-b border-zinc-200">{user.department}</td>
                  <td className="border-b border-zinc-200">{allowed}</td>
                  <td className="border-b border-zinc-200">{editable}</td>
                  <td className="border-b border-zinc-200 text-emerald-700">{user.status}</td>
                  <td className="border-b border-zinc-200">
                    <button onClick={() => canEditPage ? setEditing(userForEdit(user)) : denyNoPrivilege()} className="border border-zinc-300 bg-white px-2 py-1" title="Editar">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {loading && <LoadingRow colSpan={8} label="Carregando usuários..." />}
            {!loading && !rows.length && <tr><td colSpan={8} className="px-3 py-10 text-center text-zinc-500">Nenhum usuario encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/30 px-4 py-6">
          <div className="system-modal max-h-[calc(100vh-48px)] w-full max-w-6xl overflow-hidden border border-zinc-500 bg-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-zinc-400 bg-zinc-100 px-2 py-1">
              <h3 className="text-lg font-normal text-red-600">Usuario</h3>
              <div className="flex items-center gap-3 text-xs">
                <button onClick={saveUser} className="inline-flex items-center gap-1"><Save size={15} /> SALVAR E SAIR</button>
                <button onClick={() => deleteUser(editing)} className="inline-flex items-center gap-1"><Trash2 size={15} /> EXCLUIR</button>
                <button onClick={() => setEditing(null)} className="grid h-7 w-7 place-items-center bg-black text-white"><X size={18} /></button>
              </div>
            </div>

            <div className="grid items-start gap-x-12 gap-y-2 border-b-4 border-zinc-400 p-3 md:grid-cols-2">
              <div className="grid content-start grid-cols-[120px_1fr] items-center gap-1 text-xs">
                <label className="text-right text-red-600">Nome</label>
                <input value={editing.name} onChange={(event) => updateEditing('name', event.target.value.toUpperCase())} className="h-7 border border-zinc-300 px-2" />
                <label className="text-right text-red-600">E-mail</label>
                <input value={editing.email} onChange={(event) => updateEditing('email', event.target.value)} className="h-7 border border-zinc-300 px-2" />
                <label className="text-right text-red-600">Senha</label>
                <input value={editing.password} onChange={(event) => updateEditing('password', event.target.value)} className="h-7 border border-zinc-300 px-2" type="password" placeholder={editing.passwordConfigured ? 'Manter senha atual' : ''} />
                <label className="text-right">Setor</label>
                <input value={editing.department} onChange={(event) => updateEditing('department', event.target.value)} className="h-7 border border-zinc-300 px-2" />
              </div>
              <div className="grid content-start grid-cols-[120px_1fr] items-center gap-1 text-xs">
                <label className="text-right">Perfil</label>
                <select value={editing.role} onChange={(event) => updateEditing('role', event.target.value)} className="h-7 border border-zinc-300 px-2">
                  <option>Administrador</option>
                  <option>Supervisor</option>
                  <option>Operador</option>
                  <option>Financeiro</option>
                  <option>Fiscal</option>
                </select>
                <label className="text-right">Situacao</label>
                <select value={editing.status} onChange={(event) => updateEditing('status', event.target.value)} className="h-7 border border-zinc-300 px-2">
                  <option>Ativo</option>
                  <option>Inativo</option>
                </select>
                <label />
                <div className="flex gap-2">
                  <button onClick={() => applyPreset('view')} className="border border-zinc-300 bg-white px-2 py-1">Liberar visualizacao</button>
                  <button onClick={() => applyPreset('edit')} className="border border-zinc-300 bg-white px-2 py-1">Liberar edicao</button>
                  <button onClick={() => applyPreset('none')} className="border border-zinc-300 bg-white px-2 py-1">Bloquear tudo</button>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-zinc-600">Permissoes por tela</div>
              <table className="system-grid w-full text-xs">
                <thead className="bg-zinc-200">
                  <tr>
                    <th className="border-b border-zinc-300 text-left font-medium">Tela</th>
                    <th className="border-b border-zinc-300 text-left font-medium">Permissao</th>
                    <th className="border-b border-zinc-300 text-left font-medium">Efeito no sistema</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map(([key, label]) => {
                    const permission = editing.permissions[key] ?? 'none'
                    return (
                      <tr key={key}>
                        <td className="border-b border-zinc-200 font-medium">{label}</td>
                        <td className="border-b border-zinc-200">
                          <select value={permission} onChange={(event) => updatePermission(key, event.target.value as UserPermission)} className="h-7 w-44 border border-zinc-300 px-2">
                            <option value="none">Sem acesso</option>
                            <option value="view">Visualizar</option>
                            <option value="edit">Editar</option>
                          </select>
                        </td>
                        <td className="border-b border-zinc-200 text-zinc-600">{permissionLabel(permission)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
