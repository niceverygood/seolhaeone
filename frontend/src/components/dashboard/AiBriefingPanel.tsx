import {
  Sunrise, AlertTriangle, TrendingUp, Diamond, CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useBriefing, useRevenueOptimization } from "@/hooks/useAiEngine";
import { Spinner } from "@/components/ui/Spinner";

export function AiBriefingPanel() {
  const { data: briefing, loading: bLoading } = useBriefing();
  const { data: revOpt, loading: rLoading } = useRevenueOptimization();

  if (bLoading && rLoading) return <Spinner />;

  const fmt = (n: number) => `₩${(n / 1_000_000).toFixed(1)}M`;

  return (
    <div className="space-y-6">
      {/* Daily Briefing */}
      {briefing && (
        <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <Sunrise className="h-5 w-5 text-gold" />
            <h2 className="font-display text-lg text-text-dark">오늘의 AI 브리핑</h2>
            <span className="ml-auto font-mono text-[11px] text-text-muted">{briefing.date}</span>
          </div>

          {/* Revenue summary */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-light p-3">
              <div className="text-[11px] text-text-muted">어제 매출</div>
              <div className="font-display text-lg text-text-dark">
                {fmt(briefing.yesterday_revenue)}
              </div>
            </div>
            <div className="rounded-lg bg-gold-bg/40 p-3">
              <div className="text-[11px] text-text-muted">내일 예약</div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-lg text-text-dark">
                  골프 {briefing.tomorrow_forecast.golf_bookings}
                </span>
                <span className="text-xs text-text-muted">
                  객실 {briefing.tomorrow_forecast.room_checkins}
                </span>
              </div>
            </div>
          </div>

          {/* VIP Arrivals */}
          {briefing.operations.vip_arrivals.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                VIP 방문 예정
              </div>
              <div className="flex flex-wrap gap-2">
                {briefing.operations.vip_arrivals.map((v) => (
                  <span
                    key={v.name}
                    className="flex items-center gap-1 rounded-full bg-gold-bg px-2.5 py-1 text-xs font-medium text-gold-dark"
                  >
                    <Diamond className="h-3 w-3" /> {v.name}
                    <span className="text-[9px] uppercase opacity-70">{v.grade}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              오늘의 할 일
            </div>
            {briefing.tasks.map((task, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  task.priority === "high"
                    ? "bg-[color:var(--color-danger)]/8 text-[color:var(--color-danger)]"
                    : "bg-surface-light text-text-dark",
                )}
              >
                {task.priority === "high" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 shrink-0 text-text-muted" />
                )}
                {task.task}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Optimization */}
      {revOpt && (
        <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gold" />
            <h2 className="font-display text-lg text-text-dark">매출 최적화</h2>
          </div>

          <p className="mb-4 text-sm font-medium text-gold-dark">{revOpt.summary}</p>

          {/* Forecast */}
          {revOpt.tomorrow_forecast && (
            <div className="mb-4 rounded-lg bg-surface-light p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase text-text-muted">
                내일({revOpt.tomorrow_forecast.day_of_week}) 수요 예측
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="font-display text-base text-text-dark">
                    {revOpt.tomorrow_forecast.predicted_golf_rounds}
                  </div>
                  <div className="text-text-muted">골프 라운드</div>
                </div>
                <div>
                  <div className="font-display text-base text-text-dark">
                    {(revOpt.tomorrow_forecast.predicted_occupancy * 100).toFixed(0)}%
                  </div>
                  <div className="text-text-muted">점유율</div>
                </div>
                <div>
                  <div className="font-display text-base text-text-dark">
                    {fmt(revOpt.tomorrow_forecast.predicted_revenue)}
                  </div>
                  <div className="text-text-muted">예상 매출</div>
                </div>
              </div>
              <div className="mt-2 text-center">
                <span className={cn(
                  "text-[10px] font-semibold",
                  revOpt.tomorrow_forecast.trend >= 0
                    ? "text-[color:var(--color-success)]"
                    : "text-[color:var(--color-danger)]",
                )}>
                  전주 대비 {revOpt.tomorrow_forecast.trend >= 0 ? "+" : ""}{revOpt.tomorrow_forecast.trend}%
                  · 신뢰도 {(revOpt.tomorrow_forecast.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="space-y-2">
            {revOpt.insights.map((insight, i) => (
              <div key={i} className="rounded-lg border border-gold/20 bg-gold-bg/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-dark">{insight.title}</span>
                  <span className="font-mono text-[10px] text-gold-dark">{insight.impact}</span>
                </div>
                <p className="mt-1 text-xs text-text-muted">{insight.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
