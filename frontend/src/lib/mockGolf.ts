export type Course = {
  id: string;
  name: string;
  holes: number;
  par: number;
};

export const courses: Course[] = [
  { id: "c1", name: "마운틴", holes: 9, par: 36 },
  { id: "c2", name: "오션", holes: 9, par: 36 },
  { id: "c3", name: "레전드", holes: 9, par: 36 },
];

export type TeetimeSlot = {
  id: string;
  courseId: string;
  time: string; // "HH:MM"
  status: "available" | "reserved" | "blocked" | "completed";
  customerName?: string;
  customerGrade?: "diamond" | "gold" | "silver" | "member";
  partySize?: number;
  caddyName?: string;
  noshowScore?: number;
  packageName?: string;
  notes?: string;
};

// Generate a day of teetimes for all 3 courses
function generateDaySlots(): TeetimeSlot[] {
  const slots: TeetimeSlot[] = [];
  const names = [
    "김현우", "이서진", "박준혁", "최수정", "정민호",
    "한지영", "오태욱", "윤미래", "송강", "임지수",
    "강동원", "배수지", "조인성", "전지현", "남주혁",
    "김태리", "유재석", "이광수", "하정우", "손예진",
  ];
  const caddies = [
    "캐디_01", "캐디_02", "캐디_03", "캐디_04", "캐디_05",
    "캐디_06", "캐디_07", "캐디_08", "캐디_09", "캐디_10",
  ];
  const grades: TeetimeSlot["customerGrade"][] = ["diamond", "gold", "silver", "member"];
  const packages = ["레전드 1박 패키지", "온천 힐링 패키지", "골프텔 평일 특가", undefined];

  let id = 1;
  for (const course of courses) {
    for (let h = 6; h <= 17; h++) {
      for (const m of [0, 30]) {
        if (h === 17 && m === 30) continue;
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const rand = Math.random();
        const isBooked = rand < 0.72;

        const grade = grades[Math.floor(Math.random() * grades.length)];
        const noshowScore = isBooked ? Math.round(Math.random() * 60) / 100 : 0;

        slots.push({
          id: `tt-${id++}`,
          courseId: course.id,
          time,
          status: isBooked ? "reserved" : "available",
          customerName: isBooked ? names[Math.floor(Math.random() * names.length)] : undefined,
          customerGrade: isBooked ? grade : undefined,
          partySize: isBooked ? [2, 3, 4, 4, 4][Math.floor(Math.random() * 5)] : undefined,
          caddyName: isBooked && Math.random() > 0.3
            ? caddies[Math.floor(Math.random() * caddies.length)]
            : undefined,
          noshowScore,
          packageName: isBooked
            ? packages[Math.floor(Math.random() * packages.length)]
            : undefined,
        });
      }
    }
  }
  return slots;
}

export const todaySlots = generateDaySlots();

export type AiGolfSuggestion = {
  id: string;
  type: "slot" | "weather" | "noshow";
  title: string;
  detail: string;
};

export const aiGolfSuggestions: AiGolfSuggestion[] = [
  {
    id: "gs-1",
    type: "slot",
    title: "14시 이후 빈 슬롯 5건",
    detail: "대기 고객 3명에게 자동 배정을 추천합니다. 예상 추가 매출 ₩1,800,000",
  },
  {
    id: "gs-2",
    type: "weather",
    title: "내일 오후 비 예보 (60%)",
    detail: "16시 이후 예약 3건에 리마인드 발송을 추천합니다.",
  },
  {
    id: "gs-3",
    type: "noshow",
    title: "고위험 노쇼 예약 2건",
    detail: "김현우(0.45), 이서진(0.38) — 자동 리마인드 발송 여부를 확인하세요.",
  },
];
