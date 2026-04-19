import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * In-memory SWR(Stale-While-Revalidate) 캐시.
 * - 같은 path + params 로 다시 방문하면 캐시된 응답을 즉시 반환 (loading=false)
 * - 그 사이 백그라운드에서 재조회해 최신으로 업데이트
 * - TTL 초과 데이터는 그냥 "초기 표시용"으로만 쓰고 revalidate 결과를 기다림
 */
const cache = new Map<string, { data: unknown; ts: number }>();
const FRESH_TTL = 30_000; // 이 시간 내면 "fresh" 로 보고 로딩 표시 생략
const HARD_TTL = 5 * 60_000; // 5분 지난 캐시는 표시도 안 함

export function useFetch<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  const key = path + JSON.stringify(params ?? {});

  // 초기값: 캐시 있으면 그 데이터로 시작, 없으면 null + 로딩 true
  const cached = cache.get(key);
  const now = Date.now();
  const hasUsableCache = cached && now - cached.ts < HARD_TTL;
  const isFresh = cached && now - cached.ts < FRESH_TTL;

  const [data, setData] = useState<T | null>(hasUsableCache ? (cached!.data as T) : null);
  const [loading, setLoading] = useState<boolean>(!isFresh);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    return api
      .get<T>(path, params)
      .then((d) => {
        cache.set(key, { data: d, ts: Date.now() });
        setData(d);
        return d;
      })
      .catch((err) => {
        setError(err?.message ?? "알 수 없는 오류");
      })
      .finally(() => setLoading(false));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // fresh 캐시면 네트워크 생략, 오래된 캐시면 백그라운드 revalidate (로딩 안 보임)
    if (isFresh) {
      setLoading(false);
      return;
    }
    if (hasUsableCache) {
      // stale-while-revalidate: 데이터 이미 표시됨, 조용히 업데이트
      setLoading(false);
      api
        .get<T>(path, params)
        .then((d) => {
          cache.set(key, { data: d, ts: Date.now() });
          setData(d);
        })
        .catch(() => {});
      return;
    }
    // 완전 첫 호출
    void refetch();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch };
}

/** 외부에서 특정 키 캐시 무효화 (예: POST 후) */
export function invalidateCache(pathPrefix: string) {
  for (const k of cache.keys()) {
    if (k.startsWith(pathPrefix)) cache.delete(k);
  }
}
