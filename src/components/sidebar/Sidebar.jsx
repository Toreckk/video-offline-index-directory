import {
  Compass,
  FolderOpen,
  PlayCircle,
  Settings,
  UserRound,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "explorer", label: "Explorer", icon: Compass, enabled: true },
  { id: "player", label: "Player", icon: PlayCircle, enabled: false },
  { id: "folders", label: "Folders", icon: FolderOpen, enabled: false },
  { id: "settings", label: "Settings", icon: Settings, enabled: false },
];

const NavItem = ({ id, label, icon: Icon, enabled, isActive, onClick }) => {
  return (
    <button
      id={`nav-${id}`}
      onClick={onClick}
      disabled={!enabled}
      className={`
        group relative flex h-[70px] w-full items-center gap-5 overflow-hidden rounded-[7px] px-6
        outline-none transition-all duration-300
        ${enabled ? "cursor-pointer" : "cursor-default opacity-40"}
        ${
          isActive
            ? "bg-surface-container-high text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
            : enabled
              ? "text-on-secondary/70 hover:bg-white/[0.025] hover:text-on-primary"
              : "text-on-secondary/40"
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
            : enabled
              ? "text-on-secondary/75 group-hover:text-primary"
              : ""
        }`}
      />
      <span
        className={`mt-0.5 text-[14px] uppercase tracking-[0.17em] ${isActive ? "font-black text-on-primary" : "font-bold"}`}
      >
        {label}
      </span>
    </button>
  );
};

export default function Sidebar({ activeView, onNavigate }) {
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
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            {...item}
            isActive={activeView === item.id}
            onClick={() => item.enabled && onNavigate(item.id)}
          />
        ))}
      </nav>

      <footer className="flex h-[132px] items-center justify-center border-t border-white/[0.035]">
        <button
          id="nav-profile"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/[0.07] bg-surface-container-high text-on-secondary/80 transition-all duration-300 hover:border-primary-fixed-dim/45 hover:text-on-primary"
          aria-label="Profile"
        >
          <UserRound size={22} strokeWidth={2} />
        </button>
      </footer>
    </aside>
  );
}
