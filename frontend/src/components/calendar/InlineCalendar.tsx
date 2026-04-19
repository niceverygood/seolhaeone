import { memo, useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useFetch } from "@/hooks/useFetch";

type AvailabilityMap = Record<string, { available: number; total: number }>;

type Mode = "single" | "range";

type Props = {
  mode: Mode;
  serviceType: "golf" | "room";
  courseId?: string;
  selected?: string;
  rangeStart?: string;
  rangeEnd?: string;
  onSelect?: (date: string) => void;
  onRangeSelect?: (start: string, end: string) => void;
  minDate?: string;
};

function fmtMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── 개별 day 셀 — memo로 감싸서 선택/범위에 영향 받는 셀만 재렌더링 ───
type DayCellProps = {
  dStr: string;
  dayNum: number;
  dow: number;
  inMonth: boolean;
  disabled: boolean;
  isToday: boolean;
  isSelected: boolean;
  inRange: boolean;
  edge: "start" | "end" | null;
  available: number | null;
  onClick: (dStr: string) => void;
};

const DayCell = memo(function DayCell({
  dStr, dayNum, dow, inMonth, disabled, isToday,
  isSelected, inRange, edge, available, onClick,
}: DayCellProps) {
  let availBadge = "";
  let availText = "";
  if (available !== null && inMonth && !disabled) {
    if (available === 0) {
      availBadge = "bg-gray-100 text-text-muted";
      availText = "매진";
    } else if (available <= 3) {
      availBadge = "bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)]";
      availText = `${available}개`;
    } else if (available <= 8) {
      availBadge = "bg-[color:var(--color-warning)]/20 text-[color:var(--color-warning)]";
      availText = `${available}개`;
    } else {
      availBadge = "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]";
      availText = `${available}개`;
    }
  }

  return (
    <button
      onClick={() => !disabled && onClick(dStr)}
      disabled={disabled || available === 0}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-sm transition-colors",
        !inMonth && "opacity-0 pointer-events-none",
        disabled && inMonth && "cursor-not-allowed opacity-40",
        !disabled && !inRange && !isSelected && "hover:bg-gold-bg/30",
        isSelected && "bg-gold text-text-on-gold",
        edge === "start" && "bg-gold text-text-on-gold",
        edge === "end" && "bg-gold text-text-on-gold",
        inRange && !edge && "bg-gold-bg/60",
        isToday && !isSelected && !edge && "ring-2 ring-gold/40",
      )}
    >
      <span className={cn(
        "font-mono text-xs font-semibold leading-tight",
        dow === 0 && !isSelected && !edge && "text-[color:var(--color-danger)]",
        dow === 6 && !isSelected && !edge && "text-[color:var(--color-info)]",
      )}>
        {dayNum}
      </span>
      {availText && !isSelected && !edge && (
        <span className={cn(
          "mt-0.5 rounded-full px-1 py-0 text-[9px] font-medium leading-tight",
          availBadge,
        )}>
          {availText}
        </span>
      )}
      {(isSelected || edge) && (
        <span className="mt-0.5 text-[9px] font-semibold leading-tight">
          선택됨
        </span>
      )}
    </button>
  );
});

export function InlineCalendar({
  mode,
  serviceType,
  courseId,
  selected,
  rangeStart,
  rangeEnd,
  onSelect,
  onRangeSelect,
  minDate,
}: Props) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const month = fmtMonth(viewDate);
  const today = fmtDate(new Date());
  const minD = minDate ?? today;

  const endpoint = serviceType === "golf"
    ? "/public/golf/availability"
    : "/public/rooms/availability";
  // params 객체 identity를 안정화 — useFetch가 key 비교를 JSON.stringify로 하지만
  // 참조 안정성이 있으면 React 계열 훅에서의 불필요한 작업을 더 줄일 수 있음
  const params = useMemo(
    () => serviceType === "golf" && courseId ? { month, course_id: courseId } : { month },
    [serviceType, courseId, month],
  );
  const { data: availability } = useFetch<AvailabilityMap>(endpoint, params);

  // 달 전체 셀 42개 계산 — viewDate가 바뀔 때만 재계산
  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const mon = viewDate.getMonth();
    const firstDay = new Date(year, mon, 1);
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(startOfWeek.getDate() - firstDay.getDay());

    const cells: Array<{ dStr: string; dayNum: number; dow: number; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      cells.push({
        dStr: fmtDate(d),
        dayNum: d.getDate(),
        dow: d.getDay(),
        inMonth: d.getMonth() === mon,
      });
    }
    return cells;
  }, [viewDate]);

  const prevMonth = useCallback(() => {
    setViewDate((v) => {
      const d = new Date(v);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, []);
  const nextMonth = useCallback(() => {
    setViewDate((v) => {
      const d = new Date(v);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, []);

  // 클릭 핸들러 — DayCell에 전달될 때 참조 안정성 확보
  const handleClick = useCallback((d: string) => {
    if (d < minD) return;
    if (mode === "single") {
      onSelect?.(d);
      return;
    }
    // Range mode
    if (!rangeStart || (rangeStart && rangeEnd)) {
      onRangeSelect?.(d, "");
    } else if (rangeStart && !rangeEnd) {
      if (d > rangeStart) onRangeSelect?.(rangeStart, d);
      else onRangeSelect?.(d, "");
    }
  }, [minD, mode, onSelect, onRangeSelect, rangeStart, rangeEnd]);

  return (
    <div className="rounded-2xl border border-border-light bg-surface-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-light"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-display text-lg text-text-dark">
          {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
        </div>
        <button
          onClick={nextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-light"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
          <div key={w} className={cn(i === 0 && "text-[color:var(--color-danger)]", i === 6 && "text-[color:var(--color-info)]")}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(({ dStr, dayNum, dow, inMonth }) => {
          const disabled = dStr < minD || !inMonth;
          const isSelected = mode === "single" && dStr === selected;
          const inRange = mode === "range" && Boolean(rangeStart) && (
            rangeEnd ? dStr >= (rangeStart as string) && dStr <= rangeEnd : dStr === rangeStart
          );
          const edge: "start" | "end" | null =
            mode === "range"
              ? dStr === rangeStart
                ? "start"
                : dStr === rangeEnd
                ? "end"
                : null
              : null;
          return (
            <DayCell
              key={dStr}
              dStr={dStr}
              dayNum={dayNum}
              dow={dow}
              inMonth={inMonth}
              disabled={disabled}
              isToday={dStr === today}
              isSelected={isSelected}
              inRange={inRange}
              edge={edge}
              available={availability?.[dStr]?.available ?? null}
              onClick={handleClick}
            />
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[color:var(--color-success)]" /> 여유
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[color:var(--color-warning)]" /> 보통
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[color:var(--color-danger)]" /> 임박
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-300" /> 매진
        </span>
      </div>

      {mode === "range" && (
        <p className="mt-3 text-center text-[11px] text-text-muted">
          {!rangeStart && "체크인 날짜를 선택하세요"}
          {rangeStart && !rangeEnd && "체크아웃 날짜를 선택하세요"}
          {rangeStart && rangeEnd && (
            <>
              <span className="font-semibold text-text-dark">{rangeStart}</span>
              {" → "}
              <span className="font-semibold text-text-dark">{rangeEnd}</span>
              {" · "}
              <span className="font-semibold text-gold-dark">
                {Math.ceil((new Date(rangeEnd).getTime() - new Date(rangeStart).getTime()) / (1000 * 60 * 60 * 24))}박
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
