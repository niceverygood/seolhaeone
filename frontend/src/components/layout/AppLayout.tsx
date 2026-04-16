import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

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

export function AppLayout() {
  const { pathname } = useLocation();
  const meta = titleMap[pathname] ?? { title: "설해원" };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-surface-light">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="flex-1 overflow-y-auto px-10 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
