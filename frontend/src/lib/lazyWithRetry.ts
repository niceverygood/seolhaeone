import { lazy, type ComponentType } from "react";

/**
 * 코드 스플리팅된 청크가 404로 실패할 때(이전 배포의 해시 파일 요청) 자동 복구.
 *
 * 전략:
 * 1. 첫 실패 → 500ms 뒤 1회 재시도 (네트워크 일시 불안정 대응)
 * 2. 재시도도 실패 → sessionStorage 플래그를 걸고 페이지 전체 새로고침 한 번만 수행
 *    (새로고침 시 최신 index.html을 받아 올바른 청크명을 로드)
 * 3. 새로고침 후에도 계속 실패하면 무한 루프 방지를 위해 원래 에러를 던진다.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  reloadKey: string,
) {
  return lazy(async () => {
    const flagKey = `chunk-reload:${reloadKey}`;
    try {
      return await factory();
    } catch (err) {
      // 1차 재시도
      await new Promise((r) => setTimeout(r, 500));
      try {
        return await factory();
      } catch (err2) {
        // 이미 한 번 새로고침했으면 더는 안 함 (무한 루프 방지)
        const alreadyReloaded = sessionStorage.getItem(flagKey);
        if (!alreadyReloaded) {
          sessionStorage.setItem(flagKey, String(Date.now()));
          // 잠시 후 자동 새로고침 — 사용자에겐 순간적인 깜빡임으로 보임
          window.location.reload();
          // reload가 비동기로 일어나는 동안 던지지 않고 무한 Promise로 잡아둠
          return new Promise<never>(() => {});
        }
        throw err2;
      }
    }
  });
}
