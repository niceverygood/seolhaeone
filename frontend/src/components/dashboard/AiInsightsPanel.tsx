import { useState } from "react";
import { Bot } from "lucide-react";
import { useAiSuggestions } from "@/hooks/useAi";
import { Spinner } from "@/components/ui/Spinner";
import { AiActionButtons } from "@/components/ai/AiActionButtons";

const categoryLabel: Record<string, string> = {
  revenue: "매출",
  customer: "고객",
  operation: "운영",
  marketing: "마케팅",
};

export function AiInsightsPanel() {
  const { data: insights, loading } = useAiSuggestions();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  if (loading) return <Spinner />;

  const visible = (insights ?? []).filter((i) => !respondedIds.has(i.id));

  return (
    <section className="rounded-xl border-l-[3px] border-l-gold bg-gold-bg/70 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Bot className="h-5 w-5 shrink-0 text-gold-dark" />
        <h2 className="font-display text-base text-text-dark sm:text-lg">
          오늘의 AI 인사이트
        </h2>
        <span className="ml-auto hidden shrink-0 whitespace-nowrap font-mono text-[11px] text-text-muted sm:inline">
          AI Engine · Live
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          모든 인사이트를 처리했습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((insight) => (
            <li
              key={insight.id}
              className="rounded-lg border border-gold/30 bg-surface-white p-3 sm:p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex shrink-0 items-center rounded-md bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-dark">
                  {categoryLabel[insight.category ?? ""] ?? insight.category}
                </span>
                <h3 className="text-sm font-semibold leading-snug text-text-dark">
                  {insight.title}
                </h3>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-text-muted">
                {insight.detail}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="whitespace-nowrap font-mono text-xs text-gold-dark">
                  {insight.impact && `▲ ${insight.impact}`}
                </span>
                <AiActionButtons
                  suggestionId={insight.id}
                  onResponded={() =>
                    setRespondedIds((s) => new Set(s).add(insight.id))
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
