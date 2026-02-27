import { type ReactNode, useState } from "react";
import type { UserMe } from "../auth/types";
import { useMenuItems } from "../auth/AuthGuard";
import Breadcrumbs from "../ui/Breadcrumbs";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

interface Props {
  user: UserMe;
  currentPage: string;
  onNav: (page: string) => void;
  onLogout: () => void;
  breadcrumbs?: string[];
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AppShell({
  user, currentPage, onNav, onLogout,
  breadcrumbs, title, subtitle,
  children,
}: Props) {
  const items = useMenuItems(user.role);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <Header
        user={user}
        onLogout={onLogout}
        onMobileMenu={() => setMobileMenu(true)}
        onProfile={() => onNav("profile")}
      />

      <div className="flex flex-1">
        <Sidebar
          items={items}
          current={currentPage}
          onNav={onNav}
          mobileOpen={mobileMenu}
          onMobileClose={() => setMobileMenu(false)}
        />

        <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-16 md:p-6">
          {(breadcrumbs || title) && (
            <div className="mb-5">
              {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
              {title && (
                <h1 className="text-xl font-bold leading-tight text-[var(--color-text)] lg:text-2xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>

      <div className="md:hidden">
        <BottomNav items={items} current={currentPage} onNav={onNav} />
      </div>
    </div>
  );
}
