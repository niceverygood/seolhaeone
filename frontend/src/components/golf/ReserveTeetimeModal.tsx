import { useState } from "react";
import { X, Loader2, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useCustomers } from "@/hooks/useCustomers";
import type { TeetimeResponse } from "@/lib/types";

type Props = {
  slot: TeetimeResponse;
  onClose: () => void;
  onReserved: () => void;
};

/**
 * 골프 티타임 예약 모달.
 * 빈 슬롯에 고객을 배정해 status='reserved'로 업데이트한다.
 * - 고객 검색(이름/전화) → 선택 → party_size 지정 → 저장
 */
export function ReserveTeetimeModal({ slot, onClose, onReserved }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, loading } = useCustomers({ search: search || undefined, limit: 20 });
  const customers = data?.items ?? [];

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  const submit = async () => {
    if (!selectedId) {
      setError("고객을 선택해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/golf/teetimes/${slot.id}`, {
        status: "reserved",
        customer_id: selectedId,
        party_size: partySize,
      });
      onReserved();
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `[${err.status}] ${err.message}`
          : err instanceof Error
          ? err.message
          : String(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-surface-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg text-text-dark">티타임 예약</h3>
            <p className="mt-1 text-xs text-text-muted">
              {slot.tee_date} {slot.tee_time} 슬롯에 고객 배정
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-light"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-text-muted">
            고객 검색 (이름 또는 전화번호)
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedId(null);
              }}
              placeholder="김민수 또는 010-1234"
              className="h-10 w-full rounded-lg border border-border-light bg-surface-light pl-9 pr-3 text-sm text-text-dark placeholder:text-text-muted focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-border-light">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
            </div>
          ) : customers.length === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted">
              일치하는 고객이 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-border-light">
              {customers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-light ${
                      selectedId === c.id ? "bg-gold/15" : ""
                    }`}
                  >
                    <div>
                      <div className="font-medium text-text-dark">{c.name}</div>
                      <div className="text-[11px] text-text-muted">{c.phone}</div>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-text-muted">
                      {c.grade}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-text-muted">
            인원 수
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPartySize(n)}
                className={`h-9 flex-1 rounded-lg border text-sm font-medium transition-colors ${
                  partySize === n
                    ? "border-gold bg-gold text-text-on-gold"
                    : "border-border-light bg-surface-white text-text-dark hover:bg-surface-light"
                }`}
              >
                {n}명
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-[color:var(--color-danger)]/10 px-3 py-2 text-xs text-[color:var(--color-danger)]">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-lg border border-border-light bg-surface-white text-sm font-medium text-text-dark hover:bg-surface-light"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || !selected}
            className="flex h-10 flex-[2] items-center justify-center gap-1 rounded-lg bg-gold text-sm font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {selected ? `${selected.name} 예약` : "고객을 먼저 선택하세요"}
          </button>
        </div>
      </div>
    </div>
  );
}
