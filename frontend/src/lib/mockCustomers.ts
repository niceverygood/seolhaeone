export type CustomerGrade = "diamond" | "gold" | "silver" | "member";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  grade: CustomerGrade;
  clv: number;
  churnRisk: number;
  totalVisits: number;
  lastVisitAt: string;
  aiTags: string[];
};

export type CustomerDetail = CustomerRow & {
  preferences: { preferred_course: string; preferred_time: string };
  aiMemo: { date: string; content: string; category: string }[];
  visitHistory: { date: string; type: string; course?: string; room?: string; amount: number }[];
  spending: { year: string; golf: number; room: number; fnb: number; oncheon: number }[];
  aiActions: { id: string; type: string; detail: string; impact: string }[];
};

const names = [
  "김현우", "이서진", "박준혁", "최수정", "정민호",
  "한지영", "오태욱", "윤미래", "송강", "임지수",
  "강동원", "배수지", "조인성", "전지현", "남주혁",
  "김태리", "유재석", "이광수", "하정우", "손예진",
];

const tags = [
  "#레전드코스_선호", "#오션코스_선호", "#마운틴코스_선호",
  "#주말방문", "#평일방문", "#오전선호", "#오후선호",
  "#풀스위트_선호", "#온천_애용", "#F&B_고소비",
  "#프로모션_반응", "#캐디_지정",
];

const gradeConfig: Record<CustomerGrade, { count: number; clvMin: number; clvMax: number; visitsMin: number; visitsMax: number }> = {
  diamond: { count: 10, clvMin: 15_000_000, clvMax: 45_000_000, visitsMin: 12, visitsMax: 50 },
  gold: { count: 30, clvMin: 8_000_000, clvMax: 18_000_000, visitsMin: 6, visitsMax: 15 },
  silver: { count: 60, clvMin: 2_000_000, clvMax: 9_000_000, visitsMin: 3, visitsMax: 8 },
  member: { count: 100, clvMin: 0, clvMax: 3_000_000, visitsMin: 0, visitsMax: 4 },
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function generateCustomers(): CustomerRow[] {
  const result: CustomerRow[] = [];
  let id = 1;
  for (const grade of ["diamond", "gold", "silver", "member"] as CustomerGrade[]) {
    const cfg = gradeConfig[grade];
    for (let i = 0; i < cfg.count; i++) {
      const daysAgo = rand(1, 120);
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);

      result.push({
        id: `cust-${id++}`,
        name: names[rand(0, names.length - 1)],
        phone: `010-${rand(1000, 9999)}-${rand(1000, 9999)}`,
        email: Math.random() > 0.3 ? `user${id}@example.com` : null,
        grade,
        clv: rand(cfg.clvMin, cfg.clvMax),
        churnRisk: Math.round(Math.random() * (grade === "diamond" ? 30 : grade === "gold" ? 50 : 80)) / 100,
        totalVisits: rand(cfg.visitsMin, cfg.visitsMax),
        lastVisitAt: d.toISOString().slice(0, 10),
        aiTags: pick(tags, rand(1, 4)),
      });
    }
  }
  return result;
}

export const customers = generateCustomers();

// Detailed profile for first diamond customer
export function getCustomerDetail(id: string): CustomerDetail | null {
  const row = customers.find((c) => c.id === id);
  if (!row) return null;
  return {
    ...row,
    preferences: { preferred_course: "레전드", preferred_time: "morning" },
    aiMemo: [
      { date: "2026-04-10", content: "레전드코스 선호, 오전 이른 시간대 요청", category: "preference" },
      { date: "2026-03-28", content: "특별한 날 방문, 서프라이즈 케이크 준비 완료", category: "event" },
      { date: "2026-03-15", content: "온천 이용 후 만족도 높음, 재방문 의사 강함", category: "feedback" },
    ],
    visitHistory: [
      { date: "2026-04-10", type: "golf", course: "레전드", amount: 450000 },
      { date: "2026-04-10", type: "room", room: "마운틴스테이 풀스위트", amount: 850000 },
      { date: "2026-03-28", type: "golf", course: "오션", amount: 380000 },
      { date: "2026-03-15", type: "golf", course: "레전드", amount: 450000 },
      { date: "2026-03-15", type: "oncheon", amount: 80000 },
      { date: "2026-02-20", type: "golf", course: "마운틴", amount: 320000 },
      { date: "2026-02-20", type: "room", room: "설해온천 디럭스", amount: 450000 },
      { date: "2026-01-18", type: "golf", course: "레전드", amount: 450000 },
    ],
    spending: [
      { year: "2024", golf: 4200000, room: 3600000, fnb: 1800000, oncheon: 400000 },
      { year: "2025", golf: 5400000, room: 5100000, fnb: 2200000, oncheon: 600000 },
      { year: "2026", golf: 2050000, room: 1300000, fnb: 800000, oncheon: 80000 },
    ],
    aiActions: [
      { id: "aa-1", type: "패키지 추천", detail: "레전드 1박 패키지 추천 (수락 확률 78%)", impact: "₩1,500,000" },
      { id: "aa-2", type: "업셀", detail: "풀스위트 → 로열스위트 업그레이드 (수락 확률 62%)", impact: "₩350,000" },
      { id: "aa-3", type: "이벤트 초대", detail: "설해별담 프리뷰 초대 추천", impact: "이탈 방지" },
    ],
  };
}
