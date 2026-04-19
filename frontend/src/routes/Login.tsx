import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { LogoMark } from "@/components/brand/Logo";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 콜드스타트 완화 — 페이지 진입 시 백엔드와 DB 커넥션 풀을 미리 깨워둠.
  // 사용자가 비밀번호 입력하는 동안 서버 + SSL 핸드셰이크 + 커넥션 준비 완료.
  useEffect(() => {
    void api.get("/auth/warmup").catch(() => {});
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setError("");
    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        else setError(`[${err.status}] ${err.message}`);
      } else {
        setError(`서버에 연결할 수 없습니다: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void doLogin(email, password);
  };

  const handleTestLogin = () => {
    setEmail("admin@seolhaeone.kr");
    setPassword("seolhae1234");
    void doLogin("admin@seolhaeone.kr", "seolhae1234");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <div className="w-full max-w-sm space-y-8 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <LogoMark size={64} color="#c5a55a" />
          <h1 className="mt-5 font-display text-3xl text-white">Seolhaewon</h1>
          <p className="mt-1 font-display text-sm tracking-[0.3em] text-gold">
            雪 海 園
          </p>
          <p className="mt-6 text-sm text-text-secondary">AI CRM 시스템에 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@seolhaeone.kr"
              className="h-11 w-full rounded-lg border border-border-subtle bg-bg-secondary px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="비밀번호 입력"
              className="h-11 w-full rounded-lg border border-border-subtle bg-bg-secondary px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[color:var(--color-danger)]/10 px-3 py-2 text-xs font-medium text-[color:var(--color-danger)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-gold text-sm font-semibold text-text-on-gold transition-colors hover:bg-gold-dark disabled:opacity-50"
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>

          <button
            type="button"
            onClick={handleTestLogin}
            disabled={submitting}
            className="h-10 w-full rounded-lg border border-gold/40 bg-transparent text-xs font-medium text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
          >
            테스트 계정으로 바로 로그인
          </button>
        </form>

        <div className="space-y-3 text-center">
          <p className="text-[11px] text-text-muted">
            기본 계정: admin@seolhaeone.kr / seolhae1234
          </p>
          <a
            href={`${import.meta.env.BASE_URL}reserve`}
            className="inline-block text-sm font-medium text-gold hover:text-gold-light"
          >
            고객 온라인 예약 →
          </a>
        </div>
      </div>
    </div>
  );
}
