import { useEffect, useState } from "react";
import { Flag, BedDouble, Check, X, Loader2, Inbox } from "lucide-react";
import {
  confirmNotification,
  listPendingNotifications,
  rejectNotification,
  type PendingNotification,
} from "@/hooks/useNotifications";
import { ApiError } from "@/lib/api";

type Props = {
  onClose: () => void;
  onChanged: () => void;
};

export function NotificationsPanel({ onClose, onChanged }: Props) {
  const [items, setItems] = useState<PendingNotification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listPendingNotifications());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handle = async (id: string, action: "confirm" | "reject") => {
    setActingId(id);
    try {
      if (action === "confirm") await confirmNotification(id);
      else await rejectNotification(id);
      setItems((prev) => (prev ?? []).filter((n) => n.id !== id));
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
    >
      <div
        className="absolute right-4 top-20 z-50 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border-light bg-surface-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <h3 className="font-display text-base text-text-dark">예약 알림</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surface-light"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
            </div>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-[color:var(--color-danger)]">{error}</p>
          ) : !items || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-muted">
              <Inbox className="mb-2 h-6 w-6" />
              <p className="text-sm">새 예약 알림이 없습니다.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border-light">
              {items.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  busy={actingId === n.id}
                  onAction={handle}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationItem({
  n,
  busy,
  onAction,
}: {
  n: PendingNotification;
  busy: boolean;
  onAction: (id: string, action: "confirm" | "reject") => void;
}) {
  const p = n.payload as Record<string, string | number | undefined>;
  const Icon = n.kind === "golf" ? Flag : BedDouble;
  const title =
    n.kind === "golf"
      ? `골프 · ${p.course_name ?? ""} ${p.tee_date ?? ""} ${p.tee_time ?? ""}`
      : `객실 · ${p.building ?? ""} ${p.room_type ?? ""}`;
  const detail =
    n.kind === "golf"
      ? `${p.customer_name} (${p.customer_phone}) · ${p.party_size}인`
      : `${p.customer_name} (${p.customer_phone}) · ${p.check_in} ~ ${p.check_out} · ${p.nights}박 · ₩${Number(p.total_price ?? 0).toLocaleString()}`;

  return (
    <li className="p-4">
      <div className="mb-2 flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-bg">
          <Icon className="h-4 w-4 text-gold-dark" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-dark">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{detail}</p>
          {p.special_requests ? (
            <p className="mt-1 rounded bg-surface-light px-2 py-1 text-[11px] text-text-dark">
              요청: {String(p.special_requests)}
            </p>
          ) : null}
          {p.notes ? (
            <p className="mt-1 rounded bg-surface-light px-2 py-1 text-[11px] text-text-dark">
              메모: {String(p.notes)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(n.id, "confirm")}
          className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-gold text-xs font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          확정
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAction(n.id, "reject")}
          className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-border-light bg-surface-white text-xs font-medium text-text-muted hover:bg-surface-light disabled:opacity-50"
        >
          <X className="h-3 w-3" /> 거절
        </button>
      </div>
    </li>
  );
}
