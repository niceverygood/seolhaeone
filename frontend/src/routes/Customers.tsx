import { useState } from "react";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { customers, type CustomerGrade } from "@/lib/mockCustomers";
import { GradeBadge } from "@/components/customers/GradeBadge";
import { ChurnGauge } from "@/components/customers/ChurnGauge";
import { useNavigate } from "react-router-dom";

const gradeOrder: CustomerGrade[] = ["diamond", "gold", "silver", "member"];

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<CustomerGrade | "all">("all");
  const [sortKey, setSortKey] = useState<"clv" | "churnRisk" | "lastVisitAt">("clv");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = customers
    .filter((c) => gradeFilter === "all" || c.grade === gradeFilter)
    .filter((c) => !search || c.name.includes(search) || c.phone.includes(search))
    .sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === "desc" ? -cmp : cmp;
    });

  const fmt = (n: number) => `₩${(n / 1_000_000).toFixed(1)}M`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 전화번호로 검색..."
            className="h-10 w-full max-w-md rounded-lg border border-border-light bg-surface-white pl-10 pr-4 text-sm placeholder:text-text-muted focus:border-gold focus:outline-none"
          />
        </div>

        {/* Grade filter */}
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

        <span className="text-sm text-text-muted">{filtered.length}명</span>
      </div>

      {/* Table */}
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
                <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("lastVisitAt")}>
                  <span className="flex items-center gap-1">최근 방문 <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="cursor-pointer px-4 py-3 font-medium" onClick={() => toggleSort("churnRisk")}>
                  <span className="flex items-center gap-1">이탈 위험 <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="px-4 py-3 font-medium">AI 태그</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((c) => (
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
                  <td className="px-4 py-3 text-center text-text-dark">{c.totalVisits}회</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{c.lastVisitAt}</td>
                  <td className="px-4 py-3"><ChurnGauge value={c.churnRisk} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.aiTags.slice(0, 2).map((t) => (
                        <span key={t} className="rounded-full bg-gold-bg px-2 py-0.5 text-[10px] font-medium text-gold-dark">
                          {t}
                        </span>
                      ))}
                      {c.aiTags.length > 2 && (
                        <span className="text-[10px] text-text-muted">+{c.aiTags.length - 2}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
