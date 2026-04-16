import { cn } from "@/lib/cn";

export function ChurnGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 60
      ? "text-[color:var(--color-danger)] bg-[color:var(--color-danger)]"
      : pct >= 30
        ? "text-[color:var(--color-warning)] bg-[color:var(--color-warning)]"
        : "text-[color:var(--color-success)] bg-[color:var(--color-success)]";

  const label = pct >= 60 ? "높음" : pct >= 30 ? "중간" : "낮음";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-light">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-xs font-semibold", color.split(" ")[0])}>
        {pct}% ({label})
      </span>
    </div>
  );
}
