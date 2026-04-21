import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * In-memory SWR 캐시 + in-flight dedup + sessionStorage 영속화.
 * - 30초 이내 재방문은 캐시 즉시 반환 (loading=false)
 * - 30초~5분은 stale 데이터 표시 + 백그라운드 revalidate
 * - 탭 새로고침 시 sessionStorage에서 hydrate → 첫 렌더부터 데이터 표시
 * - 같은 path+params로 동시에 여러 훅이 호출되면 단일 요청으로 합쳐 결과 공유
 */
const FRESH_TTL = 30_000;
const HARD_TTL = 5 * 60_000;
const STORAGE_KEY = "shw:fetch:v1";

type Entry = { data: unknown; ts: number };

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

// ─── sessionStorage hydrate (1회) ────────────────────────────────
// 페이지 reload 후에도 SWR로 stale 데이터를 즉시 표시하고 백그라운드 갱신.
if (typeof window !== "undefined") {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, Entry>;
      const cutoff = Date.now() - HARD_TTL;
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v.ts === "number" && v.ts > cutoff) cache.set(k, v);
      }
    }
  } catch {
    /* corrupted → 무시 */
  }
}

// 캐시 변경 시 sessionStorage 동기화 — 디바운스로 쓰기 빈도 제한
let persistTimer: number | null = null;
function schedulePersist() {
  if (typeof window === "undefined") return;
  if (persistTimer !== null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    try {
      const snapshot: Record<string, Entry> = {};
      const cutoff = Date.now() - HARD_TTL;
      for (const [k, v] of cache) {
        if (v.ts > cutoff) snapshot[k] = v;
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota/JSON 실패 무시 */
    }
  }, 500);
}

function normalizeKey(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return path + "{}";
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
      schedulePersist();
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
  schedulePersist();
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
