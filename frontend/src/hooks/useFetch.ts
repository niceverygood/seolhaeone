import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useFetch<T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = path + JSON.stringify(params ?? {});

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<T>(path, params)
      .then(setData)
      .catch((err) => setError(err.message ?? "알 수 없는 오류"))
      .finally(() => setLoading(false));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
