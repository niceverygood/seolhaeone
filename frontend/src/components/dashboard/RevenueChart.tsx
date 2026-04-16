import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { revenueTrend } from "@/lib/mockData";

export function RevenueChart() {
  return (
    <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-display text-lg text-text-dark">매출 추이</h2>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-gold" /> 실적
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-[2px] w-4 border-t-[2px] border-dashed border-gold" />
            AI 예측
          </span>
        </div>
      </div>
      <p className="mb-5 text-xs text-text-muted">단위: 백만 원</p>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C5A55A" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#C5A55A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DA" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #E5E2DA",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => (v == null ? "-" : `₩${v}M`)}
            />
            <Legend wrapperStyle={{ display: "none" }} />
            <Area
              type="monotone"
              dataKey="actual"
              name="실적"
              stroke="#C5A55A"
              strokeWidth={2.5}
              fill="url(#goldFill)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              name="AI 예측"
              stroke="#C5A55A"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              fill="none"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
