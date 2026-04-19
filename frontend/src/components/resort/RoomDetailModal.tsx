import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, BedDouble, Users, Sparkles, Loader2, Phone, LogIn, LogOut, ArrowRight,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";

type Reservation = {
  id: string;
  status: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_price: number;
  special_requests: string | null;
  dynamic_price_applied: boolean;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_grade: string | null;
};

type RoomDetail = {
  room: {
    id: string;
    building: string;
    room_type: string;
    room_number: string;
    floor: number;
    capacity: number;
    base_price: number;
    amenities: string[];
    status: string;
  };
  current: Reservation | null;
  upcoming: Reservation[];
  past: Reservation[];
  stats_30d: {
    occupied_nights: number;
    occupancy_rate: number;
    total_reservations: number;
  };
};

type Props = {
  roomId: string;
  onClose: () => void;
  onChanged: () => void;
};

const statusLabel: Record<string, string> = {
  pending: "확정 대기",
  confirmed: "예약 확정",
  checked_in: "체크인",
  checked_out: "체크아웃",
  cancelled: "취소됨",
};

const statusColor: Record<string, string> = {
  pending: "bg-[color:var(--color-warning)]/20 text-[color:var(--color-warning)]",
  confirmed: "bg-[color:var(--color-info)]/15 text-[color:var(--color-info)]",
  checked_in: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
  checked_out: "bg-gray-100 text-text-muted",
  cancelled: "bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]",
};

export function RoomDetailModal({ roomId, onClose, onChanged }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<RoomDetail>(`/resort/rooms/${roomId}/detail`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const performAction = async (path: string) => {
    setActing(true);
    try {
      await api.patch(path);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-surface-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-bg">
              <BedDouble className="h-5 w-5 text-gold-dark" />
            </div>
            <div>
              <h3 className="font-display text-lg text-text-dark">
                {data?.room.building ?? ""} {data?.room.room_number ?? ""}
              </h3>
              {data && (
                <p className="text-xs text-text-muted">
                  {data.room.room_type} · {data.room.floor}F · 최대 {data.room.capacity}인 · ₩
                  {data.room.base_price.toLocaleString()}/박
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surface-light"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : error ? (
            <p className="rounded-lg bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-[color:var(--color-danger)]">
              {error}
            </p>
          ) : !data ? null : (
            <div className="space-y-6">
              {/* 30일 점유 통계 */}
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-surface-light p-4">
                <StatBlock label="30일 점유" value={`${Math.round(data.stats_30d.occupancy_rate * 100)}%`} />
                <StatBlock label="점유 박수" value={`${data.stats_30d.occupied_nights}박`} />
                <StatBlock label="총 예약" value={`${data.stats_30d.total_reservations}건`} />
              </div>

              {/* Amenities */}
              {data.room.amenities.length > 0 && (
                <section>
                  <SectionTitle icon={<Sparkles className="h-4 w-4 text-gold" />} label="편의시설" />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.room.amenities.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-border-light bg-surface-white px-2.5 py-1 text-[11px] text-text-dark"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* 현재 투숙 */}
              <section>
                <SectionTitle icon={<Users className="h-4 w-4 text-gold" />} label="현재 투숙" />
                {data.current ? (
                  <ReservationRow
                    r={data.current}
                    onGotoCustomer={(cid) => {
                      onClose();
                      navigate(`/customers/${cid}`);
                    }}
                    actions={
                      <div className="flex gap-1.5">
                        {data.current.status === "pending" && (
                          <span className="text-[11px] font-medium text-[color:var(--color-warning)]">
                            알림 센터에서 확정 필요
                          </span>
                        )}
                        {data.current.status === "confirmed" && (
                          <button
                            disabled={acting}
                            onClick={() => performAction(`/resort/reservations/${data.current!.id}/checkin`)}
                            className="flex h-7 items-center gap-1 rounded-md bg-gold px-2.5 text-xs font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
                          >
                            <LogIn className="h-3 w-3" /> 체크인
                          </button>
                        )}
                        {data.current.status === "checked_in" && (
                          <button
                            disabled={acting}
                            onClick={() => performAction(`/resort/reservations/${data.current!.id}/checkout`)}
                            className="flex h-7 items-center gap-1 rounded-md border border-border-light bg-surface-white px-2.5 text-xs font-medium text-text-dark hover:bg-surface-light disabled:opacity-50"
                          >
                            <LogOut className="h-3 w-3" /> 체크아웃
                          </button>
                        )}
                      </div>
                    }
                  />
                ) : (
                  <p className="mt-2 rounded-lg bg-surface-light px-4 py-3 text-sm text-text-muted">
                    오늘 투숙 중인 고객이 없습니다.
                  </p>
                )}
              </section>

              {/* 예정 예약 */}
              <section>
                <SectionTitle label={`다가오는 예약 (${data.upcoming.length})`} />
                {data.upcoming.length === 0 ? (
                  <p className="mt-2 text-xs text-text-muted">예정된 예약이 없습니다.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {data.upcoming.map((r) => (
                      <ReservationRow
                        key={r.id}
                        r={r}
                        onGotoCustomer={(cid) => {
                          onClose();
                          navigate(`/customers/${cid}`);
                        }}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {/* 이용 이력 */}
              <section>
                <SectionTitle label={`최근 이용 이력 (${data.past.length})`} />
                {data.past.length === 0 ? (
                  <p className="mt-2 text-xs text-text-muted">이용 이력이 없습니다.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {data.past.map((r) => (
                      <ReservationRow
                        key={r.id}
                        r={r}
                        onGotoCustomer={(cid) => {
                          onClose();
                          navigate(`/customers/${cid}`);
                        }}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-lg text-text-dark">{value}</div>
      <div className="text-[11px] text-text-muted">{label}</div>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
      {icon}
      {label}
    </div>
  );
}

function ReservationRow({
  r,
  actions,
  onGotoCustomer,
}: {
  r: Reservation;
  actions?: React.ReactNode;
  onGotoCustomer: (cid: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-surface-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-text-dark">
              {r.customer_name ?? "미지정"}
            </span>
            {r.customer_grade && (
              <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold-dark">
                {r.customer_grade}
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                statusColor[r.status] ?? "bg-surface-light text-text-muted"
              }`}
            >
              {statusLabel[r.status] ?? r.status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] text-text-muted">
            <span>{r.check_in} → {r.check_out} ({r.nights}박)</span>
            <span>₩{r.total_price.toLocaleString()}</span>
            {r.dynamic_price_applied && (
              <span className="text-gold-dark">동적가격</span>
            )}
          </div>
          {r.customer_phone && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-text-muted">
              <Phone className="h-3 w-3" /> {r.customer_phone}
            </div>
          )}
          {r.special_requests && (
            <p className="mt-1.5 rounded bg-surface-light px-2 py-1 text-[11px] text-text-dark">
              요청: {r.special_requests}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {actions}
          {r.customer_id && (
            <button
              onClick={() => onGotoCustomer(r.customer_id!)}
              className="flex items-center gap-0.5 text-[11px] font-medium text-gold-dark hover:text-gold"
            >
              프로필 <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
