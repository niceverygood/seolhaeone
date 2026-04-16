import { useFetch } from "./useFetch";

type Briefing = {
  date: string;
  yesterday_revenue: number;
  today_revenue_so_far: number;
  tomorrow_forecast: {
    golf_bookings: number;
    room_checkins: number;
    noshow_risk: number;
  };
  operations: {
    checkins_today: number;
    checkouts_today: number;
    vip_arrivals: { name: string; grade: string }[];
  };
  alerts: {
    churn_risk_customers: number;
    noshow_risk_bookings: number;
  };
  tasks: { priority: string; task: string }[];
};

type RevenueOptimization = {
  summary: string;
  tomorrow_forecast: {
    date: string;
    day_of_week: string;
    predicted_golf_rounds: number;
    predicted_occupancy: number;
    predicted_revenue: number;
    trend: number;
    confidence: number;
  };
  overbooking: {
    total_reserved: number;
    expected_noshows: number;
    recommended_overbook: number;
    potential_recovery: number;
  };
  insights: { title: string; detail: string; impact: string }[];
};

type DemandForecast = {
  date: string;
  day_of_week: string;
  predicted_golf_rounds: number;
  predicted_occupancy: number;
  predicted_revenue: number;
  trend: number;
  confidence: number;
};

export function useBriefing() {
  return useFetch<Briefing>("/ai/briefing");
}

export function useRevenueOptimization() {
  return useFetch<RevenueOptimization>("/ai/revenue-optimization");
}

export function useDemandForecast(date: string) {
  return useFetch<DemandForecast>("/ai/demand-forecast", { date });
}

export { useAiQuery, useAiSuggestions } from "./useAi";
