import { X, Phone, Mail, Calendar, TrendingUp, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCustomer, useCustomerVisits } from "@/hooks/useCustomers";
import { GradeBadge } from "./GradeBadge";
import { ChurnGauge } from "./ChurnGauge";
import { Spinner } from "@/components/ui/Spinner";
import type { CustomerGrade } from "@/lib/types";

type Props = {
  customerId: string;
  onClose: () => void;
};

/**
 * 예약 스케줄 등에서 고객 이름 클릭 시 뜨는 경량 상세 모달.
 * 전체 프로필(/customers/:id)로 이동 버튼을 제공.
 */
export function CustomerQuickModal({ customerId, onClose }: Props) {
  const navigate = useNavigate();
  const { data: detail, loading, error } = useCustomer(customerId);
  const { data: visits } = useCustomerVisits(customerId);

  const goProfile = () => {
    onClose();
    navigate(`/customers/${customerId}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-surface-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg text-text-dark">
              {detail?.name ?? "고객 상세"}
            </h3>
            {detail?.grade && <GradeBadge grade={detail.grade as CustomerGrade} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-light"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && !detail ? (
          <div className="py-10"><Spinner /></div>
        ) : error ? (
          <p className="rounded-lg bg-[color:var(--color-danger)]/10 px-3 py-2 text-xs text-[color:var(--color-danger)]">
            {error}
          </p>
        ) : !detail ? (
          <p className="py-6 text-center text-sm text-text-muted">고객을 찾을 수 없습니다.</p>
        ) : (
          <>
            {/* 지표 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border-light bg-surface-light/60 p-3">
                <div className="text-[11px] font-medium text-text-muted">CLV</div>
                <div className="mt-1 font-display text-lg text-text-dark">
                  ₩{detail.clv.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-border-light bg-surface-light/60 p-3">
                <div className="text-[11px] font-medium text-text-muted">이탈 위험</div>
                <div className="mt-1">
                  <ChurnGauge value={detail.churn_risk} />
                </div>
              </div>
              <div className="rounded-lg border border-border-light bg-surface-light/60 p-3">
                <div className="text-[11px] font-medium text-text-muted">총 방문</div>
                <div className="mt-1 font-display text-lg text-text-dark">
                  {detail.total_visits}회
                </div>
              </div>
              <div className="rounded-lg border border-border-light bg-surface-light/60 p-3">
                <div className="text-[11px] font-medium text-text-muted">마지막 방문</div>
                <div className="mt-1 text-sm font-medium text-text-dark">
                  {detail.last_visit_at ? detail.last_visit_at.slice(0, 10) : "-"}
                </div>
              </div>
            </div>

            {/* 연락처 */}
            <div className="mt-3 space-y-1.5 rounded-lg border border-border-light p-3 text-sm">
              <div className="flex items-center gap-2 text-text-dark">
                <Phone className="h-3.5 w-3.5 text-text-muted" />
                <span className="font-mono">{detail.phone}</span>
              </div>
              {detail.email && (
                <div className="flex items-center gap-2 text-text-dark">
                  <Mail className="h-3.5 w-3.5 text-text-muted" />
                  <span className="truncate">{detail.email}</span>
                </div>
              )}
            </div>

            {/* AI 태그 */}
            {detail.ai_tags && detail.ai_tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.ai_tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-dark"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* 최근 방문 */}
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <Calendar className="h-3 w-3" /> 최근 방문
              </div>
              {visits && visits.length > 0 ? (
                <ul className="divide-y divide-border-light rounded-lg border border-border-light">
                  {visits.slice(0, 5).map((v, i) => (
                    <li
                      key={`${v.date}-${v.type}-${i}`}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-gold" />
                        <span className="text-text-dark">{v.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-text-muted">{v.date}</span>
                        <span className="font-mono font-medium text-text-dark">
                          ₩{v.amount.toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-border-light px-3 py-3 text-center text-xs text-text-muted">
                  최근 방문 이력이 없습니다.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-lg border border-border-light bg-surface-white text-sm font-medium text-text-dark hover:bg-surface-light"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={goProfile}
                className="flex h-10 flex-[2] items-center justify-center gap-1.5 rounded-lg bg-gold text-sm font-semibold text-text-on-gold hover:bg-gold-dark"
              >
                전체 프로필 보기
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
