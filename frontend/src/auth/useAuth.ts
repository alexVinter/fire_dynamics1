import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import type { UserMe } from "./types";

interface LoginResponse {
  access_token: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const me = await apiGet<UserMe>("/auth/me");
      setUser(me);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("access_token")) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = useCallback(
    async (loginStr: string, password: string) => {
      const data = await apiPost<LoginResponse>("/auth/login", {
        login: loginStr,
        password,
      });
      localStorage.setItem("access_token", data.access_token);
      await fetchMe();
    },
    [fetchMe],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}
