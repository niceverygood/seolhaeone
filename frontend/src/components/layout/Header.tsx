import { useState } from "react";
import { Bell, Search } from "lucide-react";
import { useNotificationCount } from "@/hooks/useNotifications";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: Props) {
  const [open, setOpen] = useState(false);
  const { count, pulse, refresh } = useNotificationCount();

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
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="고객, 예약, 상품 검색..."
            className="h-10 w-56 rounded-lg border border-border-light bg-surface-light pl-10 pr-4 text-sm text-text-dark placeholder:text-text-muted focus:border-gold focus:bg-surface-white focus:outline-none lg:w-80"
          />
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
