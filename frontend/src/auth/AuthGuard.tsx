import type { ReactNode } from "react";
import type { UserMe } from "./types";
import Login from "../pages/Login";

interface Props {
  user: UserMe | null;
  loading: boolean;
  onLogin: (login: string, password: string) => Promise<void>;
  children: ReactNode;
}

export default function AuthGuard({ user, loading, onLogin, children }: Props) {
  if (loading) return <div className="login-wrap"><p className="text-secondary">Загрузка…</p></div>;
  if (!user) return <Login onLogin={onLogin} />;
  return <>{children}</>;
}

interface MenuItem {
  label: string;
  key: string;
}

const MENU_BY_ROLE: Record<string, MenuItem[]> = {
  admin: [
    { key: "dashboard", label: "История КП" },
    { key: "calc", label: "Новый расчёт" },
    { key: "admin", label: "Админка" },
  ],
  manager: [
    { key: "dashboard", label: "История КП" },
    { key: "calc", label: "Новый расчёт" },
  ],
  warehouse: [
    { key: "warehouse", label: "Проверка склада" },
  ],
};

export function useMenuItems(role: string): MenuItem[] {
  return MENU_BY_ROLE[role] ?? [];
}
