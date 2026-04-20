import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * In-memory SWR 캐시 + in-flight dedup.
 * - 30초 이내 재방문은 캐시 즉시 반환 (loading=false)
 * - 30초~5분은 stale 데이터 표시 + 백그라운드 revalidate
 * - 같은 path+params로 동시에 여러 훅이 호출되면 단일 요청으로 합쳐 결과 공유
 * - 파라미터 순서/undefined 값에 상관없이 동일 키로 정규화 (prefetch 호환성)
 */
const cache = new Map<string, { data: unknown; ts: number }>();
const inflight = new Map<string, Promise<unknown>>();
const FRESH_TTL = 30_000;
const HARD_TTL = 5 * 60_000;

function normalizeKey(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return path + "{}";
  // null/undefined 제거 후 키 정렬 → 순서가 달라도 동일 키
  const sorted: Record<string, string | number | boolean> = {};
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v === undefined || v === null) continue;
    sorted[k] = v;
  }
  return path + JSON.stringify(sorted);
}

function sharedGet<T>(
  key: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = api
    .get<T>(path, params)
    .then((data) => {
      cache.set(key, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

export function useFetch<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  const key = normalizeKey(path, params);

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
    return sharedGet<T>(key, path, params)
      .then((d) => {
        setData(d);
        return d;
      })
      .catch((err) => {
        setError(err?.message ?? "알 수 없는 오류");
      })
      .finally(() => setLoading(false));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isFresh) {
      setLoading(false);
      return;
    }
    if (hasUsableCache) {
      // stale-while-revalidate: UI에 이미 표시 중, 백그라운드로 업데이트
      setLoading(false);
      sharedGet<T>(key, path, params)
        .then((d) => setData(d))
        .catch(() => {});
      return;
    }
    void refetch();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch };
}

export function invalidateCache(pathPrefix: string) {
  for (const k of cache.keys()) {
    if (k.startsWith(pathPrefix)) cache.delete(k);
  }
}

/** 백그라운드에서 미리 호출해 useFetch 캐시에 적재. 에러는 무시. */
export function prefetch(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  const key = normalizeKey(path, params);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < FRESH_TTL) return Promise.resolve();
  return sharedGet(key, path, params).catch(() => {});
}
