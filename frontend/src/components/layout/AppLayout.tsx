import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { prefetch } from "@/hooks/useFetch";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Spinner } from "@/components/ui/Spinner";

const titleMap: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": {
    title: "대시보드",
    subtitle: "오늘의 운영 현황과 AI 인사이트",
  },
  "/golf": { title: "골프 예약", subtitle: "티타임 & 캐디 스케줄" },
  "/resort": { title: "객실 예약", subtitle: "건물별 점유 현황" },
  "/customers": { title: "고객 관리", subtitle: "회원 360° 뷰" },
  "/ai": { title: "AI 어시스턴트", subtitle: "자연어로 데이터에 질문하세요" },
  "/settings": { title: "설정" },
};

// 사이드바에서 자주 이동하는 경로를 백그라운드 프리페치.
// useFetch 캐시에 적재되어 실제 페이지 진입 시 즉시 렌더.
const PREFETCH: Array<[string, Record<string, string | number> | undefined]> = [
  ["/dashboard/kpi", { period: "monthly" }],
  ["/dashboard/customer-stats", undefined],
  ["/ai/suggestions", undefined],
  ["/customers", { limit: 50, sort: "-clv" }],
  ["/golf/courses", undefined],
  ["/resort/rooms", { building: "마운틴스테이" }],
];

// requestIdleCallback 폴백 — 브라우저가 바쁠 때 양보
const scheduleIdle = (fn: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 1500 });
  else window.setTimeout(fn, 200);
};

export function AppLayout() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  // 로그인 직후 주변 페이지 데이터 프리페치 (1회).
  // 유휴 시간에 병렬로 — 현재 페이지 렌더를 막지 않음.
  useEffect(() => {
    if (!user) return;
    scheduleIdle(() => {
      for (const [p, q] of PREFETCH) void prefetch(p, q);
    });
  }, [user]);

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;

  const meta = titleMap[pathname]
    ?? (pathname.startsWith("/customers/") ? { title: "고객 프로필", subtitle: "360° 뷰" } : { title: "설해원" });

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-surface-light">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
