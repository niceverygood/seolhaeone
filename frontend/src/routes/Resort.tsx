import { useState, useMemo } from "react";
import {
  BedDouble, CalendarDays, ChevronLeft, ChevronRight,
  LogIn, LogOut, Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useRooms, useReservations } from "@/hooks/useResort";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { api } from "@/lib/api";
import type { ReservationResponse, RoomResponse } from "@/lib/types";

const BUILDINGS = ["마운틴스테이", "설해온천", "골프텔"];

function formatDateKR(d: Date) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

const statusLabel: Record<string, string> = {
  confirmed: "예약 확정",
  checked_in: "체크인",
  checked_out: "체크아웃",
};

const statusColor: Record<string, string> = {
  confirmed: "bg-[color:var(--color-info)]/15 text-[color:var(--color-info)]",
  checked_in: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
  checked_out: "bg-gray-100 text-text-muted",
};

export default function Resort() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activeBuilding, setActiveBuilding] = useState(BUILDINGS[0]);
  const dateStr = toDateStr(selectedDate);

  const { data: rooms, loading: roomsLoading, error: roomsError, refetch: refetchRooms } = useRooms(activeBuilding);
  const { data: reservations, loading: resLoading, refetch: refetchRes } = useReservations(dateStr);

  const prevDay = () => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });

  // Build a map: room_id -> reservation for selected date
  const resMap = useMemo(() => {
    const map = new Map<string, ReservationResponse>();
    if (reservations) {
      for (const r of reservations) {
        if (r.building === activeBuilding) {
          map.set(r.room_id, r);
        }
      }
    }
    return map;
  }, [reservations, activeBuilding]);

  const occupiedCount = resMap.size;
  const totalRooms = rooms?.length ?? 0;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

  const handleCheckin = async (resId: string) => {
    await api.patch(`/resort/reservations/${resId}/checkin`);
    refetchRes();
  };

  const handleCheckout = async (resId: string) => {
    await api.patch(`/resort/reservations/${resId}/checkout`);
    refetchRes();
  };

  if (roomsLoading && resLoading) return <Spinner />;
  if (roomsError) return <ErrorAlert message={roomsError} onRetry={refetchRooms} />;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-light bg-surface-white hover:bg-surface-light">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gold" />
            <span className="font-display text-lg text-text-dark">{formatDateKR(selectedDate)}</span>
          </div>
          <button onClick={nextDay} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-light bg-surface-white hover:bg-surface-light">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Building tabs */}
        <div className="flex rounded-lg border border-border-light bg-surface-white p-1">
          {BUILDINGS.map((b) => (
            <button
              key={b}
              onClick={() => setActiveBuilding(b)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                activeBuilding === b
                  ? "bg-gold text-text-on-gold"
                  : "text-text-muted hover:text-text-dark",
              )}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-text-muted">객실 </span>
            <span className="font-semibold text-text-dark">{totalRooms}</span>
          </div>
          <div className="h-4 w-px bg-border-light" />
          <div>
            <span className="text-text-muted">점유 </span>
            <span className="font-semibold text-text-dark">{occupiedCount}</span>
          </div>
          <div className="h-4 w-px bg-border-light" />
          <div>
            <span className="text-text-muted">점유율 </span>
            <span className="font-semibold text-gold-dark">{occupancyRate}%</span>
          </div>
        </div>
      </div>

      {/* Room grid */}
      {!rooms?.length ? (
        <EmptyState message="해당 건물에 객실이 없습니다." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => {
            const res = resMap.get(room.id);
            return (
              <RoomCard
                key={room.id}
                room={room}
                reservation={res}
                onCheckin={handleCheckin}
                onCheckout={handleCheckout}
              />
            );
          })}
        </div>
      )}

      {/* Today's reservations table */}
      {reservations && reservations.filter((r) => r.building === activeBuilding).length > 0 && (
        <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="mb-4 font-display text-lg text-text-dark">오늘의 예약</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-light text-left text-[11px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-3 font-medium">객실</th>
                  <th className="px-4 py-3 font-medium">고객</th>
                  <th className="px-4 py-3 font-medium">체크인</th>
                  <th className="px-4 py-3 font-medium">체크아웃</th>
                  <th className="px-4 py-3 font-medium">금액</th>
                  <th className="px-4 py-3 text-right font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {reservations
                  .filter((r) => r.building === activeBuilding)
                  .map((r) => (
                    <tr key={r.id} className="border-b border-border-light/60 last:border-0">
                      <td className="px-4 py-3 font-medium text-text-dark">
                        {r.room_type} {r.room_number}
                      </td>
                      <td className="px-4 py-3 text-text-dark">{r.customer_name ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{r.check_in}</td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{r.check_out}</td>
                      <td className="px-4 py-3 font-mono text-text-dark">
                        ₩{r.total_price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          statusColor[r.status] ?? "",
                        )}>
                          {statusLabel[r.status] ?? r.status}
                        </span>
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

function RoomCard({
  room,
  reservation,
  onCheckin,
  onCheckout,
}: {
  room: RoomResponse;
  reservation?: ReservationResponse;
  onCheckin: (id: string) => void;
  onCheckout: (id: string) => void;
}) {
  const isOccupied = !!reservation;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md",
        isOccupied
          ? "border-gold/40 bg-gold-bg/30"
          : "border-border-light bg-surface-white",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BedDouble className={cn("h-4 w-4", isOccupied ? "text-gold-dark" : "text-text-muted")} />
          <span className="font-semibold text-text-dark">{room.room_number}</span>
        </div>
        <span className={cn(
          "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
          isOccupied
            ? "bg-gold/15 text-gold-dark"
            : "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
        )}>
          {isOccupied ? "점유" : "빈 객실"}
        </span>
      </div>

      <div className="mb-2 text-xs text-text-muted">
        {room.room_type} · {room.floor}F · <Users className="inline h-3 w-3" /> {room.capacity}
      </div>

      <div className="mb-3 font-mono text-sm text-text-dark">
        ₩{room.base_price.toLocaleString()}/박
      </div>

      {reservation && (
        <div className="space-y-2 border-t border-border-light/60 pt-3">
          <div className="text-sm font-medium text-text-dark">{reservation.customer_name}</div>
          <div className="font-mono text-[11px] text-text-muted">
            {reservation.check_in} → {reservation.check_out}
          </div>
          <div className="flex gap-1">
            {reservation.status === "confirmed" && (
              <button
                onClick={() => onCheckin(reservation.id)}
                className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md bg-gold text-xs font-medium text-text-on-gold hover:bg-gold-dark"
              >
                <LogIn className="h-3 w-3" /> 체크인
              </button>
            )}
            {reservation.status === "checked_in" && (
              <button
                onClick={() => onCheckout(reservation.id)}
                className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-border-light bg-surface-white text-xs font-medium text-text-dark hover:bg-surface-light"
              >
                <LogOut className="h-3 w-3" /> 체크아웃
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
