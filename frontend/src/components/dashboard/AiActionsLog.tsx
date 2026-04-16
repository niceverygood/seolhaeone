import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/Spinner";
import type { AiActionItem } from "@/lib/types";

const statusStyle: Record<string, string> = {
  "승인": "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
  "실행": "bg-gold/15 text-gold-dark",
  "대기": "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
  "무시": "bg-gray-100 text-text-muted",
};

type Props = {
  data: AiActionItem[];
  loading?: boolean;
  onRefresh?: () => void;
};

export function AiActionsLog({ data, loading, onRefresh }: Props) {
  if (loading) return <Spinner />;

  return (
    <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-text-dark">최근 AI 액션</h2>
        <button onClick={onRefresh} className="text-xs font-medium text-gold-dark hover:underline">
          새로고침
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-light text-left text-[11px] uppercase tracking-wider text-text-muted">
            <th className="pb-2 font-medium">시각</th>
            <th className="pb-2 font-medium">유형</th>
            <th className="pb-2 font-medium">대상</th>
            <th className="pb-2 text-right font-medium">상태</th>
          </tr>
        </thead>
        <tbody>
          {data.map((a) => {
            const time = a.created_at
              ? new Date(a.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
              : "-";
            return (
              <tr key={a.id} className="border-b border-border-light/60 last:border-0">
                <td className="py-3 font-mono text-xs text-text-muted">{time}</td>
                <td className="py-3 text-text-dark">{a.type}</td>
                <td className="py-3 text-text-dark">{a.target_customer_name ?? "-"}</td>
                <td className="py-3 text-right">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                      statusStyle[a.status] ?? "",
                    )}
                  >
                    {a.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
