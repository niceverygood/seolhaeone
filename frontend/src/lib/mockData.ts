// Mock data for dashboard screen

export const kpis = [
  {
    key: "revenue",
    label: "월 매출",
    value: "₩ 1,284,500,000",
    delta: "+12.4%",
    deltaType: "up" as const,
    spark: [42, 48, 55, 51, 60, 68, 72, 75, 82, 88, 95, 104],
  },
  {
    key: "rounds",
    label: "골프 라운드",
    value: "3,842",
    delta: "+8.1%",
    deltaType: "up" as const,
    spark: [220, 240, 255, 260, 278, 290, 305, 318, 330, 345, 360, 384],
  },
  {
    key: "occupancy",
    label: "객실 점유율",
    value: "87.3%",
    delta: "+4.6%",
    deltaType: "up" as const,
    spark: [70, 72, 74, 76, 78, 80, 81, 83, 84, 85, 86, 87],
  },
  {
    key: "csat",
    label: "고객 만족도",
    value: "4.84 / 5.0",
    delta: "-0.02",
    deltaType: "down" as const,
    spark: [4.9, 4.88, 4.89, 4.87, 4.86, 4.88, 4.87, 4.86, 4.85, 4.86, 4.85, 4.84],
  },
];

export const revenueTrend = [
  { month: "11월", actual: 980, forecast: null },
  { month: "12월", actual: 1120, forecast: null },
  { month: "1월", actual: 890, forecast: null },
  { month: "2월", actual: 940, forecast: null },
  { month: "3월", actual: 1180, forecast: null },
  { month: "4월", actual: 1284, forecast: 1284 },
  { month: "5월", actual: null, forecast: 1350 },
  { month: "6월", actual: null, forecast: 1420 },
  { month: "7월", actual: null, forecast: 1580 },
];

export const courseRevenue = [
  { name: "레전드", value: 520, color: "#C5A55A" },
  { name: "오션", value: 410, color: "#D4BA7A" },
  { name: "마운틴", value: 354, color: "#A68B3E" },
];

export const gradeDistribution = [
  { name: "Diamond", value: 10, color: "#C5A55A" },
  { name: "Gold", value: 30, color: "#D4BA7A" },
  { name: "Silver", value: 60, color: "#9CA3AF" },
  { name: "Member", value: 100, color: "#E5E2DA" },
];

export type AiInsight = {
  id: string;
  category: "revenue" | "customer" | "operation" | "marketing";
  title: string;
  detail: string;
  impact: string;
};

export const aiInsights: AiInsight[] = [
  {
    id: "ai-1",
    category: "revenue",
    title: "레전드코스 주말 예약률 92%",
    detail:
      "5월 1~12일 레전드코스 주말 예약률이 포화 상태입니다. 마운틴코스로 수요 분산 프로모션을 추천합니다.",
    impact: "예상 추가 매출 ₩48,000,000",
  },
  {
    id: "ai-2",
    category: "customer",
    title: "VIP 김○○ 고객 45일 미방문",
    detail:
      "Diamond 등급(CLV ₩18.2M)이며 평균 방문 주기(22일)를 2배 초과. 이탈 위험 스코어 0.71.",
    impact: "설해별담 프리뷰 초대 발송 추천",
  },
  {
    id: "ai-3",
    category: "operation",
    title: "내일 오후 비 예보 — 노쇼 위험 증가",
    detail:
      "내일 14시 이후 예약 18건 중 고위험(노쇼 스코어 >0.3) 3건 감지. 자동 리마인드 발송을 추천합니다.",
    impact: "노쇼 방지 예상 손실 ₩2,400,000",
  },
  {
    id: "ai-4",
    category: "marketing",
    title: "골프+객실 번들 수요 상승",
    detail:
      "최근 2주간 동일 고객의 골프 예약 후 객실 예약 전환율이 34%로 상승. 자동 패키지 추천 캠페인 활성화를 제안합니다.",
    impact: "패키지 수락률 예측 41%",
  },
];

export const recentAiActions = [
  { id: "log-1", time: "14:32", type: "노쇼 경보", target: "홍길동", status: "승인" },
  { id: "log-2", time: "13:58", type: "업셀 제안", target: "김연아", status: "실행" },
  { id: "log-3", time: "13:12", type: "이탈 방지", target: "박찬호", status: "대기" },
  { id: "log-4", time: "12:47", type: "패키지 추천", target: "이영표", status: "승인" },
  { id: "log-5", time: "11:20", type: "가격 최적화", target: "-", status: "실행" },
];
