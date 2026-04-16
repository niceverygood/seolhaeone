import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Flag,
  BedDouble,
  Users,
  Bot,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";

const nav = [
  { to: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { to: "/golf", label: "골프 예약", icon: Flag },
  { to: "/resort", label: "객실 예약", icon: BedDouble },
  { to: "/customers", label: "고객 관리", icon: Users },
  { to: "/ai", label: "AI 어시스턴트", icon: Bot },
  { to: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col bg-bg-primary text-text-primary">
      {/* Logo */}
      <div className="px-7 pt-8 pb-10">
        <div className="font-display text-2xl leading-none text-white">
          Seolhaewon
        </div>
        <div className="mt-1 font-display text-sm tracking-[0.3em] text-gold">
          雪 海 園
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors",
                    isActive
                      ? "bg-bg-secondary text-gold"
                      : "text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gold" />
                    )}
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile */}
      <div className="mx-3 mb-4 rounded-lg border border-border-subtle bg-bg-secondary px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-sm font-semibold text-text-on-gold">
            한
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text-primary">
              한승수
            </div>
            <div className="text-xs text-text-muted">관리자</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
