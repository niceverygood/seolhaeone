import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { courses, todaySlots } from "@/lib/mockGolf";
import { TeetimeSlotCard } from "@/components/golf/TeetimeSlotCard";
import { GolfAiPanel } from "@/components/golf/GolfAiPanel";

const timeSlots: string[] = [];
for (let h = 6; h <= 17; h++) {
  for (const m of [0, 30]) {
    if (h === 17 && m === 30) continue;
    timeSlots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export default function Golf() {
  const [activeCourse, setActiveCourse] = useState(courses[0].id);
  const [dateLabel] = useState("2026년 4월 16일 (수)");

  const filtered = todaySlots.filter((s) => s.courseId === activeCourse);
  const slotMap = new Map(filtered.map((s) => [s.time, s]));

  const bookedCount = filtered.filter((s) => s.status === "reserved").length;
  const totalCount = filtered.length;
  const highRiskCount = filtered.filter((s) => (s.noshowScore ?? 0) > 0.3).length;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Top bar: date + course tabs + stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-light bg-surface-white hover:bg-surface-light">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-gold" />
            <span className="font-display text-lg text-text-dark">{dateLabel}</span>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-light bg-surface-white hover:bg-surface-light">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Course tabs */}
        <div className="flex rounded-lg border border-border-light bg-surface-white p-1">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCourse(c.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeCourse === c.id
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
              {Math.round((bookedCount / totalCount) * 100)}%
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
        {/* Teesheet grid */}
        <div className="rounded-xl border border-border-light bg-surface-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-[72px_1fr] divide-x divide-border-light">
            {/* Time column header */}
            <div className="border-b border-border-light bg-surface-light px-3 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                시간
              </span>
            </div>
            {/* Course header */}
            <div className="border-b border-border-light bg-surface-light px-4 py-3">
              <span className="text-sm font-semibold text-text-dark">
                {courses.find((c) => c.id === activeCourse)?.name}코스
              </span>
            </div>
          </div>

          {/* Time rows */}
          <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
            {timeSlots.map((t) => {
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
                      <TeetimeSlotCard slot={slot} />
                    ) : (
                      <div className="flex h-full min-h-[68px] items-center justify-center rounded-lg border border-dashed border-border-light bg-surface-white text-xs text-text-muted">
                        -
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: AI panel */}
        <div className="space-y-4">
          <GolfAiPanel />
        </div>
      </div>
    </div>
  );
}
