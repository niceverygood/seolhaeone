import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "./useFetch";
import type { AiQueryResponse, AiSuggestion } from "@/lib/types";

export function useAiQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async (text: string): Promise<AiQueryResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      return await api.post<AiQueryResponse>("/ai/query", { query: text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { query, loading, error };
}

export function useAiSuggestions() {
  return useFetch<AiSuggestion[]>("/ai/suggestions");
}

export type ActionStatus = "approved" | "executed" | "dismissed";

export function respondToAction(
  suggestionId: string,
  status: ActionStatus,
  note?: string,
) {
  return api.post<{ ok: boolean; action_id: string; mode: string }>(
    "/ai/actions/respond",
    { suggestion_id: suggestionId, status, note },
  );
}

// ── Feature 1: Customer AI summary
export type CustomerAiSummary = {
  summary: string;
  context: {
    grade: string;
    clv: number;
    churn_risk: number;
    total_visits: number;
    days_since_visit: number | null;
    tag_count: number;
  };
  model: string;
};

export function useCustomerSummary(id: string) {
  return useFetch<CustomerAiSummary>(`/ai/customer-summary/${id}`);
}

// ── Feature 2: Customer message drafts
export type CustomerMessages = {
  messages: { formal: string; friendly: string; promotion: string };
  model: string;
};

export function generateCustomerMessages(id: string) {
  return api.post<CustomerMessages>(`/ai/customer-message/${id}`);
}

// ── Feature 3: Semantic search
export type SemanticSearchResult = {
  filters: Record<string, unknown>;
  kind: string;
  results: Array<{
    id: string;
    name: string;
    phone: string;
    grade: string;
    clv: number;
    churn_risk: number;
    total_visits: number;
    tags: string[];
    last_visit_at: string | null;
  }>;
  count: number;
};

export function semanticSearch(query: string) {
  return api.post<SemanticSearchResult>("/ai/search/semantic", { query });
}
