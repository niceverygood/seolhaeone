import { useRef, useState, type FormEvent } from "react";
import { Bell, Loader2, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotificationCount } from "@/hooks/useNotifications";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { semanticSearch, type SemanticSearchResult } from "@/hooks/useAi";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { count, pulse, refresh } = useNotificationCount();

  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchRes, setSearchRes] = useState<SemanticSearchResult | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const submitSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr(null);
    try {
      setSearchRes(await semanticSearch(q));
    } catch (err) {
      setSearchErr(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  };

  const closeSearch = () => {
    setSearchRes(null);
    setSearchErr(null);
  };

  return (
    <header className="flex h-20 items-center justify-between gap-4 border-b border-border-light bg-surface-white px-6 lg:px-10">
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl leading-none text-text-dark sm:text-[26px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 truncate text-xs text-text-muted sm:text-sm">{subtitle}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div ref={searchRef} className="relative hidden md:block">
          <form onSubmit={submitSearch}>
            <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onFocus={() => { if (searchRes) { /* 유지 */ } }}
              placeholder="AI 검색 — '레전드 좋아하는 VIP'"
              className="h-10 w-56 rounded-lg border border-border-light bg-surface-light pl-9 pr-9 text-sm text-text-dark placeholder:text-text-muted focus:border-gold focus:bg-surface-white focus:outline-none lg:w-80"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted" />
            )}
            {!searching && searchQ && (
              <button
                type="button"
                onClick={() => { setSearchQ(""); closeSearch(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:bg-surface-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {(searchRes || searchErr) && (
            <div className="absolute right-0 top-12 z-40 w-[min(480px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border-light bg-surface-white shadow-xl">
              <div className="flex items-center justify-between border-b border-border-light px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Sparkles className="h-3 w-3 text-gold" />
                  <span>
                    {searchErr
                      ? "검색 실패"
                      : `${searchRes?.count ?? 0}건 일치`}
                  </span>
                  {searchRes?.filters && Object.keys(searchRes.filters).length > 0 && (
                    <span className="truncate font-mono text-[10px]">
                      {Object.entries(searchRes.filters)
                        .filter(([k]) => k !== "kind")
                        .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
                        .join("  ")}
                    </span>
                  )}
                </div>
                <button
                  onClick={closeSearch}
                  className="rounded p-0.5 text-text-muted hover:bg-surface-light"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {searchErr ? (
                  <p className="px-4 py-4 text-sm text-[color:var(--color-danger)]">
                    {searchErr}
                  </p>
                ) : searchRes && searchRes.count === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-text-muted">
                    일치하는 결과가 없습니다.
                  </p>
                ) : (
                  <ul className="divide-y divide-border-light">
                    {searchRes?.results.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            closeSearch();
                            setSearchQ("");
                            navigate(`/customers/${r.id}`);
                          }}
                          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-light"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-text-dark">
                                {r.name}
                              </span>
                              <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold-dark">
                                {r.grade}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 font-mono text-[10px] text-text-muted">
                              <span>{r.phone}</span>
                              <span>CLV ₩{r.clv.toLocaleString()}</span>
                              {r.last_visit_at && (
                                <span>최근 {r.last_visit_at.slice(0, 10)}</span>
                              )}
                            </div>
                          </div>
                          {r.churn_risk >= 0.5 && (
                            <span className="shrink-0 rounded bg-[color:var(--color-danger)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-danger)]">
                              이탈 {Math.round(r.churn_risk * 100)}%
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
            count > 0
              ? "border-gold bg-gold/10 text-gold-dark hover:bg-gold/20"
              : "border-border-light bg-surface-white text-text-dark hover:bg-surface-light",
            pulse && "animate-pulse",
          )}
          aria-label={`알림 ${count}건`}
        >
          <Bell className={cn("h-4 w-4", pulse && "animate-bounce")} />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--color-danger)] px-1 text-[10px] font-bold text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </div>

      {open && (
        <NotificationsPanel
          onClose={() => setOpen(false)}
          onChanged={() => void refresh()}
        />
      )}
    </header>
  );
}
