import { Bell, Search } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: Props) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-border-light bg-surface-white px-10">
      <div>
        <h1 className="font-display text-[26px] leading-none text-text-dark">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-text-muted">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="고객, 예약, 상품 검색..."
            className="h-10 w-80 rounded-lg border border-border-light bg-surface-light pl-10 pr-4 text-sm text-text-dark placeholder:text-text-muted focus:border-gold focus:bg-surface-white focus:outline-none"
          />
        </div>

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border-light bg-surface-white text-text-dark transition-colors hover:bg-surface-light"
          aria-label="알림"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold" />
        </button>
      </div>
    </header>
  );
}
