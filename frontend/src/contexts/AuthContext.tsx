import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, ApiError, AUTH_EXPIRED_EVENT } from "@/lib/api";
import type { StaffProfile, Token } from "@/lib/types";

type AuthState = {
  user: StaffProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const USER_CACHE_KEY = "shw:user";

function readCachedUser(): StaffProfile | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as StaffProfile) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // 토큰이 있으면 직전 프로필을 즉시 hydrate — 앱 셸을 바로 렌더하여
  // /auth/me 왕복(콜드 스타트 시 1~5초)을 기다리지 않게 함.
  const initialToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const initialUser = initialToken ? readCachedUser() : null;

  const [user, setUser] = useState<StaffProfile | null>(initialUser);
  const [token, setToken] = useState<string | null>(initialToken);
  // 캐시된 user가 있으면 loading=false로 시작 → 앱 셸 즉시 표시, 검증은 백그라운드.
  const [loading, setLoading] = useState<boolean>(!!initialToken && !initialUser);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem(USER_CACHE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // 어떤 API 요청이든 401을 받으면 api.ts가 AUTH_EXPIRED_EVENT를 던진다.
  // 즉시 user/token을 비워 모든 폴링 훅이 멈추고 /login으로 리다이렉트 됨.
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<StaffProfile>("/auth/me")
      .then((profile) => {
        setUser(profile);
        try {
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
        } catch {
          /* quota 초과 무시 */
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) logout();
      })
      .finally(() => setLoading(false));
  }, [token, logout]);

  // ── Heartbeat: Vercel 함수가 idle로 잠들지 않도록 활성 세션일 때 4분마다 ping.
  // 탭이 hidden이면 정지 (배터리/트래픽 절약), 복귀 시 즉시 1회 ping 후 재개.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const ping = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        void api.get("/auth/warmup").catch(() => {});
      }
    };
    ping();
    const timer = window.setInterval(ping, 4 * 60 * 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await api.post<Token>("/auth/login", { email, password });
    localStorage.setItem("token", access_token);
    setToken(access_token);
    const profile = await api.get<StaffProfile>("/auth/me");
    setUser(profile);
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
    } catch {
      /* quota 초과 무시 */
    }
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
