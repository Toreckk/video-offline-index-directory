import type { AppView, ViewId } from '../../app/views'

type NavItemProps = AppView & {
  isActive: boolean
  onClick: () => void
}

const NavItem = ({ id, label, icon: Icon, isActive, onClick }: NavItemProps) => {
  return (
    <button
      id={`nav-${id}`}
      onClick={onClick}
      className={`
        group relative flex h-[70px] w-full items-center gap-5 overflow-hidden rounded-[7px] px-6
        cursor-pointer outline-none transition-all duration-300
        ${
          isActive
            ? "bg-surface-container-high text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
            : "text-on-secondary/70 hover:bg-white/[0.025] hover:text-on-primary"
        }
      `}
    >
      {isActive && (
        <span className="absolute right-0 top-0 h-full w-[2px] bg-primary shadow-[0_0_12px_rgba(139,92,246,0.45)]" />
      )}

      <Icon
        size={26}
        strokeWidth={isActive ? 2.5 : 2}
        className={`shrink-0 transition-colors duration-300 ${
          isActive
            ? "text-primary"
            : "text-on-secondary/75 group-hover:text-primary"
        }`}
      />
      <span
        className={`mt-0.5 text-[14px] uppercase tracking-[0.17em] ${isActive ? "font-black text-on-primary" : "font-bold"}`}
      >
        {label}
      </span>
    </button>
  )
}

type SidebarProps = {
  activeView: ViewId
  navItems: AppView[]
  onNavigate: (viewId: ViewId) => void
}

export default function Sidebar({
  activeView,
  navItems,
  onNavigate,
}: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-[var(--spacing-sidebar)] flex-col border-r border-white/[0.045] bg-surface">
      <header className="flex h-[135px] flex-col items-center justify-center border-b border-white/[0.035]">
        <h1 className="text-[30px] font-black leading-none tracking-[-0.08em] text-on-primary">
          VOID
        </h1>
        <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.24em] text-on-secondary/65">
          Cinematography
        </p>
      </header>

      <nav className="flex flex-1 flex-col gap-2 px-2.5 pt-[60px]">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            {...item}
            isActive={activeView === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>
    </aside>
  )
}
