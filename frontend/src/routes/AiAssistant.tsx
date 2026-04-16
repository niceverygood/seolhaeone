import { useState, type FormEvent } from "react";
import { Sparkles, ArrowRight, Bot, User } from "lucide-react";
import { useAiQuery, useAiSuggestions } from "@/hooks/useAi";

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  data?: Record<string, unknown>[];
  queryType?: string;
};

const SUGGESTIONS = [
  "이번 달 코스별 매출 비교해줘",
  "VIP 이탈 위험 고객 리스트",
  "내일 노쇼 위험 예약",
  "고객 등급 현황",
  "내일 예약 현황",
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { query, loading } = useAiQuery();
  const { data: suggestions } = useAiSuggestions();

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const result = await query(text);
    if (result) {
      const aiMsg: Message = {
        id: `a-${Date.now()}`,
        role: "ai",
        text: result.answer,
        data: result.data,
        queryType: result.query_type,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-180px)] max-w-[1000px] flex-col">
      {/* Messages area */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/40 bg-gold-bg">
              <Bot className="h-8 w-8 text-gold-dark" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-text-dark">AI 어시스턴트</h2>
              <p className="mt-2 text-sm text-text-muted">
                설해원 CRM 데이터에 대해 자연어로 질문해보세요.
              </p>
            </div>

            {/* AI insights */}
            {suggestions && suggestions.length > 0 && (
              <div className="w-full max-w-lg space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  오늘의 인사이트
                </p>
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-gold/30 bg-gold-bg/40 p-3 text-left"
                  >
                    <div className="text-sm font-semibold text-text-dark">{s.title}</div>
                    <p className="mt-0.5 text-xs text-text-muted">{s.detail}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-border-light bg-surface-white px-3 py-1.5 text-xs text-text-dark hover:border-gold hover:bg-gold-bg"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "ai" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-bg">
                  <Bot className="h-4 w-4 text-gold-dark" />
                </div>
              )}
              <div
                className={`max-w-[600px] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gold text-text-on-gold"
                    : "border border-border-light bg-surface-white"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.text}
                </p>
                {msg.data && msg.data.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border-light bg-surface-light">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-light">
                          {Object.keys(msg.data[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left font-medium text-text-muted">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.data.map((row, i) => (
                          <tr key={i} className="border-b border-border-light/60 last:border-0">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-2 text-text-dark">
                                {typeof val === "number"
                                  ? val.toLocaleString()
                                  : String(val ?? "-")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-secondary">
                  <User className="h-4 w-4 text-text-secondary" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-bg">
              <Bot className="h-4 w-4 text-gold-dark" />
            </div>
            <div className="rounded-xl border border-border-light bg-surface-white px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <div className="h-2 w-2 animate-pulse rounded-full bg-gold" />
                분석 중...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 rounded-xl border border-gold/40 bg-surface-white p-4 shadow-[0_2px_12px_rgba(197,165,90,0.1)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-bg">
            <Sparkles className="h-5 w-5 text-gold-dark" />
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="AI에게 질문하세요 — '이번 달 매출 알려줘'"
            className="flex-1 bg-transparent text-sm text-text-dark placeholder:text-text-muted focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-text-on-gold hover:bg-gold-dark disabled:opacity-50"
          >
            질문하기 <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {messages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="rounded-full border border-border-light bg-surface-light px-3 py-1.5 text-xs text-text-dark hover:border-gold hover:bg-gold-bg"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
