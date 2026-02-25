import type { MenuItem } from "../auth/AuthGuard";
import { IconClose, NavIcon } from "./icons";

interface Props {
  items: MenuItem[];
  current: string;
  onNav: (key: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ items, current, onNav, mobileOpen, onMobileClose }: Props) {
  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = current === item.key;
        return (
          <button
            key={item.key}
            onClick={() => { onNav(item.key); onMobileClose(); }}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:bg-gray-100 hover:text-[var(--color-text)]"
            }`}
          >
            <NavIcon itemKey={item.key} className="h-5 w-5 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-card)] md:block">
        <div className="sticky top-14">{nav}</div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onMobileClose} />
          <aside className="relative z-10 flex w-64 flex-col bg-[var(--color-bg-card)] shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
              <span className="text-sm font-semibold text-[var(--color-text)]">Меню</span>
              <button
                onClick={onMobileClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <IconClose />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
