import { useEffect, useState } from "react";
import { Sparkles, MessageSquare, Loader2, X, Copy, Check } from "lucide-react";
import { useCustomerSummary, generateCustomerMessages, type CustomerMessages } from "@/hooks/useAi";
import { ApiError } from "@/lib/api";

type Props = { customerId: string; customerName: string };

export function CustomerAiPanel({ customerId, customerName }: Props) {
  const { data: summary, loading } = useCustomerSummary(customerId);
  const [msgOpen, setMsgOpen] = useState(false);

  return (
    <div className="rounded-xl border-l-[3px] border-l-gold bg-gold-bg/30 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold-dark" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-dark">
          AI 요약
        </h3>
        <button
          type="button"
          onClick={() => setMsgOpen(true)}
          className="ml-auto flex items-center gap-1 rounded-md border border-gold/40 bg-surface-white px-2 py-0.5 text-[11px] font-medium text-gold-dark hover:bg-gold/10"
        >
          <MessageSquare className="h-3 w-3" /> 메시지 초안
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-text-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> 요약 생성 중...
        </div>
      ) : summary ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-dark">
          {summary.summary}
        </p>
      ) : (
        <p className="text-xs text-text-muted">요약을 불러오지 못했습니다.</p>
      )}

      {msgOpen && (
        <MessageDraftModal
          customerId={customerId}
          customerName={customerName}
          onClose={() => setMsgOpen(false)}
        />
      )}
    </div>
  );
}

function MessageDraftModal({
  customerId,
  customerName,
  onClose,
}: {
  customerId: string;
  customerName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<CustomerMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await generateCustomerMessages(customerId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-surface-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <div>
            <h3 className="font-display text-lg text-text-dark">메시지 초안</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              {customerName}님께 보낼 카카오톡/SMS 초안 3가지
            </p>
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
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : error ? (
            <p className="rounded-lg bg-[color:var(--color-danger)]/10 px-4 py-3 text-sm text-[color:var(--color-danger)]">
              {error}
            </p>
          ) : data ? (
            <div className="space-y-3">
              <ToneCard label="격식" value={data.messages.formal} />
              <ToneCard label="친근" value={data.messages.friendly} />
              <ToneCard label="프로모션" value={data.messages.promotion} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-text-muted">
                  {data.model === "openrouter" ? "AI 생성" : "템플릿 (LLM 미사용)"}
                </span>
                <button
                  onClick={() => void load()}
                  className="text-[11px] font-medium text-gold-dark hover:text-gold"
                >
                  다시 생성 ↻
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ToneCard({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard 실패 시 조용히 무시
    }
  };
  return (
    <div className="rounded-lg border border-border-light bg-surface-white p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-dark">
          {label}
        </span>
        <button
          onClick={() => void copy()}
          className="flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-text-dark"
        >
          {copied ? <Check className="h-3 w-3 text-[color:var(--color-success)]" /> : <Copy className="h-3 w-3" />}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-dark">{value}</p>
    </div>
  );
}
