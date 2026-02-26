import { type ReactNode, useCallback, useState } from "react";
import type { UserMe } from "./types";
import Login from "../pages/Login";
import Register from "../pages/Register";
import VerifyEmail from "../pages/VerifyEmail";

interface Props {
  user: UserMe | null;
  loading: boolean;
  onLogin: (login: string, password: string) => Promise<void>;
  children: ReactNode;
}

type AuthRoute = "login" | "register" | "verify-email";

function detectRoute(): { route: AuthRoute; verifyToken: string | null } {
  const path = window.location.pathname;
  if (path === "/verify-email" || path === "/verify-email/") {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) return { route: "verify-email", verifyToken: token };
  }
  if (path === "/register" || path === "/register/") {
    return { route: "register", verifyToken: null };
  }
  return { route: "login", verifyToken: null };
}

export default function AuthGuard({ user, loading, onLogin, children }: Props) {
  const [{ route, verifyToken }, setDetected] = useState(detectRoute);

  const navigate = useCallback((target: AuthRoute) => {
    const url = target === "login" ? "/" : `/${target}`;
    window.history.pushState({}, "", url);
    setDetected({ route: target, verifyToken: null });
  }, []);

  if (loading) return <div className="login-wrap"><p className="text-secondary">Загрузка…</p></div>;

  if (route === "verify-email" && verifyToken) {
    return <VerifyEmail token={verifyToken} onGoLogin={() => navigate("login")} />;
  }

  if (!user) {
    if (route === "register") return <Register onGoLogin={() => navigate("login")} />;
    return <Login onLogin={onLogin} onGoRegister={() => navigate("register")} />;
  }

  if (window.location.pathname !== "/") {
    window.history.replaceState({}, "", "/");
  }
  return <>{children}</>;
}

export interface MenuItem {
  label: string;
  key: string;
  icon?: string;
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
