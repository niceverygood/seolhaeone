import { useMemo } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DonutCard } from "@/components/dashboard/DonutCard";
import { AiInsightsPanel } from "@/components/dashboard/AiInsightsPanel";
import { AiQueryBar } from "@/components/dashboard/AiQueryBar";
import { AiActionsLog } from "@/components/dashboard/AiActionsLog";
import { AiBriefingPanel } from "@/components/dashboard/AiBriefingPanel";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import {
  useKpi,
  useRevenue,
  useCustomerStats,
  useRecentAiActions,
} from "@/hooks/useDashboard";

const gradeColors: Record<string, string> = {
  diamond: "#C5A55A",
  gold: "#D4BA7A",
  silver: "#9CA3AF",
  member: "#E5E2DA",
};

const gradeLabels: Record<string, string> = {
  diamond: "Diamond",
  gold: "Gold",
  silver: "Silver",
  member: "Member",
};

export default function Dashboard() {
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: kpi, loading: kpiLoading, error: kpiError, refetch: refetchKpi } = useKpi();
  const { data: revenue, loading: revLoading } = useRevenue(
    sixMonthsAgo.toISOString().slice(0, 10),
    today.toISOString().slice(0, 10),
  );
  const { data: custStats, loading: custLoading } = useCustomerStats();
  const { data: aiActions, loading: actionsLoading, refetch: refetchActions } = useRecentAiActions();

  const kpis = useMemo(() => {
    if (!kpi) return [];
    const fmt = (n: number) => `₩ ${(n / 1_000_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}M`;
    return [
      {
        key: "revenue",
        label: "월 매출",
        value: fmt(kpi.revenue),
        delta: `${kpi.revenue_delta >= 0 ? "+" : ""}${kpi.revenue_delta}%`,
        deltaType: kpi.revenue_delta >= 0 ? "up" as const : "down" as const,
        spark: [] as number[],
      },
      {
        key: "rounds",
        label: "골프 라운드",
        value: kpi.golf_rounds.toLocaleString(),
        delta: `${kpi.rounds_delta >= 0 ? "+" : ""}${kpi.rounds_delta}%`,
        deltaType: kpi.rounds_delta >= 0 ? "up" as const : "down" as const,
        spark: [],
      },
      {
        key: "occupancy",
        label: "객실 점유율",
        value: `${(kpi.occupancy_rate * 100).toFixed(1)}%`,
        delta: `${kpi.occupancy_delta >= 0 ? "+" : ""}${kpi.occupancy_delta}%p`,
        deltaType: kpi.occupancy_delta >= 0 ? "up" as const : "down" as const,
        spark: [],
      },
      {
        key: "csat",
        label: "고객 만족도",
        value: "4.84 / 5.0",
        delta: "-0.02",
        deltaType: "down" as const,
        spark: [],
      },
    ];
  }, [kpi]);

  // Aggregate daily revenue into monthly for chart
  const revenueTrend = useMemo(() => {
    if (!revenue?.length) return [];
    const monthly: Record<string, { total: number; count: number }> = {};
    for (const r of revenue) {
      const month = r.date.slice(0, 7); // "YYYY-MM"
      if (!monthly[month]) monthly[month] = { total: 0, count: 0 };
      monthly[month].total += r.total;
      monthly[month].count++;
    }
    const monthNames = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { total }]) => ({
        month: monthNames[parseInt(key.split("-")[1]) - 1],
        actual: Math.round(total / 1_000_000),
        forecast: null as number | null,
      }));
  }, [revenue]);

  const courseRevenue = [
    { name: "레전드", value: 520, color: "#C5A55A" },
    { name: "오션", value: 410, color: "#D4BA7A" },
    { name: "마운틴", value: 354, color: "#A68B3E" },
  ];

  const gradeDistribution = useMemo(() => {
    if (!custStats) return [];
    return Object.entries(custStats).map(([grade, count]) => ({
      name: gradeLabels[grade] ?? grade,
      value: count,
      color: gradeColors[grade] ?? "#E5E2DA",
    }));
  }, [custStats]);

  if (kpiLoading && revLoading && custLoading) return <Spinner />;
  if (kpiError) return <ErrorAlert message={kpiError} onRetry={refetchKpi} />;

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
          <RevenueChart data={revenueTrend} />
        </div>
        <div>
          <AiInsightsPanel />
        </div>
      </section>

      {/* Middle row: distributions + AI briefing */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6">
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
        </div>
        <div className="xl:col-span-2">
          <AiBriefingPanel />
        </div>
      </section>

      {/* Bottom: action log */}
      <section>
        <AiActionsLog data={aiActions ?? []} loading={actionsLoading} onRefresh={refetchActions} />
      </section>
    </div>
  );
}
