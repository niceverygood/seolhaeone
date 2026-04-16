import { Bot, Check, CloudRain, Clock, AlertTriangle, X, Pencil } from "lucide-react";
import { aiGolfSuggestions, type AiGolfSuggestion } from "@/lib/mockGolf";

const icons: Record<AiGolfSuggestion["type"], typeof Bot> = {
  slot: Clock,
  weather: CloudRain,
  noshow: AlertTriangle,
};

export function GolfAiPanel() {
  return (
    <section className="rounded-xl border-l-[3px] border-l-gold bg-gold-bg/70 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bot className="h-5 w-5 text-gold-dark" />
        <h3 className="font-display text-base text-text-dark">AI 추천</h3>
      </div>

      <ul className="space-y-3">
        {aiGolfSuggestions.map((s) => {
          const Icon = icons[s.type];
          return (
            <li key={s.id} className="rounded-lg border border-gold/30 bg-surface-white p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Icon className="h-4 w-4 text-gold-dark" />
                <span className="text-sm font-semibold text-text-dark">{s.title}</span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-text-muted">{s.detail}</p>
              <div className="flex gap-1">
                <button className="flex h-6 items-center gap-1 rounded-md bg-gold px-2 text-[11px] font-medium text-text-on-gold hover:bg-gold-dark">
                  <Check className="h-3 w-3" /> 승인
                </button>
                <button className="flex h-6 items-center gap-1 rounded-md border border-border-light bg-surface-white px-2 text-[11px] font-medium text-text-dark hover:bg-surface-light">
                  <Pencil className="h-3 w-3" /> 수정
                </button>
                <button className="flex h-6 items-center gap-1 rounded-md border border-border-light bg-surface-white px-2 text-[11px] font-medium text-text-muted hover:bg-surface-light">
                  <X className="h-3 w-3" /> 무시
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
