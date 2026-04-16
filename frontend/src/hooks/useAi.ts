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
