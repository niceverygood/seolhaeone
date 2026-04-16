import { Sparkles, ArrowRight } from "lucide-react";

const suggestions = [
  "이번 달 코스별 매출 비교해줘",
  "VIP 이탈 위험 고객 리스트",
  "내일 날씨 반영한 노쇼 예측",
  "빈 슬롯 프로모션 추천",
];

export function AiQueryBar() {
  return (
    <div className="rounded-xl border border-gold/40 bg-surface-white p-5 shadow-[0_2px_12px_rgba(197,165,90,0.1)]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-bg">
          <Sparkles className="h-5 w-5 text-gold-dark" />
        </div>
        <input
          type="text"
          placeholder="AI에게 질문하세요 — '이번 달 레전드코스 vs 마운틴코스 매출 비교해줘'"
          className="flex-1 bg-transparent text-sm text-text-dark placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="button"
          className="flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-text-on-gold hover:bg-gold-dark"
        >
          질문하기 <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-border-light bg-surface-light px-3 py-1.5 text-xs text-text-dark hover:border-gold hover:bg-gold-bg"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
