import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCourses, useTeetimes } from "@/hooks/useGolf";
import { TeetimeSlotCard } from "@/components/golf/TeetimeSlotCard";
import { GolfAiPanel } from "@/components/golf/GolfAiPanel";
import { ReserveTeetimeModal } from "@/components/golf/ReserveTeetimeModal";
import { CustomerQuickModal } from "@/components/customers/CustomerQuickModal";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import type { TeetimeResponse } from "@/lib/types";

const timeSlots: string[] = [];
for (let h = 6; h <= 17; h++) {
  for (const m of [0, 30]) {
    if (h === 17 && m === 30) continue;
    timeSlots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

function formatDateKR(d: Date) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Golf() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { data: courses, error: coursesError, refetch } = useCourses();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  const courseId = activeCourseId ?? courses?.[0]?.id ?? "";
  const dateStr = toDateStr(selectedDate);
  const { data: teetimes, loading: ttLoading, refetch: refetchTeetimes } =
    useTeetimes(dateStr, courseId || undefined);
  const [reservingSlot, setReservingSlot] = useState<TeetimeResponse | null>(null);
  const [quickViewCustomerId, setQuickViewCustomerId] = useState<string | null>(null);

  const slotMap = useMemo(() => {
    const map = new Map<string, TeetimeResponse>();
    if (teetimes) {
      for (const t of teetimes) {
        map.set(t.tee_time, t);
      }
    }
    return map;
  }, [teetimes]);

  const filtered = teetimes ?? [];
  const bookedCount = filtered.filter((s) => s.status === "reserved" || s.status === "completed").length;
  const totalCount = timeSlots.length;
  const highRiskCount = filtered.filter((s) => s.noshow_score > 0.3).length;

  const prevDay = () => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });

  if (coursesError && !courses) return <ErrorAlert message={coursesError} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-light bg-surface-white hover:bg-surface-light">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-gold" />
            <span className="font-display text-lg text-text-dark">{formatDateKR(selectedDate)}</span>
          </div>
          <button onClick={nextDay} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-light bg-surface-white hover:bg-surface-light">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Course tabs */}
        <div className="flex rounded-lg border border-border-light bg-surface-white p-1">
          {(courses ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCourseId(c.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                courseId === c.id
                  ? "bg-gold text-text-on-gold"
                  : "text-text-muted hover:text-text-dark",
              )}
            >
              {c.name} ({c.holes}홀)
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-text-muted">예약 </span>
            <span className="font-semibold text-text-dark">{bookedCount}</span>
            <span className="text-text-muted">/{totalCount}</span>
          </div>
          <div className="h-4 w-px bg-border-light" />
          <div>
            <span className="text-text-muted">점유율 </span>
            <span className="font-semibold text-gold-dark">
              {totalCount > 0 ? Math.round((bookedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          {highRiskCount > 0 && (
            <>
              <div className="h-4 w-px bg-border-light" />
              <div className="flex items-center gap-1 text-[color:var(--color-danger)]">
                <span className="font-semibold">{highRiskCount}</span>
                <span className="text-xs">노쇼 위험</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main: teesheet + AI panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border-light bg-surface-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-[72px_1fr] divide-x divide-border-light">
            <div className="border-b border-border-light bg-surface-light px-3 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">시간</span>
            </div>
            <div className="border-b border-border-light bg-surface-light px-4 py-3">
              <span className="text-sm font-semibold text-text-dark">
                {courses?.find((c) => c.id === courseId)?.name ?? ""}코스
              </span>
            </div>
          </div>

          <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
            {ttLoading ? (
              <Spinner />
            ) : (
              timeSlots.map((t) => {
                const slot = slotMap.get(t);
                return (
                  <div
                    key={t}
                    className="grid grid-cols-[72px_1fr] divide-x divide-border-light/60 border-b border-border-light/60 last:border-0"
                  >
                    <div className="flex items-center justify-center py-2">
                      <span className="font-mono text-xs text-text-muted">{t}</span>
                    </div>
                    <div className="p-1.5">
                      {slot ? (
                        <TeetimeSlotCard
                          slot={slot}
                          onReserveClick={setReservingSlot}
                          onCustomerClick={setQuickViewCustomerId}
                        />
                      ) : (
                        <div className="flex h-full min-h-[68px] items-center justify-center rounded-lg border border-dashed border-border-light bg-surface-white text-xs text-text-muted">
                          -
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <GolfAiPanel />
        </div>
      </div>

      {reservingSlot && (
        <ReserveTeetimeModal
          slot={reservingSlot}
          onClose={() => setReservingSlot(null)}
          onReserved={() => refetchTeetimes()}
        />
      )}

      {quickViewCustomerId && (
        <CustomerQuickModal
          customerId={quickViewCustomerId}
          onClose={() => setQuickViewCustomerId(null)}
        />
      )}
    </div>
  );
}
