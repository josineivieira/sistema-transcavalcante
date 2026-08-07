import {
  Bell,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Container,
  FileText,
  Gauge,
  LogOut,
  MessageSquare,
  UserCog,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  TableProperties,
  Truck,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { canView, clearAuthSession, getAuthUser } from '../services/authSession'

const groups = [
  {
    title: 'Operação',
    items: [
      ['dashboard', 'Visão geral', '/dashboard', Gauge],
      ['freights', 'Fretes', '/freights', Truck],
      ['customers', 'Clientes', '/customers', Building2],
      ['drivers', 'Motoristas', '/drivers', UserRound],
      ['vehicles', 'Veículos', '/vehicles', Boxes],
      ['containers', 'Contêineres', '/containers', Container],
    ],
  },
  {
    title: 'Faturamento',
    items: [
      ['closings', 'Fechamentos', '/closings', ClipboardList],
      ['fiscalDocuments', 'Documentos fiscais', '/fiscal-documents', ReceiptText],
      ['finance', 'Financeiro', '/finance', WalletCards],
      ['priceLists', 'Lista de precos', '/price-lists', TableProperties],
      ['reports', 'Relatórios', '/reports', FileText],
    ],
  },
  {
    title: 'Administração',
    items: [
      ['users', 'Usuários', '/users', UserCog],
      ['settings', 'Configurações', '/settings', Settings],
    ],
  },
]

const pageTitles: Record<string, string> = {
  '/dashboard': 'Visão geral',
  '/freights': 'Fretes',
  '/closings': 'Fechamentos',
  '/fiscal-documents': 'Documentos fiscais',
  '/customers': 'Clientes',
  '/drivers': 'Motoristas',
  '/vehicles': 'Veículos',
  '/containers': 'Contêineres',
  '/finance': 'Financeiro',
  '/price-lists': 'Lista de precos',
  '/reports': 'Relatórios',
  '/users': 'Usuários',
  '/settings': 'Configurações',
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const title = pageTitles[location.pathname] ?? 'Sistema'
  const authUser = getAuthUser()
  const initials = authUser?.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'AS'

  function toggleSidebar() {
    setCollapsed(!collapsed)
  }

  function logout() {
    clearAuthSession()
    setProfileOpen(false)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#eef1f4] text-zinc-950">
      <div
        className="min-h-screen"
        style={{
          display: 'grid',
          gridTemplateColumns: collapsed ? '72px minmax(0, 1fr)' : '248px minmax(0, 1fr)',
        }}
      >
        <aside
          className="border-r border-[#07172d] bg-[#0b1830] text-zinc-100"
          style={{
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr) auto',
            height: '100vh',
            position: 'sticky',
            top: 0,
            width: collapsed ? 72 : 248,
            overflow: 'hidden',
          }}
        >
          <div className={collapsed ? 'w-full border-b border-[#1c315a] bg-[#071326] px-2 py-3' : 'w-full border-b border-[#1c315a] bg-[#071326] px-4 py-3'}>
            {!collapsed && (
              <div>
                <div className="text-sm font-bold leading-tight text-white">TRANSCAVALCANTE</div>
                <div className="mt-1 text-[11px] font-semibold uppercase leading-tight text-[#9db7dc]">Centro Operacional</div>
              </div>
            )}
            <button
              onClick={toggleSidebar}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className={collapsed ? 'mx-auto grid h-8 w-8 place-items-center border border-[#1c315a] text-[#c7d5ea] hover:bg-[#132a52]' : 'mt-3 flex h-8 w-full items-center justify-between border border-[#1c315a] px-2 text-xs text-[#c7d5ea] hover:bg-[#132a52]'}
            >
              {!collapsed && <span>Recolher menu</span>}
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav className="sidebar-nav w-full overflow-y-auto px-2 py-3">
            {groups.map((group) => {
              const allowedItems = group.items.filter(([moduleKey]) => canView(moduleKey as string))
              if (!allowedItems.length) return null

              return (
              <div key={group.title} className="mb-4">
                {!collapsed && <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8da5cb]">{group.title}</div>}
                {allowedItems.map(([, label, href, Icon]) => (
                  <NavLink
                    key={href as string}
                    to={href as string}
                    title={label as string}
                    className={({ isActive }) =>
                      collapsed
                        ? `mb-1 grid h-10 w-full place-items-center border-l-[3px] ${
                            isActive ? 'border-l-[#1b66b1] bg-[#132a52] text-white' : 'border-l-transparent text-[#c7d5ea] hover:bg-[#132a52] hover:text-white'
                          }`
                        : `flex w-full items-center gap-2 overflow-hidden whitespace-nowrap border-l-[3px] px-3 py-2 text-[13px] ${
                            isActive ? 'border-l-[#1b66b1] bg-[#132a52] text-white' : 'border-l-transparent text-[#c7d5ea] hover:bg-[#132a52] hover:text-white'
                          }`
                    }
                  >
                    <Icon size={17} />
                    {!collapsed && <span className="min-w-0 truncate">{label as string}</span>}
                  </NavLink>
                ))}
              </div>
              )
            })}
          </nav>

          <div className={collapsed ? 'w-full border-t border-[#1c315a] px-2 py-3 text-[#9db7dc]' : 'w-full border-t border-[#1c315a] px-4 py-3 text-[11px] text-[#9db7dc]'}>
            <div className={collapsed ? 'grid place-items-center text-emerald-300' : 'flex items-center gap-2 text-emerald-300'}>
              <ShieldCheck size={collapsed ? 18 : 14} />
              {!collapsed && <span>Homologação ativa</span>}
            </div>
            {!collapsed && <div className="mt-1">Produção fiscal bloqueada</div>}
          </div>
        </aside>

        <main className="min-h-screen min-w-0">
          <header className="border-b border-zinc-300 bg-white">
            <div className="flex h-[52px] items-center justify-between px-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium uppercase text-zinc-500">Módulo</div>
                  <h1 className="truncate text-[17px] font-semibold">{title}</h1>
                </div>
                {searchOpen && <input autoFocus className="h-8 w-[320px] border border-zinc-300 px-2 text-sm outline-none focus:border-[#004080]" placeholder="Buscar processo, cliente, placa ou documento" />}
              </div>

              <div className="flex items-center">
                <button onClick={() => setSearchOpen(!searchOpen)} title="Buscar" className="relative grid h-9 w-9 place-items-center border-l border-zinc-200 text-zinc-600 hover:bg-zinc-50"><Search size={18} /></button>
                <button onClick={() => setNoticeOpen(!noticeOpen)} title="Notificações" className="relative grid h-9 w-9 place-items-center border-l border-zinc-200 text-zinc-600 hover:bg-zinc-50"><Bell size={18} /><span className="absolute right-2 top-2 h-1.5 w-1.5 bg-red-600" /></button>
                <button onClick={() => setMessageOpen(!messageOpen)} title="Mensagens" className="grid h-9 w-9 place-items-center border-l border-zinc-200 text-zinc-600 hover:bg-zinc-50"><MessageSquare size={18} /></button>
                <button onClick={() => setHelpOpen(!helpOpen)} title="Ajuda" className="grid h-9 w-9 place-items-center border-l border-zinc-200 text-zinc-600 hover:bg-zinc-50"><CircleHelp size={18} /></button>

                <div className="ml-4 hidden items-center gap-2 border-l border-zinc-300 pl-4 lg:flex">
                  <img src="/transcavalcante-logo.png" className="h-9 w-16 object-contain" />
                  <div className="leading-tight">
                    <div className="text-xs font-bold text-[#0b1830]">TRANSCAVALCANTE</div>
                    <div className="text-[11px] uppercase text-[#004080]">Centro operacional</div>
                  </div>
                </div>

                <div className="relative ml-4 border-l border-zinc-300 pl-4">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    title="Perfil do usuário"
                    className="grid h-9 w-9 place-items-center rounded-full border border-[#004080] bg-[#004080] text-xs font-bold text-white"
                  >
                    {initials}
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-11 z-20 w-56 border border-zinc-300 bg-white py-1 text-sm shadow-md">
                      <div className="border-b border-zinc-200 px-3 py-2">
                        <div className="font-semibold text-zinc-900">{authUser?.name ?? 'Usuario'}</div>
                        <div className="text-xs text-zinc-500">{authUser?.company ?? 'Transcavalcante'}</div>
                      </div>
                      <button onClick={() => window.alert('Tela de perfil será conectada ao cadastro de usuários.')} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50">
                        <UserCog size={16} /> Perfil do usuário
                      </button>
                      <button onClick={() => window.alert('Troca de foto será ligada ao armazenamento de arquivos.')} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50">
                        <UserRound size={16} /> Mudar foto
                      </button>
                      <button onClick={logout} className="flex w-full items-center gap-2 border-t border-zinc-200 px-3 py-2 text-left text-red-700 hover:bg-red-50">
                        <LogOut size={16} /> Sair
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(noticeOpen || messageOpen || helpOpen) && (
              <div className="border-t border-zinc-200 bg-[#f7f9fc] px-5 py-2 text-xs text-zinc-700">
                {noticeOpen && <span className="mr-6">Notificações: certificado A1 pendente, provider fiscal em mock.</span>}
                {messageOpen && <span className="mr-6">Mensagens: nenhuma comunicação pendente.</span>}
                {helpOpen && <span>Ajuda: fluxo recomendado: cliente, motorista, veículo, contêiner, frete, fechamento e emissão.</span>}
              </div>
            )}
          </header>

          <section className="p-5"><Outlet /></section>
        </main>
      </div>
    </div>
  )
}

