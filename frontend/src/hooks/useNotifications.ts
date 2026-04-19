import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export type PendingNotification = {
  id: string;
  created_at: string | null;
  kind: "golf" | "room" | "package";
  customer_id: string | null;
  payload: Record<string, unknown>;
};

/**
 * 주기적으로 pending 알림 수를 폴링하여 헤더 뱃지에 반영.
 * 기본 15초 간격, 탭이 비활성일 때는 멈춤.
 */
export function useNotificationCount(intervalMs = 20000) {
  const [count, setCount] = useState(0);
  const [lastCount, setLastCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const timerRef = useRef<number | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get<{ pending: number }>("/notifications/count");
      setCount((prev) => {
        if (res.pending > prev) setPulse(true);
        setLastCount(prev);
        return res.pending;
      });
    } catch (err) {
      // 401은 AuthContext가 처리, 그 외 네트워크 오류는 조용히 skip
      if (err instanceof ApiError && err.status === 401) return;
    }
  }, []);

  useEffect(() => {
    void fetchCount();
    const tick = () => {
      if (document.visibilityState === "visible") void fetchCount();
    };
    timerRef.current = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchCount, intervalMs]);

  // pulse는 시각적 하이라이트 용 — 3초 후 자동 해제
  useEffect(() => {
    if (!pulse) return;
    const t = window.setTimeout(() => setPulse(false), 3000);
    return () => window.clearTimeout(t);
  }, [pulse]);

  return { count, pulse, refresh: fetchCount, lastCount };
}

export async function listPendingNotifications(): Promise<PendingNotification[]> {
  return api.get<PendingNotification[]>("/notifications/pending");
}

export async function confirmNotification(id: string) {
  return api.post<{ ok: boolean; kind: string }>(`/notifications/${id}/confirm`);
}

export async function rejectNotification(id: string) {
  return api.post<{ ok: boolean; kind: string }>(`/notifications/${id}/reject`);
}
