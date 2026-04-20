import { useState, useCallback } from "react";
import { Search, Filter, ArrowUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCustomers } from "@/hooks/useCustomers";
import { GradeBadge } from "@/components/customers/GradeBadge";
import { ChurnGauge } from "@/components/customers/ChurnGauge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import type { CustomerGrade } from "@/lib/types";

const gradeOrder: CustomerGrade[] = ["diamond", "gold", "silver", "member"];

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<CustomerGrade | "all">("all");
  const [sortKey, setSortKey] = useState("-clv");

  const toggleSort = (key: string) => {
    if (sortKey === `-${key}`) setSortKey(key);
    else setSortKey(`-${key}`);
  };

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebouncedSearch(val), 300);
    setTimer(t);
  }, [timer]);

  const { data, loading, error, refetch } = useCustomers({
    grade: gradeFilter !== "all" ? gradeFilter : undefined,
    search: debouncedSearch || undefined,
    sort: sortKey,
    limit: 50,
  });

  const fmt = (n: number) => `₩${(n / 1_000_000).toFixed(1)}M`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="이름 또는 전화번호로 검색..."
            className="h-10 w-full max-w-md rounded-lg border border-border-light bg-surface-white pl-10 pr-4 text-sm placeholder:text-text-muted focus:border-gold focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border-light bg-surface-white p-1">
          <Filter className="ml-2 h-4 w-4 text-text-muted" />
          {(["all", ...gradeOrder] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                gradeFilter === g
                  ? "bg-gold text-text-on-gold"
                  : "text-text-muted hover:text-text-dark",
              )}
            >
              {g === "all" ? "전체" : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <span className="flex items-center gap-2 text-sm text-text-muted">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />}
          {data ? `${data.total}명` : loading ? "불러오는 중..." : "0명"}
        </span>
      </div>

      {/* Table — 데이터가 이미 있으면 로딩 중에도 그대로 유지 (SWR) */}
      {error && !data ? (
        <ErrorAlert message={error} onRetry={refetch} />
      ) : !data ? (
        <TableSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState message="조건에 맞는 고객이 없습니다." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-light bg-surface-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-light text-left text-[11px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-medium">고객</th>
                  <th className="px-4 py-3 font-medium">등급</th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("clv")}>
                    <span className="flex items-center gap-1">CLV <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-4 py-3 font-medium">방문</th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("last_visit_at")}>
                    <span className="flex items-center gap-1">최근 방문 <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("churn_risk")}>
                    <span className="flex items-center gap-1">이탈 위험 <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="px-4 py-3 font-medium">AI 태그</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="cursor-pointer border-b border-border-light/60 transition-colors hover:bg-gold-bg/20 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-dark">{c.name}</div>
                      <div className="text-xs text-text-muted">{c.phone}</div>
                    </td>
                    <td className="px-4 py-3"><GradeBadge grade={c.grade} /></td>
                    <td className="px-4 py-3 font-mono text-text-dark">{fmt(c.clv)}</td>
                    <td className="px-4 py-3 text-center text-text-dark">{c.total_visits}회</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {c.last_visit_at ? c.last_visit_at.slice(0, 10) : "-"}
                    </td>
                    <td className="px-4 py-3"><ChurnGauge value={c.churn_risk} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.ai_tags.slice(0, 2).map((t) => (
                          <span key={t} className="rounded-full bg-gold-bg px-2 py-0.5 text-[10px] font-medium text-gold-dark">
                            {t}
                          </span>
                        ))}
                        {c.ai_tags.length > 2 && (
                          <span className="text-[10px] text-text-muted">+{c.ai_tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border-light bg-surface-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="divide-y divide-border-light/60">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-6 w-28 animate-pulse rounded bg-surface-light" />
            <div className="h-6 w-16 animate-pulse rounded bg-surface-light" />
            <div className="ml-auto h-4 w-24 animate-pulse rounded bg-surface-light" />
          </div>
        ))}
      </div>
    </div>
  );
}
