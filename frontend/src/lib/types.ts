// ─── Shared ───
export type CustomerGrade = "diamond" | "gold" | "silver" | "member";

// ─── Auth ───
export type Token = { access_token: string; token_type: string };
export type StaffProfile = {
  id: string;
  name: string;
  role: string;
  department?: string | null;
  email?: string | null;
};

// ─── Customer ───
export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  grade: CustomerGrade;
  clv: number;
  churn_risk: number;
  total_visits: number;
  last_visit_at: string | null;
  ai_tags: string[];
};

export type CustomerDetail = CustomerRow & {
  ai_memo: { date: string; content: string; category: string }[];
  preferences: Record<string, string>;
};

export type CustomerListResponse = { total: number; items: CustomerRow[] };

export type VisitRecord = {
  date: string;
  type: string;
  label: string;
  amount: number;
};

export type SpendingYear = {
  year: string;
  golf: number;
  room: number;
  fnb: number;
  oncheon: number;
};

// ─── Golf ───
export type GolfCourse = {
  id: string;
  name: string;
  holes: number;
  par: number;
  status: string;
};

export type TeetimeResponse = {
  id: string;
  course_id: string;
  tee_date: string;
  tee_time: string;
  status: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_grade: string | null;
  party_size: number;
  caddy_id: string | null;
  caddy_name: string | null;
  noshow_score: number;
  package_name: string | null;
  notes: string | null;
};

// ─── Resort ───
export type RoomResponse = {
  id: string;
  building: string;
  room_type: string;
  room_number: string;
  floor: number;
  capacity: number;
  base_price: number;
  status: string;
};

export type ReservationResponse = {
  id: string;
  room_id: string;
  customer_id: string;
  customer_name: string | null;
  room_number: string | null;
  room_type: string | null;
  building: string | null;
  check_in: string;
  check_out: string;
  status: string;
  total_price: number;
};

// ─── Dashboard ───
export type KpiResponse = {
  revenue: number;
  golf_rounds: number;
  occupancy_rate: number;
  period: string;
  days: number;
};

export type RevenueDataPoint = {
  date: string;
  golf: number;
  room: number;
  fnb: number;
  oncheon: number;
  total: number;
};

export type AiActionItem = {
  id: string;
  type: string;
  target_customer_id: string | null;
  target_customer_name: string | null;
  status: string;
  created_at: string | null;
};

// ─── AI ───
export type AiQueryResponse = {
  answer: string;
  data?: Record<string, unknown>[];
  query_type: string;
};

export type AiSuggestion = {
  id: string;
  type: string;
  title: string;
  detail: string;
  impact?: string;
  category?: string;
};
