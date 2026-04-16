import { Bot, Check, X, Pencil } from "lucide-react";
import { useAiSuggestions } from "@/hooks/useAi";
import { Spinner } from "@/components/ui/Spinner";

const categoryLabel: Record<string, string> = {
  revenue: "매출",
  customer: "고객",
  operation: "운영",
  marketing: "마케팅",
};

export function AiInsightsPanel() {
  const { data: insights, loading } = useAiSuggestions();

  if (loading) return <Spinner />;

  return (
    <section className="rounded-xl border-l-[3px] border-l-gold bg-gold-bg/70 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bot className="h-5 w-5 text-gold-dark" />
        <h2 className="font-display text-lg text-text-dark">오늘의 AI 인사이트</h2>
        <span className="ml-auto font-mono text-[11px] text-text-muted">
          AI Engine · Live
        </span>
      </div>

      <ul className="space-y-3">
        {(insights ?? []).map((insight) => (
          <li
            key={insight.id}
            className="rounded-lg border border-gold/30 bg-surface-white p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-dark">
                {categoryLabel[insight.category ?? ""] ?? insight.category}
              </span>
              <h3 className="text-sm font-semibold text-text-dark">
                {insight.title}
              </h3>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-text-muted">
              {insight.detail}
            </p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gold-dark">
                {insight.impact && `▲ ${insight.impact}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex h-7 items-center gap-1 rounded-md bg-gold px-2.5 text-xs font-medium text-text-on-gold hover:bg-gold-dark"
                >
                  <Check className="h-3 w-3" /> 승인
                </button>
                <button
                  type="button"
                  className="flex h-7 items-center gap-1 rounded-md border border-border-light bg-surface-white px-2.5 text-xs font-medium text-text-dark hover:bg-surface-light"
                >
                  <Pencil className="h-3 w-3" /> 수정
                </button>
                <button
                  type="button"
                  className="flex h-7 items-center gap-1 rounded-md border border-border-light bg-surface-white px-2.5 text-xs font-medium text-text-muted hover:bg-surface-light"
                >
                  <X className="h-3 w-3" /> 무시
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
