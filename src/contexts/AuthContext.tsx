import { createContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/api/client";
import type { AuthUser } from "@/types/api";

interface LoginInput {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface RegisterInput {
  email: string;
  password: string;
  confirm_password: string;
  invite_code?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await apiFetch<AuthUser>("/api/auth/me");
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const login = async (input: LoginInput) => {
    const nextUser = await apiFetch<AuthUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(nextUser);
    return nextUser;
  };

  const register = async (input: RegisterInput) => {
    const nextUser = await apiFetch<AuthUser>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await apiFetch<void>("/api/auth/logout", {
      method: "POST",
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
