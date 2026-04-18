import { useState } from "react";
import { Bot, CloudRain, Clock, AlertTriangle } from "lucide-react";
import { useAiSuggestions } from "@/hooks/useAi";
import { AiActionButtons } from "@/components/ai/AiActionButtons";
import type { AiSuggestion } from "@/lib/types";

const icons: Record<string, typeof Bot> = {
  slot: Clock,
  weather: CloudRain,
  noshow: AlertTriangle,
  operation: AlertTriangle,
  customer: Bot,
  revenue: Clock,
  marketing: Bot,
};

export function GolfAiPanel() {
  const { data: suggestions } = useAiSuggestions();
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  const items: AiSuggestion[] = (suggestions ?? []).filter(
    (s) => !respondedIds.has(s.id),
  );

  return (
    <section className="rounded-xl border-l-[3px] border-l-gold bg-gold-bg/70 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bot className="h-5 w-5 shrink-0 text-gold-dark" />
        <h3 className="font-display text-base text-text-dark">AI 추천</h3>
      </div>

      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-text-muted">
          모든 추천을 처리했습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => {
            const Icon = icons[s.type] ?? Bot;
            return (
              <li key={s.id} className="rounded-lg border border-gold/30 bg-surface-white p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-gold-dark" />
                  <span className="text-sm font-semibold leading-snug text-text-dark">
                    {s.title}
                  </span>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-text-muted">{s.detail}</p>
                <AiActionButtons
                  size="sm"
                  suggestionId={s.id}
                  onResponded={() =>
                    setRespondedIds((set) => new Set(set).add(s.id))
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
