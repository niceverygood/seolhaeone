import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DonutCard } from "@/components/dashboard/DonutCard";
import { AiInsightsPanel } from "@/components/dashboard/AiInsightsPanel";
import { AiQueryBar } from "@/components/dashboard/AiQueryBar";
import { AiActionsLog } from "@/components/dashboard/AiActionsLog";
import { courseRevenue, gradeDistribution, kpis } from "@/lib/mockData";

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* KPI row */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ key, ...rest }) => (
          <KpiCard key={key} {...rest} />
        ))}
      </section>

      {/* AI query bar */}
      <AiQueryBar />

      {/* Main grid: chart + insights */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <AiInsightsPanel />
        </div>
      </section>

      {/* Bottom row: distributions + action log */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DonutCard
          title="코스별 매출"
          unit="이번 달 · 단위: 백만 원"
          data={courseRevenue}
        />
        <DonutCard
          title="고객 등급 분포"
          unit="활성 회원 기준"
          data={gradeDistribution}
        />
        <AiActionsLog />
      </section>
    </div>
  );
}
