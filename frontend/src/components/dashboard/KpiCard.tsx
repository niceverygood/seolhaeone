import { TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  delta: string;
  deltaType: "up" | "down";
  spark: number[];
};

export function KpiCard({ label, value, delta, deltaType, spark }: Props) {
  const data = spark.map((v, i) => ({ i, v }));
  const isUp = deltaType === "up";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div className="text-sm font-medium text-text-muted">{label}</div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-semibold",
            isUp ? "text-[color:var(--color-success)]" : "text-[color:var(--color-danger)]",
          )}
        >
          {isUp ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {delta}
        </div>
      </div>

      <div className="mt-4 font-display text-[28px] leading-tight text-text-dark">
        {value}
      </div>

      <div className="mt-4 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="var(--color-gold)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
