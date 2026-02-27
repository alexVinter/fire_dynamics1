import { type UserMe, roleLabel } from "../auth/types";
import { IconMenu, IconSearch, IconLogout } from "./icons";

interface Props {
  user: UserMe;
  onLogout: () => void;
  onMobileMenu: () => void;
  onProfile?: () => void;
}

export default function Header({ user, onLogout, onMobileMenu, onProfile }: Props) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 shadow-sm lg:px-6">
      <button
        onClick={onMobileMenu}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
        aria-label="Меню"
      >
        <IconMenu />
      </button>

      <span className="select-none whitespace-nowrap text-lg font-bold tracking-tight text-[var(--color-accent)]">
        Динамика Огня
      </span>

      {/* Desktop search */}
      <div className="mx-auto hidden w-full max-w-md md:block">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Поиск по КП, технике…"
            className="w-full rounded-lg border border-[var(--color-border)] bg-gray-50 py-1.5 pl-9 pr-3 text-sm placeholder:text-gray-400 transition-colors focus:border-[var(--color-accent)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
      </div>

      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-2">
        <button
          onClick={onProfile}
          className="hidden items-center gap-2 text-sm md:flex rounded-lg px-2 py-1 transition-colors hover:bg-gray-100"
          title="Профиль"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold uppercase text-white">
            {user.login[0]}
          </span>
          <span className="text-[var(--color-text-secondary)]">
            {user.login}
            <span className="ml-1 text-xs opacity-60">({roleLabel(user.role)})</span>
          </span>
        </button>
        <button
          onClick={onLogout}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Выйти"
        >
          <IconLogout />
        </button>
      </div>
    </header>
  );
}
