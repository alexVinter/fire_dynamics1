import type { MenuItem } from "../auth/AuthGuard";
import { NavIcon } from "./icons";

interface Props {
  items: MenuItem[];
  current: string;
  onNav: (key: string) => void;
}

export default function BottomNav({ items, current, onNav }: Props) {
  if (items.length === 0) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[0_-1px_3px_rgba(0,0,0,.06)] md:hidden">
      {items.map((item) => {
        const active = current === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onNav(item.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              active
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            <NavIcon itemKey={item.key} className="h-5 w-5" />
            <span className="leading-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
