import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import type { StaffProfile, Token } from "@/lib/types";

type AuthState = {
  user: StaffProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(!!localStorage.getItem("token"));

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<StaffProfile>("/auth/me")
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) logout();
      })
      .finally(() => setLoading(false));
  }, [token, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.post<Token>("/auth/login", { email, password });
    localStorage.setItem("token", access_token);
    setToken(access_token);
    const profile = await api.get<StaffProfile>("/auth/me");
    setUser(profile);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
