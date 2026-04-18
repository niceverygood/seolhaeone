import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bot, Flag, BedDouble, Flame,
  MessageSquare,
} from "lucide-react";
import { AiActionButtons } from "@/components/ai/AiActionButtons";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  useCustomer,
  useCustomerVisits,
  useCustomerSpending,
  useCustomerAiActions,
} from "@/hooks/useCustomers";
import { GradeBadge } from "@/components/customers/GradeBadge";
import { ChurnGauge } from "@/components/customers/ChurnGauge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";

const tabs = ["방문 히스토리", "소비 트렌드", "AI 메모", "AI 추천 액션"] as const;
type Tab = (typeof tabs)[number];

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("방문 히스토리");

  const { data: detail, loading, error, refetch } = useCustomer(id ?? "");
  const { data: visits } = useCustomerVisits(id ?? "");
  const { data: spending } = useCustomerSpending(id ?? "");
  const { data: aiActions } = useCustomerAiActions(id ?? "");

  if (loading) return <Spinner />;
  if (error) return <ErrorAlert message={error} onRetry={refetch} />;
  if (!detail) {
    return (
      <div className="py-20 text-center text-text-muted">
        고객을 찾을 수 없습니다.
      </div>
    );
  }

  const fmt = (n: number) => `₩${(n / 1_000_000).toFixed(1)}M`;
  const typeIcon: Record<string, typeof Flag> = {
    golf: Flag,
    room: BedDouble,
    oncheon: Flame,
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <button
        onClick={() => navigate("/customers")}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-dark"
      >
        <ArrowLeft className="h-4 w-4" /> 고객 목록
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left: Profile card */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-xl font-bold text-text-on-gold">
                {detail.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl text-text-dark">{detail.name}</span>
                  <GradeBadge grade={detail.grade} />
                </div>
                <div className="text-sm text-text-muted">{detail.phone}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-text-muted">CLV</div>
                <div className="font-display text-lg text-text-dark">{fmt(detail.clv)}</div>
              </div>
              <div>
                <div className="text-xs text-text-muted">총 방문</div>
                <div className="font-display text-lg text-text-dark">{detail.total_visits}회</div>
              </div>
              <div>
                <div className="text-xs text-text-muted">최근 방문</div>
                <div className="font-mono text-sm text-text-dark">
                  {detail.last_visit_at ? detail.last_visit_at.slice(0, 10) : "-"}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-text-muted">이탈 위험</div>
                <ChurnGauge value={detail.churn_risk} />
              </div>
            </div>

            {detail.preferences?.preferred_course && (
              <div className="mt-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">선호</div>
                <div className="text-sm text-text-dark">
                  {detail.preferences.preferred_course}코스 ·{" "}
                  {detail.preferences.preferred_time === "morning" ? "오전" : "오후"}
                </div>
              </div>
            )}
          </div>

          {/* AI Tags */}
          <div className="rounded-xl border border-border-light bg-surface-white p-5">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">AI 태그</div>
            <div className="flex flex-wrap gap-1.5">
              {detail.ai_tags.map((t) => (
                <span key={t} className="rounded-full bg-gold-bg px-2.5 py-1 text-xs font-medium text-gold-dark">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Tabs content */}
        <div>
          <div className="mb-4 flex gap-1 rounded-lg border border-border-light bg-surface-white p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "bg-gold text-text-on-gold"
                    : "text-text-muted hover:text-text-dark",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border-light bg-surface-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {activeTab === "방문 히스토리" && (
              <div className="space-y-4">
                {(visits ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">방문 기록이 없습니다.</p>
                ) : (
                  (visits ?? []).map((v, i) => {
                    const Icon = typeIcon[v.type] ?? Flag;
                    return (
                      <div key={i} className="flex items-start gap-3 border-b border-border-light/60 pb-4 last:border-0 last:pb-0">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-bg">
                          <Icon className="h-4 w-4 text-gold-dark" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-text-dark">{v.label}</span>
                            <span className="font-mono text-sm text-text-dark">{fmt(v.amount)}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-text-muted">{v.date}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "소비 트렌드" && (
              <div className="h-80">
                {(spending ?? []).length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-text-muted">소비 데이터가 없습니다.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spending ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DA" vertical={false} />
                      <XAxis dataKey="year" fontSize={12} stroke="#9CA3AF" />
                      <YAxis fontSize={12} stroke="#9CA3AF" tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
                      <Tooltip
                        formatter={(v) => fmt(Number(v))}
                        contentStyle={{ background: "#fff", border: "1px solid #E5E2DA", borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="golf" name="골프" fill="#C5A55A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="room" name="객실" fill="#D4BA7A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="fnb" name="F&B" fill="#A68B3E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="oncheon" name="온천" fill="#E5E2DA" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {activeTab === "AI 메모" && (
              <div className="space-y-3">
                {(detail.ai_memo ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-text-muted">AI 메모가 없습니다.</p>
                ) : (
                  (detail.ai_memo ?? []).map((m, i) => (
                    <div key={i} className="rounded-lg border border-gold/30 bg-gold-bg/30 p-4">
                      <div className="mb-1 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gold-dark" />
                        <span className="text-xs font-semibold uppercase text-gold-dark">{m.category}</span>
                        <span className="ml-auto font-mono text-[11px] text-text-muted">{m.date}</span>
                      </div>
                      <p className="text-sm leading-relaxed text-text-dark">{m.content}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "AI 추천 액션" && (
              <CustomerAiActionsPanel
                actions={aiActions ?? []}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type AiAction = {
  id: string;
  type: string;
  detail: string;
  impact?: string;
  status?: string;
};

function CustomerAiActionsPanel({ actions }: { actions: AiAction[] }) {
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const visible = actions.filter((a) => !respondedIds.has(a.id));

  if (visible.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        {actions.length === 0 ? "추천 액션이 없습니다." : "모든 액션을 처리했습니다."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((a) => (
        <div key={a.id} className="rounded-lg border-l-[3px] border-l-gold bg-gold-bg/40 p-4">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Bot className="h-4 w-4 shrink-0 text-gold-dark" />
            <span className="text-sm font-semibold leading-snug text-text-dark">{a.type}</span>
          </div>
          <p className="mb-3 text-sm text-text-muted">{a.detail}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="whitespace-nowrap font-mono text-xs text-gold-dark">
              {a.impact && `▲ ${a.impact}`}
            </span>
            <AiActionButtons
              suggestionId={a.id}
              onResponded={() =>
                setRespondedIds((s) => new Set(s).add(a.id))
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}
