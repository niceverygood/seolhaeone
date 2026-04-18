import { useState } from "react";
import { Check, Pencil, X, Loader2 } from "lucide-react";
import { respondToAction, type ActionStatus } from "@/hooks/useAi";
import { ApiError } from "@/lib/api";

type Size = "sm" | "md";

type Props = {
  /** 제안 ID (sug-*) 또는 DB AiActionLog UUID */
  suggestionId: string;
  /** 응답 후 부모에게 알림 — 보통 해당 카드 숨김 처리용 */
  onResponded?: (status: ActionStatus) => void;
  size?: Size;
};

/**
 * AI 제안 카드 하단의 승인/수정/무시 버튼 묶음.
 * - 승인: status=approved 로 기록
 * - 수정: prompt로 note 입력 받아 status=approved + note 저장
 * - 무시: status=dismissed 로 기록
 * 응답 성공 시 onResponded 콜백 호출 (보통 카드 제거).
 */
export function AiActionButtons({ suggestionId, onResponded, size = "md" }: Props) {
  const [loading, setLoading] = useState<ActionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const heightCls = size === "sm" ? "h-6 text-[11px] px-2" : "h-7 text-xs px-2.5";
  const iconCls = "h-3 w-3";

  const submit = async (status: ActionStatus, note?: string) => {
    setLoading(status);
    setError(null);
    try {
      await respondToAction(suggestionId, status, note);
      onResponded?.(status);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `[${err.status}] ${err.message}`
          : err instanceof Error
          ? err.message
          : String(err);
      setError(msg);
    } finally {
      setLoading(null);
    }
  };

  const handleEdit = () => {
    const note = window.prompt("수정/메모를 입력하세요 (빈칸이면 취소):");
    if (note && note.trim()) void submit("approved", note.trim());
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => void submit("approved")}
          disabled={loading !== null}
          className={`flex ${heightCls} shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-gold font-medium text-text-on-gold hover:bg-gold-dark disabled:opacity-50`}
        >
          {loading === "approved" ? <Loader2 className={`${iconCls} animate-spin`} /> : <Check className={iconCls} />}
          승인
        </button>
        <button
          type="button"
          onClick={handleEdit}
          disabled={loading !== null}
          className={`flex ${heightCls} shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border-light bg-surface-white font-medium text-text-dark hover:bg-surface-light disabled:opacity-50`}
        >
          <Pencil className={iconCls} /> 수정
        </button>
        <button
          type="button"
          onClick={() => void submit("dismissed")}
          disabled={loading !== null}
          className={`flex ${heightCls} shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-border-light bg-surface-white font-medium text-text-muted hover:bg-surface-light disabled:opacity-50`}
        >
          {loading === "dismissed" ? <Loader2 className={`${iconCls} animate-spin`} /> : <X className={iconCls} />}
          무시
        </button>
      </div>
      {error && (
        <span className="text-[10px] text-[color:var(--color-danger)]">{error}</span>
      )}
    </div>
  );
}
