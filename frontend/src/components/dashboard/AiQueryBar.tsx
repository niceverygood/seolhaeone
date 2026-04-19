import { useState, type FormEvent } from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAiQuery } from "@/hooks/useAi";

const suggestions = [
  "이번 달 코스별 매출 비교해줘",
  "VIP 이탈 위험 고객 리스트",
  "내일 노쇼 위험 예약",
  "객실 점유율 알려줘",
];

export function AiQueryBar() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{
    answer: string;
    data?: Record<string, unknown>[];
  } | null>(null);
  const { query, loading } = useAiQuery();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const res = await query(input);
    if (res) setResult(res);
  };

  const handleSuggestion = async (text: string) => {
    setInput(text);
    const res = await query(text);
    if (res) setResult(res);
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gold/40 bg-surface-white p-5 shadow-[0_2px_12px_rgba(197,165,90,0.1)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-bg">
            <Sparkles className="h-5 w-5 text-gold-dark" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AI에게 질문하세요 — '이번 달 레전드코스 vs 마운틴코스 매출 비교해줘'"
            className="flex-1 bg-transparent text-sm text-text-dark placeholder:text-text-muted focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
          >
            {loading ? "분석 중..." : "질문하기"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSuggestion(s)}
              disabled={loading}
              className="rounded-full border border-border-light bg-surface-light px-3 py-1.5 text-xs text-text-dark hover:border-gold hover:bg-gold-bg disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* Inline result */}
      {result && (
        <div className="relative rounded-xl border border-gold/30 bg-gold-bg/30 p-5">
          <button
            onClick={() => setResult(null)}
            className="absolute right-3 top-3 text-text-muted hover:text-text-dark"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-text-dark">
            {result.answer}
          </p>
          {result.data && result.data.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border-light bg-surface-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-light bg-surface-light">
                    {Object.keys(result.data[0])
                      .filter((k) => k !== "id")
                      .map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium text-text-muted">
                          {key}
                        </th>
                      ))}
                    {/* id 컬럼이 있으면 프로필 이동 버튼 열 추가 */}
                    {"id" in result.data[0] && (
                      <th className="px-3 py-2 text-right font-medium text-text-muted"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row, i) => {
                    const id = typeof row.id === "string" ? row.id : null;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-border-light/60 last:border-0 ${
                          id ? "cursor-pointer transition-colors hover:bg-gold-bg/30" : ""
                        }`}
                        onClick={id ? () => navigate(`/customers/${id}`) : undefined}
                      >
                        {Object.entries(row)
                          .filter(([k]) => k !== "id")
                          .map(([, val], j) => (
                            <td key={j} className="px-3 py-2 text-text-dark">
                              {typeof val === "number" ? val.toLocaleString() : String(val ?? "-")}
                            </td>
                          ))}
                        {id && (
                          <td className="px-3 py-2 text-right">
                            <span className="text-xs font-medium text-gold-dark">프로필 →</span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
