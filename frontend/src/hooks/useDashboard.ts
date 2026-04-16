import { useFetch } from "./useFetch";
import type { AiActionItem, RevenueDataPoint } from "@/lib/types";

type KpiRaw = {
  revenue: number;
  golf_rounds: number;
  occupancy_rate: number;
  revenue_delta: number;
  rounds_delta: number;
  occupancy_delta: number;
  period: string;
  days: number;
};

export function useKpi(period: "monthly" | "weekly" = "monthly") {
  return useFetch<KpiRaw>("/dashboard/kpi", { period });
}

export function useRevenue(from: string, to: string) {
  return useFetch<RevenueDataPoint[]>("/dashboard/revenue", { from, to });
}

export function useCustomerStats() {
  return useFetch<Record<string, number>>("/dashboard/customer-stats");
}

export function useRecentAiActions() {
  return useFetch<AiActionItem[]>("/dashboard/ai-actions/recent");
}
