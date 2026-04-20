/**
 * API base URL 결정 규칙 (모두 런타임에 동작):
 * 1) VITE_API_URL이 빌드 시 주입돼 있으면 그 값 사용 (강제 override용)
 * 2) hostname이 *.github.io → Vercel 백엔드로 절대 경로 (CORS 교차 요청)
 * 3) hostname이 *.vercel.app → Vercel 서비스 내부 /_/backend 라우트
 * 4) 그 외(로컬) → /api/v1 (vite dev proxy가 :8000으로 포워드)
 */
const VERCEL_BACKEND_ABS = "https://seolhaeone.vercel.app/_/backend/api/v1";
const VERCEL_BACKEND_REL = "/_/backend/api/v1";

function detectApiBase(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host.endsWith(".github.io")) return VERCEL_BACKEND_ABS;
    if (host.endsWith(".vercel.app")) return VERCEL_BACKEND_REL;
  }
  return "/api/v1";
}

const API_BASE = detectApiBase();

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 토큰 만료/무효 시 AuthContext가 구독하여 자동 로그아웃. */
export const AUTH_EXPIRED_EVENT = "auth:expired";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // /auth/login 자체의 401은 자격증명 오류이므로 세션 expire 이벤트 발생시키지 않음.
    const isLoginAttempt = path.startsWith("/auth/login");
    if (!isLoginAttempt) {
      localStorage.removeItem("token");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>(path + (params ? qs(params) : "")),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
